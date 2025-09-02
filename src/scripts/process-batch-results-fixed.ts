#!/usr/bin/env npx tsx

/**
 * Process Batch Results - Fixed Version
 * 
 * Process the batch results with proper error handling for truncated JSON
 * and save valid results to the database
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import fs from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProcessResults');

interface ProcessingStats {
    totalResults: number;
    validResults: number;
    savedToDatabase: number;
    truncatedResults: number;
    emptyBusinessEvents: number;
    errors: Array<{
        customId: string;
        error: string;
    }>;
}

async function processBatchResults() {
    logger.info('🔄 Processing batch results with error handling...');

    const appConfig = AppConfig.getInstance();
    const supabase = createClient(
        appConfig.supabaseConfig.projectUrl,
        appConfig.supabaseConfig.apiKey
    );

    // Read the raw results file
    const rawResultsPath = 'batch_results_raw.jsonl';
    if (!fs.existsSync(rawResultsPath)) {
        throw new Error('❌ Raw results file not found. Run examine-batch-results.ts first.');
    }

    const content = fs.readFileSync(rawResultsPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    const stats: ProcessingStats = {
        totalResults: lines.length,
        validResults: 0,
        savedToDatabase: 0,
        truncatedResults: 0,
        emptyBusinessEvents: 0,
        errors: []
    };

    logger.info(`📊 Processing ${stats.totalResults} results...`);

    for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i];

        try {
            // Parse the batch result wrapper
            const batchResult = JSON.parse(line);
            const customId = batchResult.custom_id;
            const articleId = customId.replace('art_', '');

            logger.info(`\n🔄 Processing result ${lineNumber}: ${customId}`);

            // Check for errors in the batch result
            if (batchResult.error) {
                logger.error(`❌ Batch error for ${customId}:`, batchResult.error);
                stats.errors.push({
                    customId,
                    error: `Batch error: ${JSON.stringify(batchResult.error)}`
                });
                continue;
            }

            // Extract the AI response content
            const aiContent = batchResult.response?.body?.choices?.[0]?.message?.content;
            if (!aiContent) {
                logger.error(`❌ No AI content for ${customId}`);
                stats.errors.push({
                    customId,
                    error: 'No AI response content'
                });
                continue;
            }

            // Try to parse the AI response
            let aiResponse;
            try {
                aiResponse = JSON.parse(aiContent);
                stats.validResults++;
                logger.info(`   ✅ Valid AI response (${aiContent.length} chars)`);
            } catch (parseError: any) {
                logger.error(`   ❌ Truncated/invalid JSON for ${customId}: ${parseError.message}`);
                stats.truncatedResults++;
                stats.errors.push({
                    customId,
                    error: `Truncated JSON: ${parseError.message}`
                });
                continue;
            }

            // Check business events
            const businessEvents = aiResponse.business_events || [];
            if (businessEvents.length === 0) {
                logger.info(`   ⚠️ No business events found (article not Apple-relevant)`);
                stats.emptyBusinessEvents++;
            } else {
                logger.info(`   📊 Found ${businessEvents.length} business events`);
            }

            // Save to database (matching existing ai_responses schema)
            try {
                const { error: dbError } = await supabase
                    .from('ai_responses')
                    .insert({
                        article_id: articleId,
                        business_events: businessEvents,
                        raw_ai_response: aiResponse,
                        ai_version: 'batch_v1.0',
                        processing_batch: `batch_${new Date().toISOString().split('T')[0]}`,
                        model_used: 'gpt-4o-2024-08-06',
                        prompt_tokens: batchResult.response?.usage?.prompt_tokens || 0,
                        completion_tokens: batchResult.response?.usage?.completion_tokens || 0,
                        status: 'completed',
                        processed_at: new Date().toISOString()
                    });

                if (dbError) {
                    logger.error(`   ❌ Database error for ${customId}:`, dbError);
                    stats.errors.push({
                        customId,
                        error: `Database error: ${dbError.message}`
                    });
                } else {
                    logger.info(`   💾 Saved to database successfully`);
                    stats.savedToDatabase++;
                }

            } catch (dbError: any) {
                logger.error(`   ❌ Database save failed for ${customId}:`, dbError.message);
                stats.errors.push({
                    customId,
                    error: `Database save failed: ${dbError.message}`
                });
            }

        } catch (error: any) {
            logger.error(`❌ Failed to process line ${lineNumber}:`, error.message);
            stats.errors.push({
                customId: `line_${lineNumber}`,
                error: `Processing failed: ${error.message}`
            });
        }
    }

    // Generate detailed report
    console.log('\n📋 BATCH PROCESSING COMPLETE!');
    console.log('='.repeat(60));
    console.log(`📊 RESULTS SUMMARY:`);
    console.log(`   📄 Total results: ${stats.totalResults}`);
    console.log(`   ✅ Valid AI responses: ${stats.validResults}`);
    console.log(`   💾 Saved to database: ${stats.savedToDatabase}`);
    console.log(`   ⚠️ Truncated responses: ${stats.truncatedResults}`);
    console.log(`   📭 Empty business events: ${stats.emptyBusinessEvents}`);
    console.log(`   ❌ Errors: ${stats.errors.length}`);
    console.log(`   📈 Success rate: ${Math.round((stats.savedToDatabase / stats.totalResults) * 100)}%`);

    if (stats.emptyBusinessEvents > 0) {
        console.log(`\n📝 NOTE: ${stats.emptyBusinessEvents} articles had no Apple-relevant business events`);
        console.log(`   This is expected for non-Apple articles in our dataset`);
    }

    if (stats.truncatedResults > 0) {
        console.log(`\n⚠️ TRUNCATED RESPONSES: ${stats.truncatedResults} responses were cut off`);
        console.log(`   This may be due to token limits or response length limits`);
        console.log(`   Consider shortening article content or adjusting prompts`);
    }

    if (stats.errors.length > 0) {
        console.log(`\n❌ ERRORS (${stats.errors.length}):`);
        stats.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.customId}: ${error.error}`);
        });
    }

    // Save processing report
    const report = {
        timestamp: new Date().toISOString(),
        stats,
        recommendations: []
    };

    if (stats.truncatedResults > 0) {
        report.recommendations.push('Consider reducing article content length to avoid truncation');
        report.recommendations.push('Review token limits and response size constraints');
    }

    if (stats.emptyBusinessEvents > stats.totalResults * 0.5) {
        report.recommendations.push('High percentage of non-Apple articles - consider improving article filtering');
    }

    fs.writeFileSync('batch_processing_report.json', JSON.stringify(report, null, 2));
    console.log(`\n💾 Processing report saved to: batch_processing_report.json`);

    return stats;
}

// Run the processing
processBatchResults().catch(error => {
    console.error('❌ Processing failed:', error.message);
    process.exit(1);
});
