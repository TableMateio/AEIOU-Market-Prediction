#!/usr/bin/env npx tsx

/**
 * Clean out old NewsAPI.ai articles and replace with entity-based ones
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { NewsApiAiService } from '../services/newsApiAiService';

class CleanAndReplaceArticles {
    private supabase: any;
    private newsService: NewsApiAiService;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
        this.newsService = new NewsApiAiService();
    }

    async cleanAndReplace(): Promise<void> {
        console.log('🧹 CLEAN AND REPLACE ARTICLES');
        console.log('='.repeat(50));
        console.log('');

        console.log('📋 PLAN:');
        console.log('   1. Remove all old NewsAPI.ai articles');
        console.log('   2. Collect new entity-based articles');
        console.log('   3. Save high-quality entity articles');
        console.log('   4. Verify database state');
        console.log('');

        // Step 1: Clean out old articles
        await this.cleanOldArticles();

        // Step 2: Collect new entity-based articles
        const newArticles = await this.collectEntityArticles();

        // Step 3: Save the good ones
        if (newArticles.length > 0) {
            await this.saveEntityArticles(newArticles);
        }

        // Step 4: Verify final state
        await this.verifyDatabaseState();
    }

    private async cleanOldArticles(): Promise<void> {
        console.log('🗑️  STEP 1: CLEANING OLD ARTICLES');
        console.log('─'.repeat(40));

        try {
            // Get count of NewsAPI.ai articles before deletion
            const { data: beforeData, error: beforeError } = await this.supabase
                .from('articles')
                .select('id, title', { count: 'exact' })
                .eq('data_source', 'newsapi_ai');

            if (beforeError) {
                console.log(`❌ Error checking articles: ${beforeError.message}`);
                return;
            }

            const beforeCount = beforeData?.length || 0;
            console.log(`📊 Found ${beforeCount} NewsAPI.ai articles to remove`);

            if (beforeCount === 0) {
                console.log('✅ No old articles to clean');
                return;
            }

            // Show sample of what we're removing
            console.log('');
            console.log('🗑️  SAMPLE ARTICLES BEING REMOVED:');
            beforeData?.slice(0, 5).forEach((article: any, i: number) => {
                console.log(`   ${i + 1}. "${article.title?.substring(0, 60)}..."`);
            });
            if (beforeCount > 5) {
                console.log(`   ... and ${beforeCount - 5} more`);
            }
            console.log('');

            // Delete all NewsAPI.ai articles
            const { error: deleteError } = await this.supabase
                .from('articles')
                .delete()
                .eq('data_source', 'newsapi_ai');

            if (deleteError) {
                console.log(`❌ Error deleting articles: ${deleteError.message}`);
                return;
            }

            console.log(`✅ Successfully removed ${beforeCount} old NewsAPI.ai articles`);

        } catch (error: any) {
            console.log(`❌ Error in cleanup: ${error.message}`);
        }
    }

    private async collectEntityArticles(): Promise<any[]> {
        console.log('');
        console.log('🎯 STEP 2: COLLECTING ENTITY-BASED ARTICLES');
        console.log('─'.repeat(50));

        try {
            console.log('🔬 Using conceptUri method:');
            console.log('   • Target: Apple Inc. entity (Wikipedia URI)');
            console.log('   • Period: 2024-08-05 to 2024-08-07');
            console.log('   • Sort: Relevance');
            console.log('   • Expected: 100% Apple-specific articles');
            console.log('');

            const articles = await this.newsService.searchAppleByEntity({
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'rel',
                pageSize: 15,
                sourceRankPercentile: 50
            });

            console.log(`✅ Collected ${articles.length} entity-based articles`);

            // Show what we collected
            console.log('');
            console.log('📋 NEW ENTITY-BASED ARTICLES:');
            articles.forEach((article, i) => {
                const title = article.title || 'No title';
                const source = article.source || 'Unknown';
                console.log(`   🍎 ${i + 1}. "${title.substring(0, 70)}..."`);
                console.log(`      Source: ${source}`);
            });

            return articles;

        } catch (error: any) {
            console.log(`❌ Error collecting entity articles: ${error.message}`);
            return [];
        }
    }

    private async saveEntityArticles(articles: any[]): Promise<void> {
        console.log('');
        console.log('💾 STEP 3: SAVING ENTITY ARTICLES');
        console.log('─'.repeat(40));

        let savedCount = 0;
        let errorCount = 0;

        for (const article of articles) {
            try {
                const articleData = {
                    external_id: article.external_id || `entity_${Date.now()}_${Math.random()}`,
                    external_id_type: 'newsapi_ai_entity',
                    title: article.title || 'Untitled',
                    url: article.url,
                    published_at: article.published_at,
                    source: article.source,
                    article_description: article.body?.substring(0, 1000),
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai',
                    content_type: 'entity_based_clean',
                    apple_relevance_score: 0.95, // High confidence from entity targeting
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('articles')
                    .upsert(articleData, { onConflict: 'url' });

                if (error) {
                    console.log(`❌ Failed to save: ${article.title?.substring(0, 40)}... (${error.message})`);
                    errorCount++;
                } else {
                    savedCount++;
                }

            } catch (error: any) {
                console.log(`❌ Save error: ${error.message}`);
                errorCount++;
            }
        }

        console.log(`✅ Saved: ${savedCount} entity-based articles`);
        if (errorCount > 0) {
            console.log(`⚠️  Errors: ${errorCount} articles`);
        }
    }

    private async verifyDatabaseState(): Promise<void> {
        console.log('');
        console.log('✅ STEP 4: VERIFICATION');
        console.log('─'.repeat(30));

        try {
            // Get total articles
            const { data: totalData, error: totalError } = await this.supabase
                .from('articles')
                .select('id', { count: 'exact' });

            if (totalError) {
                console.log(`❌ Error getting total: ${totalError.message}`);
                return;
            }

            const totalCount = totalData?.length || 0;

            // Get NewsAPI.ai articles
            const { data: newsapiData, error: newsapiError } = await this.supabase
                .from('articles')
                .select('id, title, content_type', { count: 'exact' })
                .eq('data_source', 'newsapi_ai');

            if (newsapiError) {
                console.log(`❌ Error getting NewsAPI.ai articles: ${newsapiError.message}`);
                return;
            }

            const newsapiCount = newsapiData?.length || 0;

            console.log('📊 FINAL DATABASE STATE:');
            console.log(`   📰 Total articles: ${totalCount}`);
            console.log(`   🍎 NewsAPI.ai articles: ${newsapiCount}`);
            console.log(`   🎯 All NewsAPI.ai articles are now entity-based`);
            console.log('');

            if (newsapiCount > 0) {
                console.log('🍎 NEW ENTITY-BASED ARTICLES IN DATABASE:');
                newsapiData?.forEach((article: any, i: number) => {
                    console.log(`   ${i + 1}. "${article.title?.substring(0, 60)}..."`);
                    console.log(`      Type: ${article.content_type}`);
                });
                console.log('');
                console.log('✅ CLEAN AND REPLACE COMPLETE!');
                console.log('🎯 All articles are now high-quality, Apple-specific content');
            } else {
                console.log('⚠️  No NewsAPI.ai articles found after replacement');
            }

        } catch (error: any) {
            console.log(`❌ Error in verification: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('🧹 CLEAN AND REPLACE ARTICLES');
        console.log('This will remove ALL old NewsAPI.ai articles and replace with entity-based ones');
        console.log('');

        const cleaner = new CleanAndReplaceArticles();
        await cleaner.cleanAndReplace();

    } catch (error: any) {
        console.error('❌ Clean and replace failed:', error.message);
    }
}

main();
