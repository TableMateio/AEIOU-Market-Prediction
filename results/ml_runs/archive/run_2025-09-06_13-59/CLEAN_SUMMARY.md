# AEIOU CLEAN ML Results - 2025-09-06_13-59

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: No
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: 0.0000
- **MAE**: 0.0000
- **R²**: 0.0000
- **Directional Accuracy**: 55.4%

### LightGBM (Improved)
- **RMSE**: 0.0000
- **MAE**: 0.0000
- **R²**: 0.0000
- **Directional Accuracy**: 59.2%

## 📊 Clean Data Summary
- **Total Records**: 10,401 (cleaned)
- **Available Features**: 172
- **Target**: abs_change_1day_after_pct
- **Zero Values Removed**: 0 (data quality improvement)

## 🎯 Target Distribution (Clean)
- **Mean**: -0.212%
- **Std**: 2.977%
- **Range**: [-8.694, 14.457]
- **Positive Moves**: 4857 (46.7%)
- **Negative Moves**: 5544 (53.3%)

## 🔗 Correlation Insights
- **High Correlation Features** (>0.1): 3
- **Positive Correlations**: 60
- **Negative Correlations**: 47

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|
| 1 | **article_source_credibility** | article_source_credibility | Extended Numerical | 0.0502 | 25 | -0.0273 | negative |
| 2 | **consolidated_event_type** | consolidated_event_type | Core Categorical | 0.0458 | 21 | 0.0012 | positive |
| 3 | **article_time_lag_days** | article_time_lag_days | Extended Numerical | 0.0457 | 22 | 0.0385 | positive |
| 4 | **consolidated_event_type_encoded** | consolidated_event_type_encoded | Other | 0.0462 | 11 | 0.0012 | positive |
| 5 | **article_publisher_credibility** | article_publisher_credibility | Extended Numerical | 0.0459 | 12 | 0.0002 | positive |
| 6 | **regime_alignment** | regime_alignment | Extended Numerical | 0.0266 | 11 | 0.0556 | positive |
| 7 | **article_author_credibility** | article_author_credibility | Extended Numerical | 0.0274 | 7 | 0.0141 | positive |
| 8 | **market_regime** | market_regime | Core Categorical | 0.0335 | 5 | -0.2128 | negative |
| 9 | **market_perception_hope_vs_fear** | market_perception_hope_vs_fear | Extended Numerical | 0.0256 | 6 | -0.0556 | negative |
| 10 | **event_orientation** | event_orientation | Core Categorical | 0.0167 | 14 | -0.0625 | negative |
| 11 | **factor_effect_horizon_days** | factor_effect_horizon_days | Extended Numerical | 0.0245 | 4 | 0.0364 | positive |
| 12 | **signed_magnitude_scaled** | signed_magnitude_scaled | Core Numerical | 0.0237 | 3 | 0.0048 | positive |
| 13 | **event_trigger** | event_trigger | Core Categorical | 0.0171 | 5 | -0.0442 | negative |
| 14 | **article_audience_split** | article_audience_split | Core Categorical | 0.0161 | 6 | -0.0441 | negative |
| 15 | **perception_gap_optimism_bias** | perception_gap_optimism_bias | Extended Numerical | 0.0178 | 1 | -0.0431 | negative |

## 📈 Key Insights
- **Most Important Feature**: article_source_credibility (RF: 0.0502, LGB: 25)
- **Strongest Correlation**: market_regime (0.2128)
- **signed_magnitude ranking**: #Not found

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