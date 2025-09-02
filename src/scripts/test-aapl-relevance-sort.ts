#!/usr/bin/env npx tsx

/**
 * Test AAPL with relevance sort instead of socialScore
 */

import 'dotenv/config';
import { NewsApiAiService } from '../services/newsApiAiService';

class AAPLRelevanceTest {
    private newsService: NewsApiAiService;

    constructor() {
        this.newsService = new NewsApiAiService();
    }

    async compareSort(): Promise<void> {
        console.log('🧪 AAPL SORT COMPARISON');
        console.log('='.repeat(40));
        console.log('');

        // Test socialScore sort
        console.log('📊 TESTING: socialScore sort (current)');
        await this.testSort('socialScore');

        console.log('');

        // Test relevance sort  
        console.log('📊 TESTING: relevance sort (Apple-focused)');
        await this.testSort('relevance');

        console.log('');
        console.log('🎯 RECOMMENDATION:');
        console.log('Based on results above, choose the sort that gives more Apple-specific articles');
    }

    private async testSort(sortBy: 'socialScore' | 'relevance'): Promise<void> {
        console.log('─'.repeat(30));

        try {
            const articles = await this.newsService.searchAppleArticles({
                query: 'AAPL',
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: sortBy,
                pageSize: 10
            });

            console.log(`✅ Collected: ${articles.length} articles`);
            console.log('📋 Sample titles:');

            articles.slice(0, 5).forEach((article, i) => {
                const title = article.title || 'No title';
                const isAppleSpecific = this.isAppleSpecific(article);
                const icon = isAppleSpecific ? '🍎' : '📈';
                console.log(`   ${icon} "${title.substring(0, 70)}..."`);
            });

            // Count Apple-specific vs general market
            const appleSpecific = articles.filter(a => this.isAppleSpecific(a)).length;
            const generalMarket = articles.length - appleSpecific;

            console.log('');
            console.log(`🍎 Apple-specific: ${appleSpecific} articles`);
            console.log(`📈 General market: ${generalMarket} articles`);
            console.log(`🎯 Apple focus rate: ${Math.round(appleSpecific / articles.length * 100)}%`);

        } catch (error: any) {
            console.log(`❌ Error: ${error.message}`);
        }
    }

    private isAppleSpecific(article: any): boolean {
        const title = article.title?.toLowerCase() || '';
        const body = article.body?.toLowerCase() || '';
        const text = title + ' ' + body;

        // Apple-specific indicators
        const appleSpecific = [
            'apple inc', 'tim cook', 'cupertino', 'iphone', 'ipad',
            'mac', 'ios', 'app store', 'apple stock', 'apple shares',
            'apple company', 'apple earnings', 'apple revenue'
        ];

        return appleSpecific.some(indicator => text.includes(indicator));
    }
}

// Main execution
async function main() {
    try {
        const tester = new AAPLRelevanceTest();
        await tester.compareSort();

    } catch (error: any) {
        console.error('❌ Sort comparison failed:', error.message);
    }
}

main();
