#!/usr/bin/env npx tsx

/**
 * Test if metadata fields exist and provide instructions if not
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

class MetadataFieldTester {
    private supabase: any;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    async testAndSetup(): Promise<void> {
        console.log('🔧 TESTING METADATA FIELDS');
        console.log('='.repeat(40));
        console.log('');

        const fieldsExist = await this.testMetadataFields();

        if (fieldsExist) {
            console.log('✅ All metadata fields exist!');
            await this.testMetadataUpdate();
        } else {
            console.log('❌ Metadata fields missing - please add them manually');
            this.showManualInstructions();
        }
    }

    /**
     * Test if metadata fields exist by trying to select them
     */
    private async testMetadataFields(): Promise<boolean> {
        console.log('🔍 Testing if metadata fields exist...');

        try {
            const { data, error } = await this.supabase
                .from('articles')
                .select('id, search_start_date, search_end_date, search_name, search_criteria, collection_batch')
                .limit(1);

            if (error) {
                console.log(`❌ Fields not found: ${error.message}`);
                return false;
            }

            console.log('✅ Metadata fields exist and are accessible');
            return true;

        } catch (error: any) {
            console.log(`❌ Error testing fields: ${error.message}`);
            return false;
        }
    }

    /**
     * Test updating a record with metadata
     */
    private async testMetadataUpdate(): Promise<void> {
        console.log('');
        console.log('🧪 Testing metadata update...');

        try {
            // Get the first article
            const { data: articles, error: fetchError } = await this.supabase
                .from('articles')
                .select('id, title')
                .limit(1);

            if (fetchError || !articles || articles.length === 0) {
                console.log(`❌ Could not fetch test article: ${fetchError?.message || 'No articles found'}`);
                return;
            }

            const testArticle = articles[0];
            console.log(`   Testing with article: ${testArticle.title.substring(0, 50)}...`);

            // Update with test metadata
            const testMetadata = {
                search_start_date: '2024-08-05',
                search_end_date: '2024-08-07',
                search_name: 'Test-Metadata',
                search_criteria: {
                    query: 'Apple',
                    sort: 'socialScore',
                    articles_count: 25,
                    source_threshold: 50
                },
                collection_batch: 'test-batch-2025-09-02'
            };

            const { error: updateError } = await this.supabase
                .from('articles')
                .update(testMetadata)
                .eq('id', testArticle.id);

            if (updateError) {
                console.log(`❌ Update failed: ${updateError.message}`);
                return;
            }

            console.log('✅ Metadata update successful');

            // Verify the update
            const { data: updatedArticle, error: verifyError } = await this.supabase
                .from('articles')
                .select('search_start_date, search_end_date, search_name, search_criteria, collection_batch')
                .eq('id', testArticle.id)
                .single();

            if (verifyError) {
                console.log(`❌ Verification failed: ${verifyError.message}`);
                return;
            }

            console.log('✅ Metadata verification successful:');
            console.log(`   search_name: ${updatedArticle.search_name}`);
            console.log(`   search_dates: ${updatedArticle.search_start_date} to ${updatedArticle.search_end_date}`);
            console.log(`   collection_batch: ${updatedArticle.collection_batch}`);
            console.log(`   search_criteria: ${JSON.stringify(updatedArticle.search_criteria, null, 2).substring(0, 100)}...`);

        } catch (error: any) {
            console.log(`❌ Error testing metadata update: ${error.message}`);
        }
    }

    /**
     * Show manual instructions for adding fields
     */
    private showManualInstructions(): void {
        console.log('');
        console.log('📋 MANUAL SETUP REQUIRED');
        console.log('─'.repeat(40));
        console.log('');
        console.log('Please run this SQL in your Supabase SQL editor:');
        console.log('');
        console.log('```sql');
        console.log('ALTER TABLE articles');
        console.log('ADD COLUMN IF NOT EXISTS search_start_date DATE,');
        console.log('ADD COLUMN IF NOT EXISTS search_end_date DATE,');
        console.log('ADD COLUMN IF NOT EXISTS search_name VARCHAR(255),');
        console.log('ADD COLUMN IF NOT EXISTS search_criteria JSONB,');
        console.log('ADD COLUMN IF NOT EXISTS collection_batch VARCHAR(255);');
        console.log('');
        console.log('-- Add indexes for performance');
        console.log('CREATE INDEX IF NOT EXISTS idx_articles_search_name ON articles(search_name);');
        console.log('CREATE INDEX IF NOT EXISTS idx_articles_collection_batch ON articles(collection_batch);');
        console.log('CREATE INDEX IF NOT EXISTS idx_articles_search_dates ON articles(search_start_date, search_end_date);');
        console.log('```');
        console.log('');
        console.log('Then run this script again to test the fields.');
        console.log('');
    }
}

// Main execution
async function main() {
    try {
        const tester = new MetadataFieldTester();
        await tester.testAndSetup();

    } catch (error: any) {
        console.error('❌ Metadata field testing failed:', error.message);
    }
}

main();
