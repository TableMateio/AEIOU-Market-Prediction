#!/usr/bin/env python3
"""
AEIOU Complete Pipeline Runner
Executes MCP query and runs ML pipeline automatically
"""

import pandas as pd
import sys
import os
from pathlib import Path
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_complete_aeiou_pipeline():
    """Run the complete AEIOU pipeline with real Supabase data"""
    
    print("🎉 AEIOU COMPLETE PIPELINE RUNNER")
    print("=" * 60)
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Step 1: Initialize the pipeline runner
    from run_ml_pipeline import AEIOUPipelineRunner
    runner = AEIOUPipelineRunner()
    
    # Step 2: Get the export configuration
    export_result = runner.export_training_data()
    
    if export_result is None or not isinstance(export_result, tuple):
        print("❌ Failed to prepare data export")
        return None
    
    data_path, sql_query = export_result
    
    # Step 3: Execute the MCP query to get real data
    print("🔄 EXECUTING MCP QUERY FOR REAL DATA")
    print("=" * 50)
    
    # This is where the MCP query gets executed by the external environment
    # The script will pause here for MCP execution
    print("🎯 SQL Query ready for MCP execution:")
    print("📋 QUERY:")
    print(sql_query)
    print()
    print(f"💾 Data will be saved to: {data_path}")
    print()
    print("⏸️  WAITING FOR MCP EXECUTION...")
    print("   (The external environment will execute the MCP query)")
    print("   (Once complete, the ML pipeline will continue)")
    
    return {
        "sql_query": sql_query,
        "data_path": data_path,
        "runner": runner
    }

def continue_after_mcp_export(data_path: str, runner):
    """Continue the pipeline after MCP data export is complete"""
    
    print("▶️  CONTINUING PIPELINE AFTER MCP EXPORT")
    print("=" * 50)
    
    # Verify the data was exported
    if not os.path.exists(data_path):
        print(f"❌ Data file not found: {data_path}")
        print("   Make sure MCP query was executed successfully")
        return None
    
    # Check data
    df = pd.read_csv(data_path)
    print(f"✅ Data loaded: {len(df)} records")
    
    # Continue with ML pipeline
    results_dir = runner.run_ml_models(data_path)
    
    print("🎉 COMPLETE PIPELINE FINISHED!")
    print(f"📁 Results: {results_dir}")
    
    return {
        "data_path": data_path,
        "results_dir": results_dir
    }

if __name__ == "__main__":
    # Run the pipeline preparation
    pipeline_config = run_complete_aeiou_pipeline()
    
    if pipeline_config:
        print("\n" + "="*60)
        print("🎯 PIPELINE CONFIGURATION READY")
        print("="*60)
        print(f"📊 Data path: {pipeline_config['data_path']}")
        print(f"🔧 Runner ready: {type(pipeline_config['runner']).__name__}")
        print("\n🚀 Ready for MCP execution and ML training!")
