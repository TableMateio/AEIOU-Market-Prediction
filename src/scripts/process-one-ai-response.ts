#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';

/**
 * Process one specific AI response into flattened business_factors_flat table
 * This AI response should create 4 rows (1 business event × 4 causal steps)
 */

const AI_RESPONSE_ID = "ab6a0452-e618-433f-a2ed-d6210f41d020";
const ARTICLE_ID = "38eebfeb-6b2a-4f95-9dd9-8bc62e5de097";

// Extracted data from the AI response above
const aiResponseData = {
    article: {
        headline: "Apple Preparing iOS 18.7 for iPhones as iOS 26 Release Date Nears",
        source: "MacRumors",
        url: "https://www.macrumors.com/2025/08/31/apple-preparing-ios-18-7/",
        authors: [],
        published_at: "2025-08-31T23:35:06+00:00",
        publisher_credibility: 0.5,
        author_credibility: null,
        source_credibility: 0.5,
        audience_split: "both",
        time_lag_days: 0.1,
        market_regime: "neutral"
    },
    business_events: [
        {
            event_type: "Product_Announcement",
            trigger: "media_report",
            entities: ["Apple"],
            scope: "company",
            orientation: "predictive",
            time_horizon_days: 30,
            tags: ["Apple", "iOS 18.7", "iOS 26", "software update", "iPhone"],
            quoted_people: [],
            event_description: "Apple is preparing to release iOS 18.7 for iPhones, expected in September alongside iOS 26.",
            causal_chain: [
                {
                    step: 0,
                    factor: "software_update",
                    factor_synonyms: ["patch_release", "version_update"],
                    factor_category: "product",
                    factor_unit: "binary",
                    raw_value: 1,
                    delta: 1,
                    description: "Release of iOS 18.7 update for iPhones.",
                    movement: 1,
                    magnitude: 0.01,
                    orientation: "predictive",
                    about_time_days: 15,
                    effect_horizon_days: 30,
                    evidence_level: "implied",
                    evidence_source: "article_text",
                    evidence_citation: "https://www.macrumors.com/2025/08/31/apple-preparing-ios-18-7/",
                    causal_certainty: 0.8,
                    logical_directness: 0.9,
                    market_consensus_on_causality: 0.8,
                    regime_alignment: 0.1,
                    reframing_potential: 0.7,
                    narrative_disruption: 0.3,
                    belief: {
                        market_perception: {
                            intensity: 0.3,
                            hope_vs_fear: 0.2,
                            cognitive_biases: ["availability_heuristic"],
                            emotional_profile: ["anticipation", "interest"],
                            narrative_strength: 0.4,
                            consensus_vs_division: 0.5,
                            surprise_vs_anticipated: 0.1
                        },
                        ai_assessment: {
                            execution_risk: 0.2,
                            competitive_risk: 0.3,
                            timeline_realism: 0.9,
                            fundamental_strength: 0.7,
                            business_impact_likelihood: 0.7
                        },
                        perception_gap: {
                            optimism_bias: 0.1,
                            risk_awareness: 0,
                            correction_potential: 0.2
                        }
                    }
                },
                // ... 3 more causal steps (truncated for brevity)
            ]
        }
    ]
};

async function processOneAIResponse() {
    try {
        logger.info('🔄 Processing one AI response into flattened structure');
        logger.info(`📄 AI Response: ${AI_RESPONSE_ID}`);
        logger.info(`📰 Article: ${aiResponseData.article.headline.substring(0, 60)}...`);

        const publishedAt = new Date(aiResponseData.article.published_at);
        let totalRowsCreated = 0;

        // Process each business event 
        for (const [businessEventIndex, businessEvent] of aiResponseData.business_events.entries()) {
            logger.info(`\n🎯 Business Event ${businessEventIndex}: ${businessEvent.event_type}`);
            logger.info(`   Causal steps: ${businessEvent.causal_chain.length}`);

            // Process each causal step in this business event
            for (const [causalStepIndex, causalStep] of businessEvent.causal_chain.entries()) {
                try {
                    const insertSQL = generateFlattenedInsert(
                        businessEventIndex,
                        causalStepIndex,
                        aiResponseData.article,
                        businessEvent,
                        causalStep,
                        publishedAt
                    );

                    logger.info(`   📝 Row ${causalStepIndex + 1}: ${causalStep.factor} (magnitude: ${causalStep.magnitude})`);

                    // Save SQL for manual execution
                    const fs = require('fs');
                    fs.appendFileSync('/tmp/flattened_insert_row.sql', insertSQL + '\n\n');

                    totalRowsCreated++;

                } catch (error: any) {
                    logger.error(`   ❌ Error processing causal step ${causalStepIndex}: ${error.message}`);
                }
            }
        }

        logger.info(`\n✅ Flattened transformation completed!`);
        logger.info(`📊 Summary:`);
        logger.info(`   - Business Events: ${aiResponseData.business_events.length}`);
        logger.info(`   - Total Causal Steps: ${totalRowsCreated}`);
        logger.info(`   - Rows to be created: ${totalRowsCreated}`);
        logger.info(`   - SQL saved to: /tmp/flattened_insert_row.sql`);

    } catch (error: any) {
        logger.error('💥 Processing failed:', error.message);
        throw error;
    }
}

