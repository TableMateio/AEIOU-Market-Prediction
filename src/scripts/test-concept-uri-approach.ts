#!/usr/bin/env npx tsx

/**
 * Test the conceptUri approach for precise Apple Inc. targeting
 */

import 'dotenv/config';
import axios from 'axios';
import { logger } from '../utils/logger';

class ConceptUriTest {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://eventregistry.org/api/v1';

    constructor() {
        this.apiKey = process.env.NEWSAPIAI_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('NewsAPI.ai API key is required');
        }
    }

    async testConceptUriApproach(): Promise<void> {
        console.log('🎯 TESTING CONCEPT URI APPROACH');
        console.log('='.repeat(60));
        console.log('');

        console.log('🔬 CONCEPT URI METHOD:');
        console.log('   • Uses Wikipedia URI: http://en.wikipedia.org/wiki/Apple_Inc.');
        console.log('   • Targets Apple Inc. as a specific entity, not text mentions');
        console.log('   • Should return articles specifically ABOUT Apple Inc.');
        console.log('   • Eliminates false positives from ticker symbol mentions');
        console.log('');

        // Test both approaches side by side
        console.log('📊 COMPARISON TEST: ConceptUri vs Text Search');
        console.log('─'.repeat(50));

        await this.testConceptUri();
        console.log('');
        await this.testTextSearch();
        console.log('');

        this.showRecommendation();
    }

    private async testConceptUri(): Promise<void> {
        console.log('🎯 METHOD 1: CONCEPT URI (Apple Inc. Entity)');
        console.log('─'.repeat(40));

        try {
            // Using the exact structure from your example
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
                                "lang": "eng"
                            }
                        ]
                    },
                    "$filter": {
                        "forceMaxDataTimeWindow": "31",
                        "startSourceRankPercentile": 0,
                        "endSourceRankPercentile": 50
                    }
                },
                resultType: "articles",
                articlesSortBy: "rel",
                articlesCount: 15,
                includeArticleBody: true,
                includeArticleConcepts: true,
                includeArticleCategories: true,
                apiKey: this.apiKey
            };

            const response = await axios.post(`${this.baseUrl}/article/getArticles`, requestData, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const articles = response.data?.articles?.results || [];
            const totalResults = response.data?.articles?.totalResults || 0;

            console.log(`✅ ConceptUri Results: ${articles.length} articles (${totalResults} total available)`);
            console.log('');

            console.log('📋 SAMPLE CONCEPT URI ARTICLES:');
            articles.slice(0, 8).forEach((article: any, i: number) => {
                const title = article.title || 'No title';
                const source = article.source?.title || 'Unknown';
                const isAppleSpecific = this.isAppleSpecific(article);
                const icon = isAppleSpecific ? '🍎' : '📊';

                console.log(`   ${icon} ${i + 1}. "${title.substring(0, 70)}..."`);
                console.log(`      Source: ${source}`);
                console.log(`      Apple-specific: ${isAppleSpecific ? 'YES' : 'NO'}`);
                console.log('');
            });

            // Calculate Apple-specific rate
            const appleSpecific = articles.filter((a: any) => this.isAppleSpecific(a)).length;
            const appleSpecificRate = Math.round((appleSpecific / articles.length) * 100);

            console.log(`🍎 Apple-specific rate: ${appleSpecificRate}% (${appleSpecific}/${articles.length})`);

        } catch (error: any) {
            console.log(`❌ ConceptUri test failed: ${error.message}`);
            if (error.response?.data) {
                console.log('Error details:', JSON.stringify(error.response.data, null, 2));
            }
        }
    }

    private async testTextSearch(): Promise<void> {
        console.log('📝 METHOD 2: TEXT SEARCH (AAPL keyword)');
        console.log('─'.repeat(40));

        try {
            const params = {
                resultType: 'articles',
                keyword: 'AAPL',
                lang: 'eng',
                articlesSortBy: 'rel',
                includeArticleBody: true,
                includeArticleConcepts: true,
                includeArticleCategories: true,
                articlesCount: 15,
                apiKey: this.apiKey
            };

            const response = await axios.get(`${this.baseUrl}/article/getArticles`, {
                params,
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];
            const totalResults = response.data?.articles?.totalResults || 0;

            console.log(`✅ Text Search Results: ${articles.length} articles (${totalResults} total available)`);
            console.log('');

            console.log('📋 SAMPLE TEXT SEARCH ARTICLES:');
            articles.slice(0, 8).forEach((article: any, i: number) => {
                const title = article.title || 'No title';
                const source = article.source?.title || 'Unknown';
                const isAppleSpecific = this.isAppleSpecific(article);
                const icon = isAppleSpecific ? '🍎' : '📊';

                console.log(`   ${icon} ${i + 1}. "${title.substring(0, 70)}..."`);
                console.log(`      Source: ${source}`);
                console.log(`      Apple-specific: ${isAppleSpecific ? 'YES' : 'NO'}`);
                console.log('');
            });

            // Calculate Apple-specific rate
            const appleSpecific = articles.filter((a: any) => this.isAppleSpecific(a)).length;
            const appleSpecificRate = Math.round((appleSpecific / articles.length) * 100);

            console.log(`🍎 Apple-specific rate: ${appleSpecificRate}% (${appleSpecific}/${articles.length})`);

        } catch (error: any) {
            console.log(`❌ Text search test failed: ${error.message}`);
        }
    }

    private isAppleSpecific(article: any): boolean {
        const title = (article.title || '').toLowerCase();
        const body = (article.body || '').toLowerCase();
        const text = title + ' ' + body;

        // Strong Apple indicators
        const appleIndicators = [
            'apple inc', 'tim cook', 'cupertino', 'iphone', 'ipad',
            'mac', 'ios', 'app store', 'apple stock', 'apple shares',
            'apple company', 'apple earnings', 'apple revenue'
        ];

        // Check if it's primarily about Apple
        const hasAppleIndicator = appleIndicators.some(indicator => text.includes(indicator));
        const mentionsApple = text.includes('apple');

        // Exclude articles that just mention Apple in passing
        const isAboutOtherCompany = [
            'meta', 'google', 'microsoft', 'amazon', 'tesla', 'nvidia',
            'berkshire', 'warren buffett', 'gogo inc', 'cleanspark'
        ].some(company => title.includes(company));

        return (hasAppleIndicator || mentionsApple) && !isAboutOtherCompany;
    }

    private showRecommendation(): void {
        console.log('🎯 RECOMMENDATION');
        console.log('─'.repeat(30));
        console.log('');

        console.log('✅ CONCEPT URI ADVANTAGES:');
        console.log('   • Targets Apple Inc. as a specific business entity');
        console.log('   • Reduces false positives from ticker mentions');
        console.log('   • Uses semantic understanding, not just text matching');
        console.log('   • Should return articles genuinely ABOUT Apple');
        console.log('');

        console.log('📊 IMPLEMENTATION PLAN:');
        console.log('   1. Update NewsApiAiService to support conceptUri queries');
        console.log('   2. Create searchAppleByEntity() method using conceptUri');
        console.log('   3. Test with same date ranges as before');
        console.log('   4. Compare relevance rates');
        console.log('   5. If successful, replace text-based searches');
        console.log('');

        console.log('🔧 NEXT STEPS:');
        console.log('   • Implement conceptUri in NewsApiAiService');
        console.log('   • Test on 2024-08-05 to 2024-08-07 period');
        console.log('   • Measure Apple-specific relevance improvement');
    }
}

// Main execution
async function main() {
    try {
        const tester = new ConceptUriTest();
        await tester.testConceptUriApproach();

    } catch (error: any) {
        console.error('❌ Concept URI test failed:', error.message);
    }
}

main();
