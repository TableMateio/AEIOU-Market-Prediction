#!/usr/bin/env npx tsx

/**
 * Analyze current articles to identify relevance issues
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

interface Article {
    id: string;
    title: string;
    url: string;
    source: string;
    data_source: string;
    apple_relevance_score: number;
    body?: string;
    article_description?: string;
}

class RelevanceAnalyzer {
    private supabase: any;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    async analyzeRelevance(): Promise<void> {
        console.log('🔍 ANALYZING ARTICLE RELEVANCE ISSUES');
        console.log('='.repeat(60));
        console.log('');

        // Get NewsAPI.ai articles for analysis
        const articles = await this.fetchNewsApiArticles();
        if (!articles) return;

        console.log(`📊 Analyzing ${articles.length} NewsAPI.ai articles`);
        console.log('');

        // Identify problematic patterns
        await this.identifyProblematicPatterns(articles);

        // Show sample irrelevant articles
        await this.showIrrelevantSamples(articles);

        // Analyze by source
        await this.analyzeBySource(articles);

        // Suggest improvements
        await this.suggestImprovements(articles);
    }

    /**
     * Fetch NewsAPI.ai articles
     */
    private async fetchNewsApiArticles(): Promise<Article[] | null> {
        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('id, title, url, source, data_source, apple_relevance_score, body, article_description')
                .eq('data_source', 'newsapi_ai')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error fetching articles: ${error.message}`);
                return null;
            }

            return articles;

        } catch (error: any) {
            console.log(`❌ Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Identify problematic patterns in titles and content
     */
    private async identifyProblematicPatterns(articles: Article[]): Promise<void> {
        console.log('🚨 IDENTIFYING PROBLEMATIC PATTERNS');
        console.log('─'.repeat(50));

        // Define problematic keywords and patterns
        const problematicPatterns = {
            'Big Apple (NYC)': ['big apple', 'the big apple'],
            'Food/Recipes': ['recipe', 'cooking', 'french toast', 'berries', 'food', 'restaurant', 'meal'],
            'Adult Content': ['erogenous', 'sex', 'adult', 'intimate'],
            'Crime/Violence': ['assassination', 'murder', 'robbery', 'assault', 'crime', 'shooting'],
            'NYC/Geography': ['central park', 'manhattan', 'brooklyn', 'new york city', 'nyc landlord'],
            'Politics (Non-Apple)': ['trump', 'biden', 'election', 'politics', 'government'],
            'Sports': ['baseball', 'football', 'basketball', 'sports', 'game', 'team'],
            'Entertainment': ['movie', 'film', 'actor', 'celebrity', 'music', 'concert'],
            'Health/Medical': ['health', 'medical', 'doctor', 'hospital', 'disease'],
            'Generic Tech': ['google only', 'microsoft only', 'amazon only', 'facebook only']
        };

        const categoryMatches: Record<string, Article[]> = {};

        // Categorize articles by problematic patterns
        for (const [category, keywords] of Object.entries(problematicPatterns)) {
            categoryMatches[category] = articles.filter(article => {
                const searchText = (article.title + ' ' + (article.article_description || '')).toLowerCase();
                return keywords.some(keyword => searchText.includes(keyword));
            });
        }

        // Show results
        console.log('📋 PROBLEMATIC CATEGORIES FOUND:');
        let totalProblematic = 0;

        Object.entries(categoryMatches).forEach(([category, matches]) => {
            if (matches.length > 0) {
                console.log(`   ${category}: ${matches.length} articles`);
                totalProblematic += matches.length;
            }
        });

        const problematicPercentage = Math.round((totalProblematic / articles.length) * 100);
        console.log('');
        console.log(`🚨 TOTAL PROBLEMATIC: ${totalProblematic}/${articles.length} articles (${problematicPercentage}%)`);
        console.log('');

        // Show specific examples
        console.log('📋 EXAMPLE PROBLEMATIC TITLES:');
        Object.entries(categoryMatches).forEach(([category, matches]) => {
            if (matches.length > 0) {
                console.log(`   ${category}:`);
                matches.slice(0, 2).forEach(article => {
                    console.log(`      "${article.title.substring(0, 80)}..."`);
                });
                if (matches.length > 2) {
                    console.log(`      ... and ${matches.length - 2} more`);
                }
                console.log('');
            }
        });
    }

    /**
     * Show sample irrelevant articles
     */
    private async showIrrelevantSamples(articles: Article[]): Promise<void> {
        console.log('📋 SAMPLE IRRELEVANT ARTICLES');
        console.log('─'.repeat(40));

        // Find articles with low relevance scores or problematic titles
        const irrelevantSamples = articles
            .filter(article => {
                const title = article.title.toLowerCase();
                return (
                    article.apple_relevance_score < 0.5 ||
                    title.includes('big apple') ||
                    title.includes('french toast') ||
                    title.includes('erogenous') ||
                    title.includes('trump') ||
                    title.includes('central park') ||
                    title.includes('landlord')
                );
            })
            .slice(0, 10);

        irrelevantSamples.forEach((article, i) => {
            console.log(`${i + 1}. "${article.title}"`);
            console.log(`   Source: ${article.source}`);
            console.log(`   Relevance: ${article.apple_relevance_score || 'N/A'}`);
            console.log(`   URL: ${article.url.substring(0, 60)}...`);
            console.log('');
        });

        if (irrelevantSamples.length === 0) {
            console.log('✅ No obviously irrelevant articles found in sample');
        }
    }

    /**
     * Analyze articles by source
     */
    private async analyzeBySource(articles: Article[]): Promise<void> {
        console.log('📊 ANALYSIS BY SOURCE');
        console.log('─'.repeat(30));

        const sourceGroups = articles.reduce((acc: Record<string, Article[]>, article) => {
            const source = article.source || 'Unknown';
            if (!acc[source]) acc[source] = [];
            acc[source].push(article);
            return acc;
        }, {});

        // Calculate relevance by source
        const sourceStats = Object.entries(sourceGroups).map(([source, articles]) => {
            const relevantCount = articles.filter(a => (a.apple_relevance_score || 0) > 0.7).length;
            const relevanceRate = Math.round((relevantCount / articles.length) * 100);
            return {
                source,
                total: articles.length,
                relevant: relevantCount,
                relevanceRate,
                avgScore: articles.reduce((sum, a) => sum + (a.apple_relevance_score || 0), 0) / articles.length
            };
        }).sort((a, b) => b.relevanceRate - a.relevanceRate);

        console.log('📋 SOURCE RELEVANCE RATES:');
        sourceStats.slice(0, 10).forEach(stat => {
            const status = stat.relevanceRate > 70 ? '✅' : stat.relevanceRate > 40 ? '⚠️' : '❌';
            console.log(`   ${status} ${stat.source}: ${stat.relevanceRate}% relevant (${stat.relevant}/${stat.total})`);
        });

        console.log('');
        console.log('📋 WORST PERFORMING SOURCES:');
        sourceStats.slice(-5).forEach(stat => {
            console.log(`   ❌ ${stat.source}: ${stat.relevanceRate}% relevant (${stat.relevant}/${stat.total})`);
        });
    }

    /**
     * Suggest improvements
     */
    private async suggestImprovements(articles: Article[]): Promise<void> {
        console.log('');
        console.log('💡 SUGGESTED IMPROVEMENTS');
        console.log('─'.repeat(40));

        console.log('🚫 EXCLUSION KEYWORDS TO ADD:');
        console.log('   - "big apple" (NYC references)');
        console.log('   - "french toast", "recipe", "cooking" (food content)');
        console.log('   - "central park", "manhattan", "brooklyn" (NYC locations)');
        console.log('   - "trump", "assassination", "politics" (political content)');
        console.log('   - "erogenous", "sex", "adult" (inappropriate content)');
        console.log('   - "robbery", "assault", "crime" (crime content)');
        console.log('   - "landlord", "real estate" (property content)');
        console.log('');

        console.log('🎯 IMPROVED SEARCH STRATEGIES:');
        console.log('   1. Use "Apple Inc" instead of just "Apple"');
        console.log('   2. Add concept filters for "technology companies"');
        console.log('   3. Exclude geographic concepts like "New York City"');
        console.log('   4. Focus on business/tech categories only');
        console.log('   5. Filter by source quality (top business publications)');
        console.log('');

        console.log('🧹 CLEANUP RECOMMENDATIONS:');
        const lowRelevanceCount = articles.filter(a => (a.apple_relevance_score || 0) < 0.5).length;
        console.log(`   - Remove ${lowRelevanceCount} articles with relevance < 0.5`);
        console.log('   - Remove articles with "Big Apple" in title');
        console.log('   - Remove non-business content categories');
        console.log('');

        console.log('📊 ESTIMATED IMPROVEMENT:');
        const currentRelevant = articles.filter(a => (a.apple_relevance_score || 0) > 0.7).length;
        const currentRate = Math.round((currentRelevant / articles.length) * 100);
        console.log(`   Current relevance rate: ${currentRate}%`);
        console.log(`   Target relevance rate: >80%`);
        console.log(`   Expected token savings: ~60% fewer irrelevant articles`);
    }
}

// Main execution
async function main() {
    try {
        const analyzer = new RelevanceAnalyzer();
        await analyzer.analyzeRelevance();

    } catch (error: any) {
        console.error('❌ Relevance analysis failed:', error.message);
    }
}

main();
