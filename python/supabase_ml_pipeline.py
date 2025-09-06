#!/usr/bin/env python3
"""
AEIOU Supabase ML Pipeline - Direct Connection
Clean, consolidated pipeline that directly queries Supabase and runs ML models
No MCP dependencies - just python-supabase and your existing feature config
"""

import os
import pandas as pd
import numpy as np
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

# Supabase client
from supabase import create_client, Client

# ML libraries
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import lightgbm as lgb

# Local imports
from feature_config import FEATURE_CONFIG

class AEIOUSupabasePipeline:
    """Direct Supabase connection ML pipeline - no MCP needed"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.data_dir = self.project_root / "data" / "exports"
        self.results_dir = self.project_root / "results" / "ml_runs"
        
        # Create directories
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Initialize Supabase client
        self.supabase = self._init_supabase()
        
    def _init_supabase(self) -> Optional[Client]:
        """Initialize Supabase client from environment variables"""
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            print("❌ Missing Supabase credentials in environment variables")
            print("   Set SUPABASE_URL and SUPABASE_ANON_KEY")
            return None
            
        try:
            client = create_client(supabase_url, supabase_key)
            print("✅ Supabase client initialized")
            return client
        except Exception as e:
            print(f"❌ Failed to initialize Supabase client: {e}")
            return None
    
    def export_training_data(self, limit: int = None) -> Tuple[str, pd.DataFrame]:
        """Export training data directly from Supabase ml_training_data table"""
        
        print("🚀 EXPORTING TRAINING DATA FROM SUPABASE")
        print("=" * 50)
        
        if not self.supabase:
            raise Exception("Supabase client not initialized")
        
        # Build select columns based on feature config
        select_columns = [
            "id",
            "article_id", 
            "article_published_at",
            FEATURE_CONFIG.primary_target,  # abs_change_1day_after_pct
            FEATURE_CONFIG.secondary_target  # abs_change_1week_after_pct
        ]
        
        # Add all categorical and numerical features
        all_features = (
            FEATURE_CONFIG.categorical_features +
            FEATURE_CONFIG.get_all_numerical_features()
        )
        
        # Add array columns for binary flag generation
        array_columns = [
            'consolidated_event_tags', 
            'market_perception_emotional_profile', 
            'market_perception_cognitive_biases',
            'event_tags'  # Also check for this field
        ]
        
        # Combine all columns and remove duplicates
        all_columns = select_columns + all_features + array_columns
        available_columns = list(pd.unique(all_columns))
        
        print(f"📊 Target: {FEATURE_CONFIG.primary_target}")
        print(f"🔧 Requesting {len(available_columns)} columns")
        
        # Query Supabase in batches to handle large datasets
        batch_size = 1000
        all_data = []
        offset = 0
        
        while True:
            print(f"🔄 Fetching batch {offset//batch_size + 1} (offset: {offset})")
            
            # Build query
            query = self.supabase.table('ml_training_data')\
                .select(','.join(available_columns))\
                .not_.is_('abs_change_1day_after_pct', 'null')\
                .order('article_published_at', desc=False)\
                .range(offset, offset + batch_size - 1)
            
            # Execute query
            try:
                response = query.execute()
                batch_data = response.data
                
                if not batch_data:
                    print("✅ No more data - export complete")
                    break
                    
                all_data.extend(batch_data)
                offset += batch_size
                
                print(f"   📈 Fetched {len(batch_data)} records (total: {len(all_data)})")
                
                # Apply limit if specified
                if limit and len(all_data) >= limit:
                    all_data = all_data[:limit]
                    print(f"🎯 Reached limit of {limit} records")
                    break
                    
            except Exception as e:
                print(f"❌ Query failed: {e}")
                break
        
        if not all_data:
            raise Exception("No data retrieved from Supabase")
        
        # Convert to DataFrame
        df = pd.DataFrame(all_data)
        
        print(f"✅ Retrieved {len(df)} records from Supabase")
        print(f"📊 Columns: {len(df.columns)}")
        
        # Save raw export
        export_filename = f"REAL_apple_training_data_{self.timestamp}.csv"
        export_path = self.data_dir / export_filename
        df.to_csv(export_path, index=False)
        
        print(f"💾 Raw data saved: {export_path}")
        
        return str(export_path), df
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features including binary flags from array columns"""
        
        print("🏗️  PREPARING FEATURES")
        print("=" * 30)
        
        # 1. Set up target variables
        df = self._setup_targets(df)
        
        # 2. Create binary flags from array columns
        df = self._create_binary_flags(df)
        
        # 3. Handle missing values
        df = self._handle_missing_values(df)
        
        # 4. Validate feature availability
        df = self._validate_features(df)
        
        return df
    
    def _setup_targets(self, df: pd.DataFrame) -> pd.DataFrame:
        """Setup target variables"""
        
        print("🎯 Setting up target variables...")
        
        target_col = FEATURE_CONFIG.primary_target
        if target_col not in df.columns:
            print(f"❌ Primary target {target_col} not found!")
            return df
        
        # Clean target data
        target_data = df[target_col].dropna()
        print(f"📊 Target ({target_col}):")
        print(f"  Count: {len(target_data)}")
        print(f"  Mean:  {target_data.mean():.3f}%")
        print(f"  Std:   {target_data.std():.3f}%")
        print(f"  Range: [{target_data.min():.3f}, {target_data.max():.3f}]")
        
        # Binary classification stats
        positive = (target_data > 0).sum()
        negative = (target_data < 0).sum()
        print(f"  Positive moves: {positive} ({positive/len(target_data)*100:.1f}%)")
        print(f"  Negative moves: {negative} ({negative/len(target_data)*100:.1f}%)")
        
        return df
    
    def _create_binary_flags(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create binary flags from array-type columns"""
        
        print("🏷️  Creating binary flags...")
        
        # 1. Event Tags - check multiple possible column names
        event_tag_columns = ['consolidated_event_tags', 'event_tags']
        event_tag_col = None
        
        for col in event_tag_columns:
            if col in df.columns:
                event_tag_col = col
                break
        
        if event_tag_col:
            print(f"   Using {event_tag_col} for event tags")
            for tag in FEATURE_CONFIG.consolidated_event_tags:
                flag_name = f"{tag}_tag_present"
                df[flag_name] = df[event_tag_col].apply(
                    lambda x: 1 if x and tag in str(x) else 0
                )
            print(f"   ✅ Created {len(FEATURE_CONFIG.consolidated_event_tags)} event tag flags")
        else:
            print("   ⚠️  No event tags column found - creating empty flags")
            for tag in FEATURE_CONFIG.consolidated_event_tags:
                df[f"{tag}_tag_present"] = 0
        
        # 2. Emotional Profile Flags
        if 'market_perception_emotional_profile' in df.columns:
            print("   Processing emotional profile flags")
            for emotion in FEATURE_CONFIG.emotional_profile_values:
                flag_name = f"emotion_{emotion}_present"
                df[flag_name] = df['market_perception_emotional_profile'].apply(
                    lambda x: 1 if x and emotion in str(x) else 0
                )
            print(f"   ✅ Created {len(FEATURE_CONFIG.emotional_profile_values)} emotion flags")
        else:
            print("   ⚠️  No emotional profile column - creating empty flags")
            for emotion in FEATURE_CONFIG.emotional_profile_values:
                df[f"emotion_{emotion}_present"] = 0
        
        # 3. Cognitive Bias Flags
        if 'market_perception_cognitive_biases' in df.columns:
            print("   Processing cognitive bias flags")
            for bias in FEATURE_CONFIG.cognitive_biases_values:
                flag_name = f"bias_{bias}_present"
                df[flag_name] = df['market_perception_cognitive_biases'].apply(
                    lambda x: 1 if x and bias in str(x) else 0
                )
            print(f"   ✅ Created {len(FEATURE_CONFIG.cognitive_biases_values)} bias flags")
        else:
            print("   ⚠️  No cognitive bias column - creating empty flags")
            for bias in FEATURE_CONFIG.cognitive_biases_values:
                df[f"bias_{bias}_present"] = 0
        
        total_flags = len(FEATURE_CONFIG.get_all_binary_flags())
        print(f"🎯 Total binary flags: {total_flags}")
        
        return df
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values intelligently"""
        
        print("🔧 Handling missing values...")
        
        # For numerical features, fill with 0 or median
        numerical_features = FEATURE_CONFIG.get_all_numerical_features()
        for col in numerical_features:
            if col in df.columns:
                if df[col].dtype in ['float64', 'int64']:
                    df[col] = df[col].fillna(0)
        
        # For categorical features, fill with 'unknown'
        categorical_features = FEATURE_CONFIG.categorical_features
        for col in categorical_features:
            if col in df.columns:
                df[col] = df[col].fillna('unknown')
        
        print("   ✅ Missing values handled")
        return df
    
    def _validate_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate which features are actually available"""
        
        print("🔍 Validating feature availability...")
        
        # Get all expected features
        all_expected = (
            FEATURE_CONFIG.categorical_features +
            FEATURE_CONFIG.get_all_numerical_features() +
            FEATURE_CONFIG.get_all_binary_flags()
        )
        
        available = [col for col in all_expected if col in df.columns]
        missing = [col for col in all_expected if col not in df.columns]
        
        print(f"   ✅ Available features: {len(available)}")
        print(f"   ⚠️  Missing features: {len(missing)}")
        
        if missing:
            print(f"   Missing: {missing[:10]}...")  # Show first 10
        
        return df
    
    def run_ml_models(self, df: pd.DataFrame, export_path: str) -> str:
        """Run ML models with comprehensive analysis"""
        
        print("🤖 RUNNING ML MODELS")
        print("=" * 40)
        
        # Create results directory
        run_results_dir = self.results_dir / f"run_{self.timestamp}"
        run_results_dir.mkdir(exist_ok=True)
        
        # Save prepared data
        prepared_data_path = run_results_dir / "prepared_data.csv"
        df.to_csv(prepared_data_path, index=False)
        print(f"💾 Prepared data: {prepared_data_path}")
        
        # Prepare features for ML
        feature_columns = (
            FEATURE_CONFIG.categorical_features +
            FEATURE_CONFIG.get_all_numerical_features() +
            FEATURE_CONFIG.get_all_binary_flags()
        )
        
        # Filter to available columns
        available_features = [col for col in feature_columns if col in df.columns]
        target_col = FEATURE_CONFIG.primary_target
        
        print(f"📊 Using {len(available_features)} features")
        print(f"🎯 Target: {target_col}")
        
        # Prepare data
        X = df[available_features].copy()
        y = df[target_col].dropna()
        
        # Align X and y (remove rows where target is missing)
        valid_indices = df[target_col].notna()
        X = X.loc[valid_indices]
        y = y.loc[valid_indices]
        
        print(f"📈 Training examples: {len(X)}")
        
        # Encode categorical features
        label_encoders = {}
        for col in FEATURE_CONFIG.categorical_features:
            if col in X.columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le
        
        # Time-based split if possible
        if 'article_published_at' in df.columns:
            df_sorted = df.loc[valid_indices].sort_values('article_published_at')
            split_idx = int(len(df_sorted) * 0.8)
            train_idx = df_sorted.index[:split_idx]
            test_idx = df_sorted.index[split_idx:]
            
            X_train, X_test = X.loc[train_idx], X.loc[test_idx]
            y_train, y_test = y.loc[train_idx], y.loc[test_idx]
            print("📅 Using time-based split (80% train, 20% test)")
        else:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            print("🎲 Using random split (80% train, 20% test)")
        
        print(f"   Train: {len(X_train)}, Test: {len(X_test)}")
        
        # Train models
        models = {}
        results = {}
        
        # 1. Random Forest
        print("🌲 Training Random Forest...")
        rf = RandomForestRegressor(
            n_estimators=100, 
            max_depth=10, 
            random_state=42, 
            n_jobs=-1
        )
        rf.fit(X_train, y_train)
        rf_pred = rf.predict(X_test)
        
        models['random_forest'] = rf
        results['random_forest'] = {
            'rmse': np.sqrt(mean_squared_error(y_test, rf_pred)),
            'mae': mean_absolute_error(y_test, rf_pred),
            'r2': r2_score(y_test, rf_pred),
            'directional_accuracy': ((rf_pred > 0) == (y_test > 0)).mean() * 100
        }
        
        # 2. LightGBM
        print("⚡ Training LightGBM...")
        lgb_train = lgb.Dataset(X_train, y_train)
        lgb_valid = lgb.Dataset(X_test, y_test, reference=lgb_train)
        
        lgb_params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.1,
            'feature_fraction': 0.9,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1
        }
        
        lgb_model = lgb.train(
            lgb_params,
            lgb_train,
            valid_sets=[lgb_valid],
            num_boost_round=100,
            callbacks=[lgb.early_stopping(10), lgb.log_evaluation(0)]
        )
        
        lgb_pred = lgb_model.predict(X_test)
        
        models['lightgbm'] = lgb_model
        results['lightgbm'] = {
            'rmse': np.sqrt(mean_squared_error(y_test, lgb_pred)),
            'mae': mean_absolute_error(y_test, lgb_pred),
            'r2': r2_score(y_test, lgb_pred),
            'directional_accuracy': ((lgb_pred > 0) == (y_test > 0)).mean() * 100
        }
        
        # Feature importance analysis
        print("📊 Analyzing feature importance...")
        
        # Get feature importance
        rf_importance = pd.DataFrame({
            'feature': available_features,
            'importance': rf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        lgb_importance = pd.DataFrame({
            'feature': available_features,
            'importance': lgb_model.feature_importance()
        }).sort_values('importance', ascending=False)
        
        # Categorize features
        def categorize_feature(feature_name):
            if feature_name in FEATURE_CONFIG.categorical_features:
                return 'categorical'
            elif feature_name in FEATURE_CONFIG.get_all_numerical_features():
                return 'numerical'
            elif feature_name.endswith('_tag_present'):
                return 'event_tag_flag'
            elif feature_name.startswith('emotion_') and feature_name.endswith('_present'):
                return 'emotion_flag'
            elif feature_name.startswith('bias_') and feature_name.endswith('_present'):
                return 'bias_flag'
            else:
                return 'other'
        
        rf_importance['category'] = rf_importance['feature'].apply(categorize_feature)
        lgb_importance['category'] = lgb_importance['feature'].apply(categorize_feature)
        
        # Save results
        self._save_results(
            run_results_dir, results, rf_importance, lgb_importance,
            available_features, df, export_path, prepared_data_path
        )
        
        print(f"✅ Complete results saved to: {run_results_dir}")
        return str(run_results_dir)
    
    def _save_results(self, results_dir, results, rf_importance, lgb_importance,
                     available_features, df, export_path, prepared_data_path):
        """Save comprehensive results"""
        
        # Save feature importance analysis
        with pd.ExcelWriter(results_dir / "feature_importance_analysis.xlsx") as writer:
            rf_importance.to_excel(writer, sheet_name='RandomForest_All', index=False)
            lgb_importance.to_excel(writer, sheet_name='LightGBM_All', index=False)
            
            # Category breakdowns
            categories = ['categorical', 'numerical', 'event_tag_flag', 'emotion_flag', 'bias_flag']
            for category in categories:
                rf_cat = rf_importance[rf_importance['category'] == category].head(10)
                lgb_cat = lgb_importance[lgb_importance['category'] == category].head(10)
                
                if len(rf_cat) > 0:
                    rf_cat.to_excel(writer, sheet_name=f'RF_{category}', index=False)
                if len(lgb_cat) > 0:
                    lgb_cat.to_excel(writer, sheet_name=f'LGB_{category}', index=False)
        
        # Create comprehensive summary
        target_data = df[FEATURE_CONFIG.primary_target].dropna()
        summary = {
            "run_info": {
                "timestamp": self.timestamp,
                "export_path": str(export_path),
                "prepared_data_path": str(prepared_data_path),
                "results_dir": str(results_dir)
            },
            "data_stats": {
                "total_records": len(df),
                "target_variable": FEATURE_CONFIG.primary_target,
                "available_features": len(available_features)
            },
            "target_distribution": {
                "mean": float(target_data.mean()),
                "std": float(target_data.std()),
                "min": float(target_data.min()),
                "max": float(target_data.max()),
                "positive_moves": int((target_data > 0).sum()),
                "negative_moves": int((target_data < 0).sum()),
                "positive_pct": float((target_data > 0).mean() * 100)
            },
            "model_performance": results,
            "top_features": {
                "random_forest": rf_importance.head(10).to_dict('records'),
                "lightgbm": lgb_importance.head(10).to_dict('records')
            }
        }
        
        # Save JSON summary
        with open(results_dir / "COMPLETE_RESULTS.json", 'w') as f:
            json.dump(summary, f, indent=2)
        
        # Create markdown summary
        self._create_markdown_summary(results_dir, summary, rf_importance, lgb_importance)
    
    def _create_markdown_summary(self, results_dir, summary, rf_importance, lgb_importance):
        """Create readable markdown summary"""
        
        md_content = f"""# AEIOU ML Results - {self.timestamp}

## 🎯 Model Performance

### Random Forest
- **RMSE**: {summary['model_performance']['random_forest']['rmse']:.4f}
- **MAE**: {summary['model_performance']['random_forest']['mae']:.4f}
- **R²**: {summary['model_performance']['random_forest']['r2']:.4f}
- **Directional Accuracy**: {summary['model_performance']['random_forest']['directional_accuracy']:.1f}%

### LightGBM  
- **RMSE**: {summary['model_performance']['lightgbm']['rmse']:.4f}
- **MAE**: {summary['model_performance']['lightgbm']['mae']:.4f}
- **R²**: {summary['model_performance']['lightgbm']['r2']:.4f}
- **Directional Accuracy**: {summary['model_performance']['lightgbm']['directional_accuracy']:.1f}%

## 📊 Data Summary
- **Total Records**: {summary['data_stats']['total_records']:,}
- **Available Features**: {summary['data_stats']['available_features']}
- **Target**: {summary['data_stats']['target_variable']}

## 🎯 Target Distribution
- **Mean**: {summary['target_distribution']['mean']:.3f}%
- **Std**: {summary['target_distribution']['std']:.3f}%
- **Range**: [{summary['target_distribution']['min']:.3f}, {summary['target_distribution']['max']:.3f}]
- **Positive Moves**: {summary['target_distribution']['positive_moves']} ({summary['target_distribution']['positive_pct']:.1f}%)
- **Negative Moves**: {summary['target_distribution']['negative_moves']} ({100-summary['target_distribution']['positive_pct']:.1f}%)

## 🏆 Top 10 Features (Random Forest)
"""
        
        for i, row in rf_importance.head(10).iterrows():
            md_content += f"{i+1}. **{row['feature']}**: {row['importance']:.4f}\n"
        
        md_content += "\n## ⚡ Top 10 Features (LightGBM)\n"
        
        for i, row in lgb_importance.head(10).iterrows():
            md_content += f"{i+1}. **{row['feature']}**: {row['importance']:.0f}\n"
        
        # Save markdown
        with open(results_dir / "SUMMARY.md", 'w') as f:
            f.write(md_content)
    
    def run_complete_pipeline(self, limit: int = None) -> Dict:
        """Run the complete pipeline: export -> prepare -> train -> evaluate"""
        
        print("🎉 AEIOU COMPLETE SUPABASE ML PIPELINE")
        print("=" * 60)
        
        # Print feature configuration
        FEATURE_CONFIG.print_feature_summary()
        print()
        
        try:
            # Step 1: Export data from Supabase
            export_path, df = self.export_training_data(limit=limit)
            
            # Step 2: Prepare features
            df = self.prepare_features(df)
            
            # Step 3: Run ML models
            results_dir = self.run_ml_models(df, export_path)
            
            print("🎉 PIPELINE COMPLETE!")
            print(f"📁 Results: {results_dir}")
            print(f"📊 Data: {export_path}")
            
            return {
                "success": True,
                "data_path": export_path,
                "results_dir": results_dir,
                "timestamp": self.timestamp,
                "records_processed": len(df)
            }
            
        except Exception as e:
            print(f"❌ Pipeline failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": self.timestamp
            }

def main():
    """Main entry point"""
    
    # Check for environment variables
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_ANON_KEY'):
        print("❌ Missing Supabase environment variables!")
        print("   Set SUPABASE_URL and SUPABASE_ANON_KEY")
        print("   Example:")
        print("   export SUPABASE_URL='https://your-project.supabase.co'")
        print("   export SUPABASE_ANON_KEY='your-anon-key'")
        return
    
    # Initialize pipeline
    pipeline = AEIOUSupabasePipeline()
    
    # Run with full dataset
    results = pipeline.run_complete_pipeline()  # Process all 12,688 records
    
    if results["success"]:
        print(f"\n✅ Success! Processed {results['records_processed']} records")
    else:
        print(f"\n❌ Failed: {results['error']}")

if __name__ == "__main__":
    main()
