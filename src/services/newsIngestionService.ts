/**
 * News Ingestion Service
 * Handles pulling Alpha Vantage news data and structuring it for our belief modeling system
 */

import { NewsEvent, NewsSource, Author, Topic, Ticker, TickerSentiment, BeliefFactors, SentimentLabel } from '../data/models/newsSchema';

// =============================================================================
// ALPHA VANTAGE NEWS PROCESSING
// =============================================================================

export interface AlphaVantageNewsItem {
    title: string;
    url: string;
    time_published: string;
    authors: string[];
    summary: string;
    banner_image?: string;
    source: string;
    category_within_source: string;
    source_domain: string;
    topics: Array<{
        topic: string;
        relevance_score: string;
    }>;
    overall_sentiment_score: number;
    overall_sentiment_label: SentimentLabel;
    ticker_sentiment: Array<{
        ticker: string;
        relevance_score: string;
        ticker_sentiment_score: string;
        ticker_sentiment_label: SentimentLabel;
    }>;
}

export class NewsIngestionService {

    /**
     * Process raw Alpha Vantage news items into our structured format
     */
    async processNewsItems(alphaVantageNews: AlphaVantageNewsItem[]): Promise<{
        newsEvents: Partial<NewsEvent>[];
        sources: Partial<NewsSource>[];
        authors: Partial<Author>[];
        topics: Partial<Topic>[];
        tickers: Partial<Ticker>[];
    }> {

        const sources = new Map<string, Partial<NewsSource>>();
        const authors = new Map<string, Partial<Author>>();
        const topics = new Map<string, Partial<Topic>>();
        const tickers = new Map<string, Partial<Ticker>>();
        const newsEvents: Partial<NewsEvent>[] = [];

        for (const item of alphaVantageNews) {
            // Process Source
            const sourceId = this.generateId(item.source);
            if (!sources.has(sourceId)) {
                sources.set(sourceId, {
                    id: sourceId,
                    name: item.source,
                    domain: item.source_domain,
                    credibility_score: this.calculateCredibilityScore(item.source),
                    bias_score: 0, // Will be calculated over time
                    institutional_weight: this.getInstitutionalWeight(item.source),
                    retail_weight: this.getRetailWeight(item.source),
                    avg_response_time: 0, // Will be calculated over time
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }

            // Process Authors
            const authorIds: string[] = [];
            for (const authorName of item.authors) {
                const authorId = this.generateId(authorName + "_" + item.source);
                authorIds.push(authorId);

                if (!authors.has(authorId)) {
                    authors.set(authorId, {
                        id: authorId,
                        name: authorName,
                        source_id: sourceId,
                        expertise_areas: this.inferExpertiseAreas(item.topics),
                        track_record_score: 0.5, // Default, will be calculated
                        sentiment_bias: 0, // Will be calculated over time
                        article_count: 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            }

            // Process Topics
            const topicIds: string[] = [];
            for (const topicData of item.topics) {
                const topicId = this.generateId(topicData.topic);
                topicIds.push(topicId);

                if (!topics.has(topicId)) {
                    topics.set(topicId, {
                        id: topicId,
                        name: topicData.topic,
                        category: this.categorizeTopic(topicData.topic),
                        market_impact_potential: this.calculateMarketImpact(topicData.topic),
                        retail_attention_factor: this.getRetailAttention(topicData.topic),
                        institutional_attention_factor: this.getInstitutionalAttention(topicData.topic),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            }

            // Process Tickers
            const tickerIds: string[] = [];
            for (const tickerData of item.ticker_sentiment) {
                const tickerId = this.generateId(tickerData.ticker);
                tickerIds.push(tickerId);

                if (!tickers.has(tickerId)) {
                    tickers.set(tickerId, {
                        id: tickerId,
                        symbol: tickerData.ticker,
                        company_name: this.getCompanyName(tickerData.ticker),
                        sector: "Unknown", // Would need additional API call
                        market_cap: 0, // Would need additional API call
                        volatility_score: 0.5, // Default
                        news_sensitivity: 0.5, // Default
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            }

            // Process News Event
            const tickerSentiments: TickerSentiment[] = item.ticker_sentiment.map(ts => ({
                ticker_symbol: ts.ticker,
                relevance_score: parseFloat(ts.relevance_score),
                sentiment_score: parseFloat(ts.ticker_sentiment_score),
                sentiment_label: ts.ticker_sentiment_label
            }));

            const beliefFactors = this.calculateBeliefFactors(item);

            const newsEvent: Partial<NewsEvent> = {
                id: this.generateId(item.url),
                title: item.title,
                summary: item.summary,
                url: item.url,
                time_published: item.time_published,
                ...(item.banner_image && { banner_image: item.banner_image }),
                source_id: sourceId,
                author_ids: authorIds,
                topic_ids: topicIds,
                ticker_ids: tickerIds,
                overall_sentiment_score: item.overall_sentiment_score,
                overall_sentiment_label: item.overall_sentiment_label,
                ticker_sentiments: tickerSentiments,
                belief_factors: beliefFactors,
                processed: false,
                causal_chains_extracted: false,
                price_impact_measured: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            newsEvents.push(newsEvent);
        }

        return {
            newsEvents,
            sources: Array.from(sources.values()),
            authors: Array.from(authors.values()),
            topics: Array.from(topics.values()),
            tickers: Array.from(tickers.values())
        };
    }

    // =============================================================================
    // HELPER METHODS FOR DATA PROCESSING
    // =============================================================================

    private generateId(input: string): string {
        // Simple hash-based ID generation
        return Buffer.from(input).toString('base64').slice(0, 8);
    }

    private calculateCredibilityScore(source: string): number {
        // Basic credibility scoring based on known sources
        const credibilityMap: Record<string, number> = {
            'Reuters': 0.95,
            'Bloomberg': 0.93,
            'Wall Street Journal': 0.90,
            'Financial Times': 0.90,
            'Associated Press': 0.88,
            'MarketWatch': 0.75,
            'Seeking Alpha': 0.65,
            'Yahoo Finance': 0.60,
            'Motley Fool': 0.55
        };

        return credibilityMap[source] || 0.50; // Default middle score
    }

    private getInstitutionalWeight(source: string): number {
        // How much institutional investors trust this source
        const institutionalMap: Record<string, number> = {
            'Reuters': 0.95,
            'Bloomberg': 0.98,
            'Wall Street Journal': 0.90,
            'Financial Times': 0.92,
            'Associated Press': 0.85,
            'MarketWatch': 0.70,
            'Seeking Alpha': 0.40,
            'Yahoo Finance': 0.30,
            'Motley Fool': 0.20
        };

        return institutionalMap[source] || 0.50;
    }

    private getRetailWeight(source: string): number {
        // How much retail investors trust this source
        const retailMap: Record<string, number> = {
            'Reuters': 0.70,
            'Bloomberg': 0.65,
            'Wall Street Journal': 0.75,
            'Financial Times': 0.60,
            'Associated Press': 0.80,
            'MarketWatch': 0.85,
            'Seeking Alpha': 0.90,
            'Yahoo Finance': 0.95,
            'Motley Fool': 0.85
        };

        return retailMap[source] || 0.50;
    }

    private inferExpertiseAreas(topics: Array<{ topic: string, relevance_score: string }>): string[] {
        return topics
            .filter(t => parseFloat(t.relevance_score) > 0.5)
            .map(t => t.topic)
            .slice(0, 3); // Top 3 most relevant topics
    }

    private categorizeTopic(topic: string): string {
        const categoryMap: Record<string, string> = {
            'Technology': 'Business',
            'Earnings': 'Financial',
            'Financial Markets': 'Financial',
            'Manufacturing': 'Business',
            'Economy - Monetary': 'Financial',
            'Economy - Macro': 'Financial',
            'Energy & Transportation': 'Business',
            'Finance': 'Financial',
            'Life Sciences': 'Business',
            'Mergers & Acquisitions': 'Strategic',
            'IPO': 'Financial',
            'Blockchain': 'Technical',
            'Real Estate & Construction': 'Business'
        };

        return categoryMap[topic] || 'Business';
    }

    private calculateMarketImpact(topic: string): number {
        const impactMap: Record<string, number> = {
            'Earnings': 0.95,
            'Mergers & Acquisitions': 0.90,
            'IPO': 0.85,
            'Financial Markets': 0.80,
            'Technology': 0.75,
            'Economy - Monetary': 0.85,
            'Economy - Macro': 0.70,
            'Manufacturing': 0.60,
            'Energy & Transportation': 0.65,
            'Finance': 0.70,
            'Life Sciences': 0.65,
            'Blockchain': 0.55,
            'Real Estate & Construction': 0.45
        };

        return impactMap[topic] || 0.50;
    }

    private getRetailAttention(topic: string): number {
        const retailMap: Record<string, number> = {
            'Technology': 0.95,
            'Earnings': 0.85,
            'IPO': 0.90,
            'Mergers & Acquisitions': 0.80,
            'Blockchain': 0.95,
            'Financial Markets': 0.70,
            'Economy - Monetary': 0.40,
            'Economy - Macro': 0.35,
            'Manufacturing': 0.45,
            'Energy & Transportation': 0.60,
            'Finance': 0.50,
            'Life Sciences': 0.65,
            'Real Estate & Construction': 0.40
        };

        return retailMap[topic] || 0.50;
    }

    private getInstitutionalAttention(topic: string): number {
        const institutionalMap: Record<string, number> = {
            'Earnings': 0.98,
            'Financial Markets': 0.95,
            'Economy - Monetary': 0.95,
            'Economy - Macro': 0.90,
            'Mergers & Acquisitions': 0.90,
            'Finance': 0.85,
            'IPO': 0.80,
            'Technology': 0.75,
            'Manufacturing': 0.75,
            'Energy & Transportation': 0.80,
            'Life Sciences': 0.70,
            'Real Estate & Construction': 0.70,
            'Blockchain': 0.45
        };

        return institutionalMap[topic] || 0.50;
    }

    private getCompanyName(ticker: string): string {
        const companyMap: Record<string, string> = {
            'AAPL': 'Apple Inc.',
            'MSFT': 'Microsoft Corporation',
            'GOOGL': 'Alphabet Inc.',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'META': 'Meta Platforms Inc.',
            'NVDA': 'NVIDIA Corporation',
            'JPM': 'JPMorgan Chase & Co.',
            'V': 'Visa Inc.',
            'WMT': 'Walmart Inc.'
        };

        return companyMap[ticker] || ticker;
    }

    private calculateBeliefFactors(item: AlphaVantageNewsItem): BeliefFactors {
        // Calculate belief factors based on article content and context
        const sentimentMagnitude = Math.abs(item.overall_sentiment_score);
        const topicCount = item.topics.length;
        // const tickerCount = item.ticker_sentiment.length; // Future use

        // Calculate source credibility
        const sourceCredibility = this.calculateCredibilityScore(item.source);

        return {
            // Core belief dimensions
            intensity_belief: sentimentMagnitude, // Higher magnitude = stronger belief
            duration_belief: Math.min(sourceCredibility + 0.2, 1.0), // Credible sources suggest longer-lasting effects
            certainty_level: sourceCredibility, // Source credibility affects certainty

            // Emotional spectrum  
            hope_vs_fear: (item.overall_sentiment_score + 1) / 2, // Convert -1,1 to 0,1
            doubt_factor: 1 - sourceCredibility, // Less credible = more doubt

            // Attention & propagation
            attention_intensity: Math.min(topicCount / 5, 1.0), // More topics = more attention
            social_amplification: this.getRetailWeight(item.source), // Retail-focused sources amplify more
            expert_consensus: this.getInstitutionalWeight(item.source), // Institution weight indicates consensus

            // Temporal factors
            urgency_perception: sentimentMagnitude, // Strong sentiment = high urgency
            persistence_expectation: sourceCredibility, // Credible sources suggest persistence

            // Market specific
            believability_score: (sourceCredibility + sentimentMagnitude) / 2 // Combined score
        };
    }
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

export const newsIngestionService = new NewsIngestionService();
