#!/usr/bin/env python3
"""
Export Real 12K Data Directly from Database
Get the actual 12,688 records to test Interpretation B approach
"""

import os
import pandas as pd
from datetime import datetime

def export_via_supabase_cli():
    """Export data using Supabase CLI"""
    print("📊 Exporting 12K+ records directly from database...")
    
    # Create output directory
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f'/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data/real_12k_data_{timestamp}.csv'
    
    # Export key columns we need for analysis
    query = """
    SELECT 
        article_id,
        article_published_at,
        factor_name,
        factor_magnitude,
        factor_movement,
        article_source_credibility,
        market_perception_intensity,
        surprise_vs_anticipated,
        alpha_vs_spy_1day_after
    FROM ml_training_data 
    WHERE article_published_at IS NOT NULL 
    AND factor_name IS NOT NULL
    ORDER BY article_published_at DESC
    LIMIT 12000
    """
    
    # Write query to temp file
    query_file = '/tmp/export_query.sql'
    with open(query_file, 'w') as f:
        f.write(query)
    
    print(f"💾 Exporting to: {output_file}")
    print("⏳ This may take a moment...")
    
    return output_file, query

def main():
    """Export the real 12K data"""
    output_file, query = export_via_supabase_cli()
    
    print(f"\n📋 Query to run:")
    print(query)
    print(f"\n📁 Output file: {output_file}")
    print("\n🚀 Next step: Run this query in Supabase or use the MCP tool")

if __name__ == "__main__":
    main()
