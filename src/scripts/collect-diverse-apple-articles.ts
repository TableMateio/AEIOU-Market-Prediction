#!/usr/bin/env tsx

/**
 * Collect Diverse Apple Articles Script
 * 
 * Uses multiple APIs to collect ~20 diverse Apple articles from past 1-2 years
 * using different dates for good variety. Then scrapes full content.
 * 
 * APIs Used:
 * - Alpha Vantage (10 free per day)
 * - Polygon (via MCP - free tier available)
 * - Additional: Could add NewsAPI, Finnhub if needed
 */

import { createLogger } from '@utils/logger';
import { AlphaVantageClient } from '@data/sources/alphaVantage';
import { SupabaseService } from '@data/storage/supabase';
import { DatabaseSchema } from '@data/models';

const logger = createLogger('ArticleCollector');

interface CollectionTarget {
    source: 'alphavantage' | 'polygon';
    date?: string; // Optional specific date filter
    expectedCount: number;
    description: string;
}

// Collection strategy: Diverse dates and sources
const COLLECTION_TARGETS: CollectionTarget[] = [
    {
        source: 'alphavantage',
        date: '2024-09-12', // iPhone 16 launch
        expectedCount: 5,
        description: 'iPhone 16 launch coverage'
    },
    {
        source: 'alphavantage',
        date: '2024-06-10', // WWDC 2024
        expectedCount: 5,
        description: 'WWDC 2024 coverage'
    },
    {
        source: 'polygon',
        date: '2024-01-15', // Q1 earnings season
        expectedCount: 5,
        description: 'Q1 2024 earnings period'
    },
    {
        source: 'polygon',
        date: '2023-11-02', // Q4 earnings
        expectedCount: 5,
        description: 'Q4 2023 earnings period'
    }
];

class DiverseArticleCollector {
    private alphaVantage: AlphaVantageClient;
    private supabase: SupabaseService;

    constructor() {
        this.alphaVantage = new AlphaVantageClient();
        this.supabase = new SupabaseService();
    }

    async collectAllArticles(): Promise<void> {
        logger.info('🚀 Starting diverse Apple article collection');

        let totalCollected = 0;
        const collectedArticles: DatabaseSchema.Article[] = [];

        for (const target of COLLECTION_TARGETS) {
            logger.info(`📰 Collecting from ${target.source}: ${target.description}`);

            try {
                let articles: DatabaseSchema.Article[] = [];

                if (target.source === 'alphavantage') {
                    articles = await this.collectFromAlphaVantage(target);
                } else if (target.source === 'polygon') {
                    articles = await this.collectFromPolygon(target);
                }

                if (articles.length > 0) {
                    // Store articles in Supabase
                    await this.storeArticles(articles);
                    collectedArticles.push(...articles);
                    totalCollected += articles.length;

                    logger.info(`✅ Collected ${articles.length} articles from ${target.source}`);
                } else {
                    logger.warn(`⚠️ No articles collected from ${target.source} for ${target.description}`);
                }

                // Rate limiting between sources
                await this.sleep(2000);

            } catch (error) {
                logger.error(`❌ Failed to collect from ${target.source}:`, error);
            }
        }

        logger.info(`🎯 Total articles collected: ${totalCollected}`);

        if (collectedArticles.length > 0) {
            logger.info('📄 Starting article content scraping...');
            await this.scrapeArticleContent(collectedArticles);
        }
    }

