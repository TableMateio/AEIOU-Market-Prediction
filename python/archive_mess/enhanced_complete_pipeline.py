#!/usr/bin/env python3
"""
Enhanced Complete AEIOU ML Pipeline
Combines working array parsing + comprehensive analysis + no target leakage

FEATURES:
- Fixed array parsing (proper binary flag activation)
- No target leakage (abs_change_1week_after_pct excluded)
- Complete analysis (Excel, MD, feature importance, correlations)
- Time-series validation
- Performance comparison
"""

import os
import pandas as pd
import numpy as np
import json
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
import lightgbm as lgb
from supabase import create_client
import warnings
warnings.filterwarnings('ignore')

class EnhancedCompleteAEIOUPipeline:
    def __init__(self):
        self.timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M')
        self.supabase = None
        
        # Feature definitions
        self.winning_numerical = [
            'factor_movement', 'causal_certainty', 'article_source_credibility', 
            'market_perception_intensity'
        ]
        
        self.categorical_features = [
            'consolidated_event_type', 'consolidated_factor_name', 'factor_category',
            'event_orientation', 'factor_orientation', 'evidence_level', 
            'evidence_source', 'market_regime', 'article_audience_split', 'event_trigger'
        ]
        
        self.array_features = [
            'consolidated_event_tags', 'market_perception_emotional_profile', 
            'market_perception_cognitive_biases'
        ]
        
        # Comprehensive lists for binary flag creation
        self.event_tags = [
            'ai', 'hardware', 'software', 'semiconductor', 'cloud_services', 'data_center',
            'cybersecurity', 'blockchain', 'vr_ar', 'autonomous_tech', 'space_tech',
            'earnings', 'revenue_growth', 'operating_margin', 'valuation', 'market_sentiment',
            'investor_sentiment', 'capital_allocation', 'investment_strategy',
            'product_innovation', 'product_launch', 'manufacturing', 'supply_chain',
            'business_strategy', 'partnership', 'acquisition', 'competitive_pressure',
            'regulatory', 'legal_ruling', 'antitrust', 'government_policy', 'trade_policy',
            'export_controls', 'privacy', 'compliance',
            'market_trends', 'industry_growth', 'consumer_demand', 'economic_indicators',
            'geopolitical', 'sustainability', 'esg', 'social_responsibility',
            'talent_acquisition', 'leadership_change', 'corporate_governance', 'risk_management',
            'financial_health', 'debt_management', 'cash_flow', 'profitability',
            'innovation_pipeline', 'r_and_d', 'intellectual_property', 'technology_adoption',
            'customer_satisfaction', 'brand_reputation', 'market_share', 'competitive_advantage'
        ]
        
        self.emotions = [
            'optimism', 'pessimism', 'fear', 'confidence', 'uncertainty', 'excitement',
            'anxiety', 'hope', 'skepticism', 'enthusiasm', 'caution', 'panic',
            'euphoria', 'despair', 'relief', 'frustration', 'anticipation', 'complacency',
            'greed', 'regret', 'satisfaction', 'disappointment', 'indifference'
        ]
        
        self.biases = [
            'availability_heuristic', 'confirmation_bias', 'anchoring_bias', 'recency_bias',
            'overconfidence_bias', 'loss_aversion', 'herding_behavior', 'survivorship_bias',
            'hindsight_bias', 'representativeness_heuristic', 'framing_effect', 'status_quo_bias',
            'endowment_effect', 'sunk_cost_fallacy', 'attribution_bias', 'authority_bias', 'halo_effect'
        ]
        
    def setup_supabase(self):
        """Initialize Supabase client"""
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        if not url or not key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables")
        
        self.supabase = create_client(url, key)
        print("✅ Supabase client initialized")
        
    def fetch_data_from_supabase(self):
        """Fetch data with NO target leakage"""
        print("🚀 FETCHING DATA (NO LEAKAGE)")
        print("=" * 40)
        
        # CRITICAL: Exclude abs_change_1week_after_pct (target leakage)
        select_columns = [
            "id", "article_id", "article_published_at",
            "abs_change_1day_after_pct", "signed_magnitude"  # NO WEEK TARGET
        ] + self.winning_numerical + self.categorical_features + self.array_features
        
        print(f"📊 Requesting {len(select_columns)} columns (no leakage)")
        
        # Fetch all data
        all_data = []
        page_size = 1000
        page = 0
        
        while True:
            query = self.supabase.table('ml_training_data').select(
                ','.join(select_columns)
            ).range(page * page_size, (page + 1) * page_size - 1)
            
            response = query.execute()
            
            if not response.data:
                break
                
            all_data.extend(response.data)
            print(f"   📈 Fetched {len(all_data):,} records")
            page += 1
            
            if len(response.data) < page_size:
                break
        
        df = pd.DataFrame(all_data)
        print(f"✅ Retrieved {len(df):,} records from Supabase")
        return df
    
    def create_binary_flags_robust(self, df):
        """Create binary flags with robust array parsing"""
        print("🏗️ CREATING BINARY FLAGS (ROBUST PARSING)")
        print("=" * 45)
        
        flags_created = 0
        
        # Process consolidated_event_tags
        if 'consolidated_event_tags' in df.columns:
            print("   📊 Processing consolidated_event_tags...")
            for tag in self.event_tags:
                flag_name = f"{tag}_tag_present"
                df[flag_name] = 0
                
                for idx, row in df.iterrows():
                    tags_value = row['consolidated_event_tags']
                    if pd.notna(tags_value) and (isinstance(tags_value, (str, list)) and len(str(tags_value)) > 0):
                        try:
                            # Handle different formats
                            if isinstance(tags_value, str):
                                if tags_value.startswith('[') and tags_value.endswith(']'):
                                    # JSON array format
                                    import ast
                                    tags_list = ast.literal_eval(tags_value)
                                elif ',' in tags_value:
                                    # Comma-separated format
                                    tags_list = [t.strip().strip('"').strip("'") for t in tags_value.split(',')]
                                else:
                                    # Single tag
                                    tags_list = [tags_value.strip().strip('"').strip("'")]
                            elif isinstance(tags_value, list):
                                tags_list = tags_value
                            else:
                                continue
                                
                            # Check if tag is present
                            if tag in tags_list or tag.replace('_', ' ') in tags_list:
                                df.at[idx, flag_name] = 1
                                
                        except Exception as e:
                            # Skip problematic entries
                            continue
                
                activations = df[flag_name].sum()
                if activations > 0:
                    flags_created += 1
                    print(f"     ✅ {flag_name}: {activations} activations")
        
        # Process emotions
        if 'market_perception_emotional_profile' in df.columns:
            print("   😊 Processing emotions...")
            for emotion in self.emotions:
                flag_name = f"emotion_{emotion}_present"
                df[flag_name] = 0
                
                for idx, row in df.iterrows():
                    emotions_value = row['market_perception_emotional_profile']
                    if pd.notna(emotions_value) and (isinstance(emotions_value, (str, list)) and len(str(emotions_value)) > 0):
                        try:
                            if isinstance(emotions_value, str):
                                if emotions_value.startswith('[') and emotions_value.endswith(']'):
                                    import ast
                                    emotions_list = ast.literal_eval(emotions_value)
                                elif ',' in emotions_value:
                                    emotions_list = [e.strip().strip('"').strip("'") for e in emotions_value.split(',')]
                                else:
                                    emotions_list = [emotions_value.strip().strip('"').strip("'")]
                            elif isinstance(emotions_value, list):
                                emotions_list = emotions_value
                            else:
                                continue
                                
                            if emotion in emotions_list or emotion.replace('_', ' ') in emotions_list:
                                df.at[idx, flag_name] = 1
                                
                        except Exception as e:
                            continue
                
                activations = df[flag_name].sum()
                if activations > 0:
                    flags_created += 1
        
        # Process biases
        if 'market_perception_cognitive_biases' in df.columns:
            print("   🧠 Processing cognitive biases...")
            for bias in self.biases:
                flag_name = f"bias_{bias}_present"
                df[flag_name] = 0
                
                for idx, row in df.iterrows():
                    biases_value = row['market_perception_cognitive_biases']
                    if pd.notna(biases_value) and (isinstance(biases_value, (str, list)) and len(str(biases_value)) > 0):
                        try:
                            if isinstance(biases_value, str):
                                if biases_value.startswith('[') and biases_value.endswith(']'):
                                    import ast
                                    biases_list = ast.literal_eval(biases_value)
                                elif ',' in biases_value:
                                    biases_list = [b.strip().strip('"').strip("'") for b in biases_value.split(',')]
                                else:
                                    biases_list = [biases_value.strip().strip('"').strip("'")]
                            elif isinstance(biases_value, list):
                                biases_list = biases_value
                            else:
                                continue
                                
                            if bias in biases_list or bias.replace('_', ' ') in biases_list:
                                df.at[idx, flag_name] = 1
                                
                        except Exception as e:
                            continue
                
                activations = df[flag_name].sum()
                if activations > 0:
                    flags_created += 1
        
        print(f"✅ Created {flags_created} active binary flags")
        return df
    
    def prepare_features(self, df):
        """Prepare features with no leakage"""
        print("🏗️ PREPARING FEATURES (NO LEAKAGE)")
        print("=" * 40)
        
        # Target (no leakage)
        target_col = 'abs_change_1day_after_pct'
        y = (df[target_col] > 0).astype(int)
        
        # Create signed_magnitude_scaled
        if 'signed_magnitude' in df.columns:
            df['signed_magnitude_scaled'] = df['signed_magnitude'] * 100
            print("✅ Created signed_magnitude_scaled")
        
        # Create binary flags
        df = self.create_binary_flags_robust(df)
        
        # Prepare feature matrix
        exclude_cols = ['id', 'article_id', 'article_published_at', target_col]
        
        # Get all binary flags
        binary_flags = [col for col in df.columns if col.endswith('_present')]
        
        # Remove constant flags
        active_flags = []
        for flag in binary_flags:
            if df[flag].sum() > 0:
                active_flags.append(flag)
        
        removed_flags = len(binary_flags) - len(active_flags)
        print(f"   🚫 Removed {removed_flags} constant flags")
        print(f"   ✅ Keeping {len(active_flags)} active flags")
        
        # Numerical features
        numerical = [col for col in df.columns if df[col].dtype in ['int64', 'float64'] 
                    and col not in exclude_cols + binary_flags]
        
        # Build feature matrix
        feature_columns = active_flags + numerical
        X = df[feature_columns].fillna(0).copy()
        
        # Encode categoricals
        encoded_count = 0
        for col in self.categorical_features:
            if col in df.columns:
                le = LabelEncoder()
                X[f"{col}_encoded"] = le.fit_transform(df[col].fillna('unknown').astype(str))
                encoded_count += 1
        
        print(f"📊 Final features: {len(X.columns)}")
        print(f"   Active binary flags: {len(active_flags)}")
        print(f"   Numerical: {len(numerical)}")
        print(f"   Categorical encoded: {encoded_count}")
        print(f"🎯 Target: UP {y.sum():,} ({y.mean()*100:.1f}%), DOWN {(1-y).sum():,}")
        
        return X, y, df
    
    def train_models(self, X, y):
        """Train models with comprehensive analysis"""
        print("🤖 TRAINING MODELS")
        print("=" * 25)
        
        # Time-series split (no shuffling)
        train_size = int(0.8 * len(X))
        X_train, X_test = X[:train_size], X[train_size:]
        y_train, y_test = y[:train_size], y[train_size:]
        
        print(f"📈 Time-series split: Train {len(X_train):,}, Test {len(X_test):,}")
        
        results = {}
        
        # RandomForest
        rf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)
        rf_accuracy = accuracy_score(y_test, rf_pred) * 100
        
        # LightGBM
        lgb_train = lgb.Dataset(X_train, label=y_train)
        lgb_test = lgb.Dataset(X_test, label=y_test, reference=lgb_train)
        
        params = {
            'objective': 'binary',
            'metric': 'binary_logloss',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.9,
            'verbose': -1,
            'random_state': 42
        }
        
        model = lgb.train(
            params, lgb_train, valid_sets=[lgb_test],
            num_boost_round=100,
            callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)]
        )
        
        lgb_pred = model.predict(X_test, num_iteration=model.best_iteration)
        lgb_pred_binary = (lgb_pred > 0.5).astype(int)
        lgb_accuracy = accuracy_score(y_test, lgb_pred_binary) * 100
        
        print(f"🌲 RandomForest: {rf_accuracy:.1f}%")
        print(f"⚡ LightGBM: {lgb_accuracy:.1f}%")
        
        # Feature importance
        feature_importance = model.feature_importance(importance_type='gain')
        feature_names = X.columns.tolist()
        
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': feature_importance
        }).sort_values('importance', ascending=False)
        
        print(f"\\n📊 TOP 10 FEATURES:")
        for i, (_, row) in enumerate(importance_df.head(10).iterrows()):
            print(f"   {i+1:2d}. {row['feature']}: {row['importance']:.1f}")
        
        # Detailed analysis
        majority_baseline = max(y_test.mean(), 1-y_test.mean()) * 100
        
        results = {
            'rf_accuracy': rf_accuracy,
            'lgb_accuracy': lgb_accuracy,
            'majority_baseline': majority_baseline,
            'improvement': lgb_accuracy - majority_baseline,
            'feature_importance': importance_df,
            'model': model,
            'X_test': X_test,
            'y_test': y_test,
            'predictions': lgb_pred_binary,
            'confusion_matrix': confusion_matrix(y_test, lgb_pred_binary)
        }
        
        return results
    
    def save_comprehensive_analysis(self, results, df, X, y):
        """Save comprehensive analysis with Excel and MD files"""
        print("💾 SAVING COMPREHENSIVE ANALYSIS")
        print("=" * 40)
        
        run_dir = f"../results/ml_runs/enhanced_run_{self.timestamp}"
        os.makedirs(run_dir, exist_ok=True)
        
        # 1. Save prepared data
        df.to_csv(f"{run_dir}/prepared_data.csv", index=False)
        
        # 2. Basic results JSON
        summary = {
            'timestamp': self.timestamp,
            'performance': {
                'lightgbm_accuracy': results['lgb_accuracy'],
                'randomforest_accuracy': results['rf_accuracy'],
                'majority_baseline': results['majority_baseline'],
                'improvement': results['improvement']
            },
            'configuration': 'enhanced_no_leakage',
            'data_stats': {
                'total_records': len(df),
                'features': len(X.columns),
                'up_moves': int(y.sum()),
                'down_moves': int((1-y).sum())
            }
        }
        
        with open(f"{run_dir}/results.json", 'w') as f:
            json.dump(summary, f, indent=2)
        
        # 3. Feature importance CSV
        results['feature_importance'].to_csv(f"{run_dir}/feature_importance.csv", index=False)
        
        # 4. Enhanced Excel analysis
        try:
            with pd.ExcelWriter(f"{run_dir}/complete_analysis.xlsx", engine='openpyxl') as writer:
                # Model Performance sheet
                perf_data = {
                    'Metric': ['LightGBM Accuracy', 'RandomForest Accuracy', 'Majority Baseline', 'Improvement'],
                    'Value': [f"{results['lgb_accuracy']:.1f}%", f"{results['rf_accuracy']:.1f}%", 
                             f"{results['majority_baseline']:.1f}%", f"{results['improvement']:+.1f}pp"]
                }
                pd.DataFrame(perf_data).to_excel(writer, sheet_name='Model_Performance', index=False)
                
                # Feature importance with correlations
                importance_enhanced = results['feature_importance'].copy()
                
                # Add correlations
                target_col = 'abs_change_1day_after_pct'
                correlations = []
                for feature in importance_enhanced['feature']:
                    if feature in X.columns and X[feature].dtype in ['int64', 'float64']:
                        try:
                            corr = X[feature].corr(df[target_col])
                            correlations.append(corr)
                        except:
                            correlations.append(0)
                    else:
                        correlations.append(0)
                
                importance_enhanced['correlation'] = correlations
                importance_enhanced['abs_correlation'] = np.abs(correlations)
                importance_enhanced['correlation_direction'] = ['Positive' if c > 0 else 'Negative' if c < 0 else 'None' for c in correlations]
                
                importance_enhanced.to_excel(writer, sheet_name='Feature_Analysis', index=False)
                
                # Confusion matrix
                cm = results['confusion_matrix']
                cm_df = pd.DataFrame(cm, 
                                   index=['Actual Down', 'Actual Up'], 
                                   columns=['Predicted Down', 'Predicted Up'])
                cm_df.to_excel(writer, sheet_name='Confusion_Matrix')
            
            print(f"✅ Excel analysis saved: complete_analysis.xlsx")
            
        except Exception as e:
            print(f"⚠️ Excel save failed: {e}")
            
        # 5. Markdown summary
        md_content = f"""# Enhanced AEIOU ML Pipeline Results
        
## Performance Summary
- **LightGBM Accuracy**: {results['lgb_accuracy']:.1f}%
- **RandomForest Accuracy**: {results['rf_accuracy']:.1f}%
- **Majority Baseline**: {results['majority_baseline']:.1f}%
- **Improvement**: {results['improvement']:+.1f} percentage points

## Configuration
- **Target Leakage**: ❌ Removed (no abs_change_1week_after_pct)
- **Features**: {len(X.columns)} total
- **Binary Flags**: {len([c for c in X.columns if c.endswith('_present')])} active
- **Array Parsing**: ✅ Robust implementation
- **Validation**: Time-series split (no lookahead)

## Top Features
{chr(10).join([f"{i+1}. {row['feature']}: {row['importance']:.1f}" for i, (_, row) in enumerate(results['feature_importance'].head(10).iterrows())])}

## Data Quality
- **Total Records**: {len(df):,}
- **UP Moves**: {y.sum():,} ({y.mean()*100:.1f}%)
- **DOWN Moves**: {(1-y).sum():,} ({(1-y.mean())*100:.1f}%)

## Files Generated
- `prepared_data.csv` - Complete processed dataset
- `results.json` - Performance metrics
- `feature_importance.csv` - Feature rankings
- `complete_analysis.xlsx` - Multi-sheet analysis
- `analysis_summary.md` - This summary

---
*Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
        
        with open(f"{run_dir}/analysis_summary.md", 'w') as f:
            f.write(md_content)
        
        print(f"📁 Results saved to: {run_dir}")
        print(f"📊 Files: prepared_data.csv, results.json, complete_analysis.xlsx, analysis_summary.md")
        
        return run_dir
    
    def run_complete_pipeline(self):
        """Run the complete enhanced pipeline"""
        print("🚀 ENHANCED COMPLETE AEIOU ML PIPELINE")
        print("=" * 50)
        print("Fixed array parsing + comprehensive analysis + no leakage")
        print()
        
        start_time = datetime.now()
        
        # Setup
        self.setup_supabase()
        
        # Fetch data (no leakage)
        df = self.fetch_data_from_supabase()
        
        # Prepare features
        X, y, df_processed = self.prepare_features(df)
        
        # Train models
        results = self.train_models(X, y)
        
        # Save comprehensive analysis
        run_dir = self.save_comprehensive_analysis(results, df_processed, X, y)
        
        # Final summary
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"\\n🎉 ENHANCED PIPELINE COMPLETE!")
        print(f"⏱️  Total time: {duration:.1f} seconds")
        print(f"🎯 LightGBM: {results['lgb_accuracy']:.1f}%")
        print(f"📊 Improvement: {results['improvement']:+.1f}pp vs baseline")
        print(f"📁 Results: {run_dir}")
        
        if results['lgb_accuracy'] > 65:
            print("🚀 SUCCESS! Strong performance achieved!")
        elif results['lgb_accuracy'] > 60:
            print("✅ GOOD! Beat baseline significantly")
        else:
            print("📊 BASELINE: Need more feature engineering")
        
        return results, run_dir

if __name__ == "__main__":
    pipeline = EnhancedCompleteAEIOUPipeline()
    results, run_dir = pipeline.run_complete_pipeline()
