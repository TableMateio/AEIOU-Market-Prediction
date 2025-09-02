#!/usr/bin/env npx tsx

/**
 * Delete Bad Articles
 * 
 * Delete all articles from the wrong collection method (2021 articles from newsapi_ai)
 * Keep only the recent articles that might be from the correct source
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { createLogger } from '../utils/logger';

const logger = createLogger('DeleteBadArticles');

async function deleteBadArticles() {
    logger.info('🗑️ Deleting bad articles from wrong collection method...');

    const config = AppConfig.getInstance();
    const supabase = createClient(
        config.supabaseConfig.projectUrl,
        config.supabaseConfig.apiKey
    );

    // First, let's see what we have
    const { data: allArticles, error: countError } = await supabase
        .from('articles')
        .select('id, published_at, data_source, title')
        .order('published_at', { ascending: true });

    if (countError) {
        logger.error('❌ Error fetching articles:', countError);
        return;
    }

    console.log(`📊 Current articles in database: ${allArticles.length}`);

    // Analyze by year and source
    const articlesByYear = allArticles.reduce((acc: any, article) => {
        const year = new Date(article.published_at).getFullYear();
        const key = `${year}_${article.data_source}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(article);
        return acc;
    }, {});

    console.log('\n📋 ARTICLES BY YEAR AND SOURCE:');
    Object.entries(articlesByYear).forEach(([key, articles]: [string, any]) => {
        const [year, source] = key.split('_');
        console.log(`   ${year} (${source}): ${articles.length} articles`);
    });

    // Identify articles to delete (2021 and earlier from newsapi_ai)
    const articlesToDelete = allArticles.filter(article => {
        const year = new Date(article.published_at).getFullYear();
        return year <= 2022; // Delete anything 2022 and earlier
    });

    const articlesToKeep = allArticles.filter(article => {
        const year = new Date(article.published_at).getFullYear();
        return year >= 2024; // Keep 2024+ articles (these might be good)
    });

    console.log(`\n🗑️ DELETION PLAN:`);
    console.log(`   Articles to DELETE: ${articlesToDelete.length} (2022 and earlier)`);
    console.log(`   Articles to KEEP: ${articlesToKeep.length} (2024+)`);

    if (articlesToDelete.length > 0) {
        console.log(`\n📋 SAMPLE OF ARTICLES TO DELETE:`);
        articlesToDelete.slice(0, 5).forEach((article, i) => {
            const date = new Date(article.published_at).toISOString().split('T')[0];
            console.log(`   ${i + 1}. [${date}] [${article.data_source}] ${article.title.substring(0, 60)}...`);
        });
    }

    if (articlesToKeep.length > 0) {
        console.log(`\n📋 SAMPLE OF ARTICLES TO KEEP:`);
        articlesToKeep.slice(0, 5).forEach((article, i) => {
            const date = new Date(article.published_at).toISOString().split('T')[0];
            console.log(`   ${i + 1}. [${date}] [${article.data_source}] ${article.title.substring(0, 60)}...`);
        });
    }

    // Confirm deletion
    console.log(`\n⚠️  CONFIRMATION REQUIRED:`);
    console.log(`   This will DELETE ${articlesToDelete.length} articles permanently.`);
    console.log(`   This will KEEP ${articlesToKeep.length} recent articles.`);
    console.log(`\n   Add --execute flag to proceed with deletion.`);

    const args = process.argv.slice(2);
    const execute = args.includes('--execute');

    if (!execute) {
        console.log(`\n🔧 To execute: npx tsx src/scripts/delete-bad-articles.ts --execute`);
        return;
    }

    // Execute deletion
    console.log(`\n🗑️ EXECUTING DELETION...`);

    if (articlesToDelete.length > 0) {
        const deleteIds = articlesToDelete.map(a => a.id);
        
        // Delete in batches of 100 to avoid query limits
        const batchSize = 100;
        let deletedCount = 0;

        for (let i = 0; i < deleteIds.length; i += batchSize) {
            const batch = deleteIds.slice(i, i + batchSize);
            
            const { error: deleteError } = await supabase
                .from('articles')
                .delete()
                .in('id', batch);

            if (deleteError) {
                logger.error(`❌ Error deleting batch ${i}-${i + batch.length}:`, deleteError);
                throw deleteError;
            }

            deletedCount += batch.length;
            console.log(`   Deleted batch: ${deletedCount}/${articlesToDelete.length} articles`);
        }

        console.log(`✅ Successfully deleted ${deletedCount} articles`);
    }

    // Also delete associated AI responses for deleted articles
    if (articlesToDelete.length > 0) {
        const deleteIds = articlesToDelete.map(a => a.id);
        
        const { error: aiDeleteError } = await supabase
            .from('ai_responses')
            .delete()
            .in('article_id', deleteIds);

        if (aiDeleteError) {
            logger.warn('⚠️ Error deleting AI responses:', aiDeleteError);
        } else {
            console.log(`✅ Also deleted associated AI responses`);
        }
    }

    // Final count
    const { data: finalCount, error: finalError } = await supabase
        .from('articles')
        .select('id', { count: 'exact' });

    if (!finalError) {
        console.log(`\n📊 FINAL RESULT:`);
        console.log(`   Articles remaining: ${finalCount?.length || 0}`);
        console.log(`   Articles deleted: ${articlesToDelete.length}`);
        console.log(`   Database cleaned successfully! 🎉`);
    }
}

// Run the deletion
deleteBadArticles().catch(error => {
    console.error('❌ Deletion failed:', error.message);
    process.exit(1);
});
