#!/usr/bin/env npx tsx

/**
 * Raw NewsAPI.ai test using direct HTTP requests
 */

import { config } from 'dotenv';
import axios from 'axios';

// Load environment variables
config();

async function testNewsApiAiRaw() {
    console.log('🧪 Testing NewsAPI.ai (EventRegistry) directly...');

    try {
        // Get API key directly from environment
        const apiKey = process.env.NEWSAPIAI_API_KEY;
        console.log('🔍 API Key check:', apiKey ? `Found: ${apiKey.substring(0, 8)}...` : 'NOT FOUND');

        if (!apiKey) {
            console.log('❌ NEWSAPIAI_API_KEY not found in environment');
            console.log('Available environment variables with "API":',
                Object.keys(process.env).filter(key => key.includes('API')));
            return;
        }

        console.log('📡 Making direct request to EventRegistry...');

        // Direct API call to EventRegistry (NewsAPI.ai backend)
        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params: {
                resultType: 'articles',
                keyword: 'Apple',
                lang: 'eng',
                articlesSortBy: 'date',
                includeArticleBody: true,
                includeArticleConcepts: true,
                includeArticleCategories: true,
                articlesCount: 5,
                apiKey: apiKey
            },
            timeout: 30000
        });

        console.log('📊 Response Status:', response.status);
        console.log('📊 Response Headers:', response.headers['content-type']);

        if (response.status !== 200) {
            console.log('❌ HTTP Error:', response.status, response.statusText);
            return;
        }

        const data = response.data;
        console.log('📊 Response Structure:', Object.keys(data));

        // Check for articles
        const articles = data?.articles?.results || [];
        const totalResults = data?.articles?.totalResults || 0;

        console.log(`\n📰 Found ${articles.length} articles (Total available: ${totalResults})`);

        if (articles.length === 0) {
            console.log('⚠️ No articles returned');
            console.log('Full response:', JSON.stringify(data, null, 2));
            return;
        }

        // Analyze each article
        console.log('\n📄 Article Analysis:');
        console.log('='.repeat(80));

        let fullContentCount = 0;
        let totalContentLength = 0;
        let appleRelevantCount = 0;

        articles.forEach((article: any, index: number) => {
            console.log(`\n📰 Article ${index + 1}:`);
            console.log(`   Title: ${article.title || 'No title'}`);
            console.log(`   URL: ${article.url || 'No URL'}`);
            console.log(`   Date: ${article.date || article.dateTime || 'No date'}`);
            console.log(`   Source: ${article.source?.title || article.source?.uri || 'Unknown'}`);

            // Check content
            const body = article.body || '';
            const summary = article.summary || '';
            const content = body || summary;

            console.log(`   Body Length: ${body.length} chars`);
            console.log(`   Summary Length: ${summary.length} chars`);
            console.log(`   Total Content: ${content.length} chars`);

            if (content.length > 200) {
                fullContentCount++;
                totalContentLength += content.length;
                const preview = content.substring(0, 300) + (content.length > 300 ? '...' : '');
                console.log(`   Content Preview: "${preview}"`);
            } else {
                console.log(`   Content: ❌ Too short or missing`);
            }

            // Check Apple relevance
            const title = (article.title || '').toLowerCase();
            const isAppleRelevant = title.includes('apple') ||
                content.toLowerCase().includes('apple') ||
                title.includes('aapl');

            if (isAppleRelevant) appleRelevantCount++;
            console.log(`   Apple Relevant: ${isAppleRelevant ? '✅ YES' : '❌ NO'}`);

            // Show concepts and categories if available
            if (article.concepts && article.concepts.length > 0) {
                const conceptLabels = article.concepts.slice(0, 3).map((c: any) => c.label).join(', ');
                console.log(`   Concepts: ${conceptLabels}`);
            }

            if (article.categories && article.categories.length > 0) {
                const categoryLabels = article.categories.slice(0, 2).map((c: any) => c.label).join(', ');
                console.log(`   Categories: ${categoryLabels}`);
            }

            console.log(`   Available Fields: ${Object.keys(article).join(', ')}`);
        });

        // Summary statistics
        const avgContentLength = fullContentCount > 0 ? totalContentLength / fullContentCount : 0;
        const fullContentRate = (fullContentCount / articles.length) * 100;
        const relevanceRate = (appleRelevantCount / articles.length) * 100;

        console.log('\n📊 Summary Statistics:');
        console.log('='.repeat(80));
        console.log(`Total Articles Retrieved: ${articles.length}`);
        console.log(`Articles with Full Content: ${fullContentCount} (${Math.round(fullContentRate)}%)`);
        console.log(`Average Content Length: ${Math.round(avgContentLength)} characters`);
        console.log(`Apple Relevant Articles: ${appleRelevantCount} (${Math.round(relevanceRate)}%)`);
        console.log(`Total Available Articles: ${totalResults}`);

        // Overall assessment
        console.log('\n🎯 NewsAPI.ai Assessment:');
        console.log('='.repeat(80));

        if (fullContentRate >= 80) {
            console.log('✅ EXCELLENT: NewsAPI.ai provides full article content consistently');
        } else if (fullContentRate >= 50) {
            console.log('⚠️ MIXED: Some articles have full content, others may be truncated');
        } else {
            console.log('❌ POOR: Most articles lack full content');
        }

        if (relevanceRate >= 80) {
            console.log('✅ EXCELLENT: Apple filtering is working well');
        } else if (relevanceRate >= 60) {
            console.log('⚠️ GOOD: Most articles are Apple-relevant');
        } else {
            console.log('❌ POOR: Apple filtering needs improvement');
        }

        if (avgContentLength > 1000) {
            console.log('✅ EXCELLENT: Articles are substantial and detailed');
        } else if (avgContentLength > 500) {
            console.log('⚠️ GOOD: Articles have reasonable length');
        } else {
            console.log('❌ POOR: Articles are too short, likely summaries only');
        }

        // Recommendations
        console.log('\n💡 Recommendations:');
        if (fullContentRate >= 80 && relevanceRate >= 80 && avgContentLength > 1000) {
            console.log('🚀 NewsAPI.ai is PERFECT for your use case!');
            console.log('   • Full article content available');
            console.log('   • Excellent Apple filtering');
            console.log('   • Substantial article length');
            console.log('   • Ready for ML training data collection');
        } else if (fullContentRate >= 60) {
            console.log('✅ NewsAPI.ai is USABLE for your use case');
            console.log('   • Most articles have full content');
            console.log('   • Consider supplementing with article scraping for missing content');
        } else {
            console.log('⚠️ NewsAPI.ai may need supplementation');
            console.log('   • Consider using it for article discovery');
            console.log('   • Use article scraping to get full content');
        }

        console.log(`\n🔢 Free Tier Usage: You can get up to ${Math.floor(2000 / 1)} articles with your 2000 free tokens`);

    } catch (error: any) {
        console.log('❌ NewsAPI.ai test failed:', error.message);

        if (error.response) {
            console.log('HTTP Status:', error.response.status);
            console.log('Response Data:', JSON.stringify(error.response.data, null, 2));
        }

        if (error.message.includes('401') || error.response?.status === 401) {
            console.log('💡 401 Unauthorized - Your API key may be invalid');
        } else if (error.message.includes('429') || error.response?.status === 429) {
            console.log('💡 429 Rate Limited - You may have exceeded your quota');
        } else if (error.response?.status === 400) {
            console.log('💡 400 Bad Request - Check the API parameters');
        }
    }
}

// Run the test
testNewsApiAiRaw();
