#!/usr/bin/env npx tsx

import { config } from '../config/app';
import { logger } from '../utils/logger';
import { DatabaseFactory } from '../data/storage/databaseFactory';
import { GNewsService } from '../services/gnewsService';
import { NewsDataService } from '../services/newsdataService';

/**
 * Collect historical Apple articles from multiple free APIs across different time periods
 * 
 * This script will:
 * 1. Use GNews API (100/day) for full article content 
 * 2. Use NewsData.io (500/day) for article discovery
 * 3. Collect articles from strategic time periods (8 months ago, 1 month ago, etc.)
 * 4. Store everything in our database for AI analysis
 */

async function collectHistoricalAppleNews() {
    try {
        logger.info('🚀 Starting historical Apple news collection');

        // Initialize database and services
        const db = DatabaseFactory.create();
        const gnews = new GNewsService(db);
        const newsdata = new NewsDataService(db);

        // Define strategic time periods for Apple news collection
        const timeRanges = [
            // Recent news (last 30 days)
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

        // Step 1: Collect from GNews (full content, higher priority)
        logger.info('🔥 Phase 1: Collecting full-content articles from GNews API');
        const gnewsResults = await gnews.getHistoricalAppleArticles(timeRanges);

        let totalGNewsArticles = 0;
        for (const [label, articles] of Object.entries(gnewsResults)) {
            logger.info(`  ${label}: ${articles.length} articles (full content)`);
            totalGNewsArticles += articles.length;
        }

        // Step 2: Collect from NewsData.io (headlines only, but more sources)
        logger.info('📰 Phase 2: Collecting article metadata from NewsData.io');
        const newsdataResults = await newsdata.getHistoricalAppleArticles(
            timeRanges.map(range => ({
                ...range,
                maxArticles: 20 // More articles since we have higher daily limit
            }))
        );

        let totalNewsDataArticles = 0;
        for (const [label, articles] of Object.entries(newsdataResults)) {
            logger.info(`  ${label}: ${articles.length} articles (metadata only)`);
            totalNewsDataArticles += articles.length;
        }

        // Summary
        logger.info('✅ Historical collection complete!');
        logger.info(`📊 Summary:`);
        logger.info(`  - GNews articles (full content): ${totalGNewsArticles}`);
        logger.info(`  - NewsData articles (metadata): ${totalNewsDataArticles}`);
        logger.info(`  - Total articles collected: ${totalGNewsArticles + totalNewsDataArticles}`);

        // API usage summary
        logger.info(`🔑 API Usage:`);
        logger.info(`  - GNews: ${totalGNewsArticles}/100 daily requests used`);
        logger.info(`  - NewsData: ${totalNewsDataArticles}/500 daily requests used`);

        // Next steps recommendation
        logger.info(`🎯 Next Steps:`);
        logger.info(`  1. Run article scraping on NewsData URLs for full content`);
        logger.info(`  2. Process articles through AI analysis pipeline`);
        logger.info(`  3. Validate news-to-price correlation (Phase 1 goal)`);

    } catch (error) {
        logger.error('❌ Error in historical news collection:', error);
        process.exit(1);
    }
}

/**
 * Get date string for N days ago in YYYY-MM-DD format
 */
function getDateString(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysAgo); // daysAgo is negative for past dates
    return date.toISOString().split('T')[0];
}

/**
 * Display current configuration and limits
 */
function displayConfiguration() {
    logger.info('🔧 Configuration:');
    logger.info(`  - GNews API: ${config.gnewsApiKey ? '✅ Configured' : '❌ Missing'}`);
    logger.info(`  - NewsData API: ${config.newsdataApiKey ? '✅ Configured' : '❌ Missing'}`);
    logger.info(`  - Database: ${config.supabaseUrl ? 'Supabase' : 'Airtable'}`);

    logger.info('📈 Daily Limits:');
    logger.info(`  - GNews: 100 requests/day (full content)`);
    logger.info(`  - NewsData: 500 requests/day (metadata only)`);
    logger.info(`  - Total potential: ~600 articles/day`);
}

// Main execution
if (require.main === module) {
    displayConfiguration();
    collectHistoricalAppleNews()
        .then(() => {
            logger.info('🎉 Historical Apple news collection completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Fatal error in historical news collection:', error);
            process.exit(1);
        });
}
