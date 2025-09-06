# AEIOU ML Results - 20250906_090109

## 🎯 Model Performance

### Random Forest
- **RMSE**: 2.4063
- **MAE**: 1.8426
- **R²**: -0.0296
- **Directional Accuracy**: 54.0%

### LightGBM
- **RMSE**: 2.3816
- **MAE**: 1.8515
- **R²**: -0.0085
- **Directional Accuracy**: 55.0%

## 📊 Data Summary
- **Total Records**: 1,000
- **Train/Test Split**: 800 / 200
- **Available Features**: 110
- **Target**: abs_change_1day_after_pct

## 🎯 Target Distribution
- **Mean**: -0.205%
- **Std**: 2.594%
- **Range**: [-10.402, 6.617]
- **Positive Moves**: 474 (47.4%)
- **Negative Moves**: 526 (52.6%)

## 🏆 Top 10 Features (Random Forest)
11. **market_perception_consensus_vs_division**: 0.1075
15. **logical_directness**: 0.1039
14. **perception_gap_optimism_bias**: 0.0951
8. **market_perception_intensity**: 0.0912
6. **causal_certainty**: 0.0904
12. **ai_assessment_execution_risk**: 0.0874
9. **market_perception_hope_vs_fear**: 0.0852
10. **market_perception_surprise_vs_anticipated**: 0.0830
7. **article_source_credibility**: 0.0813
4. **factor_magnitude**: 0.0777

## ⚡ Top 10 Features (LightGBM)
6. **causal_certainty**: 6
12. **ai_assessment_execution_risk**: 3
7. **article_source_credibility**: 3
14. **perception_gap_optimism_bias**: 3
4. **factor_magnitude**: 2
8. **market_perception_intensity**: 2
13. **ai_assessment_business_impact_likelihood**: 2
5. **factor_movement**: 1
9. **market_perception_hope_vs_fear**: 1
11. **market_perception_consensus_vs_division**: 1

## 🏷️ Top Features by Category

### Event Tag Flags (Random Forest)
1. **earnings_tag_present**: 0.0025
2. **software_tag_present**: 0.0022
3. **hardware_tag_present**: 0.0015
4. **ai_tag_present**: 0.0014
5. **corporate_strategy_tag_present**: 0.0000

### Emotional Profile Flags (Random Forest)
1. **emotion_skepticism_present**: 0.0000
2. **emotion_concern_present**: 0.0000
3. **emotion_uncertainty_present**: 0.0000
4. **emotion_surprise_present**: 0.0000
5. **emotion_interest_present**: 0.0000

### Cognitive Bias Flags (Random Forest)
1. **bias_availability_heuristic_present**: 0.0000
2. **bias_overconfidence_bias_present**: 0.0000
3. **bias_survivorship_bias_present**: 0.0000
4. **bias_planning_fallacy_present**: 0.0000
5. **bias_halo_effect_present**: 0.0000

### Numerical Features (Random Forest)
1. **market_perception_consensus_vs_division**: 0.1075
2. **logical_directness**: 0.1039
3. **perception_gap_optimism_bias**: 0.0951
4. **market_perception_intensity**: 0.0912
5. **causal_certainty**: 0.0904

### Categorical Features (Random Forest)
1. **factor_category**: 0.0070
2. **event_tag_category**: 0.0066
3. **consolidated_event_tags**: 0.0013

## 📁 Files Generated
- `COMPLETE_RESULTS_20250906_090109.json` - Full results data
- `prepared_data_20250906_090109.csv` - Processed training data
- `random_forest_feature_importance_20250906_090109.csv` - RF feature rankings
- `lightgbm_feature_importance_20250906_090109.csv` - LGB feature rankings
- `feature_correlations_20250906_090109.csv` - Feature correlation matrix
- `target_correlations_20250906_090109.csv` - Feature-target correlations

## 🔧 Feature Breakdown
- **Categorical Features**: 3
- **Numerical Features**: 12
- **Event Tag Flags**: 58
- **Emotion Flags**: 22
- **Bias Flags**: 15
- **Total Binary Flags**: 95
