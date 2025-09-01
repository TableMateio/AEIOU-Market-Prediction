#!/usr/bin/env tsx

/**
 * Process Articles with Validation
 * 
 * Complete processing pipeline with built-in validation:
 * 1. Collect more GNews articles (if quota available)
 * 2. Process ONLY articles with body text via AI
 * 3. Transform AI responses to business_factors_flat 
 * 4. Validate pipeline integrity
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('ProcessWithValidation');

async function main() {
    logger.info('🚀 Starting complete article processing with validation');

    console.log('\n=== STEP 1: PRE-PROCESSING VALIDATION ===');
    console.log('Check current state before processing:');
    console.log(`
    SELECT 
        'Current State' as status,
        COUNT(*) as total_articles,
        COUNT(CASE WHEN body IS NOT NULL AND length(trim(body)) >= 50 THEN 1 END) as processable_articles,
        COUNT(CASE WHEN data_source = 'gnews' THEN 1 END) as gnews_articles,
        COUNT(ar.id) as ai_responses,
        COUNT(bf.id) as business_factors
    FROM articles a
    LEFT JOIN ai_responses ar ON a.id = ar.article_id
    LEFT JOIN business_factors_flat bf ON ar.id = bf.ai_response_id;
    `);

    console.log('\n=== STEP 2: IDENTIFY PROCESSING TARGETS ===');
    console.log('Articles ready for AI processing (have body, no AI response yet):');
    console.log(`
    SELECT 
        'Processing Targets' as status,
        a.data_source,
        COUNT(*) as articles_ready_for_ai,
        AVG(length(a.body)) as avg_body_length
    FROM articles a
    LEFT JOIN ai_responses ar ON a.id = ar.article_id
    WHERE a.body IS NOT NULL 
    AND length(trim(a.body)) >= 50
    AND ar.id IS NULL
    GROUP BY a.data_source
    ORDER BY articles_ready_for_ai DESC;
    `);

    console.log('\n=== STEP 3: COLLECT MORE GNEWS ARTICLES ===');
    console.log('Run GNews collection to maximize high-quality articles:');
    console.log('npx tsx src/scripts/maximize-gnews-collection.ts');
    console.log('(Then execute the generated SQL)');

    console.log('\n=== STEP 4: AI PROCESSING INSTRUCTIONS ===');
    console.log('Process articles with updated OpenAI agent:');
    console.log(`
    -- Get list of articles ready for processing
    SELECT 
        a.id,
        a.title,
        a.url,
        a.data_source,
        length(a.body) as body_length
    FROM articles a
    LEFT JOIN ai_responses ar ON a.id = ar.article_id
    WHERE a.body IS NOT NULL 
    AND length(trim(a.body)) >= 50
    AND ar.id IS NULL
    ORDER BY a.data_source, a.published_at DESC;
    `);
    console.log('Use your updated OpenAI agent to process these articles');
    console.log('(Skip any articles without sufficient body text)');

    console.log('\n=== STEP 5: TRANSFORM TO BUSINESS FACTORS ===');
    console.log('After AI processing, transform to ML table:');
    console.log('npx tsx src/scripts/transform-with-article-metadata.ts');
    console.log('(Execute the generated transformation query)');

    console.log('\n=== STEP 6: POST-PROCESSING VALIDATION ===');
    console.log('Validate complete pipeline integrity:');
    console.log('npx tsx src/scripts/validate-pipeline-integrity.ts');
    console.log('(Run all validation queries to ensure 100% coverage)');

    console.log('\n=== STEP 7: FINAL QUALITY CHECK ===');
    console.log('Verify no processing waste or gaps:');
    console.log(`
    -- Articles processed but shouldn't have been (no body)
    SELECT 'Waste Check' as type, COUNT(*) as wasted_processing
    FROM articles a
    JOIN ai_responses ar ON a.id = ar.article_id
    WHERE a.body IS NULL OR length(trim(a.body)) < 50;
    
    -- Articles with body but not processed  
    SELECT 'Gap Check' as type, COUNT(*) as missed_articles
    FROM articles a
    LEFT JOIN ai_responses ar ON a.id = ar.article_id
    WHERE a.body IS NOT NULL 
    AND length(trim(a.body)) >= 50
    AND ar.id IS NULL;
    
    -- AI responses not flattened
    SELECT 'Flattening Gap' as type, COUNT(*) as unflattened_responses
    FROM ai_responses ar
    LEFT JOIN business_factors_flat bf ON ar.id = bf.ai_response_id
    WHERE ar.success = true 
    AND ar.structured_output IS NOT NULL
    AND bf.ai_response_id IS NULL;
    `);
    console.log('Expected: All counts should be 0 (no waste, no gaps)');

    console.log('\n=== SUCCESS CRITERIA ===');
    console.log('✅ 100% of articles with body text processed by AI');
    console.log('✅ 100% of successful AI responses flattened to business_factors_flat');
    console.log('✅ 0 duplicate records anywhere in pipeline');
    console.log('✅ 0 articles processed that lack sufficient body text');
    console.log('✅ Complete article metadata in business_factors_flat');

    console.log('\n=== EXECUTION SEQUENCE ===');
    console.log('1. Run pre-processing validation queries above');
    console.log('2. Collect more GNews articles if needed');
    console.log('3. Process articles with body text via OpenAI agent');
    console.log('4. Transform AI responses to business_factors_flat');
    console.log('5. Run post-processing validation');
    console.log('6. Verify success criteria met');
    console.log('=====================================\n');

    logger.info('🎯 Complete processing workflow outlined');
    logger.info('📋 Ready to process with updated OpenAI agent');
}

if (require.main === module) {
    main().catch(console.error);
}
