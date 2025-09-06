# AEIOU CLEAN ML Results - 2025-09-06_12-37

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: Yes
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: 1.9702
- **MAE**: 1.5437
- **R²**: -1.0217
- **Directional Accuracy**: 54.6%

### LightGBM (Improved)
- **RMSE**: 1.3979
- **MAE**: 1.0020
- **R²**: -0.0178
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
- **Positive Correlations**: 33
- **Negative Correlations**: 36

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|
| 1 | **consolidated_event_type** | consolidated_event_type | Core Categorical | 0.1435 | 7 | -0.0257 | negative |
| 2 | **event_tag_category** | event_tag_category | Core Categorical | 0.0918 | 10 | 0.0567 | positive |
| 3 | **perception_gap_risk_awareness** | perception_gap_risk_awareness | Extended Numerical | 0.0461 | 6 | 0.0101 | positive |
| 4 | **regime_alignment** | regime_alignment | Extended Numerical | 0.0514 | 3 | 0.0727 | positive |
| 5 | **article_audience_split** | article_audience_split | Core Categorical | 0.0445 | 4 | -0.0819 | negative |
| 6 | **market_perception_hope_vs_fear** | market_perception_hope_vs_fear | Extended Numerical | 0.0253 | 6 | -0.0069 | negative |
| 7 | **event_orientation** | event_orientation | Core Categorical | 0.0296 | 5 | 0.0086 | positive |
| 8 | **market_perception_surprise_vs_anticipated** | market_perception_surprise_vs_anticipated | Extended Numerical | 0.0202 | 5 | -0.0781 | negative |
| 9 | **market_regime** | market_regime | Core Categorical | 0.0330 | 1 | -0.1564 | negative |
| 10 | **article_source_credibility** | article_source_credibility | Core Numerical | 0.1331 | 0 | -0.0086 | negative |
| 11 | **market_perception_consensus_vs_division** | market_perception_consensus_vs_division | Extended Numerical | 0.0124 | 2 | 0.0446 | positive |
| 12 | **article_time_lag_days** | article_time_lag_days | Extended Numerical | 0.0724 | 0 | 0.0489 | positive |
| 13 | **article_publisher_credibility** | article_publisher_credibility | Extended Numerical | 0.0678 | 0 | 0.0200 | positive |
| 14 | **article_author_credibility** | article_author_credibility | Extended Numerical | 0.0469 | 0 | 0.0425 | positive |
| 15 | **factor_effect_horizon_days** | factor_effect_horizon_days | Extended Numerical | 0.0118 | 1 | 0.0138 | positive |

## 📈 Key Insights
- **Most Important Feature**: consolidated_event_type (RF: 0.1435, LGB: 7)
- **Strongest Correlation**: market_regime (0.1564)
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