#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';

/**
 * Transform AI responses into SQL statements for manual execution
 * This version generates SQL files that can be executed via MCP tools
 */

async function generateTransformationSQL() {
    try {
        logger.info('🔄 Generating AI → ML transformation SQL');

        // First, let's create a simple test to see one AI response structure
        const fs = require('fs');

        const selectSQL = `
      SELECT 
        ar.id as ai_response_id,
        ar.article_id,
        ar.structured_output,
        ar.confidence_score,
        a.title as article_title,
        a.source as article_source,
        a.published_at as article_published_at,
        a.url as article_url,
        a.summary as article_summary
      FROM ai_responses ar
      JOIN articles a ON ar.article_id = a.id
      WHERE ar.success = true
      AND ar.structured_output->'business_events' IS NOT NULL
      ORDER BY a.published_at DESC
      LIMIT 1;
    `;

        logger.info('📝 Generated query to fetch AI responses for transformation');
        fs.writeFileSync('/tmp/fetch_ai_responses.sql', selectSQL);

        // Create a template for transformation
        const transformationTemplate = `
-- AI Response to ML Transformation Template
-- This will be populated after fetching the AI response data

-- Step 1: Run fetch_ai_responses.sql to get one AI response
-- Step 2: Examine the structure of structured_output
-- Step 3: Generate INSERT statements for business_events and business_factors

-- Template business_events INSERT:
INSERT INTO business_events (
  ai_response_id, article_id, event_index,
  article_title, article_source, article_published_at, article_url,
  event_type, event_description, event_magnitude, event_confidence,
  time_horizon_days, event_tags, total_causal_steps, chain_complexity
) VALUES (
  -- Values will be populated from AI response data
);

-- Template business_factors INSERT:
INSERT INTO business_factors (
  business_event_id, ai_response_id, article_id, causal_step_index,
  article_source, article_published_year, article_published_month,
  factor_name, factor_movement, factor_magnitude, factor_description,
  ai_execution_risk, ai_competitive_risk, ai_timeline_realism,
  market_intensity, market_hope_vs_fear, market_narrative_strength,
  causal_certainty, logical_directness, factor_synonyms
) VALUES (
  -- Values will be populated from causal chain data
);
    `;

        fs.writeFileSync('/tmp/transformation_template.sql', transformationTemplate);

        logger.info('✅ SQL generation completed');
        logger.info('📁 Files created:');
        logger.info('   - /tmp/fetch_ai_responses.sql (run this first to get AI data)');
        logger.info('   - /tmp/transformation_template.sql (template for transformation)');

        logger.info('\n🔧 Next steps:');
        logger.info('1. Execute fetch_ai_responses.sql via MCP to see AI response structure');
        logger.info('2. Use the structure to build actual transformation SQL');
        logger.info('3. Execute transformation SQL to populate ML tables');

    } catch (error: any) {
        logger.error('❌ SQL generation failed:', error.message);
        throw error;
    }
}

// Main execution
if (require.main === module) {
    generateTransformationSQL()
        .then(() => {
            logger.info('🎉 SQL generation completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 SQL generation failed:', error);
            process.exit(1);
        });
}
