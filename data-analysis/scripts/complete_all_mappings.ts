#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

// Read all original data files
const originalFactors = fs.readFileSync(
    path.join(__dirname, '../current-groupings/unique_factor_names.md'),
    'utf8'
).split('\n').filter(line => line.trim());

const originalEvents = fs.readFileSync(
    path.join(__dirname, '../current-groupings/unique_event_types.md'),
    'utf8'
).split('\n').filter(line => line.trim());

const originalTags = fs.readFileSync(
    path.join(__dirname, '../current-groupings/unique_event_tags.md'),
    'utf8'
).split('\n').filter(line => line.trim());

// Enhanced factor mapping with comprehensive coverage
function mapFactorName(original: string): { consolidated: string, category: string } {
    const lower = original.toLowerCase();

    // Remove company prefixes more comprehensively
    const cleanName = lower
        .replace(/^(apple_|berkshire_|nvidia_|meta_|alphabet_|tesla_|amazon_|google_|microsoft_|openai_|roku_|palantir_|qualcomm_|tsmc_|samsung_|foxconn_|uipath_|servicenow_|oklo_|iac_|partiful_|costco_|buffett_|netflix_|paypal_|)/, '');

    // === FINANCIAL PERFORMANCE ===

    // Analyst-related (ratings, forecasts, targets, estimates)
    if (cleanName.includes('analyst') || cleanName.includes('rating') || cleanName.includes('price_target') ||
        cleanName.includes('forecast') || cleanName.includes('estimate') || cleanName.includes('guidance') ||
        cleanName.includes('coverage') || cleanName.includes('recommendation')) {
        return { consolidated: 'analyst_rating_change', category: 'Financial Performance' };
    }

    // Revenue growth (revenue + growth/increase/change/decline)
    if ((cleanName.includes('revenue') || cleanName.includes('sales')) &&
        (cleanName.includes('growth') || cleanName.includes('increase') || cleanName.includes('change') ||
            cleanName.includes('decline') || cleanName.includes('miss') || cleanName.includes('beat'))) {
        return { consolidated: 'revenue_growth_rate', category: 'Financial Performance' };
    }

    // Operating/gross margins and profitability
    if (cleanName.includes('margin') || cleanName.includes('profitability') ||
        cleanName.includes('operating_income') || cleanName.includes('gross_profit')) {
        return { consolidated: 'operating_margin', category: 'Financial Performance' };
    }

    // Earnings (EPS, net income, profit)
    if (cleanName.includes('earnings') || cleanName.includes('eps') || cleanName.includes('diluted') ||
        cleanName.includes('net_income') || cleanName.includes('net_profit') || cleanName.includes('profit')) {
        return { consolidated: 'earnings_per_share', category: 'Financial Performance' };
    }

    // Costs and expenses (but not capex or R&D)
    if ((cleanName.includes('cost') || cleanName.includes('expense') || cleanName.includes('spending')) &&
        !cleanName.includes('r_and_d') && !cleanName.includes('capex') && !cleanName.includes('capital')) {
        return { consolidated: 'cost_level', category: 'Financial Performance' };
    }

    // === MARKET POSITION ===

    // Market share and position
    if (cleanName.includes('market_share') || cleanName.includes('market_position') ||
        cleanName.includes('market_leadership') || cleanName.includes('dominance')) {
        return { consolidated: 'market_share', category: 'Market Position' };
    }

    // Stock price and performance
    if (cleanName.includes('stock_price') || cleanName.includes('share_price') ||
        cleanName.includes('stock_performance') || cleanName.includes('stock_return') ||
        cleanName.includes('relative_performance')) {
        return { consolidated: 'stock_price', category: 'Market Position' };
    }

    // Market volatility and stability
    if (cleanName.includes('volatility') || cleanName.includes('market_stability') ||
        cleanName.includes('price_stability') || cleanName.includes('market_correction')) {
        return { consolidated: 'market_volatility', category: 'Market Position' };
    }

    // Valuation metrics
    if (cleanName.includes('valuation') || cleanName.includes('market_cap') ||
        cleanName.includes('pe_ratio') || cleanName.includes('multiple')) {
        return { consolidated: 'valuation_multiple', category: 'Market Position' };
    }

    // Brand and reputation (non-risk)
    if ((cleanName.includes('brand') || cleanName.includes('reputation')) && !cleanName.includes('risk')) {
        return { consolidated: 'brand_value', category: 'Market Position' };
    }

    // === OPERATIONAL METRICS ===

    // Production capacity and volume
    if (cleanName.includes('production') && (cleanName.includes('capacity') || cleanName.includes('volume') ||
        cleanName.includes('output') || cleanName.includes('units_sold'))) {
        return { consolidated: 'production_capacity', category: 'Operational Metrics' };
    }

    // Units sold (all variations)
    if (cleanName.includes('units_sold') || cleanName.includes('devices_sold') ||
        cleanName.includes('iphone_units') || cleanName.includes('unit_sales')) {
        return { consolidated: 'production_capacity', category: 'Operational Metrics' };
    }

    // Supply availability and constraints
    if (cleanName.includes('supply') && !cleanName.includes('risk') && !cleanName.includes('chain')) {
        return { consolidated: 'supply_availability', category: 'Operational Metrics' };
    }

    // Manufacturing efficiency and productivity
    if (cleanName.includes('manufacturing') && (cleanName.includes('efficiency') ||
        cleanName.includes('productivity') || cleanName.includes('optimization'))) {
        return { consolidated: 'manufacturing_efficiency', category: 'Operational Metrics' };
    }

    // Manufacturing capacity, expansion, relocation
    if (cleanName.includes('manufacturing') && (cleanName.includes('capacity') ||
        cleanName.includes('expansion') || cleanName.includes('relocation') ||
        cleanName.includes('shift') || cleanName.includes('footprint'))) {
        return { consolidated: 'manufacturing_efficiency', category: 'Operational Metrics' };
    }

    // Operational costs
    if (cleanName.includes('operational') && cleanName.includes('cost')) {
        return { consolidated: 'operational_costs', category: 'Operational Metrics' };
    }

    // Product quality and performance
    if (cleanName.includes('quality') || cleanName.includes('defect') || cleanName.includes('bug') ||
        cleanName.includes('complaint') || cleanName.includes('return_rate') ||
        cleanName.includes('performance_improvement') || cleanName.includes('performance_enhancement')) {
        return { consolidated: 'product_quality_index', category: 'Operational Metrics' };
    }

    // Workforce and talent
    if (cleanName.includes('employee') || cleanName.includes('workforce') ||
        cleanName.includes('talent') || cleanName.includes('turnover') ||
        cleanName.includes('leadership') || cleanName.includes('executive')) {
        return { consolidated: 'workforce_effectiveness', category: 'Operational Metrics' };
    }

    // === INVESTMENT & CAPITAL ===

    // Investment levels (general)
    if (cleanName.includes('investment') && !cleanName.includes('r_and_d')) {
        return { consolidated: 'investment_level', category: 'Investment & Capital' };
    }

    // Capital expenditure and allocation
    if (cleanName.includes('capex') || cleanName.includes('capital_expenditure') ||
        cleanName.includes('capital_allocation') || cleanName.includes('capital_spending')) {
        return { consolidated: 'capital_expenditure', category: 'Investment & Capital' };
    }

    // R&D spending and innovation investment
    if (cleanName.includes('r_and_d') || cleanName.includes('research') ||
        cleanName.includes('development') && cleanName.includes('spending')) {
        return { consolidated: 'r_and_d_spending', category: 'Investment & Capital' };
    }

    // Cash flow and liquidity
    if (cleanName.includes('cash') || cleanName.includes('liquidity') ||
        cleanName.includes('cash_flow')) {
        return { consolidated: 'cash_flow', category: 'Investment & Capital' };
    }

    // Debt and financing
    if (cleanName.includes('debt') || cleanName.includes('borrowing') ||
        cleanName.includes('financing') || cleanName.includes('leverage')) {
        return { consolidated: 'debt_level', category: 'Investment & Capital' };
    }

    // === STRATEGIC FACTORS ===

    // Competition and competitive pressure
    if (cleanName.includes('competitive') || cleanName.includes('competition') ||
        cleanName.includes('competitor') || cleanName.includes('rivalry')) {
        return { consolidated: 'competitive_pressure', category: 'Strategic Factors' };
    }

    // Product innovation and development
    if (cleanName.includes('innovation') && cleanName.includes('product')) {
        return { consolidated: 'product_innovation_rate', category: 'Strategic Factors' };
    }

    // Product launches and roadmap
    if (cleanName.includes('product_launch') || cleanName.includes('launch') ||
        cleanName.includes('product_roadmap') || cleanName.includes('new_product')) {
        return { consolidated: 'product_innovation_rate', category: 'Strategic Factors' };
    }

    // Product differentiation and advantage
    if (cleanName.includes('differentiation') || cleanName.includes('advantage') ||
        cleanName.includes('moat') || cleanName.includes('unique')) {
        return { consolidated: 'product_differentiation', category: 'Strategic Factors' };
    }

    // Technology adoption and integration
    if ((cleanName.includes('technology') || cleanName.includes('tech')) &&
        (cleanName.includes('adoption') || cleanName.includes('integration'))) {
        return { consolidated: 'technology_adoption', category: 'Strategic Factors' };
    }

    // Partnerships and alliances
    if (cleanName.includes('partnership') || cleanName.includes('alliance') ||
        cleanName.includes('collaboration') || cleanName.includes('joint_venture')) {
        return { consolidated: 'partnership_strength', category: 'Strategic Factors' };
    }

    // Innovation pipeline (patents, R&D output)
    if (cleanName.includes('patent') || cleanName.includes('pipeline') ||
        (cleanName.includes('innovation') && !cleanName.includes('product'))) {
        return { consolidated: 'innovation_pipeline_strength', category: 'Strategic Factors' };
    }

    // Distribution and channels
    if (cleanName.includes('distribution') || cleanName.includes('channel') ||
        cleanName.includes('retail') || cleanName.includes('store')) {
        return { consolidated: 'distribution_effectiveness', category: 'Strategic Factors' };
    }

    // === CUSTOMER DYNAMICS ===

    // Customer demand and consumer demand
    if (cleanName.includes('demand') || cleanName.includes('consumer_demand') ||
        cleanName.includes('customer_interest')) {
        return { consolidated: 'customer_demand', category: 'Customer Dynamics' };
    }

    // Customer sentiment and satisfaction
    if (cleanName.includes('customer') && (cleanName.includes('sentiment') ||
        cleanName.includes('satisfaction') || cleanName.includes('confidence') ||
        cleanName.includes('trust'))) {
        return { consolidated: 'customer_sentiment', category: 'Customer Dynamics' };
    }

    // Consumer behavior and preferences
    if (cleanName.includes('consumer') && (cleanName.includes('behavior') ||
        cleanName.includes('preference') || cleanName.includes('sentiment'))) {
        return { consolidated: 'customer_sentiment', category: 'Customer Dynamics' };
    }

    // Customer buying power and spending
    if (cleanName.includes('buying_power') || cleanName.includes('purchase') ||
        cleanName.includes('spending') || cleanName.includes('disposable_income')) {
        return { consolidated: 'customer_buying_power', category: 'Customer Dynamics' };
    }

    // Customer retention and loyalty
    if (cleanName.includes('retention') || cleanName.includes('churn') ||
        cleanName.includes('loyalty') || cleanName.includes('customer_base')) {
        return { consolidated: 'customer_retention_rate', category: 'Customer Dynamics' };
    }

    // Product refresh and upgrade cycles
    if (cleanName.includes('cycle') || cleanName.includes('refresh') ||
        cleanName.includes('replacement') || cleanName.includes('upgrade')) {
        return { consolidated: 'product_refresh_cycle', category: 'Customer Dynamics' };
    }

    // Sales efficiency and acquisition
    if (cleanName.includes('sales') || cleanName.includes('conversion') ||
        cleanName.includes('acquisition_cost') || cleanName.includes('customer_acquisition')) {
        return { consolidated: 'sales_efficiency', category: 'Customer Dynamics' };
    }

    // Digital engagement and user metrics
    if (cleanName.includes('digital') || cleanName.includes('user') ||
        cleanName.includes('engagement') || cleanName.includes('app_store') ||
        cleanName.includes('downloads') || cleanName.includes('usage')) {
        return { consolidated: 'digital_engagement_level', category: 'Customer Dynamics' };
    }

    // === MARKET SENTIMENT ===

    // Investor sentiment and behavior
    if (cleanName.includes('investor') && cleanName.includes('sentiment')) {
        return { consolidated: 'investor_sentiment', category: 'Market Sentiment' };
    }

    // Market sentiment and perception
    if (cleanName.includes('market_sentiment') || cleanName.includes('perception') ||
        cleanName.includes('market_perception')) {
        return { consolidated: 'market_perception', category: 'Market Sentiment' };
    }

    // Analyst confidence and credibility
    if (cleanName.includes('confidence') || cleanName.includes('credibility')) {
        return { consolidated: 'analyst_confidence', category: 'Market Sentiment' };
    }

    // Reputation (risk-related)
    if (cleanName.includes('reputation') && cleanName.includes('risk')) {
        return { consolidated: 'reputation_index', category: 'Market Sentiment' };
    }

    // Market intelligence and awareness
    if (cleanName.includes('intelligence') || cleanName.includes('awareness') ||
        cleanName.includes('market_outlook')) {
        return { consolidated: 'market_intelligence_index', category: 'Market Sentiment' };
    }

    // === EXTERNAL FACTORS ===

    // Tariffs and trade
    if (cleanName.includes('tariff') || cleanName.includes('trade') ||
        cleanName.includes('import') || cleanName.includes('export')) {
        return { consolidated: 'tariff_impact', category: 'External Factors' };
    }

    // Geopolitical and political risk
    if (cleanName.includes('geopolitical') || cleanName.includes('political') ||
        cleanName.includes('government') || cleanName.includes('policy')) {
        return { consolidated: 'geopolitical_risk', category: 'External Factors' };
    }

    // Macroeconomic conditions
    if (cleanName.includes('macroeconomic') || cleanName.includes('economic') ||
        cleanName.includes('recession') || cleanName.includes('inflation') ||
        cleanName.includes('cpi')) {
        return { consolidated: 'macroeconomic_conditions', category: 'External Factors' };
    }

    // Interest rates and monetary policy
    if (cleanName.includes('interest_rate') || cleanName.includes('fed_rate') ||
        cleanName.includes('monetary_policy')) {
        return { consolidated: 'interest_rate_sensitivity', category: 'External Factors' };
    }

    // Currency and exchange rates
    if (cleanName.includes('currency') || cleanName.includes('exchange') ||
        cleanName.includes('fx') || cleanName.includes('usd_equivalent')) {
        return { consolidated: 'currency_exposure', category: 'External Factors' };
    }

    // === TECHNOLOGY FACTORS ===

    // AI and technology advancement (consolidate all AI, chip, cloud, etc.)
    if (cleanName.includes('ai_') || cleanName.includes('chip') ||
        cleanName.includes('semiconductor') || cleanName.includes('cloud') ||
        cleanName.includes('data_center') || cleanName.includes('autonomous') ||
        cleanName.includes('technology') || cleanName.includes('digital')) {
        return { consolidated: 'technology_advancement_rate', category: 'Technology Factors' };
    }

    // Digital transformation
    if (cleanName.includes('transformation') || cleanName.includes('digitization') ||
        cleanName.includes('digitalization')) {
        return { consolidated: 'digital_transformation_level', category: 'Technology Factors' };
    }

    // === RISK FACTORS ===

    // Cybersecurity and security
    if (cleanName.includes('cybersecurity') || cleanName.includes('security') ||
        cleanName.includes('breach') || cleanName.includes('hack')) {
        return { consolidated: 'cybersecurity_risk', category: 'Risk Factors' };
    }

    // Compliance, legal, and regulatory
    if (cleanName.includes('compliance') || cleanName.includes('legal') ||
        cleanName.includes('regulatory') || cleanName.includes('regulation') ||
        cleanName.includes('antitrust') || cleanName.includes('lawsuit')) {
        return { consolidated: 'compliance_risk', category: 'Risk Factors' };
    }

    // Supply chain risk
    if (cleanName.includes('supply_chain') && cleanName.includes('risk')) {
        return { consolidated: 'supply_chain_risk', category: 'Risk Factors' };
    }

    // General supply chain management (non-risk)
    if (cleanName.includes('supply_chain') && !cleanName.includes('risk')) {
        return { consolidated: 'supply_availability', category: 'Operational Metrics' };
    }

    // Talent and workforce risk
    if (cleanName.includes('talent') && cleanName.includes('risk')) {
        return { consolidated: 'talent_retention_risk', category: 'Risk Factors' };
    }

    // Technology obsolescence risk
    if (cleanName.includes('obsolescence') || (cleanName.includes('technology') && cleanName.includes('risk'))) {
        return { consolidated: 'technology_obsolescence_risk', category: 'Risk Factors' };
    }

    // === SPECIAL CASES ===

    // Acquisitions and M&A
    if (cleanName.includes('acquisition') || cleanName.includes('merger') ||
        cleanName.includes('buyout') || cleanName.includes('takeover')) {
        return { consolidated: 'investment_level', category: 'Investment & Capital' };
    }

    // Share buybacks and dividends
    if (cleanName.includes('buyback') || cleanName.includes('share_repurchase') ||
        cleanName.includes('dividend') || cleanName.includes('shareholder_return')) {
        return { consolidated: 'cash_flow', category: 'Investment & Capital' };
    }

    // Product pricing
    if (cleanName.includes('pricing') || cleanName.includes('price_increase') ||
        cleanName.includes('price_adjustment')) {
        return { consolidated: 'customer_buying_power', category: 'Customer Dynamics' };
    }

    // Market access and expansion
    if (cleanName.includes('market_access') || cleanName.includes('expansion') ||
        cleanName.includes('market_entry')) {
        return { consolidated: 'market_share', category: 'Market Position' };
    }

    // Default fallback - log for manual review
    console.log(`⚠️  UNMAPPED FACTOR: ${original}`);
    return { consolidated: 'market_perception', category: 'Market Sentiment' }; // Default fallback
}

