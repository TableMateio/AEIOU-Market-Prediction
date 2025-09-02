#!/usr/bin/env npx tsx

/**
 * Test mixed collection strategy to get both regular and exciting articles
 * with good date distribution
 */

import 'dotenv/config';
import { NewsApiAiService } from '../services/newsApiAiService';

class MixedCollectionTester {
    private newsService: NewsApiAiService;

    constructor() {
        this.newsService = new NewsApiAiService();
    }

    async testMixedStrategies(): Promise<void> {
        console.log('🔄 TESTING MIXED COLLECTION STRATEGIES');
        console.log('='.repeat(60));
        console.log('');

        console.log('🎯 GOAL: Get both regular AND exciting articles with good date spread');
        console.log('📅 PERIOD: 2024-08-05 to 2024-08-07');
        console.log('');

        // Strategy 1: Split collection (half relevance, half socialScore)
        await this.testSplitCollection();
        console.log('');

        // Strategy 2: Pagination approach (different pages = different article types)
        await this.testPaginationApproach();
        console.log('');

        // Strategy 3: Multiple smaller periods
        await this.testSmallerPeriods();
        console.log('');

        this.showRecommendations();
    }

    private async testSplitCollection(): Promise<void> {
        console.log('📊 STRATEGY 1: SPLIT COLLECTION (50% relevance + 50% socialScore)');
        console.log('─'.repeat(60));

        try {
            console.log('   🔍 Collecting 12 relevance articles...');
            const relevanceArticles = await this.newsService.searchAppleByEntity({
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'rel',
                pageSize: 12,
                sourceRankPercentile: 50
            });

            console.log('   📊 Collecting 12 socialScore articles...');
            const socialArticles = await this.newsService.searchAppleByEntity({
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'socialScore',
                pageSize: 12,
                sourceRankPercentile: 50
            });

            // Combine and analyze
            const combinedArticles = [...relevanceArticles, ...socialArticles];
            const deduplicatedArticles = this.deduplicateByURL(combinedArticles);

            console.log(`   ✅ Relevance articles: ${relevanceArticles.length}`);
            console.log(`   📈 SocialScore articles: ${socialArticles.length}`);
            console.log(`   🔄 After URL deduplication: ${deduplicatedArticles.length}`);

            // Analyze date distribution
            const dateAnalysis = this.analyzeDateDistribution(deduplicatedArticles);
            console.log(`   📅 Unique dates: ${dateAnalysis.uniqueDates}`);
            console.log(`   🎯 Spread score: ${dateAnalysis.spreadScore}/100`);

            // Analyze content diversity
            const contentAnalysis = this.analyzeContentDiversity(deduplicatedArticles);
            console.log(`   🔥 Exciting articles: ${contentAnalysis.exciting}`);
            console.log(`   📰 Regular articles: ${contentAnalysis.regular}`);
            console.log(`   💰 Cost: 10 tokens (2 searches)`);

        } catch (error: any) {
            console.log(`   ❌ Split collection failed: ${error.message}`);
        }
    }

    private async testPaginationApproach(): Promise<void> {
        console.log('📄 STRATEGY 2: PAGINATION APPROACH (Page 1 + Page 2 relevance)');
        console.log('─'.repeat(60));

        try {
            console.log('   📖 Getting page 1 (top relevance)...');
            const page1Articles = await this.newsService.searchAppleByEntity({
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'rel',
                pageSize: 12,
                page: 1,
                sourceRankPercentile: 50
            });

            console.log('   📖 Getting page 2 (deeper relevance)...');
            const page2Articles = await this.newsService.searchAppleByEntity({
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'rel',
                pageSize: 12,
                page: 2,
                sourceRankPercentile: 50
            });

            const combinedArticles = [...page1Articles, ...page2Articles];
            const deduplicatedArticles = this.deduplicateByURL(combinedArticles);

            console.log(`   ✅ Page 1 articles: ${page1Articles.length}`);
            console.log(`   📄 Page 2 articles: ${page2Articles.length}`);
            console.log(`   🔄 After deduplication: ${deduplicatedArticles.length}`);

            const dateAnalysis = this.analyzeDateDistribution(deduplicatedArticles);
            console.log(`   📅 Unique dates: ${dateAnalysis.uniqueDates}`);
            console.log(`   🎯 Spread score: ${dateAnalysis.spreadScore}/100`);

            const contentAnalysis = this.analyzeContentDiversity(deduplicatedArticles);
            console.log(`   🔥 Exciting articles: ${contentAnalysis.exciting}`);
            console.log(`   📰 Regular articles: ${contentAnalysis.regular}`);
            console.log(`   💰 Cost: 10 tokens (2 searches)`);

        } catch (error: any) {
            console.log(`   ❌ Pagination approach failed: ${error.message}`);
        }
    }

