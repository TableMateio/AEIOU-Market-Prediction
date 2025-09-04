/**
 * COMPLETE ML Training Data Schema
 * 
 * All 218 columns from ml_training_data table properly categorized
 * Based on actual database schema inspection
 */

export interface CompleteMLSchema {
    // IDENTIFIERS & METADATA (not features)
    identifiers: {
        id: string;                           // uuid
        business_factor_id: string;           // uuid  
        article_id: string;                   // uuid
        causal_events_ai_id: string;         // uuid
        ticker: string;                       // varchar
        event_timestamp: Date;                // timestamp
        article_published_at: Date;           // timestamp
        created_at: Date;                     // timestamp
        updated_at: Date;                     // timestamp
        processing_timestamp: Date;           // timestamp
    };

    // PROCESSING STATUS (not features)
    processing: {
        processing_status: string;            // varchar
        ml_split: string;                     // varchar
        business_event_index: number;         // integer
        causal_step_index: number;           // integer
        processing_time_ms: number;          // integer
        missing_data_points: string[];       // array
        approximation_quality: any;         // jsonb
    };

    // INPUT FEATURES (what we predict FROM)
    inputFeatures: {
        // BUSINESS FACTOR CORE
        factor_name: string;                  // text
        factor_category: string;              // text
        factor_magnitude: number;             // numeric
        factor_movement: number;              // integer (-1, 0, 1)
        factor_synonyms: any;                 // jsonb
        factor_unit: string;                  // text
        factor_raw_value: string;             // text
        factor_delta: string;                 // text
        factor_description: string;           // text
        factor_orientation: string;           // text
        factor_about_time_days: number;       // integer
        factor_effect_horizon_days: number;  // integer

        // CAUSAL ANALYSIS
        causal_certainty: number;             // numeric
        logical_directness: number;           // numeric
        regime_alignment: number;             // numeric
        causal_step: number;                  // numeric

        // EVENT CONTEXT
        event_type: string;                   // varchar
        event_description: string;            // text
        event_trigger: string;                // text
        event_entities: any;                  // jsonb
        event_scope: string;                  // text
        event_orientation: string;            // text (predictive/reflective)
        event_time_horizon_days: number;     // integer
        event_tags: any;                      // jsonb
        event_quoted_people: any;            // jsonb

        // ARTICLE METADATA
        article_headline: string;             // text
        article_url: string;                  // text
        article_authors: any;                 // jsonb
        article_source: string;               // varchar
        article_source_credibility: number;  // numeric
        article_author_credibility: number;  // numeric
        article_publisher_credibility: number; // numeric
        article_audience_split: string;      // text
        article_time_lag_days: number;       // numeric
        article_market_regime: string;       // text
        article_apple_relevance_score: number; // numeric
        article_ticker_relevance_score: number; // numeric
        article_published_year: number;      // integer
        article_published_month: number;     // integer
        article_published_day_of_week: number; // integer

        // EVIDENCE & SOURCES
        evidence_level: string;               // text
        evidence_source: string;              // text
        evidence_citation: string;            // text

        // MARKET CONSENSUS & NARRATIVE
        market_consensus_on_causality: number; // numeric
        reframing_potential: number;          // numeric
        narrative_disruption: number;         // numeric

        // MARKET PERCEPTION (from causal analysis)
        market_perception_intensity: number;           // numeric
        market_perception_hope_vs_fear: number;        // numeric
        market_perception_surprise_vs_anticipated: number; // numeric
        market_perception_consensus_vs_division: number;   // numeric
        market_perception_narrative_strength: number;     // numeric
        market_perception_emotional_profile: any;         // jsonb
        market_perception_cognitive_biases: any;          // jsonb

        // AI ASSESSMENTS (risk analysis)
        ai_assessment_execution_risk: number;              // numeric
        ai_assessment_competitive_risk: number;            // numeric
        ai_assessment_business_impact_likelihood: number;  // numeric
        ai_assessment_timeline_realism: number;            // numeric
        ai_assessment_fundamental_strength: number;        // numeric

        // PERCEPTION GAPS (bias detection)
        perception_gap_optimism_bias: number;      // numeric
        perception_gap_risk_awareness: number;     // numeric
        perception_gap_correction_potential: number; // numeric

        // MARKET CONTEXT (at time of event)
        market_hours: boolean;                // boolean
        market_regime: string;                // varchar
        pattern_strength_score: number;      // numeric
        data_quality_score: number;          // numeric
    };

