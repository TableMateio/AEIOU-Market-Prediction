#!/usr/bin/env npx tsx

/**
 * Improved Apple article collection with strict relevance filtering
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import { NewsApiAiService } from '../services/newsApiAiService';

interface CollectionResult {
    collected: number;
    relevant: number;
    irrelevant: number;
    relevanceRate: number;
    samples: any[];
}

class ImprovedAppleCollector {
    private supabase: any;
    private newsService: NewsApiAiService;

    // Comprehensive exclusion filters
    private readonly EXCLUSION_KEYWORDS = [
        // NYC/Geographic references
        'big apple', 'the big apple', 'central park', 'manhattan', 'brooklyn',
        'new york city', 'nyc', 'bronx', 'queens', 'staten island',

        // Food/Recipe content
        'recipe', 'cooking', 'french toast', 'berries', 'food', 'restaurant',
        'meal', 'breakfast', 'dinner', 'lunch', 'kitchen', 'chef',

        // Adult/Inappropriate content
        'erogenous', 'sex', 'adult', 'intimate', 'sexual', 'erotic',

        // Crime/Violence
        'assassination', 'murder', 'robbery', 'assault', 'crime', 'shooting',
        'killed', 'death', 'violence', 'attack', 'terrorist',

        // Politics (non-business)
        'trump assassination', 'biden', 'election', 'vote', 'republican',
        'democrat', 'congress', 'senate', 'political',

        // Sports
        'baseball', 'football', 'basketball', 'soccer', 'sports', 'game',
        'team', 'player', 'coach', 'stadium',

        // Entertainment/Celebrity
        'movie', 'film', 'actor', 'celebrity', 'music', 'concert',
        'album', 'song', 'entertainment',

        // Real Estate
        'landlord', 'tenant', 'rent', 'real estate', 'property', 'housing',

        // Health/Medical (non-tech)
        'medical', 'doctor', 'hospital', 'disease', 'health condition',

        // Weather/Natural disasters
        'weather', 'storm', 'hurricane', 'earthquake', 'flood'
    ];

    private readonly EXCLUSION_CONCEPTS = [
        'New York City',
        'Manhattan',
        'Central Park',
        'Food and Cooking',
        'Recipes',
        'Crime and Violence',
        'Politics',
        'Sports',
        'Entertainment',
        'Real Estate',
        'Weather'
    ];

    private readonly REQUIRED_CONCEPTS = [
        'Apple Inc.',
        'Technology Companies',
        'Consumer Electronics',
        'Software',
        'Stock Market',
        'Business',
        'Technology Industry'
    ];

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
        this.newsService = new NewsApiAiService();
    }

    async testImprovedCollection(): Promise<void> {
        console.log('🎯 TESTING IMPROVED APPLE COLLECTION');
        console.log('='.repeat(60));
        console.log('');

        // Test different search strategies
        await this.testSearchStrategy1();
        await this.testSearchStrategy2();
        await this.testSearchStrategy3();

        console.log('🎯 RECOMMENDATION SUMMARY');
        console.log('─'.repeat(40));
        console.log('Based on tests above, use the strategy with highest relevance rate');
        console.log('for production collection.');
    }

    /**
     * Strategy 1: "Apple Inc" with business categories
     */
    private async testSearchStrategy1(): Promise<void> {
        console.log('🧪 STRATEGY 1: "Apple Inc" + Business Categories');
        console.log('─'.repeat(50));

        try {
            const result = await this.newsService.searchAppleArticles({
                query: 'Apple Inc',
                dateStart: '2024-08-05',
                dateEnd: '2024-08-07',
                articlesCount: 15,
                sortBy: 'socialScore',
                sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States',
                excludeKeywords: this.EXCLUSION_KEYWORDS,
                categories: ['business', 'technology', 'economy'],
                concepts: this.REQUIRED_CONCEPTS,
                excludeConcepts: this.EXCLUSION_CONCEPTS
            });

            if (result.success && result.articles) {
                const analysis = this.analyzeRelevance(result.articles, 'Apple Inc + Categories');
                this.showAnalysisResults(analysis);
            } else {
                console.log(`❌ Strategy 1 failed: ${result.error}`);
            }

        } catch (error: any) {
            console.log(`❌ Strategy 1 error: ${error.message}`);
        }

        console.log('');
    }

    /**
     * Strategy 2: "Apple company" with concept filtering
     */
    private async testSearchStrategy2(): Promise<void> {
        console.log('🧪 STRATEGY 2: "Apple company" + Concept Filtering');
        console.log('─'.repeat(50));

        try {
            const result = await this.newsService.searchAppleArticles({
                query: 'Apple company',
                dateStart: '2024-08-05',
                dateEnd: '2024-08-07',
                articlesCount: 15,
                sortBy: 'socialScore',
                sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States',
                excludeKeywords: this.EXCLUSION_KEYWORDS,
                concepts: ['Apple Inc.', 'Technology Companies', 'Consumer Electronics'],
                excludeConcepts: this.EXCLUSION_CONCEPTS
            });

            if (result.success && result.articles) {
                const analysis = this.analyzeRelevance(result.articles, 'Apple company + Concepts');
                this.showAnalysisResults(analysis);
            } else {
                console.log(`❌ Strategy 2 failed: ${result.error}`);
            }

        } catch (error: any) {
            console.log(`❌ Strategy 2 error: ${error.message}`);
        }

        console.log('');
    }

    /**
     * Strategy 3: "AAPL" stock symbol approach
     */
    private async testSearchStrategy3(): Promise<void> {
        console.log('🧪 STRATEGY 3: "AAPL" Stock Symbol');
        console.log('─'.repeat(50));

        try {
            const result = await this.newsService.searchAppleArticles({
                query: 'AAPL Apple Inc',
                dateStart: '2024-08-05',
                dateEnd: '2024-08-07',
                articlesCount: 15,
                sortBy: 'socialScore',
                sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States',
                excludeKeywords: this.EXCLUSION_KEYWORDS,
                categories: ['business', 'technology'],
                concepts: ['Apple Inc.', 'Stock Market', 'Technology Companies']
            });

            if (result.success && result.articles) {
                const analysis = this.analyzeRelevance(result.articles, 'AAPL Stock Symbol');
                this.showAnalysisResults(analysis);
            } else {
                console.log(`❌ Strategy 3 failed: ${result.error}`);
            }

        } catch (error: any) {
            console.log(`❌ Strategy 3 error: ${error.message}`);
        }

        console.log('');
    }

    /**
     * Analyze relevance of articles
     */
    private analyzeRelevance(articles: any[], strategyName: string): CollectionResult {
        let relevant = 0;
        let irrelevant = 0;
        const samples: any[] = [];

        articles.forEach(article => {
            const title = article.title?.toLowerCase() || '';
            const body = article.body?.toLowerCase() || '';
            const searchText = title + ' ' + body;

            // Check for Apple Inc. relevance
            const hasAppleCompany = searchText.includes('apple inc') ||
                searchText.includes('apple company') ||
                searchText.includes('aapl') ||
                (searchText.includes('apple') && (
                    searchText.includes('iphone') ||
                    searchText.includes('ipad') ||
                    searchText.includes('mac') ||
                    searchText.includes('ios') ||
                    searchText.includes('tim cook') ||
                    searchText.includes('cupertino') ||
                    searchText.includes('app store')
                ));

            // Check for exclusion keywords
            const hasExcludedContent = this.EXCLUSION_KEYWORDS.some(keyword =>
                searchText.includes(keyword)
            );

            const isRelevant = hasAppleCompany && !hasExcludedContent;

            if (isRelevant) {
                relevant++;
            } else {
                irrelevant++;
                // Collect samples of irrelevant articles
                if (samples.length < 5) {
                    samples.push({
                        title: article.title,
                        reason: hasExcludedContent ? 'Contains excluded keywords' : 'Not about Apple Inc.'
                    });
                }
            }
        });

        const relevanceRate = Math.round((relevant / articles.length) * 100);

        return {
            collected: articles.length,
            relevant,
            irrelevant,
            relevanceRate,
            samples
        };
    }

    /**
     * Show analysis results
     */
    private showAnalysisResults(result: CollectionResult): void {
        const status = result.relevanceRate >= 80 ? '✅' : result.relevanceRate >= 60 ? '⚠️' : '❌';

        console.log(`${status} RESULTS:`);
        console.log(`   Collected: ${result.collected} articles`);
        console.log(`   Relevant: ${result.relevant} articles`);
        console.log(`   Irrelevant: ${result.irrelevant} articles`);
        console.log(`   Relevance Rate: ${result.relevanceRate}%`);

        if (result.samples.length > 0) {
            console.log('');
            console.log('📋 SAMPLE IRRELEVANT ARTICLES:');
            result.samples.forEach((sample, i) => {
                console.log(`   ${i + 1}. "${sample.title.substring(0, 60)}..."`);
                console.log(`      Reason: ${sample.reason}`);
            });
        }
    }
}

// Main execution
async function main() {
    try {
        const collector = new ImprovedAppleCollector();
        await collector.testImprovedCollection();

    } catch (error: any) {
        console.error('❌ Improved collection testing failed:', error.message);
    }
}

main();