// Event type mapping
function mapEventType(original: string): { consolidated: string, category: string } {
    const lower = original.toLowerCase();

    // === FINANCIAL EVENTS ===
    if (lower.includes('earnings') || lower.includes('financial_result') ||
        lower.includes('quarterly_result') || lower.includes('annual_result')) {
        return { consolidated: 'earnings_report', category: 'Financial Events' };
    }

    if (lower.includes('analyst') || lower.includes('rating') || lower.includes('forecast') ||
        lower.includes('estimate') || lower.includes('price_target') || lower.includes('coverage')) {
        return { consolidated: 'analyst_update', category: 'Financial Events' };
    }

    if (lower.includes('guidance') || lower.includes('outlook') || lower.includes('projection')) {
        return { consolidated: 'guidance_update', category: 'Financial Events' };
    }

    if (lower.includes('dividend') || lower.includes('buyback') || lower.includes('share_repurchase') ||
        lower.includes('capital_return')) {
        return { consolidated: 'capital_return', category: 'Financial Events' };
    }

    // === PRODUCT EVENTS ===
    if (lower.includes('product_launch') || lower.includes('launch') || lower.includes('release') ||
        lower.includes('unveiling') || lower.includes('introduction')) {
        return { consolidated: 'product_launch', category: 'Product Events' };
    }

    if (lower.includes('product_update') || lower.includes('upgrade') || lower.includes('enhancement') ||
        lower.includes('improvement')) {
        return { consolidated: 'product_update', category: 'Product Events' };
    }

    if (lower.includes('recall') || lower.includes('defect') || lower.includes('issue') ||
        lower.includes('problem')) {
        return { consolidated: 'product_issue', category: 'Product Events' };
    }

    if (lower.includes('discontinuation') || lower.includes('end_of_life') || lower.includes('phase_out')) {
        return { consolidated: 'product_discontinuation', category: 'Product Events' };
    }

    // === BUSINESS EVENTS ===
    if (lower.includes('acquisition') || lower.includes('merger') || lower.includes('buyout') ||
        lower.includes('takeover')) {
        return { consolidated: 'acquisition', category: 'Business Events' };
    }

    if (lower.includes('partnership') || lower.includes('alliance') || lower.includes('collaboration') ||
        lower.includes('joint_venture')) {
        return { consolidated: 'partnership', category: 'Business Events' };
    }

    if (lower.includes('investment') && (lower.includes('announcement') || lower.includes('decision'))) {
        return { consolidated: 'investment_decision', category: 'Business Events' };
    }

    if (lower.includes('restructuring') || lower.includes('reorganization') || lower.includes('spinoff')) {
        return { consolidated: 'restructuring', category: 'Business Events' };
    }

    // === LEADERSHIP EVENTS ===
    if (lower.includes('ceo') || lower.includes('executive') || lower.includes('leadership')) {
        if (lower.includes('change') || lower.includes('appointment') || lower.includes('departure') ||
            lower.includes('resignation')) {
            return { consolidated: 'leadership_change', category: 'Leadership Events' };
        }
        return { consolidated: 'executive_communication', category: 'Leadership Events' };
    }

    if (lower.includes('board') || lower.includes('director')) {
        return { consolidated: 'board_change', category: 'Leadership Events' };
    }

    // === MARKET EVENTS ===
    if (lower.includes('ipo') || lower.includes('public_offering') || lower.includes('listing')) {
        return { consolidated: 'public_offering', category: 'Market Events' };
    }

    if (lower.includes('stock_split') || lower.includes('split')) {
        return { consolidated: 'stock_split', category: 'Market Events' };
    }

    if (lower.includes('index') && (lower.includes('inclusion') || lower.includes('addition'))) {
        return { consolidated: 'index_change', category: 'Market Events' };
    }

    // === REGULATORY EVENTS ===
    if (lower.includes('regulatory') || lower.includes('compliance') || lower.includes('legal')) {
        return { consolidated: 'regulatory_change', category: 'Regulatory Events' };
    }

    if (lower.includes('lawsuit') || lower.includes('litigation') || lower.includes('settlement')) {
        return { consolidated: 'legal_action', category: 'Regulatory Events' };
    }

    if (lower.includes('investigation') || lower.includes('probe') || lower.includes('inquiry')) {
        return { consolidated: 'investigation', category: 'Regulatory Events' };
    }

    // === OPERATIONAL EVENTS ===
    if (lower.includes('manufacturing') || lower.includes('production')) {
        return { consolidated: 'operational_change', category: 'Operational Events' };
    }

    if (lower.includes('supply_chain') || lower.includes('supplier')) {
        return { consolidated: 'supply_chain_event', category: 'Operational Events' };
    }

    if (lower.includes('facility') || lower.includes('expansion') || lower.includes('closure')) {
        return { consolidated: 'facility_change', category: 'Operational Events' };
    }

    // === STRATEGIC EVENTS ===
    if (lower.includes('strategic') || lower.includes('strategy')) {
        return { consolidated: 'strategy_announcement', category: 'Strategic Events' };
    }

    if (lower.includes('market_entry') || lower.includes('expansion') || lower.includes('geographic')) {
        return { consolidated: 'market_expansion', category: 'Strategic Events' };
    }

    // Default fallback
    console.log(`⚠️  UNMAPPED EVENT: ${original}`);
    return { consolidated: 'market_update', category: 'Market Events' };
}

