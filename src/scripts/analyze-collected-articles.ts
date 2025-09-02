#!/usr/bin/env npx tsx

/**
 * Analyze Collected Articles
 * Review what we actually got and assess quality/usefulness
 */

import * as fs from 'fs/promises';
import * as path from 'path';

async function analyzeCollectedArticles() {
    console.log('🔍 Analyzing Collected NewsAPI.ai Articles');
    console.log('='.repeat(60));

    try {
        // Read the collected articles
        const articlesPath = path.join(process.cwd(), 'data', 'articles_2025-09-02.json');
        const articlesData = await fs.readFile(articlesPath, 'utf-8');
        const articles = JSON.parse(articlesData);

        console.log(`📄 Total articles collected: ${articles.length}`);
        console.log('');

        // Analyze content quality and usefulness
        console.log('📊 CONTENT QUALITY ANALYSIS');
        console.log('─'.repeat(40));

        let usefulCount = 0;
        let tutorialCount = 0;
        let shortCount = 0;
        let noAppleCount = 0;
        let goodCount = 0;

        const contentTypes: Record<string, number> = {};
        const sources: Record<string, number> = {};
        const yearDistribution: Record<number, number> = {};
        const sampleArticles: any[] = [];

        articles.forEach((article: any, index: number) => {
            const title = (article.title || '').toLowerCase();
            const body = article.body || '';
            const source = article.source || 'Unknown';

            // Track sources
            sources[source] = (sources[source] || 0) + 1;

            // Track years
            const year = new Date(article.published_at).getFullYear();
            yearDistribution[year] = (yearDistribution[year] || 0) + 1;

            // Track content types
            const contentType = article.content_type || 'unknown';
            contentTypes[contentType] = (contentTypes[contentType] || 0) + 1;

            // Quality analysis
            const hasApple = title.includes('apple') || title.includes('aapl') ||
                body.toLowerCase().includes('apple inc');

            const isTutorial = ['how to', 'tutorial', 'guide to', 'step by step', 'tips and tricks',
                'settings', 'configure', 'setup', 'install', 'update your',
                'fix your', 'troubleshoot'].some(pattern =>
                    title.includes(pattern) || body.substring(0, 500).toLowerCase().includes(pattern));

            const isShort = body.length < 300;

            if (!hasApple) {
                noAppleCount++;
            } else if (isTutorial) {
                tutorialCount++;
            } else if (isShort) {
                shortCount++;
            } else {
                goodCount++;
                usefulCount++;

                // Collect samples of good articles
                if (sampleArticles.length < 5) {
                    sampleArticles.push({
                        index: index + 1,
                        title: article.title,
                        source: source,
                        published: article.published_at,
                        bodyLength: body.length,
                        contentType: contentType
                    });
                }
            }
        });

        console.log(`✅ Useful articles: ${usefulCount} (${Math.round((usefulCount / articles.length) * 100)}%)`);
        console.log(`❌ No Apple mention: ${noAppleCount} (${Math.round((noAppleCount / articles.length) * 100)}%)`);
        console.log(`📖 Tutorial/How-to: ${tutorialCount} (${Math.round((tutorialCount / articles.length) * 100)}%)`);
        console.log(`📝 Too short (<300 chars): ${shortCount} (${Math.round((shortCount / articles.length) * 100)}%)`);
        console.log(`🎯 High quality: ${goodCount} (${Math.round((goodCount / articles.length) * 100)}%)`);

        // Source analysis
        console.log('\n🏢 SOURCE DIVERSITY');
        console.log('─'.repeat(40));
        const sortedSources = Object.entries(sources).sort(([, a], [, b]) => b - a);
        console.log(`Total unique sources: ${sortedSources.length}`);
        console.log('Top sources:');
        sortedSources.slice(0, 8).forEach(([source, count]) => {
            console.log(`   ${source}: ${count} articles`);
        });

        // Temporal analysis
        console.log('\n📅 TEMPORAL DISTRIBUTION');
        console.log('─'.repeat(40));
        const sortedYears = Object.entries(yearDistribution).sort(([a], [b]) => parseInt(a) - parseInt(b));
        sortedYears.forEach(([year, count]) => {
            console.log(`   ${year}: ${count} articles`);
        });

        // Content type analysis
        console.log('\n📋 CONTENT TYPES');
        console.log('─'.repeat(40));
        Object.entries(contentTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} articles`);
        });

        // Sample good articles
        console.log('\n📰 SAMPLE HIGH-QUALITY ARTICLES');
        console.log('─'.repeat(40));
        sampleArticles.forEach(sample => {
            console.log(`\n${sample.index}. "${sample.title}"`);
            console.log(`   Source: ${sample.source}`);
            console.log(`   Published: ${sample.published.split('T')[0]}`);
            console.log(`   Length: ${sample.bodyLength} chars`);
            console.log(`   Type: ${sample.contentType}`);
        });

        // Recommendations
        console.log('\n💡 RECOMMENDATIONS');
        console.log('─'.repeat(40));

        if (tutorialCount > 0) {
            console.log(`🚫 EXCLUSION NEEDED: ${tutorialCount} tutorial articles found`);
            console.log('   Current exclusion patterns working, but could be enhanced');
        }

        if (noAppleCount > 0) {
            console.log(`🎯 FILTERING NEEDED: ${noAppleCount} articles lack Apple relevance`);
            console.log('   Consider stricter Apple mention requirements');
        }

        if (shortCount > 0) {
            console.log(`📏 LENGTH FILTER: ${shortCount} articles too short for analysis`);
            console.log('   Current 300-char minimum is working');
        }

        console.log(`\n✅ QUALITY RATE: ${Math.round((goodCount / articles.length) * 100)}% of articles are high-quality`);

        if (goodCount / articles.length > 0.7) {
            console.log('🎉 EXCELLENT: High quality rate suggests good filtering');
        } else if (goodCount / articles.length > 0.5) {
            console.log('👍 GOOD: Decent quality rate, minor improvements needed');
        } else {
            console.log('⚠️ NEEDS WORK: Low quality rate, filtering needs improvement');
        }

        // Scaling recommendations
        console.log('\n🚀 SCALING RECOMMENDATIONS');
        console.log('─'.repeat(40));
        console.log(`Current efficiency: ${goodCount} useful articles from ${articles.length} collected`);
        console.log(`To get 200 useful articles, collect ~${Math.ceil(200 * articles.length / goodCount)} articles`);
        console.log(`Estimated tokens needed: ~${Math.ceil(200 * articles.length / goodCount / 10)} tokens`);

    } catch (error: any) {
        console.log('❌ Analysis failed:', error.message);
    }
}

main().catch(console.error);

async function main() {
    await analyzeCollectedArticles();
}
