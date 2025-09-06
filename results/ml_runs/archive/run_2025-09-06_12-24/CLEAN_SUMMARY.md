# AEIOU CLEAN ML Results - 2025-09-06_12-24

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: Yes
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: 2.6195
- **MAE**: 1.9937
- **R²**: -3.1731
- **Directional Accuracy**: 47.4%

### LightGBM (Improved)
- **RMSE**: 1.2763
- **MAE**: 0.9374
- **R²**: 0.0093
- **Directional Accuracy**: 62.1%

## 📊 Clean Data Summary
- **Total Records**: 9,921 (cleaned)
- **Available Features**: 134
- **Target**: abs_change_1day_after_pct
- **Zero Values Removed**: 0 (data quality improvement)

## 🎯 Target Distribution (Clean)
- **Mean**: -0.266%
- **Std**: 3.015%
- **Range**: [-8.694, 14.457]
- **Positive Moves**: 4575 (46.1%)
- **Negative Moves**: 5346 (53.9%)

## 🔗 Correlation Insights
- **High Correlation Features** (>0.1): 1
- **Positive Correlations**: 18
- **Negative Correlations**: 21

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|
| 1 | **consolidated_event_type** | consolidated_event_type | Core Categorical | 0.1411 | 17 | -0.0255 | negative |
| 2 | **article_source_credibility** | article_source_credibility | Core Numerical | 0.1391 | 18 | -0.0073 | negative |
| 3 | **event_tag_category** | event_tag_category | Core Categorical | 0.1024 | 19 | 0.0590 | positive |
| 4 | **article_publisher_credibility** | article_publisher_credibility | Extended Numerical | 0.0742 | 13 | 0.0141 | positive |
| 5 | **regime_alignment** | regime_alignment | Extended Numerical | 0.0510 | 8 | 0.0727 | positive |
| 6 | **article_time_lag_days** | article_time_lag_days | Extended Numerical | 0.0567 | 5 | 0.0316 | positive |
| 7 | **article_audience_split** | article_audience_split | Core Categorical | 0.0465 | 8 | -0.0757 | negative |
| 8 | **article_author_credibility** | article_author_credibility | Extended Numerical | 0.0471 | 6 | 0.0396 | positive |
| 9 | **event_orientation** | event_orientation | Core Categorical | 0.0324 | 10 | 0.0242 | positive |
| 10 | **market_perception_hope_vs_fear** | market_perception_hope_vs_fear | Extended Numerical | 0.0266 | 4 | 0.0008 | positive |
| 11 | **market_regime** | market_regime | Core Categorical | 0.0383 | 2 | -0.1746 | negative |
| 12 | **market_perception_surprise_vs_anticipated** | market_perception_surprise_vs_anticipated | Extended Numerical | 0.0216 | 3 | -0.0914 | negative |
| 13 | **perception_gap_risk_awareness** | perception_gap_risk_awareness | Extended Numerical | 0.0451 | 0 | 0.0058 | positive |
| 14 | **event_trigger** | event_trigger | Core Categorical | 0.0317 | 0 | -0.0462 | negative |
| 15 | **ai_assessment_competitive_risk** | ai_assessment_competitive_risk | Extended Numerical | 0.0103 | 1 | -0.0340 | negative |

## 📈 Key Insights
- **Most Important Feature**: consolidated_event_type (RF: 0.1411, LGB: 17)
- **Strongest Correlation**: market_regime (0.1746)
- **signed_magnitude ranking**: #15

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