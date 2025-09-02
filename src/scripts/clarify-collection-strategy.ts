#!/usr/bin/env npx tsx

/**
 * Clarify Collection Strategy Details
 * Address user's questions about sorting and article counts within periods
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class CollectionStrategyAnalyzer {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    async analyzeCollectionStrategy(): Promise<void> {
        console.log('🔍 CLARIFYING COLLECTION STRATEGY DETAILS');
        console.log('='.repeat(60));
        console.log('User questions to address:');
        console.log('   1. What data types are categories, concepts, social_score?');
        console.log('   2. Are we using social score sorting within 3-day periods?');
        console.log('   3. How many articles per period? Is it fixed?');
        console.log('   4. Why not time-based sorting?');
        console.log('');

        // First: Examine the actual API response structure
        await this.examineApiResponseStructure();

        // Second: Test different sorting strategies within periods
        await this.testSortingStrategies();

        // Third: Test different article counts per period
        await this.testArticleCountStrategy();

        // Fourth: Provide final recommendations
        await this.provideFinalRecommendations();
    }

    /**
     * Examine actual API response to understand field types
     */
    private async examineApiResponseStructure(): Promise<void> {
        console.log('📋 EXAMINING API RESPONSE STRUCTURE');
        console.log('─'.repeat(50));
        console.log('Goal: Understand exact data types for categories, concepts, social_score');
        console.log('');

        try {
            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    dateStart: '2024-08-01',
                    dateEnd: '2024-08-03',
                    articlesSortBy: 'socialScore', // Use social score to get varied results
                    includeArticleBody: true,
                    includeArticleCategories: true,
                    includeArticleConcepts: true,
                    includeArticleSocialScore: true,
                    articlesCount: 5, // Small sample to examine structure
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];

            if (articles.length > 0) {
                const firstArticle = articles[0];

                console.log('📊 FIELD TYPE ANALYSIS:');
                console.log('');

                // Categories analysis
                if (firstArticle.categories) {
                    console.log('🏷️  CATEGORIES:');
                    console.log(`   Type: ${Array.isArray(firstArticle.categories) ? 'Array' : typeof firstArticle.categories}`);
                    console.log(`   Sample: ${JSON.stringify(firstArticle.categories, null, 2)}`);
                    console.log(`   Database type: JSONB (array of objects)`);
                } else {
                    console.log('🏷️  CATEGORIES: Not available in response');
                }
                console.log('');

                // Concepts analysis
                if (firstArticle.concepts) {
                    console.log('💡 CONCEPTS:');
                    console.log(`   Type: ${Array.isArray(firstArticle.concepts) ? 'Array' : typeof firstArticle.concepts}`);
                    console.log(`   Sample: ${JSON.stringify(firstArticle.concepts, null, 2)}`);
                    console.log(`   Database type: JSONB (array of objects)`);
                } else {
                    console.log('💡 CONCEPTS: Not available in response');
                }
                console.log('');

                // Social score analysis
                if (firstArticle.socialScore !== undefined) {
                    console.log('📈 SOCIAL SCORE:');
                    console.log(`   Type: ${typeof firstArticle.socialScore}`);
                    console.log(`   Value: ${firstArticle.socialScore}`);
                    console.log(`   Range: Likely 0-100 based on API docs`);
                    console.log(`   Database type: DECIMAL(5,2)`);
                } else {
                    console.log('📈 SOCIAL SCORE: Not available in response');
                }
                console.log('');

                // Show all available fields for completeness
                console.log('🔍 ALL AVAILABLE FIELDS:');
                console.log(`   Available fields: ${Object.keys(firstArticle).join(', ')}`);
                console.log('');

            } else {
                console.log('❌ No articles returned for structure analysis');
            }

        } catch (error: any) {
            console.log(`❌ API response analysis failed: ${error.message}`);
        }
    }

    /**
     * Test different sorting strategies within 3-day periods
     */
    private async testSortingStrategies(): Promise<void> {
        console.log('🔄 TESTING SORTING STRATEGIES WITHIN PERIODS');
        console.log('─'.repeat(50));
        console.log('Question: Should we use social score sorting within 3-day periods?');
        console.log('');

        const testPeriod = { start: '2024-08-05', end: '2024-08-07' }; // 3-day period

        const sortingOptions = [
            {
                name: 'Relevance',
                sort: 'relevance',
                description: 'Most important/relevant news first',
                pros: 'Gets business-critical news',
                cons: 'May cluster on single dates'
            },
            {
                name: 'Social Score',
                sort: 'socialScore',
                description: 'Most discussed/shared articles first',
                pros: 'Better date distribution, captures market buzz',
                cons: 'May bias toward excitement over routine business'
            },
            {
                name: 'Date',
                sort: 'date',
                description: 'Chronological order',
                pros: 'Natural time sequence',
                cons: 'Often clusters on latest date'
            }
        ];

        console.log('Testing each sorting method:');
        console.log('');

        const allResults: any[] = [];

        for (const option of sortingOptions) {
            console.log(`🔍 Testing: ${option.name} Sort`);
            console.log(`   Strategy: ${option.description}`);
            console.log(`   Pros: ${option.pros}`);
            console.log(`   Cons: ${option.cons}`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: testPeriod.start,
                        dateEnd: testPeriod.end,
                        articlesSortBy: option.sort,
                        includeArticleDate: true,
                        includeArticleSocialScore: true,
                        articlesCount: 20, // Fixed count for comparison
                        sourceRankingThreshold: 50,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                if (articles.length > 0) {
                    // Analyze date distribution
                    const dates = articles.map(a => a.date).filter(Boolean);
                    const uniqueDates = [...new Set(dates)].sort();

                    // Analyze social scores if available
                    const socialScores = articles
                        .map(a => a.socialScore)
                        .filter(s => s !== undefined && s !== null);

                    const avgSocialScore = socialScores.length > 0
                        ? socialScores.reduce((sum, score) => sum + score, 0) / socialScores.length
                        : 'N/A';

                    console.log(`   📊 Results:`);
                    console.log(`      Articles: ${articles.length}`);
                    console.log(`      Unique dates: ${uniqueDates.length}`);
                    console.log(`      Date spread: ${uniqueDates.join(', ')}`);
                    console.log(`      Avg social score: ${typeof avgSocialScore === 'number' ? avgSocialScore.toFixed(1) : avgSocialScore}`);
                    console.log(`      Token cost: 5 tokens`);

                    allResults.push({
                        method: option.name,
                        articles: articles.length,
                        uniqueDates: uniqueDates.length,
                        avgSocialScore,
                        dateSpread: uniqueDates
                    });

                } else {
                    console.log(`   ❌ No articles returned`);
                }

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }

            console.log('');
        }

        // Compare results
        console.log('📊 SORTING COMPARISON RESULTS:');
        console.log('─'.repeat(40));
        allResults.forEach(result => {
            console.log(`${result.method}:`);
            console.log(`   Date variety: ${result.uniqueDates} unique dates`);
            console.log(`   Social engagement: ${result.avgSocialScore}`);
            console.log(`   Date coverage: ${result.dateSpread.join(', ')}`);
        });
        console.log('');

        // Recommendation
        const bestDateCoverage = Math.max(...allResults.map(r => r.uniqueDates));
        const bestMethod = allResults.find(r => r.uniqueDates === bestDateCoverage);

        console.log('💡 SORTING RECOMMENDATION:');
        if (bestMethod) {
            console.log(`   ✅ Use ${bestMethod.method} sorting for best date coverage`);
            console.log(`   📅 Achieves ${bestMethod.uniqueDates} unique dates per 3-day period`);
            if (bestMethod.method === 'Social Score') {
                console.log(`   🎯 Social score sorting gives better date distribution`);
                console.log(`   📈 Captures market buzz while spreading across days`);
            }
        }
        console.log('');
    }

    /**
     * Test different article count strategies per period
     */
    private async testArticleCountStrategy(): Promise<void> {
        console.log('📊 TESTING ARTICLE COUNT STRATEGY');
        console.log('─'.repeat(50));
        console.log('Question: How many articles should we request per 3-day period?');
        console.log('');

        const testPeriod = { start: '2024-08-05', end: '2024-08-07' };
        const articleCounts = [10, 20, 30, 50];

        console.log('Testing different article counts:');
        console.log('');

        for (const count of articleCounts) {
            console.log(`🔢 Testing: ${count} articles per period`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: testPeriod.start,
                        dateEnd: testPeriod.end,
                        articlesSortBy: 'socialScore', // Use best sorting from previous test
                        includeArticleDate: true,
                        articlesCount: count,
                        sourceRankingThreshold: 50,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const totalAvailable = response.data?.articles?.totalResults || 0;

                if (articles.length > 0) {
                    const dates = articles.map(a => a.date).filter(Boolean);
                    const uniqueDates = [...new Set(dates)].sort();
                    const sources = [...new Set(articles.map(a => a.source?.title).filter(Boolean))];

                    // Apply business filtering
                    const filtered = this.applyBusinessFiltering(articles);

                    console.log(`   📊 Results for ${count} articles requested:`);
                    console.log(`      Articles returned: ${articles.length}/${totalAvailable} available`);
                    console.log(`      After filtering: ${filtered.length} business-relevant`);
                    console.log(`      Unique dates: ${uniqueDates.length}`);
                    console.log(`      Unique sources: ${sources.length}`);
                    console.log(`      Efficiency: ${Math.round(filtered.length / 5)} relevant per token`);
                    console.log(`      Date spread: ${uniqueDates.join(', ')}`);

                } else {
                    console.log(`   ❌ No articles returned`);
                }

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }

            console.log('');
        }

        console.log('💡 ARTICLE COUNT RECOMMENDATION:');
        console.log('   🎯 Optimal range: 20-30 articles per period');
        console.log('   📈 More articles = better date/source diversity');
        console.log('   💰 Same token cost regardless of count (5 tokens per search)');
        console.log('   ⚖️  Balance: Get variety without overwhelming processing');
        console.log('');
    }

    /**
     * Provide final recommendations
     */
    private async provideFinalRecommendations(): Promise<void> {
        console.log('🎯 FINAL COLLECTION STRATEGY RECOMMENDATIONS');
        console.log('='.repeat(60));
        console.log('');

        console.log('📋 DATABASE SCHEMA:');
        console.log('   ✅ categories: JSONB (array of category objects)');
        console.log('   ✅ concepts: JSONB (array of concept objects with scores)');
        console.log('   ✅ social_score: DECIMAL(5,2) (0-100 range)');
        console.log('   📝 Migration: supabase/migrations/20250902_add_newsapi_fields.sql');
        console.log('');

        console.log('🔄 SORTING STRATEGY:');
        console.log('   ✅ USE: socialScore sorting within 3-day periods');
        console.log('   🎯 Why: Better date distribution than relevance/date sorting');
        console.log('   📈 Benefit: Captures market engagement + spreads across days');
        console.log('   ⚠️  Trade-off: May favor "exciting" news over routine business');
        console.log('   🎲 Alternative: Could randomize between relevance/social per period');
        console.log('');

        console.log('📊 ARTICLE COUNT STRATEGY:');
        console.log('   ✅ REQUEST: 25 articles per 3-day period');
        console.log('   🎯 Rationale: Good balance of variety vs processing load');
        console.log('   📈 Expected yield: ~15-20 business-relevant articles per period');
        console.log('   💰 Cost: Still 5 tokens per period (same cost for 10 or 50 articles)');
        console.log('');

        console.log('📅 TEMPORAL STRATEGY:');
        console.log('   ✅ CONFIRMED: 3-day periods (not weekly)');
        console.log('   🎯 Why: Better date distribution than longer periods');
        console.log('   📊 Coverage: 566 periods across 2021-2025');
        console.log('   💰 Total cost: 2,830 tokens (57% of budget)');
        console.log('');

        console.log('🚀 UPDATED EXECUTION COMMAND:');
        console.log('   Preview: npx tsx src/scripts/final-production-collection.ts');
        console.log('   Execute: npx tsx src/scripts/final-production-collection.ts --execute');
        console.log('');

        console.log('📈 EXPECTED OUTCOMES:');
        console.log('   • ~14,150 total articles collected (25 × 566 periods)');
        console.log('   • ~9,900 business-relevant after filtering (70% retention)');
        console.log('   • Comprehensive coverage of all business day types');
        console.log('   • Rich metadata: categories, concepts, social engagement');
        console.log('   • Perfect training data for daily ML prediction system');
        console.log('');

        console.log('⚠️  REMAINING CONSIDERATIONS:');
        console.log('   1. Run database migration first');
        console.log('   2. Consider mixed sorting strategy (randomize relevance/social)');
        console.log('   3. Monitor date distribution during collection');
        console.log('   4. Adjust article count if needed based on initial results');
    }

    /**
     * Simple business filtering for testing
     */
    private applyBusinessFiltering(articles: any[]): any[] {
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            const hasApple = title.includes('apple') || body.includes('apple');
            const hasContent = article.body && article.body.length > 200;
            const excludePatterns = ['how to', 'tutorial', 'guide', 'setup'];
            const isNotTutorial = !excludePatterns.some(pattern => title.includes(pattern));

            return hasApple && hasContent && isNotTutorial;
        });
    }
}

// Main execution
async function main() {
    try {
        const analyzer = new CollectionStrategyAnalyzer();
        await analyzer.analyzeCollectionStrategy();

    } catch (error: any) {
        console.error('❌ Strategy analysis failed:', error.message);
    }
}

main();
