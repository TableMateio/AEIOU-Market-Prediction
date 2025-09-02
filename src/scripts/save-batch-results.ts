#!/usr/bin/env npx tsx

/**
 * Save Batch Results to Database
 * 
 * Process and save the valid batch results to the ai_responses table
 * using the correct schema structure
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import fs from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('SaveBatchResults');

async function saveBatchResults() {
    logger.info('💾 Saving batch results to database...');

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

    let savedCount = 0;
    let errorCount = 0;
    const errors: Array<{ customId: string; error: string }> = [];

    logger.info(`📊 Processing ${lines.length} results...`);

    for (let i = 0; i < lines.length; i++) {
        const lineNumber = i + 1;
        const line = lines[i];

        try {
            // Parse the batch result wrapper
            const batchResult = JSON.parse(line);
            const customId = batchResult.custom_id;
            const articleId = customId.replace('art_', '');

            logger.info(`\n🔄 Processing result ${lineNumber}: ${customId}`);

            // Check for batch-level errors
            if (batchResult.error) {
                logger.error(`❌ Batch error for ${customId}:`, batchResult.error);
                errors.push({
                    customId,
                    error: `Batch error: ${JSON.stringify(batchResult.error)}`
                });
                errorCount++;
                continue;
            }

            // Extract response details
            const response = batchResult.response;
            const statusCode = response?.status_code;
            const usage = response?.body?.usage;
            const aiContent = response?.body?.choices?.[0]?.message?.content;

            if (statusCode !== 200) {
                logger.error(`❌ HTTP error ${statusCode} for ${customId}`);
                errors.push({
                    customId,
                    error: `HTTP ${statusCode}: ${JSON.stringify(response?.body?.error || 'Unknown error')}`
                });
                errorCount++;
                continue;
            }

            if (!aiContent) {
                logger.error(`❌ No AI content for ${customId}`);
                errors.push({
                    customId,
                    error: 'No AI response content'
                });
                errorCount++;
                continue;
            }

            // Try to parse the AI response
            let aiResponse;
            let isValidJson = true;
            try {
                aiResponse = JSON.parse(aiContent);
                logger.info(`   ✅ Valid AI response (${aiContent.length} chars)`);
            } catch (parseError: any) {
                logger.error(`   ❌ Invalid JSON for ${customId}: ${parseError.message}`);
                isValidJson = false;
                aiResponse = null;
                errors.push({
                    customId,
                    error: `Invalid JSON: ${parseError.message}`
                });
            }

            // Save to database using the correct schema
            try {
                const dbRecord = {
                    article_id: articleId,
                    agent_id: 'gpt-4o-batch-2024-08-06',
                    analysis_type: 'apple_business_event_chain_batch',
                    raw_response: aiContent, // Store raw content even if invalid JSON
                    structured_output: isValidJson ? aiResponse : null,
                    confidence_score: isValidJson ? 0.9 : 0.0,
                    processing_time_ms: 0, // Batch API doesn't provide individual timing
                    tokens_used: usage?.total_tokens || 0,
                    success: isValidJson,
                    error_message: isValidJson ? null : {
                        type: 'json_parse_error',
                        message: 'AI response was not valid JSON',
                        content_length: aiContent.length
                    }
                };

                const { error: dbError } = await supabase
                    .from('ai_responses')
                    .insert(dbRecord);

                if (dbError) {
                    logger.error(`   ❌ Database error for ${customId}:`, dbError);
                    errors.push({
                        customId,
                        error: `Database error: ${dbError.message}`
                    });
                    errorCount++;
                } else {
                    logger.info(`   💾 Saved to database successfully`);
                    savedCount++;

                    if (isValidJson && aiResponse?.business_events) {
                        logger.info(`      📊 Business events: ${aiResponse.business_events.length}`);
                    }
                }

            } catch (dbError: any) {
                logger.error(`   ❌ Database save failed for ${customId}:`, dbError.message);
                errors.push({
                    customId,
                    error: `Database save failed: ${dbError.message}`
                });
                errorCount++;
            }

        } catch (error: any) {
            logger.error(`❌ Failed to process line ${lineNumber}:`, error.message);
            errors.push({
                customId: `line_${lineNumber}`,
                error: `Processing failed: ${error.message}`
            });
            errorCount++;
        }
    }

    // Generate summary report
    const totalResults = lines.length;
    const successRate = Math.round((savedCount / totalResults) * 100);

    console.log('\n📋 BATCH RESULTS SAVED!');
    console.log('='.repeat(50));
    console.log(`📊 SUMMARY:`);
    console.log(`   📄 Total results: ${totalResults}`);
    console.log(`   💾 Successfully saved: ${savedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Success rate: ${successRate}%`);

    if (errors.length > 0) {
        console.log(`\n❌ ERRORS (${errors.length}):`);
        errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.customId}: ${error.error}`);
        });
    }

    // Check what we actually saved
    const { data: savedRecords, error: queryError } = await supabase
        .from('ai_responses')
        .select('article_id, success, tokens_used, structured_output')
        .eq('agent_id', 'gpt-4o-batch-2024-08-06')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!queryError && savedRecords) {
        console.log(`\n🔍 VERIFICATION - Last ${savedRecords.length} saved records:`);
        savedRecords.forEach((record, index) => {
            const businessEvents = record.structured_output?.business_events?.length || 0;
            console.log(`   ${index + 1}. Article: ${record.article_id.substring(0, 8)}... | Success: ${record.success} | Events: ${businessEvents} | Tokens: ${record.tokens_used}`);
        });
    }

    return {
        totalResults,
        savedCount,
        errorCount,
        successRate,
        errors
    };
}

// Run the save operation
saveBatchResults().catch(error => {
    console.error('❌ Save operation failed:', error.message);
    process.exit(1);
});
