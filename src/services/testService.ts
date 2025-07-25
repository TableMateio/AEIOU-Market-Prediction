import { createLogger } from '@utils/logger';
import AlphaVantageClient from '@data/sources/alphaVantage';
import AirtableStorage from '@data/storage/airtable';
import { NewsEvent, StockData, ValidationResult } from '@data/models';

const logger = createLogger('TestService');

export class TestService {
    private alphaVantage: AlphaVantageClient;
    private airtable: AirtableStorage;

    constructor() {
        this.alphaVantage = AlphaVantageClient.getInstance();
        this.airtable = AirtableStorage.getInstance();
    }

    // Test Alpha Vantage connection and data fetching
    async testAlphaVantageConnection(): Promise<boolean> {
        try {
            logger.info('Testing Alpha Vantage API connection...');

            const apiStatus = await this.alphaVantage.checkApiStatus();

            if (!apiStatus.healthy) {
                logger.error('Alpha Vantage API is not healthy', { status: apiStatus });
                return false;
            }

            logger.info('✅ Alpha Vantage API connection successful', {
                rateLimitInfo: apiStatus.rateLimitInfo
            });

            return true;
        } catch (error) {
            logger.error('❌ Alpha Vantage API connection failed', { error });
            return false;
        }
    }

    // Test fetching Apple stock data
    async testFetchAppleStock(): Promise<StockData | null> {
        try {
            logger.info('Fetching Apple (AAPL) stock quote...');

            const stockData = await this.alphaVantage.getQuote('AAPL');

            logger.info('✅ Successfully fetched Apple stock data', {
                symbol: stockData.stockSymbol,
                price: stockData.close,
                change: stockData.priceChange,
                changePercent: stockData.priceChangePercent,
                volume: stockData.volume,
                timestamp: stockData.timestamp
            });

            return stockData;
        } catch (error) {
            logger.error('❌ Failed to fetch Apple stock data', { error });
            return null;
        }
    }

    // Test fetching Apple news
    async testFetchAppleNews(): Promise<NewsEvent[]> {
        try {
            logger.info('Fetching Apple (AAPL) news...');

            const newsEvents = await this.alphaVantage.getNews(['AAPL'], undefined, undefined, undefined, 5);

            logger.info('✅ Successfully fetched Apple news', {
                newsCount: newsEvents.length,
                latestHeadline: newsEvents[0]?.headline,
                latestSource: newsEvents[0]?.source,
                latestSentiment: newsEvents[0]?.sentiment
            });

            return newsEvents;
        } catch (error) {
            logger.error('❌ Failed to fetch Apple news', { error });
            return [];
        }
    }

    // Test storing data in Airtable
    async testAirtableStorage(): Promise<boolean> {
        try {
            logger.info('Testing Airtable storage...');

            // Create a test validation result
            const testValidation: Omit<ValidationResult, 'id' | 'createdAt' | 'updatedAt'> = {
                newsEventId: 'test-event-' + Date.now(),
                stockSymbol: 'AAPL',
                validationType: 'manual_review',
                testDescription: 'API connection test - can we store validation results?',
                testParameters: {
                    testType: 'connection_test',
                    timestamp: new Date().toISOString(),
                    success: true
                },
                passed: true,
                score: 1.0,
                actualValue: 1.0,
                expectedValue: 1.0,
                threshold: 1.0,
                testPeriodStart: new Date(),
                testPeriodEnd: new Date(),
                validatedBy: 'automated',
                validatorId: 'test-service',
                notes: 'This is a test validation result to verify Airtable connectivity and data storage.'
            };

            const stored = await this.airtable.createValidationResult(testValidation);

            logger.info('✅ Successfully stored validation result in Airtable', {
                recordId: stored.id,
                stockSymbol: stored.stockSymbol,
                testType: stored.validationType
            });

            return true;
        } catch (error) {
            logger.error('❌ Failed to store data in Airtable', { error });
            return false;
        }
    }

    // Run a comprehensive system test
    async runSystemTest(): Promise<{
        alphaVantageConnection: boolean;
        stockDataFetch: boolean;
        newsFetch: boolean;
        airtableStorage: boolean;
        overall: boolean;
    }> {
        logger.info('🧪 Starting comprehensive AEIOU system test...');

        const results = {
            alphaVantageConnection: false,
            stockDataFetch: false,
            newsFetch: false,
            airtableStorage: false,
            overall: false
        };

        // Test 1: Alpha Vantage Connection
        results.alphaVantageConnection = await this.testAlphaVantageConnection();

        // Test 2: Stock Data Fetching
        if (results.alphaVantageConnection) {
            const stockData = await this.testFetchAppleStock();
            results.stockDataFetch = stockData !== null;
        }

        // Test 3: News Fetching
        if (results.alphaVantageConnection) {
            const newsData = await this.testFetchAppleNews();
            results.newsFetch = newsData.length > 0;
        }

        // Test 4: Airtable Storage
        results.airtableStorage = await this.testAirtableStorage();

        // Overall success
        results.overall = results.alphaVantageConnection &&
            results.stockDataFetch &&
            results.newsFetch &&
            results.airtableStorage;

        // Log final results
        logger.info('🏁 System test completed', {
            results,
            summary: {
                passed: Object.values(results).filter(Boolean).length,
                total: Object.keys(results).length - 1, // Exclude 'overall'
                success: results.overall
            }
        });

        if (results.overall) {
            logger.info('🎉 All systems operational! AEIOU is ready for Phase 1 validation.');
        } else {
            logger.warn('⚠️  Some systems failed. Check configuration and try again.');
        }

        return results;
    }

    // Quick API usage check
    async checkApiUsage(): Promise<void> {
        try {
            const status = await this.alphaVantage.checkApiStatus();

            if (status.healthy) {
                logger.info('📊 Current API Usage', {
                    rateLimitInfo: status.rateLimitInfo
                });
            }
        } catch (error) {
            logger.error('Failed to check API usage', { error });
        }
    }
}

export default TestService; 