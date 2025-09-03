/**
 * Random Forest ML Pipeline
 * 
 * Trains Random Forest models to predict relative stock performance
 * using business factors and market context
 */

import { createLogger } from '../utils/logger.js';
import { MLFeatureVector } from './featureEngineer.js';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('RandomForestPipeline');

export interface ModelPerformance {
    target: string;
    accuracy: number;              // Directional accuracy (up/down)
    mse: number;                  // Mean squared error
    mae: number;                  // Mean absolute error
    r2: number;                   // R-squared
    featureImportance: FeatureImportance[];
    confusionMatrix?: number[][];  // For classification
}

export interface FeatureImportance {
    feature: string;
    importance: number;
    rank: number;
}

export interface ModelPrediction {
    eventId: string;
    target: string;
    predicted: number;
    actual: number;
    confidence: number;
    prediction_date: Date;
}

export interface TrainingConfig {
    // Data split
    trainingMonths: number;        // 8 months for training
    validationMonths: number;      // 2 months for validation

    // Model parameters
    nEstimators: number;           // Number of trees (default: 100)
    maxDepth: number;             // Max tree depth (default: 10)
    minSamplesSplit: number;      // Min samples to split (default: 5)
    minSamplesLeaf: number;       // Min samples per leaf (default: 2)
    maxFeatures: string;          // Features per tree ('sqrt', 'log2', or number)

    // Feature selection
    minFeatureImportance: number;  // Drop features below this threshold
    correlationThreshold: number;  // Drop highly correlated features

    // Validation
    crossValidationFolds: number;  // K-fold CV (default: 5)
    randomState: number;           // For reproducibility
}

export class RandomForestPipeline {
    private config: TrainingConfig;
    private models: Map<string, any> = new Map(); // Will store trained models
    private featureImportanceHistory: Map<string, FeatureImportance[]> = new Map();

    constructor(config?: Partial<TrainingConfig>) {
        this.config = {
            trainingMonths: 8,
            validationMonths: 2,
            nEstimators: 100,
            maxDepth: 10,
            minSamplesSplit: 5,
            minSamplesLeaf: 2,
            maxFeatures: 'sqrt',
            minFeatureImportance: 0.001,
            correlationThreshold: 0.95,
            crossValidationFolds: 5,
            randomState: 42,
            ...config
        };

        logger.info('🌲 Random Forest Pipeline initialized', this.config);
    }

    /**
     * Train models for all target variables
     * This is your main training function
     */
    async trainModels(featureVectors: MLFeatureVector[]): Promise<Map<string, ModelPerformance>> {
        logger.info('🚀 Starting Random Forest training', {
            sampleCount: featureVectors.length
        });

        if (featureVectors.length < 100) {
            throw new Error('Need at least 100 samples for reliable training');
        }

        // Split data chronologically (8 months train, 2 months test)
        const { trainData, testData } = this.splitDataChronologically(featureVectors);

        logger.info('📊 Data split complete', {
            trainSamples: trainData.length,
            testSamples: testData.length
        });

        // Get all target variables
        const targets = this.getTargetVariables(featureVectors[0]);

        const modelPerformances = new Map<string, ModelPerformance>();

        // Train separate model for each target
        for (const target of targets) {
            try {
                logger.info(`🌲 Training model for target: ${target}`);

                const performance = await this.trainSingleModel(
                    target,
                    trainData,
                    testData
                );

                modelPerformances.set(target, performance);

                logger.info(`✅ Model trained for ${target}`, {
                    accuracy: performance.accuracy.toFixed(3),
                    r2: performance.r2.toFixed(3),
                    topFeatures: performance.featureImportance.slice(0, 5).map(f => f.feature)
                });

            } catch (error) {
                logger.error(`❌ Error training model for ${target}`, error);
            }
        }

        // Save training results
        await this.saveTrainingResults(modelPerformances);

        return modelPerformances;
    }

