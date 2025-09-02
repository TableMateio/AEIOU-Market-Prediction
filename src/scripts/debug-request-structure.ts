#!/usr/bin/env npx tsx

/**
 * Debug the actual request structure being sent to the API
 */

import 'dotenv/config';
import axios from 'axios';

async function debugRequestStructure() {
    console.log('🔍 DEBUGGING REQUEST STRUCTURE');
    console.log('='.repeat(50));
    console.log('');

    const apiKey = process.env.NEWSAPIAI_API_KEY || '';
    const baseUrl = 'https://eventregistry.org/api/v1';

    // Build request exactly like the service
    const dateFrom = '2021-01-15';
    const dateTo = '2021-01-17';

    const thirdAndCondition: any = {
        "lang": "eng"
    };

    if (dateFrom && dateTo) {
        thirdAndCondition["dateStart"] = dateFrom;
        thirdAndCondition["dateEnd"] = dateTo;
    }

    const requestData: any = {
        query: {
            "$query": {
                "$and": [
                    {
                        "conceptUri": "http://en.wikipedia.org/wiki/Apple_Inc."
                    },
                    {
                        "locationUri": "http://en.wikipedia.org/wiki/United_States"
                    },
                    thirdAndCondition
                ]
            },
            "$filter": {
                "forceMaxDataTimeWindow": "31",
                "startSourceRankPercentile": 0,
                "endSourceRankPercentile": 50
            }
        },
        resultType: "articles",
        articlesSortBy: "socialScore",
        articlesCount: 5,
        includeArticleBody: true,
        includeArticleConcepts: true,
        includeArticleCategories: true,
        apiKey: apiKey
    };

    console.log('📋 REQUEST STRUCTURE (SERVICE VERSION):');
    console.log(JSON.stringify(requestData, null, 2));
    console.log('');

    // Compare with working version
    const workingRequest = {
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
                        "dateStart": "2021-01-15",
                        "dateEnd": "2021-01-17",
                        "lang": "eng"
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
        apiKey: apiKey
    };

    console.log('📋 REQUEST STRUCTURE (WORKING VERSION):');
    console.log(JSON.stringify(workingRequest, null, 2));
    console.log('');

    console.log('🔍 KEY DIFFERENCES:');
    console.log('   1. Service has: "forceMaxDataTimeWindow": "31"');
    console.log('   2. Service has: articlesCount, includeArticleBody, etc.');
    console.log('   3. Both should have same $query structure');
    console.log('');

    // Test the working version
    try {
        console.log('🧪 Testing WORKING version...');
        const response = await axios.post(`${baseUrl}/article/getArticles`, workingRequest, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const articles = response.data?.articles?.results || [];
        console.log(`✅ Working version: ${articles.length} articles`);

    } catch (error: any) {
        console.log(`❌ Working version failed: ${error.message}`);
    }

    // Test the service version
    try {
        console.log('🧪 Testing SERVICE version...');
        const response = await axios.post(`${baseUrl}/article/getArticles`, requestData, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const articles = response.data?.articles?.results || [];
        console.log(`✅ Service version: ${articles.length} articles`);

    } catch (error: any) {
        console.log(`❌ Service version failed: ${error.message}`);
        if (error.response?.data) {
            console.log('API Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

debugRequestStructure();
