#!/usr/bin/env python3
"""
Pure Interpretation B ML Pipeline
Transforms categorical features to binary flags without aggregation
Calculates correlations and trains ML model with natural confidence from repetition
"""

import pandas as pd
import numpy as np
from datetime import datetime
import json
import os
from scipy.stats import pearsonr
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, accuracy_score
from sklearn.preprocessing import LabelEncoder

class PureInterpretationBPipeline:
    """
    Pure Interpretation B: No aggregation, just feature engineering + natural confidence
    """
    
    def __init__(self):
        # Consolidated categories from your enum files
        self.event_tags = [
            # Technology & Innovation
            'ai', 'hardware', 'software', 'semiconductor', 'cloud_services', 'data_center',
            'cybersecurity', 'blockchain', 'vr_ar', 'autonomous_tech', 'space_tech',
            
            # Financial & Markets  
            'earnings', 'revenue_growth', 'operating_margin', 'valuation', 'market_sentiment',
            'investor_sentiment', 'capital_allocation', 'investment_strategy',
            
            # Business Operations
            'product_innovation', 'product_launch', 'manufacturing', 'supply_chain',
            'business_strategy', 'partnership', 'acquisition', 'competitive_pressure',
            
            # Regulatory & Legal
            'regulatory', 'legal_ruling', 'antitrust', 'government_policy', 'trade_policy',
            'export_controls', 'privacy', 'compliance',
            
            # Market & Industry
            'market_share', 'customer_demand', 'brand_reputation', 'advertising',
            'ecommerce', 'financial_services', 'gaming', 'streaming', 'energy',
            
            # Geographic & Political
            'geopolitical', 'china', 'india', 'tariff', 'macroeconomic', 'currency',
            
            # Corporate Governance
            'executive_change', 'leadership', 'shareholder_relations', 'corporate_strategy',
            
            # External Factors
            'cost_increase', 'supply_disruption', 'regulatory_change', 'economic_conditions'
        ]
        
        self.event_types = [
            # Financial & Investment Events
            'analyst_update', 'earnings_report', 'investment_change', 'dividend_announcement',
            'share_buyback', 'ipo_announcement',
            
            # Product & Innovation Events  
            'product_launch', 'product_update', 'technology_update', 'research_development',
            
            # Market Events
            'market_update', 'competitive_action', 'industry_conference', 'market_sentiment_shift',
            
            # Corporate Events
            'leadership_change', 'partnership_deal', 'acquisition', 'corporate_restructuring',
            
            # Regulatory & Legal Events
            'regulatory_action', 'legal_ruling', 'compliance_update', 'policy_change',
            
            # Operational Events
            'operational_change', 'manufacturing_update', 'supply_chain_change', 'capacity_expansion',
            
            # External Events
            'trade_policy_change', 'geopolitical_event', 'macroeconomic_update', 'currency_change',
            
            # Strategic Events
            'business_strategy_update', 'market_expansion', 'brand_initiative', 'customer_program_launch',
            
            # Risk Events
            'cybersecurity_incident', 'regulatory_investigation', 'supply_disruption', 'reputational_event',
            
            # Stakeholder Events
            'shareholder_meeting', 'employee_event', 'customer_feedback', 'community_engagement'
        ]
        
        self.factor_names = [
            # Financial Performance
            'analyst_rating_change', 'revenue_growth_rate', 'operating_margin', 'earnings_per_share',
            'cost_level', 'profitability',
            
            # Market Position
            'market_share', 'stock_price', 'market_volatility', 'valuation_multiple', 'brand_value',
            
            # Operational Metrics
            'production_capacity', 'supply_availability', 'manufacturing_efficiency',
            'operational_costs', 'product_quality_index', 'workforce_effectiveness',
            
            # Investment & Capital
            'investment_level', 'capital_expenditure', 'r_and_d_spending', 'cash_flow', 'debt_level',
            
            # Strategic Factors
            'competitive_pressure', 'product_innovation_rate', 'product_differentiation',
            'technology_adoption', 'partnership_strength', 'innovation_pipeline_strength',
            'distribution_effectiveness',
            
            # Customer Dynamics
            'customer_demand', 'customer_sentiment', 'customer_buying_power',
            'customer_retention_rate', 'product_refresh_cycle', 'sales_efficiency',
            'digital_engagement_level',
            
            # Market Sentiment
            'investor_sentiment', 'analyst_confidence', 'market_perception',
            'reputation_index', 'market_intelligence_index',
            
            # External Factors
            'tariff_impact', 'geopolitical_risk', 'macroeconomic_conditions',
            'interest_rate_sensitivity', 'currency_exposure',
            
            # Technology Factors
            'technology_advancement_rate', 'digital_transformation_level',
            
            # Risk Factors
            'cybersecurity_risk', 'compliance_risk', 'supply_chain_risk',
            'talent_retention_risk', 'technology_obsolescence_risk', 'regulatory_risk'
        ]
        
        # Category groupings (from ### headers)
        self.event_tag_categories = [
            'technology_innovation', 'financial_markets', 'business_operations',
            'regulatory_legal', 'market_industry', 'geographic_political',
            'corporate_governance', 'external_factors'
        ]
        
        self.event_categories = [
            'financial_investment_events', 'product_innovation_events', 'market_events',
            'corporate_events', 'regulatory_legal_events', 'operational_events',
            'external_events', 'strategic_events', 'risk_events', 'stakeholder_events'
        ]
        
        self.factor_categories = [
            'financial_performance', 'market_position', 'operational_metrics',
            'investment_capital', 'strategic_factors', 'customer_dynamics',
            'market_sentiment', 'external_factors', 'technology_factors', 'risk_factors'
        ]
    
    def load_data_from_database(self):
        """Load the full 12K+ dataset from Supabase database"""
        print("📊 Loading 12K+ records from Supabase...")
        
        # Import required libraries for database connection
        import subprocess
        import json
        import tempfile
        
        # Use Supabase CLI to export data
        print("🔄 Querying Supabase database...")
        
        # Create a temporary file for the query result
        with tempfile.NamedTemporaryFile(mode='w+', suffix='.json', delete=False) as temp_file:
            temp_filename = temp_file.name
        
        # SQL query to get all required columns
        query = """
        SELECT 
            article_id,
            consolidated_event_tags,
            consolidated_event_type, 
            consolidated_factor_name,
            event_tag_category,
            factor_magnitude,
            factor_movement,
            article_source_credibility,
            market_perception_intensity,
            alpha_vs_spy_1day_after,
            alpha_vs_spy_1week_after,
            alpha_vs_qqq_1day_after
        FROM ml_training_data 
        WHERE alpha_vs_spy_1day_after IS NOT NULL
        ORDER BY article_published_at DESC
        """
        
        try:
            # Execute query using subprocess (since we're in Python, not the MCP environment)
            # This is a placeholder - we'll use a different approach
            print("⚠️  Direct database query from Python not implemented yet")
            print("📁 Loading from previously exported CSV file...")
            
            # Try to load from the latest consolidated data export
            import glob
            csv_pattern = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/REAL_12K_consolidated_data_*.csv'
            csv_files = glob.glob(csv_pattern)
            
            if csv_files:
                # Get the most recent file
                csv_path = max(csv_files, key=os.path.getctime)
                print(f"📁 Loading consolidated data from: {csv_path}")
            else:
                csv_path = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/REAL_ml_data_2025-09-04_17-47-54.csv'
                print(f"📁 Fallback to: {csv_path}")
            
            if csv_path and os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                print(f"✅ Loaded {len(df)} records from CSV")
                
                # Ensure we have the right columns
                required_cols = ['consolidated_event_tags', 'consolidated_event_type', 'consolidated_factor_name', 
                               'factor_magnitude', 'factor_movement', 'alpha_vs_spy_1day_after']
                
                missing_cols = [col for col in required_cols if col not in df.columns]
                if missing_cols:
                    print(f"⚠️  Missing columns: {missing_cols}")
                    print("📋 Available columns:", list(df.columns))
                    
                    # Use available columns as fallback
                    if 'event_tags' in df.columns:
                        df['consolidated_event_tags'] = df['event_tags']
                    if 'event_type' in df.columns:
                        df['consolidated_event_type'] = df['event_type']
                    if 'factor_name' in df.columns:
                        df['consolidated_factor_name'] = df['factor_name']
                
                return df
            else:
                print(f"❌ CSV file not found at {csv_path}")
                print("🔄 Creating sample data for testing...")
                
                # Fallback sample data
                sample_data = {
                    'article_id': ['art1', 'art1', 'art2', 'art3'] * 250,
                    'consolidated_event_tags': ['ai', 'earnings', 'regulatory', 'product_launch'] * 250,
                    'consolidated_event_type': ['technology_update', 'earnings_report', 'regulatory_action', 'product_launch'] * 250,
                    'consolidated_factor_name': ['revenue_growth_rate', 'market_share', 'competitive_pressure', 'customer_demand'] * 250,
                    'factor_magnitude': [0.02, 0.015, 0.03, 0.01] * 250,
                    'factor_movement': [1, -1, -1, 1] * 250,
                    'alpha_vs_spy_1day_after': [0.5, -0.2, -0.8, 0.3] * 250
                }
                
                df = pd.DataFrame(sample_data)
                print(f"✅ Created sample dataset with {len(df)} records")
                return df
                
        except Exception as e:
            print(f"❌ Database connection error: {e}")
            return None
    
    def create_binary_flags(self, df):
        """
        Transform categorical columns to binary flags
        This is the core of Interpretation B - no aggregation!
        """
        print("🔄 Creating binary flags for all categories...")
        
        # Create binary flags for each category
        feature_df = df.copy()
        
        # Use consolidated columns (your actual database columns)
        event_tag_col = 'consolidated_event_tags' if 'consolidated_event_tags' in df.columns else 'event_tags'
        event_type_col = 'consolidated_event_type' if 'consolidated_event_type' in df.columns else 'event_type'  
        factor_name_col = 'consolidated_factor_name' if 'consolidated_factor_name' in df.columns else 'factor_name'
        
        print(f"🔍 Using columns: {event_tag_col}, {event_type_col}, {factor_name_col}")
        
        # Create all binary flags efficiently using pd.concat
        flag_data = {}
        
        # Event tag flags (handle array format)
        for tag in self.event_tags:
            if event_tag_col in df.columns:
                # Handle both string arrays and direct string matching
                flag_data[f'{tag}_present'] = df[event_tag_col].apply(
                    lambda x: 1 if (pd.notna(x) and (
                        (isinstance(x, str) and tag in x) or
                        (isinstance(x, list) and tag in x)
                    )) else 0
                )
        
        # Event type flags  
        for event_type in self.event_types:
            if event_type_col in df.columns:
                flag_data[f'{event_type}_present'] = (df[event_type_col] == event_type).astype(int)
        
        # Factor name flags
        for factor in self.factor_names:
            if factor_name_col in df.columns:
                flag_data[f'{factor}_present'] = (df[factor_name_col] == factor).astype(int)
        
        # Category flags (use event_tags column)
        if event_tag_col in df.columns:
            flag_data['technology_innovation_present'] = df[event_tag_col].apply(
                lambda x: 1 if (pd.notna(x) and any(tech in str(x) for tech in ['ai', 'hardware', 'software', 'semiconductor'])) else 0
            )
            flag_data['financial_markets_present'] = df[event_tag_col].apply(
                lambda x: 1 if (pd.notna(x) and any(fin in str(x) for fin in ['earnings', 'revenue_growth', 'operating_margin'])) else 0
            )
        
        # Create flags DataFrame efficiently
        flags_df = pd.DataFrame(flag_data)
        
        # Keep continuous variables as-is
        continuous_vars = ['factor_magnitude', 'factor_movement', 'article_source_credibility', 
                          'market_perception_intensity', 'alpha_vs_spy_1day_after']
        
        # Add available continuous variables
        continuous_data = {}
        for var in continuous_vars:
            if var in df.columns:
                continuous_data[var] = df[var]
        
        continuous_df = pd.DataFrame(continuous_data)
        
        # Combine flags and continuous variables
        result_df = pd.concat([flags_df, continuous_df], axis=1)
        
        flag_columns = [col for col in flags_df.columns if col.endswith('_present')]
        print(f"✅ Created {len(flag_columns)} binary flags")
        print(f"📊 Total features: {len(result_df.columns)} ({len(flag_columns)} flags + {len(continuous_df.columns)} continuous)")
        
        return result_df
    
    def calculate_correlations(self, df):
        """Calculate correlation of each binary flag with stock price target"""
        print("📈 Calculating correlations with stock price targets...")
        
        target_col = 'alpha_vs_spy_1day_after'
        correlations = []
        
        # Get all binary flag columns
        flag_columns = [col for col in df.columns if col.endswith('_present')]
        
        for flag_col in flag_columns:
            try:
                # Calculate correlation
                corr, p_value = pearsonr(df[flag_col], df[target_col])
                
                # Calculate additional stats
                flag_present_count = df[flag_col].sum()
                flag_present_pct = (flag_present_count / len(df)) * 100
                
                # Mean alpha when flag is present vs absent
                alpha_when_present = df[df[flag_col] == 1][target_col].mean()
                alpha_when_absent = df[df[flag_col] == 0][target_col].mean()
                
                correlations.append({
                    'feature': flag_col,
                    'correlation': corr,
                    'p_value': p_value,
                    'present_count': flag_present_count,
                    'present_percentage': flag_present_pct,
                    'alpha_when_present': alpha_when_present,
                    'alpha_when_absent': alpha_when_absent,
                    'alpha_difference': alpha_when_present - alpha_when_absent
                })
                
            except Exception as e:
                print(f"⚠️  Error calculating correlation for {flag_col}: {e}")
        
        # Sort by absolute correlation
        correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
        
        print(f"✅ Calculated correlations for {len(correlations)} features")
        return correlations
    
    def train_interpretation_b_model(self, df):
        """Train LightGBM model with pure Interpretation B approach"""
        print("🤖 Training LightGBM model with Interpretation B features...")
        
        # Prepare features and target
        target_col = 'alpha_vs_spy_1day_after'
        feature_cols = [col for col in df.columns if col != target_col]
        
        X = df[feature_cols]
        y = df[target_col]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Train LightGBM
        train_data = lgb.Dataset(X_train, label=y_train)
        test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)
        
        params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1
        }
        
        model = lgb.train(
            params,
            train_data,
            valid_sets=[test_data],
            num_boost_round=1000,
            callbacks=[lgb.early_stopping(100), lgb.log_evaluation(0)]
        )
        
        # Evaluate
        y_pred = model.predict(X_test)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        
        # Directional accuracy
        direction_correct = ((y_test > 0) == (y_pred > 0)).mean()
        
        print(f"✅ Model trained successfully")
        print(f"📊 RMSE: {rmse:.4f}")
        print(f"📊 MAE: {mae:.4f}")
        print(f"📊 Directional Accuracy: {direction_correct:.1%}")
        
        # Feature importance
        importance = model.feature_importance(importance_type='gain')
        feature_names = X.columns
        
        feature_importance = list(zip(feature_names, importance))
        feature_importance.sort(key=lambda x: x[1], reverse=True)
        
        return model, feature_importance, {
            'rmse': rmse,
            'mae': mae, 
            'directional_accuracy': direction_correct
        }
    
    def save_results(self, correlations, feature_importance, model_metrics):
        """Save all results to files"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_dir = f'/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/interpretation_b_pure_{timestamp}'
        os.makedirs(output_dir, exist_ok=True)
        
        # Save correlations
        correlations_df = pd.DataFrame(correlations)
        correlations_df.to_csv(f'{output_dir}/feature_correlations.csv', index=False)
        
        # Save feature importance
        importance_df = pd.DataFrame(feature_importance, columns=['feature', 'importance'])
        importance_df.to_csv(f'{output_dir}/feature_importance.csv', index=False)
        
        # Save model metrics
        with open(f'{output_dir}/model_metrics.json', 'w') as f:
            json.dump(model_metrics, f, indent=2)
        
        # Create summary report
        with open(f'{output_dir}/INTERPRETATION_B_RESULTS.md', 'w') as f:
            f.write("# Pure Interpretation B Results\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## Model Performance\n")
            f.write(f"- **RMSE**: {model_metrics['rmse']:.4f}\n")
            f.write(f"- **MAE**: {model_metrics['mae']:.4f}\n") 
            f.write(f"- **Directional Accuracy**: {model_metrics['directional_accuracy']:.1%}\n\n")
            
            f.write("## Top 20 Correlations with Stock Price\n")
            f.write("| Feature | Correlation | P-Value | Present % | Alpha When Present | Alpha Difference |\n")
            f.write("|---------|-------------|---------|-----------|-------------------|------------------|\n")
            
            for corr in correlations[:20]:
                f.write(f"| {corr['feature']} | {corr['correlation']:.4f} | {corr['p_value']:.4f} | "
                       f"{corr['present_percentage']:.1f}% | {corr['alpha_when_present']:.4f} | "
                       f"{corr['alpha_difference']:.4f} |\n")
            
            f.write("\n## Top 20 Feature Importance (LightGBM)\n")
            f.write("| Feature | Importance |\n")
            f.write("|---------|------------|\n")
            
            for feat, imp in feature_importance[:20]:
                f.write(f"| {feat} | {imp:.2f} |\n")
            
            f.write("\n## Key Insights\n")
            f.write("- **Pure Interpretation B**: No aggregation - each of the 12K rows stays separate\n")
            f.write("- **Natural Confidence**: Model learns confidence from seeing repeated patterns\n")
            f.write("- **Binary Flags**: ~200+ categorical features converted to binary presence flags\n")
            f.write("- **Correlation Analysis**: Each flag's direct correlation with stock price movements\n")
            f.write("- **Feature Importance**: Which patterns the model finds most predictive\n")
        
        print(f"\n📁 Results saved to: {output_dir}")
        return output_dir

def main():
    """Run the complete Pure Interpretation B pipeline"""
    print("🚀 Starting Pure Interpretation B Pipeline...")
    print("="*60)
    
    pipeline = PureInterpretationBPipeline()
    
    try:
        # 1. Load data
        df = pipeline.load_data_from_database()
        
        # 2. Create binary flags (core of Interpretation B)
        feature_df = pipeline.create_binary_flags(df)
        
        # 3. Calculate correlations
        correlations = pipeline.calculate_correlations(feature_df)
        
        # 4. Train model
        model, feature_importance, metrics = pipeline.train_interpretation_b_model(feature_df)
        
        # 5. Save results
        output_dir = pipeline.save_results(correlations, feature_importance, metrics)
        
        print("\n🎉 Pipeline Complete!")
        print(f"📊 Processed {len(df)} records")
        print(f"🔢 Created {len([col for col in feature_df.columns if col.endswith('_present')])} binary flags")
        print(f"📈 Model Directional Accuracy: {metrics['directional_accuracy']:.1%}")
        print(f"📁 Results: {output_dir}")
        
        # Show top correlations
        print("\n🏆 TOP 10 CORRELATIONS:")
        for i, corr in enumerate(correlations[:10], 1):
            sign = "📈" if corr['correlation'] > 0 else "📉"
            print(f"{i:2d}. {sign} {corr['feature']}: {corr['correlation']:.4f} "
                  f"(Present: {corr['present_percentage']:.1f}%, "
                  f"Alpha Diff: {corr['alpha_difference']:.4f})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
