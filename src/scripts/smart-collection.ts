#!/usr/bin/env npx tsx

/**
 * Smart Collection Script
 * One script that can do 1 period, 5 periods, 1 year, or 5 years
 * Automatically avoids duplicates and tracks what we've already collected
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import axios from 'axios';

class SmartCollector {
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

    async runCollection(): Promise<void> {
        console.log('🎯 SMART COLLECTION SYSTEM');
        console.log('='.repeat(60));

        // Parse command line arguments
        const args = process.argv.slice(2);
        const mode = args.find(arg => ['1', '5', 'year', 'full'].includes(arg)) || '1';
        const execute = args.includes('--execute');

        console.log(`Mode: ${mode} period(s) | Execute: ${execute ? 'YES' : 'PREVIEW'}`);
        console.log('');

        // Check what we've already collected to avoid duplicates
        const collectedPeriods = await this.getAlreadyCollectedPeriods();
        console.log(`📊 Already collected: ${collectedPeriods.length} periods`);
        if (collectedPeriods.length > 0) {
            console.log(`   Most recent: ${collectedPeriods[0]}`);
        }
        console.log('');

        // Generate periods based on mode
        const periods = this.generatePeriods(mode, collectedPeriods);
        console.log(`📅 WILL COLLECT ${periods.length} NEW PERIODS:`);
        periods.slice(0, 5).forEach((period, i) => {
            console.log(`   ${i + 1}. ${period.name}: ${period.start} to ${period.end} (${period.businessDays.length} business days)`);
        });
        if (periods.length > 5) {
            console.log(`   ... and ${periods.length - 5} more periods`);
        }
        console.log(`   💰 Cost: ${periods.length * 5} tokens`);
        console.log('');

        if (!execute) {
            console.log('⚠️  PREVIEW MODE - Add --execute to run collection');
            console.log(`   Command: npx tsx src/scripts/smart-collection.ts ${mode} --execute`);
            return;
        }

        // Execute collection
        await this.executeCollection(periods);
    }

    /**
     * Get periods we've already collected to avoid duplicates
     */
    private async getAlreadyCollectedPeriods(): Promise<string[]> {
        try {
            const { data, error } = await this.supabase
                .from('articles')
                .select('published_at')
                .eq('data_source', 'newsapi_ai')
                .like('content_type', 'smart_period_%')
                .order('published_at', { ascending: false });

            if (error) return [];

            // Extract unique date ranges we've collected
            const dates = data.map(a => a.published_at.split('T')[0]);
            return [...new Set(dates)].sort().reverse();

        } catch (error) {
            return [];
        }
    }

    /**
     * Generate periods based on mode, avoiding already collected ones
     */
    private generatePeriods(mode: string, collectedPeriods: string[]): any[] {
        const allPeriods = this.generateAllAvailablePeriods();

        // Filter out already collected periods
        const newPeriods = allPeriods.filter(period => {
            const periodDates = this.getAllDaysInRange(period.start, period.end);
            return !periodDates.some(date => collectedPeriods.includes(date));
        });

        // Return based on mode
        switch (mode) {
            case '1':
                return newPeriods.slice(0, 1);
            case '5':
                return newPeriods.slice(0, 5);
            case 'year':
                return newPeriods.slice(0, 122); // ~1 year worth
            case 'full':
                return newPeriods; // All available
            default:
                return newPeriods.slice(0, 1);
        }
    }

    /**
     * Generate all available 3-day periods from 2021-2025
     */
    private generateAllAvailablePeriods(): any[] {
        const periods: any[] = [];
        const startDate = new Date('2021-01-01');
        const endDate = new Date('2025-08-31');

        let current = new Date(startDate);
        let periodNumber = 1;

        while (current <= endDate) {
            const periodStart = new Date(current);
            const periodEnd = new Date(current);
            periodEnd.setDate(periodEnd.getDate() + 2); // 3-day period

            if (periodEnd > endDate) {
                periodEnd.setTime(endDate.getTime());
            }

            const businessDays = this.getBusinessDaysInRange(
                periodStart.toISOString().split('T')[0],
                periodEnd.toISOString().split('T')[0]
            );

            // Only include periods with business days
            if (businessDays.length > 0) {
                periods.push({
                    number: periodNumber,
                    name: `Period-${periodNumber}`,
                    start: periodStart.toISOString().split('T')[0],
                    end: periodEnd.toISOString().split('T')[0],
                    businessDays,
                    totalDays: 3
                });
                periodNumber++;
            }

            current.setDate(current.getDate() + 3);
        }

        return periods;
    }

    /**
     * Execute collection for periods
     */
    private async executeCollection(periods: any[]): Promise<void> {
        console.log('🚀 EXECUTING SMART COLLECTION');
        console.log('─'.repeat(50));

        const results = {
            processedPeriods: 0,
            totalArticles: 0,
            relevantArticles: 0,
            tokensUsed: 0,
            errors: 0,
            startTime: new Date()
        };

        for (const period of periods) {
            console.log(`📅 Processing ${period.name} (${period.start} to ${period.end})`);

            try {
                // Collect articles
                const articles = await this.collectPeriodArticles(period);
                console.log(`   📊 Collected: ${articles.length} articles`);

                // Filter for relevance
                const relevantArticles = this.applyBusinessFiltering(articles);
                console.log(`   🎯 Relevant: ${relevantArticles.length}/${articles.length}`);

                // Save to database
                const saveResults = await this.savePeriodToDatabase(relevantArticles, period);
                console.log(`   💾 Saved: ${saveResults.inserted} new, ${saveResults.duplicates} duplicates`);

                results.processedPeriods++;
                results.totalArticles += articles.length;
                results.relevantArticles += relevantArticles.length;
                results.tokensUsed += 5;

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
                results.errors++;
            }
        }

        // Report results
        const elapsed = (new Date().getTime() - results.startTime.getTime()) / 1000 / 60;
        console.log('');
        console.log('🎉 COLLECTION COMPLETE!');
        console.log(`   Time: ${Math.round(elapsed)} minutes`);
        console.log(`   Periods: ${results.processedPeriods}/${periods.length}`);
        console.log(`   Articles: ${results.relevantArticles} relevant`);
        console.log(`   Tokens: ${results.tokensUsed}`);
        console.log(`   Efficiency: ${Math.round(results.relevantArticles / results.tokensUsed)} articles/token`);
    }

    // ... (keeping helper methods from previous scripts)

    private async collectPeriodArticles(period: any): Promise<any[]> {
        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params: {
                resultType: 'articles',
                keyword: 'Apple',
                lang: 'eng',
                dateStart: period.start,
                dateEnd: period.end,
                articlesSortBy: 'socialScore',
                includeArticleBody: true,
                includeArticleDate: true,
                includeArticleSource: true,
                articlesCount: 25,
                sourceRankingThreshold: 50,
                excludeKeywords: ['how to', 'tutorial', 'guide'],
                apiKey: this.newsApiKey
            },
            timeout: 30000
        });

        return response.data?.articles?.results || [];
    }

    private applyBusinessFiltering(articles: any[]): any[] {
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            const hasApple = title.includes('apple') || body.includes('apple');
            const hasContent = article.body && article.body.length > 200;
            const excludePatterns = ['how to', 'tutorial', 'guide'];
            const isNotTutorial = !excludePatterns.some(pattern => title.includes(pattern));

            return hasApple && hasContent && isNotTutorial;
        });
    }

    private async savePeriodToDatabase(articles: any[], period: any): Promise<any> {
        let inserted = 0;
        let duplicates = 0;

        for (const article of articles) {
            try {
                const { data: existing } = await this.supabase
                    .from('articles')
                    .select('id')
                    .eq('url', article.url)
                    .single();

                if (existing) {
                    duplicates++;
                    continue;
                }

                const transformedArticle = {
                    external_id: `smart_${Buffer.from(article.url).toString('base64').substring(0, 16)}`,
                    external_id_type: 'smart_collection',
                    title: article.title?.substring(0, 500) || 'No Title',
                    url: article.url,
                    published_at: new Date(article.date || article.dateTime).toISOString(),
                    source: article.source?.title || 'Unknown',
                    article_description: article.body?.substring(0, 1000),
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai',
                    content_type: `smart_period_${period.number}`,
                    apple_relevance_score: 0.8,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('articles')
                    .insert(transformedArticle);

                if (!error) {
                    inserted++;
                }

            } catch (error) {
                // Skip errors for now
            }
        }

        return { inserted, duplicates };
    }

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
        const collector = new SmartCollector();
        await collector.runCollection();

    } catch (error: any) {
        console.error('❌ Smart collection failed:', error.message);
    }
}

console.log('Usage: npx tsx src/scripts/smart-collection.ts [1|5|year|full] [--execute]');
console.log('Examples:');
console.log('  npx tsx src/scripts/smart-collection.ts 1          # Preview 1 new period');
console.log('  npx tsx src/scripts/smart-collection.ts 5 --execute # Collect 5 new periods');
console.log('  npx tsx src/scripts/smart-collection.ts year --execute # Collect 1 year');
console.log('');

main();
