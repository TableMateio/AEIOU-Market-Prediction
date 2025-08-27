import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '@config/app';
import { createLogger } from '@utils/logger';
import { DataSourceError } from '@utils/errorHandler';
import {
    NewsEvent,
    StockData,
    ValidationResult
} from '@data/models';
import {
    ArticleTaxonomy,
    BusinessCausalChain,
    BeliefFactors
} from '../../belief/ontology/KnowledgeStructures';

const config = AppConfig.getInstance();
const logger = createLogger('SupabaseStorage');

// Database type definitions matching our schema
interface DatabaseNewsEvent {
    id: string;
    title: string;
    summary?: string;
    url?: string;
    published_time: string;
    banner_image?: string;
    source_id?: string;
    overall_sentiment_score?: number;
    overall_sentiment?: 'Bearish' | 'Neutral' | 'Bullish';
    ticker_sentiments?: any;
    belief_factors?: any;
    business_causal_chain?: any;
    pattern_type?: string;
    processing_status: 'pending' | 'processing' | 'completed' | 'failed';
    causal_chains_extracted: boolean;
    price_impact_measured: boolean;
    body?: string;
    raw_data?: any;
    created_at: string;
    updated_at: string;
}

interface DatabaseStockData {
    id: string;
    ticker_id: string;
    timestamp: string;
    open_price: number;
    high_price: number;
    low_price: number;
    close_price: number;
    volume: number;
    price_change?: number;
    price_change_percent?: number;
    data_source?: string;
    interval_type?: string;
    raw_data?: any;
    created_at: string;
}



export class SupabaseStorage {
    private static instance: SupabaseStorage;
    private client: SupabaseClient;
    private initialized = false;

