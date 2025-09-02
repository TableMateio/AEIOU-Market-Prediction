#!/usr/bin/env npx tsx

/**
 * Test improved queries for better Apple relevance
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { NewsApiAiService } from '../services/newsApiAiService';

interface TestResult {
    strategy: string;
    articles: any[];
    relevantCount: number;
    relevanceRate: number;
    samples: string[];
}

class QueryTester {
    private supabase: any;
    private newsService: NewsApiAiService;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
        this.newsService = new NewsApiAiService();
    }

    async testQueries(): Promise<void> {
        console.log('🧪 TESTING IMPROVED QUERY STRATEGIES');
        console.log('='.repeat(60));
        console.log('');

        const results: TestResult[] = [];

        // Test Strategy 1: Apple Inc
        console.log('📋 STRATEGY 1: "Apple Inc" (more specific)');
        const result1 = await this.testQuery('Apple Inc');
        results.push(result1);

        // Test Strategy 2: AAPL
        console.log('📋 STRATEGY 2: "AAPL" (stock symbol)');
        const result2 = await this.testQuery('AAPL');
        results.push(result2);

        // Test Strategy 3: Apple company
        console.log('📋 STRATEGY 3: "Apple company" (explicit)');
        const result3 = await this.testQuery('Apple company');
        results.push(result3);

        // Show comparison
        this.showComparison(results);
    }

    private async testQuery(query: string): Promise<TestResult> {
        try {
            const result = await this.newsService.searchAppleArticles({
                query: query,
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'relevance',
                articlesCount: 15
            });

            if (!result.success || !result.articles) {
                console.log(`❌ Query "${query}" failed: ${result.error}`);
                return {
                    strategy: query,
                    articles: [],
                    relevantCount: 0,
                    relevanceRate: 0,
                    samples: []
                };
            }

            const articles = result.articles;
            const analysis = this.analyzeArticles(articles);

            console.log(`   📊 Found: ${articles.length} articles`);
            console.log(`   ✅ Relevant: ${analysis.relevant}/${articles.length} (${analysis.relevanceRate}%)`);
            console.log(`   📋 Sample titles:`);

            articles.slice(0, 3).forEach((article, i) => {
                const relevantIcon = this.isRelevant(article) ? '✅' : '❌';
                console.log(`      ${relevantIcon} "${article.title?.substring(0, 60) || 'No title'}..."`);
            });
            console.log('');

            return {
                strategy: query,
                articles: articles,
                relevantCount: analysis.relevant,
                relevanceRate: analysis.relevanceRate,
                samples: analysis.irrelevantSamples
            };

        } catch (error: any) {
            console.log(`❌ Error testing "${query}": ${error.message}`);
            return {
                strategy: query,
                articles: [],
                relevantCount: 0,
                relevanceRate: 0,
                samples: []
            };
        }
    }

    private analyzeArticles(articles: any[]): { relevant: number; relevanceRate: number; irrelevantSamples: string[] } {
        let relevant = 0;
        const irrelevantSamples: string[] = [];

        articles.forEach(article => {
            if (this.isRelevant(article)) {
                relevant++;
            } else if (irrelevantSamples.length < 3) {
                irrelevantSamples.push(article.title || 'No title');
            }
        });

        const relevanceRate = Math.round((relevant / articles.length) * 100);
        return { relevant, relevanceRate, irrelevantSamples };
    }

    private isRelevant(article: any): boolean {
        const title = article.title?.toLowerCase() || '';
        const body = article.body?.toLowerCase() || '';
        const searchText = title + ' ' + body;

        // Exclusion keywords (immediate disqualifiers)
        const exclusionKeywords = [
            'big apple', 'central park', 'manhattan', 'brooklyn', 'nyc',
            'french toast', 'recipe', 'cooking', 'food', 'restaurant',
            'erogenous', 'sex', 'adult', 'intimate',
            'assassination', 'murder', 'robbery', 'assault', 'crime',
            'trump assassination', 'biden', 'election',
            'baseball', 'football', 'basketball', 'sports',
            'landlord', 'tenant', 'real estate'
        ];

        // Check for exclusions first
        if (exclusionKeywords.some(keyword => searchText.includes(keyword))) {
            return false;
        }

        // Apple company indicators (must have at least one)
        const appleIndicators = [
            'apple inc', 'aapl', 'tim cook', 'cupertino',
            'iphone', 'ipad', 'mac', 'ios', 'app store',
            'apple stock', 'apple shares', 'apple company'
        ];

        const hasAppleIndicator = appleIndicators.some(indicator => searchText.includes(indicator));

        // Additional relevance check - if just "apple" make sure it's in business/tech context
        if (!hasAppleIndicator && searchText.includes('apple')) {
            const businessContext = [
                'stock', 'shares', 'market', 'earnings', 'revenue', 'profit',
                'technology', 'tech', 'business', 'company', 'corporation'
            ];
            return businessContext.some(context => searchText.includes(context));
        }

        return hasAppleIndicator;
    }

    private showComparison(results: TestResult[]): void {
        console.log('📊 STRATEGY COMPARISON');
        console.log('─'.repeat(50));

        // Sort by relevance rate
        results.sort((a, b) => b.relevanceRate - a.relevanceRate);

        results.forEach((result, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
            const status = result.relevanceRate >= 80 ? '✅' : result.relevanceRate >= 60 ? '⚠️' : '❌';

            console.log(`${medal} ${status} "${result.strategy}"`);
            console.log(`   Relevance: ${result.relevanceRate}% (${result.relevantCount}/${result.articles.length})`);

            if (result.samples.length > 0) {
                console.log(`   Irrelevant samples:`);
                result.samples.forEach(sample => {
                    console.log(`      • "${sample.substring(0, 50)}..."`);
                });
            }
            console.log('');
        });

        // Recommendation
        const best = results[0];
        console.log('🎯 RECOMMENDATION');
        console.log('─'.repeat(30));

        if (best.relevanceRate >= 80) {
            console.log(`✅ Use "${best.strategy}" - ${best.relevanceRate}% relevance rate`);
            console.log('   This strategy provides high-quality, relevant articles.');
        } else if (best.relevanceRate >= 60) {
            console.log(`⚠️  Best option: "${best.strategy}" - ${best.relevanceRate}% relevance rate`);
            console.log('   Consider additional filtering or different approach.');
        } else {
            console.log(`❌ All strategies show low relevance. Need major improvements.`);
            console.log('   Consider using different news sources or more specific queries.');
        }
    }
}

// Main execution
async function main() {
    try {
        const tester = new QueryTester();
        await tester.testQueries();

    } catch (error: any) {
        console.error('❌ Query testing failed:', error.message);
    }
}

main();
