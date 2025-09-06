# Pure Interpretation B Results

Generated: 2025-09-05 17:19:50

## Model Performance
- **RMSE**: 2.9107
- **MAE**: 2.5175
- **Directional Accuracy**: 49.1%

## Top 20 Correlations with Stock Price
| Feature | Correlation | P-Value | Present % | Alpha When Present | Alpha Difference |
|---------|-------------|---------|-----------|-------------------|------------------|
| hardware_present | 0.0067 | 0.4640 | 14.6% | 0.0254 | 0.0548 |
| ai_present | -0.0049 | 0.5948 | 14.0% | -0.0562 | -0.0404 |
| semiconductor_present | 0.0037 | 0.6833 | 14.4% | 0.0048 | 0.0307 |
| cloud_services_present | nan | nan | 0.0% | nan | nan |
| data_center_present | nan | nan | 0.0% | nan | nan |
| cybersecurity_present | nan | nan | 0.0% | nan | nan |
| blockchain_present | nan | nan | 0.0% | nan | nan |
| vr_ar_present | nan | nan | 0.0% | nan | nan |
| autonomous_tech_present | nan | nan | 0.0% | nan | nan |
| space_tech_present | nan | nan | 0.0% | nan | nan |
| earnings_present | 0.0066 | 0.4730 | 14.2% | 0.0250 | 0.0542 |
| revenue_growth_present | nan | nan | 0.0% | nan | nan |
| operating_margin_present | nan | nan | 0.0% | nan | nan |
| valuation_present | nan | nan | 0.0% | nan | nan |
| market_sentiment_present | nan | nan | 0.0% | nan | nan |
| investor_sentiment_present | nan | nan | 0.0% | nan | nan |
| capital_allocation_present | nan | nan | 0.0% | nan | nan |
| investment_strategy_present | nan | nan | 0.0% | nan | nan |
| product_innovation_present | nan | nan | 0.0% | nan | nan |
| product_launch_present | 0.0063 | 0.4920 | 20.0% | 0.0149 | 0.0454 |

## Top 20 Feature Importance (LightGBM)
| Feature | Importance |
|---------|------------|
| factor_magnitude | 2676.87 |
| article_source_credibility | 1754.06 |
| market_perception_intensity | 1308.97 |
| competitive_pressure_present | 310.57 |
| supply_chain_risk_present | 261.45 |
| factor_movement | 192.86 |
| regulatory_present | 173.61 |
| market_share_present | 169.00 |
| earnings_report_present | 125.19 |
| revenue_growth_rate_present | 112.34 |
| product_launch_present | 87.67 |
| earnings_present | 59.14 |
| hardware_present | 56.52 |
| semiconductor_present | 55.19 |
| ai_present | 43.60 |
| analyst_update_present | 40.48 |
| technology_innovation_present | 37.79 |
| software_present | 35.61 |
| cloud_services_present | 0.00 |
| data_center_present | 0.00 |

## Key Insights
- **Pure Interpretation B**: No aggregation - each of the 12K rows stays separate
- **Natural Confidence**: Model learns confidence from seeing repeated patterns
- **Binary Flags**: ~200+ categorical features converted to binary presence flags
- **Correlation Analysis**: Each flag's direct correlation with stock price movements
- **Feature Importance**: Which patterns the model finds most predictive
