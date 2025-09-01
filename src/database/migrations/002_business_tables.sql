-- Migration: Business Events and Business Factors Tables
-- Creates the two-table structure for flattened ML data

-- Business Events Table: One row per business event from AI analysis
CREATE TABLE IF NOT EXISTS business_events (
    -- Identity & Relationships
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    event_index INTEGER NOT NULL, -- 0, 1, 2 within AI response
    
    -- Article Context
    article_title TEXT,
    article_source TEXT,
    article_published_at TIMESTAMPTZ,
    article_url TEXT,
    article_summary TEXT,
    
    -- Business Event Details
    event_type TEXT NOT NULL,              -- "Product_Announcement", "Financial_Report"
    event_description TEXT NOT NULL,       -- Human readable description
    event_scope TEXT,                      -- "company", "industry", "market"
    event_trigger TEXT,                    -- "media_report", "earnings", "announcement"
    event_orientation TEXT,                -- "predictive", "reactive", "reflective"
    event_magnitude DECIMAL(5,3),          -- Overall event magnitude
    event_confidence DECIMAL(3,2),         -- AI confidence in event
    time_horizon_days INTEGER,             -- Event time horizon
    
    -- Event Context Arrays (JSON)
    event_tags JSONB,                     -- ["Apple", "iPhone", "AI"]
    event_entities JSONB,                 -- ["Apple Inc", "OpenAI"]
    quoted_people JSONB,                  -- ["Tim Cook", "Analyst Name"]
    
    -- Causal Chain Summary
    total_causal_steps INTEGER,           -- How many steps in chain
    chain_complexity TEXT,                -- "simple", "moderate", "complex"
    
    -- Target Variables (to be filled later)
    stock_price_change_1d DECIMAL(6,4),
    stock_price_change_7d DECIMAL(6,4), 
    stock_price_change_30d DECIMAL(6,4),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Factors Table: One row per causal chain step
CREATE TABLE IF NOT EXISTS business_factors (
    -- Identity & Relationships
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_event_id UUID NOT NULL REFERENCES business_events(id) ON DELETE CASCADE,
    ai_response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    causal_step_index INTEGER NOT NULL,    -- 0, 1, 2 within business event
    
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
    step_number INTEGER,                   -- position in causal chain
    
    -- Timing Features (days)
    about_time_days INTEGER,               -- when factor happens
    effect_horizon_days INTEGER,           -- how long effect lasts
    
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
    
    -- Array Features (JSON for flexibility)
    factor_synonyms JSONB,                 -- ["product_innovation", "category_expansion"]
    cognitive_biases JSONB,               -- ["optimism_bias", "availability_heuristic"]
    emotional_profile JSONB,              -- ["anticipation", "optimism"]
    
    -- Evidence citation
    evidence_citation TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for business_events
CREATE INDEX IF NOT EXISTS idx_business_events_type ON business_events(event_type);
CREATE INDEX IF NOT EXISTS idx_business_events_source ON business_events(article_source);
CREATE INDEX IF NOT EXISTS idx_business_events_published ON business_events(article_published_at);
CREATE INDEX IF NOT EXISTS idx_business_events_magnitude ON business_events(event_magnitude);

-- Indexes for business_factors
CREATE INDEX IF NOT EXISTS idx_business_factors_factor_name ON business_factors(factor_name);
CREATE INDEX IF NOT EXISTS idx_business_factors_factor_category ON business_factors(factor_category);
CREATE INDEX IF NOT EXISTS idx_business_factors_movement ON business_factors(factor_movement);
CREATE INDEX IF NOT EXISTS idx_business_factors_magnitude ON business_factors(factor_magnitude);
CREATE INDEX IF NOT EXISTS idx_business_factors_event_id ON business_factors(business_event_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_events_updated_at
    BEFORE UPDATE ON business_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER business_factors_updated_at
    BEFORE UPDATE ON business_factors  
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE business_events IS 'Business events extracted from AI analysis - one row per event with summary data';
COMMENT ON TABLE business_factors IS 'Individual causal factors - one row per causal step with full ML features';
