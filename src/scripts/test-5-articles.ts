#!/usr/bin/env npx tsx

/**
 * Test with 5 Articles - Small Batch Processing
 * 
 * Tests the complete OpenAI Batch API pipeline with just 5 articles
 * to verify everything works before scaling up.
 */

import { OpenAIBatchPipeline } from './openai-batch-pipeline';
import { createLogger } from '../utils/logger';

const logger = createLogger('Test5Articles');

async function test5Articles() {
    logger.info('🧪 Testing OpenAI Batch API with 5 articles...');

    try {
        const pipeline = new OpenAIBatchPipeline();

        // Test with 5 articles in test mode
        const result = await pipeline.runPipeline({
            limit: 5,
            skipProcessed: true,
            testMode: false, // Real processing, not just test
            dryRun: false    // Actually submit to OpenAI
        });

        if (result) {
            console.log('\n🎉 5-ARTICLE TEST COMPLETE!');
            console.log('='.repeat(50));
            console.log(`📊 Batch ID: ${result.batchJob.id}`);
            console.log(`📊 Total Requests: ${result.batchJob.request_counts.total}`);
            console.log(`📊 Completed: ${result.batchJob.request_counts.completed}`);
            console.log(`📊 Failed: ${result.batchJob.request_counts.failed}`);
            console.log(`📊 Success Rate: ${Math.round((result.batchJob.request_counts.completed / result.batchJob.request_counts.total) * 100)}%`);
            console.log(`💾 Saved to Database: ${result.results.savedCount} articles`);
            console.log(`💰 Estimated Cost: ~$${(result.jsonlFile.estimatedTokens * 0.000005).toFixed(3)}`);

            if (result.batchJob.request_counts.failed > 0) {
                console.log('\n⚠️  Some requests failed - check batch_errors.jsonl for details');
            }
        }

    } catch (error: any) {
        logger.error('❌ 5-article test failed:', error.message);
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('1. Check OpenAI API key is valid');
        console.log('2. Ensure sufficient API credits');
        console.log('3. Verify JSONL format with validate-jsonl.ts');
        console.log('4. Review error logs above');
        process.exit(1);
    }
}

// Run the test
test5Articles();