    private async collectFromAlphaVantage(target: CollectionTarget): Promise<DatabaseSchema.Article[]> {
        try {
            // Alpha Vantage doesn't have date filtering, so we get recent news and filter
            const newsData = await this.alphaVantage.getNews('AAPL', 50); // Get more to filter

            if (!newsData || newsData.length === 0) {
                logger.warn('No news data returned from Alpha Vantage');
                return [];
            }

            // Convert to our schema format
            const articles: DatabaseSchema.Article[] = newsData
                .filter(item => {
                    // If target date specified, try to filter by approximate date
                    if (target.date) {
                        const newsDate = new Date(item.published_at).toISOString().split('T')[0];
                        const targetDate = new Date(target.date).toISOString().split('T')[0];

                        // Allow 3-day window around target date
                        const diffDays = Math.abs(
                            (new Date(newsDate).getTime() - new Date(targetDate).getTime())
                            / (1000 * 60 * 60 * 24)
                        );
                        return diffDays <= 3;
                    }
                    return true;
                })
                .slice(0, target.expectedCount)
                .map(item => ({
                    id: this.generateArticleId(item.url),
                    headline: item.title,
                    url: item.url,
                    source: item.source || 'Alpha Vantage',
                    authors: item.authors || [],
                    published_at: item.published_at,
                    summary: item.summary,
                    content: null, // Will be scraped later
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    // Credibility assessments based on our rubrics
                    publisher_credibility: this.assessPublisherCredibility(item.source || ''),
                    author_credibility: null, // Will assess after scraping
                    source_credibility: this.assessSourceCredibility(item),
                    audience_split: 'both' as DatabaseSchema.AudienceSplit,
                    time_lag_days: this.calculateTimeLag(item.published_at),
                    market_regime: 'neutral' as DatabaseSchema.MarketRegime
                }));

            return articles;

        } catch (error) {
            logger.error('Error collecting from Alpha Vantage:', error);
            return [];
        }
    }

    private async collectFromPolygon(target: CollectionTarget): Promise<DatabaseSchema.Article[]> {
        // Note: This would require implementing Polygon news collection
        // For now, return empty array but log the intention
        logger.info(`Would collect from Polygon for date: ${target.date}`);

        // TODO: Implement Polygon news collection using MCP
        // The MCP polygon tools are available but would need integration

        return [];
    }

    private async storeArticles(articles: DatabaseSchema.Article[]): Promise<void> {
        try {
            for (const article of articles) {
                // Check if article already exists
                const existing = await this.supabase.getArticleByUrl(article.url);
                if (!existing) {
                    await this.supabase.insertArticle(article);
                    logger.info(`📁 Stored article: ${article.headline.substring(0, 50)}...`);
                } else {
                    logger.info(`📝 Article already exists: ${article.headline.substring(0, 50)}...`);
                }
            }
        } catch (error) {
            logger.error('Error storing articles:', error);
        }
    }

    private async scrapeArticleContent(articles: DatabaseSchema.Article[]): Promise<void> {
        // TODO: Implement article content scraping
        // This should use the existing articleScrapingService
        logger.info(`📰 Would scrape content for ${articles.length} articles`);

        for (const article of articles) {
            logger.info(`🔗 Would scrape: ${article.url}`);
            // await articleScrapingService.scrapeArticle(article.url);
        }
    }

    // Helper methods
    private generateArticleId(url: string): string {
        // Generate a consistent ID from URL
        return Buffer.from(url).toString('base64').replace(/[+/=]/g, '').substring(0, 20);
    }

    private assessPublisherCredibility(source: string): number {
        // Based on our rubrics in instructions.md
        const credibilityMap: { [key: string]: number } = {
            'Reuters': 0.8,
            'Bloomberg': 0.8,
            'Wall Street Journal': 0.9,
            'Financial Times': 0.9,
            'CNBC': 0.7,
            'MarketWatch': 0.7,
            'TechCrunch': 0.6,
            'The Motley Fool': 0.5,
            'Benzinga': 0.5,
            'Yahoo Finance': 0.6
        };

        return credibilityMap[source] || 0.4; // Default for unknown sources
    }

    private assessSourceCredibility(newsItem: any): number {
        // Based on type of information in the article
        if (newsItem.summary?.includes('earnings call') || newsItem.summary?.includes('press release')) {
            return 0.9; // Official company statements
        }
        if (newsItem.summary?.includes('analyst') || newsItem.summary?.includes('estimate')) {
            return 0.6; // Industry analysts
        }
        return 0.5; // General reporting
    }

    private calculateTimeLag(publishedAt: string): number | null {
        // For now, return null as we don't know the underlying event timing
        return null;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Main execution
async function main() {
    try {
        const collector = new DiverseArticleCollector();
        await collector.collectAllArticles();

        logger.info('🎉 Article collection completed successfully!');

    } catch (error) {
        logger.error('❌ Article collection failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { DiverseArticleCollector };
