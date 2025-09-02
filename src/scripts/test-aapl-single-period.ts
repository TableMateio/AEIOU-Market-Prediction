#!/usr/bin/env npx tsx

/**
 * Test AAPL collection for single period with all filters
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { NewsApiAiService } from '../services/newsApiAiService';

class SinglePeriodAAPLTest {
    private supabase: any;
    private newsService: NewsApiAiService;

    // Comprehensive exclusion filters
    private readonly EXCLUSION_KEYWORDS = [
        // NYC/Geographic
        'big apple', 'the big apple', 'central park', 'manhattan', 'brooklyn',
        'nyc', 'bronx', 'queens', 'staten island',

        // Food/Recipe
        'recipe', 'cooking', 'french toast', 'berries', 'food', 'restaurant',
        'meal', 'breakfast', 'dinner', 'lunch', 'chef', 'kitchen',

        // Adult content
        'erogenous', 'sex', 'adult', 'intimate', 'sexual', 'erotic',

        // Crime/Violence
        'assassination', 'murder', 'robbery', 'assault', 'crime', 'shooting',
        'killed', 'death', 'violence', 'attack', 'terrorist',

        // Politics (non-business)
        'trump assassination', 'biden', 'election', 'vote', 'republican',
        'democrat', 'congress', 'senate', 'political campaign',

        // Sports
        'baseball', 'football', 'basketball', 'soccer', 'sports', 'game',
        'team', 'player', 'coach', 'stadium', 'championship',

        // Entertainment
        'movie', 'film', 'actor', 'celebrity', 'music', 'concert',
        'album', 'song', 'entertainment', 'hollywood',

        // Real Estate
        'landlord', 'tenant', 'rent', 'real estate', 'property', 'housing',

        // Weather/Natural
        'weather', 'storm', 'hurricane', 'earthquake', 'flood'
    ];

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
        this.newsService = new NewsApiAiService();
    }

    async testSinglePeriod(): Promise<void> {
        console.log('🧪 SINGLE PERIOD AAPL TEST');
        console.log('='.repeat(50));
        console.log('');

        console.log('🎯 STRATEGY: AAPL + Comprehensive Filters');
        console.log('📅 PERIOD: 2024-08-05 to 2024-08-07 (3 days)');
        console.log('🎲 TARGET: ~15 high-quality articles');
        console.log('');

        // Show our filters
        this.showFilters();

        // Collect articles
        const articles = await this.collectArticles();

        if (articles.length === 0) {
            console.log('❌ No articles collected');
            return;
        }

        // Analyze results
        const analysis = this.analyzeArticles(articles);
        this.showResults(analysis, articles);

        // Optionally save
        if (process.argv.includes('--save')) {
            await this.saveArticles(analysis.relevantArticles);
        } else {
            console.log('');
            console.log('💡 Add --save flag to save these articles to database');
        }
    }

    private showFilters(): void {
        console.log('🚫 EXCLUSION FILTERS ACTIVE:');
        console.log(`   • Geographic: big apple, central park, manhattan, brooklyn, nyc...`);
        console.log(`   • Food: recipe, cooking, french toast, berries, food...`);
        console.log(`   • Adult: erogenous, sex, adult, intimate...`);
        console.log(`   • Crime: assassination, murder, robbery, assault...`);
        console.log(`   • Politics: trump assassination, biden, election...`);
        console.log(`   • Sports: baseball, football, basketball, sports...`);
        console.log(`   • Entertainment: movie, film, actor, celebrity...`);
        console.log(`   • Real Estate: landlord, tenant, rent...`);
        console.log(`   • Weather: weather, storm, hurricane...`);
        console.log(`   Total exclusion keywords: ${this.EXCLUSION_KEYWORDS.length}`);
        console.log('');
    }

    private async collectArticles(): Promise<any[]> {
        console.log('📊 COLLECTING ARTICLES...');
        console.log('─'.repeat(30));

        try {
            const articles = await this.newsService.searchAppleArticles({
                query: 'AAPL',
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'socialScore', // Use socialScore for better date distribution
                pageSize: 15
            });

            console.log(`✅ Raw collection: ${articles.length} articles`);
            return articles;

        } catch (error: any) {
            console.log(`❌ Collection failed: ${error.message}`);
            return [];
        }
    }

    private analyzeArticles(articles: any[]): any {
        console.log('🔍 ANALYZING RELEVANCE...');
        console.log('─'.repeat(30));

        let relevant = 0;
        let irrelevant = 0;
        const relevantArticles: any[] = [];
        const irrelevantArticles: any[] = [];
        const exclusionReasons: Record<string, number> = {};

        articles.forEach(article => {
            const relevanceCheck = this.checkRelevance(article);

            if (relevanceCheck.isRelevant) {
                relevant++;
                relevantArticles.push(article);
            } else {
                irrelevant++;
                irrelevantArticles.push({
                    ...article,
                    exclusionReason: relevanceCheck.reason
                });

                // Track exclusion reasons
                exclusionReasons[relevanceCheck.reason] = (exclusionReasons[relevanceCheck.reason] || 0) + 1;
            }
        });

        const relevanceRate = Math.round((relevant / articles.length) * 100);

        return {
            total: articles.length,
            relevant,
            irrelevant,
            relevanceRate,
            relevantArticles,
            irrelevantArticles,
            exclusionReasons
        };
    }

    private checkRelevance(article: any): { isRelevant: boolean; reason: string } {
        const title = article.title?.toLowerCase() || '';
        const body = article.body?.toLowerCase() || '';
        const searchText = title + ' ' + body;

        // Check exclusion keywords first
        for (const keyword of this.EXCLUSION_KEYWORDS) {
            if (searchText.includes(keyword)) {
                return {
                    isRelevant: false,
                    reason: this.categorizeExclusion(keyword)
                };
            }
        }

        // Check for Apple relevance indicators
        const appleIndicators = [
            'apple inc', 'aapl', 'tim cook', 'cupertino',
            'iphone', 'ipad', 'mac', 'ios', 'app store',
            'apple stock', 'apple shares', 'apple company',
            'apple earnings', 'apple revenue'
        ];

        if (appleIndicators.some(indicator => searchText.includes(indicator))) {
            return { isRelevant: true, reason: 'Strong Apple indicator' };
        }

        // If contains "apple" but needs business context
        if (searchText.includes('apple')) {
            const businessContext = [
                'stock', 'shares', 'market', 'earnings', 'revenue', 'profit',
                'technology', 'business', 'company', 'investor', 'financial'
            ];

            if (businessContext.some(context => searchText.includes(context))) {
                return { isRelevant: true, reason: 'Apple + business context' };
            } else {
                return { isRelevant: false, reason: 'Apple without business context' };
            }
        }

        return { isRelevant: false, reason: 'Not about Apple' };
    }

    private categorizeExclusion(keyword: string): string {
        if (['big apple', 'central park', 'manhattan', 'brooklyn', 'nyc'].some(k => keyword.includes(k))) {
            return 'Geographic/NYC';
        }
        if (['recipe', 'cooking', 'food', 'restaurant', 'meal'].some(k => keyword.includes(k))) {
            return 'Food/Recipe';
        }
        if (['erogenous', 'sex', 'adult', 'intimate'].some(k => keyword.includes(k))) {
            return 'Adult Content';
        }
        if (['assassination', 'murder', 'robbery', 'assault', 'crime'].some(k => keyword.includes(k))) {
            return 'Crime/Violence';
        }
        if (['trump', 'biden', 'election', 'vote', 'political'].some(k => keyword.includes(k))) {
            return 'Politics';
        }
        if (['baseball', 'football', 'basketball', 'sports', 'game'].some(k => keyword.includes(k))) {
            return 'Sports';
        }
        if (['movie', 'film', 'actor', 'celebrity', 'music'].some(k => keyword.includes(k))) {
            return 'Entertainment';
        }
        if (['landlord', 'tenant', 'rent', 'real estate'].some(k => keyword.includes(k))) {
            return 'Real Estate';
        }
        return 'Other Exclusion';
    }

    private showResults(analysis: any, articles: any[]): void {
        console.log('');
        console.log('📊 RESULTS SUMMARY');
        console.log('─'.repeat(40));

        const status = analysis.relevanceRate >= 80 ? '✅' : analysis.relevanceRate >= 60 ? '⚠️' : '❌';

        console.log(`${status} OVERALL PERFORMANCE:`);
        console.log(`   Total collected: ${analysis.total} articles`);
        console.log(`   Relevant: ${analysis.relevant} articles`);
        console.log(`   Irrelevant: ${analysis.irrelevant} articles`);
        console.log(`   Relevance rate: ${analysis.relevanceRate}%`);
        console.log('');

        // Show exclusion breakdown
        if (Object.keys(analysis.exclusionReasons).length > 0) {
            console.log('🚫 EXCLUSION BREAKDOWN:');
            Object.entries(analysis.exclusionReasons).forEach(([reason, count]) => {
                console.log(`   ${reason}: ${count} articles`);
            });
            console.log('');
        }

        // Show relevant articles
        if (analysis.relevantArticles.length > 0) {
            console.log('✅ RELEVANT ARTICLES:');
            analysis.relevantArticles.forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Source: ${article.source?.title || 'Unknown'}`);
                console.log(`      Date: ${this.formatDate(article.date || article.dateTime)}`);
            });
            console.log('');
        }

        // Show sample irrelevant articles
        if (analysis.irrelevantArticles.length > 0) {
            console.log('❌ SAMPLE IRRELEVANT ARTICLES:');
            analysis.irrelevantArticles.slice(0, 3).forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Reason: ${article.exclusionReason}`);
            });
            if (analysis.irrelevantArticles.length > 3) {
                console.log(`   ... and ${analysis.irrelevantArticles.length - 3} more`);
            }
            console.log('');
        }

        // Performance comparison
        console.log('📈 PERFORMANCE COMPARISON:');
        console.log(`   Previous "Apple" query: ~31% relevance`);
        console.log(`   Current "AAPL" + filters: ${analysis.relevanceRate}% relevance`);
        console.log(`   Improvement: +${analysis.relevanceRate - 31} percentage points`);
        console.log(`   Token efficiency: ${100 - analysis.irrelevant / analysis.total * 100}% useful`);
    }

    private formatDate(dateStr: string): string {
        if (!dateStr) return 'Unknown';
        try {
            // Handle various date formats
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
        } catch {
            return dateStr;
        }
    }

    private async saveArticles(relevantArticles: any[]): Promise<void> {
        console.log('💾 SAVING RELEVANT ARTICLES');
        console.log('─'.repeat(30));

        let savedCount = 0;
        let errorCount = 0;

        for (const article of relevantArticles) {
            try {
                // Fix date parsing
                let publishedAt: string;
                try {
                    publishedAt = new Date(article.date || article.dateTime || new Date()).toISOString();
                } catch {
                    publishedAt = new Date().toISOString();
                }

                const articleData = {
                    external_id: article.uri || `aapl_single_${Date.now()}_${Math.random()}`,
                    external_id_type: 'newsapi_ai_uri',
                    title: article.title || 'Untitled',
                    url: article.url,
                    published_at: publishedAt,
                    source: article.source?.title || 'Unknown',
                    article_description: article.body?.substring(0, 1000),
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai',
                    content_type: 'aapl_single_period_test',
                    apple_relevance_score: 0.9,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error } = await this.supabase
                    .from('articles')
                    .upsert(articleData, { onConflict: 'url' });

                if (error) {
                    console.log(`❌ Failed: ${article.title?.substring(0, 40)}... (${error.message})`);
                    errorCount++;
                } else {
                    savedCount++;
                }

            } catch (error: any) {
                console.log(`❌ Error: ${error.message}`);
                errorCount++;
            }
        }

        console.log(`✅ Saved: ${savedCount} articles`);
        if (errorCount > 0) {
            console.log(`⚠️  Errors: ${errorCount} articles`);
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('🧪 SINGLE PERIOD AAPL COLLECTION TEST');
        console.log('Available flags:');
        console.log('  --save: Save relevant articles to database');
        console.log('');

        const tester = new SinglePeriodAAPLTest();
        await tester.testSinglePeriod();

    } catch (error: any) {
        console.error('❌ Single period test failed:', error.message);
    }
}

main();
