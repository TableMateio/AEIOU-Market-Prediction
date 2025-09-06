#!/usr/bin/env python3
"""
Test different categorical encoding methods to solve the frequency bias problem:
1. LabelEncoder (baseline - 65.3%)
2. One-Hot Encoding (proper way to avoid ordering bias)
3. Normalized Frequency (0-1 scale)
4. Log-Frequency (reduce extreme ratios)
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder

def test_all_categorical_encodings():
    print("🎯 TESTING ALL CATEGORICAL ENCODING METHODS")
    print("=" * 60)
    
    # Load exact winning configuration data
    df = pd.read_csv('../results/ml_runs/archive/run_2025-09-06_14-04/prepared_clean_data.csv')
    
    # Get exact feature set
    binary_flags = [col for col in df.columns if col.endswith('_present')]
    categorical_strings = [col for col in df.columns if df[col].dtype == 'object' and col not in ['id', 'article_id', 'article_published_at']]
    winning_numerical = ['abs_change_1week_after_pct', 'signed_magnitude', 'factor_movement', 
                        'causal_certainty', 'article_source_credibility', 'market_perception_intensity', 
                        'signed_magnitude_scaled']
    
    # Prepare target
    target_col = 'abs_change_1day_after_pct'
    raw_target = df[target_col].dropna()
    y = (raw_target > 0).astype(int)
    
    # Base features
    base_features = df[binary_flags + winning_numerical].fillna(0).copy()
    
    # Time-based split
    train_size = int(0.8 * len(base_features))
    y_train, y_test = y[:train_size], y[train_size:]
    
    results = {}
    
    # Method 1: LabelEncoder (baseline)
    print(f"\\n🏷️ METHOD 1: LABEL ENCODER")
    X1 = base_features.copy()
    for col in categorical_strings:
        le = LabelEncoder()
        col_data = df[col].fillna('unknown').astype(str)
        X1[f"{col}_label"] = le.fit_transform(col_data)
    
    X1_train, X1_test = X1[:train_size], X1[train_size:]
    acc1 = train_and_test(X1_train, X1_test, y_train, y_test, "Label")
    results['LabelEncoder'] = acc1
    
    # Method 2: One-Hot Encoding (proper categorical handling)
    print(f"\\n🔥 METHOD 2: ONE-HOT ENCODING")
    X2 = base_features.copy()
    
    # Only one-hot encode categories with reasonable number of values
    for col in categorical_strings:
        unique_vals = df[col].nunique()
        if unique_vals <= 10:  # Reasonable for one-hot
            # Create dummy variables
            dummies = pd.get_dummies(df[col], prefix=f"{col}_onehot")
            X2 = pd.concat([X2, dummies], axis=1)
            print(f"   {col}: {unique_vals} values → {len(dummies.columns)} one-hot features")
        else:
            # Use LabelEncoder for high-cardinality categories
            le = LabelEncoder()
            col_data = df[col].fillna('unknown').astype(str)
            X2[f"{col}_label"] = le.fit_transform(col_data)
            print(f"   {col}: {unique_vals} values → 1 label-encoded feature (too many for one-hot)")
    
    X2_train, X2_test = X2[:train_size], X2[train_size:]
    acc2 = train_and_test(X2_train, X2_test, y_train, y_test, "OneHot")
    results['OneHotEncoder'] = acc2
    
    # Method 3: Normalized Frequency (0-1 scale)
    print(f"\\n📊 METHOD 3: NORMALIZED FREQUENCY")
    X3 = base_features.copy()
    for col in categorical_strings:
        value_counts = df[col].value_counts()
        max_count = value_counts.max()
        # Normalize to 0-1 range
        norm_mapping = {val: count/max_count for val, count in value_counts.items()}
        X3[f"{col}_norm_freq"] = df[col].map(norm_mapping).fillna(0)
    
    X3_train, X3_test = X3[:train_size], X3[train_size:]
    acc3 = train_and_test(X3_train, X3_test, y_train, y_test, "NormFreq")
    results['NormalizedFreq'] = acc3
    
    # Method 4: Log Frequency (reduce extreme ratios)
    print(f"\\n📈 METHOD 4: LOG FREQUENCY")
    X4 = base_features.copy()
    for col in categorical_strings:
        value_counts = df[col].value_counts()
        # Use log to compress extreme ratios
        log_mapping = {val: np.log1p(count) for val, count in value_counts.items()}
        X4[f"{col}_log_freq"] = df[col].map(log_mapping).fillna(0)
    
    X4_train, X4_test = X4[:train_size], X4[train_size:]
    acc4 = train_and_test(X4_train, X4_test, y_train, y_test, "LogFreq")
    results['LogFreq'] = acc4
    
    # Final comparison
    print(f"\\n🎯 CATEGORICAL ENCODING COMPARISON:")
    print("=" * 50)
    best_method = max(results, key=results.get)
    best_score = results[best_method]
    
    for method, score in sorted(results.items(), key=lambda x: x[1], reverse=True):
        improvement = score - results['LabelEncoder']
        status = "🎉 WINNER!" if method == best_method else "✅" if improvement > 0 else "⚠️"
        print(f"   {status} {method}: {score:.1f}% ({improvement:+.1f}pp)")
    
    print(f"\\n💡 CONCLUSION:")
    if best_score > results['LabelEncoder'] + 0.5:
        print(f"   {best_method} significantly outperforms LabelEncoder!")
        print(f"   This confirms your frequency bias insight was correct!")
    else:
        print(f"   LabelEncoder remains competitive despite frequency bias")
        print(f"   The weighting issue may be less critical than expected")
    
    return results

def train_and_test(X_train, X_test, y_train, y_test, method_name):
    """Train LightGBM and return accuracy"""
    lgb_train = lgb.Dataset(X_train, label=y_train)
    lgb_test = lgb.Dataset(X_test, label=y_test, reference=lgb_train)
    
    params = {
        'objective': 'binary',
        'metric': 'binary_logloss',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1
    }
    
    model = lgb.train(params, lgb_train, valid_sets=[lgb_test], num_boost_round=100,
                     callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)])
    
    pred = model.predict(X_test, num_iteration=model.best_iteration)
    pred_binary = (pred > 0.5).astype(int)
    accuracy = accuracy_score(y_test, pred_binary) * 100
    
    print(f"   Features: {len(X_train.columns)}, Accuracy: {accuracy:.1f}%")
    return accuracy

if __name__ == "__main__":
    test_all_categorical_encodings()
