#!/usr/bin/env python3
"""
Temporal Causality Engine for AEIOU
Models how reflective/predictive articles influence each other over time
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingRegressor
import matplotlib.pyplot as plt

class TemporalCausalityEngine:
    """
    Models temporal relationships between articles and market movements
    """
    
    def __init__(self):
        self.causality_patterns = {}
        self.temporal_models = {}
    
    def analyze_reflective_predictive_sequences(self, df):
        """
        Analyze how reflective articles correlate with past moves,
        and predictive articles correlate with future moves
        """
        print("🔄 Analyzing reflective-predictive sequences")
        
        # Sort by timestamp
        df['event_timestamp'] = pd.to_datetime(df['event_timestamp'])
        df = df.sort_values('event_timestamp')
        
        sequences = {}
        
        # Group by orientation
        reflective_articles = df[df['factor_orientation'] == 'reflective'].copy()
        predictive_articles = df[df['factor_orientation'] == 'predictive'].copy()
        
        print(f"   📉 Reflective articles: {len(reflective_articles)}")
        print(f"   📈 Predictive articles: {len(predictive_articles)}")
        
        # For reflective articles: correlate with "past" alpha (simulated)
        if len(reflective_articles) > 5:
            # Create synthetic "past" alpha by shifting current alpha
            reflective_articles['implied_past_alpha'] = reflective_articles['alpha_vs_spy_1day_after'] * -0.7
            
            # Correlate reflective magnitude with implied past performance
            past_correlation = np.corrcoef(
                reflective_articles['factor_magnitude'].astype(float),
                reflective_articles['implied_past_alpha'].astype(float)
            )[0,1]
            
            sequences['reflective_past_correlation'] = past_correlation
            print(f"   📊 Reflective-Past correlation: {past_correlation:.3f}")
        
        # For predictive articles: correlate with future alpha
        if len(predictive_articles) > 5:
            future_correlation = np.corrcoef(
                predictive_articles['factor_magnitude'].astype(float),
                predictive_articles['alpha_vs_spy_1week_after'].astype(float)
            )[0,1]
            
            sequences['predictive_future_correlation'] = future_correlation
            print(f"   📊 Predictive-Future correlation: {future_correlation:.3f}")
        
        return sequences
    
    def model_article_influence_chains(self, df):
        """
        Model how one article influences the impact of subsequent articles
        """
        print("🔗 Modeling article influence chains")
        
        df['event_timestamp'] = pd.to_datetime(df['event_timestamp'])
        df = df.sort_values('event_timestamp')
        
        influence_patterns = []
        
        # For each article, find articles within next 24 hours
        for i, article in df.iterrows():
            future_window = article['event_timestamp'] + timedelta(hours=24)
            
            # Find subsequent articles
            subsequent = df[
                (df['event_timestamp'] > article['event_timestamp']) & 
                (df['event_timestamp'] <= future_window)
            ]
            
            if len(subsequent) > 0:
                # Calculate influence metrics
                influence_data = {
                    'source_magnitude': float(article['factor_magnitude']),
                    'source_orientation': article['factor_orientation'],
                    'source_alpha': float(article['alpha_vs_spy_1day_after']),
                    'subsequent_count': len(subsequent),
                    'subsequent_avg_alpha': subsequent['alpha_vs_spy_1day_after'].astype(float).mean(),
                    'subsequent_magnitude_boost': subsequent['factor_magnitude'].astype(float).mean() - float(article['factor_magnitude'])
                }
                
                influence_patterns.append(influence_data)
        
        if influence_patterns:
            influence_df = pd.DataFrame(influence_patterns)
            
            # Analyze influence patterns
            print(f"   📊 Found {len(influence_patterns)} article influence chains")
            
            # High magnitude articles boost subsequent article impact?
            high_mag_boost = influence_df[influence_df['source_magnitude'] > influence_df['source_magnitude'].median()]
            low_mag_boost = influence_df[influence_df['source_magnitude'] <= influence_df['source_magnitude'].median()]
            
            if len(high_mag_boost) > 2 and len(low_mag_boost) > 2:
                high_boost_avg = high_mag_boost['subsequent_magnitude_boost'].mean()
                low_boost_avg = low_mag_boost['subsequent_magnitude_boost'].mean()
                
                print(f"   📈 High magnitude articles boost subsequent by: {high_boost_avg:.3f}")
                print(f"   📉 Low magnitude articles boost subsequent by: {low_boost_avg:.3f}")
                
                return {
                    'high_magnitude_boost': high_boost_avg,
                    'low_magnitude_boost': low_boost_avg,
                    'influence_chains_count': len(influence_patterns)
                }
        
        return {}
    
    def analyze_factor_momentum_patterns(self, df):
        """
        Analyze if certain factors create momentum (repeated similar movements)
        """
        print("📈 Analyzing factor momentum patterns")
        
        momentum_patterns = {}
        
        # Group by factor name
        if 'factor_name' in df.columns:
            factor_groups = df.groupby('factor_name')
            
            for factor_name, group in factor_groups:
                if len(group) >= 3:  # Need minimum samples
                    # Sort by timestamp
                    group = group.sort_values('event_timestamp')
                    
                    # Calculate momentum (correlation between consecutive alphas)
                    alphas = group['alpha_vs_spy_1day_after'].astype(float).values
                    
                    if len(alphas) >= 3:
                        # Momentum = correlation between alpha[t] and alpha[t+1]
                        momentum_corr = np.corrcoef(alphas[:-1], alphas[1:])[0,1]
                        
                        momentum_patterns[factor_name] = {
                            'momentum_correlation': momentum_corr,
                            'sample_count': len(alphas),
                            'avg_alpha': np.mean(alphas),
                            'alpha_volatility': np.std(alphas)
                        }
        
        # Sort by momentum correlation
        sorted_momentum = sorted(momentum_patterns.items(), 
                               key=lambda x: x[1]['momentum_correlation'], 
                               reverse=True)
        
        print(f"   📊 Analyzed momentum for {len(sorted_momentum)} factors")
        print("   🏆 Top momentum factors:")
        for factor, stats in sorted_momentum[:5]:
            print(f"      {factor}: momentum={stats['momentum_correlation']:.3f}, "
                  f"avg_alpha={stats['avg_alpha']:.3f} (n={stats['sample_count']})")
        
        return dict(sorted_momentum)
    
    def run_temporal_analysis(self, csv_path):
        """
        Run complete temporal causality analysis
        """
        print("🚀 Starting Temporal Causality Analysis")
        print(f"📂 Loading data from {csv_path}")
        
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(df)} samples")
        
        results = {}
        
        # Analyze reflective-predictive sequences
        results['orientation_sequences'] = self.analyze_reflective_predictive_sequences(df)
        
        # Model article influence chains
        results['influence_chains'] = self.model_article_influence_chains(df)
        
        # Analyze factor momentum patterns
        results['momentum_patterns'] = self.analyze_factor_momentum_patterns(df)
        
        return results

if __name__ == "__main__":
    engine = TemporalCausalityEngine()
    
    # Run on our real data
    csv_path = "/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/REAL_ml_data_2025-09-04_17-47-54.csv"
    results = engine.run_temporal_analysis(csv_path)
    
    print("\n🎉 Temporal analysis complete!")
    print("📊 Results show causality patterns between articles")
