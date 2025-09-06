/**
 * Stock Data Lookup Service
 * 
 * Finds stock prices in Supabase for ML training data calculations
 * Implements the same logic as python/feature_config.py target calculations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MarketHoursService } from './marketHoursService';
import { createLogger } from '../utils/logger';

const logger = createLogger('StockDataLookup');

export interface StockPrice {
    ticker: string;
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    source: string;
}

export interface MLStockData {
    price_at_event: number;
    price_1day_after: number | null;
    price_1week_after: number | null;
    abs_change_1day_after_pct: number | null;
    abs_change_1week_after_pct: number | null;
    strategy_used: string;
    source_timestamp: string;
}

export class StockDataLookupService {
    private supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Get ML training data for an article timestamp
     * Implements the same logic as python/feature_config.py
     */
    async getMLStockData(articleTimestamp: Date, ticker: string = 'AAPL'): Promise<MLStockData | null> {
        try {
            // Get strategy for finding stock data
            const strategy = MarketHoursService.getStockDataStrategy(articleTimestamp);

            // For weekend/holiday articles, find the previous trading day's market close (4:00 PM ET)
            let targetTimestamp = strategy.targetTimestamp;
            if (strategy.strategy === 'previous_close') {
                targetTimestamp = this.findPreviousMarketClose(articleTimestamp);
            }

            // Find the stock price at the event time
            const eventPrice = await this.findNearestStockPrice(targetTimestamp, ticker);
            if (!eventPrice) {
                logger.warn(`No stock price found for event time: ${targetTimestamp.toISOString()}`);
                return null;
            }

            // Calculate target timestamps (1 day and 1 week after)
            const oneDayAfter = new Date(strategy.targetTimestamp);
            oneDayAfter.setDate(oneDayAfter.getDate() + 1);

            const oneWeekAfter = new Date(strategy.targetTimestamp);
            oneWeekAfter.setDate(oneWeekAfter.getDate() + 7);

            // Find stock prices at target times
            const price1DayAfter = await this.findNearestStockPrice(oneDayAfter, ticker);
            const price1WeekAfter = await this.findNearestStockPrice(oneWeekAfter, ticker);

            // Calculate percentage changes (same formula as python/feature_config.py line 17)
            // target_calculation: str = '(price_1day_after - price_at_event) / price_at_event * 100'
            const abs_change_1day_after_pct = price1DayAfter
                ? ((price1DayAfter.close - eventPrice.close) / eventPrice.close) * 100
                : null;

            const abs_change_1week_after_pct = price1WeekAfter
                ? ((price1WeekAfter.close - eventPrice.close) / eventPrice.close) * 100
                : null;

            return {
                price_at_event: eventPrice.close,
                price_1day_after: price1DayAfter?.close || null,
                price_1week_after: price1WeekAfter?.close || null,
                abs_change_1day_after_pct,
                abs_change_1week_after_pct,
                strategy_used: `${strategy.strategy}: ${strategy.reasoning}`,
                source_timestamp: eventPrice.timestamp
            };

        } catch (error: any) {
            logger.error('Error getting ML stock data:', error.message);
            return null;
        }
    }

    /**
     * Find the nearest stock price to a target timestamp
     * Looks within a reasonable window (±2 hours for exact, ±1 day for market close/open)
     */
    async findNearestStockPrice(targetTimestamp: Date, ticker: string): Promise<StockPrice | null> {
        const session = MarketHoursService.analyzeMarketSession(targetTimestamp);

        // Define search window based on market conditions - be much more tolerant
        let searchWindowMinutes = 4 * 60; // 4 hours default

        if (session.isWeekend || session.isHoliday) {
            searchWindowMinutes = 3 * 24 * 60; // 3 days for weekends/holidays (to catch Friday close)
        } else if (!session.isMarketOpen && !session.isExtendedHours) {
            searchWindowMinutes = 12 * 60; // 12 hours for after-hours
        }

        const startTime = new Date(targetTimestamp.getTime() - (searchWindowMinutes * 60 * 1000));
        const endTime = new Date(targetTimestamp.getTime() + (searchWindowMinutes * 60 * 1000));

        try {
            // Query Supabase for nearest stock price
            const { data, error } = await this.supabase
                .from('stock_prices')
                .select('*')
                .eq('ticker', ticker)
                .gte('timestamp', startTime.toISOString())
                .lte('timestamp', endTime.toISOString())
                .order('timestamp', { ascending: true });

            if (error) {
                logger.error('Supabase query error:', error);
                return null;
            }

            if (!data || data.length === 0) {
                logger.warn(`No stock data found for ${ticker} near ${targetTimestamp.toISOString()}`);
                return null;
            }

            // Find the closest timestamp
            const target = targetTimestamp.getTime();
            let closest = data[0];
            let minDiff = Math.abs(new Date(data[0].timestamp).getTime() - target);

            for (const price of data) {
                const diff = Math.abs(new Date(price.timestamp).getTime() - target);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = price;
                }
            }

            logger.debug(`Found stock price for ${ticker}: ${closest.timestamp} (${minDiff / 60000} minutes from target)`);

            return closest as StockPrice;

        } catch (error: any) {
            logger.error('Error finding nearest stock price:', error.message);
            return null;
        }
    }

    /**
     * Find the previous trading day's market close (4:00 PM ET = 21:00 UTC)
     */
    private findPreviousMarketClose(articleTimestamp: Date): Date {
        const date = new Date(articleTimestamp);

        // Go back day by day until we find a trading day
        do {
            date.setDate(date.getDate() - 1);
        } while (this.isNonTradingDay(date));

        // Set to market close: 4:00 PM ET = 21:00 UTC (simplified, doesn't handle DST)
        date.setUTCHours(21, 0, 0, 0);

        return date;
    }

    /**
     * Check if a date is a non-trading day (weekend or holiday)
     */
    private isNonTradingDay(date: Date): boolean {
        const dayOfWeek = date.getUTCDay(); // 0=Sunday, 6=Saturday
        const dateString = date.toISOString().split('T')[0];

        const holidays = [
            '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27',
            '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
            '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
            '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25'
        ];

        return dayOfWeek === 0 || dayOfWeek === 6 || holidays.includes(dateString);
    }

    /**
     * Batch lookup for multiple article timestamps
     */
    async batchGetMLStockData(articleTimestamps: Date[], ticker: string = 'AAPL'): Promise<Map<string, MLStockData>> {
        const results = new Map<string, MLStockData>();

        logger.info(`Batch processing ${articleTimestamps.length} timestamps for ${ticker}`);

        for (let i = 0; i < articleTimestamps.length; i++) {
            const timestamp = articleTimestamps[i];
            const key = timestamp.toISOString();

            const stockData = await this.getMLStockData(timestamp, ticker);
            if (stockData) {
                results.set(key, stockData);
            }

            // Progress logging
            if ((i + 1) % 50 === 0) {
                logger.info(`Processed ${i + 1}/${articleTimestamps.length} timestamps`);
            }

            // Small delay to be gentle on the database
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        logger.info(`Batch complete: ${results.size}/${articleTimestamps.length} successful lookups`);

        return results;
    }

    /**
     * Validate that we have sufficient stock data coverage
     */
    async validateStockDataCoverage(startDate: Date, endDate: Date, ticker: string = 'AAPL'): Promise<{
        totalDays: number;
        daysWithData: number;
        coveragePercentage: number;
        missingDates: string[];
    }> {
        try {
            const { data, error } = await this.supabase
                .from('stock_prices')
                .select('timestamp')
                .eq('ticker', ticker)
                .gte('timestamp', startDate.toISOString())
                .lte('timestamp', endDate.toISOString());

            if (error) throw error;

            // Get unique dates
            const datesWithData = new Set(
                data?.map(row => row.timestamp.split('T')[0]) || []
            );

            // Calculate total days and missing dates
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
            const missingDates: string[] = [];

            const current = new Date(startDate);
            while (current <= endDate) {
                const dateStr = current.toISOString().split('T')[0];
                if (!datesWithData.has(dateStr)) {
                    missingDates.push(dateStr);
                }
                current.setDate(current.getDate() + 1);
            }

            return {
                totalDays,
                daysWithData: datesWithData.size,
                coveragePercentage: (datesWithData.size / totalDays) * 100,
                missingDates
            };

        } catch (error: any) {
            logger.error('Error validating stock data coverage:', error.message);
            throw error;
        }
    }
}
