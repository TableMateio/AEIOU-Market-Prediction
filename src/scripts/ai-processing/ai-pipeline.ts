#!/usr/bin/env npx tsx

/**
 * Universal AI Processing Pipeline
 * 
 * Usage:
 * npx tsx ai-pipeline.ts --stage=business --direct --limit=1 --save
 * npx tsx ai-pipeline.ts --stage=causal --batch --limit=100 --save
 * 
 * Stages:
 * --stage=business: Process articles → business events (default)
 * --stage=causal: Process business events → causal chains
 * 
 * Modes:
 * --direct: Direct OpenAI calls (immediate results)
 * --batch: OpenAI Batch API (bulk processing)
 * 
 * Flags:
 * --limit=N: Process N items (0 = all unprocessed)
 * --save: Save results to database (default: true)
 * --force: Process even if already processed
 */

import OpenAI from 'openai';
import 'dotenv/config'; // Load environment variables first
import fs from 'fs';
import path from 'path';
import { config } from '../../config/app';
import { AppConfig } from '../../config/app';
import { createLogger } from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';

const logger = createLogger('AIPipeline');

interface PipelineOptions {
    stage: 'business' | 'causal';
    mode: 'direct' | 'batch';
    limit: number;
    save: boolean;
    force: boolean;
    offset?: number;
}

class AIPipeline {
    private openai: OpenAI;
    private supabase: any;
    private instructions: string;
    private schema: any;
    private stage: 'business' | 'causal';

