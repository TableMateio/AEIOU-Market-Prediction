#!/usr/bin/env npx tsx

/**
 * Examine Batch Results
 * 
 * Download and examine the raw results from the completed batch job
 * to understand the format and debug parsing issues
 */

import OpenAI from 'openai';
import fs from 'fs';
import { config } from '../config/app';
import { createLogger } from '../utils/logger';

const logger = createLogger('ExamineResults');

async function examineBatchResults() {
    logger.info('🔍 Examining batch results...');

    const openaiKey = config.openaiApiKey;
    if (!openaiKey) {
        throw new Error('❌ Missing OpenAI API key');
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // The batch ID from the previous run
    const batchId = 'batch_68b7619b52388190aeece8337b86ba6c';

    try {
        // Get batch job details
        logger.info(`📊 Retrieving batch job: ${batchId}`);
        const batch = await openai.batches.retrieve(batchId);

        logger.info('✅ Batch job details:', {
            id: batch.id,
            status: batch.status,
            total: batch.request_counts.total,
            completed: batch.request_counts.completed,
            failed: batch.request_counts.failed,
            output_file_id: batch.output_file_id,
            error_file_id: batch.error_file_id
        });

        if (batch.status !== 'completed') {
            logger.error(`❌ Batch is not completed. Status: ${batch.status}`);
            return;
        }

        if (!batch.output_file_id) {
            logger.error('❌ No output file available');
            return;
        }

        // Download output file
        logger.info(`📥 Downloading output file: ${batch.output_file_id}`);
        const outputFile = await openai.files.content(batch.output_file_id);
        const outputContent = await outputFile.text();

        // Save raw output for examination
        const rawOutputPath = 'batch_results_raw.jsonl';
        fs.writeFileSync(rawOutputPath, outputContent);
        logger.info(`💾 Raw output saved to: ${rawOutputPath}`);

        // Examine the structure
        logger.info('🔍 Examining output structure...');
        const lines = outputContent.trim().split('\n').filter(Boolean);
        logger.info(`📊 Found ${lines.length} result lines`);

        // Parse and examine each line
        for (let i = 0; i < lines.length; i++) {
            const lineNumber = i + 1;
            const line = lines[i];

            try {
                logger.info(`\n📋 RESULT ${lineNumber}:`);
                logger.info(`   Raw length: ${line.length} characters`);
                logger.info(`   First 100 chars: ${line.substring(0, 100)}...`);

                const result = JSON.parse(line);

                logger.info(`   ✅ Valid JSON structure:`);
                logger.info(`      custom_id: ${result.custom_id}`);
                logger.info(`      response.status_code: ${result.response?.status_code}`);
                logger.info(`      response.body.choices: ${result.response?.body?.choices?.length || 0}`);

                if (result.response?.body?.choices?.[0]?.message?.content) {
                    const content = result.response.body.choices[0].message.content;
                    logger.info(`      content length: ${content.length} characters`);
                    logger.info(`      content preview: ${content.substring(0, 200)}...`);

                    // Try to parse the AI response content
                    try {
                        const aiResponse = JSON.parse(content);
                        logger.info(`      ✅ AI response is valid JSON`);
                        logger.info(`         business_events: ${aiResponse.business_events?.length || 0}`);
                        logger.info(`         article.headline: ${aiResponse.article?.headline?.substring(0, 50)}...`);

                        // Save individual response for detailed inspection
                        const responseFile = `batch_response_${lineNumber}.json`;
                        fs.writeFileSync(responseFile, JSON.stringify(aiResponse, null, 2));
                        logger.info(`         💾 Saved to: ${responseFile}`);

                    } catch (contentError: any) {
                        logger.error(`      ❌ AI response content is not valid JSON: ${contentError.message}`);
                        logger.info(`      📋 Raw content: ${content.substring(0, 500)}...`);
                    }
                }

                if (result.error) {
                    logger.error(`      ❌ Request had error: ${JSON.stringify(result.error)}`);
                }

            } catch (parseError: any) {
                logger.error(`   ❌ Line ${lineNumber} is not valid JSON: ${parseError.message}`);
                logger.info(`      Raw line: ${line.substring(0, 200)}...`);

                // Save problematic line for debugging
                fs.writeFileSync(`batch_problem_line_${lineNumber}.txt`, line);
                logger.info(`      💾 Saved problematic line to: batch_problem_line_${lineNumber}.txt`);
            }
        }

        // Download error file if it exists
        if (batch.error_file_id) {
            logger.info(`\n⚠️ Downloading error file: ${batch.error_file_id}`);
            const errorFile = await openai.files.content(batch.error_file_id);
            const errorContent = await errorFile.text();

            fs.writeFileSync('batch_errors.jsonl', errorContent);
            logger.info('💾 Error file saved to: batch_errors.jsonl');

            const errorLines = errorContent.trim().split('\n').filter(Boolean);
            logger.info(`📊 Found ${errorLines.length} error entries`);
        }

        // Summary
        console.log('\n📋 EXAMINATION COMPLETE!');
        console.log('='.repeat(50));
        console.log(`📊 Total results: ${lines.length}`);
        console.log(`📊 Batch success rate: ${Math.round((batch.request_counts.completed / batch.request_counts.total) * 100)}%`);
        console.log('📁 Files created:');
        console.log(`   📄 batch_results_raw.jsonl - Raw output from OpenAI`);
        console.log(`   📋 batch_response_*.json - Individual AI responses (if valid)`);
        if (batch.error_file_id) {
            console.log(`   ⚠️ batch_errors.jsonl - Error details`);
        }

    } catch (error: any) {
        logger.error('❌ Failed to examine results:', error.message);
        throw error;
    }
}

// Run the examination
examineBatchResults();
