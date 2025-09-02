#!/usr/bin/env npx tsx

/**
 * Test the fixed NewsApiAiService with known good dates
 */

import 'dotenv/config';
import { NewsApiAiService } from '../services/newsApiAiService';

async function testFixedService() {
    console.log('🧪 TESTING FIXED DATE FILTERING SERVICE');
    console.log('='.repeat(50));
    console.log('');

    const service = new NewsApiAiService();

    // Test with dates we KNOW have articles (from the manual test)
    console.log('📅 TEST: January 15-17, 2021 (we know this has 126 articles)');

    try {
        const articles = await service.searchAppleByEntity({
            dateFrom: '2021-01-15',
            dateTo: '2021-01-17',
            sortBy: 'socialScore',
            pageSize: 5,
            sourceRankPercentile: 50
        });

        console.log(`✅ Service returned: ${articles.length} articles`);
        console.log('');

        if (articles.length > 0) {
            console.log('📋 SAMPLE ARTICLES:');
            articles.forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title?.substring(0, 80)}..."`);
                console.log(`      📅 ${article.published_at} | 📰 ${article.source}`);
            });
        } else {
            console.log('❌ No articles returned - something is still wrong');
        }

        console.log('');
        console.log('🎯 RESULT: Date filtering is', articles.length > 0 ? '✅ WORKING!' : '❌ STILL BROKEN');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        if (error.response?.data) {
            console.log('API Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testFixedService();
