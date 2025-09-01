#!/usr/bin/env tsx

/**
 * Execute Historical Articles Insertion
 * Reads the generated SQL file and executes it via MCP
 */

import { readFileSync } from 'fs';
import { createLogger } from '../utils/logger';

const logger = createLogger('ArticlesInsert');

async function main() {
    try {
        // Read the fixed SQL file
        const sql = readFileSync('/tmp/historical_articles_insert_fixed.sql', 'utf8');

        // Clean up the SQL (remove extra whitespace, ensure proper formatting)
        const cleanedSQL = sql
            .replace(/\n\s*\n/g, '\n')  // Remove empty lines
            .replace(/\s+/g, ' ')       // Normalize whitespace
            .trim();

        logger.info('📝 SQL file loaded, generating manual execution command...');

        // Since we can't execute the MCP directly from script, generate the command
        console.log('\n=== EXECUTE THIS IN MCP TERMINAL ===');
        console.log('Copy and paste this SQL command:');
        console.log('\n```sql');
        console.log(cleanedSQL);
        console.log('```\n');

        // Also provide a summary
        const articleCount = (sql.match(/gen_random_uuid\(\)/g) || []).length;
        logger.info(`📊 SQL contains ${articleCount} articles to insert/update`);

    } catch (error) {
        logger.error('❌ Error processing SQL file:', error);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
