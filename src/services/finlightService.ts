import { FinlightApi } from 'finlight-client';
import { logger } from '../utils/logger.js';
import type { Article } from '../data/models/index.js';
import type {
    NewsServiceInterface,
    SearchOptions,
    ConnectionTestResult,
    ServiceCapabilities
} from './interfaces/newsServiceInterface.js';

export interface FinlightArticle {
    id: string;
    title: string;
    content: string;
    url: string;
    published_at: string;
    source: {
        name: string;
        url: string;
    };
    sentiment?: {
        score: number;
        label: string;
    };
    entities?: Array<{
        name: string;
        type: string;
        confidence: number;
    }>;
    tickers?: string[];
}

export class FinlightService implements NewsServiceInterface {
    private api: FinlightApi;
    private readonly rateLimitDelay = 1000; // 1 second between requests
    private premiumFeaturesDetected: boolean | null = null;

    // Exclude terms for premium accounts
    private readonly FOOD_DRINK_EXCLUDES = [
        'apple pie', 'apple juice', 'apple orchard', 'apple picking',
        'apple festival', 'apple cider', 'apple crisp', 'apple sauce',
        'big apple', 'apple smoothie', 'apple whisky', 'apple brandy',
        'apple martini', 'apple cocktail', 'fireball apple', 'apple spice'
    ];

    constructor() {
        const apiKey = process.env.FINLIGHT_API_KEY;
        if (!apiKey) {
            throw new Error('FINLIGHT_API_KEY is required. Set it in your .env file.');
        }

        this.api = new FinlightApi({ apiKey });
    }

    /**
     * Remove duplicate articles by URL
     */
    private removeDuplicatesByUrl(articles: any[]): any[] {
        const seen = new Set();
        return articles.filter(article => {
            const url = article.link || article.url;
            if (!url || seen.has(url)) {
                return false;
            }
            seen.add(url);
            return true;
        });
    }

    /**
     * Search for Apple-related articles (implements NewsServiceInterface)
     */
    async searchAppleArticles(options: SearchOptions = {}): Promise<Article[]> {
        // For comprehensive coverage, we need both:
        // 1. Ticker-based (financial analysis) - sortBy: 'financial' or default
        // 2. Keyword-based (business events) - sortBy: 'business'

        if (options.sortBy === 'business') {
            return await this.searchAppleByKeyword(options);
        } else {
            // Default to ticker-based for financial analysis
            return await this.searchAppleByTicker(options);
        }
    }

    /**
     * Search for Apple financial/stock articles using ticker
     */
    async searchAppleByTicker(options: SearchOptions = {}): Promise<Article[]> {
        const {
            dateFrom,
            dateTo,
            limit = 25,
            sources = [],
            excludeSources = [],
            excludeTerms = [],
            sortBy = 'relevance'
        } = options;

        try {
            logger.info('🎯 Fetching Apple articles from finlight', {
                dateFrom,
                dateTo,
                limit,
                sources: sources.length,
                excludeSources: excludeSources.length
            });

            // Check premium features availability
            const hasPremiumFeatures = await this.supportsPremiumFeatures();

            // Build base query (start simple, add complexity later)
            let query = "Apple";

            // Add exclude terms if premium features available
            if (hasPremiumFeatures) {
                const allExcludeTerms = [...this.FOOD_DRINK_EXCLUDES, ...excludeTerms];
                if (allExcludeTerms.length > 0) {
                    const excludeQuery = allExcludeTerms.map(term => `NOT "${term}"`).join(' AND ');
                    query = `(${query}) AND (${excludeQuery})`;
                }
            }

            // Build query parameters (using premium features)
            const queryParams: any = {
                query: 'Apple',
                limit,
                includeContent: true,        // PREMIUM: Request full article content
                includeEntities: true,       // PREMIUM: Include entity extraction
                excludeEmptyContent: true    // PREMIUM: Only articles with content
            };

            // Add date filtering if provided (finlight uses 'from'/'to')
            if (dateFrom) {
                queryParams.from = `${dateFrom}T08:00`;
            }
            if (dateTo) {
                queryParams.to = `${dateTo}T23:59`;
            }

            // Add source filtering if provided
            if (sources.length > 0) {
                queryParams.sources = sources.join(',');
            }
            if (excludeSources.length > 0) {
                queryParams.exclude_sources = excludeSources.join(',');
            }

            // Make single API call for specific day
            const response = await this.api.articles.fetchArticles(queryParams);

            // Convert to our standard format
            const articles = await this.convertToStandardFormat(response.articles || [], 'financial_analysis');

            logger.info('✅ Successfully fetched Apple financial articles from finlight', {
                articlesFound: articles.length,
                totalResults: response.total || 0
            });

            return articles;

        } catch (error: any) {
            logger.error('❌ Error fetching Apple financial articles from finlight', {
                error: error.message,
                dateFrom,
                dateTo
            });
            throw error;
        }
    }

