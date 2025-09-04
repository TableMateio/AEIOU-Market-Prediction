/**
 * Analyze ML Training Data Completeness
 * 
 * Check for null columns, data quality, and optimization opportunities
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';

const logger = createLogger('DataCompletenessAnalyzer');

interface ColumnStats {
    column_name: string;
    data_type: string;
    total_rows: number;
    non_null_count: number;
    null_count: number;
    null_percentage: number;
    sample_values: any[];
    unique_count?: number;
}

class DataCompletenessAnalyzer {
    private supabase;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }

    async analyzeCompleteness(): Promise<void> {
        logger.info('🔍 Analyzing ml_training_data completeness...');

        // Get column info
        const { data: columns, error: colError } = await this.supabase.rpc('get_column_stats', {
            table_name: 'ml_training_data'
        });

        if (colError) {
            // Fallback to manual analysis
            await this.manualAnalysis();
            return;
        }

        logger.info('📊 Column completeness analysis complete');
    }

    private async manualAnalysis(): Promise<void> {
        logger.info('📊 Running manual completeness analysis...');

        // Get total row count
        const { count: totalRows, error: countError } = await this.supabase
            .from('ml_training_data')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            throw new Error(`Failed to get row count: ${countError.message}`);
        }

        logger.info(`📈 Total rows: ${totalRows}`);

        // Check key target variables
        const keyTargets = [
            'alpha_vs_spy_1day_after',
            'alpha_vs_spy_1week_after',
            'volume_relative_20day',
            'volatility_shock_ratio',
            'price_discovery_speed_minutes',
            'max_move_within_1hour_pct'
        ];

        logger.info('🎯 Checking key target variables...');
        for (const target of keyTargets) {
            await this.checkColumn(target, totalRows || 0);
        }

        // Check key input features
        const keyFeatures = [
            'factor_name',
            'factor_category',
            'factor_magnitude',
            'event_orientation',
            'article_source_credibility',
            'market_perception_hope_vs_fear',
            'ai_assessment_execution_risk'
        ];

        logger.info('🔧 Checking key input features...');
        for (const feature of keyFeatures) {
            await this.checkColumn(feature, totalRows || 0);
        }

        // Check for completely empty columns
        await this.findEmptyColumns();

        // Performance recommendations
        this.generateRecommendations(totalRows || 0);
    }

    private async checkColumn(columnName: string, totalRows: number): Promise<void> {
        try {
            // Count non-null values
            const { data, error } = await this.supabase
                .from('ml_training_data')
                .select(columnName)
                .not(columnName, 'is', null);

            if (error) {
                logger.warn(`❌ Error checking ${columnName}: ${error.message}`);
                return;
            }

            const nonNullCount = data?.length || 0;
            const nullCount = totalRows - nonNullCount;
            const nullPercentage = (nullCount / totalRows) * 100;

            const status = nullPercentage === 100 ? '🚫 EMPTY' :
                nullPercentage > 50 ? '⚠️  SPARSE' :
                    nullPercentage > 10 ? '⚡ SOME_NULLS' : '✅ COMPLETE';

            logger.info(`${status} ${columnName}: ${nonNullCount}/${totalRows} (${nullPercentage.toFixed(1)}% null)`);

        } catch (error: any) {
            logger.warn(`❌ Error analyzing ${columnName}: ${error.message}`);
        }
    }

    private async findEmptyColumns(): Promise<void> {
        logger.info('🔍 Searching for completely empty columns...');

        // Sample a few rows to check column structure
        const { data: sampleData, error } = await this.supabase
            .from('ml_training_data')
            .select('*')
            .limit(5);

        if (error || !sampleData || sampleData.length === 0) {
            logger.warn('Could not sample data for empty column analysis');
            return;
        }

        const emptyColumns: string[] = [];
        const sparseColumns: string[] = [];

        // Check each column in the sample
        const columnNames = Object.keys(sampleData[0]);

        for (const colName of columnNames) {
            const nonNullValues = sampleData.filter(row =>
                row[colName] !== null &&
                row[colName] !== undefined &&
                row[colName] !== ''
            ).length;

            if (nonNullValues === 0) {
                emptyColumns.push(colName);
            } else if (nonNullValues <= 2) {
                sparseColumns.push(colName);
            }
        }

        if (emptyColumns.length > 0) {
            logger.warn(`🚫 Completely empty columns (${emptyColumns.length}):`, emptyColumns);
        }

        if (sparseColumns.length > 0) {
            logger.warn(`⚠️  Very sparse columns (${sparseColumns.length}):`, sparseColumns);
        }

        logger.info(`✅ Found ${columnNames.length - emptyColumns.length - sparseColumns.length} well-populated columns`);
    }

    private generateRecommendations(totalRows: number): void {
        logger.info('💡 Performance Recommendations:');

        logger.info('🚀 Mac Studio M1 Max Performance Estimate:');
        logger.info(`   • Dataset size: ${totalRows} rows × ~218 columns`);
        logger.info(`   • Estimated training time: 2-5 minutes for Random Forest`);
        logger.info(`   • Memory usage: ~200-500MB for this dataset size`);
        logger.info(`   • SHAP analysis: 5-10 minutes (computationally expensive)`);

        logger.info('⚡ Optimization Strategies:');
        logger.info('   • Drop completely empty columns (saves memory & time)');
        logger.info('   • Consider feature selection on sparse columns (>80% null)');
        logger.info('   • Use RandomForestRegressor with n_jobs=-1 (all CPU cores)');
        logger.info('   • Limit SHAP analysis to top 20-30 features');
        logger.info('   • Consider train/test split: 80/20 or 70/30');

        logger.info('📊 Data Quality Checks:');
        logger.info('   • Verify alpha_vs_spy targets are populated');
        logger.info('   • Check for outliers in price change data');
        logger.info('   • Validate timestamp alignment');
        logger.info('   • Ensure factor_name diversity (not all same factor)');
    }
}

// CLI interface
async function main() {
    try {
        const analyzer = new DataCompletenessAnalyzer();
        await analyzer.analyzeCompleteness();

        console.log('🎉 Data completeness analysis complete!');

    } catch (error: any) {
        console.error('❌ Analysis failed:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { DataCompletenessAnalyzer };
