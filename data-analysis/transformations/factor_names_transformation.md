# Factor Names Transformation Mapping

## Transformation Rules

### 1. Remove Company-Specific Prefixes
- Remove "apple_", "berkshire_", "nvidia_", "meta_", "alphabet_", etc.
- Remove specific company references in the middle of terms

### 2. Consolidate Similar Concepts
- All analyst-related terms → `analyst_rating_change` or `analyst_forecast_change`
- All revenue growth variations → `revenue_growth_rate`
- All market share variations → `market_share`
- All investment variations → `investment_level`

### 3. Focus on Scalar Qualities
- Terms should represent measurable quantities that can increase/decrease
- Remove descriptive terms that aren't measurable

## Transformation Mappings

### Analyst-Related Factors
**Consolidated Term:** `analyst_rating_change`
**Original Terms:**
- analyst_bullish_sentiment
- analyst_coverage_initiation
- analyst_estimate_revision
- analyst_forecast_AI_growth
- analyst_forecast_downgrade
- analyst_forecast_update
- analyst_growth_margin_expectation_update
- analyst_growth_warning
- analyst_negative_opinion
- analyst_price_target_change
- analyst_price_target_cut_meta
- analyst_price_target_downgrade
- analyst_price_target_lowering
- analyst_price_target_revision
- analyst_price_target_trim
- analyst_price_target_update
- analyst_rating_change
- analyst_rating_change_palantir
- analyst_rating_change_underweight
- analyst_rating_downgrade
- analyst_rating_neutral_reiteration
- analyst_rating_outperform
- analyst_rating_update
- analyst_rating_upgrade
- analyst_sell_rating_maintained
- analyst_sentiment_bullish
- analyst_sentiment_on_ai_growth
- analyst_stock_target_price_cut

### Revenue Growth Factors
**Consolidated Term:** `revenue_growth_rate`
**Original Terms:**
- ad_revenue_growth_rate
- advertising_revenue_change
- advertising_revenue_growth
- advertising_revenue_growth_rate
- advertising_revenue_growth_rate_alphabet
- annual_server_revenue_growth_rate
- apple_ad_revenue_growth_rate
- apple_ad_revenue_growth_rate_pressure
- apple_ad_revenue_pressure
- apple_chip_revenue_growth_rate
- apple_cloud_services_revenue_growth_rate
- apple_digital_payment_revenue_growth_rate
- apple_enterprise_subscription_revenue_growth
- apple_ev_revenue_growth_rate
- apple_financial_services_revenue_growth_rate
- apple_gaming_revenue_growth_rate
- apple_gpu_product_revenue_growth_rate
- apple_international_revenue_growth_rate
- apple_online_retail_revenue_growth_rate
- apple_platform_revenue_growth_rate
- apple_revenue_growth_rate
- apple_revenue_growth_rate_ai_products
- apple_revenue_growth_rate_autonomous_vehicles
- apple_revenue_growth_rate_checkout_services
- apple_revenue_growth_rate_cloud_services
- apple_revenue_growth_rate_europe
- apple_revenue_growth_rate_from_AI_products
- apple_revenue_growth_rate_from_autonomous_services
- apple_revenue_growth_rate_from_checkout_services
- apple_revenue_growth_rate_impact
- apple_revenue_growth_rate_in_ai_services
- apple_revenue_growth_rate_in_china
- apple_revenue_growth_rate_in_cloud_and_AI_services
- apple_revenue_growth_rate_middle_east_services
- apple_revenue_growth_rate_premium_segment
- apple_revenue_growth_rate_streaming_services
- apple_revenue_growth_rate_variability_increases
- apple_revenue_growth_streaming_devices
- apple_services_revenue_growth_rate
- apple_streaming_device_revenue_growth_rate
- apple_streaming_revenue_growth_rate
- apple_subscription_revenue_growth
- apple_tv_revenue_growth_rate
- revenue_growth_rate
- revenue_growth_rate_advertising
- revenue_growth_rate_alphabet
- revenue_growth_rate_apple
- revenue_growth_rate_china
- revenue_growth_rate_deceleration
- revenue_growth_rate_decline
- revenue_growth_rate_decrease
- revenue_growth_rate_india
- revenue_growth_rate_international_markets
- revenue_growth_rate_iphone
- revenue_growth_rate_slowdown
- revenue_growth_rate_suppression
- revenue_growth_rate_uk
- revenue_growth_rate_us_segment
- revenue_growth_rate_wearables

