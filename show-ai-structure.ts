/**
 * Show AI Response Structure for Table Design
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '@config/app';

async function showAIStructure() {
    console.log('🔍 Analyzing AI Response Structure for New Table Design\n');
    
    const supabase = createClient(
        AppConfig.getInstance().supabaseConfig.projectUrl,
        AppConfig.getInstance().supabaseConfig.apiKey
    );
    
    // Get one good AI response with structured data
    const { data: responses } = await supabase
        .from('ai_responses')
        .select(`
            id,
            article_id,
            structured_output,
            articles (
                title,
                source,
                published_at,
                url,
                authors,
                summary
            )
        `)
        .eq('success', true)
        .not('structured_output', 'is', null)
        .limit(1);
    
    if (!responses || responses.length === 0) {
        console.log('❌ No AI responses found');
        return;
    }
    
    const response = responses[0];
    const article = response.articles[0]; // Fix: articles is an array
    const aiData = response.structured_output;
    
    console.log('📰 ARTICLE METADATA:');
    console.log('===================');
    console.log(`Title: ${article.title}`);
    console.log(`Source: ${article.source}`);
    console.log(`Published: ${article.published_at}`);
    console.log(`URL: ${article.url}`);
    console.log(`Authors: ${article.authors}`);
    console.log(`Summary: ${article.summary?.substring(0, 100)}...`);
    
    console.log('\n🤖 AI RESPONSE STRUCTURE:');
    console.log('==========================');
    console.log(JSON.stringify(aiData, null, 2));
    
    console.log('\n📊 WHAT WE NEED TO FLATTEN:');
    console.log('============================');
    
    if (aiData?.business_events) {
        console.log(`Total Business Events: ${aiData.business_events.length}`);
        
        aiData.business_events.forEach((event: any, eventIndex: number) => {
            console.log(`\n--- BUSINESS EVENT ${eventIndex + 1} ---`);
            console.log(`Event Type: ${event.event_type}`);
            console.log(`Description: ${event.description}`);
            console.log(`Magnitude: ${event.magnitude}`);
            console.log(`Confidence: ${event.confidence}`);
            
            if (event.causal_chain && event.causal_chain.length > 0) {
                console.log(`\nCausal Chain Steps: ${event.causal_chain.length}`);
                
                event.causal_chain.forEach((step: any, stepIndex: number) => {
                    console.log(`  Step ${stepIndex + 1}:`);
                    console.log(`    Factor: ${step.factor}`);
                    console.log(`    Impact: ${step.impact_description}`);
                    console.log(`    Magnitude: ${step.magnitude}`);
                    console.log(`    Time Horizon: ${step.time_horizon}`);
                    console.log(`    Factor Synonyms: ${step.factor_synonyms?.join(', ')}`);
                });
            }
            
            if (event.belief) {
                console.log(`\nBelief Analysis:`);
                console.log(`  Market Perception: ${event.belief.market_perception?.narrative}`);
                console.log(`  AI Assessment: ${event.belief.ai_assessment?.rationale}`);
                console.log(`  Credibility Score: ${event.belief.credibility_factors?.overall_score}`);
            }
        });
    }
    
    console.log('\n💡 PROPOSED FLATTENING APPROACH:');
    console.log('=================================');
    console.log('Each CAUSAL CHAIN STEP becomes one row with:');
    console.log('- All article metadata (title, source, url, etc.)');
    console.log('- Business event info (event_type, description, magnitude)');
    console.log('- Causal step details (factor, impact, magnitude, time_horizon)');
    console.log('- Belief analysis (market_perception, ai_assessment, credibility)');
    console.log('- Positioning info (step_number, total_steps, event_number)');
}

showAIStructure().catch(console.error);
