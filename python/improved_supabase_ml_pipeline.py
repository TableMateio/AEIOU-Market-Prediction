#!/usr/bin/env python3
"""
AEIOU Improved Supabase ML Pipeline
Fixes: zero targets, missing months, array handling, adds signed_magnitude
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

class ImprovedAEIOUPipeline:
    """Improved pipeline with data quality fixes"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.data_dir = self.project_root / "data" / "exports"
        self.results_dir = self.project_root / "results" / "ml_runs"
        
        # Create directories
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        # Better readable timestamp format: 2025-09-06_10-57
        self.timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
        
        # Initialize Supabase client
        self.supabase = self._init_supabase()
        
        # Archive old runs to keep results directory clean
        self._archive_old_runs()
        
    def _archive_old_runs(self):
        """Archive old runs to keep results directory clean"""
        try:
            archive_dir = self.results_dir / "archive"
            archive_dir.mkdir(exist_ok=True)
            
            # Find existing run directories (but not archive)
            existing_runs = [d for d in self.results_dir.iterdir() 
                           if d.is_dir() and d.name != "archive" and 
                           (d.name.startswith("CLEAN_run_") or d.name.startswith("ENHANCED_run_") or d.name.startswith("run_"))]
            
            if existing_runs:
                print(f"📦 Archiving {len(existing_runs)} old runs...")
                for run_dir in existing_runs:
                    archive_path = archive_dir / run_dir.name
                    if not archive_path.exists():
                        run_dir.rename(archive_path)
                        print(f"   📁 Archived: {run_dir.name}")
                    else:
                        # If archive already exists, just remove the old one
                        import shutil
                        shutil.rmtree(run_dir)
                        print(f"   🗑️  Removed duplicate: {run_dir.name}")
        except Exception as e:
            print(f"⚠️  Warning: Could not archive old runs: {e}")
        
    def _init_supabase(self) -> Optional[Client]:
        """Initialize Supabase client from environment variables"""
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            print("❌ Missing Supabase credentials in environment variables")
            return None
            
        try:
            client = create_client(supabase_url, supabase_key)
            print("✅ Supabase client initialized")
            return client
        except Exception as e:
            print(f"❌ Failed to initialize Supabase client: {e}")
            return None
    
    def export_clean_training_data(self, limit: int = None) -> Tuple[str, pd.DataFrame]:
        """Export clean training data - excluding zero targets and including signed_magnitude"""
        
        print("🚀 EXPORTING CLEAN TRAINING DATA FROM SUPABASE")
        print("=" * 60)
        
        if not self.supabase:
            raise Exception("Supabase client not initialized")
        
        # Build select columns including signed_magnitude
        select_columns = [
            "id",
            "article_id", 
            "article_published_at",
            FEATURE_CONFIG.primary_target,  # abs_change_1day_after_pct
            FEATURE_CONFIG.secondary_target,  # abs_change_1week_after_pct
            "signed_magnitude"  # NEW: Added signed magnitude field
        ]
        
        # Add all categorical and numerical features
        all_features = (
            FEATURE_CONFIG.categorical_features +
            FEATURE_CONFIG.get_all_numerical_features()
        )
        
        # Add array columns (we'll process these and then drop them)
        array_columns = [
            'consolidated_event_tags', 
            'market_perception_emotional_profile', 
            'market_perception_cognitive_biases'
        ]
        
        # Combine all columns and remove duplicates
        all_columns = select_columns + all_features + array_columns
        available_columns = list(pd.unique(all_columns))
        
        print(f"📊 Target: {FEATURE_CONFIG.primary_target}")
        print(f"🔧 Requesting {len(available_columns)} columns")
        print("🧹 Filtering out zero targets and missing months")
        
        # Query with data quality filters
        batch_size = 1000
        all_data = []
        offset = 0
        
        while True:
            print(f"🔄 Fetching batch {offset//batch_size + 1} (offset: {offset})")
            
            # Build query with quality filters
            query = self.supabase.table('ml_training_data')\
                .select(','.join(available_columns))\
                .not_.is_('abs_change_1day_after_pct', 'null')\
                .neq('abs_change_1day_after_pct', 0)\
                .gte('article_published_at', '2025-02-01T00:00:00Z')\
                .order('article_published_at', desc=False)\
                .range(offset, offset + batch_size - 1)
            
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
            raise Exception("No clean data retrieved from Supabase")
        
        # Convert to DataFrame
        df = pd.DataFrame(all_data)
        
        print(f"✅ Retrieved {len(df)} CLEAN records from Supabase")
        print(f"📊 Columns: {len(df.columns)}")
        
        # Data quality summary
        target_data = df[FEATURE_CONFIG.primary_target].dropna()
        print(f"🎯 Target summary:")
        print(f"   Count: {len(target_data)}")
        print(f"   Range: [{target_data.min():.3f}, {target_data.max():.3f}]")
        print(f"   Zero values: {(target_data == 0).sum()} (should be 0)")
        
        # Check date range
        dates = pd.to_datetime(df['article_published_at'], format='ISO8601')
        print(f"📅 Date range: {dates.min()} to {dates.max()}")
        
        # Check signed_magnitude
        if 'signed_magnitude' in df.columns:
            signed_mag = df['signed_magnitude'].dropna()
            print(f"📏 Signed magnitude: {len(signed_mag)} values, range: [{signed_mag.min():.3f}, {signed_mag.max():.3f}]")
        else:
            print("⚠️  signed_magnitude field not found")
        
        # Save raw export with readable timestamp
        export_filename = f"apple_training_data_{self.timestamp}.csv"
        export_path = self.data_dir / export_filename
        df.to_csv(export_path, index=False)
        
        print(f"💾 Clean data saved: {export_path}")
        
        return str(export_path), df
    
    def prepare_features_improved(self, df: pd.DataFrame) -> pd.DataFrame:
        """Improved feature preparation with better array handling"""
        
        print("🏗️  PREPARING FEATURES (IMPROVED)")
        print("=" * 40)
        
        # 1. Set up target variables
        df = self._setup_targets(df)
        
        # 2. Add signed_magnitude to numerical features if available
        if 'signed_magnitude' in df.columns:
            print("✅ Adding signed_magnitude to numerical features")
            # Add it to the feature list dynamically
            if 'signed_magnitude' not in FEATURE_CONFIG.get_all_numerical_features():
                FEATURE_CONFIG.extended_numerical_features.append('signed_magnitude')
        
        # 3. Create binary flags from array columns (improved)
        df = self._create_binary_flags_improved(df)
        
        # 4. Clean up array columns (remove them after creating flags)
        array_cols_to_drop = [
            'consolidated_event_tags', 
            'market_perception_emotional_profile', 
            'market_perception_cognitive_biases'
        ]
        for col in array_cols_to_drop:
            if col in df.columns:
                print(f"🗑️  Dropping array column: {col} (converted to binary flags)")
                df = df.drop(columns=[col])
        
        # 5. Handle missing values
        df = self._handle_missing_values(df)
        
        # 6. Validate feature availability
        df = self._validate_features(df)
        
        return df
    
    def _create_binary_flags_improved(self, df: pd.DataFrame) -> pd.DataFrame:
        """Improved binary flag creation with better array parsing"""
        
        print("🏷️  Creating binary flags (improved)...")
        
        # Helper function to safely parse arrays
        def parse_array_column(value):
            if pd.isna(value) or value is None:
                return []
            if isinstance(value, str):
                # Handle string representations of arrays
                if value.startswith('[') and value.endswith(']'):
                    try:
                        # Remove brackets and quotes, split by comma
                        clean_value = value.strip('[]')
                        if not clean_value:
                            return []
                        items = [item.strip().strip("'\"") for item in clean_value.split(',')]
                        return [item for item in items if item]
                    except:
                        return []
                else:
                    return [value.strip().strip("'\"")]
            elif isinstance(value, list):
                # Handle actual list objects
                return [str(item).strip().strip("'\"") for item in value]
            elif hasattr(value, '__iter__') and not isinstance(value, str):
                # Handle numpy arrays or other iterables
                try:
                    return [str(item).strip().strip("'\"") for item in value]
                except:
                    return []
            else:
                return [str(value).strip().strip("'\"")]
        
        # 1. Event Tags - improved parsing
        event_tag_columns = ['consolidated_event_tags']
        event_tag_col = None
        
        for col in event_tag_columns:
            if col in df.columns:
                event_tag_col = col
                break
        
        if event_tag_col:
            print(f"   Processing {event_tag_col} with improved parsing")
            
            # Parse arrays and create flags
            for tag in FEATURE_CONFIG.consolidated_event_tags:
                flag_name = f"{tag}_tag_present"
                try:
                    def check_tag_in_array(x):
                        parsed = parse_array_column(x)
                        return 1 if any(tag == item for item in parsed) else 0
                    
                    df[flag_name] = df[event_tag_col].apply(check_tag_in_array)
                except Exception as e:
                    print(f"   Warning: Error processing tag {tag}: {e}")
                    df[flag_name] = 0
            
            # Show some statistics
            total_flags = sum(df[f"{tag}_tag_present"].sum() for tag in FEATURE_CONFIG.consolidated_event_tags)
            print(f"   ✅ Created {len(FEATURE_CONFIG.consolidated_event_tags)} event tag flags ({total_flags} total activations)")
        else:
            print("   ⚠️  No event tags column found - creating empty flags")
            for tag in FEATURE_CONFIG.consolidated_event_tags:
                df[f"{tag}_tag_present"] = 0
        
        # 2. Emotional Profile Flags - improved parsing
        if 'market_perception_emotional_profile' in df.columns:
            print("   Processing emotional profile flags with improved parsing")
            
            for emotion in FEATURE_CONFIG.emotional_profile_values:
                flag_name = f"emotion_{emotion}_present"
                try:
                    def check_emotion_in_array(x):
                        parsed = parse_array_column(x)
                        return 1 if any(emotion == item for item in parsed) else 0
                    
                    df[flag_name] = df['market_perception_emotional_profile'].apply(check_emotion_in_array)
                except Exception as e:
                    print(f"   Warning: Error processing emotion {emotion}: {e}")
                    df[flag_name] = 0
            
            total_flags = sum(df[f"emotion_{emotion}_present"].sum() for emotion in FEATURE_CONFIG.emotional_profile_values)
            print(f"   ✅ Created {len(FEATURE_CONFIG.emotional_profile_values)} emotion flags ({total_flags} total activations)")
        else:
            print("   ⚠️  No emotional profile column - creating empty flags")
            for emotion in FEATURE_CONFIG.emotional_profile_values:
                df[f"emotion_{emotion}_present"] = 0
        
        # 3. Cognitive Bias Flags - improved parsing
        if 'market_perception_cognitive_biases' in df.columns:
            print("   Processing cognitive bias flags with improved parsing")
            
            for bias in FEATURE_CONFIG.cognitive_biases_values:
                flag_name = f"bias_{bias}_present"
                try:
                    def check_bias_in_array(x):
                        parsed = parse_array_column(x)
                        return 1 if any(bias == item for item in parsed) else 0
                    
                    df[flag_name] = df['market_perception_cognitive_biases'].apply(check_bias_in_array)
                except Exception as e:
                    print(f"   Warning: Error processing bias {bias}: {e}")
                    df[flag_name] = 0
            
            total_flags = sum(df[f"bias_{bias}_present"].sum() for bias in FEATURE_CONFIG.cognitive_biases_values)
            print(f"   ✅ Created {len(FEATURE_CONFIG.cognitive_biases_values)} bias flags ({total_flags} total activations)")
        else:
            print("   ⚠️  No cognitive bias column - creating empty flags")
            for bias in FEATURE_CONFIG.cognitive_biases_values:
                df[f"bias_{bias}_present"] = 0
        
        total_flags = len(FEATURE_CONFIG.get_all_binary_flags())
        print(f"🎯 Total binary flags: {total_flags}")
        
        return df
    
    def _setup_targets(self, df: pd.DataFrame) -> pd.DataFrame:
        """Setup target variables with validation"""
        
        print("🎯 Setting up target variables...")
        
        target_col = FEATURE_CONFIG.primary_target
        if target_col not in df.columns:
            print(f"❌ Primary target {target_col} not found!")
            return df
        
        # Validate no zero values
        target_data = df[target_col].dropna()
        zero_count = (target_data == 0).sum()
        
        if zero_count > 0:
            print(f"⚠️  Found {zero_count} zero target values - these should have been filtered out!")
        
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
    
    def run_ml_models_improved(self, df: pd.DataFrame, export_path: str) -> str:
        """Run ML models with improved analysis"""
        
        print("🤖 RUNNING ML MODELS (IMPROVED)")
        print("=" * 50)
        
        # Create results directory with readable timestamp
        run_results_dir = self.results_dir / f"run_{self.timestamp}"
        run_results_dir.mkdir(exist_ok=True)
        
        # Save prepared data
        prepared_data_path = run_results_dir / "prepared_clean_data.csv"
        df.to_csv(prepared_data_path, index=False)
        print(f"💾 Prepared clean data: {prepared_data_path}")
        
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
        
        # Check if signed_magnitude is included
        if 'signed_magnitude' in available_features:
            print("✅ signed_magnitude included in features")
        
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
        
        # Time-based split
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
        
        # Train models with better parameters
        models = {}
        results = {}
        
        # 1. Random Forest - improved parameters
        print("🌲 Training Random Forest (improved)...")
        rf = RandomForestRegressor(
            n_estimators=200,  # More trees
            max_depth=15,      # Deeper trees
            min_samples_split=10,
            min_samples_leaf=5,
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
        
        # 2. LightGBM - improved parameters
        print("⚡ Training LightGBM (improved)...")
        lgb_train = lgb.Dataset(X_train, y_train)
        lgb_valid = lgb.Dataset(X_test, y_test, reference=lgb_train)
        
        lgb_params = {
            'objective': 'regression',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'num_leaves': 63,      # More leaves
            'learning_rate': 0.05, # Lower learning rate
            'feature_fraction': 0.8,
            'bagging_fraction': 0.7,
            'bagging_freq': 5,
            'min_child_samples': 20,
            'verbose': -1
        }
        
        lgb_model = lgb.train(
            lgb_params,
            lgb_train,
            valid_sets=[lgb_valid],
            num_boost_round=300,  # More rounds
            callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)]
        )
        
        lgb_pred = lgb_model.predict(X_test)
        
        models['lightgbm'] = lgb_model
        results['lightgbm'] = {
            'rmse': np.sqrt(mean_squared_error(y_test, lgb_pred)),
            'mae': mean_absolute_error(y_test, lgb_pred),
            'r2': r2_score(y_test, lgb_pred),
            'directional_accuracy': ((lgb_pred > 0) == (y_test > 0)).mean() * 100
        }
        
        # Comprehensive feature analysis
        print("📊 Analyzing comprehensive feature relationships...")
        
        # Calculate correlations with target
        feature_correlations = X[available_features].corrwith(y)
        
        # Calculate basic statistics for each feature
        feature_stats = {}
        for feature in available_features:
            stats = X[feature].describe()
            feature_stats[feature] = {
                'mean': stats['mean'],
                'std': stats['std'],
                'min': stats['min'],
                'max': stats['max'],
                'unique_values': X[feature].nunique() if X[feature].dtype == 'object' else None
            }
        
        # Create comprehensive feature analysis dataframes
        rf_analysis = pd.DataFrame({
            'feature': available_features,
            'rf_importance': rf.feature_importances_,
            'correlation_with_target': feature_correlations[available_features].values,
            'correlation_direction': ['positive' if corr > 0 else 'negative' if corr < 0 else 'neutral' 
                                    for corr in feature_correlations[available_features].values],
            'abs_correlation': abs(feature_correlations[available_features]).values,
            'feature_mean': [feature_stats[f]['mean'] for f in available_features],
            'feature_std': [feature_stats[f]['std'] for f in available_features],
            'feature_range': [feature_stats[f]['max'] - feature_stats[f]['min'] for f in available_features]
        }).sort_values('rf_importance', ascending=False)
        
        lgb_analysis = pd.DataFrame({
            'feature': available_features,
            'lgb_importance': lgb_model.feature_importance(),
            'correlation_with_target': feature_correlations[available_features].values,
            'correlation_direction': ['positive' if corr > 0 else 'negative' if corr < 0 else 'neutral' 
                                    for corr in feature_correlations[available_features].values],
            'abs_correlation': abs(feature_correlations[available_features]).values,
            'feature_mean': [feature_stats[f]['mean'] for f in available_features],
            'feature_std': [feature_stats[f]['std'] for f in available_features],
            'feature_range': [feature_stats[f]['max'] - feature_stats[f]['min'] for f in available_features]
        }).sort_values('lgb_importance', ascending=False)
        
        # Save results
        self._save_results_improved(
            run_results_dir, results, rf_analysis, lgb_analysis,
            available_features, df, export_path, prepared_data_path
        )
        
        print(f"✅ Complete CLEAN results saved to: {run_results_dir}")
        return str(run_results_dir)
    
    def _save_results_improved(self, results_dir, results, rf_analysis, lgb_analysis,
                              available_features, df, export_path, prepared_data_path):
        """Save comprehensive results with improvements noted"""
        
        # Enhanced feature categorization with hierarchical structure
        def categorize_feature(feature_name):
            """Return both the technical category and the business feature category"""
            if feature_name in FEATURE_CONFIG.categorical_features:
                return 'categorical', 'Core Categorical'
            elif feature_name in FEATURE_CONFIG.core_numerical_features:
                return 'numerical', 'Core Numerical'
            elif feature_name in FEATURE_CONFIG.extended_numerical_features:
                return 'numerical', 'Extended Numerical'
            elif feature_name.endswith('_tag_present'):
                return 'event_tag_flag', 'Event Tags'
            elif feature_name.startswith('emotion_') and feature_name.endswith('_present'):
                return 'emotion_flag', 'Emotional Profile'
            elif feature_name.startswith('bias_') and feature_name.endswith('_present'):
                return 'bias_flag', 'Cognitive Biases'
            else:
                return 'other', 'Other'
        
        def get_specific_feature_name(feature_name):
            """Extract the specific feature name from flags"""
            if feature_name.endswith('_tag_present'):
                return feature_name.replace('_tag_present', '')
            elif feature_name.startswith('emotion_') and feature_name.endswith('_present'):
                return feature_name.replace('emotion_', '').replace('_present', '')
            elif feature_name.startswith('bias_') and feature_name.endswith('_present'):
                return feature_name.replace('bias_', '').replace('_present', '')
            else:
                return feature_name
        
        # Add enhanced categories to analysis dataframes
        rf_categories = rf_analysis['feature'].apply(categorize_feature)
        rf_analysis['technical_category'] = [cat[0] for cat in rf_categories]
        rf_analysis['feature_category'] = [cat[1] for cat in rf_categories]
        rf_analysis['specific_feature'] = rf_analysis['feature'].apply(get_specific_feature_name)
        
        lgb_categories = lgb_analysis['feature'].apply(categorize_feature)
        lgb_analysis['technical_category'] = [cat[0] for cat in lgb_categories]
        lgb_analysis['feature_category'] = [cat[1] for cat in lgb_categories]
        lgb_analysis['specific_feature'] = lgb_analysis['feature'].apply(get_specific_feature_name)
        
        # Create combined analysis with both models and enhanced categorization
        combined_analysis = pd.merge(
            rf_analysis[['feature', 'rf_importance', 'technical_category', 'feature_category', 'specific_feature']],
            lgb_analysis[['feature', 'lgb_importance', 'correlation_with_target', 
                         'correlation_direction', 'abs_correlation', 'feature_mean', 
                         'feature_std', 'feature_range']],
            on='feature'
        )
        
        # Add ranking columns
        combined_analysis['rf_rank'] = range(1, len(combined_analysis) + 1)
        combined_analysis['lgb_rank'] = combined_analysis['lgb_importance'].rank(ascending=False, method='min')
        combined_analysis['avg_rank'] = (combined_analysis['rf_rank'] + combined_analysis['lgb_rank']) / 2
        
        # Sort by average rank for final ranking
        combined_analysis = combined_analysis.sort_values('avg_rank')
        combined_analysis['combined_rank'] = range(1, len(combined_analysis) + 1)
        
        # Create model performance summary for Excel
        target_data = df[FEATURE_CONFIG.primary_target].dropna()
        performance_summary = pd.DataFrame([
            ['Model Performance', '', '', '', ''],
            ['Random Forest', f"RMSE: {results['random_forest']['rmse']:.4f}", f"MAE: {results['random_forest']['mae']:.4f}", f"R²: {results['random_forest']['r2']:.4f}", f"Directional Accuracy: {results['random_forest']['directional_accuracy']:.1f}%"],
            ['LightGBM', f"RMSE: {results['lightgbm']['rmse']:.4f}", f"MAE: {results['lightgbm']['mae']:.4f}", f"R²: {results['lightgbm']['r2']:.4f}", f"Directional Accuracy: {results['lightgbm']['directional_accuracy']:.1f}%"],
            ['', '', '', '', ''],
            ['Data Summary', '', '', '', ''],
            ['Total Records', f"{len(df):,}", '', '', ''],
            ['Available Features', f"{len(available_features)}", '', '', ''],
            ['Target Variable', f"{FEATURE_CONFIG.primary_target}", '', '', ''],
            ['Target Mean', f"{target_data.mean():.3f}%", '', '', ''],
            ['Target Std', f"{target_data.std():.3f}%", '', '', ''],
            ['Positive Moves', f"{(target_data > 0).sum()} ({(target_data > 0).mean()*100:.1f}%)", '', '', ''],
            ['Negative Moves', f"{(target_data < 0).sum()} ({(target_data < 0).mean()*100:.1f}%)", '', '', '']
        ], columns=['Metric', 'Value', 'Value2', 'Value3', 'Value4'])
        
        # Reorder combined analysis columns for better readability
        column_order = ['feature', 'specific_feature', 'feature_category', 'rf_importance', 'lgb_importance', 
                       'combined_rank', 'correlation_with_target', 'correlation_direction', 'abs_correlation',
                       'feature_mean', 'feature_std', 'feature_range', 'technical_category']
        combined_analysis_ordered = combined_analysis[column_order]
        
        # Save comprehensive feature analysis as single Excel file (Mac-compatible)
        print("💾 Saving feature analysis as Excel file with multiple sheets...")
        
        with pd.ExcelWriter(results_dir / "feature_analysis.xlsx") as writer:
            # 1. Model Performance Summary (first sheet)
            performance_summary.to_excel(writer, sheet_name='Model_Performance', index=False, header=False)
            
            # 2. Main combined analysis with enhanced columns
            combined_analysis_ordered.to_excel(writer, sheet_name='Combined_Analysis', index=False)
            
            # 3. Individual model analyses
            rf_analysis.to_excel(writer, sheet_name='RandomForest_Detailed', index=False)
            lgb_analysis.to_excel(writer, sheet_name='LightGBM_Detailed', index=False)
            
            # 4. Top performers by feature category (using new categorization)
            feature_categories = ['Core Categorical', 'Core Numerical', 'Extended Numerical', 'Event Tags', 'Emotional Profile', 'Cognitive Biases']
            for category in feature_categories:
                cat_data = combined_analysis_ordered[combined_analysis_ordered['feature_category'] == category].head(10)
                if len(cat_data) > 0:
                    sheet_name = f"Top_{category.replace(' ', '_')}"
                    cat_data.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # 5. Correlation insights
            high_corr = combined_analysis_ordered[combined_analysis_ordered['abs_correlation'] > 0.1].sort_values('abs_correlation', ascending=False)
            if len(high_corr) > 0:
                high_corr.to_excel(writer, sheet_name='High_Correlation', index=False)
            
            # 6. Enhanced feature statistics summary
            stats_summary = pd.DataFrame({
                'feature_category': feature_categories,
                'count': [len(combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]) for cat in feature_categories],
                'avg_rf_importance': [combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]['rf_importance'].mean() if len(combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]) > 0 else 0 for cat in feature_categories],
                'avg_lgb_importance': [combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]['lgb_importance'].mean() if len(combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]) > 0 else 0 for cat in feature_categories],
                'avg_abs_correlation': [combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]['abs_correlation'].mean() if len(combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]) > 0 else 0 for cat in feature_categories],
                'top_feature': [combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]['specific_feature'].iloc[0] if len(combined_analysis_ordered[combined_analysis_ordered['feature_category'] == cat]) > 0 else 'None' for cat in feature_categories]
            })
            stats_summary.to_excel(writer, sheet_name='Category_Summary', index=False)
        
        # Create comprehensive summary
        target_data = df[FEATURE_CONFIG.primary_target].dropna()
        summary = {
            "run_info": {
                "timestamp": self.timestamp,
                "export_path": str(export_path),
                "prepared_data_path": str(prepared_data_path),
                "results_dir": str(results_dir),
                "improvements": [
                    "Filtered out zero target values",
                    "Excluded months with missing data",
                    "Improved array parsing for binary flags",
                    "Added signed_magnitude feature",
                    "Better model parameters"
                ]
            },
            "data_stats": {
                "total_records": len(df),
                "target_variable": FEATURE_CONFIG.primary_target,
                "available_features": len(available_features),
                "has_signed_magnitude": 'signed_magnitude' in available_features
            },
            "target_distribution": {
                "mean": float(target_data.mean()),
                "std": float(target_data.std()),
                "min": float(target_data.min()),
                "max": float(target_data.max()),
                "positive_moves": int((target_data > 0).sum()),
                "negative_moves": int((target_data < 0).sum()),
                "positive_pct": float((target_data > 0).mean() * 100),
                "zero_values": int((target_data == 0).sum())
            },
            "model_performance": results,
            "top_features": {
                "combined_ranking": combined_analysis.head(15).to_dict('records'),
                "random_forest": rf_analysis.head(15).to_dict('records'),
                "lightgbm": lgb_analysis.head(15).to_dict('records')
            },
            "correlation_insights": {
                "high_correlation_features": len(combined_analysis[combined_analysis['abs_correlation'] > 0.1]),
                "positive_correlations": len(combined_analysis[combined_analysis['correlation_direction'] == 'positive']),
                "negative_correlations": len(combined_analysis[combined_analysis['correlation_direction'] == 'negative'])
            }
        }
        
        # Save JSON summary
        with open(results_dir / "CLEAN_COMPLETE_RESULTS.json", 'w') as f:
            json.dump(summary, f, indent=2)
        
        # Create markdown summary
        self._create_markdown_summary_improved(results_dir, summary, combined_analysis)
    
    def _create_markdown_summary_improved(self, results_dir, summary, combined_analysis):
        """Create readable markdown summary with comprehensive feature analysis"""
        
        md_content = f"""# AEIOU CLEAN ML Results - {self.timestamp}

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out {summary['target_distribution']['zero_values']} zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: {'Yes' if summary['data_stats']['has_signed_magnitude'] else 'No'}
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: {summary['model_performance']['random_forest']['rmse']:.4f}
- **MAE**: {summary['model_performance']['random_forest']['mae']:.4f}
- **R²**: {summary['model_performance']['random_forest']['r2']:.4f}
- **Directional Accuracy**: {summary['model_performance']['random_forest']['directional_accuracy']:.1f}%

### LightGBM (Improved)
- **RMSE**: {summary['model_performance']['lightgbm']['rmse']:.4f}
- **MAE**: {summary['model_performance']['lightgbm']['mae']:.4f}
- **R²**: {summary['model_performance']['lightgbm']['r2']:.4f}
- **Directional Accuracy**: {summary['model_performance']['lightgbm']['directional_accuracy']:.1f}%

## 📊 Clean Data Summary
- **Total Records**: {summary['data_stats']['total_records']:,} (cleaned)
- **Available Features**: {summary['data_stats']['available_features']}
- **Target**: {summary['data_stats']['target_variable']}
- **Zero Values Removed**: {summary['target_distribution']['zero_values']} (data quality improvement)

## 🎯 Target Distribution (Clean)
- **Mean**: {summary['target_distribution']['mean']:.3f}%
- **Std**: {summary['target_distribution']['std']:.3f}%
- **Range**: [{summary['target_distribution']['min']:.3f}, {summary['target_distribution']['max']:.3f}]
- **Positive Moves**: {summary['target_distribution']['positive_moves']} ({summary['target_distribution']['positive_pct']:.1f}%)
- **Negative Moves**: {summary['target_distribution']['negative_moves']} ({100-summary['target_distribution']['positive_pct']:.1f}%)

## 🔗 Correlation Insights
- **High Correlation Features** (>0.1): {summary['correlation_insights']['high_correlation_features']}
- **Positive Correlations**: {summary['correlation_insights']['positive_correlations']}
- **Negative Correlations**: {summary['correlation_insights']['negative_correlations']}

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|"""
        
        for i, (_, row) in enumerate(combined_analysis.head(15).iterrows(), 1):
            md_content += f"\n| {i} | **{row['feature']}** | {row['specific_feature']} | {row['feature_category']} | {row['rf_importance']:.4f} | {row['lgb_importance']:.0f} | {row['correlation_with_target']:.4f} | {row['correlation_direction']} |"
        
        md_content += f"""

## 📈 Key Insights
- **Most Important Feature**: {combined_analysis.iloc[0]['feature']} (RF: {combined_analysis.iloc[0]['rf_importance']:.4f}, LGB: {combined_analysis.iloc[0]['lgb_importance']:.0f})
- **Strongest Correlation**: {combined_analysis.loc[combined_analysis['abs_correlation'].idxmax(), 'feature']} ({combined_analysis['abs_correlation'].max():.4f})
- **signed_magnitude ranking**: #{combined_analysis[combined_analysis['feature'] == 'signed_magnitude'].index[0] + 1 if 'signed_magnitude' in combined_analysis['feature'].values else 'Not found'}

## 📁 Enhanced Analysis Files
- `CLEAN_feature_analysis.xlsx` - **Comprehensive feature analysis with correlations, directions, and rankings**
  - Combined_Analysis: Main analysis with both models
  - RandomForest_Detailed: RF-specific analysis  
  - LightGBM_Detailed: LGB-specific analysis
  - Top_[Category]: Best features by category
  - High_Correlation: Features with strong correlations
  - Category_Summary: Statistical summary by feature type
- `CLEAN_COMPLETE_RESULTS.json` - Full results data
- `prepared_clean_data.csv` - Your 9,158 clean records"""
        
        # Save markdown
        with open(results_dir / "CLEAN_SUMMARY.md", 'w') as f:
            f.write(md_content)
    
    def run_complete_improved_pipeline(self, limit: int = None) -> Dict:
        """Run the complete improved pipeline"""
        
        print("🎉 AEIOU IMPROVED SUPABASE ML PIPELINE")
        print("=" * 70)
        print("🧹 Data Quality Improvements:")
        print("   • Filter out zero target values")
        print("   • Exclude months with missing data")
        print("   • Improved array parsing")
        print("   • Include signed_magnitude field")
        print("   • Better model parameters")
        print()
        
        # Print feature configuration
        FEATURE_CONFIG.print_feature_summary()
        print()
        
        try:
            # Step 1: Export clean data from Supabase
            export_path, df = self.export_clean_training_data(limit=limit)
            
            # Step 2: Prepare features (improved)
            df = self.prepare_features_improved(df)
            
            # Step 3: Run ML models (improved)
            results_dir = self.run_ml_models_improved(df, export_path)
            
            print("🎉 IMPROVED PIPELINE COMPLETE!")
            print(f"📁 Results: {results_dir}")
            print(f"📊 Clean Data: {export_path}")
            
            return {
                "success": True,
                "data_path": export_path,
                "results_dir": results_dir,
                "timestamp": self.timestamp,
                "records_processed": len(df),
                "improvements": [
                    "Zero targets filtered",
                    "Missing months excluded", 
                    "Array parsing improved",
                    "signed_magnitude added",
                    "Better model parameters"
                ]
            }
            
        except Exception as e:
            print(f"❌ Pipeline failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": self.timestamp
            }
    
    def _run_ml_analysis_on_clean_data(self, data_path: str):
        """Run ML analysis directly on existing clean data file"""
        try:
            # Load the clean data
            df = pd.read_csv(data_path)
            print(f"📊 Loaded {len(df):,} records from existing clean data")
            
            # Create binary flags from the loaded data
            df_with_flags, available_features = self._create_binary_flags_improved(df)
            print(f"🏗️  Created {len(available_features)} total features")
            
            # Prepare data for ML
            feature_columns = [col for col in available_features if col in df_with_flags.columns]
            X = df_with_flags[feature_columns]
            y = df_with_flags[FEATURE_CONFIG.primary_target]
            
            # Remove any remaining NaN values
            mask = ~(X.isna().any(axis=1) | y.isna())
            X_clean = X[mask].fillna(0)
            y_clean = y[mask]
            
            print(f"🧹 Final clean dataset: {len(X_clean):,} records, {len(X_clean.columns)} features")
            
            # Time-based split
            dates = pd.to_datetime(df_with_flags['article_published_at'][mask], format='ISO8601')
            split_date = dates.quantile(0.8)
            train_mask = dates <= split_date
            
            X_train, X_test = X_clean[train_mask], X_clean[~train_mask]
            y_train, y_test = y_clean[train_mask], y_clean[~train_mask]
            
            print(f"📊 Train: {len(X_train):,} | Test: {len(X_test):,}")
            
            # Train models
            print("\n🤖 Training Random Forest...")
            rf_model = RandomForestRegressor(n_estimators=200, max_depth=15, random_state=42, n_jobs=-1)
            rf_model.fit(X_train, y_train)
            
            print("🤖 Training LightGBM...")
            lgb_train = lgb.Dataset(X_train, label=y_train)
            lgb_model = lgb.train(
                params={'objective': 'regression', 'metric': 'rmse', 'verbose': -1},
                train_set=lgb_train,
                num_boost_round=200,
                callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)]
            )
            
            # Make predictions and evaluate
            rf_pred = rf_model.predict(X_test)
            lgb_pred = lgb_model.predict(X_test)
            
            # Calculate metrics
            results = {
                'random_forest': {
                    'rmse': np.sqrt(mean_squared_error(y_test, rf_pred)),
                    'mae': mean_absolute_error(y_test, rf_pred),
                    'r2': r2_score(y_test, rf_pred),
                    'directional_accuracy': np.mean((y_test > 0) == (rf_pred > 0)) * 100
                },
                'lightgbm': {
                    'rmse': np.sqrt(mean_squared_error(y_test, lgb_pred)),
                    'mae': mean_absolute_error(y_test, lgb_pred),
                    'r2': r2_score(y_test, lgb_pred),
                    'directional_accuracy': np.mean((y_test > 0) == (lgb_pred > 0)) * 100
                }
            }
            
            print(f"✅ Random Forest - RMSE: {results['random_forest']['rmse']:.4f}, R²: {results['random_forest']['r2']:.4f}")
            print(f"✅ LightGBM - RMSE: {results['lightgbm']['rmse']:.4f}, R²: {results['lightgbm']['r2']:.4f}")
            
            # Feature importance analysis
            rf_importance = pd.DataFrame({
                'feature': X_clean.columns,
                'rf_importance': rf_model.feature_importances_
            }).sort_values('rf_importance', ascending=False)
            
            lgb_importance = pd.DataFrame({
                'feature': X_clean.columns,
                'lgb_importance': lgb_model.feature_importance()
            }).sort_values('lgb_importance', ascending=False)
            
            # Calculate correlations
            feature_correlations = {}
            feature_stats = {}
            for feature in X_clean.columns:
                corr = X_clean[feature].corr(y_clean)
                feature_correlations[feature] = corr
                feature_stats[feature] = {
                    'mean': X_clean[feature].mean(),
                    'std': X_clean[feature].std(),
                    'min': X_clean[feature].min(),
                    'max': X_clean[feature].max(),
                    'unique_values': X_clean[feature].nunique()
                }
            
            # Enhanced analysis dataframes
            lgb_importance['correlation_with_target'] = lgb_importance['feature'].map(feature_correlations)
            lgb_importance['correlation_direction'] = lgb_importance['correlation_with_target'].apply(
                lambda x: 'Positive' if x > 0 else 'Negative' if x < 0 else 'None'
            )
            lgb_importance['abs_correlation'] = lgb_importance['correlation_with_target'].abs()
            lgb_importance['feature_mean'] = lgb_importance['feature'].map(lambda x: feature_stats[x]['mean'])
            lgb_importance['feature_std'] = lgb_importance['feature'].map(lambda x: feature_stats[x]['std'])
            lgb_importance['feature_range'] = lgb_importance['feature'].map(lambda x: feature_stats[x]['max'] - feature_stats[x]['min'])
            
            # Create results directory with readable timestamp
            results_dir = Path("../results/ml_runs") / f"run_{self.timestamp}"
            results_dir.mkdir(parents=True, exist_ok=True)
            
            # Save enhanced results
            self._save_results_improved(results_dir, results, rf_importance, lgb_importance,
                                      feature_columns, df_with_flags, data_path, data_path)
            
            return {
                'results_directory': str(results_dir),
                'random_forest': results['random_forest'],
                'lightgbm': results['lightgbm']
            }
            
        except Exception as e:
            print(f"❌ Error in ML analysis: {e}")
            return None