    private constructor() {
        this.client = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    public static getInstance(): SupabaseStorage {
        if (!SupabaseStorage.instance) {
            SupabaseStorage.instance = new SupabaseStorage();
        }
        return SupabaseStorage.instance;
    }

    // Initialize and verify database schema
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            logger.info('Initializing Supabase connection...');

            // Test connection and verify key tables exist
            await this.verifySchema();

            this.initialized = true;
            logger.info('Supabase initialization complete');
        } catch (error) {
            logger.error('Failed to initialize Supabase', { error });
            throw new DataSourceError('Failed to initialize Supabase', 'supabase', error as Error);
        }
    }

    private async verifySchema(): Promise<void> {
        const requiredTables = [
            'news_events',
            'news_sources',
            'tickers',
            'stock_data',
            'validation_results'
        ];

        for (const table of requiredTables) {
            try {
                const { error } = await this.client
                    .from(table)
                    .select('*')
                    .limit(1);

                if (error) {
                    throw error;
                }

                logger.info(`Table verified: ${table}`);
            } catch (error) {
                logger.error(`Table verification failed: ${table}`, { error });
                throw new DataSourceError(`Table not found: ${table}`, 'supabase', error as Error);
            }
        }
    }

    // =====================================================================================
    // News Events CRUD
    // =====================================================================================

    public async createNewsEvent(event: Omit<NewsEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<NewsEvent> {
        try {
            // Get or create source
            const sourceId = await this.getOrCreateSource(event.source);

            // Get ticker ID for Apple (for now)
            const { data: tickerData } = await this.client
                .from('tickers')
                .select('id')
                .eq('symbol', event.stockSymbol)
                .single();

            if (!tickerData) {
                throw new Error(`Ticker not found: ${event.stockSymbol}`);
            }

            const dbEvent: any = {
                title: event.headline,
                summary: event.summary,
                url: event.url,
                published_time: event.publishedAt.toISOString(),
                source_id: sourceId,
                overall_sentiment_score: event.sentimentScore,
                overall_sentiment: this.mapSentiment(event.sentiment),
                processing_status: 'pending',
                causal_chains_extracted: false,
                price_impact_measured: false,
                body: event.content || undefined,
                raw_data: event.rawData
            };

            const { data, error } = await this.client
                .from('news_events')
                .insert(dbEvent)
                .select()
                .single();

            if (error) {
                throw error;
            }

            // Link to ticker
            await this.client
                .from('news_event_tickers')
                .insert({
                    news_event_id: data.id,
                    ticker_id: tickerData.id,
                    relevance_score: event.relevanceScore
                });

            return this.mapNewsEventFromDB(data);
        } catch (error) {
            logger.error('Failed to create news event', { error, event });
            throw new DataSourceError('Failed to create news event', 'supabase', error as Error);
        }
    }

    public async updateNewsEventWithProcessedData(
        eventId: string,
        processedData: {
            taxonomy?: ArticleTaxonomy;
            businessChains?: BusinessCausalChain[];
            beliefFactors?: BeliefFactors;
            patternType?: string;
        }
    ): Promise<NewsEvent> {
        try {
            const updateData: Partial<DatabaseNewsEvent> = {
                processing_status: 'completed',
                causal_chains_extracted: true
            };

            if (processedData.beliefFactors) {
                updateData.belief_factors = processedData.beliefFactors;
            }

            if (processedData.businessChains) {
                updateData.business_causal_chain = processedData.businessChains;
            }

            if (processedData.patternType) {
                updateData.pattern_type = processedData.patternType;
            }

            const { data, error } = await this.client
                .from('news_events')
                .update(updateData)
                .eq('id', eventId)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return this.mapNewsEventFromDB(data);
        } catch (error) {
            logger.error('Failed to update news event with processed data', { error, eventId });
            throw new DataSourceError('Failed to update news event', 'supabase', error as Error);
        }
    }

    public async getNewsEvents(filters?: {
        stockSymbol?: string;
        limit?: number;
        startDate?: Date;
        endDate?: Date;
        processingStatus?: string;
    }): Promise<NewsEvent[]> {
        try {
            let query = this.client
                .from('news_events_complete')
                .select('*')
                .order('published_time', { ascending: false });

            if (filters?.limit) {
                query = query.limit(filters.limit);
            }

            if (filters?.stockSymbol) {
                // Filter by ticker symbol in the tickers JSON array
                query = query.contains('tickers', [{ symbol: filters.stockSymbol }]);
            }

            if (filters?.startDate) {
                query = query.gte('published_time', filters.startDate.toISOString());
            }

            if (filters?.endDate) {
                query = query.lte('published_time', filters.endDate.toISOString());
            }

            if (filters?.processingStatus) {
                query = query.eq('processing_status', filters.processingStatus);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return (data || []).map(this.mapNewsEventFromDB);
        } catch (error) {
            logger.error('Failed to get news events', { error, filters });
            throw new DataSourceError('Failed to get news events', 'supabase', error as Error);
        }
    }

    // =====================================================================================
    // Stock Data CRUD
    // =====================================================================================

    public async createStockData(data: Omit<StockData, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockData> {
        try {
            // Get ticker ID
            const { data: tickerData } = await this.client
                .from('tickers')
                .select('id')
                .eq('symbol', data.stockSymbol)
                .single();

            if (!tickerData) {
                throw new Error(`Ticker not found: ${data.stockSymbol}`);
            }

            const dbData: Partial<DatabaseStockData> = {
                ticker_id: tickerData.id,
                timestamp: data.timestamp.toISOString(),
                open_price: data.open,
                high_price: data.high,
                low_price: data.low,
                close_price: data.close,
                volume: data.volume,
                price_change: data.priceChange,
                price_change_percent: data.priceChangePercent,
                data_source: data.dataSource,
                interval_type: data.interval,
                raw_data: data.rawData
            };

            const { data: insertedData, error } = await this.client
                .from('stock_data')
                .insert(dbData)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return this.mapStockDataFromDB(insertedData, data.stockSymbol);
        } catch (error) {
            logger.error('Failed to create stock data', { error, data });
            throw new DataSourceError('Failed to create stock data', 'supabase', error as Error);
        }
    }

    public async getStockData(
        stockSymbol: string,
        startDate?: Date,
        endDate?: Date,
        limit?: number
    ): Promise<StockData[]> {
        try {
            let query = this.client
                .from('stock_data_complete')
                .select('*')
                .eq('symbol', stockSymbol)
                .order('timestamp', { ascending: false });

            if (limit) {
                query = query.limit(limit);
            }

            if (startDate) {
                query = query.gte('timestamp', startDate.toISOString());
            }

            if (endDate) {
                query = query.lte('timestamp', endDate.toISOString());
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return (data || []).map((row: any) => this.mapStockDataFromDB(row, stockSymbol));
        } catch (error) {
            logger.error('Failed to get stock data', { error, stockSymbol, startDate, endDate });
            throw new DataSourceError('Failed to get stock data', 'supabase', error as Error);
        }
    }

    // =====================================================================================
    // Validation Results CRUD
    // =====================================================================================

    public async createValidationResult(result: Omit<ValidationResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<ValidationResult> {
        try {
            const dbResult: any = {
                news_event_id: result.newsEventId,
                test_type: result.validationType,
                test_description: result.testDescription,
                passed: result.passed,
                score: result.score,
                expected_value: result.expectedValue,
                actual_value: result.actualValue,
                test_parameters: result.testParameters,
                market_conditions: result.marketConditions,
                validated_by: result.validatedBy,
                validator_id: result.validatorId,
                notes: result.notes,
                test_date: new Date().toISOString()
            };

            const { data, error } = await this.client
                .from('validation_results')
                .insert(dbResult)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return this.mapValidationResultFromDB(data);
        } catch (error) {
            logger.error('Failed to create validation result', { error, result });
            throw new DataSourceError('Failed to create validation result', 'supabase', error as Error);
        }
    }

    public async getValidationResults(filters?: {
        newsEventId?: string;
        testType?: string;
        limit?: number;
    }): Promise<ValidationResult[]> {
        try {
            let query = this.client
                .from('validation_results')
                .select('*')
                .order('test_date', { ascending: false });

            if (filters?.limit) {
                query = query.limit(filters.limit);
            }

            if (filters?.newsEventId) {
                query = query.eq('news_event_id', filters.newsEventId);
            }

            if (filters?.testType) {
                query = query.eq('test_type', filters.testType);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return (data || []).map(this.mapValidationResultFromDB);
        } catch (error) {
            logger.error('Failed to get validation results', { error, filters });
            throw new DataSourceError('Failed to get validation results', 'supabase', error as Error);
        }
    }

    // =====================================================================================
    // Utility Methods
    // =====================================================================================

    private async getOrCreateSource(sourceName: string): Promise<string> {
        // Try to find existing source
        const { data: existingSource } = await this.client
            .from('news_sources')
            .select('id')
            .eq('source_name', sourceName)
            .single();

        if (existingSource) {
            return existingSource.id;
        }

        // Create new source with default values
        const { data: newSource, error } = await this.client
            .from('news_sources')
            .insert({
                source_name: sourceName,
                credibility_score: 0.5, // Default credibility
                bias_score: 0.0,
                institutional_weight: 0.5,
                retail_weight: 0.5
            })
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        return newSource.id;
    }

    private mapSentiment(sentiment: string): 'Bearish' | 'Neutral' | 'Bullish' {
        switch (sentiment.toLowerCase()) {
            case 'positive':
                return 'Bullish';
            case 'negative':
                return 'Bearish';
            default:
                return 'Neutral';
        }
    }

    // Mapping functions to convert between DB and application models
    private mapNewsEventFromDB(dbEvent: any): NewsEvent {
        return {
            id: dbEvent.id,
            headline: dbEvent.title,
            summary: dbEvent.summary || '',
            source: dbEvent.source_name || 'unknown',
            sourceCredibility: dbEvent.credibility_score || 1,
            publishedAt: new Date(dbEvent.published_time),
            discoveredAt: new Date(dbEvent.created_at),
            stockSymbol: dbEvent.tickers?.[0]?.symbol || 'AAPL',
            eventType: 'other',
            sentiment: this.mapSentimentFromDB(dbEvent.overall_sentiment),
            sentimentScore: dbEvent.overall_sentiment_score || 0,
            relevanceScore: dbEvent.tickers?.[0]?.relevance_score || 0,
            url: dbEvent.url,
            content: dbEvent.body,
            tags: [],
            rawData: dbEvent.raw_data,
            createdAt: new Date(dbEvent.created_at),
            updatedAt: new Date(dbEvent.updated_at)
        };
    }

    private mapSentimentFromDB(sentiment?: string): 'positive' | 'negative' | 'neutral' {
        switch (sentiment) {
            case 'Bullish':
                return 'positive';
            case 'Bearish':
                return 'negative';
            default:
                return 'neutral';
        }
    }

    private mapStockDataFromDB(dbData: any, stockSymbol: string): StockData {
        return {
            id: dbData.id,
            stockSymbol: stockSymbol,
            timestamp: new Date(dbData.timestamp),
            open: dbData.open_price,
            high: dbData.high_price,
            low: dbData.low_price,
            close: dbData.close_price,
            volume: dbData.volume,
            priceChange: dbData.price_change || 0,
            priceChangePercent: dbData.price_change_percent || 0,
            volumeChange: 0,
            volumeChangePercent: 0,
            dataSource: dbData.data_source || 'other',
            interval: dbData.interval_type || 'daily',
            rawData: dbData.raw_data,
            createdAt: new Date(dbData.created_at),
            updatedAt: new Date(dbData.created_at)
        };
    }

    private mapValidationResultFromDB(dbResult: any): ValidationResult {
        return {
            id: dbResult.id,
            newsEventId: dbResult.news_event_id,
            causalChainId: undefined as any,
            stockSymbol: 'AAPL', // Default for now
            validationType: dbResult.test_type,
            testDescription: dbResult.test_description || '',
            testParameters: dbResult.test_parameters || {},
            passed: dbResult.passed,
            score: dbResult.score || 0,
            actualValue: dbResult.actual_value || 0,
            expectedValue: dbResult.expected_value || 0,
            threshold: 0,
            testPeriodStart: new Date(dbResult.test_date),
            testPeriodEnd: new Date(dbResult.test_date),
            marketConditions: dbResult.market_conditions,
            validatedBy: dbResult.validated_by || 'manual',
            validatorId: dbResult.validator_id,
            notes: dbResult.notes,
            createdAt: new Date(dbResult.created_at),
            updatedAt: new Date(dbResult.created_at)
        };
    }

    // =====================================================================================
    // Batch Operations for Migration
    // =====================================================================================

    public async batchCreateNewsEvents(events: Omit<NewsEvent, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<NewsEvent[]> {
        const results: NewsEvent[] = [];

        // Process in chunks to avoid API limits
        const chunkSize = 50;
        for (let i = 0; i < events.length; i += chunkSize) {
            const chunk = events.slice(i, i + chunkSize);

            for (const event of chunk) {
                try {
                    const created = await this.createNewsEvent(event);
                    results.push(created);
                    logger.info(`Migrated news event: ${created.headline}`);
                } catch (error) {
                    logger.error(`Failed to migrate news event: ${event.headline}`, { error });
                }
            }
        }

        return results;
    }

    public getClient(): SupabaseClient {
        return this.client;
    }
}

export default SupabaseStorage;
