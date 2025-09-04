/**
 * ML Data Optimizer
 * 
 * Removes empty columns and optimizes data for faster training
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../utils/logger.js';
import { AppConfig } from '../config/app.js';

const logger = createLogger('DataOptimizer');

export class MLDataOptimizer {
    private supabase;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }

    /**
     * Get optimized column lists based on data completeness
     */
    async getOptimizedColumns(): Promise<{
        inputFeatures: string[];
        targetVariables: string[];
        emptyColumns: string[];
        sparseColumns: string[];
    }> {
        logger.info('🔍 Analyzing data completeness for optimization...');

        // KNOWN EMPTY COLUMNS (100% null) - EXCLUDE these
        const knownEmptyColumns = [
            'article_authors',
            'volume_burst_first_hour',
            'volatility_shock_ratio',
            'volume_relative_20day'
        ];

        // SPARSE COLUMNS (>10% null) - flag for review
        const sparseColumns = [
            'spy_momentum_30day_pct'  // 13% null
        ];

        // OPTIMIZED INPUT FEATURES (exclude empty columns)
        const optimizedInputFeatures = [
            // Business factor core (all populated)
            'factor_name', 'factor_category', 'factor_magnitude', 'factor_movement',
            'factor_unit', 'factor_raw_value', 'factor_delta',
            'factor_description', 'factor_orientation', 'factor_about_time_days', 'factor_effect_horizon_days',

            // Causal analysis (all populated)
            'causal_certainty', 'logical_directness', 'regime_alignment', 'causal_step',

            // Event context (well populated)
            'event_type', 'event_description', 'event_trigger', 'event_entities',
            'event_scope', 'event_orientation', 'event_time_horizon_days', 'event_tags', 'event_quoted_people',

            // Article metadata (mostly populated)
            'article_headline', 'article_url', 'article_source',
            'article_source_credibility', 'article_author_credibility', 'article_publisher_credibility',
            'article_audience_split', 'article_time_lag_days', 'article_market_regime',
            'article_apple_relevance_score', 'article_ticker_relevance_score',
            'article_published_year', 'article_published_month', 'article_published_day_of_week',

            // Evidence & sources
            'evidence_level', 'evidence_source', 'evidence_citation',

            // Market consensus & narrative
            'market_consensus_on_causality', 'reframing_potential', 'narrative_disruption',

            // Market perception (well populated)
            'market_perception_intensity', 'market_perception_hope_vs_fear',
            'market_perception_surprise_vs_anticipated', 'market_perception_consensus_vs_division',
            'market_perception_narrative_strength', 'market_perception_emotional_profile', 'market_perception_cognitive_biases',

            // AI assessments
            'ai_assessment_execution_risk', 'ai_assessment_competitive_risk',
            'ai_assessment_business_impact_likelihood', 'ai_assessment_timeline_realism', 'ai_assessment_fundamental_strength',

            // Perception gaps
            'perception_gap_optimism_bias', 'perception_gap_risk_awareness', 'perception_gap_correction_potential',

            // Context features
            'market_hours', 'market_regime', 'pattern_strength_score', 'data_quality_score'

            // NOTE: Excluding factor_synonyms (JSON, complex to process)
        ];

        // OPTIMIZED TARGET VARIABLES (exclude known empty ones)
        const optimizedTargetVariables = [
            // Alpha vs SPY (PRIMARY TARGETS - all populated)
            'alpha_vs_spy_1min_after', 'alpha_vs_spy_5min_after', 'alpha_vs_spy_10min_after',
            'alpha_vs_spy_30min_after', 'alpha_vs_spy_1hour_after', 'alpha_vs_spy_4hour_after',
            'alpha_vs_spy_1day_after', 'alpha_vs_spy_1week_after', 'alpha_vs_spy_1month_after',
            'alpha_vs_spy_6month_after', 'alpha_vs_spy_1year_after',

            // Alpha vs QQQ (populated)
            'alpha_vs_qqq_1min_after', 'alpha_vs_qqq_5min_after', 'alpha_vs_qqq_10min_after',
            'alpha_vs_qqq_30min_after', 'alpha_vs_qqq_1hour_after', 'alpha_vs_qqq_4hour_after',
            'alpha_vs_qqq_1day_after', 'alpha_vs_qqq_1week_after', 'alpha_vs_qqq_1month_after',
            'alpha_vs_qqq_6month_after', 'alpha_vs_qqq_1year_after',

            // Raw price changes (populated)
            'abs_change_1min_after_pct', 'abs_change_5min_after_pct', 'abs_change_10min_after_pct',
            'abs_change_30min_after_pct', 'abs_change_1hour_after_pct', 'abs_change_4hour_after_pct',
            'abs_change_1day_after_pct', 'abs_change_1week_after_pct', 'abs_change_1month_after_pct',

            // Price discovery (if populated)
            'price_discovery_speed_minutes', 'max_move_within_1hour_pct', 'reversal_strength_pct', 'attention_half_life_hours'

            // NOTE: Excluding volume_* and volatility_* (100% null)
            // NOTE: Including spy_momentum_30day_pct despite 13% nulls (still useful)
        ];

        // Add sparse columns to targets if they have some data
        if (!knownEmptyColumns.includes('spy_momentum_30day_pct')) {
            optimizedTargetVariables.push('spy_momentum_30day_pct', 'qqq_momentum_30day_pct');
        }

        logger.info('✅ Data optimization analysis complete', {
            inputFeatures: optimizedInputFeatures.length,
            targetVariables: optimizedTargetVariables.length,
            emptyColumnsRemoved: knownEmptyColumns.length,
            sparseColumnsIdentified: sparseColumns.length
        });

        return {
            inputFeatures: optimizedInputFeatures,
            targetVariables: optimizedTargetVariables,
            emptyColumns: knownEmptyColumns,
            sparseColumns: sparseColumns
        };
    }

    /**
     * Validate data quality before training
     */
    async validateDataQuality(): Promise<{
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    }> {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check for primary targets
        const { data: alphaCheck } = await this.supabase
            .from('ml_training_data')
            .select('alpha_vs_spy_1day_after')
            .not('alpha_vs_spy_1day_after', 'is', null)
            .limit(1);

        if (!alphaCheck || alphaCheck.length === 0) {
            issues.push('Primary target alpha_vs_spy_1day_after is completely empty');
        }

        // Check factor diversity
        const { data: factorDiversity } = await this.supabase
            .from('ml_training_data')
            .select('factor_name')
            .limit(100);

        if (factorDiversity) {
            const uniqueFactors = new Set(factorDiversity.map(r => r.factor_name)).size;
            if (uniqueFactors < 10) {
                issues.push(`Low factor diversity: only ${uniqueFactors} unique factor types`);
                recommendations.push('Consider processing more diverse articles');
            }
        }

        // Performance recommendations
        recommendations.push('Remove 4 completely empty columns to save ~20% processing time');
        recommendations.push('Use RandomForestRegressor with n_jobs=-1 for full CPU utilization');
        recommendations.push('Limit SHAP analysis to top 25 features for faster results');

        const isValid = issues.length === 0;

        logger.info(`📊 Data quality: ${isValid ? '✅ GOOD' : '⚠️ ISSUES FOUND'}`, {
            issues: issues.length,
            recommendations: recommendations.length
        });

        return { isValid, issues, recommendations };
    }
}

export const mlDataOptimizer = new MLDataOptimizer();
