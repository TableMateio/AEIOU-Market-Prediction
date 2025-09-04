#!/usr/bin/env node

/**
 * ML Data Processor - Master Script
 * 
 * Processes business factors into ML training data with calculated market metrics
 * 
 * Usage:
 *   npx tsx src/scripts/ml/ml-data-processor.ts --mode=test
 *   npx tsx src/scripts/ml/ml-data-processor.ts --mode=batch --force
 *   npx tsx src/scripts/ml/ml-data-processor.ts --mode=single --id=<business_factor_id>
 *   npx tsx src/scripts/ml/ml-data-processor.ts --mode=batch --ticker=TSLA
 *   npx tsx src/scripts/ml/ml-data-processor.ts --mode=assign-splits
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';
import * as yargs from 'yargs';

const logger = createLogger('MLDataProcessor');

interface ProcessingOptions {
    mode: 'test' | 'single' | 'batch' | 'fill-gaps' | 'assign-splits';
    force?: boolean;           // Overwrite existing data
    limit?: number;           // Limit number to process
    businessFactorId?: string; // For single mode
    split?: 'training' | 'testing' | 'validation'; // For fill-gaps mode
    ticker?: string;          // Override ticker (auto-detected if not provided)
}

interface PricePoint {
    price: number;
    timestamp: Date;
    confidence: number;       // How close to target time (0-1)
}

interface ProcessingResult {
    businessFactorId: string;
    success: boolean;
    error?: string;
    dataQualityScore: number;
    missingDataPoints: string[];
    processingTimeMs: number;
}

export class MLDataProcessor {
    private supabase;
    private config: AppConfig;

    // Time windows (in minutes from event)
    private readonly TIME_WINDOWS = {
        // Before event
        '1min_before': -1,
        '5min_before': -5,
        '10min_before': -10,
        '30min_before': -30,
        '1hour_before': -60,
        '4hour_before': -240,
        '1day_before': -1440,
        '1week_before': -10080,
        '1month_before': -43200,
        '6month_before': -259200,
        '1year_before': -525600,

        // After event
        '1min_after': 1,
        '5min_after': 5,
        '10min_after': 10,
        '30min_after': 30,
        '1hour_after': 60,
        '4hour_after': 240,
        'end_of_day': 'EOD',      // Special case
        'next_day_open': 'NDO',   // Special case
        '1day_after': 1440,
        '1week_after': 10080,
        '1month_after': 43200,
        '6month_after': 259200,
        '1year_after': 525600
    };

    constructor() {
        this.config = AppConfig.getInstance();
        this.supabase = createClient(
            this.config.supabaseUrl,
            this.config.supabaseKey
        );
    }

    /**
 * Main processing function with comprehensive error handling
 * Auto-detects ticker from business factor data
 */
    async processBusinessFactor(
        businessFactorId: string,
        options: { force?: boolean; ticker?: string } = {}
    ): Promise<ProcessingResult> {
        const startTime = Date.now();

        // Get business factor data first to auto-detect ticker
        const businessFactor = await this.getBusinessFactor(businessFactorId);
        if (!businessFactor) {
            throw new Error(`Business factor not found: ${businessFactorId}`);
        }

        // Auto-detect ticker from article or use override
        const ticker = options.ticker || await this.detectTickerFromArticle(businessFactor.article_id) || 'AAPL';

        try {
            logger.info('🔄 Processing business factor', { businessFactorId, ticker });

            // Check if already processed (unless force)
            if (!options.force) {
                const existing = await this.checkExistingRecord(businessFactorId);
                if (existing) {
                    logger.info('⏭️ Already processed, skipping', { businessFactorId });
                    return {
                        businessFactorId,
                        success: true,
                        dataQualityScore: existing.data_quality_score || 0,
                        missingDataPoints: [],
                        processingTimeMs: Date.now() - startTime
                    };
                }
            }

            // Business factor already fetched above for ticker detection

            // Get article data for timestamp
            const article = await this.getArticle(businessFactor.article_id);
            if (!article) {
                throw new Error(`Article not found: ${businessFactor.article_id}`);
            }

            const eventTimestamp = new Date(article.published_at);
            logger.info('📅 Event timestamp', { eventTimestamp: eventTimestamp.toISOString() });

            // Calculate all price points with error handling
            const priceData = await this.calculateAllPricePoints(ticker, eventTimestamp);

            // Calculate benchmark data
            const benchmarkData = await this.calculateBenchmarkData(eventTimestamp);

            // Calculate derived metrics
            const metrics = this.calculateDerivedMetrics(priceData, benchmarkData);

            // Calculate market context
            const marketContext = await this.calculateMarketContext(eventTimestamp, benchmarkData.spy);

            // Prepare ML training record
            const mlRecord = {
                business_factor_id: businessFactorId,
                article_id: businessFactor.article_id,
                ticker,
                event_timestamp: eventTimestamp,
                event_type: businessFactor.event_type,
                event_description: businessFactor.event_description,

                // Business factors
                factor_name: businessFactor.factor_name,
                factor_category: businessFactor.factor_category,
                factor_magnitude: businessFactor.factor_magnitude,
                factor_movement: businessFactor.factor_movement,

                ai_execution_risk: businessFactor.ai_assessment_execution_risk,
                ai_competitive_risk: businessFactor.ai_assessment_competitive_risk,
                ai_business_impact_likelihood: businessFactor.ai_assessment_business_impact_likelihood,
                ai_timeline_realism: businessFactor.ai_assessment_timeline_realism,
                ai_fundamental_strength: businessFactor.ai_assessment_fundamental_strength,

                market_intensity: businessFactor.market_perception_intensity,
                market_hope_vs_fear: businessFactor.market_perception_hope_vs_fear,
                market_surprise_vs_anticipated: businessFactor.market_perception_surprise_vs_anticipated,
                market_consensus_vs_division: businessFactor.market_perception_consensus_vs_division,
                market_narrative_strength: businessFactor.market_perception_narrative_strength,

                perception_optimism_bias: businessFactor.perception_gap_optimism_bias,
                perception_risk_awareness: businessFactor.perception_gap_risk_awareness,
                perception_correction_potential: businessFactor.perception_gap_correction_potential,

                causal_certainty: businessFactor.causal_certainty,
                logical_directness: businessFactor.logical_directness,
                regime_alignment: businessFactor.regime_alignment,

                // Article context
                article_source: article.source,
                article_published_at: article.published_at,
                article_source_credibility: article.publisher_credibility || 0.5,
                article_author_credibility: article.author_credibility || 0.5,
                article_ticker_relevance_score: this.calculateTickerRelevance(article, ticker),

                // Raw price points
                ...priceData.rawPrices,

                // Benchmark prices
                ...benchmarkData,

                // Calculated metrics
                ...metrics,

                // Market context
                ...marketContext,

                // Processing metadata
                data_quality_score: priceData.dataQualityScore,
                processing_status: 'completed'
            };

            // Insert into ml_training_data
            await this.insertMLRecord(mlRecord);

            logger.info('✅ Business factor processed successfully', {
                businessFactorId,
                dataQualityScore: priceData.dataQualityScore,
                missingPoints: priceData.missingDataPoints.length
            });

            return {
                businessFactorId,
                success: true,
                dataQualityScore: priceData.dataQualityScore,
                missingDataPoints: priceData.missingDataPoints,
                processingTimeMs: Date.now() - startTime
            };

        } catch (error) {
            logger.error('❌ Error processing business factor', { businessFactorId, error });

            // Mark as failed in database
            await this.markProcessingFailed(businessFactorId, error.message);

            return {
                businessFactorId,
                success: false,
                error: error.message,
                dataQualityScore: 0,
                missingDataPoints: [],
                processingTimeMs: Date.now() - startTime
            };
        }
    }

    /**
     * Calculate all price points for a ticker around event time
     * WITH SMART ERROR HANDLING for missing data
     */
    private async calculateAllPricePoints(ticker: string, eventTime: Date): Promise<{
        rawPrices: any;
        dataQualityScore: number;
        missingDataPoints: string[];
    }> {
        const missingDataPoints: string[] = [];
        const rawPrices: any = {};

        // Get wider window of data (±1 year + buffer)
        const bufferDays = 7; // Extra buffer for weekends/holidays
        const startTime = new Date(eventTime.getTime() - (365 + bufferDays) * 24 * 60 * 60 * 1000);
        const endTime = new Date(eventTime.getTime() + (365 + bufferDays) * 24 * 60 * 60 * 1000);

        logger.info('📊 Fetching price data', {
            ticker,
            eventTime: eventTime.toISOString(),
            dataWindow: `${startTime.toISOString()} to ${endTime.toISOString()}`
        });

        // Get all price data for the window
        const { data: priceData, error } = await this.supabase
            .from('stock_prices')
            .select('close, timestamp, open, high, low, volume')
            .eq('ticker', ticker)
            .gte('timestamp', startTime.toISOString())
            .lte('timestamp', endTime.toISOString())
            .order('timestamp', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch price data for ${ticker}: ${error.message}`);
        }

        if (!priceData || priceData.length === 0) {
            throw new Error(`No price data found for ${ticker} around ${eventTime.toISOString()}`);
        }

        logger.info('📈 Price data fetched', {
            ticker,
            recordCount: priceData.length,
            firstRecord: priceData[0]?.timestamp,
            lastRecord: priceData[priceData.length - 1]?.timestamp
        });

        // Calculate each time window
        let successfulCalculations = 0;
        const totalCalculations = Object.keys(this.TIME_WINDOWS).length + 3; // +3 for daily anchors

        for (const [windowName, offsetMinutes] of Object.entries(this.TIME_WINDOWS)) {
            try {
                let targetTime: Date;
                let priceKey: string;

                if (offsetMinutes === 'EOD') {
                    // End of day: 4:00 PM ET on event day
                    targetTime = new Date(eventTime);
                    targetTime.setUTCHours(21, 0, 0, 0); // 4:00 PM ET = 21:00 UTC
                    priceKey = 'price_end_of_day';
                } else if (offsetMinutes === 'NDO') {
                    // Next day open: 9:30 AM ET next day
                    targetTime = new Date(eventTime.getTime() + 24 * 60 * 60 * 1000);
                    targetTime.setUTCHours(14, 30, 0, 0); // 9:30 AM ET = 14:30 UTC
                    priceKey = 'price_next_day_open';
                } else {
                    targetTime = new Date(eventTime.getTime() + (offsetMinutes as number) * 60 * 1000);
                    priceKey = `price_${windowName}`;
                }

                const pricePoint = this.findClosestPrice(priceData, targetTime);

                if (pricePoint) {
                    rawPrices[priceKey] = pricePoint.price;
                    successfulCalculations++;

                    if (pricePoint.confidence < 0.8) {
                        logger.warn(`⚠️ Low confidence price for ${windowName}`, {
                            targetTime: targetTime.toISOString(),
                            actualTime: pricePoint.timestamp.toISOString(),
                            confidence: pricePoint.confidence
                        });
                    }
                } else {
                    missingDataPoints.push(windowName);
                    rawPrices[priceKey] = null;
                    logger.warn(`❌ Missing price data for ${windowName}`, {
                        ticker,
                        targetTime: targetTime.toISOString()
                    });
                }

            } catch (error) {
                logger.error(`❌ Error calculating ${windowName}`, { ticker, error });
                missingDataPoints.push(windowName);
                rawPrices[`price_${windowName}`] = null;
            }
        }

        // Calculate daily anchors (day open, day close, at event)
        try {
            const dayStart = new Date(eventTime);
            dayStart.setUTCHours(14, 30, 0, 0); // 9:30 AM ET

            const dayEnd = new Date(eventTime);
            dayEnd.setUTCHours(21, 0, 0, 0); // 4:00 PM ET

            const dayOpen = this.findClosestPrice(priceData, dayStart);
            const dayClose = this.findClosestPrice(priceData, dayEnd);
            const atEvent = this.findClosestPrice(priceData, eventTime);

            rawPrices.price_day_open = dayOpen?.price || null;
            rawPrices.price_day_close = dayClose?.price || null;
            rawPrices.price_at_event = atEvent?.price || null;

            if (dayOpen) successfulCalculations++;
            if (dayClose) successfulCalculations++;
            if (atEvent) successfulCalculations++;

        } catch (error) {
            logger.error('❌ Error calculating daily anchors', { ticker, error });
        }

        const dataQualityScore = successfulCalculations / totalCalculations;

        logger.info('📊 Price calculation complete', {
            ticker,
            successfulCalculations,
            totalCalculations,
            dataQualityScore: dataQualityScore.toFixed(3),
            missingPoints: missingDataPoints.length
        });

        return {
            rawPrices,
            dataQualityScore,
            missingDataPoints
        };
    }

    /**
     * Smart price finder with fallback to nearest available data
     */
    private findClosestPrice(priceData: any[], targetTime: Date, maxToleranceMinutes: number = 60): PricePoint | null {
        if (!priceData || priceData.length === 0) return null;

        let closest: any = null;
        let minDiff = Infinity;

        // Find closest timestamp
        for (const record of priceData) {
            const recordTime = new Date(record.timestamp);
            const diffMs = Math.abs(recordTime.getTime() - targetTime.getTime());
            const diffMinutes = diffMs / (1000 * 60);

            if (diffMinutes < minDiff) {
                minDiff = diffMinutes;
                closest = record;
            }
        }

        if (!closest) return null;

        // Check if within acceptable tolerance
        if (minDiff > maxToleranceMinutes) {
            logger.warn(`⚠️ Price data outside tolerance`, {
                targetTime: targetTime.toISOString(),
                closestTime: closest.timestamp,
                diffMinutes: minDiff.toFixed(1),
                maxTolerance: maxToleranceMinutes
            });
            return null;
        }

        // Calculate confidence (closer = higher confidence)
        const confidence = Math.max(0, 1 - (minDiff / maxToleranceMinutes));

        return {
            price: closest.close,
            timestamp: new Date(closest.timestamp),
            confidence
        };
    }

    /**
     * Calculate benchmark data (SPY, QQQ) for same time windows
     */
    private async calculateBenchmarkData(eventTime: Date): Promise<any> {
        const benchmarks = ['SPY', 'QQQ'];
        const benchmarkData: any = {};

        for (const benchmark of benchmarks) {
            try {
                logger.info(`📊 Calculating ${benchmark} benchmark data`);

                const benchmarkPrices = await this.calculateAllPricePoints(benchmark, eventTime);

                // Store key benchmark prices
                const prefix = benchmark.toLowerCase();
                benchmarkData[`${prefix}_1min_before`] = benchmarkPrices.rawPrices.price_1min_before;
                benchmarkData[`${prefix}_1min_after`] = benchmarkPrices.rawPrices.price_1min_after;
                benchmarkData[`${prefix}_1hour_after`] = benchmarkPrices.rawPrices.price_1hour_after;
                benchmarkData[`${prefix}_1day_after`] = benchmarkPrices.rawPrices.price_1day_after;
                benchmarkData[`${prefix}_1week_after`] = benchmarkPrices.rawPrices.price_1week_after;
                benchmarkData[`${prefix}_1month_after`] = benchmarkPrices.rawPrices.price_1month_after;
                benchmarkData[`${prefix}_6month_after`] = benchmarkPrices.rawPrices.price_6month_after;
                benchmarkData[`${prefix}_1year_after`] = benchmarkPrices.rawPrices.price_1year_after;

            } catch (error) {
                logger.error(`❌ Error calculating ${benchmark} data`, { error });
                // Set benchmark prices to null if unavailable
                const prefix = benchmark.toLowerCase();
                benchmarkData[`${prefix}_1min_after`] = null;
                benchmarkData[`${prefix}_1day_after`] = null;
                benchmarkData[`${prefix}_1week_after`] = null;
            }
        }

        return benchmarkData;
    }

    /**
     * Calculate derived metrics (percentage changes, alpha, volatility, etc.)
     */
    private calculateDerivedMetrics(priceData: any, benchmarkData: any): any {
        const metrics: any = {};
        const prices = priceData.rawPrices;

        // Calculate absolute percentage changes
        const calculatePctChange = (fromPrice: number, toPrice: number): number => {
            if (!fromPrice || !toPrice) return null;
            return ((toPrice - fromPrice) / fromPrice) * 100;
        };

        // Absolute changes (Apple vs itself)
        metrics.abs_change_1min_after_pct = calculatePctChange(prices.price_at_event, prices.price_1min_after);
        metrics.abs_change_5min_after_pct = calculatePctChange(prices.price_at_event, prices.price_5min_after);
        metrics.abs_change_10min_after_pct = calculatePctChange(prices.price_at_event, prices.price_10min_after);
        metrics.abs_change_30min_after_pct = calculatePctChange(prices.price_at_event, prices.price_30min_after);
        metrics.abs_change_1hour_after_pct = calculatePctChange(prices.price_at_event, prices.price_1hour_after);
        metrics.abs_change_1day_after_pct = calculatePctChange(prices.price_at_event, prices.price_1day_after);
        metrics.abs_change_1week_after_pct = calculatePctChange(prices.price_at_event, prices.price_1week_after);
        metrics.abs_change_1month_after_pct = calculatePctChange(prices.price_at_event, prices.price_1month_after);
        metrics.abs_change_6month_after_pct = calculatePctChange(prices.price_at_event, prices.price_6month_after);
        metrics.abs_change_1year_after_pct = calculatePctChange(prices.price_at_event, prices.price_1year_after);

        // Before event changes
        metrics.abs_change_1min_before_pct = calculatePctChange(prices.price_1min_before, prices.price_at_event);
        metrics.abs_change_5min_before_pct = calculatePctChange(prices.price_5min_before, prices.price_at_event);
        metrics.abs_change_1hour_before_pct = calculatePctChange(prices.price_1hour_before, prices.price_at_event);
        metrics.abs_change_1day_before_pct = calculatePctChange(prices.price_1day_before, prices.price_at_event);

        // Alpha calculations (Apple vs SPY)
        const spyChange1min = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1min_after);
        const spyChange1day = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1day_after);
        const spyChange1week = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1week_after);
        const spyChange1month = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1month_after);

        metrics.alpha_vs_spy_1min_after = (metrics.abs_change_1min_after_pct || 0) - (spyChange1min || 0);
        metrics.alpha_vs_spy_1day_after = (metrics.abs_change_1day_after_pct || 0) - (spyChange1day || 0);
        metrics.alpha_vs_spy_1week_after = (metrics.abs_change_1week_after_pct || 0) - (spyChange1week || 0);
        metrics.alpha_vs_spy_1month_after = (metrics.abs_change_1month_after_pct || 0) - (spyChange1month || 0);

        // Alpha calculations (Apple vs QQQ)
        const qqqChange1day = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_1day_after);
        metrics.alpha_vs_qqq_1day_after = (metrics.abs_change_1day_after_pct || 0) - (qqqChange1day || 0);

        return metrics;
    }

    /**
     * Calculate market context metrics
     */
    private async calculateMarketContext(eventTime: Date, spyPrices: any): Promise<any> {
        const context: any = {};

        // Market hours check
        context.market_hours = this.isMarketHours(eventTime);

        // SPY momentum (30-day)
        if (spyPrices.spy_1min_before && spyPrices.spy_1month_before) {
            context.spy_momentum_30day = ((spyPrices.spy_1min_before - spyPrices.spy_1month_before) / spyPrices.spy_1month_before) * 100;
        } else {
            context.spy_momentum_30day = null;
        }

        // Market regime determination
        if (context.spy_momentum_30day !== null) {
            if (context.spy_momentum_30day > 5) {
                context.market_regime = 'bull';
            } else if (context.spy_momentum_30day < -5) {
                context.market_regime = 'bear';
            } else {
                context.market_regime = 'sideways';
            }
        } else {
            context.market_regime = 'unknown';
        }

        return context;
    }

    /**
     * Auto-detect ticker from article data
     */
    private async detectTickerFromArticle(articleId: string): Promise<string | null> {
        try {
            const article = await this.getArticle(articleId);
            if (!article) return null;

            // Check tickers array first (most reliable)
            if (article.tickers && Array.isArray(article.tickers) && article.tickers.length > 0) {
                logger.info('🎯 Ticker detected from tickers array', {
                    articleId,
                    ticker: article.tickers[0]
                });
                return article.tickers[0];
            }

            // Fallback: detect from title/content
            const title = (article.title || '').toLowerCase();
            const content = (article.body || '').toLowerCase();
            const text = title + ' ' + content;

            // Common ticker patterns
            const tickerPatterns = [
                { pattern: /apple|aapl/i, ticker: 'AAPL' },
                { pattern: /tesla|tsla/i, ticker: 'TSLA' },
                { pattern: /microsoft|msft/i, ticker: 'MSFT' },
                { pattern: /google|googl|alphabet/i, ticker: 'GOOGL' },
                { pattern: /amazon|amzn/i, ticker: 'AMZN' },
                { pattern: /meta|facebook|fb/i, ticker: 'META' },
                { pattern: /nvidia|nvda/i, ticker: 'NVDA' }
            ];

            for (const { pattern, ticker } of tickerPatterns) {
                if (pattern.test(text)) {
                    logger.info('🎯 Ticker detected from content', {
                        articleId,
                        ticker,
                        pattern: pattern.source
                    });
                    return ticker;
                }
            }

            logger.warn('⚠️ Could not auto-detect ticker', { articleId });
            return null;

        } catch (error) {
            logger.error('❌ Error detecting ticker from article', { articleId, error });
            return null;
        }
    }

    /**
     * Calculate ticker relevance score generically
     */
    private calculateTickerRelevance(article: any, ticker: string): number {
        try {
            // If we have apple_relevance_score and ticker is AAPL, use it
            if (ticker === 'AAPL' && article.apple_relevance_score) {
                return article.apple_relevance_score;
            }

            // Generic calculation based on mentions
            const title = (article.title || '').toLowerCase();
            const content = (article.body || '').toLowerCase();
            const text = title + ' ' + content;

            // Get company name for ticker
            const companyNames: { [key: string]: string[] } = {
                'AAPL': ['apple', 'aapl', 'iphone', 'ipad', 'mac', 'ios'],
                'TSLA': ['tesla', 'tsla', 'elon musk', 'model 3', 'model y'],
                'MSFT': ['microsoft', 'msft', 'windows', 'azure', 'office'],
                'GOOGL': ['google', 'googl', 'alphabet', 'android', 'youtube'],
                'AMZN': ['amazon', 'amzn', 'aws', 'prime', 'alexa'],
                'META': ['meta', 'facebook', 'instagram', 'whatsapp'],
                'NVDA': ['nvidia', 'nvda', 'gpu', 'ai chip']
            };

            const keywords = companyNames[ticker] || [ticker.toLowerCase()];

            // Count mentions
            let mentionCount = 0;
            for (const keyword of keywords) {
                const regex = new RegExp(keyword, 'gi');
                const matches = text.match(regex);
                mentionCount += matches ? matches.length : 0;
            }

            // Calculate relevance (0.1 = barely mentioned, 1.0 = primary focus)
            if (mentionCount === 0) return 0.0;
            if (mentionCount >= 10) return 1.0;
            if (mentionCount >= 5) return 0.8;
            if (mentionCount >= 3) return 0.6;
            if (mentionCount >= 1) return 0.3;

            return 0.1;

        } catch (error) {
            logger.error('❌ Error calculating ticker relevance', { ticker, error });
            return 0.5; // Default relevance
        }
    }

    /**
     * Check if timestamp is during market hours
     */
    private isMarketHours(timestamp: Date): boolean {
        const hour = timestamp.getUTCHours();
        const dayOfWeek = timestamp.getUTCDay();

        // US market hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
        // Monday = 1, Friday = 5
        return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 14 && hour < 21;
    }

    /**
     * Get business factor from database
     */
    private async getBusinessFactor(businessFactorId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('business_factors_flat')
            .select('*')
            .eq('id', businessFactorId)
            .single();

        if (error) {
            throw new Error(`Failed to fetch business factor: ${error.message}`);
        }

        return data;
    }

    /**
     * Get article from database
     */
    private async getArticle(articleId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('articles')
            .select('*')
            .eq('id', articleId)
            .single();

        if (error) {
            throw new Error(`Failed to fetch article: ${error.message}`);
        }

        return data;
    }

    /**
     * Check if business factor already processed
     */
    private async checkExistingRecord(businessFactorId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('ml_training_data')
            .select('id, data_quality_score')
            .eq('business_factor_id', businessFactorId)
            .eq('processing_status', 'completed')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            logger.error('Error checking existing record', { businessFactorId, error });
        }

        return data;
    }

    /**
     * Insert ML record into database
     */
    private async insertMLRecord(record: any): Promise<void> {
        const { error } = await this.supabase
            .from('ml_training_data')
            .upsert(record, {
                onConflict: 'business_factor_id',
                ignoreDuplicates: false
            });

        if (error) {
            throw new Error(`Failed to insert ML record: ${error.message}`);
        }
    }

    /**
     * Mark processing as failed
     */
    private async markProcessingFailed(businessFactorId: string, errorMessage: string): Promise<void> {
        try {
            await this.supabase
                .from('ml_training_data')
                .upsert({
                    business_factor_id: businessFactorId,
                    processing_status: 'failed',
                    data_quality_score: 0
                }, { onConflict: 'business_factor_id' });
        } catch (error) {
            logger.error('Failed to mark processing as failed', { businessFactorId, error });
        }
    }

    /**
     * Batch process multiple business factors
     */
    async batchProcess(options: ProcessingOptions): Promise<ProcessingResult[]> {
        logger.info('🚀 Starting batch processing', options);

        // Get business factors to process
        let query = this.supabase
            .from('business_factors_flat')
            .select('id, article_id, event_type, event_description');

        if (!options.force) {
            // Only process unprocessed items
            const { data: processedIds } = await this.supabase
                .from('ml_training_data')
                .select('business_factor_id')
                .eq('processing_status', 'completed');

            const processedSet = new Set(processedIds?.map(r => r.business_factor_id) || []);
            // Note: Would need to filter out processed IDs in a real implementation
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data: businessFactors, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch business factors: ${error.message}`);
        }

        if (!businessFactors || businessFactors.length === 0) {
            logger.info('ℹ️ No business factors to process');
            return [];
        }

        logger.info(`📋 Found ${businessFactors.length} business factors to process`);

        const results: ProcessingResult[] = [];

        // Process in batches of 5 to avoid overwhelming database
        const batchSize = 5;
        for (let i = 0; i < businessFactors.length; i += batchSize) {
            const batch = businessFactors.slice(i, i + batchSize);

            logger.info(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(businessFactors.length / batchSize)}`);

            const batchResults = await Promise.all(
                batch.map(bf => this.processBusinessFactor(bf.id, {
                    force: options.force,
                    ticker: options.ticker
                }))
            );

            results.push(...batchResults);

            // Brief pause between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Summary
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const avgQuality = results
            .filter(r => r.success)
            .reduce((sum, r) => sum + r.dataQualityScore, 0) / successful;

        logger.info('🎉 Batch processing complete', {
            total: results.length,
            successful,
            failed,
            avgDataQuality: avgQuality?.toFixed(3) || 'N/A'
        });

        return results;
    }

    /**
     * Assign train/test splits (80/20 temporal)
     */
    async assignTrainTestSplits(): Promise<void> {
        logger.info('🎯 Assigning train/test splits');

        // Get all completed records ordered by timestamp
        const { data: records, error } = await this.supabase
            .from('ml_training_data')
            .select('id, event_timestamp')
            .eq('processing_status', 'completed')
            .order('event_timestamp', { ascending: true });

        if (error) {
            throw new Error(`Failed to fetch records for split assignment: ${error.message}`);
        }

        if (!records || records.length === 0) {
            logger.warn('⚠️ No completed records found for split assignment');
            return;
        }

        // 80/20 temporal split
        const splitIndex = Math.floor(records.length * 0.8);

        const trainingIds = records.slice(0, splitIndex).map(r => r.id);
        const testingIds = records.slice(splitIndex).map(r => r.id);

        // Update training records
        if (trainingIds.length > 0) {
            await this.supabase
                .from('ml_training_data')
                .update({ ml_split: 'training' })
                .in('id', trainingIds);
        }

        // Update testing records
        if (testingIds.length > 0) {
            await this.supabase
                .from('ml_training_data')
                .update({ ml_split: 'testing' })
                .in('id', testingIds);
        }

        logger.info('✅ Train/test splits assigned', {
            training: trainingIds.length,
            testing: testingIds.length,
            splitRatio: `${(trainingIds.length / records.length * 100).toFixed(1)}%/${(testingIds.length / records.length * 100).toFixed(1)}%`
        });
    }

    /**
     * Create test data for development
     */
    async createTestData(): Promise<void> {
        logger.info('🧪 Creating test data');

        // Create a mock business factor for testing
        const testArticleId = 'test-article-' + Date.now();
        const testBusinessFactorId = 'test-bf-' + Date.now();

        // Insert test article
        await this.supabase
            .from('articles')
            .insert({
                id: testArticleId,
                title: 'Test AI Partnership Announcement',
                url: 'https://example.com/test',
                published_at: new Date('2024-01-15T14:30:00Z'), // During market hours
                source: 'Test Source',
                tickers: ['AAPL'], // Array of relevant tickers
                apple_relevance_score: 0.9 // Keep for backward compatibility
            });

        // Insert test business factor
        await this.supabase
            .from('business_factors_flat')
            .insert({
                id: testBusinessFactorId,
                article_id: testArticleId,
                factor_name: 'AI Integration Capability',
                factor_category: 'product',
                factor_magnitude: 0.75,
                factor_movement: 1,
                event_type: 'Product_Announcement',
                event_description: 'AI partnership announcement',
                ai_assessment_execution_risk: 0.3,
                ai_assessment_competitive_risk: 0.2,
                market_perception_intensity: 0.8,
                market_perception_hope_vs_fear: 0.7
            });

        logger.info('✅ Test data created', { testBusinessFactorId, testArticleId });
    }
}

// CLI Interface
async function main() {
    const argv = yargs
        .option('mode', {
            choices: ['test', 'single', 'batch', 'fill-gaps', 'assign-splits', 'create-test-data'] as const,
            demandOption: true,
            description: 'Processing mode'
        })
        .option('force', {
            type: 'boolean',
            default: false,
            description: 'Overwrite existing records'
        })
        .option('limit', {
            type: 'number',
            description: 'Limit number of records to process'
        })
        .option('id', {
            type: 'string',
            description: 'Business factor ID for single mode'
        })
        .option('ticker', {
            type: 'string',
            description: 'Stock ticker to process (auto-detected if not provided)'
        })
        .help()
        .argv;

    const processor = new MLDataProcessor();
    const options = argv as ProcessingOptions;

    try {
        switch (options.mode) {
            case 'create-test-data':
                await processor.createTestData();
                break;

            case 'test':
                logger.info('🧪 Running in test mode');
                await processor.createTestData();
                const testResults = await processor.batchProcess({
                    ...options,
                    limit: 1
                });
                logger.info('Test results', testResults);
                break;

            case 'single':
                if (!options.businessFactorId) {
                    throw new Error('Business factor ID required for single mode');
                }
                const result = await processor.processBusinessFactor(options.businessFactorId, options);
                logger.info('Single processing result', result);
                break;

            case 'batch':
                const batchResults = await processor.batchProcess(options);
                logger.info(`Batch processing complete: ${batchResults.filter(r => r.success).length}/${batchResults.length} successful`);
                break;

            case 'assign-splits':
                await processor.assignTrainTestSplits();
                break;

            default:
                logger.error('Invalid mode specified');
                process.exit(1);
        }

        logger.info('🎉 ML data processing completed successfully');

    } catch (error) {
        logger.error('❌ ML data processing failed', { error });
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

export { MLDataProcessor };
