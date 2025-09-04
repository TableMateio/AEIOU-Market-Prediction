/**
 * Run Actual ML Pipeline
 * 
 * Works with the REAL ml_training_data structure
 * Exports data → Trains Random Forest → Runs SHAP analysis
 */

import { createLogger } from '../../utils/logger.js';
import { ActualDataFeatureEngineer } from '../../ml/actualDataFeatureEngineer.js';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('ActualMLPipeline');

interface PipelineConfig {
    minDataQuality: number;
    maxRecords: number;
    orientationFilter?: string;
    runTraining: boolean;
    runSHAP: boolean;
    pythonEnv?: string;
}

class ActualMLPipelineRunner {
    private featureEngineer: ActualDataFeatureEngineer;

    constructor() {
        this.featureEngineer = new ActualDataFeatureEngineer();
    }

    /**
     * Run the complete ML pipeline with comprehensive error logging
     */
    async runPipeline(config: Partial<PipelineConfig> = {}): Promise<void> {
        const fullConfig: PipelineConfig = {
            minDataQuality: 0.3,
            maxRecords: 1000,
            orientationFilter: undefined,
            runTraining: true,
            runSHAP: true,
            pythonEnv: 'python',
            ...config
        };

        const startTime = Date.now();
        logger.info('🚀 Starting Actual ML Pipeline', fullConfig);
        logger.info('💻 System Info: Mac Studio M1 Max - Expected runtime: 6-8 minutes');

        const stepTimes: Record<string, number> = {};

        try {
            // Step 1: Load training data
            logger.info('📊 Step 1/6: Loading training data...');
            const step1Start = Date.now();
            const records = await this.loadTrainingData(fullConfig);
            stepTimes.dataLoading = Date.now() - step1Start;
            logger.info(`✅ Step 1 complete (${stepTimes.dataLoading}ms) - ${records.length} records loaded`);

            // Step 2: Analyze data quality
            logger.info('🔍 Step 2/6: Analyzing data quality...');
            const step2Start = Date.now();
            const analysis = this.featureEngineer.analyzeFeatureQuality(records);
            this.logAnalysis(analysis);
            stepTimes.dataAnalysis = Date.now() - step2Start;
            logger.info(`✅ Step 2 complete (${stepTimes.dataAnalysis}ms)`);

            // Step 3: Export to CSV
            logger.info('📄 Step 3/6: Exporting data to CSV...');
            const step3Start = Date.now();
            const csvPath = await this.exportData(records);
            stepTimes.dataExport = Date.now() - step3Start;
            logger.info(`✅ Step 3 complete (${stepTimes.dataExport}ms) - CSV: ${csvPath}`);

            // Step 4: Train Random Forest (Python)
            if (fullConfig.runTraining) {
                logger.info('🌲 Step 4/6: Training Random Forest models...');
                const step4Start = Date.now();
                await this.runRandomForestTraining(csvPath, fullConfig.pythonEnv);
                stepTimes.training = Date.now() - step4Start;
                logger.info(`✅ Step 4 complete (${stepTimes.training}ms)`);
            } else {
                logger.info('⏭️  Step 4/6: Skipping Random Forest training');
            }

            // Step 5: Run SHAP analysis (Python)
            if (fullConfig.runSHAP) {
                logger.info('🔗 Step 5/6: Running SHAP analysis...');
                const step5Start = Date.now();
                await this.runSHAPAnalysis(csvPath, fullConfig.pythonEnv);
                stepTimes.shap = Date.now() - step5Start;
                logger.info(`✅ Step 5 complete (${stepTimes.shap}ms)`);
            } else {
                logger.info('⏭️  Step 5/6: Skipping SHAP analysis');
            }

            // Step 6: Generate summary report
            logger.info('📋 Step 6/6: Generating summary report...');
            const step6Start = Date.now();
            await this.generateSummaryReport(records, analysis, csvPath);
            stepTimes.reporting = Date.now() - step6Start;
            logger.info(`✅ Step 6 complete (${stepTimes.reporting}ms)`);

            const totalTime = Date.now() - startTime;
            logger.info('🎉 ML Pipeline completed successfully!', {
                totalTime: `${Math.round(totalTime / 1000)}s`,
                stepTimes: Object.entries(stepTimes).map(([step, time]) =>
                    `${step}: ${Math.round(time / 1000)}s`
                ).join(', ')
            });

        } catch (error: any) {
            const totalTime = Date.now() - startTime;
            logger.error('❌ ML Pipeline failed', {
                error: error.message,
                stack: error.stack,
                timeToFailure: `${Math.round(totalTime / 1000)}s`,
                completedSteps: Object.keys(stepTimes)
            });
            throw error;
        }
    }

