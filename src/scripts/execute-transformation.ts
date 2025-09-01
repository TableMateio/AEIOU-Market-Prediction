#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';

/**
 * Execute the AI to ML transformation using the sample data structure we examined
 * This creates SQL statements for manual execution based on the actual AI response format
 */

// Sample AI response data structure (from the query above)
const sampleAIResponse = {
    ai_response_id: "ab6a0452-e618-433f-a2ed-d6210f41d020",
    article_id: "38eebfeb-6b2a-4f95-9dd9-8bc62e5de097",
    article_title: "Apple Preparing iOS 18.7 for iPhones as iOS 26 Release Date Nears",
    article_source: "MacRumors",
    article_published_at: "2025-08-31 23:35:06+00",
    article_url: "https://www.macrumors.com/2025/08/31/apple-preparing-ios-18-7/",
    business_events: [
        {
            event_type: "Product_Announcement",
            event_description: "Apple is preparing to release iOS 18.7 for iPhones, expected in September alongside iOS 26.",
            scope: "company",
            trigger: "media_report",
            orientation: "predictive",
            time_horizon_days: 30,
            tags: ["Apple", "iOS 18.7", "iOS 26", "software update", "iPhone"],
            entities: ["Apple"],
            quoted_people: [],
            causal_chain: [
                {
                    step: 0,
                    factor: "software_update",
                    movement: 1,
                    magnitude: 0.01,
                    description: "Release of iOS 18.7 update for iPhones.",
                    factor_category: "product",
                    factor_unit: "binary",
                    about_time_days: 15,
                    effect_horizon_days: 30,
                    factor_synonyms: ["patch_release", "version_update"],
                    belief: {
                        ai_assessment: {
                            execution_risk: 0.2,
                            competitive_risk: 0.3,
                            timeline_realism: 0.9,
                            fundamental_strength: 0.7,
                            business_impact_likelihood: 0.7
                        },
                        market_perception: {
                            intensity: 0.3,
                            hope_vs_fear: 0.2,
                            narrative_strength: 0.4,
                            consensus_vs_division: 0.5,
                            surprise_vs_anticipated: 0.1,
                            cognitive_biases: ["availability_heuristic"],
                            emotional_profile: ["anticipation", "interest"]
                        },
                        perception_gap: {
                            optimism_bias: 0.1,
                            risk_awareness: 0,
                            correction_potential: 0.2
                        }
                    },
                    causal_certainty: 0.8,
                    logical_directness: 0.9,
                    regime_alignment: 0.1,
                    reframing_potential: 0.7,
                    narrative_disruption: 0.3,
                    market_consensus_on_causality: 0.8
                }
            ]
        }
    ]
};

async function executeTransformation() {
    try {
        logger.info('🔄 Creating transformation SQL for manual execution');

        // Generate business_events INSERT
        const businessEventSQL = generateBusinessEventSQL(sampleAIResponse);

        // Generate business_factors INSERT
        const businessFactorsSQL = generateBusinessFactorsSQL(sampleAIResponse);

        // Save SQL files
        const fs = require('fs');

        const transformationSQL = `-- AI to ML Transformation SQL
-- Generated for manual execution via MCP tools

-- Step 1: Insert Business Event
${businessEventSQL}

-- Step 2: Insert Business Factors (execute after getting business_event_id from step 1)
${businessFactorsSQL}

-- Step 3: Verify transformation
SELECT 
  be.event_type,
  be.event_description,
  be.total_causal_steps,
  COUNT(bf.id) as factors_created
FROM business_events be
LEFT JOIN business_factors bf ON be.id = bf.business_event_id  
WHERE be.ai_response_id = '${sampleAIResponse.ai_response_id}'
GROUP BY be.id, be.event_type, be.event_description, be.total_causal_steps;
`;

        fs.writeFileSync('/tmp/ai_to_ml_transformation.sql', transformationSQL);

        logger.info('✅ Transformation SQL generated successfully!');
        logger.info('📁 File created: /tmp/ai_to_ml_transformation.sql');
        logger.info('\n🔧 Next steps:');
        logger.info('1. Execute the business_events INSERT via MCP');
        logger.info('2. Get the returned business_event_id');
        logger.info('3. Update and execute the business_factors INSERTs');
        logger.info('4. Run verification query');

        return transformationSQL;

    } catch (error: any) {
        logger.error('❌ Transformation generation failed:', error.message);
        throw error;
    }
}

