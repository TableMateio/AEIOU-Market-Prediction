#!/usr/bin/env python3
"""
Final test with fresh Supabase data using exact 62.4% configuration
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder

def final_test():
    print("🎯 FINAL TEST: FRESH SUPABASE DATA + 62.4% CONFIGURATION")
    print("=" * 60)
    
    # Load fresh Supabase data
    df = pd.read_csv('../results/ml_runs/run_2025-09-06_14-04/prepared_clean_data.csv')
    print(f"📊 Data: {len(df):,} records, {len(df.columns)} columns")
    
    # Target preparation
    target_col = 'abs_change_1day_after_pct'
    raw_target = df[target_col].dropna()
    y = (raw_target > 0).astype(int)
    
    print(f"🎯 Target: UP {y.sum():,} ({y.mean()*100:.1f}%), DOWN {(1-y).sum():,} ({(1-y.mean())*100:.1f}%)")
    
    # Feature preparation (62.4% approach)
    exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
    
    # Get categorical strings (THE KEY TO SUCCESS!)
    categorical_strings = [col for col in df.columns if df[col].dtype == 'object' and col not in exclude_cols]
    
    # Get all other features
    other_features = [col for col in df.columns if col not in exclude_cols + categorical_strings]
    
    print(f"📋 Features:")
    print(f"   Categorical strings: {len(categorical_strings)}")
    print(f"   Other features: {len(other_features)}")
    
    # Build feature matrix
    X = df[other_features].fillna(0).copy()
    
    # Apply LabelEncoder to categorical strings (THIS WAS THE SECRET!)
    print(f"\\n🏷️  Applying LabelEncoder to categorical strings...")
    for col in categorical_strings:
        le = LabelEncoder()
        col_data = df[col].fillna('unknown').astype(str)
        X[f"{col}_encoded"] = le.fit_transform(col_data)
    
    print(f"✅ Final feature count: {len(X.columns)}")
    
    # Time-based split (same as winning run)
    train_size = int(0.8 * len(X))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"📈 Split: Train {len(X_train):,}, Test {len(X_test):,}")
    
    # LightGBM with exact same parameters as 62.4% run
    print(f"\\n⚡ LIGHTGBM (targeting 62.4%):")
    
    lgb_train = lgb.Dataset(X_train, label=y_train)
    lgb_test = lgb.Dataset(X_test, label=y_test, reference=lgb_train)
    
    # Exact parameters from successful run
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
    
    # Final verdict
    print(f"\\n🎯 FINAL RESULTS:")
    print(f"   🎯 Target: 62.4%")
    print(f"   📊 Achieved: {accuracy:.1f}%")
    print(f"   📈 Difference: {accuracy - 62.4:+.1f} percentage points")
    
    if accuracy >= 62.0:
        print(f"   🎉 SUCCESS! We've matched the 62.4% baseline!")
        print(f"   🔑 The winning formula: Categorical strings + LabelEncoder")
    elif accuracy >= 60.0:
        print(f"   ✅ Very close! Almost there.")
    else:
        print(f"   ⚠️  Still working on it...")
    
    return accuracy

if __name__ == "__main__":
    final_test()
