# AEIOU CLEAN ML Results - 2025-09-06_12-22

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: Yes
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: 1.9229
- **MAE**: 1.4770
- **R²**: -1.2331
- **Directional Accuracy**: 54.7%

### LightGBM (Improved)
- **RMSE**: 1.2819
- **MAE**: 0.9433
- **R²**: 0.0075
- **Directional Accuracy**: 61.7%

## 📊 Clean Data Summary
- **Total Records**: 9,828 (cleaned)
- **Available Features**: 134
- **Target**: abs_change_1day_after_pct
- **Zero Values Removed**: 0 (data quality improvement)

## 🎯 Target Distribution (Clean)
- **Mean**: -0.274%
- **Std**: 3.028%
- **Range**: [-8.694, 14.457]
- **Positive Moves**: 4512 (45.9%)
- **Negative Moves**: 5316 (54.1%)

## 🔗 Correlation Insights
- **High Correlation Features** (>0.1): 1
- **Positive Correlations**: 18
- **Negative Correlations**: 21

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|
| 1 | **consolidated_event_type** | consolidated_event_type | Core Categorical | 0.1431 | 19 | -0.0236 | negative |
| 2 | **article_source_credibility** | article_source_credibility | Core Numerical | 0.1388 | 19 | -0.0079 | negative |
| 3 | **event_tag_category** | event_tag_category | Core Categorical | 0.1046 | 21 | 0.0636 | positive |
| 4 | **article_publisher_credibility** | article_publisher_credibility | Extended Numerical | 0.0760 | 12 | 0.0139 | positive |
| 5 | **regime_alignment** | regime_alignment | Extended Numerical | 0.0515 | 8 | 0.0738 | positive |
| 6 | **article_author_credibility** | article_author_credibility | Extended Numerical | 0.0468 | 8 | 0.0389 | positive |
| 7 | **article_time_lag_days** | article_time_lag_days | Extended Numerical | 0.0560 | 4 | 0.0319 | positive |
| 8 | **article_audience_split** | article_audience_split | Core Categorical | 0.0443 | 7 | -0.0743 | negative |
| 9 | **market_perception_hope_vs_fear** | market_perception_hope_vs_fear | Extended Numerical | 0.0366 | 4 | 0.0020 | positive |
| 10 | **event_orientation** | event_orientation | Core Categorical | 0.0331 | 6 | 0.0284 | positive |
| 11 | **market_regime** | market_regime | Core Categorical | 0.0377 | 2 | -0.1730 | negative |
| 12 | **market_perception_surprise_vs_anticipated** | market_perception_surprise_vs_anticipated | Extended Numerical | 0.0214 | 2 | -0.0914 | negative |
| 13 | **signed_magnitude** | signed_magnitude | Core Numerical | 0.0135 | 3 | 0.0281 | positive |
| 14 | **perception_gap_correction_potential** | perception_gap_correction_potential | Extended Numerical | 0.0098 | 4 | 0.0163 | positive |
| 15 | **perception_gap_risk_awareness** | perception_gap_risk_awareness | Extended Numerical | 0.0314 | 0 | 0.0059 | positive |

## 📈 Key Insights
- **Most Important Feature**: consolidated_event_type (RF: 0.1431, LGB: 19)
- **Strongest Correlation**: market_regime (0.1730)
- **signed_magnitude ranking**: #16

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