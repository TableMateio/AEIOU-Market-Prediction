#!/usr/bin/env npx tsx

/**
 * Test collection with metadata fields (run after adding fields to database)
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

class MetadataCollectionTester {
    private supabase: any;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    async testCollection(): Promise<void> {
        console.log('🧪 TESTING METADATA COLLECTION');
        console.log('='.repeat(50));
        console.log('');

        // First, verify fields exist
        const fieldsExist = await this.verifyMetadataFields();
        if (!fieldsExist) {
            console.log('❌ Metadata fields not found. Please add them first.');
            return;
        }

        // Test creating a mock article with metadata
        await this.testMockArticleWithMetadata();

        // Show current collection statistics with metadata
        await this.showCollectionStats();
    }

    /**
     * Verify metadata fields exist
     */
    private async verifyMetadataFields(): Promise<boolean> {
        console.log('🔍 Verifying metadata fields exist...');

        try {
            const { error } = await this.supabase
                .from('articles')
                .select('search_start_date, search_end_date, search_name, search_criteria, collection_batch')
                .limit(1);

            if (error) {
                console.log(`❌ Fields missing: ${error.message}`);
                return false;
            }

            console.log('✅ All metadata fields exist');
            return true;

        } catch (error: any) {
            console.log(`❌ Error verifying fields: ${error.message}`);
            return false;
        }
    }

    /**
     * Test creating a mock article with metadata
     */
    private async testMockArticleWithMetadata(): Promise<void> {
        console.log('');
        console.log('🧪 Testing mock article with metadata...');

        const mockArticle = {
            external_id: `test_metadata_${Date.now()}`,
            external_id_type: 'test',
            title: 'Test Article with Metadata Fields',
            url: `https://test.example.com/article-${Date.now()}`,
            published_at: new Date().toISOString(),
            source: 'Test Source',
            article_description: 'This is a test article to verify metadata fields work correctly.',
            body: 'Full test article body content here...',
            scraping_status: 'scraped',
            data_source: 'test',
            content_type: 'test_metadata',
            apple_relevance_score: 0.9,
            // Metadata fields
            search_start_date: '2024-08-05',
            search_end_date: '2024-08-07',
            search_name: 'Test-Metadata-Collection',
            search_criteria: {
                query: 'Apple',
                sort: 'socialScore',
                articles_count: 25,
                source_threshold: 50,
                period_type: '3-day',
                business_days_only: true,
                test_run: true
            },
            collection_batch: `test-metadata-${new Date().toISOString().split('T')[0]}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const { data, error } = await this.supabase
                .from('articles')
                .insert(mockArticle)
                .select()
                .single();

            if (error) {
                console.log(`❌ Insert failed: ${error.message}`);
                return;
            }

            console.log('✅ Mock article created successfully');
            console.log(`   ID: ${data.id}`);
            console.log(`   Search Name: ${data.search_name}`);
            console.log(`   Collection Batch: ${data.collection_batch}`);
            console.log(`   Search Dates: ${data.search_start_date} to ${data.search_end_date}`);
            console.log(`   Search Criteria Keys: ${Object.keys(data.search_criteria || {}).join(', ')}`);

            // Clean up test article
            await this.cleanupTestArticle(data.id);

        } catch (error: any) {
            console.log(`❌ Error creating mock article: ${error.message}`);
        }
    }

    /**
     * Show collection statistics with metadata
     */
    private async showCollectionStats(): Promise<void> {
        console.log('');
        console.log('📊 COLLECTION STATISTICS WITH METADATA');
        console.log('─'.repeat(50));

        try {
            // Get all articles with metadata
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('data_source, search_name, collection_batch, search_start_date, search_end_date')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error fetching stats: ${error.message}`);
                return;
            }

            console.log(`📊 Total articles: ${articles.length}`);

            // Group by collection batch
            const batchGroups = articles.reduce((acc: Record<string, number>, article) => {
                const batch = article.collection_batch || 'No Batch';
                acc[batch] = (acc[batch] || 0) + 1;
                return acc;
            }, {});

            console.log('');
            console.log('📋 BY COLLECTION BATCH:');
            Object.entries(batchGroups).forEach(([batch, count]) => {
                console.log(`   ${batch}: ${count} articles`);
            });

            // Group by search name
            const searchGroups = articles.reduce((acc: Record<string, number>, article) => {
                const searchName = article.search_name || 'No Search Name';
                acc[searchName] = (acc[searchName] || 0) + 1;
                return acc;
            }, {});

            console.log('');
            console.log('📋 BY SEARCH NAME:');
            Object.entries(searchGroups)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 10)
                .forEach(([name, count]) => {
                    console.log(`   ${name}: ${count} articles`);
                });

            // Articles with metadata vs without
            const withMetadata = articles.filter(a => a.search_name || a.collection_batch).length;
            const withoutMetadata = articles.length - withMetadata;

            console.log('');
            console.log('📊 METADATA COVERAGE:');
            console.log(`   With metadata: ${withMetadata} articles (${Math.round(withMetadata / articles.length * 100)}%)`);
            console.log(`   Without metadata: ${withoutMetadata} articles (${Math.round(withoutMetadata / articles.length * 100)}%)`);

            // Show sample metadata
            const sampleWithMetadata = articles.find(a => a.search_name && a.collection_batch);
            if (sampleWithMetadata) {
                console.log('');
                console.log('📋 SAMPLE METADATA:');
                console.log(`   Search Name: ${sampleWithMetadata.search_name}`);
                console.log(`   Collection Batch: ${sampleWithMetadata.collection_batch}`);
                console.log(`   Search Period: ${sampleWithMetadata.search_start_date} to ${sampleWithMetadata.search_end_date}`);
            }

        } catch (error: any) {
            console.log(`❌ Error generating stats: ${error.message}`);
        }
    }

    /**
     * Clean up test article
     */
    private async cleanupTestArticle(articleId: string): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('articles')
                .delete()
                .eq('id', articleId);

            if (error) {
                console.log(`⚠️  Could not clean up test article: ${error.message}`);
            } else {
                console.log('🧹 Test article cleaned up');
            }
        } catch (error: any) {
            console.log(`⚠️  Cleanup error: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    try {
        const tester = new MetadataCollectionTester();
        await tester.testCollection();

    } catch (error: any) {
        console.error('❌ Metadata collection testing failed:', error.message);
    }
}

main();
