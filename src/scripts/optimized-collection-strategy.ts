#!/usr/bin/env npx tsx

/**
 * Optimized Collection Strategy
 * Based on testing results and your requirements
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';
import axios from 'axios';

class OptimizedCollector {
    private newsApiKey: string;
    private supabase: any;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    /**
     * Execute optimized collection based on all our testing
     */
    async executeOptimizedCollection(targetArticles: number = 100): Promise<void> {
        console.log('🎯 OPTIMIZED COLLECTION STRATEGY');
        console.log('='.repeat(60));
        console.log(`Target: ${targetArticles} diverse articles`);
        console.log('Based on: Date randomization + Source filtering + Query variety');
        console.log('');

        // Strategy: Mix of approaches based on testing results
        const strategies = this.createOptimizedStrategies(targetArticles);

        console.log('📋 Collection Strategies:');
        strategies.forEach((strategy, i) => {
            console.log(`   ${i + 1}. ${strategy.description} (${strategy.expectedArticles} articles, ${strategy.tokens} tokens)`);
        });

        const totalTokens = strategies.reduce((sum, s) => sum + s.tokens, 0);
        console.log(`   💰 Total tokens: ${totalTokens} (~$${Math.round(totalTokens * 90 / 5000)})`);
        console.log('');

        // Execute each strategy
        const allArticles: any[] = [];
        let executedTokens = 0;

        for (const [index, strategy] of strategies.entries()) {
            console.log(`\n🚀 Executing Strategy ${index + 1}: ${strategy.description}`);
            console.log('─'.repeat(50));

            try {
                const articles = await this.executeStrategy(strategy);

                console.log(`   📊 Collected: ${articles.length} articles`);

                if (articles.length > 0) {
                    // Filter and add to collection
                    const relevantArticles = this.filterAppleRelevance(articles);
                    console.log(`   ✅ Apple-relevant: ${relevantArticles.length} articles`);

                    allArticles.push(...relevantArticles.map(a => ({
                        ...a,
                        strategyUsed: strategy.description,
                        collectionIndex: index + 1
                    })));

                    // Show sample
                    if (relevantArticles.length > 0) {
                        console.log(`   📰 Sample: "${relevantArticles[0].title.substring(0, 60)}..."`);
                    }
                }

                executedTokens += strategy.tokens;
                console.log(`   💰 Tokens used: ${strategy.tokens} (Total: ${executedTokens})`);

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error: any) {
                console.log(`   ❌ Strategy failed: ${error.message}`);
            }
        }

        // Deduplicate and analyze
        const uniqueArticles = this.deduplicateArticles(allArticles);

        console.log('\n📊 COLLECTION RESULTS');
        console.log('='.repeat(60));
        console.log(`Raw articles collected: ${allArticles.length}`);
        console.log(`Unique articles: ${uniqueArticles.length}`);
        console.log(`Deduplication rate: ${Math.round(((allArticles.length - uniqueArticles.length) / allArticles.length) * 100)}%`);
        console.log(`Token efficiency: ${Math.round(uniqueArticles.length / executedTokens)} articles per token`);

        // Analyze diversity
        this.analyzeDiversity(uniqueArticles);

        // Save to database
        if (uniqueArticles.length > 0) {
            console.log('\n💾 Saving to Database...');
            await this.saveToDatabase(uniqueArticles);
        }
    }

    /**
     * Create optimized collection strategies based on testing
     */
    private createOptimizedStrategies(targetArticles: number): any[] {
        const articlesPerStrategy = Math.ceil(targetArticles / 6);

        return [
            {
                description: '2024 Recent (socialScore for date spread)',
                query: 'Apple',
                dateStart: '2024-01-01',
                dateEnd: '2024-12-31',
                sort: 'socialScore', // Testing showed this gives best date spread
                count: articlesPerStrategy,
                sourceFilter: { sourceRankingThreshold: 50 }, // Top 50% for balance
                tokens: 5,
                expectedArticles: articlesPerStrategy
            },
            {
                description: '2023 Relevance (AAPL ticker focus)',
                query: 'AAPL',
                dateStart: '2023-01-01',
                dateEnd: '2023-12-31',
                sort: 'relevance',
                count: articlesPerStrategy,
                sourceFilter: { sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States' },
                tokens: 5,
                expectedArticles: articlesPerStrategy
            },
            {
                description: '2022 Chronological (Apple Inc formal)',
                query: 'Apple Inc',
                dateStart: '2022-01-01',
                dateEnd: '2022-12-31',
                sort: 'date',
                count: articlesPerStrategy,
                sourceFilter: { sourceRankingThreshold: 25 }, // Top 25% for quality
                tokens: 5,
                expectedArticles: articlesPerStrategy
            },
            {
                description: '2021 Social Discussion (Apple general)',
                query: 'Apple',
                dateStart: '2021-01-01',
                dateEnd: '2021-12-31',
                sort: 'socialScore',
                count: articlesPerStrategy,
                sourceFilter: {},
                tokens: 5,
                expectedArticles: articlesPerStrategy
            },
            {
                description: '2020 Stock Focus (AAPL ticker)',
                query: 'AAPL',
                dateStart: '2020-01-01',
                dateEnd: '2020-12-31',
                sort: 'relevance',
                count: articlesPerStrategy,
                sourceFilter: { sourceRankingThreshold: 50 },
                tokens: 5,
                expectedArticles: articlesPerStrategy
            },
            {
                description: '2024 Weekly Sample (better date spread)',
                query: 'Apple',
                dateStart: '2024-08-01',
                dateEnd: '2024-08-07', // One week for granular dates
                sort: 'date',
                count: Math.floor(articlesPerStrategy / 2),
                sourceFilter: { sourceLocationUri: 'http://en.wikipedia.org/wiki/United_States' },
                tokens: 5,
                expectedArticles: Math.floor(articlesPerStrategy / 2)
            }
        ];
    }

    /**
     * Execute a single collection strategy
     */
    private async executeStrategy(strategy: any): Promise<any[]> {
        const params: any = {
            resultType: 'articles',
            keyword: strategy.query,
            lang: 'eng',
            dateStart: strategy.dateStart,
            dateEnd: strategy.dateEnd,
            articlesSortBy: strategy.sort,
            includeArticleBody: true,
            includeArticleConcepts: true,
            includeArticleCategories: true,
            includeArticleSource: true,
            articlesCount: strategy.count,
            apiKey: this.newsApiKey,
            ...strategy.sourceFilter
        };

        const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
            params,
            timeout: 30000
        });

        return response.data?.articles?.results || [];
    }

    /**
     * Filter for Apple business relevance (your specific requirement)
     */
    private filterAppleRelevance(articles: any[]): any[] {
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            // Must mention Apple/AAPL
            const hasAppleMention = title.includes('apple') || title.includes('aapl') ||
                body.includes('apple inc') || body.includes('apple computer');

            if (!hasAppleMention) return false;

            // Must have substantial content
            if (!article.body || article.body.length < 300) return false;

            // Exclude how-to/tutorial articles (your specific request)
            const excludePatterns = [
                'how to', 'tutorial', 'guide to', 'step by step', 'tips and tricks',
                'settings', 'configure', 'setup', 'install', 'update your',
                'fix your', 'troubleshoot', 'problem with', 'issue with'
            ];

            const isHowTo = excludePatterns.some(pattern =>
                title.includes(pattern) || body.substring(0, 500).includes(pattern)
            );

            return !isHowTo;
        });
    }

    /**
     * Remove duplicates based on URL
     */
    private deduplicateArticles(articles: any[]): any[] {
        const seen = new Set<string>();
        return articles.filter(article => {
            if (seen.has(article.url)) return false;
            seen.add(article.url);
            return true;
        });
    }

    /**
     * Analyze collection diversity
     */
    private analyzeDiversity(articles: any[]): void {
        console.log('\n📊 DIVERSITY ANALYSIS');
        console.log('='.repeat(60));

        // Temporal diversity
        const byYear = articles.reduce((acc, a) => {
            const year = new Date(a.date || a.dateTime).getFullYear();
            acc[year] = (acc[year] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        console.log('📅 Temporal Distribution:');
        Object.entries(byYear).sort().forEach(([year, count]) => {
            console.log(`   ${year}: ${count} articles`);
        });

        // Source diversity
        const sources = [...new Set(articles.map(a => a.source?.title).filter(Boolean))];
        console.log(`\n🏢 Source Diversity: ${sources.length} unique sources`);
        console.log(`   Top sources: ${sources.slice(0, 8).join(', ')}`);

        // Strategy effectiveness
        const byStrategy = articles.reduce((acc, a) => {
            acc[a.strategyUsed] = (acc[a.strategyUsed] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('\n🎯 Strategy Effectiveness:');
        Object.entries(byStrategy).forEach(([strategy, count]) => {
            console.log(`   ${strategy}: ${count} articles`);
        });

        // Content quality
        const avgLength = articles.reduce((sum, a) => sum + (a.body?.length || 0), 0) / articles.length;
        const withConcepts = articles.filter(a => a.concepts && a.concepts.length > 0).length;

        console.log('\n📄 Content Quality:');
        console.log(`   Average length: ${Math.round(avgLength)} characters`);
        console.log(`   With metadata: ${withConcepts}/${articles.length} (${Math.round((withConcepts / articles.length) * 100)}%)`);
    }

    /**
     * Save to database using existing patterns
     */
    private async saveToDatabase(articles: any[]): Promise<void> {
        let insertedCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;

        for (const article of articles) {
            try {
                // Transform to match existing schema
                const external_id = `newsapi_ai_${Buffer.from(article.url).toString('base64').substring(0, 16)}`;

                // Calculate Apple relevance score
                let apple_relevance_score = 0.7;
                const title = (article.title || '').toLowerCase();
                const body = (article.body || '').toLowerCase();

                if (title.includes('apple') || body.includes('apple inc')) apple_relevance_score += 0.15;
                if (title.includes('aapl')) apple_relevance_score += 0.1;
                if (title.includes('earnings') || title.includes('revenue')) apple_relevance_score += 0.1;
                if (title.includes('iphone') || title.includes('product')) apple_relevance_score += 0.05;
                apple_relevance_score = Math.min(apple_relevance_score, 1.0);

                const transformedArticle = {
                    external_id,
                    external_id_type: 'newsapi_ai_optimized',
                    title: article.title.substring(0, 500),
                    url: article.url,
                    published_at: new Date(article.date || article.dateTime).toISOString(),
                    source: article.source?.title || 'Unknown',
                    article_description: article.body ? article.body.substring(0, 1000) : null,
                    body: article.body,
                    scraping_status: 'scraped',
                    data_source: 'newsapi_ai',
                    content_type: 'general_news',
                    apple_relevance_score,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { data, error } = await this.supabase
                    .from('articles')
                    .insert(transformedArticle)
                    .select('id');

                if (error) {
                    if (error.message.includes('duplicate') || error.code === '23505') {
                        duplicateCount++;
                    } else {
                        errorCount++;
                        console.log(`   ❌ Error: ${error.message}`);
                    }
                } else {
                    insertedCount++;
                    if (insertedCount <= 3) {
                        console.log(`   ✅ Saved: "${transformedArticle.title.substring(0, 50)}..."`);
                    }
                }

            } catch (insertError: any) {
                errorCount++;
                console.log(`   ❌ Insert failed: ${insertError.message}`);
            }
        }

        console.log('\n📊 Database Results:');
        console.log(`   ✅ Successfully inserted: ${insertedCount} articles`);
        console.log(`   ⚠️ Duplicates skipped: ${duplicateCount} articles`);
        console.log(`   ❌ Errors: ${errorCount} articles`);

        if (insertedCount > 0) {
            // Get updated totals
            const { data: totalCheck } = await this.supabase
                .from('articles')
                .select('id, data_source')
                .order('created_at', { ascending: false });

            if (totalCheck) {
                const bySource = totalCheck.reduce((acc: Record<string, number>, a) => {
                    acc[a.data_source] = (acc[a.data_source] || 0) + 1;
                    return acc;
                }, {});

                console.log(`\n📊 Updated Database Totals:`);
                Object.entries(bySource).forEach(([source, count]) => {
                    console.log(`   ${source}: ${count} articles`);
                });
                console.log(`   📊 Total: ${totalCheck.length} articles`);
            }
        }
    }
}

// Main execution
async function main() {
    const targetArticles = process.argv[2] ? parseInt(process.argv[2]) : 100;

    try {
        const collector = new OptimizedCollector();
        await collector.executeOptimizedCollection(targetArticles);

        console.log('\n🎉 OPTIMIZED COLLECTION COMPLETE!');
        console.log('='.repeat(60));
        console.log('✅ Used tested strategies for maximum diversity');
        console.log('✅ Applied your filtering requirements');
        console.log('✅ Integrated with existing database systems');
        console.log('✅ Ready for AI processing and ML training');

    } catch (error: any) {
        console.error('❌ Collection failed:', error.message);
    }
}

main();
