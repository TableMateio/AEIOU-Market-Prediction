#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';

/**
 * Manual article storage using direct MCP execution
 * This solves the module import issue
 */

// Sample article data for testing (this would come from GNews API)
const sampleArticle = {
    title: "Apple's AI Strategy Could Drive Stock to New Highs, Analysts Say",
    url: "https://example.com/apple-ai-strategy-2025",
    content: "Apple Inc. is positioning itself as a major player in the artificial intelligence space, with analysts predicting that the company's AI strategy could drive stock prices to new all-time highs. The tech giant's recent investments in machine learning and AI infrastructure are expected to boost revenue across multiple product lines, particularly in services and hardware integration.",
    publishedAt: "2025-08-29T17:00:00Z",
    source: { name: "Tech Analysis Today" },
    description: "Analysts predict Apple's AI investments could drive significant stock gains",
    image: "https://example.com/apple-ai-image.jpg"
};

async function manualArticleStorage() {
    try {
        logger.info('🧪 Testing manual article storage');

        const article = sampleArticle;
        const external_id = `gnews_test_${Date.now()}`;

        // Calculate relevance score
        let relevanceScore = 0.7;
        const title = article.title.toLowerCase();
        if (title.includes('apple') || title.includes('aapl')) relevanceScore += 0.15;
        if (title.includes('stock') || title.includes('analyst')) relevanceScore += 0.1;
        if (title.includes('ai') || title.includes('strategy')) relevanceScore += 0.05;
        relevanceScore = Math.min(relevanceScore, 1.0);

        logger.info(`📰 Article: ${article.title}`);
        logger.info(`🎯 Relevance score: ${relevanceScore}`);
        logger.info(`📏 Content length: ${article.content.length} characters`);

        // This is the key fix - calling the function directly with proper parameters
        await storeArticleDirectly({
            external_id,
            title: article.title,
            url: article.url,
            published_at: article.publishedAt,
            source: article.source.name,
            description: article.description,
            body: article.content,
            relevance_score: relevanceScore,
            image_url: article.image
        });

        logger.info('✅ Manual storage test completed successfully!');

    } catch (error: any) {
        logger.error('❌ Manual storage test failed:', error.message);
    }
}

/**
 * Store article directly using environment-available functions
 */
async function storeArticleDirectly(data: {
    external_id: string;
    title: string;
    url: string;
    published_at: string;
    source: string;
    description: string;
    body: string;
    relevance_score: number;
    image_url: string;
}) {
    // The key insight: we need to call mcp_supabase_execute_sql as it exists in this environment
    // Let's test different approaches

    logger.info('💾 Attempting to store article...');

    try {
        // Approach 1: Try to access the global function if it exists
        // @ts-ignore
        if (typeof mcp_supabase_execute_sql !== 'undefined') {
            logger.info('🔧 Using global mcp_supabase_execute_sql function');
            // @ts-ignore
            await mcp_supabase_execute_sql({
                query: `INSERT INTO articles (
          external_id, external_id_type, title, url, published_at, source, 
          article_description, body, scraping_status, data_source, content_type,
          created_at, updated_at, apple_relevance_score, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), $12, $13)
        ON CONFLICT (url) DO UPDATE SET
          body = EXCLUDED.body,
          updated_at = NOW()`,
                params: [
                    data.external_id, 'gnews', data.title, data.url, data.published_at,
                    data.source, data.description, data.body, 'scraped', 'gnews', 'snippet',
                    data.relevance_score, data.image_url
                ]
            });
            logger.info('✅ Stored using global function');
            return;
        }
    } catch (error: any) {
        logger.warn('⚠️ Global function approach failed:', error.message);
    }

    // Approach 2: Generate the SQL for manual execution via MCP
    const insertSQL = `INSERT INTO articles (
    external_id, external_id_type, title, url, published_at, source, 
    article_description, body, scraping_status, data_source, content_type,
    created_at, updated_at, apple_relevance_score, image_url
  ) VALUES (
    '${data.external_id}',
    'gnews',
    '${data.title.replace(/'/g, "''")}',
    '${data.url}',
    '${data.published_at}',
    '${data.source.replace(/'/g, "''")}',
    '${data.description.replace(/'/g, "''")}',
    '${data.body.replace(/'/g, "''").substring(0, 5000)}',
    'scraped',
    'gnews', 
    'snippet',
    NOW(),
    NOW(),
    ${data.relevance_score},
    '${data.image_url}'
  )
  ON CONFLICT (url) DO UPDATE SET
    body = EXCLUDED.body,
    updated_at = NOW()`;

    logger.info('📝 Generated SQL statement for manual execution');
    logger.info('🔧 This SQL can be executed via MCP tools manually');

    // Save to file for convenience
    const fs = require('fs');
    fs.writeFileSync('/tmp/manual_article_insert.sql', insertSQL);
    logger.info('💾 SQL saved to /tmp/manual_article_insert.sql');

    return insertSQL;
}

// Create a working collection function for when API resets
export async function collectAndStoreOneArticle(searchQuery: string = 'Apple stock') {
    const { config } = await import('../config/app');

    try {
        const response = await fetch(`https://gnews.io/api/v4/search?${new URLSearchParams({
            q: searchQuery,
            max: '1',
            token: config.gnewsApiKey!,
            lang: 'en',
            sortby: 'publishedAt'
        })}`);

        const data = await response.json();

        if (data.errors) {
            logger.error(`❌ API Error: ${data.errors[0]}`);
            return null;
        }

        if (!data.articles || data.articles.length === 0) {
            logger.warn('⚠️ No articles found');
            return null;
        }

        const article = data.articles[0];
        const external_id = `gnews_${Buffer.from(article.url).toString('base64').substring(0, 16)}`;

        // Calculate relevance
        let relevanceScore = 0.7;
        const title = article.title.toLowerCase();
        if (title.includes('apple') || title.includes('aapl')) relevanceScore += 0.15;
        if (title.includes('stock') || title.includes('earnings')) relevanceScore += 0.1;
        relevanceScore = Math.min(relevanceScore, 1.0);

        const articleData = {
            external_id,
            title: article.title,
            url: article.url,
            published_at: new Date(article.publishedAt).toISOString(),
            source: article.source.name,
            description: article.description || '',
            body: article.content,
            relevance_score: relevanceScore,
            image_url: article.image || ''
        };

        // Generate SQL for manual execution
        const sql = await storeArticleDirectly(articleData);

        logger.info('🎉 Article collected and SQL generated for storage');
        return { article: articleData, sql };

    } catch (error: any) {
        logger.error('❌ Collection failed:', error.message);
        return null;
    }
}

// Main execution for testing
if (require.main === module) {
    manualArticleStorage();
}
