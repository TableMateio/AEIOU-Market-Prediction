#!/usr/bin/env python3
"""
CORRECTED Apple Stock Analysis - Apple vs Itself, Real Data, Proper Metrics
"""

import pandas as pd
import numpy as np
from scipy.stats import pearsonr
import json
import os
from datetime import datetime

def analyze_apple_vs_itself():
    """Analyze Apple stock performance vs itself with proper metrics"""
    
    print("🍎 CORRECTED APPLE ANALYSIS - Apple vs Itself")
    print("=" * 60)
    
    # Real data from MCP queries - CORRECTED TARGET VARIABLE
    print("🎯 TARGET VARIABLE: abs_change_1day_after_pct (Apple stock % change 1 day after event)")
    print("📊 TOTAL RECORDS: 12,688")
    print()
    
    # Factor performance analysis (consolidated factor names)
    factor_performance = {
        'revenue_growth_rate': {'count': 1661, 'avg_change': -0.480},
        'market_perception': {'count': 811, 'avg_change': -0.450},
        'cost_level': {'count': 767, 'avg_change': -0.342},
        'operating_margin': {'count': 668, 'avg_change': -0.501},
        'analyst_rating_change': {'count': 512, 'avg_change': -0.037},  # BEST!
        'production_capacity': {'count': 388, 'avg_change': -0.460},
        'tariff_impact': {'count': 383, 'avg_change': -0.110},
        'product_innovation_rate': {'count': 344, 'avg_change': -0.499},
        'stock_price': {'count': 343, 'avg_change': -0.066},
        'market_share': {'count': 342, 'avg_change': -0.868},  # WORST!
        'supply_availability': {'count': 339, 'avg_change': -0.037},
        'investment_level': {'count': 308, 'avg_change': -0.084},
        'customer_sentiment': {'count': 286, 'avg_change': -0.421},
        'technology_advancement_rate': {'count': 272, 'avg_change': -0.409},
        'brand_value': {'count': 259, 'avg_change': -0.403}
    }
    
    # Event type performance (from earlier query)
    event_performance = {
        'analyst_update': {'count': 539, 'avg_change': 0.161},  # Only positive!
        'guidance_update': {'count': 256, 'avg_change': -0.021},
        'regulatory_change': {'count': 2026, 'avg_change': -0.025},
        'market_update': {'count': 6209, 'avg_change': -0.120},
        'supply_chain_event': {'count': 559, 'avg_change': -0.149},
        'strategy_announcement': {'count': 281, 'avg_change': -0.246},
        'operational_change': {'count': 209, 'avg_change': -0.452},
        'product_launch': {'count': 662, 'avg_change': -0.558},
        'earnings_report': {'count': 965, 'avg_change': -0.598},
        'partnership': {'count': 283, 'avg_change': -0.724}
    }
    
    print("🏆 FACTOR PERFORMANCE RANKING (Apple Stock % Change)")
    print("=" * 65)
    
    # Sort factors by performance
    sorted_factors = sorted(factor_performance.items(), key=lambda x: x[1]['avg_change'], reverse=True)
    
    print("| Factor Name | Count | Avg % Change | Performance |")
    print("|-------------|-------|--------------|-------------|")
    
    for factor, data in sorted_factors:
        count = data['count']
        change = data['avg_change']
        
        if change > 0:
            performance = "🚀 POSITIVE"
        elif change > -0.1:
            performance = "📈 Near Zero"
        elif change > -0.3:
            performance = "📉 Negative"
        else:
            performance = "💥 STRONG NEGATIVE"
            
        print(f"| {factor:<25} | {count:>5} | {change:>12.3f} | {performance} |")
    
    print()
    
    # Signed magnitude analysis (your recommendation)
    print("📏 SIGNED MAGNITUDE ANALYSIS")
    print("=" * 35)
    print("Combining factor_movement × factor_magnitude into signed_magnitude")
    print()
    
    # Sample data showing the concept
    magnitude_examples = [
        {'event': 'supply_chain_event', 'magnitude': 0.02, 'movement': -1, 'signed_mag': -0.02, 'actual_change': 1.798},
        {'event': 'market_update', 'magnitude': 0.005, 'movement': 1, 'signed_mag': 0.005, 'actual_change': 1.002},
        {'event': 'regulatory_change', 'magnitude': 0.005, 'movement': -1, 'signed_mag': -0.005, 'actual_change': 2.262},
        {'event': 'market_update', 'magnitude': 0.01, 'movement': 0, 'signed_mag': 0.0, 'actual_change': 3.887},
        {'event': 'analyst_update', 'magnitude': 0.0, 'movement': 1, 'signed_mag': 0.0, 'actual_change': -0.568}
    ]
    
    print("| Event Type | Magnitude | Movement | Signed_Mag | Actual Change |")
    print("|------------|-----------|----------|------------|---------------|")
    for ex in magnitude_examples:
        print(f"| {ex['event']:<18} | {ex['magnitude']:>9.3f} | {ex['movement']:>8} | {ex['signed_mag']:>10.3f} | {ex['actual_change']:>13.3f} |")
    
    print()
    
    # Key insights
    print("🔍 KEY INSIGHTS - APPLE VS ITSELF")
    print("=" * 40)
    
    best_factor = max(sorted_factors, key=lambda x: x[1]['avg_change'])
    worst_factor = min(sorted_factors, key=lambda x: x[1]['avg_change'])
    
    print(f"🏆 BEST FACTOR: {best_factor[0]}")
    print(f"   • Avg Change: {best_factor[1]['avg_change']:+.3f}%")
    print(f"   • Count: {best_factor[1]['count']:,} events")
    print()
    
    print(f"💥 WORST FACTOR: {worst_factor[0]}")  
    print(f"   • Avg Change: {worst_factor[1]['avg_change']:+.3f}%")
    print(f"   • Count: {worst_factor[1]['count']:,} events")
    print()
    
    # Directional accuracy concept
    print("🎯 DIRECTIONAL PREDICTION CONCEPT")
    print("=" * 40)
    print("Instead of predicting exact %, predict UP/DOWN first:")
    print()
    
    up_factors = [f for f, d in sorted_factors if d['avg_change'] > 0]
    down_factors = [f for f, d in sorted_factors if d['avg_change'] < -0.2]
    
    if up_factors:
        print("📈 UP SIGNALS:")
        for factor in up_factors:
            data = factor_performance[factor]
            print(f"   • {factor}: +{data['avg_change']:.3f}% ({data['count']} events)")
    else:
        print("📈 UP SIGNALS: None found (all factors show negative average)")
    
    print()
    print("📉 DOWN SIGNALS (< -0.2%):")
    for factor in down_factors:
        data = factor_performance[factor]
        print(f"   • {factor}: {data['avg_change']:.3f}% ({data['count']} events)")
    
    print()
    
    # Confidence explanation
    print("🎯 CONFIDENCE EXPLANATION")
    print("=" * 30)
    print("Feature Importance ≠ Correlation ≠ Prediction Accuracy")
    print()
    print("📊 FEATURE IMPORTANCE: How much the model uses this feature")
    print("   • factor_magnitude: 2676.87 (model relies heavily on this)")
    print("   • article_source_credibility: 1754.06")
    print()
    print("📈 CORRELATION: How linearly related feature is to target")
    print("   • Low correlations (0.006) = weak linear relationship")
    print("   • But non-linear patterns might exist!")
    print()
    print("🎯 PREDICTION ACCURACY: How often model gets direction right")
    print("   • 49.1% directional accuracy = barely better than coin flip")
    print("   • Need to improve this for actual trading")
    print()
    
    # Machine learning explanation
    print("🤖 MACHINE LEARNING EXPLANATION")
    print("=" * 40)
    print("The model TRAINS on your data to find patterns:")
    print("1. Takes your 12,688 events with known outcomes")
    print("2. Learns: 'When I see X factors, price usually moves Y%'")
    print("3. Tests on held-out data to measure accuracy")
    print("4. NO - it doesn't guess missing targets, it learns from complete data")
    print()
    
    # Baseline comparison
    print("📊 BASELINE COMPARISON NEEDED")
    print("=" * 35)
    print("To know if ML is working, compare against:")
    print("• Random guessing: 50% directional accuracy")
    print("• Yesterday's return: 'If up yesterday, up today'")
    print("• Simple rules: 'Analyst updates = buy, earnings = sell'")
    print()
    print(f"Current ML: 49.1% (WORSE than random! 🚨)")
    
    # Save results
    results_dir = f"/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/corrected_apple_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(results_dir, exist_ok=True)
    
    # Save detailed results
    analysis_results = {
        'target_variable': 'abs_change_1day_after_pct',
        'description': 'Apple stock percentage change 1 day after event',
        'total_records': 12688,
        'factor_performance': factor_performance,
        'event_performance': event_performance,
        'key_insights': {
            'best_factor': best_factor[0],
            'worst_factor': worst_factor[0],
            'directional_accuracy': 49.1,
            'baseline_needed': True
        }
    }
    
    with open(f"{results_dir}/CORRECTED_APPLE_ANALYSIS.json", 'w') as f:
        json.dump(analysis_results, f, indent=2)
    
    # Create actionable markdown
    with open(f"{results_dir}/APPLE_TRADING_INSIGHTS.md", 'w') as f:
        f.write("# 🍎 Apple Stock Analysis - Corrected Results\n\n")
        f.write(f"**Target**: `abs_change_1day_after_pct` (Apple vs itself)\n")
        f.write(f"**Records**: 12,688 events\n\n")
        
        f.write("## 🏆 Best Performing Factors\n\n")
        for factor, data in sorted_factors[:5]:
            f.write(f"- **{factor}**: {data['avg_change']:+.3f}% avg change ({data['count']} events)\n")
        
        f.write("\n## 💥 Worst Performing Factors\n\n")
        for factor, data in sorted_factors[-5:]:
            f.write(f"- **{factor}**: {data['avg_change']:+.3f}% avg change ({data['count']} events)\n")
        
        f.write("\n## 🚨 Critical Issues\n\n")
        f.write("1. **49.1% directional accuracy** - Worse than random!\n")
        f.write("2. **All factors show negative average** - Market timing issue?\n")
        f.write("3. **Need baseline comparison** - Is this better than simple rules?\n")
        f.write("4. **Consider signed magnitude** - Combine movement × magnitude\n")
    
    print(f"💾 Results saved to: {results_dir}")
    return results_dir

if __name__ == "__main__":
    results_dir = analyze_apple_vs_itself()
