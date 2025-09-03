/**
 * Polygon.io Stock Data Service
 * 
 * Handles fetching stock data from Polygon.io API
 * FREE tier: 5 calls/minute, 2 years historical, minute aggregates
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../utils/logger.js';
import { AppConfig } from '../config/app.js';

const logger = createLogger('PolygonStockService');
const config = AppConfig.getInstance();

export interface PolygonAggregateBar {
    o: number;    // Open price
    h: number;    // High price
    l: number;    // Low price
    c: number;    // Close price
    v: number;    // Volume
    vw?: number;  // Volume-weighted average price
    t: number;    // Timestamp (Unix milliseconds)
    n?: number;   // Number of transactions
}

export interface PolygonAggregatesResponse {
    ticker: string;
    queryCount: number;
    resultsCount: number;
    adjusted: boolean;
    results: PolygonAggregateBar[];
    status: string;
    request_id: string;
    count: number;
}

export interface StockDataPoint {
    ticker: string;
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    vwap?: number;
    trade_count?: number;
    source: string;
    timeframe: string;
}

class PolygonStockService {
    private client: AxiosInstance;
    private apiKey: string;
    private baseURL = 'https://api.polygon.io';
    private rateLimiter: {
        requests: number[];
        maxRequests: number;
        windowMs: number;
    };

    constructor() {
        this.apiKey = process.env.POLYGON_API_KEY || '';

        if (!this.apiKey) {
            throw new Error('POLYGON_API_KEY environment variable is required');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            params: {
                apikey: this.apiKey
            }
        });

        // Rate limiter for FREE tier: 5 calls/minute
        this.rateLimiter = {
            requests: [],
            maxRequests: 5,
            windowMs: 60000 // 1 minute
        };

        logger.info('Polygon Stock Service initialized', {
            baseURL: this.baseURL,
            rateLimitWindow: '5 calls/minute (FREE tier)'
        });
    }

    /**
     * Rate limiting for FREE tier (5 calls/minute)
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();

        // Remove requests older than 1 minute
        this.rateLimiter.requests = this.rateLimiter.requests.filter(
            time => now - time < this.rateLimiter.windowMs
        );

        // Check if we're at the limit
        if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
            const oldestRequest = Math.min(...this.rateLimiter.requests);
            const waitTime = this.rateLimiter.windowMs - (now - oldestRequest) + 1000; // +1s buffer

            logger.info(`Rate limit reached, waiting ${Math.round(waitTime / 1000)}s`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.rateLimiter.requests.push(now);
    }

    /**
     * Test connection to Polygon API
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.enforceRateLimit();

            const response = await this.client.get('/v1/meta/symbols/AAPL/company');

            logger.info('Polygon API connection successful', {
                company: response.data?.name,
                status: response.status
            });

            return true;
        } catch (error: any) {
            logger.error('Polygon API connection failed', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            return false;
        }
    }

    /**
     * Get minute-level aggregates for a stock
     * FREE tier: 2 years of historical data available
     */
    async getMinuteAggregates(
        ticker: string,
        startDate: Date,
        endDate: Date,
        timespan: '1' | '5' | '15' | '30' = '1'
    ): Promise<StockDataPoint[]> {
        try {
            await this.enforceRateLimit();

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            logger.info('Fetching minute aggregates', {
                ticker,
                startDate: startDateStr,
                endDate: endDateStr,
                timespan: `${timespan}Min`
            });

            const response = await this.client.get<PolygonAggregatesResponse>(
                `/v2/aggs/ticker/${ticker}/range/${timespan}/minute/${startDateStr}/${endDateStr}`,
                {
                    params: {
                        adjusted: 'true',
                        sort: 'asc',
                        limit: 50000
                    }
                }
            );

            if (response.data.status !== 'OK' && response.data.status !== 'DELAYED') {
                throw new Error(`Polygon API error: ${response.data.status}`);
            }

            // Log if data is delayed (common for free tier)
            if (response.data.status === 'DELAYED') {
                logger.warn('Polygon returned DELAYED status - data may be older', {
                    ticker,
                    status: response.data.status
                });
            }

            const results = response.data.results || [];
            logger.info('Minute aggregates fetched', {
                ticker,
                count: results.length,
                timespan: `${timespan}Min`,
                status: response.data.status
            });

            return results.map(bar => ({
                ticker: ticker.toUpperCase(),
                timestamp: new Date(bar.t),
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v,
                vwap: bar.vw,
                trade_count: bar.n,
                source: 'polygon',
                timeframe: `${timespan}Min`
            }));

        } catch (error: any) {
            logger.error('Failed to fetch minute aggregates', {
                ticker,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Get daily aggregates (End of Day data)
     * More efficient for longer time periods
     */
    async getDailyAggregates(
        ticker: string,
        startDate: Date,
        endDate: Date
    ): Promise<StockDataPoint[]> {
        try {
            await this.enforceRateLimit();

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            logger.info('Fetching daily aggregates', {
                ticker,
                startDate: startDateStr,
                endDate: endDateStr
            });

            const response = await this.client.get<PolygonAggregatesResponse>(
                `/v2/aggs/ticker/${ticker}/range/1/day/${startDateStr}/${endDateStr}`,
                {
                    params: {
                        adjusted: 'true',
                        sort: 'asc',
                        limit: 50000
                    }
                }
            );

            if (response.data.status !== 'OK' && response.data.status !== 'DELAYED') {
                throw new Error(`Polygon API error: ${response.data.status}`);
            }

            // Log if data is delayed (common for free tier)
            if (response.data.status === 'DELAYED') {
                logger.warn('Polygon returned DELAYED status - data may be older', {
                    ticker,
                    status: response.data.status
                });
            }

            const results = response.data.results || [];
            logger.info('Daily aggregates fetched', {
                ticker,
                count: results.length,
                status: response.data.status
            });

            return results.map(bar => ({
                ticker: ticker.toUpperCase(),
                timestamp: new Date(bar.t),
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v,
                vwap: bar.vw,
                trade_count: bar.n,
                source: 'polygon',
                timeframe: '1Day'
            }));

        } catch (error: any) {
            logger.error('Failed to fetch daily aggregates', {
                ticker,
                error: error.message,
                status: error.response?.status
            });
            throw error;
        }
    }

    /**
     * Get stock data around a specific timestamp (for article correlation)
     * Fetches data in a window around the target time
     */
    async getDataAroundTimestamp(
        ticker: string,
        targetTimestamp: Date,
        windowMinutes: number = 240 // 4 hours default
    ): Promise<StockDataPoint[]> {
        const startTime = new Date(targetTimestamp.getTime() - windowMinutes * 60 * 1000);
        const endTime = new Date(targetTimestamp.getTime() + windowMinutes * 60 * 1000);

        logger.info('Fetching data around timestamp', {
            ticker,
            targetTimestamp: targetTimestamp.toISOString(),
            windowMinutes,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
        });

        return await this.getMinuteAggregates(ticker, startTime, endTime, '1');
    }

    /**
     * Get current rate limit status
     */
    getRateLimitStatus(): { remaining: number; resetTime: Date } {
        const now = Date.now();
        const recentRequests = this.rateLimiter.requests.filter(
            time => now - time < this.rateLimiter.windowMs
        );

        const remaining = Math.max(0, this.rateLimiter.maxRequests - recentRequests.length);
        const oldestRequest = Math.min(...recentRequests, now);
        const resetTime = new Date(oldestRequest + this.rateLimiter.windowMs);

        return { remaining, resetTime };
    }
}

export const polygonStockService = new PolygonStockService();
export default PolygonStockService;
