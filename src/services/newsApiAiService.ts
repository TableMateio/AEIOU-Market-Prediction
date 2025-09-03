import axios from 'axios';
import { logger } from '../utils/logger.js';
import type { Article } from '../data/models/index.js';

export interface NewsApiAiArticle {
    uuid: string;
    title: string;
    description: string;
    keywords: string;
    snippet: string;
    url: string;
    image_url: string;
    language: string;
    published_at: string;
    source: string;
    categories: string[];
    relevance_score: number;
    locale: string;
    similar: any[];
}

export interface NewsApiAiResponse {
    status: string;
    total_hits: number;
    page: number;
    total_pages: number;
    page_size: number;
    articles: NewsApiAiArticle[];
}

export class NewsApiAiService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://eventregistry.org/api/v1';
    private readonly rateLimitDelay = 1000; // 1 second between requests

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.NEWSAPIAI_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('NewsAPI.ai API key is required. Set NEWSAPIAI_API_KEY environment variable.');
        }
    }

    /**
     * Search for Apple-related articles using entity-based conceptUri approach
     */
    async searchAppleByEntity(options: {
        dateFrom?: string;
        dateTo?: string;
        sortBy?: 'rel' | 'date' | 'socialScore';
        pageSize?: number;
        page?: number;
        sourceRankPercentile?: number;
    } = {}): Promise<Article[]> {
        const {
            dateFrom,
            dateTo,
            sortBy = 'rel',
            pageSize = 25,
            page = 1,
            sourceRankPercentile = 50
        } = options;

        try {
            logger.info('🎯 Fetching Apple articles using conceptUri (entity-based)', {
                dateFrom,
                dateTo,
                sortBy,
                pageSize,
                page
            });

            // Build the query using conceptUri approach like the example
            const thirdAndCondition: any = {
                "lang": "eng"
            };

            // Add date filters to the third $and condition (FIXED!)
            if (dateFrom && dateTo) {
                thirdAndCondition["dateStart"] = dateFrom;
                thirdAndCondition["dateEnd"] = dateTo;
            }

            // Source URIs for financial and tech news
            const sourceUris = [
                // Financial Sources
                "finance.yahoo.com", "investing.com", "benzinga.com", "fool.com", "marketwatch.com",
                "bloomberg.com", "reuters.com", "cnbc.com", "seekingalpha.com", "zacks.com",
                "barrons.com", "wsj.com", "ft.com", "forbes.com", "businessinsider.com",
                "thestreet.com", "morningstar.com", "investorplace.com", "nasdaq.com", "marketbeat.com",
                "gurufocus.com", "finviz.com", "tradingview.com", "tipranks.com", "stockanalysis.com",
                "investopedia.com", "kiplinger.com", "money.com", "financialpost.com",
                "globenewswire.com", "prnewswire.com", "businesswire.com",
                // Tech Sources
                "techcrunch.com", "theverge.com", "engadget.com", "arstechnica.com", "wired.com",
                "cnet.com", "zdnet.com", "computerworld.com", "infoworld.com", "pcworld.com",
                "macworld.com", "9to5mac.com", "macrumors.com", "appleinsider.com", "imore.com",
                "cultofmac.com", "macobserver.com", "gizmodo.com", "mashable.com", "venturebeat.com",
                "axios.com", "theinformation.com"
            ];

            // Exclude satire and junk sources
            const ignoreSourceUris = [
                "theonion.com", "babylonbee.com", "clickhole.com", "reductress.com", "thebeaverton.com",
                "newsthump.com", "waterfordwhispersnews.com", "satirewire.com", "fark.com"
            ];

            const requestData: any = {
                query: {
                    "$query": {
                        "$and": [
                            {
                                "keyword": "AAPL"
                            },
                            {
                                "locationUri": "http://en.wikipedia.org/wiki/United_States"
                            },
                            thirdAndCondition
                        ]
                    },
                    "$filter": {
                        "startSourceRankPercentile": 0,
                        "endSourceRankPercentile": sourceRankPercentile
                    }
                },
                // sourceUri: sourceUris.join(","),
                // ignoreSourceUri: ignoreSourceUris.join(","),
                resultType: "articles",
                articlesSortBy: sortBy,
                articlesCount: pageSize,
                includeArticleBody: true,
                includeArticleConcepts: true,
                includeArticleCategories: true,
                apiKey: this.apiKey
            };

            const response = await axios.post(`${this.baseUrl}/article/getArticles`, requestData, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const articlesData = response.data?.articles?.results || [];
            const articles = await this.convertToStandardFormat(articlesData);

            logger.info('✅ Successfully fetched Apple articles using conceptUri', {
                articlesFound: articles.length,
                totalResults: response.data?.articles?.totalResults || 0
            });

            return articles;

        } catch (error: any) {
            logger.error('❌ Error fetching Apple articles by entity', {
                error: error.message,
                dateFrom,
                dateTo
            });
            throw error;
        }
    }

    /**
     * Search for Apple-related articles with full content (legacy text-based method)
     */
    async searchAppleArticles(options: {
        query?: string;
        dateFrom?: string;
        dateTo?: string;
        sortBy?: 'date' | 'relevance';
        pageSize?: number;
        page?: number;
        language?: string;
    } = {}): Promise<Article[]> {
        const {
            query = 'Apple',
            dateFrom,
            dateTo,
            sortBy = 'date',
            pageSize = 25,
            page = 1,
            language = 'eng'
        } = options;

        try {
            logger.info('🔍 Fetching Apple articles from NewsAPI.ai (EventRegistry)', {
                query,
                dateFrom,
                dateTo,
                pageSize,
                page
            });

            const params: any = {
                resultType: 'articles',
                keyword: query,
                lang: language,
                articlesSortBy: sortBy,
                includeArticleBody: true,
                includeArticleConcepts: true,
                includeArticleCategories: true,
                articlesCount: pageSize,
                apiKey: this.apiKey
            };

            if (dateFrom) params.dateStart = dateFrom;
            if (dateTo) params.dateEnd = dateTo;

            const response = await axios.get(`${this.baseUrl}/article/getArticles`, {
                params,
                timeout: 30000
            });

            const articlesData = response.data?.articles?.results || [];
            const articles = await this.convertToStandardFormat(articlesData);

            logger.info('✅ Successfully fetched articles from NewsAPI.ai', {
                articlesFound: articles.length,
                totalResults: response.data?.articles?.totalResults || 0
            });

            return articles;

        } catch (error: any) {
            logger.error('❌ Error fetching from NewsAPI.ai', {
                error: error.message,
                query,
                dateFrom,
                dateTo
            });
            throw error;
        }
    }

    /**
     * Get Apple articles from specific time period for ML training
     */
    async getHistoricalAppleArticles(startDate: string, endDate: string, maxArticles: number = 100): Promise<Article[]> {
        const articles: Article[] = [];
        let page = 1;
        const pageSize = 25;

        try {
            while (articles.length < maxArticles) {
                const batch = await this.searchAppleArticles({
                    dateFrom: startDate,
                    dateTo: endDate,
                    pageSize,
                    page,
                    sortBy: 'publishedAt'
                });

                if (batch.length === 0) break;

                articles.push(...batch);
                page++;

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));

                logger.info(`📊 Historical collection progress: ${articles.length}/${maxArticles} articles`);
            }

            return articles.slice(0, maxArticles);

        } catch (error: any) {
            logger.error('❌ Error in historical collection', {
                error: error.message,
                startDate,
                endDate,
                articlesCollected: articles.length
            });
            throw error;
        }
    }

    /**
 * Convert NewsAPI.ai (EventRegistry) format to our standard Article format
 */
    private async convertToStandardFormat(apiArticles: any[]): Promise<Article[]> {
        const financialSources = [
            'finance.yahoo.com', 'investing.com', 'benzinga.com', 'fool.com', 'marketwatch.com',
            'bloomberg.com', 'reuters.com', 'cnbc.com', 'seekingalpha.com', 'zacks.com',
            'barrons.com', 'wsj.com', 'ft.com', 'forbes.com', 'businessinsider.com',
            'thestreet.com', 'morningstar.com', 'investorplace.com', 'nasdaq.com', 'marketbeat.com',
            'techcrunch.com', 'theverge.com', 'engadget.com', 'arstechnica.com', 'wired.com',
            'cnet.com', 'zdnet.com', 'macworld.com', '9to5mac.com', 'macrumors.com', 'appleinsider.com'
        ];

        const satireSources = [
            'theonion.com', 'babylonbee.com', 'clickhole.com', 'reductress.com', 'fark.com'
        ];

        return apiArticles
            .filter(article => this.isValidEventRegistryArticle(article))
            .filter(article => {
                // Filter by legitimate sources
                const sourceUrl = (article.source?.uri || article.url || '').toLowerCase();
                const sourceTitle = (article.source?.title || '').toLowerCase();

                // Exclude satire sites
                const isSatire = satireSources.some(satire => sourceUrl.includes(satire));
                if (isSatire) return false;

                // Allow financial/tech sources OR sources with business keywords
                const isFinancialSource = financialSources.some(source => sourceUrl.includes(source));
                const isBusinessSource = sourceTitle.includes('finance') || sourceTitle.includes('business') ||
                    sourceTitle.includes('market') || sourceTitle.includes('tech');

                return isFinancialSource || isBusinessSource;
            })
            .filter(article => {
                // Filter by Apple relevance in title/body
                const title = (article.title || '').toLowerCase();
                const body = (article.body || '').toLowerCase();
                const content = title + ' ' + body;

                // Must contain Apple-related terms
                const hasApple = content.includes('apple inc') || content.includes('aapl') ||
                    content.includes('apple') && (content.includes('stock') || content.includes('earnings') ||
                        content.includes('revenue') || content.includes('iphone') || content.includes('ipad'));

                // Exclude fruit/food references
                const hasGarbage = content.includes('apple pie') || content.includes('apple juice') ||
                    content.includes('apple orchard') || content.includes('big apple') ||
                    content.includes('apple picking') || content.includes('apple festival');

                return hasApple && !hasGarbage;
            })
            .map(article => ({
                id: '', // Will be generated by database
                title: article.title || 'No title',
                body: article.body || article.summary || null, // EventRegistry provides full body
                url: article.url,
                source: article.source?.title || article.source?.uri || 'Unknown',
                authors: [], // EventRegistry doesn't provide authors in basic plan
                published_at: new Date(article.date || article.dateTime).toISOString(),
                scraped_at: new Date().toISOString(),
                scraping_status: article.body ? 'success' : 'no_content',
                data_source: 'newsapi_ai',
                external_id: article.uri || article.id,
                external_id_type: 'eventregistry_uri',
                keywords: this.extractKeywords(article),
                relevance_score: article.relevance || null,
                category: this.extractCategory(article),
                content_type: this.determineEventRegistryContentType(article),
                target_audience: this.determineEventRegistryTargetAudience(article),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));
    }

    /**
     * Validate EventRegistry article has minimum required data
     */
    private isValidEventRegistryArticle(article: any): boolean {
        return !!(
            article.title &&
            article.url &&
            (article.date || article.dateTime) &&
            (article.body || article.summary) // Ensure we have some content
        );
    }

    /**
     * Extract keywords from EventRegistry article
     */
    private extractKeywords(article: any): string[] {
        const keywords: string[] = [];

        if (article.concepts) {
            keywords.push(...article.concepts.map((c: any) => c.label || c.uri).filter(Boolean));
        }

        if (article.categories) {
            keywords.push(...article.categories.map((c: any) => c.label || c.uri).filter(Boolean));
        }

        return keywords.slice(0, 10); // Limit to 10 keywords
    }

    /**
     * Extract category from EventRegistry article
     */
    private extractCategory(article: any): string | null {
        if (article.categories && article.categories.length > 0) {
            return article.categories[0].label || article.categories[0].uri || null;
        }
        return null;
    }

    /**
     * Determine content type based on EventRegistry article characteristics
     */
    private determineEventRegistryContentType(article: any): string {
        const title = (article.title || '').toLowerCase();
        const body = (article.body || article.summary || '').toLowerCase();

        if (title.includes('earnings') || body.includes('earnings')) return 'earnings';
        if (title.includes('analyst') || body.includes('analyst')) return 'analyst_report';
        if (title.includes('breaking') || body.includes('breaking')) return 'breaking_news';
        if (title.includes('opinion') || body.includes('opinion')) return 'opinion';

        return 'news_article';
    }

    /**
     * Determine target audience based on EventRegistry source and content
     */
    private determineEventRegistryTargetAudience(article: any): string {
        const source = (article.source?.title || article.source?.uri || '').toLowerCase();

        if (source.includes('bloomberg') || source.includes('reuters') || source.includes('wsj')) {
            return 'institutional';
        }
        if (source.includes('yahoo') || source.includes('marketwatch') || source.includes('fool')) {
            return 'retail';
        }

        return 'general';
    }

    /**
     * Test API connection and authentication
     */
    async testConnection(): Promise<{ success: boolean; message: string; sampleData?: any }> {
        try {
            const response = await axios.get(`${this.baseUrl}/article/getArticles`, {
                params: {
                    resultType: 'articles',
                    keyword: 'Apple',
                    lang: 'eng',
                    articlesCount: 1,
                    apiKey: this.apiKey
                },
                timeout: 10000
            });

            const totalResults = response.data?.articles?.totalResults || 0;
            const sampleArticle = response.data?.articles?.results?.[0];

            if (totalResults > 0) {
                return {
                    success: true,
                    message: `✅ NewsAPI.ai connection successful. Found ${totalResults} Apple articles.`,
                    sampleData: {
                        totalResults,
                        sampleArticle: sampleArticle?.title || 'No articles found'
                    }
                };
            } else {
                return {
                    success: false,
                    message: `❌ NewsAPI.ai API returned no results`
                };
            }
        } catch (error: any) {
            return {
                success: false,
                message: `❌ NewsAPI.ai connection failed: ${error.message}`
            };
        }
    }

    /**
     * Get API usage statistics and limits
     */
    async getUsageStats(): Promise<{ success: boolean; stats?: any; message: string }> {
        try {
            // NewsAPI.ai doesn't have a dedicated usage endpoint, so we make a minimal request
            const response = await axios.get(`${this.baseUrl}/everything`, {
                params: {
                    q: 'test',
                    pageSize: 1,
                    apiKey: this.apiKey
                },
                timeout: 10000
            });

            return {
                success: true,
                stats: {
                    status: response.data.status,
                    totalHits: response.data.total_hits,
                    note: 'NewsAPI.ai does not provide detailed usage statistics via API'
                },
                message: '✅ API is functional'
            };
        } catch (error: any) {
            return {
                success: false,
                message: `❌ Unable to get usage stats: ${error.message}`
            };
        }
    }
}

// Export singleton instance
export const newsApiAiService = new NewsApiAiService();
