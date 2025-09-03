import type { Article } from '../../data/models/index.js';

/**
 * Common interface for all news services (finlight, EventRegistry, etc.)
 * This allows easy switching between providers
 */
export interface NewsServiceInterface {
    /**
     * Search for Apple-related articles
     */
    searchAppleArticles(options: SearchOptions): Promise<Article[]>;
    
    /**
     * Test API connection and authentication
     */
    testConnection(): Promise<ConnectionTestResult>;
    
    /**
     * Get service name for logging/identification
     */
    getServiceName(): string;
    
    /**
     * Check if service supports premium features
     */
    supportsPremiumFeatures(): Promise<boolean>;
}

export interface SearchOptions {
    dateFrom?: string;      // 'YYYY-MM-DD' format
    dateTo?: string;        // 'YYYY-MM-DD' format  
    limit?: number;         // Number of articles to fetch
    sources?: string[];     // Specific sources to include
    excludeSources?: string[]; // Sources to exclude
    excludeTerms?: string[]; // Terms to exclude (premium feature)
    sortBy?: 'date' | 'relevance' | 'social'; // Sorting preference
}

export interface ConnectionTestResult {
    success: boolean;
    message: string;
    sampleData?: any;
    premiumFeaturesAvailable?: boolean;
}

export interface ServiceCapabilities {
    hasFullContent: boolean;
    hasDateFiltering: boolean;
    hasSourceFiltering: boolean;
    hasExcludeFiltering: boolean;
    hasTickerFiltering: boolean;
    hasSentimentAnalysis: boolean;
    maxArticlesPerRequest: number;
    rateLimitPerMinute: number;
}
