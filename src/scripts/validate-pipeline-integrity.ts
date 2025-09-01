#!/usr/bin/env tsx

/**
 * Pipeline Integrity Validation
 * 
 * Specific tests for pipeline completeness and data quality:
 * 1. No duplicates anywhere
 * 2. Don't process articles without body text  
 * 3. All articles with body → AI responses
 * 4. All AI responses → business factors
 * 5. Complete pipeline coverage verification
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('PipelineValidation');

async function main() {
    logger.info('🔍 Running comprehensive pipeline integrity validation');

    console.log('\n=== VALIDATION 1: NO DUPLICATES ===');
    console.log('Check for duplicate articles by URL:');
    console.log(`
    SELECT 'Article URL Duplicates' as check_type, url, COUNT(*) as count
    FROM articles 
    GROUP BY url 
    HAVING COUNT(*) > 1 
    ORDER BY count DESC;
    `);

    console.log('Check for duplicate AI responses by article:');
    console.log(`
    SELECT 'AI Response Duplicates' as check_type, article_id, COUNT(*) as count
    FROM ai_responses 
    GROUP BY article_id 
    HAVING COUNT(*) > 1 
    ORDER BY count DESC;
    `);

    console.log('Check for duplicate business factors by AI response + step:');
    console.log(`
    SELECT 'Business Factor Duplicates' as check_type, 
           ai_response_id, business_event_index, causal_step_index, COUNT(*) as count
    FROM business_factors_flat 
    GROUP BY ai_response_id, business_event_index, causal_step_index 
    HAVING COUNT(*) > 1 
    ORDER BY count DESC;
    `);
    console.log('Expected: All queries should return empty results (no duplicates)');

    console.log('\n=== VALIDATION 2: BODY TEXT REQUIREMENT ===');
    console.log('Articles without body text (should NOT be processed):');
    console.log(`
    SELECT 
        'Articles Missing Body' as check_type,
        data_source,
        COUNT(*) as articles_without_body,
        COUNT(ar.id) as ai_responses_created
    FROM articles a
    LEFT JOIN ai_responses ar ON a.id = ar.article_id
    WHERE a.body IS NULL OR length(trim(a.body)) < 50
    GROUP BY a.data_source
    ORDER BY articles_without_body DESC;
    `);
    console.log('Expected: ai_responses_created should be 0 for articles without body');

    console.log('\n=== VALIDATION 3: COMPLETE PROCESSING COVERAGE ===');
    console.log('Articles with body → AI responses coverage:');
    console.log(`
    SELECT 
        'Processing Coverage' as check_type,
        a.data_source,
        COUNT(*) as articles_with_body,
        COUNT(ar.id) as ai_responses,
        COUNT(bf.ai_response_id) as business_factors,
        ROUND(100.0 * COUNT(ar.id) / COUNT(*), 1) as ai_coverage_percent,
        ROUND(100.0 * COUNT(bf.ai_response_id) / COUNT(ar.id), 1) as bf_coverage_percent
    FROM articles a
    LEFT JOIN ai_responses ar ON a.id = ar.article_id AND ar.success = true
    LEFT JOIN business_factors_flat bf ON ar.id = bf.ai_response_id
    WHERE a.body IS NOT NULL AND length(trim(a.body)) >= 50
    GROUP BY a.data_source
    ORDER BY articles_with_body DESC;
    `);
    console.log('Expected: ai_coverage_percent and bf_coverage_percent should be 100%');

    console.log('\n=== VALIDATION 4: AI RESPONSE INTEGRITY ===');
    console.log('AI responses with structured output → business factors:');
    console.log(`
    SELECT 
        'AI Response Integrity' as check_type,
        COUNT(*) as total_ai_responses,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_responses,
        COUNT(CASE WHEN structured_output IS NOT NULL THEN 1 END) as with_structured_output,
        COUNT(DISTINCT bf.ai_response_id) as flattened_responses,
        ROUND(100.0 * COUNT(DISTINCT bf.ai_response_id) / COUNT(CASE WHEN structured_output IS NOT NULL THEN 1 END), 1) as flattening_coverage
    FROM ai_responses ar
    LEFT JOIN business_factors_flat bf ON ar.id = bf.ai_response_id
    WHERE ar.success = true;
    `);
    console.log('Expected: flattening_coverage should be 100%');

    console.log('\n=== VALIDATION 5: BUSINESS FACTORS COMPLETENESS ===');
    console.log('Business factors with complete article metadata:');
    console.log(`
    SELECT 
        'Metadata Completeness' as check_type,
        COUNT(*) as total_business_factors,
        COUNT(CASE WHEN article_data_source IS NOT NULL THEN 1 END) as with_data_source,
        COUNT(CASE WHEN article_headline IS NOT NULL THEN 1 END) as with_headline,
        COUNT(CASE WHEN article_published_at IS NOT NULL THEN 1 END) as with_timestamp,
        ROUND(100.0 * COUNT(CASE WHEN article_data_source IS NOT NULL THEN 1 END) / COUNT(*), 1) as metadata_completeness
    FROM business_factors_flat;
    `);
    console.log('Expected: metadata_completeness should be 100%');

    console.log('\n=== VALIDATION 6: PROCESSING EFFICIENCY ===');
    console.log('Data source effectiveness summary:');
    console.log(`
    SELECT 
        'Source Effectiveness' as check_type,
        a.data_source,
        COUNT(*) as total_articles,
        COUNT(CASE WHEN a.body IS NOT NULL AND length(trim(a.body)) >= 50 THEN 1 END) as processable_articles,
        COUNT(ar.id) as ai_responses,
        COUNT(bf.id) as business_factors,
        ROUND(100.0 * COUNT(CASE WHEN a.body IS NOT NULL THEN 1 END) / COUNT(*), 1) as body_success_rate,
        ROUND(AVG(CASE WHEN a.body IS NOT NULL THEN length(a.body) END), 0) as avg_body_length
    FROM articles a
    LEFT JOIN ai_responses ar ON a.id = ar.article_id AND ar.success = true
    LEFT JOIN business_factors_flat bf ON ar.id = bf.ai_response_id
    GROUP BY a.data_source
    ORDER BY total_articles DESC;
    `);
    console.log('Expected: GNews should have highest body_success_rate');

    console.log('\n=== VALIDATION 7: PIPELINE HEALTH CHECK ===');
    console.log('Overall pipeline health:');
    console.log(`
    WITH pipeline_stats AS (
        SELECT 
            COUNT(DISTINCT a.id) as total_articles,
            COUNT(DISTINCT CASE WHEN a.body IS NOT NULL AND length(trim(a.body)) >= 50 THEN a.id END) as processable_articles,
            COUNT(DISTINCT ar.article_id) as articles_with_ai,
            COUNT(DISTINCT bf.article_id) as articles_with_factors,
            COUNT(bf.id) as total_business_factors
        FROM articles a
        LEFT JOIN ai_responses ar ON a.id = ar.article_id AND ar.success = true
        LEFT JOIN business_factors_flat bf ON ar.id = bf.ai_response_id
    )
    SELECT 
        'Pipeline Health' as check_type,
        total_articles,
        processable_articles,
        articles_with_ai,
        articles_with_factors,
        total_business_factors,
        ROUND(100.0 * articles_with_ai / processable_articles, 1) as ai_processing_rate,
        ROUND(100.0 * articles_with_factors / articles_with_ai, 1) as flattening_rate,
        ROUND(total_business_factors::NUMERIC / articles_with_factors, 1) as avg_factors_per_article
    FROM pipeline_stats;
    `);
    console.log('Expected: ai_processing_rate and flattening_rate should be 100%');

    console.log('\n=== EXECUTION INSTRUCTIONS ===');
    console.log('1. Run each validation query above');
    console.log('2. Verify all expectations are met');
    console.log('3. Fix any issues before proceeding');
    console.log('4. All validations should pass for healthy pipeline');
    console.log('=====================================\n');

    logger.info('🎯 Pipeline validation queries generated');
    logger.info('📋 Execute each section to verify pipeline integrity');
}

if (require.main === module) {
    main().catch(console.error);
}
