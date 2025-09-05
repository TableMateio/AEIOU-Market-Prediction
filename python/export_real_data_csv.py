#!/usr/bin/env python3
"""
Export Real ML Data to CSV for Correlation Analysis
Uses MCP Supabase tools to export data in batches
"""

import pandas as pd
import json
from datetime import datetime
import os

def create_csv_from_json_batches():
    """
    Create CSV from JSON data exported via MCP tools
    """
    print("📊 Creating CSV from real ml_training_data...")
    
    # We'll get the data via MCP queries and save to CSV
    # For now, create the structure to receive the data
    
    output_dir = '/Users/scottbergman/Dropbox/Projects/AEIOU/ml_data'
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    csv_path = os.path.join(output_dir, f'FULL_ml_training_data_{timestamp}.csv')
    
    print(f"📁 Will export to: {csv_path}")
    
    return csv_path

if __name__ == "__main__":
    create_csv_from_json_batches()
