#!/usr/bin/env tsx

/**
 * Quick Article Collection Script
 * 
 * Test script to validate our article collection approach
 * Focus: Get articles quickly for testing our corrected AI calibration
 */

import { AlphaVantageClient } from '../data/sources/alphaVantage';
import { createLogger } from '../utils/logger';

const logger = createLogger('QuickCollection');

async function quickCollectArticles() {
    console.log('🚀 Quick Apple article collection starting...');

    try {
        // Try Alpha Vantage first (since we have the service set up)
        console.log('📰 Fetching Apple articles from Alpha Vantage...');

        const alphaVantage = new AlphaVantageClient();
        const articles = await alphaVantage.getNews('AAPL', 10);

        if (articles && articles.length > 0) {
            console.log(`✅ Found ${articles.length} Apple articles from Alpha Vantage`);

            articles.forEach((article: any, index: number) => {
                console.log(`${index + 1}. ${article.title}`);
                console.log(`   📅 ${article.published_at}`);
                console.log(`   🔗 ${article.url}`);
                console.log(`   📰 ${article.source}`);
                console.log(`   📝 ${article.summary?.substring(0, 100)}...`);
                console.log('');
            });

            return articles;
        } else {
            console.log('⚠️ No articles returned from Alpha Vantage');
            return [];
        }

    } catch (error) {
        console.error('❌ Error collecting articles:', error);
        return [];
    }
}

// Execute if run directly
if (require.main === module) {
    quickCollectArticles()
        .then(articles => {
            console.log(`🎯 Collection complete! Found ${articles.length} articles total.`);
        })
        .catch(error => {
            console.error('❌ Collection failed:', error);
            process.exit(1);
        });
}

export { quickCollectArticles };