### Market Share Factors
**Consolidated Term:** `market_share`
**Original Terms:**
- apple_market_share
- apple_market_share_gain_in_advertising_platforms
- apple_market_share_gain_in_china_smartphones_and_ai
- apple_market_share_gain_in_china_smartphones_and_ai_chips
- apple_market_share_growth
- apple_market_share_in_ai_data_center
- apple_market_share_in_china_smartphones
- apple_market_share_in_ecommerce_checkout
- apple_market_share_pressure
- apple_market_share_social_media
- apple_market_share_streaming_devices
- market_share
- market_share_advertising_revenue
- market_share_alphabet_ads
- market_share_apple_checkout
- market_share_apple_smartphones
- market_share_apple_streaming_devices
- market_share_browser_search
- market_share_checkout_payments
- market_share_china
- market_share_digital_payments
- market_share_dividend_investors
- market_share_gain_apple_streaming_devices
- market_share_gain_streaming_devices
- market_share_growth
- market_share_in_ai_hardware
- market_share_in_ai_server_segment
- market_share_in_ai_services
- market_share_in_index_exposure
- market_share_in_index_funds
- market_share_in_search_related_services
- market_share_in_smartphones
- market_share_in_us_smartphone_segment
- market_share_increase
- market_share_india
- market_share_ios_app_distribution_eu
- market_share_loss
- market_share_loss_autonomous_vehicles
- market_share_loss_in_advertising
- market_share_middle_east
- market_share_pressure
- market_share_pressure_eu
- market_share_pressure_in_app_store
- market_share_pressure_ios_ecosystem
- market_share_pressure_services
- market_share_risk_services
- market_share_search_engine
- market_share_shift_streaming_devices
- market_share_stability
- market_share_turkish_apples_in_india
- market_share_us
- market_share_us_iphone
- market_share_us_smartphones
- market_share_voice_assistant
- market_share_volatility
- market_share_wearables

### Investment Level Factors
**Consolidated Term:** `investment_level`
**Original Terms:**
- ai_capex_increase
- ai_capex_investment
- AI_capital_expenditure_increase
- ai_chip_design_investment
- ai_hardware_investment
- ai_hardware_investment_increase
- ai_infrastructure_investment_by_apple
- ai_infrastructure_investment_expectation
- ai_infrastructure_investment_growth
- ai_infrastructure_investment_growth_middle_east
- ai_infrastructure_investment_increase
- ai_infrastructure_investment_trend
- ai_infrastructure_spending_increase
- ai_investment_acceleration
- ai_investment_by_competitor
- AI_investment_by_competitor
- AI_investment_increase
- ai_investment_intensity
- ai_investment_sentiment_shift
- AI_investment_surge
- ai_investment_theme
- ai_r_and_d_investment_increase
- apple_ai_chip_innovation_investment
- apple_ai_chip_investment_increase
- apple_ai_infrastructure_investment_increase
- apple_ai_innovation_investment
- apple_ai_investment_acceleration
- apple_ai_investment_caution
- apple_ai_investment_confidence
- apple_ai_investment_increase
- apple_ai_investment_sentiment
- apple_AI_R&D_increase
- apple_autonomous_vehicle_investment_level
- apple_clean_energy_investment_growth
- apple_clean_energy_investment_increase
- apple_clean_energy_investment_risk_perception
- apple_cloud_services_investment
- apple_enterprise_AI_software_investment_increase
- apple_investment_in_AI_and_cloud
- apple_investment_in_crypto_payments_features
- apple_r_and_d_investment_in_ai
- apple_r_and_d_investment_in_ai_chips
- apple_r_and_d_investment_in_ai_hardware
- apple_r_and_d_investment_in_autonomous_tech
- apple_r_and_d_investment_in_ev_and_related_tech
- apple_research_and_development_costs
- apple_space_investment_sentiment
- apple_streaming_investment_in_content
- berkshire_apple_investment_strategy_change
- berkshire_hathaway_apple_investment
- berkshire_hathaway_investment
- berkshire_hathaway_investment_in_apple
- berkshire_investment_in_apple
- berkshire_investment_policy_change
- buffett_investment_acknowledgement
- capital_allocation_decision
- capital_allocation_efficiency
- capital_allocation_flexibility
- capital_allocation_signal_strength
- capital_allocation_strategy
- capital_allocation_to_equities
- capital_availability_for_AI_investment
- capital_availability_for_apple
- capital_availability_for_innovation
- capital_availability_for_tsmc
- capital_expenditure
- capital_expenditure_AI_investment
- capital_expenditure_caution
- capital_expenditure_guidance_update
- capital_expenditure_increase
- capital_expenditure_investment
- capital_expenditure_on_data_centers
- capital_expenditure_plans
- capital_expenditure_reduction
- capital_investment
- capital_investment_500B_US
- capital_investment_announcement
- capital_investment_apple_us_500b
- capital_investment_commitment
- capital_investment_in_AI
- capital_investment_innovation
- investment
- investment_activity
- investment_advice
- investment_behavior_change
- investment_change
- investment_decision
- investment_disclosure
- investment_exposure
- investment_highlight
- investment_holding_update
- investment_incentive
- investment_inclusion
- investment_increase
- investment_increase_in_TSMC
- investment_performance_update
- investment_portfolio_change
- investment_portfolio_update
- investment_position_change
- investment_reassessment
- investment_recommendation
- investment_recommendation_update
- investment_reduction
- investment_reduction_by_berkshire
- investment_sentiment
- investment_sentiment_index
- investment_sentiment_positive
- investment_sentiment_toward_AI
- investment_sentiment_towards_Apple
- investment_sentiment_update
- investment_shift_amazon_over_tesla
- investment_shift_to_gold
- investment_slowdown
- investment_spending_reduction
- investment_strategy_adjustment
- investment_strategy_advice
- investment_strategy_announcement
- investment_strategy_change
- investment_strategy_recommendation
- investment_strategy_shift_towards_equities
- investment_strategy_shift_towards_tech
- investment_strategy_uncertainty_Berkshire
- investment_trend
- r_and_d_investment_in_ai_hardware_software
- r&d_investment_growth_rate
- r&d_investment_in_ai
- r&d_investment_increase
- R&D_investment_increase
- strategic_investment
- strategic_investment_in_ai_and_data_centers
- strategic_investment_in_autonomous_vehicle_technology
- strategic_investment_in_autonomous_vehicles
- strategic_investment_openai_io_acquisition

