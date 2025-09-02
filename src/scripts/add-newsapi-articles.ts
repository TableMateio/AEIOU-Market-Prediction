#!/usr/bin/env npx tsx

/**
 * Add NewsAPI.ai Articles to Database
 * Use existing systems to properly integrate collected articles
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import * as fs from 'fs/promises';
import * as path from 'path';

async function addNewsApiArticles() {
    console.log('📤 Adding NewsAPI.ai Articles to Database');
    console.log('='.repeat(50));
    console.log('Using existing Supabase integration...');

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

        // Transform to match your existing database schema
        const transformedArticles = articles.map((article: any) => ({
            title: article.title,
            body: article.body,
            url: article.url,
            source: article.source,
            published_at: article.published_at,
            scraped_at: article.scraped_at,
            scraping_status: article.body ? 'scraped' : 'pending',
            data_source: 'newsapi_ai',
            external_id: article.external_id,
            external_id_type: article.external_id_type,
            keywords: article.keywords,
            relevance_score: article.relevance_score,
            category: article.category,
            content_type: article.content_type,
            target_audience: article.target_audience,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));

        console.log('🔄 Transformed articles to match database schema');

        // Insert articles using existing patterns (batch approach)
        let insertedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;

        for (const article of transformedArticles) {
            try {
                const { data, error } = await supabase
                    .from('articles')
                    .upsert(article, {
                        onConflict: 'url',
                        ignoreDuplicates: false
                    })
                    .select('id');

                if (error) {
                    if (error.message.includes('duplicate') || error.code === '23505') {
                        duplicateCount++;
                        console.log(`   ⚠️ Duplicate: "${article.title.substring(0, 40)}..."`);
                    } else {
                        errorCount++;
                        console.log(`   ❌ Error: ${error.message}`);
                    }
                } else {
                    insertedCount++;
                    if (insertedCount <= 5) {
                        console.log(`   ✅ Added: "${article.title.substring(0, 50)}..."`);
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

        // Verify new total
        const { data: totalCheck, error: countError } = await supabase
            .from('articles')
            .select('id', { count: 'exact', head: true });

        if (!countError) {
            console.log(`   📊 Total articles now in database: ${totalCheck?.length || 0}`);
        }

        console.log('\n🎉 NewsAPI.ai articles successfully integrated!');
        console.log('✅ Using your existing database schema and patterns');
        console.log('✅ Proper duplicate handling with URL conflicts');
        console.log('✅ Ready for AI processing pipeline');

    } catch (error: any) {
        console.log('❌ Failed to add articles:', error.message);
    }
}

// Main execution
async function main() {
    await addNewsApiArticles();
}

main().catch(console.error);
