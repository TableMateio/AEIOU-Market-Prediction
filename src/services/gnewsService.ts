import axios from 'axios';
import { config } from '../config/app';
import { logger } from '../utils/logger';
import { DatabaseAdapter } from '../data/storage/databaseInterface';

interface GNewsArticle {
    title: string;
    description: string;
    content: string; // Full article content!
    url: string;
    image: string;
    publishedAt: string;
    source: {
        name: string;
        url: string;
    };
}

interface GNewsResponse {
    totalArticles: number;
    articles: GNewsArticle[];
}

interface GNewsSearchParams {
    q: string; // Search query (e.g., "Apple")
    lang?: string; // Language (default: en)
    country?: string; // Country code
    max?: number; // Max articles (1-10, default: 10)
    from?: string; // Start date (ISO format: 2024-01-01T00:00:00Z)
    to?: string; // End date (ISO format)
    sortby?: 'publishedAt' | 'relevance'; // Sort order
    exclude?: string; // Exclude domains
    in?: string; // Search in title, description, content
}

export class GNewsService {
    private apiKey: string;
    private baseUrl = 'https://gnews.io/api/v4';
    private db: DatabaseAdapter;

    constructor(db: DatabaseAdapter) {
        this.apiKey = config.gnewsApiKey;
        this.db = db;

        if (!this.apiKey) {
            throw new Error('GNews API key not configured');
        }
    }

    /**
     * Search for Apple-related articles with date filtering
     */
    async searchAppleNews(params: {
        dateFrom?: string; // '2024-01-01' format
        dateTo?: string;   // '2024-08-01' format
        maxArticles?: number; // 1-10
        sortBy?: 'publishedAt' | 'relevance';
        excludeDomains?: string[]; // Domains to exclude
    } = {}): Promise<GNewsArticle[]> {
        try {
            const searchParams: GNewsSearchParams = {
                q: 'Apple OR AAPL OR "Apple Inc"', // Comprehensive Apple search
                lang: 'en',
                max: params.maxArticles || 10,
                sortby: params.sortBy || 'publishedAt',
                in: 'title,description,content' // Search all fields
            };

            // Add date filtering if provided
            if (params.dateFrom) {
                searchParams.from = this.formatDateForAPI(params.dateFrom);
            }
            if (params.dateTo) {
                searchParams.to = this.formatDateForAPI(params.dateTo);
            }

            // Exclude domains if specified
            if (params.excludeDomains && params.excludeDomains.length > 0) {
                searchParams.exclude = params.excludeDomains.join(',');
            }

            logger.info('Fetching GNews articles', {
                searchParams,
                dateRange: `${params.dateFrom || 'any'} to ${params.dateTo || 'now'}`
            });

            const response = await axios.get<GNewsResponse>(`${this.baseUrl}/search`, {
                params: {
                    ...searchParams,
                    token: this.apiKey
                },
                timeout: 30000
            });

            logger.info(`GNews API returned ${response.data.articles.length} articles`);
            return response.data.articles;

        } catch (error: any) {
            if (error.response?.status === 403) {
                logger.error('GNews API: Rate limit exceeded or invalid API key');
                throw new Error('GNews API rate limit exceeded (100/day) or invalid key');
            }

            logger.error('Error fetching GNews articles:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Store GNews articles in database
     */
    async storeArticles(articles: GNewsArticle[], metadata: {
        searchDate: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<void> {
        try {
            for (const article of articles) {
                await this.db.upsertArticle({
                    external_id: this.generateArticleId(article),
                    title: article.title.substring(0, 500), // Limit title length
                    url: article.url,
                    published_at: new Date(article.publishedAt).toISOString(),
                    source: article.source.name,
                    description: article.description?.substring(0, 1000), // Limit description
                    body: article.content, // ✅ FULL ARTICLE CONTENT!
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    scraping_status: 'completed', // Already have full content
                    metadata: {
                        api_source: 'gnews',
                        search_date: metadata.searchDate,
                        date_range: {
                            from: metadata.dateFrom,
                            to: metadata.dateTo
                        },
                        image_url: article.image,
                        source_url: article.source.url
                    }
                });
            }

            logger.info(`Stored ${articles.length} GNews articles in database`);
        } catch (error) {
            logger.error('Error storing GNews articles:', error);
            throw error;
        }
    }

    /**
     * Get historical Apple articles for specific time periods
     */
    async getHistoricalAppleArticles(timeRanges: {
        label: string;
        dateFrom: string;
        dateTo: string;
        maxArticles?: number;
    }[]): Promise<{ [label: string]: GNewsArticle[] }> {
        const results: { [label: string]: GNewsArticle[] } = {};

        for (const range of timeRanges) {
            try {
                logger.info(`Fetching Apple articles for ${range.label}: ${range.dateFrom} to ${range.dateTo}`);

                const articles = await this.searchAppleNews({
                    dateFrom: range.dateFrom,
                    dateTo: range.dateTo,
                    maxArticles: range.maxArticles || 10,
                    sortBy: 'publishedAt'
                });

                results[range.label] = articles;

                // Store in database with time range metadata
                await this.storeArticles(articles, {
                    searchDate: new Date().toISOString(),
                    dateFrom: range.dateFrom,
                    dateTo: range.dateTo
                });

                // Rate limiting - wait between requests
                await this.delay(1000);

            } catch (error) {
                logger.error(`Error fetching ${range.label} articles:`, error);
                results[range.label] = [];
            }
        }

        return results;
    }

    private formatDateForAPI(dateStr: string): string {
        // Convert 'YYYY-MM-DD' to 'YYYY-MM-DDTHH:MM:SSZ'
        return `${dateStr}T00:00:00Z`;
    }

    private generateArticleId(article: GNewsArticle): string {
        // Create unique ID from URL and published date
        const urlHash = Buffer.from(article.url).toString('base64').substring(0, 16);
        const dateHash = new Date(article.publishedAt).getTime().toString();
        return `gnews_${urlHash}_${dateHash}`;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get API usage info
     */
    getUsageInfo(): { dailyLimit: number; recommended: string } {
        return {
            dailyLimit: 100,
            recommended: 'Use for high-priority content since it provides full article text'
        };
    }
}
