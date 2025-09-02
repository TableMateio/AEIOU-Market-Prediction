#!/usr/bin/env npx tsx

/**
 * Final AAPL test with optimal settings: relevance sort + comprehensive filters
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { NewsApiAiService } from '../services/newsApiAiService';

class FinalAAPLTest {
    private supabase: any;
    private newsService: NewsApiAiService;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
        this.newsService = new NewsApiAiService();
    }

    async runFinalTest(): Promise<void> {
        console.log('🎯 FINAL AAPL TEST - OPTIMAL SETTINGS');
        console.log('='.repeat(60));
        console.log('');

        console.log('⚙️  OPTIMAL CONFIGURATION:');
        console.log('   • Query: "AAPL" (stock symbol)');
        console.log('   • Sort: "relevance" (Apple-focused)');
        console.log('   • Period: 2024-08-05 to 2024-08-07');
        console.log('   • Target: 15 articles');
        console.log('   • Filters: 79 exclusion keywords');
        console.log('');

        // Collect with optimal settings
        const articles = await this.collectOptimal();

        if (articles.length === 0) {
            console.log('❌ No articles collected');
            return;
        }

        // Analyze quality
        const analysis = this.analyzeQuality(articles);
        this.showFinalResults(analysis);

        // Option to save
        if (process.argv.includes('--save')) {
            await this.saveHighQualityArticles(analysis.highQuality);
        } else {
            console.log('💡 Add --save flag to save high-quality articles to database');
        }
    }

    private async collectOptimal(): Promise<any[]> {
        console.log('📊 COLLECTING WITH OPTIMAL SETTINGS');
        console.log('─'.repeat(50));

        try {
            const articles = await this.newsService.searchAppleArticles({
                query: 'AAPL',
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'relevance', // Key change: use relevance instead of socialScore
                pageSize: 15
            });

            console.log(`✅ Collected: ${articles.length} articles`);
            return articles;

        } catch (error: any) {
            console.log(`❌ Collection failed: ${error.message}`);
            return [];
        }
    }

    private analyzeQuality(articles: any[]): any {
        console.log('');
        console.log('🔍 QUALITY ANALYSIS');
        console.log('─'.repeat(30));

        const highQuality: any[] = [];
        const mediumQuality: any[] = [];
        const lowQuality: any[] = [];

        articles.forEach(article => {
            const quality = this.assessQuality(article);

            switch (quality.level) {
                case 'high':
                    highQuality.push({ ...article, ...quality });
                    break;
                case 'medium':
                    mediumQuality.push({ ...article, ...quality });
                    break;
                case 'low':
                    lowQuality.push({ ...article, ...quality });
                    break;
            }
        });

        return {
            total: articles.length,
            highQuality,
            mediumQuality,
            lowQuality,
            highQualityRate: Math.round((highQuality.length / articles.length) * 100)
        };
    }

    private assessQuality(article: any): any {
        const title = article.title?.toLowerCase() || '';
        const body = article.body?.toLowerCase() || '';
        const text = title + ' ' + body;

        // Exclusion filters (immediate disqualification)
        const exclusions = [
            'big apple', 'central park', 'manhattan', 'brooklyn', 'nyc',
            'recipe', 'cooking', 'french toast', 'berries', 'food',
            'erogenous', 'sex', 'adult', 'assassination', 'murder',
            'trump assassination', 'biden', 'election', 'baseball',
            'football', 'basketball', 'sports', 'landlord', 'tenant'
        ];

        if (exclusions.some(exclusion => text.includes(exclusion))) {
            return { level: 'low', reason: 'Contains excluded content' };
        }

        // High quality indicators (Apple-specific business news)
        const highQualityIndicators = [
            'apple inc', 'tim cook', 'apple earnings', 'apple revenue',
            'apple stock', 'apple shares', 'cupertino', 'iphone',
            'ipad', 'mac', 'ios', 'app store'
        ];

        if (highQualityIndicators.some(indicator => text.includes(indicator))) {
            return { level: 'high', reason: 'Apple-specific business content' };
        }

        // Medium quality (general market with AAPL mention)
        if (text.includes('aapl') && (
            text.includes('stock') || text.includes('market') ||
            text.includes('earnings') || text.includes('revenue')
        )) {
            return { level: 'medium', reason: 'Market news mentioning AAPL' };
        }

        return { level: 'low', reason: 'Not relevant to Apple business' };
    }

    private showFinalResults(analysis: any): void {
        console.log('');
        console.log('📊 FINAL RESULTS');
        console.log('─'.repeat(40));

        const status = analysis.highQualityRate >= 70 ? '✅' : analysis.highQualityRate >= 50 ? '⚠️' : '❌';

        console.log(`${status} QUALITY BREAKDOWN:`);
        console.log(`   🟢 High quality: ${analysis.highQuality.length} articles (${analysis.highQualityRate}%)`);
        console.log(`   🟡 Medium quality: ${analysis.mediumQuality.length} articles`);
        console.log(`   🔴 Low quality: ${analysis.lowQuality.length} articles`);
        console.log(`   📊 Total: ${analysis.total} articles`);
        console.log('');

        // Show high quality articles
        if (analysis.highQuality.length > 0) {
            console.log('🟢 HIGH QUALITY ARTICLES:');
            analysis.highQuality.forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Source: ${article.source?.title || 'Unknown'}`);
                console.log(`      Quality: ${article.reason}`);
            });
            console.log('');
        }

        // Show medium quality samples
        if (analysis.mediumQuality.length > 0) {
            console.log('🟡 MEDIUM QUALITY SAMPLES:');
            analysis.mediumQuality.slice(0, 3).forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Reason: ${article.reason}`);
            });
            console.log('');
        }

        // Show low quality samples
        if (analysis.lowQuality.length > 0) {
            console.log('🔴 LOW QUALITY SAMPLES:');
            analysis.lowQuality.slice(0, 2).forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Reason: ${article.reason}`);
            });
            console.log('');
        }

        // Performance summary
        console.log('🎯 PERFORMANCE SUMMARY:');
        console.log(`   Strategy: AAPL + relevance sort + filters`);
        console.log(`   High-quality rate: ${analysis.highQualityRate}%`);
        console.log(`   Usable articles: ${analysis.highQuality.length + analysis.mediumQuality.length}/${analysis.total}`);
        console.log(`   Token efficiency: ${Math.round((analysis.highQuality.length + analysis.mediumQuality.length) / analysis.total * 100)}%`);

        if (analysis.highQualityRate >= 70) {
            console.log('   ✅ READY FOR PRODUCTION SCALING');
        } else if (analysis.highQualityRate >= 50) {
            console.log('   ⚠️  Acceptable quality, consider further refinement');
        } else {
            console.log('   ❌ Needs improvement before scaling');
        }
    }

    private async saveHighQualityArticles(highQualityArticles: any[]): Promise<void> {
        console.log('');
        console.log('💾 SAVING HIGH-QUALITY ARTICLES');
        console.log('─'.repeat(40));

        let savedCount = 0;
        let errorCount = 0;

        for (const article of highQualityArticles) {
            try {
                const articleData = {
                    external_id: article.uri || `aapl_final_${Date.now()}_${Math.random()}`,
                    external_id_type: 'newsapi_ai_uri',
                    title: article.title || 'Untitled',
                    url: article.url,
                    published_at: new Date(article.date || article.dateTime || new Date()).toISOString(),
                    source: article.source?.title || 'Unknown',
                    article_description: article.body?.substring(0, 1000),
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai',
                    content_type: 'aapl_final_optimal',
                    apple_relevance_score: 0.95, // Very high since it passed all filters
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('articles')
                    .upsert(articleData, { onConflict: 'url' });

                if (error) {
                    errorCount++;
                    console.log(`❌ Failed: ${error.message}`);
                } else {
                    savedCount++;
                }

            } catch (error: any) {
                errorCount++;
                console.log(`❌ Error: ${error.message}`);
            }
        }

        console.log(`✅ Saved: ${savedCount} high-quality articles`);
        if (errorCount > 0) {
            console.log(`⚠️  Errors: ${errorCount} articles`);
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('🎯 FINAL AAPL COLLECTION TEST');
        console.log('Available flags:');
        console.log('  --save: Save high-quality articles to database');
        console.log('');

        const tester = new FinalAAPLTest();
        await tester.runFinalTest();

    } catch (error: any) {
        console.error('❌ Final test failed:', error.message);
    }
}

main();
