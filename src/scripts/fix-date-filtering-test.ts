#!/usr/bin/env npx tsx

/**
 * Fix date filtering bug and test with minimal request
 */

import 'dotenv/config';
import axios from 'axios';

class DateFilteringFix {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://eventregistry.org/api/v1';

    constructor() {
        this.apiKey = process.env.NEWSAPIAI_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('NewsAPI.ai API key is required');
        }
    }

    async testDateFiltering(): Promise<void> {
        console.log('🔧 FIXING DATE FILTERING BUG');
        console.log('='.repeat(50));
        console.log('');

        console.log('🚨 THE BUG:');
        console.log('   ❌ I put dates in $filter section (WRONG)');
        console.log('   ✅ Should be in $query.$and array (CORRECT)');
        console.log('');

        // Test 1: January 2021 (should get old articles)
        console.log('📅 TEST 1: January 2021 (should get OLD articles)');
        await this.testSingleDate('2021-01-15', '2021-01-17', 'January 2021');

        console.log('');

        // Test 2: August 2024 (should get different articles)
        console.log('📅 TEST 2: August 2024 (should get DIFFERENT articles)');
        await this.testSingleDate('2024-08-15', '2024-08-17', 'August 2024');

        console.log('');
        console.log('🎯 VERIFICATION:');
        console.log('   • If articles are the same = date filtering still broken');
        console.log('   • If articles are different = date filtering fixed!');
    }

    private async testSingleDate(dateStart: string, dateEnd: string, label: string): Promise<void> {
        console.log(`─`.repeat(40));
        console.log(`🔍 Testing ${label}: ${dateStart} to ${dateEnd}`);

        try {
            // FIXED: Put dates in $query.$and array like your example
            const requestData = {
                query: {
                    "$query": {
                        "$and": [
                            {
                                "conceptUri": "http://en.wikipedia.org/wiki/Apple_Inc."
                            },
                            {
                                "locationUri": "http://en.wikipedia.org/wiki/United_States"
                            },
                            {
                                "dateStart": dateStart,
                                "dateEnd": dateEnd,
                                "lang": "eng"
                            }
                        ]
                    },
                    "$filter": {
                        "startSourceRankPercentile": 0,
                        "endSourceRankPercentile": 50
                    }
                },
                resultType: "articles",
                articlesSortBy: "socialScore",
                articlesCount: 5, // TINY test - only 5 articles
                includeArticleBody: true,
                apiKey: this.apiKey
            };

            console.log('🔧 Request structure (FIXED):');
            console.log('   • conceptUri: ✅ Apple Inc.');
            console.log('   • locationUri: ✅ United States');
            console.log(`   • dateStart: ✅ ${dateStart}`);
            console.log(`   • dateEnd: ✅ ${dateEnd}`);
            console.log('   • articlesCount: 5 (small test)');

            const response = await axios.post(`${this.baseUrl}/article/getArticles`, requestData, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const articles = response.data?.articles?.results || [];
            const totalResults = response.data?.articles?.totalResults || 0;

            console.log(`✅ Results: ${articles.length} articles (${totalResults} total available)`);
            console.log('');

            if (articles.length > 0) {
                console.log('📋 SAMPLE ARTICLES:');
                articles.forEach((article: any, i: number) => {
                    const title = (article.title || 'No title').substring(0, 80);
                    const publishedDate = this.extractDate(article);
                    const source = article.source?.title || 'Unknown';

                    console.log(`   ${i + 1}. "${title}..."`);
                    console.log(`      📅 ${publishedDate} | 📰 ${source}`);
                });
            } else {
                console.log('❌ No articles returned');
            }

        } catch (error: any) {
            console.log(`❌ Test failed: ${error.message}`);
            if (error.response?.data) {
                console.log('API Error:', JSON.stringify(error.response.data, null, 2));
            }
        }
    }

    private extractDate(article: any): string {
        try {
            const dateStr = article.date || article.dateTime || article.published_at;
            if (!dateStr) return 'Unknown';
            return new Date(dateStr).toISOString().split('T')[0];
        } catch {
            return 'Unknown';
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('🔧 DATE FILTERING BUG FIX TEST');
        console.log('Testing with MINIMAL requests (5 articles each)');
        console.log('Cost: 10 tokens total');
        console.log('');

        const tester = new DateFilteringFix();
        await tester.testDateFiltering();

    } catch (error: any) {
        console.error('❌ Date filtering test failed:', error.message);
    }
}

main();
