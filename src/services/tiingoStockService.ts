import axios from 'axios';
import { logger } from '../utils/logger.js';
import type { StockDataPoint, MultiTimeHorizonData } from './alpacaStockService.js';

export interface TiingoPrice {
    date: string;
    close: number;
    high: number;
    low: number;
    open: number;
    volume: number;
    adjClose: number;
    adjHigh: number;
    adjLow: number;
    adjOpen: number;
    adjVolume: number;
    divCash: number;
    splitFactor: number;
}

export interface TiingoIntraday {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export class TiingoStockService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://api.tiingo.com/tiingo';
    private readonly rateLimitDelay = 100; // 10 requests per second for free tier

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.TIINGO_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('Tiingo API key is required. Set TIINGO_API_KEY environment variable.');
        }
    }

    /**
     * Get daily stock prices
     */
    async getDailyPrices(
        symbol: string,
        startDate: string,
        endDate: string
    ): Promise<StockDataPoint[]> {
        try {
            logger.info('📊 Fetching daily prices from Tiingo', { symbol, startDate, endDate });

            const response = await axios.get<TiingoPrice[]>(`${this.baseUrl}/daily/${symbol}/prices`, {
                params: {
                    startDate,
                    endDate,
                    token: this.apiKey
                },
                timeout: 30000
            });

            const stockData = response.data.map(price => ({
                timestamp: price.date,
                symbol,
                open: price.open,
                high: price.high,
                low: price.low,
                close: price.close,
                volume: price.volume,
                source: 'tiingo'
            }));

            logger.info('✅ Successfully fetched daily prices from Tiingo', {
                symbol,
                pricesCount: stockData.length
            });

            return stockData;

        } catch (error: any) {
            logger.error('❌ Error fetching daily prices from Tiingo', {
                error: error.message,
                symbol,
                startDate,
                endDate
            });
            throw error;
        }
    }

    /**
     * Get intraday stock prices (requires paid plan for real-time, free tier has 30min delay)
     */
    async getIntradayPrices(
        symbol: string,
        startDate: string,
        endDate: string,
        resampleFreq: '1min' | '5min' | '30min' | '1hour' = '5min'
    ): Promise<StockDataPoint[]> {
        try {
            logger.info('📊 Fetching intraday prices from Tiingo', { 
                symbol, 
                startDate, 
                endDate, 
                resampleFreq 
            });

            const response = await axios.get<TiingoIntraday[]>(`${this.baseUrl}/iex/${symbol}/prices`, {
                params: {
                    startDate,
                    endDate,
                    resampleFreq,
                    token: this.apiKey
                },
                timeout: 30000
            });

            const stockData = response.data.map(price => ({
                timestamp: price.date,
                symbol,
                open: price.open,
                high: price.high,
                low: price.low,
                close: price.close,
                volume: price.volume,
                source: 'tiingo'
            }));

            logger.info('✅ Successfully fetched intraday prices from Tiingo', {
                symbol,
                pricesCount: stockData.length
            });

            return stockData;

        } catch (error: any) {
            logger.error('❌ Error fetching intraday prices from Tiingo', {
                error: error.message,
                symbol,
                startDate,
                endDate
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
        useIntraday: boolean = true,
        searchWindowHours: number = 24
    ): Promise<StockDataPoint | null> {
        const targetTime = new Date(targetTimestamp);
        const startTime = new Date(targetTime.getTime() - (searchWindowHours * 60 * 60 * 1000));
        const endTime = new Date(targetTime.getTime() + (searchWindowHours * 60 * 60 * 1000));

        try {
            let prices: StockDataPoint[];

            if (useIntraday) {
                // Try intraday first (5min resolution)
                prices = await this.getIntradayPrices(
                    symbol,
                    startTime.toISOString().split('T')[0],
                    endTime.toISOString().split('T')[0],
                    '5min'
                );
            } else {
                // Fall back to daily data
                prices = await this.getDailyPrices(
                    symbol,
                    startTime.toISOString().split('T')[0],
                    endTime.toISOString().split('T')[0]
                );
            }

            if (prices.length === 0) return null;

            // Find the price with timestamp closest to target
            let closestPrice = prices[0];
            let minDiff = Math.abs(new Date(prices[0].timestamp).getTime() - targetTime.getTime());

            for (const price of prices) {
                const diff = Math.abs(new Date(price.timestamp).getTime() - targetTime.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    closestPrice = price;
                }
            }

            return closestPrice;

        } catch (error: any) {
            logger.error('❌ Error getting closest data point from Tiingo', {
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
        
        logger.info('🎯 Generating multi-time-horizon stock data via Tiingo', {
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

            // Fetch data for short-term horizons with intraday data
            const shortTermHorizons = ['5min', '15min', '1hour', '2hour', '4hour'];
            
            for (const [period, targetTime] of Object.entries(timestamps.before)) {
                try {
                    const useIntraday = shortTermHorizons.includes(period);
                    data.before[period as keyof typeof data.before] = await this.getClosestDataPoint(
                        symbol,
                        targetTime.toISOString(),
                        useIntraday
                    );
                    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
                } catch (error) {
                    logger.warn(`⚠️ Failed to get ${period} before data`, { error });
                }
            }

            for (const [period, targetTime] of Object.entries(timestamps.after)) {
                try {
                    const useIntraday = shortTermHorizons.includes(period) || 
                                       period === 'end_of_day' || 
                                       period === 'next_morning';
                    
                    data.after[period as keyof typeof data.after] = await this.getClosestDataPoint(
                        symbol,
                        targetTime.toISOString(),
                        useIntraday
                    );
                    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
                } catch (error) {
                    logger.warn(`⚠️ Failed to get ${period} after data`, { error });
                }
            }

            logger.info('✅ Multi-time-horizon data complete via Tiingo', {
                symbol,
                beforeDataPoints: Object.values(data.before).filter(Boolean).length,
                afterDataPoints: Object.values(data.after).filter(Boolean).length
            });

            return data;

        } catch (error: any) {
            logger.error('❌ Error generating multi-time-horizon data via Tiingo', {
                error: error.message,
                symbol,
                articleTimestamp
            });
            throw error;
        }
    }

    /**
     * Get stock metadata and company information
     */
    async getStockMetadata(symbol: string): Promise<any> {
        try {
            const response = await axios.get(`${this.baseUrl}/daily/${symbol}`, {
                params: {
                    token: this.apiKey
                },
                timeout: 10000
            });

            return response.data;
        } catch (error: any) {
            logger.error('❌ Error fetching stock metadata from Tiingo', {
                error: error.message,
                symbol
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
            const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

            const response = await axios.get(`${this.baseUrl}/daily/AAPL/prices`, {
                params: {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    token: this.apiKey
                },
                timeout: 10000
            });

            const prices = response.data || [];
            
            return {
                success: true,
                message: `✅ Tiingo connection successful. Retrieved ${prices.length} data points.`,
                sampleData: {
                    pricesCount: prices.length,
                    latestPrice: prices[prices.length - 1] || 'No data available'
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: `❌ Tiingo connection failed: ${error.message}`
            };
        }
    }

    /**
     * Get API usage information
     */
    async getUsageStats(): Promise<{ success: boolean; stats?: any; message: string }> {
        try {
            // Tiingo doesn't have a dedicated usage endpoint, but we can check account info
            const response = await axios.get(`${this.baseUrl}/account/usage`, {
                params: {
                    token: this.apiKey
                },
                timeout: 10000
            });

            return {
                success: true,
                stats: response.data,
                message: '✅ Usage stats retrieved'
            };
        } catch (error: any) {
            return {
                success: false,
                message: `❌ Unable to get usage stats: ${error.message}`
            };
        }
    }
}

// Export singleton instance
export const tiingoStockService = new TiingoStockService();
