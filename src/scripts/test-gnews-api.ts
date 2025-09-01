#!/usr/bin/env npx tsx

import { GNewsService } from '../services/gnewsService';
import { DatabaseFactory } from '../data/storage/databaseFactory';
import { logger } from '../utils/logger';

/**
 * Quick test of GNews API to verify key works and get sample Apple articles
 */
async function testGNewsAPI() {
    try {
        logger.info('🧪 Testing GNews API with provided key...');

        // Initialize database and service
        const db = DatabaseFactory.create();
        const gnews = new GNewsService(db);

        // Test 1: Get recent Apple articles (last 7 days)
        logger.info('📰 Fetching recent Apple articles (last 7 days)...');

        const recentArticles = await gnews.searchAppleNews({
            dateFrom: getDateString(-7), // 7 days ago
            dateTo: getDateString(0),    // today
            maxArticles: 5,              // Small test batch
            sortBy: 'publishedAt'
        });

        logger.info(`✅ API Test Successful! Retrieved ${recentArticles.length} articles`);

        // Display sample results
        recentArticles.forEach((article, index) => {
            logger.info(`\n📄 Article ${index + 1}:`);
            logger.info(`  Title: ${article.title.substring(0, 80)}...`);
            logger.info(`  Source: ${article.source.name}`);
            logger.info(`  Published: ${article.publishedAt}`);
            logger.info(`  URL: ${article.url}`);
            logger.info(`  Content Length: ${article.content ? article.content.length : 0} characters`);
            logger.info(`  Has Full Content: ${article.content ? '✅ YES' : '❌ NO'}`);
        });

        // Store the test articles
        if (recentArticles.length > 0) {
            logger.info('\n💾 Storing test articles in database...');
            await gnews.storeArticles(recentArticles, {
                searchDate: new Date().toISOString(),
                dateFrom: getDateString(-7),
                dateTo: getDateString(0)
            });
            logger.info('✅ Test articles stored successfully');
        }

        // Display usage info
        const usage = gnews.getUsageInfo();
        logger.info(`\n📊 API Usage Info:`);
        logger.info(`  Daily Limit: ${usage.dailyLimit} requests`);
        logger.info(`  Used Today: ${recentArticles.length}/${usage.dailyLimit}`);
        logger.info(`  Remaining: ${usage.dailyLimit - recentArticles.length}`);
        logger.info(`  Recommendation: ${usage.recommended}`);

        return recentArticles.length > 0;

    } catch (error: any) {
        logger.error('❌ GNews API Test Failed:', error.message);

        if (error.message.includes('rate limit')) {
            logger.error('💡 Rate limit exceeded - try again in 24 hours');
        } else if (error.message.includes('invalid')) {
            logger.error('💡 Check your API key in .env file');
        } else {
            logger.error('💡 Check your internet connection and API key');
        }

        return false;
    }
}

function getDateString(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysAgo);
    return date.toISOString().split('T')[0];
}

// Run test
if (require.main === module) {
    testGNewsAPI()
        .then((success) => {
            if (success) {
                logger.info('\n🎉 GNews API is working! Ready to collect historical data.');
                logger.info('💡 Next step: Run collect-historical-apple-news.ts');
            } else {
                logger.error('\n💥 Fix API issues before proceeding');
            }
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            logger.error('💥 Fatal error in GNews test:', error);
            process.exit(1);
        });
}
