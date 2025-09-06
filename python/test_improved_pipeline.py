#!/usr/bin/env python3
"""
Test the improved pipeline with all fixes
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import lightgbm as lgb

def test_improved():
    # Find the latest run
    import os
    results_dir = '../results/ml_runs/'
    run_dirs = [d for d in os.listdir(results_dir) if d.startswith('run_2025-09-06')]
    latest_run = max(run_dirs) if run_dirs else None
    
    if not latest_run:
        print("❌ No recent run found")
        return
    
    print(f"📁 Testing latest run: {latest_run}")
    
    # Load the prepared data
    df = pd.read_csv(f'{results_dir}{latest_run}/prepared_clean_data.csv')
    
    print(f"🔍 DATA OVERVIEW:")
    print(f"   Total records: {len(df):,}")
    print(f"   Total features: {len(df.columns)}")
    
    # Check for our key improvements
    improvements = []
    if 'signed_magnitude_scaled' in df.columns:
        improvements.append(f"✅ signed_magnitude_scaled (range: [{df['signed_magnitude_scaled'].min():.1f}, {df['signed_magnitude_scaled'].max():.1f}])")
    
    # Count feature types
    binary_flags = [col for col in df.columns if col.endswith('_present')]
    categorical_encoded = [col for col in df.columns if col.endswith('_encoded') or '_is_' in col]
    
    improvements.append(f"✅ Binary flags: {len(binary_flags)}")
    improvements.append(f"✅ Categorical encoded: {len(categorical_encoded)}")
    
    print(f"\n🎯 IMPROVEMENTS:")
    for improvement in improvements:
        print(f"   {improvement}")
    
    # Prepare target
    target_col = 'abs_change_1day_after_pct'
    raw_target = df[target_col].dropna()
    y = (raw_target > 0).astype(int)
    
    print(f"\n🎯 TARGET:")
    print(f"   UP moves: {y.sum():,} ({y.mean()*100:.1f}%)")
    print(f"   DOWN moves: {(1-y).sum():,} ({(1-y.mean())*100:.1f}%)")
    
    # Prepare features (exclude problematic columns)
    exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
    string_cols = [col for col in df.columns if df[col].dtype == 'object' and col not in exclude_cols]
    
    feature_columns = [col for col in df.columns if col not in exclude_cols + string_cols]
    X = df[feature_columns].fillna(0)
    
    print(f"\n📊 FEATURES USED: {len(feature_columns)}")
    
    # Time-based split
    train_size = int(0.8 * len(X))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"   Train: {len(X_train):,}, Test: {len(X_test):,}")
    
    # RandomForest
    print(f"\n🌲 RANDOM FOREST:")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_accuracy = accuracy_score(y_test, rf_pred) * 100
    print(f"   Accuracy: {rf_accuracy:.1f}%")
    
    # LightGBM
    print(f"\n⚡ LIGHTGBM:")
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
    lgb_accuracy = accuracy_score(y_test, lgb_pred_binary) * 100
    print(f"   Accuracy: {lgb_accuracy:.1f}%")
    
    # Compare to previous baselines
    print(f"\n🎉 RESULTS COMPARISON:")
    print(f"   📊 Current Results:")
    print(f"      RandomForest: {rf_accuracy:.1f}%")
    print(f"      LightGBM: {lgb_accuracy:.1f}%")
    print(f"   📈 Previous Baselines:")
    print(f"      Clean binary flags: 62.4%")
    print(f"      With 408 directional features: 55.9%")
    print(f"      With categorical encoding (broken): 56.2%")
    
    # Check if we beat the baseline
    best_accuracy = max(rf_accuracy, lgb_accuracy)
    if best_accuracy > 62.4:
        print(f"   🎯 SUCCESS! Improved by {best_accuracy - 62.4:.1f} percentage points")
    elif best_accuracy > 56.2:
        print(f"   ✅ Better than broken categorical version by {best_accuracy - 56.2:.1f}pp")
    else:
        print(f"   ⚠️  Still below 62.4% baseline")
    
    return rf_accuracy, lgb_accuracy

if __name__ == "__main__":
    test_improved()