    /**
     * Search for Apple business event articles using keyword
     */
    async searchAppleByKeyword(options: SearchOptions = {}): Promise<Article[]> {
        const {
            dateFrom,
            dateTo,
            limit = 25,
            sources = [],
            excludeSources = [],
            excludeTerms = [],
            sortBy = 'relevance'
        } = options;

        try {
            logger.info('🎯 Fetching Apple business event articles from finlight', {
                dateFrom,
                dateTo,
                limit,
                sources: sources.length,
                excludeSources: excludeSources.length
            });

            // Check premium features availability
            const hasPremiumFeatures = await this.supportsPremiumFeatures();

            // Build comprehensive query for better historical coverage
            let query = '(Apple OR "Apple Inc" OR AAPL OR iPhone OR iPad OR "Tim Cook" OR "App Store")';

            // Add exclude terms if premium features available
            if (hasPremiumFeatures) {
                const allExcludeTerms = [...this.FOOD_DRINK_EXCLUDES, ...excludeTerms];
                if (allExcludeTerms.length > 0) {
                    const excludeQuery = allExcludeTerms.map(term => `NOT "${term}"`).join(' AND ');
                    query = `(${query}) AND (${excludeQuery})`;
                }
            }

            // Build query parameters (NO ticker filtering for business events)
            const queryParams: any = {
                query,
                limit,
                includeContent: true,        // PREMIUM: Request full article content
                includeEntities: true,       // PREMIUM: Include entity extraction
                excludeEmptyContent: true    // PREMIUM: Only articles with full content
            };

            // Add date filtering if provided (finlight uses 'from'/'to')
            if (dateFrom) {
                queryParams.from = `${dateFrom}T08:00`;
            }
            if (dateTo) {
                queryParams.to = `${dateTo}T23:59`;
            }

            // Add source filtering if provided
            if (sources.length > 0) {
                queryParams.sources = sources.join(',');
            }
            if (excludeSources.length > 0) {
                queryParams.exclude_sources = excludeSources.join(',');
            }

            // Make API call
            const response = await this.api.articles.fetchArticles(queryParams);

            // Convert to our standard format  
            const articles = await this.convertToStandardFormat(response.articles || [], 'business_event');

            logger.info('✅ Successfully fetched Apple business event articles from finlight', {
                articlesFound: articles.length,
                apiReturned: response.articles?.length || 0,
                afterFiltering: articles.length
            });

            return articles;

        } catch (error: any) {
            logger.error('❌ Error fetching Apple business event articles from finlight', {
                error: error.message,
                dateFrom,
                dateTo
            });
            throw error;
        }
    }

    /**
     * Search for Apple articles by ticker symbol (requires upgrade)
     */
    async searchAppleByTicker(options: {
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
    } = {}): Promise<Article[]> {
        const {
            dateFrom,
            dateTo,
            limit = 25
        } = options;

        try {
            const queryParams: any = {
                query: 'Apple stock',
                limit,
                includeContent: true,        // PREMIUM: Request full article content
                includeEntities: true,       // PREMIUM: Include entity extraction
                excludeEmptyContent: true    // PREMIUM: Only articles with full content
            };

            // Add date filtering if provided (finlight uses 'from'/'to')
            if (dateFrom) {
                queryParams.from = `${dateFrom}T08:00`;
            }
            if (dateTo) {
                queryParams.to = `${dateTo}T23:59`;
            }

            const response = await this.api.articles.fetchArticles(queryParams);
            const articles = await this.convertToStandardFormat(response.articles || []);

            logger.info('✅ Successfully fetched Apple articles by ticker', {
                apiReturned: response.articles?.length || 0,
                afterFiltering: articles.length,
                ticker: 'AAPL'
            });

            return articles;

        } catch (error: any) {
            logger.error('❌ Error fetching Apple articles by ticker', {
                error: error.message,
                ticker: 'AAPL'
            });
            throw error;
        }
    }