### Stock Price Factors
**Consolidated Term:** `stock_price`
**Original Terms:**
- apple_stock_price
- apple_stock_price_and_valuation
- apple_stock_price_appreciation
- apple_stock_price_increase
- apple_stock_price_performance
- apple_stock_price_pressure
- apple_stock_price_stability
- apple_stock_price_support
- apple_stock_price_volatility
- Apple_stock_price_volatility
- apple_stock_price_volatility_increases
- stock_price
- stock_price_after_hours_change
- stock_price_after_hours_movement
- stock_price_apple
- stock_price_appreciation
- stock_price_below_200wma
- stock_price_change
- stock_price_decline
- stock_price_drop
- stock_price_fall
- stock_price_increase
- stock_price_index_weighting
- stock_price_level
- stock_price_movement
- stock_price_performance
- stock_price_performance_30d
- stock_price_pressure
- stock_price_rally
- stock_price_recovery
- stock_price_stability
- stock_price_stability_and_growth
- stock_price_stability_and_liquidity
- stock_price_support
- stock_price_technical_trend
- stock_price_trend
- stock_price_volatility
- stock_price_volatility_and_market_sentiment
- stock_price_volatility_due_to_ETF_flows
- stock_price_volatility_impact_on_cost_of_capital
- stock_price_volatility_impact_on_index_influence
- stock_price_volatility_increase
- stock_price_volatility_reduction

### Operating Margin Factors
**Consolidated Term:** `operating_margin`
**Original Terms:**
- alphabet_operating_margin
- apple_operating_margin
- Apple_operating_margin
- apple_operating_margin_improvement
- apple_operating_margin_in_ai_segment
- apple_operating_margin_pressure
- apple_operating_margin_streaming_segment
- apple_services_operating_margin
- apple_streaming_operating_margin
- ecommerce_gross_margin
- ecommerce_operating_margin
- gross_margin
- gross_margin_compression
- gross_margin_decline
- gross_margin_decrease
- gross_margin_expansion
- gross_margin_hardware
- gross_margin_improvement
- gross_margin_percent
- gross_margin_preservation
- gross_margin_pressure
- lower_apple_operating_margin
- operating_margin
- operating_margin_apple_services
- operating_margin_comparison
- operating_margin_compression
- operating_margin_decline
- operating_margin_expansion
- operating_margin_growth_rate
- operating_margin_improvement
- operating_margin_increase
- operating_margin_pressure
- operating_margin_reduction
- services_operating_margin

### Demand Level Factors
**Consolidated Term:** `demand_level`
**Original Terms:**
- ai_chip_demand_growth
- ai_chip_demand_increase
- ai_chip_demand_signal
- ai_chip_demand_signal_for_apple_supply_chain
- ai_data_center_demand_growth
- ai_hardware_demand_growth
- apple_ai_chip_demand_growth
- apple_ai_chip_demand_pressure
- apple_ai_hardware_demand
- apple_ai_technology_demand
- apple_chip_demand_increase
- apple_cloud_service_demand_pressure
- apple_demand_decline
- apple_demand_forecast
- apple_demand_outlook
- apple_demand_volume
- apple_device_demand_increase
- apple_ev_component_demand
- apple_server_component_demand_increase
- apple_stock_demand
- apple_stock_demand_change
- apple_stock_demand_decline
- apple_stock_demand_increase
- apple_stock_demand_variation
- auto_industry_demand_pressure
- auto_industry_demand_softening
- chip_demand_increase
- consumer_demand_decline
- consumer_demand_decrease
- consumer_demand_growth_rate
- consumer_demand_increase
- consumer_demand_pressure
- consumer_demand_spike_pre_tariffs
- consumer_demand_stabilization
- customer_demand
- customer_demand_decline
- customer_demand_decrease
- customer_demand_for_iphone
- customer_demand_growth_rate
- customer_demand_maintenance
- customer_demand_pressure
- customer_demand_reduction
- customer_demand_stability
- customer_demand_variation
- data_center_demand_growth
- demand_reduction
- digital_demand_increase
- enterprise_AI_demand_growth
- funds_apple_stock_demand
- industry_demand_growth
- investment_demand_for_stable_large_caps
- investor_demand_for_apple_stock
- iphone_demand_decrease
- iphone_demand_reduction
- market_demand_for_apple_shares
- reduced_consumer_demand_for_apple_products
- reduced_customer_demand_due_to_higher_prices
- reduced_investor_demand_for_apple_stock
- smartphone_chip_demand
- smartphone_chip_demand_decline
- smartphone_chip_demand_weakening
- softening_consumer_demand
- supply_chain_gpu_component_demand

