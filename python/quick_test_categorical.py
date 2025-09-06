#!/usr/bin/env python3
"""
Quick test to see categorical encoding impact on accuracy
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import lightgbm as lgb

def quick_test():
    # Load the latest prepared data
    df = pd.read_csv('../results/ml_runs/run_2025-09-06_13-42/prepared_clean_data.csv')
    
    print(f"🔍 DATA OVERVIEW:")
    print(f"   Total records: {len(df):,}")
    print(f"   Total features: {len(df.columns)}")
    
    # Count feature types
    binary_flags = [col for col in df.columns if col.endswith('_present')]
    categorical_encoded = [col for col in df.columns if col.endswith('_encoded') or '_is_' in col]
    numerical = [col for col in df.columns if col not in binary_flags + categorical_encoded and col not in ['id', 'article_id', 'article_published_at', 'abs_change_1day_after_pct']]
    
    print(f"   Binary flags: {len(binary_flags)}")
    print(f"   Categorical encoded: {len(categorical_encoded)}")  
    print(f"   Numerical: {len(numerical)}")
    
    # Prepare target
    target_col = 'abs_change_1day_after_pct'
    raw_target = df[target_col].dropna()
    y = (raw_target > 0).astype(int)  # 1 for UP, 0 for DOWN
    
    print(f"\n🎯 TARGET:")
    print(f"   UP moves: {y.sum():,} ({y.mean()*100:.1f}%)")
    print(f"   DOWN moves: {(1-y).sum():,} ({(1-y.mean())*100:.1f}%)")
    
    # Prepare features (exclude string columns)
    string_cols = ['id', 'article_id', 'article_published_at', 'consolidated_event_type', 'consolidated_factor_name', 'event_tag_category', 'factor_category', 'event_orientation', 'factor_orientation', 'evidence_level', 'evidence_source', 'market_regime', 'article_audience_split', 'event_trigger']
    
    feature_columns = binary_flags + categorical_encoded + [col for col in numerical if col in df.columns and col not in string_cols]
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
    
    print(f"\n🎉 SUMMARY:")
    print(f"   RandomForest: {rf_accuracy:.1f}%")
    print(f"   LightGBM: {lgb_accuracy:.1f}%")
    print(f"   Features: {len(feature_columns)} (including {len(categorical_encoded)} categorical)")
    
    return rf_accuracy, lgb_accuracy

if __name__ == "__main__":
    quick_test()