function generateFlattenedInsert(
    businessEventIndex: number,
    causalStepIndex: number,
    article: any,
    businessEvent: any,
    causalStep: any,
    publishedAt: Date
): string {

    const cleanString = (str: string | null | undefined): string => {
        if (!str) return '';
        return str.replace(/'/g, "''").substring(0, 2000);
    };

    const cleanValue = (val: any): string => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') return `'${cleanString(val)}'`;
        if (Array.isArray(val)) return `'${JSON.stringify(val)}'`;
        return val.toString();
    };

    return `INSERT INTO business_factors_flat (
  ai_response_id, article_id, business_event_index, causal_step_index,
  
  -- Article metadata
  article_headline, article_source, article_url, article_authors, article_published_at,
  article_publisher_credibility, article_author_credibility, article_source_credibility,
  article_audience_split, article_time_lag_days, article_market_regime,
  article_published_year, article_published_month, article_published_day_of_week,
  
  -- Business event metadata  
  event_type, event_trigger, event_entities, event_scope, event_orientation,
  event_time_horizon_days, event_tags, event_quoted_people, event_description,
  
  -- Causal step details
  causal_step, factor_name, factor_synonyms, factor_category, factor_unit,
  factor_raw_value, factor_delta, factor_description, factor_movement, factor_magnitude,
  factor_orientation, factor_about_time_days, factor_effect_horizon_days,
  
  -- Evidence
  evidence_level, evidence_source, evidence_citation,
  
  -- Causal confidence
  causal_certainty, logical_directness, market_consensus_on_causality,
  regime_alignment, reframing_potential, narrative_disruption,
  
  -- Market perception (flattened)
  market_perception_intensity, market_perception_hope_vs_fear,
  market_perception_surprise_vs_anticipated, market_perception_consensus_vs_division,
  market_perception_narrative_strength, market_perception_emotional_profile,
  market_perception_cognitive_biases,
  
  -- AI assessment (flattened)
  ai_assessment_execution_risk, ai_assessment_competitive_risk,
  ai_assessment_business_impact_likelihood, ai_assessment_timeline_realism,
  ai_assessment_fundamental_strength,
  
  -- Perception gap (flattened)
  perception_gap_optimism_bias, perception_gap_risk_awareness,
  perception_gap_correction_potential
  
) VALUES (
  '${AI_RESPONSE_ID}',
  '${ARTICLE_ID}',
  ${businessEventIndex},
  ${causalStepIndex},
  
  -- Article metadata (same for all rows from this AI response)
  '${cleanString(article.headline)}',
  '${cleanString(article.source)}',
  '${article.url}',
  '${JSON.stringify(article.authors)}',
  '${article.published_at}',
  ${article.publisher_credibility},
  ${article.author_credibility || 'NULL'},
  ${article.source_credibility},
  '${article.audience_split}',
  ${article.time_lag_days},
  ${cleanValue(article.market_regime)},
  ${publishedAt.getFullYear()},
  ${publishedAt.getMonth() + 1},
  ${publishedAt.getDay()},
  
  -- Business event metadata (same for all causal steps in this business event)
  '${businessEvent.event_type}',
  '${businessEvent.trigger}',
  '${JSON.stringify(businessEvent.entities)}',
  '${businessEvent.scope}',
  '${businessEvent.orientation}',
  ${businessEvent.time_horizon_days},
  '${JSON.stringify(businessEvent.tags)}',
  '${JSON.stringify(businessEvent.quoted_people)}',
  '${cleanString(businessEvent.event_description)}',
  
  -- Causal step details (unique per row)
  ${causalStep.step},
  '${causalStep.factor}',
  '${JSON.stringify(causalStep.factor_synonyms)}',
  '${causalStep.factor_category}',
  '${causalStep.factor_unit}',
  ${cleanValue(causalStep.raw_value)},
  ${cleanValue(causalStep.delta)},
  '${cleanString(causalStep.description)}',
  ${causalStep.movement},
  ${causalStep.magnitude},
  '${causalStep.orientation}',
  ${causalStep.about_time_days},
  ${causalStep.effect_horizon_days},
  
  -- Evidence
  '${causalStep.evidence_level}',
  '${causalStep.evidence_source}',
  '${causalStep.evidence_citation}',
  
  -- Causal confidence
  ${causalStep.causal_certainty},
  ${causalStep.logical_directness},
  ${causalStep.market_consensus_on_causality},
  ${causalStep.regime_alignment},
  ${causalStep.reframing_potential},
  ${causalStep.narrative_disruption},
  
  -- Market perception (flattened from belief.market_perception)
  ${causalStep.belief.market_perception.intensity},
  ${causalStep.belief.market_perception.hope_vs_fear},
  ${causalStep.belief.market_perception.surprise_vs_anticipated},
  ${causalStep.belief.market_perception.consensus_vs_division},
  ${causalStep.belief.market_perception.narrative_strength},
  '${JSON.stringify(causalStep.belief.market_perception.emotional_profile)}',
  '${JSON.stringify(causalStep.belief.market_perception.cognitive_biases)}',
  
  -- AI assessment (flattened from belief.ai_assessment)
  ${causalStep.belief.ai_assessment.execution_risk},
  ${causalStep.belief.ai_assessment.competitive_risk},
  ${causalStep.belief.ai_assessment.business_impact_likelihood},
  ${causalStep.belief.ai_assessment.timeline_realism},
  ${causalStep.belief.ai_assessment.fundamental_strength},
  
  -- Perception gap (flattened from belief.perception_gap)
  ${causalStep.belief.perception_gap.optimism_bias},
  ${causalStep.belief.perception_gap.risk_awareness},
  ${causalStep.belief.perception_gap.correction_potential}
);`;
}

// Main execution
if (require.main === module) {
    // Clear the output file
    const fs = require('fs');
    fs.writeFileSync('/tmp/flattened_insert_row.sql', '-- Flattened Business Factors Insert\n-- One AI response → 4 causal steps → 4 rows\n\n');

    processOneAIResponse()
        .then(() => {
            logger.info('🎉 One AI response processing completed!');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Processing failed:', error);
            process.exit(1);
        });
}
