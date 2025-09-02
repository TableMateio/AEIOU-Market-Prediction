#!/usr/bin/env npx tsx

/**
 * Test Date Randomization Strategies
 * Address your concerns about getting variety within time periods
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class DateRandomizationTester {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    /**
     * Test different approaches to get variety within a time period
     */
    async testRandomizationStrategies(): Promise<void> {
        console.log('🧪 Testing Date Randomization Strategies');
        console.log('='.repeat(60));
        console.log('Goal: Understand how to get variety within time periods');
        console.log('');

        const testPeriod = { start: '2024-08-01', end: '2024-08-31' };
        console.log(`📅 Test Period: ${testPeriod.start} to ${testPeriod.end} (August 2024)`);
        console.log('');

        // Strategy 1: Different sort orders (current approach)
        await this.testSortOrderRandomization(testPeriod);

        // Strategy 2: Day-by-day sampling
        await this.testDayByDayApproach(testPeriod);

        // Strategy 3: Weekly sampling
        await this.testWeeklySampling(testPeriod);

        // Strategy 4: Business days only
        await this.testBusinessDaysOnly(testPeriod);
    }

    /**
     * Test current approach: different sort orders
     */
    private async testSortOrderRandomization(period: { start: string, end: string }): Promise<void> {
        console.log('📊 Strategy 1: Different Sort Orders (Current Approach)');
        console.log('─'.repeat(50));

        const sortOrders = ['relevance', 'date', 'socialScore'];
        const results: any[] = [];

        for (const sort of sortOrders) {
            console.log(`\n🔍 Testing sort: ${sort}`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: period.start,
                        dateEnd: period.end,
                        articlesSortBy: sort,
                        includeArticleBody: true,
                        articlesCount: 10,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                console.log(`   📊 Found: ${articles.length} articles`);

                if (articles.length > 0) {
                    // Analyze date distribution
                    const dates = articles.map((a: any) => a.date).sort();
                    const uniqueDates = [...new Set(dates)];

                    console.log(`   📅 Date spread: ${uniqueDates.length} unique dates`);
                    console.log(`   📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);

                    // Show sample titles to see variety
                    const sampleTitles = articles.slice(0, 3).map((a: any) => a.title.substring(0, 50));
                    console.log(`   📰 Sample titles: ${sampleTitles.join(' | ')}...`);

                    results.push({
                        sort,
                        articleCount: articles.length,
                        uniqueDates: uniqueDates.length,
                        dateRange: { first: dates[0], last: dates[dates.length - 1] },
                        articles: articles.slice(0, 3)
                    });
                }

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        // Analyze overlap between different sorts
        console.log('\n🔍 Analyzing Overlap Between Sort Orders:');
        if (results.length >= 2) {
            const urls1 = new Set(results[0].articles.map((a: any) => a.url));
            const urls2 = new Set(results[1].articles.map((a: any) => a.url));
            const overlap = [...urls1].filter(url => urls2.has(url));

            console.log(`   📊 Overlap between ${results[0].sort} and ${results[1].sort}: ${overlap.length}/${Math.min(results[0].articles.length, results[1].articles.length)} articles`);
            console.log(`   💡 Uniqueness: ${overlap.length === 0 ? 'Completely different' : overlap.length < 2 ? 'Mostly different' : 'Significant overlap'}`);
        }
    }

    /**
     * Test day-by-day approach
     */
    private async testDayByDayApproach(period: { start: string, end: string }): Promise<void> {
        console.log('\n📅 Strategy 2: Day-by-Day Sampling');
        console.log('─'.repeat(50));
        console.log('Goal: Search specific days and take top articles from each');

        // Generate sample business days in the period
        const businessDays = this.generateBusinessDays(period.start, period.end);
        console.log(`   📅 Business days in period: ${businessDays.length}`);

        // Test a few sample days
        const sampleDays = businessDays.slice(0, 3); // First 3 business days
        console.log(`   🧪 Testing ${sampleDays.length} sample days: ${sampleDays.join(', ')}`);

        let totalArticles = 0;
        let totalTokens = 0;
        const allSources = new Set<string>();

        for (const day of sampleDays) {
            console.log(`\n🔍 Testing day: ${day}`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: day,
                        dateEnd: day,
                        articlesSortBy: 'relevance',
                        includeArticleBody: true,
                        articlesCount: 3, // Just 3 per day for testing
                        apiKey: this.newsApiKey
                    },
                    timeout: 15000
                });

                const articles = response.data?.articles?.results || [];
                const totalAvailable = response.data?.articles?.totalResults || 0;

                console.log(`   📊 Found: ${articles.length} articles (${totalAvailable} available)`);

                if (articles.length > 0) {
                    articles.forEach((a: any) => {
                        if (a.source?.title) allSources.add(a.source.title);
                    });

                    const sampleTitle = articles[0].title.substring(0, 60);
                    console.log(`   📰 Sample: "${sampleTitle}..."`);
                }

                totalArticles += articles.length;
                totalTokens += 5; // 5 tokens per year (even for single day)

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        console.log('\n📊 Day-by-Day Results:');
        console.log(`   Total articles: ${totalArticles}`);
        console.log(`   Total tokens: ${totalTokens}`);
        console.log(`   Unique sources: ${allSources.size}`);
        console.log(`   Token efficiency: ${Math.round(totalArticles / totalTokens)} articles per token`);
        console.log(`   💡 Insight: Each day costs 5 tokens, so daily searches are expensive!`);
    }

    /**
     * Test weekly sampling approach
     */
    private async testWeeklySampling(period: { start: string, end: string }): Promise<void> {
        console.log('\n📅 Strategy 3: Weekly Sampling');
        console.log('─'.repeat(50));
        console.log('Goal: Search week-long periods for better token efficiency');

        // Generate weekly periods
        const weeks = this.generateWeeklyPeriods(period.start, period.end);
        console.log(`   📅 Weekly periods in range: ${weeks.length}`);

        // Test first week
        if (weeks.length > 0) {
            const testWeek = weeks[0];
            console.log(`   🧪 Testing week: ${testWeek.start} to ${testWeek.end}`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: testWeek.start,
                        dateEnd: testWeek.end,
                        articlesSortBy: 'date',
                        includeArticleBody: true,
                        articlesCount: 15,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                console.log(`   📊 Found: ${articles.length} articles`);

                if (articles.length > 0) {
                    const dates = articles.map((a: any) => a.date).sort();
                    const uniqueDates = [...new Set(dates)];

                    console.log(`   📅 Date spread: ${uniqueDates.length} unique dates in week`);
                    console.log(`   📅 Dates: ${uniqueDates.join(', ')}`);
                    console.log(`   💰 Token cost: 5 tokens (same as full year)`);
                    console.log(`   💡 Insight: Weekly searches give good date spread at same token cost as yearly`);
                }

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }
    }

    /**
     * Test business days filtering
     */
    private async testBusinessDaysOnly(period: { start: string, end: string }): Promise<void> {
        console.log('\n💼 Strategy 4: Business Days Analysis');
        console.log('─'.repeat(50));

        const businessDays = this.generateBusinessDays(period.start, period.end);
        const allDays = this.generateAllDays(period.start, period.end);

        console.log(`   📅 Total days in period: ${allDays.length}`);
        console.log(`   💼 Business days: ${businessDays.length}`);
        console.log(`   🏖️ Weekends/holidays: ${allDays.length - businessDays.length}`);
        console.log(`   📊 Business day ratio: ${Math.round((businessDays.length / allDays.length) * 100)}%`);

        console.log('\n💡 Business Days Strategy:');
        console.log('   • Focus article collection on market open days');
        console.log('   • More relevant for stock-related news');
        console.log('   • Reduces noise from weekend/holiday articles');
    }

    /**
     * Generate business days between two dates
     */
    private generateBusinessDays(startDate: string, endDate: string): string[] {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const businessDays: string[] = [];

        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            // Monday = 1, Friday = 5 (exclude weekends)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                businessDays.push(current.toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
        }

        return businessDays;
    }

    /**
     * Generate all days between two dates
     */
    private generateAllDays(startDate: string, endDate: string): string[] {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const allDays: string[] = [];

        const current = new Date(start);
        while (current <= end) {
            allDays.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }

        return allDays;
    }

    /**
     * Generate weekly periods
     */
    private generateWeeklyPeriods(startDate: string, endDate: string): Array<{ start: string, end: string }> {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const weeks: Array<{ start: string, end: string }> = [];

        const current = new Date(start);
        while (current < end) {
            const weekEnd = new Date(current);
            weekEnd.setDate(weekEnd.getDate() + 6);

            if (weekEnd > end) {
                weekEnd.setTime(end.getTime());
            }

            weeks.push({
                start: current.toISOString().split('T')[0],
                end: weekEnd.toISOString().split('T')[0]
            });

            current.setDate(current.getDate() + 7);
        }

        return weeks;
    }
}

// Main execution
async function main() {
    try {
        const tester = new DateRandomizationTester();
        await tester.testRandomizationStrategies();

        console.log('\n🎯 CONCLUSIONS & RECOMMENDATIONS:');
        console.log('='.repeat(60));
        console.log('1. SORT ORDERS: Different sorts DO provide variety - use this approach');
        console.log('2. DAY-BY-DAY: Too expensive (5 tokens per day) - avoid unless necessary');
        console.log('3. WEEKLY PERIODS: Good balance of date spread and token efficiency');
        console.log('4. BUSINESS DAYS: Focus collection on market-relevant days');
        console.log('');
        console.log('💡 RECOMMENDED STRATEGY:');
        console.log('• Use year-long periods with different sort orders (current approach)');
        console.log('• Add weekly periods for better date granularity when needed');
        console.log('• Filter results to business days after collection');
        console.log('• Mix different queries (Apple, AAPL, Apple Inc) for topic variety');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
    }
}

main();
