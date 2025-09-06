#!/usr/bin/env python3
"""
Corrected Correlation Analysis for AEIOU
Fixes the issues identified by the user:
1. Proper positive ratio calculations
2. Magnitude vs absolute change correlation
3. Movement vs directional correlation
4. Time horizon analysis
"""

import pandas as pd
import numpy as np
from scipy.stats import pearsonr
from sklearn.preprocessing import LabelEncoder
import json
from datetime import datetime
import os

def analyze_corrected_correlations():
    """Run corrected correlation analysis addressing user feedback"""
    print("🔧 Running CORRECTED Correlation Analysis...")
    
    # Load the real data
    data_dir = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data'
    csv_path = os.path.join(data_dir, 'REAL_ml_data_2025-09-04_17-47-54.csv')
    
    df = pd.read_csv(csv_path)
    print(f"✅ Loaded {len(df)} records")
    
    # Define target variables
    alpha_targets = [col for col in df.columns if 'alpha_vs_' in col]
    
    print(f"📊 Found {len(alpha_targets)} alpha targets")
    
    # === CORRECTED ANALYSIS 1: Proper Positive Ratios ===
    print("\n📈 CORRECTED: Alpha Performance Analysis")
    
    for target in alpha_targets[:3]:  # Focus on top 3
        if target in df.columns:
            values = pd.to_numeric(df[target], errors='coerce').dropna()
            
            positive_count = (values > 0).sum()
            negative_count = (values < 0).sum()
            zero_count = (values == 0).sum()
            total = len(values)
            
            print(f"\n{target}:")
            print(f"  Mean Alpha: {values.mean():.4f}")
            print(f"  Positive: {positive_count}/{total} ({100*positive_count/total:.1f}%)")
            print(f"  Negative: {negative_count}/{total} ({100*negative_count/total:.1f}%)")
            print(f"  Zero: {zero_count}/{total} ({100*zero_count/total:.1f}%)")
    
    # === CORRECTED ANALYSIS 2: Magnitude vs Absolute Change ===
    print("\n🔢 CORRECTED: Magnitude vs Absolute Change Correlation")
    
    if 'factor_magnitude' in df.columns:
        magnitude_values = pd.to_numeric(df['factor_magnitude'], errors='coerce')
        
        for target in alpha_targets[:3]:
            if target in df.columns:
                alpha_values = pd.to_numeric(df[target], errors='coerce')
                
                # Correlation with absolute alpha (magnitude should predict size, not direction)
                abs_alpha = np.abs(alpha_values)
                
                # Remove NaN values
                valid_mask = ~(magnitude_values.isna() | alpha_values.isna())
                if valid_mask.sum() > 10:  # Need at least 10 valid points
                    
                    mag_clean = magnitude_values[valid_mask]
                    alpha_clean = alpha_values[valid_mask]
                    abs_alpha_clean = abs_alpha[valid_mask]
                    
                    try:
                        # Directional correlation (should be weak)
                        dir_corr, dir_p = pearsonr(mag_clean, alpha_clean)
                        
                        # Absolute correlation (should be stronger)
                        abs_corr, abs_p = pearsonr(mag_clean, abs_alpha_clean)
                        
                        print(f"\n{target} vs factor_magnitude:")
                        print(f"  Directional correlation: {dir_corr:.4f} (p={dir_p:.4f})")
                        print(f"  Absolute correlation: {abs_corr:.4f} (p={abs_p:.4f})")
                        print(f"  Magnitude range: {mag_clean.min():.3f} to {mag_clean.max():.3f}")
                        
                    except:
                        print(f"  Could not calculate correlation for {target}")
    
    # === CORRECTED ANALYSIS 3: Movement vs Direction ===
    print("\n↕️ CORRECTED: Movement vs Direction Correlation")
    
    if 'factor_movement' in df.columns:
        movement_values = pd.to_numeric(df['factor_movement'], errors='coerce')
        
        for target in alpha_targets[:3]:
            if target in df.columns:
                alpha_values = pd.to_numeric(df[target], errors='coerce')
                
                # Movement should predict sign, not magnitude
                alpha_sign = np.sign(alpha_values)  # -1, 0, 1
                
                # Remove NaN values
                valid_mask = ~(movement_values.isna() | alpha_values.isna())
                if valid_mask.sum() > 10:
                    
                    mov_clean = movement_values[valid_mask]
                    alpha_clean = alpha_values[valid_mask]
                    sign_clean = alpha_sign[valid_mask]
                    
                    try:
                        # Movement vs actual alpha (should be moderate)
                        alpha_corr, alpha_p = pearsonr(mov_clean, alpha_clean)
                        
                        # Movement vs sign (should be stronger)
                        sign_corr, sign_p = pearsonr(mov_clean, sign_clean)
                        
                        print(f"\n{target} vs factor_movement:")
                        print(f"  Alpha correlation: {alpha_corr:.4f} (p={alpha_p:.4f})")
                        print(f"  Sign correlation: {sign_corr:.4f} (p={sign_p:.4f})")
                        
                        # Show the actual distribution
                        movement_dist = mov_clean.value_counts().sort_index()
                        print(f"  Movement distribution: {dict(movement_dist)}")
                        
                    except:
                        print(f"  Could not calculate correlation for {target}")
    
    # === ANALYSIS 4: Time Horizon Impact ===
    print("\n📅 Time Horizon Analysis")
    
    if 'article_published_at' in df.columns:
        dates = pd.to_datetime(df['article_published_at'], errors='coerce')
        valid_dates = dates.dropna()
        
        if len(valid_dates) > 0:
            date_range = valid_dates.max() - valid_dates.min()
            unique_dates = valid_dates.dt.date.nunique()
            
            print(f"  Date range: {valid_dates.min().date()} to {valid_dates.max().date()}")
            print(f"  Total span: {date_range.days} days")
            print(f"  Unique dates: {unique_dates}")
            print(f"  Coverage: {100*unique_dates/date_range.days:.1f}% of possible days")
            
            # Group by month to see distribution
            monthly_dist = valid_dates.dt.to_period('M').value_counts().sort_index()
            print(f"  Monthly distribution:")
            for month, count in monthly_dist.items():
                print(f"    {month}: {count} articles")
    
    # === ANALYSIS 5: Factor Category Performance (Corrected) ===
    print("\n📊 CORRECTED: Factor Category Performance")
    
    if 'factor_category' in df.columns:
        target = 'alpha_vs_spy_1day_after'  # Focus on main target
        
        if target in df.columns:
            alpha_values = pd.to_numeric(df[target], errors='coerce')
            
            category_performance = df.groupby('factor_category').agg({
                target: ['count', 'mean', 'std', lambda x: (pd.to_numeric(x, errors='coerce') > 0).sum()]
            }).round(4)
            
            category_performance.columns = ['count', 'mean_alpha', 'std_alpha', 'positive_count']
            category_performance['positive_rate'] = (
                category_performance['positive_count'] / category_performance['count'] * 100
            ).round(1)
            
            print(f"\nCategory Performance for {target}:")
            print(category_performance.sort_values('mean_alpha', ascending=False))

def main():
    try:
        analyze_corrected_correlations()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
