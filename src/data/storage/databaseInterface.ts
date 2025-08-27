/**
 * Database Interface - Unified abstraction for Airtable and Supabase
 * 
 * This interface allows switching between storage backends without changing application logic.
 * Perfect for migration from Airtable to Supabase.
 */

import { NewsEvent, StockData, ValidationResult } from '@data/models';
import {
    ArticleTaxonomy,
    BusinessCausalChain,
    BeliefFactors
} from '../../belief/ontology/KnowledgeStructures';

export interface DatabaseInterface {
    // Initialization
    initialize(): Promise<void>;

    // News Events
    createNewsEvent(event: Omit<NewsEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<NewsEvent>;
    getNewsEvents(filters?: {
        stockSymbol?: string;
        limit?: number;
        startDate?: Date;
        endDate?: Date;
        processingStatus?: string;
    }): Promise<NewsEvent[]>;
    updateNewsEventWithProcessedData(
        eventId: string,
        processedData: {
            taxonomy?: ArticleTaxonomy;
            businessChains?: BusinessCausalChain[];
            beliefFactors?: BeliefFactors;
            patternType?: string;
        }
    ): Promise<NewsEvent>;

    // Stock Data
    createStockData(data: Omit<StockData, 'id' | 'createdAt' | 'updatedAt'>): Promise<StockData>;
    getStockData(
        stockSymbol: string,
        startDate?: Date,
        endDate?: Date,
        limit?: number
    ): Promise<StockData[]>;

    // Validation Results
    createValidationResult(result: Omit<ValidationResult, 'id' | 'createdAt' | 'updatedAt'>): Promise<ValidationResult>;
    getValidationResults(filters?: {
        newsEventId?: string;
        testType?: string;
        limit?: number;
    }): Promise<ValidationResult[]>;

    // Batch operations (for migration)
    batchCreateNewsEvents(events: Omit<NewsEvent, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<NewsEvent[]>;
}

export type DatabaseProvider = 'airtable' | 'supabase';

