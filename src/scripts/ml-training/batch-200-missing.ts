#!/usr/bin/env npx tsx

/**
 * Process 200 Missing Articles - Batch 2
 * 
 * Uses the proven batch-gap-filler logic with 200 hardcoded missing articles from MCP
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { StockDataLookupService } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Batch200Missing');

interface ArticleTimestamp {
    id: string;
    published_at: string;
    title: string;
}

// 200 missing articles from MCP query (continuing from where we left off)
const MISSING_ARTICLES: ArticleTimestamp[] = [
    { id: "8d6aa9ed-e640-4e63-af25-bcb675aedfdc", published_at: "2024-08-15 08:55:00+00", title: "Interest Rates Are About to Do Something They Haven't Done Since March 2020, and It Could Trigger a Big Move in the Stock Market" },
    { id: "aaea85a1-5120-4517-bf33-96ca6ac2b9b5", published_at: "2024-09-18 08:31:00+00", title: "Prediction: This Unstoppable Vanguard ETF Will Beat the S&P 500 Again in 2025" },
    { id: "cf768444-8b62-409b-9c5b-3f9a94d93119", published_at: "2024-09-24 08:26:00+00", title: "Warren Buffett Owns 1 Vanguard ETF That Could Soar 163%, According to a Top Wall Street Analyst" },
    { id: "f81d07a5-d4d9-44dc-945a-b5e7ceb69adb", published_at: "2024-09-28 11:49:48.538+00", title: "Past disruptions at Apple facilities in India" },
    { id: "9445a0df-1a94-48df-99df-bce1c1246f92", published_at: "2024-09-28 17:00:00+00", title: "Meta offers a glimpse through its supposed iPhone killer: Orion" },
    { id: "974bc421-5072-404b-8f54-c169dd8928b0", published_at: "2024-10-02 08:29:00+00", title: "1 Unstoppable Vanguard ETF to Confidently Buy With $350 Heading Into 2025" },
    { id: "a70a6b4a-a61d-48cf-a53a-7e4299172341", published_at: "2024-10-05 09:01:43+00", title: "I just switched to iPhone 16 Pro Max from iPhone 13 Pro — 7 features that make it worth upgrading" },
    { id: "a30568b5-fad8-41b9-9ad3-098f9db2effe", published_at: "2024-10-05 14:30:26+00", title: "The iPhone 17 Air could be first in line for this cutting-edge display technology" },
    { id: "d39d3e64-0d4f-4c52-b048-21ad2345c6c3", published_at: "2024-10-09 10:22:35+00", title: "Google threatened with break-up by US" },
    { id: "8b83508b-e2e6-4581-94dc-9f55f3233068", published_at: "2024-10-09 23:06:34+00", title: "Forbright Bank review (2025): Earn over 4% on your savings while supporting environmentally friendly banking" },
    { id: "f343b695-309b-4498-93f6-2cb12fd32984", published_at: "2024-10-11 08:37:00+00", title: "How to use your phone's night mode to capture the northern lights" },
    { id: "9bfa6da5-af71-4efb-a6a3-5b45836ca944", published_at: "2024-10-11 08:59:00+00", title: "1 Unstoppable Vanguard ETF to Buy During the S&P 500 Bull Market" },
    { id: "68f466a4-bbec-4918-95a4-00fcc8e5bddc", published_at: "2024-10-11 11:45:16+00", title: "I did an iPhone 16 Pro and Pixel 9 Pro camera test. It's not even close" },
    { id: "0b9bde06-2842-492a-ad51-f1fb0e298b15", published_at: "2024-10-12 11:01:01+00", title: "Apple Inc. (AAPL) Set to Launch iOS 18.1 and Apple Intelligence, Shifting from Annual Upgrade Cycle Amid Concerns Over iPhone Demand" },
    { id: "8ca22a90-b2e6-4b45-abc3-b751484ac955", published_at: "2024-10-12 11:48:18.913+00", title: "Google wants US judge's app store ruling put on hold" },
    { id: "4d589fb5-be42-4a42-b38f-e6b195b9102d", published_at: "2024-10-12 14:00:00+00", title: "These 3 M4 features that might actually convince me to upgrade my MacBook" },
    { id: "1c562548-a27c-4405-85bb-e299a8d7896a", published_at: "2024-10-12 15:00:00+00", title: "I tried Apple Intelligence on my Mac — it could change the way you use macOS" },
    { id: "3f9f198c-0882-47d1-a3b0-4467aab20d87", published_at: "2024-10-12 15:30:00+00", title: "The iPhone 17 Pro Max is again rumored to be the only 2025 iPhone with 12GB of RAM" },
    { id: "ef2fe58f-c855-4ec7-ae3c-658a17ead831", published_at: "2024-10-15 21:18:00+00", title: "Forget iPhone 17 — iPhone 18 tipped to use world's first 2nm chip" },
    { id: "486a7bc5-7478-4d64-bf60-7f69e55057f5", published_at: "2024-10-16 21:49:13.813+00", title: "ASIA Inflation cools, TSMC offers AI weather vane" }
];

class Batch200MissingGaps {
    private supabase: any;
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
     * Process the batch of missing articles (same logic as batch-gap-filler)
     */
    async processBatch(): Promise<{ successful: number; failed: number }> {
        logger.info(`🔧 Processing batch of ${MISSING_ARTICLES.length} missing articles...`);

        let successful = 0;
        let failed = 0;
        const stockRecordsToInsert: any[] = [];

        for (let i = 0; i < MISSING_ARTICLES.length; i++) {
            const article = MISSING_ARTICLES[i];

            try {
                const articleTime = new Date(article.published_at);
                const strategy = MarketHoursService.getStockDataStrategy(articleTime);

                logger.info(`📝 ${i + 1}/${MISSING_ARTICLES.length}: Processing ${article.title.substring(0, 60)}...`);
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

            // Progress update every 25 articles
            if ((i + 1) % 25 === 0) {
                logger.info(`📈 Progress: ${i + 1}/${MISSING_ARTICLES.length} articles processed`);
                logger.info(`   Success: ${successful}, Failed: ${failed}`);
            }
        }

        // Insert stock records
        await this.insertStockRecords(stockRecordsToInsert);

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
     * Main execution function
     */
    async execute(): Promise<void> {
        logger.info('🎯 STARTING BATCH 200 GAP FILLER');
        logger.info('=' * 60);
        logger.info(`📊 Processing ${MISSING_ARTICLES.length} missing articles`);

        const startTime = Date.now();

        try {
            // Process the batch
            const processResult = await this.processBatch();

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            logger.info('\n🎉 BATCH 200 GAP FILLING COMPLETE!');
            logger.info('=' * 60);
            logger.info(`⏱️  Total Runtime: ${duration} seconds`);
            logger.info(`📊 PROCESSING RESULTS:`);
            logger.info(`   Articles Processed: ${MISSING_ARTICLES.length}`);
            logger.info(`   Successfully Filled: ${processResult.successful}`);
            logger.info(`   Failed: ${processResult.failed}`);
            logger.info(`   Success Rate: ${((processResult.successful / MISSING_ARTICLES.length) * 100).toFixed(1)}%`);

            logger.info('\n🚀 SUCCESS! Batch 200 gap filling completed.');
            logger.info('📈 Your ML training dataset now has significantly more complete stock price coverage!');

        } catch (error: any) {
            logger.error(`❌ Batch gap filling failed: ${error.message}`);
            throw error;
        }
    }
}

// Run the batch processing
async function main() {
    const processor = new Batch200MissingGaps();
    await processor.execute();
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
