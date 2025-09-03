#!/usr/bin/env npx tsx

/**
 * Check Database State - Use existing systems to understand current articles
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../../config/app';

async function checkDatabaseState() {
    console.log('🔍 Checking Database State');
    console.log('='.repeat(50));

    const config = AppConfig.getInstance();
    const supabase = createClient(
        config.supabaseConfig.projectUrl,
        config.supabaseConfig.apiKey
    );

    try {
        // Get total article count
        const { data: articles, error } = await supabase
            .from('articles')
            .select('id, title, source, data_source, published_at, scraping_status, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('❌ Error fetching articles:', error);
            return;
        }

        console.log(`📊 Total articles in database: ${articles?.length || 0}`);

        // Group by data source
        const bySource = articles?.reduce((acc, a) => {
            const source = a.data_source || 'unknown';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {} as Record<string, number>) || {};

        console.log('\n📋 Articles by data source:');
        Object.entries(bySource).forEach(([source, count]) => {
            console.log(`   ${source}: ${count} articles`);
        });

        // Group by scraping status
        const byStatus = articles?.reduce((acc, a) => {
            const status = a.scraping_status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>) || {};

        console.log('\n📋 Articles by scraping status:');
        Object.entries(byStatus).forEach(([status, count]) => {
            console.log(`   ${status}: ${count} articles`);
        });

        // Show recent articles
        console.log('\n📰 Most recent 10 articles:');
        articles?.slice(0, 10).forEach((a, i) => {
            const publishedDate = a.published_at ? new Date(a.published_at).toISOString().split('T')[0] : 'No date';
            console.log(`   ${i + 1}. "${a.title.substring(0, 60)}..."`);
            console.log(`      Source: ${a.source} | Data: ${a.data_source} | Published: ${publishedDate}`);
        });

        // Check AI responses
        const { data: aiResponses, error: aiError } = await supabase
            .from('ai_responses')
            .select('id, article_id, success')
            .eq('success', true);

        if (!aiError) {
            console.log(`\n🤖 AI Responses: ${aiResponses?.length || 0} successful responses`);
        }

        // Check what data sources we have
        console.log('\n💡 Analysis:');
        console.log(`   • You currently have ${articles?.length || 0} articles`);
        console.log(`   • Main sources: ${Object.keys(bySource).join(', ')}`);
        console.log(`   • ${aiResponses?.length || 0} articles have been processed by AI`);

        if ((articles?.length || 0) < 100) {
            console.log('   • Consider collecting more articles for better ML training');
        }

    } catch (error: any) {
        console.log('❌ Database check failed:', error.message);
    }
}

// Main execution
async function main() {
    await checkDatabaseState();
}

main().catch(console.error);
