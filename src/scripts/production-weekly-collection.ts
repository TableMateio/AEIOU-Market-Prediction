#!/usr/bin/env npx tsx

/**
 * Production Weekly Collection System
 * Comprehensive 5-year weekly sampling for daily ML prediction
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import axios from 'axios';

class ProductionWeeklyCollector {
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

    /**
     * Execute comprehensive weekly collection for ML system
     */
    async executeWeeklyCollection(startYear: number = 2020, endYear: number = 2024): Promise<void> {
        console.log('🎯 PRODUCTION WEEKLY COLLECTION SYSTEM');
        console.log('='.repeat(60));
        console.log('Goal: Comprehensive training data for daily ML prediction');
        console.log(`Timeframe: ${startYear}-${endYear} (${endYear - startYear + 1} years)`);
        console.log('');

        // Generate all weekly periods
        const weeklyPeriods = this.generateWeeklyPeriods(startYear, endYear);
        console.log(`📅 Generated ${weeklyPeriods.length} weekly periods`);

        // Calculate costs
        const strategiesPerWeek = 3;
        const totalTokens = weeklyPeriods.length * strategiesPerWeek * 5;
        console.log(`💰 Total tokens needed: ${totalTokens} (${Math.round((totalTokens / 5000) * 100)}% of budget)`);
        console.log(`💵 Estimated cost: ~$${Math.round(totalTokens * 90 / 5000)}`);
        console.log('');

        // Confirm execution
        console.log('🚀 EXECUTION PLAN:');
        console.log(`   • Process ${weeklyPeriods.length} weeks`);
        console.log(`   • 3 strategies per week (relevance, date, social)`);
        console.log(`   • 8 articles per strategy (24 per week)`);
        console.log(`   • Expected: ~${weeklyPeriods.length * 15} unique articles after deduplication`);
        console.log(`   • Coverage: Every single week of market activity`);
        console.log('');

        // Get user confirmation for large operation
        const shouldProceed = process.argv.includes('--execute');
        if (!shouldProceed) {
            console.log('⚠️  DRY RUN MODE');
            console.log('   Add --execute flag to run actual collection');
            console.log('   Example: npx tsx src/scripts/production-weekly-collection.ts --execute');
            console.log('');

            // Show sample of what would be processed
            console.log('📋 Sample weeks that would be processed:');
            weeklyPeriods.slice(0, 5).forEach((period, i) => {
                console.log(`   ${i + 1}. ${period.label}: ${period.start} to ${period.end}`);
            });
            console.log(`   ... and ${weeklyPeriods.length - 5} more weeks`);
            return;
        }

        // Execute collection
        console.log('🚀 EXECUTING PRODUCTION COLLECTION...');
        console.log('');

        const results = {
            processedWeeks: 0,
            totalArticles: 0,
            uniqueArticles: 0,
            tokensUsed: 0,
            errors: 0,
            startTime: new Date()
        };

        // Process in batches to avoid overwhelming the API
        const batchSize = 10; // Process 10 weeks at a time
        const batches = this.chunkArray(weeklyPeriods, batchSize);

        console.log(`📦 Processing ${batches.length} batches of ${batchSize} weeks each`);
        console.log('');

        for (const [batchIndex, batch] of batches.entries()) {
            console.log(`🔄 Batch ${batchIndex + 1}/${batches.length} (Weeks ${batch[0].label} to ${batch[batch.length - 1].label})`);

            const batchArticles: any[] = [];

            for (const week of batch) {
                try {
                    console.log(`   📅 Processing ${week.label}: ${week.start} to ${week.end}`);

                    const weekArticles = await this.processWeek(week);
                    batchArticles.push(...weekArticles);

                    results.processedWeeks++;
                    results.totalArticles += weekArticles.length;
                    results.tokensUsed += strategiesPerWeek * 5;

                    console.log(`      ✅ Collected ${weekArticles.length} articles`);

                    // Rate limiting between weeks
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (error: any) {
                    console.log(`      ❌ Failed: ${error.message}`);
                    results.errors++;
                }
            }

            // Process batch to database
            if (batchArticles.length > 0) {
                const uniqueBatchArticles = this.deduplicateArticles(batchArticles);
                console.log(`   📊 Batch results: ${batchArticles.length} total, ${uniqueBatchArticles.length} unique`);

                await this.saveBatchToDatabase(uniqueBatchArticles, batchIndex + 1);
                results.uniqueArticles += uniqueBatchArticles.length;
            }

            // Progress report
            const progress = Math.round((results.processedWeeks / weeklyPeriods.length) * 100);
            const elapsed = (new Date().getTime() - results.startTime.getTime()) / 1000 / 60;
            console.log(`   📈 Progress: ${progress}% (${results.processedWeeks}/${weeklyPeriods.length} weeks, ${Math.round(elapsed)}min elapsed)`);
            console.log('');

            // Longer pause between batches
            if (batchIndex < batches.length - 1) {
                console.log('   ⏸️  Pausing 30s between batches...');
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
        }

        // Final results
        await this.reportFinalResults(results);
    }

    /**
     * Generate weekly periods for the specified years
     */
    private generateWeeklyPeriods(startYear: number, endYear: number): any[] {
        const periods: any[] = [];

        for (let year = startYear; year <= endYear; year++) {
            // Start from first Monday of the year
            let current = new Date(year, 0, 1);
            while (current.getDay() !== 1) { // Find first Monday
                current.setDate(current.getDate() + 1);
            }

            let weekNumber = 1;

            while (current.getFullYear() === year) {
                const weekStart = new Date(current);
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 4); // Friday

                // Don't go into next year
                if (weekEnd.getFullYear() > year) {
                    weekEnd.setMonth(11, 31); // December 31
                }

                periods.push({
                    year,
                    week: weekNumber,
                    label: `${year}-W${weekNumber.toString().padStart(2, '0')}`,
                    start: weekStart.toISOString().split('T')[0],
                    end: weekEnd.toISOString().split('T')[0]
                });

                // Move to next Monday
                current.setDate(current.getDate() + 7);
                weekNumber++;

                // Safety check - don't go beyond 53 weeks
                if (weekNumber > 53) break;
            }
        }

        return periods;
    }

    /**
     * Process a single week with 3 strategies
     */
    private async processWeek(week: any): Promise<any[]> {
        const strategies = [
            {
                name: 'Business Relevance',
                query: 'Apple',
                sort: 'relevance',
                goal: 'Important business news'
            },
            {
                name: 'Chronological Coverage',
                query: 'AAPL',
                sort: 'date',
                goal: 'Sequential news flow'
            },
            {
                name: 'Market Discussion',
                query: 'Apple Inc',
                sort: 'socialScore',
                goal: 'Market sentiment'
            }
        ];

        const weekArticles: any[] = [];

        for (const strategy of strategies) {
            try {
                const articles = await this.executeWeeklyStrategy(week, strategy);
                weekArticles.push(...articles.map(a => ({
                    ...a,
                    week_label: week.label,
                    collection_strategy: strategy.name,
                    sort_method: strategy.sort
                })));

                // Rate limiting between strategies
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (error: any) {
                console.log(`      ⚠️  Strategy ${strategy.name} failed: ${error.message}`);
            }
        }

        return weekArticles;
    }

    /**
     * Execute a single weekly strategy
     */
    private async executeWeeklyStrategy(week: any, strategy: any): Promise<any[]> {
        const params = {
            resultType: 'articles',
            keyword: strategy.query,
            lang: 'eng',
            dateStart: week.start,
            dateEnd: week.end,
            articlesSortBy: strategy.sort,
            includeArticleBody: true,
            includeArticleDate: true,
            includeArticleSource: true,
            articlesCount: 8, // 8 articles per strategy
            sourceRankingThreshold: 50, // Top 50% sources
            excludeKeywords: ['how to', 'tutorial', 'guide', 'setup', 'install', 'tips', 'tricks'],
            apiKey: this.newsApiKey
        };

        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params,
            timeout: 30000
        });

        const articles = response.data?.articles?.results || [];

        // Apply your filtering requirements
        return this.applyBusinessRelevanceFilter(articles);
    }

    /**
     * Apply business relevance filtering
     */
    private applyBusinessRelevanceFilter(articles: any[]): any[] {
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            // Must mention Apple/AAPL
            const hasAppleMention = title.includes('apple') || title.includes('aapl') ||
                body.includes('apple inc');
            if (!hasAppleMention) return false;

            // Must have substantial content
            if (!article.body || article.body.length < 300) return false;

            // Exclude tutorial content
            const excludePatterns = [
                'how to', 'tutorial', 'guide to', 'step by step', 'settings',
                'configure', 'setup', 'install', 'update your', 'fix your',
                'troubleshoot', 'manual', 'instructions', 'review', 'unboxing'
            ];

            const isExcluded = excludePatterns.some(pattern =>
                title.includes(pattern) || body.substring(0, 500).includes(pattern)
            );

            return !isExcluded;
        });
    }

    /**
     * Remove duplicates by URL
     */
    private deduplicateArticles(articles: any[]): any[] {
        const seen = new Set<string>();
        return articles.filter(article => {
            if (seen.has(article.url)) return false;
            seen.add(article.url);
            return true;
        });
    }

    /**
     * Save batch to database
     */
    private async saveBatchToDatabase(articles: any[], batchNumber: number): Promise<void> {
        console.log(`   💾 Saving batch ${batchNumber} to database...`);

        let inserted = 0;
        let duplicates = 0;
        let errors = 0;

        for (const article of articles) {
            try {
                const external_id = `weekly_ml_${Buffer.from(article.url).toString('base64').substring(0, 16)}`;

                // Calculate Apple relevance score
                let apple_relevance_score = 0.7;
                const title = (article.title || '').toLowerCase();
                const body = (article.body || '').toLowerCase();

                if (title.includes('apple') || body.includes('apple inc')) apple_relevance_score += 0.15;
                if (title.includes('aapl')) apple_relevance_score += 0.1;
                if (title.includes('earnings') || title.includes('revenue')) apple_relevance_score += 0.1;
                apple_relevance_score = Math.min(apple_relevance_score, 1.0);

                const transformedArticle = {
                    external_id,
                    external_id_type: 'weekly_ml_collection',
                    title: article.title.substring(0, 500),
                    url: article.url,
                    published_at: new Date(article.date || article.dateTime).toISOString(),
                    source: article.source?.title || 'Unknown',
                    article_description: article.body ? article.body.substring(0, 1000) : null,
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai_weekly',
                    content_type: 'ml_training',
                    apple_relevance_score,
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

        console.log(`      ✅ Batch ${batchNumber}: ${inserted} inserted, ${duplicates} duplicates, ${errors} errors`);
    }

    /**
     * Chunk array into batches
     */
    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    /**
     * Report final results
     */
    private async reportFinalResults(results: any): Promise<void> {
        const elapsed = (new Date().getTime() - results.startTime.getTime()) / 1000 / 60;

        console.log('🎉 PRODUCTION COLLECTION COMPLETE!');
        console.log('='.repeat(60));
        console.log(`⏱️  Total time: ${Math.round(elapsed)} minutes`);
        console.log(`📅 Weeks processed: ${results.processedWeeks}`);
        console.log(`📊 Total articles: ${results.totalArticles}`);
        console.log(`🎯 Unique articles: ${results.uniqueArticles}`);
        console.log(`💰 Tokens used: ${results.tokensUsed}`);
        console.log(`❌ Errors: ${results.errors}`);
        console.log(`📈 Efficiency: ${Math.round(results.uniqueArticles / results.tokensUsed)} articles per token`);

        // Get updated database totals
        const { data: totalCheck } = await this.supabase
            .from('articles')
            .select('id, data_source')
            .order('created_at', { ascending: false });

        if (totalCheck) {
            const bySource = totalCheck.reduce((acc: Record<string, number>, a) => {
                acc[a.data_source] = (acc[a.data_source] || 0) + 1;
                return acc;
            }, {});

            console.log('\n📊 Updated Database Totals:');
            Object.entries(bySource).forEach(([source, count]) => {
                console.log(`   ${source}: ${count} articles`);
            });
            console.log(`   📊 Total: ${totalCheck.length} articles`);
        }

        console.log('\n✅ READY FOR ML TRAINING:');
        console.log('   • Comprehensive coverage of all trading day types');
        console.log('   • Regular business news + exciting market events');
        console.log('   • 5 years of weekly market activity captured');
        console.log('   • Perfect training data for daily prediction system');
    }
}

// Main execution
async function main() {
    try {
        const collector = new ProductionWeeklyCollector();
        await collector.executeWeeklyCollection(2020, 2024);

    } catch (error: any) {
        console.error('❌ Production collection failed:', error.message);
    }
}

main();
