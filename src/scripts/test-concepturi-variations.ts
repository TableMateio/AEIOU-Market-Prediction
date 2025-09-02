#!/usr/bin/env npx tsx

/**
 * Test ConceptUri Variations
 * 
 * Test different ways to structure the conceptUri request to NewsAPI.ai
 * to find the correct format that actually filters for Apple articles
 */

import 'dotenv/config';
import axios from 'axios';
import { AppConfig } from '../config/app';
import { createLogger } from '../utils/logger';

const logger = createLogger('TestConceptUri');

async function testConceptUriVariations() {
    logger.info('🧪 Testing ConceptUri Variations...');

    const config = AppConfig.getInstance();
    const apiKey = process.env.NEWSAPIAI_API_KEY;
    const baseUrl = 'https://eventregistry.org/api/v1';

    // Test 1: Current approach (what we're using)
    console.log('\n🧪 TEST 1: Current Approach (Nested $and structure)');
    console.log('─'.repeat(60));
    
    const test1Request = {
        query: {
            "$query": {
                "$and": [
                    {
                        "conceptUri": "http://en.wikipedia.org/wiki/Apple_Inc."
                    },
                    {
                        "locationUri": "http://en.wikipedia.org/wiki/United_States"
                    },
                    {
                        "lang": "eng",
                        "dateStart": "2024-08-01",
                        "dateEnd": "2024-08-03"
                    }
                ]
            },
            "$filter": {
                "startSourceRankPercentile": 0,
                "endSourceRankPercentile": 50
            }
        },
        resultType: "articles",
        articlesSortBy: "socialScore",
        articlesCount: 3,
        includeArticleBody: true,
        apiKey: apiKey
    };

    await testRequest("Current Approach", test1Request);

    // Test 2: Simplified conceptUri only
    console.log('\n🧪 TEST 2: Simplified ConceptUri Only');
    console.log('─'.repeat(60));
    
    const test2Request = {
        query: {
            "$query": {
                "conceptUri": "http://en.wikipedia.org/wiki/Apple_Inc.",
                "lang": "eng",
                "dateStart": "2024-08-01",
                "dateEnd": "2024-08-03"
            }
        },
        resultType: "articles",
        articlesSortBy: "socialScore",
        articlesCount: 3,
        includeArticleBody: true,
        apiKey: apiKey
    };

    await testRequest("Simplified ConceptUri", test2Request);

    // Test 3: Different conceptUri format (maybe needs quotes?)
    console.log('\n🧪 TEST 3: Alternative ConceptUri Format');
    console.log('─'.repeat(60));
    
    const test3Request = {
        query: {
            "$query": {
                "$and": [
                    {
                        "conceptUri": ["http://en.wikipedia.org/wiki/Apple_Inc."]
                    },
                    {
                        "lang": "eng",
                        "dateStart": "2024-08-01",
                        "dateEnd": "2024-08-03"
                    }
                ]
            }
        },
        resultType: "articles",
        articlesSortBy: "socialScore",
        articlesCount: 3,
        includeArticleBody: true,
        apiKey: apiKey
    };

    await testRequest("Array ConceptUri Format", test3Request);

    // Test 4: Using keyword search instead (as fallback)
    console.log('\n🧪 TEST 4: Keyword Search Fallback');
    console.log('─'.repeat(60));
    
    const test4Request = {
        query: {
            "$query": {
                "$and": [
                    {
                        "keyword": "Apple Inc"
                    },
                    {
                        "lang": "eng",
                        "dateStart": "2024-08-01",
                        "dateEnd": "2024-08-03"
                    }
                ]
            }
        },
        resultType: "articles",
        articlesSortBy: "socialScore",
        articlesCount: 3,
        includeArticleBody: true,
        apiKey: apiKey
    };

    await testRequest("Keyword Search", test4Request);
}

async function testRequest(testName: string, requestData: any) {
    try {
        console.log(`📋 Testing: ${testName}`);
        console.log(`🔧 Request structure:`);
        console.log(JSON.stringify(requestData, null, 2));

        const response = await axios.post(`https://eventregistry.org/api/v1/article/getArticles`, requestData, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const articles = response.data?.articles?.results || [];
        const totalResults = response.data?.articles?.totalResults || 0;

        console.log(`📊 Results: ${articles.length} articles (${totalResults} total available)`);

        // Analyze Apple relevance
        let appleCount = 0;
        articles.forEach((article: any, i: number) => {
            const title = (article.title || '').toLowerCase();
            const isAppleRelevant = title.includes('apple') || title.includes('iphone') || 
                                  title.includes('ios') || title.includes('ipad') || 
                                  title.includes('mac') || title.includes('aapl');
            
            if (isAppleRelevant) appleCount++;

            const relevanceTag = isAppleRelevant ? '[APPLE]' : '[OTHER]';
            console.log(`   ${i + 1}. ${relevanceTag} ${article.title?.substring(0, 60)}...`);
        });

        const applePercent = Math.round((appleCount / articles.length) * 100);
        console.log(`🎯 Apple Relevance: ${appleCount}/${articles.length} (${applePercent}%)`);

        if (applePercent >= 80) {
            console.log(`✅ GOOD: High Apple relevance!`);
        } else if (applePercent >= 50) {
            console.log(`⚠️  MODERATE: Some Apple relevance`);
        } else {
            console.log(`❌ POOR: Low Apple relevance`);
        }

    } catch (error: any) {
        console.log(`❌ ${testName} failed:`, error.message);
        if (error.response?.data) {
            console.log('API Error Response:', error.response.data);
        }
    }
}

// Run the tests
testConceptUriVariations();
