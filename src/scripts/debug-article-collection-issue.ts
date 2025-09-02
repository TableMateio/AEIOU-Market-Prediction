#!/usr/bin/env npx tsx

/**
 * Debug Article Collection Issue
 * 
 * Investigate what went wrong with article collection:
 * - Why are articles from 2021-2022 instead of 2024-2025?
 * - Which collection script was actually used?
 * - Are articles Apple-relevant?
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { createLogger } from '../utils/logger';

const logger = createLogger('DebugCollection');

async function debugCollectionIssue() {
    logger.info('🔍 Debugging Article Collection Issue...');

    const config = AppConfig.getInstance();
    const supabase = createClient(
        config.supabaseConfig.projectUrl,
        config.supabaseConfig.apiKey
    );

    // Check date distribution
    const { data: dateStats, error: dateError } = await supabase
        .from('articles')
        .select('published_at')
        .order('published_at', { ascending: true });

    if (dateError) {
        logger.error('❌ Error fetching dates:', dateError);
        return;
    }

    // Analyze date distribution
    const dates = dateStats.map(a => new Date(a.published_at));
    const years = dates.map(d => d.getFullYear());
    const yearCounts = years.reduce((acc: any, year) => {
        acc[year] = (acc[year] || 0) + 1;
        return acc;
    }, {});

    console.log('\n📅 DATE DISTRIBUTION ANALYSIS:');
    console.log('='.repeat(50));
    Object.entries(yearCounts)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([year, count]) => {
            const percentage = Math.round((count as number / dates.length) * 100);
            const bar = '█'.repeat(Math.floor(percentage / 2));
            console.log(`   ${year}: ${count} articles (${percentage}%) ${bar}`);
        });

    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
    console.log(`\n   📊 Range: ${earliest.toISOString().split('T')[0]} to ${latest.toISOString().split('T')[0]}`);
    console.log(`   📊 Total articles: ${dates.length}`);

    // Check collection metadata
    const { data: metaData, error: metaError } = await supabase
        .from('articles')
        .select('data_source, search_criteria, collection_batch, search_name')
        .limit(10);

    if (!metaError && metaData) {
        console.log('\n🔍 COLLECTION METADATA ANALYSIS:');
        console.log('='.repeat(50));

        const sources = [...new Set(metaData.map(a => a.data_source))];
        const batches = [...new Set(metaData.map(a => a.collection_batch).filter(Boolean))];
        const searchNames = [...new Set(metaData.map(a => a.search_name).filter(Boolean))];

        console.log(`   📊 Data sources: ${sources.join(', ')}`);
        console.log(`   📊 Collection batches: ${batches.length > 0 ? batches.join(', ') : 'None'}`);
        console.log(`   📊 Search names: ${searchNames.length > 0 ? searchNames.join(', ') : 'None'}`);
    }

    // Check Apple relevance
    const { data: sampleArticles, error: sampleError } = await supabase
        .from('articles')
        .select('title, body, published_at')
        .order('published_at', { ascending: false })
        .limit(20);

    let appleCount = 0;
    let tangentialCount = 0;
    let irrelevantCount = 0;

    if (!sampleError && sampleArticles) {
        console.log('\n🍎 APPLE RELEVANCE ANALYSIS:');
        console.log('='.repeat(50));

        sampleArticles.forEach((article, i) => {
            const title = article.title?.toLowerCase() || '';
            const body = article.body?.toLowerCase() || '';
            const date = new Date(article.published_at).toISOString().split('T')[0];

            let relevance = 'IRRELEVANT';
            if (title.includes('apple') || body.includes('apple inc')) {
                relevance = 'APPLE';
                appleCount++;
            } else if (title.includes('tech') || title.includes('iphone') || title.includes('ios') || body.includes('cupertino')) {
                relevance = 'TANGENTIAL';
                tangentialCount++;
            } else {
                irrelevantCount++;
            }

            console.log(`   ${i + 1}. [${date}] [${relevance}] ${article.title?.substring(0, 70)}...`);
        });

        console.log(`\n   📊 Apple-relevant: ${appleCount}/20 (${Math.round(appleCount / 20 * 100)}%)`);
        console.log(`   📊 Tangentially related: ${tangentialCount}/20 (${Math.round(tangentialCount / 20 * 100)}%)`);
        console.log(`   📊 Completely irrelevant: ${irrelevantCount}/20 (${Math.round(irrelevantCount / 20 * 100)}%)`);
    }

    // Check what the 5 processed articles were
    console.log('\n🤖 AI-PROCESSED ARTICLES CHECK:');
    console.log('='.repeat(50));

    const { data: processedArticles, error: processedError } = await supabase
        .from('articles')
        .select('id, title, published_at, data_source')
        .in('id', [
            '6eee580a-d4db-49c9-8fd2-ecec3f760531',
            '6db8b4fd-f7c9-4b2a-9e58-004e44a0554b',
            '9384383c-9cd1-4759-8207-637412a5bfa7',
            'c804c7b2-781b-470f-922c-f211b7bf9656',
            '0565111b-bf0f-4a16-8951-3d9540aa91ec'
        ]);

    if (!processedError && processedArticles) {
        console.log('   🔍 The 5 articles we just processed:');
        processedArticles.forEach((article, i) => {
            const date = new Date(article.published_at).toISOString().split('T')[0];
            const title = article.title?.substring(0, 60) || 'No title';
            console.log(`      ${i + 1}. [${date}] [${article.data_source}] ${title}...`);
        });
    }

    // RECOMMENDATIONS
    console.log('\n💡 DIAGNOSIS & RECOMMENDATIONS:');
    console.log('='.repeat(50));

    const currentYear = new Date().getFullYear();
    const hasRecentArticles = years.some(y => y >= currentYear - 1);
    const hasAppleRelevance = (sampleArticles ? appleCount > 5 : false); // More than 25% Apple relevant

    if (!hasRecentArticles) {
        console.log('   🚨 CRITICAL: Articles are too old (mostly 2021-2022)');
        console.log('      → Date filtering completely failed');
        console.log('      → Need to re-run collection with proper date filters');
    }

    if (!hasAppleRelevance) {
        console.log('   🚨 CRITICAL: Articles are not Apple-relevant');
        console.log('      → Entity-based filtering (conceptUri) was not used');
        console.log('      → Need to use smart-collection-entity.ts with conceptUri');
    }

    console.log('\n🔧 IMMEDIATE ACTIONS NEEDED:');
    console.log('   1. Delete current irrelevant articles');
    console.log('   2. Run smart-collection-entity.ts with proper date range (2024-2025)');
    console.log('   3. Verify conceptUri filtering is working');
    console.log('   4. Test with small batch first');

    return {
        dateIssue: !hasRecentArticles,
        relevanceIssue: !hasAppleRelevance,
        totalArticles: dates.length,
        yearDistribution: yearCounts,
        appleRelevance: appleCount / 20
    };
}

// Run the debug
debugCollectionIssue().catch(error => {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
});
