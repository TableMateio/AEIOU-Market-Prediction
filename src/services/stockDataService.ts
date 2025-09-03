import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { alpacaStockService, type StockDataPoint } from './alpacaStockService.js';
import { tiingoStockService } from './tiingoStockService.js';
import { logger } from '../utils/logger.js';

export interface StoredStockPrice {
    id?: string;
    ticker: string;
    timestamp: string;
    price: number;
    volume?: number;
    source: string;
    created_at?: string;
    updated_at?: string;
}

export interface StockPriceQuery {
    ticker: string;
    timestamp: string;
    source?: 'alpaca' | 'tiingo' | 'any';
    toleranceMinutes?: number;
}

export class StockDataService {
    private supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Store stock price data in Supabase
     */
    async storeStockPrices(stockData: StockDataPoint[]): Promise<{ success: boolean; stored: number; errors: any[] }> {
        if (stockData.length === 0) {
            return { success: true, stored: 0, errors: [] };
        }

        try {
            logger.info('💾 Storing stock prices in Supabase', { count: stockData.length });

            // Transform data for Supabase storage
            const records = stockData.map(data => ({
                ticker: data.symbol,
                timestamp: data.timestamp,
                price: data.close, // Use close price as primary price
                volume: data.volume,
                source: data.source
            }));

            const { data, error } = await this.supabase
                .from('stock_prices')
                .upsert(records, {
                    onConflict: 'ticker,timestamp,source',
                    ignoreDuplicates: true
                })
                .select();

            if (error) {
                logger.error('❌ Error storing stock prices', { error });
                return { success: false, stored: 0, errors: [error] };
            }

            logger.info('✅ Successfully stored stock prices', {
                stored: data?.length || 0,
                source: stockData[0]?.source
            });

            return { success: true, stored: data?.length || 0, errors: [] };

        } catch (error: any) {
            logger.error('❌ Exception storing stock prices', { error: error.message });
            return { success: false, stored: 0, errors: [error] };
        }
    }

    /**
     * Get stock price at specific timestamp (with tolerance)
     */
    async getStockPriceAt(query: StockPriceQuery): Promise<StoredStockPrice | null> {
        try {
            const { ticker, timestamp, source = 'any', toleranceMinutes = 5 } = query;

            logger.info('🔍 Querying stock price', { ticker, timestamp, source, toleranceMinutes });

            const targetTime = new Date(timestamp);
            const startTime = new Date(targetTime.getTime() - (toleranceMinutes * 60 * 1000));
            const endTime = new Date(targetTime.getTime() + (toleranceMinutes * 60 * 1000));

            let query_builder = this.supabase
                .from('stock_prices')
                .select('*')
                .eq('ticker', ticker.toUpperCase())
                .gte('timestamp', startTime.toISOString())
                .lte('timestamp', endTime.toISOString());

            if (source !== 'any') {
                query_builder = query_builder.eq('source', source);
            }

            const { data, error } = await query_builder
                .order('timestamp', { ascending: true });

            if (error) {
                logger.error('❌ Error querying stock price', { error });
                return null;
            }

            if (!data || data.length === 0) {
                logger.warn('⚠️ No stock price found', { ticker, timestamp, toleranceMinutes });
                return null;
            }

            // Find the closest timestamp to target
            let closestRecord = data[0];
            let minDiff = Math.abs(new Date(data[0].timestamp).getTime() - targetTime.getTime());

            for (const record of data) {
                const diff = Math.abs(new Date(record.timestamp).getTime() - targetTime.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    closestRecord = record;
                }
            }

            logger.info('✅ Found closest stock price', {
                ticker,
                requestedTime: timestamp,
                foundTime: closestRecord.timestamp,
                price: closestRecord.price,
                source: closestRecord.source,
                diffMinutes: Math.round(minDiff / (60 * 1000))
            });

            return closestRecord;

        } catch (error: any) {
            logger.error('❌ Exception querying stock price', { error: error.message });
            return null;
        }
    }

