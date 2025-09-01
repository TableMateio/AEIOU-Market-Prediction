#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';

/**
 * Transform AI responses into the corrected flattened structure
 * Each row = one causal step with complete article + business event + causal step context
 */

interface FlattenedFactorInsert {
    ai_response_id: string;
    article_id: string;
    business_event_index: number;
    causal_step_index: number;

    // Article-level metadata (same for all rows from this article)
    article_headline: string;
    article_source: string;
    article_url: string;
    article_authors: string[];
    article_published_at: string;
    article_publisher_credibility: number;
    article_author_credibility: number | null;
    article_source_credibility: number;
    article_audience_split: string;
    article_time_lag_days: number | null;
    article_market_regime: string | null;
    article_published_year: number;
    article_published_month: number;
    article_published_day_of_week: number;

    // Business event metadata (same for all causal steps in this event)
    event_type: string;
    event_trigger: string;
    event_entities: string[];
    event_scope: string;
    event_orientation: string;
    event_time_horizon_days: number;
    event_tags: string[];
    event_quoted_people: string[];
    event_description: string;

    // Causal step details (unique per row)
    causal_step: number;
    factor_name: string;
    factor_synonyms: string[];
    factor_category: string;
    factor_unit: string;
    factor_raw_value: string | null;
    factor_delta: string | null;
    factor_description: string;
    factor_movement: number;
    factor_magnitude: number;
    factor_orientation: string;
    factor_about_time_days: number;
    factor_effect_horizon_days: number;

    // Evidence
    evidence_level: string;
    evidence_source: string;
    evidence_citation: string | null;

    // Causal confidence
    causal_certainty: number;
    logical_directness: number;
    market_consensus_on_causality: number;
    regime_alignment: number;
    reframing_potential: number;
    narrative_disruption: number;

    // Market perception (flattened from belief.market_perception)
    market_perception_intensity: number;
    market_perception_hope_vs_fear: number;
    market_perception_surprise_vs_anticipated: number;
    market_perception_consensus_vs_division: number;
    market_perception_narrative_strength: number;
    market_perception_emotional_profile: string[];
    market_perception_cognitive_biases: string[];

    // AI assessment (flattened from belief.ai_assessment)
    ai_assessment_execution_risk: number;
    ai_assessment_competitive_risk: number;
    ai_assessment_business_impact_likelihood: number;
    ai_assessment_timeline_realism: number;
    ai_assessment_fundamental_strength: number;

    // Perception gap (flattened from belief.perception_gap)
    perception_gap_optimism_bias: number;
    perception_gap_risk_awareness: number;
    perception_gap_correction_potential: number;
}

