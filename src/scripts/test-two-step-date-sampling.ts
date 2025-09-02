#!/usr/bin/env npx tsx

/**
 * Test Two-Step Date Sampling Strategy
 * Test your idea: Can we preview article dates/IDs before using tokens?
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class TwoStepSampler {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    /**
     * Test if we can get article metadata (dates, IDs) without using tokens
     */
    async testTwoStepApproach(): Promise<void> {
        console.log('🧪 Testing Two-Step Date Sampling Strategy');
        console.log('='.repeat(60));
        console.log('Goal: Preview dates before using tokens for targeted sampling');
        console.log('');

        const testPeriod = { start: '2024-08-01', end: '2024-08-07' }; // One week test

        // Step 1: Try to get metadata only (no body content)
        await this.testMetadataOnlyQuery(testPeriod);

        // Step 2: Test different return types for previewing
        await this.testDifferentReturnTypes(testPeriod);

        // Step 3: Test your specific sampling idea
        await this.testDateBasedSampling(testPeriod);
    }

    /**
     * Test if we can get metadata without using tokens
     */
    private async testMetadataOnlyQuery(period: { start: string, end: string }): Promise<void> {
        console.log('📋 Step 1: Testing Metadata-Only Queries');
        console.log('─'.repeat(50));
        console.log('Testing if we can get article dates/IDs without full content...');

        try {
            // Test 1: Request without includeArticleBody
            console.log('\n🔍 Test 1a: No includeArticleBody parameter');

            const response1 = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    dateStart: period.start,
                    dateEnd: period.end,
                    articlesSortBy: 'date',
                    // includeArticleBody: false, // Explicitly no body
                    includeArticleBasicInfo: true,
                    includeArticleTitle: true,
                    includeArticleUrl: true,
                    includeArticleSource: true,
                    includeArticleDate: true,
                    articlesCount: 10,
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles1 = response1.data?.articles?.results || [];
            console.log(`   📊 Found: ${articles1.length} articles`);

            if (articles1.length > 0) {
                const sample = articles1[0];
                console.log(`   📰 Sample article keys: ${Object.keys(sample).join(', ')}`);
                console.log(`   📅 Has date: ${sample.date ? 'YES' : 'NO'}`);
                console.log(`   📝 Has body: ${sample.body ? 'YES (' + sample.body.length + ' chars)' : 'NO'}`);
                console.log(`   🆔 Has URI: ${sample.uri ? 'YES' : 'NO'}`);

                // Check dates across all articles
                const dates = articles1.map((a: any) => a.date).filter(Boolean);
                const uniqueDates = [...new Set(dates)];
                console.log(`   📅 Date spread: ${uniqueDates.length} unique dates: ${uniqueDates.join(', ')}`);
            }

        } catch (error: any) {
            console.log(`   ❌ Failed: ${error.message}`);
        }

        console.log('\n💡 Key Question: Did we use tokens for this metadata query?');
        console.log('💡 If no body content returned, we might be able to preview dates for free!');
    }

    /**
     * Test different return types to see what's available
     */
    private async testDifferentReturnTypes(period: { start: string, end: string }): Promise<void> {
        console.log('\n📊 Step 2: Testing Different Return Types');
        console.log('─'.repeat(50));

        const returnTypes = [
            { type: 'articles', description: 'Full articles' },
            { type: 'articleUris', description: 'Article URIs only' },
            { type: 'count', description: 'Article count only' }
        ];

        for (const returnType of returnTypes) {
            console.log(`\n🔍 Testing return type: ${returnType.type} (${returnType.description})`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: returnType.type,
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: period.start,
                        dateEnd: period.end,
                        articlesSortBy: 'date',
                        articlesCount: 20,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                console.log(`   📊 Response keys: ${Object.keys(response.data).join(', ')}`);

                if (returnType.type === 'count') {
                    console.log(`   📊 Total articles available: ${response.data?.articles?.totalResults || 0}`);
                } else if (returnType.type === 'articleUris') {
                    const uris = response.data?.articles?.results || [];
                    console.log(`   📊 URIs returned: ${uris.length}`);
                    if (uris.length > 0) {
                        console.log(`   🆔 Sample URI: ${uris[0]}`);
                    }
                } else {
                    const articles = response.data?.articles?.results || [];
                    console.log(`   📊 Articles returned: ${articles.length}`);
                }

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    /**
     * Test your specific sampling idea
     */
    private async testDateBasedSampling(period: { start: string, end: string }): Promise<void> {
        console.log('\n🎯 Step 3: Testing Your Date-Based Sampling Idea');
        console.log('─'.repeat(50));
        console.log('Goal: Get articles sorted by date, then sample evenly across dates');

        try {
            // First, get a larger set sorted by date (without body to save tokens if possible)
            console.log('\n🔍 Phase 1: Get articles sorted by date for sampling analysis');

            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    dateStart: period.start,
                    dateEnd: period.end,
                    articlesSortBy: 'date',
                    includeArticleBasicInfo: true,
                    includeArticleTitle: true,
                    includeArticleDate: true,
                    // includeArticleBody: false, // Try without body first
                    articlesCount: 50, // Larger sample for analysis
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];
            const totalAvailable = response.data?.articles?.totalResults || 0;

            console.log(`   📊 Retrieved: ${articles.length} articles (${totalAvailable} total available)`);

            if (articles.length > 0) {
                // Analyze date distribution
                const dateGroups: Record<string, any[]> = {};

                articles.forEach(article => {
                    const date = article.date;
                    if (!dateGroups[date]) {
                        dateGroups[date] = [];
                    }
                    dateGroups[date].push(article);
                });

                const uniqueDates = Object.keys(dateGroups).sort();
                console.log(`   📅 Date distribution: ${uniqueDates.length} unique dates`);

                // Show distribution
                uniqueDates.forEach(date => {
                    console.log(`      ${date}: ${dateGroups[date].length} articles`);
                });

                // Test your sampling strategy
                console.log('\n🎯 Phase 2: Applying Your Sampling Strategy');
                console.log('   Strategy: Take N articles from each date for even distribution');

                const articlesPerDate = 2; // Take 2 from each date
                const sampledArticles: any[] = [];

                uniqueDates.forEach(date => {
                    const dateArticles = dateGroups[date];
                    const sampled = dateArticles.slice(0, articlesPerDate);
                    sampledArticles.push(...sampled);

                    console.log(`      ${date}: Selected ${sampled.length}/${dateArticles.length} articles`);
                });

                console.log(`\n   📊 Sampling Results:`);
                console.log(`      Total sampled: ${sampledArticles.length} articles`);
                console.log(`      Even distribution: ${sampledArticles.length / uniqueDates.length} articles per date`);
                console.log(`      Coverage: ${uniqueDates.length} days covered`);

                // Show what we'd need to fetch with full content
                console.log('\n🔍 Phase 3: What Would Full Content Fetch Look Like?');
                console.log('   If Phase 1 was metadata-only, we could now fetch full content for:');

                sampledArticles.slice(0, 5).forEach((article, i) => {
                    console.log(`      ${i + 1}. "${article.title}" (${article.date})`);
                });

                console.log(`\n   💰 Token Cost Analysis:`);
                console.log(`      Phase 1 (metadata): ${articles[0].body ? '5 tokens (had body)' : '? tokens (metadata only)'}`);
                console.log(`      Phase 2 (full content): Would need ${sampledArticles.length} individual fetches OR batch fetch`);

                // Test if we can fetch specific articles by URI
                if (sampledArticles.length > 0 && sampledArticles[0].uri) {
                    console.log('\n🔍 Phase 4: Test Fetching Specific Article by URI');
                    await this.testFetchSpecificArticle(sampledArticles[0].uri);
                }
            }

        } catch (error: any) {
            console.log(`   ❌ Failed: ${error.message}`);
        }
    }

    /**
     * Test fetching a specific article by URI
     */
    private async testFetchSpecificArticle(articleUri: string): Promise<void> {
        console.log(`   🔍 Testing fetch of specific article: ${articleUri}`);

        try {
            // Try to fetch specific article with full content
            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticle', {
                params: {
                    articleUri: articleUri,
                    includeArticleBody: true,
                    apiKey: this.newsApiKey
                },
                timeout: 15000
            });

            const article = response.data;

            if (article && article.title) {
                console.log(`      ✅ Successfully fetched specific article`);
                console.log(`      📰 Title: ${article.title.substring(0, 60)}...`);
                console.log(`      📝 Body: ${article.body ? article.body.length + ' chars' : 'No body'}`);
                console.log(`      💰 Token cost: Unknown (need to check if this uses tokens)`);
            } else {
                console.log(`      ❌ No article data returned`);
            }

        } catch (error: any) {
            console.log(`      ❌ Specific fetch failed: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    try {
        const sampler = new TwoStepSampler();
        await sampler.testTwoStepApproach();

        console.log('\n🎯 CONCLUSIONS');
        console.log('='.repeat(60));
        console.log('Your two-step sampling idea analysis:');
        console.log('');
        console.log('✅ FEASIBLE IF:');
        console.log('   • Metadata queries (no body) use fewer/no tokens');
        console.log('   • We can sort by date and get date distribution');
        console.log('   • We can sample evenly across dates');
        console.log('   • We can fetch specific articles by URI');
        console.log('');
        console.log('🔍 NEED TO INVESTIGATE:');
        console.log('   • Do metadata-only queries cost tokens?');
        console.log('   • Can we fetch specific articles without searching again?');
        console.log('   • What is the most token-efficient sampling approach?');
        console.log('');
        console.log('💡 ALTERNATIVE APPROACH:');
        console.log('   • Use weekly periods (5 tokens each) for natural date spread');
        console.log('   • Sort by date within each week');
        console.log('   • Take articles from different days within the week');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
    }
}

main();