// Event tag mapping
function mapEventTag(original: string): { consolidated: string, category: string } {
    const lower = original.toLowerCase();

    // === TECHNOLOGY TAGS ===
    if (lower.includes('ai') || lower.includes('artificial_intelligence') ||
        lower.includes('machine_learning') || lower.includes('ml')) {
        return { consolidated: 'ai', category: 'Technology' };
    }

    if (lower.includes('chip') || lower.includes('semiconductor') || lower.includes('processor') ||
        lower.includes('silicon')) {
        return { consolidated: 'semiconductor', category: 'Technology' };
    }

    if (lower.includes('cloud') || lower.includes('data_center') || lower.includes('server')) {
        return { consolidated: 'cloud_computing', category: 'Technology' };
    }

    if (lower.includes('software') || lower.includes('app') || lower.includes('platform')) {
        return { consolidated: 'software', category: 'Technology' };
    }

    if (lower.includes('hardware') || lower.includes('device') || lower.includes('component')) {
        return { consolidated: 'hardware', category: 'Technology' };
    }

    // === BUSINESS FUNCTION TAGS ===
    if (lower.includes('financial') || lower.includes('finance') || lower.includes('accounting')) {
        return { consolidated: 'financial_services', category: 'Business Functions' };
    }

    if (lower.includes('marketing') || lower.includes('advertising') || lower.includes('promotion')) {
        return { consolidated: 'marketing', category: 'Business Functions' };
    }

    if (lower.includes('sales') || lower.includes('revenue') || lower.includes('commercial')) {
        return { consolidated: 'sales', category: 'Business Functions' };
    }

    if (lower.includes('operations') || lower.includes('operational') || lower.includes('manufacturing')) {
        return { consolidated: 'operations', category: 'Business Functions' };
    }

    if (lower.includes('hr') || lower.includes('human_resources') || lower.includes('talent') ||
        lower.includes('workforce')) {
        return { consolidated: 'human_resources', category: 'Business Functions' };
    }

    // === MARKET TAGS ===
    if (lower.includes('consumer') || lower.includes('retail') || lower.includes('b2c')) {
        return { consolidated: 'consumer_market', category: 'Market Segments' };
    }

    if (lower.includes('enterprise') || lower.includes('business') || lower.includes('b2b') ||
        lower.includes('commercial')) {
        return { consolidated: 'enterprise_market', category: 'Market Segments' };
    }

    if (lower.includes('international') || lower.includes('global') || lower.includes('overseas')) {
        return { consolidated: 'international', category: 'Market Segments' };
    }

    // === REGULATORY TAGS ===
    if (lower.includes('regulatory') || lower.includes('compliance') || lower.includes('legal')) {
        return { consolidated: 'regulatory', category: 'Regulatory' };
    }

    if (lower.includes('privacy') || lower.includes('data_protection') || lower.includes('gdpr')) {
        return { consolidated: 'privacy', category: 'Regulatory' };
    }

    if (lower.includes('antitrust') || lower.includes('competition_law') || lower.includes('monopoly')) {
        return { consolidated: 'antitrust', category: 'Regulatory' };
    }

    // === FINANCIAL TAGS ===
    if (lower.includes('earnings') || lower.includes('profit') || lower.includes('income')) {
        return { consolidated: 'earnings', category: 'Financial' };
    }

    if (lower.includes('investment') || lower.includes('capital') || lower.includes('funding')) {
        return { consolidated: 'investment', category: 'Financial' };
    }

    if (lower.includes('valuation') || lower.includes('market_cap') || lower.includes('worth')) {
        return { consolidated: 'valuation', category: 'Financial' };
    }

    // Default fallback
    console.log(`⚠️  UNMAPPED TAG: ${original}`);
    return { consolidated: 'general', category: 'General' };
}

