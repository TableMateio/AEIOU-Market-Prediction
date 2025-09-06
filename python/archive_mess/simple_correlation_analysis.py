#!/usr/bin/env python3
"""
Simple Correlation Analysis for AEIOU
Creates a clear table showing each field's correlation with price movements
"""

import pandas as pd
import numpy as np
from scipy.stats import pearsonr
from sklearn.preprocessing import LabelEncoder
import json
from datetime import datetime
import os

class SimpleCorrelationAnalyzer:
    """
    Analyzes simple correlations between all fields and price movements
    """
    
    def __init__(self):
        self.correlation_results = {}
        self.categorical_performance = {}
    
    def safe_numeric_conversion(self, series):
        """Convert series to numeric, handling categorical values"""
        try:
            # Try direct numeric conversion first
            numeric_series = pd.to_numeric(series, errors='coerce')
            
            # If we get mostly NaN, it's probably categorical
            if numeric_series.isna().sum() > len(series) * 0.8:
                # Use label encoding for categorical data
                le = LabelEncoder()
                return le.fit_transform(series.fillna('unknown'))
            else:
                return numeric_series.fillna(0)
        except:
            # Fallback: label encode everything
            le = LabelEncoder()
            return le.fit_transform(series.astype(str).fillna('unknown'))
    
    def analyze_field_correlations(self, df):
        """Analyze correlation between all input fields and target variables"""
        print("🔍 Analyzing field correlations with price movements...")
        
        # Define target variables (alpha calculations)
        target_vars = [col for col in df.columns if 'alpha_vs_' in col or 'return_' in col]
        
        # Define metadata columns to exclude from analysis
        metadata_cols = ['id', 'business_factor_id', 'article_id', 'causal_events_ai_id', 
                        'event_timestamp', 'article_published_at', 'created_at', 'updated_at']
        
        input_fields = [col for col in df.columns if col not in target_vars and col not in metadata_cols]
        
        print(f"📊 Found {len(input_fields)} input fields and {len(target_vars)} target variables")
        
        correlation_results = []
        
        for field in input_fields:
            print(f"   📊 Analyzing {field}...")
            
            # Convert field to numeric
            field_numeric = self.safe_numeric_conversion(df[field])
            
            field_result = {
                'field_name': field,
                'data_type': str(df[field].dtype),
                'unique_values': df[field].nunique(),
                'correlations': {}
            }
            
            # Calculate correlation with each target
            for target in target_vars:
                if target in df.columns:
                    target_numeric = pd.to_numeric(df[target], errors='coerce').fillna(0)
                    
                    try:
                        correlation, p_value = pearsonr(field_numeric, target_numeric)
                        
                        field_result['correlations'][target] = {
                            'correlation': float(correlation) if not np.isnan(correlation) else 0.0,
                            'p_value': float(p_value) if not np.isnan(p_value) else 1.0,
                            'abs_correlation': float(abs(correlation)) if not np.isnan(correlation) else 0.0,
                            'significant': p_value < 0.05 if not np.isnan(p_value) else False
                        }
                    except:
                        field_result['correlations'][target] = {
                            'correlation': 0.0,
                            'p_value': 1.0,
                            'abs_correlation': 0.0,
                            'significant': False
                        }
            
            correlation_results.append(field_result)
        
        return correlation_results
    
    def analyze_categorical_performance(self, df):
        """Analyze which categorical values perform better/worse"""
        print("📊 Analyzing categorical field performance")
        
        # Focus on key categorical fields
        categorical_fields = ['factor_name', 'factor_category', 'factor_orientation', 'event_orientation']
        target_vars = [col for col in df.columns if 'alpha_vs_' in col]
        
        categorical_results = {}
        
        for field in categorical_fields:
            if field in df.columns:
                print(f"   📊 Analyzing categorical values in {field}...")
                
                field_results = {}
                unique_values = df[field].unique()
                
                for value in unique_values:
                    if pd.isna(value):
                        continue
                        
                    # Get subset of data for this categorical value
                    subset = df[df[field] == value]
                    
                    value_performance = {
                        'count': len(subset),
                        'performance': {}
                    }
                    
                    # Calculate average performance for each target
                    for target in target_vars:
                        if target in df.columns:
                            target_values = pd.to_numeric(subset[target], errors='coerce').fillna(0)
                            
                            value_performance['performance'][target] = {
                                'mean': float(target_values.mean()),
                                'median': float(target_values.median()),
                                'positive_ratio': float((target_values > 0).mean()),
                                'negative_ratio': float((target_values < 0).mean())
                            }
                    
                    field_results[str(value)] = value_performance
                
                categorical_results[field] = field_results
        
        return categorical_results
    
    def create_correlation_summary(self, correlation_results):
        """Create a summary table of correlations"""
        print("📋 Creating correlation summary...")
        
        summary_data = []
        
        for field_result in correlation_results:
            field_name = field_result['field_name']
            
            # Get strongest correlation across all targets
            max_abs_corr = 0
            best_target = None
            best_correlation = 0
            
            for target, corr_data in field_result['correlations'].items():
                abs_corr = corr_data['abs_correlation']
                if abs_corr > max_abs_corr:
                    max_abs_corr = abs_corr
                    best_target = target
                    best_correlation = corr_data['correlation']
            
            summary_data.append({
                'field_name': field_name,
                'data_type': field_result['data_type'],
                'unique_values': field_result['unique_values'],
                'strongest_correlation': best_correlation,
                'strongest_target': best_target,
                'abs_correlation': max_abs_corr,
                'significant': any(corr['significant'] for corr in field_result['correlations'].values())
            })
        
        # Sort by absolute correlation strength
        summary_data.sort(key=lambda x: x['abs_correlation'], reverse=True)
        
        return summary_data
    
    def save_results(self, correlation_results, categorical_results, summary_data):
        """Save all results to files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_dir = f'/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/correlation_analysis_{timestamp}'
        os.makedirs(output_dir, exist_ok=True)
        
        # Save detailed correlation results
        with open(f'{output_dir}/detailed_correlations.json', 'w') as f:
            # Convert any numpy types to native Python types for JSON serialization
            def convert_for_json(obj):
                if isinstance(obj, np.bool_):
                    return bool(obj)
                elif isinstance(obj, np.integer):
                    return int(obj)
                elif isinstance(obj, np.floating):
                    return float(obj)
                elif isinstance(obj, dict):
                    return {k: convert_for_json(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_for_json(v) for v in obj]
                else:
                    return obj
            
            json.dump(convert_for_json(correlation_results), f, indent=2)
        
        # Save categorical performance results
        with open(f'{output_dir}/categorical_performance.json', 'w') as f:
            json.dump(convert_for_json(categorical_results), f, indent=2)
        
        # Save summary as both JSON and readable markdown
        with open(f'{output_dir}/correlation_summary.json', 'w') as f:
            json.dump(convert_for_json(summary_data), f, indent=2)
        
        # Create readable markdown summary
        with open(f'{output_dir}/CORRELATION_SUMMARY.md', 'w') as f:
            f.write("# AEIOU Correlation Analysis Summary\n\n")
            f.write(f"Analysis run on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## Top Correlations with Stock Performance\n\n")
            f.write("| Field Name | Correlation | Target | Significant | Data Type | Unique Values |\n")
            f.write("|------------|-------------|---------|-------------|-----------|---------------|\n")
            
            for item in summary_data[:20]:  # Top 20
                f.write(f"| {item['field_name']} | {item['strongest_correlation']:.4f} | {item['strongest_target']} | {'✅' if item['significant'] else '❌'} | {item['data_type']} | {item['unique_values']} |\n")
            
            f.write("\n## Categorical Performance Analysis\n\n")
            for field, values in categorical_results.items():
                f.write(f"### {field}\n\n")
                
                # Sort by mean alpha performance
                sorted_values = sorted(values.items(), 
                                     key=lambda x: x[1]['performance'].get('alpha_vs_spy_1day_after', {}).get('mean', 0), 
                                     reverse=True)
                
                f.write("| Value | Count | Mean Alpha (SPY) | Positive Ratio |\n")
                f.write("|-------|-------|------------------|----------------|\n")
                
                for value, data in sorted_values[:10]:  # Top 10
                    alpha_data = data['performance'].get('alpha_vs_spy_1day_after', {})
                    mean_alpha = alpha_data.get('mean', 0)
                    pos_ratio = alpha_data.get('positive_ratio', 0)
                    f.write(f"| {value} | {data['count']} | {mean_alpha:.4f} | {pos_ratio:.2%} |\n")
                
                f.write("\n")
        
        print(f"📁 Results saved to: {output_dir}")
        return output_dir

def main():
    """Main analysis function"""
    print("🚀 Starting Simple Correlation Analysis on REAL ML Training Data")
    
    # Look for the most recent CSV file
    data_dir = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data'
    csv_files = [f for f in os.listdir(data_dir) if f.endswith('.csv')]
    
    if not csv_files:
        print("❌ No CSV files found. Need to export data first.")
        return
    
    # Use the REAL CSV file with proper format
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
        
        analyzer = SimpleCorrelationAnalyzer()
        
        # Run correlation analysis
        correlation_results = analyzer.analyze_field_correlations(df)
        
        # Run categorical analysis
        categorical_results = analyzer.analyze_categorical_performance(df)
        
        # Create summary
        summary_data = analyzer.create_correlation_summary(correlation_results)
        
        # Save results
        output_dir = analyzer.save_results(correlation_results, categorical_results, summary_data)
        
        print("\n🎉 Analysis Complete!")
        print(f"📁 Results saved to: {output_dir}")
        print(f"📋 Check CORRELATION_SUMMARY.md for readable results")
        
        # Print top 10 correlations
        print("\n🔝 Top 10 Strongest Correlations:")
        for i, item in enumerate(summary_data[:10], 1):
            print(f"{i:2d}. {item['field_name']:<30} | {item['strongest_correlation']:>7.4f} | {item['strongest_target']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
