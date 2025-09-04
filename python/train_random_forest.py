#!/usr/bin/env python3
"""
Random Forest Training Script for AEIOU
Trains Random Forest models to predict relative stock performance
"""

import pandas as pd
import numpy as np
import json
import sys
import os
from typing import Dict, List, Tuple, Any
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# ML Libraries
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, accuracy_score
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import SelectKBest, f_regression, mutual_info_regression
import joblib

# Visualization (optional)
try:
    import matplotlib.pyplot as plt
    import seaborn as sns
    HAS_PLOTTING = True
except ImportError:
    HAS_PLOTTING = False

class AEIOURandomForestTrainer:
    """
    Random Forest trainer specifically designed for AEIOU's business factor correlation
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.models = {}
        self.scalers = {}
        self.feature_selectors = {}
        self.results = {}
        
        print(f"🌲 AEIOU Random Forest Trainer initialized")
        print(f"📊 Config: {json.dumps(config, indent=2)}")
    
    def load_data(self, csv_path: str) -> pd.DataFrame:
        """Load feature vectors from CSV"""
        print(f"📂 Loading data from {csv_path}")
        
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(df)} samples with {len(df.columns)} features")
        
        # Basic data validation - handle different timestamp column names
        timestamp_col = 'event_timestamp' if 'event_timestamp' in df.columns else 'eventTimestamp'
        if timestamp_col in df.columns:
            print(f"📅 Date range: {df[timestamp_col].min()} to {df[timestamp_col].max()}")
        
        print(f"🎯 Target variables: {[col for col in df.columns if col.startswith('alpha_')]}")
        
        return df
    
    def split_data_chronologically(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Split data chronologically for temporal validation"""
        
        # Handle different timestamp column names
        timestamp_col = 'event_timestamp' if 'event_timestamp' in df.columns else 'eventTimestamp'
        
        if timestamp_col not in df.columns:
            print(f"⚠️  No timestamp column found, using sequential split instead")
            train_ratio = 0.8
            split_idx = int(len(df) * train_ratio)
            train_df = df.iloc[:split_idx].copy()
            test_df = df.iloc[split_idx:].copy()
        else:
            df_sorted = df.sort_values(timestamp_col)
            
            train_months = self.config.get('training_months', 8)
            total_months = train_months + self.config.get('validation_months', 2)
            train_ratio = train_months / total_months
            
            split_idx = int(len(df_sorted) * train_ratio)
            
            train_df = df_sorted.iloc[:split_idx].copy()
            test_df = df_sorted.iloc[split_idx:].copy()
        
        print(f"📊 Chronological split:")
        if timestamp_col in df.columns:
            print(f"   📈 Training: {len(train_df)} samples ({train_df[timestamp_col].min()} to {train_df[timestamp_col].max()})")
            print(f"   🧪 Testing: {len(test_df)} samples ({test_df[timestamp_col].min()} to {test_df[timestamp_col].max()})")
        else:
            print(f"   📈 Training: {len(train_df)} samples")
            print(f"   🧪 Testing: {len(test_df)} samples")
        
        return train_df, test_df
    
    def get_target_variables(self, df: pd.DataFrame) -> List[str]:
        """Get all target variable columns from actual ml_training_data structure"""
        targets = [col for col in df.columns if col.startswith('alpha_vs_')]
        targets.extend([col for col in df.columns if col.startswith('abs_change_') and col.endswith('_pct')])
        
        # Add populated target variables (exclude known empty ones)
        populated_targets = [
            'price_discovery_speed_minutes',
            'max_move_within_1hour_pct', 
            'reversal_strength_pct',
            'attention_half_life_hours',
            'spy_momentum_30day_pct',
            'qqq_momentum_30day_pct'
        ]
        
        # OPTIMIZATION: Exclude known empty columns
        empty_targets = [
            'volume_relative_20day',
            'volume_burst_first_hour',
            'volatility_shock_ratio',
            'volume_1hour_before_relative',
            'volume_1hour_after_relative',
            'volatility_1hour_before',
            'volatility_1hour_after',
            'volatility_1day_before', 
            'volatility_1day_after'
        ]
        
        for target in populated_targets:
            if target in df.columns and target not in targets and target not in empty_targets:
                targets.append(target)
        
        # Remove empty columns from final list
        targets = [t for t in targets if t not in empty_targets]
        
        print(f"🎯 Found {len(targets)} populated target variables")
        print(f"⚡ Excluded {len(empty_targets)} empty target columns")
        
        return targets
    
    def get_feature_columns(self, df: pd.DataFrame) -> List[str]:
        """Get all INPUT feature columns from COMPLETE ml_training_data structure (218 columns)"""
        
        # INPUT FEATURES (what we predict FROM) - based on actual schema
        input_feature_patterns = [
            # Business factor core (12 fields)
            'factor_name', 'factor_category', 'factor_magnitude', 'factor_movement',
            'factor_synonyms', 'factor_unit', 'factor_raw_value', 'factor_delta',
            'factor_description', 'factor_orientation', 'factor_about_time_days', 'factor_effect_horizon_days',
            
            # Causal analysis (4 fields)
            'causal_certainty', 'logical_directness', 'regime_alignment', 'causal_step',
            
            # Event context (8 fields)  
            'event_type', 'event_description', 'event_trigger', 'event_entities',
            'event_scope', 'event_orientation', 'event_time_horizon_days', 'event_tags', 'event_quoted_people',
            
            # Article metadata (14 fields)
            'article_headline', 'article_url', 'article_authors', 'article_source',
            'article_source_credibility', 'article_author_credibility', 'article_publisher_credibility',
            'article_audience_split', 'article_time_lag_days', 'article_market_regime',
            'article_apple_relevance_score', 'article_ticker_relevance_score',
            'article_published_year', 'article_published_month', 'article_published_day_of_week',
            
            # Evidence & sources (3 fields)
            'evidence_level', 'evidence_source', 'evidence_citation',
            
            # Market consensus & narrative (3 fields)
            'market_consensus_on_causality', 'reframing_potential', 'narrative_disruption',
            
            # Market perception (7 fields)
            'market_perception_intensity', 'market_perception_hope_vs_fear',
            'market_perception_surprise_vs_anticipated', 'market_perception_consensus_vs_division',
            'market_perception_narrative_strength', 'market_perception_emotional_profile', 'market_perception_cognitive_biases',
            
            # AI assessments (5 fields)
            'ai_assessment_execution_risk', 'ai_assessment_competitive_risk',
            'ai_assessment_business_impact_likelihood', 'ai_assessment_timeline_realism', 'ai_assessment_fundamental_strength',
            
            # Perception gaps (3 fields)
            'perception_gap_optimism_bias', 'perception_gap_risk_awareness', 'perception_gap_correction_potential',
            
            # Context features (3 fields)
            'market_hours', 'market_regime', 'pattern_strength_score', 'data_quality_score'
        ]
        
        # TARGET VARIABLES (what we predict TO) - exclude from features
        target_patterns = [
            'price_', 'spy_', 'qqq_', 'abs_change_', 'alpha_vs_', 
            'volume_', 'volatility_', 'max_move_', 'reversal_', 'attention_',
            'spy_momentum_', 'qqq_momentum_', 'confidence_'
        ]
        
        # METADATA (not ML features)
        metadata_patterns = [
            'id', 'business_factor_id', 'article_id', 'causal_events_ai_id', 'ticker',
            'event_timestamp', 'article_published_at', 'created_at', 'updated_at', 'processing_timestamp',
            'processing_status', 'ml_split', 'business_event_index', 'causal_step_index',
            'processing_time_ms', 'missing_data_points', 'approximation_quality'
        ]
        
        feature_cols = []
        for col in df.columns:
            # Check if it's an input feature
            is_input_feature = any(col == pattern or col.startswith(pattern) for pattern in input_feature_patterns)
            
            # Check if it's a target or metadata (exclude)
            is_target = any(col.startswith(pattern) for pattern in target_patterns)
            is_metadata = any(col == pattern or col.startswith(pattern) for pattern in metadata_patterns)
            
            # Include only input features that aren't targets or metadata
            if is_input_feature and not is_target and not is_metadata:
                feature_cols.append(col)
        
        # OPTIMIZATION: Remove known empty columns
        empty_columns = [
            'article_authors', 'volume_burst_first_hour', 
            'volatility_shock_ratio', 'volume_relative_20day'
        ]
        
        feature_cols = [col for col in feature_cols if col not in empty_columns]
        
        print(f"📊 Found {len(feature_cols)} input feature columns out of {len(df.columns)} total columns")
        print(f"⚡ Removed {len(empty_columns)} empty columns for optimization")
        return feature_cols
    
    def preprocess_features(self, train_df: pd.DataFrame, test_df: pd.DataFrame, feature_cols: List[str]) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Preprocess features: handle missing values, scaling, selection"""
        
        print(f"🔧 Preprocessing {len(feature_cols)} features...")
        
        # Handle missing values and categorical data
        from sklearn.preprocessing import LabelEncoder
        
        train_features = train_df[feature_cols].copy()
        test_features = test_df[feature_cols].copy()
        
        # Process each column based on data type
        for col in feature_cols:
            if col in train_features.columns:
                # Check if column contains strings/categorical data
                if train_features[col].dtype == 'object' or isinstance(train_features[col].iloc[0], str):
                    # Handle categorical data with label encoding
                    le = LabelEncoder()
                    
                    # Combine train and test for consistent encoding
                    combined_values = pd.concat([
                        train_features[col].fillna('missing').astype(str),
                        test_features[col].fillna('missing').astype(str)
                    ])
                    
                    le.fit(combined_values)
                    train_features[col] = le.transform(train_features[col].fillna('missing').astype(str))
                    test_features[col] = le.transform(test_features[col].fillna('missing').astype(str))
                else:
                    # Handle numerical data
                    train_features[col] = pd.to_numeric(train_features[col], errors='coerce').fillna(0)
                    test_features[col] = pd.to_numeric(test_features[col], errors='coerce').fillna(0)
        
        # Remove constant features
        variance_threshold = 0.001
        feature_variances = train_features.var()
        varying_features = feature_variances[feature_variances > variance_threshold].index.tolist()
        
        print(f"🗂️ Removed {len(feature_cols) - len(varying_features)} constant features")
        
        train_features = train_features[varying_features]
        test_features = test_features[varying_features]
        
        # Scale features
        scaler = StandardScaler()
        train_scaled = scaler.fit_transform(train_features)
        test_scaled = scaler.transform(test_features)
        
        self.scalers['features'] = scaler
        
        print(f"✅ Feature preprocessing complete: {train_scaled.shape[1]} features")
        
        return train_scaled, test_scaled, varying_features
    
    def train_target_model(self, 
                          X_train: np.ndarray, 
                          y_train: np.ndarray,
                          X_test: np.ndarray,
                          y_test: np.ndarray,
                          target_name: str,
                          feature_names: List[str]) -> Dict[str, Any]:
        """Train Random Forest for a single target variable"""
        
        print(f"🌲 Training Random Forest for {target_name}")
        
        # Determine if regression or classification
        is_classification = target_name.endswith('_spike') or len(np.unique(y_train)) < 10
        
        if is_classification:
            # Convert to binary classification (positive/negative alpha)
            y_train_binary = (y_train > 0).astype(int)
            y_test_binary = (y_test > 0).astype(int)
            
            model = RandomForestClassifier(
                n_estimators=self.config.get('n_estimators', 100),
                max_depth=self.config.get('max_depth', 10),
                min_samples_split=self.config.get('min_samples_split', 5),
                min_samples_leaf=self.config.get('min_samples_leaf', 2),
                max_features=self.config.get('max_features', 'sqrt'),
                random_state=self.config.get('random_state', 42),
                n_jobs=-1
            )
            
            model.fit(X_train, y_train_binary)
            y_pred_binary = model.predict(X_test)
            y_pred_proba = model.predict_proba(X_test)[:, 1]
            
            accuracy = accuracy_score(y_test_binary, y_pred_binary)
            
            # Also train regression model for magnitude prediction
            reg_model = RandomForestRegressor(
                n_estimators=self.config.get('n_estimators', 100),
                max_depth=self.config.get('max_depth', 10),
                min_samples_split=self.config.get('min_samples_split', 5),
                min_samples_leaf=self.config.get('min_samples_leaf', 2),
                max_features=self.config.get('max_features', 'sqrt'),
                random_state=self.config.get('random_state', 42),
                n_jobs=-1
            )
            
            reg_model.fit(X_train, y_train)
            y_pred_reg = reg_model.predict(X_test)
            
            mse = mean_squared_error(y_test, y_pred_reg)
            mae = mean_absolute_error(y_test, y_pred_reg)
            r2 = r2_score(y_test, y_pred_reg)
            
            # Use classification model for feature importance
            feature_importance = model.feature_importances_
            
        else:
            # Regression
            model = RandomForestRegressor(
                n_estimators=self.config.get('n_estimators', 100),
                max_depth=self.config.get('max_depth', 10),
                min_samples_split=self.config.get('min_samples_split', 5),
                min_samples_leaf=self.config.get('min_samples_leaf', 2),
                max_features=self.config.get('max_features', 'sqrt'),
                random_state=self.config.get('random_state', 42),
                n_jobs=-1
            )
            
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            
            # Directional accuracy
            accuracy = np.mean(np.sign(y_test) == np.sign(y_pred))
            
            mse = mean_squared_error(y_test, y_pred)
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            feature_importance = model.feature_importances_
        
        # Cross-validation
        cv_scores = cross_val_score(
            model, X_train, y_train_binary if is_classification else y_train,
            cv=TimeSeriesSplit(n_splits=self.config.get('cv_folds', 5)),
            scoring='accuracy' if is_classification else 'r2'
        )
        
        # Feature importance ranking
        importance_ranking = [
            {
                "feature": feature_names[i],
                "importance": float(importance),
                "rank": int(rank + 1)
            }
            for rank, (i, importance) in enumerate(
                sorted(enumerate(feature_importance), key=lambda x: x[1], reverse=True)
            )
        ]
        
        # Store model
        self.models[target_name] = model
        
        results = {
            "target": target_name,
            "model_type": "classification" if is_classification else "regression",
            "accuracy": float(accuracy),
            "mse": float(mse),
            "mae": float(mae),
            "r2": float(r2),
            "cv_mean": float(cv_scores.mean()),
            "cv_std": float(cv_scores.std()),
            "feature_importance": importance_ranking,
            "sample_size": {
                "train": len(X_train),
                "test": len(X_test)
            }
        }
        
        print(f"✅ {target_name}: Accuracy={accuracy:.3f}, R²={r2:.3f}, CV={cv_scores.mean():.3f}±{cv_scores.std():.3f}")
        
        return results
    
    def train_all_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train models for all target variables"""
        
        print(f"🚀 Training all Random Forest models")
        
        # Split data
        train_df, test_df = self.split_data_chronologically(df)
        
        # Get features and targets
        feature_cols = self.get_feature_columns(df)
        target_cols = self.get_target_variables(df)
        
        print(f"🎯 Training {len(target_cols)} models with {len(feature_cols)} features")
        
        # Preprocess features
        X_train, X_test, selected_features = self.preprocess_features(train_df, test_df, feature_cols)
        
        # Train models for each target
        all_results = {}
        
        for target in target_cols:
            try:
                y_train = train_df[target].values
                y_test = test_df[target].values
                
                # Skip targets with insufficient variation
                if len(np.unique(y_train)) < 2:
                    print(f"⚠️ Skipping {target}: insufficient variation")
                    continue
                
                results = self.train_target_model(
                    X_train, y_train, X_test, y_test, target, selected_features
                )
                
                all_results[target] = results
                
            except Exception as e:
                print(f"❌ Error training {target}: {str(e)}")
                continue
        
        # Generate summary
        summary = self.generate_training_summary(all_results)
        
        return {
            "summary": summary,
            "model_results": all_results,
            "config": self.config,
            "data_info": {
                "total_samples": len(df),
                "train_samples": len(train_df),
                "test_samples": len(test_df),
                "feature_count": X_train.shape[1],
                "target_count": len(target_cols)
            }
        }
    
    def generate_training_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate summary statistics across all models"""
        
        if not results:
            return {"error": "No models trained successfully"}
        
        accuracies = [r["accuracy"] for r in results.values()]
        r2_scores = [r["r2"] for r in results.values()]
        
        # Find best and worst performing models
        best_model = max(results.items(), key=lambda x: x[1]["accuracy"])
        worst_model = min(results.items(), key=lambda x: x[1]["accuracy"])
        
        # Get top features across all models (no manual priorities)
        all_features = {}
        for target, result in results.items():
            for feature_info in result["feature_importance"][:15]:  # Top 15 per model
                feature_name = feature_info["feature"]
                importance = feature_info["importance"]
                
                if feature_name not in all_features:
                    all_features[feature_name] = []
                all_features[feature_name].append(importance)
        
        # Calculate average importance across models
        avg_feature_importance = [
            {
                "feature": feature,
                "avg_importance": np.mean(importances),
                "std_importance": np.std(importances),
                "model_count": len(importances)
            }
            for feature, importances in all_features.items()
        ]
        avg_feature_importance.sort(key=lambda x: x["avg_importance"], reverse=True)
        
        return {
            "models_trained": len(results),
            "avg_accuracy": np.mean(accuracies),
            "std_accuracy": np.std(accuracies),
            "avg_r2": np.mean(r2_scores),
            "best_model": {"target": best_model[0], "accuracy": best_model[1]["accuracy"]},
            "worst_model": {"target": worst_model[0], "accuracy": worst_model[1]["accuracy"]},
            "top_features_overall": avg_feature_importance[:20],
            "accuracy_distribution": {
                "min": min(accuracies),
                "max": max(accuracies),
                "median": np.median(accuracies),
                "q25": np.percentile(accuracies, 25),
                "q75": np.percentile(accuracies, 75)
            }
        }
    
    def save_models(self, output_dir: str) -> None:
        """Save trained models to disk"""
        
        os.makedirs(output_dir, exist_ok=True)
        
        for target_name, model in self.models.items():
            model_path = os.path.join(output_dir, f"rf_model_{target_name}.joblib")
            joblib.dump(model, model_path)
            
            scaler_path = os.path.join(output_dir, f"scaler_{target_name}.joblib")
            if target_name in self.scalers:
                joblib.dump(self.scalers[target_name], scaler_path)
        
        print(f"💾 Models saved to {output_dir}")
    
    def create_feature_importance_plot(self, results: Dict[str, Any], output_path: str) -> None:
        """Create feature importance visualization"""
        
        if not HAS_PLOTTING:
            print("⚠️ Matplotlib not available, skipping plots")
            return
        
        # Get top 15 features across all models
        summary = results["summary"]
        top_features = summary["top_features_overall"][:15]
        
        feature_names = [f["feature"] for f in top_features]
        importances = [f["avg_importance"] for f in top_features]
        std_importances = [f["std_importance"] for f in top_features]
        
        plt.figure(figsize=(12, 8))
        y_pos = np.arange(len(feature_names))
        
        plt.barh(y_pos, importances, xerr=std_importances, alpha=0.8)
        plt.yticks(y_pos, feature_names)
        plt.xlabel('Average Feature Importance')
        plt.title('Top Features Across All Random Forest Models')
        plt.gca().invert_yaxis()
        plt.tight_layout()
        
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"📊 Feature importance plot saved to {output_path}")
    
    def generate_predictions_report(self, results: Dict[str, Any]) -> str:
        """Generate human-readable predictions report"""
        
        summary = results["summary"]
        
        report = f"""
