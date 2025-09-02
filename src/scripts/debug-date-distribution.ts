#!/usr/bin/env npx tsx

/**
 * Debug date distribution with entity-based collection
 * Test different sorting methods to solve date clustering
 */

import 'dotenv/config';
import { NewsApiAiService } from '../services/newsApiAiService';

class DateDistributionDebugger {
    private newsService: NewsApiAiService;

    constructor() {
        this.newsService = new NewsApiAiService();
    }

    async debugDateDistribution(): Promise<void> {
        console.log('🔍 DEBUGGING DATE DISTRIBUTION - ENTITY METHOD');
        console.log('='.repeat(60));
        console.log('');

        console.log('🎯 TESTING PERIOD: 2024-08-05 to 2024-08-07 (3 days)');
        console.log('🎯 GOAL: Articles spread across multiple dates, not clustered');
        console.log('');

        // Test different sorting methods
        await this.testSortMethod('rel', 'Relevance');
        console.log('');
        await this.testSortMethod('date', 'Date (chronological)');
        console.log('');
        await this.testSortMethod('socialScore', 'Social Score');
        console.log('');

        this.showRecommendations();
    }

    private async testSortMethod(sortBy: 'rel' | 'date' | 'socialScore', sortName: string): Promise<void> {
        console.log(`📊 TESTING: ${sortName.toUpperCase()} SORT`);
        console.log('─'.repeat(40));

        try {
            const articles = await this.newsService.searchAppleByEntity({
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: sortBy,
                pageSize: 20, // Get more articles to see distribution
                sourceRankPercentile: 50
            });

            console.log(`✅ Collected: ${articles.length} articles`);

            // Analyze date distribution
            const dateDistribution = this.analyzeDateDistribution(articles);
            this.showDateDistribution(dateDistribution);

            // Show sample articles with dates
            console.log('📋 SAMPLE ARTICLES WITH DATES:');
            articles.slice(0, 8).forEach((article, i) => {
                const title = (article.title || 'No title').substring(0, 60);
                const publishedDate = this.extractDate(article);
                const source = article.source || 'Unknown';

                console.log(`   ${i + 1}. "${title}..."`);
                console.log(`      📅 ${publishedDate} | 📰 ${source}`);
            });

        } catch (error: any) {
            console.log(`❌ ${sortName} sort failed: ${error.message}`);
        }
    }

    private analyzeDateDistribution(articles: any[]): any {
        const dateGroups: Record<string, number> = {};
        const dateDetails: Record<string, any[]> = {};

        articles.forEach(article => {
            const date = this.extractDate(article);
            dateGroups[date] = (dateGroups[date] || 0) + 1;

            if (!dateDetails[date]) dateDetails[date] = [];
            dateDetails[date].push(article);
        });

        const uniqueDates = Object.keys(dateGroups).length;
        const totalArticles = articles.length;
        const averagePerDate = Math.round(totalArticles / uniqueDates);

        return {
            dateGroups,
            dateDetails,
            uniqueDates,
            totalArticles,
            averagePerDate,
            spreadScore: this.calculateSpreadScore(dateGroups, totalArticles)
        };
    }

    private calculateSpreadScore(dateGroups: Record<string, number>, totalArticles: number): number {
        // Calculate how evenly spread articles are across dates
        // Score of 100 = perfectly even distribution
        // Score of 0 = all articles on one date

        const dates = Object.keys(dateGroups);
        if (dates.length <= 1) return 0;

        const idealPerDate = totalArticles / dates.length;
        const variance = Object.values(dateGroups).reduce((sum, count) => {
            return sum + Math.pow(count - idealPerDate, 2);
        }, 0) / dates.length;

        const maxVariance = Math.pow(totalArticles - idealPerDate, 2);
        return Math.round(100 * (1 - variance / maxVariance));
    }

    private showDateDistribution(distribution: any): void {
        console.log(`📊 DATE DISTRIBUTION ANALYSIS:`);
        console.log(`   📅 Unique dates: ${distribution.uniqueDates}`);
        console.log(`   📰 Total articles: ${distribution.totalArticles}`);
        console.log(`   📈 Average per date: ${distribution.averagePerDate}`);
        console.log(`   🎯 Spread score: ${distribution.spreadScore}/100 (higher = better distribution)`);
        console.log('');

        console.log(`📋 ARTICLES BY DATE:`);
        Object.entries(distribution.dateGroups)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([date, count]) => {
                const bar = '█'.repeat(Math.min(count as number, 20));
                console.log(`   ${date}: ${count} articles ${bar}`);
            });
        console.log('');
    }

    private extractDate(article: any): string {
        try {
            // Try different date fields
            const dateStr = article.published_at || article.date || article.dateTime;
            if (!dateStr) return 'Unknown';

            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
        } catch {
            return 'Unknown';
        }
    }

    private showRecommendations(): void {
        console.log('🎯 RECOMMENDATIONS FOR DATE DISTRIBUTION');
        console.log('─'.repeat(50));
        console.log('');

        console.log('📊 ANALYSIS SUMMARY:');
        console.log('   • Compare spread scores above');
        console.log('   • Higher spread score = better date distribution');
        console.log('   • Look for method with most unique dates');
        console.log('');

        console.log('🔧 POSSIBLE SOLUTIONS:');
        console.log('   1. Use sort method with highest spread score');
        console.log('   2. Combine multiple sorts (e.g., 10 relevance + 10 socialScore)');
        console.log('   3. Use pagination to get different "layers" of results');
        console.log('   4. Implement date-based sampling within results');
        console.log('');

        console.log('⚡ QUICK FIXES TO TEST:');
        console.log('   • If socialScore gives best spread: use socialScore');
        console.log('   • If relevance clusters: try mixed approach');
        console.log('   • Consider collecting more articles per period');
        console.log('');

        console.log('🚀 NEXT STEPS:');
        console.log('   1. Identify best sorting method from results above');
        console.log('   2. Update smart-collection-entity.ts to use optimal sort');
        console.log('   3. Test with larger collection to verify distribution');
    }
}

// Main execution
async function main() {
    try {
        const analyzer = new DateDistributionDebugger();
        await analyzer.debugDateDistribution();

    } catch (error: any) {
        console.error('❌ Date distribution debugging failed:', error.message);
    }
}

main();
