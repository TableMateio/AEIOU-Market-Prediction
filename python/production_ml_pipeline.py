#!/usr/bin/env python3
"""
PRODUCTION ML PIPELINE - AEIOU Market Prediction
Uses YOUR consolidated binary flags + scalar features approach
Target: abs_change_1day_after_pct with time-based splits
"""

import pandas as pd
import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import TimeSeriesSplit
import lightgbm as lgb
import joblib
import json
import os
from datetime import datetime

class AEIOUProductionPipeline:
    def __init__(self):
        self.results_dir = None
        
        # YOUR ACTUAL CONSOLIDATED EVENT TAGS (from your consolidated_event_tags.md)
        self.consolidated_event_tags = [
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
            'market_share', 'customer_demand', 'brand_reputation', 'advertising', 'ecommerce',
            'financial_services', 'gaming', 'streaming', 'energy',
            # Geographic & Political
            'geopolitical', 'china', 'india', 'tariff', 'macroeconomic', 'currency',
            # Corporate Governance
            'executive_change', 'leadership', 'shareholder_relations', 'corporate_strategy',
            # External Factors
            'cost_increase', 'supply_disruption', 'regulatory_change', 'economic_conditions'
        ]
        
        # YOUR ACTUAL CONSOLIDATED EVENT TYPES
        self.consolidated_event_types = [
            'analyst_update', 'earnings_report', 'product_launch', 'partnership',
            'acquisition', 'regulatory_change', 'strategy_announcement', 'guidance_update',
            'operational_change', 'market_update', 'supply_chain_event', 'investment_decision'
        ]
        
        # YOUR ACTUAL CONSOLIDATED FACTOR NAMES (from your consolidated_factor_names.md)
        self.consolidated_factor_names = [
            # Financial Performance
            'analyst_rating_change', 'revenue_growth_rate', 'operating_margin', 'earnings_per_share',
            'cost_level', 'profitability',
            # Market Position
            'market_share', 'stock_price', 'market_volatility', 'valuation_multiple', 'brand_value',
            # Operational Metrics
            'production_capacity', 'supply_availability', 'manufacturing_efficiency', 'operational_costs',
            'product_quality_index', 'workforce_effectiveness',
            # Investment & Capital
            'investment_level', 'capital_expenditure', 'r_and_d_spending', 'cash_flow', 'debt_level',
            # Strategic Factors
            'competitive_pressure', 'product_innovation_rate', 'product_differentiation',
            'technology_adoption', 'partnership_strength', 'innovation_pipeline_strength',
            'distribution_effectiveness',
            # Customer Dynamics
            'customer_demand', 'customer_sentiment', 'customer_buying_power', 'customer_retention_rate',
            'product_refresh_cycle', 'sales_efficiency', 'digital_engagement_level',
            # Market Sentiment
            'investor_sentiment', 'analyst_confidence', 'market_perception', 'reputation_index',
            'market_intelligence_index',
            # External Factors
            'tariff_impact', 'geopolitical_risk', 'macroeconomic_conditions', 'interest_rate_sensitivity',
            'currency_exposure',
            # Technology Factors
            'technology_advancement_rate', 'digital_transformation_level',
            # Risk Factors
            'cybersecurity_risk', 'compliance_risk', 'supply_chain_risk', 'talent_retention_risk',
            'technology_obsolescence_risk', 'regulatory_risk'
        ]
        
        # Scalar input features (YOUR actual features)
        self.scalar_features = [
            'factor_magnitude', 'factor_movement', 'article_source_credibility',
            'market_perception_intensity', 'causal_certainty', 'ai_assessment_business_impact_likelihood',
            'ai_assessment_competitive_risk', 'ai_assessment_execution_risk'
        ]
        
        # TARGET VARIABLES - Apple's SIGNED stock movements (direction matters!)
        self.primary_target = 'signed_change_1day_after_pct'  # We'll calculate from prices
        self.secondary_targets = ['signed_change_1week_after_pct']  # We'll calculate from prices
        
    def setup_results_directory(self):
        """Create timestamped results directory"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.results_dir = f"/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/production_{timestamp}"
        os.makedirs(self.results_dir, exist_ok=True)
        print(f"📁 Results will be saved to: {self.results_dir}")
        
    def load_and_prepare_data(self, data_path):
        """Load and prepare training data"""
        print(f"📊 Loading data from: {data_path}")
        
        df = pd.read_csv(data_path)
        print(f"📈 Loaded {len(df)} training examples")
        
        # Data quality checks
        print("\n🔍 DATA QUALITY CHECKS:")
        missing_counts = df.isnull().sum()
        for col, count in missing_counts[missing_counts > 0].items():
            print(f"  {col}: {count} ({count/len(df)*100:.1f}%)")
            
        # Target distribution for all available targets
        all_targets = [self.primary_target] + self.secondary_targets
        for target in all_targets:
            if target in df.columns:
                target_data = df[target].dropna()
                print(f"\n📊 TARGET DISTRIBUTION ({target}):")
                print(f"  Count: {len(target_data)}")
                print(f"  Mean:  {target_data.mean():.3f}%")
                print(f"  Std:   {target_data.std():.3f}%")
                print(f"  Range: [{target_data.min():.3f}, {target_data.max():.3f}]")
        
        return df
        
    def create_binary_flags(self, df):
        """Create binary flags from YOUR consolidated lists"""
        print("🏗️  Creating binary flags from YOUR consolidated lists...")
        
        flags = {}
        
        # Event tag flags
        for tag in self.consolidated_event_tags:
            flag_name = f"{tag}_tag_present"
            if 'consolidated_event_tags' in df.columns:
                flags[flag_name] = df['consolidated_event_tags'].str.contains(tag, na=False).astype(int)
            else:
                flags[flag_name] = 0
                
        # Event type flags  
        for event_type in self.consolidated_event_types:
            flag_name = f"{event_type}_type_present"
            if 'consolidated_event_type' in df.columns:
                flags[flag_name] = (df['consolidated_event_type'] == event_type).astype(int)
            else:
                flags[flag_name] = 0
                
        # Factor name flags
        for factor in self.consolidated_factor_names:
            flag_name = f"{factor}_factor_present"
            if 'consolidated_factor_name' in df.columns:
                flags[flag_name] = (df['consolidated_factor_name'] == factor).astype(int)
            else:
                flags[flag_name] = 0
        
        print(f"✅ Created {len(flags)} binary flags from consolidated lists")
        return pd.DataFrame(flags, index=df.index)
        
    def add_scalar_features(self, df, flags_df):
        """Add scalar features + signed magnitude"""
        print("📊 Adding scalar features...")
        
        # Add scalar features
        for feature in self.scalar_features:
            if feature in df.columns:
                flags_df[feature] = pd.to_numeric(df[feature], errors='coerce').fillna(0)
                
        # Create signed magnitude (YOUR innovation)
        if 'factor_magnitude' in flags_df.columns and 'factor_movement' in flags_df.columns:
            flags_df['signed_magnitude'] = flags_df['factor_movement'] * flags_df['factor_magnitude']
            print("✅ Created signed_magnitude feature")
            
        print(f"✅ Added {len(self.scalar_features)} scalar features + signed_magnitude")
        return flags_df
        
    def time_based_split(self, df, test_size=0.2):
        """Proper time-based split (YOUR approach)"""
        print("⏰ Creating time-based splits...")
        
        df['article_published_at'] = pd.to_datetime(df['article_published_at'])
        df_sorted = df.sort_values('article_published_at')
        
        split_idx = int(len(df_sorted) * (1 - test_size))
        train_df = df_sorted.iloc[:split_idx]
        test_df = df_sorted.iloc[split_idx:]
        
        train_start = train_df['article_published_at'].min()
        train_end = train_df['article_published_at'].max()
        test_start = test_df['article_published_at'].min()
        test_end = test_df['article_published_at'].max()
        
        print(f"📅 Train: {len(train_df)} records ({train_start.date()} → {train_end.date()})")
        print(f"📅 Test:  {len(test_df)} records ({test_start.date()} → {test_end.date()})")
        
        return train_df, test_df
        
    def train_model(self, X_train, y_train, X_test, y_test):
        """Train LightGBM model with YOUR parameters"""
        print("🤖 Training LightGBM model...")
        
        # YOUR model configuration
        model = lgb.LGBMRegressor(
            n_estimators=300,
            max_depth=10,
            learning_rate=0.05,
            random_state=42,
            verbose=-1
        )
        
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        # Calculate metrics
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Directional accuracy (YOUR innovation)
        directional_accuracy = ((y_test > 0) == (y_pred > 0)).mean()
        
        print(f"📈 RMSE: {rmse:.4f}")
        print(f"📈 MAE:  {mae:.4f}")
        print(f"📈 R²:   {r2:.4f}")
        print(f"🎯 Directional Accuracy: {directional_accuracy:.1%}")
        
        # Feature importance analysis
        feature_importance = list(zip(X_train.columns, model.feature_importances_))
        feature_importance.sort(key=lambda x: x[1], reverse=True)
        
        print(f"\n🏆 TOP 10 MOST IMPORTANT FEATURES:")
        for i, (feature, importance) in enumerate(feature_importance[:10], 1):
            print(f"  {i:2d}. {feature}: {importance:.4f}")
        
        return model, {
            'rmse': rmse,
            'mae': mae,
            'r2': r2,
            'directional_accuracy': directional_accuracy,
            'feature_importance': feature_importance,
            'total_features': len(X_train.columns),
            'training_examples': len(X_train),
            'test_examples': len(X_test)
        }
        
    def analyze_feature_categories(self, feature_importance):
        """Analyze which categories of features are most important"""
        print(f"\n📊 FEATURE CATEGORY ANALYSIS:")
        
        categories = {
            'Event Tags': [f for f, _ in feature_importance if '_tag_present' in f],
            'Event Types': [f for f, _ in feature_importance if '_type_present' in f], 
            'Factor Names': [f for f, _ in feature_importance if '_factor_present' in f],
            'Scalar Features': [f for f, _ in feature_importance if f in self.scalar_features + ['signed_magnitude']]
        }
        
        category_importance = {}
        for category, features in categories.items():
            total_importance = sum([imp for feat, imp in feature_importance if feat in features])
            category_importance[category] = {
                'total_importance': total_importance,
                'feature_count': len(features),
                'avg_importance': total_importance / len(features) if features else 0
            }
            
        # Sort by total importance
        sorted_categories = sorted(category_importance.items(), key=lambda x: x[1]['total_importance'], reverse=True)
        
        for category, stats in sorted_categories:
            print(f"  {category}:")
            print(f"    Total Importance: {stats['total_importance']:.4f}")
            print(f"    Features: {stats['feature_count']}")
            print(f"    Avg per Feature: {stats['avg_importance']:.4f}")
            
        return category_importance
        
    def save_results(self, model, results, feature_cols):
        """Save all models and results with enhanced analysis"""
        print(f"\n💾 Saving results to: {self.results_dir}")
        
        # Save model
        joblib.dump(model, f"{self.results_dir}/lightgbm_model.joblib")
        
        # Save detailed results
        with open(f"{self.results_dir}/results.json", 'w') as f:
            json.dump(results, f, indent=2, default=str)
            
        # Save feature importance
        importance_df = pd.DataFrame(results['feature_importance'], columns=['feature', 'importance'])
        importance_df.to_csv(f"{self.results_dir}/feature_importance.csv", index=False)
        
        # Analyze feature categories
        category_analysis = self.analyze_feature_categories(results['feature_importance'])
        
        # Create enhanced summary report
        summary_lines = [
            "# AEIOU PRODUCTION ML PIPELINE RESULTS",
            "",
            f"**Training Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Target Variable**: {self.primary_target} (Apple's actual % movement - perfect for trading decisions!)",
            f"**Training Examples**: {results['training_examples']}",
            f"**Test Examples**: {results['test_examples']}",
            f"**Total Features**: {results['total_features']}",
            "",
            "## Model Performance",
            "",
            f"| Metric | Value |",
            f"|--------|-------|",
            f"| RMSE | {results['rmse']:.4f} |",
            f"| MAE | {results['mae']:.4f} |",
            f"| R² | {results['r2']:.4f} |",
            f"| Directional Accuracy | {results['directional_accuracy']:.1%} |",
            "",
            "## Feature Category Analysis",
            ""
        ]
        
        # Add category analysis to summary
        sorted_categories = sorted(category_analysis.items(), key=lambda x: x[1]['total_importance'], reverse=True)
        for category, stats in sorted_categories:
            summary_lines.extend([
                f"### {category}",
                f"- **Total Importance**: {stats['total_importance']:.4f}",
                f"- **Feature Count**: {stats['feature_count']}",
                f"- **Average Importance**: {stats['avg_importance']:.4f}",
                ""
            ])
            
        summary_lines.extend([
            "## Top 10 Features",
            ""
        ])
        
        for i, (feature, importance) in enumerate(results['feature_importance'][:10], 1):
            # Determine feature type
            if '_tag_present' in feature:
                feature_type = "Event Tag"
                clean_name = feature.replace('_tag_present', '')
            elif '_type_present' in feature:
                feature_type = "Event Type"
                clean_name = feature.replace('_type_present', '')
            elif '_factor_present' in feature:
                feature_type = "Factor Name"
                clean_name = feature.replace('_factor_present', '')
            else:
                feature_type = "Scalar"
                clean_name = feature
                
            summary_lines.append(f"{i}. **{clean_name}** ({feature_type}): {importance:.4f}")
        
        summary_lines.extend([
            "",
            "## Next Steps",
            "1. Feature engineering: Add time-based and interaction features",
            "2. Model tuning: Hyperparameter optimization",
            "3. Ensemble methods: Combine multiple models",
            "4. Cross-validation: Time series cross-validation",
            "5. Production deployment: Real-time prediction pipeline"
        ])
        
        with open(f"{self.results_dir}/SUMMARY.md", 'w') as f:
            f.write('\n'.join(summary_lines))
            
        print(f"✅ Results saved successfully!")
        return self.results_dir
        
    def run_complete_pipeline(self):
        """Run the complete production pipeline"""
        print("🚀 STARTING AEIOU PRODUCTION ML PIPELINE")
        print("=" * 60)
        print(f"📋 Event tags: {len(self.consolidated_event_tags)}")
        print(f"📋 Event types: {len(self.consolidated_event_types)}")
        print(f"📋 Factor names: {len(self.consolidated_factor_names)}")
        print(f"📊 Scalar features: {len(self.scalar_features)}")
        print(f"🎯 Primary target: {self.primary_target}")
        print(f"🎯 Secondary targets: {self.secondary_targets}")
        print()
        
        # Setup
        self.setup_results_directory()
        
        # Load data - using your existing 12K dataset
        # Load the Apple stock movement dataset
        data_path = "/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/APPLE_MOVEMENTS_TEST.csv"
        print("🍎 Using Apple stock movement data - perfect for trading decisions!")
        df = self.load_and_prepare_data(data_path)
        
        # Check if we have the primary target
        if self.primary_target not in df.columns:
            print(f"❌ Primary target '{self.primary_target}' not found!")
            print(f"Available columns: {list(df.columns)}")
            return None
        
        # Create features using YOUR approach
        flags_df = self.create_binary_flags(df)
        features_df = self.add_scalar_features(df, flags_df)
        
        # Prepare target
        target = pd.to_numeric(df[self.primary_target], errors='coerce').fillna(0)
        
        # Split data (Note: using random split since current CSV lacks timestamps)
        print("⚠️  Using random split - current CSV lacks article_published_at for time-based splitting")
        
        from sklearn.model_selection import train_test_split
        full_df = features_df.copy()
        full_df['target'] = target
        
        train_df, test_df = train_test_split(full_df, test_size=0.2, random_state=42)
        
        # Prepare training data
        feature_cols = [col for col in features_df.columns]
        X_train = train_df[feature_cols]
        y_train = train_df['target']
        X_test = test_df[feature_cols]
        y_test = test_df['target']
        
        print(f"\n🔧 FEATURE SUMMARY:")
        print(f"  • Binary flags: {len([c for c in feature_cols if '_present' in c])}")
        print(f"  • Scalar features: {len([c for c in feature_cols if c in self.scalar_features + ['signed_magnitude']])}")
        print(f"  • Total features: {len(feature_cols)}")
        
        # Train model
        model, results = self.train_model(X_train, y_train, X_test, y_test)
        
        # Save results
        results_dir = self.save_results(model, results, feature_cols)
        
        print(f"\n🎉 PIPELINE COMPLETE!")
        print(f"📁 Results saved to: {results_dir}")
        
        # Final summary
        print(f"\n📊 FINAL RESULTS:")
        print(f"  • Directional Accuracy: {results['directional_accuracy']:.1%}")
        print(f"  • RMSE: {results['rmse']:.4f}")
        print(f"  • R²: {results['r2']:.4f}")
        print(f"  • Total Features Used: {results['total_features']}")
        
        return results_dir

if __name__ == "__main__":
    pipeline = AEIOUProductionPipeline()
    results_dir = pipeline.run_complete_pipeline()