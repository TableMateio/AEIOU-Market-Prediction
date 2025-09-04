/**
 * ML Data Processor - Fixed Version
 * Processes causal events into ML training data with proper weekend/holiday handling,
 * date range filtering, and graceful degradation for missing data
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';
import * as yargs from 'yargs';

const logger = createLogger('MLDataProcessor');

interface ProcessingOptions {
    mode: 'test' | 'single' | 'batch' | 'assign-splits' | 'create-test-data';
    force?: boolean;           // Overwrite existing data
    limit?: number;           // Limit number to process
    id?: string;              // Causal event ID for single mode
    ticker?: string;          // Override ticker (auto-detected if not provided)
    startDate?: string;       // YYYY-MM-DD format - filter events from this date
    endDate?: string;         // YYYY-MM-DD format - filter events to this date
}

interface PricePoint {
    price: number;
    timestamp: Date;
    confidence: number;       // How close to target time (0-1)
    volume: number;
    fallbackDays?: number;    // How many days we had to fallback
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
        // Before event (negative minutes)
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

        // After event (positive minutes)
        '1min_after': 1,
        '5min_after': 5,
        '10min_after': 10,
        '30min_after': 30,
        '1hour_after': 60,
        '4hour_after': 240,
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
     * Calculate smart tolerance based on time window size
     */
    private calculateSmartTolerance(offsetMinutes: number): number {
        const absOffset = Math.abs(offsetMinutes);

        if (absOffset <= 10) {           // 1-10 minutes
            return 5;                    // 5-minute tolerance
        } else if (absOffset <= 60) {    // 1 hour
            return 15;                   // 15-minute tolerance  
        } else if (absOffset <= 240) {   // 4 hours
            return 60;                   // 1-hour tolerance
        } else if (absOffset <= 1440) {  // 1 day
            return 240;                  // 4-hour tolerance
        } else if (absOffset <= 10080) { // 1 week
            return 1440;                 // 1-day tolerance
        } else if (absOffset <= 43200) { // 1 month
            return 4320;                 // 3-day tolerance
        } else {                         // 6 months, 1 year
            return 10080;                // 1-week tolerance
        }
    }

    /**
     * Progressive fallback finder for weekends/holidays
     * Tries: target day → next business day → day after → up to 5 business days
     */
    private async findClosestPriceWithFallback(
        ticker: string,
        targetTime: Date,
        maxToleranceMinutes?: number
    ): Promise<PricePoint | null> {

        // Use smart tolerance if not provided
        if (!maxToleranceMinutes) {
            maxToleranceMinutes = 60; // Default fallback
        }

        // Try progressive fallback: today → next business day → day after
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
                logger.warn(`📅 No data for ${ticker} on ${fallbackDate.toISOString().split('T')[0]} (day offset: ${dayOffset})`);
                continue;
            }

            // Find closest price in this day's data
            const result = this.findClosestPriceInData(dayData, targetTime, maxToleranceMinutes * (dayOffset + 1));
            if (result) {
                result.fallbackDays = dayOffset;
                logger.info(`✅ Found price data with ${dayOffset}-day fallback`, {
                    ticker,
                    targetTime: targetTime.toISOString(),
                    foundTime: result.timestamp.toISOString(),
                    dayOffset,
                    confidence: result.confidence
                });
                return result;
            }
        }

        logger.warn(`❌ No price data found within 5-business-day fallback window`, {
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
            price: parseFloat(closest.close),
            timestamp: new Date(closest.timestamp),
            confidence,
            volume: parseInt(closest.volume || 0)
        };
    }

    /**
     * Calculate all price points for a given ticker and event time
     * Uses progressive fallback for missing data
     */
    private async calculateAllPricePoints(ticker: string, eventTime: Date): Promise<{
        rawPrices: any;
        dataQualityScore: number;
        missingDataPoints: string[];
    }> {
        const missingDataPoints: string[] = [];
        const rawPrices: any = {};

        logger.info('📊 Starting price calculations', {
            ticker,
            eventTime: eventTime.toISOString(),
            totalWindows: Object.keys(this.TIME_WINDOWS).length + 3
        });

        let successfulCalculations = 0;
        const totalCalculations = Object.keys(this.TIME_WINDOWS).length + 3; // +3 for daily anchors

        // Calculate each time window with smart fallback
        for (const [windowName, offsetMinutes] of Object.entries(this.TIME_WINDOWS)) {
            try {
                const targetTime = new Date(eventTime.getTime() + (offsetMinutes as number) * 60 * 1000);

                // Determine tolerance based on window size
                let tolerance = 60; // 1 hour default
                const absOffset = Math.abs(offsetMinutes as number);

                if (absOffset >= 525600) {        // 1 year+
                    tolerance = 10080; // 1 week tolerance
                } else if (absOffset >= 43200) { // 1 month+
                    tolerance = 4320;  // 3 days tolerance
                } else if (absOffset >= 1440) {  // 1 day+
                    tolerance = 1440;  // 1 day tolerance
                }

                const pricePoint = await this.findClosestPriceWithFallback(ticker, targetTime, tolerance);

                if (pricePoint) {
                    rawPrices[`price_${windowName}`] = pricePoint.price;
                    rawPrices[`confidence_${windowName}`] = pricePoint.confidence;
                    if (pricePoint.fallbackDays && pricePoint.fallbackDays > 0) {
                        rawPrices[`fallback_days_${windowName}`] = pricePoint.fallbackDays;
                    }
                    successfulCalculations++;

                    logger.debug(`✅ ${windowName}: $${pricePoint.price} (confidence: ${pricePoint.confidence.toFixed(3)})`);
                } else {
                    // Graceful degradation: mark as null but continue
                    rawPrices[`price_${windowName}`] = null;
                    rawPrices[`confidence_${windowName}`] = 0;
                    missingDataPoints.push(windowName);

                    logger.warn(`⚠️ Missing data for ${windowName} - marked as null`, {
                        ticker,
                        targetTime: targetTime.toISOString(),
                        windowType: absOffset >= 43200 ? 'long_term' : 'short_term'
                    });
                }

            } catch (error) {
                logger.error(`❌ Error calculating ${windowName}`, { ticker, error });
                missingDataPoints.push(windowName);
                rawPrices[`price_${windowName}`] = null;
                rawPrices[`confidence_${windowName}`] = 0;
            }
        }

        // Special calculations for daily anchors
        try {
            // Daily open (market open on event day)
            const dailyOpenTime = new Date(eventTime);
            dailyOpenTime.setUTCHours(14, 30, 0, 0); // 9:30 AM ET = 14:30 UTC
            const dailyOpen = await this.findClosestPriceWithFallback(ticker, dailyOpenTime, 1440);

            if (dailyOpen) {
                rawPrices.price_daily_open = dailyOpen.price;
                rawPrices.confidence_daily_open = dailyOpen.confidence;
                successfulCalculations++;
            }

            // Daily close (market close on event day)
            const dailyCloseTime = new Date(eventTime);
            dailyCloseTime.setUTCHours(21, 0, 0, 0); // 4:00 PM ET = 21:00 UTC
            const dailyClose = await this.findClosestPriceWithFallback(ticker, dailyCloseTime, 1440);

            if (dailyClose) {
                rawPrices.price_daily_close = dailyClose.price;
                rawPrices.confidence_daily_close = dailyClose.confidence;
                successfulCalculations++;
            }

            // Event timestamp price (exact event time)
            const eventPrice = await this.findClosestPriceWithFallback(ticker, eventTime, 60);
            if (eventPrice) {
                rawPrices.price_at_event = eventPrice.price;
                rawPrices.confidence_at_event = eventPrice.confidence;
                successfulCalculations++;
            }

        } catch (error) {
            logger.error('❌ Error calculating daily anchors', { ticker, error });
        }

        // Calculate data quality score
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
     * Calculate benchmark data (SPY, QQQ) for the same time windows
     */
    private async calculateBenchmarkData(eventTime: Date): Promise<{
        spyPrices: any;
        qqqPrices: any;
    }> {
        logger.info('📊 Calculating benchmark data');

        // Get SPY and QQQ data in parallel
        const [spyResult, qqqResult] = await Promise.all([
            this.calculateAllPricePoints('SPY', eventTime),
            this.calculateAllPricePoints('QQQ', eventTime)
        ]);

        return {
            spyPrices: spyResult.rawPrices,
            qqqPrices: qqqResult.rawPrices
        };
    }

    /**
     * Calculate percentage changes and alpha metrics
     */
    private calculateDerivedMetrics(stockPrices: any, benchmarkData: any): any {
        const derived: any = {};
        const eventPrice = stockPrices.price_at_event;

        if (!eventPrice) {
            logger.warn('⚠️ No event price available - cannot calculate derived metrics');
            return derived;
        }

        // Calculate absolute percentage changes
        for (const [windowName] of Object.entries(this.TIME_WINDOWS)) {
            const priceKey = `price_${windowName}`;
            const price = stockPrices[priceKey];

            if (price && eventPrice) {
                // Absolute change
                const pctChange = ((price - eventPrice) / eventPrice) * 100;
                derived[`abs_change_${windowName}_pct`] = pctChange;

                // Alpha calculations vs SPY
                const spyPrice = benchmarkData.spyPrices[priceKey];
                const spyEventPrice = benchmarkData.spyPrices.price_at_event;
                if (spyPrice && spyEventPrice) {
                    const spyPctChange = ((spyPrice - spyEventPrice) / spyEventPrice) * 100;
                    derived[`alpha_vs_spy_${windowName}`] = pctChange - spyPctChange;
                }

                // Alpha calculations vs QQQ
                const qqqPrice = benchmarkData.qqqPrices[priceKey];
                const qqqEventPrice = benchmarkData.qqqPrices.price_at_event;
                if (qqqPrice && qqqEventPrice) {
                    const qqqPctChange = ((qqqPrice - qqqEventPrice) / qqqEventPrice) * 100;
                    derived[`alpha_vs_qqq_${windowName}`] = pctChange - qqqPctChange;
                }
            }
        }

        return derived;
    }

    /**
     * Calculate market context (hours, regime, momentum)
     */
    private async calculateMarketContext(eventTime: Date, spyPrices: any): Promise<any> {
        const context: any = {};

        // Market hours detection
        const hour = eventTime.getUTCHours();
        const dayOfWeek = eventTime.getUTCDay();
        context.market_hours = (hour >= 14 && hour < 21 && dayOfWeek >= 1 && dayOfWeek <= 5);

        // SPY momentum (30-day)
        const spy30DayBefore = spyPrices.price_1month_before;
        const spyEventPrice = spyPrices.price_at_event;
        if (spy30DayBefore && spyEventPrice) {
            const spyMomentum = ((spyEventPrice - spy30DayBefore) / spy30DayBefore) * 100;
            context.spy_momentum_30day_pct = spyMomentum;

            // Market regime classification
            if (spyMomentum > 5) {
                context.market_regime = 'bull';
            } else if (spyMomentum < -5) {
                context.market_regime = 'bear';
            } else {
                context.market_regime = 'sideways';
            }
        }

        return context;
    }

    /**
     * Auto-detect ticker from article content
     */
    private async detectTickerFromArticle(articleId: string): Promise<string> {
        const { data: article, error } = await this.supabase
            .from('articles')
            .select('tickers, title, body')
            .eq('id', articleId)
            .single();

        if (error || !article) {
            logger.warn('⚠️ Could not fetch article for ticker detection, defaulting to AAPL');
            return 'AAPL';
        }

        // Check tickers array first
        if (article.tickers && Array.isArray(article.tickers) && article.tickers.length > 0) {
            const ticker = article.tickers[0].toUpperCase();
            logger.info('🎯 Ticker detected from tickers array', { articleId, ticker });
            return ticker;
        }

        // Fallback: search content for common patterns
        const content = `${article.title} ${article.body || ''}`.toLowerCase();
        const patterns = {
            'AAPL': /apple|aapl/i,
            'MSFT': /microsoft|msft/i,
            'GOOGL': /google|alphabet|googl|goog/i,
            'AMZN': /amazon|amzn/i,
            'TSLA': /tesla|tsla/i
        };

        for (const [ticker, pattern] of Object.entries(patterns)) {
            if (pattern.test(content)) {
                logger.info('🎯 Ticker detected from content', { articleId, ticker, pattern: pattern.source });
                return ticker;
            }
        }

        logger.warn('⚠️ Could not detect ticker, defaulting to AAPL');
        return 'AAPL';
    }

    /**
     * Main processing function for a single causal event
     */
    async processCausalEvent(causalEventId: string, options: { force?: boolean; ticker?: string } = {}): Promise<ProcessingResult> {
        const startTime = Date.now();

        try {
            // Fetch causal event data
            const { data: causalEvent, error: causalError } = await this.supabase
                .from('causal_events_flat')
                .select('*')
                .eq('id', causalEventId)
                .single();

            if (causalError || !causalEvent) {
                throw new Error(`Failed to fetch causal event: ${causalError?.message || 'Not found'}`);
            }

            // Auto-detect ticker if not provided
            const ticker = options.ticker || await this.detectTickerFromArticle(causalEvent.article_id);

            logger.info('🔄 Processing causal event', {
                causalEventId,
                ticker,
                eventType: causalEvent.event_type,
                eventTime: causalEvent.article_published_at
            });

            // Get event timestamp
            const eventTimestamp = new Date(causalEvent.article_published_at);

            // Calculate all price points
            const stockPriceData = await this.calculateAllPricePoints(ticker, eventTimestamp);

            // Calculate benchmark data
            const benchmarkData = await this.calculateBenchmarkData(eventTimestamp);

            // Calculate derived metrics (percentage changes, alpha)
            const derivedMetrics = this.calculateDerivedMetrics(stockPriceData.rawPrices, benchmarkData);

            // Calculate market context
            const marketContext = await this.calculateMarketContext(eventTimestamp, benchmarkData.spyPrices);

            // Prepare ML record with all causal event fields + calculated metrics
            const mlRecord = {
                // Copy ALL fields from causal_events_flat (exact field names)
                id: causalEvent.id,
                business_event_index: causalEvent.business_event_index,
                causal_step_index: causalEvent.causal_step_index,
                article_id: causalEvent.article_id,
                article_published_at: causalEvent.article_published_at,
                article_title: causalEvent.article_title,
                article_source: causalEvent.article_source,
                article_url: causalEvent.article_url,
                article_source_credibility: causalEvent.article_source_credibility,
                article_apple_relevance_score: causalEvent.article_apple_relevance_score,
                article_sentiment_score: causalEvent.article_sentiment_score,
                article_audience: causalEvent.article_audience,
                article_geographic_focus: causalEvent.article_geographic_focus,
                article_temporal_focus: causalEvent.article_temporal_focus,
                article_year: causalEvent.article_year,
                article_month: causalEvent.article_month,
                article_day_of_week: causalEvent.article_day_of_week,
                event_type: causalEvent.event_type,
                event_trigger: causalEvent.event_trigger,
                event_context: causalEvent.event_context,
                event_scope: causalEvent.event_scope,
                event_temporal_perspective: causalEvent.event_temporal_perspective,
                event_time_horizon_days: causalEvent.event_time_horizon_days,
                event_keywords: causalEvent.event_keywords,
                event_entities: causalEvent.event_entities,
                event_description: causalEvent.event_description,
                factor_magnitude: causalEvent.factor_magnitude,
                factor_name: causalEvent.factor_name,
                factor_synonyms: causalEvent.factor_synonyms,
                factor_category: causalEvent.factor_category,
                factor_unit: causalEvent.factor_unit,
                factor_expected_value: causalEvent.factor_expected_value,
                factor_confidence: causalEvent.factor_confidence,
                factor_reasoning: causalEvent.factor_reasoning,
                evidence_level: causalEvent.evidence_level,
                evidence_strength: causalEvent.evidence_strength,
                causal_mechanism: causalEvent.causal_mechanism,
                causal_confidence: causalEvent.causal_confidence,
                causal_time_horizon_days: causalEvent.causal_time_horizon_days,
                market_consensus_on_causality: causalEvent.market_consensus_on_causality,
                ai_assessment_execution_risk: causalEvent.ai_assessment_execution_risk,
                ai_assessment_evidence_quality: causalEvent.ai_assessment_evidence_quality,
                reframing_potential: causalEvent.reframing_potential,
                narrative_disruption: causalEvent.narrative_disruption,
                market_perception_emotional_profile: causalEvent.market_perception_emotional_profile,
                market_perception_cognitive_biases: causalEvent.market_perception_cognitive_biases,
                intensity: causalEvent.intensity,
                certainty_truth: causalEvent.certainty_truth,
                certainty_impact: causalEvent.certainty_impact,
                hope_vs_fear: causalEvent.hope_vs_fear,
                surprise_vs_anticipated: causalEvent.surprise_vs_anticipated,
                consensus_vs_division: causalEvent.consensus_vs_division,
                positive_vs_negative_sentiment: causalEvent.positive_vs_negative_sentiment,
                created_at: causalEvent.created_at,
                updated_at: causalEvent.updated_at,

                // Add calculated stock metrics
                ticker,
                event_timestamp: eventTimestamp,

                // Raw prices (all time windows)
                ...stockPriceData.rawPrices,

                // Derived metrics (percentage changes, alpha)
                ...derivedMetrics,

                // Market context
                ...marketContext,

                // Data quality metrics
                data_quality_score: stockPriceData.dataQualityScore,
                missing_data_points: stockPriceData.missingDataPoints,
                processing_timestamp: new Date(),

                // ML metadata
                ml_split: null, // To be assigned later
                processing_status: 'completed'
            };

            // Insert into ml_training_data
            const { error: insertError } = await this.supabase
                .from('ml_training_data')
                .upsert(mlRecord, {
                    onConflict: 'id',
                    ignoreDuplicates: false
                });

            if (insertError) {
                throw new Error(`Failed to insert ML record: ${insertError.message}`);
            }

            // Update processing status in causal_events_flat
            await this.updateCausalEventProcessingStatus(causalEventId, 'completed');

            logger.info('✅ Successfully processed causal event', {
                causalEventId,
                ticker,
                dataQualityScore: stockPriceData.dataQualityScore,
                missingDataPoints: stockPriceData.missingDataPoints.length
            });

            return {
                causalEventId,
                success: true,
                dataQualityScore: stockPriceData.dataQualityScore,
                missingDataPoints: stockPriceData.missingDataPoints,
                processingTimeMs: Date.now() - startTime
            };

        } catch (error) {
            logger.error('❌ Error processing causal event', { causalEventId, error });

            // Update processing status to skipped (failed not allowed)
            await this.updateCausalEventProcessingStatus(causalEventId, 'skipped');

            return {
                causalEventId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                dataQualityScore: 0,
                missingDataPoints: [],
                processingTimeMs: Date.now() - startTime
            };
        }
    }

    /**
     * Update processing status in causal_events_flat
     */
    private async updateCausalEventProcessingStatus(
        causalEventId: string,
        status: 'pending' | 'completed' | 'skipped' | 'submitted'
    ): Promise<void> {
        try {
            const { error } = await this.supabase
                .from('causal_events_flat')
                .update({
                    processing_status: status,
                    updated_at: new Date()
                })
                .eq('id', causalEventId);

            if (error) {
                logger.error('❌ Error updating causal event processing status', {
                    causalEventId,
                    status,
                    error
                });
            } else {
                logger.debug('✅ Updated processing status', { causalEventId, status });
            }
        } catch (error) {
            logger.error('❌ Error updating causal event processing status', {
                causalEventId,
                status,
                error
            });
        }
    }

    /**
     * Batch process multiple causal events with date filtering
     */
    async batchProcess(options: ProcessingOptions): Promise<ProcessingResult[]> {
        logger.info('🚀 Starting batch processing', options);

        // Build query with date filtering
        let query = this.supabase
            .from('causal_events_flat')
            .select('id, article_id, event_type, event_description, article_published_at');

        if (!options.force) {
            query = query.eq('processing_status', 'pending');
        }

        // Add date range filtering
        if (options.startDate) {
            query = query.gte('article_published_at', `${options.startDate}T00:00:00Z`);
            logger.info(`📅 Filtering from: ${options.startDate}`);
        }
        if (options.endDate) {
            query = query.lte('article_published_at', `${options.endDate}T23:59:59Z`);
            logger.info(`📅 Filtering to: ${options.endDate}`);
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

        logger.info(`📊 Processing ${causalEvents.length} causal events`);

        const results: ProcessingResult[] = [];
        for (let i = 0; i < causalEvents.length; i++) {
            const event = causalEvents[i];
            logger.info(`🔄 Processing ${i + 1}/${causalEvents.length}: ${event.id}`);

            const result = await this.processCausalEvent(event.id, options);
            results.push(result);

            // Brief pause to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return results;
    }

    /**
     * Assign train/test splits chronologically
     */
    async assignTrainTestSplits(): Promise<void> {
        logger.info('🎯 Assigning train/test splits');

        // Get all completed records ordered by date
        const { data: records, error } = await this.supabase
            .from('ml_training_data')
            .select('id, event_timestamp')
            .not('data_quality_score', 'is', null)
            .order('event_timestamp', { ascending: true });

        if (error || !records) {
            throw new Error(`Failed to fetch ML records: ${error?.message}`);
        }

        // 80/20 chronological split
        const splitIndex = Math.floor(records.length * 0.8);

        const updates: Promise<any>[] = [];

        // Training set (first 80%)
        for (let i = 0; i < splitIndex; i++) {
            updates.push(
                this.supabase
                    .from('ml_training_data')
                    .update({ ml_split: 'training' })
                    .eq('id', records[i].id)
            );
        }

        // Test set (last 20%)
        for (let i = splitIndex; i < records.length; i++) {
            updates.push(
                this.supabase
                    .from('ml_training_data')
                    .update({ ml_split: 'testing' })
                    .eq('id', records[i].id)
            );
        }

        await Promise.all(updates);

        logger.info('✅ Train/test splits assigned', {
            total: records.length,
            training: splitIndex,
            testing: records.length - splitIndex,
            splitRatio: '80/20'
        });
    }

    /**
     * Create test data for development
     */
    async createTestData(): Promise<void> {
        logger.info('🧪 Creating test data');

        const testArticleId = `test-article-${Date.now()}`;
        const testCausalEventId = `test-ce-${Date.now()}`;

        // Use a date within our stock data range
        const testDate = new Date('2024-07-01T14:30:00Z'); // Monday during market hours

        // Create test article
        await this.supabase
            .from('articles')
            .insert({
                id: testArticleId,
                title: 'Test AI Partnership Announcement',
                url: 'https://example.com/test',
                published_at: testDate,
                source: 'Test Source',
                tickers: ['AAPL'],
                apple_relevance_score: 0.9
            });

        // Create test causal event
        await this.supabase
            .from('causal_events_flat')
            .insert({
                id: testCausalEventId,
                article_id: testArticleId,
                business_event_index: 0,
                causal_step_index: 0,
                article_published_at: testDate,
                event_type: 'Product_Announcement',
                event_description: 'AI partnership announcement',
                factor_name: 'AI Integration Capability',
                factor_category: 'product',
                factor_magnitude: 0.75,
                processing_status: 'pending'
            });

        logger.info('✅ Test data created', {
            testCausalEventId,
            testArticleId,
            testDate: testDate.toISOString()
        });
    }
}

// CLI Interface
async function main() {
    const argv = yargs
        .option('mode', {
            choices: ['test', 'single', 'batch', 'assign-splits', 'create-test-data'] as const,
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
        logger.error('Script failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

export default MLDataProcessor;
