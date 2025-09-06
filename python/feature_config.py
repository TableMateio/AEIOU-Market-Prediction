#!/usr/bin/env python3
"""
AEIOU Feature Configuration
Centralized feature definitions based on schema and consolidated lists
"""

from dataclasses import dataclass
from typing import List, Dict

@dataclass
class FeatureConfig:
    """Complete feature configuration for AEIOU ML pipeline"""
    
    # TARGET CONFIGURATION
    primary_target: str = 'abs_change_1day_after_pct'  # Calculate from prices
    secondary_target: str = 'abs_change_1week_after_pct'  # Calculate from prices
    # target_calculation: str = '(price_1day_after - price_at_event) / price_at_event * 100'
    
    # CONSOLIDATED LISTS (from enum files)
    consolidated_event_tags: List[str] = None
    consolidated_event_types: List[str] = None  
    consolidated_factor_names: List[str] = None
    event_tags_categories: List[str] = None
    factor_names_categories: List[str] = None
    
    # CATEGORICAL FEATURES
    categorical_features: List[str] = None
    
    # NUMERICAL FEATURES
    core_numerical_features: List[str] = None
    extended_numerical_features: List[str] = None
    
    def __post_init__(self):
        """Initialize feature lists"""
        
        # Event Tags (58 total from consolidated_event_tags.md)
        self.consolidated_event_tags = [
            # Technology & Innovation
            'ai', 'hardware', 'software', 'semiconductor', 'cloud_services', 'data_center',
            'cybersecurity', 'blockchain', 'vr_ar', 'autonomous_tech', 'space_tech',
            # Financial & Markets  
            'earnings', 'revenue_growth', 'operating_margin', 'valuation', 'market_sentiment',
            'investor_sentiment', 'capital_allocation', 'investment_strategy',
            # Business Operations
            'product_innovation', 'product_launch', 'manufacturing', 'supply_chain',
            'business_strategy', 'partnership', 'acquisition', 'competitive_pressure',
            # Regulatory & Legal
            'regulatory', 'legal_ruling', 'antitrust', 'government_policy', 'trade_policy',
            'export_controls', 'privacy', 'compliance',
            # Market & Industry
            'market_share', 'customer_demand', 'brand_reputation', 'advertising', 'ecommerce',
            'financial_services', 'gaming', 'streaming', 'energy',
            # Geographic & Political
            'geopolitical', 'china', 'india', 'tariff', 'macroeconomic', 'currency',
            # Corporate Governance
            'executive_change', 'leadership', 'shareholder_relations', 'corporate_strategy',
            # External Factors
            'cost_increase', 'supply_disruption', 'regulatory_change', 'economic_conditions'
        ]
        
        # Event Types (12 total from consolidated_event_types.md)
        self.consolidated_event_types = [
            'analyst_update', 'earnings_report', 'product_launch', 'partnership',
            'acquisition', 'regulatory_change', 'strategy_announcement', 'guidance_update',
            'operational_change', 'market_update', 'supply_chain_event', 'investment_decision'
        ]
        
        # Factor Names (76 total from consolidated_factor_names.md)
        self.consolidated_factor_names = [
            # Financial Performance
            'analyst_rating_change', 'revenue_growth_rate', 'operating_margin', 'earnings_per_share',
            'cost_level', 'profitability',
            # Market Position
            'market_share', 'stock_price', 'market_volatility', 'valuation_multiple', 'brand_value',
            # Operational Metrics
            'production_capacity', 'supply_availability', 'manufacturing_efficiency', 'operational_costs',
            'product_quality_index', 'workforce_effectiveness',
            # Investment & Capital
            'investment_level', 'capital_expenditure', 'r_and_d_spending', 'cash_flow', 'debt_level',
            # Strategic Factors
            'competitive_pressure', 'product_innovation_rate', 'product_differentiation',
            'technology_adoption', 'partnership_strength', 'innovation_pipeline_strength',
            'distribution_effectiveness',
            # Customer Dynamics
            'customer_demand', 'customer_sentiment', 'customer_buying_power', 'customer_retention_rate',
            'product_refresh_cycle', 'sales_efficiency', 'digital_engagement_level',
            # Market Sentiment
            'investor_sentiment', 'analyst_confidence', 'market_perception', 'reputation_index',
            'market_intelligence_index',
            # External Factors
            'tariff_impact', 'geopolitical_risk', 'macroeconomic_conditions', 'interest_rate_sensitivity',
            'currency_exposure',
            # Technology Factors
            'technology_advancement_rate', 'digital_transformation_level',
            # Risk Factors
            'cybersecurity_risk', 'compliance_risk', 'supply_chain_risk', 'talent_retention_risk',
            'technology_obsolescence_risk', 'regulatory_risk'
        ]
        
        # Categorical Features (single value per record)
        self.categorical_features = [
            'consolidated_event_type',       # 12 event types (matches self.consolidated_event_types)
            'consolidated_factor_name',      # 76 factor names (matches self.consolidated_factor_names)
            'factor_category',              # Factor categories from factor_names_categories
            
            # Additional categorical features from schema
            'event_orientation',            # predictive, reflective, both, neutral
            'factor_orientation',           # predictive, reflective, both, neutral
            'evidence_level',               # explicit, implied, model
            'evidence_source',              # article_text, press_release, analyst_report, etc.
            'market_regime',                # bull, bear, neutral, unknown
            'article_audience_split',       # institutional, retail, both, neither
            'event_trigger',                # press_release, earnings_call, filing, etc.
        ]
        
        # Event Tag Categories (can have multiples - binary flags)
        self.event_tag_categories = [
            'Business Functions', 'Financial', 'General', 'Regulatory', 'Technology', 'unknown'
        ]
        
        # NOTE: These are now handled as BINARY FLAGS, not categorical:
        # - 'consolidated_event_tags' -> converted to binary flags (ai_tag_present, etc.)
        # - 'market_perception_emotional_profile' -> converted to binary flags (emotion_optimism_present, etc.)
        # - 'market_perception_cognitive_biases' -> converted to binary flags (bias_confirmation_bias_present, etc.)
        # - 'event_tag_category' -> converted to binary flags (category_technology_present, etc.)
        
        # Core Numerical Features (always available)
        self.core_numerical_features = [
            'factor_movement',             # Direction: +1, -1, 0
            'signed_magnitude_scaled'      # Directional business impact (scaled × 100)
        ]
        # Note: Removed 'factor_magnitude' as it's redundant with signed_magnitude
        
        # Extended Numerical Features (from schema - check availability)
        self.extended_numerical_features = [
            'causal_certainty',           # Causal confidence (0-1)
            'article_source_credibility',  # Source reliability (0-1)
            'market_perception_intensity', # Market buzz (0-1)

            # Market Perception
            'market_perception_hope_vs_fear',
            'market_perception_surprise_vs_anticipated', 
            'market_perception_consensus_vs_division',
            'market_perception_narrative_strength',
            
            # AI Assessment
            'ai_assessment_execution_risk',
            'ai_assessment_competitive_risk',
            'ai_assessment_business_impact_likelihood',
            'ai_assessment_timeline_realism',
            'ai_assessment_fundamental_strength',
            
            # Perception Gap
            'perception_gap_optimism_bias',
            'perception_gap_risk_awareness',
            'perception_gap_correction_potential',
            
            # Market Context
            'regime_alignment',
            'reframing_potential',
            'narrative_disruption',
            'logical_directness',
            'market_consensus_on_causality',
            
            # Article Features
            'article_author_credibility',
            'article_publisher_credibility',
            'article_time_lag_days',
            
            # Additional scalar features from schema
            'factor_effect_horizon_days',   # How far into future the factor impacts
            'factor_about_time_days'        # Time reference point for the factor
        ]

        self.factor_category = [
            'Financial Performance',
            'Market Position',
            'Operational Metrics', 
            'Investment & Capital',
            'Strategic Factors',
            'Customer Dynamics',
            'Market Sentiment',
            'External Factors',
            'Technology Factors',
            'Risk Factors'
        ]

        self.event_tags_categories = [
            'Technology & Innovation',
            'Financial & Markets',
            'Business Operations',
            'Regulatory & Legal',
            'Market & Industry',
            'Geographic & Political',
            'Corporate Governance',
            'External Factors'
        ]
        
        # Additional categorical enums from schema
        self.orientation_values = ['predictive', 'reflective', 'both', 'neutral']
        self.evidence_level_values = ['explicit', 'implied', 'model']
        self.evidence_source_values = [
            'article_text', 'press_release', 'analyst_report', 'company_statement',
            'regulatory_filing', 'model_inference', 'social_media', 'other'
        ]
        self.market_regime_values = ['bull', 'bear', 'neutral', 'unknown']
        self.audience_split_values = ['institutional', 'retail', 'both', 'neither']
        self.event_trigger_values = [
            'press_release', 'earnings_call', 'filing', 'analyst_report',
            'media_report', 'rumor', 'social', 'other'
        ]
        
        # Emotional profile and cognitive biases (arrays - need special handling)
        self.emotional_profile_values = [
            'anticipation', 'excitement', 'optimism', 'confidence', 'relief', 'satisfaction',
            'interest', 'surprise', 'uncertainty', 'concern', 'skepticism', 'disappointment',
            'fear', 'anger', 'disgust', 'indifference', 'FOMO', 'greed', 'euphoria',
            'panic', 'dread', 'complacency'
        ]
        self.cognitive_biases_values = [
            'availability_heuristic', 'anchoring_bias', 'confirmation_bias', 'optimism_bias',
            'overconfidence_bias', 'loss_aversion', 'sunk_cost_fallacy', 'hindsight_bias',
            'recency_bias', 'herding_behavior', 'authority_bias', 'halo_effect',
            'planning_fallacy', 'survivorship_bias', 'dunning_kruger_effect'
        ]
    
    def get_all_numerical_features(self) -> List[str]:
        """Get all numerical features (core + extended)"""
        return self.core_numerical_features + self.extended_numerical_features
    
    def get_binary_flag_features(self) -> List[str]:
        """Get binary flag feature names (one for each event tag)"""
        return [f"{tag}_tag_present" for tag in self.consolidated_event_tags]
    
    def get_emotional_profile_flags(self) -> List[str]:
        """Get binary flag feature names for emotional profiles"""
        return [f"emotion_{emotion}_present" for emotion in self.emotional_profile_values]
    
    def get_cognitive_bias_flags(self) -> List[str]:
        """Get binary flag feature names for cognitive biases"""
        return [f"bias_{bias}_present" for bias in self.cognitive_biases_values]
    
    def get_event_tag_category_flags(self) -> List[str]:
        """Get event tag category binary flag features"""
        return [f"category_{cat.lower().replace(' ', '_')}_present" for cat in self.event_tag_categories]
    
    def get_all_binary_flags(self) -> List[str]:
        """Get all binary flag features (event tags + emotions + biases + categories)"""
        return (
            self.get_binary_flag_features() +
            self.get_emotional_profile_flags() +
            self.get_cognitive_bias_flags() +
            self.get_event_tag_category_flags()
        )
    
    def get_all_features(self) -> List[str]:
        """Get all feature names (categorical + numerical + binary flags)"""
        return (self.categorical_features + 
                self.get_all_numerical_features() + 
                self.get_all_binary_flags())
    
    def get_total_feature_count(self) -> int:
        """Get total feature count"""
        return (
            len(self.categorical_features) +
            len(self.get_all_numerical_features()) +
            len(self.get_all_binary_flags())
        )
    
    def print_feature_summary(self):
        """Print feature configuration summary"""
        print("🎯 AEIOU FEATURE CONFIGURATION")
        print("=" * 50)
        print(f"Target: {self.primary_target}")
        print(f"Secondary Target: {self.secondary_target}")
        print()
        print(f"📊 FEATURE COUNTS:")
        print(f"  • Categorical: {len(self.categorical_features)}")
        print(f"  • Core Numerical: {len(self.core_numerical_features)}")
        print(f"  • Extended Numerical: {len(self.extended_numerical_features)}")
        print(f"  • Event Tag Flags: {len(self.get_binary_flag_features())}")
        print(f"  • Emotional Profile Flags: {len(self.get_emotional_profile_flags())}")
        print(f"  • Cognitive Bias Flags: {len(self.get_cognitive_bias_flags())}")
        print(f"  • TOTAL BINARY FLAGS: {len(self.get_all_binary_flags())}")
        print(f"  • TOTAL FEATURES: {self.get_total_feature_count()}")
        print()
        print(f"📋 CONSOLIDATED LISTS:")
        print(f"  • Event Tags: {len(self.consolidated_event_tags)}")
        print(f"  • Event Types: {len(self.consolidated_event_types)}")
        print(f"  • Factor Names: {len(self.consolidated_factor_names)}")
        print(f"  • Emotional Profiles: {len(self.emotional_profile_values)}")
        print(f"  • Cognitive Biases: {len(self.cognitive_biases_values)}")

# Global configuration instance
FEATURE_CONFIG = FeatureConfig()

if __name__ == "__main__":
    FEATURE_CONFIG.print_feature_summary()
