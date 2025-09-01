/**
 * Apply Business Tables Migration Directly
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '@config/app';
import fs from 'fs';
import path from 'path';

async function applyMigration() {
    console.log('🚀 Applying Business Tables Migration\n');
    
    const supabase = createClient(
        AppConfig.getInstance().supabaseConfig.projectUrl,
        AppConfig.getInstance().supabaseConfig.apiKey
    );
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/002_business_tables.sql');
    
    try {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        
        console.log('📄 Migration SQL loaded');
        console.log('📊 Creating business_events and business_factors tables...\n');
        
        // Split SQL into individual statements
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`🔄 Executing ${statements.length} SQL statements...\n`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            if (statement.length < 10) continue; // Skip very short statements
            
            try {
                console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
                
                // Try to execute via a custom function if it exists
                const { error } = await supabase.rpc('execute_sql', { 
                    query: statement + ';'
                });
                
                if (error) {
                    console.log(`   ❌ Error: ${error.message}`);
                    
                    // For CREATE TABLE statements, this might be expected if table exists
                    if (statement.includes('CREATE TABLE') && error.message.includes('already exists')) {
                        console.log(`   ✅ Table already exists (OK)`);
                    } else {
                        console.log(`   ⚠️  Continuing with next statement...`);
                    }
                } else {
                    console.log(`   ✅ Success`);
                }
                
            } catch (err) {
                console.log(`   ❌ Statement failed: ${err}`);
            }
        }
        
        console.log('\n🔍 Verifying tables...');
        
        // Check if tables exist by trying to select from them
        try {
            const { error: eventsError } = await supabase
                .from('business_events')
                .select('id')
                .limit(1);
                
            const { error: factorsError } = await supabase
                .from('business_factors')
                .select('id')
                .limit(1);
                
            if (!eventsError && !factorsError) {
                console.log('🎉 SUCCESS: Both tables created and accessible!');
                console.log('\n📊 Table Structure:');
                console.log('   📋 business_events: One row per business event');
                console.log('   🧪 business_factors: One row per causal step');
                console.log('   🔗 Relationship: business_events → business_factors (1:many)');
                console.log('\n✅ Ready for transformation script!');
            } else {
                console.log('⚠️  Tables may not be fully accessible:');
                if (eventsError) console.log(`   business_events: ${eventsError.message}`);
                if (factorsError) console.log(`   business_factors: ${factorsError.message}`);
            }
            
        } catch (verificationError) {
            console.log('❌ Could not verify tables:', verificationError);
        }
        
    } catch (error) {
        console.log('❌ Migration failed:', error);
        
        console.log('\n💡 ALTERNATIVE APPROACH:');
        console.log('========================');
        console.log('If automated migration fails, you can:');
        console.log('1. Copy the SQL from: src/database/migrations/002_business_tables.sql');
        console.log('2. Run it in Supabase SQL Editor manually');
        console.log('3. Then proceed with transformation script');
    }
}

applyMigration().catch(console.error);
