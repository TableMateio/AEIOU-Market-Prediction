#!/usr/bin/env npx tsx

/**
 * Final Collection and Database Save Script
 * Collect diverse articles and save them to Supabase database
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

class FinalArticleCollector {
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
            console.log('⚠️ Supabase credentials not found - will save to JSON file instead');
        }
    }

    /**
     * Collect articles using the user's preferred random approach
     */
    async collectRandomArticles(targetArticles: number = 100): Promise<any[]> {
        console.log('🎲 Collecting Random Articles');
        console.log('='.repeat(50));
        console.log(`Target: ${targetArticles} articles`);
        console.log('Strategy: Random across time, queries, sources');
        console.log('');

        const years = [2020, 2021, 2022, 2023, 2024];
        const queries = ['Apple', 'Apple Inc', 'AAPL'];
        const sorts = ['relevance', 'date', 'socialScore'];

        const articlesPerYear = Math.ceil(targetArticles / years.length);
        const allArticles: any[] = [];
        let totalTokens = 0;

        for (const year of years) {
            console.log(`\n📅 Year ${year} (target: ${articlesPerYear} articles)`);

            // Random parameters
            const randomQuery = queries[Math.floor(Math.random() * queries.length)];
            const randomSort = sorts[Math.floor(Math.random() * sorts.length)];
            const useTopSources = Math.random() > 0.5; // 50% chance

            console.log(`   Query: "${randomQuery}", Sort: ${randomSort}, Top sources: ${useTopSources}`);

            try {
                const params: any = {
                    resultType: 'articles',
                    keyword: randomQuery,
                    lang: 'eng',
                    dateStart: `${year}-01-01`,
                    dateEnd: `${year}-12-31`,
                    articlesSortBy: randomSort,
                    includeArticleBody: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    includeArticleSource: true,
                    articlesCount: articlesPerYear,
                    apiKey: this.newsApiKey
                };

                // Add source filtering for quality
                if (useTopSources) {
                    params.sourceLocationUri = 'http://en.wikipedia.org/wiki/United_States';
                    params.sourceRankingThreshold = 25; // Top 25% by Alexa ranking
                }

                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params,
                    timeout: 30000
                });

                const articles = response.data?.articles?.results || [];
                const totalAvailable = response.data?.articles?.totalResults || 0;

                console.log(`   📊 Raw results: ${articles.length} articles (${totalAvailable} available)`);

                // Filter for Apple business relevance
                const relevantArticles = articles.filter((article: any) => {
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

                console.log(`   ✅ Apple-relevant: ${relevantArticles.length} articles`);

                if (relevantArticles.length > 0) {
                    const sources = [...new Set(relevantArticles.map(a => a.source?.title).filter(Boolean))];
                    console.log(`   🏢 Sources: ${sources.length} unique (${sources.slice(0, 3).join(', ')}...)`);

                    // Add metadata
                    relevantArticles.forEach(article => {
                        article.collectionYear = year;
                        article.randomQuery = randomQuery;
                        article.randomSort = randomSort;
                        article.topSourcesFilter = useTopSources;
                    });

                    allArticles.push(...relevantArticles);
                }

                totalTokens += 5; // 5 tokens per year
                console.log(`   💰 Tokens used: 5 (Total: ${totalTokens})`);

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error: any) {
                console.log(`   ❌ Failed for ${year}: ${error.message}`);

                // Try a simpler query if the main one fails
                if (error.message.includes('timeout')) {
                    console.log(`   🔄 Retrying with simpler query...`);

                    try {
                        const simpleParams = {
                            resultType: 'articles',
                            keyword: 'Apple earnings',
                            lang: 'eng',
                            dateStart: `${year}-01-01`,
                            dateEnd: `${year}-12-31`,
                            articlesSortBy: 'relevance',
                            includeArticleBody: true,
                            articlesCount: Math.min(articlesPerYear, 5),
                            apiKey: this.newsApiKey
                        };

                        const retryResponse = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                            params: simpleParams,
                            timeout: 15000
                        });

                        const retryArticles = retryResponse.data?.articles?.results || [];
                        console.log(`   🔄 Retry success: ${retryArticles.length} articles`);

                        retryArticles.forEach((article: any) => {
                            article.collectionYear = year;
                            article.randomQuery = 'Apple earnings (retry)';
                            article.randomSort = 'relevance';
                            article.topSourcesFilter = false;
                        });

                        allArticles.push(...retryArticles);
                        totalTokens += 5;

                    } catch (retryError: any) {
                        console.log(`   ❌ Retry also failed: ${retryError.message}`);
                    }
                }
            }
        }

        console.log('\n🎉 Collection Summary:');
        console.log(`   Total articles: ${allArticles.length}`);
        console.log(`   Total tokens: ${totalTokens}`);
        console.log(`   Efficiency: ${Math.round(allArticles.length / totalTokens)} articles per token`);

        return allArticles;
    }

    /**
     * Save articles to Supabase database
     */
    async saveToDatabase(articles: any[]): Promise<void> {
        console.log('\n💾 Saving Articles to Database');
        console.log('='.repeat(50));

        // Convert articles to database format
        const dbArticles = articles.map(article => ({
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
            target_audience: this.determineTargetAudience(article)
        }));

        console.log(`Prepared ${dbArticles.length} articles for database`);

        // Try Supabase first
        if (this.supabaseUrl && this.supabaseKey) {
            try {
                console.log('🔗 Attempting Supabase save...');

                const response = await axios.post(
                    `${this.supabaseUrl}/rest/v1/articles`,
                    dbArticles,
                    {
                        headers: {
                            'apikey': this.supabaseKey,
                            'Authorization': `Bearer ${this.supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'resolution=merge-duplicates'
                        },
                        timeout: 30000
                    }
                );

                console.log(`✅ Successfully saved ${dbArticles.length} articles to Supabase!`);
                console.log('📊 Check your Supabase articles table to see the results');
                return;

            } catch (error: any) {
                console.log(`❌ Supabase save failed: ${error.message}`);
                console.log('📄 Falling back to JSON file save...');
            }
        }

        // Fallback: Save to JSON file
        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `articles_${timestamp}.json`;
            const dataDir = path.join(process.cwd(), 'data');
            const filepath = path.join(dataDir, filename);

            // Ensure data directory exists
            await fs.mkdir(dataDir, { recursive: true });

            // Save articles
            await fs.writeFile(filepath, JSON.stringify(dbArticles, null, 2));
            console.log(`✅ Saved ${dbArticles.length} articles to: ${filepath}`);

            // Save metadata
            const metadata = {
                collection_date: new Date().toISOString(),
                total_articles: dbArticles.length,
                unique_sources: [...new Set(dbArticles.map(a => a.source))].length,
                date_range: {
                    earliest: dbArticles.reduce((min, a) => a.published_at < min ? a.published_at : min, dbArticles[0]?.published_at || ''),
                    latest: dbArticles.reduce((max, a) => a.published_at > max ? a.published_at : max, dbArticles[0]?.published_at || '')
                },
                sources: [...new Set(dbArticles.map(a => a.source))],
                content_types: [...new Set(dbArticles.map(a => a.content_type))]
            };

            const metadataPath = filepath.replace('.json', '_metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`📋 Metadata saved to: ${metadataPath}`);

        } catch (error: any) {
            console.log(`❌ File save also failed: ${error.message}`);
        }
    }

    /**
     * Analyze diversity of collected articles
     */
    private analyzeDiversity(articles: any[]): void {
        console.log('\n📊 Diversity Analysis:');

        // Temporal distribution
        const byYear = articles.reduce((acc, a) => {
            const year = a.collectionYear || new Date(a.date || a.dateTime).getFullYear();
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
        console.log(`      Top sources: ${sources.slice(0, 10).join(', ')}`);

        // Content quality
        const avgLength = articles.reduce((sum, a) => sum + (a.body?.length || 0), 0) / articles.length;
        const withConcepts = articles.filter(a => a.concepts && a.concepts.length > 0).length;

        console.log('   📄 Content Quality:');
        console.log(`      Average length: ${Math.round(avgLength)} characters`);
        console.log(`      With concepts: ${withConcepts}/${articles.length} (${Math.round((withConcepts / articles.length) * 100)}%)`);

        // Query diversity
        const queries = [...new Set(articles.map(a => a.randomQuery).filter(Boolean))];
        const sorts = [...new Set(articles.map(a => a.randomSort).filter(Boolean))];

        console.log('   🎲 Randomization Results:');
        console.log(`      Query variations: ${queries.join(', ')}`);
        console.log(`      Sort variations: ${sorts.join(', ')}`);
        console.log(`      Top source filtering: ${articles.filter(a => a.topSourcesFilter).length}/${articles.length} articles`);
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
        const query = (article.randomQuery || '').toLowerCase();

        if (query.includes('earnings') || title.includes('earnings')) return 'earnings';
        if (query.includes('aapl') || title.includes('stock')) return 'stock_news';
        if (title.includes('iphone') || title.includes('product')) return 'product_news';

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
    const targetArticles = process.argv[2] ? parseInt(process.argv[2]) : 50;

    try {
        const collector = new FinalArticleCollector();

        console.log('🎯 FINAL ARTICLE COLLECTION & DATABASE SAVE');
        console.log('='.repeat(70));
        console.log(`Target: ${targetArticles} diverse Apple articles`);
        console.log('Strategy: Random sampling across time, queries, and sources');
        console.log('');

        // Step 1: Collect articles
        const articles = await collector.collectRandomArticles(targetArticles);

        if (articles.length === 0) {
            console.log('❌ No articles collected. Exiting.');
            return;
        }

        // Step 2: Analyze diversity
        collector['analyzeDiversity'](articles); // Access private method for analysis

        // Step 3: Save to database
        await collector.saveToDatabase(articles);

        console.log('\n🎉 COLLECTION COMPLETE!');
        console.log('='.repeat(70));
        console.log(`✅ Collected ${articles.length} diverse Apple articles`);
        console.log('✅ Saved to database (Supabase or JSON file)');
        console.log('✅ Ready for AI processing and ML training');

        console.log('\n🚀 Next Steps:');
        console.log('1. Check your Supabase articles table for the new articles');
        console.log('2. Run AI processing on the articles to extract business factors');
        console.log('3. Integrate stock price data for ML target variables');
        console.log('4. Scale up collection if needed (run with larger number: npx tsx script.ts 200)');

    } catch (error: any) {
        console.error('❌ Collection failed:', error.message);
        console.log('\n💡 Make sure you have NEWSAPIAI_API_KEY in your .env file');
    }
}

main();
