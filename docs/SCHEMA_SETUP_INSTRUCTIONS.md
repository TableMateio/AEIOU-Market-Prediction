# 🛠️ Schema Setup Instructions

## Current Status
The SQL for both `business_events` and `business_factors` tables is ready, but needs to be applied manually due to Supabase client limitations.

## 📋 SQL to Apply

**Location**: `src/database/migrations/002_business_tables.sql`

**Tables Created**:
1. **`business_events`** - One row per business event from AI analysis
2. **`business_factors`** - One row per causal chain step (for ML)

## 🎯 How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy/paste the entire contents of `src/database/migrations/002_business_tables.sql`
4. Run the SQL

### Option 2: Command Line (if you have psql)
```bash
# If you have database connection string
psql "your-supabase-connection-string" -f src/database/migrations/002_business_tables.sql
```

## ✅ Verification

After applying the SQL, you should have:
- ✅ `business_events` table (event-level data)
- ✅ `business_factors` table (causal step data with ML features)
- ✅ Proper indexes for performance
- ✅ Relationship: business_events → business_factors (1:many)

## 🚀 Next Steps

Once tables are created:
1. ✅ Build transformation script
2. ✅ Process 15 existing AI responses into ~40-50 ML training rows
3. ✅ Add stock price data pipeline (later)

## 📊 Expected Data Flow

```
AI Responses (15) 
    ↓ transform
Business Events (~45 events)
    ↓ flatten  
Business Factors (~120 causal steps)
    ↓ ML ready
Training Dataset (53 features per row)
```

**Ready to proceed with transformation script once schema is applied!**
