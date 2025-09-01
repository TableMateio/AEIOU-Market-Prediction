#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';
import { config } from '../config/app';

/**
 * Comprehensive GNews collection using our full daily quota
 * 
 * GNews API Limits:
 * - 100 requests per day
 * - 10 articles per request  
 * - Total: up to 1,000 articles per day
 * 
 * Strategy: Collect diverse Apple content across different time periods and search terms
 */
async function comprehensiveGNewsCollection() {
    try {
        logger.info('🚀 Starting comprehensive GNews collection');
        logger.info('📊 Daily capacity: 100 requests = 1,000 articles');

        let totalArticles = 0;
        let requestsUsed = 0;
        const maxRequests = 95; // Leave some buffer

        // Define search strategies to get diverse content
        const searchStrategies = [
            // Core Apple terms
            { query: 'Apple OR AAPL', label: 'Core Apple', requests: 15 },
            { query: '"Apple Inc"', label: 'Apple Inc Official', requests: 10 },

            // Product-specific
            { query: 'iPhone OR iPad OR Mac', label: 'Apple Products', requests: 10 },
            { query: 'iPhone 15 OR iPhone 16 OR iPhone 17', label: 'iPhone Models', requests: 8 },

            // Business & Financial
            { query: 'Apple stock OR AAPL stock', label: 'Stock Discussion', requests: 10 },
            { query: 'Apple earnings OR Apple revenue', label: 'Financial Results', requests: 8 },
            { query: 'Warren Buffett Apple', label: 'Buffett/Apple', requests: 5 },

            // Strategic & Competitive  
            { query: 'Apple AI OR Apple artificial intelligence', label: 'Apple AI', requests: 8 },
            { query: 'Apple vs Samsung OR Apple vs Google', label: 'Competition', requests: 6 },
            { query: 'Apple services OR App Store', label: 'Services Business', requests: 5 },

            // Recent news by time periods
            { query: 'Apple', label: 'Recent Apple News', requests: 10, timeFilter: 'recent' }
        ];

        for (const strategy of searchStrategies) {
            if (requestsUsed >= maxRequests) {
                logger.warn(`⚠️ Approaching request limit (${requestsUsed}/${maxRequests}), stopping`);
                break;
            }

            logger.info(`\n📰 Strategy: ${strategy.label} (${strategy.requests} requests)`);

            for (let i = 0; i < strategy.requests && requestsUsed < maxRequests; i++) {
                try {
                    // Prepare API parameters
                    const params: any = {
                        q: strategy.query,
                        max: 10,
                        token: config.gnewsApiKey,
                        lang: 'en',
                        sortby: 'publishedAt'
                    };

                    // Add time filtering for recent news
                    if (strategy.timeFilter === 'recent') {
                        const fromDate = new Date();
                        fromDate.setDate(fromDate.getDate() - (i * 3)); // Spread across recent days
                        params.from = fromDate.toISOString().split('T')[0] + 'T00:00:00Z';
                    }

                    logger.info(`  📡 Request ${i + 1}/${strategy.requests}: ${strategy.query}`);

                    const response = await fetch(`https://gnews.io/api/v4/search?${new URLSearchParams(params)}`);
                    const data = await response.json();

                    if (data.errors) {
                        logger.error(`❌ API Error: ${data.errors.join(', ')}`);
                        break;
                    }

                    const articles = data.articles || [];
                    logger.info(`  ✅ Retrieved ${articles.length} articles`);

                    // Store each article
                    for (const article of articles) {
                        try {
                            await storeGNewsArticle(article, strategy.label);
                            totalArticles++;
                        } catch (storeError: any) {
                            logger.error(`❌ Storage error: ${storeError.message.substring(0, 100)}`);
                        }
                    }

                    requestsUsed++;

                    // Rate limiting - wait between requests
                    if (requestsUsed < maxRequests) {
                        await delay(1000 + Math.random() * 1000); // 1-2 second delay
                    }

                } catch (error: any) {
                    logger.error(`❌ Request error: ${error.message}`);

                    if (error.message.includes('rate limit') || error.message.includes('quota')) {
                        logger.error('💡 Rate limit hit, stopping collection');
                        break;
                    }
                }
            }
        }

        // Final summary
        logger.info('\n🎉 Comprehensive collection complete!');
        logger.info(`📊 Summary:`);
        logger.info(`  - Total articles collected: ${totalArticles}`);
        logger.info(`  - API requests used: ${requestsUsed}/100 daily limit`);
        logger.info(`  - Remaining capacity: ${100 - requestsUsed} requests`);
        logger.info(`  - Potential additional articles: ${(100 - requestsUsed) * 10}`);

        // Check final database status
        await showFinalStats();

        return { totalArticles, requestsUsed };

    } catch (error: any) {
        logger.error('💥 Fatal error in comprehensive collection:', error.message);
        throw error;
    }
}

