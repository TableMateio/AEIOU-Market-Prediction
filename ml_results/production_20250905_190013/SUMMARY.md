# AEIOU PRODUCTION ML PIPELINE RESULTS

**Training Date**: 2025-09-05 19:00:14
**Target Variable**: alpha_vs_spy_1day_after (Alpha vs SPY - better than raw price changes)
**Training Examples**: 9600
**Test Examples**: 2400
**Total Features**: 129

## Model Performance

| Metric | Value |
|--------|-------|
| RMSE | 2.9716 |
| MAE | 2.5570 |
| R² | -0.0433 |
| Directional Accuracy | 48.8% |

## Feature Category Analysis

### Scalar Features
- **Total Importance**: 7168.0000
- **Feature Count**: 5
- **Average Importance**: 1433.6000

### Event Tags
- **Total Importance**: 622.0000
- **Feature Count**: 58
- **Average Importance**: 10.7241

### Factor Names
- **Total Importance**: 601.0000
- **Feature Count**: 54
- **Average Importance**: 11.1296

### Event Types
- **Total Importance**: 528.0000
- **Feature Count**: 12
- **Average Importance**: 44.0000

## Top 10 Features

1. **market_perception_intensity** (Scalar): 2159.0000
2. **article_source_credibility** (Scalar): 2102.0000
3. **factor_magnitude** (Scalar): 1878.0000
4. **signed_magnitude** (Scalar): 935.0000
5. **market_share** (Factor Name): 168.0000
6. **regulatory** (Event Tag): 134.0000
7. **market_update** (Event Type): 134.0000
8. **competitive_pressure** (Factor Name): 127.0000
9. **supply_chain_risk** (Factor Name): 125.0000
10. **earnings_report** (Event Type): 119.0000

## Next Steps
1. Feature engineering: Add time-based and interaction features
2. Model tuning: Hyperparameter optimization
3. Ensemble methods: Combine multiple models
4. Cross-validation: Time series cross-validation
5. Production deployment: Real-time prediction pipeline