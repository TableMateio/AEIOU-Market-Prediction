import axios from 'axios';
import { logger } from '../utils/logger.js';

export interface AlpacaBar {
    t: string; // timestamp
    o: number; // open
    h: number; // high
    l: number; // low
    c: number; // close
    v: number; // volume
}

export interface AlpacaBarsResponse {
    bars: { [symbol: string]: AlpacaBar[] };
    next_page_token?: string;
}

export interface AlpacaTrade {
    t: string; // timestamp
    p: number; // price
    s: number; // size
}

export interface AlpacaTradesResponse {
    trades: { [symbol: string]: AlpacaTrade[] };
    next_page_token?: string;
}

export interface StockDataPoint {
    timestamp: string;
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    source: string;
}

export interface MultiTimeHorizonData {
    article_timestamp: string;
    symbol: string;
    before: {
        '5min': StockDataPoint | null;
        '15min': StockDataPoint | null;
        '1hour': StockDataPoint | null;
        '2hour': StockDataPoint | null;
        '4hour': StockDataPoint | null;
        'previous_close': StockDataPoint | null;
    };
    after: {
        '5min': StockDataPoint | null;
        '15min': StockDataPoint | null;
        '1hour': StockDataPoint | null;
        '2hour': StockDataPoint | null;
        '4hour': StockDataPoint | null;
        'end_of_day': StockDataPoint | null;
        'next_morning': StockDataPoint | null;
        '7days': StockDataPoint | null;
        '14days': StockDataPoint | null;
        '1month': StockDataPoint | null;
        '3months': StockDataPoint | null;
        '6months': StockDataPoint | null;
        '1year': StockDataPoint | null;
    };
}

export class AlpacaStockService {
    private readonly apiKey: string;
    private readonly apiSecret: string;
    private readonly baseUrl = 'https://data.alpaca.markets/v2';
    private readonly rateLimitDelay = 200; // 5 requests per second max for free tier

