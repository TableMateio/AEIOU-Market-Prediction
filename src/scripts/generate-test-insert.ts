#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';

/**
 * Generate a single flattened row insert to test the structure
 * Using the first causal step from our AI response
 */

async function generateTestInsert() {
    try {
        logger.info('🔄 Generating test insert for flattened structure');

        const testInsertSQL = `-- Test insert for flattened business_factors_flat table
-- This represents the FIRST causal step from the iOS 18.7 AI response

INSERT INTO business_factors_flat (
  ai_response_id, article_id, business_event_index, causal_step_index,
  
  -- Article metadata (same for all rows from this AI response)
  article_headline, article_source, article_url, article_authors, article_published_at,
  article_publisher_credibility, article_author_credibility, article_source_credibility,
  article_audience_split, article_time_lag_days, article_market_regime,
  article_published_year, article_published_month, article_published_day_of_week,
  
  -- Business event metadata (same for all causal steps in this business event)
  event_type, event_trigger, event_entities, event_scope, event_orientation,
  event_time_horizon_days, event_tags, event_quoted_people, event_description,
  
  -- Causal step details (unique per row - THIS is the first causal step)
  causal_step, factor_name, factor_synonyms, factor_category, factor_unit,
  factor_raw_value, factor_delta, factor_description, factor_movement, factor_magnitude,
  factor_orientation, factor_about_time_days, factor_effect_horizon_days,
  
  -- Evidence
  evidence_level, evidence_source, evidence_citation,
  
  -- Causal confidence
  causal_certainty, logical_directness, market_consensus_on_causality,
  regime_alignment, reframing_potential, narrative_disruption,
  
  -- Market perception (flattened from belief.market_perception)
  market_perception_intensity, market_perception_hope_vs_fear,
  market_perception_surprise_vs_anticipated, market_perception_consensus_vs_division,
  market_perception_narrative_strength, market_perception_emotional_profile,
  market_perception_cognitive_biases,
  
  -- AI assessment (flattened from belief.ai_assessment)
  ai_assessment_execution_risk, ai_assessment_competitive_risk,
  ai_assessment_business_impact_likelihood, ai_assessment_timeline_realism,
  ai_assessment_fundamental_strength,
  
  -- Perception gap (flattened from belief.perception_gap)
  perception_gap_optimism_bias, perception_gap_risk_awareness,
  perception_gap_correction_potential
  
) VALUES (
  'ab6a0452-e618-433f-a2ed-d6210f41d020',  -- ai_response_id
  '38eebfeb-6b2a-4f95-9dd9-8bc62e5de097',  -- article_id
  0,  -- business_event_index (first business event)
  0,  -- causal_step_index (first causal step)
  
  -- Article metadata (from structured_output.article)
  'Apple Preparing iOS 18.7 for iPhones as iOS 26 Release Date Nears',
  'MacRumors',
  'https://www.macrumors.com/2025/08/31/apple-preparing-ios-18-7/',
  '[]',  -- authors array (empty)
  '2025-08-31 23:35:06+00',
  0.5,   -- publisher_credibility
  NULL,  -- author_credibility
  0.5,   -- source_credibility  
  'both', -- audience_split
  0.1,   -- time_lag_days
  'neutral', -- market_regime
  2025,  -- published_year
  8,     -- published_month
  0,     -- published_day_of_week (Saturday)
  
  -- Business event metadata (from structured_output.business_events[0])
  'Product_Announcement',
  'media_report',
  '["Apple"]',
  'company',
  'predictive',
  30,    -- time_horizon_days
  '["Apple","iOS 18.7","iOS 26","software update","iPhone"]',
  '[]',  -- quoted_people (empty)
  'Apple is preparing to release iOS 18.7 for iPhones, expected in September alongside iOS 26.',
  
  -- Causal step details (from structured_output.business_events[0].causal_chain[0])
  0,     -- causal_step (step 0)
  'software_update',
  '["patch_release","version_update"]',
  'product',
  'binary',
  '1',   -- raw_value
  '1',   -- delta
  'Release of iOS 18.7 update for iPhones.',
  1,     -- movement (positive)
  0.01,  -- magnitude
  'predictive',
  15,    -- about_time_days
  30,    -- effect_horizon_days
  
  -- Evidence
  'implied',
  'article_text',
  'https://www.macrumors.com/2025/08/31/apple-preparing-ios-18-7/',
  
  -- Causal confidence
  0.8,   -- causal_certainty
  0.9,   -- logical_directness
  0.8,   -- market_consensus_on_causality
  0.1,   -- regime_alignment
  0.7,   -- reframing_potential
  0.3,   -- narrative_disruption
  
  -- Market perception (flattened from belief.market_perception)
  0.3,   -- intensity
  0.2,   -- hope_vs_fear
  0.1,   -- surprise_vs_anticipated
  0.5,   -- consensus_vs_division
  0.4,   -- narrative_strength
  '["anticipation","interest"]',  -- emotional_profile
  '["availability_heuristic"]',  -- cognitive_biases
  
  -- AI assessment (flattened from belief.ai_assessment)
  0.2,   -- execution_risk
  0.3,   -- competitive_risk
  0.7,   -- business_impact_likelihood
  0.9,   -- timeline_realism
  0.7,   -- fundamental_strength
  
  -- Perception gap (flattened from belief.perception_gap)
  0.1,   -- optimism_bias
  0.0,   -- risk_awareness
  0.2    -- correction_potential
);

-- Verification query to check the inserted row
SELECT 
  factor_name,
  factor_category,
  factor_magnitude,
  article_audience_split,
  article_market_regime,
  market_perception_intensity,
  ai_assessment_timeline_realism,
  perception_gap_optimism_bias
FROM business_factors_flat
WHERE ai_response_id = 'ab6a0452-e618-433f-a2ed-d6210f41d020'
AND causal_step_index = 0;`;

        const fs = require('fs');
        fs.writeFileSync('/tmp/test_flattened_insert.sql', testInsertSQL);

        logger.info('✅ Test insert generated');
        logger.info('📁 File: /tmp/test_flattened_insert.sql');
        logger.info('\n🔧 This insert demonstrates:');
        logger.info('   - All 71 flattened features populated');
        logger.info('   - Article metadata: audience_split, credibilities, market_regime');
        logger.info('   - Business event metadata: event_type, scope, trigger');
        logger.info('   - Causal step details: factor_name, magnitude, movement');
        logger.info('   - Flattened belief objects: market_perception_*, ai_assessment_*, perception_gap_*');
        logger.info('\n👀 Ready to execute and verify the flattened structure works!');

    } catch (error: any) {
        logger.error('❌ Test insert generation failed:', error.message);
        throw error;
    }
}

// Main execution
if (require.main === module) {
    generateTestInsert()
        .then(() => {
            logger.info('🎉 Test insert ready for execution!');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Generation failed:', error);
            process.exit(1);
        });
}