    /**
     * Fetch and store minute-level stock data for a time range
     */
    async fetchAndStoreMinuteData(
        ticker: string,
        startTime: string,
        endTime: string,
        preferredSource: 'alpaca' | 'tiingo' = 'alpaca'
    ): Promise<{ success: boolean; stored: number; source: string }> {
        try {
            logger.info('📊 Fetching minute-level stock data', {
                ticker,
                startTime,
                endTime,
                preferredSource
            });

            let stockData: StockDataPoint[] = [];
            let actualSource = preferredSource;

            try {
                if (preferredSource === 'alpaca') {
                    stockData = await alpacaStockService.getBars(
                        ticker.toUpperCase(),
                        '1Min',
                        startTime,
                        endTime
                    );
                } else {
                    stockData = await tiingoStockService.getIntradayPrices(
                        ticker.toUpperCase(),
                        startTime.split('T')[0], // Tiingo expects date format
                        endTime.split('T')[0],
                        '1min'
                    );
                }
            } catch (primaryError: any) {
                logger.warn(`⚠️ ${preferredSource} failed, trying fallback`, { error: primaryError.message });

                // Try the other service as fallback
                try {
                    if (preferredSource === 'alpaca') {
                        actualSource = 'tiingo';
                        stockData = await tiingoStockService.getIntradayPrices(
                            ticker.toUpperCase(),
                            startTime.split('T')[0],
                            endTime.split('T')[0],
                            '1min'
                        );
                    } else {
                        actualSource = 'alpaca';
                        stockData = await alpacaStockService.getBars(
                            ticker.toUpperCase(),
                            '1Min',
                            startTime,
                            endTime
                        );
                    }
                } catch (fallbackError: any) {
                    logger.error('❌ Both stock services failed', {
                        primary: primaryError.message,
                        fallback: fallbackError.message
                    });
                    throw new Error(`Both APIs failed: ${primaryError.message}, ${fallbackError.message}`);
                }
            }

            if (stockData.length === 0) {
                logger.warn('⚠️ No stock data retrieved', { ticker, startTime, endTime });
                return { success: true, stored: 0, source: actualSource };
            }

            // Store the data
            const result = await this.storeStockPrices(stockData);

            return {
                success: result.success,
                stored: result.stored,
                source: actualSource
            };

        } catch (error: any) {
            logger.error('❌ Error fetching and storing stock data', {
                error: error.message,
                ticker,
                startTime,
                endTime
            });
            return { success: false, stored: 0, source: preferredSource };
        }
    }

    /**
     * Get stock prices in a time range
     */
    async getStockPricesInRange(
        ticker: string,
        startTime: string,
        endTime: string,
        source?: string
    ): Promise<StoredStockPrice[]> {
        try {
            let query_builder = this.supabase
                .from('stock_prices')
                .select('*')
                .eq('ticker', ticker.toUpperCase())
                .gte('timestamp', startTime)
                .lte('timestamp', endTime);

            if (source) {
                query_builder = query_builder.eq('source', source);
            }

            const { data, error } = await query_builder
                .order('timestamp', { ascending: true });

            if (error) {
                logger.error('❌ Error querying stock price range', { error });
                return [];
            }

            return data || [];

        } catch (error: any) {
            logger.error('❌ Exception querying stock price range', { error: error.message });
            return [];
        }
    }

    /**
     * Test both APIs and database connectivity
     */
    async testConnections(): Promise<{
        alpaca: { success: boolean; message: string };
        tiingo: { success: boolean; message: string };
        database: { success: boolean; message: string };
    }> {
        logger.info('🧪 Testing all stock data connections...');

        // Test Alpaca
        const alpacaResult = await alpacaStockService.testConnection();

        // Test Tiingo  
        const tiingoResult = await tiingoStockService.testConnection();

        // Test Database
        let databaseResult: { success: boolean; message: string };
        try {
            const { data, error } = await this.supabase
                .from('stock_prices')
                .select('count')
                .limit(1);

            if (error) {
                databaseResult = {
                    success: false,
                    message: `❌ Database connection failed: ${error.message}`
                };
            } else {
                databaseResult = {
                    success: true,
                    message: '✅ Database connection successful'
                };
            }
        } catch (error: any) {
            databaseResult = {
                success: false,
                message: `❌ Database connection failed: ${error.message}`
            };
        }

        logger.info('🧪 Connection test results', {
            alpaca: alpacaResult.success,
            tiingo: tiingoResult.success,
            database: databaseResult.success
        });

        return {
            alpaca: alpacaResult,
            tiingo: tiingoResult,
            database: databaseResult
        };
    }

    /**
     * Get a specific minute's stock price (for testing minute precision)
     */
    async getMinutePrecisionPrice(
        ticker: string,
        targetMinute: string
    ): Promise<{ found: boolean; price?: StoredStockPrice; fetchedNew?: boolean }> {
        // First check if we already have data for this minute
        const existingPrice = await this.getStockPriceAt({
            ticker,
            timestamp: targetMinute,
            toleranceMinutes: 1
        });

        if (existingPrice) {
            return { found: true, price: existingPrice, fetchedNew: false };
        }

        // If not found, try to fetch new data around this time
        const targetTime = new Date(targetMinute);
        const startTime = new Date(targetTime.getTime() - 30 * 60 * 1000); // 30 min before
        const endTime = new Date(targetTime.getTime() + 30 * 60 * 1000); // 30 min after

        logger.info('🎯 Fetching minute-precision data', {
            ticker,
            targetMinute,
            fetchRange: `${startTime.toISOString()} to ${endTime.toISOString()}`
        });

        const fetchResult = await this.fetchAndStoreMinuteData(
            ticker,
            startTime.toISOString(),
            endTime.toISOString()
        );

        if (!fetchResult.success) {
            return { found: false, fetchedNew: false };
        }

        // Try to find the price again
        const newPrice = await this.getStockPriceAt({
            ticker,
            timestamp: targetMinute,
            toleranceMinutes: 1
        });

        return {
            found: !!newPrice,
            price: newPrice || undefined,
            fetchedNew: true
        };
    }
}

// Export singleton instance
export const stockDataService = new StockDataService();
