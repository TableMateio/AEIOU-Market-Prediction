#!/usr/bin/env python3
"""
Test frequency-weighted encoding instead of LabelEncoder
High frequency = high importance (not low numbers)
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score
import lightgbm as lgb

def create_frequency_weighted_encoding(df, col):
    """
    Create frequency-weighted encoding where higher frequency = higher values
    Instead of arbitrary 0,1,2,3... use actual frequency counts
    """
    value_counts = df[col].value_counts()
    
    # Create mapping: category -> frequency count
    frequency_mapping = value_counts.to_dict()
    
    # Apply mapping
    encoded_values = df[col].map(frequency_mapping).fillna(0)
    
    return encoded_values, frequency_mapping

def test_frequency_weighted_vs_label_encoding():
    print("🎯 TESTING FREQUENCY-WEIGHTED VS LABEL ENCODING")
    print("=" * 60)
    
    # Load exact winning configuration data
    df = pd.read_csv('../results/ml_runs/archive/run_2025-09-06_14-04/prepared_clean_data.csv')
    
    # Get the exact feature set from winning run
    binary_flags = [col for col in df.columns if col.endswith('_present')]
    categorical_strings = [col for col in df.columns if df[col].dtype == 'object' and col not in ['id', 'article_id', 'article_published_at']]
    winning_numerical = ['abs_change_1week_after_pct', 'signed_magnitude', 'factor_movement', 
                        'causal_certainty', 'article_source_credibility', 'market_perception_intensity', 
                        'signed_magnitude_scaled']
    
    # Prepare target
    target_col = 'abs_change_1day_after_pct'
    raw_target = df[target_col].dropna()
    y = (raw_target > 0).astype(int)
    
    print(f"📊 Data: {len(df):,} records")
    print(f"   Binary flags: {len(binary_flags)}")
    print(f"   Categorical strings: {len(categorical_strings)}")
    print(f"   Numerical: {len(winning_numerical)}")
    
    # Test 1: Original LabelEncoder approach (65.8% baseline)
    print(f"\\n🏷️ TEST 1: LABEL ENCODER (BASELINE)")
    print("=" * 40)
    
    X1 = df[binary_flags + winning_numerical].fillna(0).copy()
    
    from sklearn.preprocessing import LabelEncoder
    for col in categorical_strings:
        le = LabelEncoder()
        col_data = df[col].fillna('unknown').astype(str)
        X1[f"{col}_label"] = le.fit_transform(col_data)
    
    # Time-based split
    train_size = int(0.8 * len(X1))
    X1_train, X1_test = X1[:train_size], X1[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    # LightGBM
    lgb_train1 = lgb.Dataset(X1_train, label=y_train)
    lgb_test1 = lgb.Dataset(X1_test, label=y_test, reference=lgb_train1)
    
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
    
    model1 = lgb.train(params, lgb_train1, valid_sets=[lgb_test1], num_boost_round=100,
                      callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)])
    
    pred1 = model1.predict(X1_test, num_iteration=model1.best_iteration)
    pred1_binary = (pred1 > 0.5).astype(int)
    acc1 = accuracy_score(y_test, pred1_binary) * 100
    
    print(f"   Accuracy: {acc1:.1f}%")
    
    # Test 2: Frequency-weighted encoding
    print(f"\\n📊 TEST 2: FREQUENCY-WEIGHTED ENCODING")
    print("=" * 40)
    
    X2 = df[binary_flags + winning_numerical].fillna(0).copy()
    
    print("   Frequency mappings:")
    for col in categorical_strings:
        encoded_values, freq_mapping = create_frequency_weighted_encoding(df, col)
        X2[f"{col}_freq"] = encoded_values
        
        # Show top 3 mappings
        top_3 = sorted(freq_mapping.items(), key=lambda x: x[1], reverse=True)[:3]
        print(f"     {col}: {top_3}")
    
    # Same split and model
    X2_train, X2_test = X2[:train_size], X2[train_size:]
    
    lgb_train2 = lgb.Dataset(X2_train, label=y_train)
    lgb_test2 = lgb.Dataset(X2_test, label=y_test, reference=lgb_train2)
    
    model2 = lgb.train(params, lgb_train2, valid_sets=[lgb_test2], num_boost_round=100,
                      callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)])
    
    pred2 = model2.predict(X2_test, num_iteration=model2.best_iteration)
    pred2_binary = (pred2 > 0.5).astype(int)
    acc2 = accuracy_score(y_test, pred2_binary) * 100
    
    print(f"   Accuracy: {acc2:.1f}%")
    
    # Comparison
    print(f"\\n🎯 FREQUENCY-WEIGHTED ENCODING RESULTS:")
    print(f"   Label Encoder: {acc1:.1f}%")
    print(f"   Frequency-Weighted: {acc2:.1f}%")
    print(f"   Improvement: {acc2 - acc1:+.1f} percentage points")
    
    if acc2 > acc1 + 0.5:
        print(f"   🎉 SUCCESS! Frequency weighting helps!")
    elif acc2 > acc1:
        print(f"   ✅ Slight improvement with frequency weighting")
    else:
        print(f"   ⚠️ No improvement - may need different approach")
    
    return acc1, acc2

if __name__ == "__main__":
    test_frequency_weighted_vs_label_encoding()
