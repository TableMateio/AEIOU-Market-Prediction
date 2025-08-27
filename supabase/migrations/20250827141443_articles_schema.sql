-- AEIOU Articles Schema - Full Alpha Vantage News Data
-- Captures ALL fields from Alpha Vantage NEWS_SENTIMENT API response
-- Based on the NewsItem interface in alphaVantage.ts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop any existing tables
DROP TABLE IF EXISTS ai_responses CASCADE;
DROP TABLE IF EXISTS articles CASCADE;

-- =====================================================================================
-- Table 1: Articles (Full Alpha Vantage News Data)
-- =====================================================================================

CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Article Info (from Alpha Vantage NewsItem)
    title TEXT NOT NULL,  -- item.title
    url TEXT NOT NULL UNIQUE,  -- item.url
    time_published VARCHAR(20) NOT NULL,  -- item.time_published (YYYYMMDDTHHMMSS format)
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- Parsed from time_published
    authors TEXT[],  -- item.authors array
    summary TEXT,  -- item.summary
    
    -- Source Information
    source VARCHAR(255) NOT NULL,  -- item.source (e.g., "Bloomberg", "Reuters")
    source_domain VARCHAR(255),  -- item.source_domain (e.g., "bloomberg.com")
    category_within_source VARCHAR(255),  -- item.category_within_source
    
    -- Media
    banner_image TEXT,  -- item.banner_image (optional)
    
    -- Sentiment Analysis (Alpha Vantage built-in)
    overall_sentiment_score DECIMAL(5,4),  -- item.overall_sentiment_score (-1 to 1)
    overall_sentiment_label VARCHAR(50),  -- item.overall_sentiment_label ('Bearish', 'Neutral', 'Bullish', etc.)
    
    -- Topics and Relevance (Alpha Vantage extracts these)
    topics JSONB,  -- item.topics array: [{"topic": "Technology", "relevance_score": "0.5"}]
    
    -- Ticker Sentiment (Alpha Vantage extracts these)
    ticker_sentiment JSONB,  -- item.ticker_sentiment array: [{"ticker": "AAPL", "relevance_score": "0.8", "ticker_sentiment_score": "0.3", "ticker_sentiment_label": "Neutral"}]
    
    -- Processing Status
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Raw Data (full Alpha Vantage response for debugging)
    raw_alpha_vantage_data JSONB,  -- Complete NewsItem object
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraints
    UNIQUE(url),  -- URLs should be unique
    UNIQUE(title, source, time_published)  -- Prevent duplicate articles from same source at same time
);

-- =====================================================================================
-- Table 2: AI Responses (Multiple AI analyses per article)
-- =====================================================================================

CREATE TABLE ai_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to article
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    
    -- AI Processing Info
    ai_version VARCHAR(50),  -- "prompt_v1.0", "gpt4_claude_v2", etc.
    processing_batch VARCHAR(100),  -- "2024-08-26-batch-1", "weekend_rerun"
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- The AI analysis results
    business_events JSONB NOT NULL,  -- Your business_events array from AI
    raw_ai_response JSONB,  -- Full AI response for debugging
    
    -- Processing metadata
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
    error_message TEXT,
    processing_time_ms INTEGER,
    
    -- Experiment tracking
    experiment_name VARCHAR(100),  -- "baseline", "new_prompt", "temperature_test"
    model_used VARCHAR(50),  -- "gpt-4", "claude-3", etc.
    prompt_tokens INTEGER,  -- Token usage tracking
    completion_tokens INTEGER,
    total_cost_usd DECIMAL(10,6),  -- Track API costs
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================================
-- Helper Functions for Alpha Vantage Data
-- =====================================================================================

-- Function to convert Alpha Vantage timestamp format to PostgreSQL timestamp
CREATE OR REPLACE FUNCTION parse_alpha_vantage_timestamp(av_timestamp TEXT)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- Alpha Vantage format: YYYYMMDDTHHMMSS
    -- Convert to ISO format for PostgreSQL
    RETURN TO_TIMESTAMP(av_timestamp, 'YYYYMMDD"T"HH24MISS')::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- Function to extract primary ticker from ticker_sentiment JSON
