#!/usr/bin/env python3
"""
Interpretation B Feature Engineering
Converts 12K individual causal events into confidence-based features
Uses binary flags + confidence scores instead of dilution effect
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
from collections import defaultdict

class InterpretationBFeatures:
    """
    Creates Interpretation B features: More examples = Higher confidence, NOT dilution
    """
    
    def __init__(self):
        # Your consolidated factor names (40 total)
        self.consolidated_factors = [
            'analyst_rating_change', 'revenue_growth_rate', 'operating_margin', 
            'earnings_per_share', 'cost_level', 'profitability', 'market_share',
            'stock_price', 'market_volatility', 'valuation_multiple', 'brand_value',
            'production_capacity', 'supply_availability', 'manufacturing_efficiency',
            'operational_costs', 'product_quality_index', 'workforce_effectiveness',
            'investment_level', 'capital_expenditure', 'r_and_d_spending', 'cash_flow',
            'debt_level', 'competitive_pressure', 'product_innovation_rate',
            'product_differentiation', 'technology_adoption', 'partnership_strength',
            'innovation_pipeline_strength', 'distribution_effectiveness',
            'customer_demand', 'customer_sentiment', 'customer_buying_power',
            'customer_retention_rate', 'product_refresh_cycle', 'sales_efficiency',
            'digital_engagement_level', 'investor_sentiment', 'analyst_confidence',
            'market_perception', 'reputation_index', 'market_intelligence_index',
            'tariff_impact', 'geopolitical_risk', 'macroeconomic_conditions',
            'interest_rate_sensitivity', 'currency_exposure', 'technology_advancement_rate',
            'digital_transformation_level', 'cybersecurity_risk', 'compliance_risk',
            'supply_chain_risk', 'talent_retention_risk', 'technology_obsolescence_risk',
            'regulatory_risk'
        ]
        
        # Simple mapping from original factor names to consolidated
        # This is a basic version - you'd want to use your full transformation mappings
        self.factor_mapping = {
            # Revenue related
            'revenue_growth_rate': ['revenue', 'sales_growth', 'quarterly_revenue'],
            'cost_level': ['cost', 'expense', 'operating_cost'],
            'market_share': ['market_share', 'share', 'market_position'],
            'analyst_rating_change': ['analyst', 'rating', 'recommendation', 'upgrade', 'downgrade'],
            'customer_sentiment': ['customer_satisfaction', 'customer', 'satisfaction', 'sentiment'],
            'competitive_pressure': ['competition', 'competitive', 'rival', 'competitor'],
            'regulatory_risk': ['regulatory', 'regulation', 'compliance', 'legal'],
            'supply_chain_risk': ['supply_chain', 'supply', 'logistics', 'manufacturing'],
            'investment_level': ['investment', 'capex', 'r_and_d', 'spending'],
            'product_innovation_rate': ['innovation', 'product', 'development', 'new_product'],
            'tariff_impact': ['tariff', 'trade', 'import', 'export'],
            'geopolitical_risk': ['geopolitical', 'political', 'international'],
            # Add more mappings as needed
        }
    
    def load_data(self, csv_path):
        """Load the 12K ML training data"""
        print(f"📊 Loading data from {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(df)} records with {len(df.columns)} columns")
        return df
    
    def map_to_consolidated_factor(self, original_factor_name):
        """Map original factor name to consolidated factor"""
        if pd.isna(original_factor_name):
            return None
            
        original_lower = str(original_factor_name).lower()
        
        # Check each consolidated factor's keywords
        for consolidated_factor, keywords in self.factor_mapping.items():
            for keyword in keywords:
                if keyword.lower() in original_lower:
                    return consolidated_factor
        
        # If no mapping found, try exact match with consolidated list
        for consolidated_factor in self.consolidated_factors:
            if consolidated_factor.lower() == original_lower:
                return consolidated_factor
                
        return 'other_factor'  # Catch-all for unmapped factors
    
    def create_interpretation_b_features(self, df):
        """
        Convert individual causal events to Interpretation B features
        More examples = Higher confidence, NOT dilution
        """
        print("🔄 Creating Interpretation B features (confidence-based)...")
        
        # Convert dates
        df['article_published_at'] = pd.to_datetime(df['article_published_at'])
        df['trading_date'] = df['article_published_at'].dt.date
        
        # Map original factor names to consolidated
        df['consolidated_factor'] = df['factor_name'].apply(self.map_to_consolidated_factor)
        
        feature_rows = []
        
        # Group by trading date (but keep individual articles separate for now)
        for date, day_data in df.groupby('trading_date'):
            print(f"   Processing {date} ({len(day_data)} events from {day_data['article_id'].nunique()} articles)")
            
            # Create base features for this date
            features = {
                'trading_date': date,
                'total_articles': day_data['article_id'].nunique(),
                'total_events': len(day_data),
            }
            
            # For each consolidated factor, create Interpretation B features
            for factor in self.consolidated_factors:
                factor_data = day_data[day_data['consolidated_factor'] == factor]
                
                if len(factor_data) > 0:
                    # INTERPRETATION B: Binary presence + confidence metrics
                    features[f'{factor}_present'] = 1
                    
                    # Confidence = number of independent articles mentioning this factor
                    unique_articles = factor_data['article_id'].nunique()
                    features[f'{factor}_confidence'] = unique_articles
                    
                    # Average magnitude (the "true effect size")
                    magnitudes = pd.to_numeric(factor_data['factor_magnitude'], errors='coerce').fillna(0)
                    features[f'{factor}_avg_magnitude'] = magnitudes.mean()
                    
                    # Consensus direction (what % are bullish vs bearish)
                    movements = pd.to_numeric(factor_data['factor_movement'], errors='coerce').fillna(0)
                    bullish_ratio = (movements > 0).mean() if len(movements) > 0 else 0.5
                    features[f'{factor}_bullish_consensus'] = bullish_ratio
                    
                    # Credibility-weighted magnitude
                    credibility = pd.to_numeric(factor_data['article_source_credibility'], errors='coerce').fillna(0.5)
                    weighted_magnitude = (magnitudes * credibility).mean()
                    features[f'{factor}_credibility_weighted_magnitude'] = weighted_magnitude
                    
                    # Evidence strength (how many causal events support this)
                    features[f'{factor}_evidence_count'] = len(factor_data)
                    
                else:
                    # Factor not present this day
                    features[f'{factor}_present'] = 0
                    features[f'{factor}_confidence'] = 0
                    features[f'{factor}_avg_magnitude'] = 0
                    features[f'{factor}_bullish_consensus'] = 0.5  # Neutral when absent
                    features[f'{factor}_credibility_weighted_magnitude'] = 0
                    features[f'{factor}_evidence_count'] = 0
            
            # Add overall market sentiment features
            features['avg_article_credibility'] = pd.to_numeric(day_data['article_source_credibility'], errors='coerce').fillna(0.5).mean()
            
            # Handle surprise factor safely
            surprise_data = day_data.get('market_perception_surprise_vs_anticipated', day_data.get('surprise_vs_anticipated', [0]))
            if hasattr(surprise_data, 'fillna'):
                features['max_surprise_factor'] = pd.to_numeric(surprise_data, errors='coerce').fillna(0).max()
            else:
                surprise_series = pd.Series(surprise_data)
                features['max_surprise_factor'] = pd.to_numeric(surprise_series, errors='coerce').fillna(0).max()
            
            # Handle intensity safely
            intensity_data = day_data.get('market_perception_intensity', [0])
            if hasattr(intensity_data, 'fillna'):
                features['avg_intensity'] = pd.to_numeric(intensity_data, errors='coerce').fillna(0).mean()
            else:
                intensity_series = pd.Series(intensity_data)
                features['avg_intensity'] = pd.to_numeric(intensity_series, errors='coerce').fillna(0).mean()
            
            feature_rows.append(features)
        
        features_df = pd.DataFrame(feature_rows)
        
        print(f"✅ Created {len(features_df)} daily feature vectors")
        print(f"📊 Features per day: {len(features_df.columns)} total")
        print(f"🎯 Consolidated factors: {len(self.consolidated_factors)}")
        print(f"🔢 Features per factor: 6 (present, confidence, magnitude, consensus, weighted_mag, evidence)")
        
        return features_df
    
    def add_stock_targets(self, features_df, stock_csv_path=None):
        """Add stock price targets - placeholder for now"""
        print("📈 Adding stock price targets...")
        
        # For now, create dummy targets to test the pipeline
        # You'll replace this with real stock data
        np.random.seed(42)
        features_df['apple_stock_change_1day'] = np.random.normal(0, 0.02, len(features_df))
        
        print("⚠️  Using dummy stock targets - replace with real stock data")
        return features_df
    
    def analyze_interpretation_difference(self, df, features_df):
        """Show the difference between Interpretation A and B"""
        print("\n🔍 INTERPRETATION A vs B ANALYSIS")
        print("="*50)
        
        # Find a factor that appears multiple times
        factor_counts = df['consolidated_factor'].value_counts()
        common_factor = factor_counts.index[0] if len(factor_counts) > 0 else None
        
        if common_factor and common_factor != 'other_factor':
            factor_data = df[df['consolidated_factor'] == common_factor]
            articles_count = factor_data['article_id'].nunique()
            events_count = len(factor_data)
            
            print(f"📊 Example: '{common_factor}' factor")
            print(f"   Articles mentioning it: {articles_count}")
            print(f"   Total causal events: {events_count}")
            print()
            print("🔴 INTERPRETATION A (Current/Wrong):")
            print(f"   - Model sees {events_count} separate training rows")
            print(f"   - Learns: '{common_factor} is very common, so low impact per instance'")
            print(f"   - Problem: Dilutes the true effect")
            print()
            print("🟢 INTERPRETATION B (New/Correct):")
            print(f"   - Model sees binary flag: {common_factor}_present = 1")
            print(f"   - Plus confidence: {common_factor}_confidence = {articles_count}")
            print(f"   - Learns: '{common_factor} has strong effect with high confidence'")
            print(f"   - Benefit: Preserves true effect size, adds confidence metric")
        
        print("\n🎯 KEY INSIGHT:")
        print("Interpretation B treats repetition as EVIDENCE STRENGTH, not DILUTION")
        print("More articles about the same factor = More confident in the pattern")
        print("NOT more articles = Weaker individual impact")
    
    def save_results(self, features_df, analysis_df=None):
        """Save the Interpretation B features"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_dir = f'/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/interpretation_b_{timestamp}'
        os.makedirs(output_dir, exist_ok=True)
        
        # Save features
        features_path = f'{output_dir}/interpretation_b_features.csv'
        features_df.to_csv(features_path, index=False)
        
        # Create summary
        with open(f'{output_dir}/INTERPRETATION_B_SUMMARY.md', 'w') as f:
            f.write("# Interpretation B Features Summary\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## What Changed\n")
            f.write("- **Before**: 12K individual causal event rows (Interpretation A - Dilution)\n")
            f.write("- **After**: Daily feature vectors with confidence metrics (Interpretation B - Confidence)\n\n")
            
            f.write("## Feature Structure\n")
            f.write(f"- **Trading days**: {len(features_df)}\n")
            f.write(f"- **Consolidated factors**: {len(self.consolidated_factors)}\n")
            f.write(f"- **Features per factor**: 6 (present, confidence, magnitude, consensus, weighted_mag, evidence)\n")
            f.write(f"- **Total features**: {len(features_df.columns)}\n\n")
            
            f.write("## Key Features Per Factor\n")
            f.write("- `{factor}_present`: Binary flag (0/1)\n")
            f.write("- `{factor}_confidence`: Number of articles mentioning this factor\n")
            f.write("- `{factor}_avg_magnitude`: Average effect size\n")
            f.write("- `{factor}_bullish_consensus`: % of mentions that are positive\n")
            f.write("- `{factor}_credibility_weighted_magnitude`: Magnitude weighted by source credibility\n")
            f.write("- `{factor}_evidence_count`: Total causal events supporting this factor\n\n")
            
            f.write("## Why This Matters\n")
            f.write("**Interpretation A (Wrong)**: 10 articles about iPhone → Each article has 1/10th impact\n")
            f.write("**Interpretation B (Correct)**: 10 articles about iPhone → iPhone effect is highly confident\n\n")
            
            f.write("More repetition = Higher confidence in the pattern, NOT weaker individual impact.\n")
        
        print(f"\n📁 Interpretation B features saved to: {output_dir}")
        return output_dir, features_path

def main():
    """Convert 12K records to Interpretation B features"""
    print("🚀 Starting Interpretation B Feature Engineering...")
    
    # Initialize
    feature_engineer = InterpretationBFeatures()
    
    # Load your real data with variation
    csv_path = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/real_interpretation_b_data.csv'
    
    try:
        # Load original data
        df = feature_engineer.load_data(csv_path)
        
        # Create Interpretation B features
        features_df = feature_engineer.create_interpretation_b_features(df)
        
        # Add stock targets
        features_df = feature_engineer.add_stock_targets(features_df)
        
        # Show the difference between interpretations
        feature_engineer.analyze_interpretation_difference(df, features_df)
        
        # Save results
        output_dir, features_path = feature_engineer.save_results(features_df, df)
        
        print(f"\n🎉 Interpretation B features ready!")
        print(f"📁 Features file: {features_path}")
        print(f"📊 Ready for Random Forest training with confidence-based features")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
