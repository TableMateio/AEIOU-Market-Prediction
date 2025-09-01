#!/usr/bin/env tsx

/**
 * Batch Process Articles with Updated AI System
 * 
 * Processes multiple articles systematically, with error handling and progress tracking
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig, config } from '../config/app';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('BatchProcessor');
const appConfig = AppConfig.getInstance();

async function processArticlesBatch() {
    logger.info('🚀 Starting batch article processing with updated AI system');

    // Check API keys
    const openaiKey = config.openaiApiKey;
    if (!openaiKey) {
        logger.error('❌ Missing OpenAI API key');
        return;
    }

    // Initialize OpenAI with structured output
    const openai = new OpenAI({ apiKey: openaiKey });

    // Load the schema and instructions
    const schemaPath = path.join(process.cwd(), 'src', 'ai', 'schema.json');
    const instructionsPath = path.join(process.cwd(), 'src', 'ai', 'instructions.md');

    if (!fs.existsSync(schemaPath) || !fs.existsSync(instructionsPath)) {
        logger.error('❌ Missing schema.json or instructions.md files');
        return;
    }

    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const instructions = fs.readFileSync(instructionsPath, 'utf-8');

    logger.info('✅ Loaded AI system files');

    // Get articles ready for processing
    const supabase = createClient(
        appConfig.supabaseConfig.projectUrl,
        appConfig.supabaseConfig.apiKey
    );

    // Get articles that DON'T have AI responses yet
    const { data: articles, error } = await supabase
        .from('articles')
        .select(`
            id, title, body, url, source, authors, published_at, data_source,
            ai_responses!left(id)
        `)
        .not('body', 'is', null)
        .is('ai_responses.id', null)
        .order('published_at', { ascending: false })
        .limit(15);

    if (error) {
        logger.error('❌ Error fetching articles:', error);
        return;
    }

    if (!articles || articles.length === 0) {
        logger.info('✅ No articles ready for processing');
        return;
    }

    logger.info(`📊 Found ${articles.length} articles ready for processing`);

    let processed = 0;
    let errors = 0;

    for (const article of articles) {
        // Skip if body is too short
        if (!article.body || article.body.trim().length < 50) {
            logger.warn(`⏭️ Skipping article with insufficient body: ${article.title}`);
            continue;
        }

        logger.info(`\n📰 Processing: ${article.title.substring(0, 60)}...`);
        logger.info(`🏢 Source: ${article.source} | Data Source: ${article.data_source}`);

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

            // Save to database
            const { data: aiResponse, error: saveError } = await supabase
                .from('ai_responses')
                .insert({
                    article_id: article.id,
                    structured_output: analysis,
                    success: true,
                    tokens_used: completion.usage?.total_tokens || 0,
                    processing_time_ms: Date.now() // Simplified timestamp
                })
                .select()
                .single();

            if (saveError) {
                logger.error(`❌ Error saving analysis for ${article.title}:`, saveError);
                errors++;
                continue;
            }

            const eventCount = analysis.business_events?.length || 0;
            const totalSteps = analysis.business_events?.reduce((sum: number, event: any) =>
                sum + (event.causal_chain?.length || 0), 0) || 0;

            logger.info(`✅ Saved! Events: ${eventCount}, Steps: ${totalSteps}, Tokens: ${completion.usage?.total_tokens}`);
            processed++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
            logger.error(`❌ Error processing ${article.title}:`, error.message);
            errors++;
            continue;
        }
    }

    logger.info(`\n📊 BATCH PROCESSING COMPLETE`);
    logger.info(`✅ Successfully processed: ${processed} articles`);
    logger.info(`❌ Errors: ${errors} articles`);
    logger.info(`📈 Success rate: ${Math.round(100 * processed / (processed + errors))}%`);

    // Show updated counts
    const { data: totalCounts } = await supabase
        .from('ai_responses')
        .select('id', { count: 'exact' });

    logger.info(`💾 Total AI responses in database: ${totalCounts?.length || 0}`);
}

if (require.main === module) {
    processArticlesBatch().catch(console.error);
}
