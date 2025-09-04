/**
 * Causal Events Flattening Script
 * 
 * Takes AI responses from causal_events_ai table and creates individual rows
 * in causal_events_flat table - one row per causal step with complete context
 * (business event + article + causal step details)
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';

const logger = createLogger('CausalEventsFlattening');

interface CausalEventFlatRecord {
    // Identity & Relationships
    causal_events_ai_id: string;         // causal_events_ai.id
    article_id: string;                  // articles.id
    business_event_index: number;        // from business_events_flat
    causal_step_index: number;           // position in causal_chain array

    // Article Metadata (from original article)
    article_headline: string | null;
    article_source: string | null;
    article_url: string | null;
    article_authors: string[] | null;
    article_published_at: string | null;
    article_publisher_credibility: number | null;
    article_author_credibility: number | null;
    article_source_credibility: number | null;
    article_audience_split: string | null;
    article_time_lag_days: number | null;
    article_market_regime: string | null;

    // Derived article features
    article_published_year: number | null;
    article_published_month: number | null;
    article_published_day_of_week: number | null;

    // Business Event Context (from business_events_flat)
    event_type: string | null;
    event_trigger: string | null;
    event_entities: string[] | null;
    event_scope: string | null;
    event_orientation: string | null;
    event_time_horizon_days: number | null;
    event_tags: string[] | null;
    event_quoted_people: string[] | null;
    event_description: string | null;

    // Causal Step Details (the core factor)
    causal_step: number;                 // step index from causal_chain
    factor_name: string;                 // factor name
    factor_synonyms: string[] | null;
    factor_category: string | null;
    factor_unit: string | null;
    factor_raw_value: string | null;     // flexible type as string
    factor_delta: string | null;         // flexible type as string
    factor_description: string | null;
    factor_movement: number | null;      // 1, -1, 0
    factor_magnitude: number | null;     // 0-1 scale
    factor_orientation: string | null;
    factor_about_time_days: number | null;
    factor_effect_horizon_days: number | null;

    // Evidence Features
    evidence_level: string | null;
    evidence_source: string | null;
    evidence_citation: string | null;

    // Causal Confidence Features (0-1 scale)
    causal_certainty: number | null;
    logical_directness: number | null;
    market_consensus_on_causality: number | null;
    regime_alignment: number | null;     // -1 to 1 scale
    reframing_potential: number | null;
    narrative_disruption: number | null;

    // Market Perception Features
    market_perception_intensity: number | null;
    market_perception_hope_vs_fear: number | null;
    market_perception_surprise_vs_anticipated: number | null;
    market_perception_consensus_vs_division: number | null;
    market_perception_narrative_strength: number | null;
    market_perception_emotional_profile: string[] | null;
    market_perception_cognitive_biases: string[] | null;

    // AI Assessment Features (0-1 scale)
    ai_assessment_execution_risk: number | null;
    ai_assessment_competitive_risk: number | null;
    ai_assessment_business_impact_likelihood: number | null;
    ai_assessment_timeline_realism: number | null;
    ai_assessment_fundamental_strength: number | null;

    // Perception Gap Features (-1 to 1 scale)
    perception_gap_optimism_bias: number | null;
    perception_gap_risk_awareness: number | null;
    perception_gap_correction_potential: number | null;
}

class CausalEventsFlattener {
    private supabase: any;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    /**
     * Main flattening process
     */
    async flattenCausalEvents(limit?: number, force: boolean = false): Promise<void> {
        logger.info('🔄 Starting causal events flattening...');

        try {
            // Get causal AI responses with full context
            const causalResponses = await this.getCausalResponses(limit, force);
            logger.info(`📊 Found ${causalResponses.length} causal AI responses to process`);

            if (causalResponses.length === 0) {
                logger.info('✅ No causal responses to process');
                return;
            }

            // Process each causal response
            let totalSteps = 0;
            let savedSteps = 0;

            for (const response of causalResponses) {
                const steps = await this.flattenSingleCausalResponse(response);
                totalSteps += steps.length;

                if (steps.length > 0) {
                    await this.saveFlattenedSteps(steps);
                    savedSteps += steps.length;
                    logger.info(`✅ Processed causal response ${response.id}: ${steps.length} causal steps`);
                } else {
                    logger.info(`📝 Causal response ${response.id}: 0 causal steps found`);
                }
            }

            logger.info('🎉 Causal events flattening complete', {
                causalResponsesProcessed: causalResponses.length,
                totalStepsFound: totalSteps,
                stepsSaved: savedSteps
            });

        } catch (error) {
            logger.error('❌ Causal events flattening failed', error);
            throw error;
        }
    }

    /**
     * Get causal AI responses that need flattening
     */
    private async getCausalResponses(limit?: number, force: boolean = false): Promise<any[]> {
        let query = this.supabase
            .from('causal_events_ai')
            .select(`
                id,
                business_event_flat_id,
                business_events_ai_id,
                article_id,
                structured_output,
                business_events_flat!inner (
                    id,
                    event_index,
                    event_type,
                    trigger,
                    entities,
                    scope,
                    orientation,
                    time_horizon_days,
                    tags,
                    quoted_people,
                    event_description,
                    intensity,
                    certainty_truth,
                    certainty_impact,
                    hope_vs_fear,
                    surprise_vs_anticipated,
                    consensus_vs_division,
                    positive_vs_negative_sentiment,
                    article_headline,
                    article_source,
                    article_published_at,
                    article_publisher_credibility,
                    article_author_credibility,
                    article_source_credibility,
                    article_audience_split,
                    article_time_lag_days,
                    article_market_regime
                ),
                articles!inner (
                    id,
                    title,
                    url,
                    source,
                    authors,
                    published_at
                )
            `)
            .eq('success', true)
            .not('structured_output', 'is', null);

        // Skip already processed unless force flag
        if (!force) {
            // Check which causal responses already have flattened steps
            const { data: alreadyFlattened } = await this.supabase
                .from('causal_events_flat')
                .select('causal_events_ai_id');

            const processedIds = (alreadyFlattened || []).map((r: any) => r.causal_events_ai_id);

            if (processedIds.length > 0) {
                query = query.not('id', 'in', processedIds);
            }
        }

        if (limit && limit > 0) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch causal responses: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Flatten a single causal AI response into individual causal step records
     */
    private async flattenSingleCausalResponse(response: any): Promise<CausalEventFlatRecord[]> {
        const structuredOutput = response.structured_output;
        const businessEvent = response.business_events_flat;
        const article = response.articles;

        if (!structuredOutput?.causal_chain || !Array.isArray(structuredOutput.causal_chain)) {
            return [];
        }

        const flatRecords: CausalEventFlatRecord[] = [];

        // Parse published date for derived features
        const publishedAt = article.published_at ? new Date(article.published_at) : null;

        structuredOutput.causal_chain.forEach((step: any, index: number) => {
            const flatRecord: CausalEventFlatRecord = {
                // Identity & Relationships
                causal_events_ai_id: response.id,
                article_id: response.article_id,
                business_event_index: businessEvent.event_index,
                causal_step_index: index,

                // Article Metadata (from business_events_flat which has AI analysis)
                article_headline: businessEvent.article_headline || article.title,
                article_source: businessEvent.article_source || article.source,
                article_url: article.url,
                article_authors: article.authors,
                article_published_at: businessEvent.article_published_at || article.published_at,
                article_publisher_credibility: businessEvent.article_publisher_credibility,
                article_author_credibility: businessEvent.article_author_credibility,
                article_source_credibility: businessEvent.article_source_credibility,
                article_audience_split: businessEvent.article_audience_split,
                article_time_lag_days: businessEvent.article_time_lag_days,
                article_market_regime: businessEvent.article_market_regime,

                // Derived article features
                article_published_year: publishedAt?.getFullYear() || null,
                article_published_month: publishedAt?.getMonth() + 1 || null, // 1-12
                article_published_day_of_week: publishedAt?.getDay() || null, // 0=Sunday

                // Business Event Context (from business_events_flat)
                event_type: businessEvent.event_type,
                event_trigger: businessEvent.trigger,
                event_entities: businessEvent.entities,
                event_scope: businessEvent.scope,
                event_orientation: businessEvent.orientation,
                event_time_horizon_days: businessEvent.time_horizon_days,
                event_tags: businessEvent.tags,
                event_quoted_people: businessEvent.quoted_people,
                event_description: businessEvent.event_description,

                // Causal Step Details (the core factor)
                causal_step: step.step,
                factor_name: step.factor,
                factor_synonyms: step.factor_synonyms,
                factor_category: step.factor_category,
                factor_unit: step.factor_unit,
                factor_raw_value: step.raw_value?.toString() || null,
                factor_delta: step.delta?.toString() || null,
                factor_description: step.description,
                factor_movement: step.movement,
                factor_magnitude: step.magnitude,
                factor_orientation: step.orientation,
                factor_about_time_days: step.about_time_days,
                factor_effect_horizon_days: step.effect_horizon_days,

                // Evidence Features
                evidence_level: step.evidence_level,
                evidence_source: step.evidence_source,
                evidence_citation: step.evidence_citation,

                // Causal Confidence Features
                causal_certainty: step.causal_certainty,
                logical_directness: step.logical_directness,
                market_consensus_on_causality: step.market_consensus_on_causality,
                regime_alignment: step.regime_alignment,
                reframing_potential: step.reframing_potential,
                narrative_disruption: step.narrative_disruption,

                // Market Perception Features (flattened from belief.market_perception)
                market_perception_intensity: step.belief?.market_perception?.intensity || null,
                market_perception_hope_vs_fear: step.belief?.market_perception?.hope_vs_fear || null,
                market_perception_surprise_vs_anticipated: step.belief?.market_perception?.surprise_vs_anticipated || null,
                market_perception_consensus_vs_division: step.belief?.market_perception?.consensus_vs_division || null,
                market_perception_narrative_strength: step.belief?.market_perception?.narrative_strength || null,
                market_perception_emotional_profile: step.belief?.market_perception?.emotional_profile || null,
                market_perception_cognitive_biases: step.belief?.market_perception?.cognitive_biases || null,

                // AI Assessment Features (flattened from belief.ai_assessment)
                ai_assessment_execution_risk: step.belief?.ai_assessment?.execution_risk || null,
                ai_assessment_competitive_risk: step.belief?.ai_assessment?.competitive_risk || null,
                ai_assessment_business_impact_likelihood: step.belief?.ai_assessment?.business_impact_likelihood || null,
                ai_assessment_timeline_realism: step.belief?.ai_assessment?.timeline_realism || null,
                ai_assessment_fundamental_strength: step.belief?.ai_assessment?.fundamental_strength || null,

                // Perception Gap Features (flattened from belief.perception_gap)
                perception_gap_optimism_bias: step.belief?.perception_gap?.optimism_bias || null,
                perception_gap_risk_awareness: step.belief?.perception_gap?.risk_awareness || null,
                perception_gap_correction_potential: step.belief?.perception_gap?.correction_potential || null
            };

            flatRecords.push(flatRecord);
        });

        return flatRecords;
    }

    /**
     * Save flattened causal steps to causal_events_flat table
     */
    private async saveFlattenedSteps(steps: CausalEventFlatRecord[]): Promise<void> {
        if (steps.length === 0) return;

        const { error } = await this.supabase
            .from('causal_events_flat')
            .insert(steps);

        if (error) {
            throw new Error(`Failed to save flattened causal steps: ${error.message}`);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);

    // Parse arguments
    const limitIndex = args.findIndex(arg => arg.startsWith('--limit='));
    const limit = limitIndex >= 0 ? parseInt(args[limitIndex].split('=')[1]) : undefined;
    const force = args.includes('--force');

    try {
        const flattener = new CausalEventsFlattener();
        await flattener.flattenCausalEvents(limit, force);

        console.log('🎉 Causal events flattening completed successfully!');

    } catch (error: any) {
        console.error('❌ Flattening failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { CausalEventsFlattener };
