#!/usr/bin/env npx tsx

/**
 * Fill ML Training Data Gaps - Direct approach
 * 
 * Query ml_training_data table directly for missing stock data
 * Fill gaps using our proven stock lookup logic
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { StockDataLookupService } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FillMLTrainingGaps');

interface MLRecord {
    id: string;
    event_timestamp: string;
    ticker: string;
    abs_change_1day_after_pct: number | null;
    abs_change_1week_after_pct: number | null;
    price_at_event: number | null;
}

class FillMLTrainingGaps {
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
     * Get ML training records missing stock data
     */
    async getMissingMLRecords(batchSize: number = 50, offset: number = 0): Promise<MLRecord[]> {
        try {
            logger.info(`🔍 Getting ML records with missing stock data (batch ${Math.floor(offset / batchSize) + 1})...`);

            const { data: records, error } = await this.supabase
                .from('ml_training_data')
                .select('id, event_timestamp, ticker, abs_change_1day_after_pct, abs_change_1week_after_pct, price_at_event')
                .eq('ticker', 'AAPL')
                .or('abs_change_1day_after_pct.is.null,abs_change_1week_after_pct.is.null,price_at_event.is.null')
                .order('event_timestamp')
                .range(offset, offset + batchSize - 1);

            if (error) {
                logger.error('Error fetching ML records:', error);
                return [];
            }

            if (!records || records.length === 0) {
                logger.info('📭 No more ML records with missing data found');
                return [];
            }

            logger.info(`📊 Found ${records.length} ML records with missing stock data`);
            return records;

        } catch (error: any) {
            logger.error(`❌ Error getting missing ML records: ${error.message}`);
            return [];
        }
    }

    /**
     * Process a batch of ML records and fill missing stock data
     */
    async processBatch(records: MLRecord[]): Promise<{ successful: number; failed: number }> {
        if (records.length === 0) {
            return { successful: 0, failed: 0 };
        }

        logger.info(`🔧 Processing batch of ${records.length} ML records...`);

        let successful = 0;
        let failed = 0;
        const stockRecordsToInsert: any[] = [];
        const mlUpdates: any[] = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i];

            try {
                const eventTime = new Date(record.event_timestamp);
                const strategy = MarketHoursService.getStockDataStrategy(eventTime);

                logger.info(`📝 ${i + 1}/${records.length}: Processing ${record.id.substring(0, 8)}...`);
                logger.info(`   Event time: ${record.event_timestamp}`);
                logger.info(`   Strategy: ${strategy.strategy} - ${strategy.reasoning}`);
                logger.info(`   Missing: ${!record.price_at_event ? 'price_at_event ' : ''}${!record.abs_change_1day_after_pct ? '1day ' : ''}${!record.abs_change_1week_after_pct ? '1week' : ''}`);

                // Get ML stock data using our proven service
                const mlData = await this.stockLookupService.getMLStockData(eventTime, 'AAPL');

                if (mlData) {
                    logger.info(`   ✅ Success: $${mlData.price_at_event.toFixed(2)} (${strategy.strategy})`);
                    logger.info(`   📊 1-day change: ${mlData.abs_change_1day_after_pct?.toFixed(2) || 'N/A'}%`);
                    logger.info(`   📊 1-week change: ${mlData.abs_change_1week_after_pct?.toFixed(2) || 'N/A'}%`);

                    // Create interpolated stock record if needed
                    if (!record.price_at_event) {
                        const eventMinute = new Date(eventTime);
                        eventMinute.setSeconds(0, 0);

                        const stockRecord = {
                            ticker: 'AAPL',
                            timestamp: eventMinute.toISOString(),
                            open: mlData.price_at_event,
                            high: mlData.price_at_event,
                            low: mlData.price_at_event,
                            close: mlData.price_at_event,
                            volume: 0,
                            source: `interpolated_${strategy.strategy}`,
                            timeframe: '1min'
                        };

                        stockRecordsToInsert.push(stockRecord);
                    }

                    // Prepare ML training data update
                    const updateData: any = {
                        id: record.id,
                        ticker: record.ticker, // Include required ticker field
                        event_timestamp: record.event_timestamp // Include required event_timestamp field
                    };

                    if (!record.price_at_event) {
                        updateData.price_at_event = mlData.price_at_event;
                    }
                    if (!record.abs_change_1day_after_pct) {
                        updateData.abs_change_1day_after_pct = mlData.abs_change_1day_after_pct;
                    }
                    if (!record.abs_change_1week_after_pct) {
                        updateData.abs_change_1week_after_pct = mlData.abs_change_1week_after_pct;
                    }

                    mlUpdates.push(updateData);
                    successful++;
                } else {
                    logger.warn(`   ❌ Failed: Could not find stock data`);
                    failed++;
                }

            } catch (error: any) {
                logger.error(`   ❌ Error processing record: ${error.message}`);
                failed++;
            }

            // Progress update every 10 records
            if ((i + 1) % 10 === 0) {
                logger.info(`📈 Progress: ${i + 1}/${records.length} records processed`);
                logger.info(`   Success: ${successful}, Failed: ${failed}`);
            }
        }

        // Insert stock records if any
        if (stockRecordsToInsert.length > 0) {
            await this.insertStockRecords(stockRecordsToInsert);
        }

        // Update ML training records
        if (mlUpdates.length > 0) {
            await this.updateMLRecords(mlUpdates);
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
        const uniqueRecords = this.removeDuplicateRecords(stockRecords);
        logger.info(`💾 Inserting ${uniqueRecords.length} unique stock price records...`);

        try {
            const { error } = await this.supabase
                .from('stock_prices')
                .upsert(uniqueRecords, {
                    onConflict: 'ticker,timestamp,timeframe,source',
                    ignoreDuplicates: false
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
     * Update ML training records with filled data
     */
    private async updateMLRecords(updates: any[]): Promise<void> {
        logger.info(`📝 Updating ${updates.length} ML training records...`);

        try {
            const { error } = await this.supabase
                .from('ml_training_data')
                .upsert(updates, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });

            if (error) {
                logger.error('Error updating ML records:', error);
                throw error;
            }

            logger.info(`✅ Successfully updated ${updates.length} ML training records`);

        } catch (error: any) {
            logger.error('Error updating ML records:', error.message);
            throw error;
        }
    }

    /**
     * Main execution function
     */
    async execute(): Promise<void> {
        logger.info('🎯 STARTING ML TRAINING DATA GAP FILLER');
        logger.info('=' * 60);
        logger.info('📋 Filling missing stock data in ml_training_data table');

        const startTime = Date.now();
        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let offset = 0;
        const batchSize = 50;
        let batchNumber = 1;

        try {
            while (true) {
                logger.info(`\n🔄 BATCH ${batchNumber} - Processing records ${offset + 1} to ${offset + batchSize}...`);

                // Get missing ML records for this batch
                const missingRecords = await this.getMissingMLRecords(batchSize, offset);

                if (missingRecords.length === 0) {
                    logger.info('📭 No more missing records found. Processing complete!');
                    break;
                }

                // Process the missing records
                const result = await this.processBatch(missingRecords);
                totalProcessed += missingRecords.length;
                totalSuccessful += result.successful;
                totalFailed += result.failed;

                logger.info(`✅ Batch ${batchNumber} complete: ${result.successful} success, ${result.failed} failed`);

                // Update offset for next batch
                offset += batchSize;
                batchNumber++;

                // Add a small delay between batches
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Safety check - increased for full processing
                if (batchNumber > 100) {
                    logger.warn('⚠️  Safety limit reached (100 batches). Stopping to prevent runaway execution.');
                    break;
                }
            }

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            logger.info('\n🎉 ML TRAINING DATA GAP FILLING COMPLETE!');
            logger.info('=' * 60);
            logger.info(`⏱️  Total Runtime: ${duration} seconds`);
            logger.info(`📊 FINAL RESULTS:`);
            logger.info(`   Total Batches Processed: ${batchNumber - 1}`);
            logger.info(`   Total Records with Missing Data: ${totalProcessed}`);
            logger.info(`   Total Successfully Filled: ${totalSuccessful}`);
            logger.info(`   Total Failed: ${totalFailed}`);
            logger.info(`   Overall Success Rate: ${totalProcessed > 0 ? ((totalSuccessful / totalProcessed) * 100).toFixed(1) : 0}%`);

            logger.info('\n🚀 SUCCESS! ML training data gaps filled.');
            logger.info('📈 Your ML training dataset is now ready for training!');

        } catch (error: any) {
            logger.error(`❌ ML training data gap filling failed: ${error.message}`);
            throw error;
        }
    }
}

// Run the ML training gap filler
async function main() {
    const processor = new FillMLTrainingGaps();
    await processor.execute();
}

main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