    constructor(stage: 'business' | 'causal' = 'business') {
        this.stage = stage;
        // Initialize OpenAI
        if (!config.openaiApiKey) {
            throw new Error('❌ OpenAI API key required');
        }
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });

        // Initialize Supabase with direct env vars to avoid AppConfig validation
        const projectUrl = process.env.SUPABASE_PROJECT_URL;
        const apiKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

        logger.info(`🔧 Supabase connection - URL: ${projectUrl ? 'Set' : 'Missing'}, Key: ${apiKey ? 'Set' : 'Missing'}`);

        if (!projectUrl || !apiKey) {
            throw new Error('Missing required Supabase environment variables');
        }

        this.supabase = createClient(projectUrl, apiKey);

        // Load AI system files
        this.loadAISystemFiles();

        logger.info(`🎯 Pipeline initialized for ${stage} stage`);
    }

    private loadAISystemFiles() {
        const instructionsFile = this.stage === 'business' ? 'instructions-business.md' : 'instructions-causal.md';
        const schemaFile = this.stage === 'business' ? 'schema-business.json' : 'schema-causal.json';

        const instructionsPath = path.join(process.cwd(), 'src', 'ai', instructionsFile);
        const schemaPath = path.join(process.cwd(), 'src', 'ai', schemaFile);

        this.instructions = fs.readFileSync(instructionsPath, 'utf-8');
        this.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

        logger.info('✅ Loaded AI system files', {
            instructionsLength: this.instructions.length,
            schemaName: this.schema.name
        });
    }

    async run(options: PipelineOptions) {
        logger.info('🚀 Starting AI pipeline', options);

        // Get data to process based on stage
        const data = options.stage === 'business'
            ? await this.getArticles(options)
            : await this.getBusinessEvents(options.limit, !options.force);

        if (data.length === 0) {
            logger.info(`✅ No ${options.stage === 'business' ? 'articles' : 'business events'} to process`);
            return;
        }

        if (options.mode === 'direct') {
            await this.processDirectMode(data, options);
        } else {
            await this.processBatchMode(data, options);
        }
    }

    private async getArticles(options: PipelineOptions) {
        logger.info('🔍 Fetching articles...');

        let query = this.supabase
            .from('articles')
            .select('id, title, body, url, source, authors, published_at')
            .not('body', 'is', null);
        // Note: Length check removed - all articles in DB already have valid body content

        // Skip already processed articles unless force flag
        if (!options.force) {
            logger.info('📝 Filtering for pending articles only');
            query = query.eq('processing_status', 'pending');
        } else {
            logger.info('🔧 Force mode: processing all articles');
        }

        let finalQuery = query.order('published_at', { ascending: false });

        if (options.offset) {
            const endRange = options.offset + (options.limit || 1000000) - 1;
            finalQuery = finalQuery.range(options.offset, endRange);
        } else if (options.limit && options.limit < 1000000) {
            finalQuery = finalQuery.limit(options.limit);
        }

        // Execute the query

        const { data: articles, error } = await finalQuery;

        if (error) {
            logger.error('❌ Query error:', error);
            throw error;
        }

        logger.info(`📊 Found ${articles?.length || 0} articles to process`);

        if (articles && articles.length > 0) {
            logger.info(`📝 Sample article: ${articles[0].title?.substring(0, 50)}...`);
        } else {
            logger.warn('⚠️ No articles found - checking query conditions');
        }

        return articles || [];
    }

    private async getBusinessEvents(limit: number, skipProcessed: boolean) {
        logger.info('🔍 Fetching business events...');

        let query = this.supabase
            .from('business_events_flat')
            .select(`
                id,
                article_id,
                business_events_ai_id,
                event_index,
                event_type,
                event_description,
                trigger,
                entities,
                scope,
                orientation,
                time_horizon_days,
                tags,
                quoted_people,
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
                article_market_regime,
                articles!inner (
                    id,
                    title,
                    body,
                    url,
                    source,
                    authors,
                    published_at
                )
            `);

        // TODO: Add duplicate checking for causal_events_ai

        const { data: businessEvents, error } = await query
            .order('created_at', { ascending: false })
            .limit(limit || 1000000);

        if (error) throw error;

        logger.info(`📊 Found ${businessEvents?.length || 0} business events to process`);
        return businessEvents || [];
    }

    private async processDirectMode(articles: any[], options: PipelineOptions) {
        logger.info('⚡ Direct processing mode');

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            logger.info(`📝 Processing ${i + 1}/${articles.length}: ${article.title?.substring(0, 50)}...`);

            try {
                const startTime = Date.now();

                const completion = await this.openai.chat.completions.create({
                    model: "gpt-4.1-mini",
                    temperature: 0,
                    messages: [
                        {
                            role: "system",
                            content: this.instructions
                        },
                        {
                            role: "user",
                            content: this.createUserMessage(article)
                        }
                    ],
                    response_format: {
                        type: "json_schema",
                        json_schema: {
                            name: this.schema.name,
                            strict: true,
                            schema: this.schema.schema
                        }
                    }
                });

                const duration = Date.now() - startTime;
                const responseContent = completion.choices[0]?.message?.content;

                if (!responseContent) {
                    throw new Error('No response content received');
                }

                const parsedResponse = JSON.parse(responseContent);
                const tokensUsed = completion.usage?.total_tokens || 0;

                logger.info(`✅ Processed in ${duration}ms, ${tokensUsed} tokens`);
                logger.info(`📊 Events found: ${parsedResponse.business_events?.length || 0}`);

                if (options.save) {
                    const dataId = this.stage === 'business' ? article.id : article.id; // business event ID
                    await this.saveResult(dataId, responseContent, parsedResponse, tokensUsed, duration, this.stage === 'causal' ? article : undefined);
                    logger.info('💾 Saved to database');
                }

            } catch (error: any) {
                logger.error(`❌ Failed processing ${article.id}:`, error.message);
            }
        }
    }

    private async processBatchMode(articles: any[], options: PipelineOptions) {
        logger.info('📦 Batch processing mode');

        // Create JSONL content
        const jsonlLines = articles.map(article => this.createJSONLLine(article));
        const jsonlContent = jsonlLines.map(line => JSON.stringify(line)).join('\n');

        const outputFile = `batch_${Date.now()}.jsonl`;
        fs.writeFileSync(outputFile, jsonlContent);

        logger.info('✅ JSONL generated', {
            file: outputFile,
            articles: jsonlLines.length,
            estimatedTokens: Math.ceil(jsonlContent.length / 4)
        });

        // Submit to OpenAI Batch API
        const file = await this.openai.files.create({
            file: fs.createReadStream(outputFile),
            purpose: 'batch'
        });

        const batch = await this.openai.batches.create({
            input_file_id: file.id,
            endpoint: '/v1/chat/completions',
            completion_window: '24h'
        });

        logger.info('🚀 Batch submitted', {
            batchId: batch.id,
            status: batch.status,
            inputFileId: file.id
        });

        if (options.save) {
            logger.info('📋 To save results when complete:');
            logger.info(`npx tsx ai-pipeline.ts --save-batch=${batch.id}`);
        }

        // Clean up JSONL file
        fs.unlinkSync(outputFile);
    }

    private createUserMessage(data: any) {
        if (this.stage === 'business') {
            return this.createBusinessUserMessage(data);
        } else {
            return this.createCausalUserMessage(data);
        }
    }

    private createBusinessUserMessage(article: any) {
        const authors = Array.isArray(article.authors) ? article.authors.join(', ') : (article.authors || 'Unknown');
        const publishedAt = new Date(article.published_at).toISOString();
        const cleanBody = article.body?.substring(0, 4000) || '';

        return `Please analyze this Apple-related article and extract business events:

ARTICLE CONTENT:
=================
Title: ${article.title}
Source: ${article.source}
Published: ${publishedAt}
Authors: ${authors}
URL: ${article.url}

Body:
${cleanBody}
=================

Please provide structured analysis according to the schema.`;
    }

    private createCausalUserMessage(businessEvent: any) {
        const article = businessEvent.articles;
        const authors = Array.isArray(article.authors) ? article.authors.join(', ') : (article.authors || 'Unknown');
        const publishedAt = new Date(article.published_at).toISOString();
        const cleanBody = article.body?.substring(0, 3000) || '';

        return `Please analyze this specific business event and create a detailed causal chain:

BUSINESS EVENT TO ANALYZE:
==========================
Event Type: ${businessEvent.event_type}
Description: ${businessEvent.event_description}
Scope: ${businessEvent.scope}
Orientation: ${businessEvent.orientation}
Time Horizon: ${businessEvent.time_horizon_days} days
Entities: ${JSON.stringify(businessEvent.entities)}
Tags: ${JSON.stringify(businessEvent.tags)}

ORIGINAL ARTICLE CONTEXT:
=========================
Title: ${article.title}
Source: ${article.source}
Authors: ${authors}
Published: ${publishedAt}
URL: ${article.url}

FULL ARTICLE TEXT:
${cleanBody}

Please create a causal chain ONLY for the specified business event above. Focus on how this specific event leads to measurable business impacts for Apple.`;
    }

    private createJSONLLine(data: any) {
        const customId = this.stage === 'business' ? `art_${data.id}` : `bev_${data.id}`;
        return {
            custom_id: customId,
            method: "POST",
            url: "/v1/chat/completions",
            body: {
                model: "gpt-4.1-mini",
                temperature: 0,
                messages: [
                    {
                        role: "system",
                        content: this.instructions
                    },
                    {
                        role: "user",
                        content: this.createUserMessage(data)
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: this.schema.name,
                        strict: true,
                        schema: this.schema.schema
                    }
                }
            }
        };
    }

    private async saveResult(dataId: string, rawResponse: string, structuredOutput: any, tokensUsed: number, processingTime: number, businessEvent?: any) {
        if (this.stage === 'business') {
            await this.saveBusinessResult(dataId, rawResponse, structuredOutput, tokensUsed, processingTime);
        } else {
            await this.saveCausalResult(dataId, rawResponse, structuredOutput, tokensUsed, processingTime, businessEvent);
        }
    }

    private async saveBusinessResult(articleId: string, rawResponse: string, structuredOutput: any, tokensUsed: number, processingTime: number) {
        const { error } = await this.supabase
            .from('business_events_ai')
            .insert({
                article_id: articleId,
                agent_id: 'gpt-4.1-mini',
                analysis_type: 'business_events_extraction',
                raw_response: rawResponse,
                structured_output: structuredOutput,
                processing_time_ms: processingTime,
                tokens_used: tokensUsed,
                success: true
            });

        if (error) {
            throw new Error(`Database save failed: ${error.message}`);
        }
    }

    private async saveCausalResult(businessEventId: string, rawResponse: string, structuredOutput: any, tokensUsed: number, processingTime: number, businessEvent: any) {
        const { error } = await this.supabase
            .from('causal_events_ai')
            .insert({
                business_event_flat_id: businessEventId,
                business_events_ai_id: businessEvent.business_events_ai_id,
                article_id: businessEvent.article_id,
                agent_id: 'gpt-4.1-mini',
                analysis_type: 'causal_chain_extraction',
                raw_response: rawResponse,
                structured_output: structuredOutput,
                processing_time_ms: processingTime,
                tokens_used: tokensUsed,
                success: true
            });

        if (error) {
            throw new Error(`Database save failed: ${error.message}`);
        }
    }
}

