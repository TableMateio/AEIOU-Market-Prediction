#!/usr/bin/env npx tsx

/**
 * Add NewsAPI.ai Articles - Using Correct Schema
 * Based on analysis of existing working scripts
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import * as fs from 'fs/promises';
import * as path from 'path';

async function addNewsApiArticlesCorrect() {
    console.log('📤 Adding NewsAPI.ai Articles (Correct Schema)');
    console.log('='.repeat(50));

    const config = AppConfig.getInstance();
    const supabase = createClient(
        config.supabaseConfig.projectUrl,
        config.supabaseConfig.apiKey
    );

    try {
        // Read the collected articles
        const articlesPath = path.join(process.cwd(), 'data', 'articles_2025-09-02.json');
        const articlesData = await fs.readFile(articlesPath, 'utf-8');
        const articles = JSON.parse(articlesData);

        console.log(`📄 Loaded ${articles.length} articles from file`);

        // Transform to match your ACTUAL working schema (based on existing scripts)
        const transformedArticles = articles.map((article: any) => {
            // Generate external_id like other sources
            const external_id = `newsapi_ai_${Buffer.from(article.url).toString('base64').substring(0, 16)}`;

            // Calculate Apple relevance score (like gnews scripts)
            let apple_relevance_score = 0.7;
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            if (title.includes('apple') || body.includes('apple inc')) apple_relevance_score += 0.15;
            if (title.includes('aapl')) apple_relevance_score += 0.1;
            if (title.includes('earnings') || title.includes('revenue')) apple_relevance_score += 0.1;
            if (title.includes('iphone') || title.includes('product')) apple_relevance_score += 0.05;
            apple_relevance_score = Math.min(apple_relevance_score, 1.0);

            return {
                external_id,
                external_id_type: 'newsapi_ai',
                title: article.title.substring(0, 500),
                url: article.url,
                published_at: article.published_at,
                source: article.source,
                article_description: article.body ? article.body.substring(0, 1000) : null, // First 1000 chars as description
                body: article.body, // Full content
                scraping_status: article.body ? 'scraped' : 'pending',
                data_source: 'newsapi_ai',
                content_type: article.content_type || 'general_news',
                apple_relevance_score,
                image_url: null, // NewsAPI.ai doesn't provide images in our current setup
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        });

        console.log('🔄 Transformed articles to match working schema');
        console.log('📋 Using columns: external_id, external_id_type, title, url, published_at, source, article_description, body, scraping_status, data_source, content_type, apple_relevance_score');

        // Insert articles one by one (like existing scripts do)
        let insertedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;

        for (const article of transformedArticles) {
            try {
                const { data, error } = await supabase
                    .from('articles')
                    .insert(article)
                    .select('id');

                if (error) {
                    if (error.message.includes('duplicate') || error.code === '23505') {
                        duplicateCount++;
                        console.log(`   ⚠️ Duplicate: "${article.title.substring(0, 40)}..."`);
                    } else {
                        errorCount++;
                        console.log(`   ❌ Error: ${error.message}`);
                        console.log(`   🔍 Article: ${article.title.substring(0, 40)}...`);
                    }
                } else {
                    insertedCount++;
                    if (insertedCount <= 5) {
                        console.log(`   ✅ Added: "${article.title.substring(0, 50)}..."`);
                    } else if (insertedCount % 5 === 0) {
                        console.log(`   ✅ Progress: ${insertedCount} articles added...`);
                    }
                }

            } catch (insertError: any) {
                errorCount++;
                console.log(`   ❌ Insert failed: ${insertError.message}`);
            }
        }

        console.log('\n📊 Results Summary:');
        console.log(`   ✅ Successfully inserted: ${insertedCount} articles`);
        console.log(`   ⚠️ Duplicates skipped: ${duplicateCount} articles`);
        console.log(`   ❌ Errors: ${errorCount} articles`);

        // Verify new total and show by data source
        const { data: allArticles } = await supabase
            .from('articles')
            .select('id, data_source')
            .order('created_at', { ascending: false });

        if (allArticles) {
            const bySource = allArticles.reduce((acc: Record<string, number>, a) => {
                acc[a.data_source] = (acc[a.data_source] || 0) + 1;
                return acc;
            }, {});

            console.log(`\n📊 Updated totals by data source:`);
            Object.entries(bySource).forEach(([source, count]) => {
                console.log(`   ${source}: ${count} articles`);
            });
            console.log(`   📊 Total articles now: ${allArticles.length}`);
        }

        if (insertedCount > 0) {
            console.log('\n🎉 NewsAPI.ai articles successfully added!');
            console.log('✅ Using your existing database schema');
            console.log('✅ Ready for AI processing pipeline');
            console.log('✅ Can now scale up collection for more diverse articles');
        }

    } catch (error: any) {
        console.log('❌ Failed to add articles:', error.message);
    }
}

// Main execution
async function main() {
    await addNewsApiArticlesCorrect();
}

main().catch(console.error);
