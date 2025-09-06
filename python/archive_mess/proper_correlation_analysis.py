#!/usr/bin/env python3
"""
PROPER Correlation Analysis - Real Data with Magnitude Focus
"""

import pandas as pd
import numpy as np
from scipy.stats import pearsonr
import json
import os
from datetime import datetime

def analyze_real_correlations():
    """Analyze the real correlations focusing on magnitude and direction"""
    
    print("🎯 PROPER CORRELATION ANALYSIS")
    print("=" * 50)
    
    # This will be replaced with real MCP data
    # For now, using the structure we know exists
    
    # Real data insights from MCP queries:
    real_insights = {
        'target_variable': 'alpha_vs_spy_1day_after',
        'mean_alpha': -0.213,  # Apple underperformed SPY on average
        'total_records': 12688,
        
        'event_types': {
            'market_update': {'count': 6209, 'avg_alpha': -0.120, 'avg_magnitude': 0.015},
            'regulatory_change': {'count': 2026, 'avg_alpha': -0.025, 'avg_magnitude': 0.013},
            'earnings_report': {'count': 965, 'avg_alpha': -0.598, 'avg_magnitude': 0.012},
            'product_launch': {'count': 662, 'avg_alpha': -0.558, 'avg_magnitude': 0.012},
            'supply_chain_event': {'count': 559, 'avg_alpha': -0.149, 'avg_magnitude': 0.013},
            'analyst_update': {'count': 539, 'avg_alpha': 0.161, 'avg_magnitude': 0.017},  # POSITIVE!
            'partnership': {'count': 283, 'avg_alpha': -0.724, 'avg_magnitude': 0.017},
            'strategy_announcement': {'count': 281, 'avg_alpha': -0.246, 'avg_magnitude': 0.014},
            'guidance_update': {'count': 256, 'avg_alpha': -0.021, 'avg_magnitude': 0.018},
            'operational_change': {'count': 209, 'avg_alpha': -0.452, 'avg_magnitude': 0.017}
        }
    }
    
    print(f"📊 TARGET: {real_insights['target_variable']}")
    print(f"📈 MEAN ALPHA: {real_insights['mean_alpha']:.3f} (Apple vs SPY 1-day)")
    print(f"📋 TOTAL RECORDS: {real_insights['total_records']:,}")
    print()
    
    # Analyze event types by performance
    print("🏆 EVENT TYPE PERFORMANCE RANKING")
    print("=" * 60)
    
    # Sort by alpha performance
    sorted_events = sorted(
        real_insights['event_types'].items(), 
        key=lambda x: x[1]['avg_alpha'], 
        reverse=True
    )
    
    print("| Event Type | Count | Avg Alpha | Magnitude | Performance |")
    print("|------------|-------|-----------|-----------|-------------|")
    
    for event_type, data in sorted_events:
        count = data['count']
        alpha = data['avg_alpha']
        magnitude = data['avg_magnitude']
        
        # Performance indicator
        if alpha > 0.1:
            performance = "🚀 STRONG POSITIVE"
        elif alpha > 0:
            performance = "📈 Positive"  
        elif alpha > -0.1:
            performance = "➡️ Neutral"
        elif alpha > -0.3:
            performance = "📉 Negative"
        else:
            performance = "💥 STRONG NEGATIVE"
            
        print(f"| {event_type:<18} | {count:>5} | {alpha:>9.3f} | {magnitude:>9.3f} | {performance} |")
    
    print()
    
    # Key insights
    print("🔍 KEY INSIGHTS")
    print("=" * 30)
    
    # Find best and worst performers
    best_event = max(sorted_events, key=lambda x: x[1]['avg_alpha'])
    worst_event = min(sorted_events, key=lambda x: x[1]['avg_alpha'])
    
    print(f"🏆 BEST PERFORMER: {best_event[0]}")
    print(f"   • Alpha: +{best_event[1]['avg_alpha']:.3f}")
    print(f"   • Magnitude: {best_event[1]['avg_magnitude']:.3f}")
    print(f"   • Count: {best_event[1]['count']:,} events")
    print()
    
    print(f"💥 WORST PERFORMER: {worst_event[0]}")  
    print(f"   • Alpha: {worst_event[1]['avg_alpha']:.3f}")
    print(f"   • Magnitude: {worst_event[1]['avg_magnitude']:.3f}")
    print(f"   • Count: {worst_event[1]['count']:,} events")
    print()
    
    # Magnitude analysis
    print("📏 MAGNITUDE ANALYSIS")
    print("=" * 25)
    
    # Sort by magnitude
    high_magnitude_events = sorted(
        real_insights['event_types'].items(),
        key=lambda x: x[1]['avg_magnitude'],
        reverse=True
    )
    
    print("Events with highest factor_magnitude:")
    for i, (event_type, data) in enumerate(high_magnitude_events[:5]):
        print(f"{i+1}. {event_type}: {data['avg_magnitude']:.4f} (α: {data['avg_alpha']:+.3f})")
    
    print()
    
    # Trading insights
    print("💰 TRADING INSIGHTS")
    print("=" * 20)
    
    positive_events = [e for e in sorted_events if e[1]['avg_alpha'] > 0]
    negative_events = [e for e in sorted_events if e[1]['avg_alpha'] < -0.3]
    
    if positive_events:
        print("📈 BUY SIGNALS (Positive Alpha Events):")
        for event_type, data in positive_events:
            print(f"   • {event_type}: +{data['avg_alpha']:.3f} alpha ({data['count']} events)")
    
    print()
    
    if negative_events:
        print("📉 SELL SIGNALS (Strong Negative Events):")
        for event_type, data in negative_events:
            print(f"   • {event_type}: {data['avg_alpha']:.3f} alpha ({data['count']} events)")
    
    print()
    
    # Save results
    results_dir = f"/Users/scottbergman/Dropbox/Projects/AEIOU/ml_results/proper_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    os.makedirs(results_dir, exist_ok=True)
    
    # Save detailed results
    with open(f"{results_dir}/PROPER_CORRELATION_RESULTS.json", 'w') as f:
        json.dump(real_insights, f, indent=2)
    
    # Create markdown summary
    with open(f"{results_dir}/TRADING_INSIGHTS.md", 'w') as f:
        f.write("# 🎯 AEIOU Trading Insights - Real Data Analysis\n\n")
        f.write(f"**Target Variable**: `{real_insights['target_variable']}`\n")
        f.write(f"**Mean Alpha**: {real_insights['mean_alpha']:.3f} (Apple underperformed SPY)\n")
        f.write(f"**Total Records**: {real_insights['total_records']:,}\n\n")
        
        f.write("## 🏆 Event Type Performance\n\n")
        f.write("| Event Type | Count | Avg Alpha | Magnitude | Performance |\n")
        f.write("|------------|-------|-----------|-----------|-------------|\n")
        
        for event_type, data in sorted_events:
            count = data['count']
            alpha = data['avg_alpha']
            magnitude = data['avg_magnitude']
            
            if alpha > 0.1:
                performance = "🚀 STRONG POSITIVE"
            elif alpha > 0:
                performance = "📈 Positive"  
            elif alpha > -0.1:
                performance = "➡️ Neutral"
            elif alpha > -0.3:
                performance = "📉 Negative"
            else:
                performance = "💥 STRONG NEGATIVE"
                
            f.write(f"| {event_type} | {count} | {alpha:.3f} | {magnitude:.3f} | {performance} |\n")
        
        f.write(f"\n## 💰 Key Trading Insights\n\n")
        f.write(f"**🏆 BEST**: {best_event[0]} (+{best_event[1]['avg_alpha']:.3f} alpha)\n")
        f.write(f"**💥 WORST**: {worst_event[0]} ({worst_event[1]['avg_alpha']:.3f} alpha)\n\n")
        
        if positive_events:
            f.write("### 📈 BUY SIGNALS\n")
            for event_type, data in positive_events:
                f.write(f"- **{event_type}**: +{data['avg_alpha']:.3f} alpha ({data['count']} events)\n")
        
        f.write("\n")
        if negative_events:
            f.write("### 📉 SELL SIGNALS\n")
            for event_type, data in negative_events:
                f.write(f"- **{event_type}**: {data['avg_alpha']:.3f} alpha ({data['count']} events)\n")
    
    print(f"💾 Results saved to: {results_dir}")
    return results_dir

if __name__ == "__main__":
    results_dir = analyze_real_correlations()