// Check batch status
async function checkBatchStatus(batchId: string) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        const batch = await openai.batches.retrieve(batchId);
        logger.info(`📊 Batch Status: ${batch.status}`);
        logger.info(`📈 Progress: ${batch.request_counts?.completed || 0}/${batch.request_counts?.total || 0} completed`);

        if (batch.status === 'completed') {
            logger.info('✅ Batch completed! Run with --save-batch to save results');
        } else if (batch.status === 'failed') {
            logger.error('❌ Batch failed');
        } else {
            logger.info('⏳ Batch still processing...');
        }
    } catch (error) {
        logger.error('❌ Failed to check batch status:', error);
    }
}

// Cancel batch
async function cancelBatch(batchId: string) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        const batch = await openai.batches.cancel(batchId);
        logger.info(`🚫 Batch cancellation initiated: ${batch.status}`);
        logger.info(`📊 Progress when cancelled: ${batch.request_counts?.completed || 0}/${batch.request_counts?.total || 0} completed`);
    } catch (error) {
        logger.error('❌ Failed to cancel batch:', error);
    }
}

// Save batch results
async function saveBatchResults(batchId: string, stage: 'business' | 'causal') {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        const batch = await openai.batches.retrieve(batchId);

        if (batch.status !== 'completed') {
            logger.error(`❌ Batch not completed yet. Status: ${batch.status}`);
            return;
        }

        if (!batch.output_file_id) {
            logger.error('❌ No output file available');
            return;
        }

        // Download results
        const outputFile = await openai.files.content(batch.output_file_id);
        const outputText = await outputFile.text();

        logger.info(`📥 Downloaded batch results: ${outputText.split('\n').length - 1} responses`);

        // Parse and save each result
        const pipeline = new AIPipeline(stage);
        let savedCount = 0;
        let errorCount = 0;

        for (const line of outputText.split('\n')) {
            if (!line.trim()) continue;

            try {
                const result = JSON.parse(line);

                if (result.response?.body?.choices?.[0]?.message?.content) {
                    const content = result.response.body.choices[0].message.content;
                    const tokensUsed = result.response.body.usage?.total_tokens || 0;

                    // Extract article/business event ID from custom_id (art_123 or bev_123)
                    const customId = result.custom_id;
                    const id = customId.split('_')[1];

                    if (stage === 'business') {
                        await pipeline.saveBusinessResult(id, content, JSON.parse(content), tokensUsed, 0);
                    } else {
                        // For causal stage, fetch the business event data
                        const { data: businessEvent } = await pipeline.supabase
                            .from('business_events_flat')
                            .select('article_id, business_events_ai_id')
                            .eq('id', id)
                            .single();

                        if (businessEvent) {
                            await pipeline.saveCausalResult(id, content, JSON.parse(content), tokensUsed, 0, businessEvent);
                        } else {
                            logger.error(`❌ Business event not found for ID: ${id}`);
                            errorCount++;
                            continue;
                        }
                    }

                    savedCount++;
                } else {
                    errorCount++;
                    logger.error(`❌ Invalid response format for ${result.custom_id}`);
                }
            } catch (parseError) {
                errorCount++;
                logger.error('❌ Failed to parse result:', parseError);
            }
        }

        logger.info(`✅ Batch processing complete: ${savedCount} saved, ${errorCount} errors`);

    } catch (error) {
        logger.error('❌ Failed to save batch results:', error);
    }
}

