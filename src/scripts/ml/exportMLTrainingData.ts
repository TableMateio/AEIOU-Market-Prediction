/**
 * Export ML Training Data to CSV
 * 
 * Exports the actual ml_training_data table to CSV format
 * for Random Forest training in Python
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('ExportMLData');

interface ExportConfig {
    includeAllColumns: boolean;
    targetColumns: string[];
    featureColumns: string[];
    minDataQuality: number;
    outputFormat: 'csv' | 'json';
}

class MLDataExporter {
    private supabase;

    constructor() {
        const config = AppConfig.getInstance();
        const supabaseConfig = config.supabaseConfig;

        if (!supabaseConfig.projectUrl || !supabaseConfig.apiKey) {
            throw new Error('Supabase configuration not found. Check your environment variables.');
        }

        this.supabase = createClient(supabaseConfig.projectUrl, supabaseConfig.apiKey);
    }

    /**
     * Export ML training data to CSV/JSON
     */
    async exportTrainingData(config: Partial<ExportConfig> = {}): Promise<string> {
        const fullConfig: ExportConfig = {
            includeAllColumns: true,
            targetColumns: [
                'alpha_vs_spy_1min_after',
                'alpha_vs_spy_5min_after',
                'alpha_vs_spy_10min_after',
                'alpha_vs_spy_30min_after',
                'alpha_vs_spy_1hour_after',
                'alpha_vs_spy_1day_after',
                'alpha_vs_spy_1week_after',
                'alpha_vs_spy_1month_after',
                'alpha_vs_qqq_1day_after',
                'volume_relative_20day',
                'volatility_shock_ratio'
            ],
            featureColumns: [
                // Business factors
                'factor_name',
                'factor_category',
                'factor_magnitude',
                'factor_movement',
                'causal_certainty',
                'logical_directness',
                'regime_alignment',

                // Event context
                'event_type',
                'event_orientation',
                'event_scope',
                'event_trigger',
                'event_time_horizon_days',

                // Article context
                'article_source',
                'article_source_credibility',
                'article_author_credibility',
                'article_publisher_credibility',
                'article_audience_split',
                'article_time_lag_days',
                'article_market_regime',
                'article_apple_relevance_score',
                'article_published_year',
                'article_published_month',
                'article_published_day_of_week',

                // Market context
                'market_regime',
                'market_hours',
                'spy_momentum_30day_pct',
                'qqq_momentum_30day_pct',

                // Market perception (from causal analysis)
                'market_perception_intensity',
                'market_perception_hope_vs_fear',
                'market_perception_surprise_vs_anticipated',
                'market_perception_consensus_vs_division',
                'market_perception_narrative_strength',

                // AI assessments
                'ai_assessment_execution_risk',
                'ai_assessment_competitive_risk',
                'ai_assessment_business_impact_likelihood',
                'ai_assessment_timeline_realism',
                'ai_assessment_fundamental_strength',

                // Perception gaps
                'perception_gap_optimism_bias',
                'perception_gap_risk_awareness',
                'perception_gap_correction_potential',

                // Timing features
                'factor_about_time_days',
                'factor_effect_horizon_days',

                // Evidence features
                'evidence_level',
                'evidence_source'
            ],
            minDataQuality: 0.0, // No quality filtering - get all records
            outputFormat: 'csv',
            ...config
        };

        logger.info('📊 Exporting ML training data...', {
            targetColumns: fullConfig.targetColumns.length,
            featureColumns: fullConfig.featureColumns.length,
            minDataQuality: fullConfig.minDataQuality
        });

        // Fetch data
        const data = await this.fetchTrainingData(fullConfig);

        // Clean and validate data
        const cleanedData = this.cleanData(data, fullConfig);

        // Export to file
        const outputPath = await this.saveData(cleanedData, fullConfig);

        // Generate metadata file
        await this.generateMetadata(cleanedData, fullConfig, outputPath);

        return outputPath;
    }

    /**
     * Fetch training data from database
     */
    private async fetchTrainingData(config: ExportConfig): Promise<any[]> {
        // Determine columns to select
        let selectColumns: string[];

        if (config.includeAllColumns) {
            selectColumns = ['*'];
        } else {
            selectColumns = [
                'id',
                'article_id',
                'ticker',
                'event_timestamp',
                'processing_status',
                ...config.targetColumns,
                ...config.featureColumns
            ];
        }

        // Export ALL records - no filtering, with explicit limit
        const { data, error } = await this.supabase
            .from('ml_training_data')
            .select('*')  // Get all columns
            .order('article_published_at', { ascending: false })
            .limit(15000);  // Ensure we get all 12K+ records

        if (error) {
            throw new Error(`Failed to fetch training data: ${error.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error('No ML training data found');
        }

        logger.info(`✅ Fetched ${data.length} records`);
        return data;
    }

    /**
     * Clean and validate data
     */
    private cleanData(data: any[], config: ExportConfig): any[] {
        logger.info('🧹 Cleaning and validating data...');

        const allColumns = [...config.targetColumns, ...config.featureColumns];
        const cleanedData: any[] = [];

        for (const record of data) {
            // Calculate data quality score
            let nonNullCount = 0;
            let totalCount = 0;

            for (const column of allColumns) {
                totalCount++;
                if (record[column] !== null && record[column] !== undefined && record[column] !== '') {
                    nonNullCount++;
                }
            }

            const qualityScore = nonNullCount / totalCount;

            // Skip records with too much missing data
            if (qualityScore < config.minDataQuality) {
                continue;
            }

            // Clean individual fields
            const cleanedRecord = this.cleanRecord(record, allColumns);
            cleanedRecord.data_quality_score = qualityScore;

            cleanedData.push(cleanedRecord);
        }

        logger.info(`🔍 Data cleaning complete: ${cleanedData.length}/${data.length} records passed quality filter`);
        return cleanedData;
    }

    /**
     * Clean individual record
     */
    private cleanRecord(record: any, columns: string[]): any {
        const cleaned: any = {};

        // Copy metadata fields
        cleaned.id = record.id;
        cleaned.article_id = record.article_id;
        cleaned.ticker = record.ticker || 'AAPL';
        cleaned.event_timestamp = record.event_timestamp;

        for (const column of columns) {
            let value = record[column];

            // Handle different data types
            if (value === null || value === undefined) {
                // Use appropriate defaults based on column type
                if (column.includes('_pct') || column.includes('alpha_') || column.includes('change_')) {
                    cleaned[column] = 0.0; // Percentage/change fields default to 0
                } else if (column.includes('credibility') || column.includes('certainty') || column.includes('_risk')) {
                    cleaned[column] = 0.5; // Probability fields default to neutral
                } else if (column.includes('days')) {
                    cleaned[column] = 0; // Time fields default to 0
                } else if (typeof value === 'string') {
                    cleaned[column] = 'unknown'; // String fields default to unknown
                } else {
                    cleaned[column] = 0; // Numeric fields default to 0
                }
            } else {
                // Clean existing values
                if (typeof value === 'string') {
                    value = value.trim();
                    if (value === '') value = 'unknown';
                }
                cleaned[column] = value;
            }
        }

        return cleaned;
    }

    /**
     * Save data to file
     */
    private async saveData(data: any[], config: ExportConfig): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = `/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data`;

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filename = `ml_training_data_${timestamp}.${config.outputFormat}`;
        const outputPath = path.join(outputDir, filename);

        if (config.outputFormat === 'csv') {
            const csv = this.convertToCSV(data);
            fs.writeFileSync(outputPath, csv);
        } else {
            fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        }

        logger.info(`💾 Data exported to: ${outputPath}`, {
            records: data.length,
            format: config.outputFormat,
            size: `${Math.round(fs.statSync(outputPath).size / 1024)} KB`
        });

        return outputPath;
    }

    /**
     * Convert data to CSV format
     */
    private convertToCSV(data: any[]): string {
        if (data.length === 0) return '';

        // Get headers from first record
        const headers = Object.keys(data[0]);

        // Create CSV content
        const csvHeaders = headers.join(',');
        const csvRows = data.map(record =>
            headers.map(header => {
                const value = record[header];

                // Handle different value types
                if (value === null || value === undefined) {
                    return '';
                } else if (typeof value === 'string') {
                    // Escape quotes and wrap in quotes if contains comma
                    const escaped = value.replace(/"/g, '""');
                    return escaped.includes(',') ? `"${escaped}"` : escaped;
                } else if (Array.isArray(value)) {
                    // Convert arrays to pipe-separated strings
                    return `"${value.join('|')}"`;
                } else if (typeof value === 'object') {
                    // Convert objects to JSON strings
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                } else {
                    return value.toString();
                }
            }).join(',')
        );

        return [csvHeaders, ...csvRows].join('\n');
    }

    /**
     * Generate metadata file
     */
    private async generateMetadata(data: any[], config: ExportConfig, outputPath: string): Promise<void> {
        const metadata = {
            generated_at: new Date().toISOString(),
            source_table: 'ml_training_data',
            record_count: data.length,
            data_quality_filter: config.minDataQuality,

            target_variables: config.targetColumns,
            feature_count: config.featureColumns.length,

            column_info: this.analyzeColumns(data),

            data_distribution: {
                event_orientations: this.getDistribution(data, 'event_orientation'),
                event_types: this.getDistribution(data, 'event_type'),
                market_regimes: this.getDistribution(data, 'market_regime'),
                article_sources: this.getDistribution(data, 'article_source')
            },

            target_statistics: this.analyzeTargets(data, config.targetColumns),

            usage_instructions: {
                python_command: `python train_random_forest.py ${path.basename(outputPath)}`,
                shap_command: `python shap_analysis.py ${path.basename(outputPath)} models/`,
                description: 'This dataset is ready for Random Forest training with SHAP analysis'
            }
        };

        const metadataPath = outputPath.replace(/\\.(csv|json)$/, '_metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        logger.info(`📋 Metadata saved: ${metadataPath}`);
    }

    /**
     * Analyze column statistics
     */
    private analyzeColumns(data: any[]): any {
        if (data.length === 0) return {};

        const columnInfo: any = {};
        const sampleRecord = data[0];

        for (const [column, value] of Object.entries(sampleRecord)) {
            const values = data.map(r => r[column]).filter(v => v !== null && v !== undefined);

            columnInfo[column] = {
                type: typeof value,
                non_null_count: values.length,
                null_rate: (data.length - values.length) / data.length,
                unique_values: new Set(values).size
            };

            // Add statistics for numeric columns
            if (typeof value === 'number' && values.length > 0) {
                const numericValues = values.filter(v => !isNaN(v));
                if (numericValues.length > 0) {
                    const mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
                    const sorted = numericValues.sort((a, b) => a - b);

                    columnInfo[column].statistics = {
                        mean,
                        median: sorted[Math.floor(sorted.length / 2)],
                        min: Math.min(...numericValues),
                        max: Math.max(...numericValues),
                        std: Math.sqrt(numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length)
                    };
                }
            }
        }

        return columnInfo;
    }

    /**
     * Get distribution of categorical column
     */
    private getDistribution(data: any[], column: string): Record<string, number> {
        const distribution: Record<string, number> = {};

        for (const record of data) {
            const value = record[column] || 'unknown';
            distribution[value] = (distribution[value] || 0) + 1;
        }

        return distribution;
    }

    /**
     * Analyze target variable statistics
     */
    private analyzeTargets(data: any[], targetColumns: string[]): any {
        const targetStats: any = {};

        for (const target of targetColumns) {
            const values = data
                .map(r => r[target])
                .filter(v => v !== null && v !== undefined && !isNaN(v))
                .map(v => parseFloat(v));

            if (values.length > 0) {
                const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                const sorted = values.sort((a, b) => a - b);

                targetStats[target] = {
                    count: values.length,
                    mean,
                    median: sorted[Math.floor(sorted.length / 2)],
                    std: Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length),
                    min: Math.min(...values),
                    max: Math.max(...values),
                    positive_rate: values.filter(v => v > 0).length / values.length,
                    significant_moves: values.filter(v => Math.abs(v) > 0.02).length / values.length // >2% moves
                };
            }
        }

        return targetStats;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);

    try {
        const exporter = new MLDataExporter();

        const config: Partial<ExportConfig> = {
            outputFormat: args.includes('--json') ? 'json' : 'csv',
            includeAllColumns: args.includes('--all-columns'),
            minDataQuality: args.includes('--low-quality') ? 0.1 : 0.3
        };

        const outputPath = await exporter.exportTrainingData(config);

        console.log('🎉 ML data export completed!');
        console.log(`📁 File: ${outputPath}`);
        console.log('');
        console.log('🚀 Next steps:');
        console.log('1. cd python && python train_random_forest.py ../ml_data/ml_training_data_*.csv');
        console.log('2. python shap_analysis.py ../ml_data/ml_training_data_*.csv models/');
        console.log('');
        console.log('📊 This will train Random Forest models and discover factor interactions automatically.');

    } catch (error: any) {
        console.error('❌ Export failed:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { MLDataExporter };
