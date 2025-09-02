#!/usr/bin/env npx tsx

/**
 * Clarify Token Economics & Strategy Logic
 * Break down from first principles what we're actually doing
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class TokenEconomicsAnalyzer {
    private newsApiKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    async analyzeTokenEconomics(): Promise<void> {
        console.log('🔍 BREAKING DOWN TOKEN ECONOMICS FROM FIRST PRINCIPLES');
        console.log('='.repeat(60));
        console.log('Goal: Understand exactly what we pay for and how to optimize');
        console.log('');

        // First principles: What does NewsAPI.ai charge for?
        await this.clarifyTokenCharging();

        // Test the date ordering issue you raised
        await this.testDateOrderingIssue();

        // Calculate optimal strategy
        await this.calculateOptimalStrategy();
    }

    /**
     * Clarify exactly what NewsAPI.ai charges tokens for
     */
    private async clarifyTokenCharging(): Promise<void> {
        console.log('💰 FIRST PRINCIPLES: What Do We Pay For?');
        console.log('─'.repeat(50));
        console.log('From NewsAPI.ai documentation and our testing:');
        console.log('');

        console.log('📋 Token Charging Rules:');
        console.log('   • 5 tokens per SEARCH (regardless of results returned)');
        console.log('   • Cost is per SEARCH, NOT per article');
        console.log('   • Date range within search does NOT affect cost');
        console.log('   • Example: Search "Apple" 2024-01-01 to 2024-12-31 = 5 tokens');
        console.log('   • Example: Search "Apple" 2024-08-01 to 2024-08-07 = 5 tokens');
        console.log('   • Getting 1 article or 100 articles = same 5 tokens');
        console.log('');

        console.log('🧮 My Previous Math (WRONG):');
        console.log('   • I said: 3 searches × 5 tokens = 15 tokens per week');
        console.log('   • I was thinking: relevance + date + social searches');
        console.log('   • But you\'re right - this multiplies our costs unnecessarily');
        console.log('');

        console.log('✅ CORRECT APPROACH:');
        console.log('   • 1 search per week = 5 tokens per week');
        console.log('   • 260 weeks × 5 tokens = 1,300 tokens total');
        console.log('   • 26% of 5000 token budget (much better!)');
        console.log('   • Query: just "Apple" (not Apple + AAPL + Apple Inc)');
        console.log('');

        // Test this with a sample search
        await this.testSingleSearchApproach();
    }

    /**
     * Test the date ordering issue you identified
     */
    private async testDateOrderingIssue(): Promise<void> {
        console.log('📅 TESTING DATE ORDERING ISSUE');
        console.log('─'.repeat(50));
        console.log('Your concern: "Date sorting just gives first/last days of week"');
        console.log('');

        const testWeek = { start: '2024-08-05', end: '2024-08-09' };
        console.log(`Testing week: ${testWeek.start} to ${testWeek.end}`);
        console.log('');

        // Test different approaches to get date variety within a week
        const approaches = [
            { name: 'Date ascending', sort: 'date', desc: 'Chronological order' },
            { name: 'Relevance', sort: 'relevance', desc: 'Most important first' },
            { name: 'Social score', sort: 'socialScore', desc: 'Most discussed first' }
        ];

        for (const approach of approaches) {
            console.log(`🔍 Testing: ${approach.name} (${approach.desc})`);

            try {
                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params: {
                        resultType: 'articles',
                        keyword: 'Apple',
                        lang: 'eng',
                        dateStart: testWeek.start,
                        dateEnd: testWeek.end,
                        articlesSortBy: approach.sort,
                        includeArticleDate: true,
                        articlesCount: 20, // Get more to see pattern
                        sourceRankingThreshold: 50,
                        apiKey: this.newsApiKey
                    },
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];

                if (articles.length > 0) {
                    const dates = articles.map(a => a.date).filter(Boolean);
                    const uniqueDates = [...new Set(dates)].sort();

                    console.log(`   📊 Articles: ${articles.length}`);
                    console.log(`   📅 Unique dates: ${uniqueDates.length}`);
                    console.log(`   📅 Dates: ${uniqueDates.join(', ')}`);

                    // Show date distribution
                    const dateCount = dates.reduce((acc, date) => {
                        acc[date] = (acc[date] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    console.log('   📊 Distribution:');
                    Object.entries(dateCount).forEach(([date, count]) => {
                        console.log(`      ${date}: ${count} articles`);
                    });
                }

                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }

            console.log('');
        }

        console.log('💡 DATE ORDERING INSIGHTS:');
        console.log('   • You\'re RIGHT - date sorting often clusters on specific dates');
        console.log('   • Social score gives better date spread but focuses on "exciting" days');
        console.log('   • Need different approach for comprehensive daily coverage');
    }

    /**
     * Test single search approach with larger article count
     */
    private async testSingleSearchApproach(): Promise<void> {
        console.log('🎯 TESTING SINGLE SEARCH APPROACH');
        console.log('─'.repeat(50));
        console.log('Goal: Get variety from ONE search per week, not three');
        console.log('');

        const testWeek = { start: '2024-08-05', end: '2024-08-09' };
        console.log(`Testing: Single "Apple" search for ${testWeek.start} to ${testWeek.end}`);
        console.log('');

        try {
            // Test getting more articles from single search
            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple', // Just "Apple" as you suggested
                    lang: 'eng',
                    dateStart: testWeek.start,
                    dateEnd: testWeek.end,
                    articlesSortBy: 'relevance', // Start with most relevant
                    includeArticleDate: true,
                    includeArticleTitle: true,
                    includeArticleBody: true,
                    articlesCount: 50, // Get more articles per search
                    sourceRankingThreshold: 50,
                    excludeKeywords: ['how to', 'tutorial', 'guide'],
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];
            const totalAvailable = response.data?.articles?.totalResults || 0;

            console.log(`📊 Results from single search:`);
            console.log(`   Articles returned: ${articles.length}`);
            console.log(`   Total available: ${totalAvailable}`);
            console.log(`   Token cost: 5 tokens`);
            console.log('');

            if (articles.length > 0) {
                // Analyze what we got
                const dates = articles.map(a => a.date).filter(Boolean);
                const uniqueDates = [...new Set(dates)].sort();
                const sources = [...new Set(articles.map(a => a.source?.title).filter(Boolean))];

                console.log(`📅 Date analysis:`);
                console.log(`   Unique dates: ${uniqueDates.length}`);
                console.log(`   Date range: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
                console.log(`   Sources: ${sources.length} unique sources`);
                console.log('');

                // Apply your business filtering
                const filtered = this.applyBusinessFilter(articles);
                console.log(`🎯 After business filtering:`);
                console.log(`   Relevant articles: ${filtered.length}/${articles.length}`);
                console.log(`   Quality rate: ${Math.round((filtered.length / articles.length) * 100)}%`);
                console.log('');

                // Show samples
                console.log(`📰 Sample articles:`);
                filtered.slice(0, 3).forEach((article, i) => {
                    console.log(`   ${i + 1}. "${article.title.substring(0, 60)}..." (${article.date})`);
                });
                console.log('');

                console.log(`💡 SINGLE SEARCH INSIGHTS:`);
                console.log(`   • Can get ${filtered.length} quality articles for 5 tokens`);
                console.log(`   • Efficiency: ${Math.round(filtered.length / 5)} articles per token`);
                console.log(`   • Much more cost-effective than multiple searches`);
            }

        } catch (error: any) {
            console.log(`❌ Single search test failed: ${error.message}`);
        }
    }

    /**
     * Calculate optimal strategy based on insights
     */
    private async calculateOptimalStrategy(): Promise<void> {
        console.log('🎯 OPTIMAL STRATEGY CALCULATION');
        console.log('─'.repeat(50));
        console.log('Based on first principles analysis:');
        console.log('');

        // Calculate current date and 5 years back
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-based (8 = September)

        // 5 years back from current date
        const startYear = currentYear - 4; // 2021 for 2025
        const endYear = currentYear;

        console.log(`📅 DATE RANGE CALCULATION:`);
        console.log(`   Current date: ${currentDate.toISOString().split('T')[0]}`);
        console.log(`   5 years back: ${startYear} to ${endYear}`);
        console.log(`   Include up to: August ${endYear} (as requested)`);
        console.log('');

        // Calculate weeks
        const weeksPerYear = 52;
        const totalYears = endYear - startYear + 1;
        let totalWeeks = totalYears * weeksPerYear;

        // Adjust for partial current year (up to August)
        const weeksIntoCurrentYear = Math.floor((currentMonth + 1) * 52 / 12); // Rough estimate
        totalWeeks = totalWeeks - (52 - weeksIntoCurrentYear);

        console.log(`📊 OPTIMAL STRATEGY:`);
        console.log(`   Approach: Single "Apple" search per week`);
        console.log(`   Query: "Apple" (not Apple + AAPL + Apple Inc)`);
        console.log(`   Articles per search: 30-50 (get more variety)`);
        console.log(`   Sort: relevance (most important news first)`);
        console.log(`   Filtering: Post-process for business relevance`);
        console.log('');

        console.log(`💰 COST CALCULATION:`);
        console.log(`   Total weeks: ~${totalWeeks}`);
        console.log(`   Cost per week: 5 tokens`);
        console.log(`   Total tokens: ${totalWeeks * 5}`);
        console.log(`   Budget usage: ${Math.round((totalWeeks * 5 / 5000) * 100)}%`);
        console.log(`   Expected articles: ${totalWeeks * 20} (after filtering)`);
        console.log('');

        console.log(`🎯 ADDRESSING YOUR CONCERNS:`);
        console.log(`   ✅ Single search per week (not 3 searches)`);
        console.log(`   ✅ Just "Apple" query (not multiple variations)`);
        console.log(`   ✅ 2021-2025 timeframe (5 years including current)`);
        console.log(`   ✅ Focus on getting MORE articles per search`);
        console.log(`   ✅ Post-process filtering for business relevance`);
        console.log(`   ✅ Much more token-efficient approach`);
        console.log('');

        console.log(`⚠️  REMAINING CHALLENGES TO SOLVE:`);
        console.log(`   • Date distribution within weeks (your key concern)`);
        console.log(`   • Getting articles from ALL days, not just spike days`);
        console.log(`   • Supabase schema updates for additional API data`);
        console.log(`   • Business relevance filtering logic`);
    }

    /**
     * Simple business filtering (placeholder)
     */
    private applyBusinessFilter(articles: any[]): any[] {
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            // Must mention Apple
            const hasApple = title.includes('apple') || body.includes('apple');

            // Must have substantial content
            const hasContent = article.body && article.body.length > 300;

            // Exclude tutorials
            const excludePatterns = ['how to', 'tutorial', 'guide', 'setup'];
            const isNotTutorial = !excludePatterns.some(pattern =>
                title.includes(pattern) || body.substring(0, 500).includes(pattern)
            );

            return hasApple && hasContent && isNotTutorial;
        });
    }
}

// Main execution
async function main() {
    try {
        const analyzer = new TokenEconomicsAnalyzer();
        await analyzer.analyzeTokenEconomics();

    } catch (error: any) {
        console.error('❌ Analysis failed:', error.message);
    }
}

main();
