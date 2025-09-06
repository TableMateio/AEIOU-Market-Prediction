# AEIOU ML Results - Winning Configuration

## 🎯 PERFORMANCE SUMMARY
- **LightGBM Accuracy**: 65.3%
- **RandomForest Accuracy**: 62.2%
- **Configuration**: 95 binary flags + 10 categorical + 7 numerical
- **Total Features**: 112

## 📊 DATA STATISTICS
- **Total Records**: 10,401
- **Train/Test Split**: 8,320 / 2,081
- **UP Moves**: 4,857 (46.7%)
- **DOWN Moves**: 5,544 (53.3%)

## 🏆 TOP 10 FEATURES
1. **abs_change_1week_after_pct**: 34685.5\n2. **market_regime_encoded**: 2144.2\n3. **article_source_credibility**: 1342.0\n4. **event_trigger_encoded**: 1324.5\n5. **consolidated_event_type_encoded**: 1220.7\n6. **article_audience_split_encoded**: 1177.1\n7. **event_orientation_encoded**: 741.0\n8. **market_perception_intensity**: 266.6\n9. **antitrust_tag_present**: 201.9\n10. **signed_magnitude**: 180.3\n
## 🎯 CONFIGURATION DETAILS
- **Binary Flags**: 95 (emotions, biases, event tags)
- **Categorical Features**: 10 (LabelEncoder)
- **Numerical Features**: 7 (essential only)
- **Run ID**: run_2025-09-06_14-31
- **Timestamp**: 2025-09-06_14-38

## ✅ SUCCESS METRICS
This configuration achieved the target 65%+ accuracy with the optimal feature set discovered through systematic testing.
