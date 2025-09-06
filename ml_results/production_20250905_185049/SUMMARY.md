# PRODUCTION ML PIPELINE RESULTS

**Training Date**: 2025-09-05 18:50:50

**Features**: 8


## ALPHA_VS_SPY_1DAY
| Model | RMSE | MAE | R² |
|-------|------|-----|-----|
| random_forest | 2.9211 | 2.5244 | -0.0081 |
| lightgbm | 2.9079 | 2.5140 | 0.0010 |

## ALPHA_VS_SPY_1WEEK
| Model | RMSE | MAE | R² |
|-------|------|-----|-----|
| random_forest | 5.8081 | 5.0085 | -0.0169 |
| lightgbm | 5.7602 | 4.9747 | -0.0002 |

## ALPHA_VS_QQQ_1DAY
| Model | RMSE | MAE | R² |
|-------|------|-----|-----|
| random_forest | 2.8638 | 2.4767 | -0.0079 |
| lightgbm | 2.8528 | 2.4695 | -0.0002 |

## Top Features (Random Forest)

### alpha_vs_spy_1day
- **factor_magnitude**: 0.2688
- **article_source_credibility**: 0.2625
- **market_perception_intensity**: 0.2512
- **consolidated_event_tags**: 0.0656
- **consolidated_factor_name**: 0.0537

### alpha_vs_spy_1week
- **article_source_credibility**: 0.2559
- **market_perception_intensity**: 0.2552
- **factor_magnitude**: 0.2493
- **consolidated_event_tags**: 0.0717
- **consolidated_factor_name**: 0.0588

### alpha_vs_qqq_1day
- **article_source_credibility**: 0.2685
- **factor_magnitude**: 0.2601
- **market_perception_intensity**: 0.2524
- **consolidated_event_tags**: 0.0683
- **consolidated_event_type**: 0.0530