    /**
     * Convert finlight format to our standard Article format
     */
    private async convertToStandardFormat(finlightArticles: FinlightArticle[]): Promise<Article[]> {
        return finlightArticles
            .filter(article => this.isValidFinlightArticle(article))
            .map(article => {
                // Handle different field names from finlight client library
                const rawArticle = article as any;
                const publishDate = rawArticle.publishDate || rawArticle.published_at;

                // Require full content - reject articles without substantial content
                const content = rawArticle.content || '';
                if (!content || content.length < 200) { // Strict requirement for full articles
                    return null; // Will be filtered out
                }

                // Extract companies/entities from premium data
                const companies = rawArticle.companies || [];
                const appleCompany = companies.find((c: any) => c.ticker === 'AAPL');

                return {
                    id: '', // Will be generated by database
                    title: article.title || 'No title',
                    body: content, // Full article content (premium)
                    url: rawArticle.link || article.url, // finlight uses 'link' not 'url'
                    source: rawArticle.source || article.source?.name || 'Unknown',
                    authors: [], // finlight doesn't provide authors in basic plan
                    published_at: publishDate ? new Date(publishDate).toISOString() : new Date().toISOString(),
                    scraped_at: new Date().toISOString(),
                    scraping_status: 'success', // Only successful if we have content
                    data_source: 'finlight',
                    external_id: article.id || rawArticle.id || '',
                    external_id_type: 'finlight_id',
                    keywords: companies.map((c: any) => c.ticker).filter(Boolean) || ['AAPL'],
                    relevance_score: appleCompany?.confidence || article.sentiment?.score || 0.9,
                    category: this.extractCategory(article),
                    content_type: 'financial_news',
                    target_audience: 'institutional', // finlight is curated for professionals
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            })
            .filter(article => article !== null); // Remove articles without sufficient content
    }

    /**
     * Validate finlight article has minimum required data
     */
    private isValidFinlightArticle(article: FinlightArticle): boolean {
        const rawArticle = article as any;

        return !!(
            article.title &&
            (article.url || rawArticle.link) &&
            (article.published_at || rawArticle.publishDate)
            // Content is optional - some articles only have summaries
        );
    }

    /**
     * Extract category from finlight article
     */
    private extractCategory(article: FinlightArticle): string | null {
        if (article.entities) {
            // Use entities to determine category
            const hasEarnings = article.entities.some(e => e.name.toLowerCase().includes('earnings'));
            const hasM_A = article.entities.some(e => e.name.toLowerCase().includes('acquisition') ||
                e.name.toLowerCase().includes('merger'));

            if (hasEarnings) return 'earnings';
            if (hasM_A) return 'mergers_acquisitions';
        }

        // Fallback to title/content analysis
        const title = (article.title || '').toLowerCase();
        const content = (article.content || '').toLowerCase();

        if (title.includes('earnings') || content.includes('earnings')) return 'earnings';
        if (title.includes('acquisition') || content.includes('merger')) return 'mergers_acquisitions';
        if (title.includes('product') || title.includes('launch')) return 'product_announcement';

        return 'financial_news';
    }

    /**
     * Get service name for identification
     */
    getServiceName(): string {
        return 'finlight';
    }

    /**
 * Check if service supports premium features
 */
    async supportsPremiumFeatures(): Promise<boolean> {
        if (this.premiumFeaturesDetected !== null) {
            return this.premiumFeaturesDetected;
        }

        try {
            // Test premium feature by trying ticker filtering with full content
            const testResponse = await this.api.articles.fetchArticles({
                tickers: ['AAPL'],
                includeContent: true,
                includeEntities: true,
                limit: 1
            });

            // Check if we got actual content (not just summaries)
            const hasFullContent = testResponse.articles?.some((a: any) =>
                a.content && a.content.length > 500
            );

            this.premiumFeaturesDetected = hasFullContent;
            logger.info(hasFullContent ?
                '✅ finlight premium features detected (full content + entities)' :
                'ℹ️ finlight basic tier detected (limited content)'
            );
            return hasFullContent;
        } catch (error: any) {
            // If ticker filtering fails, we're on free tier
            this.premiumFeaturesDetected = false;
            logger.info('ℹ️ finlight free tier detected (no premium features)');
            return false;
        }
    }

    /**
     * Get service capabilities
     */
    async getCapabilities(): Promise<ServiceCapabilities> {
        const hasPremium = await this.supportsPremiumFeatures();

        return {
            hasFullContent: true,
            hasDateFiltering: true,
            hasSourceFiltering: hasPremium,
            hasExcludeFiltering: hasPremium,
            hasTickerFiltering: hasPremium,
            hasSentimentAnalysis: hasPremium,
            maxArticlesPerRequest: 100,
            rateLimitPerMinute: 60
        };
    }

    /**
     * Test API connection and authentication (implements NewsServiceInterface)
     */
    async testConnection(): Promise<ConnectionTestResult> {
        try {
            const response = await this.api.articles.fetchArticles({
                query: 'Apple',
                limit: 1
            });

            const premiumAvailable = await this.supportsPremiumFeatures();

            if (response.articles && response.articles.length >= 0) {
                return {
                    success: true,
                    message: `✅ finlight connection successful. Found ${response.total || 0} Apple articles.`,
                    sampleData: {
                        totalResults: response.total || 0,
                        sampleArticle: response.articles[0]?.title || 'No articles found'
                    },
                    premiumFeaturesAvailable: premiumAvailable
                };
            } else {
                return {
                    success: false,
                    message: `❌ finlight API returned no results`,
                    premiumFeaturesAvailable: premiumAvailable
                };
            }
        } catch (error: any) {
            return {
                success: false,
                message: `❌ finlight connection failed: ${error.message}`,
                premiumFeaturesAvailable: false
            };
        }
    }
}

// Export singleton instance
export const finlightService = new FinlightService();