### Cost Level Factors
**Consolidated Term:** `cost_level`
**Original Terms:**
- ai_chip_cost_reduction
- ai_hardware_cost_inflation
- apple_borrowing_costs
- apple_chip_costs
- apple_component_supply_costs
- apple_cost_of_capital
- apple_cost_of_capital_increase
- apple_cost_of_goods_sold
- apple_costs_increase_due_to_tariffs
- apple_financing_costs
- apple_iphone_production_costs
- apple_operating_costs_clean_energy
- apple_operating_costs_energy
- apple_pay_compliance_costs
- apple_product_costs
- apple_product_costs_and_margins
- apple_production_adjustment_costs
- apple_production_costs_increase
- apple_r_and_d_costs
- apple_research_and_development_costs
- automotive_supply_chain_cost_increase
- capital_access_cost
- capital_cost_increase
- capital_raising_ability
- capital_raising_capacity
- capital_raising_capacity_improvement
- capital_raising_cost_increase
- capital_raising_costs
- chip_cost_increase
- chip_cost_reduction
- chip_production_costs
- chip_supply_cost_increase
- component_cost_increase
- component_cost_structure
- component_costs
- component_supply_costs
- compliance_cost_increase
- compliance_costs
- cost_avoidance
- cost_avoidance_due_to_tariff_reduction
- cost_avoidance_tariffs
- cost_base_increase
- cost_estimate_increase
- cost_impact_tariffs
- cost_increase
- cost_increase_due_to_tariffs
- cost_increase_due_to_tariffs_and_compliance
- cost_increase_due_to_tariffs_or_relocation
- cost_increase_for_apple_products
- cost_increase_per_unit
- cost_increase_supply_chain
- cost_increase_warning
- cost_inflation
- cost_mitigation
- cost_of_capital
- cost_of_capital_for_apple
- cost_of_capital_increase
- cost_of_debt_financing
- cost_of_digital_tax
- cost_of_goods_sold
- cost_of_goods_sold_increase
- cost_of_goods_sold_reduction
- cost_of_sales_tax_expense
- cost_pressure
- cost_pressure_due_to_us_supply_chain
- cost_pressure_on_apple_supply_chain
- cost_pressure_on_products
- cost_reduction
- cost_reduction_due_to_tariff_avoidance
- cost_reduction_due_to_tariff_exemption
- cost_reduction_in_supply_chain
- cost_reduction_in_tariff_expenses
- cost_reduction_on_imported_components
- cost_reduction_tariff_avoidance
- cost_reduction_tariff_impact
- cost_reduction_tariffs
- cost_savings_from_fewer_security_incidents
- cost_savings_from_risk_mitigation
- cost_savings_from_tariff_avoidance
- cost_structure
- cost_structure_change
- cost_structure_improvement
- cost_structure_increase
- cost_structure_variability_due_to_tariffs
- costs
- costs_increase_due_to_compliance
- costs_increase_due_to_supply_chain_disruption
- costs_increase_due_to_supply_chain_risk
- costs_increase_due_to_tariffs
- customer_support_costs
- data_center_operating_costs
- import_costs
- increased_cost_of_goods_sold
- increased_costs_and_production_delays
- increased_costs_due_to_inflation_and_tariffs
- increased_costs_due_to_tariffs
- increased_energy_costs_for_apple_operations
- increased_production_costs_due_to_tariffs
- input_cost_inflation
- input_cost_reduction
- legal_costs
- legal_costs_increase
- manufacturing_cost_increase
- manufacturing_cost_increase_due_to_tariffs
- manufacturing_cost_inflation
- manufacturing_cost_reduction
- manufacturing_cost_reduction_india
- manufacturing_costs
- manufacturing_costs_increase
- manufacturing_costs_us_dollar
- operating_costs
- operating_costs_increase_due_to_tariffs
- operational_costs
- operational_costs_cybersecurity_apple
- operational_costs_increase
- operational_costs_reduction
- recurring_fines_cost
- reduced_chip_procurement_costs
- risk_management_costs
- supplier_cost_increase
- supplier_cost_increase_due_to_tariffs
- supplier_cost_pressure
- supplier_costs
- supplier_pricing_change
- supplier_pricing_increase
- supply_chain_cost_increase
- supply_chain_cost_inflation
- supply_chain_cost_pressure
- supply_chain_cost_reduction
- supply_chain_cost_risk
- supply_chain_costs
- supply_chain_restructuring_costs
- talent_acquisition_costs
- tariff_cost_exposure
- tariff_cost_hit
- tariff_cost_impact
- tariff_cost_increase
- tariff_cost_increase_forecast
- tariff_cost_pressure
- tariff_cost_reduction
- tariff_cost_risk
- tariff_costs
- tariff_costs_increase
- unit_cost_increase
- visa_compliance_costs

