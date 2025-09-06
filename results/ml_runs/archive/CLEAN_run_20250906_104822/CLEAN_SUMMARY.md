# AEIOU CLEAN ML Results - 20250906_104822

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

| Rank | Feature | RF Importance | LGB Importance | Correlation | Direction | Category |
|------|---------|---------------|----------------|-------------|-----------|----------|
| 1 | **consolidated_event_type** | 0.1635 | 7 | -0.0220 | negative | categorical |
| 2 | **article_source_credibility** | 0.1447 | 10 | 0.0252 | positive | numerical |
| 3 | **event_tag_category** | 0.0863 | 7 | 0.0432 | positive | categorical |
| 4 | **article_publisher_credibility** | 0.0707 | 7 | 0.0210 | positive | numerical |
| 5 | **article_audience_split** | 0.0587 | 2 | -0.0809 | negative | categorical |
| 6 | **market_perception_hope_vs_fear** | 0.0582 | 3 | 0.0164 | positive | numerical |
| 7 | **article_time_lag_days** | 0.0513 | 6 | 0.0371 | positive | numerical |
| 8 | **event_orientation** | 0.0571 | 2 | 0.0246 | positive | categorical |
| 9 | **regime_alignment** | 0.0412 | 2 | 0.0655 | positive | numerical |
| 10 | **market_perception_surprise_vs_anticipated** | 0.0155 | 2 | -0.0947 | negative | numerical |
| 11 | **market_regime** | 0.0276 | 1 | -0.1508 | negative | categorical |
| 12 | **ai_assessment_business_impact_likelihood** | 0.0092 | 2 | -0.0125 | negative | numerical |
| 13 | **signed_magnitude** | 0.0147 | 1 | 0.0334 | positive | numerical |
| 14 | **perception_gap_optimism_bias** | 0.0097 | 1 | 0.0036 | positive | numerical |
| 15 | **perception_gap_correction_potential** | 0.0083 | 1 | 0.0228 | positive | numerical |

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