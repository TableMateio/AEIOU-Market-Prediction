#!/usr/bin/env npx tsx

/**
 * Production Historical Collection System
 * Designed for NewsAPI.ai 5K Plan ($90/month) with smart diversity and deduplication
 */

import { config } from 'dotenv';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

config();

interface Article {
    title: string;
    body: string | null;
    url: string;
    source: string;
    published_at: string;
    external_id: string;
    keywords: string[];
    category: string | null;
    search_query: string;
    collection_year: number;
    collection_batch: string;
}

interface CollectionBatch {
    id: string;
    year: number;
    query: string;
    dateStart: string;
    dateEnd: string;
    expectedArticles: number;
    priority: 'high' | 'medium' | 'low';
}

class ProductionHistoricalCollector {
    private newsApiKey: string;
    private gnewsKey: string;
    private collectedUrls: Set<string> = new Set();
    private totalTokensUsed = 0;
    private monthlyTokenLimit = 5000;
    private articlesCollected = 0;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
        this.gnewsKey = process.env.GNEWS_API_KEY || '';
        
        if (!this.newsApiKey) {
            throw new Error('NEWSAPIAI_API_KEY required for production collection');
        }
    }

    /**
     * Generate comprehensive collection batches for 5 years
     */
    generateCollectionBatches(): CollectionBatch[] {
        const batches: CollectionBatch[] = [];
        const currentYear = new Date().getFullYear();
        
        // Smart search queries with strategic focus
        const smartQueries = [
            // High-frequency, high-impact queries
            { query: 'Apple earnings quarterly results', weight: 3, category: 'earnings' },
            { query: 'Apple iPhone sales revenue', weight: 3, category: 'product' },
            { query: 'Apple stock AAPL price target', weight: 2, category: 'analyst' },
            { query: 'Apple China market share', weight: 2, category: 'geographic' },
            
            // Medium-frequency strategic queries  
            { query: 'Apple services App Store revenue', weight: 2, category: 'services' },
            { query: 'Apple Mac MacBook sales', weight: 1, category: 'product' },
            { query: 'Apple Watch health wearables', weight: 1, category: 'product' },
            { query: 'Apple AI artificial intelligence', weight: 2, category: 'technology' },
            { query: 'Apple supply chain manufacturing', weight: 1, category: 'operations' },
            
            // Lower-frequency but important queries
            { query: 'Apple antitrust regulation privacy', weight: 1, category: 'regulatory' },
            { query: 'Apple acquisition merger investment', weight: 1, category: 'corporate' },
            { query: 'Apple Tim Cook CEO leadership', weight: 1, category: 'leadership' },
            { query: 'Apple dividend buyback capital', weight: 1, category: 'financial' },
            { query: 'Apple competition Samsung Google', weight: 1, category: 'competitive' },
            { query: 'Apple innovation research development', weight: 1, category: 'innovation' }
        ];

        // Distribute across 5 years with strategic weighting
        const yearlyTokens = {
            [currentYear - 1]: 1200, // Most recent - highest priority
            [currentYear - 2]: 1000, // Recent trends
            [currentYear - 3]: 800,  // Pre-pandemic baseline
            [currentYear - 4]: 600,  // Historical context
            [currentYear - 5]: 400   // Long-term baseline
        };

        for (const [year, tokens] of Object.entries(yearlyTokens)) {
            const yearNum = parseInt(year);
            const availableSearches = Math.floor(tokens / 5); // 5 tokens per historical year
            
            // Distribute searches across smart queries based on weight
            const totalWeight = smartQueries.reduce((sum, q) => sum + q.weight, 0);
            
            for (const queryObj of smartQueries) {
                const searchesForQuery = Math.floor((queryObj.weight / totalWeight) * availableSearches);
                
                if (searchesForQuery > 0) {
                    // Create time-distributed batches for this query/year combination
                    const timeRanges = this.generateTimeRanges(yearNum, searchesForQuery);
                    
                    for (const [index, timeRange] of timeRanges.entries()) {
                        batches.push({
                            id: `${yearNum}_${queryObj.category}_${index + 1}`,
                            year: yearNum,
                            query: queryObj.query,
                            dateStart: timeRange.start,
                            dateEnd: timeRange.end,
                            expectedArticles: 75, // Conservative estimate per search
                            priority: this.getPriorityForYear(yearNum)
                        });
                    }
                }
            }
        }

        // Sort batches by priority and year (most recent first)
        return batches.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return b.year - a.year;
        });
    }

    /**
     * Generate strategic time ranges for a year
     */
    private generateTimeRanges(year: number, searchCount: number): { start: string; end: string }[] {
        const ranges: { start: string; end: string }[] = [];
        
        // Strategic periods throughout the year
        const keyPeriods = [
            { month: 1, name: 'Q1_earnings', priority: 'high' },
            { month: 3, name: 'Q1_guidance', priority: 'medium' },
            { month: 4, name: 'Q2_earnings', priority: 'high' },
            { month: 6, name: 'WWDC_season', priority: 'high' },
            { month: 7, name: 'Q3_earnings', priority: 'high' },
            { month: 9, name: 'iPhone_event', priority: 'high' },
            { month: 10, name: 'Q4_earnings', priority: 'high' },
            { month: 11, name: 'holiday_prep', priority: 'medium' },
            { month: 12, name: 'year_end', priority: 'low' }
        ];

        // Distribute searches across key periods
        const searchesPerPeriod = Math.ceil(searchCount / keyPeriods.length);
        
        for (let i = 0; i < searchCount; i++) {
            const periodIndex = i % keyPeriods.length;
            const period = keyPeriods[periodIndex];
            const searchInPeriod = Math.floor(i / keyPeriods.length);
            
            // Create 5-7 day ranges within each period
            const startDay = 1 + (searchInPeriod * 7);
            const endDay = Math.min(startDay + 6, this.getDaysInMonth(year, period.month));
            
            const startDate = new Date(year, period.month - 1, startDay);
            const endDate = new Date(year, period.month - 1, endDay);
            
            ranges.push({
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            });
        }
        
        return ranges;
    }

    /**
     * Execute collection for a single batch
     */
    async collectBatch(batch: CollectionBatch): Promise<Article[]> {
        console.log(`📰 Collecting batch: ${batch.id}`);
        console.log(`   Query: "${batch.query}"`);
        console.log(`   Period: ${batch.dateStart} to ${batch.dateEnd}`);
        
        try {
            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: batch.query,
                    lang: 'eng',
                    dateStart: batch.dateStart,
                    dateEnd: batch.dateEnd,
                    articlesSortBy: 'relevance',
                    includeArticleBody: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    articlesCount: 100, // Max per search
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];
            const totalAvailable = response.data?.articles?.totalResults || 0;
            
            console.log(`   📊 Found: ${articles.length} articles (${totalAvailable} total available)`);
            
            // Track token usage
            this.totalTokensUsed += 5; // 5 tokens per historical year
            
            // Convert and deduplicate articles
            const convertedArticles = this.convertArticles(articles, batch);
            const deduplicatedArticles = this.deduplicateArticles(convertedArticles);
            
            console.log(`   ✅ Collected: ${deduplicatedArticles.length} unique articles`);
            console.log(`   🔄 Tokens used: ${this.totalTokensUsed}/${this.monthlyTokenLimit}`);
            
            this.articlesCollected += deduplicatedArticles.length;
            
            return deduplicatedArticles;
            
        } catch (error: any) {
            console.log(`   ❌ Failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Convert raw articles to standard format with deduplication tracking
     */
    private convertArticles(rawArticles: any[], batch: CollectionBatch): Article[] {
        return rawArticles.map(article => ({
            title: article.title || 'No title',
            body: article.body || null,
            url: article.url || '',
            source: article.source?.title || 'Unknown',
            published_at: new Date(article.date || article.dateTime).toISOString(),
            external_id: article.uri || article.url || '',
            keywords: this.extractKeywords(article),
            category: this.extractCategory(article),
            search_query: batch.query,
            collection_year: batch.year,
            collection_batch: batch.id
        }));
    }

    /**
     * Deduplicate articles based on URL and title similarity
     */
    private deduplicateArticles(articles: Article[]): Article[] {
        const unique: Article[] = [];
        
        for (const article of articles) {
            // Skip if URL already collected
            if (this.collectedUrls.has(article.url)) {
                continue;
            }
            
            // Skip if very similar title already exists
            const titleWords = article.title.toLowerCase().split(' ').filter(w => w.length > 3);
            const isDuplicate = unique.some(existing => {
                const existingWords = existing.title.toLowerCase().split(' ').filter(w => w.length > 3);
                const commonWords = titleWords.filter(w => existingWords.includes(w));
                return commonWords.length / Math.max(titleWords.length, existingWords.length) > 0.7;
            });
            
            if (!isDuplicate) {
                unique.push(article);
                this.collectedUrls.add(article.url);
            }
        }
        
        return unique;
    }

    /**
     * Execute production collection with progress tracking
     */
    async executeProductionCollection(maxBatches: number = 50): Promise<void> {
        console.log('🚀 Starting Production Historical Collection');
        console.log('='.repeat(70));
        console.log(`Target: ${maxBatches} batches across 5 years`);
        console.log(`Monthly limit: ${this.monthlyTokenLimit} tokens`);
        console.log('');

        const batches = this.generateCollectionBatches().slice(0, maxBatches);
        const allArticles: Article[] = [];
        
        console.log('📋 Collection Plan:');
        const batchesByYear = batches.reduce((acc, batch) => {
            acc[batch.year] = (acc[batch.year] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);
        
        Object.entries(batchesByYear).forEach(([year, count]) => {
            console.log(`   ${year}: ${count} batches`);
        });
        console.log('');

        // Execute collection in batches
        for (const [index, batch] of batches.entries()) {
            if (this.totalTokensUsed >= this.monthlyTokenLimit) {
                console.log('⚠️ Monthly token limit reached. Stopping collection.');
                break;
            }
            
            console.log(`\n[${index + 1}/${batches.length}] Processing batch: ${batch.id}`);
            
            const batchArticles = await this.collectBatch(batch);
            allArticles.push(...batchArticles);
            
            // Progress update every 10 batches
            if ((index + 1) % 10 === 0) {
                console.log(`\n📊 Progress Update:`);
                console.log(`   Batches processed: ${index + 1}/${batches.length}`);
                console.log(`   Articles collected: ${this.articlesCollected}`);
                console.log(`   Tokens used: ${this.totalTokensUsed}/${this.monthlyTokenLimit}`);
                console.log(`   Unique URLs: ${this.collectedUrls.size}`);
            }
            
            // Rate limiting - 1 request per 2 seconds
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Save results
        await this.saveResults(allArticles);
        
        // Final summary
        console.log('\n🎉 Production Collection Complete!');
        console.log('='.repeat(70));
        console.log(`Total articles collected: ${allArticles.length}`);
        console.log(`Total tokens used: ${this.totalTokensUsed}/${this.monthlyTokenLimit}`);
        console.log(`Unique URLs tracked: ${this.collectedUrls.size}`);
        console.log(`Time period covered: 5 years (2020-2024)`);
        
        // Quality analysis
        this.analyzeCollectionQuality(allArticles);
    }

    /**
     * Save collection results to JSON files
     */
    private async saveResults(articles: Article[]): Promise<void> {
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `historical_collection_${timestamp}.json`;
        const filepath = path.join(process.cwd(), 'data', filename);
        
        try {
            // Ensure data directory exists
            await fs.mkdir(path.dirname(filepath), { recursive: true });
            
            // Save articles
            await fs.writeFile(filepath, JSON.stringify(articles, null, 2));
            console.log(`\n💾 Results saved to: ${filepath}`);
            
            // Save collection metadata
            const metadata = {
                collection_date: new Date().toISOString(),
                total_articles: articles.length,
                tokens_used: this.totalTokensUsed,
                unique_urls: this.collectedUrls.size,
                years_covered: [...new Set(articles.map(a => a.collection_year))].sort(),
                search_queries: [...new Set(articles.map(a => a.search_query))],
                sources: [...new Set(articles.map(a => a.source))].slice(0, 20)
            };
            
            const metadataPath = filepath.replace('.json', '_metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`📋 Metadata saved to: ${metadataPath}`);
            
        } catch (error: any) {
            console.log(`❌ Failed to save results: ${error.message}`);
        }
    }

    /**
     * Analyze collection quality and diversity
     */
    private analyzeCollectionQuality(articles: Article[]): void {
        console.log('\n📊 Collection Quality Analysis:');
        
        // Content quality
        const fullContent = articles.filter(a => a.body && a.body.length > 500);
        console.log(`   Full content rate: ${fullContent.length}/${articles.length} (${Math.round((fullContent.length/articles.length)*100)}%)`);
        
        // Temporal distribution
        const byYear = articles.reduce((acc, a) => {
            acc[a.collection_year] = (acc[a.collection_year] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);
        
        console.log(`   Temporal distribution:`);
        Object.entries(byYear).sort().forEach(([year, count]) => {
            console.log(`     ${year}: ${count} articles`);
        });
        
        // Source diversity
        const sources = [...new Set(articles.map(a => a.source))];
        console.log(`   Source diversity: ${sources.length} unique sources`);
        
        // Query diversity
        const queries = [...new Set(articles.map(a => a.search_query))];
        console.log(`   Query diversity: ${queries.length} unique search queries`);
        
        // Average content length
        const avgLength = fullContent.reduce((sum, a) => sum + (a.body?.length || 0), 0) / fullContent.length;
        console.log(`   Average content length: ${Math.round(avgLength)} characters`);
    }

    // Helper methods
    private getPriorityForYear(year: number): 'high' | 'medium' | 'low' {
        const currentYear = new Date().getFullYear();
        const yearsBack = currentYear - year;
        if (yearsBack <= 2) return 'high';
        if (yearsBack <= 4) return 'medium';
        return 'low';
    }

    private getDaysInMonth(year: number, month: number): number {
        return new Date(year, month, 0).getDate();
    }

    private extractKeywords(article: any): string[] {
        const keywords: string[] = [];
        if (article.concepts) {
            keywords.push(...article.concepts.map((c: any) => c.label).filter(Boolean));
        }
        if (article.categories) {
            keywords.push(...article.categories.map((c: any) => c.label).filter(Boolean));
        }
        return keywords.slice(0, 10);
    }

    private extractCategory(article: any): string | null {
        if (article.categories && article.categories.length > 0) {
            return article.categories[0].label || null;
        }
        return null;
    }
}

// Main execution
async function main() {
    try {
        const collector = new ProductionHistoricalCollector();
        
        console.log('⚠️  PRODUCTION COLLECTION SYSTEM');
        console.log('   This will use your paid NewsAPI.ai tokens!');
        console.log('   Estimated cost: ~$90/month for full collection');
        console.log('');
        console.log('   To proceed with test collection (10 batches):');
        console.log('   Run: npx tsx src/scripts/production-historical-collection.ts test');
        console.log('');
        console.log('   To proceed with full collection (200+ batches):');
        console.log('   Run: npx tsx src/scripts/production-historical-collection.ts full');
        
        const mode = process.argv[2];
        
        if (mode === 'test') {
            console.log('🧪 Running test collection (10 batches)...\n');
            await collector.executeProductionCollection(10);
        } else if (mode === 'full') {
            console.log('🚀 Running full collection (200+ batches)...\n');
            await collector.executeProductionCollection(200);
        } else {
            console.log('💡 Add "test" or "full" argument to proceed.');
        }
        
    } catch (error: any) {
        console.error('❌ Collection failed:', error.message);
    }
}

main();