### Supply Chain Risk Factors
**Consolidated Term:** `supply_chain_risk`
**Original Terms:**
- apple_supply_chain_cost_pressure
- apple_supply_chain_cost_risk
- apple_supply_chain_dependency
- apple_supply_chain_dependency_shift
- apple_supply_chain_disruption_risk
- apple_supply_chain_exposure_to_ai_chip_demand
- apple_supply_chain_reliability
- Apple_supply_chain_reliability_for_AI_chips
- apple_supply_chain_resilience_index
- apple_supply_chain_risk
- apple_supply_chain_risk_defense_sector
- apple_supply_chain_risk_increase
- apple_supply_chain_risk_index
- apple_supply_chain_stability
- supply_chain_adjustment
- supply_chain_complexity_index
- supply_chain_cost_increase
- supply_chain_cost_inflation
- supply_chain_cost_pressure
- supply_chain_cost_reduction
- supply_chain_cost_risk
- supply_chain_costs
- supply_chain_dependency_increase
- supply_chain_dependency_risk
- supply_chain_disruption
- supply_chain_disruption_index
- supply_chain_disruption_mitigation
- supply_chain_disruption_risk
- supply_chain_diversification
- supply_chain_diversification_increase
- supply_chain_diversification_index
- supply_chain_diversification_initiative
- supply_chain_expansion_ai_robotics
- supply_chain_financial_stability
- supply_chain_flexibility_index
- supply_chain_gpu_component_demand
- supply_chain_investment
- supply_chain_investment_in_ai_chips
- supply_chain_investment_in_ai_semiconductors
- supply_chain_optimization
- supply_chain_optimization_efforts
- supply_chain_reliability
- supply_chain_reliability_index
- supply_chain_relocation
- supply_chain_relocation_discussion
- supply_chain_relocation_india
- supply_chain_relocation_india_increase
- supply_chain_relocation_to_vietnam
- supply_chain_resilience
- supply_chain_resilience_index
- supply_chain_restructuring
- supply_chain_restructuring_challenge
- supply_chain_restructuring_costs
- supply_chain_restructuring_india_assembly
- supply_chain_risk
- supply_chain_risk_exposure
- supply_chain_risk_increase
- supply_chain_risk_index
- supply_chain_risk_reduction
- supply_chain_risk_reduction_index
- supply_chain_risk_transshipment_scrutiny
- supply_chain_shift_to_india_vietnam
- supply_chain_shift_to_us
- supply_chain_shift_to_US
- supply_chain_shift_towards_US_manufacturing
- supply_chain_stability
- supply_chain_stability_index
- supply_chain_tariff_uncertainty

