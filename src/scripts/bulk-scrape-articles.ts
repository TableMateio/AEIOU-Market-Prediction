#!/usr/bin/env tsx

/**
 * Bulk Article Scraper
 * 
 * Scrapes all pending articles in our database, handling different URL types
 * and updating the database with results
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

interface Article {
    id: string;
    title: string;
    url: string;
}

async function scrapeContent(url: string): Promise<{
    success: boolean;
    content: string;
    length: number;
    issues: string[];
}> {

    // Skip problematic URL types
    if (url.includes('finnhub.io/api/news')) {
        return {
            success: false,
            content: '',
            length: 0,
            issues: ['Finnhub API URL - not scrapeable']
        };
    }

    try {
        console.log(`🔍 Scraping: ${url.substring(0, 80)}...`);

        const response = await axios.get(url, {
            timeout: 15000,
            maxContentLength: 5000000, // 5MB limit
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Extract content using multiple strategies
        let content = '';

        // Strategy 1: Article selectors
        const articleSelectors = [
            'article',
            '.article-content',
            '.article-body',
            '.post-content',
            '.entry-content',
            '.content',
            '.story-body',
            '[data-module="ArticleBody"]',
            '.text',
            '.body-content'
        ];

        for (const selector of articleSelectors) {
            const element = $(selector);
            if (element.length > 0) {
                content = element.text().trim();
                if (content.length > 500) {
                    break;
                }
            }
        }

        // Strategy 2: All paragraphs if no article content found
        if (content.length < 500) {
            const paragraphs = $('p').map((i, el) => $(el).text().trim()).get()
                .filter(p => p.length > 20); // Filter out short paragraphs
            content = paragraphs.join('\\n\\n');
        }

        // Clean content
        content = content
            .replace(/\\s+/g, ' ')
            .replace(/\\n\\s*\\n/g, '\\n\\n')
            .trim();

        // Analyze issues
        const issues: string[] = [];
        const lower = content.toLowerCase();

        if (content.length < 200) issues.push('Very short content');
        if (lower.includes('subscribe') && lower.includes('paywall')) issues.push('Potential paywall');
        if (lower.includes('cookie') && lower.includes('consent') && content.length < 500) issues.push('Cookie consent');
        if (lower.includes('javascript') && lower.includes('enable')) issues.push('JavaScript required');
        if (lower.includes('404') || lower.includes('not found')) issues.push('Page not found');

        const success = content.length > 200 && issues.length === 0;

        console.log(`${success ? '✅' : '⚠️'} Length: ${content.length}, Issues: ${issues.join(', ') || 'None'}`);

        return {
            success,
            content,
            length: content.length,
            issues
        };

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return {
            success: false,
            content: '',
            length: 0,
            issues: [error.message]
        };
    }
}

async function main() {
    console.log('🕷️ Bulk Article Scraping');
    console.log('='.repeat(50));

    // Simulate getting articles (in real implementation, use MCP Supabase)
    const testArticles = [
        {
            id: '1',
            title: 'Buffett 5 Biggest Holdings',
            url: 'https://www.fool.com/investing/2025/08/29/here-are-billionaire-warren-buffetts-5-biggest-sto/?source=iedfolrf0000001'
        },
        {
            id: '2',
            title: 'Buffett Retiring',
            url: 'https://www.fool.com/investing/2025/08/29/warren-buffett-retire-4-months-sell-core-holding/?source=iedfolrf0000001'
        },
        {
            id: '3',
            title: 'Growth ETF Article',
            url: 'https://www.fool.com/investing/2025/08/27/the-smartest-growth-etf-to-buy-with-100-right-now/?source=iedfolrf0000001'
        },
        {
            id: '4',
            title: 'Finnhub API URL (should skip)',
            url: 'https://finnhub.io/api/news?id=c39f266620c5451aea0891907dfe081dc8bad553e13b1175be1a2c1955a20968'
        }
    ];

    const results = [];
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const article of testArticles) {
        console.log(`\\n📰 Processing: ${article.title}`);

        const result = await scrapeContent(article.url);
        results.push({ ...article, ...result });

        if (result.success) {
            successCount++;
        } else if (result.issues.includes('Finnhub API URL - not scrapeable')) {
            skipCount++;
        } else {
            errorCount++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log('\\n📊 BULK SCRAPING SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⏭️ Skipped (API URLs): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total Processed: ${results.length}`);

    if (successCount > 0) {
        const successful = results.filter(r => r.success);
        const avgLength = successful.reduce((sum, r) => sum + r.length, 0) / successful.length;
        console.log(`📏 Average Content Length: ${Math.round(avgLength)} characters`);
    }

    // Show results
    console.log('\\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(50));
    results.forEach((result, i) => {
        console.log(`\\n${i + 1}. ${result.title}`);
        console.log(`   Status: ${result.success ? '✅' : '❌'} | Length: ${result.length}`);
        if (result.issues.length > 0) {
            console.log(`   Issues: ${result.issues.join(', ')}`);
        }
        if (result.content && result.success) {
            console.log(`   Preview: "${result.content.substring(0, 150)}..."`);
        }
    });

    console.log('\\n🎯 Next Steps:');
    console.log('- Update database with scraped content');
    console.log('- Filter out Finnhub API URLs from future scraping');
    console.log('- Focus on Motley Fool and Investing.com articles');

    return results;
}

if (require.main === module) {
    main().catch(console.error);
}
