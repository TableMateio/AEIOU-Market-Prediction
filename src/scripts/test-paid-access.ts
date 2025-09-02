#!/usr/bin/env npx tsx

/**
 * Test paid NewsAPI.ai access with historical searches
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

async function testPaidAccess() {
    console.log('🔑 Testing Paid NewsAPI.ai Access\n');
    
    const apiKey = process.env.NEWSAPIAI_API_KEY;
    if (!apiKey) {
        console.log('❌ API key not found');
        return;
    }
    
    console.log('🔍 Testing historical access with simple Apple search...\n');
    
    // Test 1: Simple Apple search for 2024
    try {
        console.log('📅 Test 1: Apple articles from 2024...');
        
        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params: {
                resultType: 'articles',
                keyword: 'Apple',
                lang: 'eng',
                dateStart: '2024-01-01',
                dateEnd: '2024-01-31',
                articlesSortBy: 'relevance',
                includeArticleBody: true,
                articlesCount: 5,
                apiKey: apiKey
            },
            timeout: 15000
        });
        
        const articles = response.data?.articles?.results || [];
        const totalResults = response.data?.articles?.totalResults || 0;
        
        console.log(`   📊 Found: ${articles.length} articles (${totalResults} total available)`);
        
        if (articles.length > 0) {
            const sample = articles[0];
            console.log(`   ✅ SUCCESS! Historical access confirmed`);
            console.log(`   📰 Sample: "${sample.title}"`);
            console.log(`   📅 Date: ${sample.date}`);
            console.log(`   🌐 Source: ${sample.source?.title || 'Unknown'}`);
            console.log(`   📄 Content: ${sample.body ? `${sample.body.length} chars` : 'No content'}`);
        } else {
            console.log(`   ❌ No articles found - this might indicate an issue`);
        }
        
    } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        if (error.response?.status === 401) {
            console.log(`   💡 401 Unauthorized - API key might not be activated yet`);
        } else if (error.response?.status === 402) {
            console.log(`   💡 402 Payment Required - Plan might not be active yet`);
        } else if (error.response?.data) {
            console.log(`   📋 Response data:`, error.response.data);
        }
    }
    
    // Test 2: Different year
    try {
        console.log('\n📅 Test 2: Apple articles from 2023...');
        
        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params: {
                resultType: 'articles',
                keyword: 'Apple',
                lang: 'eng',
                dateStart: '2023-09-01',
                dateEnd: '2023-09-15',
                articlesSortBy: 'relevance',
                includeArticleBody: true,
                articlesCount: 3,
                apiKey: apiKey
            },
            timeout: 15000
        });
        
        const articles = response.data?.articles?.results || [];
        const totalResults = response.data?.articles?.totalResults || 0;
        
        console.log(`   📊 Found: ${articles.length} articles (${totalResults} total available)`);
        
        if (articles.length > 0) {
            console.log(`   ✅ 2023 access confirmed!`);
            const sample = articles[0];
            console.log(`   📰 Sample: "${sample.title}"`);
            console.log(`   📅 Date: ${sample.date}`);
        }
        
    } catch (error: any) {
        console.log(`   ❌ 2023 test failed: ${error.message}`);
    }
    
    // Test 3: Account info
    try {
        console.log('\n🔍 Test 3: Checking account status...');
        
        const response = await axios.get('https://eventregistry.org/api/v1/info', {
            params: {
                apiKey: apiKey
            },
            timeout: 10000
        });
        
        if (response.data) {
            console.log(`   📋 Account info:`, JSON.stringify(response.data, null, 2));
        }
        
    } catch (error: any) {
        console.log(`   ❌ Account info failed: ${error.message}`);
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('If historical access is confirmed:');
    console.log('   1. Run test collection: npx tsx src/scripts/production-historical-collection.ts test');
    console.log('   2. Then full collection: npx tsx src/scripts/production-historical-collection.ts full');
    console.log('');
    console.log('If still getting errors:');
    console.log('   - Wait 10-15 minutes for plan activation');
    console.log('   - Check NewsAPI.ai dashboard for plan status');
    console.log('   - Contact support if issues persist');
}

testPaidAccess();
