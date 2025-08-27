/**
 * Migration Tool - Move data from Airtable to Supabase
 * 
 * Handles the complete migration of existing news events, stock data, and validation results
 */

import { createLogger } from '@utils/logger';
import { DatabaseFactory } from '@data/storage/databaseFactory';
import { DatabaseInterface } from '@data/storage/databaseInterface';

const logger = createLogger('Migration');

export class MigrationService {
    private airtableDB: DatabaseInterface;
    private supabaseDB: DatabaseInterface;

    constructor() {
        // Will be initialized in migrate()
    }

    public async migrate(): Promise<{
        newsEvents: number;
        stockData: number;
        validationResults: number;
    }> {
        try {
            logger.info('Starting migration from Airtable to Supabase...');

            // Initialize both databases
            this.airtableDB = await DatabaseFactory.createDatabase('airtable');
            this.supabaseDB = await DatabaseFactory.createDatabase('supabase');

            const results = {
                newsEvents: 0,
                stockData: 0,
                validationResults: 0
            };

            // Migrate News Events
            logger.info('Migrating news events...');
            const newsEvents = await this.airtableDB.getNewsEvents({ limit: 1000 });
            logger.info(`Found ${newsEvents.length} news events to migrate`);

            if (newsEvents.length > 0) {
                const eventsToMigrate = newsEvents.map(event => ({
                    headline: event.headline,
                    summary: event.summary,
                    source: event.source,
                    sourceCredibility: event.sourceCredibility,
                    publishedAt: event.publishedAt,
                    discoveredAt: event.discoveredAt,
                    stockSymbol: event.stockSymbol,
                    eventType: event.eventType,
                    sentiment: event.sentiment,
                    sentimentScore: event.sentimentScore,
                    relevanceScore: event.relevanceScore,
                    url: event.url,
                    content: event.content,
                    tags: event.tags,
                    rawData: event.rawData
                }));

                const migratedEvents = await this.supabaseDB.batchCreateNewsEvents(eventsToMigrate);
                results.newsEvents = migratedEvents.length;
                logger.info(`Successfully migrated ${results.newsEvents} news events`);
            }

            // Migrate Stock Data
            logger.info('Migrating stock data...');
            const stockData = await this.airtableDB.getStockData('AAPL', undefined, undefined, 1000);
            logger.info(`Found ${stockData.length} stock data points to migrate`);

            for (const data of stockData) {
                try {
                    await this.supabaseDB.createStockData({
                        stockSymbol: data.stockSymbol,
                        timestamp: data.timestamp,
                        open: data.open,
                        high: data.high,
                        low: data.low,
                        close: data.close,
                        volume: data.volume,
                        priceChange: data.priceChange,
                        priceChangePercent: data.priceChangePercent,
                        volumeChange: data.volumeChange,
                        volumeChangePercent: data.volumeChangePercent,
                        dataSource: data.dataSource,
                        interval: data.interval,
                        rawData: data.rawData
                    });
                    results.stockData++;
                } catch (error) {
                    logger.warn(`Failed to migrate stock data point`, { error, timestamp: data.timestamp });
                }
            }
            logger.info(`Successfully migrated ${results.stockData} stock data points`);

            // Migrate Validation Results
            logger.info('Migrating validation results...');
            const validationResults = await this.airtableDB.getValidationResults({ limit: 1000 });
            logger.info(`Found ${validationResults.length} validation results to migrate`);

            for (const result of validationResults) {
                try {
                    await this.supabaseDB.createValidationResult({
                        newsEventId: result.newsEventId,
                        causalChainId: result.causalChainId,
                        stockSymbol: result.stockSymbol,
                        validationType: result.validationType,
                        testDescription: result.testDescription,
                        testParameters: result.testParameters,
                        passed: result.passed,
                        score: result.score,
                        actualValue: result.actualValue,
                        expectedValue: result.expectedValue,
                        threshold: result.threshold,
                        testPeriodStart: result.testPeriodStart,
                        testPeriodEnd: result.testPeriodEnd,
                        marketConditions: result.marketConditions,
                        validatedBy: result.validatedBy,
                        validatorId: result.validatorId,
                        notes: result.notes
                    });
                    results.validationResults++;
                } catch (error) {
                    logger.warn(`Failed to migrate validation result`, { error, resultId: result.id });
                }
            }
            logger.info(`Successfully migrated ${results.validationResults} validation results`);

            logger.info('Migration completed successfully!', results);
            return results;

        } catch (error) {
            logger.error('Migration failed', { error });
            throw error;
        }
    }

    public async validateMigration(): Promise<{
        newsEventsMatch: boolean;
        stockDataMatch: boolean;
        validationResultsMatch: boolean;
    }> {
        try {
            logger.info('Validating migration...');

            const airtableNewsEvents = await this.airtableDB.getNewsEvents({ limit: 1000 });
            const supabaseNewsEvents = await this.supabaseDB.getNewsEvents({ limit: 1000 });

            const airtableStockData = await this.airtableDB.getStockData('AAPL', undefined, undefined, 1000);
            const supabaseStockData = await this.supabaseDB.getStockData('AAPL', undefined, undefined, 1000);

            const airtableValidationResults = await this.airtableDB.getValidationResults({ limit: 1000 });
            const supabaseValidationResults = await this.supabaseDB.getValidationResults({ limit: 1000 });

            const results = {
                newsEventsMatch: airtableNewsEvents.length === supabaseNewsEvents.length,
                stockDataMatch: airtableStockData.length === supabaseStockData.length,
                validationResultsMatch: airtableValidationResults.length === supabaseValidationResults.length
            };

            logger.info('Migration validation completed', {
                airtable: {
                    newsEvents: airtableNewsEvents.length,
                    stockData: airtableStockData.length,
                    validationResults: airtableValidationResults.length
                },
                supabase: {
                    newsEvents: supabaseNewsEvents.length,
                    stockData: supabaseStockData.length,
                    validationResults: supabaseValidationResults.length
                },
                results
            });

            return results;

        } catch (error) {
            logger.error('Migration validation failed', { error });
            throw error;
        }
    }
}

export default MigrationService;

