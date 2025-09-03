#!/usr/bin/env npx tsx

/**
 * Universal AI Processing Pipeline
 * 
 * Usage:
 * npx tsx ai-pipeline.ts --direct --limit=1 --save
 * npx tsx ai-pipeline.ts --batch --limit=100 --save
 * npx tsx ai-pipeline.ts --direct --limit=0 --save (process all)
 * 
 * Modes:
 * --direct: Direct OpenAI calls (immediate results)
 * --batch: OpenAI Batch API (bulk processing)
 * 
 * Flags:
 * --limit=N: Process N articles (0 = all unprocessed)
 * --save: Save results to database
 * --force: Process even if already processed
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/app';
import { AppConfig } from '../../config/app';
import { createLogger } from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';

const logger = createLogger('AIPipeline');

interface PipelineOptions {
    mode: 'direct' | 'batch';
    limit: number;
    save: boolean;
    force: boolean;
}

class AIPipeline {
    private openai: OpenAI;
    private supabase: any;
    private instructions: string;
    private schema: any;

    constructor() {
        // Initialize OpenAI
        if (!config.openaiApiKey) {
            throw new Error('❌ OpenAI API key required');
        }
        this.openai = new OpenAI({ apiKey: config.openaiApiKey });

        // Initialize Supabase
        const appConfig = AppConfig.getInstance();
        this.supabase = createClient(
            appConfig.supabaseConfig.projectUrl,
            appConfig.supabaseConfig.apiKey
        );

        // Load AI system files
        this.loadAISystemFiles();
    }

    private loadAISystemFiles() {
        const instructionsPath = path.join(process.cwd(), 'src', 'ai', 'instructions-business.md');
        const schemaPath = path.join(process.cwd(), 'src', 'ai', 'schema-business.json');

        this.instructions = fs.readFileSync(instructionsPath, 'utf-8');
        this.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

        logger.info('✅ Loaded AI system files', {
            instructionsLength: this.instructions.length,
            schemaName: this.schema.name
        });
    }

    async run(options: PipelineOptions) {
        logger.info('🚀 Starting AI pipeline', options);

        // Get articles to process
        const articles = await this.getArticles(options.limit, !options.force);

        if (articles.length === 0) {
            logger.info('✅ No articles to process');
            return;
        }

        if (options.mode === 'direct') {
            await this.processDirectMode(articles, options);
        } else {
            await this.processBatchMode(articles, options);
        }
    }

    private async getArticles(limit: number, skipProcessed: boolean) {
        logger.info('🔍 Fetching articles...');

        let query = this.supabase
            .from('articles')
            .select('id, title, body, url, source, authors, published_at')
            .not('body', 'is', null)
            .gte('body', 'length', 100);

        // TODO: Add duplicate checking logic later

        const { data: articles, error } = await query
            .order('published_at', { ascending: false })
            .limit(limit || 1000000); // If limit=0, get everything

        if (error) throw error;

        logger.info(`📊 Found ${articles?.length || 0} articles to process`);
        return articles || [];
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
                    await this.saveResult(article.id, responseContent, parsedResponse, tokensUsed, duration);
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

    private createUserMessage(article: any) {
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

    private createJSONLLine(article: any) {
        return {
            custom_id: `art_${article.id}`,
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
            }
        };
    }

    private async saveResult(articleId: string, rawResponse: string, structuredOutput: any, tokensUsed: number, processingTime: number) {
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
}

// Parse command line arguments
function parseArgs(): PipelineOptions & { saveBatch?: string } {
    const args = process.argv.slice(2);

    const options: PipelineOptions & { saveBatch?: string } = {
        mode: 'direct', // default
        limit: 1, // default
        save: true, // default - save to database
        force: false
    };

    for (const arg of args) {
        if (arg === '--direct') options.mode = 'direct';
        if (arg === '--batch') options.mode = 'batch';
        if (arg.startsWith('--limit=')) {
            const limitValue = parseInt(arg.split('=')[1]);
            options.limit = limitValue === 0 ? 1000000 : limitValue; // 0 means all
        }
        if (arg === '--save') options.save = true;
        if (arg === '--force') options.force = true;
        if (arg.startsWith('--save-batch=')) options.saveBatch = arg.split('=')[1];
    }

    return options;
}

// Main execution
async function main() {
    try {
        const options = parseArgs();

        if (options.saveBatch) {
            logger.info('💾 Batch result saving not implemented yet');
            return;
        }

        const pipeline = new AIPipeline();
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
