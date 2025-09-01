/**
 * Check AI Response Structure
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '@config/app';

async function checkStructure() {
    const supabase = createClient(
        AppConfig.getInstance().supabaseConfig.projectUrl,
        AppConfig.getInstance().supabaseConfig.apiKey
    );
    
    // Get one AI response with article data
    const { data: responses } = await supabase
        .from('ai_responses')
        .select('*')
        .eq('success', true)
        .not('structured_output', 'is', null)
        .limit(3);
    
    console.log('📊 AI Responses found:', responses?.length);
    
    if (responses && responses.length > 0) {
        const response = responses[0];
        console.log('\n🔍 First Response Structure:');
        console.log('Keys:', Object.keys(response));
        console.log('Article ID:', response.article_id);
        
        // Get the actual article separately
        const { data: article } = await supabase
            .from('articles')
            .select('*')
            .eq('id', response.article_id)
            .single();
        
        console.log('\n📰 Article Data:');
        console.log('Title:', article?.title);
        console.log('Source:', article?.source);
        console.log('Published:', article?.published_at);
        
        console.log('\n🤖 AI Structured Output:');
        const structured = response.structured_output;
        if (structured) {
            console.log('Business Events:', structured.business_events?.length || 0);
            
            if (structured.business_events && structured.business_events.length > 0) {
                const firstEvent = structured.business_events[0];
                console.log('\nFirst Business Event:');
                console.log(JSON.stringify(firstEvent, null, 2));
            }
        }
    }
}

checkStructure().catch(console.error);
