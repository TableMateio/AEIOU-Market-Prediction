#!/usr/bin/env npx tsx

/**
 * Collect articles and save them to Supabase database
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

interface Article {
    title: string;
    body: string | null;
    url: string;
    source: string;
    published_at: string;
    scraped_at: string;
    scraping_status: string;
    data_source: string;
    external_id: string;
    external_id_type: string;
    keywords: string[];
    relevance_score: number | null;
    category: string | null;
    content_type: string;
    target_audience: string;
}

class DatabaseArticleCollector {
    private newsApiKey: string;
    private supabaseUrl: string;
    private supabaseKey: string;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseKey = process.env.SUPABASE_ANON_KEY || '';

        if (!this.newsApiKey) {
            throw new Error('NEWSAPIAI_API_KEY required');
        }
        if (!this.supabaseUrl || !this.supabaseKey) {
            throw new Error('Supabase credentials required');
        }
    }

    /**
     * Collect diverse articles using your preferred approach
     */
    async collectDiverseArticles(): Promise<void> {
        console.log('🎯 Collecting Diverse Articles for Database');
        console.log('='.repeat(70));
        console.log('Strategy: Random sampling across time, sources, and topics');
        console.log('');

        // Define diverse search strategies (addressing your randomization request)
        const searches = [
            // Time-based diversity
            { query: 'Apple', dateStart: '2024-01-01', dateEnd: '2024-12-31', sort: 'relevance', count: 15, description: '2024 most relevant' },
            { query: 'Apple', dateStart: '2023-01-01', dateEnd: '2023-12-31', sort: 'date', count: 15, description: '2023 chronological' },
            { query: 'Apple', dateStart: '2022-01-01', dateEnd: '2022-12-31', sort: 'socialScore', count: 10, description: '2022 most discussed' },

            // Topic-based diversity (but not limiting to business dimensions)
            { query: 'Apple iPhone', dateStart: '2023-01-01', dateEnd: '2024-12-31', sort: 'relevance', count: 10, description: 'iPhone focus' },
            { query: 'Apple stock', dateStart: '2023-01-01', dateEnd: '2024-12-31', sort: 'date', count: 10, description: 'Stock/financial focus' },
            { query: 'Apple earnings', dateStart: '2022-01-01', dateEnd: '2024-12-31', sort: 'relevance', count: 8, description: 'Earnings focus' },

            // Source quality diversity
            { query: 'Apple', dateStart: '2024-01-01', dateEnd: '2024-12-31', sort: 'relevance', count: 12, description: 'Top sources only', sourceFilter: true }
        ];

        const allArticles: any[] = [];
        let totalTokens = 0;

        for (const search of searches) {
            console.log(`\n🔍 ${search.description}`);
            console.log(`   Query: "${search.query}" (${search.dateStart} to ${search.dateEnd})`);
            console.log(`   Sort: ${search.sort}, Count: ${search.count}`);

            try {
                const params: any = {
                    resultType: 'articles',
                    keyword: search.query,
                    lang: 'eng',
                    dateStart: search.dateStart,
                    dateEnd: search.dateEnd,
                    articlesSortBy: search.sort,
                    includeArticleBody: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    includeArticleSocialScore: true,
                    includeArticleSource: true,
                    articlesCount: search.count,
                    apiKey: this.newsApiKey
                };

                // Add source filtering for quality (your suggestion about top 25%)
                if (search.sourceFilter) {
                    params.sourceLocationUri = 'http://en.wikipedia.org/wiki/United_States';
                    params.sourceRankingThreshold = 25; // Top 25% by Alexa ranking
                    console.log('   🏢 Using top 25% US sources filter');
                }

                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params,
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const totalAvailable = response.data?.articles?.totalResults || 0;

                console.log(`   📊 Found: ${articles.length} articles (${totalAvailable} total available)`);

                // Filter for Apple relevance (avoiding "how to use this feature" type articles)
                const relevantArticles = this.filterAppleRelevance(articles);
                console.log(`   ✅ Apple-relevant: ${relevantArticles.length} articles`);

                allArticles.push(...relevantArticles.map(a => ({
                    ...a,
                    searchQuery: search.query,
                    searchDescription: search.description,
                    sortOrder: search.sort
                })));

                // Calculate token cost
                const startYear = parseInt(search.dateStart.split('-')[0]);
                const endYear = parseInt(search.dateEnd.split('-')[0]);
                const tokensUsed = (endYear - startYear + 1) * 5;
                totalTokens += tokensUsed;

                console.log(`   💰 Tokens: ${tokensUsed} (Total: ${totalTokens})`);

                if (relevantArticles.length > 0) {
                    const sources = [...new Set(relevantArticles.map(a => a.source?.title).filter(Boolean))];
                    console.log(`   🏢 Sources: ${sources.length} unique (${sources.slice(0, 3).join(', ')}...)`);
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed: ${error.message}`);
            }
        }

        // Deduplicate articles
        const uniqueArticles = this.deduplicateArticles(allArticles);

        console.log(`\n📊 Collection Summary:`);
        console.log(`   Raw articles collected: ${allArticles.length}`);
        console.log(`   Unique articles (after dedup): ${uniqueArticles.length}`);
        console.log(`   Total tokens used: ${totalTokens}`);
        console.log(`   Efficiency: ${Math.round(uniqueArticles.length / totalTokens)} articles per token`);

        // Analyze diversity
        this.analyzeDiversity(uniqueArticles);

        // Save to database
        if (uniqueArticles.length > 0) {
            console.log('\n💾 Saving to Supabase database...');
            await this.saveToSupabase(uniqueArticles);
        }
    }

    /**
     * Filter articles to ensure Apple business relevance
     */
    private filterAppleRelevance(articles: any[]): any[] {
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const body = (article.body || '').toLowerCase();

            // Must mention Apple/AAPL in title or body
            const hasAppleMention = title.includes('apple') || title.includes('aapl') ||
                body.includes('apple inc') || body.includes('aapl');

            if (!hasAppleMention) return false;

            // Exclude tutorial/how-to articles (your concern about "here's how to use this feature")
            const excludePatterns = [
                'how to', 'tutorial', 'guide to', 'step by step', 'tips and tricks',
                'settings', 'configure', 'setup', 'install', 'update your',
                'fix your', 'troubleshoot', 'problem with', 'issue with'
            ];

            const isHowTo = excludePatterns.some(pattern =>
                title.includes(pattern) || body.substring(0, 500).includes(pattern)
            );

            if (isHowTo) return false;

            // Must have substantial content
            if (!article.body || article.body.length < 300) return false;

            return true;
        });
    }

    /**
     * Remove duplicate articles based on URL and title similarity
     */
    private deduplicateArticles(articles: any[]): any[] {
        const unique: any[] = [];
        const seenUrls = new Set<string>();

        for (const article of articles) {
            // Skip if URL already seen
            if (seenUrls.has(article.url)) continue;

            // Skip if very similar title exists
            const title = article.title.toLowerCase();
            const titleWords = title.split(' ').filter(w => w.length > 3);

            const isDuplicate = unique.some(existing => {
                const existingTitle = existing.title.toLowerCase();
                const existingWords = existingTitle.split(' ').filter(w => w.length > 3);
                const commonWords = titleWords.filter(w => existingWords.includes(w));
                return commonWords.length / Math.max(titleWords.length, existingWords.length) > 0.7;
            });

            if (!isDuplicate) {
                unique.push(article);
                seenUrls.add(article.url);
            }
        }

        return unique;
    }

    /**
     * Analyze diversity of collected articles
     */
    private analyzeDiversity(articles: any[]): void {
        console.log('\n📊 Diversity Analysis:');

        // Temporal diversity
        const byYear = articles.reduce((acc, a) => {
            const year = new Date(a.date || a.dateTime).getFullYear();
            acc[year] = (acc[year] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        console.log('   📅 Temporal Distribution:');
        Object.entries(byYear).sort().forEach(([year, count]) => {
            console.log(`      ${year}: ${count} articles`);
        });

        // Source diversity
        const sources = [...new Set(articles.map(a => a.source?.title).filter(Boolean))];
        console.log(`   🏢 Source Diversity: ${sources.length} unique sources`);
        console.log(`      Top sources: ${sources.slice(0, 8).join(', ')}`);

        // Search strategy diversity
        const byStrategy = articles.reduce((acc, a) => {
            acc[a.searchDescription] = (acc[a.searchDescription] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('   🎯 Search Strategy Distribution:');
        Object.entries(byStrategy).forEach(([strategy, count]) => {
            console.log(`      ${strategy}: ${count} articles`);
        });

        // Content quality
        const avgLength = articles.reduce((sum, a) => sum + (a.body?.length || 0), 0) / articles.length;
        const withConcepts = articles.filter(a => a.concepts && a.concepts.length > 0).length;

        console.log('   📄 Content Quality:');
        console.log(`      Average length: ${Math.round(avgLength)} characters`);
        console.log(`      With concepts: ${withConcepts}/${articles.length} (${Math.round((withConcepts / articles.length) * 100)}%)`);
    }

    /**
     * Save articles to Supabase database
     */
    private async saveToSupabase(articles: any[]): Promise<void> {
        console.log(`   Preparing ${articles.length} articles for database...`);

        const convertedArticles = articles.map(article => ({
            title: article.title || 'No title',
            body: article.body || null,
            url: article.url || '',
            source: article.source?.title || 'Unknown',
            published_at: new Date(article.date || article.dateTime).toISOString(),
            scraped_at: new Date().toISOString(),
            scraping_status: article.body ? 'success' : 'no_content',
            data_source: 'newsapi_ai',
            external_id: article.uri || article.url || '',
            external_id_type: 'eventregistry_uri',
            keywords: this.extractKeywords(article),
            relevance_score: article.relevance || null,
            category: this.extractCategory(article),
            content_type: this.determineContentType(article),
            target_audience: this.determineTargetAudience(article),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));

        // Save to database using REST API
        try {
            const response = await axios.post(
                `${this.supabaseUrl}/rest/v1/articles`,
                convertedArticles,
                {
                    headers: {
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                    }
                }
            );

            console.log(`   ✅ Successfully saved ${convertedArticles.length} articles to database`);
            console.log(`   📊 Check your Supabase articles table to see the results!`);

        } catch (error: any) {
            console.log(`   ❌ Database save failed: ${error.message}`);

            // Fallback: save to JSON file
            const fs = await import('fs/promises');
            const path = await import('path');

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `articles_${timestamp}.json`;
            const filepath = path.join(process.cwd(), 'data', filename);

            try {
                await fs.mkdir(path.dirname(filepath), { recursive: true });
                await fs.writeFile(filepath, JSON.stringify(convertedArticles, null, 2));
                console.log(`   💾 Saved articles to local file: ${filepath}`);
            } catch (fileError: any) {
                console.log(`   ❌ File save also failed: ${fileError.message}`);
            }
        }
    }

    // Helper methods
    private extractKeywords(article: any): string[] {
        const keywords: string[] = [];
        if (article.concepts) {
            keywords.push(...article.concepts.map((c: any) => c.label).filter(Boolean));
        }
        if (article.categories) {
            keywords.push(...article.categories.map((c: any) => c.label).filter(Boolean));
        }
        return keywords.slice(0, 10);
    }

    private extractCategory(article: any): string | null {
        if (article.categories && article.categories.length > 0) {
            return article.categories[0].label || null;
        }
        return null;
    }

    private determineContentType(article: any): string {
        const title = (article.title || '').toLowerCase();
        const query = (article.searchQuery || '').toLowerCase();

        if (query.includes('earnings') || title.includes('earnings')) return 'earnings';
        if (query.includes('stock') || title.includes('stock')) return 'stock_news';
        if (query.includes('iphone') || title.includes('iphone')) return 'product_news';

        return 'general_news';
    }

    private determineTargetAudience(article: any): string {
        const source = (article.source?.title || '').toLowerCase();

        if (source.includes('bloomberg') || source.includes('reuters') || source.includes('wall street')) return 'institutional';
        if (source.includes('yahoo') || source.includes('marketwatch') || source.includes('cnbc')) return 'retail';

        return 'general';
    }
}

// Main execution
async function main() {
    try {
        const collector = new DatabaseArticleCollector();
        await collector.collectDiverseArticles();

    } catch (error: any) {
        console.error('❌ Collection failed:', error.message);
        console.log('\n💡 Make sure you have:');
        console.log('   • NEWSAPIAI_API_KEY in your .env file');
        console.log('   • SUPABASE_URL in your .env file');
        console.log('   • SUPABASE_ANON_KEY in your .env file');
    }
}

main();
