/**
 * Check Migration Status
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '@config/app';
import fs from 'fs';

async function checkStatus() {
    console.log('🔍 Checking Business Factors Migration Status\n');
    
    const supabase = createClient(
        AppConfig.getInstance().supabaseConfig.projectUrl,
        AppConfig.getInstance().supabaseConfig.apiKey
    );
    
    // Read the migration file
    const migrationSQL = fs.readFileSync('supabase/migrations/20250831_business_factors.sql', 'utf-8');
    
    console.log('📄 Migration ready to apply:');
    console.log('- Creates business_factors table');
    console.log('- 53 numeric columns for ML');
    console.log('- JSON arrays for flexible features');
    console.log('- Indexes for performance\n');
    
    // Check if table exists
    try {
        const { error } = await supabase
            .from('business_factors')
            .select('id')
            .limit(1);
        
        if (error?.message.includes('relation "business_factors" does not exist')) {
            console.log('❌ business_factors table does not exist yet\n');
            
            const projectUrl = AppConfig.getInstance().supabaseConfig.projectUrl.replace('/rest/v1', '');
            console.log('🎯 NEXT STEPS:');
            console.log('==============');
            console.log(`1. Go to: ${projectUrl}/sql`);
            console.log('2. Copy/paste the SQL from: supabase/migrations/20250831_business_factors.sql');
            console.log('3. Run the migration');
            console.log('4. Come back to build the transformation script\n');
            
        } else if (error) {
            console.log('❌ Error:', error.message);
        } else {
            console.log('✅ business_factors table exists!');
            console.log('Ready to build transformation script\n');
        }
    } catch (err) {
        console.log('⚠️  Could not check table status');
    }
}

checkStatus().catch(console.error);