    constructor(apiKey?: string, apiSecret?: string) {
        this.apiKey = apiKey || process.env.ALPACA_API_KEY || '';
        this.apiSecret = apiSecret || process.env.ALPACA_API_SECRET || '';
        
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('Alpaca API key and secret are required. Set ALPACA_API_KEY and ALPACA_API_SECRET environment variables.');
        }
    }

    /**
     * Get stock bars (OHLCV) data for a specific time range
     */
    async getBars(
        symbol: string,
        timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day',
        start: string,
        end: string
    ): Promise<StockDataPoint[]> {
        try {
            logger.info('📊 Fetching stock bars from Alpaca', { symbol, timeframe, start, end });

            const response = await axios.get<AlpacaBarsResponse>(`${this.baseUrl}/stocks/${symbol}/bars`, {
                params: {
                    timeframe,
                    start,
                    end,
                    adjustment: 'raw'
                },
                headers: {
                    'APCA-API-KEY-ID': this.apiKey,
                    'APCA-API-SECRET-KEY': this.apiSecret
                },
                timeout: 30000
            });

            const bars = response.data.bars[symbol] || [];
            const stockData = bars.map(bar => ({
                timestamp: bar.t,
                symbol,
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v,
                source: 'alpaca'
            }));

            logger.info('✅ Successfully fetched stock bars from Alpaca', {
                symbol,
                barsCount: stockData.length
            });

            return stockData;

        } catch (error: any) {
            logger.error('❌ Error fetching stock bars from Alpaca', {
                error: error.message,
                symbol,
                timeframe
            });
            throw error;
        }
    }

    /**
     * Get the closest stock data point to a specific timestamp
     */
    async getClosestDataPoint(
        symbol: string,
        targetTimestamp: string,
        timeframe: '1Min' | '5Min' | '15Min' | '1Hour' | '1Day' = '1Min',
        searchWindowHours: number = 24
    ): Promise<StockDataPoint | null> {
        const targetTime = new Date(targetTimestamp);
        const startTime = new Date(targetTime.getTime() - (searchWindowHours * 60 * 60 * 1000));
        const endTime = new Date(targetTime.getTime() + (searchWindowHours * 60 * 60 * 1000));

        try {
            const bars = await this.getBars(
                symbol,
                timeframe,
                startTime.toISOString(),
                endTime.toISOString()
            );

            if (bars.length === 0) return null;

            // Find the bar with timestamp closest to target
            let closestBar = bars[0];
            let minDiff = Math.abs(new Date(bars[0].timestamp).getTime() - targetTime.getTime());

            for (const bar of bars) {
                const diff = Math.abs(new Date(bar.timestamp).getTime() - targetTime.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    closestBar = bar;
                }
            }

            return closestBar;

        } catch (error: any) {
            logger.error('❌ Error getting closest data point', {
                error: error.message,
                symbol,
                targetTimestamp
            });
            return null;
        }
    }

    /**
     * Get comprehensive multi-time-horizon data for ML training
     */
    async getMultiTimeHorizonData(
        symbol: string,
        articleTimestamp: string
    ): Promise<MultiTimeHorizonData> {
        const articleTime = new Date(articleTimestamp);
        
        logger.info('🎯 Generating multi-time-horizon stock data', {
            symbol,
            articleTimestamp
        });

        const data: MultiTimeHorizonData = {
            article_timestamp: articleTimestamp,
            symbol,
            before: {
                '5min': null,
                '15min': null,
                '1hour': null,
                '2hour': null,
                '4hour': null,
                'previous_close': null
            },
            after: {
                '5min': null,
                '15min': null,
                '1hour': null,
                '2hour': null,
                '4hour': null,
                'end_of_day': null,
                'next_morning': null,
                '7days': null,
                '14days': null,
                '1month': null,
                '3months': null,
                '6months': null,
                '1year': null
            }
        };

        try {
            // Calculate target timestamps for each horizon
            const timestamps = {
                before: {
                    '5min': new Date(articleTime.getTime() - 5 * 60 * 1000),
                    '15min': new Date(articleTime.getTime() - 15 * 60 * 1000),
                    '1hour': new Date(articleTime.getTime() - 60 * 60 * 1000),
                    '2hour': new Date(articleTime.getTime() - 2 * 60 * 60 * 1000),
                    '4hour': new Date(articleTime.getTime() - 4 * 60 * 60 * 1000),
                    'previous_close': this.getPreviousMarketClose(articleTime)
                },
                after: {
                    '5min': new Date(articleTime.getTime() + 5 * 60 * 1000),
                    '15min': new Date(articleTime.getTime() + 15 * 60 * 1000),
                    '1hour': new Date(articleTime.getTime() + 60 * 60 * 1000),
                    '2hour': new Date(articleTime.getTime() + 2 * 60 * 60 * 1000),
                    '4hour': new Date(articleTime.getTime() + 4 * 60 * 60 * 1000),
                    'end_of_day': this.getEndOfDay(articleTime),
                    'next_morning': this.getNextMarketOpen(articleTime),
                    '7days': new Date(articleTime.getTime() + 7 * 24 * 60 * 60 * 1000),
                    '14days': new Date(articleTime.getTime() + 14 * 24 * 60 * 60 * 1000),
                    '1month': new Date(articleTime.getTime() + 30 * 24 * 60 * 60 * 1000),
                    '3months': new Date(articleTime.getTime() + 90 * 24 * 60 * 60 * 1000),
                    '6months': new Date(articleTime.getTime() + 180 * 24 * 60 * 60 * 1000),
                    '1year': new Date(articleTime.getTime() + 365 * 24 * 60 * 60 * 1000)
                }
            };

            // Fetch data for each time horizon with rate limiting
            for (const [period, targetTime] of Object.entries(timestamps.before)) {
                try {
                    data.before[period as keyof typeof data.before] = await this.getClosestDataPoint(
                        symbol,
                        targetTime.toISOString(),
                        period.includes('min') ? '1Min' : '1Hour'
                    );
                    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
                } catch (error) {
                    logger.warn(`⚠️ Failed to get ${period} before data`, { error });
                }
            }

            for (const [period, targetTime] of Object.entries(timestamps.after)) {
                try {
                    const timeframe = period.includes('min') || period.includes('hour') ? '1Min' : '1Day';
                    data.after[period as keyof typeof data.after] = await this.getClosestDataPoint(
                        symbol,
                        targetTime.toISOString(),
                        timeframe
                    );
                    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
                } catch (error) {
                    logger.warn(`⚠️ Failed to get ${period} after data`, { error });
                }
            }

            logger.info('✅ Multi-time-horizon data complete', {
                symbol,
                beforeDataPoints: Object.values(data.before).filter(Boolean).length,
                afterDataPoints: Object.values(data.after).filter(Boolean).length
            });

            return data;

        } catch (error: any) {
            logger.error('❌ Error generating multi-time-horizon data', {
                error: error.message,
                symbol,
                articleTimestamp
            });
            throw error;
        }
    }

    /**
     * Get previous market close time
     */
    private getPreviousMarketClose(date: Date): Date {
        const marketClose = new Date(date);
        marketClose.setHours(16, 0, 0, 0); // 4:00 PM ET
        
        // If article is before market close, use previous day
        if (date < marketClose) {
            marketClose.setDate(marketClose.getDate() - 1);
        }
        
        // Skip weekends
        while (marketClose.getDay() === 0 || marketClose.getDay() === 6) {
            marketClose.setDate(marketClose.getDate() - 1);
        }
        
        return marketClose;
    }

    /**
     * Get end of day time (market close)
     */
    private getEndOfDay(date: Date): Date {
        const endOfDay = new Date(date);
        endOfDay.setHours(16, 0, 0, 0); // 4:00 PM ET
        
        // Skip weekends
        while (endOfDay.getDay() === 0 || endOfDay.getDay() === 6) {
            endOfDay.setDate(endOfDay.getDate() + 1);
        }
        
        return endOfDay;
    }

    /**
     * Get next market open time
     */
    private getNextMarketOpen(date: Date): Date {
        const nextOpen = new Date(date);
        nextOpen.setDate(nextOpen.getDate() + 1);
        nextOpen.setHours(9, 30, 0, 0); // 9:30 AM ET
        
        // Skip weekends
        while (nextOpen.getDay() === 0 || nextOpen.getDay() === 6) {
            nextOpen.setDate(nextOpen.getDate() + 1);
        }
        
        return nextOpen;
    }

    /**
     * Test API connection and authentication
     */
    async testConnection(): Promise<{ success: boolean; message: string; sampleData?: any }> {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

            const response = await axios.get(`${this.baseUrl}/stocks/AAPL/bars`, {
                params: {
                    timeframe: '1Day',
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                },
                headers: {
                    'APCA-API-KEY-ID': this.apiKey,
                    'APCA-API-SECRET-KEY': this.apiSecret
                },
                timeout: 10000
            });

            const bars = response.data.bars?.AAPL || [];
            
            return {
                success: true,
                message: `✅ Alpaca connection successful. Retrieved ${bars.length} data points.`,
                sampleData: {
                    barsCount: bars.length,
                    latestBar: bars[0] || 'No data available'
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: `❌ Alpaca connection failed: ${error.message}`
            };
        }
    }
}

// Export singleton instance
export const alpacaStockService = new AlpacaStockService();
