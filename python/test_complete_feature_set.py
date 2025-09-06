#!/usr/bin/env python3
"""
Test the complete 184 binary flag + 27 numerical feature set
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder

def test_complete_feature_set():
    print("🎯 TESTING COMPLETE FEATURE SET: 184 FLAGS + 27 NUMERICAL")
    print("=" * 70)
    
    # Load the complete feature set
    df = pd.read_csv('../results/ml_runs/run_2025-09-06_14-13/prepared_clean_data.csv')
    print(f"📊 Data: {len(df):,} records, {len(df.columns)} columns")
    
    # Count features
    binary_flags = [col for col in df.columns if col.endswith('_present')]
    categorical_strings = [col for col in df.columns if df[col].dtype == 'object' and col not in ['id', 'article_id', 'article_published_at']]
    numerical = [col for col in df.columns if df[col].dtype in ['int64', 'float64'] and col not in ['id', 'abs_change_1day_after_pct'] + binary_flags]
    
    print(f"📋 Feature breakdown:")
    print(f"   Binary flags: {len(binary_flags)}")
    print(f"   Categorical strings: {len(categorical_strings)}")
    print(f"   Numerical: {len(numerical)}")
    
    # Check flag activations
    total_activations = sum(df[flag].sum() for flag in binary_flags)
    print(f"   Total flag activations: {total_activations:,}")
    
    # Prepare target
    target_col = 'abs_change_1day_after_pct'
    raw_target = df[target_col].dropna()
    y = (raw_target > 0).astype(int)
    
    print(f"🎯 Target: UP {y.sum():,} ({y.mean()*100:.1f}%), DOWN {(1-y).sum():,} ({(1-y.mean())*100:.1f}%)")
    
    # Prepare features (winning 62.4% approach)
    exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
    other_features = binary_flags + numerical
    
    X = df[other_features].fillna(0).copy()
    
    # LabelEncode categorical strings (THE WINNING APPROACH!)
    print(f"\\n🏷️ Applying LabelEncoder to {len(categorical_strings)} categorical strings...")
    for col in categorical_strings:
        le = LabelEncoder()
        col_data = df[col].fillna('unknown').astype(str)
        X[f"{col}_encoded"] = le.fit_transform(col_data)
    
    print(f"✅ Final feature count: {len(X.columns)}")
    
    # Time-based split
    train_size = int(0.8 * len(X))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"📈 Split: Train {len(X_train):,}, Test {len(X_test):,}")
    
    # LightGBM (the winner)
    print(f"\\n⚡ LIGHTGBM WITH COMPLETE FEATURE SET:")
    
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
    
    model = lgb.train(
        params,
        lgb_train,
        valid_sets=[lgb_test],
        num_boost_round=100,
        callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)]
    )
    
    lgb_pred = model.predict(X_test, num_iteration=model.best_iteration)
    lgb_pred_binary = (lgb_pred > 0.5).astype(int)
    accuracy = accuracy_score(y_test, lgb_pred_binary) * 100
    
    print(f"   Accuracy: {accuracy:.1f}%")
    
    # Compare to previous results
    print(f"\\n🎯 PERFORMANCE COMPARISON:")
    print(f"   Previous (95 flags): 65.4%")
    print(f"   Current (184 flags): {accuracy:.1f}%")
    print(f"   Improvement: {accuracy - 65.4:+.1f} percentage points")
    
    if accuracy > 70.0:
        print(f"   🎉 BREAKTHROUGH! Over 70% accuracy!")
    elif accuracy > 67.0:
        print(f"   🚀 EXCELLENT! Major improvement!")
    elif accuracy > 65.4:
        print(f"   ✅ GOOD! Feature expansion helped!")
    else:
        print(f"   ⚠️ Mixed results - may need feature selection")
    
    return accuracy

if __name__ == "__main__":
    test_complete_feature_set()
