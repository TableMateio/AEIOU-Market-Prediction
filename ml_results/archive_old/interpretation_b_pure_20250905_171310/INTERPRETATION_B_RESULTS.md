# Pure Interpretation B Results

Generated: 2025-09-05 17:13:10

## Model Performance
- **RMSE**: 0.0496
- **MAE**: 0.0390
- **Directional Accuracy**: 100.0%

## Top 20 Correlations with Stock Price
| Feature | Correlation | P-Value | Present % | Alpha When Present | Alpha Difference |
|---------|-------------|---------|-----------|-------------------|------------------|
| ai_present | nan | nan | 0.0% | nan | nan |
| hardware_present | nan | nan | 0.0% | nan | nan |
| software_present | nan | nan | 0.0% | nan | nan |
| semiconductor_present | nan | nan | 0.0% | nan | nan |
| cloud_services_present | nan | nan | 0.0% | nan | nan |
| data_center_present | nan | nan | 0.0% | nan | nan |
| cybersecurity_present | nan | nan | 0.0% | nan | nan |
| blockchain_present | nan | nan | 0.0% | nan | nan |
| vr_ar_present | nan | nan | 0.0% | nan | nan |
| autonomous_tech_present | nan | nan | 0.0% | nan | nan |
| space_tech_present | nan | nan | 0.0% | nan | nan |
| earnings_present | nan | nan | 0.0% | nan | nan |
| revenue_growth_present | nan | nan | 0.0% | nan | nan |
| operating_margin_present | nan | nan | 0.0% | nan | nan |
| valuation_present | nan | nan | 0.0% | nan | nan |
| market_sentiment_present | nan | nan | 0.0% | nan | nan |
| investor_sentiment_present | nan | nan | 0.0% | nan | nan |
| capital_allocation_present | nan | nan | 0.0% | nan | nan |
| investment_strategy_present | nan | nan | 0.0% | nan | nan |
| product_innovation_present | nan | nan | 0.0% | nan | nan |

## Top 20 Feature Importance (LightGBM)
| Feature | Importance |
|---------|------------|
| ai_present | 0.00 |
| hardware_present | 0.00 |
| software_present | 0.00 |
| semiconductor_present | 0.00 |
| cloud_services_present | 0.00 |
| data_center_present | 0.00 |
| cybersecurity_present | 0.00 |
| blockchain_present | 0.00 |
| vr_ar_present | 0.00 |
| autonomous_tech_present | 0.00 |
| space_tech_present | 0.00 |
| earnings_present | 0.00 |
| revenue_growth_present | 0.00 |
| operating_margin_present | 0.00 |
| valuation_present | 0.00 |
| market_sentiment_present | 0.00 |
| investor_sentiment_present | 0.00 |
| capital_allocation_present | 0.00 |
| investment_strategy_present | 0.00 |
| product_innovation_present | 0.00 |

## Key Insights
- **Pure Interpretation B**: No aggregation - each of the 12K rows stays separate
- **Natural Confidence**: Model learns confidence from seeing repeated patterns
- **Binary Flags**: ~200+ categorical features converted to binary presence flags
- **Correlation Analysis**: Each flag's direct correlation with stock price movements
- **Feature Importance**: Which patterns the model finds most predictive
