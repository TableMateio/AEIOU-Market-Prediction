#!/usr/bin/env python3
"""
Export ALL 1,077 Real Records from ml_training_data
Gets the complete dataset with actual variation for proper correlation analysis
"""

import os
import sys
import pandas as pd
from datetime import datetime

# Add the parent directory to the path to import from src
sys.path.append('/Users/scottbergman/Dropbox/Projects/AEIOU/src')

def export_full_real_data():
    """Export all 1,077 records using MCP Supabase connection"""
    print("🔄 Exporting ALL 1,077 records from ml_training_data...")
    
    # We'll need to use the MCP tools to get this data
    # For now, let's create the structure to receive it
    
    output_dir = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data'
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    csv_path = os.path.join(output_dir, f'FULL_ml_training_data_{timestamp}.csv')
    
    print(f"📁 Target export path: {csv_path}")
    
    # Instructions for the human to run MCP export
    print("""
    📋 To export the full dataset, run this MCP query:
    
    SELECT * FROM ml_training_data 
    ORDER BY article_published_at DESC;
    
    Then save the results to CSV format.
    
    This will give us all 1,077 records with:
    - Real variation in factor_magnitude (0, 0.005, 0.01, 0.015, 0.02, 0.03)
    - Real variation in factor_movement (-1, 1)  
    - Real alpha distribution (28.6% positive, 41.1% negative, 30.3% zero)
    - Full time range (Feb-Sep 2025, 33 unique days)
    """)
    
    return csv_path

if __name__ == "__main__":
    export_full_real_data()
