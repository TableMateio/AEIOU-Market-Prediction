#!/usr/bin/env python3
"""
Selective AI Fixes Pipeline - Testing Individual Fix Impact
Keep the critical target leakage fix, test others individually

APPROACH:
1. Always remove target leakage (confirmed cheating)
2. Test each other fix individually to measure impact
3. Keep fixes that improve accuracy, discard those that hurt
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder, StandardScaler
import warnings
warnings.filterwarnings('ignore')

def test_individual_fixes():
    print("🧪 TESTING INDIVIDUAL AI FIXES")
    print("=" * 40)
    
    # Load original data
    df_orig = pd.read_csv('../results/ml_runs/run_2025-09-06_14-31/prepared_clean_data.csv')
    print(f"📊 Original: {len(df_orig):,} records, {len(df_orig.columns)} columns")
    
    # BASELINE: Remove only target leakage (the confirmed problem)
    df_base = df_orig.drop(columns=['abs_change_1week_after_pct'])
    baseline_acc = run_quick_test(df_base, "BASELINE (leakage removed only)")
    
    results = {'baseline': baseline_acc}
    
    # TEST 1: + Remove constant flags
    binary_flags = [col for col in df_base.columns if col.endswith('_present')]
    constant_flags = [flag for flag in binary_flags if df_base[flag].nunique() <= 1 or df_base[flag].sum() == 0]
    active_flags = [flag for flag in binary_flags if flag not in constant_flags]
    
    df_test1 = df_base.drop(columns=constant_flags)
    test1_acc = run_quick_test(df_test1, f"TEST 1: + Remove {len(constant_flags)} constant flags")
    results['remove_constant'] = test1_acc
    
    # TEST 2: + Scale numerical features
    df_test2 = df_base.copy()
    numerical_cols = ['signed_magnitude', 'causal_certainty', 'article_source_credibility', 'market_perception_intensity']
    scaler = StandardScaler()
    
    for col in numerical_cols:
        if col in df_test2.columns:
            df_test2[f"{col}_scaled"] = scaler.fit_transform(df_test2[[col]]).flatten()
    
    test2_acc = run_quick_test(df_test2, "TEST 2: + Scale numerical features")
    results['scale_features'] = test2_acc
    
    # TEST 3: + Split signed_magnitude
    df_test3 = df_base.copy()
    if 'signed_magnitude' in df_test3.columns:
        df_test3['factor_movement_split'] = np.sign(df_test3['signed_magnitude'])
        df_test3['factor_magnitude_split'] = np.abs(df_test3['signed_magnitude']) * 100
    
    test3_acc = run_quick_test(df_test3, "TEST 3: + Split signed_magnitude")
    results['split_magnitude'] = test3_acc
    
    # TEST 4: + Rename target (should have no impact on accuracy)
    df_test4 = df_base.rename(columns={'abs_change_1day_after_pct': 'pct_change_1day_after'})
    test4_acc = run_quick_test(df_test4, "TEST 4: + Rename target", target_col='pct_change_1day_after')
    results['rename_target'] = test4_acc
    
    # SUMMARY
    print(f"\\n📊 INDIVIDUAL FIX IMPACT SUMMARY:")
    print(f"=" * 40)
    
    for fix, acc in results.items():
        impact = acc - baseline_acc
        status = "✅ KEEP" if impact >= 0 else "❌ SKIP"
        print(f"   {fix:15s}: {acc:.1f}% ({impact:+.1f}pp) {status}")
    
    # Find best combination
    best_fixes = [fix for fix, acc in results.items() if acc >= baseline_acc]
    print(f"\\n🎯 RECOMMENDED FIXES TO KEEP:")
    for fix in best_fixes:
        print(f"   ✅ {fix}")
    
    return results

def run_quick_test(df, description, target_col='abs_change_1day_after_pct'):
    """Run quick LightGBM test to measure accuracy"""
    print(f"\\n🔬 {description}")
    
    # Prepare target
    y = (df[target_col] > 0).astype(int)
    
    # Prepare features
    exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
    if 'pct_change_1day_after' in df.columns:
        exclude_cols.append('pct_change_1day_after')
    
    binary_flags = [col for col in df.columns if col.endswith('_present')]
    categorical_strings = [col for col in df.columns if df[col].dtype == 'object' and col not in exclude_cols]
    numerical = [col for col in df.columns if df[col].dtype in ['int64', 'float64'] and col not in exclude_cols + binary_flags]
    
    feature_columns = binary_flags + numerical
    X = df[feature_columns].fillna(0).copy()
    
    # Encode categoricals
    for col in categorical_strings:
        le = LabelEncoder()
        X[f"{col}_encoded"] = le.fit_transform(df[col].fillna('unknown').astype(str))
    
    print(f"   Features: {len(X.columns)} ({len(binary_flags)} flags + {len(numerical)} num + {len(categorical_strings)} cat)")
    
    # Quick train/test
    train_size = int(0.8 * len(X))
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    # Fast LightGBM
    lgb_train = lgb.Dataset(X_train, label=y_train)
    lgb_test = lgb.Dataset(X_test, label=y_test, reference=lgb_train)
    
    params = {'objective': 'binary', 'metric': 'binary_logloss', 'verbose': -1}
    model = lgb.train(params, lgb_train, valid_sets=[lgb_test], num_boost_round=30, 
                     callbacks=[lgb.early_stopping(10), lgb.log_evaluation(0)])
    
    pred = model.predict(X_test, num_iteration=model.best_iteration)
    accuracy = accuracy_score(y_test, (pred > 0.5).astype(int)) * 100
    
    print(f"   Accuracy: {accuracy:.1f}%")
    return accuracy

if __name__ == "__main__":
    results = test_individual_fixes()
