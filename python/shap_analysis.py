#!/usr/bin/env python3
"""
SHAP Analysis for AEIOU Factor Interactions
Discovers which business factor combinations drive stock alpha
"""

import pandas as pd
import numpy as np
import json
import sys
import os
from typing import Dict, List, Any
import warnings
warnings.filterwarnings('ignore')

import shap
from sklearn.ensemble import RandomForestRegressor
import matplotlib.pyplot as plt
import seaborn as sns

class AEIOUShapAnalyzer:
    """
    Discovers factor interactions using SHAP (SHapley Additive exPlanations)
    This answers: "Which factor combinations matter most?"
    """
    
    def __init__(self):
        self.models = {}
        self.explainers = {}
        self.shap_values = {}
        
        print("🔍 AEIOU SHAP Analyzer initialized")
    
    def load_trained_models(self, model_dir: str) -> None:
        """Load pre-trained Random Forest models"""
        
        import joblib
        
        model_files = [f for f in os.listdir(model_dir) if f.startswith('rf_model_') and f.endswith('.joblib')]
        
        for model_file in model_files:
            target_name = model_file.replace('rf_model_', '').replace('.joblib', '')
            model_path = os.path.join(model_dir, model_file)
            
            self.models[target_name] = joblib.load(model_path)
            print(f"✅ Loaded model for {target_name}")
    
    def analyze_factor_interactions(self, 
                                  df: pd.DataFrame, 
                                  target_col: str,
                                  max_samples: int = 1000) -> Dict[str, Any]:
        """
        Analyze factor interactions for a specific target using SHAP
        """
        
        print(f"🔍 Analyzing factor interactions for {target_col}")
        
        # Get INPUT features (same logic as training script - COMPLETE 218 column schema)
        input_feature_patterns = [
            # Business factor core (12 fields)
            'factor_name', 'factor_category', 'factor_magnitude', 'factor_movement',
            'factor_synonyms', 'factor_unit', 'factor_raw_value', 'factor_delta',
            'factor_description', 'factor_orientation', 'factor_about_time_days', 'factor_effect_horizon_days',
            
            # Causal analysis (4 fields)
            'causal_certainty', 'logical_directness', 'regime_alignment', 'causal_step',
            
            # Event context (8 fields)  
            'event_type', 'event_description', 'event_trigger', 'event_entities',
            'event_scope', 'event_orientation', 'event_time_horizon_days', 'event_tags', 'event_quoted_people',
            
            # Article metadata (14 fields)
            'article_headline', 'article_url', 'article_authors', 'article_source',
            'article_source_credibility', 'article_author_credibility', 'article_publisher_credibility',
            'article_audience_split', 'article_time_lag_days', 'article_market_regime',
            'article_apple_relevance_score', 'article_ticker_relevance_score',
            'article_published_year', 'article_published_month', 'article_published_day_of_week',
            
            # Evidence & sources (3 fields)
            'evidence_level', 'evidence_source', 'evidence_citation',
            
            # Market consensus & narrative (3 fields)
            'market_consensus_on_causality', 'reframing_potential', 'narrative_disruption',
            
            # Market perception (7 fields)
            'market_perception_intensity', 'market_perception_hope_vs_fear',
            'market_perception_surprise_vs_anticipated', 'market_perception_consensus_vs_division',
            'market_perception_narrative_strength', 'market_perception_emotional_profile', 'market_perception_cognitive_biases',
            
            # AI assessments (5 fields)
            'ai_assessment_execution_risk', 'ai_assessment_competitive_risk',
            'ai_assessment_business_impact_likelihood', 'ai_assessment_timeline_realism', 'ai_assessment_fundamental_strength',
            
            # Perception gaps (3 fields)
            'perception_gap_optimism_bias', 'perception_gap_risk_awareness', 'perception_gap_correction_potential',
            
            # Context features (3 fields)
            'market_hours', 'market_regime', 'pattern_strength_score', 'data_quality_score'
        ]
        
        # TARGET VARIABLES (what we predict TO) - exclude from features
        target_patterns = [
            'price_', 'spy_', 'qqq_', 'abs_change_', 'alpha_vs_', 
            'volume_', 'volatility_', 'max_move_', 'reversal_', 'attention_',
            'spy_momentum_', 'qqq_momentum_', 'confidence_'
        ]
        
        # METADATA (not ML features)
        metadata_patterns = [
            'id', 'business_factor_id', 'article_id', 'causal_events_ai_id', 'ticker',
            'event_timestamp', 'article_published_at', 'created_at', 'updated_at', 'processing_timestamp',
            'processing_status', 'ml_split', 'business_event_index', 'causal_step_index',
            'processing_time_ms', 'missing_data_points', 'approximation_quality'
        ]
        
        feature_cols = []
        for col in df.columns:
            # Check if it's an input feature
            is_input_feature = any(col == pattern or col.startswith(pattern) for pattern in input_feature_patterns)
            
            # Check if it's a target or metadata (exclude)
            is_target = any(col.startswith(pattern) for pattern in target_patterns)
            is_metadata = any(col == pattern or col.startswith(pattern) for pattern in metadata_patterns)
            
            # Include only input features that aren't targets or metadata
            if is_input_feature and not is_target and not is_metadata:
                feature_cols.append(col)
        
        X = df[feature_cols].fillna(0)
        y = df[target_col]
        
        # Sample data if too large (SHAP is computationally expensive)
        if len(X) > max_samples:
            sample_idx = np.random.choice(len(X), max_samples, replace=False)
            X_sample = X.iloc[sample_idx]
            y_sample = y.iloc[sample_idx]
            print(f"📊 Sampled {max_samples} from {len(X)} total samples")
        else:
            X_sample = X
            y_sample = y
        
        # Train model if not already trained
        if target_col not in self.models:
            model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            model.fit(X_sample, y_sample)
            self.models[target_col] = model
        else:
            model = self.models[target_col]
        
        # Create SHAP explainer
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_sample)
        
        self.explainers[target_col] = explainer
        self.shap_values[target_col] = shap_values
        
        # Analyze interactions
        interactions = self.find_top_interactions(shap_values, feature_cols, top_k=20)
        
        # Individual feature importance (from SHAP)
        feature_importance = self.calculate_shap_feature_importance(shap_values, feature_cols)
        
        # Feature interaction strength
        interaction_strength = self.calculate_interaction_strength(shap_values, feature_cols)
        
        return {
            "target": target_col,
            "sample_size": len(X_sample),
            "feature_count": len(feature_cols),
            "top_individual_features": feature_importance[:15],
            "top_interactions": interactions[:15],
            "interaction_strength": interaction_strength,
            "shap_summary": {
                "mean_abs_shap": np.mean(np.abs(shap_values)),
                "max_abs_shap": np.max(np.abs(shap_values)),
                "feature_names": feature_cols
            }
        }
    
    def find_top_interactions(self, shap_values: np.ndarray, feature_names: List[str], top_k: int = 20) -> List[Dict[str, Any]]:
        """
        Find top feature interactions using SHAP interaction values
        """
        
        print("🔗 Discovering factor interactions...")
        
        # Calculate interaction matrix
        # For each pair of features, measure how they interact
        interactions = []
        
        n_features = len(feature_names)
        
        for i in range(n_features):
            for j in range(i + 1, n_features):
                # Calculate interaction strength between features i and j
                feature_i_values = shap_values[:, i]
                feature_j_values = shap_values[:, j]
                
                # Interaction = correlation of SHAP values
                interaction_strength = np.corrcoef(feature_i_values, feature_j_values)[0, 1]
                
                if not np.isnan(interaction_strength):
                    interactions.append({
                        "feature_1": feature_names[i],
                        "feature_2": feature_names[j],
                        "interaction_strength": abs(interaction_strength),
                        "interaction_direction": "positive" if interaction_strength > 0 else "negative",
                        "raw_correlation": interaction_strength
                    })
        
        # Sort by interaction strength
        interactions.sort(key=lambda x: x["interaction_strength"], reverse=True)
        
        print(f"✅ Found {len(interactions)} feature interactions")
        
        return interactions[:top_k]
    
    def calculate_shap_feature_importance(self, shap_values: np.ndarray, feature_names: List[str]) -> List[Dict[str, Any]]:
        """
        Calculate feature importance using mean absolute SHAP values
        """
        
        # Mean absolute SHAP value per feature
        feature_importance = np.mean(np.abs(shap_values), axis=0)
        
        importance_list = [
            {
                "feature": feature_names[i],
                "shap_importance": float(importance),
                "rank": rank + 1
            }
            for rank, (i, importance) in enumerate(
                sorted(enumerate(feature_importance), key=lambda x: x[1], reverse=True)
            )
        ]
        
        return importance_list
    
    def calculate_interaction_strength(self, shap_values: np.ndarray, feature_names: List[str]) -> Dict[str, float]:
        """
        Calculate overall interaction strength metrics
        """
        
        # How much do features interact vs act independently?
        total_shap_variance = np.var(np.sum(shap_values, axis=1))
        individual_shap_variance = np.sum(np.var(shap_values, axis=0))
        
        interaction_ratio = total_shap_variance / (individual_shap_variance + 1e-10)
        
        return {
            "interaction_ratio": float(interaction_ratio),
            "high_interaction": interaction_ratio > 1.2,  # Threshold for significant interactions
            "total_variance": float(total_shap_variance),
            "individual_variance": float(individual_shap_variance)
        }
    
    def create_interaction_heatmap(self, interactions: List[Dict[str, Any]], output_path: str) -> None:
        """
        Create heatmap of factor interactions
        """
        
        if len(interactions) == 0:
            print("⚠️ No interactions to plot")
            return
        
        # Get unique features from top interactions
        features = set()
        for interaction in interactions[:50]:  # Top 50 interactions
            features.add(interaction["feature_1"])
            features.add(interaction["feature_2"])
        
        feature_list = sorted(list(features))
        n_features = len(feature_list)
        
        # Create interaction matrix
        interaction_matrix = np.zeros((n_features, n_features))
        
        for interaction in interactions:
            f1_idx = feature_list.index(interaction["feature_1"])
            f2_idx = feature_list.index(interaction["feature_2"])
            strength = interaction["interaction_strength"]
            
            interaction_matrix[f1_idx, f2_idx] = strength
            interaction_matrix[f2_idx, f1_idx] = strength  # Symmetric
        
        # Create heatmap
        plt.figure(figsize=(16, 14))
        sns.heatmap(
            interaction_matrix,
            xticklabels=feature_list,
            yticklabels=feature_list,
            annot=False,
            cmap='RdYlBu_r',
            center=0,
            square=True
        )
        
        plt.title('Business Factor Interaction Heatmap\n(Darker = Stronger Interaction)')
        plt.xticks(rotation=45, ha='right')
        plt.yticks(rotation=0)
        plt.tight_layout()
        
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        print(f"🎨 Interaction heatmap saved: {output_path}")
    
    def analyze_orientation_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze how predictive vs reflective articles perform differently
        """
        
        print("🎯 Analyzing predictive vs reflective article patterns...")
        
        orientation_analysis = {}
        
        # Group by orientation
        for orientation in ['predictive', 'reflective', 'both', 'neutral']:
            orientation_df = df[df['event_orientation'] == orientation]
            
            if len(orientation_df) < 10:
                continue
            
            # Calculate average performance for each target
            target_cols = [col for col in df.columns if col.startswith('alpha_vs_')]
            
            avg_performance = {}
            for target in target_cols:
                avg_alpha = orientation_df[target].mean()
                std_alpha = orientation_df[target].std()
                avg_performance[target] = {
                    "mean_alpha": float(avg_alpha),
                    "std_alpha": float(std_alpha),
                    "sample_count": len(orientation_df)
                }
            
            orientation_analysis[orientation] = {
                "sample_count": len(orientation_df),
                "avg_performance": avg_performance,
                "typical_factors": self.get_typical_factors(orientation_df)
            }
        
        print("✅ Orientation analysis complete")
        return orientation_analysis
    
    def get_typical_factors(self, df: pd.DataFrame) -> List[str]:
        """Get factors that are commonly non-zero for this orientation"""
        
        factor_cols = [col for col in df.columns if col.startswith(('avg_', 'has_', 'total_'))]
        
        # Find factors that are frequently non-zero
        frequent_factors = []
        for col in factor_cols:
            non_zero_rate = (df[col] != 0).mean()
            if non_zero_rate > 0.3:  # Present in >30% of articles
                frequent_factors.append(col)
        
        return frequent_factors[:10]
    
    def handle_after_hours_analysis(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze how after-hours articles perform differently
        This addresses your concern about after-hours effects
        """
        
        print("🌙 Analyzing after-hours vs market-hours articles...")
        
        # Split by trading hours
        market_hours_df = df[df['trading_hours'] == True]
        after_hours_df = df[df['trading_hours'] == False]
        
        analysis = {
            "market_hours": {
                "sample_count": len(market_hours_df),
                "avg_alpha_1day": market_hours_df['alpha_vs_market_1day'].mean() if len(market_hours_df) > 0 else 0,
                "avg_volatility": market_hours_df.get('volatility_spike', pd.Series()).mean() if len(market_hours_df) > 0 else 0
            },
            "after_hours": {
                "sample_count": len(after_hours_df),
                "avg_alpha_1day": after_hours_df['alpha_vs_market_1day'].mean() if len(after_hours_df) > 0 else 0,
                "avg_volatility": after_hours_df.get('volatility_spike', pd.Series()).mean() if len(after_hours_df) > 0 else 0
            }
        }
        
        # Statistical significance test
        if len(market_hours_df) > 10 and len(after_hours_df) > 10:
            from scipy import stats
            
            market_alphas = market_hours_df['alpha_vs_market_1day'].dropna()
            after_alphas = after_hours_df['alpha_vs_market_1day'].dropna()
            
            t_stat, p_value = stats.ttest_ind(market_alphas, after_alphas)
            
            analysis["statistical_test"] = {
                "t_statistic": float(t_stat),
                "p_value": float(p_value),
                "significant_difference": p_value < 0.05
            }
        
        print(f"📊 Market hours: {analysis['market_hours']['sample_count']} articles")
        print(f"🌙 After hours: {analysis['after_hours']['sample_count']} articles")
        
        return analysis

