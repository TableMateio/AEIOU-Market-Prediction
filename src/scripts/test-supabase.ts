#!/usr/bin/env node

/**
 * Supabase Connection Test
 * 
 * Quick test to verify Supabase connection and basic operations
 */

import { createLogger } from '../utils/logger';
import { DatabaseFactory } from '../data/storage/databaseFactory';

const logger = createLogger('SupabaseTest');

async function testSupabaseConnection(): Promise<void> {
    try {
        logger.info('Testing Supabase connection...');

        // Test connection
        const db = await DatabaseFactory.createDatabase('supabase');
        logger.info('✅ Successfully connected to Supabase');

        // Test basic operations
        logger.info('Testing basic database operations...');

        // Get existing news events
        const newsEvents = await db.getNewsEvents({ limit: 5 });
        logger.info(`Found ${newsEvents.length} news events in database`);

        // Get existing stock data
        const stockData = await db.getStockData('AAPL', undefined, undefined, 5);
        logger.info(`Found ${stockData.length} stock data points in database`);

        // Get validation results
        const validationResults = await db.getValidationResults({ limit: 5 });
        logger.info(`Found ${validationResults.length} validation results in database`);

        logger.info('🎉 All Supabase tests passed successfully!');

    } catch (error) {
        logger.error('❌ Supabase test failed', { error });

        if ((error as any)?.message?.includes('relation') && (error as any)?.message?.includes('does not exist')) {
            logger.info(`
🔧 Schema not created yet. To fix this:

1. Go to your Supabase SQL editor
2. Run the migration file: src/database/migrations/001_initial_schema.sql
3. Then run this test again

Or run: npm run migrate:prepare
            `);
        }

        process.exit(1);
    }
}

if (require.main === module) {
    testSupabaseConnection();
}
