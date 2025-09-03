/**
 * Feature Engineering Pipeline
 * 
 * Transforms business factors and market data into ML-ready features
 * Handles the 50+ business factors + relative performance metrics
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { AppConfig } from '../config/app.js';
import { RelativePerformanceMetrics } from './relativePerformanceCalculator.js';

const logger = createLogger('FeatureEngineer');

export interface MLFeatureVector {
    // Event metadata
    eventId: string;
    articleId: string;
    ticker: string;
    eventTimestamp: Date;

    // Target variables (what we're predicting)
    targets: {
        alpha_vs_market_5min: number;
        alpha_vs_market_30min: number;
        alpha_vs_market_2hour: number;
        alpha_vs_market_1day: number;
        alpha_vs_market_3day: number;
        alpha_vs_market_7day: number;
        alpha_vs_market_30day: number;

        alpha_vs_sector_1day: number;
        alpha_vs_faang_1day: number;

        volume_spike: boolean;
        volatility_spike: boolean;
    };

    // Business factor features (from your schema)
    businessFactors: {
        // Event-level features
        event_type: string;                    // One-hot encoded: "Product_Announcement", "Earnings", etc.
        event_scope: string;                   // "company", "industry", "market"
        event_orientation: string;             // "predictive", "reflective", "both"
        event_magnitude: number;               // 0-1 scale
        event_time_horizon_days: number;

        // Aggregated factor features (across all causal steps)
        total_causal_steps: number;
        avg_factor_magnitude: number;
        max_factor_magnitude: number;

        // Factor category distribution
        financial_factors_count: number;      // How many financial factors
        product_factors_count: number;        // How many product factors
        market_factors_count: number;         // How many market factors

        // AI assessment features (averaged across factors)
        avg_execution_risk: number;           // 0-1 scale
        avg_competitive_risk: number;
        avg_timeline_realism: number;
        avg_fundamental_strength: number;
        avg_business_impact_likelihood: number;

        // Market perception features (averaged)
        avg_market_intensity: number;
        avg_hope_vs_fear: number;            // -1 (fear) to 1 (hope)
        avg_narrative_strength: number;
        avg_consensus_vs_division: number;
        avg_surprise_vs_anticipated: number;

        // Perception gap features
        avg_optimism_bias: number;
        avg_risk_awareness: number;
        avg_correction_potential: number;

        // Confidence features
        avg_causal_certainty: number;
        avg_logical_directness: number;
        avg_regime_alignment: number;

        // Evidence strength
        evidence_explicit_pct: number;        // % of factors with explicit evidence
        evidence_implied_pct: number;         // % of factors with implied evidence

        // Categorical features (one-hot encoded)
        has_revenue_factors: boolean;
        has_product_factors: boolean;
        has_competitive_factors: boolean;
        has_regulatory_factors: boolean;
        has_partnership_factors: boolean;

        // Semantic features (from JSONB arrays)
        cognitive_bias_count: number;         // Number of cognitive biases identified
        emotional_intensity_score: number;   // Derived from emotional_profile
        entity_count: number;                // Number of entities mentioned

        // Text features
        avg_factor_description_length: number;
        total_evidence_citations: number;
    };

    // Article context features
    articleFeatures: {
        source_credibility: number;           // Based on source ranking
        author_credibility: number;
        publication_hour: number;             // Hour of day (0-23)
        publication_day_of_week: number;      // 0=Sunday, 6=Saturday
        days_since_last_major_event: number; // Time since last major Apple event

        // Content features
        article_length: number;               // Character count
        headline_sentiment: number;          // Sentiment of title
        apple_relevance_score: number;       // How Apple-focused is the article
    };

    // Market context features
    marketContext: {
        market_regime: string;                // "bull", "bear", "sideways"
        trading_hours: boolean;               // During market hours?
        pre_market_movement: number;          // Pre-market % change
        sector_momentum: number;              // XLK 5-day performance
        vix_level: number;                   // Volatility index level
        earnings_season: boolean;            // During earnings season?
    };
}

export class FeatureEngineer {
    private supabase;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }

    /**
     * Transform business factors into ML feature vector
     */
    async createFeatureVector(
        articleId: string,
        relativePerformance: RelativePerformanceMetrics
    ): Promise<MLFeatureVector | null> {

        try {
            logger.info('🔧 Creating feature vector', { articleId });

            // Get business factors for this article
            const businessFactors = await this.getBusinessFactors(articleId);
            if (!businessFactors || businessFactors.length === 0) {
                logger.warn(`⚠️ No business factors found for article ${articleId}`);
                return null;
            }

            // Get article metadata
            const article = await this.getArticle(articleId);
            if (!article) {
                logger.warn(`⚠️ Article not found: ${articleId}`);
                return null;
            }

            // Transform targets from relative performance
            const targets = this.extractTargets(relativePerformance);

            // Transform business factors
            const businessFactorFeatures = this.transformBusinessFactors(businessFactors);

            // Transform article features
            const articleFeatures = this.transformArticleFeatures(article);

            // Add market context
            const marketContext = await this.getMarketContext(relativePerformance.eventTimestamp);

            const featureVector: MLFeatureVector = {
                eventId: `${articleId}_${relativePerformance.eventTimestamp.getTime()}`,
                articleId,
                ticker: relativePerformance.ticker,
                eventTimestamp: relativePerformance.eventTimestamp,
                targets,
                businessFactors: businessFactorFeatures,
                articleFeatures,
                marketContext
            };

            logger.info('✅ Feature vector created', {
                articleId,
                factorCount: businessFactors.length,
                targetCount: Object.keys(targets).length
            });

            return featureVector;

        } catch (error) {
            logger.error(`❌ Error creating feature vector for ${articleId}`, error);
            return null;
        }
    }

    /**
     * Extract target variables from relative performance metrics
     */
    private extractTargets(metrics: RelativePerformanceMetrics): MLFeatureVector['targets'] {
        const windows = metrics.timeWindows;

        return {
            alpha_vs_market_5min: windows['5min'].alphaVsMarket,
            alpha_vs_market_30min: windows['30min'].alphaVsMarket,
            alpha_vs_market_2hour: windows['2hour'].alphaVsMarket,
            alpha_vs_market_1day: windows['1day'].alphaVsMarket,
            alpha_vs_market_3day: windows['3day'].alphaVsMarket,
            alpha_vs_market_7day: windows['7day'].alphaVsMarket,
            alpha_vs_market_30day: windows['30day'].alphaVsMarket,

            alpha_vs_sector_1day: windows['1day'].alphaVsSector,
            alpha_vs_faang_1day: windows['1day'].alphaVsFaang,

            volume_spike: windows['1day'].volumeSpike,
            volatility_spike: windows['1day'].relativeVolatility > 2.0
        };
    }

    /**
     * Transform business factors into aggregated features
     */
    private transformBusinessFactors(factors: any[]): MLFeatureVector['businessFactors'] {
        const totalFactors = factors.length;

        // Aggregate numerical features
        const magnitudes = factors.map(f => f.factor_magnitude || 0).filter(m => m > 0);
        const avgMagnitude = magnitudes.length > 0 ? magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length : 0;
        const maxMagnitude = magnitudes.length > 0 ? Math.max(...magnitudes) : 0;

        // Count factors by category
        const categoryCount = (category: string) =>
            factors.filter(f => f.factor_category === category).length;

        // Average AI assessments
        const avgNumeric = (field: string) => {
            const values = factors.map(f => f[field]).filter(v => v !== null && v !== undefined);
            return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
        };

        // Evidence strength
        const explicitEvidence = factors.filter(f => f.evidence_level === 'explicit').length;
        const impliedEvidence = factors.filter(f => f.evidence_level === 'implied').length;

        // Categorical features
        const hasFactorType = (type: string) =>
            factors.some(f => f.factor_name?.toLowerCase().includes(type));

        // Semantic features
        const totalCognitiveBiases = factors.reduce((sum, f) => {
            const biases = f.cognitive_biases || [];
            return sum + (Array.isArray(biases) ? biases.length : 0);
        }, 0);

        const totalEmotions = factors.reduce((sum, f) => {
            const emotions = f.emotional_profile || [];
            return sum + (Array.isArray(emotions) ? emotions.length : 0);
        }, 0);

        const totalEntities = factors.reduce((sum, f) => {
            const entities = f.event_entities || [];
            return sum + (Array.isArray(entities) ? entities.length : 0);
        }, 0);

        return {
            event_type: factors[0]?.event_type || 'unknown',
            event_scope: factors[0]?.event_scope || 'unknown',
            event_orientation: factors[0]?.event_orientation || 'neutral',
            event_magnitude: avgMagnitude,
            event_time_horizon_days: factors[0]?.event_time_horizon_days || 0,

            total_causal_steps: totalFactors,
            avg_factor_magnitude: avgMagnitude,
            max_factor_magnitude: maxMagnitude,

            financial_factors_count: categoryCount('financial'),
            product_factors_count: categoryCount('product'),
            market_factors_count: categoryCount('market'),

            avg_execution_risk: avgNumeric('ai_execution_risk'),
            avg_competitive_risk: avgNumeric('ai_competitive_risk'),
            avg_timeline_realism: avgNumeric('ai_timeline_realism'),
            avg_fundamental_strength: avgNumeric('ai_fundamental_strength'),
            avg_business_impact_likelihood: avgNumeric('ai_business_impact_likelihood'),

            avg_market_intensity: avgNumeric('market_intensity'),
            avg_hope_vs_fear: avgNumeric('market_hope_vs_fear'),
            avg_narrative_strength: avgNumeric('market_narrative_strength'),
            avg_consensus_vs_division: avgNumeric('market_consensus_vs_division'),
            avg_surprise_vs_anticipated: avgNumeric('market_surprise_vs_anticipated'),

            avg_optimism_bias: avgNumeric('perception_optimism_bias'),
            avg_risk_awareness: avgNumeric('perception_risk_awareness'),
            avg_correction_potential: avgNumeric('perception_correction_potential'),

            avg_causal_certainty: avgNumeric('causal_certainty'),
            avg_logical_directness: avgNumeric('logical_directness'),
            avg_regime_alignment: avgNumeric('regime_alignment'),

            evidence_explicit_pct: totalFactors > 0 ? explicitEvidence / totalFactors : 0,
            evidence_implied_pct: totalFactors > 0 ? impliedEvidence / totalFactors : 0,

            has_revenue_factors: hasFactorType('revenue'),
            has_product_factors: hasFactorType('product'),
            has_competitive_factors: hasFactorType('competitive'),
            has_regulatory_factors: hasFactorType('regulatory'),
            has_partnership_factors: hasFactorType('partnership'),

            cognitive_bias_count: totalCognitiveBiases,
            emotional_intensity_score: totalEmotions / Math.max(totalFactors, 1),
            entity_count: totalEntities,

            avg_factor_description_length: avgNumeric('factor_description_length'),
            total_evidence_citations: factors.filter(f => f.evidence_citation).length
        };
    }

    /**
     * Transform article metadata into features
     */
    private transformArticleFeatures(article: any): MLFeatureVector['articleFeatures'] {
        const publishedAt = new Date(article.published_at);

        return {
            source_credibility: this.getSourceCredibility(article.source),
            author_credibility: article.article_author_credibility || 0.5,
            publication_hour: publishedAt.getHours(),
            publication_day_of_week: publishedAt.getDay(),
            days_since_last_major_event: 0, // TODO: Calculate this

            article_length: (article.body || '').length,
            headline_sentiment: article.sentiment_score || 0.5,
            apple_relevance_score: article.apple_relevance_score || 0.5
        };
    }

    /**
     * Get market context at event time
     */
    private async getMarketContext(eventTime: Date): Promise<MLFeatureVector['marketContext']> {
        // TODO: Implement VIX and earnings season detection
        return {
            market_regime: 'sideways', // Will be calculated by RelativePerformanceCalculator
            trading_hours: this.isMarketHours(eventTime),
            pre_market_movement: 0, // TODO: Calculate pre-market movement
            sector_momentum: 0,     // TODO: Calculate XLK 5-day performance
            vix_level: 20,          // TODO: Get VIX level
            earnings_season: false  // TODO: Detect earnings season
        };
    }

    /**
     * Get business factors for an article
     */
    private async getBusinessFactors(articleId: string): Promise<any[]> {
        const { data, error } = await this.supabase
            .from('business_factors_flat')
            .select('*')
            .eq('article_id', articleId);

        if (error) {
            logger.error('❌ Error fetching business factors', error);
            return [];
        }

        return data || [];
    }

    /**
     * Get article metadata
     */
    private async getArticle(articleId: string): Promise<any | null> {
        const { data, error } = await this.supabase
            .from('articles')
            .select('*')
            .eq('id', articleId)
            .single();

        if (error) {
            logger.error('❌ Error fetching article', error);
            return null;
        }

        return data;
    }

    /**
     * Get source credibility score
     */
    private getSourceCredibility(source: string): number {
        const credibilityMap: { [key: string]: number } = {
            'bloomberg': 0.95,
            'reuters': 0.95,
            'wsj': 0.90,
            'ft': 0.90,
            'cnbc': 0.85,
            'marketwatch': 0.80,
            'yahoo finance': 0.75,
            'seeking alpha': 0.70,
            'benzinga': 0.65,
            'fool': 0.60
        };

        const lowerSource = source.toLowerCase();
        for (const [key, score] of Object.entries(credibilityMap)) {
            if (lowerSource.includes(key)) {
                return score;
            }
        }

        return 0.50; // Default credibility
    }

    /**
     * Check if timestamp is during market hours
     */
    private isMarketHours(timestamp: Date): boolean {
        const hour = timestamp.getUTCHours();
        const dayOfWeek = timestamp.getUTCDay();

        // US market hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
        return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 14 && hour < 21;
    }

    /**
     * Batch create feature vectors for multiple articles
     */
    async batchCreateFeatureVectors(
        articleIds: string[],
        relativePerformanceMap: Map<string, RelativePerformanceMetrics>
    ): Promise<MLFeatureVector[]> {

        logger.info('🏭 Batch creating feature vectors', { articleCount: articleIds.length });

        const vectors: MLFeatureVector[] = [];

        for (const articleId of articleIds) {
            try {
                // Find corresponding relative performance data
                const relativePerformance = relativePerformanceMap.get(articleId);
                if (!relativePerformance) {
                    logger.warn(`⚠️ No relative performance data for article ${articleId}`);
                    continue;
                }

                const vector = await this.createFeatureVector(articleId, relativePerformance);
                if (vector) {
                    vectors.push(vector);
                }

            } catch (error) {
                logger.error(`❌ Error creating feature vector for ${articleId}`, error);
            }
        }

        logger.info('✅ Feature vectors created', {
            successful: vectors.length,
            total: articleIds.length
        });

        return vectors;
    }

    /**
     * Export feature vectors to CSV for ML training
     */
    exportToCSV(vectors: MLFeatureVector[]): string {
        if (vectors.length === 0) return '';

        // Flatten feature vector into single-level object
        const flattenedVectors = vectors.map(vector => ({
            // Identifiers
            eventId: vector.eventId,
            articleId: vector.articleId,
            ticker: vector.ticker,
            eventTimestamp: vector.eventTimestamp.toISOString(),

            // Targets (what we predict)
            ...vector.targets,

            // Business factors (flattened)
            ...vector.businessFactors,

            // Article features (flattened)
            ...vector.articleFeatures,

            // Market context (flattened)
            ...vector.marketContext
        }));

        // Create CSV headers
        const headers = Object.keys(flattenedVectors[0]);
        const csvHeaders = headers.join(',');

        // Create CSV rows
        const csvRows = flattenedVectors.map(row =>
            headers.map(header => {
                const value = (row as any)[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            }).join(',')
        );

        return [csvHeaders, ...csvRows].join('\\n');
    }
}

export const featureEngineer = new FeatureEngineer();
