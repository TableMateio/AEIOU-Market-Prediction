// Core entity interfaces for AEIOU system

export interface NewsEvent {
    id?: string;
    headline: string;
    summary: string;
    source: string;
    sourceCredibility: number; // 1-10 scale
    publishedAt: Date;
    discoveredAt: Date;
    stockSymbol: string;
    eventType: 'earnings' | 'product_launch' | 'acquisition' | 'regulatory' | 'executive_change' | 'market_news' | 'other';
    sentiment: 'positive' | 'negative' | 'neutral';
    sentimentScore: number; // -1 to 1
    relevanceScore: number; // 0 to 1
    url?: string;
    content?: string;
    tags: string[];
    rawData?: any; // Original API response
    createdAt?: Date;
    updatedAt?: Date;
}

export interface StockData {
    id?: string;
    stockSymbol: string;
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    priceChange: number;
    priceChangePercent: number;
    volumeChange?: number;
    volumeChangePercent?: number;
    marketCap?: number;
    dataSource: 'alpha_vantage' | 'yahoo_finance' | 'other';
    interval: '1min' | '5min' | '15min' | '30min' | '60min' | 'daily';
    rawData?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CausalChain {
    id?: string;
    newsEventId: string;
    stockSymbol: string;
    extractionMethod: 'manual' | 'gpt4' | 'rule_based';
    extractedBy?: string; // User ID if manual

    // Causal factors extracted from news
    businessFactors: BusinessFactor[];
    investorBeliefs: InvestorBelief[];
    expectedImpacts: ExpectedImpact[];

    // Validation
    confidence: number; // 0 to 1
    validated: boolean;
    validationNotes?: string;

    // Timestamps
    extractedAt: Date;
    validatedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface BusinessFactor {
    category: 'revenue' | 'costs' | 'market_share' | 'competition' | 'regulation' | 'technology' | 'management' | 'strategy';
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    magnitude: 'low' | 'medium' | 'high';
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term'; // <1m, 1-6m, 6m-2y, >2y
    confidence: number; // 0 to 1
}

export interface InvestorBelief {
    investorType: 'retail' | 'institutional' | 'algorithmic' | 'insider';
    believability: number; // 0 to 1 - how much this investor type believes the news
    reaction: 'buy' | 'sell' | 'hold' | 'wait_and_see';
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    reasoning: string;
    confidence: number; // 0 to 1
}

export interface ExpectedImpact {
    metric: 'stock_price' | 'volume' | 'volatility' | 'market_cap';
    direction: 'increase' | 'decrease' | 'no_change';
    magnitude: number; // percentage change expected
    timeframe: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    confidence: number; // 0 to 1
}

export interface ValidationResult {
    id?: string;
    newsEventId: string;
    causalChainId?: string;
    stockSymbol: string;
    validationType: 'timestamp_accuracy' | 'news_coverage' | 'correlation_analysis' | 'prediction_accuracy' | 'manual_review';

    // Test parameters
    testDescription: string;
    testParameters: any; // Flexible object for test-specific params

    // Results
    passed: boolean;
    score: number; // 0 to 1
    actualValue: number;
    expectedValue: number;
    threshold: number;

    // Context
    testPeriodStart: Date;
    testPeriodEnd: Date;
    marketConditions?: string; // 'bull' | 'bear' | 'sideways' | 'volatile'

    // Metadata
    validatedBy: 'automated' | 'manual';
    validatorId?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Helper types for form validation and API responses
export interface CreateNewsEventRequest extends Omit<NewsEvent, 'id' | 'createdAt' | 'updatedAt'> { }
export interface UpdateNewsEventRequest extends Partial<CreateNewsEventRequest> { }

export interface CreateStockDataRequest extends Omit<StockData, 'id' | 'createdAt' | 'updatedAt'> { }
export interface UpdateStockDataRequest extends Partial<CreateStockDataRequest> { }

export interface CreateCausalChainRequest extends Omit<CausalChain, 'id' | 'createdAt' | 'updatedAt'> { }
export interface UpdateCausalChainRequest extends Partial<CreateCausalChainRequest> { }

export interface CreateValidationResultRequest extends Omit<ValidationResult, 'id' | 'createdAt' | 'updatedAt'> { }
export interface UpdateValidationResultRequest extends Partial<CreateValidationResultRequest> { }

// Common response wrapper
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
    };
} 