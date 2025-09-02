#!/usr/bin/env npx tsx

/**
 * Direct test of different Apple queries
 */

import 'dotenv/config';
import { NewsApiAiService } from '../services/newsApiAiService';

class DirectQueryTester {
    private newsService: NewsApiAiService;

    constructor() {
        this.newsService = new NewsApiAiService();
    }

    async testQueries(): Promise<void> {
        console.log('🧪 DIRECT QUERY TESTING');
        console.log('='.repeat(50));
        console.log('');

        // Test different queries
        await this.testQuery('Apple');
        await this.testQuery('Apple Inc');
        await this.testQuery('AAPL');
        await this.testQuery('Apple company');

        console.log('🎯 NEXT STEPS');
        console.log('─'.repeat(20));
        console.log('Based on results above, choose the query with highest relevance');
        console.log('and implement proper filtering in production collection.');
    }

    private async testQuery(query: string): Promise<void> {
        console.log(`📋 TESTING: "${query}"`);
        console.log('─'.repeat(30));

        try {
            const articles = await this.newsService.searchAppleArticles({
                query: query,
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'relevance',
                pageSize: 15
            });

            console.log(`   📊 Found: ${articles.length} articles`);

            // Analyze relevance
            let relevant = 0;
            const samples: string[] = [];

            articles.forEach(article => {
                const isRelevant = this.isAppleRelevant(article);
                if (isRelevant) {
                    relevant++;
                } else if (samples.length < 3) {
                    samples.push(article.title || 'No title');
                }
            });

            const relevanceRate = Math.round((relevant / articles.length) * 100);
            const status = relevanceRate >= 80 ? '✅' : relevanceRate >= 60 ? '⚠️' : '❌';

            console.log(`   ${status} Relevance: ${relevanceRate}% (${relevant}/${articles.length})`);

            // Show sample titles
            console.log('   📋 Sample titles:');
            articles.slice(0, 5).forEach((article, i) => {
                const relevantIcon = this.isAppleRelevant(article) ? '✅' : '❌';
                console.log(`      ${relevantIcon} "${(article.title || 'No title').substring(0, 60)}..."`);
            });

            if (samples.length > 0) {
                console.log('   🚨 Irrelevant samples:');
                samples.forEach(sample => {
                    console.log(`      • "${sample.substring(0, 60)}..."`);
                });
            }

        } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        console.log('');
    }

    private isAppleRelevant(article: any): boolean {
        const title = article.title?.toLowerCase() || '';
        const body = article.body?.toLowerCase() || '';
        const searchText = title + ' ' + body;

        // Immediate disqualifiers
        const exclusions = [
            'big apple', 'central park', 'manhattan', 'brooklyn', 'nyc',
            'french toast', 'recipe', 'cooking', 'berries',
            'erogenous', 'sex', 'adult',
            'assassination', 'murder', 'robbery', 'assault',
            'trump assassination', 'biden', 'election',
            'baseball', 'football', 'basketball', 'sports',
            'landlord', 'tenant', 'real estate'
        ];

        if (exclusions.some(exclusion => searchText.includes(exclusion))) {
            return false;
        }

        // Strong Apple indicators
        const strongIndicators = [
            'apple inc', 'aapl', 'tim cook', 'cupertino',
            'iphone', 'ipad', 'mac', 'ios', 'app store',
            'apple stock', 'apple shares', 'apple company',
            'apple earnings', 'apple revenue'
        ];

        if (strongIndicators.some(indicator => searchText.includes(indicator))) {
            return true;
        }

        // If just "apple", need business context
        if (searchText.includes('apple')) {
            const businessContext = [
                'stock', 'shares', 'market', 'earnings', 'revenue', 'profit',
                'technology', 'tech', 'business', 'company', 'corporation',
                'investor', 'investment', 'financial'
            ];
            return businessContext.some(context => searchText.includes(context));
        }

        return false;
    }
}

// Main execution
async function main() {
    try {
        const tester = new DirectQueryTester();
        await tester.testQueries();

    } catch (error: any) {
        console.error('❌ Direct query testing failed:', error.message);
    }
}

main();
