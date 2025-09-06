#!/usr/bin/env python3
"""
Quick environment setup with Supabase credentials
"""

import os
from pathlib import Path

def setup_environment():
    """Setup environment with Supabase credentials"""
    
    print("🔧 SETTING UP ENVIRONMENT")
    print("=" * 40)
    
    # Your Supabase credentials
    supabase_url = "https://umwliedtynxywavrhacy.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtd2xpZWR0eW54eXdhdnJoYWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjkxMTgsImV4cCI6MjA3MTgwNTExOH0.iK_kQwSwoxz5PA8_ysk4y2lv-oyPPKbz9uUZx1xOuyM"
    
    # Set environment variables
    os.environ['SUPABASE_URL'] = supabase_url
    os.environ['SUPABASE_ANON_KEY'] = supabase_key
    
    print(f"✅ SUPABASE_URL: {supabase_url}")
    print(f"✅ SUPABASE_ANON_KEY: {supabase_key[:20]}...")
    
    # Create .env file
    env_file = Path(__file__).parent.parent / ".env"
    env_content = f"""# AEIOU Environment Configuration
SUPABASE_URL={supabase_url}
SUPABASE_ANON_KEY={supabase_key}
"""
    
    env_file.write_text(env_content)
    print(f"💾 Saved to: {env_file}")
    
    return True

def test_connection():
    """Quick connection test"""
    
    print("\n🧪 TESTING CONNECTION")
    print("=" * 30)
    
    try:
        from supabase import create_client
        
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        supabase = create_client(url, key)
        
        # Quick test query
        response = supabase.table('ml_training_data').select('id', count='exact').limit(1).execute()
        
        print(f"✅ Connected successfully!")
        print(f"📊 ml_training_data has {response.count:,} records")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    if setup_environment():
        test_connection()
        print("\n🎉 Environment ready!")
        print("🚀 Run: python supabase_ml_pipeline.py")
