/**
 * Stock Data Storage Service
 * 
 * Handles storing stock data from various APIs into the stock_prices table
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { AppConfig } from '../config/app.js';
import { polygonStockService, StockDataPoint } from './polygonStockService.js';

const logger = createLogger('StockDataStorage');
const config = AppConfig.getInstance();

export interface StoredStockData {
    id: string;
    ticker: string;
    timestamp: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number;
    volume: number | null;
    vwap: number | null;
    trade_count: number | null;
    source: string;
    timeframe: string;
    created_at: string;
    updated_at: string;
}

class StockDataStorageService {
    private supabase;

    constructor() {
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );

        logger.info('Stock Data Storage Service initialized');
    }

    /**
     * Store stock data points in the database
     */
    async storeStockData(dataPoints: StockDataPoint[]): Promise<StoredStockData[]> {
        if (dataPoints.length === 0) {
            logger.warn('No data points to store');
            return [];
        }

        try {
            logger.info('Storing stock data points', {
                count: dataPoints.length,
                ticker: dataPoints[0]?.ticker,
                source: dataPoints[0]?.source,
                timeframe: dataPoints[0]?.timeframe
            });

            // Convert to database format
            const dbRecords = dataPoints.map(point => ({
                ticker: point.ticker,
                timestamp: point.timestamp.toISOString(),
                open: point.open,
                high: point.high,
                low: point.low,
                close: point.close,
                volume: point.volume,
                vwap: point.vwap || null,
                trade_count: point.trade_count || null,
                source: point.source,
                timeframe: point.timeframe
            }));

            // Insert with upsert to handle duplicates
            const { data, error } = await this.supabase
                .from('stock_prices')
                .upsert(dbRecords, {
                    onConflict: 'ticker,timestamp,timeframe,source',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                logger.error('Failed to store stock data', { error });
                throw error;
            }

            const stored = data as StoredStockData[];
            logger.info('Stock data stored successfully', {
                storedCount: stored.length,
                ticker: stored[0]?.ticker,
                dateRange: stored.length > 0 ? {
                    from: stored[0]?.timestamp,
                    to: stored[stored.length - 1]?.timestamp
                } : null
            });

            return stored;

        } catch (error: any) {
            logger.error('Failed to store stock data', {
                error: error.message,
                dataPointsCount: dataPoints.length
            });
            throw error;
        }
    }

    /**
     * Fetch and store historical data around article timestamps
     */
    async collectDataForArticleCorrelation(
        ticker: string,
        articleTimestamps: Date[],
        windowHours: number = 4
    ): Promise<{ success: number; failed: number; total: number }> {
        let successCount = 0;
        let failedCount = 0;

        logger.info('Starting article correlation data collection', {
            ticker,
            articleCount: articleTimestamps.length,
            windowHours
        });

        for (let i = 0; i < articleTimestamps.length; i++) {
            const timestamp = articleTimestamps[i];

            try {
                logger.info(`Processing article ${i + 1}/${articleTimestamps.length}`, {
                    timestamp: timestamp.toISOString()
                });

                // Fetch data around this timestamp
                const dataPoints = await polygonStockService.getDataAroundTimestamp(
                    ticker,
                    timestamp,
                    windowHours * 60 // convert to minutes
                );

                if (dataPoints.length > 0) {
                    // Store the data
                    await this.storeStockData(dataPoints);
                    successCount++;

                    logger.info(`Article ${i + 1} processed successfully`, {
                        dataPoints: dataPoints.length
                    });
                } else {
                    logger.warn(`No data available for article ${i + 1}`, {
                        timestamp: timestamp.toISOString()
                    });
                    failedCount++;
                }

                // Rate limiting: wait between requests
                if (i < articleTimestamps.length - 1) {
                    const rateLimitStatus = polygonStockService.getRateLimitStatus();
                    if (rateLimitStatus.remaining <= 1) {
                        const waitTime = rateLimitStatus.resetTime.getTime() - Date.now() + 1000;
                        logger.info(`Rate limit reached, waiting ${Math.round(waitTime / 1000)}s`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }

            } catch (error: any) {
                logger.error(`Failed to process article ${i + 1}`, {
                    timestamp: timestamp.toISOString(),
                    error: error.message
                });
                failedCount++;

                // If it's a rate limit error, wait and continue
                if (error.response?.status === 429) {
                    logger.info('Rate limit hit, waiting 1 minute...');
                    await new Promise(resolve => setTimeout(resolve, 60000));
                }
            }
        }

        const result = {
            success: successCount,
            failed: failedCount,
            total: articleTimestamps.length
        };

        logger.info('Article correlation data collection completed', result);
        return result;
    }

    /**
     * Get existing stock data for a ticker and time range
     */
    async getStoredStockData(
        ticker: string,
        startDate: Date,
        endDate: Date,
        timeframe?: string
    ): Promise<StoredStockData[]> {
        try {
            let query = this.supabase
                .from('stock_prices')
                .select('*')
                .eq('ticker', ticker.toUpperCase())
                .gte('timestamp', startDate.toISOString())
                .lte('timestamp', endDate.toISOString())
                .order('timestamp', { ascending: true });

            if (timeframe) {
                query = query.eq('timeframe', timeframe);
            }

            const { data, error } = await query;

            if (error) {
                logger.error('Failed to retrieve stored stock data', { error });
                throw error;
            }

            logger.info('Retrieved stored stock data', {
                ticker,
                count: data?.length || 0,
                timeframe,
                dateRange: {
                    from: startDate.toISOString(),
                    to: endDate.toISOString()
                }
            });

            return data as StoredStockData[] || [];

        } catch (error: any) {
            logger.error('Failed to get stored stock data', {
                error: error.message,
                ticker,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });
            throw error;
        }
    }

    /**
     * Get data coverage statistics
     */
    async getDataCoverageStats(ticker: string): Promise<{
        totalDataPoints: number;
        dateRange: { earliest: string; latest: string } | null;
        timeframes: { [key: string]: number };
        sources: { [key: string]: number };
    }> {
        try {
            const { data, error } = await this.supabase
                .from('stock_prices')
                .select('timestamp, timeframe, source')
                .eq('ticker', ticker.toUpperCase())
                .order('timestamp', { ascending: true });

            if (error) throw error;

            const stats = {
                totalDataPoints: data?.length || 0,
                dateRange: null as { earliest: string; latest: string } | null,
                timeframes: {} as { [key: string]: number },
                sources: {} as { [key: string]: number }
            };

            if (data && data.length > 0) {
                stats.dateRange = {
                    earliest: data[0].timestamp,
                    latest: data[data.length - 1].timestamp
                };

                // Count by timeframe and source
                data.forEach(row => {
                    stats.timeframes[row.timeframe] = (stats.timeframes[row.timeframe] || 0) + 1;
                    stats.sources[row.source] = (stats.sources[row.source] || 0) + 1;
                });
            }

            logger.info('Data coverage stats calculated', {
                ticker,
                ...stats
            });

            return stats;

        } catch (error: any) {
            logger.error('Failed to get coverage stats', {
                error: error.message,
                ticker
            });
            throw error;
        }
    }
}

export const stockDataStorageService = new StockDataStorageService();
export default StockDataStorageService;