async function generateFlattenedTransformation() {
    try {
        logger.info('🔄 Generating flattened transformation SQL');

        // Get one AI response to examine structure and create transformation
        const sampleQuery = `
      SELECT 
        ar.id as ai_response_id,
        ar.article_id,
        ar.structured_output,
        a.title,
        a.source,
        a.published_at,
        a.url
      FROM ai_responses ar
      JOIN articles a ON ar.article_id = a.id
      WHERE ar.success = true
      AND ar.structured_output->'business_events' IS NOT NULL
      ORDER BY a.published_at DESC
      LIMIT 1
    `;

        logger.info('📝 Generated sample query for flattened transformation');

        // Create a comprehensive transformation template
        const flattenedTransformTemplate = `
-- Flattened AI Response Transformation 
-- This script shows the correct structure for completely flattened business factors

-- Example transformation for one AI response:
-- 1 AI Response → 2 Business Events → 4 Causal Steps = 4 rows in business_factors_flat

-- Sample row structure (based on AI schema):
INSERT INTO business_factors_flat (
  ai_response_id, article_id, business_event_index, causal_step_index,
  
  -- Article metadata (same for ALL rows from this AI response)
  article_headline, article_source, article_url, article_authors, article_published_at,
  article_publisher_credibility, article_author_credibility, article_source_credibility,
  article_audience_split, article_time_lag_days, article_market_regime,
  article_published_year, article_published_month, article_published_day_of_week,
  
  -- Business event metadata (same for all causal steps in THIS business event)
  event_type, event_trigger, event_entities, event_scope, event_orientation,
  event_time_horizon_days, event_tags, event_quoted_people, event_description,
  
  -- Causal step details (unique per row - THIS is what makes each row different)
  causal_step, factor_name, factor_synonyms, factor_category, factor_unit,
  factor_raw_value, factor_delta, factor_description, factor_movement, factor_magnitude,
  factor_orientation, factor_about_time_days, factor_effect_horizon_days,
  
  -- Evidence
  evidence_level, evidence_source, evidence_citation,
  
  -- Causal confidence  
  causal_certainty, logical_directness, market_consensus_on_causality,
  regime_alignment, reframing_potential, narrative_disruption,
  
  -- Market perception (flattened from belief.market_perception object)
  market_perception_intensity, market_perception_hope_vs_fear,
  market_perception_surprise_vs_anticipated, market_perception_consensus_vs_division,
  market_perception_narrative_strength, market_perception_emotional_profile,
  market_perception_cognitive_biases,
  
  -- AI assessment (flattened from belief.ai_assessment object)
  ai_assessment_execution_risk, ai_assessment_competitive_risk,
  ai_assessment_business_impact_likelihood, ai_assessment_timeline_realism,
  ai_assessment_fundamental_strength,
  
  -- Perception gap (flattened from belief.perception_gap object)
  perception_gap_optimism_bias, perception_gap_risk_awareness, 
  perception_gap_correction_potential
  
) VALUES (
  -- Values will be extracted from AI response JSON structure
  -- Article metadata comes from structured_output.article.*
  -- Business event metadata comes from structured_output.business_events[i].*  
  -- Causal step details come from structured_output.business_events[i].causal_chain[j].*
  -- Belief subobjects get flattened: belief.market_perception.intensity becomes market_perception_intensity
);

-- For 15 AI responses with average 2.5 business events and 3 causal steps each:
-- Expected result: ~112 rows with 71 features each
-- Perfect for Deep Forest ML training!
`;

        const fs = require('fs');
        fs.writeFileSync('/tmp/flattened_transformation_template.sql', flattenedTransformTemplate);
        fs.writeFileSync('/tmp/fetch_sample_ai_response.sql', sampleQuery);

        logger.info('✅ Flattened transformation template generated');
        logger.info('📁 Files created:');
        logger.info('   - /tmp/fetch_sample_ai_response.sql (get AI response structure)');
        logger.info('   - /tmp/flattened_transformation_template.sql (complete flattened structure)');

        logger.info('\n🔧 Next steps:');
        logger.info('1. Run fetch_sample_ai_response.sql to get AI response JSON');
        logger.info('2. Extract all nested fields according to schema');
        logger.info('3. Generate INSERT statements for business_factors_flat');
        logger.info('4. Each causal step becomes one row with complete context');

        logger.info('\n📊 Expected flattened structure:');
        logger.info('   - Article metadata: 15 fields (audience_split, credibilities, market_regime, etc.)');
        logger.info('   - Business event metadata: 9 fields (event_type, scope, trigger, etc.)');
        logger.info('   - Causal step details: 15 fields (factor_name, magnitude, movement, etc.)');
        logger.info('   - Belief subobjects flattened: 25+ fields (market_perception_*, ai_assessment_*, perception_gap_*)');
        logger.info('   - Total: 71 features per row for ML training');

    } catch (error: any) {
        logger.error('❌ Template generation failed:', error.message);
        throw error;
    }
}

// Main execution
if (require.main === module) {
    generateFlattenedTransformation()
        .then(() => {
            logger.info('🎉 Flattened transformation template ready!');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Template generation failed:', error);
            process.exit(1);
        });
}