### Competitive Pressure Factors
**Consolidated Term:** `competitive_pressure`
**Original Terms:**
- ai_chip_market_competitive_pressure
- ai_hardware_market_competition_intensity
- competitive_advantage_erosion
- competitive_advantage_reduction
- competitive_advantage_sustainability
- competitive_advantage_sustainability_apple_vs_tesla
- competitive_ai_automation_adoption
- competitive_ai_innovation_pressure
- competitive_AI_innovation_pressure
- competitive_ai_investment_pressure
- competitive_AI_investment_pressure
- competitive_ai_product_innovation
- competitive_cloud_infrastructure_capacity
- competitive_content_offering_strength
- competitive_device_innovation_pressure
- competitive_dynamics_branded_checkout
- competitive_financial_capacity_assessment
- competitive_initiative_spotify_ad_tools
- competitive_investor_attention_shift
- competitive_landscape_perception
- competitive_landscape_pressure
- competitive_landscape_shift
- competitive_market_pressure
- competitive_moat_strength
- competitive_position_decline
- competitive_position_strengthening
- competitive_position_update
- competitive_positioning
- competitive_positioning_ai_platform
- competitive_positioning_pressure_on_apple
- competitive_pressure
- competitive_pressure_ai_china
- competitive_pressure_chip_supply
- competitive_pressure_from_apple_streaming_devices
- competitive_pressure_from_openbank
- competitive_pressure_on_ad_market_share
- competitive_pressure_on_advertising_revenue
- competitive_pressure_on_AI_and_cloud
- competitive_pressure_on_ai_chip_costs
- competitive_pressure_on_ai_chip_pricing
- competitive_pressure_on_ai_hardware
- competitive_pressure_on_ai_innovation
- competitive_pressure_on_apple
- competitive_pressure_on_apple_ad_revenue
- competitive_pressure_on_apple_advertising_platform
- competitive_pressure_on_apple_ai_chip_development
- competitive_pressure_on_apple_ai_initiatives
- competitive_pressure_on_apple_ai_investment
- competitive_pressure_on_apple_ai_investments
- competitive_pressure_on_apple_ai_products
- competitive_pressure_on_apple_autonomous_vehicle_initiatives
- competitive_pressure_on_apple_autonomous_vehicle_strategy
- competitive_pressure_on_apple_checkout_market_share
- competitive_pressure_on_apple_chip_advantage
- competitive_pressure_on_apple_chip_sales
- competitive_pressure_on_apple_cloud_services
- competitive_pressure_on_apple_crypto_initiatives
- competitive_pressure_on_apple_device_innovation
- competitive_pressure_on_apple_ev_initiatives
- competitive_pressure_on_apple_event_planning
- competitive_pressure_on_apple_financial_services
- competitive_pressure_on_apple_streaming
- competitive_pressure_on_apple_streaming_services
- competitive_pressure_on_apple_tv
- competitive_pressure_on_autonomous_vehicle_market
- competitive_pressure_on_chip_suppliers
- competitive_pressure_on_iphone_market_share
- competitive_pressure_on_iphone_sales
- competitive_pressure_on_platforms
- competitive_pressure_streaming_devices
- competitive_pricing_action
- competitive_product_launch
- competitive_response_innovation_acceleration
- competitive_risk_ai_lag
- competitive_search_engine_presence
- competitive_technology_advancement_index
- competitive_technology_pressure
- competitive_threat
- competitive_threat_alphabet_ads
- competitive_threat_apple_vs_paypal_checkout
- competitive_threat_assessment
- competitive_threat_checkout_market_share
- competitive_threat_openai_ai_hardware_platform
- competitive_threat_openAI_hardware_entry
- competitive_threat_robotaxi_network
- competitive_threat_screenless_AI_devices

### Regulatory Risk Factors
**Consolidated Term:** `regulatory_risk`
**Original Terms:**
- export_blacklist_impact
- export_blacklist_on_chinese_tech_firms
- export_controls_on_chips_to_china
- legal_and_regulatory_outcome
- legal_appeal
- legal_ban_on_commissions
- legal_costs
- legal_costs_increase
- legal_judgment_app_store_payment_link_rules
- legal_resolution_fortnite_return
- legal_risk_exposure
- legal_risk_impact_on_revenue
- legal_risk_increase
- legal_risk_search_deal
- legal_risk_search_deal_threat
- legal_risk_update
- legal_ruling_app_store_commission_policy
- legal_settlement_rejection
- regulatory_action_chrome_divestiture
- regulatory_action_google_search_antitrust_remedies
- regulatory_action_on_google_search
- regulatory_approval_delay
- regulatory_ban_on_default_search_payments
- regulatory_challenge
- regulatory_challenge_arm
- regulatory_challenge_arm_antitrust
- regulatory_challenge_backdoor_order
- regulatory_challenge_blocking_equipment_transfer
- regulatory_change_ai_chip_export_controls
- regulatory_change_app_store_policy
- regulatory_change_chip_export_curb_overhaul
- regulatory_change_digital_tax_reduction
- regulatory_change_export_controls_scrapped
- regulatory_change_export_controls_shelved
- regulatory_change_tariff_authority_limit
- regulatory_clarity
- regulatory_compliance
- regulatory_compliance_costs
- regulatory_compliance_dispute
- regulatory_compliance_requirement
- regulatory_compliance_update
- regulatory_delay
- regulatory_enforcement_immigration_compliance
- regulatory_fine
- regulatory_focus_on_ai
- regulatory_initiative_digital_euro
- regulatory_intervention
- regulatory_investigation
- regulatory_legal_action
- regulatory_penalty
- regulatory_penalty_fine
- regulatory_policy_discussion
- regulatory_pressure_domestic_production
- regulatory_pressure_to_block_stolen_phones
- regulatory_risk
- regulatory_risk_default_search_deal
- regulatory_risk_eu_cloud_restrictions
- regulatory_risk_fine_threat
- regulatory_risk_increase
- regulatory_risk_meta_divestiture
- regulatory_risk_tsmc_supply_chain
- regulatory_ruling_violation
- regulatory_scrutiny
- regulatory_scrutiny_increase
- regulatory_scrutiny_level
- regulatory_scrutiny_risk
- regulatory_threat_tariff_imposition
- regulatory_uncertainty_index
- regulatory_update_volcanic_monitoring