// Process all mappings
console.log('🔄 Creating complete mappings for all categories...\n');

// === FACTOR NAMES MAPPING ===
console.log('📊 Processing Factor Names...');
const factorMapping: Record<string, { category: string, original_terms: string[] }> = {};

// Initialize with consolidated factors
const consolidatedFactors = [
    'analyst_rating_change', 'revenue_growth_rate', 'operating_margin', 'earnings_per_share', 'cost_level', 'profitability',
    'market_share', 'stock_price', 'market_volatility', 'valuation_multiple', 'brand_value',
    'production_capacity', 'supply_availability', 'manufacturing_efficiency', 'operational_costs', 'product_quality_index', 'workforce_effectiveness',
    'investment_level', 'capital_expenditure', 'r_and_d_spending', 'cash_flow', 'debt_level',
    'competitive_pressure', 'product_innovation_rate', 'product_differentiation', 'technology_adoption', 'partnership_strength', 'innovation_pipeline_strength', 'distribution_effectiveness',
    'customer_demand', 'customer_sentiment', 'customer_buying_power', 'customer_retention_rate', 'product_refresh_cycle', 'sales_efficiency', 'digital_engagement_level',
    'investor_sentiment', 'analyst_confidence', 'market_perception', 'reputation_index', 'market_intelligence_index',
    'tariff_impact', 'geopolitical_risk', 'macroeconomic_conditions', 'interest_rate_sensitivity', 'currency_exposure',
    'technology_advancement_rate', 'digital_transformation_level',
    'cybersecurity_risk', 'compliance_risk', 'supply_chain_risk', 'talent_retention_risk', 'technology_obsolescence_risk', 'regulatory_risk'
];

