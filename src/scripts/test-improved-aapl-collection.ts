#!/usr/bin/env npx tsx

/**
 * Test improved AAPL collection strategy
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { NewsApiAiService } from '../services/newsApiAiService';

class ImprovedAAPLCollector {
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

    async testImprovedCollection(): Promise<void> {
        console.log('🎯 TESTING IMPROVED AAPL COLLECTION');
        console.log('='.repeat(60));
        console.log('');

        // Test the AAPL strategy (best from our tests)
        const articles = await this.collectAAPLArticles();

        if (articles.length === 0) {
            console.log('❌ No articles collected');
            return;
        }

        // Analyze relevance
        const analysis = this.analyzeRelevance(articles);
        this.showResults(analysis, articles);

        // Optionally save to database
        if (process.argv.includes('--save')) {
            await this.saveToDatabase(articles, analysis);
        } else {
            console.log('💡 Add --save flag to save these articles to database');
        }
    }

    private async collectAAPLArticles(): Promise<any[]> {
        console.log('📊 COLLECTING WITH AAPL STRATEGY');
        console.log('─'.repeat(40));

        try {
            const articles = await this.newsService.searchAppleArticles({
                query: 'AAPL',
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'relevance',
                pageSize: 15
            });

            console.log(`✅ Collected ${articles.length} articles`);
            return articles;

        } catch (error: any) {
            console.log(`❌ Collection failed: ${error.message}`);
            return [];
        }
    }

    private analyzeRelevance(articles: any[]): any {
        let relevant = 0;
        let irrelevant = 0;
        const relevantArticles: any[] = [];
        const irrelevantArticles: any[] = [];

        articles.forEach(article => {
            if (this.isAppleRelevant(article)) {
                relevant++;
                relevantArticles.push(article);
            } else {
                irrelevant++;
                irrelevantArticles.push(article);
            }
        });

        const relevanceRate = Math.round((relevant / articles.length) * 100);

        return {
            total: articles.length,
            relevant,
            irrelevant,
            relevanceRate,
            relevantArticles,
            irrelevantArticles
        };
    }

    private isAppleRelevant(article: any): boolean {
        const title = article.title?.toLowerCase() || '';
        const body = article.body?.toLowerCase() || '';
        const searchText = title + ' ' + body;

        // Exclusion keywords
        const exclusions = [
            'big apple', 'central park', 'manhattan', 'brooklyn', 'nyc',
            'french toast', 'recipe', 'cooking', 'berries',
            'erogenous', 'sex', 'adult',
            'assassination', 'murder', 'robbery', 'assault',
            'trump assassination', 'biden', 'election',
            'baseball', 'football', 'basketball', 'sports',
            'landlord', 'tenant', 'real estate'
        ];

        if (exclusions.some(exclusion => searchText.includes(exclusion))) {
            return false;
        }

        // Strong Apple indicators
        const appleIndicators = [
            'apple inc', 'aapl', 'tim cook', 'cupertino',
            'iphone', 'ipad', 'mac', 'ios', 'app store',
            'apple stock', 'apple shares', 'apple company'
        ];

        if (appleIndicators.some(indicator => searchText.includes(indicator))) {
            return true;
        }

        // Business context for generic "apple"
        if (searchText.includes('apple')) {
            const businessContext = [
                'stock', 'shares', 'market', 'earnings', 'revenue',
                'technology', 'business', 'company', 'investor'
            ];
            return businessContext.some(context => searchText.includes(context));
        }

        return false;
    }

    private showResults(analysis: any, articles: any[]): void {
        console.log('');
        console.log('📊 COLLECTION RESULTS');
        console.log('─'.repeat(40));

        const status = analysis.relevanceRate >= 80 ? '✅' : analysis.relevanceRate >= 60 ? '⚠️' : '❌';

        console.log(`${status} RELEVANCE ANALYSIS:`);
        console.log(`   Total articles: ${analysis.total}`);
        console.log(`   Relevant: ${analysis.relevant} articles`);
        console.log(`   Irrelevant: ${analysis.irrelevant} articles`);
        console.log(`   Relevance rate: ${analysis.relevanceRate}%`);
        console.log('');

        // Show relevant articles
        if (analysis.relevantArticles.length > 0) {
            console.log('✅ RELEVANT ARTICLES:');
            analysis.relevantArticles.forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Source: ${article.source || 'Unknown'}`);
                console.log(`      URL: ${article.url?.substring(0, 60)}...`);
            });
            console.log('');
        }

        // Show irrelevant articles
        if (analysis.irrelevantArticles.length > 0) {
            console.log('❌ IRRELEVANT ARTICLES:');
            analysis.irrelevantArticles.forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Reason: ${this.getIrrelevanceReason(article)}`);
            });
            console.log('');
        }

        // Compare to previous performance
        console.log('📈 IMPROVEMENT COMPARISON:');
        console.log(`   Previous strategy: ~31% relevance`);
        console.log(`   AAPL strategy: ${analysis.relevanceRate}% relevance`);
        console.log(`   Improvement: +${analysis.relevanceRate - 31} percentage points`);
    }

    private getIrrelevanceReason(article: any): string {
        const searchText = (article.title + ' ' + (article.body || '')).toLowerCase();

        if (searchText.includes('big apple') || searchText.includes('central park')) return 'NYC reference';
        if (searchText.includes('food') || searchText.includes('recipe')) return 'Food content';
        if (searchText.includes('sports') || searchText.includes('game')) return 'Sports content';
        if (searchText.includes('politics') || searchText.includes('election')) return 'Political content';

        return 'Not about Apple Inc.';
    }

    private async saveToDatabase(articles: any[], analysis: any): Promise<void> {
        console.log('💾 SAVING TO DATABASE');
        console.log('─'.repeat(30));

        let savedCount = 0;
        let errorCount = 0;

        // Only save relevant articles
        for (const article of analysis.relevantArticles) {
            try {
                const articleData = {
                    external_id: article.uri || `aapl_test_${Date.now()}_${Math.random()}`,
                    external_id_type: 'newsapi_ai_uri',
                    title: article.title || 'Untitled',
                    url: article.url,
                    published_at: new Date(article.date || article.dateTime).toISOString(),
                    source: article.source?.title || 'Unknown',
                    article_description: article.body?.substring(0, 1000),
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai',
                    content_type: 'aapl_improved_test',
                    apple_relevance_score: 0.9, // High relevance since it passed our filters
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('articles')
                    .upsert(articleData, { onConflict: 'url' });

                if (error) {
                    console.log(`❌ Failed to save: ${article.title?.substring(0, 40)}...`);
                    errorCount++;
                } else {
                    savedCount++;
                }

            } catch (error: any) {
                console.log(`❌ Error saving article: ${error.message}`);
                errorCount++;
            }
        }

        console.log(`✅ Saved ${savedCount} relevant articles to database`);
        if (errorCount > 0) {
            console.log(`⚠️  ${errorCount} articles failed to save`);
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('🎯 IMPROVED AAPL COLLECTION TEST');
        console.log('Available flags:');
        console.log('  --save: Save relevant articles to database');
        console.log('');

        const collector = new ImprovedAAPLCollector();
        await collector.testImprovedCollection();

    } catch (error: any) {
        console.error('❌ Improved collection test failed:', error.message);
    }
}

main();
