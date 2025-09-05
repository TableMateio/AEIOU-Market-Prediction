#!/usr/bin/env python3
"""
Daily Aggregation ML Pipeline
Converts 12K individual causal events into daily feature vectors for ML training
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import os
from sklearn.preprocessing import StandardScaler
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import shap

class DailyAggregationML:
    """
    Aggregates individual causal events into daily features and trains ML model
    """
    
    def __init__(self):
        self.consolidated_factors = [
            # From your consolidated list
            'analyst_rating_change', 'revenue_growth_rate', 'operating_margin', 'earnings_per_share',
            'cost_level', 'profitability', 'market_share', 'stock_price', 'market_volatility',
            'valuation_multiple', 'brand_value', 'production_capacity', 'supply_availability',
            'manufacturing_efficiency', 'operational_costs', 'product_quality_index',
            'workforce_effectiveness', 'investment_level', 'capital_expenditure',
            'r_and_d_spending', 'cash_flow', 'debt_level', 'competitive_pressure',
            'product_innovation_rate', 'product_differentiation', 'technology_adoption',
            'partnership_strength', 'innovation_pipeline_strength', 'distribution_effectiveness',
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
        
    def load_data(self, csv_path):
        """Load the ML training data"""
        print(f"📊 Loading data from {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"✅ Loaded {len(df)} records with {len(df.columns)} columns")
        return df
    
    def create_daily_features(self, df):
        """Convert individual causal events to daily aggregated features"""
        print("🔄 Creating daily aggregated features...")
        
        # Convert article_published_at to date
        df['article_published_at'] = pd.to_datetime(df['article_published_at'])
        df['trading_date'] = df['article_published_at'].dt.date
        
        daily_features = []
        
        # Group by trading date
        for date, day_data in df.groupby('trading_date'):
            print(f"   Processing {date} ({len(day_data)} events)")
            
            features = {
                'trading_date': date,
                'total_events': len(day_data),
                'total_articles': day_data['article_id'].nunique(),
                'avg_credibility': day_data['article_source_credibility'].mean(),
                'max_surprise': day_data.get('surprise_vs_anticipated', pd.Series([0])).max(),
                'avg_intensity': day_data.get('market_perception_intensity', pd.Series([0])).mean()
            }
            
            # Create features for each consolidated factor
            for factor in self.consolidated_factors:
                # Map original factor names to consolidated (simplified mapping)
                factor_data = self.get_factor_data(day_data, factor)
                
                if len(factor_data) > 0:
                    # Binary presence
                    features[f'{factor}_present'] = 1
                    
                    # Average magnitude
                    features[f'{factor}_avg_magnitude'] = factor_data['factor_magnitude'].mean()
                    
                    # Movement consensus (bullish ratio)
                    movements = factor_data['factor_movement'].fillna(0)
                    bullish_count = (movements > 0).sum()
                    total_count = len(movements)
                    features[f'{factor}_bullish_ratio'] = bullish_count / total_count if total_count > 0 else 0.5
                    
                    # Count of mentions
                    features[f'{factor}_count'] = len(factor_data)
                    
                    # Weighted magnitude (magnitude × credibility)
                    credibility = factor_data['article_source_credibility'].fillna(0.5)
                    magnitude = factor_data['factor_magnitude'].fillna(0)
                    features[f'{factor}_weighted_magnitude'] = (magnitude * credibility).mean()
                    
                else:
                    # Factor not present
                    features[f'{factor}_present'] = 0
                    features[f'{factor}_avg_magnitude'] = 0
                    features[f'{factor}_bullish_ratio'] = 0.5  # Neutral
                    features[f'{factor}_count'] = 0
                    features[f'{factor}_weighted_magnitude'] = 0
            
            daily_features.append(features)
        
        daily_df = pd.DataFrame(daily_features)
        print(f"✅ Created {len(daily_df)} daily feature vectors with {len(daily_df.columns)} features")
        return daily_df
    
    def get_factor_data(self, day_data, consolidated_factor):
        """
        Map original factor names to consolidated factors
        This is a simplified mapping - you'd want to use your full transformation mappings
        """
        # Simple keyword matching for now
        factor_keywords = {
            'revenue_growth_rate': ['revenue', 'growth', 'sales'],
            'cost_level': ['cost', 'expense', 'spending'],
            'market_share': ['market_share', 'share'],
            'analyst_rating_change': ['analyst', 'rating', 'recommendation'],
            'competitive_pressure': ['competitive', 'competition', 'rival'],
            'customer_sentiment': ['customer', 'satisfaction', 'sentiment'],
            'regulatory_risk': ['regulatory', 'regulation', 'compliance'],
            'supply_chain_risk': ['supply', 'chain', 'logistics'],
            # Add more mappings as needed
        }
        
        if consolidated_factor in factor_keywords:
            keywords = factor_keywords[consolidated_factor]
            mask = day_data['factor_name'].str.contains('|'.join(keywords), case=False, na=False)
            return day_data[mask]
        else:
            # Exact match fallback
            return day_data[day_data['factor_name'] == consolidated_factor]
    
    def add_stock_targets(self, daily_df):
        """Add stock price targets (you'll need to implement based on your stock data)"""
        print("📈 Adding stock price targets...")
        
        # Placeholder - you'll need to join with your actual stock data
        # For now, create dummy targets to test the pipeline
        np.random.seed(42)
        daily_df['stock_change_1day'] = np.random.normal(0, 0.02, len(daily_df))  # 2% daily volatility
        daily_df['stock_change_1week'] = np.random.normal(0, 0.05, len(daily_df))  # 5% weekly volatility
        
        print("⚠️  Using dummy stock targets - replace with real stock data")
        return daily_df
    
    def train_model(self, daily_df):
        """Train LightGBM model on daily features"""
        print("🤖 Training LightGBM model...")
        
        # Prepare features and targets
        feature_cols = [col for col in daily_df.columns if col not in ['trading_date', 'stock_change_1day', 'stock_change_1week']]
        X = daily_df[feature_cols].fillna(0)
        y = daily_df['stock_change_1day']
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train LightGBM
        model = lgb.LGBMRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            verbose=-1
        )
        
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        
        print(f"✅ Model trained - MSE: {mse:.6f}, MAE: {mae:.6f}")
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': feature_cols,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\n🔝 Top 10 Most Important Features:")
        for _, row in feature_importance.head(10).iterrows():
            print(f"   {row['feature']}: {row['importance']:.4f}")
        
        return model, feature_importance, X_test, y_test, y_pred
    
    def analyze_results(self, model, feature_importance, X_test, y_test, y_pred):
        """Analyze model results and create interpretability reports"""
        print("📊 Analyzing results...")
        
        # Create results directory
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_dir = f'/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/daily_aggregation_{timestamp}'
        os.makedirs(results_dir, exist_ok=True)
        
        # Save feature importance
        feature_importance.to_csv(f'{results_dir}/feature_importance.csv', index=False)
        
        # SHAP analysis on top features
        print("🔍 Running SHAP analysis on top features...")
        top_features = feature_importance.head(20)['feature'].tolist()
        X_shap = X_test[top_features]
        
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_shap)
        
        # Create summary report
        with open(f'{results_dir}/DAILY_AGGREGATION_RESULTS.md', 'w') as f:
            f.write("# Daily Aggregation ML Results\n\n")
            f.write(f"Analysis run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## Model Performance\n")
            mse = mean_squared_error(y_test, y_pred)
            mae = mean_absolute_error(y_test, y_pred)
            f.write(f"- **MSE**: {mse:.6f}\n")
            f.write(f"- **MAE**: {mae:.6f}\n")
            f.write(f"- **Test samples**: {len(y_test)}\n\n")
            
            f.write("## Top 20 Most Important Features\n\n")
            f.write("| Rank | Feature | Importance | Type |\n")
            f.write("|------|---------|------------|------|\n")
            
            for i, (_, row) in enumerate(feature_importance.head(20).iterrows(), 1):
                feature_type = self.categorize_feature(row['feature'])
                f.write(f"| {i} | {row['feature']} | {row['importance']:.4f} | {feature_type} |\n")
            
            f.write(f"\n## Key Insights\n\n")
            f.write("### Most Predictive Factor Categories\n")
            category_importance = {}
            for _, row in feature_importance.head(20).iterrows():
                category = self.categorize_feature(row['feature'])
                category_importance[category] = category_importance.get(category, 0) + row['importance']
            
            for category, importance in sorted(category_importance.items(), key=lambda x: x[1], reverse=True):
                f.write(f"- **{category}**: {importance:.4f}\n")
        
        print(f"📁 Results saved to: {results_dir}")
        return results_dir
    
    def categorize_feature(self, feature_name):
        """Categorize features for analysis"""
        if '_present' in feature_name:
            return 'Presence Flags'
        elif '_count' in feature_name:
            return 'Count Features'
        elif '_magnitude' in feature_name:
            return 'Magnitude Features'
        elif '_bullish_ratio' in feature_name:
            return 'Sentiment Features'
        elif feature_name in ['total_events', 'total_articles']:
            return 'Volume Features'
        elif feature_name in ['avg_credibility', 'max_surprise', 'avg_intensity']:
            return 'Quality Features'
        else:
            return 'Other'

def main():
    """Run the daily aggregation ML pipeline"""
    print("🚀 Starting Daily Aggregation ML Pipeline...")
    
    # Initialize
    ml_pipeline = DailyAggregationML()
    
    # Load data (you'll need to update this path)
    csv_path = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/REAL_ml_data_2025-09-04_17-47-54.csv'
    
    try:
        # Load and process data
        df = ml_pipeline.load_data(csv_path)
        daily_df = ml_pipeline.create_daily_features(df)
        daily_df = ml_pipeline.add_stock_targets(daily_df)
        
        # Train model
        model, feature_importance, X_test, y_test, y_pred = ml_pipeline.train_model(daily_df)
        
        # Analyze results
        results_dir = ml_pipeline.analyze_results(model, feature_importance, X_test, y_test, y_pred)
        
        print(f"\n🎉 Pipeline complete! Check results at: {results_dir}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
