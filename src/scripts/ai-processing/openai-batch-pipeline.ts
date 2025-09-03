#!/usr/bin/env npx tsx

/**
 * OpenAI Batch Processing Pipeline
 * 
 * Complete pipeline for batch processing articles through OpenAI Batch API:
 * 1. Generate JSONL file
 * 2. Upload to OpenAI Files
 * 3. Create batch job
 * 4. Monitor progress
 * 5. Download and process results
 * 6. Save to database
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../../config/app';
import { config } from '../../config/app';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BatchPipeline');

interface BatchPipelineOptions {
    limit?: number;
    skipProcessed?: boolean;
    testMode?: boolean;
    dryRun?: boolean;
}

interface BatchJobStatus {
    id: string;
    status: 'validating' | 'in_progress' | 'finalizing' | 'completed' | 'failed' | 'expired' | 'cancelling' | 'cancelled';
    created_at: number;
    completed_at?: number;
    failed_at?: number;
    expired_at?: number;
    request_counts: {
        total: number;
        completed: number;
        failed: number;
    };
    input_file_id: string;
    output_file_id?: string;
    error_file_id?: string;
}

class OpenAIBatchPipeline {
    private openai: OpenAI;
    private supabase: any;

    constructor() {
        const openaiKey = config.openaiApiKey;
        if (!openaiKey) {
            throw new Error('❌ Missing OpenAI API key');
        }

        this.openai = new OpenAI({ apiKey: openaiKey });

        const appConfig = AppConfig.getInstance();
        this.supabase = createClient(
            appConfig.supabaseConfig.projectUrl,
            appConfig.supabaseConfig.apiKey
        );

        logger.info('✅ OpenAI Batch Pipeline initialized');
    }

    /**
     * Run the complete batch processing pipeline
     */
    async runPipeline(options: BatchPipelineOptions = {}) {
        const {
            limit = 100,
            skipProcessed = true,
            testMode = false,
            dryRun = false
        } = options;

        logger.info('🚀 Starting OpenAI Batch Processing Pipeline', {
            limit,
            skipProcessed,
            testMode,
            dryRun
        });

        try {
            // Step 1: Generate JSONL file
            logger.info('\\n📝 STEP 1: Generating JSONL file...');
            const jsonlFile = await this.generateJSONL(limit, skipProcessed, testMode);

            if (!jsonlFile || jsonlFile.totalLines === 0) {
                logger.warn('⚠️ No articles to process. Pipeline stopped.');
                return;
            }

            logger.info(`✅ Generated JSONL with ${jsonlFile.totalLines} requests`);

            if (dryRun) {
                logger.info('🧪 DRY RUN: Stopping before API calls');
                return jsonlFile;
            }

            // Step 2: Upload to OpenAI Files
            logger.info('\\n📤 STEP 2: Uploading to OpenAI Files...');
            const uploadedFile = await this.uploadFile(jsonlFile.outputPath);
            logger.info(`✅ Uploaded file: ${uploadedFile.id}`);

            // Step 3: Create batch job
            logger.info('\\n🎯 STEP 3: Creating batch job...');
            const batchJob = await this.createBatchJob(uploadedFile.id);
            logger.info(`✅ Created batch job: ${batchJob.id}`);

            // Step 4: Monitor progress
            logger.info('\\n⏳ STEP 4: Monitoring batch progress...');
            const completedJob = await this.monitorBatchJob(batchJob.id);

            if (completedJob.status !== 'completed') {
                throw new Error(`Batch job failed with status: ${completedJob.status}`);
            }

            logger.info(`✅ Batch job completed successfully!`);

            // Step 5: Download and process results
            logger.info('\\n📥 STEP 5: Processing results...');
            const results = await this.downloadAndProcessResults(completedJob);

            logger.info('🎉 BATCH PROCESSING PIPELINE COMPLETE!', {
                totalRequests: completedJob.request_counts.total,
                completedRequests: completedJob.request_counts.completed,
                failedRequests: completedJob.request_counts.failed,
                successRate: Math.round((completedJob.request_counts.completed / completedJob.request_counts.total) * 100) + '%',
                savedToDatabase: results.savedCount
            });

            return {
                batchJob: completedJob,
                results,
                jsonlFile
            };

        } catch (error: any) {
            logger.error('❌ Pipeline failed:', error.message);
            throw error;
        }
    }

    /**
     * Generate JSONL file using existing script
     */
    private async generateJSONL(limit: number, skipProcessed: boolean, testMode: boolean) {
        // Import the generator dynamically
        const generatorModule = await import('./generate-batch-jsonl');
        const BatchJSONLGenerator = (generatorModule as any).BatchJSONLGenerator || generatorModule.default;

        if (!BatchJSONLGenerator) {
            throw new Error('Could not import BatchJSONLGenerator');
        }

        const generator = new BatchJSONLGenerator();
        const outputFile = testMode ? 'test_batch_articles.jsonl' : 'production_batch_articles.jsonl';

        return await generator.generateBatchFile({
            limit,
            outputFile,
            skipProcessed,
            testMode
        });
    }

    /**
     * Upload JSONL file to OpenAI Files API
     */
    private async uploadFile(filePath: string) {
        logger.info(`📤 Uploading ${filePath} to OpenAI...`);

        const file = await this.openai.files.create({
            file: fs.createReadStream(filePath),
            purpose: 'batch'
        });

        logger.info(`✅ File uploaded successfully`, {
            id: file.id,
            filename: file.filename,
            bytes: file.bytes,
            purpose: file.purpose
        });

        return file;
    }

    /**
     * Create batch job
     */
    private async createBatchJob(inputFileId: string) {
        logger.info(`🎯 Creating batch job for file: ${inputFileId}`);

        const batch = await this.openai.batches.create({
            input_file_id: inputFileId,
            endpoint: '/v1/chat/completions',
            completion_window: '24h',
            metadata: {
                description: 'AEIOU Article Analysis Batch',
                created_by: 'batch-pipeline',
                created_at: new Date().toISOString()
            }
        });

        logger.info(`✅ Batch job created successfully`, {
            id: batch.id,
            status: batch.status,
            endpoint: batch.endpoint,
            completion_window: batch.completion_window
        });

        return batch;
    }

    /**
     * Monitor batch job progress
     */
    private async monitorBatchJob(batchId: string): Promise<BatchJobStatus> {
        logger.info(`⏳ Monitoring batch job: ${batchId}`);

        let attempts = 0;
        const maxAttempts = 360; // 6 hours max (60 seconds * 360)

        while (attempts < maxAttempts) {
            const batch = await this.openai.batches.retrieve(batchId);

            logger.info(`📊 Batch status: ${batch.status}`, {
                total: batch.request_counts.total,
                completed: batch.request_counts.completed,
                failed: batch.request_counts.failed,
                progress: Math.round((batch.request_counts.completed / batch.request_counts.total) * 100) + '%'
            });

            // Terminal states
            if (['completed', 'failed', 'expired', 'cancelled'].includes(batch.status)) {
                return batch as BatchJobStatus;
            }

            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
            attempts++;
        }

        throw new Error(`Batch job monitoring timeout after ${maxAttempts} attempts`);
    }

    /**
     * Download and process batch results
     */
    private async downloadAndProcessResults(batchJob: BatchJobStatus) {
        if (!batchJob.output_file_id) {
            throw new Error('No output file available');
        }

        logger.info(`📥 Downloading results from file: ${batchJob.output_file_id}`);

        // Download output file
        const outputFile = await this.openai.files.content(batchJob.output_file_id);
        const outputContent = await outputFile.text();

        // Parse JSONL results
        const results = outputContent
            .trim()
            .split('\\n')
            .filter(Boolean)
            .map(line => JSON.parse(line));

        logger.info(`✅ Downloaded ${results.length} results`);

        // Process and save to database
        let savedCount = 0;
        let errorCount = 0;

        for (const result of results) {
            try {
                await this.saveResultToDatabase(result);
                savedCount++;
            } catch (error: any) {
                logger.error(`❌ Error saving result ${result.custom_id}:`, error.message);
                errorCount++;
            }
        }

        // Download error file if exists
        if (batchJob.error_file_id) {
            logger.info(`⚠️ Downloading error file: ${batchJob.error_file_id}`);
            const errorFile = await this.openai.files.content(batchJob.error_file_id);
            const errorContent = await errorFile.text();

            // Save error file for debugging
            fs.writeFileSync('batch_errors.jsonl', errorContent);
            logger.info('💾 Error file saved to: batch_errors.jsonl');
        }

        return {
            totalResults: results.length,
            savedCount,
            errorCount,
            results
        };
    }

    /**
     * Save individual result to database
     */
    private async saveResultToDatabase(result: any) {
        const customId = result.custom_id;
        const articleId = customId.replace('art_', '');

        if (result.response?.body?.choices?.[0]?.message?.content) {
            const analysis = JSON.parse(result.response.body.choices[0].message.content);

            // Save to business_events_ai table 
            const { error } = await this.supabase
                .from('business_events_ai')
                .insert({
                    article_id: articleId,
                    agent_id: 'gpt-4.1-mini',
                    analysis_type: 'business_events_extraction',
                    raw_response: result.response.body.choices[0].message.content,
                    structured_output: analysis,
                    processing_time_ms: 0, // Batch API doesn't provide individual timing
                    tokens_used: result.response?.usage?.total_tokens || 0,
                    success: true
                });

            if (error) {
                throw error;
            }
        } else {
            throw new Error('No valid response content');
        }
    }
}

// CLI interface
async function main() {
    try {
        const args = process.argv.slice(2);
        const testMode = args.includes('--test');
        const dryRun = args.includes('--dry-run');
        const limit = testMode ? 5 : parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '100');

        logger.info('🎯 OPENAI BATCH PROCESSING PIPELINE', {
            testMode,
            dryRun,
            limit
        });

        const pipeline = new OpenAIBatchPipeline();
        const result = await pipeline.runPipeline({
            limit,
            skipProcessed: true,
            testMode,
            dryRun
        });

        if (result && !dryRun) {
            console.log('\\n🎉 PIPELINE COMPLETE!');
            console.log(`📊 Batch ID: ${result.batchJob.id}`);
            console.log(`📊 Success Rate: ${Math.round((result.batchJob.request_counts.completed / result.batchJob.request_counts.total) * 100)}%`);
            console.log(`💾 Saved to Database: ${result.results.savedCount} articles`);
        }

    } catch (error: any) {
        logger.error('❌ Pipeline failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other scripts
export { OpenAIBatchPipeline };

// Run if called directly
if (require.main === module) {
    main();
}
