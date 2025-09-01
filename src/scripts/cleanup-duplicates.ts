#!/usr/bin/env tsx

/**
 * Cleanup Duplicates Script
 * 
 * Removes duplicate articles, AI responses, and flattened data
 * Ensures data integrity across the pipeline
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('CleanupDuplicates');

async function main() {
    logger.info('🧹 Starting duplicate cleanup process');

    console.log('\n=== ARTICLE DUPLICATES ===');
    console.log('Find duplicate articles by URL:');
    console.log(`
    SELECT url, COUNT(*) as count 
    FROM articles 
    GROUP BY url 
    HAVING COUNT(*) > 1 
    ORDER BY count DESC;
    `);

    console.log('\nRemove duplicate articles (keep newest):');
    console.log(`
    DELETE FROM articles 
    WHERE id IN (
        SELECT id FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY url ORDER BY created_at DESC) as rn
            FROM articles
        ) ranked 
        WHERE rn > 1
    );
    `);

    console.log('\n=== AI RESPONSE DUPLICATES ===');
    console.log('Find duplicate AI responses by article:');
    console.log(`
    SELECT article_id, COUNT(*) as count 
    FROM ai_responses 
    GROUP BY article_id 
    HAVING COUNT(*) > 1 
    ORDER BY count DESC;
    `);

    console.log('\nRemove duplicate AI responses (keep newest):');
    console.log(`
    DELETE FROM ai_responses 
    WHERE id IN (
        SELECT id FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY article_id ORDER BY created_at DESC) as rn
            FROM ai_responses
        ) ranked 
        WHERE rn > 1
    );
    `);

    console.log('\n=== BUSINESS FACTORS DUPLICATES ===');
    console.log('Find duplicate business factors by AI response + step:');
    console.log(`
    SELECT ai_response_id, business_event_index, causal_step_index, COUNT(*) as count 
    FROM business_factors_flat 
    GROUP BY ai_response_id, business_event_index, causal_step_index 
    HAVING COUNT(*) > 1 
    ORDER BY count DESC;
    `);

    console.log('\nRemove duplicate business factors (keep newest):');
    console.log(`
    DELETE FROM business_factors_flat 
    WHERE id IN (
        SELECT id FROM (
            SELECT id, 
                   ROW_NUMBER() OVER (
                       PARTITION BY ai_response_id, business_event_index, causal_step_index 
                       ORDER BY created_at DESC
                   ) as rn
            FROM business_factors_flat
        ) ranked 
        WHERE rn > 1
    );
    `);

    console.log('\n=== ORPHANED DATA CLEANUP ===');
    console.log('Remove AI responses with missing articles:');
    console.log(`
    DELETE FROM ai_responses 
    WHERE article_id NOT IN (SELECT id FROM articles);
    `);

    console.log('\nRemove business factors with missing AI responses:');
    console.log(`
    DELETE FROM business_factors_flat 
    WHERE ai_response_id NOT IN (SELECT id FROM ai_responses);
    `);

    console.log('\n=== FINAL COUNTS ===');
    console.log('Check final counts:');
    console.log(`
    SELECT 
        'articles' as table_name, COUNT(*) as count FROM articles
    UNION ALL
    SELECT 
        'ai_responses' as table_name, COUNT(*) as count FROM ai_responses  
    UNION ALL
    SELECT 
        'business_factors_flat' as table_name, COUNT(*) as count FROM business_factors_flat;
    `);

    logger.info('📋 Duplicate cleanup queries generated');
    logger.info('🎯 Execute each section manually to clean data');
}

if (require.main === module) {
    main().catch(console.error);
}
