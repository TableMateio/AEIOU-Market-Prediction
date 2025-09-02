#!/usr/bin/env npx tsx

/**
 * Test smart article collection system
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

// Simple business days filter
function isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
}

function getRecentBusinessDays(count: number): Date[] {
    const days: Date[] = [];
    const currentDate = new Date();

    while (days.length < count) {
        if (isBusinessDay(currentDate)) {
            days.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() - 1);
    }

    return days.reverse(); // Oldest first
}

async function testSmartCollection() {
    console.log('🧪 Testing Smart Article Collection System\n');

    const newsApiKey = process.env.NEWSAPIAI_API_KEY;
    const gnewsKey = process.env.GNEWS_API_KEY;

    if (!newsApiKey) {
        console.log('❌ NEWSAPIAI_API_KEY not found');
        return;
    }

    // Collection Plan
    console.log('📋 Smart Collection Plan:');
    console.log('='.repeat(60));

    console.log('Phase 1: Recent Premium Articles (NewsAPI.ai)');
    console.log('   • Target: 1,500 articles from last 30 business days');
    console.log('   • Tokens: 1,500 (1 per day for recent articles)');
    console.log('   • Quality: Full metadata, concepts, categories');
    console.log('');

    console.log('Phase 2: Strategic Historical Events (NewsAPI.ai)');
    console.log('   • Target: 100 articles from key dates (earnings, launches)');
    console.log('   • Tokens: 500 (5 per historical year)');
    console.log('   • Focus: High-impact events only');
    console.log('');

    if (gnewsKey) {
        console.log('Phase 3: Volume Supplementation (GNews)');
        console.log('   • Target: 500 additional articles');
        console.log('   • Tokens: 0 (free tier)');
        console.log('   • Purpose: Source diversity and volume');
        console.log('');
    }

    console.log('💡 Total Plan: 2,000-2,100 articles for $0 cost\n');

    // Test Collection (5 recent business days)
    console.log('🚀 Executing Test Collection (5 recent business days)...\n');

    const testDays = getRecentBusinessDays(5);
    let totalArticles = 0;
    let tokensUsed = 0;
    const sampleArticles: any[] = [];

    for (const [index, date] of testDays.entries()) {
        const dateStr = date.toISOString().split('T')[0];

        try {
            console.log(`📰 Day ${index + 1}: Collecting articles for ${dateStr}...`);

            // NewsAPI.ai collection
            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    dateStart: dateStr,
                    dateEnd: dateStr,
                    articlesSortBy: 'relevance',
                    includeArticleBody: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    articlesCount: 15, // 15 articles per day for test
                    apiKey: newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];
            const totalAvailable = response.data?.articles?.totalResults || 0;

            console.log(`   ✅ Found ${articles.length} articles (${totalAvailable} total available)`);

            totalArticles += articles.length;
            tokensUsed += 1; // 1 token for recent articles

            // Store sample articles
            if (articles.length > 0) {
                sampleArticles.push(...articles.slice(0, 2)); // 2 samples per day
            }

            // Analyze article quality
            const fullContentCount = articles.filter((a: any) => a.body && a.body.length > 500).length;
            const avgContentLength = articles.reduce((sum: number, a: any) =>
                sum + (a.body ? a.body.length : 0), 0) / articles.length;

            console.log(`   📊 Quality: ${fullContentCount}/${articles.length} full content, avg ${Math.round(avgContentLength)} chars`);

            // Show sample
            if (articles.length > 0) {
                const sample = articles[0];
                console.log(`   📰 Sample: "${sample.title}"`);
                console.log(`   🌐 Source: ${sample.source?.title || 'Unknown'}`);
                console.log(`   📄 Content: ${sample.body ? `${sample.body.length} chars` : 'No content'}`);
            }

            console.log('');

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
            console.log(`   ❌ Failed for ${dateStr}: ${error.message}`);
        }
    }

    // Test Summary
    console.log('📊 Test Collection Summary:');
    console.log('='.repeat(60));
    console.log(`Total Articles Collected: ${totalArticles}`);
    console.log(`Tokens Used: ${tokensUsed}/2000 (${((tokensUsed / 2000) * 100).toFixed(1)}%)`);
    console.log(`Business Days Processed: ${testDays.length}`);
    console.log(`Average Articles per Day: ${Math.round(totalArticles / testDays.length)}`);
    console.log('');

    // Quality Analysis
    if (sampleArticles.length > 0) {
        const fullContentCount = sampleArticles.filter(a => a.body && a.body.length > 500).length;
        const avgContentLength = sampleArticles.reduce((sum, a) =>
            sum + (a.body ? a.body.length : 0), 0) / sampleArticles.length;

        console.log('📄 Content Quality Analysis:');
        console.log(`   Full Content Rate: ${fullContentCount}/${sampleArticles.length} (${Math.round((fullContentCount / sampleArticles.length) * 100)}%)`);
        console.log(`   Average Content Length: ${Math.round(avgContentLength)} characters`);
        console.log('');

        // Apple Relevance Analysis
        const appleRelevant = sampleArticles.filter(a => {
            const title = (a.title || '').toLowerCase();
            const body = (a.body || '').toLowerCase();
            return title.includes('apple') || body.includes('apple') || title.includes('aapl');
        }).length;

        console.log(`   Apple Relevance: ${appleRelevant}/${sampleArticles.length} (${Math.round((appleRelevant / sampleArticles.length) * 100)}%)`);

        // Source Diversity
        const sources = [...new Set(sampleArticles.map(a => a.source?.title).filter(Boolean))];
        console.log(`   Source Diversity: ${sources.length} unique sources`);
        console.log(`   Top Sources: ${sources.slice(0, 5).join(', ')}`);
    }

    // Scaling Projections
    console.log('\n🚀 Scaling Projections:');
    console.log('='.repeat(60));

    if (totalArticles > 0) {
        const articlesPerToken = totalArticles / tokensUsed;
        const projectedArticles = Math.round(articlesPerToken * 2000);

        console.log(`Articles per Token: ${Math.round(articlesPerToken)}`);
        console.log(`Projected Total with 2000 tokens: ${projectedArticles} articles`);
        console.log('');

        console.log('Full Collection Estimate:');
        console.log(`   Phase 1 (Recent): 1,500 tokens × ${Math.round(articlesPerToken)} = ${Math.round(1500 * articlesPerToken)} articles`);
        console.log(`   Phase 2 (Historical): 100 tokens × ${Math.round(articlesPerToken / 5)} = ${Math.round(100 * articlesPerToken / 5)} articles`);
        console.log(`   Phase 3 (GNews): ~500 additional articles`);
        console.log(`   TOTAL ESTIMATE: ${Math.round(1500 * articlesPerToken + 100 * articlesPerToken / 5 + 500)} articles`);
    }

    console.log('\n✅ Test collection complete!');
    console.log('💡 Ready to execute full collection plan.');

    // Next Steps
    console.log('\n🎯 Recommended Next Steps:');
    console.log('1. Execute Phase 1: Collect 1,500 recent premium articles');
    console.log('2. Add articles to database with duplicate checking');
    console.log('3. Process articles through AI system for ML features');
    console.log('4. Integrate stock price data for target variables');
    console.log('5. Scale up to full ML dataset');
}

testSmartCollection();
