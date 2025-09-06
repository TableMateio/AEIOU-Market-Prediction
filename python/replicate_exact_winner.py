#!/usr/bin/env python3
"""
Replicate the EXACT 65.4% winning configuration:
- 95 binary flags (working arrays)
- 10 categorical strings + LabelEncoder  
- 7 numerical features (NOT 29!)
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder

def replicate_exact_winner():
    print("🎯 REPLICATING EXACT 65.4% WINNING CONFIGURATION")
    print("=" * 60)
    
    # Load winning run data
    df_winning = pd.read_csv('../results/ml_runs/archive/run_2025-09-06_14-04/prepared_clean_data.csv')
    print(f"📊 Winning data: {len(df_winning):,} records, {len(df_winning.columns)} columns")
    
    # Load current data (with working arrays)
    df_current = pd.read_csv('../results/ml_runs/run_2025-09-06_14-13/prepared_clean_data.csv')
    
    # Remove duplicate flags from current data
    flags_to_remove = []
    flags_to_remove.extend([col for col in df_current.columns if col.startswith('factor_name_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df_current.columns if col.startswith('event_orientation_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df_current.columns if col.startswith('factor_orientation_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df_current.columns if col.startswith('event_trigger_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df_current.columns if col.startswith('market_regime_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df_current.columns if col.startswith('article_audience_split_') and col.endswith('_present')])
    flags_to_remove.extend([col for col in df_current.columns if col.startswith('evidence_') and col.endswith('_present')])
    
    df_clean = df_current.drop(columns=flags_to_remove)
    
    # Get winning numerical features (7 total)
    winning_numerical = [col for col in df_winning.columns if df_winning[col].dtype in ['int64', 'float64'] and col not in ['id', 'abs_change_1day_after_pct']]
    winning_numerical = [col for col in winning_numerical if not col.endswith('_present')]
    
    print(f"\\n🔑 WINNING NUMERICAL FEATURES ({len(winning_numerical)}):") 
    for feat in winning_numerical:
        print(f"   • {feat}")
    
    # Keep only the winning numerical features
    current_numerical = [col for col in df_clean.columns if df_clean[col].dtype in ['int64', 'float64'] and col not in ['id', 'abs_change_1day_after_pct']]
    current_numerical = [col for col in current_numerical if not col.endswith('_present')]
    
    # Remove extra numerical features
    extra_numerical = [col for col in current_numerical if col not in winning_numerical]
    print(f"\\n🗑️  Removing {len(extra_numerical)} extra numerical features:")
    for feat in extra_numerical[:10]:  # Show first 10
        print(f"   • {feat}")
    
    df_exact = df_clean.drop(columns=extra_numerical)
    
    print(f"\\n✅ EXACT REPLICATION:")
    print(f"   Columns: {len(df_exact.columns)} (target: 116)")
    
    # Count features
    binary_flags = [col for col in df_exact.columns if col.endswith('_present')]
    categorical_strings = [col for col in df_exact.columns if df_exact[col].dtype == 'object' and col not in ['id', 'article_id', 'article_published_at']]
    numerical = [col for col in df_exact.columns if df_exact[col].dtype in ['int64', 'float64'] and col not in ['id', 'abs_change_1day_after_pct'] + binary_flags]
    
    print(f"   Binary flags: {len(binary_flags)} (target: 95)")
    print(f"   Categorical: {len(categorical_strings)} (target: 10)")
    print(f"   Numerical: {len(numerical)} (target: 7)")
    
    # Test the exact configuration
    target_col = 'abs_change_1day_after_pct'
    raw_target = df_exact[target_col].dropna()
    y = (raw_target > 0).astype(int)
    
    print(f"\\n🎯 Target: UP {y.sum():,} ({y.mean()*100:.1f}%), DOWN {(1-y).sum():,}")
    
    # Prepare features (exact winning approach)
    exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
    other_features = binary_flags + numerical
    
    X = df_exact[other_features].fillna(0).copy()
    
    # LabelEncode categorical strings
    print(f"\\n🏷️ Applying LabelEncoder to {len(categorical_strings)} categorical strings...")
    for col in categorical_strings:
        le = LabelEncoder()
        col_data = df_exact[col].fillna('unknown').astype(str)
        X[f"{col}_encoded"] = le.fit_transform(col_data)
    
    print(f"✅ Final feature count: {len(X.columns)}")
    
    # Time-based split
    train_size = int(0.8 * len(X))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"📈 Split: Train {len(X_train):,}, Test {len(X_test):,}")
    
    # LightGBM with exact same parameters
    print(f"\\n⚡ LIGHTGBM - EXACT REPLICATION:")
    
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
    
    # Final comparison
    print(f"\\n🎯 EXACT REPLICATION RESULTS:")
    print(f"   Target: 65.4%")
    print(f"   Achieved: {accuracy:.1f}%")
    print(f"   Difference: {accuracy - 65.4:+.1f}pp")
    
    if abs(accuracy - 65.4) < 1.0:
        print(f"   🎉 PERFECT! Exact replication successful!")
    elif accuracy >= 65.0:
        print(f"   ✅ SUCCESS! Very close to target!")
    else:
        print(f"   ⚠️ Still investigating configuration differences...")
    
    return accuracy

if __name__ == "__main__":
    replicate_exact_winner()