    /**
     * Split data chronologically (temporal validation)
     */
    private splitDataChronologically(vectors: MLFeatureVector[]): {
        trainData: MLFeatureVector[],
        testData: MLFeatureVector[]
    } {
        // Sort by timestamp
        const sorted = vectors.sort((a, b) =>
            a.eventTimestamp.getTime() - b.eventTimestamp.getTime()
        );

        const totalMonths = this.config.trainingMonths + this.config.validationMonths;
        const trainRatio = this.config.trainingMonths / totalMonths;
        const splitIndex = Math.floor(sorted.length * trainRatio);

        return {
            trainData: sorted.slice(0, splitIndex),
            testData: sorted.slice(splitIndex)
        };
    }

    /**
     * Get all target variable names
     */
    private getTargetVariables(sampleVector: MLFeatureVector): string[] {
        return Object.keys(sampleVector.targets);
    }

    /**
     * Train a single Random Forest model for one target
     */
    private async trainSingleModel(
        target: string,
        trainData: MLFeatureVector[],
        testData: MLFeatureVector[]
    ): Promise<ModelPerformance> {

        // Extract features and target values
        const trainFeatures = trainData.map(v => this.vectorToFeatureArray(v));
        const trainTargets = trainData.map(v => (v.targets as any)[target]);

        const testFeatures = testData.map(v => this.vectorToFeatureArray(v));
        const testTargets = testData.map(v => (v.targets as any)[target]);

        // Feature selection
        const { selectedFeatures, featureNames } = this.selectFeatures(
            trainFeatures,
            trainTargets,
            this.getFeatureNames(trainData[0])
        );

        logger.info(`🔍 Feature selection complete for ${target}`, {
            originalFeatures: trainFeatures[0].length,
            selectedFeatures: selectedFeatures[0].length
        });

        // Train Random Forest (pseudo-code - would use Python scikit-learn)
        const modelResults = await this.trainRandomForestModel({
            trainFeatures: selectedFeatures,
            trainTargets,
            testFeatures: testFeatures.map(f => this.selectFeatureSubset(f, featureNames)),
            testTargets,
            config: this.config,
            featureNames
        });

        return {
            target,
            accuracy: modelResults.accuracy,
            mse: modelResults.mse,
            mae: modelResults.mae,
            r2: modelResults.r2,
            featureImportance: modelResults.featureImportance,
            confusionMatrix: modelResults.confusionMatrix
        };
    }

    /**
     * Convert feature vector to flat array for ML
     */
    private vectorToFeatureArray(vector: MLFeatureVector): number[] {
        const features: number[] = [];

        // Business factors (numerical)
        features.push(
            vector.businessFactors.total_causal_steps,
            vector.businessFactors.avg_factor_magnitude,
            vector.businessFactors.max_factor_magnitude,
            vector.businessFactors.financial_factors_count,
            vector.businessFactors.product_factors_count,
            vector.businessFactors.market_factors_count,
            vector.businessFactors.avg_execution_risk,
            vector.businessFactors.avg_competitive_risk,
            vector.businessFactors.avg_timeline_realism,
            vector.businessFactors.avg_fundamental_strength,
            vector.businessFactors.avg_business_impact_likelihood,
            vector.businessFactors.avg_market_intensity,
            vector.businessFactors.avg_hope_vs_fear,
            vector.businessFactors.avg_narrative_strength,
            vector.businessFactors.avg_consensus_vs_division,
            vector.businessFactors.avg_surprise_vs_anticipated,
            vector.businessFactors.avg_optimism_bias,
            vector.businessFactors.avg_risk_awareness,
            vector.businessFactors.avg_correction_potential,
            vector.businessFactors.avg_causal_certainty,
            vector.businessFactors.avg_logical_directness,
            vector.businessFactors.avg_regime_alignment,
            vector.businessFactors.evidence_explicit_pct,
            vector.businessFactors.evidence_implied_pct,
            vector.businessFactors.cognitive_bias_count,
            vector.businessFactors.emotional_intensity_score,
            vector.businessFactors.entity_count,
            vector.businessFactors.avg_factor_description_length,
            vector.businessFactors.total_evidence_citations
        );

        // Business factors (categorical - one-hot encoded)
        features.push(
            vector.businessFactors.has_revenue_factors ? 1 : 0,
            vector.businessFactors.has_product_factors ? 1 : 0,
            vector.businessFactors.has_competitive_factors ? 1 : 0,
            vector.businessFactors.has_regulatory_factors ? 1 : 0,
            vector.businessFactors.has_partnership_factors ? 1 : 0
        );

        // Event type one-hot encoding (top 10 event types)
        const eventTypes = ['Product_Announcement', 'Earnings_Report', 'Partnership', 'Acquisition', 'Regulatory'];
        for (const eventType of eventTypes) {
            features.push(vector.businessFactors.event_type === eventType ? 1 : 0);
        }

        // Article features
        features.push(
            vector.articleFeatures.source_credibility,
            vector.articleFeatures.author_credibility,
            vector.articleFeatures.publication_hour,
            vector.articleFeatures.publication_day_of_week,
            vector.articleFeatures.days_since_last_major_event,
            vector.articleFeatures.article_length,
            vector.articleFeatures.headline_sentiment,
            vector.articleFeatures.apple_relevance_score
        );

        // Market context
        features.push(
            vector.marketContext.trading_hours ? 1 : 0,
            vector.marketContext.pre_market_movement,
            vector.marketContext.sector_momentum,
            vector.marketContext.vix_level,
            vector.marketContext.earnings_season ? 1 : 0
        );

        // Market regime one-hot
        features.push(
            vector.marketContext.market_regime === 'bull' ? 1 : 0,
            vector.marketContext.market_regime === 'bear' ? 1 : 0,
            vector.marketContext.market_regime === 'sideways' ? 1 : 0
        );

        return features;
    }

