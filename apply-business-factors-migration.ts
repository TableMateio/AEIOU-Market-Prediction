/**
 * Apply Business Factors Migration
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '@config/app';
import fs from 'fs';

async function applyMigration() {
    console.log('🚀 Applying Business Factors Migration\n');
    
    const supabase = createClient(
        AppConfig.getInstance().supabaseConfig.projectUrl,
        AppConfig.getInstance().supabaseConfig.apiKey
    );
    
    // Read the migration file
    const migrationSQL = fs.readFileSync('supabase/migrations/20250831_business_factors.sql', 'utf-8');
    
    console.log('📄 Migration SQL Preview:');
    console.log(migrationSQL.substring(0, 200) + '...\n');
    
    console.log('⚠️  NOTE: Supabase client cannot execute DDL statements directly.');
    console.log('You need to run this SQL in the Supabase SQL Editor:\n');
    
    const projectUrl = AppConfig.getInstance().supabaseConfig.projectUrl.replace('/rest/v1', '');
    console.log(`🔗 Go to: ${projectUrl}/sql\n`);
    
    console.log('📋 Or you can apply it via psql if you have database credentials\n');
    
    // Check if table exists after manual application
    try {
        const { data, error } = await supabase
            .from('business_factors')
            .select('count(*)')
            .limit(1);
        
        if (error && error.message.includes('relation "business_factors" does not exist')) {
            console.log('❌ business_factors table does not exist yet');
            console.log('👆 Please run the SQL above in Supabase SQL Editor first\n');
        } else if (error) {
            console.log('❌ Error checking table:', error.message);
        } else {
            console.log('✅ business_factors table exists and is ready!');
            console.log(`📊 Current row count: ${data?.[0]?.count || 0}`);
        }
    } catch (err) {
        console.log('⚠️  Could not check table status');
    }
    
    console.log('\n💡 Next steps after applying migration:');
    console.log('1. Verify table is created successfully');
    console.log('2. Build transformation script');
    console.log('3. Populate with existing AI response data');
}

applyMigration().catch(console.error);
