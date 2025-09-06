#!/usr/bin/env npx tsx

/**
 * Direct Supabase Gap Filler - Process ALL Missing Articles
 * 
 * Uses direct Supabase queries to find missing articles (no MCP dependency)
 * Processes them in batches using our proven gap-filling logic
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { StockDataLookupService } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DirectSupabaseGapFiller');

interface ArticleTimestamp {
    id: string;
    published_at: string;
    title: string;
}

class DirectSupabaseGapFiller {
    private supabase: any;
    private stockLookupService: StockDataLookupService;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        logger.info(`🔗 Connecting to Supabase: ${supabaseUrl.substring(0, 30)}...`);
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.stockLookupService = new StockDataLookupService();
    }

    /**
     * Get missing articles directly from Supabase using a LEFT JOIN approach
     */
    async getMissingArticles(batchSize: number = 100, offset: number = 0): Promise<ArticleTimestamp[]> {
        try {
            logger.info(`🔍 Querying Supabase for missing articles (batch ${Math.floor(offset / batchSize) + 1})...`);

            // Get all articles first
            const { data: articles, error: articlesError } = await this.supabase
                .from('articles')
                .select('id, published_at, title')
                .gte('published_at', '2024-07-01')
                .lte('published_at', '2025-02-10')
                .order('published_at')
                .range(offset, offset + batchSize - 1);

            if (articlesError) {
                logger.error('Error fetching articles:', articlesError);
                return [];
            }

            if (!articles || articles.length === 0) {
                logger.info('📭 No more articles found');
                return [];
            }

            logger.info(`📄 Found ${articles.length} articles, checking for missing stock data...`);

            // Check each article for missing stock data
            const missingArticles: ArticleTimestamp[] = [];

            for (const article of articles) {
                // Truncate to minute precision for stock lookup
                const publishedAt = new Date(article.published_at);
                publishedAt.setSeconds(0, 0);

                const { data: stockData, error: stockError } = await this.supabase
                    .from('stock_prices')
                    .select('timestamp')
                    .eq('ticker', 'AAPL')
                    .eq('timestamp', publishedAt.toISOString())
                    .limit(1);

                if (stockError) {
                    logger.warn(`⚠️  Error checking stock data for ${article.id}: ${stockError.message}`);
                    continue;
                }

                // If no stock data found, this article is missing
                if (!stockData || stockData.length === 0) {
                    missingArticles.push({
                        id: article.id,
                        published_at: article.published_at,
                        title: article.title
                    });
                }
            }

            logger.info(`🎯 Found ${missingArticles.length} articles with missing stock data in this batch`);
            return missingArticles;

        } catch (error: any) {
            logger.error(`❌ Error getting missing articles: ${error.message}`);
            return [];
        }
    }

    /**
     * Process a batch of missing articles (same logic as batch-gap-filler)
     */
    async processBatch(articles: ArticleTimestamp[]): Promise<{ successful: number; failed: number }> {
        if (articles.length === 0) {
            return { successful: 0, failed: 0 };
        }

        logger.info(`🔧 Processing batch of ${articles.length} missing articles...`);

        let successful = 0;
        let failed = 0;
        const stockRecordsToInsert: any[] = [];

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];

            try {
                const articleTime = new Date(article.published_at);
                const strategy = MarketHoursService.getStockDataStrategy(articleTime);

                logger.info(`📝 ${i + 1}/${articles.length}: ${article.title.substring(0, 60)}...`);
                logger.info(`   Published: ${article.published_at}`);
                logger.info(`   Strategy: ${strategy.strategy} - ${strategy.reasoning}`);

                // Get ML stock data using our proven service
                const mlData = await this.stockLookupService.getMLStockData(articleTime, 'AAPL');

                if (mlData) {
                    logger.info(`   ✅ Success: $${mlData.price_at_event.toFixed(2)} (${strategy.strategy})`);
                    logger.info(`   📊 1-day change: ${mlData.abs_change_1day_after_pct?.toFixed(2) || 'N/A'}%`);
                    logger.info(`   📊 1-week change: ${mlData.abs_change_1week_after_pct?.toFixed(2) || 'N/A'}%`);

                    // Create interpolated stock record
                    const articleMinute = new Date(articleTime);
                    articleMinute.setSeconds(0, 0);

                    const stockRecord = {
                        ticker: 'AAPL',
                        timestamp: articleMinute.toISOString(),
                        open: mlData.price_at_event,
                        high: mlData.price_at_event,
                        low: mlData.price_at_event,
                        close: mlData.price_at_event,
                        volume: 0,
                        source: `interpolated_${strategy.strategy}`,
                        timeframe: '1min'
                    };

                    stockRecordsToInsert.push(stockRecord);
                    successful++;
                } else {
                    logger.warn(`   ❌ Failed: Could not find stock data`);
                    failed++;
                }

            } catch (error: any) {
                logger.error(`   ❌ Error processing article: ${error.message}`);
                failed++;
            }

            // Progress update every 10 articles for smaller batches
            if ((i + 1) % 10 === 0) {
                logger.info(`📈 Progress: ${i + 1}/${articles.length} articles processed`);
                logger.info(`   Success: ${successful}, Failed: ${failed}`);
            }
        }

        // Insert stock records
        if (stockRecordsToInsert.length > 0) {
            await this.insertStockRecords(stockRecordsToInsert);
        }

        return { successful, failed };
    }

    /**
     * Remove duplicate records based on unique constraint
     */
    private removeDuplicateRecords(records: any[]): any[] {
        const seen = new Set<string>();
        return records.filter(record => {
            const key = `${record.ticker}-${record.timestamp}-${record.timeframe}-${record.source}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Insert stock records into Supabase
     */
    private async insertStockRecords(stockRecords: any[]): Promise<void> {
        // Remove duplicates from stockRecords before insert
        const uniqueRecords = this.removeDuplicateRecords(stockRecords);
        logger.info(`💾 Inserting ${uniqueRecords.length} unique stock price records (${stockRecords.length - uniqueRecords.length} duplicates removed)...`);

        try {
            const { error } = await this.supabase
                .from('stock_prices')
                .upsert(uniqueRecords, {
                    onConflict: 'ticker,timestamp,timeframe,source',
                    ignoreDuplicates: false // Overwrite existing interpolated data
                });

            if (error) {
                logger.error('Error inserting stock records:', error);
                throw error;
            }

            logger.info(`✅ Successfully inserted ${uniqueRecords.length} stock price records`);

        } catch (error: any) {
            logger.error('Error inserting stock records:', error.message);
            throw error;
        }
    }

    /**
     * Main execution function - process all missing articles in batches
     */
    async execute(): Promise<void> {
        logger.info('🚀 STARTING DIRECT SUPABASE GAP FILLER');
        logger.info('=' * 80);
        logger.info('📋 Using direct Supabase queries (no MCP dependency)');

        const startTime = Date.now();
        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let offset = 0;
        const batchSize = 50; // Smaller batches to avoid timeout issues
        let batchNumber = 1;

        try {
            while (true) {
                logger.info(`\n🔄 BATCH ${batchNumber} - Processing articles ${offset + 1} to ${offset + batchSize}...`);

                // Get missing articles for this batch
                const missingArticles = await this.getMissingArticles(batchSize, offset);

                if (missingArticles.length === 0) {
                    logger.info('📭 No more missing articles found. Processing complete!');
                    break;
                }

                logger.info(`📊 Found ${missingArticles.length} missing articles in this batch`);

                // Process the missing articles
                const result = await this.processBatch(missingArticles);
                totalProcessed += missingArticles.length;
                totalSuccessful += result.successful;
                totalFailed += result.failed;

                logger.info(`✅ Batch ${batchNumber} complete: ${result.successful} success, ${result.failed} failed`);

                // Update offset for next batch (but only advance by articles we actually checked)
                offset += batchSize;
                batchNumber++;

                // Add a small delay between batches to avoid overwhelming the database
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Safety check - don't run forever
                if (batchNumber > 50) {
                    logger.warn('⚠️  Safety limit reached (50 batches). Stopping to prevent runaway execution.');
                    break;
                }
            }

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            logger.info('\n🎉 DIRECT SUPABASE GAP FILLING COMPLETE!');
            logger.info('=' * 80);
            logger.info(`⏱️  Total Runtime: ${duration} seconds`);
            logger.info(`📊 FINAL RESULTS:`);
            logger.info(`   Total Batches Processed: ${batchNumber - 1}`);
            logger.info(`   Total Articles with Missing Data: ${totalProcessed}`);
            logger.info(`   Total Successfully Filled: ${totalSuccessful}`);
            logger.info(`   Total Failed: ${totalFailed}`);
            logger.info(`   Overall Success Rate: ${totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0}%`);

            logger.info('\n🚀 SUCCESS! Direct Supabase gap filling completed.');
            logger.info('📈 Your ML training dataset now has significantly improved stock price coverage!');

        } catch (error: any) {
            logger.error(`❌ Direct Supabase gap filling failed: ${error.message}`);
            throw error;
        }
    }
}

// Run the direct Supabase processing
async function main() {
    const processor = new DirectSupabaseGapFiller();
    await processor.execute();
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
