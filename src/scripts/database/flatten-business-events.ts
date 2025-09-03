/**
 * Business Events Flattening Script
 * 
 * Takes AI responses from business_events_ai table and creates individual rows
 * in business_events_flat table - one row per business event with full article context
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';

const logger = createLogger('BusinessEventsFlattening');

interface BusinessEventFlatRecord {
    // Identity & Relationships
    business_events_ai_id: string;
    article_id: string;

    // Business Event Context  
    event_index: number;

    // Business Event Details (matching database schema)
    event_type: string;
    trigger: string | null;
    entities: string[] | null;
    scope: string | null;
    orientation: string | null;
    time_horizon_days: number | null;
    tags: string[] | null;
    quoted_people: string[] | null;
    event_description: string | null;

    // Business Event Assessments (from schema-business.json)
    intensity: number | null;
    certainty_truth: number | null;
    certainty_impact: number | null;
    hope_vs_fear: number | null;
    surprise_vs_anticipated: number | null;
    consensus_vs_division: number | null;
    positive_vs_negative_sentiment: number | null;

    // Article Metadata (from AI analysis)
    article_headline: string | null;
    article_source: string | null;
    article_published_at: string | null;
    article_publisher_credibility: number | null;
    article_author_credibility: number | null;
    article_source_credibility: number | null;
    article_audience_split: string | null;
    article_time_lag_days: number | null;
    article_market_regime: string | null;
}

class BusinessEventsFlattener {
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
    async flattenBusinessEvents(limit?: number, force: boolean = false): Promise<void> {
        logger.info('🔄 Starting business events flattening...');

        try {
            // Get AI responses with business events
            const aiResponses = await this.getAIResponses(limit, force);
            logger.info(`📊 Found ${aiResponses.length} AI responses to process`);

            if (aiResponses.length === 0) {
                logger.info('✅ No AI responses to process');
                return;
            }

            // Process each AI response
            let totalEvents = 0;
            let savedEvents = 0;

            for (const response of aiResponses) {
                const events = await this.flattenSingleResponse(response);
                totalEvents += events.length;

                if (events.length > 0) {
                    await this.saveFlattenedEvents(events);
                    savedEvents += events.length;
                    logger.info(`✅ Processed AI response ${response.id}: ${events.length} events`);
                } else {
                    logger.info(`📝 AI response ${response.id}: 0 events found`);
                }
            }

            logger.info('🎉 Business events flattening complete', {
                aiResponsesProcessed: aiResponses.length,
                totalEventsFound: totalEvents,
                eventsSaved: savedEvents
            });

        } catch (error) {
            logger.error('❌ Business events flattening failed', error);
            throw error;
        }
    }

    /**
     * Get AI responses that need flattening
     */
    private async getAIResponses(limit?: number, force: boolean = false): Promise<any[]> {
        let query = this.supabase
            .from('business_events_ai')
            .select(`
                id,
                article_id,
                structured_output,
                articles!inner (
                    id,
                    title,
                    url,
                    source,
                    authors,
                    published_at,
                    body
                )
            `)
            .eq('success', true)
            .not('structured_output', 'is', null);

        // Skip already processed unless force flag
        if (!force) {
            // Check which AI responses already have flattened events
            const { data: alreadyFlattened } = await this.supabase
                .from('business_events_flat')
                .select('ai_response_id');

            const processedIds = (alreadyFlattened || []).map((r: any) => r.ai_response_id);

            if (processedIds.length > 0) {
                query = query.not('id', 'in', `(${processedIds.map(id => `'${id}'`).join(',')})`);
            }
        }

        if (limit && limit > 0) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch AI responses: ${error.message}`);
        }

        return data || [];
    }

    /**
     * Flatten a single AI response into individual business event records
     */
    private async flattenSingleResponse(response: any): Promise<BusinessEventFlatRecord[]> {
        const structuredOutput = response.structured_output;
        const article = response.articles;

        if (!structuredOutput?.business_events || !Array.isArray(structuredOutput.business_events)) {
            return [];
        }

        const flatRecords: BusinessEventFlatRecord[] = [];

        structuredOutput.business_events.forEach((event: any, index: number) => {
            const flatRecord: BusinessEventFlatRecord = {
                // Identity & Relationships
                business_events_ai_id: response.id,
                article_id: response.article_id,

                // Business Event Context
                event_index: index,

                // Business Event Details (matching database schema)
                event_type: event.event_type,
                trigger: event.trigger || null,
                entities: event.entities || null,
                scope: event.scope || null,
                orientation: event.orientation || null,
                time_horizon_days: event.time_horizon_days || null,
                tags: event.tags || null,
                quoted_people: event.quoted_people || null,
                event_description: event.event_description || null,

                // Business Event Assessments (from schema-business.json)
                intensity: event.intensity || null,
                certainty_truth: event.certainty_truth || null,
                certainty_impact: event.certainty_impact || null,
                hope_vs_fear: event.hope_vs_fear || null,
                surprise_vs_anticipated: event.surprise_vs_anticipated || null,
                consensus_vs_division: event.consensus_vs_division || null,
                positive_vs_negative_sentiment: event.positive_vs_negative_sentiment || null,

                // Article Metadata (from AI analysis)
                article_headline: structuredOutput.article?.headline || article.title,
                article_source: structuredOutput.article?.source || article.source,
                article_published_at: structuredOutput.article?.published_at || article.published_at,
                article_publisher_credibility: structuredOutput.article?.publisher_credibility || null,
                article_author_credibility: structuredOutput.article?.author_credibility || null,
                article_source_credibility: structuredOutput.article?.source_credibility || null,
                article_audience_split: structuredOutput.article?.audience_split || null,
                article_time_lag_days: structuredOutput.article?.time_lag_days || null,
                article_market_regime: structuredOutput.article?.market_regime || null
            };

            flatRecords.push(flatRecord);
        });

        return flatRecords;
    }

    /**
     * Save flattened events to database
     */
    private async saveFlattenedEvents(events: BusinessEventFlatRecord[]): Promise<void> {
        if (events.length === 0) return;

        const { error } = await this.supabase
            .from('business_events_flat')
            .insert(events);

        if (error) {
            throw new Error(`Failed to save flattened events: ${error.message}`);
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
        const flattener = new BusinessEventsFlattener();
        await flattener.flattenBusinessEvents(limit, force);

        console.log('🎉 Business events flattening completed successfully!');

    } catch (error: any) {
        console.error('❌ Flattening failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { BusinessEventsFlattener };
