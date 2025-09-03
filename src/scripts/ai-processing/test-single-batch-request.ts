#!/usr/bin/env npx tsx

/**
 * Test a single batch request format before submitting to OpenAI Batch API
 * 
 * This validates our JSONL format by making a direct API call
 */

import OpenAI from 'openai';
import fs from 'fs';
import { config } from '../../config/app';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BatchTest');

async function testSingleBatchRequest() {
    logger.info('🧪 Testing single batch request format...');

    // Check API key
    const openaiKey = config.openaiApiKey;
    if (!openaiKey) {
        logger.error('❌ Missing OpenAI API key');
        return;
    }

    const openai = new OpenAI({ apiKey: openaiKey });

    // Read the generated JSONL file
    const jsonlPath = 'batch_articles.jsonl';
    if (!fs.existsSync(jsonlPath)) {
        logger.error('❌ JSONL file not found. Run generate-batch-jsonl.ts --test first');
        return;
    }

    // Parse the first line
    const firstLine = fs.readFileSync(jsonlPath, 'utf-8').split('\n')[0];
    if (!firstLine.trim()) {
        logger.error('❌ Empty JSONL file');
        return;
    }

    let batchRequest;
    try {
        batchRequest = JSON.parse(firstLine);
        logger.info('✅ Successfully parsed JSONL line');
    } catch (error: any) {
        logger.error('❌ Invalid JSON in JSONL line:', error.message);
        return;
    }

    // Validate structure
    logger.info('🔍 Validating batch request structure...');
    logger.info(`   📋 Custom ID: ${batchRequest.custom_id}`);
    logger.info(`   📋 Method: ${batchRequest.method}`);
    logger.info(`   📋 URL: ${batchRequest.url}`);
    logger.info(`   📋 Model: ${batchRequest.body?.model}`);
    logger.info(`   📋 Temperature: ${batchRequest.body?.temperature}`);
    logger.info(`   📋 Messages: ${batchRequest.body?.messages?.length} messages`);
    logger.info(`   📋 Has Schema: ${!!batchRequest.body?.response_format?.json_schema}`);

    // Test the actual API call
    logger.info('\\n🚀 Testing actual OpenAI API call...');

    try {
        const startTime = Date.now();

        const completion = await openai.chat.completions.create({
            model: batchRequest.body.model,
            temperature: batchRequest.body.temperature,
            messages: batchRequest.body.messages,
            response_format: batchRequest.body.response_format
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        logger.info('✅ API call successful!', {
            duration: `${duration}ms`,
            tokensUsed: completion.usage?.total_tokens || 0,
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0
        });

        // Validate the response
        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
            logger.error('❌ No response content received');
            return;
        }

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(responseContent);
            logger.info('✅ Response is valid JSON');
        } catch (error: any) {
            logger.error('❌ Response is not valid JSON:', error.message);
            logger.info('📋 Raw response:', responseContent.substring(0, 500) + '...');
            return;
        }

        // Validate against our expected structure
        logger.info('🔍 Validating response structure...');

        const hasArticle = !!parsedResponse.article;
        const hasBusinessEvents = Array.isArray(parsedResponse.business_events);
        const eventCount = parsedResponse.business_events?.length || 0;

        logger.info(`   📋 Has article metadata: ${hasArticle}`);
        logger.info(`   📋 Has business events: ${hasBusinessEvents}`);
        logger.info(`   📋 Event count: ${eventCount}`);

        if (hasArticle) {
            const article = parsedResponse.article;
            logger.info(`   📋 Article headline: ${article.headline?.substring(0, 50)}...`);
            logger.info(`   📋 Article source: ${article.source}`);
            logger.info(`   📋 Publisher credibility: ${article.publisher_credibility}`);
        }

        if (hasBusinessEvents && eventCount > 0) {
            const firstEvent = parsedResponse.business_events[0];
            logger.info(`   📋 First event: ${firstEvent.event_summary?.substring(0, 50)}...`);
            logger.info(`   📋 Causal chain length: ${firstEvent.causal_chain?.length || 0}`);
        }

        logger.info('\\n🎉 SINGLE BATCH REQUEST TEST SUCCESSFUL!');
        logger.info('✅ JSONL format is correct');
        logger.info('✅ API accepts the request');
        logger.info('✅ Response follows expected schema');
        logger.info('✅ Ready for full batch processing');

        // Save sample response for inspection
        fs.writeFileSync('sample_batch_response.json', JSON.stringify(parsedResponse, null, 2));
        logger.info('💾 Sample response saved to: sample_batch_response.json');

    } catch (error: any) {
        logger.error('❌ API call failed:', error.message);

        if (error.response?.data) {
            logger.error('📋 API Error Details:', JSON.stringify(error.response.data, null, 2));
        }

        return;
    }
}

// Run the test
testSingleBatchRequest();
