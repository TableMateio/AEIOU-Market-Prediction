#!/usr/bin/env python3
"""
Replicate the exact 62.4% configuration:
- Use categorical strings as-is (no encoding)
- Include broken binary flags (they had 0 activations anyway)
- Use original numerical features
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder

def replicate_62_4_config():
    print("🎯 REPLICATING 62.4% BASELINE CONFIGURATION")
    print("=" * 50)
    
    # Use the successful run's data
    df = pd.read_csv('../results/ml_runs/archive/run_2025-09-06_12-25/prepared_clean_data.csv')
    
    print(f"📊 Loaded data: {len(df):,} records, {len(df.columns)} columns")
    
    # Prepare target (same as winning run)
    target_col = 'abs_change_1day_after_pct'
    raw_target = df[target_col].dropna()
    y = (raw_target > 0).astype(int)  # UP/DOWN classification
    
    print(f"🎯 Target: UP {y.sum():,} ({y.mean()*100:.1f}%), DOWN {(1-y).sum():,} ({(1-y.mean())*100:.1f}%)")
    
    # Prepare features exactly like the winning run
    exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
    
    # Get categorical string columns (these were key to success!)
    categorical_strings = [col for col in df.columns if df[col].dtype == 'object' and col not in exclude_cols]
    
    # Get numerical and binary flag columns
    other_features = [col for col in df.columns if col not in exclude_cols + categorical_strings]
    
    print(f"📋 Feature breakdown:")
    print(f"   Categorical strings: {len(categorical_strings)}")
    print(f"   Other features: {len(other_features)}")
    
    # Prepare feature matrix
    X = df[other_features].fillna(0).copy()
    
    # Encode categorical strings with LabelEncoder (this is what LightGBM needs)
    label_encoders = {}
    for col in categorical_strings:
        if col in df.columns:
            le = LabelEncoder()
            # Handle NaN values
            col_data = df[col].fillna('unknown').astype(str)
            X[f"{col}_encoded"] = le.fit_transform(col_data)
            label_encoders[col] = le
    
    print(f"📊 Final feature count: {len(X.columns)}")
    
    # Time-based split (exactly like winning run)
    train_size = int(0.8 * len(X))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"📈 Split: Train {len(X_train):,}, Test {len(X_test):,}")
    
    # RandomForest (exactly like winning run)
    print(f"\\n🌲 RANDOM FOREST:")
    rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    rf_accuracy = accuracy_score(y_test, rf_pred) * 100
    print(f"   Accuracy: {rf_accuracy:.1f}%")
    
    # LightGBM (exactly like winning run)
    print(f"\\n⚡ LIGHTGBM:")
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
    
    print(f"\\n🎯 REPLICATION RESULTS:")
    print(f"   Target: 62.4% LightGBM")
    print(f"   Achieved: {lgb_accuracy:.1f}% LightGBM")
    
    if abs(lgb_accuracy - 62.4) < 1.0:
        print(f"   ✅ SUCCESS! Replicated the baseline")
    else:
        print(f"   ⚠️  Difference: {lgb_accuracy - 62.4:+.1f} percentage points")
    
    return rf_accuracy, lgb_accuracy

if __name__ == "__main__":
    replicate_62_4_config()
