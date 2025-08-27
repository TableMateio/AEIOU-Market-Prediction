#!/usr/bin/env node

/**
 * Migration CLI Tool
 * 
 * Usage:
 *   npm run migrate:prepare    - Creates Supabase schema
 *   npm run migrate:data       - Migrates data from Airtable to Supabase
 *   npm run migrate:validate   - Validates migration success
 *   npm run migrate:all        - Runs complete migration
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { createLogger } from '../utils/logger';
import MigrationService from '../database/migration';

const logger = createLogger('MigrationCLI');

async function prepareSupabaseSchema(): Promise<void> {
    try {
        logger.info('Preparing Supabase schema...');

        const config = AppConfig.getInstance();
        const supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );

        // Read the SQL migration file
        const migrationPath = path.join(__dirname, '../database/migrations/001_initial_schema.sql');

        // Note: This would need to be run via SQL editor or psql
        // The Supabase client doesn't support arbitrary SQL execution
        logger.info(`
🎯 Schema Setup Required:

1. Go to your Supabase dashboard: ${config.supabaseConfig.projectUrl.replace('/v1', '')}/sql
2. Copy and paste the following SQL file:
   ${migrationPath}
3. Run the SQL to create all tables and relationships
4. Come back and run: npm run migrate:data

The schema file contains:
- 7 tables (news_events, news_sources, authors, topics, tickers, stock_data, validation_results)
- Junction tables for relationships
- Indexes for performance
- Default data (Apple ticker, news sources)
- Row Level Security policies
        `);

        // Test basic connection
        const { error } = await supabase
            .from('news_events')
            .select('count(*)')
            .limit(1);

        if (error) {
            logger.warn('Schema not yet created. Please run the SQL file first.');
        } else {
            logger.info('✅ Supabase schema appears to be ready!');
        }

    } catch (error) {
        logger.error('Failed to prepare schema', { error });
        process.exit(1);
    }
}

async function migrateData(): Promise<void> {
    try {
        logger.info('Starting data migration...');

        const migration = new MigrationService();
        const results = await migration.migrate();

        logger.info('✅ Migration completed successfully!', results);

    } catch (error) {
        logger.error('❌ Migration failed', { error });
        process.exit(1);
    }
}

async function validateMigration(): Promise<void> {
    try {
        logger.info('Validating migration...');

        const migration = new MigrationService();
        const results = await migration.validateMigration();

        const allMatch = Object.values(results).every(Boolean);

        if (allMatch) {
            logger.info('✅ Migration validation passed!', results);
        } else {
            logger.warn('⚠️ Migration validation found discrepancies', results);
        }

    } catch (error) {
        logger.error('❌ Migration validation failed', { error });
        process.exit(1);
    }
}

async function runFullMigration(): Promise<void> {
    try {
        await prepareSupabaseSchema();

        // Wait for user confirmation
        console.log('\n📋 Please run the SQL schema first, then press Enter to continue...');
        await new Promise(resolve => process.stdin.once('data', resolve));

        await migrateData();
        await validateMigration();

        logger.info('🎉 Complete migration finished successfully!');

    } catch (error) {
        logger.error('❌ Full migration failed', { error });
        process.exit(1);
    }
}

// CLI Handler
async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'prepare':
            await prepareSupabaseSchema();
            break;
        case 'data':
            await migrateData();
            break;
        case 'validate':
            await validateMigration();
            break;
        case 'all':
            await runFullMigration();
            break;
        default:
            console.log(`
🚀 AEIOU Migration Tool

Usage:
  npm run migrate:prepare    - Setup Supabase schema
  npm run migrate:data       - Migrate data from Airtable
  npm run migrate:validate   - Validate migration success  
  npm run migrate:all        - Complete migration process

Examples:
  npm run migrate:prepare
  npm run migrate:data
  npm run migrate:validate
            `);
            break;
    }
}

if (require.main === module) {
    main().catch((error) => {
        logger.error('Migration tool failed', { error });
        process.exit(1);
    });
}
