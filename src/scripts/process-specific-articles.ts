#!/usr/bin/env tsx

/**
 * Process Specific High-Value Articles
 * 
 * Processes targeted Apple articles with the updated AI system
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig, config } from '../config/app';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('SpecificProcessor');
const appConfig = AppConfig.getInstance();

// Specific high-value article IDs to process
const TARGET_ARTICLES = [
    'fde9618f-937e-4b00-b0b6-31c0d30662a8', // Apple Intelligence Review
    'b29667e8-c1b5-43ed-abf9-8faffa6402ec', // Apple Services Revenue Record
    '6f771d4f-292f-4b94-bf8e-3fdda610b762', // Apple Vision Pro Sales Disappoint
    '905630a7-7af2-4916-ae1b-213a65855872', // Apple Stock All-Time High
    '712a1d16-0784-4989-bb77-775096a29405', // Apple Intelligence Transform iPhone
    'c724317f-2265-429a-a5aa-f323da41c0f1', // Apple Takes On Spotify
    'dbbcb182-4b03-469d-b1d3-7b259e569493'  // Apple Stock Analyst Upgrades
];

async function processSpecificArticles() {
    logger.info('🚀 Processing specific high-value Apple articles');

    // Check API keys
    const openaiKey = config.openaiApiKey;
    if (!openaiKey) {
        logger.error('❌ Missing OpenAI API key');
        return;
    }

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: openaiKey });

    // Load AI system files
    const schemaPath = path.join(process.cwd(), 'src', 'ai', 'schema.json');
    const instructionsPath = path.join(process.cwd(), 'src', 'ai', 'instructions.md');

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const instructions = fs.readFileSync(instructionsPath, 'utf-8');

    logger.info('✅ Loaded AI system files');

    // Get articles
    const supabase = createClient(
        appConfig.supabaseConfig.projectUrl,
        appConfig.supabaseConfig.apiKey
    );

    const { data: articles, error } = await supabase
        .from('articles')
        .select('id, title, body, url, source, authors, published_at, data_source')
        .in('id', TARGET_ARTICLES)
        .not('body', 'is', null);

    if (error) {
        logger.error('❌ Error fetching articles:', error);
        return;
    }

    if (!articles || articles.length === 0) {
        logger.info('⚠️ No target articles found');
        return;
    }

    logger.info(`📊 Processing ${articles.length} high-value articles`);

    let processed = 0;
    let errors = 0;

    for (const article of articles) {
        if (!article.body || article.body.trim().length < 50) {
            logger.warn(`⏭️ Skipping insufficient body: ${article.title}`);
            continue;
        }

        logger.info(`\n🔥 PROCESSING: ${article.title.substring(0, 50)}...`);
        logger.info(`📊 Source: ${article.source} | Data: ${article.data_source} | Body: ${article.body.length} chars`);

        try {
            const completion = await openai.beta.chat.completions.parse({
                model: "gpt-4o-2024-08-06",
                messages: [
                    {
                        role: "system",
                        content: instructions
                    },
                    {
                        role: "user",
                        content: `Please analyze this Apple-related article and extract business events with causal chains:

ARTICLE CONTENT:
=================
Title: ${article.title}
Source: ${article.source}
Published: ${article.published_at}
Authors: ${Array.isArray(article.authors) ? article.authors.join(', ') : 'Unknown'}
URL: ${article.url}

Body:
${article.body}
=================

Please provide structured analysis according to the schema.`
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: schema
                },
                temperature: 0.1
            });

            const analysis = completion.choices[0].message.parsed;

            if (!analysis) {
                logger.error(`❌ No analysis returned for: ${article.title}`);
                errors++;
                continue;
            }

            // Save to database with conflict handling
            const { data: aiResponse, error: saveError } = await supabase
                .from('ai_responses')
                .upsert({
                    article_id: article.id,
                    structured_output: analysis,
                    success: true,
                    tokens_used: completion.usage?.total_tokens || 0,
                    processing_time_ms: Date.now(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'article_id'
                })
                .select()
                .single();

            if (saveError) {
                logger.error(`❌ Error saving analysis:`, saveError);
                errors++;
                continue;
            }

            const eventCount = analysis.business_events?.length || 0;
            const totalSteps = analysis.business_events?.reduce((sum: number, event: any) =>
                sum + (event.causal_chain?.length || 0), 0) || 0;

            logger.info(`✅ SUCCESS! Events: ${eventCount}, Steps: ${totalSteps}, Tokens: ${completion.usage?.total_tokens}`);
            processed++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error: any) {
            logger.error(`❌ Error processing ${article.title}:`, error.message);
            errors++;
            continue;
        }
    }

    logger.info(`\n🎉 PROCESSING COMPLETE`);
    logger.info(`✅ Successfully processed: ${processed} articles`);
    logger.info(`❌ Errors: ${errors} articles`);

    if (processed > 0) {
        logger.info(`📈 Success rate: ${Math.round(100 * processed / (processed + errors))}%`);

        // Show updated totals
        const { count } = await supabase
            .from('ai_responses')
            .select('id', { count: 'exact', head: true });

        logger.info(`💾 Total AI responses in database: ${count || 0}`);
        logger.info(`🎯 Ready for transformation to business_factors_flat table!`);
    }
}

if (require.main === module) {
    processSpecificArticles().catch(console.error);
}
