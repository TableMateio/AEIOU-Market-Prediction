/**
 * Show ML-Ready Example Row
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '@config/app';

async function showMLExample() {
    console.log('🤖 ML-Ready Business Factor Example\n');
    
    const supabase = createClient(
        AppConfig.getInstance().supabaseConfig.projectUrl,
        AppConfig.getInstance().supabaseConfig.apiKey
    );
    
    // Get one AI response
    const { data: response } = await supabase
        .from('ai_responses')
        .select('*, articles(*)')
        .eq('success', true)
        .not('structured_output', 'is', null)
        .limit(1)
        .single();
    
    if (!response) {
        console.log('❌ No data found');
        return;
    }
    
    const article = response.articles;
    const aiData = response.structured_output;
    
    if (aiData?.business_events && aiData.business_events.length > 0) {
        const event = aiData.business_events[0];
        const step = event.causal_chain[0];
        
        console.log('📊 EXAMPLE FLATTENED ROW FOR ML:');
        console.log('================================\n');
        
        // This is what ONE row would look like
        const flattenedRow = {
            // IDs and relationships
            business_factor_id: 'uuid-generated',
            ai_response_id: response.id,
            article_id: article.id,
            business_event_index: 0,
            causal_step_index: 0,
            total_steps_in_chain: event.causal_chain.length,
            
            // Article metadata (features)
            article_source: article.source,
            article_published_year: new Date(article.published_at).getFullYear(),
            article_published_month: new Date(article.published_at).getMonth() + 1,
            article_published_day_of_week: new Date(article.published_at).getDay(),
            
            // Business factor details (main features)
            factor_name: step.factor,
            factor_category: step.factor_category,
            factor_unit: step.factor_unit,
            factor_movement: step.movement, // 1 or -1
            factor_magnitude: step.magnitude, // 0.15
            factor_raw_value: step.raw_value,
            
            // Event context
            event_type: event.event_type,
            event_scope: event.scope,
            event_trigger: event.trigger,
            event_orientation: event.orientation,
            
            // Timing features
            about_time_days: step.about_time_days,
            effect_horizon_days: step.effect_horizon_days,
            time_horizon_days: event.time_horizon_days,
            
            // AI assessment features (0-1 numeric)
            ai_execution_risk: step.belief.ai_assessment.execution_risk,
            ai_competitive_risk: step.belief.ai_assessment.competitive_risk,
            ai_timeline_realism: step.belief.ai_assessment.timeline_realism,
            ai_fundamental_strength: step.belief.ai_assessment.fundamental_strength,
            ai_business_impact_likelihood: step.belief.ai_assessment.business_impact_likelihood,
            
            // Market perception features (0-1 numeric)
            market_intensity: step.belief.market_perception.intensity,
            market_hope_vs_fear: step.belief.market_perception.hope_vs_fear,
            market_narrative_strength: step.belief.market_perception.narrative_strength,
            market_consensus_vs_division: step.belief.market_perception.consensus_vs_division,
            market_surprise_vs_anticipated: step.belief.market_perception.surprise_vs_anticipated,
            
            // Perception gap features
            perception_optimism_bias: step.belief.perception_gap.optimism_bias,
            perception_risk_awareness: step.belief.perception_gap.risk_awareness,
            perception_correction_potential: step.belief.perception_gap.correction_potential,
            
            // Confidence features
            causal_certainty: step.causal_certainty,
            logical_directness: step.logical_directness,
            regime_alignment: step.regime_alignment,
            reframing_potential: step.reframing_potential,
            narrative_disruption: step.narrative_disruption,
            market_consensus_on_causality: step.market_consensus_on_causality,
            
            // Evidence features
            evidence_level_implied: step.evidence_level === 'implied' ? 1 : 0,
            evidence_level_stated: step.evidence_level === 'stated' ? 1 : 0,
            evidence_source_article: step.evidence_source === 'article_text' ? 1 : 0,
            
            // Arrays for ML (these can work but need encoding)
            factor_synonyms: step.factor_synonyms, // ["product_innovation", "category_expansion"]
            event_tags: event.tags, // ["Apple", "augmented reality", "autonomous vehicles"]
            cognitive_biases: step.belief.market_perception.cognitive_biases, // ["optimism_bias", "availability_heuristic"]
            emotional_profile: step.belief.market_perception.emotional_profile, // ["anticipation", "optimism"]
            
            // Target variable (what we want to predict)
            // stock_price_change_1d: null, // To be filled from stock data
            // stock_price_change_7d: null,
            // stock_price_change_30d: null
        };
        
        console.log('🔢 NUMERIC FEATURES (ready for ML):');
        Object.entries(flattenedRow).forEach(([key, value]) => {
            if (typeof value === 'number') {
                console.log(`   ${key}: ${value}`);
            }
        });
        
        console.log('\n📊 CATEGORICAL FEATURES (need encoding):');
        Object.entries(flattenedRow).forEach(([key, value]) => {
            if (typeof value === 'string' && !key.includes('_id')) {
                console.log(`   ${key}: "${value}"`);
            }
        });
        
        console.log('\n📋 ARRAY FEATURES (need special handling):');
        Object.entries(flattenedRow).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                console.log(`   ${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
            }
        });
        
        console.log('\n💡 ML ENCODING OPTIONS FOR ARRAYS:');
        console.log('===================================');
        console.log('1. **One-Hot Encoding**: Create binary columns for each unique value');
        console.log('   - factor_synonym_product_innovation: 1');
        console.log('   - factor_synonym_category_expansion: 1');
        console.log('   - cognitive_bias_optimism_bias: 1');
        console.log('   - emotional_anticipation: 1, etc.');
        console.log('');
        console.log('2. **Count Encoding**: Count occurrences');
        console.log('   - num_factor_synonyms: 2');
        console.log('   - num_cognitive_biases: 2');
        console.log('   - num_emotional_states: 2');
        console.log('');
        console.log('3. **Embedding/Vector**: Convert to dense vectors (advanced)');
        console.log('');
        console.log('4. **Keep as JSON**: Some ML libraries can handle JSON features');
        
        console.log('\n🎯 RECOMMENDATION:');
        console.log('==================');
        console.log('• Store arrays as JSON in database');
        console.log('• Create one-hot encoded columns during ML preprocessing');
        console.log('• This gives flexibility - can always add more encoding later');
        console.log('• Deep Forest can handle mixed data types well');
    }
}

showMLExample().catch(console.error);
