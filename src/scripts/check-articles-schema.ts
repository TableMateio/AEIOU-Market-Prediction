#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

async function checkSchema() {
    const appConfig = AppConfig.getInstance();
    const supabase = createClient(
        appConfig.supabaseConfig.projectUrl,
        appConfig.supabaseConfig.apiKey
    );

    console.log('🔍 Checking Articles Table Schema...\n');

    // Get one article to see actual columns
    const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!articles || articles.length === 0) {
        console.log('❌ No articles found');
        return;
    }

    const article = articles[0];
    console.log('📋 ACTUAL COLUMNS IN ARTICLES TABLE:');
    Object.keys(article).forEach(key => {
        const value = article[key];
        const type = typeof value;
        const preview = type === 'string' ? value.substring(0, 50) + '...' : value;
        console.log(`   ${key}: ${type} = ${preview}`);
    });

    console.log('\n🔍 KEY FIELDS FOR BATCH PROCESSING:');
    console.log(`   📰 Article ID: ${article.id}`);
    console.log(`   📰 Title/Headline: ${article.title || 'N/A'}`);
    console.log(`   🔗 URL: ${article.url || 'N/A'}`);
    console.log(`   📝 Body/Content: ${article.body ? 'Present (' + article.body.length + ' chars)' : 'Missing'}`);
    console.log(`   📅 Published: ${article.published_at || 'N/A'}`);
    console.log(`   📰 Source: ${article.source || 'N/A'}`);
    console.log(`   ✍️  Authors: ${article.authors ? JSON.stringify(article.authors) : 'N/A'}`);
}

checkSchema();
