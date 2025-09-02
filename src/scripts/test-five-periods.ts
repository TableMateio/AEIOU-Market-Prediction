#!/usr/bin/env npx tsx

/**
 * Test Five Periods Collection
 * Scale up from single period to validate consistency
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import axios from 'axios';

class FivePeriodsTest {
    private newsApiKey: string;
    private supabase: any;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    async testFivePeriods(): Promise<void> {
        console.log('🧪 TESTING FIVE PERIODS COLLECTION');
        console.log('='.repeat(60));
        console.log('Goal: Validate consistency and performance across multiple periods');
        console.log('');

        // Generate 5 test periods
        const testPeriods = this.generateFiveTestPeriods();
        console.log(`📅 GENERATED 5 TEST PERIODS:`);
        testPeriods.forEach((period, i) => {
            console.log(`   ${i + 1}. ${period.name}: ${period.start} to ${period.end} (${period.businessDays.length} business days)`);
        });
        console.log('');

        // Execute collection for all 5 periods
        await this.executeTestCollection(testPeriods);
    }

    /**
     * Generate 5 test periods from different time ranges
     */
    private generateFiveTestPeriods(): any[] {
        const periods = [
            { start: '2024-08-05', end: '2024-08-07' }, // Monday-Wednesday
            { start: '2024-08-08', end: '2024-08-10' }, // Thursday-Saturday (includes weekend)
            { start: '2024-07-29', end: '2024-07-31' }, // Monday-Wednesday (different week)
            { start: '2024-07-22', end: '2024-07-24' }, // Monday-Wednesday (different week)
            { start: '2024-07-15', end: '2024-07-17' }  // Monday-Wednesday (different week)
        ];

        return periods.map((period, i) => {
            const businessDays = this.getBusinessDaysInRange(period.start, period.end);
            const allDays = this.getAllDaysInRange(period.start, period.end);
            const nonBusinessDays = allDays.filter(day => !businessDays.includes(day));

            return {
                number: i + 1,
                name: `Test-Period-${i + 1}`,
                start: period.start,
                end: period.end,
                businessDays,
                nonBusinessDays,
                totalDays: allDays.length
            };
        });
    }

    /**
     * Execute test collection for all periods
     */
    private async executeTestCollection(periods: any[]): Promise<void> {
        console.log('🚀 EXECUTING FIVE PERIODS COLLECTION');
        console.log('─'.repeat(50));
        console.log('Strategy: Social score sorting, 25 articles per period, single "Apple" query');
        console.log('');

        const results = {
            processedPeriods: 0,
            totalArticles: 0,
            relevantArticles: 0,
            tokensUsed: 0,
            errors: 0,
            totalUniqueDates: 0,
            businessDayCoverage: [] as number[],
            startTime: new Date()
        };

        for (const period of periods) {
            console.log(`📅 Processing ${period.name} (${period.start} to ${period.end})`);
            console.log(`   Expected business days: ${period.businessDays.length} (${period.businessDays.join(', ')})`);

            try {
                // Collect articles for this period
                const articles = await this.collectPeriodArticles(period);
                console.log(`   📊 Raw results: ${articles.length} articles`);

                if (articles.length === 0) {
                    console.log(`   ❌ No articles for this period`);
                    results.errors++;
                    continue;
                }

                // Analyze date distribution
                const dateAnalysis = this.analyzeDateDistribution(articles, period);
                console.log(`   📅 Date coverage: ${dateAnalysis.uniqueDates} unique dates, ${dateAnalysis.businessDayCoverage}% business day coverage`);

                // Apply business filtering
                const relevantArticles = this.applyBusinessFiltering(articles);
                console.log(`   🎯 Business relevant: ${relevantArticles.length}/${articles.length} (${Math.round((relevantArticles.length / articles.length) * 100)}%)`);

                // Save to database
                const saveResults = await this.savePeriodToDatabase(relevantArticles, period);
                console.log(`   💾 Database: ${saveResults.inserted} inserted, ${saveResults.duplicates} duplicates, ${saveResults.errors} errors`);

                // Update results
                results.processedPeriods++;
                results.totalArticles += articles.length;
                results.relevantArticles += relevantArticles.length;
                results.tokensUsed += 5;
                results.totalUniqueDates += dateAnalysis.uniqueDates;
                results.businessDayCoverage.push(dateAnalysis.businessDayCoverage);

                console.log(`   ✅ Period completed successfully`);
                console.log('');

                // Rate limiting between periods
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error: any) {
                console.log(`   ❌ Period failed: ${error.message}`);
                results.errors++;
                console.log('');
            }
        }

        // Report final results
        await this.reportFinalResults(results, periods.length);
    }

    /**
     * Collect articles for a single period
     */
    private async collectPeriodArticles(period: any): Promise<any[]> {
        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params: {
                resultType: 'articles',
                keyword: 'Apple',
                lang: 'eng',
                dateStart: period.start,
                dateEnd: period.end,
                articlesSortBy: 'socialScore', // Social score sorting
                includeArticleBody: true,
                includeArticleDate: true,
                includeArticleSource: true,
                includeArticleCategories: true,
                includeArticleConcepts: true,
                articlesCount: 25,
                sourceRankingThreshold: 50,
                excludeKeywords: ['how to', 'tutorial', 'guide', 'setup', 'install'],
                apiKey: this.newsApiKey
            },
            timeout: 30000
        });

        return response.data?.articles?.results || [];
    }

    /**
     * Analyze date distribution for a period
     */
    private analyzeDateDistribution(articles: any[], period: any): any {
        const dates = articles.map(a => a.date).filter(Boolean);
        const uniqueDates = [...new Set(dates)];
        const coveredBusinessDays = uniqueDates.filter(date => period.businessDays.includes(date));
        const businessDayCoverage = Math.round((coveredBusinessDays.length / period.businessDays.length) * 100);

        return {
            uniqueDates: uniqueDates.length,
            coveredBusinessDays: coveredBusinessDays.length,
            businessDayCoverage,
            dateList: uniqueDates.sort()
        };
    }

    /**
     * Apply business relevance filtering
     */
    private applyBusinessFiltering(articles: any[]): any[] {
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            const hasApple = title.includes('apple') || body.includes('apple');
            const hasContent = article.body && article.body.length > 200;
            const excludePatterns = ['how to', 'tutorial', 'guide', 'setup', 'tips'];
            const isNotTutorial = !excludePatterns.some(pattern => title.includes(pattern));

            return hasApple && hasContent && isNotTutorial;
        });
    }

    /**
     * Save period articles to database
     */
    private async savePeriodToDatabase(articles: any[], period: any): Promise<any> {
        let inserted = 0;
        let duplicates = 0;
        let errors = 0;

        for (const article of articles) {
            try {
                // Check for duplicates
                const { data: existing } = await this.supabase
                    .from('articles')
                    .select('id')
                    .eq('url', article.url)
                    .single();

                if (existing) {
                    duplicates++;
                    continue;
                }

                // Transform article
                const transformedArticle = {
                    external_id: `five_test_${Buffer.from(article.url).toString('base64').substring(0, 16)}`,
                    external_id_type: 'five_periods_test',
                    title: article.title ? article.title.substring(0, 500) : 'No Title',
                    url: article.url,
                    published_at: new Date(article.date || article.dateTime).toISOString(),
                    source: article.source?.title || 'Unknown',
                    article_description: article.body ? article.body.substring(0, 1000) : null,
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai_five_test',
                    content_type: `test_five_periods_${period.number}`,
                    apple_relevance_score: this.calculateAppleRelevanceScore(article),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('articles')
                    .insert(transformedArticle);

                if (error) {
                    if (error.code === '23505') {
                        duplicates++;
                    } else {
                        errors++;
                    }
                } else {
                    inserted++;
                }

            } catch (insertError) {
                errors++;
            }
        }

        return { inserted, duplicates, errors };
    }

    /**
     * Report final results
     */
    private async reportFinalResults(results: any, totalPeriods: number): Promise<void> {
        const elapsed = (new Date().getTime() - results.startTime.getTime()) / 1000 / 60;
        const avgBusinessDayCoverage = Math.round(results.businessDayCoverage.reduce((sum, coverage) => sum + coverage, 0) / results.businessDayCoverage.length);
        const avgDatesPerPeriod = Math.round((results.totalUniqueDates / results.processedPeriods) * 10) / 10;

        console.log('🎉 FIVE PERIODS TEST COMPLETED!');
        console.log('='.repeat(60));
        console.log(`⏱️  Total time: ${Math.round(elapsed)} minutes`);
        console.log(`📅 Periods processed: ${results.processedPeriods}/${totalPeriods}`);
        console.log(`📊 Total articles: ${results.totalArticles}`);
        console.log(`🎯 Relevant articles: ${results.relevantArticles}`);
        console.log(`💰 Tokens used: ${results.tokensUsed}`);
        console.log(`❌ Errors: ${results.errors}`);
        console.log(`📅 Avg unique dates per period: ${avgDatesPerPeriod}`);
        console.log(`💼 Avg business day coverage: ${avgBusinessDayCoverage}%`);
        console.log(`📈 Efficiency: ${Math.round(results.relevantArticles / results.tokensUsed)} relevant articles per token`);
        console.log('');

        // Individual period performance
        console.log('📋 PERIOD-BY-PERIOD PERFORMANCE:');
        results.businessDayCoverage.forEach((coverage: number, i: number) => {
            const status = coverage >= 80 ? '✅' : coverage >= 50 ? '👍' : '⚠️';
            console.log(`   Period ${i + 1}: ${coverage}% business day coverage ${status}`);
        });
        console.log('');

        // Updated database totals
        const { data: totalCheck } = await this.supabase
            .from('articles')
            .select('data_source')
            .order('created_at', { ascending: false });

        if (totalCheck) {
            const bySource = totalCheck.reduce((acc: Record<string, number>, a) => {
                acc[a.data_source] = (acc[a.data_source] || 0) + 1;
                return acc;
            }, {});

            console.log('📊 UPDATED DATABASE TOTALS:');
            Object.entries(bySource).forEach(([source, count]) => {
                console.log(`   ${source}: ${count} articles`);
            });
            console.log(`   📊 Total: ${totalCheck.length} articles`);
        }

        console.log('');
        console.log('✅ FIVE PERIODS VALIDATION:');
        if (avgBusinessDayCoverage >= 70 && results.relevantArticles > 50) {
            console.log('   🎯 EXCELLENT: Strategy performs consistently across multiple periods');
            console.log('   📋 READY FOR NEXT STEP: Test full year collection');
            console.log('   🚀 Command: npx tsx src/scripts/test-full-year.ts');
        } else if (avgBusinessDayCoverage >= 50) {
            console.log('   👍 GOOD: Strategy works but may need refinement');
            console.log('   📋 Consider: Adjusting parameters or testing more periods');
        } else {
            console.log('   ⚠️  NEEDS IMPROVEMENT: Low business day coverage');
            console.log('   📋 Recommend: Review sorting strategy or period selection');
        }
    }

    /**
     * Calculate Apple relevance score
     */
    private calculateAppleRelevanceScore(article: any): number {
        let score = 0.6;
        const title = (article.title || '').toLowerCase();
        const body = (article.body || '').toLowerCase();

        if (title.includes('apple inc') || body.includes('apple inc')) score += 0.2;
        if (title.includes('aapl') || body.includes('aapl')) score += 0.1;
        if (title.includes('tim cook') || body.includes('tim cook')) score += 0.1;
        if (title.includes('iphone') || title.includes('ipad') || title.includes('mac')) score += 0.1;

        return Math.min(score, 1.0);
    }

    /**
     * Get business days in range
     */
    private getBusinessDaysInRange(startDate: string, endDate: string): string[] {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const businessDays: string[] = [];

        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                businessDays.push(current.toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
        }

        return businessDays;
    }

    /**
     * Get all days in range
     */
    private getAllDaysInRange(startDate: string, endDate: string): string[] {
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
}

// Main execution
async function main() {
    try {
        const tester = new FivePeriodsTest();
        await tester.testFivePeriods();

    } catch (error: any) {
        console.error('❌ Five periods test failed:', error.message);
    }
}

main();
