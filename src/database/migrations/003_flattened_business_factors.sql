-- Migration: Single Flattened Business Factors Table
-- Replaces the two-table design with a single fully-flattened structure
-- Each row = one causal step with complete article + business event + causal step context

-- Drop the current dual-table structure
DROP TABLE IF EXISTS business_factors CASCADE;
DROP TABLE IF EXISTS business_events CASCADE;

-- Create the single flattened table
CREATE TABLE IF NOT EXISTS business_factors_flat (
    -- Identity & Relationships
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    
    -- Business Event Context (which business event this causal step belongs to)
    business_event_index INTEGER NOT NULL,    -- 0, 1, 2 within AI response
    causal_step_index INTEGER NOT NULL,      -- 0, 1, 2 within business event
    
    -- ARTICLE-LEVEL METADATA (from article object in AI response)
    article_headline TEXT,
    article_source TEXT,
    article_url TEXT,
    article_authors JSONB,                   -- array of strings
    article_published_at TIMESTAMPTZ,
    article_publisher_credibility DECIMAL(3,2),
    article_author_credibility DECIMAL(3,2),
    article_source_credibility DECIMAL(3,2),
    article_audience_split TEXT,             -- "institutional", "retail", "both", "neither"
    article_time_lag_days DECIMAL(10,3),
    article_market_regime TEXT,              -- "bull", "bear", "neutral", "unknown"
    
    -- Derived article features
    article_published_year INTEGER,
    article_published_month INTEGER,
    article_published_day_of_week INTEGER,  -- 0=Sunday, 6=Saturday
    
    -- BUSINESS EVENT METADATA (from business_events array)
    event_type TEXT NOT NULL,               -- "Product_Announcement", etc.
    event_trigger TEXT,                     -- "press_release", "earnings_call", etc.
    event_entities JSONB,                   -- array of companies/organizations
    event_scope TEXT,                       -- "company", "industry"
    event_orientation TEXT,                 -- "predictive", "reflective", "both", "neutral"
    event_time_horizon_days INTEGER,
    event_tags JSONB,                       -- array of tags
    event_quoted_people JSONB,              -- array of quoted individuals
    event_description TEXT,
    
    -- CAUSAL STEP DETAILS (the core factor)
    causal_step DECIMAL(5,2),               -- step index (0, 1, 2, 1.1, 1.2 for branches)
    factor_name TEXT NOT NULL,              -- "software_update", "revenue_growth_rate", etc.
    factor_synonyms JSONB,                  -- array of related terms
    factor_category TEXT,                   -- "financial", "sales", "customer", etc.
    factor_unit TEXT,                       -- "%", "pp", "$", "days", "binary", etc.
    factor_raw_value TEXT,                  -- actual value if stated (flexible type)
    factor_delta TEXT,                      -- change vs baseline (flexible type)
    factor_description TEXT,
    factor_movement INTEGER,                -- 1 (up), -1 (down), 0 (unchanged)
    factor_magnitude DECIMAL(5,3),         -- business impact 0-1 scale
    factor_orientation TEXT,                -- "predictive", "reflective", "neutral"
    factor_about_time_days INTEGER,        -- when effect materializes
    factor_effect_horizon_days INTEGER,    -- when consequence shows in fundamentals
    
    -- EVIDENCE FEATURES
    evidence_level TEXT,                    -- "explicit", "implied", "model"
    evidence_source TEXT,                   -- "article_text", "press_release", etc.
    evidence_citation TEXT,                -- optional URL/quote
    
    -- CAUSAL CONFIDENCE FEATURES (0-1 scale)
    causal_certainty DECIMAL(3,2),
    logical_directness DECIMAL(3,2),
    market_consensus_on_causality DECIMAL(3,2),
    regime_alignment DECIMAL(3,2),         -- -1 to 1 scale
    reframing_potential DECIMAL(3,2),
    narrative_disruption DECIMAL(3,2),
    
    -- MARKET PERCEPTION FEATURES (from belief.market_perception)
    market_perception_intensity DECIMAL(3,2),
    market_perception_hope_vs_fear DECIMAL(3,2),        -- -1 to 1 scale
    market_perception_surprise_vs_anticipated DECIMAL(3,2),  -- -1 to 1 scale
    market_perception_consensus_vs_division DECIMAL(3,2),    -- -1 to 1 scale
    market_perception_narrative_strength DECIMAL(3,2),
    market_perception_emotional_profile JSONB,              -- array of emotions
    market_perception_cognitive_biases JSONB,               -- array of biases
    
    -- AI ASSESSMENT FEATURES (from belief.ai_assessment)
    ai_assessment_execution_risk DECIMAL(3,2),
    ai_assessment_competitive_risk DECIMAL(3,2),
    ai_assessment_business_impact_likelihood DECIMAL(3,2),
    ai_assessment_timeline_realism DECIMAL(3,2),
    ai_assessment_fundamental_strength DECIMAL(3,2),
    
    -- PERCEPTION GAP FEATURES (from belief.perception_gap)
    perception_gap_optimism_bias DECIMAL(3,2),      -- -1 to 1 scale
    perception_gap_risk_awareness DECIMAL(3,2),     -- -1 to 1 scale
    perception_gap_correction_potential DECIMAL(3,2),
    
    -- TARGET VARIABLES (to be filled later from stock data)
    stock_price_change_1d DECIMAL(6,4),
    stock_price_change_7d DECIMAL(6,4),
    stock_price_change_30d DECIMAL(6,4),
    stock_price_change_90d DECIMAL(6,4),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comprehensive indexes for ML training
CREATE INDEX IF NOT EXISTS idx_factors_flat_factor_name ON business_factors_flat(factor_name);
CREATE INDEX IF NOT EXISTS idx_factors_flat_factor_category ON business_factors_flat(factor_category);
CREATE INDEX IF NOT EXISTS idx_factors_flat_event_type ON business_factors_flat(event_type);
CREATE INDEX IF NOT EXISTS idx_factors_flat_factor_movement ON business_factors_flat(factor_movement);
CREATE INDEX IF NOT EXISTS idx_factors_flat_factor_magnitude ON business_factors_flat(factor_magnitude);
CREATE INDEX IF NOT EXISTS idx_factors_flat_article_source ON business_factors_flat(article_source);
CREATE INDEX IF NOT EXISTS idx_factors_flat_published_at ON business_factors_flat(article_published_at);
CREATE INDEX IF NOT EXISTS idx_factors_flat_market_regime ON business_factors_flat(article_market_regime);
CREATE INDEX IF NOT EXISTS idx_factors_flat_audience_split ON business_factors_flat(article_audience_split);

-- Updated at trigger
CREATE TRIGGER business_factors_flat_updated_at
    BEFORE UPDATE ON business_factors_flat
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE business_factors_flat IS 'Completely flattened business factors - one row per causal step with full article + business event + causal step context for ML training';
COMMENT ON COLUMN business_factors_flat.business_event_index IS 'Which business event within the AI response (0, 1, 2...)';
COMMENT ON COLUMN business_factors_flat.causal_step_index IS 'Which causal step within the business event (0, 1, 2...)';
COMMENT ON COLUMN business_factors_flat.causal_step IS 'Actual step number from AI (allows for branching like 1.1, 1.2)';
COMMENT ON COLUMN business_factors_flat.factor_magnitude IS 'Business impact as % of Apple annual profits (0-1 scale)';
COMMENT ON COLUMN business_factors_flat.regime_alignment IS 'Alignment with market regime (-1 to 1 scale)';
