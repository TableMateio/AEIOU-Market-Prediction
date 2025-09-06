# AEIOU CLEAN ML Results - 20250906_104443

## 🎯 IMPROVEMENTS MADE
- ✅ **Filtered out 0 zero target values**
- ✅ **Excluded months with missing data (Oct 2024 - Jan 2025)**
- ✅ **Improved array parsing for binary flags**
- ✅ **Added signed_magnitude feature**: Yes
- ✅ **Better model parameters for improved accuracy**

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

## 🏆 Top 15 Features (Random Forest)
1. **consolidated_event_type**: 0.1635
16. **article_source_credibility**: 0.1447
3. **event_tag_category**: 0.0863
36. **article_publisher_credibility**: 0.0707
10. **article_audience_split**: 0.0587
18. **market_perception_hope_vs_fear**: 0.0582
5. **event_orientation**: 0.0571
37. **article_time_lag_days**: 0.0513
35. **article_author_credibility**: 0.0458
30. **regime_alignment**: 0.0412
11. **event_trigger**: 0.0310
9. **market_regime**: 0.0276
28. **perception_gap_risk_awareness**: 0.0214
19. **market_perception_surprise_vs_anticipated**: 0.0155
14. **signed_magnitude**: 0.0147

## ⚡ Top 15 Features (LightGBM)
16. **article_source_credibility**: 10
1. **consolidated_event_type**: 7
3. **event_tag_category**: 7
36. **article_publisher_credibility**: 7
37. **article_time_lag_days**: 6
18. **market_perception_hope_vs_fear**: 3
5. **event_orientation**: 2
30. **regime_alignment**: 2
10. **article_audience_split**: 2
24. **ai_assessment_business_impact_likelihood**: 2
19. **market_perception_surprise_vs_anticipated**: 2
31. **reframing_potential**: 1
29. **perception_gap_correction_potential**: 1
27. **perception_gap_optimism_bias**: 1
20. **market_perception_consensus_vs_division**: 1
