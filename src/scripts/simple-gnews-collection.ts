#!/usr/bin/env npx tsx

import axios from 'axios';
import { config } from '../config/app';
import { logger } from '../utils/logger';

/**
 * Simple GNews collection that stores articles directly in Supabase
 */
async function collectGNewsArticles() {
    try {
        logger.info('🚀 Starting simple GNews collection');

        // Test the API first
        const testResponse = await axios.get('https://gnews.io/api/v4/search', {
            params: {
                q: 'Apple',
                max: 5,
                token: config.gnewsApiKey,
                lang: 'en',
                sortby: 'publishedAt'
            }
        });

        logger.info(`✅ API Test: ${testResponse.data.articles.length} articles returned`);

        const articles = testResponse.data.articles;

        // Store articles using MCP Supabase directly
        for (const article of articles) {
            const external_id = `gnews_${Buffer.from(article.url).toString('base64').substring(0, 16)}`;

            logger.info(`📰 Storing: ${article.title.substring(0, 60)}...`);

            try {
                // Insert article using MCP
                const { mcp_supabase_execute_sql } = require('../../../mcp_supabase');

                await mcp_supabase_execute_sql({
                    query: `INSERT INTO articles (
            external_id, title, url, published_at, source, description, body, 
            scraping_status, created_at, updated_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9)
          ON CONFLICT (url) DO UPDATE SET
            body = EXCLUDED.body,
            scraping_status = EXCLUDED.scraping_status,
            updated_at = NOW(),
            metadata = EXCLUDED.metadata`,
                    params: [
                        external_id,
                        article.title.substring(0, 500),
                        article.url,
                        new Date(article.publishedAt).toISOString(),
                        article.source.name,
                        article.description?.substring(0, 1000),
                        article.content, // Full content!
                        'scraped', // Already have full content
                        JSON.stringify({
                            api_source: 'gnews',
                            image_url: article.image,
                            source_url: article.source.url,
                            collection_date: new Date().toISOString()
                        })
                    ]
                });

                logger.info(`✅ Stored: ${article.content.length} characters`);

            } catch (storeError: any) {
                logger.error(`❌ Storage error: ${storeError.message}`);
            }
        }

        // Get more articles from different time periods
        const timeRanges = [
            { label: 'Last 7 days', from: getDateString(-7), to: getDateString(0) },
            { label: 'Last month', from: getDateString(-30), to: getDateString(-7) },
            { label: '2 months ago', from: getDateString(-60), to: getDateString(-30) }
        ];

        for (const range of timeRanges) {
            try {
                logger.info(`\n📅 Collecting ${range.label}: ${range.from} to ${range.to}`);

                const response = await axios.get('https://gnews.io/api/v4/search', {
                    params: {
                        q: 'Apple OR AAPL',
                        max: 10,
                        token: config.gnewsApiKey,
                        lang: 'en',
                        sortby: 'publishedAt',
                        from: `${range.from}T00:00:00Z`,
                        to: `${range.to}T23:59:59Z`
                    }
                });

                logger.info(`📰 Found ${response.data.articles.length} articles`);

                for (const article of response.data.articles) {
                    const external_id = `gnews_${Buffer.from(article.url).toString('base64').substring(0, 16)}`;

                    try {
                        const { mcp_supabase_execute_sql } = require('../../../mcp_supabase');

                        await mcp_supabase_execute_sql({
                            query: `INSERT INTO articles (
                external_id, title, url, published_at, source, description, body, 
                scraping_status, created_at, updated_at, metadata
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9)
              ON CONFLICT (url) DO UPDATE SET
                body = EXCLUDED.body,
                scraping_status = EXCLUDED.scraping_status,
                updated_at = NOW()`,
                            params: [
                                external_id,
                                article.title.substring(0, 500),
                                article.url,
                                new Date(article.publishedAt).toISOString(),
                                article.source.name,
                                article.description?.substring(0, 1000),
                                article.content,
                                'scraped',
                                JSON.stringify({
                                    api_source: 'gnews',
                                    time_range: range.label,
                                    image_url: article.image,
                                    source_url: article.source.url
                                })
                            ]
                        });

                    } catch (error: any) {
                        logger.error(`❌ Error storing ${article.title.substring(0, 40)}: ${error.message}`);
                    }
                }

                // Rate limiting
                await delay(2000);

            } catch (error: any) {
                logger.error(`❌ Error collecting ${range.label}: ${error.message}`);
            }
        }

        // Final count
        const { mcp_supabase_execute_sql } = require('../../../mcp_supabase');
        const result = await mcp_supabase_execute_sql({
            query: `SELECT COUNT(*) as total,
              COUNT(CASE WHEN scraping_status = 'scraped' THEN 1 END) as with_content
              FROM articles 
              WHERE metadata->>'api_source' = 'gnews'`
        });

        const stats = JSON.parse(result)[0];
        logger.info(`\n🎉 Collection complete!`);
        logger.info(`📊 GNews articles: ${stats.total} total, ${stats.with_content} with full content`);

    } catch (error: any) {
        logger.error('💥 Fatal error:', error.message);
    }
}

function getDateString(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysAgo);
    return date.toISOString().split('T')[0];
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the collection
if (require.main === module) {
    collectGNewsArticles();
}
