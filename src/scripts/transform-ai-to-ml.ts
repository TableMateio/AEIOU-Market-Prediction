#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';

/**
 * Transform AI responses into ML-ready business_events and business_factors tables
 * Converts nested JSON → flat relational structure for Deep Forest training
 */

interface AIBusinessEvent {
    event_type: string;
    event_description: string;
    event_scope?: string;
    event_trigger?: string;
    event_orientation?: string;
    event_magnitude: number;
    event_confidence: number;
    time_horizon_days: number;
    event_tags?: string[];
    event_entities?: string[];
    quoted_people?: string[];
    causal_chain: CausalStep[];
}

interface CausalStep {
    step_number: number;
    factor_name: string;
    factor_category?: string;
    factor_unit?: string;
    factor_movement: number;
    factor_magnitude: number;
    factor_raw_value?: number;
    factor_description: string;
    about_time_days: number;
    effect_horizon_days: number;
    ai_assessment: {
        execution_risk: number;
        competitive_risk: number;
        timeline_realism: number;
        fundamental_strength: number;
        business_impact_likelihood: number;
    };
    market_perception: {
        intensity: number;
        hope_vs_fear: number;
        narrative_strength: number;
        consensus_vs_division: number;
        surprise_vs_anticipated: number;
    };
    perception_gap: {
        optimism_bias: number;
        risk_awareness: number;
        correction_potential: number;
    };
    confidence: {
        causal_certainty: number;
        logical_directness: number;
        regime_alignment: number;
        reframing_potential: number;
        narrative_disruption: number;
        market_consensus_on_causality: number;
    };
    evidence: {
        level: string;
        source: string;
        citation?: string;
    };
    factor_synonyms?: string[];
    cognitive_biases?: string[];
    emotional_profile?: string[];
}

async function transformAIToML() {
    try {
        logger.info('🔄 Starting AI → ML transformation');

        // Get all successful AI responses with article context
        const aiResponses = await getAIResponses();
        logger.info(`📊 Found ${aiResponses.length} AI responses to transform`);

        let totalEventsCreated = 0;
        let totalFactorsCreated = 0;

        for (const [index, response] of aiResponses.entries()) {
            try {
                logger.info(`\n📄 Processing response ${index + 1}/${aiResponses.length}`);
                logger.info(`   Article: ${response.article_title.substring(0, 60)}...`);

                const events = response.structured_output?.business_events || [];
                logger.info(`   Business Events: ${events.length}`);

                for (const [eventIndex, event] of events.entries()) {
                    const businessEventId = await createBusinessEvent(response, event, eventIndex);
                    const factorsCreated = await createBusinessFactors(businessEventId, response, event);

                    totalEventsCreated++;
                    totalFactorsCreated += factorsCreated;

                    logger.info(`   ✅ Event ${eventIndex + 1}: ${event.event_type} → ${factorsCreated} factors`);
                }

            } catch (error: any) {
                logger.error(`   ❌ Error processing response: ${error.message}`);
            }
        }

        logger.info('\n🎉 Transformation completed successfully!');
        logger.info(`📊 Summary:`);
        logger.info(`   - Business Events Created: ${totalEventsCreated}`);
        logger.info(`   - Business Factors Created: ${totalFactorsCreated}`);
        logger.info(`   - Average Factors per Event: ${(totalFactorsCreated / totalEventsCreated).toFixed(1)}`);

        // Verify the data
        await verifyTransformation();

    } catch (error: any) {
        logger.error('💥 Fatal error in transformation:', error.message);
        throw error;
    }
}

/**
 * Get AI responses with article context
 */
async function getAIResponses(): Promise<any[]> {
    // Using dynamic import to access MCP functions in Node.js environment
    try {
        // @ts-ignore
        const result = await mcp_supabase_execute_sql({
            query: `
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
      `
        });

        return JSON.parse(result.split('boundaries.\n\n')[1].split('\n\nUse this data')[0])
            .filter((r: any) => r.structured_output?.business_events?.length > 0);

    } catch (error: any) {
        logger.error('❌ Failed to fetch AI responses:', error.message);
        throw error;
    }
}

