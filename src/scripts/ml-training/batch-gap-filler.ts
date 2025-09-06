#!/usr/bin/env npx tsx

/**
 * Batch Gap Filler - Process specific missing articles from MCP query
 * 
 * Processes the 50 missing articles we identified via MCP query
 * This approach avoids the Supabase client issues and works with known data
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { StockDataLookupService } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BatchGapFiller');

// First 20 missing articles from MCP query (test batch)
let MISSING_ARTICLES: ArticleTimestamp[] = [
    { id: "8d6aa9ed-e640-4e63-af25-bcb675aedfdc", published_at: "2024-08-15 08:55:00+00", title: "Interest Rates Are About to Do Something They Haven't Done Since March 2020, and It Could Trigger a Big Move in the Stock Market" },
    { id: "5540ad03-2d68-430f-bd9d-091741d8ff8a", published_at: "2024-09-12 10:28:03.95+00", title: "Apple back taxes hand Ireland infrastructure opportunities, PM Harris says" },
    { id: "7f54b9a0-2d30-47b7-b0df-36f64eb31d6d", published_at: "2024-09-13 09:39:21.932+00", title: "Samsung India strike puts spotlight on powerful Indian labour group" },
    { id: "3672c6a3-6a4c-4918-b7f0-bd5907a4f37b", published_at: "2024-09-17 21:45:12+00", title: "Here's every Messages feature that iOS 18 adds to your green bubble Android texts" },
    { id: "aaea85a1-5120-4517-bf33-96ca6ac2b9b5", published_at: "2024-09-18 08:31:00+00", title: "Prediction: This Unstoppable Vanguard ETF Will Beat the S&P 500 Again in 2025" },
    { id: "8b766c05-6893-4c4a-a26b-e254ca877f65", published_at: "2024-09-19 09:56:14.282+00", title: "EU antitrust regulators tell Apple how to comply with tech rules" },
    { id: "c294489d-1234-4212-84b9-3d55c16fe418", published_at: "2024-09-21 09:00:00+00", title: "The best laptop deals for September: Shop Apple, HP, Lenovo, and more" },
    { id: "aa0c87c5-3df1-429b-a908-69c2a28ce230", published_at: "2024-09-21 09:01:04+00", title: "The best cheap iPhone is about to disappear – buy one while you still can" },
    { id: "007705a7-3043-4f5f-ba07-ebcafe7f3780", published_at: "2024-09-21 09:08:09.586+00", title: "Low brow and vulgar? Micro dramas shake up China's film industry, aim for Hollywood" },
    { id: "123867d1-b493-42e3-9f9e-fa5a982b4be3", published_at: "2024-09-21 12:45:40+00", title: "I thought I'd love these two iOS 18 features, but I don't" },
    { id: "ec8e2677-3a9e-4add-be82-db939090527c", published_at: "2024-09-21 14:00:00+00", title: "iPhone 16 Pro Max vs iPhone 15 Pro Max: clash of the titans" },
    { id: "1e841c99-7082-4d9a-8991-7a1e82f2ead7", published_at: "2024-09-21 14:00:12+00", title: "The Best iPhone 16 Cases of 2024" },
    { id: "8d944752-aa2b-47d1-a70b-61b8eacb1a82", published_at: "2024-09-21 14:30:10+00", title: "The iPhone 16 is on shelves, but what is consumer demand indicating?" },
    { id: "bb99dadd-55e0-404a-9953-ee4cd8ea6da6", published_at: "2024-09-21 15:00:12+00", title: "The Best iPhone 16 Pro Max Cases" },
    { id: "cf768444-8b62-409b-9c5b-3f9a94d93119", published_at: "2024-09-24 08:26:00+00", title: "Warren Buffett Owns 1 Vanguard ETF That Could Soar 163%, According to a Top Wall Street Analyst" },
    { id: "4d36ba14-5584-4e9b-babb-9a420e68c4f7", published_at: "2024-09-25 22:45:35.723+00", title: "China's march to strong yuan is long and perilous" },
    { id: "d9da6215-1090-4c42-9453-e83f6beabb89", published_at: "2024-09-27 21:07:13+00", title: "Apple still AI winner despite iPhone 16 reception: Analyst" },
    { id: "03d9b777-e609-41b3-b472-badf70a37d18", published_at: "2024-09-28 08:00:00+00", title: "Apple Ring: all the rumors so far and what we want to see" },
    { id: "c0cad10a-ff1e-4176-aa1f-81e11a868293", published_at: "2024-09-28 09:00:00+00", title: "What is iPhone Mirroring? How to use Apple's best new software feature of the year" },
    { id: "e2fc2b90-0be3-451e-b5f8-4ceefbe7b2ea", published_at: "2024-09-28 11:30:52+00", title: "Goodbye, iPhone 15 Pro Max. Why did I barely know you?" }
];

interface MissingArticle {
    id: string;
    published_at: string;
    title: string;
}

class BatchGapFiller {
    private supabase: SupabaseClient;
    private stockLookupService: StockDataLookupService;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        logger.info(`🔧 Supabase URL: ${supabaseUrl ? 'Found' : 'Missing'}`);
        logger.info(`🔧 Supabase Key: ${supabaseKey ? 'Found' : 'Missing'}`);

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.stockLookupService = new StockDataLookupService();
    }

    /**
     * Fetch all articles missing stock data from database
     */
    async fetchMissingArticles(): Promise<void> {
        logger.info('📊 Fetching all articles missing stock data from database...');

        try {
            // Fetch all articles in the date range (adjust to match actual data range)
            logger.info('🔍 Fetching articles from Supabase...');
            const { data: articles, error: articlesError } = await this.supabase
                .from('articles')
                .select('id, published_at, title')
                .gte('published_at', '2024-07-02')
                .lte('published_at', '2025-09-03')
                .order('published_at');

            logger.info(`📊 Query result: ${articles?.length || 0} articles, Error: ${articlesError ? 'YES' : 'NO'}`);

            if (articlesError) {
                logger.error('Error fetching articles:', articlesError);
                throw articlesError;
            }

            if (!articles || articles.length === 0) {
                // Try a simpler query without date filters
                logger.info('🔍 Trying simpler query without date filters...');
                const { data: allArticles, error: allError } = await this.supabase
                    .from('articles')
                    .select('id, published_at, title')
                    .limit(5);

                logger.info(`📊 Simple query result: ${allArticles?.length || 0} articles, Error: ${allError ? 'YES' : 'NO'}`);

                if (allError) {
                    logger.error('Error with simple query:', allError);
                }

                logger.warn('No articles found in date range');
                MISSING_ARTICLES = [];
                return;
            }

            logger.info(`🔍 Checking ${articles.length} articles for missing stock data...`);
            const missingArticles: ArticleTimestamp[] = [];

            // Check in batches to avoid overwhelming the database
            const batchSize = 100;
            for (let i = 0; i < articles.length; i += batchSize) {
                const batch = articles.slice(i, i + batchSize);

                // Create array of timestamps to check
                const timestampsToCheck = batch.map(article => {
                    const publishedAt = new Date(article.published_at);
                    publishedAt.setSeconds(0, 0); // Truncate to minute
                    return publishedAt.toISOString();
                });

                // Batch check for existing stock data
                const { data: existingStock } = await this.supabase
                    .from('stock_prices')
                    .select('timestamp')
                    .eq('ticker', 'AAPL')
                    .in('timestamp', timestampsToCheck);

                const existingTimestamps = new Set(
                    (existingStock || []).map(row => row.timestamp)
                );

                // Find articles without stock data
                for (const article of batch) {
                    const publishedAt = new Date(article.published_at);
                    publishedAt.setSeconds(0, 0);
                    const timestampKey = publishedAt.toISOString();

                    if (!existingTimestamps.has(timestampKey)) {
                        missingArticles.push({
                            id: article.id,
                            published_at: article.published_at,
                            title: article.title
                        });
                    }
                }

                // Progress update
                if ((i + batchSize) % 500 === 0 || i + batchSize >= articles.length) {
                    logger.info(`📊 Checked ${Math.min(i + batchSize, articles.length)}/${articles.length} articles...`);
                }
            }

            MISSING_ARTICLES = missingArticles;
            logger.info(`📊 Found ${MISSING_ARTICLES.length} articles missing stock data`);

        } catch (error: any) {
            logger.error(`Failed to fetch missing articles: ${error.message}`);
            throw error;
        }
    }

    /**
     * Process the batch of missing articles
     */
    async processBatch(): Promise<{
        successful: number;
        failed: number;
        strategies: Record<string, number>;
        details: Array<{
            id: string;
            title: string;
            timestamp: string;
            strategy: string;
            price: number | null;
            success: boolean;
            error?: string;
        }>;
    }> {
        logger.info(`🔧 Processing batch of ${MISSING_ARTICLES.length} missing articles...`);

        const result = {
            successful: 0,
            failed: 0,
            strategies: {} as Record<string, number>,
            details: [] as any[]
        };

        const stockRecordsToInsert: any[] = [];

        for (let i = 0; i < MISSING_ARTICLES.length; i++) {
            const article = MISSING_ARTICLES[i];

            try {
                const articleTime = new Date(article.published_at);
                const strategy = MarketHoursService.getStockDataStrategy(articleTime);

                logger.info(`📝 ${i + 1}/${MISSING_ARTICLES.length}: Processing ${article.title.substring(0, 60)}...`);
                logger.info(`   Published: ${article.published_at}`);
                logger.info(`   Strategy: ${strategy.strategy} - ${strategy.reasoning}`);

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

                    stockRecordsToInsert.push(stockRecord);
                    result.successful++;
                    result.strategies[strategy.strategy] = (result.strategies[strategy.strategy] || 0) + 1;

                    result.details.push({
                        id: article.id,
                        title: article.title,
                        timestamp: article.published_at,
                        strategy: strategy.strategy,
                        price: mlStockData.price_at_event,
                        success: true
                    });

                    logger.info(`   ✅ Success: $${mlStockData.price_at_event.toFixed(2)} (${strategy.strategy})`);
                    logger.info(`   📊 1-day change: ${mlStockData.abs_change_1day_after_pct?.toFixed(2) || 'N/A'}%`);
                    logger.info(`   📊 1-week change: ${mlStockData.abs_change_1week_after_pct?.toFixed(2) || 'N/A'}%`);

                } else {
                    result.failed++;

                    result.details.push({
                        id: article.id,
                        title: article.title,
                        timestamp: article.published_at,
                        strategy: strategy.strategy,
                        price: null,
                        success: false,
                        error: 'Could not find stock data'
                    });

                    logger.warn(`   ❌ Failed: Could not find stock data`);
                }

            } catch (error: any) {
                result.failed++;
                logger.error(`   ❌ Error processing ${article.id}: ${error.message}`);

                result.details.push({
                    id: article.id,
                    title: article.title,
                    timestamp: article.published_at,
                    strategy: 'error',
                    price: null,
                    success: false,
                    error: error.message
                });
            }

            // Progress update every 10 articles
            if ((i + 1) % 10 === 0) {
                logger.info(`📈 Progress: ${i + 1}/${MISSING_ARTICLES.length} articles processed`);
                logger.info(`   Success: ${result.successful}, Failed: ${result.failed}`);
            }
        }

        // Insert all stock records
        if (stockRecordsToInsert.length > 0) {
            await this.insertStockRecords(stockRecordsToInsert);
        }

        return result;
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
     * Verify that articles now have stock data
     */
    async verifyResults(): Promise<{
        articlesChecked: number;
        nowHaveStockData: number;
        stillMissing: number;
        sampleDetails: Array<{
            id: string;
            hasStockData: boolean;
            stockPrice?: number;
            source?: string;
        }>;
    }> {
        logger.info(`🔍 Verifying ${MISSING_ARTICLES.length} articles now have stock data...`);

        let nowHaveStockData = 0;
        let stillMissing = 0;
        const sampleDetails: any[] = [];

        for (const article of MISSING_ARTICLES.slice(0, 10)) { // Check first 10 as sample
            const articleTime = new Date(article.published_at);
            const truncatedTime = new Date(articleTime);
            truncatedTime.setSeconds(0, 0);

            // Check if stock data now exists
            const { data: stockData } = await this.supabase
                .from('stock_prices')
                .select('timestamp, close, source')
                .eq('ticker', 'AAPL')
                .eq('timestamp', truncatedTime.toISOString())
                .limit(1);

            if (stockData && stockData.length > 0) {
                nowHaveStockData++;
                sampleDetails.push({
                    id: article.id,
                    hasStockData: true,
                    stockPrice: parseFloat(stockData[0].close),
                    source: stockData[0].source
                });
                logger.debug(`✅ ${article.id}: Now has stock data ($${stockData[0].close}, ${stockData[0].source})`);
            } else {
                stillMissing++;
                sampleDetails.push({
                    id: article.id,
                    hasStockData: false
                });
                logger.warn(`❌ ${article.id}: Still missing stock data`);
            }
        }

        return {
            articlesChecked: MISSING_ARTICLES.length,
            nowHaveStockData,
            stillMissing,
            sampleDetails
        };
    }

    /**
     * Main execution function
     */
    async execute(): Promise<void> {
        logger.info('🎯 STARTING BATCH GAP FILLER');
        logger.info('=' * 60);

        const startTime = Date.now();

        try {
            logger.info(`📊 Processing ${MISSING_ARTICLES.length} hardcoded missing articles (batch 1)`);

            // Process the batch
            const processResult = await this.processBatch();

            // Verify the results
            const verification = await this.verifyResults();

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1); // seconds

            // Final comprehensive report
            logger.info('\n🎉 BATCH GAP FILLING COMPLETE!');
            logger.info('=' * 60);
            logger.info(`⏱️  Total Runtime: ${duration} seconds`);
            logger.info(`📊 PROCESSING RESULTS:`);
            logger.info(`   Articles Processed: ${MISSING_ARTICLES.length}`);
            logger.info(`   Successfully Filled: ${processResult.successful}`);
            logger.info(`   Failed: ${processResult.failed}`);
            logger.info(`   Success Rate: ${((processResult.successful / MISSING_ARTICLES.length) * 100).toFixed(1)}%`);

            logger.info(`🎯 STRATEGIES USED:`);
            Object.entries(processResult.strategies).forEach(([strategy, count]) => {
                logger.info(`   ${strategy}: ${count}`);
            });

            logger.info(`✅ VERIFICATION (Sample):`);
            logger.info(`   Sample Checked: ${verification.sampleDetails.length}`);
            logger.info(`   Now Have Stock Data: ${verification.nowHaveStockData}`);
            logger.info(`   Still Missing: ${verification.stillMissing}`);

            // Show sample results
            logger.info(`📋 SAMPLE VERIFICATION DETAILS:`);
            verification.sampleDetails.forEach(detail => {
                const status = detail.hasStockData ? '✅' : '❌';
                const price = detail.stockPrice ? `$${detail.stockPrice.toFixed(2)}` : 'N/A';
                const source = detail.source || 'N/A';
                logger.info(`   ${status} ${detail.id}: ${price} (${source})`);
            });

            if (processResult.successful > 0) {
                logger.info('\n🚀 SUCCESS! Stock data gaps have been filled.');
                logger.info('📈 Your ML training dataset now has more complete stock price coverage!');
                logger.info('💡 You can now run your ML training with improved data completeness.');
            } else {
                logger.warn('\n⚠️  No articles were successfully processed.');
                logger.info('💡 Check the logs above for specific errors and troubleshooting.');
            }

        } catch (error: any) {
            logger.error('❌ Batch gap filling failed:', error.message);
            throw error;
        }
    }
}

// Run the batch gap filler
if (require.main === module) {
    const gapFiller = new BatchGapFiller();

    gapFiller.execute().catch(error => {
        console.error('❌ Batch gap filling failed:', error.message);
        process.exit(1);
    });
}
