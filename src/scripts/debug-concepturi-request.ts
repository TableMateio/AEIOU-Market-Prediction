#!/usr/bin/env npx tsx

/**
 * Debug ConceptUri Request
 * 
 * Debug exactly what request is being sent to NewsAPI.ai and what we get back
 * to understand why conceptUri filtering isn't working
 */

import 'dotenv/config';
import { NewsApiAiService } from '../services/newsApiAiService';
import { createLogger } from '../utils/logger';

const logger = createLogger('DebugConceptUri');

async function debugConceptUriRequest() {
    logger.info('🔍 Debugging ConceptUri Request...');

    const newsService = new NewsApiAiService();

    try {
        // Test the exact same request that the collection script uses
        const articles = await newsService.searchAppleByEntity({
            dateFrom: '2024-08-01',
            dateTo: '2024-08-03',
            sortBy: 'socialScore',
            pageSize: 5, // Small batch for debugging
            sourceRankPercentile: 50
        });

        console.log(`\n📊 CONCEPTURI RESULTS:`);
        console.log(`   Total articles returned: ${articles.length}`);

        console.log(`\n📋 DETAILED ARTICLE ANALYSIS:`);
        articles.forEach((article, i) => {
            const title = article.title || 'No title';
            const source = article.source || 'Unknown';
            const date = new Date(article.published_at).toISOString().split('T')[0];
            
            // Analyze Apple relevance
            const titleLower = title.toLowerCase();
            const bodyLower = (article.body || '').toLowerCase();
            
            let relevance = 'IRRELEVANT';
            if (titleLower.includes('apple') || titleLower.includes('iphone') || titleLower.includes('ios') || 
                titleLower.includes('ipad') || titleLower.includes('mac') || titleLower.includes('aapl')) {
                relevance = 'DIRECT_APPLE';
            } else if (bodyLower.includes('apple inc') || bodyLower.includes('tim cook') || 
                      bodyLower.includes('cupertino') || bodyLower.includes('app store')) {
                relevance = 'APPLE_IN_BODY';
            } else if (titleLower.includes('tech') || titleLower.includes('smartphone') || 
                      titleLower.includes('google') || titleLower.includes('microsoft')) {
                relevance = 'TECH_RELATED';
            }

            console.log(`\n   ${i + 1}. [${relevance}] ${title.substring(0, 80)}...`);
            console.log(`      📅 ${date} | 📰 ${source}`);
            console.log(`      🔗 ${article.url}`);
            
            if (article.body && article.body.length > 100) {
                const bodyPreview = article.body.substring(0, 200) + '...';
                console.log(`      📝 Body preview: ${bodyPreview}`);
            }
        });

        // Calculate relevance stats
        const directApple = articles.filter(a => {
            const title = (a.title || '').toLowerCase();
            return title.includes('apple') || title.includes('iphone') || title.includes('ios') || 
                   title.includes('ipad') || title.includes('mac') || title.includes('aapl');
        }).length;

        const appleInBody = articles.filter(a => {
            const body = (a.body || '').toLowerCase();
            return body.includes('apple inc') || body.includes('tim cook') || 
                   body.includes('cupertino') || body.includes('app store');
        }).length;

        console.log(`\n📊 RELEVANCE ANALYSIS:`);
        console.log(`   🍎 Direct Apple mentions in title: ${directApple}/${articles.length} (${Math.round(directApple/articles.length*100)}%)`);
        console.log(`   🍎 Apple mentions in body: ${appleInBody}/${articles.length} (${Math.round(appleInBody/articles.length*100)}%)`);
        console.log(`   🎯 Expected with conceptUri: 90%+ should be Apple-relevant`);

        if (directApple < articles.length * 0.5) {
            console.log(`\n🚨 PROBLEM IDENTIFIED:`);
            console.log(`   ConceptUri filtering is NOT working as expected`);
            console.log(`   Should get 90%+ Apple-relevant articles, got ${Math.round(directApple/articles.length*100)}%`);
            console.log(`   This suggests the API request structure is incorrect`);
        } else {
            console.log(`\n✅ ConceptUri filtering appears to be working correctly`);
        }

    } catch (error: any) {
        logger.error('❌ Debug failed:', error.message);
        console.log('\n🔧 TROUBLESHOOTING STEPS:');
        console.log('   1. Check API key is valid');
        console.log('   2. Verify conceptUri format');
        console.log('   3. Check date range validity');
        console.log('   4. Test with NewsAPI.ai directly');
    }
}

// Run the debug
debugConceptUriRequest();