/**
 * Create business event record
 */
async function createBusinessEvent(response: any, event: AIBusinessEvent, eventIndex: number): Promise<string> {
    const publishedAt = new Date(response.article_published_at);

    // Generate complexity assessment
    const chainLength = event.causal_chain?.length || 0;
    const complexity = chainLength <= 2 ? 'simple' : chainLength <= 4 ? 'moderate' : 'complex';

    const insertSQL = `
    INSERT INTO business_events (
      ai_response_id, article_id, event_index,
      article_title, article_source, article_published_at, article_url, article_summary,
      event_type, event_description, event_scope, event_trigger, event_orientation,
      event_magnitude, event_confidence, time_horizon_days,
      event_tags, event_entities, quoted_people,
      total_causal_steps, chain_complexity
    ) VALUES (
      '${response.ai_response_id}',
      '${response.article_id}',
      ${eventIndex},
      '${cleanString(response.article_title)}',
      '${cleanString(response.article_source)}',
      '${response.article_published_at}',
      '${response.article_url}',
      '${cleanString(response.article_summary || '')}',
      '${cleanString(event.event_type)}',
      '${cleanString(event.event_description)}',
      '${cleanString(event.event_scope || '')}',
      '${cleanString(event.event_trigger || '')}',
      '${cleanString(event.event_orientation || '')}',
      ${event.event_magnitude || 0},
      ${event.event_confidence || 0},
      ${event.time_horizon_days || 0},
      '${JSON.stringify(event.event_tags || [])}',
      '${JSON.stringify(event.event_entities || [])}',
      '${JSON.stringify(event.quoted_people || [])}',
      ${chainLength},
      '${complexity}'
    ) RETURNING id
  `;

    try {
        // @ts-ignore
        const result = await mcp_supabase_execute_sql({ query: insertSQL });
        const rows = JSON.parse(result.split('boundaries.\n\n')[1].split('\n\nUse this data')[0]);
        return rows[0]?.id;
    } catch (error: any) {
        logger.error('❌ Failed to create business event:', error.message);
        throw error;
    }
}

/**
 * Create business factors for an event
 */
