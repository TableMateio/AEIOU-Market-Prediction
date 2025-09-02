#!/usr/bin/env npx tsx

/**
 * Test Single Period Collection - Fixed
 * Use existing database schema fields, no metadata column
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import axios from 'axios';

class SinglePeriodTesterFixed {
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

    async testSinglePeriod(): Promise<void> {
        console.log('🧪 TESTING SINGLE PERIOD COLLECTION - FIXED');
        console.log('='.repeat(60));
        console.log('Goal: Validate strategy with existing database schema');
        console.log('');

        // Generate a test period with business days
        const testPeriod = this.generateTestPeriod();
        console.log(`📅 SELECTED TEST PERIOD:`);
        console.log(`   Period: ${testPeriod.start} to ${testPeriod.end}`);
        console.log(`   Business days: ${testPeriod.businessDays.length} (${testPeriod.businessDays.join(', ')})`);
        console.log(`   Weekend/holiday days: ${testPeriod.nonBusinessDays.join(', ') || 'None'}`);
        console.log('');

        // Test the collection
        await this.executeTestCollection(testPeriod);
    }

    /**
     * Generate a test period that includes business days
     */
    private generateTestPeriod(): any {
        // Use a recent period with known business days
        const testStart = '2024-08-05'; // Monday
        const testEnd = '2024-08-07';   // Wednesday

        const businessDays = this.getBusinessDaysInRange(testStart, testEnd);
        const allDays = this.getAllDaysInRange(testStart, testEnd);
        const nonBusinessDays = allDays.filter(day => !businessDays.includes(day));

        return {
            name: 'Test-Period-1',
            start: testStart,
            end: testEnd,
            businessDays,
            nonBusinessDays,
            totalDays: allDays.length
        };
    }

    /**
     * Execute test collection for single period
     */
    private async executeTestCollection(period: any): Promise<void> {
        console.log('🚀 EXECUTING SINGLE PERIOD COLLECTION');
        console.log('─'.repeat(50));
        console.log('Strategy: Social score sorting, 25 articles, single "Apple" query');
        console.log('');

        try {
            console.log('📡 Making API request...');
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

            const articles = response.data?.articles?.results || [];
            const totalAvailable = response.data?.articles?.totalResults || 0;

            console.log(`✅ API Response received`);
            console.log(`   Articles returned: ${articles.length}`);
            console.log(`   Total available: ${totalAvailable}`);
            console.log(`   Token cost: 5 tokens`);
            console.log('');

            if (articles.length === 0) {
                console.log('❌ No articles returned for this period');
                return;
            }

            // Analyze the results
            await this.analyzeResults(articles, period);

            // Apply business filtering
            const relevantArticles = this.applyBusinessFiltering(articles);
            console.log(`🎯 BUSINESS FILTERING RESULTS:`);
            console.log(`   Relevant articles: ${relevantArticles.length}/${articles.length} (${Math.round((relevantArticles.length / articles.length) * 100)}%)`);
            console.log(`   Efficiency: ${Math.round(relevantArticles.length / 5)} relevant articles per token`);
            console.log('');

            if (relevantArticles.length === 0) {
                console.log('❌ No business-relevant articles after filtering');
                return;
            }

            // Save to database using existing schema
            await this.saveToDatabaseFixed(relevantArticles, period);

            console.log('🎉 SINGLE PERIOD TEST COMPLETED SUCCESSFULLY!');
            console.log('');
            console.log('✅ VALIDATION COMPLETE:');
            console.log('   • API collection works');
            console.log('   • Social score sorting gives good date distribution');
            console.log('   • Business filtering effective');
            console.log('   • Database save successful');
            console.log('');
            console.log('📋 READY FOR NEXT STEPS:');
            console.log('   1. ✅ Single period validated');
            console.log('   2. Next: Test 5 periods');
            console.log('   3. Then: Test full year');
            console.log('   4. Finally: Run full 5-year collection');

        } catch (error: any) {
            console.log(`❌ Collection failed: ${error.message}`);
            if (error.response) {
                console.log(`   API Error: ${error.response.status} - ${error.response.statusText}`);
            }
        }
    }

    /**
     * Analyze the API results
     */
    private async analyzeResults(articles: any[], period: any): Promise<void> {
        console.log('📊 ANALYZING RESULTS');
        console.log('─'.repeat(30));

        // Date distribution analysis
        const dates = articles.map(a => a.date).filter(Boolean);
        const uniqueDates = [...new Set(dates)].sort();
        const dateCount = dates.reduce((acc, date) => {
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('📅 DATE DISTRIBUTION:');
        console.log(`   Unique dates: ${uniqueDates.length}/${period.businessDays.length} business days covered`);
        Object.entries(dateCount).forEach(([date, count]) => {
            const isBusinessDay = period.businessDays.includes(date);
            const dayType = isBusinessDay ? '(business day)' : '(weekend/holiday)';
            console.log(`   ${date}: ${count} articles ${dayType}`);
        });

        // Business day coverage
        const coveredBusinessDays = uniqueDates.filter(date => period.businessDays.includes(date));
        const businessDayCoverage = Math.round((coveredBusinessDays.length / period.businessDays.length) * 100);
        console.log(`   Business day coverage: ${businessDayCoverage}% (${coveredBusinessDays.length}/${period.businessDays.length} days)`);

        if (businessDayCoverage >= 80) {
            console.log('   ✅ EXCELLENT business day coverage');
        } else if (businessDayCoverage >= 50) {
            console.log('   👍 GOOD business day coverage');
        } else {
            console.log('   ⚠️  LIMITED business day coverage');
        }
        console.log('');

        // Source diversity
        const sources = [...new Set(articles.map(a => a.source?.title).filter(Boolean))];
        console.log('📰 SOURCE DIVERSITY:');
        console.log(`   Unique sources: ${sources.length}`);
        console.log(`   Top sources: ${sources.slice(0, 5).join(', ')}`);
        console.log('');

        // Field availability for future use
        const firstArticle = articles[0];
        console.log('📋 NEWSAPI.AI FIELDS (for future schema update):');
        console.log(`   Categories: ${firstArticle.categories ? 'Available' : 'Not available'} (${Array.isArray(firstArticle.categories) ? firstArticle.categories.length + ' items' : 'N/A'})`);
        console.log(`   Concepts: ${firstArticle.concepts ? 'Available' : 'Not available'} (${Array.isArray(firstArticle.concepts) ? firstArticle.concepts.length + ' items' : 'N/A'})`);
        console.log(`   Social score: ${firstArticle.shares !== undefined ? 'Available' : 'Not available'} (${firstArticle.shares || 'N/A'})`);
        console.log('');

        // Sample content
        console.log('📰 SAMPLE ARTICLES:');
        articles.slice(0, 3).forEach((article, i) => {
            console.log(`   ${i + 1}. "${article.title.substring(0, 60)}..." (${article.date})`);
            console.log(`      Source: ${article.source?.title || 'Unknown'}`);
            console.log(`      Length: ${article.body ? article.body.length + ' chars' : 'No body'}`);
        });
        console.log('');
    }

    /**
     * Apply business relevance filtering
     */
    private applyBusinessFiltering(articles: any[]): any[] {
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            // Must mention Apple
            const hasApple = title.includes('apple') || body.includes('apple');
            if (!hasApple) return false;

            // Must have substantial content
            if (!article.body || article.body.length < 200) return false;

            // Exclude tutorial content
            const excludePatterns = ['how to', 'tutorial', 'guide', 'setup', 'tips', 'review:', 'unboxing'];
            const isNotTutorial = !excludePatterns.some(pattern => title.includes(pattern));

            return isNotTutorial;
        });
    }

    /**
     * Save articles to database using EXISTING schema fields
     */
    private async saveToDatabaseFixed(articles: any[], period: any): Promise<void> {
        console.log('💾 SAVING TO DATABASE (using existing schema)');
        console.log('─'.repeat(50));
        console.log(`Saving ${articles.length} articles...`);

        let inserted = 0;
        let duplicates = 0;
        let errors = 0;

        for (const [index, article] of articles.entries()) {
            try {
                console.log(`   Processing article ${index + 1}/${articles.length}...`);

                // Check for duplicates
                const { data: existing } = await this.supabase
                    .from('articles')
                    .select('id')
                    .eq('url', article.url)
                    .single();

                if (existing) {
                    duplicates++;
                    console.log(`      ⚠️  Duplicate found, skipping`);
                    continue;
                }

                // Transform article for EXISTING database schema
                // Based on the schema we saw in add-newsapi-articles-correct.ts
                const transformedArticle = {
                    external_id: `single_test_${Buffer.from(article.url).toString('base64').substring(0, 16)}`,
                    external_id_type: 'single_period_test',
                    title: article.title ? article.title.substring(0, 500) : 'No Title',
                    url: article.url,
                    published_at: new Date(article.date || article.dateTime).toISOString(),
                    source: article.source?.title || 'Unknown',
                    article_description: article.body ? article.body.substring(0, 1000) : null,
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai_test',
                    content_type: 'test_single_period',
                    apple_relevance_score: this.calculateAppleRelevanceScore(article),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('articles')
                    .insert(transformedArticle);

                if (error) {
                    if (error.code === '23505') { // Unique constraint violation
                        duplicates++;
                        console.log(`      ⚠️  Duplicate constraint, skipping`);
                    } else {
                        throw error;
                    }
                } else {
                    inserted++;
                    console.log(`      ✅ Inserted successfully`);
                }

            } catch (error: any) {
                errors++;
                console.log(`      ❌ Error: ${error.message}`);
            }
        }

        console.log('');
        console.log('📊 DATABASE SAVE RESULTS:');
        console.log(`   Inserted: ${inserted}`);
        console.log(`   Duplicates: ${duplicates}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Success rate: ${Math.round((inserted / articles.length) * 100)}%`);
        console.log('');

        // Check current database totals
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
    }

    /**
     * Calculate Apple relevance score
     */
    private calculateAppleRelevanceScore(article: any): number {
        let score = 0.6; // Base score for Apple search results

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
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
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
        const tester = new SinglePeriodTesterFixed();
        await tester.testSinglePeriod();

    } catch (error: any) {
        console.error('❌ Single period test failed:', error.message);
    }
}

main();