    /**
     * Load training data with filters
     */
    private async loadTrainingData(config: PipelineConfig) {
        logger.info('📊 Loading training data...');

        const records = await this.featureEngineer.loadTrainingData({
            minDataQuality: config.minDataQuality,
            completedOnly: false, // Include pending records since processing_status might not be updated
            orientation: config.orientationFilter,
            limit: config.maxRecords
        });

        if (records.length === 0) {
            throw new Error('No training data found - check your filters');
        }

        // Log orientation distribution
        const orientationDist: Record<string, number> = {};
        records.forEach(r => {
            const orientation = r.inputFeatures.event_orientation;
            orientationDist[orientation] = (orientationDist[orientation] || 0) + 1;
        });

        logger.info('✅ Training data loaded', {
            totalRecords: records.length,
            orientationDistribution: orientationDist,
            dateRange: {
                earliest: records[records.length - 1]?.event_timestamp.toISOString().split('T')[0],
                latest: records[0]?.event_timestamp.toISOString().split('T')[0]
            }
        });

        return records;
    }

    /**
     * Export data to CSV
     */
    private async exportData(records: any[]): Promise<string> {
        logger.info('📄 Exporting data to CSV...');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data';

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const csvPath = path.join(outputDir, `actual_ml_data_${timestamp}.csv`);

        await this.featureEngineer.exportToCSV(records, csvPath);

        return csvPath;
    }

