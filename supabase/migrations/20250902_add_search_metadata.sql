-- Add search metadata fields for debugging and tracking
-- Migration: 20250902_add_search_metadata

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS search_start_date DATE,
ADD COLUMN IF NOT EXISTS search_end_date DATE,
ADD COLUMN IF NOT EXISTS search_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS search_criteria JSONB,
ADD COLUMN IF NOT EXISTS collection_batch VARCHAR(255);

-- Add comments to document the fields
COMMENT ON COLUMN articles.search_start_date IS 'Start date of the search period used to collect this article';
COMMENT ON COLUMN articles.search_end_date IS 'End date of the search period used to collect this article';
COMMENT ON COLUMN articles.search_name IS 'Human-readable name for the search (e.g., "Period-1", "Test-Single")';
COMMENT ON COLUMN articles.search_criteria IS 'JSON object containing search parameters: query, sort, filters, etc.';
COMMENT ON COLUMN articles.collection_batch IS 'Batch identifier for grouping related collections';

-- Create index on search_name for fast lookups
CREATE INDEX IF NOT EXISTS idx_articles_search_name ON articles(search_name);
CREATE INDEX IF NOT EXISTS idx_articles_collection_batch ON articles(collection_batch);
CREATE INDEX IF NOT EXISTS idx_articles_search_dates ON articles(search_start_date, search_end_date);
