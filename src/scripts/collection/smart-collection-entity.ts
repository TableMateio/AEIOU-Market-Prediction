#!/usr/bin/env npx tsx

/**
 * Smart Collection Script - Entity-Based with Deduplication
 * Uses conceptUri approach for precise Apple Inc. targeting
 * Includes title-based deduplication to avoid same story from multiple sources
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../../config/app';
import { newsServiceFactory } from '../../services/newsServiceFactory';

class SmartEntityCollector {
    private supabase: any;
    private newsService: any; // Will use newsServiceFactory

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
        this.newsService = newsServiceFactory.getCurrentService();
    }

    async runCollection(): Promise<void> {
        console.log('🎯 SMART ENTITY-BASED COLLECTION');
        console.log('='.repeat(60));
        console.log('');

        console.log('🔬 FEATURES:');
        console.log(`   • News Service: ${this.newsService.getServiceName()}`);
        console.log('   • Dual strategy (financial + business events)');
        console.log('   • Premium filtering (food/drink exclusions)');
        console.log('   • Title-based deduplication');
        console.log('   • Daily collection (one request per weekday)');
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
        console.log(`   💰 Estimated cost: ${periods.length * 2} API requests (2 per day: financial + business)`);
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
                .eq('data_source', this.newsService.getServiceName())
                .like('content_type', 'entity_smart_%')
                .order('published_at', { ascending: false });

            if (error) return [];

            const dates = data.map(a => a.published_at.split('T')[0]);
            return [...new Set(dates)].sort().reverse();

        } catch (error) {
            return [];
        }
    }

    private isBusinessDay(date: Date): boolean {
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday=1 to Friday=5
    }

    private generatePeriods(mode: string, collectedPeriods: string[]): any[] {
        const allPeriods = this.generateAllAvailablePeriods();

        // Smart filtering: Remove already collected periods AND non-business days
        const newPeriods = allPeriods.filter(period => {
            const periodDates = this.getAllDaysInRange(period.start, period.end);

            // Check if any date in this period is already collected
            const alreadyCollected = periodDates.some(date => collectedPeriods.includes(date));
            if (alreadyCollected) {
                return false; // Skip this period
            }

            // Check if all dates are business days
            const allBusinessDays = periodDates.every(dateStr => {
                const date = new Date(dateStr);
                return this.isBusinessDay(date);
            });

            return allBusinessDays;
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
        const startDate = new Date('2024-08-01'); // Start from August 2024 (where finlight has full content)
        const endDate = new Date('2025-07-31'); // End at July 2025 (12 months of full content)

        // SAFETY CHECK: Never collect future dates!
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to beginning of today
        if (endDate > today) {
            endDate.setTime(today.getTime()); // Cap at today if July 2025 is in future
        }

        console.log(`🛡️  SAFETY CHECK: Collection will stop at ${endDate.toISOString().split('T')[0]} (today)`);
        console.log(`📅 DATE RANGE: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (finlight's data coverage)`);

        let current = new Date(startDate);
        let periodNumber = 1;

        while (current <= endDate) {
            const dayOfWeek = current.getDay();

            // ADDITIONAL SAFETY: Skip if date is in the future
            if (current > today) {
                console.log(`⚠️  SKIPPING FUTURE DATE: ${current.toISOString().split('T')[0]}`);
                break;
            }

            // Only collect on business days (Monday=1 to Friday=5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                const dateString = current.toISOString().split('T')[0];

                periods.push({
                    number: periodNumber,
                    name: `Daily-${dateString}`,
                    start: dateString,
                    end: dateString, // Same day for start and end
                    businessDays: [dateString], // Single day
                    totalDays: 1
                });
                periodNumber++;
            }

            // Move to next day
            current.setDate(current.getDate() + 1);
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
                if (saveResults.inserted > 0) {
                    console.log(`   💾 Saved: ${saveResults.inserted} NEW articles to database`);
                } else if (saveResults.duplicates > 0) {
                    console.log(`   💾 Skipped: ${saveResults.duplicates} articles (already in database)`);
                } else {
                    console.log(`   💾 No articles to save (none found or all filtered out)`);
                }

                results.processedPeriods++;
                results.totalArticles += articles.length;
                results.deduplicatedArticles += deduplicatedArticles.length;
                results.savedArticles += saveResults.inserted;
                results.tokensUsed += 2; // 2 API requests per day (financial + business)

                // Rate limiting - conservative for longer collections (finlight: 100 req/min)
                await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds between days

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
        console.log(`   💰 API requests used: ${results.tokensUsed}`);
        console.log(`   📈 Efficiency: ${Math.round(results.savedArticles / results.tokensUsed)} articles/token`);
        console.log(`   🎯 Deduplication rate: ${Math.round((results.totalArticles - results.deduplicatedArticles) / results.totalArticles * 100)}%`);
    }

    private async collectEntityArticles(period: any): Promise<any[]> {
        try {
            // DUAL STRATEGY: One request per type for this specific day
            // Let finlight handle sorting - we just request by exact date
            console.log(`   🎯 Collecting financial articles (ticker-based)...`);
            const financialArticles = await this.newsService.searchAppleArticles({
                dateFrom: period.start,
                dateTo: period.start, // Same day - single day request
                sortBy: 'financial',
                limit: 10, // 10 financial articles per day
                excludeTerms: []
            });

            // Brief pause between requests on same day
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log(`   🏢 Collecting business event articles (keyword-based)...`);
            const businessArticles = await this.newsService.searchAppleArticles({
                dateFrom: period.start,
                dateTo: period.start, // Same day - single day request  
                sortBy: 'business',
                limit: 10, // 10 business articles per day
                excludeTerms: []
            });

            // Combine and deduplicate by title
            const allArticles = [...financialArticles, ...businessArticles];
            const uniqueArticles = this.deduplicateByTitle(allArticles);

            console.log(`   📊 Financial: ${financialArticles.length}, Business: ${businessArticles.length}, Combined: ${uniqueArticles.length}`);
            return uniqueArticles;

        } catch (error: any) {
            console.log(`   ❌ Article collection failed: ${error.message}`);
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
                    data_source: this.newsService.getServiceName(),
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
