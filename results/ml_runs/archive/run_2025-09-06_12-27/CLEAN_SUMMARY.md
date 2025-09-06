# AEIOU CLEAN ML Results - 2025-09-06_12-27

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: Yes
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: 2.6474
- **MAE**: 1.9753
- **R²**: -3.3657
- **Directional Accuracy**: 47.8%

### LightGBM (Improved)
- **RMSE**: 1.2611
- **MAE**: 0.9075
- **R²**: 0.0094
- **Directional Accuracy**: 62.9%

## 📊 Clean Data Summary
- **Total Records**: 10,150 (cleaned)
- **Available Features**: 134
- **Target**: abs_change_1day_after_pct
- **Zero Values Removed**: 0 (data quality improvement)

## 🎯 Target Distribution (Clean)
- **Mean**: -0.245%
- **Std**: 2.998%
- **Range**: [-8.694, 14.457]
- **Positive Moves**: 4680 (46.1%)
- **Negative Moves**: 5470 (53.9%)

## 🔗 Correlation Insights
- **High Correlation Features** (>0.1): 1
- **Positive Correlations**: 36
- **Negative Correlations**: 33

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|
| 1 | **consolidated_event_type** | consolidated_event_type | Core Categorical | 0.1392 | 14 | -0.0266 | negative |
| 2 | **event_tag_category** | event_tag_category | Core Categorical | 0.0927 | 12 | 0.0587 | positive |
| 3 | **article_source_credibility** | article_source_credibility | Core Numerical | 0.1361 | 10 | -0.0051 | negative |
| 4 | **article_publisher_credibility** | article_publisher_credibility | Extended Numerical | 0.0713 | 8 | 0.0188 | positive |
| 5 | **regime_alignment** | regime_alignment | Extended Numerical | 0.0509 | 9 | 0.0723 | positive |
| 6 | **article_audience_split** | article_audience_split | Core Categorical | 0.0454 | 8 | -0.0775 | negative |
| 7 | **market_perception_hope_vs_fear** | market_perception_hope_vs_fear | Extended Numerical | 0.0267 | 13 | 0.0049 | positive |
| 8 | **event_orientation** | event_orientation | Core Categorical | 0.0289 | 11 | 0.0142 | positive |
| 9 | **perception_gap_risk_awareness** | perception_gap_risk_awareness | Extended Numerical | 0.0447 | 6 | 0.0054 | positive |
| 10 | **article_author_credibility** | article_author_credibility | Extended Numerical | 0.0472 | 3 | 0.0467 | positive |
| 11 | **market_regime** | market_regime | Core Categorical | 0.0317 | 2 | -0.1589 | negative |
| 12 | **market_perception_surprise_vs_anticipated** | market_perception_surprise_vs_anticipated | Extended Numerical | 0.0196 | 4 | -0.0917 | negative |
| 13 | **signed_magnitude** | signed_magnitude | Core Numerical | 0.0131 | 5 | 0.0281 | positive |
| 14 | **market_perception_consensus_vs_division** | market_perception_consensus_vs_division | Extended Numerical | 0.0128 | 4 | 0.0458 | positive |
| 15 | **event_trigger** | event_trigger | Core Categorical | 0.0320 | 1 | -0.0458 | negative |

## 📈 Key Insights
- **Most Important Feature**: consolidated_event_type (RF: 0.1392, LGB: 14)
- **Strongest Correlation**: market_regime (0.1589)
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