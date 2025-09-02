#!/usr/bin/env npx tsx

/**
 * Smart Collection Script - Entity-Based with Deduplication
 * Uses conceptUri approach for precise Apple Inc. targeting
 * Includes title-based deduplication to avoid same story from multiple sources
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { NewsApiAiService } from '../services/newsApiAiService';

class SmartEntityCollector {
    private supabase: any;
    private newsService: NewsApiAiService;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
        this.newsService = new NewsApiAiService();
    }

    async runCollection(): Promise<void> {
        console.log('🎯 SMART ENTITY-BASED COLLECTION');
        console.log('='.repeat(60));
        console.log('');

        console.log('🔬 FEATURES:');
        console.log('   • Entity-based targeting (conceptUri)');
        console.log('   • Title-based deduplication');
        console.log('   • 3-day period collection');
        console.log('   • Automatic duplicate prevention');
        console.log('');

        // Parse command line arguments
        const args = process.argv.slice(2);
        const mode = args.find(arg => ['1', '5', 'year', 'full'].includes(arg)) || '1';
        const execute = args.includes('--execute');

        console.log(`📋 MODE: ${mode} period(s) | EXECUTE: ${execute ? 'YES' : 'PREVIEW'}`);
        console.log('');

        // Check what we've already collected
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
        console.log(`   💰 Estimated cost: ${periods.length * 5} tokens`);
        console.log('');

        if (!execute) {
            console.log('⚠️  PREVIEW MODE - Add --execute to run collection');
            console.log(`   Command: npx tsx src/scripts/smart-collection-entity.ts ${mode} --execute`);
            return;
        }

        // Execute collection
        await this.executeCollection(periods);
    }

    private async getAlreadyCollectedPeriods(): Promise<string[]> {
        try {
            const { data, error } = await this.supabase
                .from('articles')
                .select('published_at')
                .eq('data_source', 'newsapi_ai')
                .like('content_type', 'entity_smart_%')
                .order('published_at', { ascending: false });

            if (error) return [];

            const dates = data.map(a => a.published_at.split('T')[0]);
            return [...new Set(dates)].sort().reverse();

        } catch (error) {
            return [];
        }
    }

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

    private generateAllAvailablePeriods(): any[] {
        const periods: any[] = [];
        const startDate = new Date('2024-08-01'); // Changed from 2021 to Aug 2024
        const endDate = new Date('2025-08-31'); // Aug 2024 to Aug 2025 range

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
                    name: `Entity-Period-${periodNumber}`,
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

    private async executeCollection(periods: any[]): Promise<void> {
        console.log('🚀 EXECUTING ENTITY-BASED COLLECTION');
        console.log('─'.repeat(50));

        const results = {
            processedPeriods: 0,
            totalArticles: 0,
            relevantArticles: 0,
            deduplicatedArticles: 0,
            savedArticles: 0,
            tokensUsed: 0,
            errors: 0,
            startTime: new Date()
        };

        for (const period of periods) {
            console.log(`📅 Processing ${period.name} (${period.start} to ${period.end})`);

            try {
                // Collect articles using entity method
                const articles = await this.collectEntityArticles(period);
                console.log(`   📊 Collected: ${articles.length} articles`);

                // Apply deduplication by title
                const deduplicatedArticles = this.deduplicateByTitle(articles);
                console.log(`   🔄 After deduplication: ${deduplicatedArticles.length} articles (removed ${articles.length - deduplicatedArticles.length} duplicates)`);

                // Save to database
                const saveResults = await this.savePeriodToDatabase(deduplicatedArticles, period);
                console.log(`   💾 Saved: ${saveResults.inserted} new, ${saveResults.duplicates} URL duplicates`);

                results.processedPeriods++;
                results.totalArticles += articles.length;
                results.deduplicatedArticles += deduplicatedArticles.length;
                results.savedArticles += saveResults.inserted;
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
        console.log('🎉 ENTITY COLLECTION COMPLETE!');
        console.log(`   ⏱️  Time: ${Math.round(elapsed)} minutes`);
        console.log(`   📅 Periods: ${results.processedPeriods}/${periods.length}`);
        console.log(`   📊 Raw articles: ${results.totalArticles}`);
        console.log(`   🔄 After deduplication: ${results.deduplicatedArticles}`);
        console.log(`   💾 Saved to database: ${results.savedArticles}`);
        console.log(`   💰 Tokens used: ${results.tokensUsed}`);
        console.log(`   📈 Efficiency: ${Math.round(results.savedArticles / results.tokensUsed)} articles/token`);
        console.log(`   🎯 Deduplication rate: ${Math.round((results.totalArticles - results.deduplicatedArticles) / results.totalArticles * 100)}%`);
    }

    private async collectEntityArticles(period: any): Promise<any[]> {
        try {
            const articles = await this.newsService.searchAppleByEntity({
                dateFrom: period.start,
                dateTo: period.end,
                sortBy: 'socialScore', // Best date distribution: 15 unique dates, 100/100 spread score
                pageSize: 25,
                sourceRankPercentile: 50 // Top 50% of sources
            });

            return articles;

        } catch (error: any) {
            console.log(`   ❌ Entity collection failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Deduplicate articles by title similarity
     * Removes articles with identical or very similar titles
     */
    private deduplicateByTitle(articles: any[]): any[] {
        const uniqueArticles: any[] = [];
        const seenTitles = new Set<string>();

        for (const article of articles) {
            const title = (article.title || '').toLowerCase().trim();

            // Skip if no title
            if (!title) continue;

            // Normalize title for comparison
            const normalizedTitle = this.normalizeTitle(title);

            // Check if we've seen this title or a very similar one
            let isDuplicate = false;
            for (const seenTitle of seenTitles) {
                if (this.areTitlesSimilar(normalizedTitle, seenTitle)) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                uniqueArticles.push(article);
                seenTitles.add(normalizedTitle);
            }
        }

        return uniqueArticles;
    }

    /**
     * Normalize title for comparison
     */
    private normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .substring(0, 100); // First 100 chars for comparison
    }

    /**
     * Check if two titles are similar enough to be considered duplicates
     */
    private areTitlesSimilar(title1: string, title2: string): boolean {
        // Exact match
        if (title1 === title2) return true;

        // Calculate similarity ratio
        const similarity = this.calculateSimilarity(title1, title2);
        return similarity > 0.85; // 85% similarity threshold
    }

    /**
     * Calculate similarity between two strings using Jaccard similarity
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const words1 = new Set(str1.split(' '));
        const words2 = new Set(str2.split(' '));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    private async savePeriodToDatabase(articles: any[], period: any): Promise<any> {
        let inserted = 0;
        let duplicates = 0;

        for (const article of articles) {
            try {
                // Check for URL duplicates
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
                    external_id: article.external_id || `entity_smart_${Date.now()}_${Math.random()}`,
                    external_id_type: 'newsapi_ai_entity_smart',
                    title: article.title?.substring(0, 500) || 'No Title',
                    url: article.url,
                    published_at: article.published_at,
                    source: article.source,
                    article_description: article.body?.substring(0, 1000),
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai',
                    content_type: `entity_smart_${period.number}`,
                    apple_relevance_score: 0.95, // High confidence from entity targeting
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('articles')
                    .insert(transformedArticle);

                if (!error) {
                    inserted++;
                } else {
                    console.log(`     ⚠️  Save error: ${error.message}`);
                }

            } catch (error: any) {
                console.log(`     ❌ Error: ${error.message}`);
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
        const collector = new SmartEntityCollector();
        await collector.runCollection();

    } catch (error: any) {
        console.error('❌ Smart entity collection failed:', error.message);
    }
}

console.log('🎯 SMART ENTITY-BASED COLLECTION WITH DEDUPLICATION');
console.log('Usage: npx tsx src/scripts/smart-collection-entity.ts [1|5|year|full] [--execute]');
console.log('');
console.log('Examples:');
console.log('  npx tsx src/scripts/smart-collection-entity.ts 1          # Preview 1 new period');
console.log('  npx tsx src/scripts/smart-collection-entity.ts 5 --execute # Collect 5 new periods');
console.log('  npx tsx src/scripts/smart-collection-entity.ts year --execute # Collect 1 year');
console.log('');
console.log('Features:');
console.log('  • Entity-based targeting (conceptUri for Apple Inc.)');
console.log('  • Title-based deduplication (removes same story from multiple sources)');
console.log('  • Automatic duplicate prevention');
console.log('  • 3-day period collection strategy');
console.log('');

main();
