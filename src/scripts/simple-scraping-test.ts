#!/usr/bin/env tsx

/**
 * Simple Article Scraping Test
 * 
 * Tests article scraping quality without complex dependencies
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

interface ScrapingResult {
    url: string;
    title: string;
    success: boolean;
    contentLength: number;
    preview: string;
    issues: string[];
}

async function testScraping(url: string, title: string): Promise<ScrapingResult> {
    console.log(`\n🔍 Testing: ${title.substring(0, 60)}...`);
    console.log(`🔗 URL: ${url}`);

    try {
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);

        // Extract content using multiple strategies
        let content = '';

        // Strategy 1: Look for article content
        const articleSelectors = [
            'article',
            '.article-content',
            '.article-body',
            '.post-content',
            '.entry-content',
            '.content',
            '.story-body'
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

        // Strategy 2: Get all paragraphs if no article content
        if (content.length < 500) {
            const paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
            content = paragraphs.join('\n\n');
        }

        // Clean content
        content = content.replace(/\s+/g, ' ').trim();

        // Analyze quality
        const issues = analyzeIssues(content);
        const preview = content.substring(0, 300);

        console.log(`✅ Scraped ${content.length} characters`);
        console.log(`📝 Preview: "${preview}..."`);

        if (issues.length > 0) {
            console.log(`⚠️ Issues: ${issues.join(', ')}`);
        }

        return {
            url,
            title,
            success: true,
            contentLength: content.length,
            preview,
            issues
        };

    } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        return {
            url,
            title,
            success: false,
            contentLength: 0,
            preview: '',
            issues: [error.message]
        };
    }
}

function analyzeIssues(content: string): string[] {
    const issues: string[] = [];
    const lower = content.toLowerCase();

    if (content.length < 200) {
        issues.push('Very short content');
    }

    if (lower.includes('subscribe') && lower.includes('paywall')) {
        issues.push('Potential paywall');
    }

    if (lower.includes('cookie') && lower.includes('consent') && content.length < 500) {
        issues.push('Cookie consent page');
    }

    if (lower.includes('javascript') && lower.includes('enable')) {
        issues.push('JavaScript required');
    }

    if (lower.includes('404') || lower.includes('not found')) {
        issues.push('Page not found');
    }

    return issues;
}

async function main() {
    console.log('🕷️ Simple Article Scraping Test');
    console.log('='.repeat(50));

    const testArticles = [
        {
            title: 'Warren Buffett Continues to Trim Apple Stake',
            url: 'https://www.fool.com/investing/2025/08/29/as-warren-buffett-continues-to-trim-apple-stake-sh/?source=iedfolrf0000001'
        },
        {
            title: 'Definitive Guide to Finding Next 10-Bagger Stock',
            url: 'https://www.fool.com/investing/2025/08/29/definitive-guide-finding-next-10-bagger-stock/?source=iedfolrf0000001'
        },
        {
            title: 'Should Invesco QQQ Trust Be on Your Radar',
            url: 'https://www.fool.com/investing/2025/08/29/should-qqq-be-on-your-investing-radar-right-now/?source=iedfolrf0000001'
        }
    ];

    const results: ScrapingResult[] = [];

    for (const article of testArticles) {
        const result = await testScraping(article.url, article.title);
        results.push(result);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    console.log('\n📊 SCRAPING SUMMARY');
    console.log('='.repeat(50));

    const successful = results.filter(r => r.success);
    const withIssues = results.filter(r => r.issues.length > 0);

    console.log(`✅ Success Rate: ${successful.length}/${results.length} (${Math.round(successful.length / results.length * 100)}%)`);

    if (successful.length > 0) {
        const avgLength = successful.reduce((sum, r) => sum + r.contentLength, 0) / successful.length;
        console.log(`📏 Average Length: ${Math.round(avgLength)} characters`);
    }

    console.log(`⚠️ Articles with Issues: ${withIssues.length}`);

    // Detailed results
    results.forEach((result, i) => {
        console.log(`\n${i + 1}. ${result.title}`);
        console.log(`   Status: ${result.success ? '✅' : '❌'} | Length: ${result.contentLength}`);
        if (result.issues.length > 0) {
            console.log(`   Issues: ${result.issues.join(', ')}`);
        }
    });

    return results;
}

if (require.main === module) {
    main().catch(console.error);
}
