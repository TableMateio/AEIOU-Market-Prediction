#!/usr/bin/env npx tsx

/**
 * Direct NewsAPI.ai test with explicit environment loading
 */

import { config } from 'dotenv';
import axios from 'axios';
import { logger } from '../utils/logger.js';

// Load environment variables from .env file
config();

async function testNewsApiAiDirect() {
    logger.info('🧪 Testing NewsAPI.ai directly with Apple articles...');

    try {
        // Get API key
        const apiKey = process.env.NEWSAPIAI_API_KEY;
        if (!apiKey) {
            logger.error('❌ NEWSAPIAI_API_KEY not found in environment variables');
            logger.info('💡 Available env vars:', Object.keys(process.env).filter(key => key.includes('API')));
            return;
        }

        logger.info('✅ API key found:', `${apiKey.substring(0, 8)}...`);

        // Make direct API call to NewsAPI.ai
        logger.info('🔍 Making direct API call to NewsAPI.ai...');

        const response = await axios.get('https://api.newsapi.ai/api/v1/everything', {
            params: {
                q: 'Apple OR AAPL OR "Apple Inc"',
                sortBy: 'publishedAt',
                pageSize: 5,
                language: 'en',
                apiKey: apiKey
            },
            timeout: 30000
        });

        logger.info('📊 API Response Status:', response.status);
        logger.info('📊 Response Data Keys:', Object.keys(response.data));

        if (response.data.status !== 'ok') {
            logger.error('❌ API returned error status:', response.data);
            return;
        }

        const articles = response.data.articles || [];
        logger.info(`📰 Retrieved ${articles.length} articles`);

        if (articles.length === 0) {
            logger.warn('⚠️ No articles found');
            logger.info('Full response:', JSON.stringify(response.data, null, 2));
            return;
        }

        // Analyze the articles
        logger.info('\n📄 Article Analysis:');
        logger.info('='.repeat(80));

        articles.forEach((article: any, index: number) => {
            const title = article.title || 'No title';
            const source = article.source || 'Unknown source';
            const publishedAt = article.published_at || article.publishedAt || 'Unknown date';
            const url = article.url || 'No URL';

            // Check for different content fields
            const content = article.content || article.description || article.snippet || '';
            const contentLength = content.length;

            logger.info(`\n📰 Article ${index + 1}:`);
            logger.info(`   Title: ${title}`);
            logger.info(`   Source: ${source}`);
            logger.info(`   Published: ${publishedAt}`);
            logger.info(`   URL: ${url}`);
            logger.info(`   Content Length: ${contentLength} characters`);

            // Show available fields
            logger.info(`   Available Fields: ${Object.keys(article).join(', ')}`);

            if (content && content.length > 0) {
                const preview = content.substring(0, 300) + (content.length > 300 ? '...' : '');
                logger.info(`   Content Preview: "${preview}"`);

                // Check if it looks like full content or just a summary
                const hasFullContent = content.length > 500 && !content.includes('[Removed]');
                logger.info(`   Appears to be full content: ${hasFullContent ? '✅ YES' : '❌ NO (likely summary)'}`);
            } else {
                logger.info(`   Content: ❌ No content available`);
            }

            // Check Apple relevance
            const appleRelevant = title.toLowerCase().includes('apple') ||
                content.toLowerCase().includes('apple') ||
                title.toLowerCase().includes('aapl');
            logger.info(`   Apple Relevant: ${appleRelevant ? '✅ YES' : '❌ NO'}`);
        });

        // Overall analysis
        const fullContentCount = articles.filter((article: any) => {
            const content = article.content || article.description || article.snippet || '';
            return content.length > 500 && !content.includes('[Removed]');
        }).length;

        const appleRelevantCount = articles.filter((article: any) => {
            const title = (article.title || '').toLowerCase();
            const content = (article.content || article.description || article.snippet || '').toLowerCase();
            return title.includes('apple') || content.includes('apple') || title.includes('aapl');
        }).length;

        const fullContentRate = (fullContentCount / articles.length) * 100;
        const relevanceRate = (appleRelevantCount / articles.length) * 100;

        logger.info('\n📊 Summary:');
        logger.info('='.repeat(80));
        logger.info(`Total Articles: ${articles.length}`);
        logger.info(`Full Content: ${fullContentCount}/${articles.length} (${Math.round(fullContentRate)}%)`);
        logger.info(`Apple Relevant: ${appleRelevantCount}/${articles.length} (${Math.round(relevanceRate)}%)`);

        // Assessment
        logger.info('\n🎯 NewsAPI.ai Assessment:');
        if (fullContentRate >= 80) {
            logger.info('✅ EXCELLENT: Provides full article content');
        } else if (fullContentRate >= 50) {
            logger.info('⚠️ MIXED: Some full content, some summaries');
        } else {
            logger.info('❌ POOR: Mostly summaries/headlines only');
        }

        if (relevanceRate >= 80) {
            logger.info('✅ EXCELLENT: Apple filtering works well');
        } else {
            logger.info('⚠️ NEEDS IMPROVEMENT: Apple filtering could be better');
        }

        // Show raw response structure for debugging
        if (articles.length > 0) {
            logger.info('\n🔍 Sample Article Structure:');
            logger.info(JSON.stringify(articles[0], null, 2));
        }

    } catch (error: any) {
        logger.error('❌ NewsAPI.ai test failed:', {
            error: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });

        if (error.response?.status === 401) {
            logger.info('💡 401 Unauthorized - Check your API key');
        } else if (error.response?.status === 429) {
            logger.info('💡 429 Rate Limited - You may have exceeded your quota');
        } else if (error.response?.status === 400) {
            logger.info('💡 400 Bad Request - Check the API parameters');
        }
    }
}

// Run the test
testNewsApiAiDirect().catch(error => {
    logger.error('❌ Test execution failed:', error);
    process.exit(1);
});
