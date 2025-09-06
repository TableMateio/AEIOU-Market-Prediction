#!/usr/bin/env python3
"""
Execute MCP query and continue with ML pipeline
"""
import pandas as pd
import json
from datetime import datetime
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def execute_full_mcp_query():
    """Execute the full MCP query and save results to CSV"""
    
    print("🎯 EXECUTING FULL MCP QUERY FOR REAL DATA")
    print("=" * 60)
    
    # Import the feature config and pipeline runner
    from feature_config import FEATURE_CONFIG
    from run_ml_pipeline import AEIOUPipelineRunner
    
    # Initialize runner to get proper paths
    runner = AEIOUPipelineRunner()
    
    # Generate timestamp and paths
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    data_dir = Path(__file__).parent.parent / "data" / "exports"
    data_dir.mkdir(parents=True, exist_ok=True)
    export_path = data_dir / f"REAL_apple_training_data_{timestamp}.csv"
    
    print(f"📊 Target: {FEATURE_CONFIG.primary_target}")
    print(f"💾 Export path: {export_path}")
    
    # Build the query with essential columns first (avoiding binary flags for now)
    essential_columns = [
        "article_id",
        "article_published_at", 
        FEATURE_CONFIG.primary_target,
        FEATURE_CONFIG.secondary_target,
        "consolidated_event_type",
        "consolidated_factor_name", 
        "consolidated_event_tags",
        "event_tag_category",
        "factor_category",
        "event_orientation",
        "factor_orientation", 
        "evidence_level",
        "evidence_source",
        "market_regime",
        "article_audience_split",
        "event_trigger",
        "market_perception_emotional_profile",
        "market_perception_cognitive_biases",
        "factor_magnitude",
        "factor_movement",
        "causal_certainty",
        "article_source_credibility",
        "market_perception_intensity",
        "market_perception_hope_vs_fear",
        "market_perception_surprise_vs_anticipated",
        "market_perception_consensus_vs_division",
        "market_perception_narrative_strength",
        "ai_assessment_execution_risk",
        "ai_assessment_competitive_risk",
        "ai_assessment_business_impact_likelihood",
        "ai_assessment_timeline_realism",
        "ai_assessment_fundamental_strength",
        "perception_gap_optimism_bias",
        "perception_gap_risk_awareness",
        "perception_gap_correction_potential",
        "regime_alignment",
        "reframing_potential",
        "narrative_disruption",
        "logical_directness",
        "market_consensus_on_causality",
        "article_author_credibility",
        "article_publisher_credibility",
        "article_time_lag_days",
        "factor_effect_horizon_days",
        "factor_about_time_days"
    ]
    
    # Create SQL query
    sql_query = f"""
    SELECT {', '.join(essential_columns)}
    FROM ml_training_data 
    WHERE consolidated_factor_name IS NOT NULL
    AND {FEATURE_CONFIG.primary_target} IS NOT NULL
    ORDER BY article_published_at ASC;
    """
    
    print("🔄 Executing MCP query...")
    print(f"📈 Requesting {len(essential_columns)} essential columns")
    
    # We'll need to use MCP via the external environment
    # For now, let's prepare the query and return the info needed
    return {
        "sql_query": sql_query,
        "export_path": str(export_path),
        "timestamp": timestamp,
        "essential_columns": essential_columns
    }

def continue_pipeline_after_data_export(export_path: str):
    """Continue the ML pipeline after data has been exported"""
    
    print("▶️  CONTINUING ML PIPELINE AFTER DATA EXPORT")
    print("=" * 50)
    
    if not os.path.exists(export_path):
        print(f"❌ Data file not found: {export_path}")
        return None
    
    # Import and run the ML pipeline
    from run_ml_pipeline import AEIOUPipelineRunner
    
    runner = AEIOUPipelineRunner()
    results_dir = runner.run_ml_models(export_path)
    
    print("🎉 COMPLETE PIPELINE FINISHED!")
    print(f"📁 Results: {results_dir}")
    
    return results_dir

if __name__ == "__main__":
    config = execute_full_mcp_query()
    print("\n" + "="*60)
    print("🎯 MCP QUERY CONFIGURATION READY")
    print("="*60)
    print(f"📊 Export path: {config['export_path']}")
    print(f"🔧 Essential columns: {len(config['essential_columns'])}")
    print(f"⏰ Timestamp: {config['timestamp']}")
    print("\n🚀 Ready for MCP execution!")
    print("\nSQL Query:")
    print(config['sql_query'])
