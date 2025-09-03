#!/usr/bin/env npx tsx

/**
 * Generate JSONL file for OpenAI Batch API
 * 
 * Converts articles from Supabase into JSONL format for bulk AI processing
 * Uses existing instructions.md and schema.json from src/ai/
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../../config/app';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BatchJSONL');

interface BatchGenerationOptions {
    limit?: number;
    outputFile?: string;
    skipProcessed?: boolean;
    testMode?: boolean;
}

class BatchJSONLGenerator {
    private supabase: any;
    private instructions: string;
    private schema: any;

    constructor() {
        const appConfig = AppConfig.getInstance();
        this.supabase = createClient(
            appConfig.supabaseConfig.projectUrl,
            appConfig.supabaseConfig.apiKey
        );

        // Load AI system files
        const instructionsPath = path.join(process.cwd(), 'src', 'ai', 'instructions.md');
        const schemaPath = path.join(process.cwd(), 'src', 'ai', 'schema.json');

        if (!fs.existsSync(instructionsPath) || !fs.existsSync(schemaPath)) {
            throw new Error('❌ Missing instructions.md or schema.json files');
        }

        this.instructions = fs.readFileSync(instructionsPath, 'utf-8');
        this.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

        logger.info('✅ Loaded AI system files', {
            instructionsLength: this.instructions.length,
            schemaName: this.schema.name
        });
    }

    /**
     * Generate JSONL file for batch processing
     */
    async generateBatchFile(options: BatchGenerationOptions = {}) {
        const {
            limit = 1000,
            outputFile = 'batch_articles.jsonl',
            skipProcessed = true,
            testMode = false
        } = options;

        logger.info('🚀 Starting JSONL generation', {
            limit,
            outputFile,
            skipProcessed,
            testMode
        });

        // Get articles that need processing
        const articles = await this.getArticlesForProcessing(limit, skipProcessed);

        if (articles.length === 0) {
            logger.warn('⚠️ No articles found for processing');
            return;
        }

        logger.info(`📊 Processing ${articles.length} articles`);

        // Generate JSONL content
        const jsonlLines: string[] = [];
        let tokenEstimate = 0;
        let skippedCount = 0;

        for (const article of articles) {
            try {
                const jsonlLine = this.createJSONLLine(article);

                // Estimate tokens (rough: 1 token ≈ 4 characters)
                const lineTokens = Math.ceil(JSON.stringify(jsonlLine).length / 4);

                // Skip extremely long articles to avoid token limits
                if (lineTokens > 120000) { // ~120k tokens (model limit is ~128k)
                    logger.warn(`⏭️ Skipping oversized article: ${article.title.substring(0, 50)}... (${lineTokens} tokens)`);
                    skippedCount++;
                    continue;
                }

                jsonlLines.push(JSON.stringify(jsonlLine));
                tokenEstimate += lineTokens;

                if (testMode && jsonlLines.length >= 3) {
                    logger.info('🧪 Test mode: stopping at 3 articles');
                    break;
                }

            } catch (error: any) {
                logger.error(`❌ Error processing article ${article.id}:`, error.message);
                skippedCount++;
            }
        }

        // Write JSONL file
        const outputPath = path.join(process.cwd(), outputFile);
        fs.writeFileSync(outputPath, jsonlLines.join('\n') + '\n');

        logger.info('✅ JSONL file generated successfully', {
            outputPath,
            totalLines: jsonlLines.length,
            skippedArticles: skippedCount,
            estimatedTokens: tokenEstimate,
            fileSizeMB: Math.round(fs.statSync(outputPath).size / 1024 / 1024 * 100) / 100
        });

        // Show sample line for verification
        if (jsonlLines.length > 0) {
            const sampleLine = JSON.parse(jsonlLines[0]);
            logger.info('📋 Sample JSONL line structure:', {
                custom_id: sampleLine.custom_id,
                method: sampleLine.method,
                model: sampleLine.body.model,
                temperature: sampleLine.body.temperature,
                systemMessageLength: sampleLine.body.messages[0].content.length,
                userMessageLength: sampleLine.body.messages[1].content.length,
                hasSchema: !!sampleLine.body.response_format?.json_schema
            });
        }

        return {
            outputPath,
            totalLines: jsonlLines.length,
            skippedArticles: skippedCount,
            estimatedTokens: tokenEstimate
        };
    }

    /**
     * Get articles that need AI processing
     */
    private async getArticlesForProcessing(limit: number, skipProcessed: boolean) {
        logger.info('🔍 Fetching articles for processing...');

        let query = this.supabase
            .from('articles')
            .select(`
                id, title, body, url, source, authors, published_at, data_source,
                ${skipProcessed ? 'ai_responses!left(id)' : ''}
            `)
            .not('body', 'is', null) // Must have content
            .gte('body', 'length', 100); // At least 100 characters

        if (skipProcessed) {
            query = query.is('ai_responses.id', null); // No existing AI responses
        }

        const { data: articles, error } = await query
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) {
            logger.error('❌ Error fetching articles:', error);
            throw error;
        }

        logger.info(`📊 Found ${articles?.length || 0} articles for processing`);
        return articles || [];
    }

    /**
     * Create a single JSONL line for an article
     */
    private createJSONLLine(article: any) {
        // Clean and prepare article data
        const authors = this.normalizeAuthors(article.authors);
        const publishedAt = new Date(article.published_at).toISOString();
        const cleanBody = this.cleanArticleBody(article.body);

        // Create user message content (matches current pipeline format)
        const userMessage = `Please analyze this Apple-related article and extract business events with causal chains:

ARTICLE CONTENT:
=================
Title: ${article.title}
Source: ${article.source}
Published: ${publishedAt}
Authors: ${authors.join(', ') || 'Unknown'}
URL: ${article.url}

Body:
${cleanBody}
=================

Please provide structured analysis according to the schema.`;

        // Create JSONL line following OpenAI Batch API format
        return {
            custom_id: `art_${article.id}`,
            method: "POST",
            url: "/v1/chat/completions",
            body: {
                model: "gpt-4o-2024-08-06", // Same model as current pipeline
                temperature: 0, // Deterministic for batch processing
                messages: [
                    {
                        role: "system",
                        content: this.instructions // Full instructions.md content
                    },
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: this.schema.name,
                        strict: true,
                        schema: this.schema.schema // Full schema.json content
                    }
                }
            }
        };
    }

    /**
     * Normalize authors array
     */
    private normalizeAuthors(authors: any): string[] {
        if (!authors) return [];
        if (Array.isArray(authors)) return authors.filter(Boolean);
        if (typeof authors === 'string') {
            return authors.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
        }
        return [];
    }

    /**
     * Clean article body for processing
     */
    private cleanArticleBody(body: string): string {
        if (!body) return '';

        // Basic cleaning - remove excessive whitespace
        let cleaned = body
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
            .trim();

        // Truncate if extremely long (keep within token budget)
        const maxLength = 400000; // ~100k tokens worth of characters
        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength) + '\n\n[CONTENT TRUNCATED FOR LENGTH]';
            logger.warn(`⚠️ Truncated long article body: ${cleaned.length} -> ${maxLength} chars`);
        }

        return cleaned;
    }
}