    /**
     * Run Random Forest training in Python
     */
    private async runRandomForestTraining(csvPath: string, pythonEnv: string): Promise<void> {
        logger.info('🌲 Running Random Forest training...');
        logger.info(`   📁 CSV Path: ${csvPath}`);
        logger.info(`   🐍 Python Environment: ${pythonEnv}`);

        const pythonDir = '/Users/scottbergman/Dropbox/Projects/AEIOU/python';
        const command = `cd ${pythonDir} && ${pythonEnv} train_random_forest.py ${csvPath}`;

        logger.info(`   🔧 Command: ${command}`);

        try {
            const { stdout, stderr } = await execAsync(command, {
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            // Log Python output for debugging
            if (stdout) {
                logger.info('🐍 Python stdout:', stdout.split('\n').slice(0, 20).join('\n')); // First 20 lines
            }

            if (stderr) {
                logger.warn('🐍 Python stderr:', stderr);
            }

            // Parse JSON results if present
            const jsonStart = stdout.indexOf('JSON_RESULTS_START');
            const jsonEnd = stdout.indexOf('JSON_RESULTS_END');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonStr = stdout.substring(jsonStart + 18, jsonEnd).trim();
                try {
                    const results = JSON.parse(jsonStr);
                    logger.info('🎯 Training Results', {
                        modelsTraind: results.summary?.models_trained || 0,
                        avgAccuracy: results.summary?.avg_accuracy || 0,
                        bestModel: results.summary?.best_model?.target || 'unknown',
                        topFeatures: results.summary?.top_features?.slice(0, 5) || []
                    });
                } catch (parseError) {
                    logger.warn('Could not parse training results JSON', parseError);
                }
            } else {
                logger.warn('No JSON results found in Python output - check for errors');
            }

            logger.info('✅ Random Forest training completed');

        } catch (error: any) {
            logger.error('❌ Random Forest training failed', {
                error: error.message,
                command,
                pythonDir,
                csvExists: require('fs').existsSync(csvPath)
            });

            // Additional diagnostic info
            try {
                const fs = require('fs');
                const pythonScriptExists = fs.existsSync(`${pythonDir}/train_random_forest.py`);
                const requirementsExists = fs.existsSync(`${pythonDir}/requirements.txt`);

                logger.error('🔍 Diagnostic Info', {
                    pythonScriptExists,
                    requirementsExists,
                    csvPath,
                    csvExists: fs.existsSync(csvPath)
                });
            } catch (diagError) {
                logger.warn('Could not gather diagnostic info', diagError);
            }

            throw error;
        }
    }

    /**
     * Run SHAP analysis in Python
     */
    private async runSHAPAnalysis(csvPath: string, pythonEnv: string): Promise<void> {
        logger.info('🔍 Running SHAP analysis...');

        const pythonDir = '/Users/scottbergman/Dropbox/Projects/AEIOU/python';
        const modelsDir = path.join(pythonDir, 'models');
        const command = `cd ${pythonDir} && ${pythonEnv} shap_analysis.py ${csvPath} ${modelsDir}`;

        try {
            const { stdout, stderr } = await execAsync(command, {
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            if (stderr) {
                logger.warn('SHAP analysis warnings:', stderr);
            }

            // Parse SHAP results if present
            const jsonStart = stdout.indexOf('JSON_SHAP_RESULTS_START');
            const jsonEnd = stdout.indexOf('JSON_SHAP_RESULTS_END');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonStr = stdout.substring(jsonStart + 23, jsonEnd).trim();
                try {
                    const results = JSON.parse(jsonStr);
                    logger.info('🔗 SHAP Results', {
                        topInteractions: results.top_interactions_overall?.slice(0, 3).map((i: any) =>
                            `${i.feature_1} × ${i.feature_2}`
                        ) || [],
                        orientationInsights: Object.keys(results.orientation_insights || {})
                    });
                } catch (parseError) {
                    logger.warn('Could not parse SHAP results JSON');
                }
            }

            logger.info('✅ SHAP analysis completed');

        } catch (error: any) {
            logger.error('❌ SHAP analysis failed:', error.message);
            throw error;
        }
    }

    /**
     * Log feature analysis results
     */
    private logAnalysis(analysis: any): void {
        logger.info('🔍 Data Quality Analysis');

        // Top input features
        const topFeatures = analysis.inputFeatures.slice(0, 10);
        logger.info('🏆 Top Input Features:',
            topFeatures.map((f: any) => `${f.feature} (${f.completeness.toFixed(2)} complete, ${f.importance.toFixed(3)} importance)`)
        );

        // Target variable analysis
        const topTargets = analysis.targetVariables.slice(0, 5);
        logger.info('🎯 Target Variables:',
            topTargets.map((t: any) => `${t.target}: μ=${t.mean.toFixed(4)}, σ=${t.std.toFixed(4)}, ${Math.round(t.completeness * 100)}% complete`)
        );
    }

    /**
     * Generate summary report
     */
    private async generateSummaryReport(records: any[], analysis: any, csvPath: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const reportDir = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results';

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const report = {
            generated_at: timestamp,
            pipeline_version: 'actual_data_v1.0',

            data_summary: {
                total_records: records.length,
                csv_export: csvPath,
                date_range: {
                    earliest: records[records.length - 1]?.event_timestamp,
                    latest: records[0]?.event_timestamp
                }
            },

            feature_analysis: analysis,

            orientation_distribution: this.calculateOrientationDistribution(records),
            event_type_distribution: this.calculateEventTypeDistribution(records),

            next_steps: [
                'Review training results in ml_results/ directory',
                'Examine SHAP interaction plots for factor combinations',
                'Test predictions on new articles using trained models',
                'Iterate on feature engineering based on importance scores'
            ]
        };

        const reportPath = path.join(reportDir, `pipeline_report_${timestamp.replace(/[:.]/g, '-')}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Generate markdown summary
        const markdownPath = reportPath.replace('.json', '.md');
        const markdown = this.generateMarkdownSummary(report);
        fs.writeFileSync(markdownPath, markdown);

        logger.info('📋 Summary report generated', {
            jsonReport: reportPath,
            markdownReport: markdownPath
        });
    }

    /**
     * Calculate orientation distribution
     */
    private calculateOrientationDistribution(records: any[]): Record<string, number> {
        const dist: Record<string, number> = {};
        records.forEach(r => {
            const orientation = r.inputFeatures.event_orientation;
            dist[orientation] = (dist[orientation] || 0) + 1;
        });
        return dist;
    }

    /**
     * Calculate event type distribution
     */
    private calculateEventTypeDistribution(records: any[]): Record<string, number> {
        const dist: Record<string, number> = {};
        records.forEach(r => {
            const eventType = r.inputFeatures.event_type;
            dist[eventType] = (dist[eventType] || 0) + 1;
        });
        return dist;
    }

    /**
     * Generate markdown summary
     */
    private generateMarkdownSummary(report: any): string {
        return `# AEIOU ML Pipeline Results
        
Generated: ${report.generated_at}

## 📊 **Data Summary**
- **Total Records**: ${report.data_summary.total_records}
- **Date Range**: ${report.data_summary.date_range.earliest?.split('T')[0]} to ${report.data_summary.date_range.latest?.split('T')[0]}
- **CSV Export**: ${report.data_summary.csv_export}

## 🎯 **Orientation Distribution**
${Object.entries(report.orientation_distribution).map(([orientation, count]) =>
            `- **${orientation}**: ${count} (${Math.round((count as number) / report.data_summary.total_records * 100)}%)`
        ).join('\\n')}

## 🏆 **Top Input Features**
${report.feature_analysis.inputFeatures.slice(0, 10).map((f: any, idx: number) =>
            `${idx + 1}. **${f.feature}** - ${Math.round(f.completeness * 100)}% complete, ${f.importance.toFixed(3)} importance`
        ).join('\\n')}

## 🎯 **Target Variables**
${report.feature_analysis.targetVariables.slice(0, 8).map((t: any) =>
            `- **${t.target}**: μ=${t.mean.toFixed(4)}, σ=${t.std.toFixed(4)} (${Math.round(t.completeness * 100)}% complete)`
        ).join('\\n')}

## 🚀 **Next Steps**
${report.next_steps.map((step: string) => `- ${step}`).join('\\n')}

---

*This pipeline uses your actual ml_training_data with proper input/target separation.*
*Check ml_results/ directory for detailed Random Forest and SHAP analysis results.*
`;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);

    const config: Partial<PipelineConfig> = {
        minDataQuality: args.includes('--low-quality') ? 0.1 : 0.3,
        maxRecords: parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '1000'),
        orientationFilter: args.find(arg => arg.startsWith('--orientation='))?.split('=')[1],
        runTraining: !args.includes('--no-training'),
        runSHAP: !args.includes('--no-shap'),
        pythonEnv: args.find(arg => arg.startsWith('--python='))?.split('=')[1] || 'python'
    };

    try {
        const runner = new ActualMLPipelineRunner();
        await runner.runPipeline(config);

        console.log('🎉 ML Pipeline completed successfully!');
        console.log('📁 Check ml_results/ directory for detailed analysis');
        console.log('🔍 Check ml_data/ directory for exported CSV');

    } catch (error: any) {
        console.error('❌ Pipeline failed:', error.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { ActualMLPipelineRunner };
