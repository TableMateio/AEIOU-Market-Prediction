#!/usr/bin/env python3
"""
Export REAL Apple data with correct targets using MCP
"""

import pandas as pd
from datetime import datetime
from pathlib import Path

def export_real_data_with_targets():
    """Export the complete dataset with abs_change targets"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    export_dir = Path("/Users/scottbergman/Dropbox/Projects/AEIOU/data/exports")
    export_dir.mkdir(parents=True, exist_ok=True)
    
    export_filename = f"apple_real_data_with_targets_{timestamp}.csv"
    export_path = export_dir / export_filename
    
    print("🎯 EXPORTING REAL APPLE DATA WITH CORRECT TARGETS")
    print("=" * 60)
    print(f"📁 Export path: {export_path}")
    print(f"🎯 Primary target: abs_change_1day_after_pct")
    print(f"🎯 Secondary target: abs_change_1week_after_pct")
    
    # This is the SQL query that should be run with MCP
    sql_query = '''
    SELECT
      article_id,
      article_published_at,

      -- TARGETS (what we want to predict)
      abs_change_1day_after_pct,      -- Primary: Apple 1-day % change
      abs_change_1week_after_pct,     -- Secondary: Apple 1-week % change

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

      -- Extended numerical features (from schema)
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
      article_time_lag_days

    FROM ml_training_data
    WHERE consolidated_factor_name IS NOT NULL
    AND abs_change_1day_after_pct IS NOT NULL
    ORDER BY article_published_at ASC;
    '''
    
    print("\n📋 SQL QUERY TO RUN WITH MCP:")
    print("=" * 50)
    print(sql_query)
    print("=" * 50)
    
    print(f"\n🔄 This should export ~9,817 records with valid targets")
    print(f"💾 Save results to: {export_path}")
    
    return str(export_path), sql_query

if __name__ == "__main__":
    export_path, sql_query = export_real_data_with_targets()
    print(f"\n✅ Ready to export to: {export_path}")
    print("\n🚀 Next step: Run this SQL with MCP to get the real data!")
