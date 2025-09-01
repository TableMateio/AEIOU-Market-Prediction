#!/usr/bin/env tsx

/**
 * Enhanced Transformation with Article Metadata
 * 
 * Transforms AI responses to business_factors_flat with FULL article metadata
 * Includes JOIN to articles table for data_source, keywords, relevance_score, etc.
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('EnhancedTransform');

async function main() {
    logger.info('🔄 Creating enhanced transformation with full article metadata');

    console.log('\n=== ENHANCED TRANSFORMATION QUERY ===');
    console.log('This query joins AI responses with articles table for complete metadata:');

    const enhancedTransformQuery = `
-- Enhanced transformation with full article metadata
WITH flattened_responses AS (
    SELECT 
        ar.id as ai_response_id,
        ar.article_id,
        ar.created_at as ai_created_at,
        
        -- Article metadata (joined from articles table)
        a.title as article_headline,
        a.source as article_source, 
        a.url as article_url,
        a.authors as article_authors,
        a.published_at as article_published_at,
        a.data_source as article_data_source,
        a.keywords as article_keywords,
        a.apple_relevance_score as article_relevance_score,
        a.category as article_category,
        a.content_type as article_content_type,
        a.target_audience as article_target_audience,
        a.external_id as article_external_id,
        a.external_id_type as article_external_id_type,
        
        -- Extract business events
        event_index,
        event_data,
        
        -- Extract causal steps  
        step_index,
        step_data
    FROM ai_responses ar
    JOIN articles a ON ar.article_id = a.id
    CROSS JOIN LATERAL (
        SELECT 
            idx-1 as event_index,
            event_data
        FROM jsonb_array_elements(ar.structured_output->'business_events') WITH ORDINALITY AS t(event_data, idx)
    ) events
    CROSS JOIN LATERAL (
        SELECT 
            idx-1 as step_index,
            step_data
        FROM jsonb_array_elements(events.event_data->'causal_chain') WITH ORDINALITY AS t(step_data, idx)
    ) steps
    WHERE ar.success = true 
    AND ar.structured_output IS NOT NULL
)
INSERT INTO business_factors_flat (
    ai_response_id,
    article_id,
    business_event_index,
    causal_step_index,
    
    -- Article metadata (now includes all fields)
    article_headline,
    article_source,
    article_url,
    article_authors,
    article_published_at,
    article_data_source,        -- NEW
    article_keywords,           -- NEW  
    article_relevance_score,    -- NEW
    article_category,           -- NEW
    article_content_type,       -- NEW
    article_target_audience,    -- NEW
    article_external_id,        -- NEW
    article_external_id_type,   -- NEW
    
    -- Extract derived fields
    article_published_year,
    article_published_month,
    article_published_day_of_week,
    
    -- Business event fields
    event_type,
    event_trigger,
    event_entities,
    event_scope,
    event_orientation,
    event_time_horizon_days,
    event_tags,
    event_quoted_people,
    event_description,
    
    -- Causal step fields
    causal_step,
    factor_name,
    factor_synonyms,
    factor_category,
    factor_unit,
    factor_raw_value,
    factor_delta,
    factor_description,
    factor_movement,
    factor_magnitude,
    factor_orientation,
    factor_about_time_days,
    factor_effect_horizon_days,
    evidence_level,
    evidence_source,
    evidence_citation,
    causal_certainty,
    logical_directness,
    market_consensus_on_causality,
    regime_alignment,
    reframing_potential,
    narrative_disruption,
    
    -- Market perception (flattened)
    market_perception_intensity,
    market_perception_hope_vs_fear,
    market_perception_surprise_vs_anticipated,
    market_perception_consensus_vs_division,
    market_perception_narrative_strength,
    market_perception_emotional_profile,
    market_perception_cognitive_biases,
    
    -- AI assessment (flattened)
    ai_assessment_execution_risk,
    ai_assessment_competitive_risk,
    ai_assessment_business_impact_likelihood,
    ai_assessment_timeline_realism,
    ai_assessment_fundamental_strength,
    
    -- Perception gap (flattened)
    perception_gap_optimism_bias,
    perception_gap_risk_awareness,
    perception_gap_correction_potential,
    
    created_at,
    updated_at
)
SELECT 
    ai_response_id,
    article_id,
    event_index as business_event_index,
    step_index as causal_step_index,
    
    -- Article metadata (complete set)
    article_headline,
    article_source,
    article_url,
    article_authors,
    article_published_at,
    article_data_source,
    article_keywords,
    article_relevance_score,
    article_category,
    article_content_type,
    article_target_audience,
    article_external_id,
    article_external_id_type,
    
    -- Derived date fields
    EXTRACT(YEAR FROM article_published_at)::INTEGER,
    EXTRACT(MONTH FROM article_published_at)::INTEGER,
    EXTRACT(DOW FROM article_published_at)::INTEGER,
    
    -- Business event extraction
    event_data->>'type' as event_type,
    event_data->>'trigger' as event_trigger,
    event_data->'entities' as event_entities,
    event_data->>'scope' as event_scope,
    event_data->>'orientation' as event_orientation,
    (event_data->>'time_horizon_days')::INTEGER as event_time_horizon_days,
    event_data->'tags' as event_tags,
    event_data->'quoted_people' as event_quoted_people,
    event_data->>'description' as event_description,
    
    -- Causal step extraction
    (step_data->>'step')::NUMERIC(5,2) as causal_step,
    step_data->>'factor' as factor_name,
    step_data->'factor_synonyms' as factor_synonyms,
    step_data->>'factor_category' as factor_category,
    step_data->>'factor_unit' as factor_unit,
    step_data->>'raw_value' as factor_raw_value,
    step_data->>'delta' as factor_delta,
    step_data->>'description' as factor_description,
    (step_data->>'movement')::INTEGER as factor_movement,
    (step_data->>'magnitude')::NUMERIC(5,3) as factor_magnitude,
    step_data->>'orientation' as factor_orientation,
    (step_data->>'about_time_days')::INTEGER as factor_about_time_days,
    (step_data->>'effect_horizon_days')::INTEGER as factor_effect_horizon_days,
    step_data->>'evidence_level' as evidence_level,
    step_data->>'evidence_source' as evidence_source,
    step_data->>'evidence_citation' as evidence_citation,
    (step_data->>'causal_certainty')::NUMERIC(3,2) as causal_certainty,
    (step_data->>'logical_directness')::NUMERIC(3,2) as logical_directness,
    (step_data->>'market_consensus_on_causality')::NUMERIC(3,2) as market_consensus_on_causality,
    (step_data->>'regime_alignment')::NUMERIC(3,2) as regime_alignment,
    (step_data->>'reframing_potential')::NUMERIC(3,2) as reframing_potential,
    (step_data->>'narrative_disruption')::NUMERIC(3,2) as narrative_disruption,
    
    -- Market perception flattening
    (step_data->'belief'->'market_perception'->>'intensity')::NUMERIC(3,2) as market_perception_intensity,
    (step_data->'belief'->'market_perception'->>'hope_vs_fear')::NUMERIC(3,2) as market_perception_hope_vs_fear,
    (step_data->'belief'->'market_perception'->>'surprise_vs_anticipated')::NUMERIC(3,2) as market_perception_surprise_vs_anticipated,
    (step_data->'belief'->'market_perception'->>'consensus_vs_division')::NUMERIC(3,2) as market_perception_consensus_vs_division,
    (step_data->'belief'->'market_perception'->>'narrative_strength')::NUMERIC(3,2) as market_perception_narrative_strength,
    step_data->'belief'->'market_perception'->'emotional_profile' as market_perception_emotional_profile,
    step_data->'belief'->'market_perception'->'cognitive_biases' as market_perception_cognitive_biases,
    
    -- AI assessment flattening
    (step_data->'belief'->'ai_assessment'->>'execution_risk')::NUMERIC(3,2) as ai_assessment_execution_risk,
    (step_data->'belief'->'ai_assessment'->>'competitive_risk')::NUMERIC(3,2) as ai_assessment_competitive_risk,
    (step_data->'belief'->'ai_assessment'->>'business_impact_likelihood')::NUMERIC(3,2) as ai_assessment_business_impact_likelihood,
    (step_data->'belief'->'ai_assessment'->>'timeline_realism')::NUMERIC(3,2) as ai_assessment_timeline_realism,
    (step_data->'belief'->'ai_assessment'->>'fundamental_strength')::NUMERIC(3,2) as ai_assessment_fundamental_strength,
    
    -- Perception gap flattening
    (step_data->'belief'->'perception_gap'->>'optimism_bias')::NUMERIC(3,2) as perception_gap_optimism_bias,
    (step_data->'belief'->'perception_gap'->>'risk_awareness')::NUMERIC(3,2) as perception_gap_risk_awareness,
    (step_data->'belief'->'perception_gap'->>'correction_potential')::NUMERIC(3,2) as perception_gap_correction_potential,
    
    NOW() as created_at,
    NOW() as updated_at
    
FROM flattened_responses
ORDER BY ai_response_id, business_event_index, causal_step_index;
`;

    console.log(enhancedTransformQuery);

    console.log('\n=== EXECUTION STEPS ===');
    console.log('1. CLEAR existing data: DELETE FROM business_factors_flat;');
    console.log('2. RUN enhanced transformation (above query)');
    console.log('3. VERIFY: SELECT COUNT(*), article_data_source FROM business_factors_flat GROUP BY article_data_source;');
    console.log('======================\n');

    logger.info('📋 Enhanced transformation query generated');
    logger.info('🎯 Includes ALL article metadata: data_source, keywords, relevance_score, etc.');
}

if (require.main === module) {
    main().catch(console.error);
}