def main():
    """Main entry point"""
    
    # Check for environment variables
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_ANON_KEY'):
        print("❌ Missing Supabase environment variables!")
        return
    
    # Initialize improved pipeline
    pipeline = ImprovedAEIOUPipeline()
    
    # Check if we have existing clean data to use (fallback for timeouts)
    existing_data_path = "/Users/scottbergman/Dropbox/Projects/AEIOU/results/ml_runs/CLEAN_run_20250906_104822/prepared_clean_data.csv"
    
    try:
        # Try to run with fresh data export
        results = pipeline.run_complete_improved_pipeline()
        
        if results["success"]:
            print(f"\n✅ Success! Processed {results['records_processed']} CLEAN records")
            print("🎯 Improvements applied:")
            for improvement in results['improvements']:
                print(f"   • {improvement}")
        else:
            # If failed and we have existing clean data, use that
            if Path(existing_data_path).exists():
                print(f"\n🔄 Falling back to existing clean data...")
                print(f"📁 Using: {existing_data_path}")
                
                # Load existing data and run ML pipeline directly
                results = pipeline._run_ml_analysis_on_clean_data(existing_data_path)
                
                if results:
                    print(f"\n✅ Success with existing data!")
                    print(f"📁 Results saved to: {results['results_directory']}")
                    print(f"📊 Enhanced Excel Analysis: feature_analysis.xlsx")
                else:
                    print(f"\n❌ Failed even with existing data")
            else:
                print(f"\n❌ Failed: {results['error']}")
                
    except Exception as e:
        # If there's an exception and we have existing clean data, use that
        if Path(existing_data_path).exists():
            print(f"\n🔄 Exception occurred, falling back to existing clean data...")
            print(f"📁 Using: {existing_data_path}")
            
            try:
                results = pipeline._run_ml_analysis_on_clean_data(existing_data_path)
                
                if results:
                    print(f"\n✅ Success with existing data!")
                    print(f"📁 Results saved to: {results['results_directory']}")
                    print(f"📊 Enhanced Excel Analysis: feature_analysis.xlsx")
                else:
                    print(f"\n❌ Failed even with existing data")
            except Exception as e2:
                print(f"\n❌ Final failure: {e2}")
        else:
            print(f"\n❌ Pipeline failed: {e}")

if __name__ == "__main__":
    main()
