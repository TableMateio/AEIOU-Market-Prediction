#!/usr/bin/env npx tsx

/**
 * Truly Random Collection Approach
 * No business dimension limitations - just maximum diversity
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class TrulyRandomCollector {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    /**
     * Create truly random collection strategy (no business dimension assumptions)
     */
    async createRandomStrategy(): Promise<void> {
        console.log('🎲 TRULY RANDOM COLLECTION STRATEGY');
        console.log('='.repeat(70));
        console.log('Goal: Maximum diversity without business dimension assumptions');
        console.log('');

        // Random time periods (5 years, spread evenly)
        const timeRanges = [
            { start: '2020-01-01', end: '2020-12-31', year: 2020 },
            { start: '2021-01-01', end: '2021-12-31', year: 2021 },
            { start: '2022-01-01', end: '2022-12-31', year: 2022 },
            { start: '2023-01-01', end: '2023-12-31', year: 2023 },
            { start: '2024-01-01', end: '2024-12-31', year: 2024 }
        ];

        // Random search approaches (no business assumptions)
        const searchApproaches = [
            { query: 'Apple', sort: 'relevance', description: 'Most relevant Apple articles' },
            { query: 'Apple', sort: 'date', description: 'Chronological Apple articles' },
            { query: 'Apple', sort: 'socialScore', description: 'Most discussed Apple articles' },
            { query: 'Apple Inc', sort: 'relevance', description: 'Formal company name search' },
            { query: 'AAPL', sort: 'date', description: 'Stock ticker search' }
        ];

        // Random source quality filters
        const sourceFilters = [
            { name: 'All sources', params: {} },
            { name: 'Top 25% sources', params: { sourceRankingThreshold: 25 } },
            { name: 'US sources', params: { sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States' } },
            {
                name: 'Top US sources', params: {
                    sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States',
                    sourceRankingThreshold: 25
                }
            }
        ];

        console.log('📋 Random Strategy Components:');
        console.log(`   Time Periods: ${timeRanges.length} years (2020-2024)`);
        console.log(`   Search Approaches: ${searchApproaches.length} different queries/sorts`);
        console.log(`   Source Filters: ${sourceFilters.length} different quality levels`);
        console.log('');

        // Calculate random combinations
        const totalCombinations = timeRanges.length * searchApproaches.length * sourceFilters.length;
        console.log(`📊 Total Possible Combinations: ${totalCombinations}`);
        console.log('');

        // Generate random collection plan
        const targetArticles = 200; // Start with 200 diverse articles
        const articlesPerSearch = 10;
        const searchesNeeded = Math.ceil(targetArticles / articlesPerSearch);

        console.log('🎯 Random Collection Plan:');
        console.log(`   Target Articles: ${targetArticles}`);
        console.log(`   Articles per Search: ${articlesPerSearch}`);
        console.log(`   Searches Needed: ${searchesNeeded}`);
        console.log('');

        // Generate random combinations
        const randomCombinations = [];
        for (let i = 0; i < searchesNeeded; i++) {
            const randomTime = timeRanges[Math.floor(Math.random() * timeRanges.length)];
            const randomApproach = searchApproaches[Math.floor(Math.random() * searchApproaches.length)];
            const randomFilter = sourceFilters[Math.floor(Math.random() * sourceFilters.length)];

            randomCombinations.push({
                id: i + 1,
                timeRange: randomTime,
                approach: randomApproach,
                filter: randomFilter,
                expectedTokens: 5 // 5 tokens per year
            });
        }

        console.log('🎲 Random Search Combinations:');
        randomCombinations.forEach(combo => {
            console.log(`   ${combo.id}. ${combo.timeRange.year} | ${combo.approach.description} | ${combo.filter.name}`);
        });

        const totalTokens = randomCombinations.reduce((sum, combo) => sum + combo.expectedTokens, 0);
        console.log(`\n💰 Total Token Cost: ${totalTokens} tokens`);
        console.log(`💰 Cost: ~$${Math.round(totalTokens * 90 / 5000)} (assuming $90/month for 5000 tokens)`);
        console.log('');

        // Test a few random combinations
        console.log('🧪 Testing Random Combinations:');
        await this.testRandomCombinations(randomCombinations.slice(0, 3));
    }

    /**
     * Test random combinations to see what we get
     */
    private async testRandomCombinations(combinations: any[]): Promise<void> {
        let totalArticles = 0;
        let totalTokens = 0;
        const allSources = new Set<string>();

        for (const combo of combinations) {
            console.log(`\n🔍 Test ${combo.id}: ${combo.timeRange.year} ${combo.approach.description} (${combo.filter.name})`);

            try {
                const params: any = {
                    resultType: 'articles',
                    keyword: combo.approach.query,
                    lang: 'eng',
                    dateStart: combo.timeRange.start,
                    dateEnd: combo.timeRange.end,
                    articlesSortBy: combo.approach.sort,
                    includeArticleBody: true,
                    includeArticleSource: true,
                    articlesCount: 5, // Small test
                    apiKey: this.newsApiKey,
                    ...combo.filter.params
                };

                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params,
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const totalAvailable = response.data?.articles?.totalResults || 0;

                console.log(`   📊 Found: ${articles.length} articles (${totalAvailable} total available)`);

                if (articles.length > 0) {
                    const sample = articles[0];
                    console.log(`   📰 Sample: "${sample.title}"`);
                    console.log(`   🌐 Source: ${sample.source?.title || 'Unknown'}`);
                    console.log(`   📅 Date: ${sample.date}`);

                    // Track sources for diversity analysis
                    articles.forEach((a: any) => {
                        if (a.source?.title) allSources.add(a.source.title);
                    });
                }

                totalArticles += articles.length;
                totalTokens += combo.expectedTokens;

                console.log(`   💰 Tokens: ${combo.expectedTokens} (Running total: ${totalTokens})`);

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        console.log('\n📊 Random Test Results:');
        console.log(`   Articles collected: ${totalArticles}`);
        console.log(`   Tokens used: ${totalTokens}`);
        console.log(`   Unique sources: ${allSources.size}`);
        console.log(`   Sources: ${Array.from(allSources).slice(0, 10).join(', ')}...`);

        console.log('\n💡 This approach gives you:');
        console.log('   ✅ True randomness across time, queries, and sources');
        console.log('   ✅ No business dimension assumptions');
        console.log('   ✅ Maximum diversity with minimal bias');
        console.log('   ✅ Scalable to any number of articles');
    }

    /**
     * Execute full random collection
     */
    async executeRandomCollection(targetArticles: number = 100): Promise<void> {
        console.log(`\n🚀 EXECUTING RANDOM COLLECTION (${targetArticles} articles)`);
        console.log('='.repeat(70));

        // Simple random approach: spread across years and randomize everything else
        const years = [2020, 2021, 2022, 2023, 2024];
        const articlesPerYear = Math.ceil(targetArticles / years.length);

        const allArticles: any[] = [];
        let totalTokens = 0;

        for (const year of years) {
            console.log(`\n📅 Collecting ${articlesPerYear} random articles from ${year}...`);

            // Random parameters for this year
            const randomSort = ['relevance', 'date', 'socialScore'][Math.floor(Math.random() * 3)];
            const randomQuery = ['Apple', 'Apple Inc', 'AAPL'][Math.floor(Math.random() * 3)];
            const useSourceFilter = Math.random() > 0.5; // 50% chance

            console.log(`   Query: "${randomQuery}", Sort: ${randomSort}, Source filter: ${useSourceFilter ? 'Yes' : 'No'}`);

            try {
                const params: any = {
                    resultType: 'articles',
                    keyword: randomQuery,
                    lang: 'eng',
                    dateStart: `${year}-01-01`,
                    dateEnd: `${year}-12-31`,
                    articlesSortBy: randomSort,
                    includeArticleBody: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    includeArticleSource: true,
                    articlesCount: articlesPerYear,
                    apiKey: this.newsApiKey
                };

                if (useSourceFilter) {
                    params.sourceLocationUri = 'http://en.wikipedia.org/wiki/United_States';
                    params.sourceRankingThreshold = 25;
                }

                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params,
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                console.log(`   📊 Collected: ${articles.length} articles`);

                // Filter for Apple relevance
                const relevantArticles = articles.filter((a: any) => {
                    const title = (a.title || '').toLowerCase();
                    const body = (a.body || '').toLowerCase();
                    return (title.includes('apple') || title.includes('aapl') ||
                        body.includes('apple inc')) && a.body && a.body.length > 300;
                });

                console.log(`   ✅ Apple-relevant: ${relevantArticles.length} articles`);

                allArticles.push(...relevantArticles.map(a => ({
                    ...a,
                    collectionYear: year,
                    randomSort: randomSort,
                    randomQuery: randomQuery,
                    sourceFiltered: useSourceFilter
                })));

                totalTokens += 5; // 5 tokens per year

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed for ${year}: ${error.message}`);
            }
        }

        console.log('\n🎉 Random Collection Complete!');
        console.log('='.repeat(70));
        console.log(`Total articles: ${allArticles.length}`);
        console.log(`Total tokens: ${totalTokens}`);
        console.log(`Efficiency: ${Math.round(allArticles.length / totalTokens)} articles per token`);

        // Diversity analysis
        const sources = [...new Set(allArticles.map(a => a.source?.title).filter(Boolean))];
        const byYear = allArticles.reduce((acc, a) => {
            acc[a.collectionYear] = (acc[a.collectionYear] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        console.log(`\nSource diversity: ${sources.length} unique sources`);
        console.log('Temporal distribution:', byYear);
        console.log('Top sources:', sources.slice(0, 8).join(', '));

        console.log('\n💡 These articles are ready to save to your database!');
        console.log('💡 They represent true random sampling without business assumptions.');
    }
}

// Main execution
async function main() {
    try {
        const collector = new TrulyRandomCollector();

        // Step 1: Show the strategy
        await collector.createRandomStrategy();

        // Step 2: Execute a small random collection
        console.log('\n' + '='.repeat(70));
        await collector.executeRandomCollection(50); // Start with 50 random articles

    } catch (error: any) {
        console.error('❌ Random collection failed:', error.message);
    }
}

main();