# AEIOU Random Forest Training Report
Generated: {datetime.now().isoformat()}

## 🎯 Overall Performance
- **Models Trained**: {summary['models_trained']}
- **Average Accuracy**: {summary['avg_accuracy']:.1%}
- **Average R²**: {summary['avg_r2']:.3f}
- **Best Model**: {summary['best_model']['target']} ({summary['best_model']['accuracy']:.1%})
- **Worst Model**: {summary['worst_model']['target']} ({summary['worst_model']['accuracy']:.1%})

## 📊 Accuracy Distribution
- **Range**: {summary['accuracy_distribution']['min']:.1%} - {summary['accuracy_distribution']['max']:.1%}
- **Median**: {summary['accuracy_distribution']['median']:.1%}
- **IQR**: {summary['accuracy_distribution']['q25']:.1%} - {summary['accuracy_distribution']['q75']:.1%}

## 🔍 Top Predictive Features
"""
        
        for i, feature in enumerate(summary["top_features_overall"][:10], 1):
            report += f"{i:2d}. **{feature['feature']}** ({feature['avg_importance']:.1%} ± {feature['std_importance']:.1%})\n"
        
        report += f"""
## 📈 Individual Model Performance
"""
        
        for target, model_result in results["model_results"].items():
            report += f"""