const factorCategories: Record<string, string> = {
    'analyst_rating_change': 'Financial Performance', 'revenue_growth_rate': 'Financial Performance', 'operating_margin': 'Financial Performance', 'earnings_per_share': 'Financial Performance', 'cost_level': 'Financial Performance', 'profitability': 'Financial Performance',
    'market_share': 'Market Position', 'stock_price': 'Market Position', 'market_volatility': 'Market Position', 'valuation_multiple': 'Market Position', 'brand_value': 'Market Position',
    'production_capacity': 'Operational Metrics', 'supply_availability': 'Operational Metrics', 'manufacturing_efficiency': 'Operational Metrics', 'operational_costs': 'Operational Metrics', 'product_quality_index': 'Operational Metrics', 'workforce_effectiveness': 'Operational Metrics',
    'investment_level': 'Investment & Capital', 'capital_expenditure': 'Investment & Capital', 'r_and_d_spending': 'Investment & Capital', 'cash_flow': 'Investment & Capital', 'debt_level': 'Investment & Capital',
    'competitive_pressure': 'Strategic Factors', 'product_innovation_rate': 'Strategic Factors', 'product_differentiation': 'Strategic Factors', 'technology_adoption': 'Strategic Factors', 'partnership_strength': 'Strategic Factors', 'innovation_pipeline_strength': 'Strategic Factors', 'distribution_effectiveness': 'Strategic Factors',
    'customer_demand': 'Customer Dynamics', 'customer_sentiment': 'Customer Dynamics', 'customer_buying_power': 'Customer Dynamics', 'customer_retention_rate': 'Customer Dynamics', 'product_refresh_cycle': 'Customer Dynamics', 'sales_efficiency': 'Customer Dynamics', 'digital_engagement_level': 'Customer Dynamics',
    'investor_sentiment': 'Market Sentiment', 'analyst_confidence': 'Market Sentiment', 'market_perception': 'Market Sentiment', 'reputation_index': 'Market Sentiment', 'market_intelligence_index': 'Market Sentiment',
    'tariff_impact': 'External Factors', 'geopolitical_risk': 'External Factors', 'macroeconomic_conditions': 'External Factors', 'interest_rate_sensitivity': 'External Factors', 'currency_exposure': 'External Factors',
    'technology_advancement_rate': 'Technology Factors', 'digital_transformation_level': 'Technology Factors',
    'cybersecurity_risk': 'Risk Factors', 'compliance_risk': 'Risk Factors', 'supply_chain_risk': 'Risk Factors', 'talent_retention_risk': 'Risk Factors', 'technology_obsolescence_risk': 'Risk Factors', 'regulatory_risk': 'Risk Factors'
};