    private async testSmallerPeriods(): Promise<void> {
        console.log('📅 STRATEGY 3: SMALLER PERIODS (1-day periods with relevance)');
        console.log('─'.repeat(60));

        try {
            const periods = [
                { start: '2024-08-05', end: '2024-08-05', name: 'Day 1' },
                { start: '2024-08-06', end: '2024-08-06', name: 'Day 2' },
                { start: '2024-08-07', end: '2024-08-07', name: 'Day 3' }
            ];

            let allArticles: any[] = [];
            let totalCost = 0;

            for (const period of periods) {
                console.log(`   📅 Collecting ${period.name} (${period.start})...`);

                const articles = await this.newsService.searchAppleByEntity({
                    dateFrom: period.start,
                    dateTo: period.end,
                    sortBy: 'rel',
                    pageSize: 8, // Fewer per day
                    sourceRankPercentile: 50
                });

                allArticles.push(...articles);
                totalCost += 5;
                console.log(`     📊 Collected: ${articles.length} articles`);

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const deduplicatedArticles = this.deduplicateByURL(allArticles);

            console.log(`   ✅ Total articles: ${allArticles.length}`);
            console.log(`   🔄 After deduplication: ${deduplicatedArticles.length}`);

            const dateAnalysis = this.analyzeDateDistribution(deduplicatedArticles);
            console.log(`   📅 Unique dates: ${dateAnalysis.uniqueDates}`);
            console.log(`   🎯 Spread score: ${dateAnalysis.spreadScore}/100`);

            const contentAnalysis = this.analyzeContentDiversity(deduplicatedArticles);
            console.log(`   🔥 Exciting articles: ${contentAnalysis.exciting}`);
            console.log(`   📰 Regular articles: ${contentAnalysis.regular}`);
            console.log(`   💰 Cost: ${totalCost} tokens (${periods.length} searches)`);

        } catch (error: any) {
            console.log(`   ❌ Smaller periods approach failed: ${error.message}`);
        }
    }

    private deduplicateByURL(articles: any[]): any[] {
        const seen = new Set<string>();
        return articles.filter(article => {
            if (seen.has(article.url)) return false;
            seen.add(article.url);
            return true;
        });
    }

    private analyzeDateDistribution(articles: any[]): any {
        const dateGroups: Record<string, number> = {};

        articles.forEach(article => {
            const date = this.extractDate(article);
            dateGroups[date] = (dateGroups[date] || 0) + 1;
        });

        const uniqueDates = Object.keys(dateGroups).length;
        const totalArticles = articles.length;

        // Calculate spread score
        const spreadScore = this.calculateSpreadScore(dateGroups, totalArticles);

        return { uniqueDates, totalArticles, spreadScore, dateGroups };
    }

    private analyzeContentDiversity(articles: any[]): any {
        let exciting = 0;
        let regular = 0;

        articles.forEach(article => {
            const title = (article.title || '').toLowerCase();

            // Indicators of "exciting" news
            const excitingIndicators = [
                'breaking', 'lawsuit', 'sues', 'monopoly', 'scandal', 'controversy',
                'record', 'billion', 'massive', 'unprecedented', 'crisis'
            ];

            // Indicators of "regular" business news
            const regularIndicators = [
                'earnings', 'quarterly', 'revenue', 'guidance', 'analyst',
                'upgrade', 'downgrade', 'price target', 'forecast'
            ];

            const isExciting = excitingIndicators.some(indicator => title.includes(indicator));
            const isRegular = regularIndicators.some(indicator => title.includes(indicator));

            if (isExciting) {
                exciting++;
            } else if (isRegular) {
                regular++;
            } else {
                regular++; // Default to regular
            }
        });

        return { exciting, regular, total: articles.length };
    }

    private calculateSpreadScore(dateGroups: Record<string, number>, totalArticles: number): number {
        const dates = Object.keys(dateGroups);
        if (dates.length <= 1) return 0;

        const idealPerDate = totalArticles / dates.length;
        const variance = Object.values(dateGroups).reduce((sum, count) => {
            return sum + Math.pow(count - idealPerDate, 2);
        }, 0) / dates.length;

        const maxVariance = Math.pow(totalArticles - idealPerDate, 2);
        return Math.round(100 * (1 - variance / maxVariance));
    }

    private extractDate(article: any): string {
        try {
            const dateStr = article.published_at || article.date || article.dateTime;
            if (!dateStr) return 'Unknown';
            return new Date(dateStr).toISOString().split('T')[0];
        } catch {
            return 'Unknown';
        }
    }

    private showRecommendations(): void {
        console.log('🎯 MIXED STRATEGY RECOMMENDATIONS');
        console.log('─'.repeat(50));
        console.log('');

        console.log('📊 STRATEGY COMPARISON:');
        console.log('   1. Split Collection: Mix of exciting + regular, moderate cost');
        console.log('   2. Pagination: More regular articles, same cost');
        console.log('   3. Smaller Periods: Best date control, higher cost');
        console.log('');

        console.log('🏆 RECOMMENDED APPROACH:');
        console.log('   • Use SPLIT COLLECTION (Strategy 1)');
        console.log('   • 60% relevance (regular business) + 40% socialScore (exciting)');
        console.log('   • Provides good balance of content types');
        console.log('   • Reasonable token cost');
        console.log('   • Better date distribution than pure relevance');
        console.log('');

        console.log('🔧 IMPLEMENTATION:');
        console.log('   • Update smart-collection to use mixed approach');
        console.log('   • Collect 15 relevance + 10 socialScore per period');
        console.log('   • Deduplicate by URL and title');
        console.log('   • Cost: 10 tokens per period (2 searches)');
    }
}

// Main execution
async function main() {
    try {
        const tester = new MixedCollectionTester();
        await tester.testMixedStrategies();

    } catch (error: any) {
        console.error('❌ Mixed strategy testing failed:', error.message);
    }
}

main();
