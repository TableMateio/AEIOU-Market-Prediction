import axios from 'axios';
import { config } from '../config/app';
import { logger } from '../utils/logger';
import { DatabaseAdapter } from '../data/storage/databaseInterface';

interface NewsDataArticle {
    article_id: string;
    title: string;
    link: string;
    description?: string;
    content?: string; // Usually truncated
    pubDate: string;
    image_url?: string;
    source_id: string;
    source_name: string;
    source_url: string;
    source_icon?: string;
    language: string;
    country: string[];
    category: string[];
    ai_tag?: string;
    sentiment?: string;
    ai_region?: string;
    ai_org?: string;
    duplicate?: boolean;
}

interface NewsDataResponse {
    status: string;
    totalResults: number;
    results: NewsDataArticle[];
    nextPage?: string;
}

interface NewsDataSearchParams {
    q: string; // Search query
    qInTitle?: string; // Search in title only
    qInMeta?: string; // Search in description
    country?: string; // Country codes
    category?: string; // Categories
    language?: string; // Language codes
    domain?: string; // Include domains
    excludedomain?: string; // Exclude domains
    from_date?: string; // Start date (YYYY-MM-DD)
    to_date?: string; // End date (YYYY-MM-DD)
    size?: number; // Number of articles (1-50)
    page?: string; // Pagination token
}

export class NewsDataService {
    private apiKey: string;
    private baseUrl = 'https://newsdata.io/api/1';
    private db: DatabaseAdapter;

    constructor(db: DatabaseAdapter) {
        this.apiKey = config.newsdataApiKey;
        this.db = db;

        if (!this.apiKey) {
            throw new Error('NewsData.io API key not configured');
        }
    }

    /**
     * Search for Apple-related articles with date filtering
     */
    async searchAppleNews(params: {
        dateFrom?: string; // 'YYYY-MM-DD' format
        dateTo?: string;   // 'YYYY-MM-DD' format
        maxArticles?: number; // 1-50
        country?: string; // 'us' for US news
        excludeDomains?: string[]; // Domains to exclude
        includeTitle?: boolean; // Search title specifically
    } = {}): Promise<NewsDataArticle[]> {
        try {
            const searchParams: NewsDataSearchParams = {
                q: 'Apple OR AAPL OR "Apple Inc" OR iPhone OR iPad OR Mac OR iOS',
                language: 'en',
                country: params.country || 'us',
                size: Math.min(params.maxArticles || 50, 50) // Max 50 per request
            };

            // Search in title specifically for better relevance
            if (params.includeTitle) {
                searchParams.qInTitle = 'Apple OR AAPL OR "Apple Inc"';
            }

            // Add date filtering if provided
            if (params.dateFrom) {
                searchParams.from_date = params.dateFrom;
            }
            if (params.dateTo) {
                searchParams.to_date = params.dateTo;
            }

            // Exclude domains if specified
            if (params.excludeDomains && params.excludeDomains.length > 0) {
                searchParams.excludedomain = params.excludeDomains.join(',');
            }

            logger.info('Fetching NewsData.io articles', {
                searchParams,
                dateRange: `${params.dateFrom || 'any'} to ${params.dateTo || 'now'}`
            });

            const response = await axios.get<NewsDataResponse>(`${this.baseUrl}/news`, {
                params: {
                    ...searchParams,
                    apikey: this.apiKey
                },
                timeout: 30000
            });

            logger.info(`NewsData.io API returned ${response.data.results.length} articles`);
            return response.data.results;

        } catch (error: any) {
            if (error.response?.status === 429) {
                logger.error('NewsData.io API: Rate limit exceeded (500/day)');
                throw new Error('NewsData.io API rate limit exceeded (500/day)');
            }

            logger.error('Error fetching NewsData.io articles:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Store NewsData articles in database
     */
    async storeArticles(articles: NewsDataArticle[], metadata: {
        searchDate: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<void> {
        try {
            for (const article of articles) {
                await this.db.upsertArticle({
                    external_id: article.article_id,
                    title: article.title.substring(0, 500),
                    url: article.link,
                    published_at: new Date(article.pubDate).toISOString(),
                    source: article.source_name,
                    description: article.description?.substring(0, 1000),
                    body: article.content || null, // Usually null/truncated - need to scrape
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    scraping_status: article.content ? 'completed' : 'pending', // Mark for scraping if no content
                    metadata: {
                        api_source: 'newsdata',
                        search_date: metadata.searchDate,
                        date_range: {
                            from: metadata.dateFrom,
                            to: metadata.dateTo
                        },
                        image_url: article.image_url,
                        source_url: article.source_url,
                        source_icon: article.source_icon,
                        language: article.language,
                        country: article.country,
                        category: article.category,
                        ai_tag: article.ai_tag,
                        sentiment: article.sentiment,
                        ai_region: article.ai_region,
                        ai_org: article.ai_org
                    }
                });
            }

            logger.info(`Stored ${articles.length} NewsData.io articles in database`);
        } catch (error) {
            logger.error('Error storing NewsData.io articles:', error);
            throw error;
        }
    }

    /**
     * Get historical Apple articles for multiple time periods
     */
    async getHistoricalAppleArticles(timeRanges: {
        label: string;
        dateFrom: string;
        dateTo: string;
        maxArticles?: number;
    }[]): Promise<{ [label: string]: NewsDataArticle[] }> {
        const results: { [label: string]: NewsDataArticle[] } = {};

        for (const range of timeRanges) {
            try {
                logger.info(`Fetching Apple articles for ${range.label}: ${range.dateFrom} to ${range.dateTo}`);

                const articles = await this.searchAppleNews({
                    dateFrom: range.dateFrom,
                    dateTo: range.dateTo,
                    maxArticles: range.maxArticles || 25, // Conservative for 500/day limit
                    includeTitle: true // Better relevance
                });

                results[range.label] = articles;

                // Store in database with time range metadata
                await this.storeArticles(articles, {
                    searchDate: new Date().toISOString(),
                    dateFrom: range.dateFrom,
                    dateTo: range.dateTo
                });

                // Rate limiting - wait between requests
                await this.delay(2000); // Longer delay for 500/day limit

            } catch (error) {
                logger.error(`Error fetching ${range.label} articles:`, error);
                results[range.label] = [];
            }
        }

        return results;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get API usage info
     */
    getUsageInfo(): { dailyLimit: number; recommended: string; contentQuality: string } {
        return {
            dailyLimit: 500,
            recommended: 'Use for discovering article URLs, then scrape full content',
            contentQuality: 'Headlines and descriptions only - requires scraping for full content'
        };
    }
}
