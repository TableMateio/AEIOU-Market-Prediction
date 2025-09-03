/**
 * Relative Performance Calculator
 * 
 * Calculates how a stock performs relative to market benchmarks
 * This is the core innovation: predicting ALPHA, not absolute returns
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { AppConfig } from '../config/app.js';

const logger = createLogger('RelativePerformanceCalculator');

export interface BenchmarkTickers {
    market: string[];      // SPY, QQQ, IWM (broad market)
    sector: string[];      // XLK (tech sector)
    faang: string[];       // AAPL, GOOGL, META, AMZN, NFLX
}

export interface RelativePerformanceMetrics {
    ticker: string;
    eventTimestamp: Date;

    // Time windows (minutes/hours/days around event)
    timeWindows: {
        '5min': RelativePerformanceWindow;
        '30min': RelativePerformanceWindow;
        '2hour': RelativePerformanceWindow;
        '1day': RelativePerformanceWindow;
        '3day': RelativePerformanceWindow;
        '7day': RelativePerformanceWindow;
        '30day': RelativePerformanceWindow;
    };
}

export interface RelativePerformanceWindow {
    // Absolute performance
    stockReturn: number;           // % change for target stock

    // Benchmark performance  
    marketReturn: number;          // % change for broad market (SPY)
    sectorReturn: number;          // % change for sector (XLK)
    faangReturn: number;           // % change for FAANG composite

    // Relative performance (THE KEY METRICS)
    alphaVsMarket: number;         // stock - market
    alphaVsSector: number;         // stock - sector  
    alphaVsFaang: number;          // stock - faang

    // Risk-adjusted metrics
    stockVolatility: number;       // Realized volatility during window
    relativeVolatility: number;    // Stock vol / Market vol

    // Volume metrics
    relativeVolume: number;        // Volume vs 20-day average
    volumeSpike: boolean;          // Unusual volume (>3x average)

    // Metadata
    tradingHours: boolean;         // Was event during market hours?
    marketRegime: 'bull' | 'bear' | 'sideways';  // Broad market trend
}

export class RelativePerformanceCalculator {
    private supabase;

    // Standard benchmark tickers
    private benchmarks: BenchmarkTickers = {
        market: ['SPY', 'QQQ', 'IWM'],  // Broad market indices
        sector: ['XLK', 'XLV', 'XLF'],  // Sector ETFs (tech, health, finance)
        faang: ['AAPL', 'GOOGL', 'META', 'AMZN', 'NFLX', 'TSLA']  // Big tech
    };

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseUrl,
            config.supabaseKey
        );
    }

    /**
 * Calculate relative performance for a business event
 * Handles both predictive (future-looking) and reflective (past-analyzing) articles
 */
    async calculateRelativePerformance(
        ticker: string,
        eventTimestamp: Date,
        eventOrientation: 'predictive' | 'reflective' | 'both' | 'neutral' = 'neutral'
    ): Promise<RelativePerformanceMetrics> {

        logger.info('🧮 Calculating relative performance', {
            ticker,
            eventTimestamp: eventTimestamp.toISOString()
        });

        const timeWindows = {
            '5min': { before: 5, after: 5 },
            '30min': { before: 30, after: 30 },
            '2hour': { before: 120, after: 120 },
            '1day': { before: 1440, after: 1440 },      // 24 hours in minutes
            '3day': { before: 4320, after: 4320 },      // 3 days in minutes  
            '7day': { before: 10080, after: 10080 },    // 7 days in minutes
            '30day': { before: 43200, after: 43200 }    // 30 days in minutes
        };

        const results: any = { ticker, eventTimestamp, timeWindows: {} };

        // Calculate for each time window
        for (const [windowName, window] of Object.entries(timeWindows)) {
            const windowResult = await this.calculateWindowPerformance(
                ticker,
                eventTimestamp,
                window.before,
                window.after
            );

            results.timeWindows[windowName] = windowResult;
        }

        return results as RelativePerformanceMetrics;
    }

    /**
     * Calculate performance for a specific time window
     */
    private async calculateWindowPerformance(
        ticker: string,
        eventTime: Date,
        beforeMinutes: number,
        afterMinutes: number
    ): Promise<RelativePerformanceWindow> {

        const beforeTime = new Date(eventTime.getTime() - (beforeMinutes * 60 * 1000));
        const afterTime = new Date(eventTime.getTime() + (afterMinutes * 60 * 1000));

        // Get stock performance
        const stockReturn = await this.getStockReturn(ticker, beforeTime, afterTime);

        // Get benchmark performances in parallel
        const [marketReturn, sectorReturn, faangReturn] = await Promise.all([
            this.getBenchmarkReturn(this.benchmarks.market, beforeTime, afterTime),
            this.getBenchmarkReturn(this.benchmarks.sector, beforeTime, afterTime),
            this.getFaangCompositeReturn(beforeTime, afterTime)
        ]);

        // Calculate alpha (relative performance)
        const alphaVsMarket = stockReturn - marketReturn;
        const alphaVsSector = stockReturn - sectorReturn;
        const alphaVsFaang = stockReturn - faangReturn;

        // Get additional metrics
        const stockVolatility = await this.calculateVolatility(ticker, beforeTime, afterTime);
        const marketVolatility = await this.getBenchmarkVolatility(this.benchmarks.market, beforeTime, afterTime);
        const relativeVolatility = marketVolatility > 0 ? stockVolatility / marketVolatility : 0;

        const relativeVolume = await this.getRelativeVolume(ticker, eventTime);
        const volumeSpike = relativeVolume > 3.0; // 3x normal volume

        const tradingHours = this.isMarketHours(eventTime);
        const marketRegime = await this.getMarketRegime(eventTime);

        return {
            stockReturn,
            marketReturn,
            sectorReturn,
            faangReturn,
            alphaVsMarket,
            alphaVsSector,
            alphaVsFaang,
            stockVolatility,
            relativeVolatility,
            relativeVolume,
            volumeSpike,
            tradingHours,
            marketRegime
        };
    }

    /**
     * Get stock return between two timestamps
     */
    private async getStockReturn(ticker: string, startTime: Date, endTime: Date): Promise<number> {
        try {
            // Get closest prices to start and end times
            const [startPrice, endPrice] = await Promise.all([
                this.getClosestPrice(ticker, startTime),
                this.getClosestPrice(ticker, endTime)
            ]);

            if (!startPrice || !endPrice) {
                logger.warn(`⚠️ Missing price data for ${ticker}`, { startTime, endTime });
                return 0;
            }

            const returnPct = ((endPrice - startPrice) / startPrice) * 100;

            logger.debug('📈 Stock return calculated', {
                ticker,
                startPrice,
                endPrice,
                returnPct
            });

            return returnPct;

        } catch (error) {
            logger.error(`❌ Error calculating stock return for ${ticker}`, error);
            return 0;
        }
    }

    /**
     * Get benchmark return (average of multiple tickers)
     */
    private async getBenchmarkReturn(tickers: string[], startTime: Date, endTime: Date): Promise<number> {
        try {
            const returns = await Promise.all(
                tickers.map(ticker => this.getStockReturn(ticker, startTime, endTime))
            );

            // Calculate equal-weighted average
            const validReturns = returns.filter(r => r !== 0);
            if (validReturns.length === 0) return 0;

            const avgReturn = validReturns.reduce((sum, r) => sum + r, 0) / validReturns.length;

            logger.debug('📊 Benchmark return calculated', {
                tickers,
                returns,
                avgReturn
            });

            return avgReturn;

        } catch (error) {
            logger.error('❌ Error calculating benchmark return', error);
            return 0;
        }
    }

    /**
     * Get FAANG composite return (market cap weighted)
     */
    private async getFaangCompositeReturn(startTime: Date, endTime: Date): Promise<number> {
        // For now, equal weighted. Could enhance with market cap weighting
        return this.getBenchmarkReturn(this.benchmarks.faang, startTime, endTime);
    }

    /**
     * Get closest stock price to a timestamp
     */
    private async getClosestPrice(ticker: string, targetTime: Date): Promise<number | null> {
        try {
            const toleranceMinutes = 30; // 30 minute tolerance
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
     * Calculate realized volatility over time window
     */
    private async calculateVolatility(ticker: string, startTime: Date, endTime: Date): Promise<number> {
        try {
            const { data, error } = await this.supabase
                .from('stock_prices')
                .select('close, timestamp')
                .eq('ticker', ticker.toUpperCase())
                .gte('timestamp', startTime.toISOString())
                .lte('timestamp', endTime.toISOString())
                .order('timestamp', { ascending: true });

            if (error || !data || data.length < 2) {
                return 0;
            }

            // Calculate returns between consecutive prices
            const returns = [];
            for (let i = 1; i < data.length; i++) {
                const prevPrice = data[i - 1].close;
                const currPrice = data[i].close;
                const returnPct = ((currPrice - prevPrice) / prevPrice) * 100;
                returns.push(returnPct);
            }

            if (returns.length === 0) return 0;

            // Calculate standard deviation (volatility)
            const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
            const volatility = Math.sqrt(variance);

            return volatility;

        } catch (error) {
            logger.error(`❌ Error calculating volatility for ${ticker}`, error);
            return 0;
        }
    }

    /**
     * Get benchmark volatility
     */
    private async getBenchmarkVolatility(tickers: string[], startTime: Date, endTime: Date): Promise<number> {
        const volatilities = await Promise.all(
            tickers.map(ticker => this.calculateVolatility(ticker, startTime, endTime))
        );

        const validVolatilities = volatilities.filter(v => v > 0);
        if (validVolatilities.length === 0) return 0;

        return validVolatilities.reduce((sum, v) => sum + v, 0) / validVolatilities.length;
    }

    /**
     * Get relative volume (vs 20-day average)
     */
    private async getRelativeVolume(ticker: string, eventTime: Date): Promise<number> {
        try {
            const twentyDaysAgo = new Date(eventTime.getTime() - (20 * 24 * 60 * 60 * 1000));

            const { data, error } = await this.supabase
                .from('stock_prices')
                .select('volume, timestamp')
                .eq('ticker', ticker.toUpperCase())
                .gte('timestamp', twentyDaysAgo.toISOString())
                .lte('timestamp', eventTime.toISOString())
                .order('timestamp', { ascending: false });

            if (error || !data || data.length < 2) {
                return 1.0; // Default to normal volume
            }

            // Current day volume (sum of all bars on event day)
            const eventDay = eventTime.toISOString().split('T')[0];
            const eventDayVolume = data
                .filter(record => record.timestamp.startsWith(eventDay))
                .reduce((sum, record) => sum + (record.volume || 0), 0);

            // Average daily volume over past 20 days
            const dailyVolumes = new Map<string, number>();
            for (const record of data) {
                const day = record.timestamp.split('T')[0];
                const current = dailyVolumes.get(day) || 0;
                dailyVolumes.set(day, current + (record.volume || 0));
            }

            const avgDailyVolume = Array.from(dailyVolumes.values())
                .reduce((sum, vol) => sum + vol, 0) / dailyVolumes.size;

            return avgDailyVolume > 0 ? eventDayVolume / avgDailyVolume : 1.0;

        } catch (error) {
            logger.error(`❌ Error calculating relative volume for ${ticker}`, error);
            return 1.0;
        }
    }

    /**
     * Check if timestamp is during market hours
     */
    private isMarketHours(timestamp: Date): boolean {
        const hour = timestamp.getUTCHours();
        const dayOfWeek = timestamp.getUTCDay();

        // US market hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
        // Monday = 1, Friday = 5
        return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 14 && hour < 21;
    }

    /**
     * Determine market regime at event time
     */
    private async getMarketRegime(eventTime: Date): Promise<'bull' | 'bear' | 'sideways'> {
        try {
            // Look at SPY performance over past 30 days
            const thirtyDaysAgo = new Date(eventTime.getTime() - (30 * 24 * 60 * 60 * 1000));
            const spyReturn = await this.getStockReturn('SPY', thirtyDaysAgo, eventTime);

            if (spyReturn > 5) return 'bull';      // >5% in 30 days
            if (spyReturn < -5) return 'bear';     // <-5% in 30 days
            return 'sideways';                     // Between -5% and 5%

        } catch (error) {
            logger.error('❌ Error determining market regime', error);
            return 'sideways';
        }
    }

    /**
     * Batch calculate relative performance for multiple events
     */
    async batchCalculateRelativePerformance(
        events: Array<{ ticker: string; timestamp: Date; eventId: string }>
    ): Promise<Map<string, RelativePerformanceMetrics>> {

        logger.info('🔄 Batch calculating relative performance', {
            eventCount: events.length
        });

        const results = new Map<string, RelativePerformanceMetrics>();

        // Process in parallel batches of 10 to avoid overwhelming the database
        const batchSize = 10;
        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(async event => {
                    try {
                        const metrics = await this.calculateRelativePerformance(
                            event.ticker,
                            event.timestamp
                        );
                        return { eventId: event.eventId, metrics };
                    } catch (error) {
                        logger.error(`❌ Error calculating for event ${event.eventId}`, error);
                        return null;
                    }
                })
            );

            // Store successful results
            for (const result of batchResults) {
                if (result) {
                    results.set(result.eventId, result.metrics);
                }
            }

            logger.info(`✅ Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`);
        }

        return results;
    }
}

export const relativePerformanceCalculator = new RelativePerformanceCalculator();
