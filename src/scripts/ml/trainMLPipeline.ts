/**
 * ML Pipeline Training Script
 * 
 * Orchestrates the complete machine learning pipeline:
 * 1. Process business factors from articles
 * 2. Calculate relative performance vs benchmarks  
 * 3. Engineer features for ML
 * 4. Train Random Forest models
 * 5. Validate predictions
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import { AppConfig } from '../../config/app.js';
import { relativePerformanceCalculator } from '../../ml/relativePerformanceCalculator.js';
import { featureEngineer } from '../../ml/featureEngineer.js';
import { randomForestPipeline } from '../../ml/randomForestPipeline.js';
import * as fs from 'fs';

const logger = createLogger('MLPipelineTraining');

interface TrainingEvent {
    articleId: string;
    ticker: string;
    eventTimestamp: Date;
    hasBusinessFactors: boolean;
    hasStockData: boolean;
}

class MLPipelineTrainer {
    private supabase;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }

    /**
     * Main training pipeline
     */
    async runTrainingPipeline(): Promise<void> {
        logger.info('🚀 Starting ML Pipeline Training');

        try {
            // Step 1: Identify training events
            const events = await this.identifyTrainingEvents();
            logger.info(`📊 Found ${events.length} potential training events`);

            if (events.length < 100) {
                throw new Error('Need at least 100 events with business factors for reliable training');
            }

            // Step 2: Ensure we have benchmark data
            await this.ensureBenchmarkData(events);

            // Step 3: Calculate relative performance for all events
            const relativePerformanceMap = await this.calculateRelativePerformances(events);
            logger.info(`📈 Calculated relative performance for ${relativePerformanceMap.size} events`);

            // Step 4: Create feature vectors
            const featureVectors = await this.createFeatureVectors(events, relativePerformanceMap);
            logger.info(`🔧 Created ${featureVectors.length} feature vectors`);

            // Step 5: Export data for analysis
            await this.exportTrainingData(featureVectors);

            // Step 6: Train Random Forest models
            const modelPerformances = await randomForestPipeline.trainModels(featureVectors);
            logger.info(`🌲 Trained ${modelPerformances.size} Random Forest models`);

            // Step 7: Generate training report
            await this.generateTrainingReport(modelPerformances, featureVectors);

            logger.info('🎉 ML Pipeline Training completed successfully');

        } catch (error) {
            logger.error('❌ ML Pipeline Training failed', error);
            throw error;
        }
    }

    /**
     * Identify articles with both business factors and stock data
     */
    private async identifyTrainingEvents(): Promise<TrainingEvent[]> {
        logger.info('🔍 Identifying training events...');

        // Get articles that have been processed by AI
        const { data: processedArticles, error } = await this.supabase
            .from('ai_responses')
            .select(`
                article_id,
                articles!inner (
                    id,
                    title,
                    published_at,
                    source
                )
            `)
            .eq('success', true)
            .not('structured_output', 'is', null);

        if (error) {
            throw new Error(`Failed to fetch processed articles: ${error.message}`);
        }

        logger.info(`📰 Found ${processedArticles?.length || 0} processed articles`);

        const events: TrainingEvent[] = [];

        for (const record of processedArticles || []) {
            const article = record.articles;
            const articleId = record.article_id;
            const eventTimestamp = new Date(article.published_at);

            // Check if we have business factors
            const { data: businessFactors } = await this.supabase
                .from('business_factors_flat')
                .select('id')
                .eq('article_id', articleId)
                .limit(1);

            const hasBusinessFactors = (businessFactors?.length || 0) > 0;

            // Check if we have stock data around this time
            const hasStockData = await this.checkStockDataAvailability('AAPL', eventTimestamp);

            events.push({
                articleId,
                ticker: 'AAPL', // For now, focusing on Apple
                eventTimestamp,
                hasBusinessFactors,
                hasStockData
            });
        }

        // Filter to events with both business factors and stock data
        const validEvents = events.filter(e => e.hasBusinessFactors && e.hasStockData);

        logger.info('✅ Training event identification complete', {
            totalArticles: events.length,
            withBusinessFactors: events.filter(e => e.hasBusinessFactors).length,
            withStockData: events.filter(e => e.hasStockData).length,
            validForTraining: validEvents.length
        });

        return validEvents;
    }

    /**
     * Check if stock data is available around an event timestamp
     */
    private async checkStockDataAvailability(ticker: string, eventTime: Date): Promise<boolean> {
        const oneDayBefore = new Date(eventTime.getTime() - (24 * 60 * 60 * 1000));
        const oneDayAfter = new Date(eventTime.getTime() + (24 * 60 * 60 * 1000));

        const { data, error } = await this.supabase
            .from('stock_prices')
            .select('id')
            .eq('ticker', ticker)
            .gte('timestamp', oneDayBefore.toISOString())
            .lte('timestamp', oneDayAfter.toISOString())
            .limit(1);

        if (error) {
            logger.error('❌ Error checking stock data availability', error);
            return false;
        }

        return (data?.length || 0) > 0;
    }

    /**
     * Ensure we have benchmark data for all event periods
     */
    private async ensureBenchmarkData(events: TrainingEvent[]): Promise<void> {
        logger.info('📊 Ensuring benchmark data availability...');

        const benchmarkTickers = ['SPY', 'QQQ', 'XLK', 'META', 'GOOGL', 'AMZN', 'NFLX', 'TSLA'];
        const missingData: { ticker: string; periods: Date[] }[] = [];

        for (const ticker of benchmarkTickers) {
            const missingPeriods: Date[] = [];

            for (const event of events) {
                const hasData = await this.checkStockDataAvailability(ticker, event.eventTimestamp);
                if (!hasData) {
                    missingPeriods.push(event.eventTimestamp);
                }
            }

            if (missingPeriods.length > 0) {
                missingData.push({ ticker, periods: missingPeriods });
            }
        }

        if (missingData.length > 0) {
            logger.warn('⚠️ Missing benchmark data detected', {
                missingTickers: missingData.map(m => m.ticker),
                totalMissingPeriods: missingData.reduce((sum, m) => sum + m.periods.length, 0)
            });

            // TODO: Implement automatic data collection for missing periods
            throw new Error('Missing benchmark data - run data collection script first');
        }

        logger.info('✅ All benchmark data available');
    }

    /**
     * Calculate relative performance for all events
     */
    private async calculateRelativePerformances(events: TrainingEvent[]) {
        logger.info('📈 Calculating relative performances...');

        const eventData = events.map(e => ({
            ticker: e.ticker,
            timestamp: e.eventTimestamp,
            eventId: e.articleId
        }));

        return await relativePerformanceCalculator.batchCalculateRelativePerformance(eventData);
    }

    /**
     * Create ML feature vectors
     */
    private async createFeatureVectors(
        events: TrainingEvent[],
        relativePerformanceMap: Map<string, any>
    ) {
        logger.info('🔧 Creating feature vectors...');

        const articleIds = events.map(e => e.articleId);
        return await featureEngineer.batchCreateFeatureVectors(articleIds, relativePerformanceMap);
    }

    /**
     * Export training data to CSV for external analysis
     */
    private async exportTrainingData(featureVectors: any[]): Promise<void> {
        logger.info('💾 Exporting training data...');

        const csv = featureEngineer.exportToCSV(featureVectors);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const exportPath = `/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/training_data_${timestamp}.csv`;

        // Ensure directory exists
        const dir = path.dirname(exportPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(exportPath, csv);

        logger.info('✅ Training data exported', {
            path: exportPath,
            rows: featureVectors.length,
            size: `${Math.round(csv.length / 1024)} KB`
        });
    }

    /**
     * Generate comprehensive training report
     */
    private async generateTrainingReport(
        modelPerformances: Map<string, any>,
        featureVectors: any[]
    ): Promise<void> {
        logger.info('📝 Generating training report...');

        const timestamp = new Date().toISOString();

        const report = {
            generated_at: timestamp,
            summary: {
                total_samples: featureVectors.length,
                total_models: modelPerformances.size,
                avg_accuracy: Array.from(modelPerformances.values())
                    .reduce((sum, perf) => sum + perf.accuracy, 0) / modelPerformances.size,
                best_performing_target: this.getBestPerformingTarget(modelPerformances),
                worst_performing_target: this.getWorstPerformingTarget(modelPerformances)
            },
            model_performances: Array.from(modelPerformances.entries()),
            top_features_across_models: this.getTopFeaturesAcrossModels(modelPerformances),
            data_quality_metrics: this.calculateDataQualityMetrics(featureVectors),
            recommendations: this.generateRecommendations(modelPerformances, featureVectors)
        };

        const reportPath = `/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/training_report_${timestamp.replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Also create human-readable summary
        const summaryPath = reportPath.replace('.json', '_summary.md');
        const markdownSummary = this.generateMarkdownSummary(report);
        fs.writeFileSync(summaryPath, markdownSummary);

        logger.info('✅ Training report generated', {
            jsonReport: reportPath,
            markdownSummary: summaryPath
        });
    }

    /**
     * Get best performing target variable
     */
    private getBestPerformingTarget(performances: Map<string, any>): string {
        let best = { target: '', accuracy: 0 };
        for (const [target, perf] of performances.entries()) {
            if (perf.accuracy > best.accuracy) {
                best = { target, accuracy: perf.accuracy };
            }
        }
        return best.target;
    }

    /**
     * Get worst performing target variable
     */
    private getWorstPerformingTarget(performances: Map<string, any>): string {
        let worst = { target: '', accuracy: 1 };
        for (const [target, perf] of performances.entries()) {
            if (perf.accuracy < worst.accuracy) {
                worst = { target, accuracy: perf.accuracy };
            }
        }
        return worst.target;
    }

    /**
     * Get top features that appear across multiple models
     */
    private getTopFeaturesAcrossModels(performances: Map<string, any>): any[] {
        const featureCounts = new Map<string, { totalImportance: number, modelCount: number }>();

        for (const [target, perf] of performances.entries()) {
            for (const feature of perf.featureImportance.slice(0, 10)) { // Top 10 per model
                const current = featureCounts.get(feature.feature) || { totalImportance: 0, modelCount: 0 };
                current.totalImportance += feature.importance;
                current.modelCount += 1;
                featureCounts.set(feature.feature, current);
            }
        }

        // Calculate average importance across models
        const avgImportances = Array.from(featureCounts.entries())
            .map(([feature, stats]) => ({
                feature,
                avgImportance: stats.totalImportance / stats.modelCount,
                appearanceCount: stats.modelCount
            }))
            .sort((a, b) => b.avgImportance - a.avgImportance);

        return avgImportances.slice(0, 20); // Top 20 features overall
    }

    /**
     * Calculate data quality metrics
     */
    private calculateDataQualityMetrics(vectors: any[]): any {
        if (vectors.length === 0) return {};

        const sampleVector = vectors[0];
        const numFeatures = Object.keys(sampleVector.businessFactors).length +
            Object.keys(sampleVector.articleFeatures).length +
            Object.keys(sampleVector.marketContext).length;

        // Calculate missing data rates
        let totalMissing = 0;
        let totalFields = 0;

        for (const vector of vectors) {
            const allFields = [
                ...Object.values(vector.businessFactors),
                ...Object.values(vector.articleFeatures),
                ...Object.values(vector.marketContext)
            ];

            totalFields += allFields.length;
            totalMissing += allFields.filter(v => v === null || v === undefined || v === 0).length;
        }

        return {
            total_samples: vectors.length,
            total_features: numFeatures,
            missing_data_rate: totalMissing / totalFields,
            date_range: {
                earliest: new Date(Math.min(...vectors.map(v => v.eventTimestamp.getTime()))),
                latest: new Date(Math.max(...vectors.map(v => v.eventTimestamp.getTime())))
            }
        };
    }

    /**
     * Generate actionable recommendations
     */
    private generateRecommendations(performances: Map<string, any>, vectors: any[]): string[] {
        const recommendations: string[] = [];

        const avgAccuracy = Array.from(performances.values())
            .reduce((sum, perf) => sum + perf.accuracy, 0) / performances.size;

        if (avgAccuracy < 0.55) {
            recommendations.push('🚨 LOW ACCURACY: Models performing near random. Check data quality and feature engineering.');
        } else if (avgAccuracy < 0.65) {
            recommendations.push('⚠️ MODERATE ACCURACY: Models show promise but need improvement. Focus on feature selection.');
        } else {
            recommendations.push('✅ GOOD ACCURACY: Models performing well. Consider ensemble methods for further improvement.');
        }

        if (vectors.length < 500) {
            recommendations.push('📈 MORE DATA NEEDED: Consider collecting more historical events for better training.');
        }

        // Check for data imbalance
        const targetDistribution = this.analyzeTargetDistribution(vectors);
        if (targetDistribution.imbalanceRatio > 3) {
            recommendations.push('⚖️ DATA IMBALANCE: Consider stratified sampling or synthetic data generation.');
        }

        return recommendations;
    }

    /**
     * Analyze target variable distribution
     */
    private analyzeTargetDistribution(vectors: any[]): { imbalanceRatio: number } {
        // Check distribution of 1-day alpha predictions
        const alphaValues = vectors.map(v => v.targets.alpha_vs_market_1day);
        const positive = alphaValues.filter(a => a > 0).length;
        const negative = alphaValues.filter(a => a <= 0).length;

        const imbalanceRatio = Math.max(positive, negative) / Math.min(positive, negative);

        return { imbalanceRatio };
    }

    /**
     * Generate human-readable markdown summary
     */
    private generateMarkdownSummary(report: any): string {
        return `# ML Training Report
        
Generated: ${report.generated_at}

## 📊 Summary
- **Total Samples**: ${report.summary.total_samples}
- **Models Trained**: ${report.summary.total_models}
- **Average Accuracy**: ${(report.summary.avg_accuracy * 100).toFixed(1)}%
- **Best Target**: ${report.summary.best_performing_target}
- **Worst Target**: ${report.summary.worst_performing_target}

## 🎯 Model Performance

${Array.from(report.model_performances).map(([target, perf]: [string, any]) => `
### ${target}
- **Accuracy**: ${(perf.accuracy * 100).toFixed(1)}%
- **R²**: ${perf.r2.toFixed(3)}
- **MSE**: ${perf.mse.toFixed(4)}
- **MAE**: ${perf.mae.toFixed(4)}
`).join('\\n')}

## 🔍 Top Features
${report.top_features_across_models.slice(0, 10).map((feature: any, idx: number) =>
            `${idx + 1}. **${feature.feature}** (${(feature.avgImportance * 100).toFixed(1)}% importance)`
        ).join('\\n')}

## 📈 Data Quality
- **Date Range**: ${report.data_quality_metrics.date_range?.earliest} to ${report.data_quality_metrics.date_range?.latest}
- **Missing Data Rate**: ${(report.data_quality_metrics.missing_data_rate * 100).toFixed(1)}%

## 💡 Recommendations
${report.recommendations.map((rec: string) => `- ${rec}`).join('\\n')}
`;
    }
}

// CLI interface
async function main() {
    try {
        const trainer = new MLPipelineTrainer();
        await trainer.runTrainingPipeline();

        console.log('🎉 Training completed successfully!');
        console.log('📊 Check ml_results/ directory for detailed reports');

    } catch (error: any) {
        console.error('❌ Training failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { MLPipelineTrainer };