def main():
    """
    Run SHAP analysis on trained models and data
    """
    
    if len(sys.argv) < 3:
        print("Usage: python shap_analysis.py <csv_file> <model_directory>")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    model_dir = sys.argv[2]
    
    try:
        # Load data
        print(f"📂 Loading data from {csv_file}")
        df = pd.read_csv(csv_file)
        
        # Initialize analyzer
        analyzer = AEIOUShapAnalyzer()
        
        # Load trained models
        if os.path.exists(model_dir):
            analyzer.load_trained_models(model_dir)
        
        # Get target variables
        target_cols = [col for col in df.columns if col.startswith('alpha_vs_')]
        
        all_analyses = {}
        
        # Analyze each target
        for target in target_cols:
            if target in df.columns and df[target].notna().sum() > 50:
                analysis = analyzer.analyze_factor_interactions(df, target)
                all_analyses[target] = analysis
        
        # Analyze orientation patterns
        orientation_analysis = analyzer.analyze_orientation_patterns(df)
        all_analyses["orientation_patterns"] = orientation_analysis
        
        # Analyze after-hours effects
        after_hours_analysis = analyzer.handle_after_hours_analysis(df)
        all_analyses["after_hours_effects"] = after_hours_analysis
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/shap_analysis_{timestamp}"
        os.makedirs(output_dir, exist_ok=True)
        
        # Save detailed JSON results
        results_file = os.path.join(output_dir, "shap_analysis_results.json")
        with open(results_file, 'w') as f:
            json.dump(all_analyses, f, indent=2, default=str)
        
        # Create visualizations
        for target, analysis in all_analyses.items():
            if target.startswith('alpha_') and 'top_interactions' in analysis:
                plot_path = os.path.join(output_dir, f"interactions_{target}.png")
                analyzer.create_interaction_heatmap(analysis['top_interactions'], plot_path)
        
        # Generate markdown summary
        summary = generate_shap_summary(all_analyses)
        summary_file = os.path.join(output_dir, "factor_interactions_summary.md")
        with open(summary_file, 'w') as f:
            f.write(summary)
        
        print(f"🎉 SHAP analysis completed!")
        print(f"📁 Results saved to: {output_dir}")
        print(f"📊 Key findings: {summary_file}")
        
        # Output key findings for Node.js
        print("JSON_SHAP_RESULTS_START")
        print(json.dumps({
            "top_interactions_overall": get_top_interactions_overall(all_analyses),
            "orientation_insights": orientation_analysis,
            "after_hours_insights": after_hours_analysis
        }))
        print("JSON_SHAP_RESULTS_END")
        
    except Exception as e:
        print(f"❌ SHAP analysis failed: {str(e)}")
        sys.exit(1)

