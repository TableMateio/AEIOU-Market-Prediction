/**
 * Actual Data Feature Engineer
 * 
 * Works with the REAL ml_training_data structure
 * Separates INPUT FEATURES from TARGET VARIABLES correctly
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { AppConfig } from '../config/app.js';

const logger = createLogger('ActualDataFeatureEngineer');

export interface MLTrainingRecord {
    // Identifiers
    id: string;
    article_id: string;
    ticker: string;
    event_timestamp: Date;

    // INPUT FEATURES (from causal_events_flat - what we predict FROM)
    inputFeatures: {
        // Business factors
        factor_name: string;
        factor_category: string;
        factor_magnitude: number;
        factor_movement: number; // 1, -1, 0

        // Causal confidence
        causal_certainty: number;
        logical_directness: number;
        regime_alignment: number;

        // Event context
        event_type: string;
        event_orientation: string; // predictive, reflective, both, neutral
        event_scope: string;
        event_trigger: string;
        event_time_horizon_days: number;

        // Article context
        article_source: string;
        article_source_credibility: number;
        article_author_credibility: number;
        article_publisher_credibility: number;
        article_audience_split: string;
        article_time_lag_days: number;
        article_market_regime: string;
        article_apple_relevance_score: number;

        // Timing features
        article_published_year: number;
        article_published_month: number;
        article_published_day_of_week: number;

        // Market perception (from causal analysis)
        market_perception_intensity: number;
        market_perception_hope_vs_fear: number;
        market_perception_surprise_vs_anticipated: number;
        market_perception_consensus_vs_division: number;
        market_perception_narrative_strength: number;

        // AI assessments
        ai_assessment_execution_risk: number;
        ai_assessment_competitive_risk: number;
        ai_assessment_business_impact_likelihood: number;
        ai_assessment_timeline_realism: number;
        ai_assessment_fundamental_strength: number;

        // Perception gaps
        perception_gap_optimism_bias: number;
        perception_gap_risk_awareness: number;
        perception_gap_correction_potential: number;

        // Evidence and timing
        evidence_level: string;
        evidence_source: string;
        factor_about_time_days: number;
        factor_effect_horizon_days: number;

        // Market context
        market_regime: string;
        market_hours: boolean;
        spy_momentum_30day_pct: number;
        qqq_momentum_30day_pct: number;
    };

    // TARGET VARIABLES (calculated stock metrics - what we predict TO)
    targetVariables: {
        // Alpha vs benchmarks (PRIMARY TARGETS)
        alpha_vs_spy_1min_after: number;
        alpha_vs_spy_5min_after: number;
        alpha_vs_spy_10min_after: number;
        alpha_vs_spy_30min_after: number;
        alpha_vs_spy_1hour_after: number;
        alpha_vs_spy_1day_after: number;
        alpha_vs_spy_1week_after: number;
        alpha_vs_spy_1month_after: number;

        alpha_vs_qqq_1day_after: number;
        alpha_vs_qqq_1week_after: number;

        // Volume and volatility metrics
        volume_relative_20day: number;
        volume_burst_first_hour: number;
        volatility_shock_ratio: number;
        volatility_1hour_after: number;
        volatility_1day_after: number;

        // Price discovery metrics
        price_discovery_speed_minutes: number;
        max_move_within_1hour_pct: number;
        reversal_strength_pct: number;
        attention_half_life_hours: number;
    };

    // Data quality metrics
    dataQuality: {
        data_quality_score: number;
        confidence_1day_after: number;
        missing_data_points: string[];
        processing_time_ms: number;
    };
}

export class ActualDataFeatureEngineer {
    private supabase;

    constructor() {
        const config = AppConfig.getInstance();
        const supabaseUrl = config.supabaseConfig.projectUrl;
        const supabaseKey = config.supabaseConfig.apiKey;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error(`Missing Supabase configuration: url=${!!supabaseUrl}, key=${!!supabaseKey}`);
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Load ML training records from the actual ml_training_data table
     */
    async loadTrainingData(filters?: {
        minDataQuality?: number;
        completedOnly?: boolean;
        orientation?: string;
        limit?: number;
    }): Promise<MLTrainingRecord[]> {

        const {
            minDataQuality = 0.3,
            completedOnly = true,
            orientation,
            limit = 1000
        } = filters || {};

        logger.info('📊 Loading ML training data', {
            minDataQuality,
            completedOnly,
            orientation,
            limit
        });

        let query = this.supabase
            .from('ml_training_data')
            .select('*')
            .not('alpha_vs_spy_1day_after', 'is', null) // Must have primary target
            .order('created_at', { ascending: false });

        if (completedOnly) {
            query = query.eq('processing_status', 'completed');
        }

        if (orientation) {
            query = query.eq('event_orientation', orientation);
        }

        if (minDataQuality > 0) {
            query = query.gte('data_quality_score', minDataQuality);
        }

        if (limit) {
            query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to load training data: ${error.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error('No training data found matching filters');
        }

        logger.info(`✅ Loaded ${data.length} training records`);

        // Transform to structured format
        return data.map(record => this.transformRecord(record));
    }

    /**
     * Transform raw database record to structured format
     */
    private transformRecord(record: any): MLTrainingRecord {
        return {
            id: record.id,
            article_id: record.article_id,
            ticker: record.ticker || 'AAPL',
            event_timestamp: new Date(record.event_timestamp),

            inputFeatures: {
                // Business factors
                factor_name: record.factor_name || 'unknown',
                factor_category: record.factor_category || 'unknown',
                factor_magnitude: record.factor_magnitude || 0,
                factor_movement: record.factor_movement || 0,

                // Causal confidence
                causal_certainty: record.causal_certainty || 0.5,
                logical_directness: record.logical_directness || 0.5,
                regime_alignment: record.regime_alignment || 0.5,

                // Event context
                event_type: record.event_type || 'unknown',
                event_orientation: record.event_orientation || 'neutral',
                event_scope: record.event_scope || 'unknown',
                event_trigger: record.event_trigger || 'unknown',
                event_time_horizon_days: record.event_time_horizon_days || 0,

                // Article context
                article_source: record.article_source || 'unknown',
                article_source_credibility: record.article_source_credibility || 0.5,
                article_author_credibility: record.article_author_credibility || 0.5,
                article_publisher_credibility: record.article_publisher_credibility || 0.5,
                article_audience_split: record.article_audience_split || 'unknown',
                article_time_lag_days: record.article_time_lag_days || 0,
                article_market_regime: record.article_market_regime || 'neutral',
                article_apple_relevance_score: record.article_apple_relevance_score || 0.5,

                // Timing features
                article_published_year: record.article_published_year || new Date().getFullYear(),
                article_published_month: record.article_published_month || 1,
                article_published_day_of_week: record.article_published_day_of_week || 0,

                // Market perception
                market_perception_intensity: record.market_perception_intensity || 0.5,
                market_perception_hope_vs_fear: record.market_perception_hope_vs_fear || 0,
                market_perception_surprise_vs_anticipated: record.market_perception_surprise_vs_anticipated || 0,
                market_perception_consensus_vs_division: record.market_perception_consensus_vs_division || 0,
                market_perception_narrative_strength: record.market_perception_narrative_strength || 0.5,

                // AI assessments
                ai_assessment_execution_risk: record.ai_assessment_execution_risk || 0.5,
                ai_assessment_competitive_risk: record.ai_assessment_competitive_risk || 0.5,
                ai_assessment_business_impact_likelihood: record.ai_assessment_business_impact_likelihood || 0.5,
                ai_assessment_timeline_realism: record.ai_assessment_timeline_realism || 0.5,
                ai_assessment_fundamental_strength: record.ai_assessment_fundamental_strength || 0.5,

                // Perception gaps
                perception_gap_optimism_bias: record.perception_gap_optimism_bias || 0,
                perception_gap_risk_awareness: record.perception_gap_risk_awareness || 0,
                perception_gap_correction_potential: record.perception_gap_correction_potential || 0,

                // Evidence and timing
                evidence_level: record.evidence_level || 'unknown',
                evidence_source: record.evidence_source || 'unknown',
                factor_about_time_days: record.factor_about_time_days || 0,
                factor_effect_horizon_days: record.factor_effect_horizon_days || 0,

                // Market context
                market_regime: record.market_regime || 'neutral',
                market_hours: record.market_hours || false,
                spy_momentum_30day_pct: record.spy_momentum_30day_pct || 0,
                qqq_momentum_30day_pct: record.qqq_momentum_30day_pct || 0
            },

            targetVariables: {
                // Alpha vs benchmarks
                alpha_vs_spy_1min_after: parseFloat(record.alpha_vs_spy_1min_after || 0),
                alpha_vs_spy_5min_after: parseFloat(record.alpha_vs_spy_5min_after || 0),
                alpha_vs_spy_10min_after: parseFloat(record.alpha_vs_spy_10min_after || 0),
                alpha_vs_spy_30min_after: parseFloat(record.alpha_vs_spy_30min_after || 0),
                alpha_vs_spy_1hour_after: parseFloat(record.alpha_vs_spy_1hour_after || 0),
                alpha_vs_spy_1day_after: parseFloat(record.alpha_vs_spy_1day_after || 0),
                alpha_vs_spy_1week_after: parseFloat(record.alpha_vs_spy_1week_after || 0),
                alpha_vs_spy_1month_after: parseFloat(record.alpha_vs_spy_1month_after || 0),

                alpha_vs_qqq_1day_after: parseFloat(record.alpha_vs_qqq_1day_after || 0),
                alpha_vs_qqq_1week_after: parseFloat(record.alpha_vs_qqq_1week_after || 0),

                // Volume and volatility
                volume_relative_20day: parseFloat(record.volume_relative_20day || 1),
                volume_burst_first_hour: parseFloat(record.volume_burst_first_hour || 1),
                volatility_shock_ratio: parseFloat(record.volatility_shock_ratio || 1),
                volatility_1hour_after: parseFloat(record.volatility_1hour_after || 0),
                volatility_1day_after: parseFloat(record.volatility_1day_after || 0),

                // Price discovery
                price_discovery_speed_minutes: parseFloat(record.price_discovery_speed_minutes || 60),
                max_move_within_1hour_pct: parseFloat(record.max_move_within_1hour_pct || 0),
                reversal_strength_pct: parseFloat(record.reversal_strength_pct || 0),
                attention_half_life_hours: parseFloat(record.attention_half_life_hours || 24)
            },

            dataQuality: {
                data_quality_score: parseFloat(record.data_quality_score || 0.5),
                confidence_1day_after: parseFloat(record.confidence_1day_after || 0.5),
                missing_data_points: record.missing_data_points || [],
                processing_time_ms: record.processing_time_ms || 0
            }
        };
    }

    /**
     * Export training data to CSV format for Python ML
     */
    async exportToCSV(records: MLTrainingRecord[], outputPath: string): Promise<void> {
        logger.info('📄 Exporting to CSV', { records: records.length, outputPath });

        // Flatten records for CSV
        const flattenedRecords = records.map(record => ({
            // Identifiers
            id: record.id,
            article_id: record.article_id,
            ticker: record.ticker,
            event_timestamp: record.event_timestamp.toISOString(),

            // Input features (flattened)
            ...record.inputFeatures,

            // Target variables (flattened)
            ...record.targetVariables,

            // Data quality
            ...record.dataQuality
        }));

        if (flattenedRecords.length === 0) {
            throw new Error('No records to export');
        }

        // Create CSV
        const headers = Object.keys(flattenedRecords[0]);
        const csvHeaders = headers.join(',');

        const csvRows = flattenedRecords.map(record =>
            headers.map(header => {
                const value = (record as any)[header];

                if (value === null || value === undefined) {
                    return '';
                } else if (typeof value === 'string') {
                    // Escape quotes and wrap if contains comma
                    const escaped = value.replace(/"/g, '""');
                    return escaped.includes(',') ? `"${escaped}"` : escaped;
                } else if (Array.isArray(value)) {
                    return `"${value.join('|')}"`;
                } else {
                    return value.toString();
                }
            }).join(',')
        );

        const csvContent = [csvHeaders, ...csvRows].join('\\n');

        // Write to file
        const fs = await import('fs');
        fs.writeFileSync(outputPath, csvContent);

        logger.info('✅ CSV export complete', {
            outputPath,
            records: records.length,
            columns: headers.length,
            size: `${Math.round(csvContent.length / 1024)} KB`
        });
    }

    /**
     * Analyze feature importance based on variance and completeness
     */
    analyzeFeatureQuality(records: MLTrainingRecord[]): {
        inputFeatures: Array<{ feature: string; variance: number; completeness: number; importance: number }>;
        targetVariables: Array<{ target: string; mean: number; std: number; completeness: number }>;
    } {
        logger.info('🔍 Analyzing feature quality...');

        // Analyze input features
        const inputFeatureAnalysis: any[] = [];
        const sampleInput = records[0].inputFeatures;

        for (const [featureName, _] of Object.entries(sampleInput)) {
            const values = records
                .map(r => (r.inputFeatures as any)[featureName])
                .filter(v => v !== null && v !== undefined);

            if (typeof values[0] === 'number' && values.length > 0) {
                const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

                inputFeatureAnalysis.push({
                    feature: featureName,
                    variance,
                    completeness: values.length / records.length,
                    importance: variance * (values.length / records.length) // Combined score
                });
            } else {
                // Categorical feature
                const uniqueValues = new Set(values).size;
                inputFeatureAnalysis.push({
                    feature: featureName,
                    variance: uniqueValues / values.length, // Diversity score
                    completeness: values.length / records.length,
                    importance: (uniqueValues / values.length) * (values.length / records.length)
                });
            }
        }

        // Analyze target variables
        const targetAnalysis: any[] = [];
        const sampleTarget = records[0].targetVariables;

        for (const [targetName, _] of Object.entries(sampleTarget)) {
            const values = records
                .map(r => (r.targetVariables as any)[targetName])
                .filter(v => v !== null && v !== undefined && !isNaN(v));

            if (values.length > 0) {
                const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

                targetAnalysis.push({
                    target: targetName,
                    mean,
                    std,
                    completeness: values.length / records.length
                });
            }
        }

        // Sort by importance/completeness
        inputFeatureAnalysis.sort((a, b) => b.importance - a.importance);
        targetAnalysis.sort((a, b) => b.completeness - a.completeness);

        logger.info('✅ Feature analysis complete', {
            topInputFeatures: inputFeatureAnalysis.slice(0, 5).map(f => f.feature),
            topTargets: targetAnalysis.slice(0, 5).map(t => t.target)
        });

        return {
            inputFeatures: inputFeatureAnalysis,
            targetVariables: targetAnalysis
        };
    }

    /**
     * Filter records by orientation for orientation-aware training
     */
    filterByOrientation(records: MLTrainingRecord[], orientation: string): MLTrainingRecord[] {
        const filtered = records.filter(r => r.inputFeatures.event_orientation === orientation);

        logger.info(`🎯 Filtered by orientation '${orientation}'`, {
            original: records.length,
            filtered: filtered.length,
            percentage: Math.round(filtered.length / records.length * 100)
        });

        return filtered;
    }

    /**
     * Split data chronologically for temporal validation
     */
    splitDataChronologically(
        records: MLTrainingRecord[],
        trainRatio: number = 0.8
    ): { trainData: MLTrainingRecord[]; testData: MLTrainingRecord[] } {

        // Sort by event timestamp
        const sorted = records.sort((a, b) =>
            a.event_timestamp.getTime() - b.event_timestamp.getTime()
        );

        const splitIndex = Math.floor(sorted.length * trainRatio);

        const trainData = sorted.slice(0, splitIndex);
        const testData = sorted.slice(splitIndex);

        logger.info('📊 Chronological data split', {
            total: records.length,
            train: trainData.length,
            test: testData.length,
            trainDateRange: trainData.length > 0 ? {
                from: trainData[0].event_timestamp.toISOString().split('T')[0],
                to: trainData[trainData.length - 1].event_timestamp.toISOString().split('T')[0]
            } : null,
            testDateRange: testData.length > 0 ? {
                from: testData[0].event_timestamp.toISOString().split('T')[0],
                to: testData[testData.length - 1].event_timestamp.toISOString().split('T')[0]
            } : null
        });

        return { trainData, testData };
    }
}

export const actualDataFeatureEngineer = new ActualDataFeatureEngineer();
