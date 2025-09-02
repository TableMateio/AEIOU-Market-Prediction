-- Add NewsAPI.ai specific fields to articles table
-- Based on EventRegistry API response structure

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS categories JSONB,
ADD COLUMN IF NOT EXISTS concepts JSONB, 
ADD COLUMN IF NOT EXISTS social_score DECIMAL(5,2);

-- Comments for the new fields
COMMENT ON COLUMN articles.categories IS 'NewsAPI.ai categories array: [{"uri": "dmoz/Business", "label": "Business"}]';
COMMENT ON COLUMN articles.concepts IS 'NewsAPI.ai concepts array: [{"uri": "http://en.wikipedia.org/wiki/Apple_Inc.", "label": "Apple Inc.", "score": 0.8}]';
COMMENT ON COLUMN articles.social_score IS 'NewsAPI.ai social engagement score (0-100)';

-- Indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_articles_categories ON articles USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_articles_concepts ON articles USING GIN (concepts);
CREATE INDEX IF NOT EXISTS idx_articles_social_score ON articles(social_score);

-- Update the view to include new fields
DROP VIEW IF EXISTS articles_summary;
CREATE VIEW articles_summary AS
SELECT 
    id,
    title,
    source,
    published_at,
    overall_sentiment_score,
    overall_sentiment_label,
    categories,
    concepts,
    social_score,
    get_primary_ticker(ticker_sentiment) as primary_ticker,
    get_primary_topic(topics) as primary_topic,
    processing_status,
    (SELECT COUNT(*) FROM ai_responses WHERE article_id = articles.id) as ai_responses_count
FROM articles;