### {target}
- **Accuracy**: {model_result['accuracy']:.1%}
- **R²**: {model_result['r2']:.3f}
- **MSE**: {model_result['mse']:.4f}
- **Cross-Validation**: {model_result['cv_mean']:.3f} ± {model_result['cv_std']:.3f}
"""
        
        return report
    
    def analyze_feature_interactions(self, X: np.ndarray, y: np.ndarray, feature_names: List[str], top_k: int = 10) -> List[Dict[str, Any]]:
        """Analyze feature interactions using Random Forest"""
        
        print(f"🔗 Analyzing feature interactions...")
        
        # Train a Random Forest specifically for feature interaction analysis
        rf = RandomForestRegressor(
            n_estimators=200,           # More trees for better accuracy
            random_state=42,
            max_depth=12,               # Slightly deeper for complex patterns
            min_samples_split=5,
            min_samples_leaf=2,
            n_jobs=-1,                  # Use all CPU cores (M1 Max has 10 cores)
            max_features='sqrt',        # Optimize feature selection
            bootstrap=True,
            oob_score=True              # Out-of-bag scoring for validation
        )
        
        rf.fit(X, y)
        
        # Get feature importance
        importance = rf.feature_importances_
        
        # Sort features by importance
        feature_importance = [
            {"feature": feature_names[i], "importance": importance[i]}
            for i in range(len(feature_names))
        ]
        feature_importance.sort(key=lambda x: x["importance"], reverse=True)
        
        print(f"✅ Feature interaction analysis complete")
        
        return feature_importance[:top_k]

def main():
    """Main training script"""
    
    if len(sys.argv) < 2:
        print("Usage: python train_random_forest.py <csv_file> [config_json]")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    config_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Load configuration
    if config_file and os.path.exists(config_file):
        with open(config_file, 'r') as f:
            config = json.load(f)
    else:
        config = {
            "training_months": 8,
            "validation_months": 2,
            "n_estimators": 100,
            "max_depth": 10,
            "min_samples_split": 5,
            "min_samples_leaf": 2,
            "max_features": "sqrt",
            "random_state": 42,
            "cv_folds": 5
        }
    
    try:
        # Initialize trainer
        trainer = AEIOURandomForestTrainer(config)
        
        # Load data
        df = trainer.load_data(csv_file)
        
        # Minimum sample size check (relaxed for testing)
        min_samples = 20  # Reduced from 100 for testing
        if len(df) < min_samples:
            raise ValueError(f"Need at least {min_samples} samples, got {len(df)}")
        
        if len(df) < 100:
            print(f"⚠️  WARNING: Only {len(df)} samples (recommended: 100+). Results may be unreliable.")
        
        # Train all models
        results = trainer.train_all_models(df)
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/{timestamp}"
        os.makedirs(output_dir, exist_ok=True)
        
        # Save detailed results
        results_file = os.path.join(output_dir, "training_results.json")
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        # Save models
        trainer.save_models(os.path.join(output_dir, "models"))
        
        # Generate plots
        if HAS_PLOTTING:
            plot_path = os.path.join(output_dir, "feature_importance.png")
            trainer.create_feature_importance_plot(results, plot_path)
        
        # Generate markdown report
        report_md = trainer.generate_predictions_report(results)
        report_file = os.path.join(output_dir, "training_report.md")
        with open(report_file, 'w') as f:
            f.write(report_md)
        
        print(f"🎉 Training completed successfully!")
        print(f"📁 Results saved to: {output_dir}")
        print(f"📊 Average accuracy: {results['summary']['avg_accuracy']:.1%}")
        print(f"🏆 Best model: {results['summary']['best_model']['target']} ({results['summary']['best_model']['accuracy']:.1%})")
        
        # Output results for Node.js to consume
        print("JSON_RESULTS_START")
        print(json.dumps(results))
        print("JSON_RESULTS_END")
        
    except Exception as e:
        print(f"❌ Training failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
