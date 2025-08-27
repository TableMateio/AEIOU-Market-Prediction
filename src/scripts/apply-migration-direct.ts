#!/usr/bin/env node

/**
 * Direct Articles Schema Migration - Bypass MCP Issues
 * 
 * Applies the articles schema migration directly using Supabase client with service role key.
 * This bypasses MCP connection issues and gives us full database control.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_PROJECT_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Direct Supabase Migration Tool');
console.log('=====================================\n');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_PROJECT_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n💡 Please check your .env file contains these values.');
    process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`🏢 Project URL: ${SUPABASE_URL}`);
console.log(`🔑 Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);

// Create Supabase client with service role key (full admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('🔗 Supabase client created with service role key\n');

async function applyMigration() {
    try {
        // Read the migration file
        const migrationPath = join(__dirname, '../database/migrations/001_articles_schema.sql');
        console.log(`📖 Reading migration from: ${migrationPath}`);
        
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        console.log(`📄 Migration loaded: ${migrationSQL.length} characters`);
        
        // Split migration into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
        
        // Execute each statement
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (!statement) continue;
            
            try {
                console.log(`⚡ [${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
                
                // Use rpc to execute raw SQL
                const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
                
                if (error) {
                    console.log(`   ❌ Error: ${error.message}`);
                    errorCount++;
                } else {
                    console.log(`   ✅ Success`);
                    successCount++;
                }
                
            } catch (err) {
                console.log(`   ❌ Exception: ${err.message}`);
                errorCount++;
            }
        }
        
        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        
        // Verify tables were created
        console.log('\n🔍 Verifying tables...');
        
        const { data: tables, error: tablesError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['articles', 'ai_responses']);
        
        if (tablesError) {
            console.error('❌ Error checking tables:', tablesError);
        } else {
            const tableNames = tables?.map(t => t.table_name) || [];
            console.log(`📋 Tables found: ${tableNames.join(', ')}`);
            
            if (tableNames.includes('articles') && tableNames.includes('ai_responses')) {
                console.log('\n🎉 SUCCESS: Articles schema migration completed!');
                console.log('\n📚 Next steps:');
                console.log('   1. Test inserting sample article data');
                console.log('   2. Verify indexes and views were created');
                console.log('   3. Run Phase 1 validation tests');
            } else {
                console.log('\n⚠️  WARNING: Not all expected tables were created');
            }
        }
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Execute the migration
applyMigration()
    .then(() => {
        console.log('\n✨ Migration tool completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration tool failed:', error);
        process.exit(1);
    });
