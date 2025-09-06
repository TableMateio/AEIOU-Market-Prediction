#!/usr/bin/env python3
"""
Setup script for Supabase connection
Gets credentials and tests connection
"""

import os
from pathlib import Path

def setup_supabase_env():
    """Setup Supabase environment variables"""
    
    print("🔧 SUPABASE SETUP")
    print("=" * 30)
    
    env_file = Path(__file__).parent.parent / ".env"
    
    # Check if .env exists
    if env_file.exists():
        print(f"✅ Found .env file: {env_file}")
        
        # Read existing values
        env_content = env_file.read_text()
        
        if "SUPABASE_URL" in env_content and "SUPABASE_ANON_KEY" in env_content:
            print("✅ Supabase credentials already configured")
            
            # Load them into environment
            for line in env_content.split('\n'):
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")
            
            return True
    
    print("⚠️  Need to configure Supabase credentials")
    print("\n🔍 Getting credentials from Supabase dashboard:")
    print("1. Go to your Supabase project dashboard")
    print("2. Click 'Settings' → 'API'")
    print("3. Copy the URL and anon key")
    
    # Get credentials from user
    supabase_url = input("\n📡 Enter your Supabase URL: ").strip()
    supabase_key = input("🔑 Enter your Supabase anon key: ").strip()
    
    if not supabase_url or not supabase_key:
        print("❌ Missing credentials!")
        return False
    
    # Save to .env file
    env_content = f"""# AEIOU Supabase Configuration
SUPABASE_URL={supabase_url}
SUPABASE_ANON_KEY={supabase_key}

# Add other environment variables here
"""
    
    env_file.write_text(env_content)
    print(f"✅ Saved credentials to {env_file}")
    
    # Set in current environment
    os.environ['SUPABASE_URL'] = supabase_url
    os.environ['SUPABASE_ANON_KEY'] = supabase_key
    
    return True

def test_supabase_connection():
    """Test connection to Supabase"""
    
    print("\n🧪 TESTING SUPABASE CONNECTION")
    print("=" * 40)
    
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        if not url or not key:
            print("❌ Missing credentials in environment")
            return False
        
        # Create client
        supabase = create_client(url, key)
        
        # Test query - get count of ml_training_data
        response = supabase.table('ml_training_data').select('id', count='exact').limit(1).execute()
        
        total_count = response.count
        print(f"✅ Connection successful!")
        print(f"📊 Found {total_count:,} records in ml_training_data table")
        
        # Test a small data query
        sample = supabase.table('ml_training_data')\
            .select('id,article_published_at,abs_change_1day_after_pct')\
            .not_.is_('abs_change_1day_after_pct', 'null')\
            .limit(5)\
            .execute()
        
        if sample.data:
            print(f"📈 Sample data retrieved: {len(sample.data)} records")
            print("🎯 Sample target values:")
            for record in sample.data[:3]:
                target = record.get('abs_change_1day_after_pct')
                date = record.get('article_published_at', '')[:10]
                print(f"   {date}: {target}%")
        
        return True
        
    except ImportError:
        print("❌ supabase-py not installed!")
        print("   Run: pip install supabase")
        return False
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

def main():
    """Main setup function"""
    
    print("🚀 AEIOU SUPABASE SETUP")
    print("=" * 50)
    
    # Step 1: Setup environment
    if not setup_supabase_env():
        print("❌ Setup failed!")
        return
    
    # Step 2: Test connection
    if not test_supabase_connection():
        print("❌ Connection test failed!")
        return
    
    print("\n🎉 SETUP COMPLETE!")
    print("✅ Supabase connection is working")
    print("🚀 Ready to run: python supabase_ml_pipeline.py")

if __name__ == "__main__":
    main()
