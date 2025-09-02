#!/usr/bin/env npx tsx

/**
 * Test the new entity-based Apple collection using conceptUri
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { NewsApiAiService } from '../services/newsApiAiService';

class EntityBasedCollectionTest {
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

    async testEntityBasedCollection(): Promise<void> {
        console.log('🎯 ENTITY-BASED APPLE COLLECTION TEST');
        console.log('='.repeat(60));
        console.log('');

        console.log('🔬 METHOD: ConceptUri Entity Targeting');
        console.log('   • Wikipedia URI: http://en.wikipedia.org/wiki/Apple_Inc.');
        console.log('   • Location: United States');
        console.log('   • Expected: Articles specifically ABOUT Apple Inc.');
        console.log('   • Date: 2024-08-05 to 2024-08-07');
        console.log('   • Target: 15 high-quality Apple articles');
        console.log('');

        // Collect using entity method
        const articles = await this.collectByEntity();

        if (articles.length === 0) {
            console.log('❌ No articles collected');
            return;
        }

        // Analyze quality
        const analysis = this.analyzeEntityArticles(articles);
        this.showEntityResults(analysis, articles);

        // Option to save
        if (process.argv.includes('--save')) {
            await this.saveEntityArticles(analysis.highQuality);
        } else {
            console.log('');
            console.log('💡 Add --save flag to save high-quality articles to database');
        }
    }

    private async collectByEntity(): Promise<any[]> {
        console.log('📊 COLLECTING VIA ENTITY METHOD');
        console.log('─'.repeat(40));

        try {
            const articles = await this.newsService.searchAppleByEntity({
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'rel', // Relevance sort for best Apple content
                pageSize: 15,
                sourceRankPercentile: 50 // Top 50% of sources
            });

            console.log(`✅ Entity collection: ${articles.length} articles`);
            return articles;

        } catch (error: any) {
            console.log(`❌ Entity collection failed: ${error.message}`);
            return [];
        }
    }

    private analyzeEntityArticles(articles: any[]): any {
        console.log('');
        console.log('🔍 ENTITY ARTICLE ANALYSIS');
        console.log('─'.repeat(40));

        const highQuality: any[] = [];
        const mediumQuality: any[] = [];
        const lowQuality: any[] = [];

        articles.forEach(article => {
            const quality = this.assessEntityQuality(article);

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
            highQualityRate: Math.round((highQuality.length / articles.length) * 100),
            appleSpecificRate: Math.round(((highQuality.length + mediumQuality.length) / articles.length) * 100)
        };
    }

    private assessEntityQuality(article: any): any {
        const title = (article.title || '').toLowerCase();
        const body = (article.body || '').toLowerCase();
        const text = title + ' ' + body;

        // High quality: Clearly about Apple Inc. business
        const highQualityIndicators = [
            'apple inc', 'tim cook', 'apple earnings', 'apple revenue',
            'apple stock', 'apple shares', 'iphone', 'ipad', 'mac',
            'ios', 'app store', 'cupertino', 'apple company'
        ];

        if (highQualityIndicators.some(indicator => text.includes(indicator))) {
            return { level: 'high', reason: 'Apple Inc. business content' };
        }

        // Medium quality: Apple-related but maybe tangential
        if (text.includes('apple') && (
            text.includes('technology') || text.includes('stock') ||
            text.includes('market') || text.includes('business')
        )) {
            return { level: 'medium', reason: 'Apple-related business content' };
        }

        // Check if it's a false positive (shouldn't happen with conceptUri)
        const falsePositiveIndicators = [
            'big apple', 'apple pie', 'apple fruit', 'apple tree',
            'apple juice', 'apple recipe'
        ];

        if (falsePositiveIndicators.some(fp => text.includes(fp))) {
            return { level: 'low', reason: 'False positive - not Apple Inc.' };
        }

        return { level: 'medium', reason: 'Entity-matched but unclear relevance' };
    }

    private showEntityResults(analysis: any, articles: any[]): void {
        console.log('');
        console.log('📊 ENTITY METHOD RESULTS');
        console.log('─'.repeat(50));

        const status = analysis.highQualityRate >= 80 ? '✅' : analysis.highQualityRate >= 60 ? '⚠️' : '❌';

        console.log(`${status} QUALITY BREAKDOWN:`);
        console.log(`   🟢 High quality: ${analysis.highQuality.length} articles (${analysis.highQualityRate}%)`);
        console.log(`   🟡 Medium quality: ${analysis.mediumQuality.length} articles`);
        console.log(`   🔴 Low quality: ${analysis.lowQuality.length} articles`);
        console.log(`   📊 Total: ${analysis.total} articles`);
        console.log(`   🍎 Apple-specific rate: ${analysis.appleSpecificRate}%`);
        console.log('');

        // Show high quality articles
        if (analysis.highQuality.length > 0) {
            console.log('🟢 HIGH QUALITY ARTICLES:');
            analysis.highQuality.forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Source: ${article.source}`);
                console.log(`      Quality: ${article.reason}`);
                console.log('');
            });
        }

        // Show medium quality samples
        if (analysis.mediumQuality.length > 0) {
            console.log('🟡 MEDIUM QUALITY SAMPLES:');
            analysis.mediumQuality.slice(0, 3).forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Reason: ${article.reason}`);
                console.log('');
            });
        }

        // Show any low quality (shouldn't happen with conceptUri)
        if (analysis.lowQuality.length > 0) {
            console.log('🔴 UNEXPECTED LOW QUALITY (ConceptUri should prevent these):');
            analysis.lowQuality.forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Issue: ${article.reason}`);
                console.log('');
            });
        }

        // Performance comparison
        console.log('📈 METHOD COMPARISON:');
        console.log(`   🔤 Text Search ("AAPL"):     87% Apple-specific`);
        console.log(`   🎯 Entity Method (conceptUri): ${analysis.appleSpecificRate}% Apple-specific`);

        if (analysis.appleSpecificRate >= 90) {
            console.log('   ✅ MAJOR IMPROVEMENT - Entity method is superior!');
        } else if (analysis.appleSpecificRate >= 87) {
            console.log('   ⚠️  Similar performance - both methods viable');
        } else {
            console.log('   ❌ Entity method underperforming - investigate');
        }
        console.log('');

        console.log('🎯 RECOMMENDATION:');
        if (analysis.appleSpecificRate >= 90 && analysis.highQualityRate >= 70) {
            console.log('   ✅ Entity method ready for production scaling');
            console.log('   🚀 Replace text-based searches with conceptUri approach');
        } else if (analysis.appleSpecificRate >= 85) {
            console.log('   ⚠️  Entity method shows promise, needs refinement');
            console.log('   🔧 Consider combining with source filtering');
        } else {
            console.log('   ❌ Entity method needs investigation');
            console.log('   🔍 Debug conceptUri query structure');
        }
    }

    private async saveEntityArticles(highQualityArticles: any[]): Promise<void> {
        console.log('');
        console.log('💾 SAVING ENTITY-BASED ARTICLES');
        console.log('─'.repeat(40));

        let savedCount = 0;
        let errorCount = 0;

        for (const article of highQualityArticles) {
            try {
                const articleData = {
                    external_id: article.external_id || `entity_${Date.now()}_${Math.random()}`,
                    external_id_type: 'newsapi_ai_entity',
                    title: article.title || 'Untitled',
                    url: article.url,
                    published_at: article.published_at,
                    source: article.source,
                    article_description: article.body?.substring(0, 1000),
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai',
                    content_type: 'entity_based_collection',
                    apple_relevance_score: 0.95, // Very high since it passed entity targeting
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

        console.log(`✅ Saved: ${savedCount} entity-based articles`);
        if (errorCount > 0) {
            console.log(`⚠️  Errors: ${errorCount} articles`);
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('🎯 ENTITY-BASED APPLE COLLECTION TEST');
        console.log('Available flags:');
        console.log('  --save: Save high-quality articles to database');
        console.log('');

        const tester = new EntityBasedCollectionTest();
        await tester.testEntityBasedCollection();

    } catch (error: any) {
        console.error('❌ Entity-based test failed:', error.message);
    }
}

main();