CREATE OR REPLACE FUNCTION get_primary_ticker(ticker_sentiment_json JSONB)
RETURNS TEXT AS $$
BEGIN
    -- Get the ticker with highest relevance score
    RETURN (
        SELECT ticker_data->>'ticker'
        FROM jsonb_array_elements(ticker_sentiment_json) AS ticker_data
        ORDER BY (ticker_data->>'relevance_score')::DECIMAL DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- Function to extract primary topic from topics JSON
CREATE OR REPLACE FUNCTION get_primary_topic(topics_json JSONB)
RETURNS TEXT AS $$
BEGIN
    -- Get the topic with highest relevance score
    RETURN (
        SELECT topic_data->>'topic'
        FROM jsonb_array_elements(topics_json) AS topic_data
        ORDER BY (topic_data->>'relevance_score')::DECIMAL DESC
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- Performance Indexes
-- =====================================================================================

-- Time-based queries (most important for ML)
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_articles_time_published ON articles(time_published);
CREATE INDEX idx_articles_created_at ON articles(created_at);

-- Source and content
CREATE INDEX idx_articles_source ON articles(source);
CREATE INDEX idx_articles_source_domain ON articles(source_domain);
CREATE INDEX idx_articles_category_within_source ON articles(category_within_source);

-- Sentiment analysis
CREATE INDEX idx_articles_overall_sentiment_score ON articles(overall_sentiment_score);
CREATE INDEX idx_articles_overall_sentiment_label ON articles(overall_sentiment_label);

-- Processing status
CREATE INDEX idx_articles_processing_status ON articles(processing_status);

-- JSON data (for complex queries)
CREATE INDEX idx_articles_topics ON articles USING GIN (topics);
CREATE INDEX idx_articles_ticker_sentiment ON articles USING GIN (ticker_sentiment);
CREATE INDEX idx_articles_raw_data ON articles USING GIN (raw_alpha_vantage_data);

-- Text search
CREATE INDEX idx_articles_title_text ON articles USING GIN (to_tsvector('english', title));
CREATE INDEX idx_articles_summary_text ON articles USING GIN (to_tsvector('english', summary));

-- AI Responses indexes
CREATE INDEX idx_ai_responses_article_id ON ai_responses(article_id);
CREATE INDEX idx_ai_responses_ai_version ON ai_responses(ai_version);
CREATE INDEX idx_ai_responses_processing_batch ON ai_responses(processing_batch);
CREATE INDEX idx_ai_responses_processed_at ON ai_responses(processed_at);
CREATE INDEX idx_ai_responses_experiment_name ON ai_responses(experiment_name);
CREATE INDEX idx_ai_responses_model_used ON ai_responses(model_used);
CREATE INDEX idx_ai_responses_status ON ai_responses(status);

-- AI JSON data
CREATE INDEX idx_ai_responses_business_events ON ai_responses USING GIN (business_events);

-- =====================================================================================
-- Triggers
-- =====================================================================================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_articles_updated_at 
    BEFORE UPDATE ON articles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-parse Alpha Vantage timestamp
CREATE OR REPLACE FUNCTION auto_parse_av_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.time_published IS NOT NULL AND NEW.published_at IS NULL THEN
        NEW.published_at = parse_alpha_vantage_timestamp(NEW.time_published);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_parse_av_timestamp_trigger
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION auto_parse_av_timestamp();

-- =====================================================================================
-- Useful Views
-- =====================================================================================

-- Articles with extracted key info (for quick analysis)
CREATE VIEW articles_summary AS
SELECT 
    id,
    title,
    source,
    published_at,
    overall_sentiment_score,
    overall_sentiment_label,
    get_primary_ticker(ticker_sentiment) as primary_ticker,
    get_primary_topic(topics) as primary_topic,
    processing_status,
    (SELECT COUNT(*) FROM ai_responses WHERE article_id = articles.id) as ai_responses_count
FROM articles;

-- Articles with their latest AI analysis
CREATE VIEW articles_with_latest_ai AS
SELECT 
    a.*,
    latest_ai.id as latest_ai_id,
    latest_ai.ai_version as latest_ai_version,
    latest_ai.business_events as latest_business_events,
    latest_ai.processed_at as latest_ai_processed_at,
    latest_ai.experiment_name as latest_experiment,
    latest_ai.model_used as latest_model_used
FROM articles a
LEFT JOIN LATERAL (
    SELECT *
    FROM ai_responses ai
    WHERE ai.article_id = a.id
    AND ai.status = 'completed'
    ORDER BY ai.processed_at DESC
    LIMIT 1
) latest_ai ON true;

-- Ticker-focused view (for stock analysis)
CREATE VIEW ticker_articles AS
SELECT 
    a.id,
    a.title,
    a.source,
    a.published_at,
    a.overall_sentiment_score,
    ticker_data->>'ticker' as ticker,
    (ticker_data->>'relevance_score')::DECIMAL as ticker_relevance,
    (ticker_data->>'ticker_sentiment_score')::DECIMAL as ticker_sentiment_score,
    ticker_data->>'ticker_sentiment_label' as ticker_sentiment_label
FROM articles a,
jsonb_array_elements(a.ticker_sentiment) as ticker_data
WHERE a.ticker_sentiment IS NOT NULL;

-- =====================================================================================
-- Row Level Security
-- =====================================================================================

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON articles FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON ai_responses FOR ALL TO authenticated USING (true);

-- =====================================================================================
-- Comments
-- =====================================================================================

COMMENT ON TABLE articles IS 'Articles from Alpha Vantage NEWS_SENTIMENT API with all available fields';
COMMENT ON COLUMN articles.time_published IS 'Alpha Vantage timestamp format: YYYYMMDDTHHMMSS';
COMMENT ON COLUMN articles.published_at IS 'Parsed timestamp for SQL queries';
COMMENT ON COLUMN articles.topics IS 'Alpha Vantage extracted topics with relevance scores';
COMMENT ON COLUMN articles.ticker_sentiment IS 'Alpha Vantage ticker sentiment analysis';
COMMENT ON COLUMN articles.raw_alpha_vantage_data IS 'Complete NewsItem object from Alpha Vantage';

COMMENT ON TABLE ai_responses IS 'AI analysis results - multiple experiments per article';
COMMENT ON COLUMN ai_responses.business_events IS 'Your structured business events from AI analysis';
