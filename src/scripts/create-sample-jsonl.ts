#!/usr/bin/env npx tsx

/**
 * Create Sample JSONL File for Manual Review
 * 
 * Creates a small JSONL file with 2 articles so you can manually inspect:
 * - JSONL format correctness
 * - Instructions.md content
 * - Schema.json structure  
 * - Article metadata mapping
 * - Request structure
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('SampleJSONL');

async function createSampleJSONL() {
    logger.info('🔍 Creating Sample JSONL for Manual Review...');

    // Initialize Supabase
    const appConfig = AppConfig.getInstance();
    const supabase = createClient(
        appConfig.supabaseConfig.projectUrl,
        appConfig.supabaseConfig.apiKey
    );

    // Load AI system files
    const instructionsPath = path.join(process.cwd(), 'src', 'ai', 'instructions.md');
    const schemaPath = path.join(process.cwd(), 'src', 'ai', 'schema.json');

    if (!fs.existsSync(instructionsPath) || !fs.existsSync(schemaPath)) {
        throw new Error('❌ Missing instructions.md or schema.json files');
    }

    const instructions = fs.readFileSync(instructionsPath, 'utf-8');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

    logger.info('✅ Loaded AI system files', {
        instructionsLength: instructions.length,
        schemaName: schema.name
    });

    // Get 2 articles with good content
    const { data: articles, error } = await supabase
        .from('articles')
        .select('id, title, body, url, source, authors, published_at, data_source')
        .not('body', 'is', null)
        .gte('body', 'length', 500) // At least 500 characters
        .order('published_at', { ascending: false })
        .limit(2);

    if (error || !articles || articles.length === 0) {
        throw new Error('❌ Could not fetch sample articles');
    }

    logger.info(`📊 Found ${articles.length} sample articles`);

    // Create JSONL lines
    const jsonlLines: string[] = [];

    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];

        // Clean and prepare article data
        const authors = normalizeAuthors(article.authors);
        const publishedAt = new Date(article.published_at).toISOString();
        const cleanBody = cleanArticleBody(article.body);

        // Create user message (exact format from current pipeline)
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

        // Create JSONL line
        const jsonlLine = {
            custom_id: `sample_art_${i + 1}`,
            method: "POST",
            url: "/v1/chat/completions",
            body: {
                model: "gpt-4o-2024-08-06",
                temperature: 0,
                messages: [
                    {
                        role: "system",
                        content: instructions // Full instructions.md
                    },
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: schema.name,
                        strict: true,
                        schema: schema.schema // Full schema.json
                    }
                }
            }
        };

        jsonlLines.push(JSON.stringify(jsonlLine));

        // Log article details for review
        logger.info(`📰 Article ${i + 1} Details:`, {
            id: article.id,
            title: article.title.substring(0, 60) + '...',
            source: article.source,
            published: publishedAt,
            bodyLength: cleanBody.length,
            authors: authors.length
        });
    }

    // Write JSONL file
    const outputPath = path.join(process.cwd(), 'sample_batch.jsonl');
    fs.writeFileSync(outputPath, jsonlLines.join('\n') + '\n');

    // Write human-readable breakdown
    const breakdown = {
        summary: {
            totalArticles: articles.length,
            totalLines: jsonlLines.length,
            estimatedTokens: Math.ceil(JSON.stringify(jsonlLines).length / 4),
            outputFile: 'sample_batch.jsonl'
        },
        aiSystemFiles: {
            instructionsPath: 'src/ai/instructions.md',
            instructionsLength: instructions.length,
            schemaPath: 'src/ai/schema.json',
            schemaName: schema.name,
            schemaStrict: true
        },
        articles: articles.map((article, i) => ({
            lineNumber: i + 1,
            customId: `sample_art_${i + 1}`,
            articleId: article.id,
            title: article.title,
            source: article.source,
            published: new Date(article.published_at).toISOString(),
            bodyLength: article.body?.length || 0,
            authors: normalizeAuthors(article.authors),
            dataSource: article.data_source
        })),
        requestStructure: {
            model: "gpt-4o-2024-08-06",
            temperature: 0,
            systemMessage: "Full instructions.md content (40,681 chars)",
            userMessage: "Article content with metadata",
            responseFormat: "Structured JSON with strict schema validation",
            schemaName: schema.name
        }
    };

    const breakdownPath = path.join(process.cwd(), 'sample_batch_breakdown.json');
    fs.writeFileSync(breakdownPath, JSON.stringify(breakdown, null, 2));

    logger.info('✅ Sample JSONL created successfully!', {
        jsonlFile: outputPath,
        breakdownFile: breakdownPath,
        totalLines: jsonlLines.length
    });

    // Create a pretty-printed first line for easy inspection
    const firstLineFormatted = JSON.stringify(JSON.parse(jsonlLines[0]), null, 2);
    const formattedPath = path.join(process.cwd(), 'sample_first_line_formatted.json');
    fs.writeFileSync(formattedPath, firstLineFormatted);

    console.log('\n🎉 SAMPLE JSONL CREATED!');
    console.log('📁 Files created:');
    console.log(`   📄 ${outputPath} - Raw JSONL file`);
    console.log(`   📋 ${breakdownPath} - Human-readable breakdown`);
    console.log(`   🎨 ${formattedPath} - First line formatted for inspection`);
    console.log('');
    console.log('🔍 REVIEW CHECKLIST:');
    console.log('   ✅ Check JSONL format in sample_batch.jsonl');
    console.log('   ✅ Review instructions content in formatted file');
    console.log('   ✅ Verify schema structure and strict mode');
    console.log('   ✅ Confirm article metadata mapping');
    console.log('   ✅ Validate request structure matches OpenAI requirements');

    return {
        jsonlFile: outputPath,
        breakdownFile: breakdownPath,
        formattedFile: formattedPath,
        articlesProcessed: articles.length
    };
}

function normalizeAuthors(authors: any): string[] {
    if (!authors) return [];
    if (Array.isArray(authors)) return authors.filter(Boolean);
    if (typeof authors === 'string') {
        return authors.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
    }
    return [];
}

function cleanArticleBody(body: string): string {
    if (!body) return '';

    // Basic cleaning - remove excessive whitespace
    let cleaned = body
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double
        .trim();

    // Truncate if extremely long (show first part for review)
    const maxLength = 2000; // Shorter for manual review
    if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength) + '\n\n[CONTENT TRUNCATED FOR SAMPLE - FULL VERSION WILL BE USED IN PRODUCTION]';
    }

    return cleaned;
}

// Run the script
createSampleJSONL().catch(error => {
    console.error('❌ Error creating sample JSONL:', error.message);
    process.exit(1);
});
