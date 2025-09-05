#!/usr/bin/env python3
"""
Advanced Factor Interaction Analysis for AEIOU
Multi-dimensional factor combination discovery
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
import itertools
from scipy.stats import pearsonr
import seaborn as sns
import matplotlib.pyplot as plt

class AdvancedFactorAnalyzer:
    """
    Analyzes complex factor interactions beyond simple Random Forest
    """
    
    def __init__(self):
        self.interaction_results = {}
        self.composite_scores = {}
        self.temporal_patterns = {}
    
    def analyze_multiplicative_interactions(self, df, target_col='alpha_vs_spy_1day_after'):
        """
        Discover multiplicative factor interactions (magnitude × certainty × regime)
        """
        print(f"🔍 Analyzing multiplicative interactions for {target_col}")
        
        # Define multiplicative interaction groups
        belief_factors = ['factor_magnitude', 'causal_certainty', 'regime_alignment']
        credibility_factors = ['article_source_credibility', 'article_author_credibility', 'evidence_level']
        market_factors = ['market_perception_intensity', 'market_perception_hope_vs_fear']
        
        interactions = {}
        
        # Test belief strength composite
        if all(col in df.columns for col in belief_factors):
            # Handle categorical values in numeric columns
            def safe_float_convert(series):
                try:
                    return pd.to_numeric(series, errors='coerce').fillna(0)
                except:
                    # If categorical, encode as numbers
                    from sklearn.preprocessing import LabelEncoder
                    le = LabelEncoder()
                    return le.fit_transform(series.astype(str))
            
            df['belief_strength'] = (
                safe_float_convert(df['factor_magnitude']) * 
                safe_float_convert(df['causal_certainty']) * 
                safe_float_convert(df['regime_alignment'])
            )
            
            correlation, p_value = pearsonr(df['belief_strength'], df[target_col])
            interactions['belief_strength'] = {
                'correlation': correlation,
                'p_value': p_value,
                'components': belief_factors
            }
            print(f"   Belief Strength: r={correlation:.3f}, p={p_value:.3f}")
        
        # Test credibility composite
        if all(col in df.columns for col in credibility_factors):
            credibility_cols = [col for col in credibility_factors if col in df.columns]
            
            # Safe conversion for credibility factors
            credibility_values = []
            for col in credibility_cols:
                credibility_values.append(safe_float_convert(df[col]))
            
            if credibility_values:
                df['credibility_score'] = np.prod(credibility_values, axis=0)
            
            correlation, p_value = pearsonr(df['credibility_score'], df[target_col])
            interactions['credibility_score'] = {
                'correlation': correlation,
                'p_value': p_value,
                'components': credibility_cols
            }
            print(f"   Credibility Score: r={correlation:.3f}, p={p_value:.3f}")
        
        return interactions
    
    def analyze_factor_name_patterns(self, df, target_col='alpha_vs_spy_1day_after'):
        """
        Analyze which specific factor names predict alpha
        """
        print(f"🏷️ Analyzing factor name patterns for {target_col}")
        
        if 'factor_name' not in df.columns:
            print("   ⚠️ factor_name column not found")
            return {}
        
        factor_performance = {}
        
        # Group by factor name and calculate average alpha
        factor_groups = df.groupby('factor_name')[target_col].agg(['mean', 'std', 'count'])
        
        # Filter for factors with enough samples
        significant_factors = factor_groups[factor_groups['count'] >= 3]
        significant_factors = significant_factors.sort_values('mean', ascending=False)
        
        print(f"   📊 Found {len(significant_factors)} factor names with ≥3 samples")
        print("   🏆 Top performing factor names:")
        for factor_name, stats in significant_factors.head(10).iterrows():
            print(f"      {factor_name}: {stats['mean']:.3f}±{stats['std']:.3f} (n={stats['count']})")
        
        return significant_factors.to_dict('index')
    
    def analyze_temporal_orientation_effects(self, df):
        """
        Analyze how predictive vs reflective articles correlate with past/future
        """
        print("⏰ Analyzing temporal orientation effects")
        
        if 'factor_orientation' not in df.columns:
            print("   ⚠️ factor_orientation column not found")
            return {}
        
        temporal_results = {}
        
        # Analyze predictive articles
        predictive_df = df[df['factor_orientation'] == 'predictive']
        reflective_df = df[df['factor_orientation'] == 'reflective']
        
        if len(predictive_df) > 5:
            # Correlate predictive articles with future alpha
            future_cols = [col for col in df.columns if 'after' in col and 'alpha' in col]
            predictive_correlations = {}
            
            for col in future_cols:
                if col in predictive_df.columns:
                    corr, p_val = pearsonr(predictive_df['factor_magnitude'].astype(float), 
                                         predictive_df[col].astype(float))
                    predictive_correlations[col] = {'correlation': corr, 'p_value': p_val}
            
            temporal_results['predictive'] = predictive_correlations
            print(f"   📈 Predictive articles (n={len(predictive_df)}): analyzed future correlations")
        
        if len(reflective_df) > 5:
            # Correlate reflective articles with past alpha (would need past data)
            # For now, analyze present correlation
            reflective_correlations = {}
            
            # Assuming we have some "before" columns or can infer from current data
            current_cols = [col for col in df.columns if 'alpha_vs_spy' in col]
            
            for col in current_cols:
                if col in reflective_df.columns:
                    corr, p_val = pearsonr(reflective_df['factor_magnitude'].astype(float), 
                                         reflective_df[col].astype(float))
                    reflective_correlations[col] = {'correlation': corr, 'p_value': p_val}
            
            temporal_results['reflective'] = reflective_correlations
            print(f"   📉 Reflective articles (n={len(reflective_df)}): analyzed present correlations")
        
        return temporal_results
    
    def analyze_event_tag_combinations(self, df, target_col='alpha_vs_spy_1day_after'):
        """
        Analyze event tags and their combinations
        """
        print(f"🏷️ Analyzing event tag combinations for {target_col}")
        
        if 'event_tags' not in df.columns:
            print("   ⚠️ event_tags column not found")
            return {}
        
        # Parse event tags (assuming comma-separated)
        tag_performance = {}
        
        for idx, row in df.iterrows():
            if pd.notna(row['event_tags']):
                tags = str(row['event_tags']).split(',')
                alpha_value = row[target_col]
                
                for tag in tags:
                    tag = tag.strip()
                    if tag not in tag_performance:
                        tag_performance[tag] = []
                    tag_performance[tag].append(float(alpha_value))
        
        # Calculate statistics for each tag
        tag_stats = {}
        for tag, values in tag_performance.items():
            if len(values) >= 3:  # Minimum sample size
                tag_stats[tag] = {
                    'mean_alpha': np.mean(values),
                    'std_alpha': np.std(values),
                    'count': len(values),
                    'median_alpha': np.median(values)
                }
        
        # Sort by mean alpha
        sorted_tags = sorted(tag_stats.items(), key=lambda x: x[1]['mean_alpha'], reverse=True)
        
        print(f"   📊 Found {len(sorted_tags)} event tags with ≥3 samples")
        print("   🏆 Top performing event tags:")
        for tag, stats in sorted_tags[:10]:
            print(f"      {tag}: {stats['mean_alpha']:.3f}±{stats['std_alpha']:.3f} (n={stats['count']})")
        
        return dict(sorted_tags)
    
    def generate_composite_factor_scores(self, df):
        """
        Generate composite scores based on discovered interactions
        """
        print("🧮 Generating composite factor scores")
        
        composite_df = df.copy()
        
        # Belief strength score
        if all(col in df.columns for col in ['factor_magnitude', 'causal_certainty']):
            composite_df['belief_strength'] = (
                df['factor_magnitude'].astype(float) * 
                df['causal_certainty'].astype(float)
            )
            print("   ✅ Created belief_strength composite")
        
        # Market amplifier score
        market_cols = ['market_perception_intensity', 'market_perception_hope_vs_fear']
        if all(col in df.columns for col in market_cols):
            composite_df['market_amplifier'] = df[market_cols].astype(float).mean(axis=1)
            print("   ✅ Created market_amplifier composite")
        
        # Credibility weighted magnitude
        if all(col in df.columns for col in ['factor_magnitude', 'article_source_credibility']):
            composite_df['credibility_weighted_magnitude'] = (
                df['factor_magnitude'].astype(float) * 
                df['article_source_credibility'].astype(float)
            )
            print("   ✅ Created credibility_weighted_magnitude composite")
        
        return composite_df
    
    def run_comprehensive_analysis(self, csv_path):
        """
        Run complete advanced factor analysis
        """
        print("🚀 Starting Comprehensive Factor Analysis")
        print(f"📂 Loading data from {csv_path}")
        
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(df)} samples with {len(df.columns)} features")
        
        results = {
            'multiplicative_interactions': {},
            'factor_name_patterns': {},
            'temporal_orientation_effects': {},
            'event_tag_combinations': {},
            'composite_scores': {}
        }
        
        # Analyze for each alpha target
        alpha_targets = [col for col in df.columns if col.startswith('alpha_vs_')]
        
        for target in alpha_targets[:3]:  # Limit to first 3 for speed
            print(f"\n🎯 Analyzing target: {target}")
            
            # Multiplicative interactions
            results['multiplicative_interactions'][target] = self.analyze_multiplicative_interactions(df, target)
            
            # Factor name patterns
            results['factor_name_patterns'][target] = self.analyze_factor_name_patterns(df, target)
            
            # Event tag combinations
            results['event_tag_combinations'][target] = self.analyze_event_tag_combinations(df, target)
        
        # Temporal orientation effects (across all targets)
        results['temporal_orientation_effects'] = self.analyze_temporal_orientation_effects(df)
        
        # Generate composite scores
        composite_df = self.generate_composite_factor_scores(df)
        results['composite_scores'] = {
            'new_columns': [col for col in composite_df.columns if col not in df.columns],
            'sample_correlations': {}
        }
        
        # Save enhanced dataset
        output_path = csv_path.replace('.csv', '_enhanced.csv')
        composite_df.to_csv(output_path, index=False)
        print(f"💾 Enhanced dataset saved to {output_path}")
        
        return results

if __name__ == "__main__":
    analyzer = AdvancedFactorAnalyzer()
    
    # Run on our real data
    csv_path = "/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/REAL_ml_data_2025-09-04_17-47-54.csv"
    results = analyzer.run_comprehensive_analysis(csv_path)
    
    print("\n🎉 Analysis complete!")
    print("📊 Key findings will be displayed above")