consolidatedFactors.forEach(factor => {
    factorMapping[factor] = { category: factorCategories[factor], original_terms: [] };
});

let factorMappedCount = 0;
let factorUnmappedCount = 0;

originalFactors.forEach(factor => {
    const result = mapFactorName(factor);
    if (factorMapping[result.consolidated]) {
        factorMapping[result.consolidated].original_terms.push(factor);
        factorMappedCount++;
    } else {
        factorUnmappedCount++;
    }
});

console.log(`✅ Mapped ${factorMappedCount} factors`);
console.log(`❌ Unmapped ${factorUnmappedCount} factors\n`);

// === EVENT TYPES MAPPING ===
console.log('📅 Processing Event Types...');
const eventMapping: Record<string, { category: string, original_terms: string[] }> = {};

const consolidatedEvents = [
    'earnings_report', 'analyst_update', 'guidance_update', 'capital_return',
    'product_launch', 'product_update', 'product_issue', 'product_discontinuation',
    'acquisition', 'partnership', 'investment_decision', 'restructuring',
    'leadership_change', 'executive_communication', 'board_change',
    'public_offering', 'stock_split', 'index_change',
    'regulatory_change', 'legal_action', 'investigation',
    'operational_change', 'supply_chain_event', 'facility_change',
    'strategy_announcement', 'market_expansion', 'market_update'
];

