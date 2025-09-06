#!/usr/bin/env python3
"""
Export REAL Apple Data with Correct Target
Raw Apple percentage change (not alpha vs SPY) + all features
"""

import pandas as pd
from datetime import datetime
import os

def export_real_apple_data():
    """Export the correct Apple data with raw percentage change target"""
    
    print("🍎 EXPORTING REAL APPLE DATA")
    print("=" * 50)
    print("🎯 Target: Raw Apple percentage change (price_1day_after - price_at_event) / price_at_event * 100")
    print("📊 Expected: 9,817 complete records")
    
    # Create timestamped filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_path = f"/Users/scottbergman/Dropbox/Projects/AEIOU/data/exports/real_apple_data_{timestamp}.csv"
    
    # SQL to get ALL the features + raw prices for target calculation
    sql_query = """
    SELECT 
      article_id,
      article_published_at,
      
      -- Consolidated features
      consolidated_event_tags,
      consolidated_event_type,
      consolidated_factor_name,
      event_tag_category,
      factor_category,
      
      -- Core numerical features
      factor_magnitude,
      factor_movement,
      causal_certainty,
      article_source_credibility,
      market_perception_intensity,
      
      -- Extended numerical features (from your schema)
      market_perception_hope_vs_fear,
      market_perception_surprise_vs_anticipated,
      market_perception_consensus_vs_division,
      market_perception_narrative_strength,
      ai_assessment_execution_risk,
      ai_assessment_competitive_risk,
      ai_assessment_business_impact_likelihood,
      ai_assessment_timeline_realism,
      ai_assessment_fundamental_strength,
      perception_gap_optimism_bias,
      perception_gap_risk_awareness,
      perception_gap_correction_potential,
      regime_alignment,
      reframing_potential,
      narrative_disruption,
      logical_directness,
      market_consensus_on_causality,
      article_author_credibility,
      article_publisher_credibility,
      article_time_lag_days,
      
      -- Raw prices for target calculation
      price_at_event,
      price_1day_after,
      price_1week_after,
      
      -- Also include the pre-calculated signed change if available
      abs_change_1day_after_pct
      
    FROM ml_training_data 
    WHERE consolidated_factor_name IS NOT NULL
    AND price_at_event IS NOT NULL
    AND price_1day_after IS NOT NULL
    ORDER BY article_published_at ASC;
    """
    
    print("🔄 This would use MCP to export the data...")
    print(f"📁 Export path: {export_path}")
    print("⚠️  Run this query with MCP to get the real data")
    
    return sql_query, export_path

if __name__ == "__main__":
    query, path = export_real_apple_data()
    print("\n" + "="*60)
    print("SQL QUERY TO RUN:")
    print("="*60)
    print(query)
