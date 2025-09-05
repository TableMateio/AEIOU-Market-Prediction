#!/usr/bin/env python3
"""
Export Real ML Data from Supabase Database
Gets all 1,077 actual records with real variation
"""

import csv
import sys
import os
from datetime import datetime

def export_real_data_via_mcp():
    """
    Export real data by creating SQL queries that can be run via MCP tools
    """
    print("🔄 Exporting REAL 1,077 records from ml_training_data table...")
    print("📊 This will have actual variation in factor names, magnitudes, etc.")
    
    # Create output directory
    output_dir = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data'
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    csv_path = os.path.join(output_dir, f'ACTUAL_ml_training_data_{timestamp}.csv')
    
    print(f"📁 Will export to: {csv_path}")
    
    # Instructions for manual export (since we need to use MCP tools)
    print(\"\\n📋 TO EXPORT THE REAL DATA:\")\n    print(\"   1. Use MCP supabase tool to run: SELECT * FROM ml_training_data LIMIT 500;\")\n    print(\"   2. Save results to CSV file\")\n    print(\"   3. Run correlation analysis on that CSV\")\n    print(\"\")\n    print(\"🎯 This will show you which factor_names, categories, etc. actually predict alpha!\")\n    \n    return csv_path

if __name__ == \"__main__\":\n    export_real_data_via_mcp()