const eventCategories: Record<string, string> = {
    'earnings_report': 'Financial Events', 'analyst_update': 'Financial Events', 'guidance_update': 'Financial Events', 'capital_return': 'Financial Events',
    'product_launch': 'Product Events', 'product_update': 'Product Events', 'product_issue': 'Product Events', 'product_discontinuation': 'Product Events',
    'acquisition': 'Business Events', 'partnership': 'Business Events', 'investment_decision': 'Business Events', 'restructuring': 'Business Events',
    'leadership_change': 'Leadership Events', 'executive_communication': 'Leadership Events', 'board_change': 'Leadership Events',
    'public_offering': 'Market Events', 'stock_split': 'Market Events', 'index_change': 'Market Events', 'market_update': 'Market Events',
    'regulatory_change': 'Regulatory Events', 'legal_action': 'Regulatory Events', 'investigation': 'Regulatory Events',
    'operational_change': 'Operational Events', 'supply_chain_event': 'Operational Events', 'facility_change': 'Operational Events',
    'strategy_announcement': 'Strategic Events', 'market_expansion': 'Strategic Events'
};

consolidatedEvents.forEach(event => {
    eventMapping[event] = { category: eventCategories[event], original_terms: [] };
});

let eventMappedCount = 0;
let eventUnmappedCount = 0;

