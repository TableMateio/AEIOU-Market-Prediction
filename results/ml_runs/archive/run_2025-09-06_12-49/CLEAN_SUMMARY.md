# AEIOU CLEAN ML Results - 2025-09-06_12-49

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: Yes
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: 0.0000
- **MAE**: 0.0000
- **R²**: 0.0000
- **Directional Accuracy**: 52.1%

### LightGBM (Improved)
- **RMSE**: 0.0000
- **MAE**: 0.0000
- **R²**: 0.0000
- **Directional Accuracy**: 55.9%

## 📊 Clean Data Summary
- **Total Records**: 10,401 (cleaned)
- **Available Features**: 134
- **Target**: abs_change_1day_after_pct
- **Zero Values Removed**: 0 (data quality improvement)

## 🎯 Target Distribution (Clean)
- **Mean**: -0.212%
- **Std**: 2.977%
- **Range**: [-8.694, 14.457]
- **Positive Moves**: 4857 (46.7%)
- **Negative Moves**: 5544 (53.3%)

## 🔗 Correlation Insights
- **High Correlation Features** (>0.1): 1
- **Positive Correlations**: 39
- **Negative Correlations**: 30

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|
| 1 | **consolidated_event_type** | consolidated_event_type | Core Categorical | 0.0565 | 12 | 0.0010 | positive |
| 2 | **event_tag_category** | event_tag_category | Core Categorical | 0.0462 | 7 | 0.0073 | positive |
| 3 | **market_regime** | market_regime | Core Categorical | 0.0883 | 2 | -0.2128 | negative |
| 4 | **regime_alignment** | regime_alignment | Extended Numerical | 0.0295 | 4 | 0.0560 | positive |
| 5 | **factor_effect_horizon_days** | factor_effect_horizon_days | Extended Numerical | 0.0302 | 2 | 0.0361 | positive |
| 6 | **event_trigger** | event_trigger | Core Categorical | 0.0264 | 4 | -0.0442 | negative |
| 7 | **signed_magnitude** | signed_magnitude | Core Numerical | 0.0278 | 2 | 0.0048 | positive |
| 8 | **market_perception_hope_vs_fear** | market_perception_hope_vs_fear | Extended Numerical | 0.0266 | 3 | -0.0555 | negative |
| 9 | **event_orientation** | event_orientation | Core Categorical | 0.0277 | 2 | -0.0622 | negative |
| 10 | **article_audience_split** | article_audience_split | Core Categorical | 0.0262 | 3 | -0.0441 | negative |
| 11 | **market_perception_surprise_vs_anticipated** | market_perception_surprise_vs_anticipated | Extended Numerical | 0.0213 | 2 | -0.0346 | negative |
| 12 | **article_time_lag_days** | article_time_lag_days | Extended Numerical | 0.0551 | 0 | 0.0385 | positive |
| 13 | **perception_gap_optimism_bias** | perception_gap_optimism_bias | Extended Numerical | 0.0193 | 2 | -0.0432 | negative |
| 14 | **article_source_credibility** | article_source_credibility | Core Numerical | 0.0503 | 0 | -0.0273 | negative |
| 15 | **consolidated_factor_name** | consolidated_factor_name | Core Categorical | 0.0262 | 1 | -0.0010 | negative |

## 📈 Key Insights
- **Most Important Feature**: consolidated_event_type (RF: 0.0565, LGB: 12)
- **Strongest Correlation**: market_regime (0.2128)
- **signed_magnitude ranking**: #9

## 📁 Enhanced Analysis Files
- `CLEAN_feature_analysis.xlsx` - **Comprehensive feature analysis with correlations, directions, and rankings**
  - Combined_Analysis: Main analysis with both models
  - RandomForest_Detailed: RF-specific analysis  
  - LightGBM_Detailed: LGB-specific analysis
  - Top_[Category]: Best features by category
  - High_Correlation: Features with strong correlations
  - Category_Summary: Statistical summary by feature type
- `CLEAN_COMPLETE_RESULTS.json` - Full results data
- `prepared_clean_data.csv` - Your 9,158 clean records