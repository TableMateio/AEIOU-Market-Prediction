#!/usr/bin/env tsx

/**
 * Test Article Scraping Quality
 * 
 * Scrapes content from our collected articles and analyzes quality:
 * - Full body text vs paywalls vs ads vs popups
 * - Content length and readability
 * - Update database with results
 */

import ArticleScraper from '../services/articleScraper';
import { createLogger } from '../utils/logger';

const logger = createLogger('ScrapingTest');

interface ArticleToScrape {
    id: string;
    title: string;
    url: string;
    source: string;
}

// Import the MCP tools (this won't work in actual execution, but we'll use them directly)
declare function mcp_supabase_execute_sql(params: { query: string }): Promise<any>;

async function testArticleScraping() {
    console.log('🕷️ Testing Article Scraping Quality');
    console.log('='.repeat(60));

    // Get articles that need scraping
    const articlesToTest = [
        {
            id: '1',
            title: 'As Warren Buffett Continues to Trim Apple Stake, Should Investors Be Worried?',
            url: 'https://www.fool.com/investing/2025/08/29/as-warren-buffett-continues-to-trim-apple-stake-sh/?source=iedfolrf0000001',
            source: 'The Motley Fool'
        },
        {
            id: '2',
            title: 'The Definitive Guide to Finding the Next 10-Bagger Stock',
            url: 'https://www.fool.com/investing/2025/08/29/definitive-guide-finding-next-10-bagger-stock/?source=iedfolrf0000001',
            source: 'The Motley Fool'
        },
        {
            id: '3',
            title: 'Should Invesco QQQ Trust Be on Your Investing Radar Right Now?',
            url: 'https://www.fool.com/investing/2025/08/29/should-qqq-be-on-your-investing-radar-right-now/?source=iedfolrf0000001',
            source: 'The Motley Fool'
        }
    ];

    const scraper = new ArticleScraper({
        timeout: 15000,
        retryAttempts: 2
    });

    const results: Array<{
        title: string;
        url: string;
        success: boolean;
        contentLength: number;
        quality: 'excellent' | 'good' | 'poor' | 'failed';
        issues: string[];
        preview: string;
    }> = [];

    for (const article of articlesToTest) {
        console.log(`\n📰 Testing: ${article.title.substring(0, 60)}...`);
        console.log(`🔗 URL: ${article.url}`);

        try {
            // Test scraping first
            const testResult = await scraper.testScraping(article.url);

            if (testResult.success) {
                console.log(`✅ Scraping successful: ${testResult.textLength} characters`);
                console.log(`📝 Preview: "${testResult.preview.substring(0, 150)}..."`);

                // Analyze quality
                const quality = analyzeContentQuality(testResult.preview, testResult.textLength);
                console.log(`📊 Quality Assessment: ${quality.rating} (${quality.issues.join(', ') || 'No issues'})`);

                results.push({
                    title: article.title,
                    url: article.url,
                    success: true,
                    contentLength: testResult.textLength,
                    quality: quality.rating,
                    issues: quality.issues,
                    preview: testResult.preview
                });

            } else {
                console.log(`❌ Scraping failed: ${testResult.error}`);
                results.push({
                    title: article.title,
                    url: article.url,
                    success: false,
                    contentLength: 0,
                    quality: 'failed',
                    issues: [testResult.error || 'Unknown error'],
                    preview: ''
                });
            }

        } catch (error) {
            console.error(`💥 Error testing ${article.url}:`, error);
            results.push({
                title: article.title,
                url: article.url,
                success: false,
                contentLength: 0,
                quality: 'failed',
                issues: [error.message],
                preview: ''
            });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary Report
    console.log('\n📊 SCRAPING QUALITY REPORT');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const excellent = results.filter(r => r.quality === 'excellent');
    const good = results.filter(r => r.quality === 'good');
    const poor = results.filter(r => r.quality === 'poor');
    const failed = results.filter(r => r.quality === 'failed');

    console.log(`📈 Success Rate: ${successful.length}/${results.length} (${Math.round(successful.length / results.length * 100)}%)`);
    console.log(`🌟 Excellent Quality: ${excellent.length}`);
    console.log(`👍 Good Quality: ${good.length}`);
    console.log(`⚠️ Poor Quality: ${poor.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
        const avgLength = successful.reduce((sum, r) => sum + r.contentLength, 0) / successful.length;
        console.log(`📏 Average Content Length: ${Math.round(avgLength)} characters`);
    }

    // Detailed Results
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(60));

    results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.title.substring(0, 50)}...`);
        console.log(`   Status: ${result.success ? '✅' : '❌'} | Quality: ${result.quality} | Length: ${result.contentLength}`);
        if (result.issues.length > 0) {
            console.log(`   Issues: ${result.issues.join(', ')}`);
        }
        if (result.preview) {
            console.log(`   Preview: "${result.preview.substring(0, 100)}..."`);
        }
    });

    return results;
}

function analyzeContentQuality(preview: string, length: number): {
    rating: 'excellent' | 'good' | 'poor';
    issues: string[];
} {
    const issues: string[] = [];

    // Length analysis
    if (length < 500) {
        issues.push('Very short content');
    } else if (length < 1500) {
        issues.push('Short content');
    }

    // Content quality indicators
    const lowerPreview = preview.toLowerCase();

    if (lowerPreview.includes('subscribe') || lowerPreview.includes('paywall')) {
        issues.push('Potential paywall');
    }

    if (lowerPreview.includes('cookie') && lowerPreview.includes('consent')) {
        issues.push('Cookie consent page');
    }

    if (lowerPreview.includes('javascript') && lowerPreview.includes('enable')) {
        issues.push('JavaScript required');
    }

    if (lowerPreview.includes('404') || lowerPreview.includes('not found')) {
        issues.push('Page not found');
    }

    // Positive indicators
    const hasAppleContent = lowerPreview.includes('apple') || lowerPreview.includes('iphone');
    const hasFinancialContent = lowerPreview.includes('stock') || lowerPreview.includes('invest');

    // Determine rating
    let rating: 'excellent' | 'good' | 'poor';

    if (issues.length === 0 && length > 2000 && (hasAppleContent || hasFinancialContent)) {
        rating = 'excellent';
    } else if (issues.length <= 1 && length > 1000) {
        rating = 'good';
    } else {
        rating = 'poor';
    }

    return { rating, issues };
}

// Execute if run directly
if (require.main === module) {
    testArticleScraping()
        .then(results => {
            console.log(`\n🎯 Scraping test completed! ${results.filter(r => r.success).length} successful scrapes.`);
        })
        .catch(error => {
            console.error('❌ Scraping test failed:', error);
            process.exit(1);
        });
}

export { testArticleScraping };