originalEvents.forEach(event => {
    const result = mapEventType(event);
    if (eventMapping[result.consolidated]) {
        eventMapping[result.consolidated].original_terms.push(event);
        eventMappedCount++;
    } else {
        eventUnmappedCount++;
    }
});

console.log(`✅ Mapped ${eventMappedCount} events`);
console.log(`❌ Unmapped ${eventUnmappedCount} events\n`);

// === EVENT TAGS MAPPING ===
console.log('🏷️  Processing Event Tags...');
const tagMapping: Record<string, { category: string, original_terms: string[] }> = {};

const consolidatedTags = [
    'ai', 'semiconductor', 'cloud_computing', 'software', 'hardware',
    'financial_services', 'marketing', 'sales', 'operations', 'human_resources',
    'consumer_market', 'enterprise_market', 'international',
    'regulatory', 'privacy', 'antitrust',
    'earnings', 'investment', 'valuation',
    'general'
];

const tagCategories: Record<string, string> = {
    'ai': 'Technology', 'semiconductor': 'Technology', 'cloud_computing': 'Technology', 'software': 'Technology', 'hardware': 'Technology',
    'financial_services': 'Business Functions', 'marketing': 'Business Functions', 'sales': 'Business Functions', 'operations': 'Business Functions', 'human_resources': 'Business Functions',
    'consumer_market': 'Market Segments', 'enterprise_market': 'Market Segments', 'international': 'Market Segments',
    'regulatory': 'Regulatory', 'privacy': 'Regulatory', 'antitrust': 'Regulatory',
    'earnings': 'Financial', 'investment': 'Financial', 'valuation': 'Financial',
    'general': 'General'
};

consolidatedTags.forEach(tag => {
    tagMapping[tag] = { category: tagCategories[tag], original_terms: [] };
});

let tagMappedCount = 0;
let tagUnmappedCount = 0;

originalTags.forEach(tag => {
    const result = mapEventTag(tag);
    if (tagMapping[result.consolidated]) {
        tagMapping[result.consolidated].original_terms.push(tag);
        tagMappedCount++;
    } else {
        tagUnmappedCount++;
    }
});

console.log(`✅ Mapped ${tagMappedCount} tags`);
console.log(`❌ Unmapped ${tagUnmappedCount} tags\n`);

// Save all mappings
fs.writeFileSync(
    path.join(__dirname, '../mappings/factor_names_mapping_complete.json'),
    JSON.stringify(factorMapping, null, 2)
);

fs.writeFileSync(
    path.join(__dirname, '../mappings/event_types_mapping_complete.json'),
    JSON.stringify(eventMapping, null, 2)
);

fs.writeFileSync(
    path.join(__dirname, '../mappings/event_tags_mapping_complete.json'),
    JSON.stringify(tagMapping, null, 2)
);

console.log('📄 All complete mappings saved!');
console.log(`\n🎯 FINAL SUMMARY:`);
console.log(`📊 Factors: ${factorMappedCount}/${originalFactors.length} mapped (${Math.round(factorMappedCount / originalFactors.length * 100)}%)`);
console.log(`📅 Events: ${eventMappedCount}/${originalEvents.length} mapped (${Math.round(eventMappedCount / originalEvents.length * 100)}%)`);
console.log(`🏷️  Tags: ${tagMappedCount}/${originalTags.length} mapped (${Math.round(tagMappedCount / originalTags.length * 100)}%)`);
