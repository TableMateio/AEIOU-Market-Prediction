import axios, { AxiosInstance } from 'axios';
import { AppConfig } from '@config/app';
import { createLogger, logPerformanceAsync } from '@utils/logger';
import { DataSourceError, RateLimitError, throwError } from '@utils/errorHandler';
import { StockData, NewsEvent } from '@data/models';

const config = AppConfig.getInstance();
const logger = createLogger('AlphaVantageClient');

interface AlphaVantageResponse<T> {
    data: T;
    rateLimitRemaining: number;
    rateLimitReset: Date;
}

interface TimeSeriesData {
    'Meta Data': {
        '1. Information': string;
        '2. Symbol': string;
        '3. Last Refreshed': string;
        '4. Interval'?: string;
        '5. Output Size'?: string;
        '6. Time Zone': string;
    };
    'Time Series (1min)'?: { [timestamp: string]: DailyDataPoint };
    'Time Series (5min)'?: { [timestamp: string]: DailyDataPoint };
    'Time Series (Daily)'?: { [timestamp: string]: DailyDataPoint };
    [key: string]: any; // For other intervals
}

interface DailyDataPoint {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
}

interface NewsResponse {
    feed: NewsItem[];
    items: string;
    sentiment_score_definition: string;
    relevance_score_definition: string;
}

interface NewsItem {
    title: string;
    url: string;
    time_published: string;
    authors: string[];
    summary: string;
    banner_image?: string;
    source: string;
    category_within_source: string;
    source_domain: string;
    topics: Array<{
        topic: string;
        relevance_score: string;
    }>;
    overall_sentiment_score: number;
    overall_sentiment_label: 'Bearish' | 'Somewhat-Bearish' | 'Neutral' | 'Somewhat-Bullish' | 'Bullish';
    ticker_sentiment: Array<{
        ticker: string;
        relevance_score: string;
        ticker_sentiment_score: string;
        ticker_sentiment_label: string;
    }>;
}