    /**
     * Get feature names corresponding to vectorToFeatureArray
     */
    private getFeatureNames(vector: MLFeatureVector): string[] {
        return [
            // Business factors
            'total_causal_steps', 'avg_factor_magnitude', 'max_factor_magnitude',
            'financial_factors_count', 'product_factors_count', 'market_factors_count',
            'avg_execution_risk', 'avg_competitive_risk', 'avg_timeline_realism',
            'avg_fundamental_strength', 'avg_business_impact_likelihood',
            'avg_market_intensity', 'avg_hope_vs_fear', 'avg_narrative_strength',
            'avg_consensus_vs_division', 'avg_surprise_vs_anticipated',
            'avg_optimism_bias', 'avg_risk_awareness', 'avg_correction_potential',
            'avg_causal_certainty', 'avg_logical_directness', 'avg_regime_alignment',
            'evidence_explicit_pct', 'evidence_implied_pct',
            'cognitive_bias_count', 'emotional_intensity_score', 'entity_count',
            'avg_factor_description_length', 'total_evidence_citations',

            // Categorical business factors
            'has_revenue_factors', 'has_product_factors', 'has_competitive_factors',
            'has_regulatory_factors', 'has_partnership_factors',

            // Event types
            'event_Product_Announcement', 'event_Earnings_Report', 'event_Partnership',
            'event_Acquisition', 'event_Regulatory',

            // Article features
            'source_credibility', 'author_credibility', 'publication_hour',
            'publication_day_of_week', 'days_since_last_major_event',
            'article_length', 'headline_sentiment', 'apple_relevance_score',

            // Market context
            'trading_hours', 'pre_market_movement', 'sector_momentum',
            'vix_level', 'earnings_season',
            'market_bull', 'market_bear', 'market_sideways'
        ];
    }