// CLI interface
async function main() {
    try {
        const args = process.argv.slice(2);
        const testMode = args.includes('--test');
        const limit = testMode ? 3 : parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '1000');
        const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'batch_articles.jsonl';

        logger.info('🎯 BATCH JSONL GENERATOR', {
            testMode,
            limit,
            outputFile
        });

        const generator = new BatchJSONLGenerator();
        const result = await generator.generateBatchFile({
            limit,
            outputFile,
            skipProcessed: true,
            testMode
        });

        if (result) {
            console.log('\\n🎉 GENERATION COMPLETE!');
            console.log(`📁 File: ${result.outputPath}`);
            console.log(`📊 Lines: ${result.totalLines}`);
            console.log(`⏭️ Skipped: ${result.skippedArticles}`);
            console.log(`🪙 Est. Tokens: ${result.estimatedTokens.toLocaleString()}`);
            console.log('');
            console.log('🚀 Next steps:');
            console.log('1. Review the generated JSONL file');
            console.log('2. Upload to OpenAI Files API');
            console.log('3. Create batch job');
            console.log('4. Process results when complete');
        }

    } catch (error: any) {
        logger.error('❌ Generation failed:', error.message);
        process.exit(1);
    }
}

// Export for use in other scripts
export { BatchJSONLGenerator };

// Run if called directly
if (require.main === module) {
    main();
}
