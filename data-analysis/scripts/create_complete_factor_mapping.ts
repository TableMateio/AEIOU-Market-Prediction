#!/usr/bin/env bun

import * as fs from 'fs';
import * as path from 'path';

// Read the original factor names
const originalFactors = fs.readFileSync(
    path.join(__dirname, '../current-groupings/unique_factor_names.md'),
    'utf8'
).split('\n').filter(line => line.trim());

// Define the consolidated factors with their categories
const consolidatedFactors = {
    // Financial Performance
    'analyst_rating_change': 'Financial Performance',
    'revenue_growth_rate': 'Financial Performance',
    'operating_margin': 'Financial Performance',
    'earnings_per_share': 'Financial Performance',
    'cost_level': 'Financial Performance',
    'profitability': 'Financial Performance',

    // Market Position
    'market_share': 'Market Position',
    'stock_price': 'Market Position',
    'market_volatility': 'Market Position',
    'valuation_multiple': 'Market Position',
    'brand_value': 'Market Position',

    // Operational Metrics
    'production_capacity': 'Operational Metrics',
    'supply_availability': 'Operational Metrics',
    'manufacturing_efficiency': 'Operational Metrics',
    'operational_costs': 'Operational Metrics',
    'product_quality_index': 'Operational Metrics',
    'workforce_effectiveness': 'Operational Metrics',

    // Investment & Capital
    'investment_level': 'Investment & Capital',
    'capital_expenditure': 'Investment & Capital',
    'r_and_d_spending': 'Investment & Capital',
    'cash_flow': 'Investment & Capital',
    'debt_level': 'Investment & Capital',

    // Strategic Factors
    'competitive_pressure': 'Strategic Factors',
    'product_innovation_rate': 'Strategic Factors',
    'product_differentiation': 'Strategic Factors',
    'technology_adoption': 'Strategic Factors',
    'partnership_strength': 'Strategic Factors',
    'innovation_pipeline_strength': 'Strategic Factors',
    'distribution_effectiveness': 'Strategic Factors',

    // Customer Dynamics
    'customer_demand': 'Customer Dynamics',
    'customer_sentiment': 'Customer Dynamics',
    'customer_buying_power': 'Customer Dynamics',
    'customer_retention_rate': 'Customer Dynamics',
    'product_refresh_cycle': 'Customer Dynamics',
    'sales_efficiency': 'Customer Dynamics',
    'digital_engagement_level': 'Customer Dynamics',

    // Market Sentiment
    'investor_sentiment': 'Market Sentiment',
    'analyst_confidence': 'Market Sentiment',
    'market_perception': 'Market Sentiment',
    'reputation_index': 'Market Sentiment',
    'market_intelligence_index': 'Market Sentiment',

    // External Factors
    'tariff_impact': 'External Factors',
    'geopolitical_risk': 'External Factors',
    'macroeconomic_conditions': 'External Factors',
    'interest_rate_sensitivity': 'External Factors',
    'currency_exposure': 'External Factors',

    // Technology Factors
    'technology_advancement_rate': 'Technology Factors',
    'digital_transformation_level': 'Technology Factors',

    // Risk Factors
    'cybersecurity_risk': 'Risk Factors',
    'compliance_risk': 'Risk Factors',
    'supply_chain_risk': 'Risk Factors',
    'talent_retention_risk': 'Risk Factors',
    'technology_obsolescence_risk': 'Risk Factors',
    'regulatory_risk': 'Risk Factors'
};

