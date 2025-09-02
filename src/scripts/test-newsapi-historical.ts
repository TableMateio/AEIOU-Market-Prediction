#!/usr/bin/env npx tsx

/**
 * Test NewsAPI.ai historical data access for different time periods
 */

import { config } from 'dotenv';
import axios from 'axios';

// Load environment variables
config();

async function testHistoricalAccess() {
    console.log('🕰️ Testing NewsAPI.ai historical data access...');

    const apiKey = process.env.NEWSAPIAI_API_KEY;
    if (!apiKey) {
        console.log('❌ API key not found');
        return;
    }

    // Test different time periods
    const testPeriods = [
        { name: '30 days ago', start: '2025-08-03', end: '2025-08-03' },
        { name: '6 months ago', start: '2025-03-02', end: '2025-03-02' },
        { name: '1 year ago', start: '2024-09-02', end: '2024-09-02' },
        { name: '2 years ago', start: '2023-09-02', end: '2023-09-02' },
        { name: '3 years ago', start: '2022-09-02', end: '2022-09-02' }
    ];

    for (const period of testPeriods) {
        try {
            console.log(`\n🔍 Testing ${period.name} (${period.start})...`);

            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    dateStart: period.start,
                    dateEnd: period.end,
                    articlesSortBy: 'date',
                    includeArticleBody: true,
                    articlesCount: 3, // Small test batch
                    apiKey: apiKey
                },
                timeout: 15000
            });

            const articles = response.data?.articles?.results || [];
            const totalResults = response.data?.articles?.totalResults || 0;

            console.log(`   📊 Found: ${articles.length} articles (${totalResults} total available)`);

            if (articles.length > 0) {
                const sample = articles[0];
                console.log(`   📰 Sample: "${sample.title}"`);
                console.log(`   📅 Date: ${sample.date}`);
                console.log(`   📄 Content: ${sample.body ? `${sample.body.length} chars` : 'No body'}`);
                console.log(`   🌐 Source: ${sample.source?.title || 'Unknown'}`);
                console.log(`   ✅ Status: AVAILABLE`);
            } else {
                console.log(`   ❌ Status: NO ARTICLES FOUND`);
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
            if (error.response?.status === 401) {
                console.log(`   💡 401 Unauthorized - API key issue`);
            } else if (error.response?.status === 402) {
                console.log(`   💡 402 Payment Required - Historical data may require paid plan`);
            }
        }
    }

    // Test date range query for better understanding
    console.log('\n🔍 Testing 1-week range from 1 year ago...');
    try {
        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params: {
                resultType: 'articles',
                keyword: 'Apple',
                lang: 'eng',
                dateStart: '2024-09-01',
                dateEnd: '2024-09-07',
                articlesSortBy: 'date',
                includeArticleBody: true,
                articlesCount: 10,
                apiKey: apiKey
            },
            timeout: 15000
        });

        const articles = response.data?.articles?.results || [];
        const totalResults = response.data?.articles?.totalResults || 0;

        console.log(`📊 1-week range results: ${articles.length} articles (${totalResults} total)`);

        if (articles.length > 0) {
            console.log('\n📅 Date distribution:');
            const dates = articles.map(a => a.date).sort();
            dates.forEach(date => console.log(`   • ${date}`));

            // Check content quality
            const fullContentCount = articles.filter(a => a.body && a.body.length > 500).length;
            console.log(`📄 Full content: ${fullContentCount}/${articles.length} articles`);
        }

    } catch (error: any) {
        console.log(`❌ Range test error: ${error.message}`);
    }

    // Summary and recommendations
    console.log('\n🎯 Historical Access Assessment:');
    console.log('='.repeat(60));
    console.log('Based on the test results above:');
    console.log('• If all periods show "AVAILABLE" - we can access 2-3 years of data');
    console.log('• If only recent periods work - historical data may be limited');
    console.log('• If we get 402 errors - historical access may require paid plan');
    console.log('\n💡 Next steps depend on what historical access we have available.');
}

testHistoricalAccess();
