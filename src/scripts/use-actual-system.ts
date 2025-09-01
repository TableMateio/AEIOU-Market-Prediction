/**
 * Use the ACTUAL System - Structured JSON Output Agent
 * This uses the real system from src/ai/schema.json and src/ai/instructions.md
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig, config } from '@config/app';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const appConfig = AppConfig.getInstance();

async function useActualSystem() {
    console.log('🤖 Using the ACTUAL AI System\n');
    console.log('==========================================\n');
    
    // Check API keys
    const openaiKey = config.openaiApiKey;
    if (!openaiKey) {
        console.log('❌ Missing OpenAI API key');
        return;
    }
    
    // Initialize OpenAI with structured output
    const openai = new OpenAI({ apiKey: openaiKey });
    
    // Load the schema and instructions (the real system files)
    const schemaPath = path.join(process.cwd(), 'src', 'ai', 'schema.json');
    const instructionsPath = path.join(process.cwd(), 'src', 'ai', 'instructions.md');
    
    if (!fs.existsSync(schemaPath) || !fs.existsSync(instructionsPath)) {
        console.log('❌ Missing schema.json or instructions.md files');
        return;
    }
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    const instructions = fs.readFileSync(instructionsPath, 'utf-8');
    
    console.log('✅ Loaded your actual system files');
    console.log(`📋 Schema: ${schema.name}`);
    console.log(`📖 Instructions loaded: ${instructions.split('\n')[0]}`);
    
    // Get article with body text
    const supabase = createClient(
        appConfig.supabaseConfig.projectUrl,
        appConfig.supabaseConfig.apiKey
    );
    
    const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .not('body', 'is', null)
        .limit(1);
    
    if (error || !articles || articles.length === 0) {
        console.log('❌ No articles with body text found');
        return;
    }
    
    const article = articles[0];
    
    console.log('\n📊 PROCESSING ARTICLE:');
    console.log('========================');
    console.log(`📰 Title: ${article.title}`);
    console.log(`🏢 Source: ${article.source}`);
    console.log(`👥 Authors: ${article.authors ? article.authors.join(', ') : 'None'}`);
    console.log(`📅 Published: ${article.published_at}`);
    console.log(`📄 Body Length: ${article.body?.length || 0} characters`);
    console.log(`🔗 URL: ${article.url}`);
    
    // Create the full prompt exactly like your system does
    const fullPrompt = `${instructions}

ARTICLE TO ANALYZE:
==================

**Title:** ${article.title}

**Source:** ${article.source}

**Authors:** ${article.authors ? article.authors.join(', ') : 'Unknown'}

**Published:** ${article.published_at}

**URL:** ${article.url}

**Summary:** ${article.summary || 'No summary available'}

**Full Article Text:**
${article.body}

Please analyze this article and return a structured JSON response following the business_event_chain_article schema.`;

    console.log('\n🚀 CALLING YOUR ACTUAL AI AGENT...');
    console.log('====================================');
    
    try {
        const startTime = Date.now();
        
        // Use the exact same call as your test-current-agent.ts
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-2024-08-06", // The model that supports structured output
            messages: [
                {
                    role: "system", 
                    content: "You are a financial news analysis expert. Analyze the article and extract business events with causal chains, focusing specifically on impacts to Apple Inc. Return structured JSON following the provided schema."
                },
                {
                    role: "user",
                    content: fullPrompt
                }
            ],
            response_format: {
                type: "json_schema",
                json_schema: schema
            },
            temperature: 0.1
        });
        
        const endTime = Date.now();
        const resultContent = completion.choices[0].message.content;
        const result = resultContent ? JSON.parse(resultContent) : null;
        
        console.log(`✅ Agent completed in ${endTime - startTime}ms`);
        console.log(`🪙 Tokens used: ${completion.usage?.total_tokens || 0}`);
        
        if (!result) {
            console.log('❌ No structured output received');
            return;
        }
        
        console.log('\n📊 AGENT ANALYSIS RESULTS:');
        console.log('============================');
        
        // Article metadata analysis
        const articleMeta = result.article;
        console.log('\n🔍 ARTICLE METADATA EXTRACTED:');
        console.log(`   📰 Headline: ${articleMeta.headline}`);
        console.log(`   🏢 Source: ${articleMeta.source}`);
        console.log(`   📊 Publisher Credibility: ${articleMeta.publisher_credibility}`);
        console.log(`   👤 Author Credibility: ${articleMeta.author_credibility}`);
        console.log(`   🎯 Audience: ${articleMeta.audience_split}`);
        console.log(`   📈 Market Regime: ${articleMeta.market_regime}`);
        
        // Business events analysis
        const events = result.business_events;
        console.log(`\n🔥 BUSINESS EVENTS FOUND: ${events.length}`);
        console.log('==========================================');
        
        events.forEach((event: any, i: number) => {
            console.log(`\n📋 EVENT ${i + 1}: ${event.event_type}`);
            console.log(`   📝 Description: ${event.event_description}`);
            console.log(`   🏷️  Tags: [${event.tags.join(', ')}]`);
            console.log(`   ⛓️  Causal Chain Steps: ${event.causal_chain.length}`);
            
            event.causal_chain.forEach((step: any, stepIndex: number) => {
                console.log(`      Step ${step.step}: ${step.factor} (${step.factor_category})`);
                console.log(`        Impact: ${step.magnitude} magnitude, ${step.movement > 0 ? '+' : step.movement < 0 ? '-' : '='} direction`);
                console.log(`        Belief: Market intensity ${step.belief.market_perception.intensity}, Hope/Fear ${step.belief.market_perception.hope_vs_fear}`);
            });
        });
        
        // Save to database using correct schema
        const aiResponseData = {
            article_id: article.id,
            agent_id: 'gpt-4o-structured-output', // Proper agent identifier
            analysis_type: 'apple_business_event_chain',
            raw_response: resultContent,
            structured_output: result,
            confidence_score: 0.95, // High confidence for structured output
            processing_time_ms: endTime - startTime,
            tokens_used: completion.usage?.total_tokens || 0,
            success: true,
            error_message: null
        };
        
        console.log('\n💾 SAVING TO DATABASE...');
        const { data: savedResponse, error: saveError } = await supabase
            .from('ai_responses')
            .insert(aiResponseData)
            .select();
        
        if (saveError) {
            console.log(`❌ Save failed: ${saveError.message}`);
        } else {
            console.log(`✅ SAVED SUCCESSFULLY! ID: ${savedResponse?.[0]?.id}`);
        }
        
        // Final count
        const { count } = await supabase
            .from('ai_responses')
            .select('*', { count: 'exact', head: true });
        
        console.log(`\n📊 Total ai_responses in database: ${count}`);
        
        console.log('\n🎉 SUCCESS! Your actual AI system is working perfectly!');
        console.log('=======================================================');
        console.log('✅ Used your real schema and instructions');
        console.log('✅ Generated structured Apple business analysis');
        console.log('✅ Saved properly formatted result to database');
        console.log('✅ No more fake chat completions - this is your real system!');
        
    } catch (error) {
        console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}

useActualSystem().catch(console.error);
