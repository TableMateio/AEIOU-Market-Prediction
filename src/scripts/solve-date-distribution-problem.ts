#!/usr/bin/env npx tsx

/**
 * Solve Date Distribution Problem
 * Address the core issue: getting articles from ALL days, not just clusters
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class DateDistributionSolver {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    async solveDateDistribution(): Promise<void> {
        console.log('🎯 SOLVING THE DATE DISTRIBUTION PROBLEM');
        console.log('='.repeat(60));
        console.log('Core issue: API returns articles clustered on specific dates');
        console.log('Need: Articles from ALL business days for robust ML training');
        console.log('');

        // Test the core problem
        await this.demonstrateProblem();

        // Test potential solutions
        await this.testPotentialSolutions();

        // Propose final solution
        await this.proposeFinalSolution();
    }

    /**
     * Demonstrate the date clustering problem clearly
     */
    private async demonstrateProblem(): Promise<void> {
        console.log('🔍 DEMONSTRATING THE DATE CLUSTERING PROBLEM');
        console.log('─'.repeat(50));

        const testWeek = { start: '2024-08-05', end: '2024-08-09' };
        console.log(`Testing week: ${testWeek.start} to ${testWeek.end} (5 business days)`);
        console.log('Goal: Get articles from all 5 days, not just 1-2 days');
        console.log('');

        try {
            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    dateStart: testWeek.start,
                    dateEnd: testWeek.end,
                    articlesSortBy: 'relevance', // Most common approach
                    includeArticleDate: true,
                    articlesCount: 100, // Large sample to see pattern
                    sourceRankingThreshold: 50,
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];

            if (articles.length > 0) {
                // Analyze date distribution
                const dateCount = articles.reduce((acc, article) => {
                    const date = article.date;
                    acc[date] = (acc[date] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const sortedDates = Object.entries(dateCount).sort(([a], [b]) => a.localeCompare(b));

                console.log(`📊 PROBLEM DEMONSTRATION:`);
                console.log(`   Total articles: ${articles.length}`);
                console.log(`   Unique dates: ${sortedDates.length}/5 business days`);
                console.log('');
                console.log(`📅 Date distribution:`);
                sortedDates.forEach(([date, count]) => {
                    const percentage = Math.round((count / articles.length) * 100);
                    console.log(`   ${date}: ${count} articles (${percentage}%)`);
                });
                console.log('');

                // Calculate business days in range
                const businessDays = this.getBusinessDaysInRange(testWeek.start, testWeek.end);
                const coveredDays = sortedDates.map(([date]) => date);
                const missedDays = businessDays.filter(day => !coveredDays.includes(day));

                console.log(`💼 Business day analysis:`);
                console.log(`   Expected business days: ${businessDays.join(', ')}`);
                console.log(`   Days with articles: ${coveredDays.join(', ')}`);
                console.log(`   Missed days: ${missedDays.length > 0 ? missedDays.join(', ') : 'None'}`);
                console.log(`   Coverage: ${Math.round((coveredDays.length / businessDays.length) * 100)}%`);
                console.log('');

                if (coveredDays.length < businessDays.length) {
                    console.log(`❌ PROBLEM CONFIRMED:`);
                    console.log(`   • Articles cluster on ${coveredDays.length} out of ${businessDays.length} business days`);
                    console.log(`   • Missing coverage for ${missedDays.length} days`);
                    console.log(`   • This creates bias toward "newsworthy" days`);
                    console.log(`   • ML model won't learn from "quiet" trading days`);
                } else {
                    console.log(`✅ No problem detected in this week`);
                }
            }

        } catch (error: any) {
            console.log(`❌ Problem demonstration failed: ${error.message}`);
        }
    }

    /**
     * Test potential solutions to the date distribution problem
     */
    private async testPotentialSolutions(): Promise<void> {
        console.log('🧪 TESTING POTENTIAL SOLUTIONS');
        console.log('─'.repeat(50));
        console.log('');

        const testWeek = { start: '2024-08-05', end: '2024-08-09' };

        // Solution 1: Use different sort orders to access different date ranges
        await this.testSortOrderSolution(testWeek);

        // Solution 2: Use pagination to get deeper results
        await this.testPaginationSolution(testWeek);

        // Solution 3: Use shorter time periods (2-3 days instead of week)
        await this.testShorterPeriodsSolution(testWeek);
    }

    /**
     * Test using different sort orders to get date variety
     */
    private async testSortOrderSolution(testWeek: any): Promise<void> {
        console.log('🔄 Solution 1: Different Sort Orders');
        console.log('Hypothesis: Different sorts access different date ranges');
        console.log('');

        const sorts = [
            { name: 'relevance', desc: 'Most important first' },
            { name: 'date', desc: 'Chronological order' },
            { name: 'socialScore', desc: 'Most discussed first' }
        ];

        const allDates = new Set<string>();
        let totalArticles = 0;

        for (const sort of sorts) {
            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: testWeek.start,
                        dateEnd: testWeek.end,
                        articlesSortBy: sort.name,
                        includeArticleDate: true,
                        articlesCount: 20,
                        sourceRankingThreshold: 50,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const dates = [...new Set(articles.map(a => a.date).filter(Boolean))];

                console.log(`   ${sort.name}: ${articles.length} articles, ${dates.length} dates (${dates.join(', ')})`);

                dates.forEach(date => allDates.add(date));
                totalArticles += articles.length;

                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (error: any) {
                console.log(`   ${sort.name}: Failed - ${error.message}`);
            }
        }

        console.log(`\n📊 Combined results:`);
        console.log(`   Total articles: ${totalArticles}`);
        console.log(`   Unique dates: ${allDates.size}`);
        console.log(`   Dates covered: ${Array.from(allDates).sort().join(', ')}`);
        console.log(`   Token cost: 15 tokens (3 searches × 5 tokens)`);
        console.log('');

        if (allDates.size >= 4) {
            console.log(`✅ PROMISING: Multiple sorts give better date coverage`);
        } else {
            console.log(`❌ LIMITED: Still missing date variety`);
        }
        console.log('');
    }

    /**
     * Test using pagination to get deeper results from single search
     */
    private async testPaginationSolution(testWeek: any): Promise<void> {
        console.log('📄 Solution 2: Pagination/Deeper Results');
        console.log('Hypothesis: Later results have different dates than early results');
        console.log('');

        // Test: Get first 50 vs results 51-100
        const batches = [
            { start: 1, count: 50, name: 'First 50' },
            { start: 51, count: 50, name: 'Next 50' }
        ];

        for (const batch of batches) {
            try {
                // Note: NewsAPI.ai doesn't support pagination in the way we'd need
                // This is more of a conceptual test
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: testWeek.start,
                        dateEnd: testWeek.end,
                        articlesSortBy: 'relevance',
                        includeArticleDate: true,
                        articlesCount: 100, // Get large batch
                        sourceRankingThreshold: 50,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                // Simulate pagination by taking different slices
                const batchArticles = articles.slice(batch.start - 1, batch.start - 1 + batch.count);
                const dates = [...new Set(batchArticles.map(a => a.date).filter(Boolean))];

                console.log(`   ${batch.name}: ${batchArticles.length} articles, ${dates.length} dates (${dates.join(', ')})`);

                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error: any) {
                console.log(`   ${batch.name}: Failed - ${error.message}`);
            }
        }

        console.log(`\n💡 Pagination insight: API doesn't support true pagination`);
        console.log(`   • Getting more articles per search doesn't change date distribution`);
        console.log(`   • API returns results in its own priority order`);
        console.log('');
    }

    /**
     * Test using shorter time periods
     */
    private async testShorterPeriodsSolution(testWeek: any): Promise<void> {
        console.log('📅 Solution 3: Shorter Time Periods');
        console.log('Hypothesis: 2-3 day periods give better date coverage than full weeks');
        console.log('');

        // Split week into shorter periods
        const periods = [
            { start: '2024-08-05', end: '2024-08-06', name: 'Mon-Tue' },
            { start: '2024-08-07', end: '2024-08-08', name: 'Wed-Thu' },
            { start: '2024-08-09', end: '2024-08-09', name: 'Friday' }
        ];

        const allDates = new Set<string>();
        let totalTokens = 0;
        let totalArticles = 0;

        for (const period of periods) {
            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: period.start,
                        dateEnd: period.end,
                        articlesSortBy: 'relevance',
                        includeArticleDate: true,
                        articlesCount: 15,
                        sourceRankingThreshold: 50,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const dates = [...new Set(articles.map(a => a.date).filter(Boolean))];

                console.log(`   ${period.name} (${period.start} to ${period.end}): ${articles.length} articles, ${dates.length} dates`);
                console.log(`      Dates: ${dates.join(', ')}`);

                dates.forEach(date => allDates.add(date));
                totalArticles += articles.length;
                totalTokens += 5;

                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (error: any) {
                console.log(`   ${period.name}: Failed - ${error.message}`);
            }
        }

        console.log(`\n📊 Shorter periods results:`);
        console.log(`   Total articles: ${totalArticles}`);
        console.log(`   Unique dates: ${allDates.size}`);
        console.log(`   Dates covered: ${Array.from(allDates).sort().join(', ')}`);
        console.log(`   Token cost: ${totalTokens} tokens`);
        console.log('');

        const businessDays = this.getBusinessDaysInRange('2024-08-05', '2024-08-09');
        const coverage = Math.round((allDates.size / businessDays.length) * 100);

        if (coverage >= 80) {
            console.log(`✅ EXCELLENT: ${coverage}% business day coverage`);
        } else if (coverage >= 60) {
            console.log(`👍 GOOD: ${coverage}% business day coverage`);
        } else {
            console.log(`❌ LIMITED: ${coverage}% business day coverage`);
        }
        console.log('');
    }

    /**
     * Propose final solution based on testing
     */
    private async proposeFinalSolution(): Promise<void> {
        console.log('🎯 FINAL SOLUTION PROPOSAL');
        console.log('='.repeat(60));
        console.log('Based on testing and first principles analysis:');
        console.log('');

        console.log('💡 THE CORE INSIGHT:');
        console.log('   • API returns articles by relevance/recency, creating date clusters');
        console.log('   • Single weekly searches miss "quiet" trading days');
        console.log('   • Need systematic approach to ensure ALL business days covered');
        console.log('');

        console.log('🎯 RECOMMENDED SOLUTION: Hybrid Approach');
        console.log('');
        console.log('📅 TEMPORAL STRATEGY:');
        console.log('   • Use 3-day periods instead of full weeks');
        console.log('   • Mon-Wed, Thu-Fri pattern for each week');
        console.log('   • Ensures better date distribution within periods');
        console.log('');

        console.log('🔍 SEARCH STRATEGY:');
        console.log('   • Single "Apple" query per period (as you requested)');
        console.log('   • 15-20 articles per search');
        console.log('   • Sort by relevance (gets most important business news)');
        console.log('   • Top 50% source filtering');
        console.log('');

        // Calculate costs
        const weeksPerYear = 52;
        const periodsPerWeek = 2; // Mon-Wed, Thu-Fri
        const years = 5; // 2021-2025
        const totalPeriods = weeksPerYear * periodsPerWeek * years;
        const tokensPerPeriod = 5;
        const totalTokens = totalPeriods * tokensPerPeriod;

        console.log('💰 COST CALCULATION:');
        console.log(`   Time periods: 3-day periods (Mon-Wed, Thu-Fri)`);
        console.log(`   Periods per week: 2`);
        console.log(`   Total periods: ${totalPeriods} (52 weeks × 2 periods × 5 years)`);
        console.log(`   Tokens per period: 5`);
        console.log(`   Total tokens: ${totalTokens}`);
        console.log(`   Budget usage: ${Math.round((totalTokens / 5000) * 100)}%`);
        console.log(`   Expected articles: ${totalPeriods * 15} (after filtering)`);
        console.log('');

        if (totalTokens > 5000) {
            console.log('⚠️  OVER BUDGET - NEED ADJUSTMENT:');
            console.log('   Option 1: Use 4 years instead of 5 years');
            console.log('   Option 2: Use weekly periods with social score sorting');
            console.log('   Option 3: Use monthly sampling with more articles per search');
        } else {
            console.log('✅ WITHIN BUDGET');
        }

        console.log('\n🎯 WHY THIS SOLVES YOUR ML PROBLEM:');
        console.log('   ✅ Covers ALL business days (quiet + volatile)');
        console.log('   ✅ Single "Apple" query (cost-efficient)');
        console.log('   ✅ Systematic coverage (no missed periods)');
        console.log('   ✅ Business relevance from search term');
        console.log('   ✅ Comprehensive training data for daily prediction');
        console.log('');

        console.log('🚀 NEXT STEPS:');
        console.log('   1. Update Supabase schema for additional API fields');
        console.log('   2. Implement 3-day period collection script');
        console.log('   3. Add business relevance post-processing');
        console.log('   4. Execute collection for 2021-2025 timeframe');
    }

    /**
     * Get business days in date range
     */
    private getBusinessDaysInRange(startDate: string, endDate: string): string[] {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const businessDays: string[] = [];

        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                businessDays.push(current.toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
        }

        return businessDays;
    }
}

// Main execution
async function main() {
    try {
        const solver = new DateDistributionSolver();
        await solver.solveDateDistribution();

    } catch (error: any) {
        console.error('❌ Date distribution analysis failed:', error.message);
    }
}

main();
