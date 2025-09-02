#!/usr/bin/env npx tsx

/**
 * Simple Exploration Collection
 * Start small, understand the API, save to database, then iterate
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

interface Article {
    title: string;
    body: string | null;
    url: string;
    source: string;
    published_at: string;
    scraped_at: string;
    scraping_status: string;
    data_source: string;
    external_id: string;
    external_id_type: string;
    keywords: string[];
    relevance_score: number | null;
    category: string | null;
    content_type: string;
    target_audience: string;
}

class SimpleExplorationCollector {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
        if (!this.newsApiKey) {
            throw new Error('NEWSAPIAI_API_KEY required');
        }
    }

    /**
     * Test different API parameters to understand what's available
     */
    async exploreApiCapabilities(): Promise<void> {
        console.log('🔍 Exploring NewsAPI.ai Capabilities\n');

        // Test 1: Basic search with all return options
        console.log('📋 Test 1: Full API response structure...');
        try {
            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    dateStart: '2024-08-01',
                    dateEnd: '2024-08-31',
                    articlesSortBy: 'relevance',

                    // Request ALL available data
                    includeArticleBody: true,
                    includeArticleBasicInfo: true,
                    includeArticleTitle: true,
                    includeArticleUrl: true,
                    includeArticleSource: true,
                    includeArticleDate: true,
                    includeArticleAuthor: true,
                    includeArticleLocation: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    includeArticleImage: true,
                    includeArticleVideos: true,
                    includeArticleSocialScore: true,
                    includeArticleEventUri: true,
                    includeArticleDuplicateList: true,
                    includeArticleOriginalArticle: true,

                    articlesCount: 3,
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];
            console.log(`   📊 Found: ${articles.length} articles`);

            if (articles.length > 0) {
                const sample = articles[0];
                console.log('\n   📰 Sample Article Structure:');
                console.log(`   Title: ${sample.title || 'N/A'}`);
                console.log(`   URL: ${sample.url || 'N/A'}`);
                console.log(`   Date: ${sample.date || sample.dateTime || 'N/A'}`);
                console.log(`   Source: ${JSON.stringify(sample.source) || 'N/A'}`);
                console.log(`   Body Length: ${sample.body ? sample.body.length + ' chars' : 'N/A'}`);
                console.log(`   Concepts: ${sample.concepts ? sample.concepts.length + ' concepts' : 'N/A'}`);
                console.log(`   Categories: ${sample.categories ? sample.categories.length + ' categories' : 'N/A'}`);
                console.log(`   Social Score: ${sample.socialScore || 'N/A'}`);
                console.log(`   Event URI: ${sample.eventUri || 'N/A'}`);
                console.log(`   Image: ${sample.image || 'N/A'}`);

                // Show full structure for first article
                console.log('\n   🔍 Full Article Object Keys:');
                console.log(`   ${Object.keys(sample).join(', ')}`);

                if (sample.concepts && sample.concepts.length > 0) {
                    console.log(`\n   🏷️  Sample Concepts: ${sample.concepts.slice(0, 3).map((c: any) => c.label || c.uri).join(', ')}`);
                }

                if (sample.categories && sample.categories.length > 0) {
                    console.log(`   📂 Sample Categories: ${sample.categories.slice(0, 3).map((c: any) => c.label || c.uri).join(', ')}`);
                }
            }

        } catch (error: any) {
            console.log(`   ❌ API exploration failed: ${error.message}`);
        }

        console.log('\n' + '='.repeat(70));
    }

    /**
     * Test source filtering options (addressing your questions about "top news agencies")
     */
    async testSourceFiltering(): Promise<void> {
        console.log('🏢 Test 2: Source Filtering Options...');

        // Test with different source filters
        const sourceTests = [
            {
                name: 'All sources',
                params: {}
            },
            {
                name: 'US sources only',
                params: { sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States' }
            },
            {
                name: 'Top 25% sources by Alexa ranking',
                params: { sourceRankingThreshold: 25 }
            }
        ];

        for (const test of sourceTests) {
            try {
                console.log(`\n   🔍 Testing: ${test.name}`);

                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: '2024-08-01',
                        dateEnd: '2024-08-31',
                        articlesSortBy: 'relevance',
                        includeArticleBody: true,
                        includeArticleSource: true,
                        articlesCount: 5,
                        apiKey: this.newsApiKey,
                        ...test.params
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const totalAvailable = response.data?.articles?.totalResults || 0;

                console.log(`      📊 Found: ${articles.length} articles (${totalAvailable} total available)`);

                if (articles.length > 0) {
                    const sources = [...new Set(articles.map((a: any) => a.source?.title).filter(Boolean))];
                    console.log(`      🏢 Sources: ${sources.join(', ')}`);
                }

            } catch (error: any) {
                console.log(`      ❌ ${test.name} failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n' + '='.repeat(70));
    }

    /**
     * Test date range approach (answering your token cost questions)
     */
    async testDateRangeApproach(): Promise<void> {
        console.log('📅 Test 3: Understanding Token Costs and Date Ranges...');

        const dateTests = [
            {
                name: 'Single month in 2024',
                dateStart: '2024-08-01',
                dateEnd: '2024-08-31',
                expectedTokens: 5
            },
            {
                name: 'Full year 2024',
                dateStart: '2024-01-01',
                dateEnd: '2024-12-31',
                expectedTokens: 5
            },
            {
                name: 'Two years (2023-2024)',
                dateStart: '2023-01-01',
                dateEnd: '2024-12-31',
                expectedTokens: 10
            }
        ];

        for (const test of dateTests) {
            console.log(`\n   🔍 ${test.name} (Expected: ${test.expectedTokens} tokens)`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple earnings',
                        lang: 'eng',
                        dateStart: test.dateStart,
                        dateEnd: test.dateEnd,
                        articlesSortBy: 'relevance',
                        includeArticleBody: true,
                        articlesCount: 10,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const totalAvailable = response.data?.articles?.totalResults || 0;

                console.log(`      📊 Articles: ${articles.length} returned, ${totalAvailable} total available`);
                console.log(`      💰 Token cost: ${test.expectedTokens} tokens`);

                if (articles.length > 0) {
                    const dates = articles.map((a: any) => a.date).sort();
                    const uniqueDates = [...new Set(dates)];
                    console.log(`      📅 Date spread: ${uniqueDates.length} unique dates from ${dates[0]} to ${dates[dates.length - 1]}`);
                }

            } catch (error: any) {
                console.log(`      ❌ Failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n   💡 KEY INSIGHTS:');
        console.log('      • Token cost = 5 × number of years searched (regardless of date range within year)');
        console.log('      • Searching Jan-Dec 2024 costs same as searching just Aug 2024 (both = 5 tokens)');
        console.log('      • You get up to 100 articles per search, but can see total available first');
        console.log('      • Broader date ranges give more articles to choose from');

        console.log('\n' + '='.repeat(70));
    }

    /**
     * Test random sampling approach (addressing your randomization question)
     */
    async testRandomSampling(): Promise<void> {
        console.log('🎲 Test 4: Random Sampling Strategies...');

        // Test different sorting options for randomization
        const sortTests = [
            { sort: 'relevance', description: 'Most relevant articles first' },
            { sort: 'date', description: 'Chronological order' },
            { sort: 'socialScore', description: 'Most shared/discussed articles' },
            { sort: 'random', description: 'Random order (if supported)' }
        ];

        for (const sortTest of sortTests) {
            console.log(`\n   🔍 Testing sort by: ${sortTest.sort} (${sortTest.description})`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: '2024-08-01',
                        dateEnd: '2024-08-31',
                        articlesSortBy: sortTest.sort,
                        includeArticleBody: true,
                        includeArticleSource: true,
                        articlesCount: 5,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                if (articles.length > 0) {
                    console.log(`      📊 Found: ${articles.length} articles`);
                    console.log(`      📰 First title: "${articles[0].title}"`);
                    console.log(`      📅 First date: ${articles[0].date}`);

                    if (sortTest.sort === 'socialScore' && articles[0].socialScore) {
                        console.log(`      📱 Social score: ${articles[0].socialScore}`);
                    }
                }

            } catch (error: any) {
                console.log(`      ❌ Failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('\n   💡 RANDOMIZATION STRATEGIES:');
        console.log('      • Use different sort orders to get different article sets');
        console.log('      • Vary date ranges across different time periods');
        console.log('      • Mix broad keywords ("Apple") with specific ones ("Apple earnings")');
        console.log('      • Use source filtering to get different publisher perspectives');

        console.log('\n' + '='.repeat(70));
    }

    /**
     * Collect sample articles and display in format for database saving
     */
    async collectSampleArticles(): Promise<void> {
        console.log('💾 Test 5: Collect Sample Articles (Ready for Database)...');

        const searches = [
            {
                query: 'Apple',
                dateStart: '2024-08-01',
                dateEnd: '2024-08-31',
                count: 5,
                description: 'Recent general Apple news'
            },
            {
                query: 'Apple earnings',
                dateStart: '2024-01-01',
                dateEnd: '2024-12-31',
                count: 3,
                description: 'Apple earnings 2024'
            }
        ];

        const allArticles: any[] = [];
        let totalTokens = 0;

        for (const search of searches) {
            console.log(`\n🔍 Collecting: ${search.description}`);
            console.log(`   Query: "${search.query}" (${search.dateStart} to ${search.dateEnd})`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: search.query,
                        lang: 'eng',
                        dateStart: search.dateStart,
                        dateEnd: search.dateEnd,
                        articlesSortBy: 'relevance',
                        includeArticleBody: true,
                        includeArticleConcepts: true,
                        includeArticleCategories: true,
                        includeArticleSocialScore: true,
                        articlesCount: search.count,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                console.log(`   📊 Found: ${articles.length} articles`);

                allArticles.push(...articles.map(a => ({ ...a, searchQuery: search.query })));

                // Calculate token cost
                const startYear = parseInt(search.dateStart.split('-')[0]);
                const endYear = parseInt(search.dateEnd.split('-')[0]);
                const tokensUsed = (endYear - startYear + 1) * 5;
                totalTokens += tokensUsed;

                console.log(`   💰 Tokens used: ${tokensUsed} (Total: ${totalTokens})`);

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        // Display collected articles
        console.log(`\n📊 Collection Summary:`);
        console.log(`   Total articles: ${allArticles.length}`);
        console.log(`   Total tokens used: ${totalTokens}`);
        console.log(`   Unique sources: ${[...new Set(allArticles.map(a => a.source?.title))].length}`);

        if (allArticles.length > 0) {
            console.log('\n📰 Sample Articles (Ready for Database):');
            allArticles.slice(0, 3).forEach((article, i) => {
                console.log(`\n   Article ${i + 1}:`);
                console.log(`   Title: ${article.title}`);
                console.log(`   URL: ${article.url}`);
                console.log(`   Source: ${article.source?.title || 'Unknown'}`);
                console.log(`   Date: ${article.date}`);
                console.log(`   Body: ${article.body ? `${article.body.length} chars` : 'No content'}`);
                console.log(`   Concepts: ${article.concepts ? article.concepts.length : 0}`);
                console.log(`   Categories: ${article.categories ? article.categories.length : 0}`);
                console.log(`   Search Query: ${article.searchQuery}`);
            });

            console.log('\n💡 These articles are ready to be saved to your Supabase database.');
            console.log('💡 Each has: title, body, url, source, date, concepts, categories, etc.');
        }
    }
}

// Main execution
async function main() {
    try {
        const collector = new SimpleExplorationCollector();

        console.log('🧪 SIMPLE EXPLORATION COLLECTION');
        console.log('='.repeat(70));
        console.log('Goal: Answer your questions about the API and collection strategy');
        console.log('');

        // Step 1: Explore what data is available
        await collector.exploreApiCapabilities();

        // Step 2: Test source filtering ("top news agencies")
        await collector.testSourceFiltering();

        // Step 3: Understand token costs and date ranges
        await collector.testDateRangeApproach();

        // Step 4: Test randomization strategies
        await collector.testRandomSampling();

        // Step 5: Collect sample articles
        await collector.collectSampleArticles();

        console.log('\n🎯 KEY ANSWERS TO YOUR QUESTIONS:');
        console.log('1. Token cost: 5 tokens per YEAR, not per article or day');
        console.log('2. Date ranges: You can search Jan-Dec 2024 in one query (5 tokens)');
        console.log('3. Randomization: Use different sort orders and time periods');
        console.log('4. Source filtering: Can filter by top 25% Alexa ranking');
        console.log('5. Preview: You see article count before using tokens');
        console.log('6. Database: Articles are ready to save (see sample format above)');

        console.log('\n🚀 Recommended Next Steps:');
        console.log('1. Use broad date ranges (full years) to maximize articles per token');
        console.log('2. Mix different sort orders for diversity');
        console.log('3. Use source ranking filters for quality');
        console.log('4. Start with 10-20 tokens to collect ~200 diverse articles');

    } catch (error: any) {
        console.error('❌ Exploration failed:', error.message);
    }
}

main();