### Market Volatility Factors
**Consolidated Term:** `market_volatility`
**Original Terms:**
- apple_stock_liquidity_and_valuation_pressure
- apple_stock_liquidity_and_volatility
- apple_stock_volatility
- capital_market_volatility
- dow_jones_volatility_due_to_price_weighting
- earnings_volatility_reduction
- equity_market_liquidity_pressure
- index_volatility_exposure
- investment_income_volatility
- investor_sentiment_volatility
- market_liquidity_impact
- market_liquidity_index
- market_sentiment_and_volatility
- market_sentiment_volatility
- market_share_volatility
- market_volatility
- market_volatility_and_tariff_risk
- market_volatility_due_to_tariffs
- market_volatility_exposure
- market_volatility_impact
- market_volatility_in_tech_sector
- market_volatility_increase
- market_volatility_index
- market_volatility_investment_sentiment
- market_volatility_risk
- operating_income_volatility
- share_price_volatility
- short_term_stock_volatility
- stock_index_volatility
- stock_price_volatility
- stock_price_volatility_and_market_sentiment
- stock_price_volatility_due_to_ETF_flows
- stock_price_volatility_impact_on_cost_of_capital
- stock_price_volatility_impact_on_index_influence
- stock_price_volatility_increase
- stock_price_volatility_reduction
- stock_volatility

### Customer Sentiment Factors
**Consolidated Term:** `customer_sentiment`
**Original Terms:**
- apple_customer_sentiment_and_investor_confidence
- brand_association_strength
- brand_loyalty_index
- brand_perception_index
- brand_perception_risk
- brand_preference_share
- brand_preference_share_increase
- brand_preference_share_ios
- brand_preference_share_streaming_devices
- brand_reputation_damage
- brand_reputation_index
- brand_value_enhancement
- brand_value_index
- consumer_caution_index
- consumer_confidence_index
- consumer_cryptocurrency_interest_index
- consumer_sentiment_decline
- customer_accessibility_index
- customer_behavior_change
- customer_behavior_customer_retention_rate
- customer_behavior_diversification_increase
- customer_behavior_portfolio_rebalancing_rate
- customer_churn_rate
- customer_churn_rate_uk
- customer_confidence_and_brand_loyalty
- customer_confidence_and_demand
- customer_confidence_index
- customer_data_security_perception
- customer_device_performance_perception
- customer_engagement_increase
- customer_engagement_index
- customer_engagement_metaverse_platforms
- customer_experience_rating
- customer_incentive_effectiveness
- customer_interest_index
- customer_investor_behavior_change
- customer_investor_confidence_index
- customer_loyalty_index
- customer_preference_share
- customer_preference_shift
- customer_price_stability
- customer_purchase_delay_due_to_tariff_fears
- customer_purchase_hesitation
- customer_purchase_intent
- customer_purchase_intent_decline
- customer_purchase_slowdown
- customer_purchase_timing
- customer_retention_rate
- customer_retention_rate_ev_segment
- customer_retention_rate_military_segment
- customer_satisfaction_index
- customer_satisfaction_index_ev_users
- customer_satisfaction_index_metaverse_experience
- customer_security_concern_index
- customer_sentiment_and_demand
- customer_sentiment_decline
- customer_sentiment_index
- customer_sentiment_technology_products
- customer_shift_to_secondhand_market
- customer_spending_caution
- customer_trust_and_satisfaction_index
- customer_trust_in_data_security
- customer_trust_index
- customer_trust_index_uk
- customer_uncertainty_index
- customer_upgrade_incentive
- customer_upgrade_intent
- customer_upgrade_intent_rate

### Customer Demand Factors
**Consolidated Term:** `customer_demand`
**Original Terms:**
- consumer_demand_decline
- consumer_demand_decrease
- consumer_demand_growth_rate
- consumer_demand_increase
- consumer_demand_pressure
- consumer_demand_spike_pre_tariffs
- consumer_demand_stabilization
- customer_demand
- customer_demand_decline
- customer_demand_decrease
- customer_demand_for_iphone
- customer_demand_growth_rate
- customer_demand_maintenance
- customer_demand_pressure
- customer_demand_reduction
- customer_demand_stability
- customer_demand_variation
- customer_sentiment_and_demand
- reduced_consumer_demand_for_apple_products
- reduced_customer_demand_due_to_higher_prices
- softening_consumer_demand

### Supply Availability Factors
**Consolidated Term:** `supply_availability`
**Original Terms:**
- advanced_chip_supply_agreement
- advanced_chip_supply_increase
- advanced_chip_supply_quality
- ai_chip_supply_chain_diversification
- ai_chip_supply_chain_pressure
- ai_chip_supply_constraint_risk
- ai_chip_supply_increase
- ai_chip_supply_risk
- apple_advanced_chip_supply
- apple_chip_supply_capacity
- apple_chip_supply_improvement
- apple_chip_supply_pressure
- apple_chip_supply_quality
- apple_chip_supply_reliability
- apple_chip_supply_risk
- apple_chip_supply_stability
- apple_gpu_supply_stability
- chip_supply_capacity
- chip_supply_capacity_increase
- chip_supply_capacity_utilization
- chip_supply_constraint
- chip_supply_constraints
- chip_supply_cost_increase
- chip_supply_stability
- component_supply_costs
- component_supply_diversification
- component_supply_stability
- gpu_supply_chain_stability
- gpu_supply_stability
- gpu_supply_stability_index
- semiconductor_supply_availability
- semiconductor_supply_chain_profitability
- semiconductor_supply_cost_increase
- supplier_capacity_expansion
- supplier_diversification_index
- supplier_financial_health
- supplier_financial_stability
- supplier_financial_stability_index
- supplier_negotiation_power
- supplier_operational_reliability_index

