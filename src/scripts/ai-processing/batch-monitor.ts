/**
 * Batch Monitor Script
 * 
 * Monitors OpenAI batch jobs and automatically saves results when complete
 * Can be run as a cron job or manually
 */

import OpenAI from 'openai';
import { createLogger } from '../../utils/logger';
import { AppConfig } from '../../config/app';
import { createClient } from '@supabase/supabase-js';

const logger = createLogger('BatchMonitor');

interface BatchInfo {
    id: string;
    stage: 'business' | 'causal';
    description: string;
}

class BatchMonitor {
    private openai: OpenAI;
    private supabase: any;

    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const appConfig = AppConfig.getInstance();
        this.supabase = createClient(
            appConfig.supabaseConfig.projectUrl,
            appConfig.supabaseConfig.apiKey
        );
    }

    async monitorBatches(batchIds: string[], stage: 'business' | 'causal' = 'business') {
        logger.info(`🔍 Monitoring ${batchIds.length} batches...`);

        for (const batchId of batchIds) {
            await this.checkAndSaveBatch(batchId, stage);
        }
    }

    async checkAndSaveBatch(batchId: string, stage: 'business' | 'causal') {
        try {
            const batch = await this.openai.batches.retrieve(batchId);

            logger.info(`📊 Batch ${batchId}: ${batch.status} (${batch.request_counts?.completed || 0}/${batch.request_counts?.total || 0})`);

            if (batch.status === 'completed') {
                logger.info(`✅ Batch ${batchId} completed! Saving results...`);
                await this.saveBatchResults(batch, stage);
                return true; // Completed and saved
            } else if (batch.status === 'failed') {
                logger.error(`❌ Batch ${batchId} failed!`);
                return false; // Failed
            } else {
                logger.info(`⏳ Batch ${batchId} still processing...`);
                return null; // Still processing
            }
        } catch (error) {
            logger.error(`❌ Error checking batch ${batchId}:`, error);
            return false;
        }
    }

    private async saveBatchResults(batch: any, stage: 'business' | 'causal') {
        if (!batch.output_file_id) {
            logger.error('❌ No output file available');
            return;
        }

        try {
            // Download results
            const outputFile = await this.openai.files.content(batch.output_file_id);
            const outputText = await outputFile.text();

            logger.info(`📥 Downloaded batch results: ${outputText.split('\n').length - 1} responses`);

            let savedCount = 0;
            let errorCount = 0;

            for (const line of outputText.split('\n')) {
                if (!line.trim()) continue;

                try {
                    const result = JSON.parse(line);

                    if (result.response?.body?.choices?.[0]?.message?.content) {
                        const content = result.response.body.choices[0].message.content;
                        const tokensUsed = result.response.body.usage?.total_tokens || 0;

                        // Extract article/business event ID from custom_id
                        const customId = result.custom_id;
                        const id = customId.split('_')[1];

                        if (stage === 'business') {
                            await this.saveBusinessResult(id, content, JSON.parse(content), tokensUsed);
                        } else {
                            await this.saveCausalResult(id, content, JSON.parse(content), tokensUsed);
                        }

                        savedCount++;
                    } else {
                        errorCount++;
                        logger.error(`❌ Invalid response format for ${result.custom_id}`);
                    }
                } catch (parseError) {
                    errorCount++;
                    logger.error('❌ Failed to parse result:', parseError);
                }
            }

            logger.info(`✅ Batch ${batch.id} saved: ${savedCount} successful, ${errorCount} errors`);

        } catch (error) {
            logger.error(`❌ Failed to save batch ${batch.id}:`, error);
        }
    }

    private async saveBusinessResult(articleId: string, rawResponse: string, structuredOutput: any, tokensUsed: number) {
        const { error } = await this.supabase
            .from('business_events_ai')
            .insert({
                article_id: articleId,
                agent_id: 'gpt-4.1-mini',
                analysis_type: 'business_event_extraction',
                raw_response: rawResponse,
                structured_output: structuredOutput,
                processing_time_ms: 0, // Not available from batch
                tokens_used: tokensUsed,
                success: true
            });

        if (error) {
            throw new Error(`Failed to save business result: ${error.message}`);
        }
    }

    private async saveCausalResult(businessEventId: string, rawResponse: string, structuredOutput: any, tokensUsed: number) {
        // This would need to be implemented for causal stage
        logger.warn('⚠️ Causal result saving not implemented in monitor yet');
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);

    const options = {
        batchIds: [] as string[],
        stage: 'business' as 'business' | 'causal',
        monitor: false,
        interval: 180 // 3 hours in minutes
    };

    for (const arg of args) {
        if (arg.startsWith('--batch=')) {
            options.batchIds.push(arg.split('=')[1]);
        }
        if (arg.startsWith('--batches=')) {
            options.batchIds = arg.split('=')[1].split(',');
        }
        if (arg.startsWith('--stage=')) {
            options.stage = arg.split('=')[1] as 'business' | 'causal';
        }
        if (arg === '--monitor') {
            options.monitor = true;
        }
        if (arg.startsWith('--interval=')) {
            options.interval = parseInt(arg.split('=')[1]);
        }
    }

    return options;
}

// Main execution
async function main() {
    try {
        const options = parseArgs();

        if (options.batchIds.length === 0) {
            console.log('❌ No batch IDs provided. Use --batch=ID or --batches=ID1,ID2,ID3');
            process.exit(1);
        }

        const monitor = new BatchMonitor();

        if (options.monitor) {
            logger.info(`🔄 Starting continuous monitoring (every ${options.interval} minutes)...`);

            const checkInterval = setInterval(async () => {
                logger.info('🕐 Checking batch status...');

                let allCompleted = true;
                for (const batchId of options.batchIds) {
                    const result = await monitor.checkAndSaveBatch(batchId, options.stage);
                    if (result !== true) {
                        allCompleted = false;
                    }
                }

                if (allCompleted) {
                    logger.info('🎉 All batches completed and saved!');
                    clearInterval(checkInterval);
                    process.exit(0);
                }
            }, options.interval * 60 * 1000); // Convert to milliseconds

        } else {
            // One-time check
            await monitor.monitorBatches(options.batchIds, options.stage);
        }

    } catch (error: any) {
        logger.error('❌ Monitor failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
