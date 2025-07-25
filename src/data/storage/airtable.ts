import Airtable from 'airtable';
import { AppConfig } from '@config/app';
import { createLogger } from '@utils/logger';
import { DataSourceError, throwError } from '@utils/errorHandler';
import {
    NewsEvent,
    StockData,
    CausalChain,
    ValidationResult,
    BusinessFactor,
    InvestorBelief,
    ExpectedImpact
} from '@data/models';

const config = AppConfig.getInstance();
const logger = createLogger('AirtableStorage');

// Initialize Airtable
const airtable = new Airtable({
    apiKey: config.airtableConfig.apiKey,
});

const base = airtable.base(config.airtableConfig.baseId);

// Table schema definitions for automatic creation
const TABLE_SCHEMAS = {
    'News Events': {
        fields: [
            { name: 'headline', type: 'singleLineText' },
            { name: 'summary', type: 'multilineText' },
            { name: 'source', type: 'singleLineText' },
            { name: 'sourceCredibility', type: 'number', options: { precision: 0 } },
            { name: 'publishedAt', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
            { name: 'discoveredAt', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
            { name: 'stockSymbol', type: 'singleLineText' },
            {
                name: 'eventType', type: 'singleSelect', options: {
                    choices: [
                        { name: 'earnings' }, { name: 'product_launch' }, { name: 'acquisition' },
                        { name: 'regulatory' }, { name: 'executive_change' }, { name: 'market_news' }, { name: 'other' }
                    ]
                }
            },
            {
                name: 'sentiment', type: 'singleSelect', options: {
                    choices: [
                        { name: 'positive' }, { name: 'negative' }, { name: 'neutral' }
                    ]
                }
            },
            { name: 'sentimentScore', type: 'number', options: { precision: 2 } },
            { name: 'relevanceScore', type: 'number', options: { precision: 2 } },
            { name: 'url', type: 'url' },
            { name: 'content', type: 'multilineText' },
            { name: 'tags', type: 'multipleSelects', options: { choices: [] } },
            { name: 'rawData', type: 'multilineText' },
        ]
    },
    'Stock Data': {
        fields: [
            { name: 'stockSymbol', type: 'singleLineText' },
            { name: 'timestamp', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
            { name: 'open', type: 'number', options: { precision: 4 } },
            { name: 'high', type: 'number', options: { precision: 4 } },
            { name: 'low', type: 'number', options: { precision: 4 } },
            { name: 'close', type: 'number', options: { precision: 4 } },
            { name: 'volume', type: 'number', options: { precision: 0 } },
            { name: 'priceChange', type: 'number', options: { precision: 4 } },
            { name: 'priceChangePercent', type: 'number', options: { precision: 2 } },
            { name: 'volumeChange', type: 'number', options: { precision: 0 } },
            { name: 'volumeChangePercent', type: 'number', options: { precision: 2 } },
            { name: 'marketCap', type: 'number', options: { precision: 0 } },
            {
                name: 'dataSource', type: 'singleSelect', options: {
                    choices: [
                        { name: 'alpha_vantage' }, { name: 'yahoo_finance' }, { name: 'other' }
                    ]
                }
            },
            {
                name: 'interval', type: 'singleSelect', options: {
                    choices: [
                        { name: '1min' }, { name: '5min' }, { name: '15min' },
                        { name: '30min' }, { name: '60min' }, { name: 'daily' }
                    ]
                }
            },
            { name: 'rawData', type: 'multilineText' },
        ]
    },
    'Causal Chains': {
        fields: [
            { name: 'newsEventId', type: 'singleLineText' },
            { name: 'stockSymbol', type: 'singleLineText' },
            {
                name: 'extractionMethod', type: 'singleSelect', options: {
                    choices: [
                        { name: 'manual' }, { name: 'gpt4' }, { name: 'rule_based' }
                    ]
                }
            },
            { name: 'extractedBy', type: 'singleLineText' },
            { name: 'businessFactors', type: 'multilineText' }, // JSON string
            { name: 'investorBeliefs', type: 'multilineText' }, // JSON string
            { name: 'expectedImpacts', type: 'multilineText' }, // JSON string
            { name: 'confidence', type: 'number', options: { precision: 2 } },
            { name: 'validated', type: 'checkbox' },
            { name: 'validationNotes', type: 'multilineText' },
            { name: 'extractedAt', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
            { name: 'validatedAt', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
        ]
    },
    'Validation Results': {
        fields: [
            { name: 'newsEventId', type: 'singleLineText' },
            { name: 'causalChainId', type: 'singleLineText' },
            { name: 'stockSymbol', type: 'singleLineText' },
            {
                name: 'validationType', type: 'singleSelect', options: {
                    choices: [
                        { name: 'timestamp_accuracy' }, { name: 'news_coverage' },
                        { name: 'correlation_analysis' }, { name: 'prediction_accuracy' }, { name: 'manual_review' }
                    ]
                }
            },
            { name: 'testDescription', type: 'multilineText' },
            { name: 'testParameters', type: 'multilineText' }, // JSON string
            { name: 'passed', type: 'checkbox' },
            { name: 'score', type: 'number', options: { precision: 3 } },
            { name: 'actualValue', type: 'number', options: { precision: 4 } },
            { name: 'expectedValue', type: 'number', options: { precision: 4 } },
            { name: 'threshold', type: 'number', options: { precision: 4 } },
            { name: 'testPeriodStart', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
            { name: 'testPeriodEnd', type: 'dateTime', options: { dateFormat: { name: 'iso' }, timeFormat: { name: '24hour' } } },
            {
                name: 'marketConditions', type: 'singleSelect', options: {
                    choices: [
                        { name: 'bull' }, { name: 'bear' }, { name: 'sideways' }, { name: 'volatile' }
                    ]
                }
            },
            {
                name: 'validatedBy', type: 'singleSelect', options: {
                    choices: [
                        { name: 'automated' }, { name: 'manual' }
                    ]
                }
            },
            { name: 'validatorId', type: 'singleLineText' },
            { name: 'notes', type: 'multilineText' },
        ]
    }
};

export class AirtableStorage {
    private static instance: AirtableStorage;
    private tablesInitialized = false;

    private constructor() { }

    public static getInstance(): AirtableStorage {
        if (!AirtableStorage.instance) {
            AirtableStorage.instance = new AirtableStorage();
        }
        return AirtableStorage.instance;
    }

    // Initialize tables and schema (call this once at startup)
    public async initializeTables(): Promise<void> {
        if (this.tablesInitialized) {
            return;
        }

        try {
            logger.info('Initializing Airtable schema...');

            // Note: Airtable doesn't allow programmatic table creation via API
            // This method will verify tables exist and log the required schema
            await this.verifyTablesExist();

            this.tablesInitialized = true;
            logger.info('Airtable schema verification complete');
        } catch (error) {
            logger.error('Failed to initialize Airtable schema', { error });
            throw new DataSourceError('Failed to initialize Airtable schema', 'airtable', error as Error);
        }
    }

    private async verifyTablesExist(): Promise<void> {
        const requiredTables = Object.keys(TABLE_SCHEMAS);

        for (const tableName of requiredTables) {
            try {
                // Try to fetch one record to verify table exists
                await base(tableName).select({ maxRecords: 1 }).firstPage();
                logger.info(`Table verified: ${tableName}`);
            } catch (error) {
                logger.warn(`Table may not exist: ${tableName}`, {
                    error: error instanceof Error ? error.message : String(error)
                });

                // Log the required schema for manual creation
                logger.info(`Required schema for ${tableName}:`, {
                    schema: TABLE_SCHEMAS[tableName as keyof typeof TABLE_SCHEMAS]
                });
            }
        }
    }

    // News Events CRUD
    public async createNewsEvent(event: Omit<NewsEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<NewsEvent> {
        try {
            const record = await base(config.airtableConfig.tables.newsEvents).create([{
                fields: {
                    headline: event.headline,
                    summary: event.summary,
                    source: event.source,
                    sourceCredibility: event.sourceCredibility,
                    publishedAt: event.publishedAt.toISOString(),
                    discoveredAt: event.discoveredAt.toISOString(),
                    stockSymbol: event.stockSymbol,
                    eventType: event.eventType,
                    sentiment: event.sentiment,
                    sentimentScore: event.sentimentScore,
                    relevanceScore: event.relevanceScore,
                    url: event.url || '',
                    content: event.content || '',
                    tags: event.tags,
                    rawData: event.rawData ? JSON.stringify(event.rawData) : '',
                }
            }]);

            return this.mapNewsEventRecord(record[0]);
        } catch (error) {
            logger.error('Failed to create news event', { error, event });
            throw new DataSourceError('Failed to create news event', 'airtable', error as Error);
        }
    }

    public async getNewsEvents(filters?: { stockSymbol?: string; limit?: number }): Promise<NewsEvent[]> {
        try {
            const selectOptions: any = {
                maxRecords: filters?.limit || 100,
                sort: [{ field: 'publishedAt', direction: 'desc' }]
            };

            if (filters?.stockSymbol) {
                selectOptions.filterByFormula = `{stockSymbol} = '${filters.stockSymbol}'`;
            }

            const records = await base(config.airtableConfig.tables.newsEvents)
                .select(selectOptions)
                .all();

            return records.map(this.mapNewsEventRecord);
        } catch (error) {
            logger.error('Failed to get news events', { error, filters });
            throw new DataSourceError('Failed to get news events', 'airtable', error as Error);
        }
    }

    // Stock Data CRUD
    public async createStockData(data: Omit<StockData, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockData> {
        try {
            const record = await base(config.airtableConfig.tables.stockData).create([{
                fields: {
                    stockSymbol: data.stockSymbol,
                    timestamp: data.timestamp.toISOString(),
                    open: data.open,
                    high: data.high,
                    low: data.low,
                    close: data.close,
                    volume: data.volume,
                    priceChange: data.priceChange,
                    priceChangePercent: data.priceChangePercent,
                    volumeChange: data.volumeChange || 0,
                    volumeChangePercent: data.volumeChangePercent || 0,
                    marketCap: data.marketCap || 0,
                    dataSource: data.dataSource,
                    interval: data.interval,
                    rawData: data.rawData ? JSON.stringify(data.rawData) : '',
                }
            }]);

            return this.mapStockDataRecord(record[0]);
        } catch (error) {
            logger.error('Failed to create stock data', { error, data });
            throw new DataSourceError('Failed to create stock data', 'airtable', error as Error);
        }
    }

    public async getStockData(
        stockSymbol: string,
        startDate?: Date,
        endDate?: Date,
        limit?: number
    ): Promise<StockData[]> {
        try {
            let filterFormula = `{stockSymbol} = '${stockSymbol}'`;

            if (startDate && endDate) {
                filterFormula += ` AND IS_AFTER({timestamp}, '${startDate.toISOString()}') AND IS_BEFORE({timestamp}, '${endDate.toISOString()}')`;
            }

            const records = await base(config.airtableConfig.tables.stockData)
                .select({
                    maxRecords: limit || 1000,
                    filterByFormula: filterFormula,
                    sort: [{ field: 'timestamp', direction: 'desc' }]
                })
                .all();

            return records.map(this.mapStockDataRecord);
        } catch (error) {
            logger.error('Failed to get stock data', { error, stockSymbol, startDate, endDate });
            throw new DataSourceError('Failed to get stock data', 'airtable', error as Error);
        }
    }

    // Validation Results CRUD
    public async createValidationResult(result: Omit<ValidationResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<ValidationResult> {
        try {
            const record = await base(config.airtableConfig.tables.validationResults).create([{
                fields: {
                    newsEventId: result.newsEventId,
                    causalChainId: result.causalChainId || '',
                    stockSymbol: result.stockSymbol,
                    validationType: result.validationType,
                    testDescription: result.testDescription,
                    testParameters: JSON.stringify(result.testParameters),
                    passed: result.passed,
                    score: result.score,
                    actualValue: result.actualValue,
                    expectedValue: result.expectedValue,
                    threshold: result.threshold,
                    testPeriodStart: result.testPeriodStart.toISOString(),
                    testPeriodEnd: result.testPeriodEnd.toISOString(),
                    marketConditions: result.marketConditions || '',
                    validatedBy: result.validatedBy,
                    validatorId: result.validatorId || '',
                    notes: result.notes || '',
                }
            }]);

            return this.mapValidationResultRecord(record[0]);
        } catch (error) {
            logger.error('Failed to create validation result', { error, result });
            throw new DataSourceError('Failed to create validation result', 'airtable', error as Error);
        }
    }

    // Helper methods to map Airtable records to our models
    private mapNewsEventRecord(record: any): NewsEvent {
        return {
            id: record.id,
            headline: record.fields.headline || '',
            summary: record.fields.summary || '',
            source: record.fields.source || '',
            sourceCredibility: record.fields.sourceCredibility || 1,
            publishedAt: new Date(record.fields.publishedAt),
            discoveredAt: new Date(record.fields.discoveredAt),
            stockSymbol: record.fields.stockSymbol || '',
            eventType: record.fields.eventType || 'other',
            sentiment: record.fields.sentiment || 'neutral',
            sentimentScore: record.fields.sentimentScore || 0,
            relevanceScore: record.fields.relevanceScore || 0,
            url: record.fields.url || undefined,
            content: record.fields.content || undefined,
            tags: record.fields.tags || [],
            rawData: record.fields.rawData ? JSON.parse(record.fields.rawData) : undefined,
            createdAt: new Date(record.createdTime),
            updatedAt: new Date(record.createdTime), // Airtable doesn't track updates
        };
    }

    private mapStockDataRecord(record: any): StockData {
        return {
            id: record.id,
            stockSymbol: record.fields.stockSymbol || '',
            timestamp: new Date(record.fields.timestamp),
            open: record.fields.open || 0,
            high: record.fields.high || 0,
            low: record.fields.low || 0,
            close: record.fields.close || 0,
            volume: record.fields.volume || 0,
            priceChange: record.fields.priceChange || 0,
            priceChangePercent: record.fields.priceChangePercent || 0,
            volumeChange: record.fields.volumeChange,
            volumeChangePercent: record.fields.volumeChangePercent,
            marketCap: record.fields.marketCap,
            dataSource: record.fields.dataSource || 'other',
            interval: record.fields.interval || 'daily',
            rawData: record.fields.rawData ? JSON.parse(record.fields.rawData) : undefined,
            createdAt: new Date(record.createdTime),
            updatedAt: new Date(record.createdTime),
        };
    }

    private mapValidationResultRecord(record: any): ValidationResult {
        return {
            id: record.id,
            newsEventId: record.fields.newsEventId || '',
            causalChainId: record.fields.causalChainId,
            stockSymbol: record.fields.stockSymbol || '',
            validationType: record.fields.validationType || 'manual_review',
            testDescription: record.fields.testDescription || '',
            testParameters: record.fields.testParameters ? JSON.parse(record.fields.testParameters) : {},
            passed: record.fields.passed || false,
            score: record.fields.score || 0,
            actualValue: record.fields.actualValue || 0,
            expectedValue: record.fields.expectedValue || 0,
            threshold: record.fields.threshold || 0,
            testPeriodStart: new Date(record.fields.testPeriodStart),
            testPeriodEnd: new Date(record.fields.testPeriodEnd),
            marketConditions: record.fields.marketConditions,
            validatedBy: record.fields.validatedBy || 'manual',
            validatorId: record.fields.validatorId,
            notes: record.fields.notes,
            createdAt: new Date(record.createdTime),
            updatedAt: new Date(record.createdTime),
        };
    }
}

export default AirtableStorage; 