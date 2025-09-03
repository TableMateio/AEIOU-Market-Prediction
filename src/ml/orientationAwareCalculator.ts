/**
 * Orientation-Aware Performance Calculator
 * 
 * Handles predictive vs reflective articles with appropriate time windows
 * Solves the critical problem of after-hours news and market timing
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { AppConfig } from '../config/app.js';

const logger = createLogger('OrientationAwareCalculator');

export interface OrientationAwareMetrics {
    ticker: string;
    eventTimestamp: Date;
    orientation: 'predictive' | 'reflective' | 'both' | 'neutral';

    // Different time windows based on orientation
    timeWindows: {
        // For reflective articles (analyzing past movements)
        past_analysis?: {
            '1hour_before': number;    // Stock performance 1hr before article
            '4hour_before': number;    // 4hr before
            '1day_before': number;     // 1 day before
            '3day_before': number;     // 3 days before
            '7day_before': number;     // 1 week before
        };

        // For predictive articles (forecasting future)
        future_prediction?: {
            '1hour_after': number;     // Stock performance 1hr after article
            '4hour_after': number;     // 4hr after
            '1day_after': number;      // 1 day after
            '3day_after': number;      // 3 days after
            '7day_after': number;      // 1 week after
        };

        // For both/neutral - full window
        full_window?: {
            '3day_before_to_3day_after': number;
            '1day_before_to_1day_after': number;
        };
    };

    // Market timing context
    marketTiming: {
        published_during_market_hours: boolean;
        next_market_open: Date;
        prev_market_close: Date;
        hours_until_next_open: number;
        hours_since_last_close: number;
    };

    // Alpha calculations (vs benchmarks)
    alphaMetrics: {
        vs_market: number;         // vs SPY
        vs_sector: number;         // vs XLK  
        vs_faang: number;          // vs FAANG composite
    };
}

export class OrientationAwareCalculator {
    private supabase;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }

    /**
     * Calculate performance metrics based on article orientation
     * This is the key insight: different articles need different time windows
     */
    async calculateOrientationAwareMetrics(
        ticker: string,
        eventTimestamp: Date,
        orientation: 'predictive' | 'reflective' | 'both' | 'neutral'
    ): Promise<OrientationAwareMetrics> {

        logger.info('🎯 Calculating orientation-aware metrics', {
            ticker,
            eventTimestamp: eventTimestamp.toISOString(),
            orientation
        });

        // Handle market timing first
        const marketTiming = this.calculateMarketTiming(eventTimestamp);

        // Calculate appropriate time windows based on orientation
        let timeWindows: any = {};

        switch (orientation) {
            case 'reflective':
                // Article analyzes past movements - correlate with PAST performance
                timeWindows.past_analysis = await this.calculatePastPerformance(
                    ticker,
                    eventTimestamp,
                    marketTiming
                );
                break;

            case 'predictive':
                // Article predicts future - correlate with FUTURE performance
                timeWindows.future_prediction = await this.calculateFuturePerformance(
                    ticker,
                    eventTimestamp,
                    marketTiming
                );
                break;

            case 'both':
                // Article does both - get both windows
                timeWindows.past_analysis = await this.calculatePastPerformance(
                    ticker,
                    eventTimestamp,
                    marketTiming
                );
                timeWindows.future_prediction = await this.calculateFuturePerformance(
                    ticker,
                    eventTimestamp,
                    marketTiming
                );
                break;

            case 'neutral':
            default:
                // Generic news - use symmetric window
                timeWindows.full_window = await this.calculateSymmetricWindow(
                    ticker,
                    eventTimestamp,
                    marketTiming
                );
                break;
        }

        // Calculate alpha vs benchmarks
        const alphaMetrics = await this.calculateAlphaMetrics(
            ticker,
            eventTimestamp,
            orientation,
            marketTiming
        );

        return {
            ticker,
            eventTimestamp,
            orientation,
            timeWindows,
            marketTiming,
            alphaMetrics
        };
    }

    /**
     * Calculate market timing context
     * Critical for handling after-hours news correctly
     */
    private calculateMarketTiming(eventTimestamp: Date): OrientationAwareMetrics['marketTiming'] {
        const hour = eventTimestamp.getUTCHours();
        const dayOfWeek = eventTimestamp.getUTCDay();

        // US market hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
        const isMarketHours = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 14 && hour < 21;

        // Calculate next market open and previous close
        const nextOpen = this.getNextMarketOpen(eventTimestamp);
        const prevClose = this.getPrevMarketClose(eventTimestamp);

        const hoursUntilOpen = (nextOpen.getTime() - eventTimestamp.getTime()) / (1000 * 60 * 60);
        const hoursSinceClose = (eventTimestamp.getTime() - prevClose.getTime()) / (1000 * 60 * 60);

        return {
            published_during_market_hours: isMarketHours,
            next_market_open: nextOpen,
            prev_market_close: prevClose,
            hours_until_next_open: hoursUntilOpen,
            hours_since_last_close: hoursSinceClose
        };
    }

    /**
     * Calculate past performance (for reflective articles)
     */
    private async calculatePastPerformance(
        ticker: string,
        eventTimestamp: Date,
        marketTiming: OrientationAwareMetrics['marketTiming']
    ): Promise<OrientationAwareMetrics['timeWindows']['past_analysis']> {

        // Use market-aware time windows
        const baseTime = marketTiming.published_during_market_hours
            ? eventTimestamp
            : marketTiming.prev_market_close;

        const windows = {
            '1hour_before': await this.getStockReturn(ticker,
                new Date(baseTime.getTime() - 60 * 60 * 1000), baseTime),
            '4hour_before': await this.getStockReturn(ticker,
                new Date(baseTime.getTime() - 4 * 60 * 60 * 1000), baseTime),
            '1day_before': await this.getStockReturn(ticker,
                new Date(baseTime.getTime() - 24 * 60 * 60 * 1000), baseTime),
            '3day_before': await this.getStockReturn(ticker,
                new Date(baseTime.getTime() - 3 * 24 * 60 * 60 * 1000), baseTime),
            '7day_before': await this.getStockReturn(ticker,
                new Date(baseTime.getTime() - 7 * 24 * 60 * 60 * 1000), baseTime)
        };

        logger.debug('📊 Past performance calculated', { ticker, windows });
        return windows;
    }

    /**
     * Calculate future performance (for predictive articles)
     */
    private async calculateFuturePerformance(
        ticker: string,
        eventTimestamp: Date,
        marketTiming: OrientationAwareMetrics['marketTiming']
    ): Promise<OrientationAwareMetrics['timeWindows']['future_prediction']> {

        // Use next market open as starting point for after-hours news
        const baseTime = marketTiming.published_during_market_hours
            ? eventTimestamp
            : marketTiming.next_market_open;

        const windows = {
            '1hour_after': await this.getStockReturn(ticker,
                baseTime, new Date(baseTime.getTime() + 60 * 60 * 1000)),
            '4hour_after': await this.getStockReturn(ticker,
                baseTime, new Date(baseTime.getTime() + 4 * 60 * 60 * 1000)),
            '1day_after': await this.getStockReturn(ticker,
                baseTime, new Date(baseTime.getTime() + 24 * 60 * 60 * 1000)),
            '3day_after': await this.getStockReturn(ticker,
                baseTime, new Date(baseTime.getTime() + 3 * 24 * 60 * 60 * 1000)),
            '7day_after': await this.getStockReturn(ticker,
                baseTime, new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000))
        };

        logger.debug('🔮 Future performance calculated', { ticker, windows });
        return windows;
    }

    /**
     * Calculate symmetric window (for neutral articles)
     */
    private async calculateSymmetricWindow(
        ticker: string,
        eventTimestamp: Date,
        marketTiming: OrientationAwareMetrics['marketTiming']
    ): Promise<OrientationAwareMetrics['timeWindows']['full_window']> {

        const baseTime = marketTiming.published_during_market_hours
            ? eventTimestamp
            : marketTiming.next_market_open;

        return {
            '3day_before_to_3day_after': await this.getStockReturn(ticker,
                new Date(baseTime.getTime() - 3 * 24 * 60 * 60 * 1000),
                new Date(baseTime.getTime() + 3 * 24 * 60 * 60 * 1000)),
            '1day_before_to_1day_after': await this.getStockReturn(ticker,
                new Date(baseTime.getTime() - 24 * 60 * 60 * 1000),
                new Date(baseTime.getTime() + 24 * 60 * 60 * 1000))
        };
    }

    /**
     * Calculate alpha metrics vs benchmarks
     */
    private async calculateAlphaMetrics(
        ticker: string,
        eventTimestamp: Date,
        orientation: string,
        marketTiming: OrientationAwareMetrics['marketTiming']
    ): Promise<OrientationAwareMetrics['alphaMetrics']> {

        // Use 1-day window for alpha calculation (most reliable)
        const baseTime = marketTiming.published_during_market_hours
            ? eventTimestamp
            : marketTiming.next_market_open;

        const oneDayAfter = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);

        // Get performance for stock and benchmarks
        const [stockReturn, marketReturn, sectorReturn, faangReturn] = await Promise.all([
            this.getStockReturn(ticker, baseTime, oneDayAfter),
            this.getStockReturn('SPY', baseTime, oneDayAfter),
            this.getStockReturn('XLK', baseTime, oneDayAfter),
            this.getFaangCompositeReturn(baseTime, oneDayAfter)
        ]);

        return {
            vs_market: stockReturn - marketReturn,
            vs_sector: stockReturn - sectorReturn,
            vs_faang: stockReturn - faangReturn
        };
    }

    /**
     * Get stock return between two timestamps
     */
    private async getStockReturn(ticker: string, startTime: Date, endTime: Date): Promise<number> {
        try {
            const [startPrice, endPrice] = await Promise.all([
                this.getClosestPrice(ticker, startTime),
                this.getClosestPrice(ticker, endTime)
            ]);

            if (!startPrice || !endPrice) {
                logger.warn(`⚠️ Missing price data for ${ticker}`, { startTime, endTime });
                return 0;
            }

            return ((endPrice - startPrice) / startPrice) * 100;

        } catch (error) {
            logger.error(`❌ Error calculating return for ${ticker}`, error);
            return 0;
        }
    }

    /**
     * Get FAANG composite return
     */
    private async getFaangCompositeReturn(startTime: Date, endTime: Date): Promise<number> {
        const faangTickers = ['AAPL', 'GOOGL', 'META', 'AMZN', 'NFLX', 'TSLA'];

        const returns = await Promise.all(
            faangTickers.map(ticker => this.getStockReturn(ticker, startTime, endTime))
        );

        const validReturns = returns.filter(r => r !== 0);
        return validReturns.length > 0 ? validReturns.reduce((sum, r) => sum + r, 0) / validReturns.length : 0;
    }

    /**
     * Get closest stock price to timestamp
     */
    private async getClosestPrice(ticker: string, targetTime: Date): Promise<number | null> {
        try {
            const toleranceMinutes = 60; // 1 hour tolerance for market gaps
            const startWindow = new Date(targetTime.getTime() - (toleranceMinutes * 60 * 1000));
            const endWindow = new Date(targetTime.getTime() + (toleranceMinutes * 60 * 1000));

            const { data, error } = await this.supabase
                .from('stock_prices')
                .select('close, timestamp')
                .eq('ticker', ticker.toUpperCase())
                .gte('timestamp', startWindow.toISOString())
                .lte('timestamp', endWindow.toISOString())
                .order('timestamp', { ascending: true });

            if (error || !data || data.length === 0) {
                return null;
            }

            // Find closest timestamp
            let closest = data[0];
            let minDiff = Math.abs(new Date(data[0].timestamp).getTime() - targetTime.getTime());

            for (const record of data) {
                const diff = Math.abs(new Date(record.timestamp).getTime() - targetTime.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = record;
                }
            }

            return closest.close;

        } catch (error) {
            logger.error(`❌ Error getting closest price for ${ticker}`, error);
            return null;
        }
    }

    /**
     * Get next market open after timestamp
     */
    private getNextMarketOpen(timestamp: Date): Date {
        const nextOpen = new Date(timestamp);

        // If weekend, move to Monday
        if (nextOpen.getUTCDay() === 0) { // Sunday
            nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
        } else if (nextOpen.getUTCDay() === 6) { // Saturday
            nextOpen.setUTCDate(nextOpen.getUTCDate() + 2);
        }

        // Set to 9:30 AM EST (14:30 UTC)
        nextOpen.setUTCHours(14, 30, 0, 0);

        // If we're past market close today, move to next day
        if (timestamp.getUTCHours() >= 21) { // After 4 PM EST
            nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);

            // Handle weekend rollover
            if (nextOpen.getUTCDay() === 6) { // Saturday
                nextOpen.setUTCDate(nextOpen.getUTCDate() + 2);
            } else if (nextOpen.getUTCDay() === 0) { // Sunday
                nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
            }
        }

        return nextOpen;
    }

    /**
     * Get previous market close before timestamp
     */
    private getPrevMarketClose(timestamp: Date): Date {
        const prevClose = new Date(timestamp);

        // Set to 4:00 PM EST (21:00 UTC)
        prevClose.setUTCHours(21, 0, 0, 0);

        // If we're before market open today, move to previous day
        if (timestamp.getUTCHours() < 14 || (timestamp.getUTCHours() === 14 && timestamp.getUTCMinutes() < 30)) {
            prevClose.setUTCDate(prevClose.getUTCDate() - 1);
        }

        // Handle weekend rollover
        if (prevClose.getUTCDay() === 0) { // Sunday
            prevClose.setUTCDate(prevClose.getUTCDate() - 2);
        } else if (prevClose.getUTCDay() === 6) { // Saturday
            prevClose.setUTCDate(prevClose.getUTCDate() - 1);
        }

        return prevClose;
    }

    /**
     * Batch process articles with orientation awareness
     */
    async batchCalculateOrientationAware(
        events: Array<{
            articleId: string;
            ticker: string;
            timestamp: Date;
            orientation: 'predictive' | 'reflective' | 'both' | 'neutral'
        }>
    ): Promise<Map<string, OrientationAwareMetrics>> {

        logger.info('🔄 Batch calculating orientation-aware metrics', {
            eventCount: events.length
        });

        const results = new Map<string, OrientationAwareMetrics>();

        // Group by orientation for efficient processing
        const byOrientation = events.reduce((groups, event) => {
            const key = event.orientation;
            if (!groups[key]) groups[key] = [];
            groups[key].push(event);
            return groups;
        }, {} as Record<string, typeof events>);

        // Process each orientation group
        for (const [orientation, orientationEvents] of Object.entries(byOrientation)) {
            logger.info(`📊 Processing ${orientationEvents.length} ${orientation} articles`);

            for (const event of orientationEvents) {
                try {
                    const metrics = await this.calculateOrientationAwareMetrics(
                        event.ticker,
                        event.timestamp,
                        event.orientation
                    );

                    results.set(event.articleId, metrics);

                } catch (error) {
                    logger.error(`❌ Error processing ${event.articleId}`, error);
                }
            }
        }

        logger.info('✅ Batch orientation-aware calculation complete', {
            successful: results.size,
            total: events.length,
            byOrientation: Object.entries(byOrientation).map(([k, v]) => `${k}: ${v.length}`)
        });

        return results;
    }
}

export const orientationAwareCalculator = new OrientationAwareCalculator();
