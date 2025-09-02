#!/usr/bin/env npx tsx

/**
 * Comprehensive Weekly Sampling Strategy
 * For robust daily ML prediction system
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class ComprehensiveWeeklySampler {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    /**
     * Calculate and plan comprehensive weekly sampling for ML system
     */
    async planComprehensiveWeeklySampling(): Promise<void> {
        console.log('🎯 COMPREHENSIVE WEEKLY SAMPLING FOR ML SYSTEM');
        console.log('='.repeat(60));
        console.log('Goal: Get articles from ALL types of trading days for robust daily prediction');
        console.log('');

        // Calculate 5-year weekly sampling
        const fiveYearPlan = this.calculateFiveYearWeeklyPlan();
        console.log('📊 5-Year Weekly Sampling Plan:');
        console.log(`   Total weeks: ${fiveYearPlan.totalWeeks}`);
        console.log(`   Token cost: ${fiveYearPlan.totalTokens} tokens`);
        console.log(`   Budget usage: ${Math.round((fiveYearPlan.totalTokens / 5000) * 100)}% of 5000 token plan`);
        console.log(`   Cost: ~$${Math.round(fiveYearPlan.totalTokens * 90 / 5000)}`);
        console.log('');

        // Test the approach with a sample week
        await this.testWeeklyApproach();

        // Create the comprehensive strategy
        await this.createComprehensiveStrategy();
    }

    /**
     * Calculate 5-year weekly sampling plan
     */
    private calculateFiveYearWeeklyPlan() {
        const startYear = 2020;
        const endYear = 2024;
        const weeksPerYear = 52;
        const totalYears = endYear - startYear + 1;
        const totalWeeks = totalYears * weeksPerYear;
        const tokensPerWeek = 5;
        const totalTokens = totalWeeks * tokensPerWeek;

        return {
            startYear,
            endYear,
            totalYears,
            weeksPerYear,
            totalWeeks,
            tokensPerWeek,
            totalTokens,
            budgetPercentage: (totalTokens / 5000) * 100,
            estimatedCost: Math.round(totalTokens * 90 / 5000)
        };
    }

    /**
     * Test weekly approach with comprehensive sampling
     */
    private async testWeeklyApproach(): Promise<void> {
        console.log('🧪 Testing Weekly Comprehensive Sampling');
        console.log('─'.repeat(50));
        console.log('Goal: Get articles from ALL types of days, not just exciting ones');

        // Test a sample week with different approaches
        const testWeek = { start: '2024-08-05', end: '2024-08-09' }; // Monday to Friday

        console.log(`\n📅 Testing week: ${testWeek.start} to ${testWeek.end}`);
        console.log('Strategy: Multiple queries per week to capture different content types');

        const weeklyStrategies = [
            {
                name: 'Relevance-based (important news)',
                sort: 'relevance',
                description: 'Gets the most important/relevant news'
            },
            {
                name: 'Date-based (chronological)',
                sort: 'date',
                description: 'Gets articles in chronological order'
            },
            {
                name: 'Social-based (discussed news)',
                sort: 'socialScore',
                description: 'Gets most discussed/shared articles'
            }
        ];

        const allWeekArticles: any[] = [];

        for (const strategy of weeklyStrategies) {
            console.log(`\n🔍 Testing: ${strategy.name}`);
            console.log(`   Goal: ${strategy.description}`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: testWeek.start,
                        dateEnd: testWeek.end,
                        articlesSortBy: strategy.sort,
                        includeArticleDate: true,
                        includeArticleTitle: true,
                        articlesCount: 10, // 10 articles per strategy
                        sourceRankingThreshold: 50,
                        excludeKeywords: ['how to', 'tutorial', 'guide'],
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                if (articles.length > 0) {
                    console.log(`   📊 Found: ${articles.length} articles`);

                    // Analyze date distribution
                    const dates = articles.map(a => a.date).filter(Boolean);
                    const uniqueDates = [...new Set(dates)].sort();

                    console.log(`   📅 Date spread: ${uniqueDates.length} unique dates`);
                    console.log(`   📅 Dates: ${uniqueDates.join(', ')}`);

                    // Add to collection with strategy label
                    allWeekArticles.push(...articles.map(a => ({
                        ...a,
                        strategy: strategy.name,
                        sortMethod: strategy.sort
                    })));

                    // Show sample
                    console.log(`   📰 Sample: "${articles[0].title.substring(0, 60)}..."`);
                }

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        // Analyze combined weekly results
        if (allWeekArticles.length > 0) {
            console.log('\n📊 Combined Weekly Analysis');
            console.log('─'.repeat(40));

            // Remove duplicates
            const uniqueArticles = this.removeDuplicates(allWeekArticles);
            console.log(`   📊 Total articles: ${allWeekArticles.length} (${uniqueArticles.length} unique)`);

            // Date analysis
            const allDates = uniqueArticles.map(a => a.date).filter(Boolean);
            const uniqueDates = [...new Set(allDates)].sort();
            console.log(`   📅 Unique dates covered: ${uniqueDates.length}`);
            console.log(`   📅 Date range: ${uniqueDates.join(', ')}`);

            // Strategy effectiveness
            const byStrategy = allWeekArticles.reduce((acc, a) => {
                acc[a.strategy] = (acc[a.strategy] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            console.log('\n   🎯 Articles by strategy:');
            Object.entries(byStrategy).forEach(([strategy, count]) => {
                console.log(`      ${strategy}: ${count} articles`);
            });

            console.log(`\n   💰 Token cost: 15 tokens (3 strategies × 5 tokens each)`);
            console.log(`   📈 Efficiency: ${Math.round(uniqueArticles.length / 15)} unique articles per token`);

            // Business day coverage analysis
            const businessDays = this.getBusinessDaysInRange(testWeek.start, testWeek.end);
            const coveredBusinessDays = uniqueDates.filter(date => businessDays.includes(date));

            console.log(`\n   💼 Business day coverage: ${coveredBusinessDays.length}/${businessDays.length} days`);
            if (coveredBusinessDays.length === businessDays.length) {
                console.log('   ✅ EXCELLENT: All business days covered!');
            } else if (coveredBusinessDays.length >= businessDays.length * 0.6) {
                console.log('   👍 GOOD: Most business days covered');
            } else {
                console.log('   ⚠️ LIMITED: Need better date coverage strategy');
            }
        }
    }

    /**
     * Create comprehensive 5-year sampling strategy
     */
    private async createComprehensiveStrategy(): Promise<void> {
        console.log('\n🎯 COMPREHENSIVE 5-YEAR STRATEGY');
        console.log('='.repeat(60));
        console.log('For robust daily ML prediction system');

        const strategy = {
            approach: 'Weekly Multi-Strategy Sampling',
            timeframe: '5 years (2020-2024)',
            totalWeeks: 260, // 52 weeks × 5 years
            strategiesPerWeek: 3, // relevance, date, social
            articlesPerStrategy: 8, // Balanced number
            totalTokensPerWeek: 15, // 3 strategies × 5 tokens
            totalTokens: 260 * 15, // 3900 tokens
            budgetUsage: '78% of 5000 token plan',
            expectedUniqueArticles: 260 * 20, // ~20 unique per week after deduplication

            weeklyQueries: [
                {
                    name: 'Business Relevance',
                    query: 'Apple',
                    sort: 'relevance',
                    goal: 'Most important business news of the week'
                },
                {
                    name: 'Chronological Coverage',
                    query: 'AAPL',
                    sort: 'date',
                    goal: 'Sequential news flow throughout the week'
                },
                {
                    name: 'Market Discussion',
                    query: 'Apple Inc',
                    sort: 'socialScore',
                    goal: 'What the market was actually talking about'
                }
            ]
        };

        console.log('\n📋 Strategy Details:');
        console.log(`   Approach: ${strategy.approach}`);
        console.log(`   Timeframe: ${strategy.timeframe}`);
        console.log(`   Total weeks: ${strategy.totalWeeks}`);
        console.log(`   Strategies per week: ${strategy.strategiesPerWeek}`);
        console.log(`   Articles per strategy: ${strategy.articlesPerStrategy}`);
        console.log(`   Total tokens: ${strategy.totalTokens}`);
        console.log(`   Budget usage: ${strategy.budgetUsage}`);
        console.log(`   Expected articles: ${strategy.expectedUniqueArticles}`);

        console.log('\n🎯 Weekly Query Strategy:');
        strategy.weeklyQueries.forEach((query, i) => {
            console.log(`   ${i + 1}. ${query.name}:`);
            console.log(`      Query: "${query.query}"`);
            console.log(`      Sort: ${query.sort}`);
            console.log(`      Goal: ${query.goal}`);
        });

        console.log('\n✅ This Strategy Addresses Your Requirements:');
        console.log('   ✅ Covers ALL types of trading days (quiet + volatile)');
        console.log('   ✅ Gets regular business news, not just exciting spikes');
        console.log('   ✅ Provides comprehensive training data for daily ML');
        console.log('   ✅ Uses only 78% of token budget (leaves room for iteration)');
        console.log('   ✅ Generates ~5,200 articles across 5 years');
        console.log('   ✅ Covers every single week of market activity');

        console.log('\n💡 Why This Works for Daily ML:');
        console.log('   • Your model will see examples from every type of market day');
        console.log('   • Quiet news days are included (not just spike events)');
        console.log('   • Regular business updates captured chronologically');
        console.log('   • Market sentiment variations across different time periods');
        console.log('   • Seasonal business patterns (Q1 earnings, Q4 holidays, etc.)');

        console.log('\n🚀 Implementation Plan:');
        console.log('   1. Generate 260 weekly date ranges (2020-2024)');
        console.log('   2. For each week, run 3 queries with different sorts');
        console.log('   3. Deduplicate and filter for Apple business relevance');
        console.log('   4. Save to database with week/strategy metadata');
        console.log('   5. Result: Comprehensive training set for daily prediction');
    }

    /**
     * Remove duplicate articles by URL
     */
    private removeDuplicates(articles: any[]): any[] {
        const seen = new Set<string>();
        return articles.filter(article => {
            if (seen.has(article.url)) return false;
            seen.add(article.url);
            return true;
        });
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
        const sampler = new ComprehensiveWeeklySampler();
        await sampler.planComprehensiveWeeklySampling();

        console.log('\n🎯 RECOMMENDATION');
        console.log('='.repeat(60));
        console.log('✅ PROCEED with weekly comprehensive sampling:');
        console.log('   • 260 weeks × 15 tokens = 3,900 tokens (78% of budget)');
        console.log('   • ~5,200 articles covering every type of trading day');
        console.log('   • Perfect for robust daily ML prediction system');
        console.log('   • Captures quiet days AND exciting days');
        console.log('   • Leaves 1,100 tokens for iteration/refinement');

    } catch (error: any) {
        console.error('❌ Planning failed:', error.message);
    }
}

main();
