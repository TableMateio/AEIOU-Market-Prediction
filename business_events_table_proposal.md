# Business Events Table Schema Proposal

## 🎯 Goal
Transform nested AI responses into a flat relational table where each **causal chain step** becomes its own row, with all related metadata included.

## 📊 Current Structure (Nested)
```
AI Response
├── Article Metadata (title, source, published_at, etc.)
├── Business Event 1
│   ├── Event Details (event_type, description, magnitude)
│   ├── Causal Chain
│   │   ├── Step 1 (factor, impact, magnitude, belief analysis)
│   │   ├── Step 2 (factor, impact, magnitude, belief analysis)
│   │   └── Step 3 (factor, impact, magnitude, belief analysis)
│   └── Belief Analysis (market perception, AI assessment)
├── Business Event 2
│   └── [same structure]
└── Business Event 3
```

## 🎯 Proposed Flat Structure
Each **causal chain step** = one row with ALL context:

### Table: `business_events_flat`

#### 🔗 Relationship/Identity Columns
- `id` (UUID, primary key)
- `ai_response_id` (FK to ai_responses)
- `article_id` (FK to articles) 
- `business_event_index` (0, 1, 2... within that AI response)
- `causal_step_index` (0, 1, 2... within that business event)
- `total_steps_in_chain` (how many total steps in this causal chain)

#### 📰 Article Metadata (duplicated for each row)
- `article_title`
- `article_source` 
- `article_published_at`
- `article_url`
- `article_authors` (JSON array)
- `article_summary`

#### 🔥 Business Event Details (duplicated for all steps in same event)
- `event_type` (Product_Announcement, etc.)
- `event_description` 
- `event_scope` (company, industry, etc.)
- `event_trigger` (media_report, etc.)
- `event_orientation` (predictive, reactive, etc.)
- `event_time_horizon_days`
- `event_tags` (JSON array)
- `event_entities` (JSON array)
- `quoted_people` (JSON array)

#### ⚡ Causal Step Details (unique per row)
- `step_factor` (new_product_category, market_share, etc.)
- `step_factor_category` (product, financial, etc.)
- `step_factor_synonyms` (JSON array)
- `step_factor_unit` (%, binary, etc.)
- `step_description` (human readable impact description)
- `step_movement` (1 = positive, -1 = negative)
- `step_magnitude` (0.15, 0.1, etc.)
- `step_raw_value` (actual number if available)
- `step_delta` (cumulative effect indicator)

#### 📅 Timing Information
- `step_about_time_days` (when this factor happens)
- `step_effect_horizon_days` (how long effect lasts)
- `step_orientation` (predictive, reactive, etc.)

#### 🧠 Belief Analysis (AI Assessment)
- `ai_execution_risk` (0-1)
- `ai_competitive_risk` (0-1) 
- `ai_timeline_realism` (0-1)
- `ai_fundamental_strength` (0-1)
- `ai_business_impact_likelihood` (0-1)

#### 🎭 Belief Analysis (Market Perception)
- `market_intensity` (0-1)
- `market_hope_vs_fear` (0-1, >0.5 = hopeful)
- `market_narrative_strength` (0-1)
- `market_consensus_vs_division` (0-1)
- `market_surprise_vs_anticipated` (0-1)
- `market_cognitive_biases` (JSON array)
- `market_emotional_profile` (JSON array)

#### 📈 Perception Gap Analysis
- `perception_optimism_bias` (-1 to 1)
- `perception_risk_awareness` (-1 to 1)
- `perception_correction_potential` (0-1)

#### 🔬 Evidence & Confidence
- `evidence_level` (implied, stated, etc.)
- `evidence_source` (article_text, external, etc.)
- `evidence_citation` (specific quote if available)
- `causal_certainty` (0-1)
- `logical_directness` (0-1)
- `regime_alignment` (0-1)
- `reframing_potential` (0-1)
- `narrative_disruption` (0-1)
- `market_consensus_on_causality` (0-1)

#### 📊 Processing Metadata
- `created_at`
- `updated_at`

## 💡 Example Transformation

**From**: 1 AI Response with 3 Business Events, each having 3 Causal Steps  
**To**: 9 rows in `business_events_flat` table

**Row 1**: Event 1, Step 1 (new_product_category → ?)  
**Row 2**: Event 1, Step 2 (market_share growth)  
**Row 3**: Event 1, Step 3 (revenue_growth_rate increase)  
**Row 4**: Event 2, Step 1 (...)  
**Row 5**: Event 2, Step 2 (...)  
**...and so on**

## 🔍 Benefits of This Structure

1. **Easy Querying**: Find all "new_product_category" factors across all articles
2. **Pattern Analysis**: Group by factor types, magnitudes, time horizons
3. **Belief Comparison**: Compare AI vs Market perception for same factor types
4. **Temporal Analysis**: Sort by time horizons, group by effect durations
5. **Correlation Studies**: Join with stock price data by article dates
6. **Factor Frequency**: Count how often specific factors appear

## 🤔 Questions for Discussion

1. **Naming**: Does `business_events_flat` work, or prefer `causal_steps` or `business_factors`?

2. **Redundancy**: OK with duplicating article/event metadata across multiple rows?

3. **JSON Fields**: Should cognitive_biases, tags, etc. be JSON arrays or separate junction tables?

4. **Missing Fields**: Any important data from the AI response we should include?

5. **Indexes**: Which columns need indexes for performance? (probably `step_factor`, `event_type`, `article_published_at`)

**What do you think about this approach? Any changes or additions you'd like to make?**