### Product Refresh Cycle Factors
**Consolidated Term:** `product_refresh_cycle`
**Original Terms:**
- device_replacement_cycle_acceleration
- product_upgrade_cycle
- satellite_constellation_refresh
- smartphone_replacement_cycle_length

### Customer Buying Power Factors
**Consolidated Term:** `customer_buying_power`
**Original Terms:**
- consumer_disposable_income_allocation_to_apple_products
- consumer_homeownership_priority
- consumer_price_sensitivity_increase
- consumer_spending_caution
- consumer_spending_decline
- consumer_spending_growth_rate
- consumer_spending_on_home_related_tech
- consumer_spending_on_tech_devices
- consumer_spending_reduction
- consumer_spending_resilience
- customer_price_stability
- customer_purchase_delay_due_to_tariff_fears
- customer_purchase_hesitation
- customer_purchase_intent
- customer_purchase_intent_decline
- customer_purchase_slowdown
- customer_purchase_timing
- customer_spending_caution

### Product Differentiation Factors
**Consolidated Term:** `product_differentiation`
**Original Terms:**
- competitive_advantage_erosion
- competitive_advantage_reduction
- competitive_advantage_sustainability
- competitive_advantage_sustainability_apple_vs_tesla
- competitive_moat_strength
- product_feature_competitiveness_index
- product_performance_advantage
- product_performance_and_efficiency
- product_performance_enhancement
- product_performance_evaluation
- product_performance_issue
- strategic_asset_strength
- strategic_execution_quality

### Product Quality Factors
**Consolidated Term:** `product_quality_index`
**Original Terms:**
- product_defect_rate
- customer_complaint_rate
- customer_return_rate
- production_downtime_duration
- number_of_bugs_reported
- patch_release_frequency
- product_performance_issue
- quality_control_metrics

### Sales Efficiency Factors
**Consolidated Term:** `sales_efficiency`
**Original Terms:**
- customer_acquisition_cost
- sales_conversion_rate
- lead_conversion_rate
- sales_cycle_length
- cost_per_acquisition
- sales_win_rate
- average_deal_size

### Innovation Pipeline Factors
**Consolidated Term:** `innovation_pipeline_strength`
**Original Terms:**
- number_of_patent_filings
- patent_approval_rate
- number_of_rd_projects
- rd_project_completion_rate
- number_of_new_product_ideas
- innovation_index_rating

### Workforce Effectiveness Factors
**Consolidated Term:** `workforce_effectiveness`
**Original Terms:**
- employee_turnover_rate
- employee_engagement_score
- employee_productivity_rate
- training_completion_rate
- talent_acquisition_rate
- employee_satisfaction_score

### Digital Engagement Factors
**Consolidated Term:** `digital_engagement_level`
**Original Terms:**
- daily_active_users
- monthly_active_users
- app_store_rating
- website_traffic
- bounce_rate
- click_through_rate
- user_growth_rate
- average_session_duration

### Distribution Effectiveness Factors
**Consolidated Term:** `distribution_effectiveness`
**Original Terms:**
- revenue_from_partnership_agreements
- number_of_new_distribution_channels
- revenue_from_new_distribution_channels
- partner_program_revenue
- franchise_locations

### Market Intelligence Factors
**Consolidated Term:** `market_intelligence_index`
**Original Terms:**
- number_of_market_research_studies
- brand_awareness_change
- market_penetration_rate
- share_of_voice_in_media
- brand_equity_index

## Updated Consolidation Summary
**Major Categories Added:**
- **customer_demand:** Direct customer demand metrics
- **supply_availability:** Supply chain availability and constraints
- **customer_buying_power:** Customer purchasing power and behavior
- **product_refresh_cycle:** Product replacement and upgrade cycles
- **product_differentiation:** Competitive advantages and product uniqueness
- **product_quality_index:** Quality metrics, defects, returns, complaints
- **sales_efficiency:** Customer acquisition costs and conversion metrics
- **innovation_pipeline_strength:** Patents, R&D projects, idea generation
- **workforce_effectiveness:** Employee productivity, engagement, retention
- **digital_engagement_level:** User activity, platform metrics, ratings
- **distribution_effectiveness:** Channel performance and partnerships
- **market_intelligence_index:** Market research, brand awareness, penetration

**Industry-Specific Consolidation:**
- Combined AI, chip, data center, cloud, autonomous tech → **technology_advancement_rate**
- Focused on universal technology adoption rather than specific verticals

## Next Steps
1. Update enum lists with new customer and supply factors
2. Validate consolidated terms cover all business dimensions
3. Apply same process to event types and tags
