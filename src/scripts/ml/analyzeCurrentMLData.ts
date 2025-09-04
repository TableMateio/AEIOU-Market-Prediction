/**
 * Analyze Current ML Training Data
 * 
 * Understand what data we actually have in ml_training_data table
 * and prepare it for Random Forest training
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';
import * as fs from 'fs';

const logger = createLogger('AnalyzeMLData');

interface MLDataAnalysis {
    totalRecords: number;
    completeness: {
        hasBusinessFactors: number;
        hasStockData: number;
        hasAlphaCalculations: number;
        hasArticleMetadata: number;
    };
    dataQuality: {
        averageConfidenceScore: number;
        missingDataRate: number;
        orientationDistribution: Record<string, number>;
        eventTypeDistribution: Record<string, number>;
    };
    targetVariables: {
        alphaVsSpyDistribution: {
            '1min': { mean: number; std: number; count: number };
            '1hour': { mean: number; std: number; count: number };
            '1day': { mean: number; std: number; count: number };
            '1week': { mean: number; std: number; count: number };
        };
    };
    recommendations: string[];
}

class MLDataAnalyzer {
    private supabase;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }

    /**
     * Analyze the current ml_training_data table
     */
    async analyzeMLData(): Promise<MLDataAnalysis> {
        logger.info('🔍 Analyzing current ML training data...');

        // Get all records
        const { data: records, error } = await this.supabase
            .from('ml_training_data')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch ML data: ${error.message}`);
        }

        if (!records || records.length === 0) {
            throw new Error('No ML training data found');
        }

        logger.info(`📊 Found ${records.length} ML training records`);

        // Analyze completeness
        const completeness = this.analyzeCompleteness(records);

        // Analyze data quality
        const dataQuality = this.analyzeDataQuality(records);

        // Analyze target variables
        const targetVariables = this.analyzeTargetVariables(records);

        // Generate recommendations
        const recommendations = this.generateRecommendations(records, completeness, dataQuality);

        const analysis: MLDataAnalysis = {
            totalRecords: records.length,
            completeness,
            dataQuality,
            targetVariables,
            recommendations
        };

        // Save analysis
        await this.saveAnalysis(analysis, records);

        return analysis;
    }

    /**
     * Analyze data completeness
     */
    private analyzeCompleteness(records: any[]): MLDataAnalysis['completeness'] {
        let hasBusinessFactors = 0;
        let hasStockData = 0;
        let hasAlphaCalculations = 0;
        let hasArticleMetadata = 0;

        for (const record of records) {
            // Check business factors
            if (record.factor_name && record.factor_category) {
                hasBusinessFactors++;
            }

            // Check stock data
            if (record.price_at_event && record.price_1day_after) {
                hasStockData++;
            }

            // Check alpha calculations
            if (record.alpha_vs_spy_1day_after !== null) {
                hasAlphaCalculations++;
            }

            // Check article metadata
            if (record.article_source && record.article_published_at) {
                hasArticleMetadata++;
            }
        }

        return {
            hasBusinessFactors,
            hasStockData,
            hasAlphaCalculations,
            hasArticleMetadata
        };
    }

    /**
     * Analyze data quality
     */
    private analyzeDataQuality(records: any[]): MLDataAnalysis['dataQuality'] {
        // Calculate average confidence score
        const confidenceScores = records
            .map(r => r.confidence_1day_after)
            .filter(score => score !== null && score !== undefined);

        const averageConfidenceScore = confidenceScores.length > 0
            ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
            : 0;

        // Calculate missing data rate
        const totalFields = Object.keys(records[0] || {}).length;
        let totalMissing = 0;

        for (const record of records) {
            for (const [key, value] of Object.entries(record)) {
                if (value === null || value === undefined || value === '') {
                    totalMissing++;
                }
            }
        }

        const missingDataRate = totalMissing / (records.length * totalFields);

        // Orientation distribution
        const orientationDistribution: Record<string, number> = {};
        for (const record of records) {
            const orientation = record.event_orientation || 'unknown';
            orientationDistribution[orientation] = (orientationDistribution[orientation] || 0) + 1;
        }

        // Event type distribution
        const eventTypeDistribution: Record<string, number> = {};
        for (const record of records) {
            const eventType = record.event_type || 'unknown';
            eventTypeDistribution[eventType] = (eventTypeDistribution[eventType] || 0) + 1;
        }

        return {
            averageConfidenceScore,
            missingDataRate,
            orientationDistribution,
            eventTypeDistribution
        };
    }

    /**
     * Analyze target variables (alpha calculations)
     */
    private analyzeTargetVariables(records: any[]): MLDataAnalysis['targetVariables'] {
        const timeWindows = ['1min', '1hour', '1day', '1week'];
        const alphaVsSpyDistribution: any = {};

        for (const window of timeWindows) {
            const fieldName = `alpha_vs_spy_${window}_after`;
            const values = records
                .map(r => r[fieldName])
                .filter(v => v !== null && v !== undefined && !isNaN(v))
                .map(v => parseFloat(v));

            if (values.length > 0) {
                const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
                const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
                const std = Math.sqrt(variance);

                alphaVsSpyDistribution[window] = {
                    mean,
                    std,
                    count: values.length
                };
            } else {
                alphaVsSpyDistribution[window] = {
                    mean: 0,
                    std: 0,
                    count: 0
                };
            }
        }

        return {
            alphaVsSpyDistribution
        };
    }

    /**
     * Generate recommendations based on analysis
     */
    private generateRecommendations(
        records: any[],
        completeness: MLDataAnalysis['completeness'],
        dataQuality: MLDataAnalysis['dataQuality']
    ): string[] {
        const recommendations: string[] = [];

        const total = records.length;

        // Data completeness recommendations
        if (completeness.hasBusinessFactors / total < 0.8) {
            recommendations.push(`⚠️ Only ${Math.round(completeness.hasBusinessFactors / total * 100)}% of records have business factors. Consider processing more articles.`);
        }

        if (completeness.hasAlphaCalculations / total < 0.9) {
            recommendations.push(`⚠️ Only ${Math.round(completeness.hasAlphaCalculations / total * 100)}% of records have alpha calculations. Some stock data may be missing.`);
        }

        // Data quality recommendations
        if (dataQuality.missingDataRate > 0.3) {
            recommendations.push(`🚨 High missing data rate (${Math.round(dataQuality.missingDataRate * 100)}%). Consider data cleaning before ML training.`);
        }

        if (dataQuality.averageConfidenceScore < 0.7) {
            recommendations.push(`📊 Low average confidence score (${dataQuality.averageConfidenceScore.toFixed(2)}). Data quality may be suboptimal.`);
        }

        // Orientation distribution recommendations
        const orientations = Object.keys(dataQuality.orientationDistribution);
        if (orientations.includes('unknown') && dataQuality.orientationDistribution['unknown'] > total * 0.2) {
            recommendations.push(`🎯 ${Math.round(dataQuality.orientationDistribution['unknown'] / total * 100)}% of records have unknown orientation. This affects predictive vs reflective analysis.`);
        }

        // Sample size recommendations
        if (total < 500) {
            recommendations.push(`📈 Sample size (${total}) is relatively small. Consider collecting more data for robust ML training.`);
        } else if (total >= 1000) {
            recommendations.push(`✅ Good sample size (${total}) for initial ML training. Ready to proceed with Random Forest.`);
        }

        return recommendations;
    }

    /**
     * Save analysis results
     */
    private async saveAnalysis(analysis: MLDataAnalysis, records: any[]): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = `/Users/scottbergman/Dropbox/Projects/AEIOU/ml_analysis`;

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save detailed analysis
        const analysisFile = `${outputDir}/ml_data_analysis_${timestamp}.json`;
        fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));

        // Save sample data for inspection
        const sampleFile = `${outputDir}/sample_records_${timestamp}.json`;
        const sampleRecords = records.slice(0, 10); // First 10 records
        fs.writeFileSync(sampleFile, JSON.stringify(sampleRecords, null, 2));

        // Generate markdown report
        const reportFile = `${outputDir}/ml_data_report_${timestamp}.md`;
        const report = this.generateMarkdownReport(analysis);
        fs.writeFileSync(reportFile, report);

        logger.info('📄 Analysis saved', {
            analysisFile,
            sampleFile,
            reportFile
        });
    }

    /**
     * Generate human-readable markdown report
     */
    private generateMarkdownReport(analysis: MLDataAnalysis): string {
        return `# ML Training Data Analysis Report

Generated: ${new Date().toISOString()}

## 📊 **Data Overview**
- **Total Records**: ${analysis.totalRecords}
- **Ready for ML Training**: ${analysis.totalRecords >= 500 ? '✅ Yes' : '⚠️ Limited'}

## 🔍 **Data Completeness**
- **Business Factors**: ${analysis.completeness.hasBusinessFactors} (${Math.round(analysis.completeness.hasBusinessFactors / analysis.totalRecords * 100)}%)
- **Stock Data**: ${analysis.completeness.hasStockData} (${Math.round(analysis.completeness.hasStockData / analysis.totalRecords * 100)}%)
- **Alpha Calculations**: ${analysis.completeness.hasAlphaCalculations} (${Math.round(analysis.completeness.hasAlphaCalculations / analysis.totalRecords * 100)}%)
- **Article Metadata**: ${analysis.completeness.hasArticleMetadata} (${Math.round(analysis.completeness.hasArticleMetadata / analysis.totalRecords * 100)}%)

## 📈 **Target Variable Analysis (Alpha vs SPY)**

${Object.entries(analysis.targetVariables.alphaVsSpyDistribution).map(([window, stats]) =>
            `### ${window.toUpperCase()} Alpha
- **Mean**: ${stats.mean.toFixed(4)}%
- **Std Dev**: ${stats.std.toFixed(4)}%
- **Sample Count**: ${stats.count}
- **Signal Strength**: ${Math.abs(stats.mean) > stats.std ? '🟢 Strong' : '🟡 Moderate'}`
        ).join('\n\n')}

## 🎯 **Event Orientation Distribution**
${Object.entries(analysis.dataQuality.orientationDistribution).map(([orientation, count]) =>
            `- **${orientation}**: ${count} (${Math.round(count / analysis.totalRecords * 100)}%)`
        ).join('\n')}

## 📋 **Event Type Distribution**
${Object.entries(analysis.dataQuality.eventTypeDistribution).slice(0, 10).map(([eventType, count]) =>
            `- **${eventType}**: ${count} (${Math.round(count / analysis.totalRecords * 100)}%)`
        ).join('\n')}

## ⚡ **Data Quality Metrics**
- **Average Confidence**: ${analysis.dataQuality.averageConfidenceScore.toFixed(3)}
- **Missing Data Rate**: ${Math.round(analysis.dataQuality.missingDataRate * 100)}%

## 💡 **Recommendations**
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## 🚀 **Next Steps**
1. **Export to CSV**: Use the data export script to prepare for Python ML training
2. **Data Validation**: Review any high missing data rate issues
3. **ML Training**: Run Random Forest on this dataset
4. **SHAP Analysis**: Discover which factor combinations drive alpha

---

*This analysis confirms you have a solid foundation for ML training with ${analysis.totalRecords} records.*`;
    }
}

// CLI interface
async function main() {
    try {
        const analyzer = new MLDataAnalyzer();
        const analysis = await analyzer.analyzeMLData();

        console.log('🎉 ML Data Analysis Complete!');
        console.log(`📊 Total Records: ${analysis.totalRecords}`);
        console.log(`✅ Alpha Calculations: ${analysis.completeness.hasAlphaCalculations} records`);
        console.log(`🎯 Business Factors: ${analysis.completeness.hasBusinessFactors} records`);

        if (analysis.recommendations.length > 0) {
            console.log('\n💡 Key Recommendations:');
            analysis.recommendations.slice(0, 3).forEach(rec => console.log(`   ${rec}`));
        }

        console.log('\n📁 Detailed analysis saved to ml_analysis/ directory');

    } catch (error: any) {
        console.error('❌ Analysis failed:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { MLDataAnalyzer };