    /**
     * Feature selection using correlation and importance thresholds
     */
    private selectFeatures(
        features: number[][],
        targets: number[],
        featureNames: string[]
    ): { selectedFeatures: number[][], featureNames: string[] } {

        // Remove features with low variance
        const variances = this.calculateFeatureVariances(features);
        const highVarianceIndices = variances
            .map((variance, index) => ({ variance, index }))
            .filter(item => item.variance > 0.01) // Remove near-constant features
            .map(item => item.index);

        // Remove highly correlated features
        const correlationMatrix = this.calculateCorrelationMatrix(features, highVarianceIndices);
        const lowCorrelationIndices = this.removeLowCorrelationFeatures(
            correlationMatrix,
            highVarianceIndices,
            this.config.correlationThreshold
        );

        // Select features and names
        const selectedFeatures = features.map(row =>
            lowCorrelationIndices.map(idx => row[idx])
        );
        const selectedFeatureNames = lowCorrelationIndices.map(idx => featureNames[idx]);

        logger.info('🎯 Feature selection results', {
            originalFeatures: featureNames.length,
            afterVarianceFilter: highVarianceIndices.length,
            afterCorrelationFilter: selectedFeatureNames.length,
            selectedFeatures: selectedFeatureNames
        });

        return {
            selectedFeatures,
            featureNames: selectedFeatureNames
        };
    }

    /**
     * Calculate feature variances
     */
    private calculateFeatureVariances(features: number[][]): number[] {
        const numFeatures = features[0].length;
        const variances: number[] = [];

        for (let featureIdx = 0; featureIdx < numFeatures; featureIdx++) {
            const values = features.map(row => row[featureIdx]);
            const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            variances.push(variance);
        }

        return variances;
    }

    /**
     * Calculate correlation matrix
     */
    private calculateCorrelationMatrix(features: number[][], featureIndices: number[]): number[][] {
        const numFeatures = featureIndices.length;
        const correlations: number[][] = [];

        for (let i = 0; i < numFeatures; i++) {
            correlations[i] = [];
            for (let j = 0; j < numFeatures; j++) {
                if (i === j) {
                    correlations[i][j] = 1.0;
                } else {
                    const correlation = this.calculateCorrelation(
                        features.map(row => row[featureIndices[i]]),
                        features.map(row => row[featureIndices[j]])
                    );
                    correlations[i][j] = correlation;
                }
            }
        }

        return correlations;
    }

    /**
     * Calculate Pearson correlation between two feature arrays
     */
    private calculateCorrelation(x: number[], y: number[]): number {
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, idx) => sum + val * y[idx], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Remove highly correlated features
     */
    private removeLowCorrelationFeatures(
        correlationMatrix: number[][],
        featureIndices: number[],
        threshold: number
    ): number[] {
        const toRemove = new Set<number>();

        for (let i = 0; i < correlationMatrix.length; i++) {
            for (let j = i + 1; j < correlationMatrix[i].length; j++) {
                if (Math.abs(correlationMatrix[i][j]) > threshold) {
                    // Remove the feature with higher index (arbitrary choice)
                    toRemove.add(Math.max(i, j));
                }
            }
        }

        return featureIndices.filter((_, idx) => !toRemove.has(idx));
    }

    /**
     * Train Random Forest model (interface to Python/R)
     * In practice, this would call a Python script using scikit-learn
     */
    private async trainRandomForestModel(params: {
        trainFeatures: number[][];
        trainTargets: number[];
        testFeatures: number[][];
        testTargets: number[];
        config: TrainingConfig;
        featureNames: string[];
    }): Promise<ModelPerformance> {

        // This is a placeholder - in reality you'd:
        // 1. Export data to CSV
        // 2. Call Python script with scikit-learn RandomForestRegressor
        // 3. Import results back

        logger.info('🐍 Would call Python Random Forest training script here');

        // Generate Python training script
        const pythonScript = this.generatePythonTrainingScript(params);
        const scriptPath = `/tmp/train_${params.featureNames[0]}_${Date.now()}.py`;
        fs.writeFileSync(scriptPath, pythonScript);

        // For now, return mock performance metrics
        // In real implementation, you'd execute the Python script and parse results
        const mockPerformance: ModelPerformance = {
            target: params.featureNames[0],
            accuracy: 0.65,  // 65% directional accuracy
            mse: 0.05,
            mae: 0.03,
            r2: 0.45,
            featureImportance: params.featureNames.map((name, idx) => ({
                feature: name,
                importance: Math.random() * 0.1, // Mock importance
                rank: idx + 1
            })).sort((a, b) => b.importance - a.importance)
        };

        logger.info('✅ Mock training complete', mockPerformance);
        return mockPerformance;
    }

