#!/usr/bin/env npx tsx

import { config } from '../config/app';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../data/storage/databaseFactory';
import { GNewsService } from '../services/gnewsService';

/**
 * Collect historical Apple articles using only GNews API (100/day with full content)
 */
async function collectGNewsAppleArticles() {
    try {
        logger.info('🚀 Starting GNews Apple article collection');

        // Initialize database and GNews service
        const db = DatabaseFactory.create();
        const gnews = new GNewsService(db);

        // Define strategic time periods for Apple news collection
        const timeRanges = [
            // Recent news (last 30 days) - most important
            {
                label: 'Recent_30_days',
                dateFrom: getDateString(-30),
                dateTo: getDateString(0),
                maxArticles: 10
            },
            // 2-3 months ago (quarterly earnings season)
            {
                label: 'Q_earnings_season',
                dateFrom: getDateString(-90),
                dateTo: getDateString(-60),
                maxArticles: 15
            },
            // 6 months ago (WWDC/product launches)
            {
                label: 'WWDC_product_season',
                dateFrom: getDateString(-180),
                dateTo: getDateString(-150),
                maxArticles: 15
            },
            // 8-10 months ago (different market conditions)
            {
                label: 'Market_conditions_8mo',
                dateFrom: getDateString(-300),
                dateTo: getDateString(-240),
                maxArticles: 10
            },
            // 1 year ago (annual comparison)
            {
                label: 'Annual_comparison',
                dateFrom: getDateString(-380),
                dateTo: getDateString(-350),
                maxArticles: 10
            }
        ];

        logger.info(`📅 Collecting articles across ${timeRanges.length} time periods`);
        logger.info(`🎯 Target: ${timeRanges.reduce((sum, range) => sum + range.maxArticles, 0)} articles total`);

        // Collect from GNews (full content, highest priority)
        logger.info('🔥 Phase: Collecting full-content articles from GNews API');

        let totalArticles = 0;
        let usedRequests = 0;

        for (const range of timeRanges) {
            try {
                logger.info(`\n📆 Collecting ${range.label}: ${range.dateFrom} to ${range.dateTo}`);

                const articles = await gnews.searchAppleNews({
                    dateFrom: range.dateFrom,
                    dateTo: range.dateTo,
                    maxArticles: range.maxArticles,
                    sortBy: 'publishedAt'
                });

                if (articles.length > 0) {
                    // Store in database with time range metadata
                    await gnews.storeArticles(articles, {
                        searchDate: new Date().toISOString(),
                        dateFrom: range.dateFrom,
                        dateTo: range.dateTo
                    });

                    logger.info(`✅ ${range.label}: ${articles.length} articles collected (full content)`);

                    // Show sample article
                    if (articles[0]) {
                        logger.info(`📄 Sample: "${articles[0].title.substring(0, 60)}..."`);
                        logger.info(`📏 Content length: ${articles[0].content.length} characters`);
                    }
                } else {
                    logger.warn(`⚠️ ${range.label}: No articles found for this period`);
                }

                totalArticles += articles.length;
                usedRequests += 1;

                // Rate limiting - wait between requests (important for free tier)
                if (usedRequests < timeRanges.length) {
                    logger.info('⏱️ Rate limiting... waiting 2 seconds');
                    await delay(2000);
                }

            } catch (error: any) {
                logger.error(`❌ Error collecting ${range.label}:`, error.message);

                if (error.message.includes('rate limit')) {
                    logger.error('💡 Rate limit hit - stopping collection');
                    break;
                }
            }
        }

        // Final summary
        logger.info('\n✅ GNews collection complete!');
        logger.info(`📊 Summary:`);
        logger.info(`  - Total articles collected: ${totalArticles}`);
        logger.info(`  - API requests used: ${usedRequests}/100 daily limit`);
        logger.info(`  - Remaining requests: ${100 - usedRequests}`);

        // Usage recommendations
        logger.info(`\n🎯 Next Steps:`);
        if (totalArticles >= 10) {
            logger.info(`  1. ✅ Sufficient data for AI analysis testing`);
            logger.info(`  2. Run AI analysis pipeline on collected articles`);
            logger.info(`  3. Validate news-to-price correlation (Phase 1 goal)`);
        } else {
            logger.info(`  1. Consider collecting from different date ranges`);
            logger.info(`  2. Try broader search terms if needed`);
        }

        return { totalArticles, usedRequests };

    } catch (error) {
        logger.error('❌ Error in GNews collection:', error);
        throw error;
    }
}

/**
 * Get date string for N days ago in YYYY-MM-DD format
 */
function getDateString(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysAgo);
    return date.toISOString().split('T')[0];
}

/**
 * Simple delay function
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Display current configuration
 */
function displayConfiguration() {
    logger.info('🔧 Configuration:');
    logger.info(`  - GNews API: ${config.gnewsApiKey ? '✅ Configured' : '❌ Missing'}`);
    logger.info(`  - Database: ${config.supabaseUrl ? 'Supabase' : 'Airtable'}`);

    logger.info('📈 Expected Results:');
    logger.info(`  - GNews: Up to 60 articles with full content`);
    logger.info(`  - Quality: High (full article body text)`);
    logger.info(`  - Cost: Free (100 requests/day limit)`);
}

// Main execution
if (require.main === module) {
    displayConfiguration();

    collectGNewsAppleArticles()
        .then(({ totalArticles, usedRequests }) => {
            logger.info(`🎉 Collection completed: ${totalArticles} articles, ${usedRequests} API calls used`);
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Fatal error in GNews collection:', error);
            process.exit(1);
        });
}
