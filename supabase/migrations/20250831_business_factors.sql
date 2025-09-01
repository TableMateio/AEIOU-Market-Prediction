-- Business Factors Table: Flattened causal chain data for ML
-- Each row = one business factor from a causal chain

CREATE TABLE business_factors (
    -- Identity & Relationships
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    business_event_index INTEGER NOT NULL, -- 0, 1, 2 within AI response
    causal_step_index INTEGER NOT NULL,    -- 0, 1, 2 within business event
    total_steps_in_chain INTEGER NOT NULL,
    
    -- Article Context (for ML features)
    article_source TEXT,
    article_published_year INTEGER,
    article_published_month INTEGER,
    article_published_day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    
    -- Business Factor Details (main ML features)
    factor_name TEXT NOT NULL,              -- "new_product_category"
    factor_category TEXT,                   -- "product", "financial", etc.
    factor_unit TEXT,                       -- "binary", "%", etc.
    factor_movement INTEGER,                -- 1 (positive) or -1 (negative)
    factor_magnitude DECIMAL(5,3),         -- 0.150
    factor_raw_value DECIMAL(10,3),        -- actual value if numeric
    factor_description TEXT,               -- human readable description
    
    -- Event Context
    event_type TEXT,                       -- "Product_Announcement"
    event_scope TEXT,                      -- "company", "industry"
    event_trigger TEXT,                    -- "media_report", "earnings"
    event_orientation TEXT,                -- "predictive", "reactive"
    
    -- Timing Features (days)
    about_time_days INTEGER,               -- when factor happens
    effect_horizon_days INTEGER,           -- how long effect lasts
    time_horizon_days INTEGER,             -- event time horizon
    
    -- AI Assessment Features (0-1 scale)
    ai_execution_risk DECIMAL(3,2),
    ai_competitive_risk DECIMAL(3,2),
    ai_timeline_realism DECIMAL(3,2),
    ai_fundamental_strength DECIMAL(3,2),
    ai_business_impact_likelihood DECIMAL(3,2),
    
    -- Market Perception Features (0-1 scale)
    market_intensity DECIMAL(3,2),
    market_hope_vs_fear DECIMAL(3,2),
    market_narrative_strength DECIMAL(3,2),
    market_consensus_vs_division DECIMAL(3,2),
    market_surprise_vs_anticipated DECIMAL(3,2),
    
    -- Perception Gap Features (-1 to 1)
    perception_optimism_bias DECIMAL(3,2),
    perception_risk_awareness DECIMAL(3,2),
    perception_correction_potential DECIMAL(3,2),
    
    -- Confidence Features (0-1 scale)
    causal_certainty DECIMAL(3,2),
    logical_directness DECIMAL(3,2),
    regime_alignment DECIMAL(3,2),
    reframing_potential DECIMAL(3,2),
    narrative_disruption DECIMAL(3,2),
    market_consensus_on_causality DECIMAL(3,2),
    
    -- Evidence Features (binary flags)
    evidence_level_implied BOOLEAN DEFAULT FALSE,
    evidence_level_stated BOOLEAN DEFAULT FALSE,
    evidence_source_article BOOLEAN DEFAULT FALSE,
    evidence_source_external BOOLEAN DEFAULT FALSE,
    
    -- Array Features (JSON for flexibility, one-hot encode during ML)
    factor_synonyms JSONB,                 -- ["product_innovation", "category_expansion"]
    event_tags JSONB,                     -- ["Apple", "augmented reality"]
    cognitive_biases JSONB,               -- ["optimism_bias", "availability_heuristic"]
    emotional_profile JSONB,              -- ["anticipation", "optimism"]
    quoted_people JSONB,                  -- ["Tim Cook", "Analyst Name"]
    event_entities JSONB,                 -- ["Apple", "OpenAI"]
    
    -- Full text fields
    event_description TEXT,
    step_description TEXT,
    evidence_citation TEXT,
    
    -- Target Variables (to be filled later with stock data)
    stock_price_change_1d DECIMAL(6,4),   -- 1-day price change %
    stock_price_change_7d DECIMAL(6,4),   -- 7-day price change %
    stock_price_change_30d DECIMAL(6,4),  -- 30-day price change %
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ML queries
CREATE INDEX idx_business_factors_factor_name ON business_factors(factor_name);
CREATE INDEX idx_business_factors_factor_category ON business_factors(factor_category);
CREATE INDEX idx_business_factors_event_type ON business_factors(event_type);
CREATE INDEX idx_business_factors_article_source ON business_factors(article_source);
CREATE INDEX idx_business_factors_published_date ON business_factors(article_published_year, article_published_month);
CREATE INDEX idx_business_factors_magnitude ON business_factors(factor_magnitude);
CREATE INDEX idx_business_factors_movement ON business_factors(factor_movement);

-- Composite index for time-series analysis
CREATE INDEX idx_business_factors_time_analysis ON business_factors(
    article_published_year, 
    article_published_month, 
    factor_name, 
    factor_movement
);

-- Full-text search on descriptions
CREATE INDEX idx_business_factors_description_search ON business_factors USING gin(to_tsvector('english', factor_description || ' ' || event_description));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_business_factors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_factors_updated_at
    BEFORE UPDATE ON business_factors
    FOR EACH ROW
    EXECUTE FUNCTION update_business_factors_updated_at();

-- Comment
COMMENT ON TABLE business_factors IS 'Flattened business factors from AI causal chain analysis - each row represents one causal step with full context for ML training';
