#!/usr/bin/env python3
"""
Test optimal feature set: 101 array-based binary flags + categorical strings + numerical
Remove the 89 duplicate categorical→binary flags
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder

def test_optimal_feature_set():
    print("🎯 TESTING OPTIMAL FEATURE SET: REMOVE DUPLICATE FLAGS")
    print("=" * 60)
    
    # Load complete data
    df = pd.read_csv('../results/ml_runs/run_2025-09-06_14-13/prepared_clean_data.csv')
    print(f"📊 Original data: {len(df):,} records, {len(df.columns)} columns")
    
    # Define flags to REMOVE (duplicates of categorical strings)
    flags_to_remove = []
    
    # Factor name flags (54) - duplicate of consolidated_factor_name
    flags_to_remove.extend([col for col in df.columns if col.startswith('factor_name_') and col.endswith('_present')])
    
    # Orientation flags (16) - duplicate of event_orientation/factor_orientation
    flags_to_remove.extend([col for col in df.columns if col.startswith('event_orientation_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df.columns if col.startswith('factor_orientation_') and col.endswith('_present')])
    
    # Other categorical duplicates
    flags_to_remove.extend([col for col in df.columns if col.startswith('event_trigger_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df.columns if col.startswith('market_regime_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df.columns if col.startswith('article_audience_split_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df.columns if col.startswith('evidence_level_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df.columns if col.startswith('evidence_source_') and col.endswith('_present')])
    
    print(f"🗑️  Removing {len(flags_to_remove)} duplicate flags:")
    for flag_type in ['factor_name_', 'event_orientation_', 'factor_orientation_', 'event_trigger_', 'market_regime_', 'article_audience_split_', 'evidence_']:
        type_flags = [f for f in flags_to_remove if flag_type in f]
        if type_flags:
            print(f"   • {flag_type}*: {len(type_flags)} flags")
    
    # Remove duplicate flags
    df_clean = df.drop(columns=flags_to_remove)
    print(f"✅ After cleanup: {len(df_clean.columns)} columns")
    
    # Count remaining features
    binary_flags = [col for col in df_clean.columns if col.endswith('_present')]
    categorical_strings = [col for col in df_clean.columns if df_clean[col].dtype == 'object' and col not in ['id', 'article_id', 'article_published_at']]
    numerical = [col for col in df_clean.columns if df_clean[col].dtype in ['int64', 'float64'] and col not in ['id', 'abs_change_1day_after_pct'] + binary_flags]
    
    print(f"\\n📋 Optimal feature breakdown:")
    print(f"   Array-based binary flags: {len(binary_flags)} (should be ~101)")
    print(f"   Categorical strings: {len(categorical_strings)} (should be 10)")
    print(f"   Numerical: {len(numerical)} (should be ~27)")
    
    # Check activations
    total_activations = sum(df_clean[flag].sum() for flag in binary_flags)
    print(f"   Total flag activations: {total_activations:,}")
    
    # Prepare target
    target_col = 'abs_change_1day_after_pct'
    raw_target = df_clean[target_col].dropna()
    y = (raw_target > 0).astype(int)
    
    print(f"\\n🎯 Target: UP {y.sum():,} ({y.mean()*100:.1f}%), DOWN {(1-y).sum():,} ({(1-y.mean())*100:.1f}%)")
    
    # Prepare features (winning approach)
    exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
    other_features = binary_flags + numerical
    
    X = df_clean[other_features].fillna(0).copy()
    
    # LabelEncode categorical strings (THE WINNING SECRET!)
    print(f"\\n🏷️ Applying LabelEncoder to {len(categorical_strings)} categorical strings...")
    for col in categorical_strings:
        le = LabelEncoder()
        col_data = df_clean[col].fillna('unknown').astype(str)
        X[f"{col}_encoded"] = le.fit_transform(col_data)
    
    print(f"✅ Final feature count: {len(X.columns)} (vs 223 before)")
    
    # Time-based split
    train_size = int(0.8 * len(X))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"📈 Split: Train {len(X_train):,}, Test {len(X_test):,}")
    
    # LightGBM test
    print(f"\\n⚡ LIGHTGBM WITH OPTIMAL FEATURE SET:")
    
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
    
    # Performance comparison
    print(f"\\n🎯 PERFORMANCE RECOVERY:")
    print(f"   Target (original): 65.4%")
    print(f"   With all flags: 55.9% (-9.5pp)")
    print(f"   Optimal cleanup: {accuracy:.1f}% ({accuracy - 65.4:+.1f}pp)")
    
    if accuracy >= 65.0:
        print(f"   🎉 SUCCESS! Recovered the 65%+ performance!")
    elif accuracy >= 60.0:
        print(f"   ✅ GOOD! Major improvement from removing duplicates")
    else:
        print(f"   ⚠️ Still investigating...")
    
    return accuracy

if __name__ == "__main__":
    test_optimal_feature_set()
