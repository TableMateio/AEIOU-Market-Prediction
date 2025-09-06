#!/usr/bin/env python3
"""
Comprehensive Temporal Correlation Analysis for AEIOU
Analyzes correlations across all time horizons (past/future 1-day, 7-day, etc.)
Shows detailed breakdown by factor categories and business events
"""

import pandas as pd
import numpy as np
from scipy.stats import pearsonr
from sklearn.preprocessing import LabelEncoder
import json
from datetime import datetime
import os

class ComprehensiveTemporalAnalyzer:
    """
    Analyzes temporal correlations across all time horizons and factor categories
    """
    
    def __init__(self):
        self.results = {}
        
    def analyze_temporal_correlations(self, df):
        """Analyze correlations across all temporal windows"""
        print("🕐 Analyzing temporal correlations across all time horizons...")
        
        # Define temporal targets (alpha vs SPY and QQQ)
        temporal_targets = {
            # Past correlations
            'past_1day_spy': 'alpha_vs_spy_1day_before',
            'past_1week_spy': 'alpha_vs_spy_1week_before', 
            'past_1day_qqq': 'alpha_vs_qqq_1day_before',
            'past_1week_qqq': 'alpha_vs_qqq_1week_before',
            
            # Future correlations
            'future_1day_spy': 'alpha_vs_spy_1day_after',
            'future_1week_spy': 'alpha_vs_spy_1week_after',
            'future_1day_qqq': 'alpha_vs_qqq_1day_after', 
            'future_1week_qqq': 'alpha_vs_qqq_1week_after',
            
            # Additional time horizons
            'future_1hour_spy': 'alpha_vs_spy_1hour_after',
            'future_1month_spy': 'alpha_vs_spy_1month_after',
            'past_1hour_spy': 'alpha_vs_spy_1hour_before',
            'past_1month_spy': 'alpha_vs_spy_1month_before'
        }
        
        # Input features to analyze
        input_features = [
            'factor_magnitude', 'factor_movement', 'factor_category', 'factor_name',
            'factor_orientation', 'event_orientation', 'event_type', 'market_regime',
            'article_source_credibility', 'article_author_credibility',
            'causal_certainty', 'logical_directness', 'regime_alignment'
        ]
        
        temporal_results = {}
        
        for time_label, target_col in temporal_targets.items():
            if target_col not in df.columns:
                continue
                
            print(f"   📊 Analyzing {time_label} ({target_col})...")
            
            target_values = pd.to_numeric(df[target_col], errors='coerce').fillna(0)
            time_results = {
                'target_column': target_col,
                'mean_alpha': float(target_values.mean()),
                'std_alpha': float(target_values.std()),
                'positive_rate': float((target_values > 0).mean()),
                'correlations': {}
            }
            
            # Analyze correlation with each input feature
            for feature in input_features:
                if feature not in df.columns:
                    continue
                    
                feature_corr = self.calculate_feature_correlation(df[feature], target_values)
                time_results['correlations'][feature] = feature_corr
            
            temporal_results[time_label] = time_results
        
        return temporal_results
    
    def calculate_feature_correlation(self, feature_series, target_series):
        """Calculate correlation between feature and target with proper encoding"""
        try:
            # Handle categorical features
            if feature_series.dtype == 'object' or isinstance(feature_series.iloc[0], str):
                le = LabelEncoder()
                feature_numeric = le.fit_transform(feature_series.fillna('unknown'))
            else:
                feature_numeric = pd.to_numeric(feature_series, errors='coerce').fillna(0)
            
            # Calculate correlation
            correlation, p_value = pearsonr(feature_numeric, target_series)
            
            return {
                'correlation': float(correlation) if not np.isnan(correlation) else 0.0,
                'p_value': float(p_value) if not np.isnan(p_value) else 1.0,
                'abs_correlation': float(abs(correlation)) if not np.isnan(correlation) else 0.0,
                'significant': p_value < 0.05 if not np.isnan(p_value) else False
            }
        except:
            return {
                'correlation': 0.0,
                'p_value': 1.0,
                'abs_correlation': 0.0,
                'significant': False
            }
    
    def analyze_factor_category_performance(self, df):
        """Analyze performance by factor categories across all time horizons"""
        print("📊 Analyzing factor category performance across time...")
        
        if 'factor_category' not in df.columns:
            return {}
            
        # Key temporal targets to analyze
        key_targets = [
            'alpha_vs_spy_1day_before', 'alpha_vs_spy_1week_before',
            'alpha_vs_spy_1day_after', 'alpha_vs_spy_1week_after',
            'alpha_vs_qqq_1day_after', 'alpha_vs_qqq_1week_after'
        ]
        
        category_results = {}
        categories = df['factor_category'].unique()
        
        for category in categories:
            if pd.isna(category):
                continue
                
            category_data = df[df['factor_category'] == category]
            category_results[str(category)] = {
                'count': len(category_data),
                'temporal_performance': {}
            }
            
            for target in key_targets:
                if target not in df.columns:
                    continue
                    
                target_values = pd.to_numeric(category_data[target], errors='coerce').fillna(0)
                
                category_results[str(category)]['temporal_performance'][target] = {
                    'mean_alpha': float(target_values.mean()),
                    'median_alpha': float(target_values.median()),
                    'positive_rate': float((target_values > 0).mean()),
                    'negative_rate': float((target_values < 0).mean()),
                    'std_alpha': float(target_values.std())
                }
        
        return category_results
    
    def analyze_factor_name_performance(self, df):
        """Analyze performance by specific factor names"""
        print("📋 Analyzing individual factor name performance...")
        
        if 'factor_name' not in df.columns:
            return {}
            
        # Focus on most common factor names
        factor_counts = df['factor_name'].value_counts()
        top_factors = factor_counts.head(20).index  # Top 20 most common factors
        
        factor_results = {}
        key_targets = ['alpha_vs_spy_1day_after', 'alpha_vs_spy_1week_after']
        
        for factor_name in top_factors:
            if pd.isna(factor_name):
                continue
                
            factor_data = df[df['factor_name'] == factor_name]
            factor_results[str(factor_name)] = {
                'count': len(factor_data),
                'performance': {}
            }
            
            for target in key_targets:
                if target not in df.columns:
                    continue
                    
                target_values = pd.to_numeric(factor_data[target], errors='coerce').fillna(0)
                
                factor_results[str(factor_name)]['performance'][target] = {
                    'mean_alpha': float(target_values.mean()),
                    'positive_rate': float((target_values > 0).mean()),
                    'best_magnitude': self.find_best_magnitude(factor_data, target)
                }
        
        return factor_results
    
    def find_best_magnitude(self, factor_data, target):
        """Find which magnitude performs best for this factor"""
        if 'factor_magnitude' not in factor_data.columns or target not in factor_data.columns:
            return None
            
        magnitude_performance = {}
        for magnitude in factor_data['factor_magnitude'].unique():
            if pd.isna(magnitude):
                continue
                
            magnitude_data = factor_data[factor_data['factor_magnitude'] == magnitude]
            target_values = pd.to_numeric(magnitude_data[target], errors='coerce').fillna(0)
            
            if len(target_values) > 0:
                magnitude_performance[str(magnitude)] = float(target_values.mean())
        
        if magnitude_performance:
            best_magnitude = max(magnitude_performance, key=magnitude_performance.get)
            return {
                'magnitude': best_magnitude,
                'mean_alpha': magnitude_performance[best_magnitude]
            }
        
        return None
    
    def create_comprehensive_summary(self, temporal_results, category_results, factor_results):
        """Create comprehensive markdown summary"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_dir = f'/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/comprehensive_correlation_{timestamp}'
        os.makedirs(output_dir, exist_ok=True)
        
        # Convert numpy types for JSON serialization
        def convert_for_json(obj):
            if isinstance(obj, (np.bool_, bool)):
                return bool(obj)
            elif isinstance(obj, (np.integer, int)):
                return int(obj)
            elif isinstance(obj, (np.floating, float)):
                return float(obj)
            elif isinstance(obj, dict):
                return {k: convert_for_json(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_for_json(v) for v in obj]
            else:
                return obj
        
        # Save raw results
        with open(f'{output_dir}/temporal_correlations.json', 'w') as f:
            json.dump(convert_for_json(temporal_results), f, indent=2)
        
        with open(f'{output_dir}/category_performance.json', 'w') as f:
            json.dump(convert_for_json(category_results), f, indent=2)
        
        with open(f'{output_dir}/factor_performance.json', 'w') as f:
            json.dump(convert_for_json(factor_results), f, indent=2)
        
        # Create comprehensive markdown summary
        with open(f'{output_dir}/COMPREHENSIVE_CORRELATION_SUMMARY.md', 'w') as f:
            f.write("# AEIOU Comprehensive Temporal Correlation Analysis\n\n")
            f.write(f"Analysis run on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            # Temporal correlations section
            f.write("## 📅 Temporal Correlation Analysis\n\n")
            f.write("### Past vs Future Performance Comparison\n\n")
            f.write("| Time Horizon | Mean Alpha | Positive Rate | Strongest Factor Correlation |\n")
            f.write("|--------------|------------|---------------|------------------------------|\n")
            
            for time_label, data in temporal_results.items():
                strongest_corr = max(data['correlations'].items(), 
                                   key=lambda x: x[1]['abs_correlation']) if data['correlations'] else ('none', {'correlation': 0})
                
                f.write(f"| {time_label} | {data['mean_alpha']:.4f} | {data['positive_rate']:.1%} | {strongest_corr[0]} ({strongest_corr[1]['correlation']:.3f}) |\n")
            
            # Factor category performance
            f.write("\n## 📊 Factor Category Performance Across Time\n\n")
            for category, data in category_results.items():
                f.write(f"### {category} ({data['count']} records)\n\n")
                f.write("| Time Horizon | Mean Alpha | Positive Rate |\n")
                f.write("|--------------|------------|---------------|\n")
                
                for target, perf in data['temporal_performance'].items():
                    f.write(f"| {target} | {perf['mean_alpha']:.4f} | {perf['positive_rate']:.1%} |\n")
                f.write("\n")
            
            # Top factor names
            f.write("## 🎯 Top Performing Factor Names\n\n")
            
            # Sort factors by 1-day performance
            sorted_factors = sorted(factor_results.items(), 
                                  key=lambda x: x[1]['performance'].get('alpha_vs_spy_1day_after', {}).get('mean_alpha', -999),
                                  reverse=True)
            
            f.write("| Factor Name | Count | 1-Day Alpha | 1-Week Alpha | Best Magnitude |\n")
            f.write("|-------------|-------|-------------|--------------|----------------|\n")
            
            for factor_name, data in sorted_factors[:15]:  # Top 15
                day_perf = data['performance'].get('alpha_vs_spy_1day_after', {})
                week_perf = data['performance'].get('alpha_vs_spy_1week_after', {})
                best_mag = data['performance'].get('alpha_vs_spy_1day_after', {}).get('best_magnitude')
                
                mag_str = f"{best_mag['magnitude']} ({best_mag['mean_alpha']:.3f})" if best_mag else 'N/A'
                
                f.write(f"| {factor_name} | {data['count']} | {day_perf.get('mean_alpha', 0):.4f} | {week_perf.get('mean_alpha', 0):.4f} | {mag_str} |\n")
            
            # Key insights
            f.write("\n## 🔍 Key Insights\n\n")
            
            # Find best and worst performing time horizons
            best_time = max(temporal_results.items(), key=lambda x: x[1]['mean_alpha'])
            worst_time = min(temporal_results.items(), key=lambda x: x[1]['mean_alpha'])
            
            f.write(f"### Temporal Patterns\n")
            f.write(f"- **Best Time Horizon**: {best_time[0]} (Mean Alpha: {best_time[1]['mean_alpha']:.4f})\n")
            f.write(f"- **Worst Time Horizon**: {worst_time[0]} (Mean Alpha: {worst_time[1]['mean_alpha']:.4f})\n")
            
            # Find best and worst categories
            best_category = max(category_results.items(), 
                              key=lambda x: x[1]['temporal_performance'].get('alpha_vs_spy_1day_after', {}).get('mean_alpha', -999))
            worst_category = min(category_results.items(), 
                               key=lambda x: x[1]['temporal_performance'].get('alpha_vs_spy_1day_after', {}).get('mean_alpha', 999))
            
            f.write(f"\n### Category Performance\n")
            f.write(f"- **Best Category**: {best_category[0]} (1-day Alpha: {best_category[1]['temporal_performance'].get('alpha_vs_spy_1day_after', {}).get('mean_alpha', 0):.4f})\n")
            f.write(f"- **Worst Category**: {worst_category[0]} (1-day Alpha: {worst_category[1]['temporal_performance'].get('alpha_vs_spy_1day_after', {}).get('mean_alpha', 0):.4f})\n")
            
            f.write(f"\n### Trading Recommendations\n")
            f.write(f"- Focus on **{best_category[0]}** factors during **{best_time[0].replace('_', ' ')}** periods\n")
            f.write(f"- Avoid **{worst_category[0]}** factors, especially during **{worst_time[0].replace('_', ' ')}** periods\n")
            f.write(f"- Past performance correlation suggests {'strong' if abs(temporal_results.get('past_1day_spy', {}).get('mean_alpha', 0)) > 0.1 else 'weak'} momentum patterns\n")
        
        print(f"\n📁 Comprehensive analysis saved to: {output_dir}")
        print(f"📋 Check COMPREHENSIVE_CORRELATION_SUMMARY.md for detailed results")
        
        return output_dir

def main():
    """Main analysis function"""
    print("🚀 Starting Comprehensive Temporal Correlation Analysis...")
    
    # Look for the most recent CSV file with real data
    data_dir = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data'
    csv_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    
    if not csv_files:
        print("❌ No CSV files found. Need to export data first.")
        return
    
    # Use the CSV with real data structure
    target_csv = 'REAL_ml_data_2025-09-04_17-47-54.csv'
    if target_csv in csv_files:
        csv_path = os.path.join(data_dir, target_csv)
    else:
        # Fallback to most recent
        latest_csv = max(csv_files, key=lambda x: os.path.getctime(os.path.join(data_dir, x)))
        csv_path = os.path.join(data_dir, latest_csv)
    
    print(f"📊 Loading data from: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(df)} records with {len(df.columns)} columns")
        
        analyzer = ComprehensiveTemporalAnalyzer()
        
        # Run temporal correlation analysis
        temporal_results = analyzer.analyze_temporal_correlations(df)
        
        # Run category performance analysis
        category_results = analyzer.analyze_factor_category_performance(df)
        
        # Run factor name analysis
        factor_results = analyzer.analyze_factor_name_performance(df)
        
        # Create comprehensive summary
        output_dir = analyzer.create_comprehensive_summary(temporal_results, category_results, factor_results)
        
        print("\n🎉 Comprehensive Analysis Complete!")
        print(f"📁 Results saved to: {output_dir}")
        
        # Print key findings
        print("\n🔝 Key Temporal Findings:")
        best_time = max(temporal_results.items(), key=lambda x: x[1]['mean_alpha'])
        worst_time = min(temporal_results.items(), key=lambda x: x[1]['mean_alpha'])
        
        print(f"✅ Best Time Horizon: {best_time[0]} (Alpha: {best_time[1]['mean_alpha']:.4f})")
        print(f"❌ Worst Time Horizon: {worst_time[0]} (Alpha: {worst_time[1]['mean_alpha']:.4f})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
