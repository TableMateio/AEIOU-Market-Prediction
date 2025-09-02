#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

async function checkAiResponsesSchema() {
    const appConfig = AppConfig.getInstance();
    const supabase = createClient(
        appConfig.supabaseConfig.projectUrl,
        appConfig.supabaseConfig.apiKey
    );

    console.log('🔍 Checking ai_responses table schema...\n');

    // Get one record to see actual columns
    const { data: responses, error } = await supabase
        .from('ai_responses')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (!responses || responses.length === 0) {
        console.log('❌ No ai_responses found');
        return;
    }

    const response = responses[0];
    console.log('📋 ACTUAL COLUMNS IN AI_RESPONSES TABLE:');
    Object.keys(response).forEach(key => {
        const value = response[key];
        const type = typeof value;
        const preview = type === 'string' ? value.substring(0, 50) + '...' : value;
        console.log(`   ${key}: ${type} = ${preview}`);
    });

    console.log('\n🔍 SAMPLE RECORD:');
    console.log(JSON.stringify(response, null, 2));
}

checkAiResponsesSchema();
