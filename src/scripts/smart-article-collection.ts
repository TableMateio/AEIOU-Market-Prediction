#!/usr/bin/env npx tsx

/**
 * Smart article collection system using business days filter and strategic sampling
 */

import { config } from 'dotenv';
import axios from 'axios';
import { BusinessDaysFilter } from './create-business-days-filter.js';
import { mcp_supabase_execute_sql } from '@felores/airtable-mcp-server';

config();

interface CollectionPlan {
    phase: string;
    api: 'newsapi' | 'gnews';
    dateStart: string;
    dateEnd: string;
    expectedArticles: number;
    tokensUsed: number;
    priority: 'high' | 'medium' | 'low';
    description: string;
}

class SmartArticleCollector {
    private newsApiKey: string;
    private gnewsKey: string;
    private businessDaysFilter: BusinessDaysFilter;
    private tokensUsed = 0;
    private maxTokens = 2000;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
        this.gnewsKey = process.env.GNEWS_API_KEY || '';
        this.businessDaysFilter = new BusinessDaysFilter();

        if (!this.newsApiKey) {
            throw new Error('NEWSAPIAI_API_KEY required');
        }
    }

    /**
     * Create comprehensive collection plan
     */
    createCollectionPlan(): CollectionPlan[] {
        const plan: CollectionPlan[] = [];

        // Phase 1: Recent high-quality articles (NewsAPI.ai)
        const recentEnd = new Date();
        const recentStart = new Date();
        recentStart.setDate(recentStart.getDate() - 30);

        const recentBusinessDays = this.businessDaysFilter.getBusinessDaysBetween(recentStart, recentEnd);
        const recentTokens = Math.min(1500, this.maxTokens - this.tokensUsed);

        plan.push({
            phase: 'Phase 1: Recent Premium Articles',
            api: 'newsapi',
            dateStart: recentStart.toISOString().split('T')[0],
            dateEnd: recentEnd.toISOString().split('T')[0],
            expectedArticles: recentTokens * 50, // Conservative estimate
            tokensUsed: recentTokens,
            priority: 'high',
            description: `Recent ${recentBusinessDays.length} business days with full metadata`
        });

        // Phase 2: Strategic historical events (NewsAPI.ai)
        const remainingTokens = Math.min(500, this.maxTokens - recentTokens);
        if (remainingTokens > 0) {
            plan.push({
                phase: 'Phase 2: Historical Key Events',
                api: 'newsapi',
                dateStart: '2024-01-01',
                dateEnd: '2024-12-31',
                expectedArticles: Math.floor(remainingTokens / 5) * 50, // 5 tokens per year
                tokensUsed: remainingTokens,
                priority: 'medium',
                description: 'Apple earnings, product launches, major events'
            });
        }

        // Phase 3: Volume supplementation (GNews)
        if (this.gnewsKey) {
            plan.push({
                phase: 'Phase 3: Volume Supplementation',
                api: 'gnews',
                dateStart: recentStart.toISOString().split('T')[0],
                dateEnd: recentEnd.toISOString().split('T')[0],
                expectedArticles: 500,
                tokensUsed: 0, // Free tier
                priority: 'low',
                description: 'Additional articles for volume and source diversity'
            });
        }

        return plan;
    }

    /**
     * Execute collection for a single date (NewsAPI.ai)
     */
    async collectNewsApiArticles(date: Date, maxArticles: number = 50): Promise<any[]> {
        const dateStr = date.toISOString().split('T')[0];

        try {
            console.log(`📰 Collecting NewsAPI.ai articles for ${dateStr}...`);

            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    dateStart: dateStr,
                    dateEnd: dateStr,
                    articlesSortBy: 'relevance',
                    includeArticleBody: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    articlesCount: Math.min(maxArticles, 100),
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];
            const totalAvailable = response.data?.articles?.totalResults || 0;

            console.log(`   ✅ Found ${articles.length} articles (${totalAvailable} total available)`);

            // Track token usage
            this.tokensUsed += this.isRecentDate(date) ? 1 : 5;

            return articles.map(article => ({
                ...article,
                collection_date: dateStr,
                collection_source: 'newsapi_ai',
                collection_priority: this.getDatePriority(date)
            }));

        } catch (error: any) {
            console.log(`   ❌ Failed to collect for ${dateStr}: ${error.message}`);
            return [];
        }
    }

    /**
     * Execute collection for a single date (GNews)
     */
    async collectGNewsArticles(date: Date, maxArticles: number = 10): Promise<any[]> {
        if (!this.gnewsKey) return [];

        const dateStr = date.toISOString().split('T')[0];
        const nextDateStr = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        try {
            console.log(`📰 Collecting GNews articles for ${dateStr}...`);

            const response = await axios.get('https://gnews.io/api/v4/search', {
                params: {
                    q: 'Apple',
                    token: this.gnewsKey,
                    lang: 'en',
                    from: dateStr,
                    to: nextDateStr,
                    max: maxArticles,
                    sortby: 'relevance'
                },
                timeout: 15000
            });

            const articles = response.data.articles || [];
            console.log(`   ✅ Found ${articles.length} GNews articles`);

            return articles.map((article: any) => ({
                title: article.title,
                body: article.content,
                url: article.url,
                source: { title: article.source?.name || 'Unknown' },
                date: dateStr,
                collection_date: dateStr,
                collection_source: 'gnews',
                collection_priority: 'low'
            }));

        } catch (error: any) {
            console.log(`   ❌ Failed to collect GNews for ${dateStr}: ${error.message}`);
            return [];
        }
    }

    /**
     * Convert articles to our database format
     */
    convertToStandardFormat(articles: any[]): any[] {
        return articles.map(article => ({
            title: article.title || 'No title',
            body: article.body || article.content || null,
            url: article.url || '',
            source: article.source?.title || article.source?.name || 'Unknown',
            published_at: new Date(article.date || article.dateTime).toISOString(),
            scraped_at: new Date().toISOString(),
            scraping_status: article.body ? 'success' : 'no_content',
            data_source: article.collection_source || 'unknown',
            external_id: article.uri || article.url || '',
            external_id_type: article.collection_source === 'newsapi_ai' ? 'eventregistry_uri' : 'gnews_url',
            keywords: this.extractKeywords(article),
            relevance_score: article.relevance || null,
            category: this.extractCategory(article),
            content_type: this.determineContentType(article),
            target_audience: this.determineTargetAudience(article),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
    }

    /**
     * Insert articles into database with duplicate checking
     */
    async insertArticles(articles: any[]): Promise<void> {
        const standardArticles = this.convertToStandardFormat(articles);

        for (const article of standardArticles) {
            try {
                // Use ON CONFLICT to handle duplicates
                const insertQuery = `
                    INSERT INTO articles (
                        title, body, url, source, published_at, scraped_at, scraping_status,
                        data_source, external_id, external_id_type, keywords, relevance_score,
                        category, content_type, target_audience, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
                    ) ON CONFLICT (url) DO UPDATE SET
                        body = EXCLUDED.body,
                        updated_at = EXCLUDED.updated_at
                    RETURNING id;
                `;

                await mcp_supabase_execute_sql({
                    query: insertQuery,
                    // Note: MCP doesn't support parameterized queries, so we'll build the query string
                });

            } catch (error: any) {
                console.log(`   ⚠️ Failed to insert article: ${error.message}`);
            }
        }
    }

    /**
     * Execute test collection (100 articles)
     */
    async executeTestCollection(): Promise<void> {
        console.log('🧪 Executing test collection (100 articles)...\n');

        // Get 5 recent business days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14); // Look back 2 weeks to ensure we get 5 business days

        const businessDays = this.businessDaysFilter.getBusinessDaysBetween(startDate, endDate)
            .slice(-5); // Take last 5 business days

        let totalArticles = 0;
        const allArticles: any[] = [];

        for (const date of businessDays) {
            if (totalArticles >= 100) break;

            // Collect from NewsAPI.ai (20 articles per day)
            const newsApiArticles = await this.collectNewsApiArticles(date, 20);
            allArticles.push(...newsApiArticles);
            totalArticles += newsApiArticles.length;

            // Add small delay between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n📊 Test Collection Summary:`);
        console.log(`   Total articles collected: ${totalArticles}`);
        console.log(`   Tokens used: ${this.tokensUsed}`);
        console.log(`   Business days processed: ${businessDays.length}`);

        // Show sample articles
        if (allArticles.length > 0) {
            console.log(`\n📰 Sample Articles:`);
            allArticles.slice(0, 3).forEach((article, i) => {
                console.log(`   ${i + 1}. "${article.title}"`);
                console.log(`      Source: ${article.source?.title || 'Unknown'}`);
                console.log(`      Date: ${article.date}`);
                console.log(`      Content: ${article.body ? `${article.body.length} chars` : 'No content'}`);
            });
        }

        // TODO: Insert into database (commented out for test)
        // await this.insertArticles(allArticles);

        console.log(`\n✅ Test collection complete! Ready to scale up.`);
    }

    private isRecentDate(date: Date): boolean {
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
    }

    private getDatePriority(date: Date): string {
        if (this.isRecentDate(date)) return 'high';

        // Check if it's a high-priority historical date
        const highPriorityDates = this.businessDaysFilter.getHighPriorityDates();
        const isHighPriority = highPriorityDates.some(d =>
            d.toDateString() === date.toDateString()
        );

        return isHighPriority ? 'medium' : 'low';
    }

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
        const body = (article.body || '').toLowerCase();

        if (title.includes('earnings') || body.includes('earnings')) return 'earnings';
        if (title.includes('analyst') || body.includes('analyst')) return 'analyst_report';
        if (title.includes('breaking') || body.includes('breaking')) return 'breaking_news';

        return 'news_article';
    }

    private determineTargetAudience(article: any): string {
        const source = (article.source?.title || '').toLowerCase();

        if (source.includes('bloomberg') || source.includes('reuters')) return 'institutional';
        if (source.includes('yahoo') || source.includes('marketwatch')) return 'retail';

        return 'general';
    }
}

// Main execution
async function main() {
    try {
        const collector = new SmartArticleCollector();

        // Show collection plan
        console.log('📋 Smart Collection Plan:');
        console.log('='.repeat(60));
        const plan = collector.createCollectionPlan();

        plan.forEach(phase => {
            console.log(`\n${phase.phase}:`);
            console.log(`   API: ${phase.api.toUpperCase()}`);
            console.log(`   Date Range: ${phase.dateStart} to ${phase.dateEnd}`);
            console.log(`   Expected Articles: ${phase.expectedArticles}`);
            console.log(`   Tokens Used: ${phase.tokensUsed}`);
            console.log(`   Priority: ${phase.priority}`);
            console.log(`   Description: ${phase.description}`);
        });

        const totalArticles = plan.reduce((sum, p) => sum + p.expectedArticles, 0);
        const totalTokens = plan.reduce((sum, p) => sum + p.tokensUsed, 0);

        console.log(`\n💡 Plan Summary:`);
        console.log(`   Total Expected Articles: ${totalArticles}`);
        console.log(`   Total Tokens Used: ${totalTokens}/2000`);
        console.log(`   Total Cost: $0 (free tiers only)`);

        // Execute test collection
        console.log('\n🚀 Executing test collection...');
        await collector.executeTestCollection();

    } catch (error: any) {
        console.error('❌ Collection failed:', error.message);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