    /**
     * Generate Python script for Random Forest training
     */
    private generatePythonTrainingScript(params: any): string {
        return `
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import cross_val_score
import json
import sys

# Load data (would be passed from Node.js)
train_features = ${JSON.stringify(params.trainFeatures)}
train_targets = ${JSON.stringify(params.trainTargets)}
test_features = ${JSON.stringify(params.testFeatures)}
test_targets = ${JSON.stringify(params.testTargets)}
feature_names = ${JSON.stringify(params.featureNames)}

# Convert to numpy arrays
X_train = np.array(train_features)
y_train = np.array(train_targets)
X_test = np.array(test_features)
y_test = np.array(test_targets)

# Train Random Forest
rf = RandomForestRegressor(
    n_estimators=${params.config.nEstimators},
    max_depth=${params.config.maxDepth},
    min_samples_split=${params.config.minSamplesSplit},
    min_samples_leaf=${params.config.minSamplesLeaf},
    max_features='${params.config.maxFeatures}',
    random_state=${params.config.randomState},
    n_jobs=-1
)

rf.fit(X_train, y_train)

# Make predictions
y_pred = rf.predict(X_test)

# Calculate metrics
mse = mean_squared_error(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

# Directional accuracy (for returns)
directional_accuracy = np.mean(np.sign(y_test) == np.sign(y_pred))

# Feature importance
feature_importance = [
    {"feature": feature_names[i], "importance": importance, "rank": i+1}
    for i, importance in enumerate(rf.feature_importances_)
]
feature_importance.sort(key=lambda x: x["importance"], reverse=True)

# Cross-validation score
cv_scores = cross_val_score(rf, X_train, y_train, cv=${params.config.crossValidationFolds})

# Output results as JSON
results = {
    "accuracy": directional_accuracy,
    "mse": mse,
    "mae": mae,
    "r2": r2,
    "cv_mean": cv_scores.mean(),
    "cv_std": cv_scores.std(),
    "feature_importance": feature_importance,
    "predictions": y_pred.tolist(),
    "actuals": y_test.tolist()
}

print(json.dumps(results))
`;
    }

    /**
     * Select subset of features based on selected indices
     */
    private selectFeatureSubset(features: number[], selectedNames: string[]): number[] {
        // This would map selected feature names back to indices
        // For now, return first N features
        return features.slice(0, selectedNames.length);
    }

    /**
     * Save training results to disk
     */
    private async saveTrainingResults(performances: Map<string, ModelPerformance>): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsDir = `/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results`;

        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        const resultsFile = path.join(resultsDir, `training_results_${timestamp}.json`);

        const results = {
            timestamp: new Date().toISOString(),
            config: this.config,
            modelPerformances: Array.from(performances.entries()).map(([target, perf]) => ({
                target,
                ...perf
            }))
        };

        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

        logger.info('💾 Training results saved', {
            file: resultsFile,
            modelCount: performances.size
        });
    }

    /**
     * Make predictions on new data
     */
    async predict(featureVectors: MLFeatureVector[]): Promise<ModelPrediction[]> {
        logger.info('🔮 Making predictions', { sampleCount: featureVectors.length });

        const predictions: ModelPrediction[] = [];

        for (const vector of featureVectors) {
            const features = this.vectorToFeatureArray(vector);

            // For each target variable
            for (const [target, model] of this.models.entries()) {
                // Mock prediction - in reality would use trained model
                const predicted = Math.random() * 0.1 - 0.05; // Random alpha between -5% and +5%
                const actual = (vector.targets as any)[target];

                predictions.push({
                    eventId: vector.eventId,
                    target,
                    predicted,
                    actual,
                    confidence: 0.7, // Mock confidence
                    prediction_date: new Date()
                });
            }
        }

        return predictions;
    }
}

export const randomForestPipeline = new RandomForestPipeline();
