#!/usr/bin/env python3
"""
Signal Recovery Pipeline - Finding Real Predictive Features
Since we're at majority class baseline (55.9%), we need to find actual signal

STRATEGY:
1. Test target encoding (may capture more categorical signal)
2. Create interaction features (magnitude × category)  
3. Add time-based features
4. Validate individual feature correlations
5. Try ensemble methods
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder
import lightgbm as lgb
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class SignalRecoveryPipeline:
    def __init__(self):
        self.results = {}
        
    def load_honest_data(self):
        """Load data without target leakage"""
        df = pd.read_csv('../results/ml_runs/run_2025-09-06_14-31/prepared_clean_data.csv')
        df = df.drop(columns=['abs_change_1week_after_pct'])  # Remove leakage
        return df
    
    def validate_individual_features(self, df):
        """Check which features have ANY correlation with target"""
        print("🔍 VALIDATING INDIVIDUAL FEATURE SIGNAL")
        print("=" * 45)
        
        target_col = 'abs_change_1day_after_pct'
        y = df[target_col]
        
        # Test numerical features
        numerical_cols = ['signed_magnitude', 'causal_certainty', 'article_source_credibility', 'market_perception_intensity']
        
        correlations = []
        for col in numerical_cols:
            if col in df.columns:
                corr = df[col].corr(y)
                correlations.append((col, corr))
                print(f"   {col}: r={corr:.4f}")
        
        # Test binary flags with chi-square-like measure
        binary_flags = [col for col in df.columns if col.endswith('_present') and df[col].sum() > 10]
        
        print(f"\\n📊 Binary flags with >10 activations: {len(binary_flags)}")
        flag_signals = []
        
        for flag in binary_flags[:20]:  # Test top 20 active flags
            flag_present = df[flag] == 1
            flag_absent = df[flag] == 0
            
            if flag_present.sum() > 10 and flag_absent.sum() > 10:
                mean_present = y[flag_present].mean()
                mean_absent = y[flag_absent].mean()
                diff = mean_present - mean_absent
                flag_signals.append((flag, diff, flag_present.sum()))
                
        # Sort by signal strength
        flag_signals.sort(key=lambda x: abs(x[1]), reverse=True)
        
        print(f"\\n🎯 TOP 10 BINARY FLAGS BY SIGNAL:")
        for flag, diff, count in flag_signals[:10]:
            direction = "📈" if diff > 0 else "📉"
            print(f"   {direction} {flag}: {diff:+.4f} ({count} cases)")
        
        return correlations, flag_signals
    
    def test_target_encoding(self, df):
        """Test target encoding for categorical features"""
        print("\\n🎯 TESTING TARGET ENCODING")
        print("=" * 35)
        
        target_col = 'abs_change_1day_after_pct'
        y = (df[target_col] > 0).astype(int)
        
        categorical_cols = [
            'consolidated_event_type', 'consolidated_factor_name', 'factor_category',
            'event_orientation', 'factor_orientation', 'evidence_level', 
            'evidence_source', 'market_regime', 'article_audience_split', 'event_trigger'
        ]
        
        # Prepare base features
        exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
        binary_flags = [col for col in df.columns if col.endswith('_present')]
        numerical = [col for col in df.columns if df[col].dtype in ['int64', 'float64'] and col not in exclude_cols + binary_flags]
        
        X = df[binary_flags + numerical].fillna(0).copy()
        
        # Target encoding with smoothing
        for col in categorical_cols:
            if col in df.columns:
                # Calculate mean target per category
                target_means = df.groupby(col)[target_col].agg(['mean', 'count'])
                
                # Smooth with global mean (Bayesian approach)
                global_mean = y.mean()
                smoothing_factor = 10  # Higher = more smoothing
                
                smoothed_means = (target_means['mean'] * target_means['count'] + global_mean * smoothing_factor) / (target_means['count'] + smoothing_factor)
                
                # Map to feature
                X[f"{col}_target_encoded"] = df[col].map(smoothed_means).fillna(global_mean)
                
                # Show encoding quality
                unique_vals = len(smoothed_means)
                encoding_range = (smoothed_means.min(), smoothed_means.max())
                print(f"   {col}: {unique_vals} categories, range [{encoding_range[0]:.3f}, {encoding_range[1]:.3f}]")
        
        # Test performance
        train_size = int(0.8 * len(X))
        X_train, X_test = X[:train_size], X[train_size:]
        y_train, y_test = y[:train_size], y[train_size:]
        
        lgb_train = lgb.Dataset(X_train, label=y_train)
        lgb_test = lgb.Dataset(X_test, label=y_test, reference=lgb_train)
        
        model = lgb.train(
            {'objective': 'binary', 'metric': 'binary_logloss', 'verbose': -1},
            lgb_train, valid_sets=[lgb_test], num_boost_round=100,
            callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)]
        )
        
        pred = model.predict(X_test, num_iteration=model.best_iteration)
        accuracy = accuracy_score(y_test, (pred > 0.5).astype(int)) * 100
        
        print(f"\\n   Target Encoding Accuracy: {accuracy:.1f}%")
        return accuracy
    
    def create_interaction_features(self, df):
        """Create interaction features between magnitude and categories"""
        print("\\n🔗 CREATING INTERACTION FEATURES")
        print("=" * 35)
        
        target_col = 'abs_change_1day_after_pct'
        y = (df[target_col] > 0).astype(int)
        
        # Base features
        exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
        binary_flags = [col for col in df.columns if col.endswith('_present')]
        numerical = [col for col in df.columns if df[col].dtype in ['int64', 'float64'] and col not in exclude_cols + binary_flags]
        
        X = df[binary_flags + numerical].fillna(0).copy()
        
        # Create magnitude × category interactions
        magnitude_col = 'signed_magnitude'
        key_categories = ['consolidated_event_type', 'market_regime', 'event_orientation']
        
        interactions_created = 0
        for cat_col in key_categories:
            if cat_col in df.columns and magnitude_col in df.columns:
                # Create interaction for each category value
                for cat_value in df[cat_col].value_counts().head(5).index:  # Top 5 categories only
                    interaction_name = f"{cat_col}_{cat_value}_magnitude"
                    mask = df[cat_col] == cat_value
                    X[interaction_name] = (mask * df[magnitude_col]).astype(float)
                    interactions_created += 1
        
        print(f"   Created {interactions_created} interaction features")
        
        # Encode remaining categoricals
        categorical_cols = ['consolidated_event_type', 'consolidated_factor_name', 'factor_category']
        for col in categorical_cols:
            if col in df.columns:
                le = LabelEncoder()
                X[f"{col}_encoded"] = le.fit_transform(df[col].fillna('unknown').astype(str))
        
        # Test performance
        train_size = int(0.8 * len(X))
        X_train, X_test = X[:train_size], X[train_size:]
        y_train, y_test = y[:train_size], y[train_size:]
        
        lgb_train = lgb.Dataset(X_train, label=y_train)
        lgb_test = lgb.Dataset(X_test, label=y_test, reference=lgb_train)
        
        model = lgb.train(
            {'objective': 'binary', 'metric': 'binary_logloss', 'verbose': -1},
            lgb_train, valid_sets=[lgb_test], num_boost_round=100,
            callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)]
        )
        
        pred = model.predict(X_test, num_iteration=model.best_iteration)
        accuracy = accuracy_score(y_test, (pred > 0.5).astype(int)) * 100
        
        print(f"   Interaction Features Accuracy: {accuracy:.1f}%")
        return accuracy
    
    def add_time_features(self, df):
        """Add time-based features"""
        print("\\n⏰ ADDING TIME-BASED FEATURES")
        print("=" * 35)
        
        target_col = 'abs_change_1day_after_pct'
        y = (df[target_col] > 0).astype(int)
        
        # Parse datetime
        df['article_datetime'] = pd.to_datetime(df['article_published_at'])
        
        # Base features
        exclude_cols = ['id', 'article_id', 'article_published_at', target_col, 'article_datetime']
        binary_flags = [col for col in df.columns if col.endswith('_present')]
        numerical = [col for col in df.columns if df[col].dtype in ['int64', 'float64'] and col not in exclude_cols + binary_flags]
        
        X = df[binary_flags + numerical].fillna(0).copy()
        
        # Add time features
        X['hour_of_day'] = df['article_datetime'].dt.hour
        X['day_of_week'] = df['article_datetime'].dt.dayofweek
        X['is_market_hours'] = ((df['article_datetime'].dt.hour >= 9) & (df['article_datetime'].dt.hour <= 16)).astype(int)
        X['is_weekend'] = (df['article_datetime'].dt.dayofweek >= 5).astype(int)
        
        print(f"   Added 4 time-based features")
        
        # Encode categoricals
        categorical_cols = ['consolidated_event_type', 'market_regime', 'event_orientation']
        for col in categorical_cols:
            if col in df.columns:
                le = LabelEncoder()
                X[f"{col}_encoded"] = le.fit_transform(df[col].fillna('unknown').astype(str))
        
        # Test performance
        train_size = int(0.8 * len(X))
        X_train, X_test = X[:train_size], X[train_size:]
        y_train, y_test = y[:train_size], y[train_size:]
        
        lgb_train = lgb.Dataset(X_train, label=y_train)
        lgb_test = lgb.Dataset(X_test, label=y_test, reference=lgb_train)
        
        model = lgb.train(
            {'objective': 'binary', 'metric': 'binary_logloss', 'verbose': -1},
            lgb_train, valid_sets=[lgb_test], num_boost_round=100,
            callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)]
        )
        
        pred = model.predict(X_test, num_iteration=model.best_iteration)
        accuracy = accuracy_score(y_test, (pred > 0.5).astype(int)) * 100
        
        print(f"   Time Features Accuracy: {accuracy:.1f}%")
        return accuracy
    
    def run_signal_recovery(self):
        """Run complete signal recovery analysis"""
        print("🎯 SIGNAL RECOVERY PIPELINE")
        print("=" * 40)
        print("Goal: Find features with real predictive signal")
        print()
        
        # Load data
        df = self.load_honest_data()
        print(f"📊 Data: {len(df):,} records (no target leakage)")
        
        # Baseline
        baseline = 55.9  # We know this from previous tests
        print(f"📉 Baseline (majority class): {baseline:.1f}%")
        
        # Test approaches
        correlations, flag_signals = self.validate_individual_features(df)
        
        target_enc_acc = self.test_target_encoding(df)
        interaction_acc = self.create_interaction_features(df)
        time_acc = self.add_time_features(df)
        
        # Summary
        print(f"\\n🎯 SIGNAL RECOVERY RESULTS:")
        print(f"=" * 35)
        print(f"   Baseline: {baseline:.1f}%")
        print(f"   Target Encoding: {target_enc_acc:.1f}% ({target_enc_acc - baseline:+.1f}pp)")
        print(f"   Interaction Features: {interaction_acc:.1f}% ({interaction_acc - baseline:+.1f}pp)")
        print(f"   Time Features: {time_acc:.1f}% ({time_acc - baseline:+.1f}pp)")
        
        best_approach = max([
            ('Target Encoding', target_enc_acc),
            ('Interaction Features', interaction_acc), 
            ('Time Features', time_acc)
        ], key=lambda x: x[1])
        
        print(f"\\n🏆 Best approach: {best_approach[0]} at {best_approach[1]:.1f}%")
        
        if best_approach[1] > baseline + 0.5:
            print("✅ Found meaningful signal improvement!")
        else:
            print("⚠️ Limited signal found - may need different approach")
        
        return {
            'baseline': baseline,
            'target_encoding': target_enc_acc,
            'interactions': interaction_acc,
            'time_features': time_acc,
            'best': best_approach
        }

if __name__ == "__main__":
    pipeline = SignalRecoveryPipeline()
    results = pipeline.run_signal_recovery()
