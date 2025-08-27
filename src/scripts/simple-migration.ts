#!/usr/bin/env node

/**
 * Simple Articles Schema Migration
 * 
 * Applies the articles schema migration to Supabase using direct PostgreSQL connection.
 * Run with: npx ts-node src/scripts/simple-migration.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyMigration() {
    console.log('🚀 Articles Schema Migration Tool');
    console.log('=====================================\n');
    
    // Check if we have the required environment variables
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
        console.log('❌ Missing required environment variables in .env file:');
        console.log('   - SUPABASE_PROJECT_URL');
        console.log('   - SUPABASE_SERVICE_ROLE_KEY');
        console.log('\n💡 To complete setup:');
        console.log('   1. Copy env.example to .env');
        console.log('   2. Fill in your Supabase project details');
        console.log('   3. Re-run this script');
        return;
    }
    
    try {
        // Read the migration file
        const migrationPath = join(__dirname, '../database/migrations/001_articles_schema.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');
        
        console.log('📖 Migration file loaded successfully');
        console.log(`📄 Size: ${migrationSQL.length} characters`);
        console.log(`📊 Contains: ${migrationSQL.split(';').length} SQL statements\n`);
        
        // Extract project reference from URL
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        
        console.log('🏢 Project Details:');
        console.log(`   URL: ${supabaseUrl}`);
        console.log(`   Project Ref: ${projectRef}\n`);
        
        console.log('🔧 Manual Migration Instructions:');
        console.log('=====================================');
        console.log('Since we need to apply a complex migration, please follow these steps:\n');
        
        console.log('1. 🌐 Open your Supabase Dashboard:');
        console.log(`   https://supabase.com/dashboard/project/${projectRef}\n`);
        
        console.log('2. 📝 Go to SQL Editor:');
        console.log('   - Click "SQL Editor" in the left sidebar');
        console.log('   - Click "New Query"\n');
        
        console.log('3. 📋 Copy and paste the migration:');
        console.log('   - Copy the entire content from:');
        console.log(`   ${migrationPath}`);
        console.log('   - Paste it into the SQL Editor\n');
        
        console.log('4. ▶️  Run the migration:');
        console.log('   - Click the "Run" button');
        console.log('   - Wait for completion\n');
        
        console.log('5. ✅ Verify success:');
        console.log('   - Check that "articles" and "ai_responses" tables were created');
        console.log('   - Look for indexes, views, and functions\n');
        
        console.log('📄 Migration Preview (first 500 characters):');
        console.log('='.repeat(50));
        console.log(migrationSQL.substring(0, 500) + '...\n');
        
        console.log('🚀 After migration, you can:');
        console.log('   - Test the schema with sample data');
        console.log('   - Run Phase 1 validation tests');
        console.log('   - Start the news ingestion pipeline');
        
    } catch (error) {
        console.error('❌ Error reading migration file:', error);
        console.log('\n💡 Make sure you\'re running this from the project root directory');
    }
}

// Run the script
applyMigration().catch(console.error);
