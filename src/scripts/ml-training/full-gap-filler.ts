#!/usr/bin/env npx tsx

/**
 * Full Gap Filler - Process ALL missing articles across the entire dataset
 * 
 * Fills all 931 missing stock data gaps for complete ML training data
 * Gets all missing stock data: 1-day, 1-week, and other empty rows
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { StockDataLookupService } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FullGapFiller');

interface MissingArticle {
    id: string;
    published_at: string;
    title: string;
}

class FullGapFiller {
    private supabase: SupabaseClient;
    private stockLookupService: StockDataLookupService;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.stockLookupService = new StockDataLookupService();
    }

    /**
     * Get all missing articles using MCP SQL query (we know this works)
     */
    async getAllMissingArticles(): Promise<MissingArticle[]> {
        logger.info('🔍 Finding ALL articles missing stock data...');

        // We'll get them from MCP since we know the exact query works
        try {
            // Use the same approach as our test but get ALL missing articles
            const { data: allArticles, error } = await this.supabase
                .from('articles')
                .select('id, published_at, title')
                .gte('published_at', '2024-07-02')
                .lte('published_at', '2025-09-03')
                .order('published_at');

            if (error) throw error;

            if (!allArticles || allArticles.length === 0) {
                logger.info('No articles found in range');
                return [];
            }

            logger.info(`📊 Checking ${allArticles.length} articles for missing stock data...`);

            const missingArticles: MissingArticle[] = [];
            const batchSize = 100;

            // Process in batches to avoid overwhelming the database
            for (let i = 0; i < allArticles.length; i += batchSize) {
                const batch = allArticles.slice(i, i + batchSize);

                for (const article of batch) {
                    // Truncate to minute precision like our SQL
                    const publishedTime = new Date(article.published_at);
                    publishedTime.setSeconds(0, 0);
                    const truncatedTimestamp = publishedTime.toISOString();

                    const { data: stockData } = await this.supabase
                        .from('stock_prices')
                        .select('timestamp')
                        .eq('ticker', 'AAPL')
                        .eq('timestamp', truncatedTimestamp)
                        .limit(1);

                    if (!stockData || stockData.length === 0) {
                        missingArticles.push({
                            id: article.id,
                            published_at: article.published_at,
                            title: article.title
                        });
                    }
                }

                // Progress logging
                logger.info(`📈 Progress: ${Math.min(i + batchSize, allArticles.length)}/${allArticles.length} articles checked`);

                // Small delay between batches
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            logger.info(`📊 Found ${missingArticles.length} articles missing stock data`);
            return missingArticles;

        } catch (error: any) {
            logger.error('Error finding missing articles:', error.message);
            return [];
        }
    }

    /**
     * Process all missing articles in manageable batches
     */
    async processAllMissingArticles(missingArticles: MissingArticle[]): Promise<{
        successful: number;
        failed: number;
        strategies: Record<string, number>;
        totalProcessed: number;
    }> {
        logger.info(`🔧 Processing ALL ${missingArticles.length} missing articles...`);

        const result = {
            successful: 0,
            failed: 0,
            strategies: {} as Record<string, number>,
            totalProcessed: 0
        };

        const processingBatchSize = 50; // Process 50 articles at a time
        const insertBatchSize = 100;   // Insert 100 stock records at a time
        let stockRecordsBuffer: any[] = [];

        for (let i = 0; i < missingArticles.length; i += processingBatchSize) {
            const batch = missingArticles.slice(i, i + processingBatchSize);

            logger.info(`📊 Processing batch ${Math.floor(i / processingBatchSize) + 1}/${Math.ceil(missingArticles.length / processingBatchSize)}`);
            logger.info(`   Articles in batch: ${batch.length}`);

            for (const article of batch) {
                try {
                    const articleTime = new Date(article.published_at);
                    const strategy = MarketHoursService.getStockDataStrategy(articleTime);

                    // Get ML stock data using our lookup service
                    const mlStockData = await this.stockLookupService.getMLStockData(articleTime, 'AAPL');

                    if (mlStockData) {
                        // Create stock record for the exact article timestamp (truncated to minute)
                        const truncatedTime = new Date(articleTime);
                        truncatedTime.setSeconds(0, 0);

                        const stockRecord = {
                            ticker: 'AAPL',
                            timestamp: truncatedTime.toISOString(),
                            open: mlStockData.price_at_event,
                            high: mlStockData.price_at_event,
                            low: mlStockData.price_at_event,
                            close: mlStockData.price_at_event,
                            volume: 0, // Interpolated data has no volume
                            timeframe: '1Min',
                            source: `interpolated_${strategy.strategy}`,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        stockRecordsBuffer.push(stockRecord);
                        result.successful++;

                        // Track strategy usage
                        result.strategies[strategy.strategy] = (result.strategies[strategy.strategy] || 0) + 1;

                        logger.debug(`✅ ${article.id}: ${strategy.strategy} → $${mlStockData.price_at_event.toFixed(2)}`);

                        // Insert batch if buffer is full
                        if (stockRecordsBuffer.length >= insertBatchSize) {
                            await this.insertStockRecordsBatch(stockRecordsBuffer);
                            stockRecordsBuffer = [];
                        }

                    } else {
                        result.failed++;
                        logger.warn(`❌ ${article.id}: Could not find stock data`);
                    }

                    result.totalProcessed++;

                } catch (error: any) {
                    result.failed++;
                    result.totalProcessed++;
                    logger.error(`❌ ${article.id}: Error - ${error.message}`);
                }
            }

            // Progress update
            const processed = Math.min(i + processingBatchSize, missingArticles.length);
            logger.info(`📈 Batch complete: ${processed}/${missingArticles.length} articles processed`);
            logger.info(`   Success: ${result.successful}, Failed: ${result.failed}`);

            // Small delay between processing batches
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Insert any remaining stock records
        if (stockRecordsBuffer.length > 0) {
            await this.insertStockRecordsBatch(stockRecordsBuffer);
        }

        return result;
    }

    /**
     * Insert stock records in batches
     */
    private async insertStockRecordsBatch(stockRecords: any[]): Promise<void> {
        if (stockRecords.length === 0) return;

        try {
            const { error } = await this.supabase
                .from('stock_prices')
                .upsert(stockRecords, {
                    onConflict: 'ticker,timestamp,timeframe,source',
                    ignoreDuplicates: false // Overwrite existing interpolated data
                });

            if (error) {
                logger.error('Error inserting stock data batch:', error);
                throw error;
            }

            logger.info(`💾 Inserted ${stockRecords.length} stock price records`);

        } catch (error: any) {
            logger.error('Error inserting stock records:', error.message);
            throw error;
        }
    }

    /**
     * Verify final completion status
     */
    async verifyFinalResults(): Promise<{
        totalArticles: number;
        remainingMissing: number;
        completionPercentage: number;
        interpolatedRecords: number;
    }> {
        logger.info('🔍 Verifying final results...');

        try {
            // Count total articles
            const { count: totalArticles } = await this.supabase
                .from('articles')
                .select('id', { count: 'exact' })
                .gte('published_at', '2024-07-02')
                .lte('published_at', '2025-09-03');

            // Count remaining missing using the same logic
            const { data: allArticles } = await this.supabase
                .from('articles')
                .select('id, published_at')
                .gte('published_at', '2024-07-02')
                .lte('published_at', '2025-09-03');

            let remainingMissing = 0;

            if (allArticles) {
                // Sample check (check every 10th article to avoid overwhelming the system)
                const sampleSize = Math.min(200, allArticles.length);
                const step = Math.floor(allArticles.length / sampleSize);

                for (let i = 0; i < allArticles.length; i += step) {
                    const article = allArticles[i];
                    const publishedTime = new Date(article.published_at);
                    publishedTime.setSeconds(0, 0);

                    const { data: stockData } = await this.supabase
                        .from('stock_prices')
                        .select('timestamp')
                        .eq('ticker', 'AAPL')
                        .eq('timestamp', publishedTime.toISOString())
                        .limit(1);

                    if (!stockData || stockData.length === 0) {
                        remainingMissing++;
                    }
                }

                // Scale up the sample to estimate total missing
                remainingMissing = Math.round(remainingMissing * (allArticles.length / sampleSize));
            }

            // Count interpolated records
            const { count: interpolatedRecords } = await this.supabase
                .from('stock_prices')
                .select('id', { count: 'exact' })
                .like('source', 'interpolated_%');

            const completionPercentage = totalArticles ? ((totalArticles - remainingMissing) / totalArticles) * 100 : 0;

            return {
                totalArticles: totalArticles || 0,
                remainingMissing,
                completionPercentage,
                interpolatedRecords: interpolatedRecords || 0
            };

        } catch (error: any) {
            logger.error('Error verifying results:', error.message);
            return {
                totalArticles: 0,
                remainingMissing: 0,
                completionPercentage: 0,
                interpolatedRecords: 0
            };
        }
    }

    /**
     * Main execution function
     */
    async execute(): Promise<void> {
        logger.info('🎯 STARTING FULL GAP FILLER');
        logger.info('=' * 60);
        logger.info('📅 Processing ALL missing articles from July 2024 - September 2025');

        const startTime = Date.now();

        try {
            // Step 1: Find all missing articles
            const missingArticles = await this.getAllMissingArticles();

            if (missingArticles.length === 0) {
                logger.info('✅ No gaps found! All articles have stock data.');
                return;
            }

            // Step 2: Analyze patterns
            logger.info('\n📊 PATTERN ANALYSIS:');
            const patterns = { weekend: 0, afterHours: 0, marketHours: 0, holiday: 0, extendedHours: 0 };

            for (const article of missingArticles.slice(0, 100)) { // Sample first 100 for analysis
                const session = MarketHoursService.analyzeMarketSession(new Date(article.published_at));
                if (session.isWeekend) patterns.weekend++;
                else if (session.isHoliday) patterns.holiday++;
                else if (session.isMarketOpen) patterns.marketHours++;
                else if (session.isExtendedHours) patterns.extendedHours++;
                else patterns.afterHours++;
            }

            logger.info(`   Weekends: ${patterns.weekend}`);
            logger.info(`   After Hours: ${patterns.afterHours}`);
            logger.info(`   Market Hours: ${patterns.marketHours}`);
            logger.info(`   Extended Hours: ${patterns.extendedHours}`);
            logger.info(`   Holidays: ${patterns.holiday}`);

            // Step 3: Process all missing articles
            const processResult = await this.processAllMissingArticles(missingArticles);

            // Step 4: Verify final results
            const verification = await this.verifyFinalResults();

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000 / 60).toFixed(1); // minutes

            // Final comprehensive report
            logger.info('\n🎉 FULL GAP FILLING COMPLETE!');
            logger.info('=' * 60);
            logger.info(`⏱️  Total Runtime: ${duration} minutes`);
            logger.info(`📊 PROCESSING RESULTS:`);
            logger.info(`   Articles Found Missing: ${missingArticles.length}`);
            logger.info(`   Successfully Processed: ${processResult.successful}`);
            logger.info(`   Failed: ${processResult.failed}`);
            logger.info(`   Success Rate: ${((processResult.successful / missingArticles.length) * 100).toFixed(1)}%`);

            logger.info(`🎯 STRATEGIES USED:`);
            Object.entries(processResult.strategies).forEach(([strategy, count]) => {
                logger.info(`   ${strategy}: ${count}`);
            });

            logger.info(`✅ FINAL VERIFICATION:`);
            logger.info(`   Total Articles: ${verification.totalArticles}`);
            logger.info(`   Interpolated Records Created: ${verification.interpolatedRecords}`);
            logger.info(`   Estimated Remaining Missing: ${verification.remainingMissing}`);
            logger.info(`   Estimated Completion: ${verification.completionPercentage.toFixed(1)}%`);

            if (verification.completionPercentage >= 95) {
                logger.info('🎉 SUCCESS: ML training data is now complete!');
                logger.info('🚀 Ready for ML training with full stock data coverage!');
            } else {
                logger.warn(`⚠️  Estimated ${verification.remainingMissing} articles still missing stock data`);
                logger.info('💡 Consider running again or investigating remaining gaps');
            }

        } catch (error: any) {
            logger.error('❌ Full gap filling failed:', error.message);
            throw error;
        }
    }
}

// Run the full gap filler
if (require.main === module) {
    const gapFiller = new FullGapFiller();

    gapFiller.execute().catch(error => {
        console.error('❌ Full gap filling failed:', error.message);
        process.exit(1);
    });
}
