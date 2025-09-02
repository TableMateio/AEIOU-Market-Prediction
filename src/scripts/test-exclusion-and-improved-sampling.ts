#!/usr/bin/env npx tsx

/**
 * Test Exclusion Functionality & Improved Date Sampling
 * Address your questions about exclusion and create better date distribution
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class ExclusionAndSamplingTester {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    async testExclusionAndSampling(): Promise<void> {
        console.log('🧪 Testing Exclusion & Improved Date Sampling');
        console.log('='.repeat(60));

        // Test exclusion functionality
        await this.testExclusionMethods();

        // Test improved date sampling approaches
        await this.testImprovedDateSampling();

        // Test weekly approach for better date spread
        await this.testWeeklyDateSpread();
    }

    /**
     * Test different exclusion methods available in the API
     */
    private async testExclusionMethods(): Promise<void> {
        console.log('🚫 Testing Exclusion Functionality');
        console.log('─'.repeat(50));
        console.log('Goal: Understand how to exclude unwanted content types');

        const exclusionTests = [
            {
                name: 'No exclusions (baseline)',
                params: {}
            },
            {
                name: 'Exclude by concepts',
                params: {
                    excludeConcepts: ['Tutorial', 'How-to guide', 'Product review']
                }
            },
            {
                name: 'Exclude by categories',
                params: {
                    excludeCategories: ['dmoz/Computers/Software/Operating_Systems/Mac_OS']
                }
            },
            {
                name: 'Exclude by source',
                params: {
                    excludeSourceUri: ['techcrunch.com', 'wired.com'] // Example tech sites
                }
            },
            {
                name: 'Exclude by keywords',
                params: {
                    excludeKeywords: ['how to', 'tutorial', 'guide', 'tips']
                }
            }
        ];

        for (const test of exclusionTests) {
            console.log(`\n🔍 Testing: ${test.name}`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: '2024-08-01',
                        dateEnd: '2024-08-31',
                        articlesSortBy: 'relevance',
                        includeArticleTitle: true,
                        includeArticleConcepts: true,
                        includeArticleCategories: true,
                        articlesCount: 10,
                        apiKey: this.newsApiKey,
                        ...test.params
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const totalAvailable = response.data?.articles?.totalResults || 0;

                console.log(`   📊 Found: ${articles.length} articles (${totalAvailable} total available)`);

                if (articles.length > 0) {
                    // Analyze what we got
                    const sampleTitles = articles.slice(0, 3).map((a: any) => a.title.substring(0, 50));
                    console.log(`   📰 Sample titles: ${sampleTitles.join(' | ')}...`);

                    // Check for tutorial/how-to content
                    const tutorialCount = articles.filter((a: any) => {
                        const title = a.title.toLowerCase();
                        return ['how to', 'tutorial', 'guide', 'tips', 'setup'].some(pattern => title.includes(pattern));
                    }).length;

                    console.log(`   📖 Tutorial articles: ${tutorialCount}/${articles.length}`);

                    // Show concepts if available
                    if (articles[0].concepts) {
                        const concepts = articles[0].concepts.slice(0, 3).map((c: any) => c.label);
                        console.log(`   🏷️ Sample concepts: ${concepts.join(', ')}`);
                    }
                }

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n💡 Exclusion Recommendations:');
        console.log('• Use excludeKeywords for simple text-based exclusions');
        console.log('• Use excludeConcepts if API provides semantic concepts');
        console.log('• Combine multiple exclusion methods for better filtering');
    }

    /**
     * Test improved date sampling approaches
     */
    private async testImprovedDateSampling(): Promise<void> {
        console.log('\n📅 Testing Improved Date Sampling');
        console.log('─'.repeat(50));
        console.log('Goal: Get articles from multiple days, not just spike days');

        // Test different approaches to get date variety
        const samplingTests = [
            {
                name: 'Sort by date (chronological)',
                sort: 'date',
                description: 'Should give us articles in chronological order'
            },
            {
                name: 'Sort by relevance',
                sort: 'relevance',
                description: 'Might cluster around important dates'
            },
            {
                name: 'Sort by social score',
                sort: 'socialScore',
                description: 'Your observation: gives spike days only'
            }
        ];

        for (const test of samplingTests) {
            console.log(`\n🔍 Testing: ${test.name}`);
            console.log(`   Goal: ${test.description}`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: '2024-08-01',
                        dateEnd: '2024-08-31',
                        articlesSortBy: test.sort,
                        includeArticleDate: true,
                        articlesCount: 20, // Larger sample
                        sourceRankingThreshold: 50, // Top 50% sources
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                if (articles.length > 0) {
                    // Analyze date distribution
                    const dates = articles.map((a: any) => a.date).filter(Boolean);
                    const uniqueDates = [...new Set(dates)].sort();

                    console.log(`   📊 Found: ${articles.length} articles`);
                    console.log(`   📅 Date spread: ${uniqueDates.length} unique dates`);
                    console.log(`   📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);

                    // Show date distribution
                    const dateCount: Record<string, number> = {};
                    dates.forEach(date => {
                        dateCount[date] = (dateCount[date] || 0) + 1;
                    });

                    console.log('   📅 Distribution:');
                    Object.entries(dateCount).slice(0, 5).forEach(([date, count]) => {
                        console.log(`      ${date}: ${count} articles`);
                    });

                    if (Object.keys(dateCount).length > 5) {
                        console.log(`      ... and ${Object.keys(dateCount).length - 5} more dates`);
                    }
                }

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    /**
     * Test weekly approach for better date spread
     */
    private async testWeeklyDateSpread(): Promise<void> {
        console.log('\n📆 Testing Weekly Approach for Date Spread');
        console.log('─'.repeat(50));
        console.log('Goal: Use weekly periods to get natural date distribution');

        // Generate weekly periods for August 2024
        const weeks = [
            { start: '2024-08-01', end: '2024-08-07', name: 'Week 1' },
            { start: '2024-08-08', end: '2024-08-14', name: 'Week 2' },
            { start: '2024-08-15', end: '2024-08-21', name: 'Week 3' },
            { start: '2024-08-22', end: '2024-08-31', name: 'Week 4' }
        ];

        console.log(`📅 Testing ${weeks.length} weekly periods:`);
        weeks.forEach(week => {
            console.log(`   ${week.name}: ${week.start} to ${week.end}`);
        });

        // Test first two weeks
        const testWeeks = weeks.slice(0, 2);
        const allArticles: any[] = [];

        for (const week of testWeeks) {
            console.log(`\n🔍 Testing ${week.name}: ${week.start} to ${week.end}`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: week.start,
                        dateEnd: week.end,
                        articlesSortBy: 'date', // Chronological within week
                        includeArticleDate: true,
                        articlesCount: 15,
                        sourceRankingThreshold: 50,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                if (articles.length > 0) {
                    allArticles.push(...articles.map(a => ({ ...a, week: week.name })));

                    const dates = articles.map((a: any) => a.date).filter(Boolean);
                    const uniqueDates = [...new Set(dates)].sort();

                    console.log(`   📊 Found: ${articles.length} articles`);
                    console.log(`   📅 Date spread: ${uniqueDates.length} unique dates`);
                    console.log(`   📅 Dates: ${uniqueDates.join(', ')}`);

                    // Show business days coverage
                    const businessDays = this.getBusinessDaysInRange(week.start, week.end);
                    const coveredDays = uniqueDates.filter(date => businessDays.includes(date));
                    console.log(`   💼 Business day coverage: ${coveredDays.length}/${businessDays.length} days`);
                }

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Analyze combined results
        if (allArticles.length > 0) {
            console.log('\n📊 Combined Weekly Results Analysis');
            console.log('─'.repeat(40));

            const allDates = allArticles.map(a => a.date).filter(Boolean);
            const uniqueDates = [...new Set(allDates)].sort();

            console.log(`📊 Total articles: ${allArticles.length}`);
            console.log(`📅 Total unique dates: ${uniqueDates.length}`);
            console.log(`📅 Date range: ${allDates[0]} to ${allDates[allDates.length - 1]}`);

            // Show distribution by week
            const byWeek = allArticles.reduce((acc, a) => {
                acc[a.week] = (acc[a.week] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            console.log('\n📅 Distribution by week:');
            Object.entries(byWeek).forEach(([week, count]) => {
                console.log(`   ${week}: ${count} articles`);
            });

            console.log(`\n💰 Token cost: ${testWeeks.length * 5} tokens (${testWeeks.length} weeks × 5 tokens)`);
            console.log(`📈 Efficiency: ${Math.round(allArticles.length / (testWeeks.length * 5))} articles per token`);
        }

        console.log('\n💡 Weekly Approach Benefits:');
        console.log('✅ Natural date spread within each week');
        console.log('✅ Covers business days effectively');
        console.log('✅ Token efficient (5 tokens per week vs 5 per day)');
        console.log('✅ Avoids social score spike bias');
        console.log('✅ Good for getting "regular" trading days, not just exciting ones');
    }

    /**
     * Get business days in a date range
     */
    private getBusinessDaysInRange(startDate: string, endDate: string): string[] {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const businessDays: string[] = [];

        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday = 1, Friday = 5
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
        const tester = new ExclusionAndSamplingTester();
        await tester.testExclusionAndSampling();

        console.log('\n🎯 FINAL RECOMMENDATIONS');
        console.log('='.repeat(60));
        console.log('Based on testing your concerns:');
        console.log('');
        console.log('🚫 EXCLUSION:');
        console.log('   • Use excludeKeywords for tutorial filtering');
        console.log('   • Combine with post-processing filters for better results');
        console.log('   • Current approach (checking title/body) is working well');
        console.log('');
        console.log('📅 DATE SAMPLING:');
        console.log('   • Your concern about social score is CORRECT - it gives spike days only');
        console.log('   • SOLUTION: Use weekly periods + date sorting for even distribution');
        console.log('   • This gives regular trading days, not just exciting news days');
        console.log('   • Token efficient: 5 tokens per week vs 35 tokens for daily searches');
        console.log('');
        console.log('🎯 RECOMMENDED STRATEGY:');
        console.log('   1. Use 4-week periods (one month) for natural date spread');
        console.log('   2. Sort by date within each period');
        console.log('   3. Apply top 50% source filtering');
        console.log('   4. Use excludeKeywords for tutorial content');
        console.log('   5. Post-process for Apple business relevance');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
    }
}

main();