    // TARGET VARIABLES (what we predict TO)
    targetVariables: {
        // RAW STOCK PRICES (before/after event)
        price_1min_before: number; price_1min_after: number;
        price_5min_before: number; price_5min_after: number;
        price_10min_before: number; price_10min_after: number;
        price_30min_before: number; price_30min_after: number;
        price_1hour_before: number; price_1hour_after: number;
        price_4hour_before: number; price_4hour_after: number;
        price_1day_before: number; price_1day_after: number;
        price_1week_before: number; price_1week_after: number;
        price_1month_before: number; price_1month_after: number;
        price_6month_before: number; price_6month_after: number;
        price_1year_before: number; price_1year_after: number;

        // DAILY PRICES
        price_day_open: number; price_daily_open: number;
        price_day_close: number; price_daily_close: number;
        price_end_of_day: number; price_next_day_open: number;
        price_at_event: number;

        // SPY BENCHMARK PRICES
        spy_1min_before: number; spy_1min_after: number;
        spy_5min_before: number; spy_5min_after: number;
        spy_10min_before: number; spy_10min_after: number;
        spy_30min_before: number; spy_30min_after: number;
        spy_1hour_before: number; spy_1hour_after: number;
        spy_4hour_before: number; spy_4hour_after: number;
        spy_1day_before: number; spy_1day_after: number;
        spy_1week_before: number; spy_1week_after: number;
        spy_1month_before: number; spy_1month_after: number;
        spy_6month_before: number; spy_6month_after: number;
        spy_1year_before: number; spy_1year_after: number;

        // QQQ BENCHMARK PRICES
        qqq_1min_before: number; qqq_1min_after: number;
        qqq_5min_before: number; qqq_5min_after: number;
        qqq_10min_before: number; qqq_10min_after: number;
        qqq_30min_before: number; qqq_30min_after: number;
        qqq_1hour_before: number; qqq_1hour_after: number;
        qqq_4hour_before: number; qqq_4hour_after: number;
        qqq_1day_before: number; qqq_1day_after: number;
        qqq_1week_before: number; qqq_1week_after: number;
        qqq_1month_before: number; qqq_1month_after: number;
        qqq_6month_before: number; qqq_6month_after: number;
        qqq_1year_before: number; qqq_1year_after: number;

        // ABSOLUTE PERCENTAGE CHANGES
        abs_change_1min_before_pct: number; abs_change_1min_after_pct: number;
        abs_change_5min_before_pct: number; abs_change_5min_after_pct: number;
        abs_change_10min_before_pct: number; abs_change_10min_after_pct: number;
        abs_change_30min_before_pct: number; abs_change_30min_after_pct: number;
        abs_change_1hour_before_pct: number; abs_change_1hour_after_pct: number;
        abs_change_4hour_before_pct: number; abs_change_4hour_after_pct: number;
        abs_change_1day_before_pct: number; abs_change_1day_after_pct: number;
        abs_change_1week_before_pct: number; abs_change_1week_after_pct: number;
        abs_change_1month_before_pct: number; abs_change_1month_after_pct: number;
        abs_change_6month_before_pct: number; abs_change_6month_after_pct: number;
        abs_change_1year_before_pct: number; abs_change_1year_after_pct: number;
        abs_change_end_of_day_pct: number; abs_change_next_day_open_pct: number;

        // ALPHA vs SPY (PRIMARY PREDICTION TARGETS)
        alpha_vs_spy_1min_before: number; alpha_vs_spy_1min_after: number;
        alpha_vs_spy_5min_before: number; alpha_vs_spy_5min_after: number;
        alpha_vs_spy_10min_before: number; alpha_vs_spy_10min_after: number;
        alpha_vs_spy_30min_before: number; alpha_vs_spy_30min_after: number;
        alpha_vs_spy_1hour_before: number; alpha_vs_spy_1hour_after: number;
        alpha_vs_spy_4hour_after: number;
        alpha_vs_spy_1day_before: number; alpha_vs_spy_1day_after: number;
        alpha_vs_spy_1week_before: number; alpha_vs_spy_1week_after: number;
        alpha_vs_spy_1month_before: number; alpha_vs_spy_1month_after: number;
        alpha_vs_spy_6month_before: number; alpha_vs_spy_6month_after: number;
        alpha_vs_spy_1year_before: number; alpha_vs_spy_1year_after: number;

        // ALPHA vs QQQ (TECH BENCHMARK)
        alpha_vs_qqq_1min_before: number; alpha_vs_qqq_1min_after: number;
        alpha_vs_qqq_5min_before: number; alpha_vs_qqq_5min_after: number;
        alpha_vs_qqq_10min_before: number; alpha_vs_qqq_10min_after: number;
        alpha_vs_qqq_30min_before: number; alpha_vs_qqq_30min_after: number;
        alpha_vs_qqq_1hour_before: number; alpha_vs_qqq_1hour_after: number;
        alpha_vs_qqq_4hour_after: number;
        alpha_vs_qqq_1day_before: number; alpha_vs_qqq_1day_after: number;
        alpha_vs_qqq_1week_before: number; alpha_vs_qqq_1week_after: number;
        alpha_vs_qqq_1month_before: number; alpha_vs_qqq_1month_after: number;
        alpha_vs_qqq_6month_before: number; alpha_vs_qqq_6month_after: number;
        alpha_vs_qqq_1year_before: number; alpha_vs_qqq_1year_after: number;

        // VOLUME METRICS
        volume_relative_20day: number;          // Volume relative to 20-day average
        volume_1hour_before_relative: number;   // Volume before event
        volume_1hour_after_relative: number;    // Volume after event
        volume_burst_first_hour: number;        // Volume spike in first hour

        // VOLATILITY METRICS
        volatility_1hour_before: number;        // Pre-event volatility
        volatility_1hour_after: number;         // Post-event volatility
        volatility_1day_before: number;         // Daily volatility before
        volatility_1day_after: number;          // Daily volatility after
        volatility_shock_ratio: number;         // Volatility shock magnitude

        // PRICE DISCOVERY METRICS
        price_discovery_speed_minutes: number;  // Time to price discovery
        max_move_within_1hour_pct: number;      // Maximum move in first hour
        reversal_strength_pct: number;          // Strength of any reversal
        attention_half_life_hours: number;      // How long attention lasts

        // MARKET MOMENTUM CONTEXT (calculated targets)
        spy_momentum_30day: number;             // SPY 30-day momentum
        spy_momentum_30day_pct: number;         // SPY 30-day momentum %
        qqq_momentum_30day: number;             // QQQ 30-day momentum  
        qqq_momentum_30day_pct: number;         // QQQ 30-day momentum %

        // CONFIDENCE SCORES (data quality metrics)
        confidence_1min_before: number; confidence_1min_after: number;
        confidence_5min_before: number; confidence_5min_after: number;
        confidence_10min_before: number; confidence_10min_after: number;
        confidence_30min_before: number; confidence_30min_after: number;
        confidence_1hour_before: number; confidence_1hour_after: number;
        confidence_4hour_before: number; confidence_4hour_after: number;
        confidence_1day_before: number; confidence_1day_after: number;
        confidence_1week_before: number; confidence_1week_after: number;
        confidence_1month_before: number; confidence_1month_after: number;
        confidence_6month_before: number; confidence_6month_after: number;
        confidence_1year_before: number; confidence_1year_after: number;
        confidence_daily_open: number; confidence_daily_close: number;
        confidence_at_event: number; confidence_end_of_day: number;
        confidence_next_day_open: number;
    };
}