/**
 * Store a single GNews article in the database
 */
async function storeGNewsArticle(article: any, strategyLabel: string): Promise<void> {
    const external_id = `gnews_${Buffer.from(article.url).toString('base64').substring(0, 16)}`;

    // Dynamic relevance scoring based on content
    let relevanceScore = 0.7; // Base score
    const title = article.title.toLowerCase();

    if (title.includes('aapl') || title.includes('stock')) relevanceScore += 0.15;
    if (title.includes('earnings') || title.includes('revenue')) relevanceScore += 0.1;
    if (title.includes('iphone') || title.includes('product')) relevanceScore += 0.05;

    relevanceScore = Math.min(relevanceScore, 1.0);

    // Store using MCP Supabase
    const { mcp_supabase_execute_sql } = require('../../../mcp_supabase');

    await mcp_supabase_execute_sql({
        query: `INSERT INTO articles (
      external_id, external_id_type, title, url, published_at, source, 
      article_description, body, scraping_status, data_source, content_type,
      created_at, updated_at, apple_relevance_score, image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), $12, $13)
    ON CONFLICT (url) DO UPDATE SET
      body = EXCLUDED.body,
      scraping_status = EXCLUDED.scraping_status,
      updated_at = NOW()`,
        params: [
            external_id,
            'gnews',
            article.title.substring(0, 500),
            article.url,
            new Date(article.publishedAt).toISOString(),
            article.source.name,
            article.description?.substring(0, 1000),
            article.content, // GNews snippet content
            'scraped',
            'gnews',
            'snippet',
            relevanceScore,
            article.image || null
        ]
    });
}

/**
 * Show final collection statistics
 */
async function showFinalStats(): Promise<void> {
    try {
        const { mcp_supabase_execute_sql } = require('../../../mcp_supabase');

        const result = await mcp_supabase_execute_sql({
            query: `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN data_source = 'gnews' THEN 1 END) as gnews_articles,
        COUNT(CASE WHEN scraping_status = 'scraped' THEN 1 END) as scraped_articles,
        AVG(CASE WHEN apple_relevance_score IS NOT NULL THEN apple_relevance_score END) as avg_relevance,
        COUNT(CASE WHEN apple_relevance_score >= 0.8 THEN 1 END) as high_relevance_articles
        FROM articles`
        });

        const stats = JSON.parse(result)[0];

        logger.info(`\n📈 Database Statistics:`);
        logger.info(`  - Total articles: ${stats.total}`);
        logger.info(`  - GNews articles: ${stats.gnews_articles}`);
        logger.info(`  - Scraped articles: ${stats.scraped_articles}`);
        logger.info(`  - Average relevance: ${parseFloat(stats.avg_relevance).toFixed(2)}`);
        logger.info(`  - High relevance (≥0.8): ${stats.high_relevance_articles}`);

    } catch (error: any) {
        logger.error('Error getting final stats:', error.message);
    }
}

/**
 * Simple delay function
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
if (require.main === module) {
    logger.info('🔧 GNews Comprehensive Collection');
    logger.info('📋 Target: Maximize our 100 requests/day = 1,000 articles');

    comprehensiveGNewsCollection()
        .then(({ totalArticles, requestsUsed }) => {
            logger.info(`\n🏆 Mission accomplished: ${totalArticles} articles collected using ${requestsUsed} requests`);
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Collection failed:', error);
            process.exit(1);
        });
}
