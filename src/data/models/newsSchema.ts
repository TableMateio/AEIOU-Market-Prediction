/**
 * News Schema - Structured for Airtable with Linked Records
 * Based on Alpha Vantage News API structure with belief modeling extensions
 */

// =============================================================================
// LINKED RECORD TABLES (Master Data)
// =============================================================================

export interface NewsSource {
    id: string;
    name: string;                    // "Seeking Alpha", "Reuters", etc.
    domain: string;                  // "seekingalpha.com"
    credibility_score: number;       // 0-1 belief factor
    bias_score: number;              // -1 to 1 (bearish to bullish bias)
    institutional_weight: number;    // 0-1 how much institutions trust this source
    retail_weight: number;           // 0-1 how much retail trusts this source
    avg_response_time: number;       // minutes after event before coverage
    created_at: string;
    updated_at: string;
}

export interface Author {
    id: string;
    name: string;
    source_id: string;               // Link to NewsSource
    expertise_areas: string[];       // ["Technology", "Earnings", "M&A"]
    track_record_score: number;      // 0-1 historical accuracy
    sentiment_bias: number;          // -1 to 1 typical sentiment lean
    article_count: number;
    created_at: string;
    updated_at: string;
}

export interface Topic {
    id: string;
    name: string;                    // "Technology", "Earnings Call", "Product Launch"
    category: string;                // "Business", "Financial", "Strategic"
    market_impact_potential: number; // 0-1 how much this topic typically moves markets
    retail_attention_factor: number; // 0-1 how much retail investors care
    institutional_attention_factor: number; // 0-1 how much institutions care
    created_at: string;
    updated_at: string;
}

export interface Ticker {
    id: string;
    symbol: string;                  // "AAPL"
    company_name: string;            // "Apple Inc."
    sector: string;
    market_cap: number;
    volatility_score: number;        // 0-1 how volatile this stock typically is
    news_sensitivity: number;        // 0-1 how much news typically affects price
    created_at: string;
    updated_at: string;
}

// =============================================================================
// MAIN NEWS EVENTS TABLE
// =============================================================================

export interface NewsEvent {
    id: string;

    // Basic Article Data
    title: string;
    summary: string;
    url: string;
    time_published: string;          // ISO timestamp
    banner_image?: string;

    // Linked Records (Foreign Keys)
    source_id: string;               // Links to NewsSource
    author_ids: string[];            // Links to Author (many-to-many)
    topic_ids: string[];             // Links to Topic (many-to-many)
    ticker_ids: string[];            // Links to Ticker (many-to-many)

    // Alpha Vantage Sentiment Data
    overall_sentiment_score: number; // -1 to 1
    overall_sentiment_label: string; // "Bearish", "Neutral", "Bullish"

    // Ticker-Specific Data (JSON field for now, could be separate table)
    ticker_sentiments: TickerSentiment[];

    // Belief Modeling Factors (from our atomic decomposition)
    belief_factors: BeliefFactors;

    // Processing Status
    processed: boolean;
    causal_chains_extracted: boolean;
    price_impact_measured: boolean;

    // Timestamps
    created_at: string;
    updated_at: string;
}

// =============================================================================
// SENTIMENT & BELIEF STRUCTURES
// =============================================================================

export interface TickerSentiment {
    ticker_symbol: string;
    relevance_score: number;         // 0-1 from Alpha Vantage
    sentiment_score: number;         // -1 to 1
    sentiment_label: string;         // "Bearish", "Neutral", "Bullish"
}

export interface BeliefFactors {
    // Core belief dimensions (from atomic decomposition)
    intensity_belief: number;        // 0-1: How strongly they believe the magnitude
    duration_belief: number;         // 0-1: How long they think it will last
    certainty_level: number;         // 0-1: Confidence in their assessment

    // Emotional spectrum
    hope_vs_fear: number;           // 0-1: 0=pure fear, 0.5=neutral, 1=pure hope
    doubt_factor: number;           // 0-1: Level of skepticism

    // Attention & propagation
    attention_intensity: number;     // 0-1: How much focus this gets
    social_amplification: number;    // 0-1: Viral/sharing potential
    expert_consensus: number;        // 0-1: Do experts agree?

    // Temporal factors
    urgency_perception: number;      // 0-1: How urgent/immediate this feels
    persistence_expectation: number; // 0-1: Will this narrative last?

    // Market specific
    believability_score: number;     // 0-1: Overall market credence
}

// =============================================================================
// AIRTABLE SCHEMA CONFIGURATION
// =============================================================================

export const AIRTABLE_SCHEMA = {
    // Table names in Airtable
    TABLES: {
        NEWS_EVENTS: "News Events",
        NEWS_SOURCES: "News Sources",
        AUTHORS: "Authors",
        TOPICS: "Topics",
        TICKERS: "Tickers"
    },

    // Field mappings for each table
    FIELDS: {
        NEWS_EVENTS: {
            title: "Title",
            summary: "Summary",
            url: "URL",
            time_published: "Published Time",
            source_id: "Source",           // Linked record to News Sources
            author_ids: "Authors",         // Linked record to Authors
            topic_ids: "Topics",           // Linked record to Topics
            ticker_ids: "Tickers",         // Linked record to Tickers
            overall_sentiment_score: "Overall Sentiment Score",
            overall_sentiment_label: "Overall Sentiment",
            ticker_sentiments: "Ticker Sentiments (JSON)",
            belief_factors: "Belief Factors (JSON)",
            processed: "Processed",
            created_at: "Created"
        },

        NEWS_SOURCES: {
            name: "Source Name",
            domain: "Domain",
            credibility_score: "Credibility Score",
            bias_score: "Bias Score",
            institutional_weight: "Institutional Weight",
            retail_weight: "Retail Weight"
        },

        AUTHORS: {
            name: "Author Name",
            source_id: "Source",           // Linked record
            expertise_areas: "Expertise Areas",
            track_record_score: "Track Record Score",
            sentiment_bias: "Sentiment Bias"
        },

        TOPICS: {
            name: "Topic Name",
            category: "Category",
            market_impact_potential: "Market Impact Potential",
            retail_attention_factor: "Retail Attention Factor",
            institutional_attention_factor: "Institutional Attention Factor"
        },

        TICKERS: {
            symbol: "Symbol",
            company_name: "Company Name",
            sector: "Sector",
            market_cap: "Market Cap",
            volatility_score: "Volatility Score",
            news_sensitivity: "News Sensitivity"
        }
    }
} as const;

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type SentimentLabel = "Bearish" | "Neutral" | "Bullish";
export type TopicCategory = "Business" | "Financial" | "Strategic" | "Regulatory" | "Technical";
export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";

// Note: Types are already exported above with their declarations
