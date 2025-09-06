# AEIOU CLEAN ML Results - 2025-09-06_12-25

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: Yes
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: 2.5981
- **MAE**: 1.9586
- **R²**: -3.1154
- **Directional Accuracy**: 48.7%

### LightGBM (Improved)
- **RMSE**: 1.2717
- **MAE**: 0.9374
- **R²**: 0.0140
- **Directional Accuracy**: 62.4%

## 📊 Clean Data Summary
- **Total Records**: 10,013 (cleaned)
- **Available Features**: 134
- **Target**: abs_change_1day_after_pct
- **Zero Values Removed**: 0 (data quality improvement)

## 🎯 Target Distribution (Clean)
- **Mean**: -0.271%
- **Std**: 3.002%
- **Range**: [-8.694, 14.457]
- **Positive Moves**: 4604 (46.0%)
- **Negative Moves**: 5409 (54.0%)

## 🔗 Correlation Insights
- **High Correlation Features** (>0.1): 1
- **Positive Correlations**: 18
- **Negative Correlations**: 21

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|
| 1 | **article_source_credibility** | article_source_credibility | Core Numerical | 0.1391 | 18 | -0.0087 | negative |
| 2 | **consolidated_event_type** | consolidated_event_type | Core Categorical | 0.1427 | 16 | -0.0251 | negative |
| 3 | **event_tag_category** | event_tag_category | Core Categorical | 0.0994 | 18 | 0.0634 | positive |
| 4 | **article_publisher_credibility** | article_publisher_credibility | Extended Numerical | 0.0734 | 15 | 0.0123 | positive |
| 5 | **article_time_lag_days** | article_time_lag_days | Extended Numerical | 0.0548 | 7 | 0.0315 | positive |
| 6 | **regime_alignment** | regime_alignment | Extended Numerical | 0.0520 | 7 | 0.0729 | positive |
| 7 | **article_audience_split** | article_audience_split | Core Categorical | 0.0463 | 9 | -0.0753 | negative |
| 8 | **article_author_credibility** | article_author_credibility | Extended Numerical | 0.0470 | 6 | 0.0399 | positive |
| 9 | **event_orientation** | event_orientation | Core Categorical | 0.0318 | 7 | 0.0237 | positive |
| 10 | **market_regime** | market_regime | Core Categorical | 0.0368 | 2 | -0.1724 | negative |
| 11 | **market_perception_hope_vs_fear** | market_perception_hope_vs_fear | Extended Numerical | 0.0274 | 4 | 0.0003 | positive |
| 12 | **market_perception_surprise_vs_anticipated** | market_perception_surprise_vs_anticipated | Extended Numerical | 0.0206 | 2 | -0.0915 | negative |
| 13 | **signed_magnitude** | signed_magnitude | Core Numerical | 0.0147 | 2 | 0.0279 | positive |
| 14 | **perception_gap_risk_awareness** | perception_gap_risk_awareness | Extended Numerical | 0.0454 | 0 | 0.0057 | positive |
| 15 | **event_trigger** | event_trigger | Core Categorical | 0.0327 | 0 | -0.0469 | negative |

## 📈 Key Insights
- **Most Important Feature**: article_source_credibility (RF: 0.1391, LGB: 18)
- **Strongest Correlation**: market_regime (0.1724)
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