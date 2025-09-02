#!/usr/bin/env npx tsx

/**
 * Force Delete All Articles
 * 
 * Nuclear option - delete ALL articles in the database to start fresh
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { createLogger } from '../utils/logger';

const logger = createLogger('ForceDelete');

async function forceDeleteAll() {
    logger.info('🚨 FORCE DELETE ALL ARTICLES...');

    const config = AppConfig.getInstance();
    const supabase = createClient(
        config.supabaseConfig.projectUrl,
        config.supabaseConfig.apiKey
    );

    // Count current articles
    const { data: currentCount, error: countError } = await supabase
        .from('articles')
        .select('id', { count: 'exact' });

    if (countError) {
        logger.error('❌ Error counting articles:', countError);
        return;
    }

    console.log(`📊 Current articles in database: ${currentCount?.length || 0}`);

    const args = process.argv.slice(2);
    const execute = args.includes('--execute');

    if (!execute) {
        console.log(`\n⚠️  This will DELETE ALL ${currentCount?.length || 0} articles permanently!`);
        console.log(`   Add --execute flag to proceed: npx tsx src/scripts/force-delete-all-articles.ts --execute`);
        return;
    }

    console.log(`\n🚨 EXECUTING NUCLEAR DELETE...`);

    try {
        // Delete all AI responses first (to avoid foreign key constraints)
        const { error: aiError } = await supabase
            .from('ai_responses')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID)

        if (aiError) {
            logger.warn('⚠️ Error deleting AI responses:', aiError);
        } else {
            console.log('✅ Deleted all AI responses');
        }

        // Delete all articles
        const { error: deleteError } = await supabase
            .from('articles')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID)

        if (deleteError) {
            logger.error('❌ Error deleting articles:', deleteError);
            throw deleteError;
        }

        console.log('✅ Deleted all articles');

        // Verify deletion
        const { data: finalCount, error: finalError } = await supabase
            .from('articles')
            .select('id', { count: 'exact' });

        if (!finalError) {
            console.log(`\n📊 FINAL RESULT:`);
            console.log(`   Articles remaining: ${finalCount?.length || 0}`);
            console.log(`   Database is now clean! 🎉`);
        }

    } catch (error: any) {
        logger.error('❌ Force delete failed:', error.message);
        throw error;
    }
}

// Run the force delete
forceDeleteAll().catch(error => {
    console.error('❌ Force delete failed:', error.message);
    process.exit(1);
});
