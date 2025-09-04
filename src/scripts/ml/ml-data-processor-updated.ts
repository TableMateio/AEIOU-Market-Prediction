#!/usr/bin/env node

/**
 * ML Data Processor - Master Script (Updated for causal_events_flat)
 * 
 * Processes causal events into ML training data with calculated market metrics
 * 
 * Usage:
 *   npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=test
 *   npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=batch --force
 *   npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=single --id=<causal_event_id>
 *   npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=batch --ticker=TSLA
 *   npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=assign-splits
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';
import * as yargs from 'yargs';

const logger = createLogger('MLDataProcessor');

interface ProcessingOptions {
    mode: 'test' | 'single' | 'batch' | 'fill-gaps' | 'assign-splits' | 'create-test-data';
    force?: boolean;           // DEPRECATED: Use --force-process and --force-overwrite instead
    forceProcess?: boolean;    // Process records even if processing_status != 'pending'
    forceOverwrite?: boolean;  // Overwrite existing records in ml_training_data
    limit?: number;           // Limit number to process
    causalEventId?: string;   // For single mode
    split?: 'training' | 'testing' | 'validation'; // For fill-gaps mode
    ticker?: string;          // Override ticker (auto-detected if not provided)
    startDate?: string;       // YYYY-MM-DD format - filter events from this date
    endDate?: string;         // YYYY-MM-DD format - filter events to this date
}

interface PricePoint {
    price: number;
    timestamp: Date;
    confidence: number;       // How close to target time (0-1)
    timeDeviationMinutes?: number;  // How many minutes off from target
    percentageDeviation?: number;   // Percentage deviation from intended timeframe
    fallbackDays?: number;          // How many days we fell back
}

interface ProcessingResult {
    causalEventId: string;
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
            this.config.supabaseConfig.projectUrl,
            this.config.supabaseConfig.apiKey
        );
    }

    /**
     * Main processing function with comprehensive error handling
     * Auto-detects ticker from causal event data
     */
    async processCausalEvent(
        causalEventId: string,
        options: { force?: boolean; forceOverwrite?: boolean; ticker?: string } = {}
    ): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            // Get causal event data first to auto-detect ticker
            const causalEvent = await this.getCausalEvent(causalEventId);
            if (!causalEvent) {
                throw new Error(`Causal event not found: ${causalEventId}`);
            }

            // Auto-detect ticker from article or use override
            const ticker = options.ticker || await this.detectTickerFromArticle(causalEvent.article_id) || 'AAPL';

            logger.info('🔄 Processing causal event', { causalEventId, ticker });

            // Check if already processed (unless force overwrite)
            const forceOverwrite = options.forceOverwrite || options.force; // Support legacy flag
            if (!forceOverwrite) {
                const existing = await this.checkExistingRecord(causalEventId);
                if (existing) {
                    logger.info('⏭️ Already processed, skipping', { causalEventId });
                    return {
                        causalEventId,
                        success: true,
                        dataQualityScore: existing.data_quality_score || 0,
                        missingDataPoints: [],
                        processingTimeMs: Date.now() - startTime
                    };
                }
            }

            // Get article data for additional context
            const article = await this.getArticle(causalEvent.article_id);
            if (!article) {
                throw new Error(`Article not found: ${causalEvent.article_id}`);
            }

            // Use timestamp from causal_events_flat (more reliable)
            const eventTimestamp = new Date(causalEvent.article_published_at || article.published_at);
            logger.info('📅 Event timestamp', { eventTimestamp: eventTimestamp.toISOString() });

            // Calculate all price points with error handling
            const priceData = await this.calculateAllPricePoints(ticker, eventTimestamp);

            // Calculate benchmark data
            const benchmarkData = await this.calculateBenchmarkData(eventTimestamp);

            // Calculate derived metrics
            const metrics = this.calculateDerivedMetrics(priceData, benchmarkData);

            // Calculate market context
            const marketContext = await this.calculateMarketContext(eventTimestamp, benchmarkData);

            // Prepare ML training record
            const mlRecord = {
                business_factor_id: causalEventId,  // Keep same field name for foreign key
                article_id: causalEvent.article_id,
                ticker,
                event_timestamp: eventTimestamp,

                // Copy ALL fields from causal_events_flat (exact field names)
                causal_events_ai_id: causalEvent.causal_events_ai_id,
                business_event_index: causalEvent.business_event_index,
                causal_step_index: causalEvent.causal_step_index,
                article_headline: causalEvent.article_headline,
                article_url: causalEvent.article_url,
                article_authors: causalEvent.article_authors,
                article_publisher_credibility: causalEvent.article_publisher_credibility,
                article_audience_split: causalEvent.article_audience_split,
                article_time_lag_days: causalEvent.article_time_lag_days,
                article_market_regime: causalEvent.article_market_regime,
                article_published_year: causalEvent.article_published_year,
                article_published_month: causalEvent.article_published_month,
                article_published_day_of_week: causalEvent.article_published_day_of_week,
                event_type: causalEvent.event_type,
                event_trigger: causalEvent.event_trigger,
                event_entities: causalEvent.event_entities,
                event_scope: causalEvent.event_scope,
                event_orientation: causalEvent.event_orientation,
                event_time_horizon_days: causalEvent.event_time_horizon_days,
                event_tags: causalEvent.event_tags,
                event_quoted_people: causalEvent.event_quoted_people,
                event_description: causalEvent.event_description,
                causal_step: causalEvent.causal_step,
                factor_name: causalEvent.factor_name,
                factor_synonyms: causalEvent.factor_synonyms,
                factor_category: causalEvent.factor_category,
                factor_unit: causalEvent.factor_unit,
                factor_raw_value: causalEvent.factor_raw_value,
                factor_delta: causalEvent.factor_delta,
                factor_description: causalEvent.factor_description,
                factor_movement: causalEvent.factor_movement,
                factor_magnitude: causalEvent.factor_magnitude,
                factor_orientation: causalEvent.factor_orientation,
                factor_about_time_days: causalEvent.factor_about_time_days,
                factor_effect_horizon_days: causalEvent.factor_effect_horizon_days,
                evidence_level: causalEvent.evidence_level,
                evidence_source: causalEvent.evidence_source,
                evidence_citation: causalEvent.evidence_citation,
                causal_certainty: causalEvent.causal_certainty,
                logical_directness: causalEvent.logical_directness,
                market_consensus_on_causality: causalEvent.market_consensus_on_causality,
                regime_alignment: causalEvent.regime_alignment,
                reframing_potential: causalEvent.reframing_potential,
                narrative_disruption: causalEvent.narrative_disruption,
                market_perception_intensity: causalEvent.market_perception_intensity,
                market_perception_hope_vs_fear: causalEvent.market_perception_hope_vs_fear,
                market_perception_surprise_vs_anticipated: causalEvent.market_perception_surprise_vs_anticipated,
                market_perception_consensus_vs_division: causalEvent.market_perception_consensus_vs_division,
                market_perception_narrative_strength: causalEvent.market_perception_narrative_strength,
                market_perception_emotional_profile: causalEvent.market_perception_emotional_profile,
                market_perception_cognitive_biases: causalEvent.market_perception_cognitive_biases,
                ai_assessment_execution_risk: causalEvent.ai_assessment_execution_risk,
                ai_assessment_competitive_risk: causalEvent.ai_assessment_competitive_risk,
                ai_assessment_business_impact_likelihood: causalEvent.ai_assessment_business_impact_likelihood,
                ai_assessment_timeline_realism: causalEvent.ai_assessment_timeline_realism,
                ai_assessment_fundamental_strength: causalEvent.ai_assessment_fundamental_strength,
                perception_gap_optimism_bias: causalEvent.perception_gap_optimism_bias,
                perception_gap_risk_awareness: causalEvent.perception_gap_risk_awareness,
                perception_gap_correction_potential: causalEvent.perception_gap_correction_potential,
                intensity: causalEvent.intensity,
                certainty_truth: causalEvent.certainty_truth,
                certainty_impact: causalEvent.certainty_impact,
                hope_vs_fear: causalEvent.hope_vs_fear,
                surprise_vs_anticipated: causalEvent.surprise_vs_anticipated,
                consensus_vs_division: causalEvent.consensus_vs_division,
                positive_vs_negative_sentiment: causalEvent.positive_vs_negative_sentiment,

                // Article context (use causal_events_flat data first, fallback to articles table)
                article_source: causalEvent.article_source || article.source,
                article_published_at: causalEvent.article_published_at || article.published_at,
                article_source_credibility: causalEvent.article_source_credibility || article.publisher_credibility || 0.5,
                article_author_credibility: causalEvent.article_author_credibility || article.author_credibility || 0.5,
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
                missing_data_points: priceData.missingDataPoints,
                approximation_quality: {
                    ...priceData.approximationQuality,
                    ...benchmarkData.approximation_quality
                },
                processing_time_ms: Date.now() - startTime,
                processing_timestamp: new Date().toISOString(),
                processing_status: 'completed'
            };

            // Insert into ml_training_data
            await this.insertMLRecord(mlRecord);

            // Update processing status in source table
            await this.updateCausalEventProcessingStatus(causalEventId, 'completed');

            logger.info('✅ Causal event processed successfully', {
                causalEventId,
                ticker,
                dataQualityScore: priceData.dataQualityScore,
                missingPoints: priceData.missingDataPoints.length
            });

            return {
                causalEventId,
                success: true,
                dataQualityScore: priceData.dataQualityScore,
                missingDataPoints: priceData.missingDataPoints,
                processingTimeMs: Date.now() - startTime
            };

        } catch (error) {
            logger.error('❌ Error processing causal event', { causalEventId, error });

            // Mark as failed in both tables
            await this.markProcessingFailed(causalEventId, error.message);
            await this.updateCausalEventProcessingStatus(causalEventId, 'skipped');

            return {
                causalEventId,
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

        // Get targeted window of data (±7 days around event to avoid limit issues)
        const bufferDays = 7;
        const startTime = new Date(eventTime.getTime() - bufferDays * 24 * 60 * 60 * 1000);
        const endTime = new Date(eventTime.getTime() + bufferDays * 24 * 60 * 60 * 1000);

        logger.info('📊 Fetching price data', {
            ticker,
            eventTime: eventTime.toISOString(),
            dataWindow: `${startTime.toISOString()} to ${endTime.toISOString()}`
        });

        // Get price data with targeted 2-week window to avoid Supabase limit issues
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
        const approximationQuality: any = {};

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

                // Use progressive fallback for missing data
                const pricePoint = await this.findClosestPriceWithFallback(ticker, targetTime, 60);

                if (pricePoint) {
                    rawPrices[priceKey] = pricePoint.price;
                    rawPrices[`confidence_${windowName}`] = pricePoint.confidence;
                    successfulCalculations++;

                    // Track approximation quality if there was deviation
                    if (pricePoint.timeDeviationMinutes > 0 || pricePoint.fallbackDays > 0) {
                        approximationQuality[windowName] = {
                            timeDeviationMinutes: pricePoint.timeDeviationMinutes,
                            percentageDeviation: pricePoint.percentageDeviation,
                            fallbackDays: pricePoint.fallbackDays,
                            confidence: pricePoint.confidence
                        };
                    }

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
                    rawPrices[`confidence_${windowName}`] = 0;
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

            // Use fallback method for daily anchors (same as time windows)
            const dayOpen = await this.findClosestPriceWithFallback(ticker, dayStart, 1440);
            const dayClose = await this.findClosestPriceWithFallback(ticker, dayEnd, 1440);
            const atEvent = await this.findClosestPriceWithFallback(ticker, eventTime, 60);

            // Store in both column sets for compatibility
            rawPrices.price_day_open = dayOpen?.price || null;
            rawPrices.price_day_close = dayClose?.price || null;
            rawPrices.price_daily_open = dayOpen?.price || null;
            rawPrices.price_daily_close = dayClose?.price || null;
            rawPrices.price_at_event = atEvent?.price || null;

            // Store confidence scores for daily anchors
            rawPrices.confidence_daily_open = dayOpen?.confidence || 0;
            rawPrices.confidence_daily_close = dayClose?.confidence || 0;
            rawPrices.confidence_at_event = atEvent?.confidence || 0;

            // Track approximation quality for daily anchors
            if (dayOpen && (dayOpen.timeDeviationMinutes > 0 || dayOpen.fallbackDays > 0)) {
                approximationQuality.daily_open = {
                    timeDeviationMinutes: dayOpen.timeDeviationMinutes,
                    percentageDeviation: dayOpen.percentageDeviation,
                    fallbackDays: dayOpen.fallbackDays,
                    confidence: dayOpen.confidence
                };
            }
            if (dayClose && (dayClose.timeDeviationMinutes > 0 || dayClose.fallbackDays > 0)) {
                approximationQuality.daily_close = {
                    timeDeviationMinutes: dayClose.timeDeviationMinutes,
                    percentageDeviation: dayClose.percentageDeviation,
                    fallbackDays: dayClose.fallbackDays,
                    confidence: dayClose.confidence
                };
            }
            if (atEvent && (atEvent.timeDeviationMinutes > 0 || atEvent.fallbackDays > 0)) {
                approximationQuality.at_event = {
                    timeDeviationMinutes: atEvent.timeDeviationMinutes,
                    percentageDeviation: atEvent.percentageDeviation,
                    fallbackDays: atEvent.fallbackDays,
                    confidence: atEvent.confidence
                };
            }

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
            missingDataPoints,
            approximationQuality
        };
    }

    /**
     * Smart price finder with progressive fallback for weekends/holidays
     */
    private async findClosestPriceWithFallback(ticker: string, targetTime: Date, maxToleranceMinutes: number = 60): Promise<PricePoint | null> {
        // Try progressive fallback: today → next day → day after → up to 5 business days
        for (let dayOffset = 0; dayOffset <= 5; dayOffset++) {
            const fallbackDate = new Date(targetTime.getTime() + (dayOffset * 24 * 60 * 60 * 1000));
            const dayOfWeek = fallbackDate.getUTCDay();

            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue;
            }

            // Get data for this specific day
            const startOfDay = new Date(fallbackDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(fallbackDate);
            endOfDay.setUTCHours(23, 59, 59, 999);

            const { data: dayData, error } = await this.supabase
                .from('stock_prices')
                .select('close, timestamp, open, high, low, volume')
                .eq('ticker', ticker)
                .gte('timestamp', startOfDay.toISOString())
                .lte('timestamp', endOfDay.toISOString())
                .order('timestamp', { ascending: true });

            if (error || !dayData || dayData.length === 0) {
                logger.warn(`📅 No data for ${ticker} on ${fallbackDate.toISOString().split('T')[0]}`);
                continue;
            }

            // Find closest price in this day's data
            const result = this.findClosestPriceInData(dayData, targetTime, maxToleranceMinutes * (dayOffset + 1));
            if (result) {
                // Calculate deviation metrics
                const timeDeviationMinutes = Math.abs((result.timestamp.getTime() - targetTime.getTime()) / (1000 * 60));
                const fallbackDays = dayOffset;

                // Calculate percentage deviation based on the intended timeframe
                // For very short timeframes (< 1 hour), deviation is based on minutes
                // For longer timeframes, deviation is based on the timeframe itself
                let percentageDeviation = 0;
                if (maxToleranceMinutes <= 60) {
                    // Short timeframe: deviation as percentage of tolerance
                    percentageDeviation = (timeDeviationMinutes / maxToleranceMinutes) * 100;
                } else {
                    // Long timeframe: deviation as percentage of intended period
                    const intendedPeriodDays = maxToleranceMinutes / (24 * 60);
                    const actualDeviationDays = timeDeviationMinutes / (24 * 60) + fallbackDays;
                    percentageDeviation = (actualDeviationDays / intendedPeriodDays) * 100;
                }

                const enhancedResult = {
                    ...result,
                    timeDeviationMinutes: Math.round(timeDeviationMinutes),
                    percentageDeviation: Math.round(percentageDeviation * 100) / 100, // Round to 2 decimals
                    fallbackDays
                };

                logger.info(`✅ Found price data with ${dayOffset}-day fallback`, {
                    ticker,
                    targetTime: targetTime.toISOString(),
                    foundTime: result.timestamp,
                    dayOffset,
                    confidence: result.confidence
                });
                return enhancedResult;
            }
        }

        logger.warn(`❌ No price data found within 5-day fallback window`, {
            ticker,
            targetTime: targetTime.toISOString()
        });
        return null;
    }

    /**
     * Helper function to find closest price within a dataset
     */
    private findClosestPriceInData(priceData: any[], targetTime: Date, maxToleranceMinutes: number): PricePoint | null {
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

                // Store ALL benchmark prices needed for alpha calculations
                const prefix = benchmark.toLowerCase();

                // Before event prices
                benchmarkData[`${prefix}_1min_before`] = benchmarkPrices.rawPrices.price_1min_before;
                benchmarkData[`${prefix}_5min_before`] = benchmarkPrices.rawPrices.price_5min_before;
                benchmarkData[`${prefix}_10min_before`] = benchmarkPrices.rawPrices.price_10min_before;
                benchmarkData[`${prefix}_30min_before`] = benchmarkPrices.rawPrices.price_30min_before;
                benchmarkData[`${prefix}_1hour_before`] = benchmarkPrices.rawPrices.price_1hour_before;
                benchmarkData[`${prefix}_4hour_before`] = benchmarkPrices.rawPrices.price_4hour_before;
                benchmarkData[`${prefix}_1day_before`] = benchmarkPrices.rawPrices.price_1day_before;
                benchmarkData[`${prefix}_1week_before`] = benchmarkPrices.rawPrices.price_1week_before;
                benchmarkData[`${prefix}_1month_before`] = benchmarkPrices.rawPrices.price_1month_before;
                benchmarkData[`${prefix}_6month_before`] = benchmarkPrices.rawPrices.price_6month_before;
                benchmarkData[`${prefix}_1year_before`] = benchmarkPrices.rawPrices.price_1year_before;

                // After event prices
                benchmarkData[`${prefix}_1min_after`] = benchmarkPrices.rawPrices.price_1min_after;
                benchmarkData[`${prefix}_5min_after`] = benchmarkPrices.rawPrices.price_5min_after;
                benchmarkData[`${prefix}_10min_after`] = benchmarkPrices.rawPrices.price_10min_after;
                benchmarkData[`${prefix}_30min_after`] = benchmarkPrices.rawPrices.price_30min_after;
                benchmarkData[`${prefix}_1hour_after`] = benchmarkPrices.rawPrices.price_1hour_after;
                benchmarkData[`${prefix}_4hour_after`] = benchmarkPrices.rawPrices.price_4hour_after;
                benchmarkData[`${prefix}_1day_after`] = benchmarkPrices.rawPrices.price_1day_after;
                benchmarkData[`${prefix}_1week_after`] = benchmarkPrices.rawPrices.price_1week_after;
                benchmarkData[`${prefix}_1month_after`] = benchmarkPrices.rawPrices.price_1month_after;
                benchmarkData[`${prefix}_6month_after`] = benchmarkPrices.rawPrices.price_6month_after;
                benchmarkData[`${prefix}_1year_after`] = benchmarkPrices.rawPrices.price_1year_after;

                // Merge approximation quality metrics from benchmark data
                if (benchmarkPrices.approximationQuality) {
                    benchmarkData.approximation_quality = benchmarkData.approximation_quality || {};
                    Object.keys(benchmarkPrices.approximationQuality).forEach(key => {
                        benchmarkData.approximation_quality[`${benchmark.toLowerCase()}_${key}`] = benchmarkPrices.approximationQuality[key];
                    });
                }

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

        // ===== COMPLETE ABSOLUTE CHANGES (BEFORE EVENT) =====
        metrics.abs_change_1min_before_pct = calculatePctChange(prices.price_1min_before, prices.price_at_event);
        metrics.abs_change_5min_before_pct = calculatePctChange(prices.price_5min_before, prices.price_at_event);
        metrics.abs_change_10min_before_pct = calculatePctChange(prices.price_10min_before, prices.price_at_event);
        metrics.abs_change_30min_before_pct = calculatePctChange(prices.price_30min_before, prices.price_at_event);
        metrics.abs_change_1hour_before_pct = calculatePctChange(prices.price_1hour_before, prices.price_at_event);
        metrics.abs_change_4hour_before_pct = calculatePctChange(prices.price_4hour_before, prices.price_at_event);
        metrics.abs_change_1day_before_pct = calculatePctChange(prices.price_1day_before, prices.price_at_event);
        metrics.abs_change_1week_before_pct = calculatePctChange(prices.price_1week_before, prices.price_at_event);
        metrics.abs_change_1month_before_pct = calculatePctChange(prices.price_1month_before, prices.price_at_event);
        metrics.abs_change_6month_before_pct = calculatePctChange(prices.price_6month_before, prices.price_at_event);
        metrics.abs_change_1year_before_pct = calculatePctChange(prices.price_1year_before, prices.price_at_event);

        // ===== COMPLETE ABSOLUTE CHANGES (AFTER EVENT) =====
        metrics.abs_change_1min_after_pct = calculatePctChange(prices.price_at_event, prices.price_1min_after);
        metrics.abs_change_5min_after_pct = calculatePctChange(prices.price_at_event, prices.price_5min_after);
        metrics.abs_change_10min_after_pct = calculatePctChange(prices.price_at_event, prices.price_10min_after);
        metrics.abs_change_30min_after_pct = calculatePctChange(prices.price_at_event, prices.price_30min_after);
        metrics.abs_change_1hour_after_pct = calculatePctChange(prices.price_at_event, prices.price_1hour_after);
        metrics.abs_change_4hour_after_pct = calculatePctChange(prices.price_at_event, prices.price_4hour_after);
        metrics.abs_change_end_of_day_pct = calculatePctChange(prices.price_at_event, prices.price_end_of_day);
        metrics.abs_change_next_day_open_pct = calculatePctChange(prices.price_at_event, prices.price_next_day_open);
        metrics.abs_change_1day_after_pct = calculatePctChange(prices.price_at_event, prices.price_1day_after);
        metrics.abs_change_1week_after_pct = calculatePctChange(prices.price_at_event, prices.price_1week_after);
        metrics.abs_change_1month_after_pct = calculatePctChange(prices.price_at_event, prices.price_1month_after);
        metrics.abs_change_6month_after_pct = calculatePctChange(prices.price_at_event, prices.price_6month_after);
        metrics.abs_change_1year_after_pct = calculatePctChange(prices.price_at_event, prices.price_1year_after);

        // ===== COMPLETE SPY ALPHA CALCULATIONS =====
        const spyChange1min = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1min_after);
        const spyChange5min = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_5min_after);
        const spyChange10min = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_10min_after);
        const spyChange30min = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_30min_after);
        const spyChange1hour = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1hour_after);
        const spyChange4hour = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_4hour_after);
        const spyChange1day = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1day_after);
        const spyChange1week = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1week_after);
        const spyChange1month = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1month_after);
        const spyChange6month = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_6month_after);
        const spyChange1year = calculatePctChange(benchmarkData.spy_1min_before, benchmarkData.spy_1year_after);

        metrics.alpha_vs_spy_1min_after = (metrics.abs_change_1min_after_pct || 0) - (spyChange1min || 0);
        metrics.alpha_vs_spy_5min_after = (metrics.abs_change_5min_after_pct || 0) - (spyChange5min || 0);
        metrics.alpha_vs_spy_10min_after = (metrics.abs_change_10min_after_pct || 0) - (spyChange10min || 0);
        metrics.alpha_vs_spy_30min_after = (metrics.abs_change_30min_after_pct || 0) - (spyChange30min || 0);
        metrics.alpha_vs_spy_1hour_after = (metrics.abs_change_1hour_after_pct || 0) - (spyChange1hour || 0);
        metrics.alpha_vs_spy_4hour_after = (metrics.abs_change_4hour_after_pct || 0) - (spyChange4hour || 0);
        metrics.alpha_vs_spy_1day_after = (metrics.abs_change_1day_after_pct || 0) - (spyChange1day || 0);
        metrics.alpha_vs_spy_1week_after = (metrics.abs_change_1week_after_pct || 0) - (spyChange1week || 0);
        metrics.alpha_vs_spy_1month_after = (metrics.abs_change_1month_after_pct || 0) - (spyChange1month || 0);
        metrics.alpha_vs_spy_6month_after = (metrics.abs_change_6month_after_pct || 0) - (spyChange6month || 0);
        metrics.alpha_vs_spy_1year_after = (metrics.abs_change_1year_after_pct || 0) - (spyChange1year || 0);

        // ===== COMPLETE QQQ ALPHA CALCULATIONS =====
        const qqqChange1min = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_1min_after);
        const qqqChange5min = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_5min_after);
        const qqqChange10min = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_10min_after);
        const qqqChange30min = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_30min_after);
        const qqqChange1hour = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_1hour_after);
        const qqqChange4hour = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_4hour_after);
        const qqqChange1day = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_1day_after);
        const qqqChange1week = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_1week_after);
        const qqqChange1month = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_1month_after);
        const qqqChange6month = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_6month_after);
        const qqqChange1year = calculatePctChange(benchmarkData.qqq_1min_before, benchmarkData.qqq_1year_after);

        metrics.alpha_vs_qqq_1min_after = (metrics.abs_change_1min_after_pct || 0) - (qqqChange1min || 0);
        metrics.alpha_vs_qqq_5min_after = (metrics.abs_change_5min_after_pct || 0) - (qqqChange5min || 0);
        metrics.alpha_vs_qqq_10min_after = (metrics.abs_change_10min_after_pct || 0) - (qqqChange10min || 0);
        metrics.alpha_vs_qqq_30min_after = (metrics.abs_change_30min_after_pct || 0) - (qqqChange30min || 0);
        metrics.alpha_vs_qqq_1hour_after = (metrics.abs_change_1hour_after_pct || 0) - (qqqChange1hour || 0);
        metrics.alpha_vs_qqq_4hour_after = (metrics.abs_change_4hour_after_pct || 0) - (qqqChange4hour || 0);
        metrics.alpha_vs_qqq_1day_after = (metrics.abs_change_1day_after_pct || 0) - (qqqChange1day || 0);
        metrics.alpha_vs_qqq_1week_after = (metrics.abs_change_1week_after_pct || 0) - (qqqChange1week || 0);
        metrics.alpha_vs_qqq_1month_after = (metrics.abs_change_1month_after_pct || 0) - (qqqChange1month || 0);
        metrics.alpha_vs_qqq_6month_after = (metrics.abs_change_6month_after_pct || 0) - (qqqChange6month || 0);
        metrics.alpha_vs_qqq_1year_after = (metrics.abs_change_1year_after_pct || 0) - (qqqChange1year || 0);

        // ===== MISSING "BEFORE" ALPHA CALCULATIONS =====
        // Calculate SPY "before" changes (from various times before to 1min before event)
        const spyChange1minBefore = calculatePctChange(benchmarkData.spy_5min_before, benchmarkData.spy_1min_before);
        const spyChange5minBefore = calculatePctChange(benchmarkData.spy_10min_before, benchmarkData.spy_1min_before);
        const spyChange10minBefore = calculatePctChange(benchmarkData.spy_30min_before, benchmarkData.spy_1min_before);
        const spyChange30minBefore = calculatePctChange(benchmarkData.spy_1hour_before, benchmarkData.spy_1min_before);
        const spyChange1hourBefore = calculatePctChange(benchmarkData.spy_4hour_before, benchmarkData.spy_1min_before);
        const spyChange1dayBefore = calculatePctChange(benchmarkData.spy_1day_before, benchmarkData.spy_1min_before);
        const spyChange1weekBefore = calculatePctChange(benchmarkData.spy_1week_before, benchmarkData.spy_1min_before);
        const spyChange1monthBefore = calculatePctChange(benchmarkData.spy_1month_before, benchmarkData.spy_1min_before);
        const spyChange6monthBefore = calculatePctChange(benchmarkData.spy_6month_before, benchmarkData.spy_1min_before);
        const spyChange1yearBefore = calculatePctChange(benchmarkData.spy_1year_before, benchmarkData.spy_1min_before);

        metrics.alpha_vs_spy_1min_before = (metrics.abs_change_1min_before_pct || 0) - (spyChange1minBefore || 0);
        metrics.alpha_vs_spy_5min_before = (metrics.abs_change_5min_before_pct || 0) - (spyChange5minBefore || 0);
        metrics.alpha_vs_spy_10min_before = (metrics.abs_change_10min_before_pct || 0) - (spyChange10minBefore || 0);
        metrics.alpha_vs_spy_30min_before = (metrics.abs_change_30min_before_pct || 0) - (spyChange30minBefore || 0);
        metrics.alpha_vs_spy_1hour_before = (metrics.abs_change_1hour_before_pct || 0) - (spyChange1hourBefore || 0);
        metrics.alpha_vs_spy_1day_before = (metrics.abs_change_1day_before_pct || 0) - (spyChange1dayBefore || 0);
        metrics.alpha_vs_spy_1week_before = (metrics.abs_change_1week_before_pct || 0) - (spyChange1weekBefore || 0);
        metrics.alpha_vs_spy_1month_before = (metrics.abs_change_1month_before_pct || 0) - (spyChange1monthBefore || 0);
        metrics.alpha_vs_spy_6month_before = (metrics.abs_change_6month_before_pct || 0) - (spyChange6monthBefore || 0);
        metrics.alpha_vs_spy_1year_before = (metrics.abs_change_1year_before_pct || 0) - (spyChange1yearBefore || 0);

        // Calculate QQQ "before" changes 
        const qqqChange1minBefore = calculatePctChange(benchmarkData.qqq_5min_before, benchmarkData.qqq_1min_before);
        const qqqChange5minBefore = calculatePctChange(benchmarkData.qqq_10min_before, benchmarkData.qqq_1min_before);
        const qqqChange10minBefore = calculatePctChange(benchmarkData.qqq_30min_before, benchmarkData.qqq_1min_before);
        const qqqChange30minBefore = calculatePctChange(benchmarkData.qqq_1hour_before, benchmarkData.qqq_1min_before);
        const qqqChange1hourBefore = calculatePctChange(benchmarkData.qqq_4hour_before, benchmarkData.qqq_1min_before);
        const qqqChange1dayBefore = calculatePctChange(benchmarkData.qqq_1day_before, benchmarkData.qqq_1min_before);
        const qqqChange1weekBefore = calculatePctChange(benchmarkData.qqq_1week_before, benchmarkData.qqq_1min_before);
        const qqqChange1monthBefore = calculatePctChange(benchmarkData.qqq_1month_before, benchmarkData.qqq_1min_before);
        const qqqChange6monthBefore = calculatePctChange(benchmarkData.qqq_6month_before, benchmarkData.qqq_1min_before);
        const qqqChange1yearBefore = calculatePctChange(benchmarkData.qqq_1year_before, benchmarkData.qqq_1min_before);

        metrics.alpha_vs_qqq_1min_before = (metrics.abs_change_1min_before_pct || 0) - (qqqChange1minBefore || 0);
        metrics.alpha_vs_qqq_5min_before = (metrics.abs_change_5min_before_pct || 0) - (qqqChange5minBefore || 0);
        metrics.alpha_vs_qqq_10min_before = (metrics.abs_change_10min_before_pct || 0) - (qqqChange10minBefore || 0);
        metrics.alpha_vs_qqq_30min_before = (metrics.abs_change_30min_before_pct || 0) - (qqqChange30minBefore || 0);
        metrics.alpha_vs_qqq_1hour_before = (metrics.abs_change_1hour_before_pct || 0) - (qqqChange1hourBefore || 0);
        metrics.alpha_vs_qqq_1day_before = (metrics.abs_change_1day_before_pct || 0) - (qqqChange1dayBefore || 0);
        metrics.alpha_vs_qqq_1week_before = (metrics.abs_change_1week_before_pct || 0) - (qqqChange1weekBefore || 0);
        metrics.alpha_vs_qqq_1month_before = (metrics.abs_change_1month_before_pct || 0) - (qqqChange1monthBefore || 0);
        metrics.alpha_vs_qqq_6month_before = (metrics.abs_change_6month_before_pct || 0) - (qqqChange6monthBefore || 0);
        metrics.alpha_vs_qqq_1year_before = (metrics.abs_change_1year_before_pct || 0) - (qqqChange1yearBefore || 0);

        // ===== VOLUME AND VOLATILITY CALCULATIONS =====
        // NOTE: These require volume data which is currently not collected in priceData
        // TODO: Enhance data collection to include volume, then implement these calculations

        // For now, set to null with explanation
        metrics.volume_1hour_before_relative = null; // Needs volume data collection
        metrics.volume_1hour_after_relative = null;  // Needs volume data collection
        metrics.volume_burst_first_hour = null;      // Needs volume data collection
        metrics.volume_relative_20day = null;        // Needs 20-day volume baseline

        metrics.volatility_1hour_before = null;      // Needs minute-by-minute price collection
        metrics.volatility_1hour_after = null;       // Needs minute-by-minute price collection
        metrics.volatility_1day_before = null;       // Needs intraday price collection
        metrics.volatility_1day_after = null;        // Needs intraday price collection
        metrics.volatility_shock_ratio = null;       // Needs baseline volatility calculation

        metrics.attention_half_life_hours = null;    // Needs volume decay analysis

        return metrics;
    }

    /**
     * Calculate market context metrics
     */
    private async calculateMarketContext(eventTime: Date, benchmarkData: any): Promise<any> {
        const context: any = {};

        // Market hours check
        context.market_hours = this.isMarketHours(eventTime);

        // SPY momentum (30-day) - calculate percentage change
        if (benchmarkData && benchmarkData.spy_1min_before && benchmarkData.spy_1month_before) {
            context.spy_momentum_30day_pct = ((benchmarkData.spy_1min_before - benchmarkData.spy_1month_before) / benchmarkData.spy_1month_before) * 100;
        } else {
            context.spy_momentum_30day_pct = null;
        }

        // QQQ momentum (30-day) - calculate percentage change
        if (benchmarkData && benchmarkData.qqq_1min_before && benchmarkData.qqq_1month_before) {
            context.qqq_momentum_30day_pct = ((benchmarkData.qqq_1min_before - benchmarkData.qqq_1month_before) / benchmarkData.qqq_1month_before) * 100;
        } else {
            context.qqq_momentum_30day_pct = null;
        }

        // Market regime determination
        if (context.spy_momentum_30day_pct !== null) {
            if (context.spy_momentum_30day_pct > 5) {
                context.market_regime = 'bull';
            } else if (context.spy_momentum_30day_pct < -5) {
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
     * Update processing status in causal_events_flat table
     */
    private async updateCausalEventProcessingStatus(causalEventId: string, status: 'completed' | 'failed'): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('causal_events_flat')
                .update({
                    processing_status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', causalEventId);

            if (error) {
                logger.error('❌ Error updating causal event processing status', { causalEventId, status, error });
            } else {
                logger.info('✅ Updated causal event processing status', { causalEventId, status });
            }

        } catch (error) {
            logger.error('❌ Error updating causal event processing status', { causalEventId, error });
        }
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
     * Get causal event from database
     */
    private async getCausalEvent(causalEventId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('causal_events_flat')
            .select('*')
            .eq('id', causalEventId)
            .single();

        if (error) {
            throw new Error(`Failed to fetch causal event: ${error.message}`);
        }

        return data;
    }

    /**
     * Get article from database
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
     * Check if causal event already processed
     */
    private async checkExistingRecord(causalEventId: string): Promise<any> {
        const { data, error } = await this.supabase
            .from('ml_training_data')
            .select('id, data_quality_score')
            .eq('business_factor_id', causalEventId)
            .eq('processing_status', 'completed')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            logger.error('Error checking existing record', { causalEventId, error });
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
    private async markProcessingFailed(causalEventId: string, errorMessage: string): Promise<void> {
        try {
            await this.supabase
                .from('ml_training_data')
                .upsert({
                    business_factor_id: causalEventId,
                    processing_status: 'failed',
                    data_quality_score: 0
                }, { onConflict: 'business_factor_id' });
        } catch (error) {
            logger.error('Failed to mark processing as failed', { causalEventId, error });
        }
    }

    /**
     * Batch process multiple causal events
     */
    async batchProcess(options: ProcessingOptions): Promise<ProcessingResult[]> {
        logger.info('🚀 Starting batch processing', options);

        // Get causal events to process
        let query = this.supabase
            .from('causal_events_flat')
            .select('id, article_id, event_type, event_description, article_published_at');

        // Handle force processing logic
        const forceProcess = options.forceProcess || options.force; // Support legacy flag
        if (!forceProcess) {
            // Only process unprocessed items (check processing_status in source table)
            query = query.eq('processing_status', 'pending');
        }

        // Add date range filtering
        if (options.startDate) {
            query = query.gte('article_published_at', `${options.startDate}T00:00:00Z`);
        }
        if (options.endDate) {
            query = query.lte('article_published_at', `${options.endDate}T23:59:59Z`);
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data: causalEvents, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch causal events: ${error.message}`);
        }

        if (!causalEvents || causalEvents.length === 0) {
            logger.info('ℹ️ No causal events to process');
            return [];
        }

        logger.info(`📋 Found ${causalEvents.length} causal events to process`);

        const results: ProcessingResult[] = [];

        // Process in batches of 5 to avoid overwhelming database
        const batchSize = 5;
        for (let i = 0; i < causalEvents.length; i += batchSize) {
            const batch = causalEvents.slice(i, i + batchSize);

            logger.info(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(causalEvents.length / batchSize)}`);

            const batchResults = await Promise.all(
                batch.map(ce => this.processCausalEvent(ce.id, {
                    force: options.force, // Legacy support
                    forceOverwrite: options.forceOverwrite,
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

        // Create a mock article
        const testArticleId = 'test-article-' + Date.now();

        await this.supabase
            .from('articles')
            .insert({
                id: testArticleId,
                title: 'Test AI Partnership Announcement',
                url: 'https://example.com/test',
                published_at: new Date('2024-07-01T14:30:00Z'), // During market hours, within our data range
                source: 'Test Source',
                tickers: ['AAPL'], // Array of relevant tickers
                apple_relevance_score: 0.9 // Keep for backward compatibility
            });

        // Create a mock causal event
        const testCausalEventId = 'test-ce-' + Date.now();

        await this.supabase
            .from('causal_events_flat')
            .insert({
                id: testCausalEventId,
                article_id: testArticleId,
                business_event_index: 0,
                causal_step_index: 0,
                article_published_at: new Date('2024-07-01T14:30:00Z'),
                event_type: 'Product_Announcement',
                event_description: 'AI partnership announcement',
                factor_name: 'AI Integration Capability',
                factor_category: 'product',
                factor_magnitude: 0.75,
                factor_movement: 1,
                ai_assessment_execution_risk: 0.3,
                ai_assessment_competitive_risk: 0.2,
                market_perception_intensity: 0.8,
                market_perception_hope_vs_fear: 0.7,
                processing_status: 'pending'
            });

        logger.info('✅ Test data created', { testCausalEventId, testArticleId });
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
            description: '[DEPRECATED] Use --force-process and --force-overwrite instead'
        })
        .option('force-process', {
            type: 'boolean',
            default: false,
            description: 'Process records even if processing_status != pending'
        })
        .option('force-overwrite', {
            type: 'boolean',
            default: false,
            description: 'Overwrite existing records in ml_training_data'
        })
        .option('limit', {
            type: 'number',
            description: 'Limit number of records to process'
        })
        .option('id', {
            type: 'string',
            description: 'Causal event ID for single mode'
        })
        .option('ticker', {
            type: 'string',
            description: 'Stock ticker to process (auto-detected if not provided)'
        })
        .option('start-date', {
            type: 'string',
            description: 'Start date for processing (YYYY-MM-DD format)'
        })
        .option('end-date', {
            type: 'string',
            description: 'End date for processing (YYYY-MM-DD format)'
        })
        .help()
        .argv;

    const processor = new MLDataProcessor();
    const options: ProcessingOptions = {
        ...argv,
        forceProcess: argv['force-process'] || argv.force, // Support both new and legacy flags
        forceOverwrite: argv['force-overwrite'] || argv.force // Support both new and legacy flags
    } as ProcessingOptions;

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
                if (!options.id) {
                    throw new Error('Causal event ID required for single mode (use --id)');
                }
                const result = await processor.processCausalEvent(options.id, options);
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

export default MLDataProcessor;