export class AlphaVantageClient {
    private static instance: AlphaVantageClient;
    private client: AxiosInstance;
    private rateLimitQueue: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];
    private requestCount = 0;
    private windowStart = Date.now();
    private readonly maxRequestsPerWindow: number;
    private readonly windowDurationMs: number;

    private constructor() {
        this.maxRequestsPerWindow = config.apiConfig.alphaVantage.rateLimitMaxRequests;
        this.windowDurationMs = config.apiConfig.alphaVantage.rateLimitWindowMs;

        this.client = axios.create({
            baseURL: config.apiConfig.alphaVantage.baseUrl,
            timeout: 30000,
            headers: {
                'User-Agent': 'AEIOU-Market-Prediction/1.0',
            },
        });

        this.setupInterceptors();
    }

    public static getInstance(): AlphaVantageClient {
        if (!AlphaVantageClient.instance) {
            AlphaVantageClient.instance = new AlphaVantageClient();
        }
        return AlphaVantageClient.instance;
    }

    private setupInterceptors(): void {
        // Request interceptor for rate limiting
        this.client.interceptors.request.use(async (config) => {
            await this.enforceRateLimit();
            return config;
        });

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => {
                logger.debug('Alpha Vantage API request successful', {
                    url: response.config.url,
                    status: response.status,
                });
                return response;
            },
            (error) => {
                logger.error('Alpha Vantage API request failed', {
                    url: error.config?.url,
                    status: error.response?.status,
                    message: error.message,
                });

                if (error.response?.status === 429) {
                    throw new RateLimitError('Alpha Vantage rate limit exceeded');
                }

                throw new DataSourceError(
                    `Alpha Vantage API error: ${error.message}`,
                    'alpha_vantage',
                    error
                );
            }
        );
    }

    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();

        // Reset window if needed
        if (now - this.windowStart >= this.windowDurationMs) {
            this.requestCount = 0;
            this.windowStart = now;
        }

        // Check if we're at the limit
        if (this.requestCount >= this.maxRequestsPerWindow) {
            const waitTime = this.windowDurationMs - (now - this.windowStart);

            logger.warn('Rate limit reached, waiting...', {
                requestCount: this.requestCount,
                maxRequests: this.maxRequestsPerWindow,
                waitTimeMs: waitTime,
            });

            // Wait for the window to reset
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Reset counters
            this.requestCount = 0;
            this.windowStart = Date.now();
        }

        this.requestCount++;

        logger.debug('Rate limit check passed', {
            requestCount: this.requestCount,
            maxRequests: this.maxRequestsPerWindow,
        });
    }

    // Stock Data Methods
    public async getIntradayData(
        symbol: string,
        interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min',
        outputSize: 'compact' | 'full' = 'compact'
    ): Promise<StockData[]> {
        return logPerformanceAsync(
            logger,
            `getIntradayData-${symbol}-${interval}`,
            async () => {
                const response = await this.client.get('', {
                    params: {
                        function: 'TIME_SERIES_INTRADAY',
                        symbol: symbol,
                        interval: interval,
                        outputsize: outputSize,
                        apikey: config.apiConfig.alphaVantage.apiKey,
                    },
                });

                return this.parseTimeSeriesData(response.data, symbol, interval);
            },
            { stockSymbol: symbol, interval, outputSize }
        );
    }

    public async getDailyData(
        symbol: string,
        outputSize: 'compact' | 'full' = 'compact'
    ): Promise<StockData[]> {
        return logPerformanceAsync(
            logger,
            `getDailyData-${symbol}`,
            async () => {
                const response = await this.client.get('', {
                    params: {
                        function: 'TIME_SERIES_DAILY',
                        symbol: symbol,
                        outputsize: outputSize,
                        apikey: config.apiConfig.alphaVantage.apiKey,
                    },
                });

                return this.parseTimeSeriesData(response.data, symbol, 'daily');
            },
            { stockSymbol: symbol, outputSize }
        );
    }

    public async getQuote(symbol: string): Promise<StockData> {
        return logPerformanceAsync(
            logger,
            `getQuote-${symbol}`,
            async () => {
                const response = await this.client.get('', {
                    params: {
                        function: 'GLOBAL_QUOTE',
                        symbol: symbol,
                        apikey: config.apiConfig.alphaVantage.apiKey,
                    },
                });

                return this.parseQuoteData(response.data, symbol);
            },
            { stockSymbol: symbol }
        );
    }

    // News Data Methods
    public async getNews(
        tickers?: string[],
        topics?: string[],
        timeFrom?: Date,
        timeTo?: Date,
        limit: number = 50
    ): Promise<NewsEvent[]> {
        return logPerformanceAsync(
            logger,
            'getNews',
            async () => {
                const params: any = {
                    function: 'NEWS_SENTIMENT',
                    apikey: config.apiConfig.alphaVantage.apiKey,
                    limit: Math.min(limit, 1000), // Alpha Vantage max is 1000
                };

                if (tickers && tickers.length > 0) {
                    params.tickers = tickers.join(',');
                }

                if (topics && topics.length > 0) {
                    params.topics = topics.join(',');
                }

                if (timeFrom) {
                    params.time_from = this.formatDateTime(timeFrom);
                }

                if (timeTo) {
                    params.time_to = this.formatDateTime(timeTo);
                }

                const response = await this.client.get('', { params });

                return this.parseNewsData(response.data);
            },
            { tickers, topics, timeFrom, timeTo, limit }
        );
    }

    // Helper Methods
    private parseTimeSeriesData(data: TimeSeriesData, symbol: string, interval: string): StockData[] {
        if (!data || data['Error Message'] || data['Note']) {
            const errorMsg = data?.['Error Message'] || data?.['Note'] || 'Unknown error';
            throw new DataSourceError(`Alpha Vantage error: ${errorMsg}`, 'alpha_vantage');
        }

        const metaData = data['Meta Data'];
        if (!metaData) {
            throw new DataSourceError('Invalid response format from Alpha Vantage', 'alpha_vantage');
        }

        // Find the time series data key
        const timeSeriesKey = Object.keys(data).find(key => key.startsWith('Time Series'));
        if (!timeSeriesKey || !data[timeSeriesKey]) {
            throw new DataSourceError('No time series data found', 'alpha_vantage');
        }

        const timeSeries = data[timeSeriesKey];
        const results: StockData[] = [];

        for (const [timestamp, values] of Object.entries(timeSeries)) {
            const open = parseFloat(values['1. open']);
            const high = parseFloat(values['2. high']);
            const low = parseFloat(values['3. low']);
            const close = parseFloat(values['4. close']);
            const volume = parseInt(values['5. volume']);

            results.push({
                stockSymbol: symbol,
                timestamp: new Date(timestamp),
                open,
                high,
                low,
                close,
                volume,
                priceChange: 0, // Will be calculated later if needed
                priceChangePercent: 0, // Will be calculated later if needed
                dataSource: 'alpha_vantage',
                interval: interval as any,
                rawData: {
                    metaData,
                    dataPoint: values,
                },
            });
        }

        // Sort by timestamp (most recent first)
        results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Calculate price changes
        for (let i = 0; i < results.length - 1; i++) {
            const current = results[i];
            const previous = results[i + 1];
            current.priceChange = current.close - previous.close;
            current.priceChangePercent = (current.priceChange / previous.close) * 100;
        }

        logger.info(`Parsed ${results.length} data points for ${symbol}`, {
            stockSymbol: symbol,
            interval,
            dataPoints: results.length,
        });

        return results;
    }

    private parseQuoteData(data: any, symbol: string): StockData {
        const quote = data['Global Quote'];
        if (!quote) {
            throw new DataSourceError('Invalid quote response from Alpha Vantage', 'alpha_vantage');
        }

        return {
            stockSymbol: symbol,
            timestamp: new Date(), // Current time for quote
            open: parseFloat(quote['02. open']),
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            close: parseFloat(quote['05. price']),
            volume: parseInt(quote['06. volume']),
            priceChange: parseFloat(quote['09. change']),
            priceChangePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            dataSource: 'alpha_vantage',
            interval: 'daily',
            rawData: quote,
        };
    }

    private parseNewsData(data: NewsResponse): NewsEvent[] {
        if (!data || !data.feed) {
            throw new DataSourceError('Invalid news response from Alpha Vantage', 'alpha_vantage');
        }

        const results: NewsEvent[] = [];

        for (const item of data.feed) {
            // Extract primary ticker if available
            const primaryTicker = item.ticker_sentiment?.[0]?.ticker || '';

            // Convert sentiment label to our format
            const sentiment = this.convertSentimentLabel(item.overall_sentiment_label);

            // Extract topics as tags
            const tags = item.topics.map(topic => topic.topic);

            results.push({
                headline: item.title,
                summary: item.summary,
                source: item.source,
                sourceCredibility: this.calculateSourceCredibility(item.source),
                publishedAt: this.parseAlphaVantageDateTime(item.time_published),
                discoveredAt: new Date(), // Current time when we discovered it
                stockSymbol: primaryTicker,
                eventType: 'market_news', // Default, could be enhanced with categorization
                sentiment,
                sentimentScore: item.overall_sentiment_score,
                relevanceScore: primaryTicker ? parseFloat(item.ticker_sentiment[0]?.relevance_score || '0') : 0,
                url: item.url,
                content: item.summary, // Alpha Vantage doesn't provide full content
                tags,
                rawData: item,
            });
        }

        logger.info(`Parsed ${results.length} news items`, {
            newsItems: results.length,
        });

        return results;
    }

    private convertSentimentLabel(label: string): 'positive' | 'negative' | 'neutral' {
        switch (label) {
            case 'Bullish':
            case 'Somewhat-Bullish':
                return 'positive';
            case 'Bearish':
            case 'Somewhat-Bearish':
                return 'negative';
            default:
                return 'neutral';
        }
    }

    private calculateSourceCredibility(source: string): number {
        // Simple credibility scoring based on source
        const credibilityMap: { [key: string]: number } = {
            'Reuters': 9,
            'Bloomberg': 9,
            'Wall Street Journal': 9,
            'Financial Times': 9,
            'CNN': 7,
            'CNBC': 8,
            'MarketWatch': 7,
            'Yahoo Finance': 6,
            'The Motley Fool': 5,
        };

        return credibilityMap[source] || 5; // Default to 5 for unknown sources
    }

    private parseAlphaVantageDateTime(timestamp: string): Date {
        // Alpha Vantage format: YYYYMMDDTHHMMSS
        const year = parseInt(timestamp.substr(0, 4));
        const month = parseInt(timestamp.substr(4, 2)) - 1; // JS months are 0-based
        const day = parseInt(timestamp.substr(6, 2));
        const hour = parseInt(timestamp.substr(9, 2));
        const minute = parseInt(timestamp.substr(11, 2));
        const second = parseInt(timestamp.substr(13, 2));

        return new Date(year, month, day, hour, minute, second);
    }

    private formatDateTime(date: Date): string {
        // Convert to Alpha Vantage format: YYYYMMDDTHHMMSS
        return date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0') + 'T' +
            date.getHours().toString().padStart(2, '0') +
            date.getMinutes().toString().padStart(2, '0') +
            date.getSeconds().toString().padStart(2, '0');
    }

    // Utility method to check API status
    public async checkApiStatus(): Promise<{ healthy: boolean; rateLimitInfo: any }> {
        try {
            // Simple API call to check connectivity
            await this.client.get('', {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: 'AAPL',
                    apikey: config.apiConfig.alphaVantage.apiKey,
                },
            });

            return {
                healthy: true,
                rateLimitInfo: {
                    requestCount: this.requestCount,
                    maxRequests: this.maxRequestsPerWindow,
                    windowStart: new Date(this.windowStart),
                    rateLimitRemaining: this.maxRequestsPerWindow - this.requestCount,
                },
            };
        } catch (error) {
            return {
                healthy: false,
                rateLimitInfo: {
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
}

export default AlphaVantageClient; 