// Parse command line arguments
function parseArgs(): PipelineOptions & { saveBatch?: string, checkBatch?: string, cancelBatch?: string } {
    const args = process.argv.slice(2);

    const options: PipelineOptions & { saveBatch?: string, checkBatch?: string, cancelBatch?: string } = {
        stage: 'business', // default
        mode: 'direct', // default
        limit: 1, // default
        save: true, // default - save to database
        force: false
    };

    for (const arg of args) {
        if (arg.startsWith('--stage=')) options.stage = arg.split('=')[1] as 'business' | 'causal';
        if (arg === '--direct') options.mode = 'direct';
        if (arg === '--batch') options.mode = 'batch';
        if (arg.startsWith('--limit=')) {
            const limitValue = parseInt(arg.split('=')[1]);
            options.limit = limitValue === 0 ? 1000000 : limitValue; // 0 means all
        }
        if (arg.startsWith('--offset=')) options.offset = parseInt(arg.split('=')[1]);
        if (arg === '--save') options.save = true;
        if (arg === '--force') options.force = true;
        if (arg.startsWith('--save-batch=')) options.saveBatch = arg.split('=')[1];
        if (arg.startsWith('--check-batch=')) options.checkBatch = arg.split('=')[1];
        if (arg.startsWith('--cancel-batch=')) options.cancelBatch = arg.split('=')[1];
    }

    return options;
}

// Main execution
async function main() {
    try {
        const options = parseArgs();

        if (options.checkBatch) {
            await checkBatchStatus(options.checkBatch);
            return;
        }

        if (options.cancelBatch) {
            await cancelBatch(options.cancelBatch);
            return;
        }

        if (options.saveBatch) {
            await saveBatchResults(options.saveBatch, options.stage || 'business');
            return;
        }

        const pipeline = new AIPipeline(options.stage);
        await pipeline.run(options);

        logger.info('🎉 Pipeline complete!');
    } catch (error: any) {
        logger.error('❌ Pipeline failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
