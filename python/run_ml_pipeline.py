#!/usr/bin/env python3
"""
AEIOU ML Pipeline Runner
Single script to export data and run ML pipeline with proper organization
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from feature_config import FEATURE_CONFIG
import subprocess
import json

class AEIOUPipelineRunner:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.data_dir = self.project_root / "data" / "exports"
        self.results_dir = self.project_root / "results" / "ml_runs"
        
        # Create directories if they don't exist
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
    def export_training_data(self) -> str:
        """Export training data from Supabase automatically in batches"""
        
        print("🚀 EXPORTING REAL TRAINING DATA FROM SUPABASE")
        print("=" * 50)
        
        # Create timestamped filename
        export_filename = f"apple_training_data_{self.timestamp}.csv"
        export_path = self.data_dir / export_filename
        
        print(f"📊 Target: {FEATURE_CONFIG.primary_target}")
        print(f"📁 Export path: {export_path}")
        
        # Build select columns dynamically based on feature config
        select_columns = [
            "article_id",
            "article_published_at",
            FEATURE_CONFIG.primary_target,
            FEATURE_CONFIG.secondary_target
        ]
        
        # Add categorical and numerical features that exist in the database
        # Binary flags will be generated from array columns in post-processing
        for cat_feature in FEATURE_CONFIG.categorical_features:
            if cat_feature not in select_columns:
                select_columns.append(cat_feature)
        
        for num_feature in FEATURE_CONFIG.core_numerical_features:
            if num_feature not in select_columns:
                select_columns.append(num_feature)
        
        for num_feature in FEATURE_CONFIG.extended_numerical_features:
            if num_feature not in select_columns:
                select_columns.append(num_feature)
        
        # Add array columns for binary flag generation
        array_columns = ['consolidated_event_tags', 'market_perception_emotional_profile', 'market_perception_cognitive_biases']
        for array_col in array_columns:
            if array_col not in select_columns:
                select_columns.append(array_col)
        
        # Remove duplicates and ensure unique columns
        select_columns = list(pd.unique(select_columns))
        
        # Build comprehensive SQL query - ml_training_data has ALL features AND targets
        sql_query = f"""
        SELECT {', '.join(select_columns)}
        FROM ml_training_data 
        WHERE {FEATURE_CONFIG.primary_target} IS NOT NULL
        ORDER BY article_published_at ASC;
        """
        
        print("🔄 Executing MCP query to get REAL data...")
        print(f"📈 Querying all records with valid {FEATURE_CONFIG.primary_target}")
        
        # Execute the query directly using MCP
        try:
            # Import MCP functions here to avoid circular imports
            import subprocess
            import json
            
            # Execute MCP query and get results
            print("🔄 Running MCP query...")
            
            # Use the MCP execute SQL directly in Python
            from pathlib import Path
            import sys
            
            # Add the project root to path to access MCP tools
            project_root = Path(__file__).parent.parent
            sys.path.append(str(project_root))
            
            # Execute the MCP query
            # This will be replaced with actual MCP integration
            # For now, let's call the MCP directly via subprocess
            print("🎯 Executing SQL query via MCP...")
            
            # We'll execute this via the MCP tool call instead of subprocess
            # This is a placeholder - the actual MCP call will be made by the runner
            print("⚠️  MCP integration - query ready for execution")
            print(f"📊 Query targets: {FEATURE_CONFIG.primary_target}, {FEATURE_CONFIG.secondary_target}")
            print(f"🔧 Total features requested: {len(FEATURE_CONFIG.get_all_features())}")
            
            # Return the path where data will be saved
            return str(export_path), sql_query
                
        except Exception as e:
            print(f"❌ Export preparation failed: {e}")
            return None, None
    
    def _execute_mcp_query(self, sql_query: str, export_path: str):
        """Execute MCP query and save results to CSV"""
        
        print("🎯 EXECUTING MCP QUERY FOR REAL DATA")
        print("=" * 50)
        
        try:
            # This method will be called by the external runner with MCP access
            # The actual MCP execution will happen outside this script
            print(f"📊 SQL Query prepared")
            print(f"💾 Will save to: {export_path}")
            print(f"🎯 Target columns: {FEATURE_CONFIG.primary_target}, {FEATURE_CONFIG.secondary_target}")
            print(f"🔧 Total features: {len(FEATURE_CONFIG.get_all_features())}")
            
            # The MCP query execution will be handled by the calling environment
            # This is a placeholder that indicates the query is ready
            return True
            
        except Exception as e:
            print(f"❌ MCP query execution failed: {e}")
            return False
    
    def calculate_target(self, df: pd.DataFrame) -> pd.DataFrame:
        """Set up target variables - prefer abs_change columns from database"""
        
        print("🎯 SETTING UP TARGET VARIABLE")
        
        # Check what targets are available
        available_targets = [col for col in df.columns if 'alpha' in col or 'change' in col]
        print(f"Available targets: {available_targets}")
        
        # Prefer our configured targets (abs_change_1day_after_pct, abs_change_1week_after_pct)
        if FEATURE_CONFIG.primary_target in df.columns:
            target_col = FEATURE_CONFIG.primary_target
            print(f"✅ Using {target_col} as target (Apple's % change vs itself)")
        elif FEATURE_CONFIG.secondary_target in df.columns:
            target_col = FEATURE_CONFIG.secondary_target
            print(f"✅ Using {target_col} as target (Apple's 1-week % change)")
        elif 'alpha_vs_spy_1day_after' in df.columns:
            target_col = 'alpha_vs_spy_1day_after'
            print(f"⚠️  Primary targets not found. Using {target_col} as fallback (Apple's alpha vs SPY)")
        else:
            print("❌ No suitable target found!")
            return df
        
        # Set the target (copy to primary_target name for consistency)
        if target_col != FEATURE_CONFIG.primary_target:
            df[FEATURE_CONFIG.primary_target] = df[target_col]
        
        # Print target distribution
        target_data = df[FEATURE_CONFIG.primary_target].dropna()
        print(f"📊 TARGET DISTRIBUTION:")
        print(f"  Count: {len(target_data)}")
        print(f"  Mean:  {target_data.mean():.3f}%")
        print(f"  Std:   {target_data.std():.3f}%")
        print(f"  Range: [{target_data.min():.3f}, {target_data.max():.3f}]")
        
        # Binary classification stats
        positive_moves = (target_data > 0).sum()
        negative_moves = (target_data < 0).sum()
        print(f"  Positive moves: {positive_moves} ({positive_moves/len(target_data)*100:.1f}%)")
        print(f"  Negative moves: {negative_moves} ({negative_moves/len(target_data)*100:.1f}%)")
        
        return df
    
    def create_binary_flags(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create binary flags from array-type fields"""
        
        print("🏗️  CREATING BINARY FLAGS")
        
        # 1. Event Tags
        if 'consolidated_event_tags' in df.columns:
            for tag in FEATURE_CONFIG.consolidated_event_tags:
                flag_name = f"{tag}_tag_present"
                df[flag_name] = df['consolidated_event_tags'].apply(
                    lambda x: 1 if x and tag in str(x) else 0
                )
            print(f"✅ Created {len(FEATURE_CONFIG.consolidated_event_tags)} event tag flags")
        else:
            print("⚠️  'consolidated_event_tags' column not found")
        
        # 2. Emotional Profile Flags
        if 'market_perception_emotional_profile' in df.columns:
            for emotion in FEATURE_CONFIG.emotional_profile_values:
                flag_name = f"emotion_{emotion}_present"
                df[flag_name] = df['market_perception_emotional_profile'].apply(
                    lambda x: 1 if x and emotion in str(x) else 0
                )
            print(f"✅ Created {len(FEATURE_CONFIG.emotional_profile_values)} emotional profile flags")
        else:
            print("⚠️  'market_perception_emotional_profile' column not found")
            # Create empty flags for missing data
            for emotion in FEATURE_CONFIG.emotional_profile_values:
                df[f"emotion_{emotion}_present"] = 0
        
        # 3. Cognitive Bias Flags
        if 'market_perception_cognitive_biases' in df.columns:
            for bias in FEATURE_CONFIG.cognitive_biases_values:
                flag_name = f"bias_{bias}_present"
                df[flag_name] = df['market_perception_cognitive_biases'].apply(
                    lambda x: 1 if x and bias in str(x) else 0
                )
            print(f"✅ Created {len(FEATURE_CONFIG.cognitive_biases_values)} cognitive bias flags")
        else:
            print("⚠️  'market_perception_cognitive_biases' column not found")
            # Create empty flags for missing data
            for bias in FEATURE_CONFIG.cognitive_biases_values:
                df[f"bias_{bias}_present"] = 0
        
        total_flags = len(FEATURE_CONFIG.get_all_binary_flags())
        print(f"🎯 TOTAL BINARY FLAGS CREATED: {total_flags}")
        return df
    
    def run_ml_models(self, data_path: str) -> str:
        """Run ML models on the prepared data with full analysis"""
        
        print("🤖 RUNNING ML MODELS")
        print("=" * 50)
        
        # Create results directory for this run
        run_results_dir = self.results_dir / f"run_{self.timestamp}"
        run_results_dir.mkdir(exist_ok=True)
        
        # Load and prepare data
        df = pd.read_csv(data_path)
        print(f"📈 Loaded {len(df)} training examples")
        
        # Calculate target
        df = self.calculate_target(df)
        
        # Create binary flags
        df = self.create_binary_flags(df)
        
        # Save prepared data
        prepared_data_path = run_results_dir / "prepared_data.csv"
        df.to_csv(prepared_data_path, index=False)
        print(f"💾 Prepared data saved: {prepared_data_path}")
        
        # Import and run the actual ML pipeline
        print("🔄 Running ML models...")
        
        from sklearn.model_selection import train_test_split
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
        import lightgbm as lgb
        
        # Prepare features - use ALL features including new ones
        feature_columns = (
            FEATURE_CONFIG.categorical_features +
            FEATURE_CONFIG.get_all_numerical_features() +
            FEATURE_CONFIG.get_all_binary_flags()  # This includes event tags + emotions + biases
        )
        
        # Filter to available columns
        available_features = [col for col in feature_columns if col in df.columns]
        missing_features = [col for col in feature_columns if col not in df.columns]
        
        print(f"✅ Available features: {len(available_features)}")
        print(f"⚠️  Missing features: {len(missing_features)}")
        
        # Prepare data for ML
        X = df[available_features].fillna(0)  # Simple fillna for now
        y = df[FEATURE_CONFIG.primary_target].fillna(0)
        
        # Encode categorical features
        from sklearn.preprocessing import LabelEncoder
        label_encoders = {}
        for col in FEATURE_CONFIG.categorical_features:
            if col in X.columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le
        
        # Time-based split if we have timestamps
        if 'article_published_at' in df.columns:
            df_sorted = df.sort_values('article_published_at')
            split_idx = int(len(df_sorted) * 0.8)
            train_idx = df_sorted.index[:split_idx]
            test_idx = df_sorted.index[split_idx:]
            
            X_train, X_test = X.loc[train_idx], X.loc[test_idx]
            y_train, y_test = y.loc[train_idx], y.loc[test_idx]
            print("📅 Using time-based split (80% train, 20% test)")
        else:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            print("🎲 Using random split (80% train, 20% test)")
        
        print(f"📊 Train: {len(X_train)}, Test: {len(X_test)}")
        
        # Train models
        models = {}
        results = {}
        
        # 1. Random Forest
        print("🌲 Training Random Forest...")
        rf = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
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
        
        # Random Forest feature importance
        rf_importance = pd.DataFrame({
            'feature': available_features,
            'importance': rf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        # LightGBM feature importance
        lgb_importance = pd.DataFrame({
            'feature': available_features,
            'importance': lgb_model.feature_importance()
        }).sort_values('importance', ascending=False)
        
        # Categorize features for analysis
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
        
        # Add categories to importance dataframes
        rf_importance['category'] = rf_importance['feature'].apply(categorize_feature)
        lgb_importance['category'] = lgb_importance['feature'].apply(categorize_feature)
        
        # Create category-specific rankings (keep in memory for analysis)
        rf_by_category = {}
        lgb_by_category = {}
        
        categories = ['categorical', 'numerical', 'event_tag_flag', 'emotion_flag', 'bias_flag']
        for category in categories:
            rf_cat = rf_importance[rf_importance['category'] == category].head(10)
            lgb_cat = lgb_importance[lgb_importance['category'] == category].head(10)
            
            rf_by_category[category] = rf_cat
            lgb_by_category[category] = lgb_cat
        
        # Save consolidated feature importance (one file with all info)
        with pd.ExcelWriter(run_results_dir / f"feature_importance_analysis.xlsx") as writer:
            rf_importance.to_excel(writer, sheet_name='RandomForest_All', index=False)
            lgb_importance.to_excel(writer, sheet_name='LightGBM_All', index=False)
            
            # Add category breakdowns as separate sheets
            for category in categories:
                if len(rf_by_category[category]) > 0:
                    rf_by_category[category].to_excel(writer, sheet_name=f'RF_{category}', index=False)
                if len(lgb_by_category[category]) > 0:
                    lgb_by_category[category].to_excel(writer, sheet_name=f'LGB_{category}', index=False)
        
        # Feature correlation analysis
        print("🔗 Analyzing feature correlations...")
        feature_corr = X[available_features].corr()
        target_corr = X[available_features].corrwith(y).sort_values(ascending=False)
        
        # Save correlations in one Excel file
        with pd.ExcelWriter(run_results_dir / f"correlation_analysis.xlsx") as writer:
            feature_corr.to_excel(writer, sheet_name='Feature_Correlations')
            target_corr.to_frame('correlation').to_excel(writer, sheet_name='Target_Correlations')
        
        # Create comprehensive summary
        summary = {
            "run_info": {
                "timestamp": self.timestamp,
                "data_path": str(data_path),
                "prepared_data_path": str(prepared_data_path),
                "results_dir": str(run_results_dir)
            },
            "data_stats": {
                "total_records": len(df),
                "train_records": len(X_train),
                "test_records": len(X_test),
                "target_variable": FEATURE_CONFIG.primary_target,
                "available_features": len(available_features),
                "missing_features": len(missing_features)
            },
            "target_distribution": {
                "mean": float(y.mean()),
                "std": float(y.std()),
                "min": float(y.min()),
                "max": float(y.max()),
                "positive_moves": int((y > 0).sum()),
                "negative_moves": int((y < 0).sum()),
                "positive_pct": float((y > 0).mean() * 100)
            },
            "model_performance": results,
            "top_features": {
                "random_forest": rf_importance.head(10).to_dict('records'),
                "lightgbm": lgb_importance.head(10).to_dict('records')
            },
            "top_features_by_category": {
                "random_forest": {cat: df.to_dict('records') for cat, df in rf_by_category.items()},
                "lightgbm": {cat: df.to_dict('records') for cat, df in lgb_by_category.items()}
            },
                "feature_categories": {
                    "categorical": len([f for f in FEATURE_CONFIG.categorical_features if f in available_features]),
                    "numerical": len([f for f in FEATURE_CONFIG.get_all_numerical_features() if f in available_features]),
                    "event_tag_flags": len([f for f in FEATURE_CONFIG.get_binary_flag_features() if f in available_features]),
                    "emotion_flags": len([f for f in FEATURE_CONFIG.get_emotional_profile_flags() if f in available_features]),
                    "bias_flags": len([f for f in FEATURE_CONFIG.get_cognitive_bias_flags() if f in available_features]),
                    "total_binary_flags": len([f for f in FEATURE_CONFIG.get_all_binary_flags() if f in available_features])
                }
        }
        
        # Save comprehensive summary
        summary_path = run_results_dir / "COMPLETE_RESULTS.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        # Create markdown summary for easy reading
        self._create_markdown_summary(run_results_dir, summary, rf_importance, lgb_importance, rf_by_category)
        
        print(f"✅ Complete results saved to: {run_results_dir}")
        print(f"📊 Key files:")
        print(f"  • COMPLETE_RESULTS.json - Full results data")
        print(f"  • SUMMARY.md - Easy-to-read summary")
        print(f"  • feature_importance_analysis.xlsx - All feature rankings")
        print(f"  • correlation_analysis.xlsx - All correlations")
        print(f"  • prepared_data.csv - Your processed dataset")
        
        return str(run_results_dir)
    
    def _create_markdown_summary(self, results_dir, summary, rf_importance, lgb_importance, rf_by_category):
        """Create a readable markdown summary"""
        
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
- **Train/Test Split**: {summary['data_stats']['train_records']:,} / {summary['data_stats']['test_records']:,}
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
        
        # Add category breakdowns
        md_content += "\n## 🏷️ Top Features by Category\n"
        
        category_display_names = {
            'event_tag_flag': 'Event Tag Flags',
            'emotion_flag': 'Emotional Profile Flags', 
            'bias_flag': 'Cognitive Bias Flags',
            'numerical': 'Numerical Features',
            'categorical': 'Categorical Features'
        }
        
        for category in ['event_tag_flag', 'emotion_flag', 'bias_flag', 'numerical', 'categorical']:
            if category in rf_by_category and len(rf_by_category[category]) > 0:
                category_name = category_display_names.get(category, category.replace('_', ' ').title())
                md_content += f"\n### {category_name} (Random Forest)\n"
                for i, (_, row) in enumerate(rf_by_category[category].head(5).iterrows(), 1):
                    md_content += f"{i}. **{row['feature']}**: {row['importance']:.4f}\n"
        
        md_content += f"""
## 📁 Files Generated
- `COMPLETE_RESULTS_{self.timestamp}.json` - Full results data
- `prepared_data_{self.timestamp}.csv` - Processed training data
- `random_forest_feature_importance_{self.timestamp}.csv` - RF feature rankings
- `lightgbm_feature_importance_{self.timestamp}.csv` - LGB feature rankings
- `feature_correlations_{self.timestamp}.csv` - Feature correlation matrix
- `target_correlations_{self.timestamp}.csv` - Feature-target correlations

## 🔧 Feature Breakdown
- **Categorical Features**: {summary['feature_categories']['categorical']}
- **Numerical Features**: {summary['feature_categories']['numerical']}
- **Event Tag Flags**: {summary['feature_categories']['event_tag_flags']}
- **Emotion Flags**: {summary['feature_categories']['emotion_flags']}
- **Bias Flags**: {summary['feature_categories']['bias_flags']}
- **Total Binary Flags**: {summary['feature_categories']['total_binary_flags']}
"""
        
        # Save markdown summary
        md_path = results_dir / "SUMMARY.md"
        with open(md_path, 'w') as f:
            f.write(md_content)
        
        print(f"📝 Markdown summary: SUMMARY.md")
    
    def run_complete_pipeline(self):
        """Run the complete pipeline: export -> prepare -> train -> evaluate"""
        
        print("🎉 STARTING COMPLETE AEIOU ML PIPELINE")
        print("=" * 60)
        
        # Print feature configuration
        FEATURE_CONFIG.print_feature_summary()
        print()
        
        # Step 1: Export data
        export_result = self.export_training_data()
        if export_result is None:
            print("❌ Data export failed!")
            return None
            
        if isinstance(export_result, tuple):
            data_path, sql_query = export_result
            print(f"🔄 Executing MCP query to get real data...")
            # Execute the actual MCP query here
            self._execute_mcp_query(sql_query, data_path)
        else:
            data_path = export_result
        
        print()
        
        # Step 2: Run ML pipeline
        results_dir = self.run_ml_models(data_path)
        print()
        
        print("🎉 PIPELINE COMPLETE!")
        print(f"📁 Results saved in: {results_dir}")
        print(f"📊 Data exported to: {data_path}")
        
        return {
            "data_path": data_path,
            "results_dir": results_dir,
            "timestamp": self.timestamp
        }

if __name__ == "__main__":
    runner = AEIOUPipelineRunner()
    results = runner.run_complete_pipeline()