// FEATURE CLASSIFICATION FOR ML PIPELINE
export const ML_FEATURE_CLASSIFICATION = {
    // INPUT FEATURES (what we predict FROM) - 70+ features
    INPUT_PATTERNS: [
        'factor_',           // Business factor core (12 fields)
        'causal_',           // Causal analysis (4 fields)  
        'event_',            // Event context (8 fields)
        'article_',          // Article metadata (14 fields)
        'evidence_',         // Evidence & sources (3 fields)
        'market_consensus',  // Market consensus (3 fields)
        'market_perception_', // Market perception (7 fields)
        'ai_assessment_',    // AI assessments (5 fields)
        'perception_gap_',   // Perception gaps (3 fields)
        'pattern_strength',  // Pattern analysis (1 field)
        'data_quality_score' // Data quality (1 field)
    ],

    // CONTEXT FEATURES (market state at time of event)
    CONTEXT_FEATURES: [
        'market_hours',      // boolean
        'market_regime'      // string
    ],

    // TARGET VARIABLES (what we predict TO) - 140+ targets
    TARGET_PATTERNS: [
        'price_',            // Raw stock prices (26 fields)
        'spy_',              // SPY benchmark prices (22 fields)
        'qqq_',              // QQQ benchmark prices (22 fields)
        'abs_change_',       // Absolute percentage changes (23 fields)
        'alpha_vs_spy_',     // Alpha vs SPY (18 fields)
        'alpha_vs_qqq_',     // Alpha vs QQQ (18 fields)
        'volume_',           // Volume metrics (4 fields)
        'volatility_',       // Volatility metrics (5 fields)
        'max_move_',         // Price discovery metrics (4 fields)
        'reversal_',         // Reversal metrics
        'attention_',        // Attention metrics
        'spy_momentum_',     // Market momentum (4 fields)
        'qqq_momentum_',     // Tech momentum (4 fields)
        'confidence_'        // Confidence scores (21 fields)
    ],

    // METADATA (not used in ML)
    METADATA_PATTERNS: [
        'id',                // Identifiers
        'created_at',        // Timestamps
        'updated_at',
        'processing_',       // Processing status
        'missing_data',      // Quality metrics
        'approximation'      // Quality metrics
    ]
};

export const PRIMARY_PREDICTION_TARGETS = [
    'alpha_vs_spy_1min_after',
    'alpha_vs_spy_5min_after',
    'alpha_vs_spy_10min_after',
    'alpha_vs_spy_30min_after',
    'alpha_vs_spy_1hour_after',
    'alpha_vs_spy_1day_after',
    'alpha_vs_spy_1week_after',
    'alpha_vs_qqq_1day_after',
    'volume_relative_20day',
    'volatility_shock_ratio',
    'max_move_within_1hour_pct'
];