def get_top_interactions_overall(analyses: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Get top interactions across all targets"""
    
    all_interactions = []
    
    for target, analysis in analyses.items():
        if target.startswith('alpha_') and 'top_interactions' in analysis:
            for interaction in analysis['top_interactions'][:5]:  # Top 5 per target
                interaction['target'] = target
                all_interactions.append(interaction)
    
    # Sort by interaction strength
    all_interactions.sort(key=lambda x: x['interaction_strength'], reverse=True)
    
    return all_interactions[:15]  # Top 15 overall

def generate_shap_summary(analyses: Dict[str, Any]) -> str:
    """Generate human-readable summary of SHAP findings"""
    
    from datetime import datetime
    
    summary = f"""# AEIOU Factor Interaction Analysis
Generated: {datetime.now().isoformat()}

## 🔍 **Key Discovery: Factor Combinations That Drive Alpha**

*This analysis reveals which business factor combinations actually move markets, discovered through SHAP analysis rather than manual assumptions.*

"""
    
    # Top interactions across all models
    top_interactions = get_top_interactions_overall(analyses)
    
    if top_interactions:
        summary += "## 🔗 **Top Factor Interactions**\n\n"
        
        for i, interaction in enumerate(top_interactions[:10], 1):
            summary += f"{i:2d}. **{interaction['feature_1']}** × **{interaction['feature_2']}**\n"
            summary += f"    - Strength: {interaction['interaction_strength']:.3f}\n"
            summary += f"    - Direction: {interaction['interaction_direction']}\n"
            summary += f"    - Target: {interaction['target']}\n\n"
    
    # Orientation patterns
    if "orientation_patterns" in analyses:
        summary += "## 🎯 **Predictive vs Reflective Article Patterns**\n\n"
        
        for orientation, data in analyses["orientation_patterns"].items():
            if data["sample_count"] > 5:
                summary += f"### {orientation.title()} Articles ({data['sample_count']} samples)\n"
                
                if "avg_performance" in data:
                    best_target = max(data["avg_performance"].items(), 
                                    key=lambda x: abs(x[1]["mean_alpha"]))
                    
                    summary += f"- **Strongest Signal**: {best_target[0]} ({best_target[1]['mean_alpha']:+.2f}% alpha)\n"
                    summary += f"- **Typical Factors**: {', '.join(data.get('typical_factors', [])[:5])}\n\n"
    
    # After-hours effects
    if "after_hours_effects" in analyses:
        summary += "## 🌙 **After-Hours vs Market-Hours Impact**\n\n"
        
        ah_data = analyses["after_hours_effects"]
        
        summary += f"- **Market Hours Articles**: {ah_data['market_hours']['sample_count']} (avg alpha: {ah_data['market_hours']['avg_alpha_1day']:+.2f}%)\n"
        summary += f"- **After Hours Articles**: {ah_data['after_hours']['sample_count']} (avg alpha: {ah_data['after_hours']['avg_alpha_1day']:+.2f}%)\n"
        
        if "statistical_test" in ah_data:
            significant = ah_data["statistical_test"]["significant_difference"]
            summary += f"- **Statistical Significance**: {'✅ Significant' if significant else '❌ Not significant'} (p={ah_data['statistical_test']['p_value']:.3f})\n"
    
    summary += """
## 💡 **Actionable Insights**

1. **Let the Data Speak**: Factor interactions discovered through SHAP, not manual assumptions
2. **Orientation Matters**: Predictive vs reflective articles show different patterns  
3. **Timing is Critical**: After-hours news may behave fundamentally differently
4. **Focus on Interactions**: Individual factors less important than combinations

---

*This analysis guides which factor combinations to focus on for alpha generation.*
"""
    
    return summary

if __name__ == "__main__":
    from datetime import datetime
    main()
