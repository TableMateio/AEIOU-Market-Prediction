#!/usr/bin/env python3
"""
Fill Article Stock Gaps - Python Version
Uses direct Supabase connection like the existing ML pipelines
Fills missing stock data for ML training using market hours logic
"""

import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings('ignore')

# Supabase client
from supabase import create_client, Client

class ArticleStockGapFiller:
    """Fill missing stock data for articles using existing Supabase patterns"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        
        # Initialize Supabase client (same pattern as supabase_ml_pipeline.py)
        self.supabase = self._init_supabase()
        
        # US Market holidays
        self.market_holidays = [
            '2024-01-01', '2024-01-15', '2024-02-19', '2024-03-29', '2024-05-27',
            '2024-06-19', '2024-07-04', '2024-09-02', '2024-11-28', '2024-12-25',
            '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
            '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25'
        ]
        
    def _init_supabase(self) -> Optional[Client]:
        """Initialize Supabase client from environment variables"""
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            print("❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY")
            return None
            
        try:
            client = create_client(supabase_url, supabase_key)
            print("✅ Supabase client initialized successfully")
            return client
        except Exception as e:
            print(f"❌ Failed to initialize Supabase client: {e}")
            return None
    
    def is_market_hours(self, timestamp: pd.Timestamp) -> Dict[str, bool]:
        """Analyze market conditions for a timestamp"""
        
        # Convert to ET (simplified - doesn't handle DST perfectly)
        et_time = timestamp.tz_convert('US/Eastern') if timestamp.tz is not None else timestamp
        
        day_of_week = et_time.dayofweek  # 0=Monday, 6=Sunday
        hour = et_time.hour
        minute = et_time.minute
        time_in_minutes = hour * 60 + minute
        date_str = et_time.strftime('%Y-%m-%d')
        
        # Check conditions
        is_weekend = day_of_week >= 5  # Saturday=5, Sunday=6
        is_holiday = date_str in self.market_holidays
        
        # Market hours (ET)
        pre_market_start = 4 * 60      # 4:00 AM ET
        regular_start = 9 * 60 + 30    # 9:30 AM ET
        regular_end = 16 * 60          # 4:00 PM ET
        after_hours_end = 20 * 60      # 8:00 PM ET
        
        is_extended_hours = not is_weekend and not is_holiday and (
            (time_in_minutes >= pre_market_start and time_in_minutes < regular_start) or
            (time_in_minutes >= regular_end and time_in_minutes < after_hours_end)
        )
        
        is_market_open = not is_weekend and not is_holiday and (
            time_in_minutes >= regular_start and time_in_minutes < regular_end
        )
        
        return {
            'is_market_open': is_market_open,
            'is_extended_hours': is_extended_hours,
            'is_weekend': is_weekend,
            'is_holiday': is_holiday
        }
    
    def get_stock_strategy(self, timestamp: pd.Timestamp) -> Dict[str, str]:
        """Get strategy for finding stock data"""
        
        conditions = self.is_market_hours(timestamp)
        
        if conditions['is_market_open'] or conditions['is_extended_hours']:
            return {
                'strategy': 'exact',
                'reasoning': 'Article published during market/extended hours - use exact timestamp'
            }
        elif conditions['is_weekend'] or conditions['is_holiday']:
            return {
                'strategy': 'previous_close',
                'reasoning': f"Article published on {'weekend' if conditions['is_weekend'] else 'holiday'} - use previous trading day close"
            }
        else:
            return {
                'strategy': 'next_open',
                'reasoning': 'Article published after hours - use next trading day open'
            }
    
    def find_missing_articles(self, start_date: str = '2024-10-01', end_date: str = '2025-01-31') -> pd.DataFrame:
        """Find articles missing stock data using direct SQL"""
        
        print(f"🔍 Finding articles missing stock data between {start_date} and {end_date}")
        
        try:
            # Direct SQL query to find missing articles (same logic as our analysis)
            query = """
                SELECT 
                    a.id,
                    a.published_at,
                    a.title
                FROM articles a
                LEFT JOIN stock_prices sp ON (
                    sp.ticker = 'AAPL' 
                    AND sp.timestamp = DATE_TRUNC('minute', a.published_at)
                )
                WHERE a.published_at BETWEEN %s AND %s
                AND sp.timestamp IS NULL
                ORDER BY a.published_at;
            """
            
            # Execute query using Supabase
            response = self.supabase.rpc('exec_sql', {
                'sql': query,
                'params': [start_date, end_date]
            })
            
            if response.data:
                df = pd.DataFrame(response.data)
                print(f"📊 Found {len(df)} articles missing stock data")
                return df
            else:
                # Fallback: use table() method if RPC doesn't work
                print("📋 Using table() method fallback...")
                
                # Get articles in date range
                articles_response = self.supabase.table('articles').select('id, published_at, title').gte('published_at', start_date).lte('published_at', end_date).execute()
                
                if not articles_response.data:
                    print("No articles found in date range")
                    return pd.DataFrame()
                
                articles_df = pd.DataFrame(articles_response.data)
                articles_df['published_at'] = pd.to_datetime(articles_df['published_at'])
                
                missing_articles = []
                
                for _, article in articles_df.iterrows():
                    # Truncate to minute precision
                    truncated_time = article['published_at'].floor('min')
                    
                    # Check if stock data exists
                    stock_response = self.supabase.table('stock_prices').select('timestamp').eq('ticker', 'AAPL').eq('timestamp', truncated_time.isoformat()).limit(1).execute()
                    
                    if not stock_response.data:
                        missing_articles.append({
                            'id': article['id'],
                            'published_at': article['published_at'],
                            'title': article['title']
                        })
                
                df = pd.DataFrame(missing_articles)
                print(f"📊 Found {len(df)} articles missing stock data")
                return df
                
        except Exception as e:
            print(f"❌ Error finding missing articles: {e}")
            return pd.DataFrame()
    
    def find_nearest_stock_price(self, target_timestamp: pd.Timestamp, ticker: str = 'AAPL') -> Optional[Dict]:
        """Find nearest stock price to target timestamp"""
        
        # Define search window
        conditions = self.is_market_hours(target_timestamp)
        
        if conditions['is_weekend'] or conditions['is_holiday']:
            search_window_hours = 24  # 1 day for weekends/holidays
        elif not conditions['is_market_open'] and not conditions['is_extended_hours']:
            search_window_hours = 8   # 8 hours for after-hours
        else:
            search_window_hours = 2   # 2 hours default
        
        start_time = target_timestamp - pd.Timedelta(hours=search_window_hours)
        end_time = target_timestamp + pd.Timedelta(hours=search_window_hours)
        
        try:
            # Query stock prices in window
            response = self.supabase.table('stock_prices').select('*').eq('ticker', ticker).gte('timestamp', start_time.isoformat()).lte('timestamp', end_time.isoformat()).order('timestamp').execute()
            
            if not response.data:
                return None
            
            # Find closest timestamp
            prices_df = pd.DataFrame(response.data)
            prices_df['timestamp'] = pd.to_datetime(prices_df['timestamp'])
            
            # Calculate time differences
            prices_df['time_diff'] = abs((prices_df['timestamp'] - target_timestamp).dt.total_seconds())
            
            # Get closest price
            closest_idx = prices_df['time_diff'].idxmin()
            closest_price = prices_df.loc[closest_idx]
            
            return {
                'timestamp': closest_price['timestamp'],
                'close': float(closest_price['close']),
                'open': float(closest_price['open']),
                'high': float(closest_price['high']),
                'low': float(closest_price['low']),
                'volume': int(closest_price['volume']),
                'source': closest_price['source']
            }
            
        except Exception as e:
            print(f"❌ Error finding nearest stock price: {e}")
            return None
    
    def calculate_ml_stock_data(self, article_timestamp: pd.Timestamp, ticker: str = 'AAPL') -> Optional[Dict]:
        """Calculate ML training data for an article timestamp"""
        
        try:
            strategy = self.get_stock_strategy(article_timestamp)
            
            # Get stock price at event time
            event_price = self.find_nearest_stock_price(article_timestamp, ticker)
            if not event_price:
                return None
            
            # Calculate target timestamps
            one_day_after = article_timestamp + pd.Timedelta(days=1)
            one_week_after = article_timestamp + pd.Timedelta(days=7)
            
            # Find prices at target times
            price_1day_after = self.find_nearest_stock_price(one_day_after, ticker)
            price_1week_after = self.find_nearest_stock_price(one_week_after, ticker)
            
            # Calculate percentage changes (same formula as feature_config.py)
            abs_change_1day_after_pct = None
            abs_change_1week_after_pct = None
            
            if price_1day_after:
                abs_change_1day_after_pct = ((price_1day_after['close'] - event_price['close']) / event_price['close']) * 100
            
            if price_1week_after:
                abs_change_1week_after_pct = ((price_1week_after['close'] - event_price['close']) / event_price['close']) * 100
            
            return {
                'price_at_event': event_price['close'],
                'price_1day_after': price_1day_after['close'] if price_1day_after else None,
                'price_1week_after': price_1week_after['close'] if price_1week_after else None,
                'abs_change_1day_after_pct': abs_change_1day_after_pct,
                'abs_change_1week_after_pct': abs_change_1week_after_pct,
                'strategy_used': f"{strategy['strategy']}: {strategy['reasoning']}",
                'source_timestamp': event_price['timestamp'].isoformat()
            }
            
        except Exception as e:
            print(f"❌ Error calculating ML stock data: {e}")
            return None
    
    def fill_gaps_batch(self, missing_articles_df: pd.DataFrame) -> Dict:
        """Fill gaps for a batch of missing articles"""
        
        print(f"🔧 Filling gaps for {len(missing_articles_df)} articles...")
        
        result = {
            'successful': 0,
            'failed': 0,
            'strategies': {},
            'stock_records': []
        }
        
        for idx, article in missing_articles_df.iterrows():
            try:
                article_time = pd.to_datetime(article['published_at'])
                strategy = self.get_stock_strategy(article_time)
                
                # Get ML stock data
                ml_data = self.calculate_ml_stock_data(article_time)
                
                if ml_data:
                    # Create stock record for exact article timestamp (truncated to minute)
                    truncated_time = article_time.floor('min')
                    
                    stock_record = {
                        'ticker': 'AAPL',
                        'timestamp': truncated_time.isoformat(),
                        'open': ml_data['price_at_event'],
                        'high': ml_data['price_at_event'],
                        'low': ml_data['price_at_event'],
                        'close': ml_data['price_at_event'],
                        'volume': 0,  # Interpolated data has no volume
                        'timeframe': '1Min',
                        'source': f"interpolated_{strategy['strategy']}",
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    
                    result['stock_records'].append(stock_record)
                    result['successful'] += 1
                    
                    # Track strategy usage
                    strategy_key = strategy['strategy']
                    result['strategies'][strategy_key] = result['strategies'].get(strategy_key, 0) + 1
                    
                    print(f"✅ {article['id']}: {strategy['strategy']} → ${ml_data['price_at_event']:.2f}")
                else:
                    result['failed'] += 1
                    print(f"❌ {article['id']}: Could not find stock data")
                    
            except Exception as e:
                result['failed'] += 1
                print(f"❌ {article['id']}: Error - {e}")
                
            # Progress logging
            if (idx + 1) % 50 == 0:
                print(f"📈 Progress: {idx + 1}/{len(missing_articles_df)} articles processed")
        
        return result
    
    def insert_stock_records(self, stock_records: List[Dict]) -> bool:
        """Insert stock records into Supabase"""
        
        if not stock_records:
            return True
            
        print(f"💾 Inserting {len(stock_records)} stock price records...")
        
        try:
            # Insert in batches of 1000
            batch_size = 1000
            
            for i in range(0, len(stock_records), batch_size):
                batch = stock_records[i:i + batch_size]
                
                response = self.supabase.table('stock_prices').upsert(
                    batch, 
                    on_conflict='ticker,timestamp,timeframe,source',
                    ignore_duplicates=False
                ).execute()
                
                if response.data is None and hasattr(response, 'error') and response.error:
                    print(f"❌ Error inserting batch {i//batch_size + 1}: {response.error}")
                    return False
                    
                print(f"💾 Inserted batch {i//batch_size + 1}/{(len(stock_records) + batch_size - 1)//batch_size}")
            
            print(f"✅ Successfully inserted {len(stock_records)} stock price records")
            return True
            
        except Exception as e:
            print(f"❌ Error inserting stock records: {e}")
            return False
    
    def verify_results(self, start_date: str, end_date: str) -> Dict:
        """Verify that articles now have stock data"""
        
        print("🔍 Verifying gap filling results...")
        
        try:
            # Count total articles
            total_response = self.supabase.table('articles').select('id', count='exact').gte('published_at', start_date).lte('published_at', end_date).execute()
            total_articles = total_response.count if total_response.count is not None else 0
            
            # Find remaining missing articles
            remaining_missing_df = self.find_missing_articles(start_date, end_date)
            remaining_missing = len(remaining_missing_df)
            
            articles_with_stock = total_articles - remaining_missing
            completion_percentage = (articles_with_stock / total_articles) * 100 if total_articles > 0 else 0
            
            return {
                'total_articles': total_articles,
                'articles_with_stock': articles_with_stock,
                'remaining_missing': remaining_missing,
                'completion_percentage': completion_percentage
            }
            
        except Exception as e:
            print(f"❌ Error verifying results: {e}")
            return {
                'total_articles': 0,
                'articles_with_stock': 0,
                'remaining_missing': 0,
                'completion_percentage': 0
            }
    
    def execute(self, start_date: str = '2024-10-01', end_date: str = '2025-01-31'):
        """Main execution function"""
        
        print("🎯 STARTING PYTHON GAP FILLER")
        print("=" * 50)
        print(f"📅 Date Range: {start_date} → {end_date}")
        
        if not self.supabase:
            print("❌ Supabase client not initialized")
            return
        
        try:
            # Step 1: Find missing articles
            missing_articles_df = self.find_missing_articles(start_date, end_date)
            
            if missing_articles_df.empty:
                print("✅ No gaps found! All articles have stock data.")
                return
            
            # Step 2: Analyze patterns
            print("\n📊 PATTERN ANALYSIS:")
            patterns = {'weekend': 0, 'after_hours': 0, 'market_hours': 0, 'holiday': 0}
            
            for _, article in missing_articles_df.iterrows():
                article_time = pd.to_datetime(article['published_at'])
                conditions = self.is_market_hours(article_time)
                
                if conditions['is_weekend']:
                    patterns['weekend'] += 1
                elif conditions['is_holiday']:
                    patterns['holiday'] += 1
                elif conditions['is_market_open']:
                    patterns['market_hours'] += 1
                else:
                    patterns['after_hours'] += 1
            
            for pattern, count in patterns.items():
                print(f"   {pattern.replace('_', ' ').title()}: {count}")
            
            # Step 3: Fill the gaps
            fill_result = self.fill_gaps_batch(missing_articles_df)
            
            # Step 4: Insert stock records
            if fill_result['stock_records']:
                insert_success = self.insert_stock_records(fill_result['stock_records'])
                if not insert_success:
                    print("❌ Failed to insert stock records")
                    return
            
            # Step 5: Verify results
            verification = self.verify_results(start_date, end_date)
            
            # Final report
            print("\n🎉 GAP FILLING COMPLETE!")
            print("=" * 50)
            print(f"📊 RESULTS:")
            print(f"   Articles Processed: {len(missing_articles_df)}")
            print(f"   Successfully Filled: {fill_result['successful']}")
            print(f"   Failed: {fill_result['failed']}")
            print(f"   Success Rate: {(fill_result['successful'] / len(missing_articles_df) * 100):.1f}%")
            
            print(f"🎯 STRATEGIES USED:")
            for strategy, count in fill_result['strategies'].items():
                print(f"   {strategy}: {count}")
            
            print(f"✅ FINAL VERIFICATION:")
            print(f"   Total Articles: {verification['total_articles']}")
            print(f"   Articles with Stock Data: {verification['articles_with_stock']}")
            print(f"   Remaining Missing: {verification['remaining_missing']}")
            print(f"   Completion: {verification['completion_percentage']:.1f}%")
            
            if verification['completion_percentage'] >= 95:
                print("🎉 SUCCESS: ML training data is now complete!")
            else:
                print(f"⚠️  Still {verification['remaining_missing']} articles missing stock data")
                
        except Exception as e:
            print(f"❌ Gap filling failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    gap_filler = ArticleStockGapFiller()
    
    # You can customize the date range here
    import sys
    start_date = sys.argv[1] if len(sys.argv) > 1 else '2024-10-01'
    end_date = sys.argv[2] if len(sys.argv) > 2 else '2025-01-31'
    
    gap_filler.execute(start_date, end_date)