function generateBusinessEventSQL(response: any): string {
    const event = response.business_events[0];
    const publishedAt = new Date(response.article_published_at);

    return `INSERT INTO business_events (
  ai_response_id, article_id, event_index,
  article_title, article_source, article_published_at, article_url,
  event_type, event_description, event_scope, event_trigger, event_orientation,
  event_magnitude, event_confidence, time_horizon_days,
  event_tags, event_entities, quoted_people,
  total_causal_steps, chain_complexity
) VALUES (
  '${response.ai_response_id}',
  '${response.article_id}',
  0,
  '${cleanString(response.article_title)}',
  '${cleanString(response.article_source)}',
  '${response.article_published_at}',
  '${response.article_url}',
  '${event.event_type}',
  '${cleanString(event.event_description)}',
  '${event.scope}',
  '${event.trigger}',
  '${event.orientation}',
  0.05, -- estimated magnitude
  0.95, -- from confidence_score
  ${event.time_horizon_days},
  '${JSON.stringify(event.tags)}',
  '${JSON.stringify(event.entities)}',
  '${JSON.stringify(event.quoted_people)}',
  ${event.causal_chain.length},
  '${event.causal_chain.length <= 2 ? 'simple' : event.causal_chain.length <= 4 ? 'moderate' : 'complex'}'
) RETURNING id;`;
}

function generateBusinessFactorsSQL(response: any): string {
    const event = response.business_events[0];
    const publishedAt = new Date(response.article_published_at);

    let factorSQLs = [];

    for (const [index, step] of event.causal_chain.entries()) {
        const factorSQL = `INSERT INTO business_factors (
  business_event_id, ai_response_id, article_id, causal_step_index,
  article_source, article_published_year, article_published_month, article_published_day_of_week,
  factor_name, factor_category, factor_unit, factor_movement, factor_magnitude,
  factor_description, step_number,
  about_time_days, effect_horizon_days,
  ai_execution_risk, ai_competitive_risk, ai_timeline_realism,
  ai_fundamental_strength, ai_business_impact_likelihood,
  market_intensity, market_hope_vs_fear, market_narrative_strength,
  market_consensus_vs_division, market_surprise_vs_anticipated,
  perception_optimism_bias, perception_risk_awareness, perception_correction_potential,
  causal_certainty, logical_directness, regime_alignment,
  reframing_potential, narrative_disruption, market_consensus_on_causality,
  evidence_level_implied, evidence_level_stated,
  evidence_source_article, evidence_source_external,
  factor_synonyms, cognitive_biases, emotional_profile
) VALUES (
  (SELECT id FROM business_events WHERE ai_response_id = '${response.ai_response_id}' LIMIT 1), -- business_event_id
  '${response.ai_response_id}',
  '${response.article_id}',
  ${index},
  '${cleanString(response.article_source)}',
  ${publishedAt.getFullYear()},
  ${publishedAt.getMonth() + 1},
  ${publishedAt.getDay()},
  '${cleanString(step.factor)}',
  '${step.factor_category}',
  '${step.factor_unit}',
  ${step.movement},
  ${step.magnitude},
  '${cleanString(step.description)}',
  ${step.step + 1},
  ${step.about_time_days},
  ${step.effect_horizon_days},
  ${step.belief.ai_assessment.execution_risk},
  ${step.belief.ai_assessment.competitive_risk},
  ${step.belief.ai_assessment.timeline_realism},
  ${step.belief.ai_assessment.fundamental_strength},
  ${step.belief.ai_assessment.business_impact_likelihood},
  ${step.belief.market_perception.intensity},
  ${step.belief.market_perception.hope_vs_fear},
  ${step.belief.market_perception.narrative_strength},
  ${step.belief.market_perception.consensus_vs_division},
  ${step.belief.market_perception.surprise_vs_anticipated},
  ${step.belief.perception_gap.optimism_bias},
  ${step.belief.perception_gap.risk_awareness},
  ${step.belief.perception_gap.correction_potential},
  ${step.causal_certainty},
  ${step.logical_directness},
  ${step.regime_alignment},
  ${step.reframing_potential},
  ${step.narrative_disruption},
  ${step.market_consensus_on_causality},
  true, -- evidence_level_implied
  false, -- evidence_level_stated
  true, -- evidence_source_article
  false, -- evidence_source_external
  '${JSON.stringify(step.factor_synonyms)}',
  '${JSON.stringify(step.belief.market_perception.cognitive_biases)}',
  '${JSON.stringify(step.belief.market_perception.emotional_profile)}'
);`;

        factorSQLs.push(factorSQL);
    }

    return factorSQLs.join('\n\n');
}

function cleanString(str: string): string {
    if (!str) return '';
    return str.replace(/'/g, "''").substring(0, 1000);
}

// Main execution
if (require.main === module) {
    executeTransformation()
        .then(() => {
            logger.info('🎉 Transformation SQL generation completed!');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Generation failed:', error);
            process.exit(1);
        });
}
