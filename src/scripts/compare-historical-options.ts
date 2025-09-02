#!/usr/bin/env npx tsx

/**
 * Compare historical data options: NewsAPI.ai vs GNews vs other approaches
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

async function compareHistoricalOptions() {
    console.log('🔍 Comparing Historical Data Options for Apple Articles\n');

    // Option 1: NewsAPI.ai Historical (Paid)
    console.log('📊 Option 1: NewsAPI.ai Historical Data');
    console.log('='.repeat(50));
    console.log('✅ Pros:');
    console.log('   • Full article body content (confirmed working)');
    console.log('   • Excellent Apple filtering (confirmed working)');
    console.log('   • Rich metadata (concepts, categories, sentiment)');
    console.log('   • Historical access since 2014');
    console.log('   • 85,000+ Apple articles available');
    console.log('');
    console.log('❌ Cons:');
    console.log('   • Historical data costs 5 tokens per year searched');
    console.log('   • 2,000 free tokens = only 400 searches for 1 year of data');
    console.log('   • Would need paid plan for 2-3 years of articles');
    console.log('');
    console.log('💰 Cost Analysis:');
    console.log('   • Free: 400 searches × 100 articles = 40,000 articles (1 year)');
    console.log('   • For 2-3 years: Need 5K plan ($90/month) or 15K plan ($200/month)');
    console.log('   • 5K tokens = 1,000 searches for 1 year = 100,000 articles');
    console.log('');

    // Option 2: GNews Current Setup
    console.log('📊 Option 2: GNews (Current Working Solution)');
    console.log('='.repeat(50));
    console.log('✅ Pros:');
    console.log('   • Already working and integrated');
    console.log('   • Free tier: 100 requests/day × 10 articles = 1,000 articles/day');
    console.log('   • Full article content confirmed');
    console.log('   • Good Apple filtering');
    console.log('');

    // Test GNews historical access
    const gnewsKey = process.env.GNEWS_API_KEY;
    if (gnewsKey) {
        console.log('🔍 Testing GNews historical access...');

        try {
            // Test 6 months ago
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const fromDate = sixMonthsAgo.toISOString().split('T')[0];
            const toDate = new Date(sixMonthsAgo.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const response = await axios.get('https://gnews.io/api/v4/search', {
                params: {
                    q: 'Apple',
                    token: gnewsKey,
                    lang: 'en',
                    from: fromDate,
                    to: toDate,
                    max: 3
                },
                timeout: 10000
            });

            const articles = response.data.articles || [];
            console.log(`   📅 6 months ago (${fromDate}): ${articles.length} articles found`);

            if (articles.length > 0) {
                console.log(`   📰 Sample: "${articles[0].title}"`);
                console.log(`   📄 Content: ${articles[0].content ? `${articles[0].content.length} chars` : 'No content'}`);
                console.log('   ✅ Historical access: AVAILABLE');
            }

        } catch (error: any) {
            console.log(`   ❌ GNews historical test failed: ${error.message}`);
            if (error.response?.status === 403) {
                console.log('   💡 Historical data may require paid GNews plan');
            }
        }
    }

    console.log('');
    console.log('❌ Cons:');
    console.log('   • Limited to 30 days historical on free tier (needs verification)');
    console.log('   • Paid tier: €49.99/month for 25,000 articles');
    console.log('   • May have less rich metadata than NewsAPI.ai');
    console.log('');

    // Option 3: Hybrid Approach
    console.log('📊 Option 3: Hybrid Approach (RECOMMENDED)');
    console.log('='.repeat(50));
    console.log('🎯 Strategy:');
    console.log('   1. Use NewsAPI.ai free tokens efficiently for recent high-quality articles');
    console.log('   2. Use GNews for additional recent articles');
    console.log('   3. Focus on business days only (smart time filtering)');
    console.log('   4. Collect articles strategically across different time periods');
    console.log('');
    console.log('✅ Benefits:');
    console.log('   • Maximize free tier usage');
    console.log('   • Get both high-quality (NewsAPI.ai) and volume (GNews) articles');
    console.log('   • Diversify data sources');
    console.log('   • Stay within budget constraints');
    console.log('');

    // Strategic Collection Plan
    console.log('📊 Strategic Collection Plan');
    console.log('='.repeat(50));
    console.log('Phase 1: Recent High-Quality Articles (NewsAPI.ai)');
    console.log('   • Use 1,000 free tokens for last 30 days');
    console.log('   • Target: 1,000 high-quality articles with full metadata');
    console.log('   • Focus on business days only');
    console.log('');
    console.log('Phase 2: Volume Collection (GNews)');
    console.log('   • Use free GNews tier for additional recent articles');
    console.log('   • Target: Additional 500-1,000 articles');
    console.log('   • Fill gaps and add source diversity');
    console.log('');
    console.log('Phase 3: Historical Sampling (Strategic)');
    console.log('   • Use remaining NewsAPI.ai tokens for key historical periods');
    console.log('   • Target specific events: earnings releases, product launches');
    console.log('   • 200-400 historical articles from major events');
    console.log('');
    console.log('💡 Total Target: 1,500-2,400 articles with mix of recent + historical');
    console.log('💰 Total Cost: $0 (using free tiers strategically)');
    console.log('');

    // Business Days Strategy
    console.log('📅 Business Days Collection Strategy');
    console.log('='.repeat(50));
    console.log('Focus on:');
    console.log('   • Monday-Friday only (when markets are open)');
    console.log('   • Exclude major holidays (NYSE calendar)');
    console.log('   • Prioritize earnings season dates');
    console.log('   • Target product announcement periods');
    console.log('');
    console.log('This approach:');
    console.log('   • Reduces noise from weekend news');
    console.log('   • Focuses on market-relevant timeframes');
    console.log('   • Maximizes ML training relevance');
    console.log('   • Allows better stock price correlation');
    console.log('');

    console.log('🚀 Recommended Next Steps:');
    console.log('1. Implement business days filter');
    console.log('2. Create smart collection script for NewsAPI.ai recent articles');
    console.log('3. Set up GNews supplemental collection');
    console.log('4. Build duplicate detection and merging');
    console.log('5. Start with 100-200 article test batch');
}

compareHistoricalOptions();
