# AEIOU CLEAN ML Results - 2025-09-06_11-01

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: Yes
- ✅ **Better model parameters for improved accuracy**
- ✅ **Enhanced feature analysis with correlations and directions**

## 🎯 Model Performance

### Random Forest (Improved)
- **RMSE**: 1.7059
- **MAE**: 1.3316
- **R²**: -0.7207
- **Directional Accuracy**: 59.1%

### LightGBM (Improved)
- **RMSE**: 1.3092
- **MAE**: 0.9857
- **R²**: -0.0135
- **Directional Accuracy**: 59.6%

## 📊 Clean Data Summary
- **Total Records**: 9,158 (cleaned)
- **Available Features**: 134
- **Target**: abs_change_1day_after_pct
- **Zero Values Removed**: 0 (data quality improvement)

## 🎯 Target Distribution (Clean)
- **Mean**: -0.392%
- **Std**: 2.959%
- **Range**: [-8.694, 14.457]
- **Positive Moves**: 4141 (45.2%)
- **Negative Moves**: 5017 (54.8%)

## 🔗 Correlation Insights
- **High Correlation Features** (>0.1): 1
- **Positive Correlations**: 21
- **Negative Correlations**: 18

## 🏆 Top 15 Features (Combined Ranking)
*Ranked by average of RandomForest and LightGBM importance*

| Rank | Feature Name | Specific Feature | Feature Category | RF Importance | LGB Importance | Correlation | Direction |
|------|-------------|------------------|------------------|---------------|----------------|-------------|-----------|
| 1 | **consolidated_event_type** | consolidated_event_type | Core Categorical | 0.1635 | 7 | -0.0220 | negative |
| 2 | **article_source_credibility** | article_source_credibility | Core Numerical | 0.1447 | 10 | 0.0252 | positive |
| 3 | **event_tag_category** | event_tag_category | Core Categorical | 0.0863 | 7 | 0.0432 | positive |
| 4 | **article_publisher_credibility** | article_publisher_credibility | Extended Numerical | 0.0707 | 7 | 0.0210 | positive |
| 5 | **article_audience_split** | article_audience_split | Core Categorical | 0.0587 | 2 | -0.0809 | negative |
| 6 | **market_perception_hope_vs_fear** | market_perception_hope_vs_fear | Extended Numerical | 0.0582 | 3 | 0.0164 | positive |
| 7 | **article_time_lag_days** | article_time_lag_days | Extended Numerical | 0.0513 | 6 | 0.0371 | positive |
| 8 | **event_orientation** | event_orientation | Core Categorical | 0.0571 | 2 | 0.0246 | positive |
| 9 | **regime_alignment** | regime_alignment | Extended Numerical | 0.0412 | 2 | 0.0655 | positive |
| 10 | **market_perception_surprise_vs_anticipated** | market_perception_surprise_vs_anticipated | Extended Numerical | 0.0155 | 2 | -0.0947 | negative |
| 11 | **market_regime** | market_regime | Core Categorical | 0.0276 | 1 | -0.1508 | negative |
| 12 | **ai_assessment_business_impact_likelihood** | ai_assessment_business_impact_likelihood | Extended Numerical | 0.0092 | 2 | -0.0125 | negative |
| 13 | **signed_magnitude** | signed_magnitude | Core Numerical | 0.0147 | 1 | 0.0334 | positive |
| 14 | **perception_gap_optimism_bias** | perception_gap_optimism_bias | Extended Numerical | 0.0097 | 1 | 0.0036 | positive |
| 15 | **perception_gap_correction_potential** | perception_gap_correction_potential | Extended Numerical | 0.0083 | 1 | 0.0228 | positive |

## 📈 Key Insights
- **Most Important Feature**: consolidated_event_type (RF: 0.1635, LGB: 7)
- **Strongest Correlation**: market_regime (0.1508)
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