async function createBusinessFactors(businessEventId: string, response: any, event: AIBusinessEvent): Promise<number> {
    const causalChain = event.causal_chain || [];
    const publishedAt = new Date(response.article_published_at);

    let factorsCreated = 0;

    for (const [stepIndex, step] of causalChain.entries()) {
        try {
            const insertSQL = `
        INSERT INTO business_factors (
          business_event_id, ai_response_id, article_id, causal_step_index,
          article_source, article_published_year, article_published_month, article_published_day_of_week,
          factor_name, factor_category, factor_unit, factor_movement, factor_magnitude, 
          factor_raw_value, factor_description, step_number,
          about_time_days, effect_horizon_days,
          ai_execution_risk, ai_competitive_risk, ai_timeline_realism, 
          ai_fundamental_strength, ai_business_impact_likelihood,
          market_intensity, market_hope_vs_fear, market_narrative_strength,
          market_consensus_vs_division, market_surprise_vs_anticipated,
          perception_optimism_bias, perception_risk_awareness, perception_correction_potential,
          causal_certainty, logical_directness, regime_alignment,
          reframing_potential, narrative_disruption, market_consensus_on_causality,
          evidence_level_implied, evidence_level_stated, evidence_source_article, evidence_source_external,
          factor_synonyms, cognitive_biases, emotional_profile, evidence_citation
        ) VALUES (
          '${businessEventId}',
          '${response.ai_response_id}',
          '${response.article_id}',
          ${stepIndex},
          '${cleanString(response.article_source)}',
          ${publishedAt.getFullYear()},
          ${publishedAt.getMonth() + 1},
          ${publishedAt.getDay()},
          '${cleanString(step.factor_name)}',
          '${cleanString(step.factor_category || '')}',
          '${cleanString(step.factor_unit || '')}',
          ${step.factor_movement || 0},
          ${step.factor_magnitude || 0},
          ${step.factor_raw_value || 0},
          '${cleanString(step.factor_description)}',
          ${step.step_number || stepIndex + 1},
          ${step.about_time_days || 0},
          ${step.effect_horizon_days || 0},
          ${step.ai_assessment?.execution_risk || 0},
          ${step.ai_assessment?.competitive_risk || 0},
          ${step.ai_assessment?.timeline_realism || 0},
          ${step.ai_assessment?.fundamental_strength || 0},
          ${step.ai_assessment?.business_impact_likelihood || 0},
          ${step.market_perception?.intensity || 0},
          ${step.market_perception?.hope_vs_fear || 0},
          ${step.market_perception?.narrative_strength || 0},
          ${step.market_perception?.consensus_vs_division || 0},
          ${step.market_perception?.surprise_vs_anticipated || 0},
          ${step.perception_gap?.optimism_bias || 0},
          ${step.perception_gap?.risk_awareness || 0},
          ${step.perception_gap?.correction_potential || 0},
          ${step.confidence?.causal_certainty || 0},
          ${step.confidence?.logical_directness || 0},
          ${step.confidence?.regime_alignment || 0},
          ${step.confidence?.reframing_potential || 0},
          ${step.confidence?.narrative_disruption || 0},
          ${step.confidence?.market_consensus_on_causality || 0},
          ${step.evidence?.level === 'implied'},
          ${step.evidence?.level === 'stated'},
          ${step.evidence?.source === 'article'},
          ${step.evidence?.source === 'external'},
          '${JSON.stringify(step.factor_synonyms || [])}',
          '${JSON.stringify(step.cognitive_biases || [])}',
          '${JSON.stringify(step.emotional_profile || [])}',
          '${cleanString(step.evidence?.citation || '')}'
        )
      `;

            // @ts-ignore
            await mcp_supabase_execute_sql({ query: insertSQL });
            factorsCreated++;

        } catch (error: any) {
            logger.error(`❌ Failed to create factor ${stepIndex}: ${error.message}`);
        }
    }

    return factorsCreated;
}

/**
 * Clean strings for SQL insertion
 */
function cleanString(str: string): string {
    if (!str) return '';
    return str.replace(/'/g, "''").substring(0, 2000);
}

/**
 * Verify the transformation worked
 */
async function verifyTransformation() {
    try {
        // @ts-ignore
        const result = await mcp_supabase_execute_sql({
            query: `
        SELECT 
          (SELECT COUNT(*) FROM business_events) as events_count,
          (SELECT COUNT(*) FROM business_factors) as factors_count,
          (SELECT COUNT(DISTINCT factor_name) FROM business_factors) as unique_factors,
          (SELECT ROUND(AVG(jsonb_array_length(factor_synonyms)), 1) FROM business_factors WHERE factor_synonyms IS NOT NULL) as avg_synonyms
      `
        });

        const stats = JSON.parse(result.split('boundaries.\n\n')[1].split('\n\nUse this data')[0])[0];

        logger.info('\n📊 Transformation Verification:');
        logger.info(`   - Business Events: ${stats.events_count}`);
        logger.info(`   - Business Factors: ${stats.factors_count}`);
        logger.info(`   - Unique Factor Types: ${stats.unique_factors}`);
        logger.info(`   - Avg Synonyms per Factor: ${stats.avg_synonyms}`);

    } catch (error: any) {
        logger.error('❌ Verification failed:', error.message);
    }
}

// Main execution
if (require.main === module) {
    transformAIToML()
        .then(() => {
            logger.info('🎉 AI → ML transformation completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Transformation failed:', error);
            process.exit(1);
        });
}

export { transformAIToML };
