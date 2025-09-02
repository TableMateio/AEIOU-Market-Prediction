#!/usr/bin/env npx tsx

/**
 * Test different API endpoints and parameters for NewsAPI.ai
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

async function testDifferentEndpoints() {
    console.log('🔍 Testing Different NewsAPI.ai Endpoints and Parameters\n');
    
    const apiKey = process.env.NEWSAPIAI_API_KEY;
    if (!apiKey) {
        console.log('❌ API key not found');
        return;
    }
    
    // Test 1: Try recent articles first (should work with any plan)
    console.log('📅 Test 1: Recent articles (last 7 days)...');
    try {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const recentDateStr = recentDate.toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        
        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params: {
                resultType: 'articles',
                keyword: 'Apple',
                lang: 'eng',
                dateStart: recentDateStr,
                dateEnd: todayStr,
                articlesSortBy: 'relevance',
                includeArticleBody: true,
                articlesCount: 5,
                apiKey: apiKey
            },
            timeout: 15000
        });
        
        const articles = response.data?.articles?.results || [];
        const totalResults = response.data?.articles?.totalResults || 0;
        
        console.log(`   📊 Recent articles: ${articles.length} found (${totalResults} total)`);
        
        if (articles.length > 0) {
            console.log(`   ✅ Recent access works!`);
            const sample = articles[0];
            console.log(`   📰 Sample: "${sample.title}"`);
            console.log(`   📅 Date: ${sample.date}`);
        } else {
            console.log(`   ❌ No recent articles - API might have issues`);
        }
        
    } catch (error: any) {
        console.log(`   ❌ Recent test failed: ${error.message}`);
        if (error.response?.data) {
            console.log(`   📋 Error details:`, error.response.data);
        }
    }
    
    // Test 2: Try with different query format
    console.log('\n📅 Test 2: Historical with query object format...');
    try {
        const response = await axios.post('https://eventregistry.org/api/v1/article/getArticles', {
            resultType: 'articles',
            articlesSortBy: 'relevance',
            includeArticleBody: true,
            articlesCount: 5,
            query: {
                $query: {
                    $and: [
                        {
                            keyword: 'Apple',
                            lang: 'eng'
                        },
                        {
                            dateStart: '2024-01-01',
                            dateEnd: '2024-01-31'
                        }
                    ]
                }
            },
            apiKey: apiKey
        }, {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const articles = response.data?.articles?.results || [];
        console.log(`   📊 Query object format: ${articles.length} found`);
        
    } catch (error: any) {
        console.log(`   ❌ Query object format failed: ${error.message}`);
    }
    
    // Test 3: Try with concept search instead of keyword
    console.log('\n📅 Test 3: Historical with concept search...');
    try {
        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params: {
                resultType: 'articles',
                conceptUri: 'http://en.wikipedia.org/wiki/Apple_Inc.',
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
        
        console.log(`   📊 Concept search: ${articles.length} found (${totalResults} total)`);
        
        if (articles.length > 0) {
            console.log(`   ✅ Concept search works!`);
            const sample = articles[0];
            console.log(`   📰 Sample: "${sample.title}"`);
        }
        
    } catch (error: any) {
        console.log(`   ❌ Concept search failed: ${error.message}`);
    }
    
    // Test 4: Try newsapi.ai direct endpoint (not EventRegistry)
    console.log('\n📅 Test 4: Direct NewsAPI.ai endpoint...');
    try {
        const response = await axios.get('https://api.newsapi.ai/v1/search', {
            params: {
                q: 'Apple',
                from: '2024-01-01',
                to: '2024-01-31',
                language: 'en',
                sortBy: 'relevance',
                pageSize: 5,
                apiKey: apiKey
            },
            timeout: 15000
        });
        
        console.log(`   📊 Direct API response:`, response.data);
        
    } catch (error: any) {
        console.log(`   ❌ Direct API failed: ${error.message}`);
        if (error.response?.status === 404) {
            console.log(`   💡 Direct API endpoint might not exist - EventRegistry is likely correct`);
        }
    }
    
    // Test 5: Check plan status with different endpoint
    console.log('\n📅 Test 5: Check account status...');
    try {
        const response = await axios.get('https://eventregistry.org/api/v1/user/getUser', {
            params: {
                apiKey: apiKey
            },
            timeout: 10000
        });
        
        console.log(`   📊 User info:`, response.data);
        
    } catch (error: any) {
        console.log(`   ❌ User info failed: ${error.message}`);
    }
    
    console.log('\n🎯 Diagnosis:');
    console.log('If recent articles work but historical don\'t:');
    console.log('   - Plan activation might take 10-30 minutes');
    console.log('   - Try again in a few minutes');
    console.log('');
    console.log('If nothing works:');
    console.log('   - Check NewsAPI.ai dashboard for plan status');
    console.log('   - Verify API key is correct');
    console.log('   - Contact support if needed');
    console.log('');
    console.log('If recent works, we can start there and add historical later!');
}

testDifferentEndpoints();
