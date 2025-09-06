# AEIOU ML Results - 20250906_012840

## 🎯 Model Performance

### Random Forest
- **RMSE**: 2.9218
- **MAE**: 2.5250
- **R²**: -0.0086
- **Directional Accuracy**: 48.7%

### LightGBM
- **RMSE**: 2.9079
- **MAE**: 2.5161
- **R²**: 0.0010
- **Directional Accuracy**: 49.9%

## 📊 Data Summary
- **Total Records**: 12,000
- **Train/Test Split**: 9,600 / 2,400
- **Available Features**: 65
- **Target**: signed_change_1day_after_pct

## 🎯 Target Distribution
- **Mean**: -0.021%
- **Std**: 2.891%
- **Range**: [-5.000, 5.000]
- **Positive Moves**: 5933 (49.4%)
- **Negative Moves**: 6067 (50.6%)

## 🏆 Top 10 Features (Random Forest)
4. **factor_magnitude**: 0.2578
6. **article_source_credibility**: 0.2553
7. **market_perception_intensity**: 0.2436
2. **consolidated_factor_name**: 0.0556
1. **consolidated_event_type**: 0.0541
5. **factor_movement**: 0.0329
3. **event_tag_category**: 0.0171
35. **regulatory_tag_present**: 0.0168
19. **earnings_tag_present**: 0.0167
9. **hardware_tag_present**: 0.0140

## ⚡ Top 10 Features (LightGBM)
6. **article_source_credibility**: 59
7. **market_perception_intensity**: 55
4. **factor_magnitude**: 50
1. **consolidated_event_type**: 12
2. **consolidated_factor_name**: 11
5. **factor_movement**: 7
3. **event_tag_category**: 4
35. **regulatory_tag_present**: 4
9. **hardware_tag_present**: 2
10. **software_tag_present**: 2

## 🏷️ Top Features by Category

### Binary Flag Features (Random Forest)
1. **regulatory_tag_present**: 0.0168
2. **earnings_tag_present**: 0.0167
3. **hardware_tag_present**: 0.0140
4. **software_tag_present**: 0.0129
5. **semiconductor_tag_present**: 0.0122

### Numerical Features (Random Forest)
1. **factor_magnitude**: 0.2578
2. **article_source_credibility**: 0.2553
3. **market_perception_intensity**: 0.2436
4. **factor_movement**: 0.0329

### Categorical Features (Random Forest)
1. **consolidated_factor_name**: 0.0556
2. **consolidated_event_type**: 0.0541
3. **event_tag_category**: 0.0171

## 📁 Files Generated
- `COMPLETE_RESULTS_20250906_012840.json` - Full results data
- `prepared_data_20250906_012840.csv` - Processed training data
- `random_forest_feature_importance_20250906_012840.csv` - RF feature rankings
- `lightgbm_feature_importance_20250906_012840.csv` - LGB feature rankings
- `feature_correlations_20250906_012840.csv` - Feature correlation matrix
- `target_correlations_20250906_012840.csv` - Feature-target correlations

## 🔧 Feature Breakdown
- **Categorical Features**: 3
- **Numerical Features**: 4
- **Binary Flags**: 58
