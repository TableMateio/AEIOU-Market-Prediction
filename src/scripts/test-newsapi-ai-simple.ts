#!/usr/bin/env npx tsx

/**
 * Simple NewsAPI.ai test to verify API key and get sample Apple articles with full content
 */

import { config } from 'dotenv';
import { newsApiAiService } from '../services/newsApiAiService.js';
import { logger } from '../utils/logger.js';

// Load environment variables
config();

async function testNewsApiAi() {
    logger.info('🧪 Testing NewsAPI.ai with Apple articles...');

    try {
        // Check if API key is available
        const apiKey = process.env.NEWSAPIAI_API_KEY;
        if (!apiKey) {
            logger.error('❌ NEWSAPIAI_API_KEY not found in environment variables');
            logger.info('💡 Please add NEWSAPIAI_API_KEY=your_key_here to your .env file');
            return;
        }

        logger.info('✅ API key found, testing connection...');

        // Test connection first
        const connectionTest = await newsApiAiService.testConnection();
        logger.info(`🔍 Connection test: ${connectionTest.message}`);

        if (!connectionTest.success) {
            logger.error('❌ Connection failed, cannot proceed with article test');
            return;
        }

        // Get sample Apple articles
        logger.info('🍎 Fetching Apple articles with full content...');

        const articles = await newsApiAiService.searchAppleArticles({
            query: 'Apple OR AAPL OR "Apple Inc"',
            pageSize: 5, // Start small to test
            sortBy: 'publishedAt'
        });

        logger.info(`📊 Retrieved ${articles.length} articles`);

        if (articles.length === 0) {
            logger.warn('⚠️ No articles found - this could indicate API issues or no recent Apple news');
            return;
        }

        // Analyze the articles we got
        let fullContentCount = 0;
        let avgContentLength = 0;

        logger.info('\n📄 Article Analysis:');
        logger.info('='.repeat(60));

        articles.forEach((article, index) => {
            const contentLength = article.body ? article.body.length : 0;
            const hasFullContent = contentLength > 200; // Reasonable threshold for "full" content

            if (hasFullContent) {
                fullContentCount++;
                avgContentLength += contentLength;
            }

            logger.info(`\n📰 Article ${index + 1}:`);
            logger.info(`   Title: ${article.title}`);
            logger.info(`   Source: ${article.source}`);
            logger.info(`   Published: ${article.published_at}`);
            logger.info(`   URL: ${article.url}`);
            logger.info(`   Content Length: ${contentLength} characters`);
            logger.info(`   Has Full Content: ${hasFullContent ? '✅ YES' : '❌ NO'}`);

            if (article.body && article.body.length > 0) {
                const preview = article.body.substring(0, 200) + (article.body.length > 200 ? '...' : '');
                logger.info(`   Content Preview: "${preview}"`);
            } else {
                logger.info(`   Content Preview: ❌ No body content available`);
            }

            if (article.keywords && article.keywords.length > 0) {
                logger.info(`   Keywords: ${article.keywords.slice(0, 5).join(', ')}`);
            }

            if (article.relevance_score) {
                logger.info(`   Relevance Score: ${article.relevance_score}`);
            }
        });

        // Summary statistics
        avgContentLength = fullContentCount > 0 ? avgContentLength / fullContentCount : 0;
        const fullContentRate = (fullContentCount / articles.length) * 100;

        logger.info('\n📊 Summary Statistics:');
        logger.info('='.repeat(60));
        logger.info(`Total Articles: ${articles.length}`);
        logger.info(`Articles with Full Content: ${fullContentCount} (${Math.round(fullContentRate)}%)`);
        logger.info(`Average Content Length: ${Math.round(avgContentLength)} characters`);

        // Apple relevance check
        const appleRelevant = articles.filter(article =>
            article.title.toLowerCase().includes('apple') ||
            article.body?.toLowerCase().includes('apple') ||
            article.title.toLowerCase().includes('aapl')
        );

        const relevanceRate = (appleRelevant.length / articles.length) * 100;
        logger.info(`Apple Relevance: ${appleRelevant.length}/${articles.length} (${Math.round(relevanceRate)}%)`);

        // Overall assessment
        logger.info('\n🎯 Overall Assessment:');
        logger.info('='.repeat(60));

        if (fullContentRate >= 80) {
            logger.info('✅ EXCELLENT: NewsAPI.ai provides full article content consistently');
        } else if (fullContentRate >= 50) {
            logger.info('⚠️ MIXED: Some articles have full content, others may be truncated');
        } else {
            logger.info('❌ POOR: Most articles lack full content - may only provide summaries/headlines');
        }

        if (relevanceRate >= 80) {
            logger.info('✅ EXCELLENT: Apple filtering is working well');
        } else if (relevanceRate >= 60) {
            logger.info('⚠️ GOOD: Most articles are Apple-relevant');
        } else {
            logger.info('❌ POOR: Apple filtering needs improvement');
        }

        if (avgContentLength > 1000) {
            logger.info('✅ EXCELLENT: Articles are substantial and detailed');
        } else if (avgContentLength > 500) {
            logger.info('⚠️ GOOD: Articles have reasonable length');
        } else {
            logger.info('❌ POOR: Articles are too short, likely summaries only');
        }

        // Recommendations
        logger.info('\n💡 Recommendations:');
        if (fullContentRate >= 80 && relevanceRate >= 80) {
            logger.info('🚀 NewsAPI.ai is ready for production use!');
            logger.info('   • Integrate into your article collection pipeline');
            logger.info('   • Scale up to collect hundreds of articles');
            logger.info('   • Perfect for ML training data');
        } else {
            logger.info('🔧 Consider these improvements:');
            if (fullContentRate < 80) {
                logger.info('   • Check if paid tier provides better full content access');
                logger.info('   • May need to use article scraping as backup');
            }
            if (relevanceRate < 80) {
                logger.info('   • Refine search query for better Apple relevance');
                logger.info('   • Consider using multiple specific queries');
            }
        }

    } catch (error: any) {
        logger.error('❌ NewsAPI.ai test failed:', {
            error: error.message,
            stack: error.stack
        });

        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            logger.info('💡 This looks like an API key issue. Please verify:');
            logger.info('   1. Your NEWSAPIAI_API_KEY is correct in .env file');
            logger.info('   2. Your NewsAPI.ai account is active');
            logger.info('   3. You have remaining API credits/requests');
        }
    }
}

// Run the test
testNewsApiAi().catch(error => {
    logger.error('❌ Test execution failed:', error);
    process.exit(1);
});
