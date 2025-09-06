# AEIOU ML Results - 20250906_084714

## 🎯 Model Performance

### Random Forest
- **RMSE**: 2.4035
- **MAE**: 1.8462
- **R²**: -0.0271
- **Directional Accuracy**: 54.5%

### LightGBM
- **RMSE**: 2.3816
- **MAE**: 1.8515
- **R²**: -0.0085
- **Directional Accuracy**: 55.0%

## 📊 Data Summary
- **Total Records**: 1,000
- **Train/Test Split**: 800 / 200
- **Available Features**: 73
- **Target**: abs_change_1day_after_pct

## 🎯 Target Distribution
- **Mean**: -0.205%
- **Std**: 2.594%
- **Range**: [-10.402, 6.617]
- **Positive Moves**: 474 (47.4%)
- **Negative Moves**: 526 (52.6%)

## 🏆 Top 10 Features (Random Forest)
11. **market_perception_consensus_vs_division**: 0.1059
15. **logical_directness**: 0.1040
14. **perception_gap_optimism_bias**: 0.0945
8. **market_perception_intensity**: 0.0930
6. **causal_certainty**: 0.0907
12. **ai_assessment_execution_risk**: 0.0838
9. **market_perception_hope_vs_fear**: 0.0838
10. **market_perception_surprise_vs_anticipated**: 0.0836
7. **article_source_credibility**: 0.0810
4. **factor_magnitude**: 0.0808

## ⚡ Top 10 Features (LightGBM)
6. **causal_certainty**: 6
14. **perception_gap_optimism_bias**: 3
12. **ai_assessment_execution_risk**: 3
7. **article_source_credibility**: 3
13. **ai_assessment_business_impact_likelihood**: 2
4. **factor_magnitude**: 2
8. **market_perception_intensity**: 2
11. **market_perception_consensus_vs_division**: 1
9. **market_perception_hope_vs_fear**: 1
5. **factor_movement**: 1

## 🏷️ Top Features by Category

### Binary Flag Features (Random Forest)
1. **ai_tag_present**: 0.0021
2. **software_tag_present**: 0.0020
3. **hardware_tag_present**: 0.0019
4. **earnings_tag_present**: 0.0012
5. **privacy_tag_present**: 0.0000

### Numerical Features (Random Forest)
1. **market_perception_consensus_vs_division**: 0.1059
2. **logical_directness**: 0.1040
3. **perception_gap_optimism_bias**: 0.0945
4. **market_perception_intensity**: 0.0930
5. **causal_certainty**: 0.0907

### Categorical Features (Random Forest)
1. **factor_category**: 0.0073
2. **event_tag_category**: 0.0068
3. **consolidated_event_tags**: 0.0017

## 📁 Files Generated
- `COMPLETE_RESULTS_20250906_084714.json` - Full results data
- `prepared_data_20250906_084714.csv` - Processed training data
- `random_forest_feature_importance_20250906_084714.csv` - RF feature rankings
- `lightgbm_feature_importance_20250906_084714.csv` - LGB feature rankings
- `feature_correlations_20250906_084714.csv` - Feature correlation matrix
- `target_correlations_20250906_084714.csv` - Feature-target correlations

## 🔧 Feature Breakdown
- **Categorical Features**: 3
- **Numerical Features**: 12
- **Binary Flags**: 58