// Create mapping patterns
function mapFactorName(original: string): { consolidated: string, category: string } | null {
    const lower = original.toLowerCase();

    // Remove company prefixes
    const cleanName = lower
        .replace(/^(apple_|berkshire_|nvidia_|meta_|alphabet_|tesla_|amazon_|google_|microsoft_|openai_|roku_|palantir_|qualcomm_|tsmc_|samsung_|foxconn_|uipath_|serviceNow_|oklo_|iac_|partiful_|costco_|buffett_)/, '');

    // Analyst-related terms
    if (cleanName.includes('analyst') || cleanName.includes('rating') || cleanName.includes('price_target') || cleanName.includes('forecast') || cleanName.includes('estimate')) {
        return { consolidated: 'analyst_rating_change', category: 'Financial Performance' };
    }

    // Revenue growth terms
    if (cleanName.includes('revenue') && (cleanName.includes('growth') || cleanName.includes('increase') || cleanName.includes('change'))) {
        return { consolidated: 'revenue_growth_rate', category: 'Financial Performance' };
    }

    // Operating/gross margin terms
    if (cleanName.includes('margin') || cleanName.includes('profitability')) {
        return { consolidated: 'operating_margin', category: 'Financial Performance' };
    }

    // Earnings terms
    if (cleanName.includes('earnings') || cleanName.includes('eps') || cleanName.includes('diluted')) {
        return { consolidated: 'earnings_per_share', category: 'Financial Performance' };
    }

    // Cost-related terms
    if (cleanName.includes('cost') || cleanName.includes('expense') || cleanName.includes('spending') && !cleanName.includes('r_and_d') && !cleanName.includes('capex') && !cleanName.includes('capital')) {
        return { consolidated: 'cost_level', category: 'Financial Performance' };
    }

    // Market share terms
    if (cleanName.includes('market_share') || cleanName.includes('market_position')) {
        return { consolidated: 'market_share', category: 'Market Position' };
    }

    // Stock price terms
    if (cleanName.includes('stock_price') || cleanName.includes('share_price') || cleanName.includes('stock_performance')) {
        return { consolidated: 'stock_price', category: 'Market Position' };
    }

    // Market volatility terms
    if (cleanName.includes('volatility') || cleanName.includes('market_volatility')) {
        return { consolidated: 'market_volatility', category: 'Market Position' };
    }

    // Valuation terms
    if (cleanName.includes('valuation') || cleanName.includes('market_cap') || cleanName.includes('pe_ratio')) {
        return { consolidated: 'valuation_multiple', category: 'Market Position' };
    }

    // Brand terms
    if (cleanName.includes('brand') || cleanName.includes('reputation') && !cleanName.includes('risk')) {
        return { consolidated: 'brand_value', category: 'Market Position' };
    }

    // Production/manufacturing capacity
    if (cleanName.includes('production') && (cleanName.includes('capacity') || cleanName.includes('volume') || cleanName.includes('output'))) {
        return { consolidated: 'production_capacity', category: 'Operational Metrics' };
    }

    // Supply availability
    if (cleanName.includes('supply') && !cleanName.includes('risk') && !cleanName.includes('chain')) {
        return { consolidated: 'supply_availability', category: 'Operational Metrics' };
    }

    // Manufacturing efficiency
    if (cleanName.includes('manufacturing') && (cleanName.includes('efficiency') || cleanName.includes('productivity'))) {
        return { consolidated: 'manufacturing_efficiency', category: 'Operational Metrics' };
    }

    // Operational costs
    if (cleanName.includes('operational') && cleanName.includes('cost')) {
        return { consolidated: 'operational_costs', category: 'Operational Metrics' };
    }

    // Product quality
    if (cleanName.includes('quality') || cleanName.includes('defect') || cleanName.includes('bug') || cleanName.includes('complaint') || cleanName.includes('return_rate')) {
        return { consolidated: 'product_quality_index', category: 'Operational Metrics' };
    }

    // Workforce effectiveness
    if (cleanName.includes('employee') || cleanName.includes('workforce') || cleanName.includes('talent') || cleanName.includes('turnover')) {
        return { consolidated: 'workforce_effectiveness', category: 'Operational Metrics' };
    }

    // Investment level
    if (cleanName.includes('investment') || cleanName.includes('capex') || cleanName.includes('capital_expenditure')) {
        return { consolidated: 'investment_level', category: 'Investment & Capital' };
    }

    // Capital expenditure
    if (cleanName.includes('capital') && (cleanName.includes('expenditure') || cleanName.includes('spending'))) {
        return { consolidated: 'capital_expenditure', category: 'Investment & Capital' };
    }

    // R&D spending
    if (cleanName.includes('r_and_d') || cleanName.includes('research') || cleanName.includes('development')) {
        return { consolidated: 'r_and_d_spending', category: 'Investment & Capital' };
    }

    // Cash flow
    if (cleanName.includes('cash') || cleanName.includes('liquidity')) {
        return { consolidated: 'cash_flow', category: 'Investment & Capital' };
    }

    // Debt level
    if (cleanName.includes('debt') || cleanName.includes('borrowing') || cleanName.includes('financing')) {
        return { consolidated: 'debt_level', category: 'Investment & Capital' };
    }

    // Competitive pressure
    if (cleanName.includes('competitive') || cleanName.includes('competition')) {
        return { consolidated: 'competitive_pressure', category: 'Strategic Factors' };
    }

    // Product innovation
    if (cleanName.includes('innovation') && cleanName.includes('product')) {
        return { consolidated: 'product_innovation_rate', category: 'Strategic Factors' };
    }

    // Product differentiation
    if (cleanName.includes('differentiation') || cleanName.includes('advantage') || cleanName.includes('moat')) {
        return { consolidated: 'product_differentiation', category: 'Strategic Factors' };
    }

    // Technology adoption
    if (cleanName.includes('technology') && (cleanName.includes('adoption') || cleanName.includes('integration'))) {
        return { consolidated: 'technology_adoption', category: 'Strategic Factors' };
    }

    // Partnership strength
    if (cleanName.includes('partnership') || cleanName.includes('alliance')) {
        return { consolidated: 'partnership_strength', category: 'Strategic Factors' };
    }

    // Innovation pipeline
    if (cleanName.includes('patent') || cleanName.includes('pipeline') || (cleanName.includes('innovation') && !cleanName.includes('product'))) {
        return { consolidated: 'innovation_pipeline_strength', category: 'Strategic Factors' };
    }

    // Distribution effectiveness
    if (cleanName.includes('distribution') || cleanName.includes('channel')) {
        return { consolidated: 'distribution_effectiveness', category: 'Strategic Factors' };
    }

    // Customer demand
    if (cleanName.includes('demand') || cleanName.includes('consumer_demand')) {
        return { consolidated: 'customer_demand', category: 'Customer Dynamics' };
    }

    // Customer sentiment
    if (cleanName.includes('customer') && (cleanName.includes('sentiment') || cleanName.includes('satisfaction') || cleanName.includes('confidence'))) {
        return { consolidated: 'customer_sentiment', category: 'Customer Dynamics' };
    }

    // Customer buying power
    if (cleanName.includes('buying_power') || cleanName.includes('purchase') || cleanName.includes('spending')) {
        return { consolidated: 'customer_buying_power', category: 'Customer Dynamics' };
    }

    // Customer retention
    if (cleanName.includes('retention') || cleanName.includes('churn') || cleanName.includes('loyalty')) {
        return { consolidated: 'customer_retention_rate', category: 'Customer Dynamics' };
    }

    // Product refresh cycle
    if (cleanName.includes('cycle') || cleanName.includes('refresh') || cleanName.includes('replacement')) {
        return { consolidated: 'product_refresh_cycle', category: 'Customer Dynamics' };
    }

    // Sales efficiency
    if (cleanName.includes('sales') || cleanName.includes('conversion') || cleanName.includes('acquisition_cost')) {
        return { consolidated: 'sales_efficiency', category: 'Customer Dynamics' };
    }

    // Digital engagement
    if (cleanName.includes('digital') || cleanName.includes('user') || cleanName.includes('engagement') || cleanName.includes('app_store')) {
        return { consolidated: 'digital_engagement_level', category: 'Customer Dynamics' };
    }

    // Investor sentiment
    if (cleanName.includes('investor') && cleanName.includes('sentiment')) {
        return { consolidated: 'investor_sentiment', category: 'Market Sentiment' };
    }

    // Analyst confidence
    if (cleanName.includes('confidence') || cleanName.includes('credibility')) {
        return { consolidated: 'analyst_confidence', category: 'Market Sentiment' };
    }

    // Market perception
    if (cleanName.includes('perception') || cleanName.includes('market_sentiment')) {
        return { consolidated: 'market_perception', category: 'Market Sentiment' };
    }

    // Reputation index
    if (cleanName.includes('reputation') && cleanName.includes('risk')) {
        return { consolidated: 'reputation_index', category: 'Market Sentiment' };
    }

    // Market intelligence
    if (cleanName.includes('intelligence') || cleanName.includes('research') || cleanName.includes('awareness')) {
        return { consolidated: 'market_intelligence_index', category: 'Market Sentiment' };
    }

    // Tariff impact
    if (cleanName.includes('tariff') || cleanName.includes('trade')) {
        return { consolidated: 'tariff_impact', category: 'External Factors' };
    }

    // Geopolitical risk
    if (cleanName.includes('geopolitical') || cleanName.includes('political')) {
        return { consolidated: 'geopolitical_risk', category: 'External Factors' };
    }

    // Macroeconomic conditions
    if (cleanName.includes('macroeconomic') || cleanName.includes('economic') || cleanName.includes('recession')) {
        return { consolidated: 'macroeconomic_conditions', category: 'External Factors' };
    }

    // Interest rate sensitivity
    if (cleanName.includes('interest_rate') || cleanName.includes('fed_rate')) {
        return { consolidated: 'interest_rate_sensitivity', category: 'External Factors' };
    }

    // Currency exposure
    if (cleanName.includes('currency') || cleanName.includes('exchange') || cleanName.includes('fx')) {
        return { consolidated: 'currency_exposure', category: 'External Factors' };
    }

    // Technology advancement
    if (cleanName.includes('ai_') || cleanName.includes('technology') || cleanName.includes('digital')) {
        return { consolidated: 'technology_advancement_rate', category: 'Technology Factors' };
    }

    // Digital transformation
    if (cleanName.includes('transformation') || cleanName.includes('digitization')) {
        return { consolidated: 'digital_transformation_level', category: 'Technology Factors' };
    }

    // Cybersecurity risk
    if (cleanName.includes('cybersecurity') || cleanName.includes('security')) {
        return { consolidated: 'cybersecurity_risk', category: 'Risk Factors' };
    }

    // Compliance risk
    if (cleanName.includes('compliance') || cleanName.includes('legal') || cleanName.includes('regulatory')) {
        return { consolidated: 'compliance_risk', category: 'Risk Factors' };
    }

    // Supply chain risk
    if (cleanName.includes('supply_chain') && cleanName.includes('risk')) {
        return { consolidated: 'supply_chain_risk', category: 'Risk Factors' };
    }

    // Talent retention risk
    if (cleanName.includes('talent') && cleanName.includes('risk')) {
        return { consolidated: 'talent_retention_risk', category: 'Risk Factors' };
    }

    // Technology obsolescence risk
    if (cleanName.includes('obsolescence') || (cleanName.includes('technology') && cleanName.includes('risk'))) {
        return { consolidated: 'technology_obsolescence_risk', category: 'Risk Factors' };
    }

    // Default fallback - try to categorize by common patterns
    console.log(`⚠️  Unmapped factor: ${original}`);
    return null;
}

// Process all factors
const mapping: Record<string, { category: string, original_terms: string[] }> = {};

// Initialize mapping structure
Object.entries(consolidatedFactors).forEach(([consolidated, category]) => {
    mapping[consolidated] = { category, original_terms: [] };
});

let unmappedCount = 0;
let mappedCount = 0;

originalFactors.forEach(factor => {
    const result = mapFactorName(factor);
    if (result) {
        mapping[result.consolidated].original_terms.push(factor);
        mappedCount++;
    } else {
        unmappedCount++;
    }
});

console.log(`✅ Mapped ${mappedCount} factors`);
console.log(`❌ Unmapped ${unmappedCount} factors`);

// Save the complete mapping
fs.writeFileSync(
    path.join(__dirname, '../mappings/factor_names_mapping_complete.json'),
    JSON.stringify(mapping, null, 2)
);

console.log('📄 Complete factor mapping saved to factor_names_mapping_complete.json');
