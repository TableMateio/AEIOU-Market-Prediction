#!/usr/bin/env npx tsx

/**
 * Apply search metadata migration to add tracking fields
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

class MigrationApplier {
    private supabase: any;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    async applyMigration(): Promise<void> {
        console.log('🔧 APPLYING SEARCH METADATA MIGRATION');
        console.log('='.repeat(50));
        console.log('');

        try {
            console.log('📝 Adding search metadata columns...');

            // Add the columns
            const alterQuery = `
                ALTER TABLE articles 
                ADD COLUMN IF NOT EXISTS search_start_date DATE,
                ADD COLUMN IF NOT EXISTS search_end_date DATE,
                ADD COLUMN IF NOT EXISTS search_name VARCHAR(255),
                ADD COLUMN IF NOT EXISTS search_criteria JSONB,
                ADD COLUMN IF NOT EXISTS collection_batch VARCHAR(255);
            `;

            const { error: alterError } = await this.supabase.rpc('exec_sql', {
                query: alterQuery
            });

            if (alterError) {
                console.log(`❌ Error adding columns: ${alterError.message}`);
                console.log('');
                console.log('💡 Manual SQL required - Please run this in Supabase SQL editor:');
                console.log('');
                console.log(alterQuery);
                console.log('');
                console.log('Then run this script again to verify.');
                return;
            }

            console.log('✅ Columns added successfully');
            console.log('');

            // Verify the columns exist
            await this.verifyMigration();

            // Add indexes
            console.log('📝 Adding indexes...');
            const indexQueries = [
                'CREATE INDEX IF NOT EXISTS idx_articles_search_name ON articles(search_name);',
                'CREATE INDEX IF NOT EXISTS idx_articles_collection_batch ON articles(collection_batch);',
                'CREATE INDEX IF NOT EXISTS idx_articles_search_dates ON articles(search_start_date, search_end_date);'
            ];

            for (const indexQuery of indexQueries) {
                const { error: indexError } = await this.supabase.rpc('exec_sql', {
                    query: indexQuery
                });

                if (indexError) {
                    console.log(`⚠️  Index creation failed: ${indexError.message}`);
                } else {
                    console.log(`✅ Index created: ${indexQuery.split(' ')[5]}`);
                }
            }

            console.log('');
            console.log('🎉 Migration completed successfully!');
            console.log('');

            // Show the new schema
            await this.showNewSchema();

        } catch (error: any) {
            console.log(`❌ Migration failed: ${error.message}`);
            console.log('');
            console.log('💡 Please run the following SQL manually in Supabase:');
            console.log('');
            console.log(`
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS search_start_date DATE,
ADD COLUMN IF NOT EXISTS search_end_date DATE,
ADD COLUMN IF NOT EXISTS search_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS search_criteria JSONB,
ADD COLUMN IF NOT EXISTS collection_batch VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_articles_search_name ON articles(search_name);
CREATE INDEX IF NOT EXISTS idx_articles_collection_batch ON articles(collection_batch);
CREATE INDEX IF NOT EXISTS idx_articles_search_dates ON articles(search_start_date, search_end_date);
            `);
        }
    }

    /**
     * Verify migration was applied successfully
     */
    private async verifyMigration(): Promise<void> {
        console.log('🔍 Verifying migration...');

        try {
            // Test that we can query the new columns
            const { data, error } = await this.supabase
                .from('articles')
                .select('id, search_start_date, search_end_date, search_name, search_criteria, collection_batch')
                .limit(1);

            if (error) {
                console.log(`❌ Verification failed: ${error.message}`);
                return;
            }

            console.log('✅ New columns are accessible');

        } catch (error: any) {
            console.log(`❌ Verification error: ${error.message}`);
        }
    }

    /**
     * Show the new schema structure
     */
    private async showNewSchema(): Promise<void> {
        console.log('📋 NEW SCHEMA STRUCTURE');
        console.log('─'.repeat(40));

        const fields = [
            { name: 'search_start_date', type: 'DATE', description: 'Start date of search period' },
            { name: 'search_end_date', type: 'DATE', description: 'End date of search period' },
            { name: 'search_name', type: 'VARCHAR(255)', description: 'Human-readable search name' },
            { name: 'search_criteria', type: 'JSONB', description: 'Search parameters and filters' },
            { name: 'collection_batch', type: 'VARCHAR(255)', description: 'Batch identifier for grouping' }
        ];

        fields.forEach(field => {
            console.log(`   ${field.name.padEnd(20)} ${field.type.padEnd(15)} ${field.description}`);
        });

        console.log('');
        console.log('📋 EXAMPLE USAGE:');
        console.log('   search_start_date: 2024-08-05');
        console.log('   search_end_date: 2024-08-07');
        console.log('   search_name: "Period-1"');
        console.log('   search_criteria: {"query": "Apple", "sort": "socialScore", "articles": 25}');
        console.log('   collection_batch: "smart-collection-2025-09-02"');
        console.log('');
    }
}

// Main execution
async function main() {
    try {
        const migrator = new MigrationApplier();
        await migrator.applyMigration();

    } catch (error: any) {
        console.error('❌ Migration application failed:', error.message);
    }
}

main();
