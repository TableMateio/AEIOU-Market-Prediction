# 🚀 AEIOU Quick Start Guide

## 📍 **Current Status: Schema Ready → Transform Data**

**Last Updated**: August 31, 2025  
**Progress**: Phase 1 Week 1 ✅ COMPLETE, ML Pipeline 🔄 IN PROGRESS  

---

## ⚡ **Quick Resume (30 seconds)**

1. **Apply schema**: Run SQL from `src/database/migrations/002_business_tables.sql` in Supabase
2. **Build transform**: Convert 15 AI responses → ~40-50 ML training rows
3. **Add stock data**: Separate pipeline to enrich with price changes
4. **Train ML**: Deep Forest on business factors

---

## 🎯 **What You're Building**

**Universal Business Event Engine** that:
- ✅ Extracts causal chains from Apple news (DONE)
- 🔄 Flattens to ML-ready format (NEXT)
- ⏳ Predicts stock movements (FUTURE)

**Current Data**: 15 AI analyses of Apple news → Rich business factors

---

## 📊 **The Schema (2 Tables)**

### `business_events`
One row per business event (summary)
- Event type, description, magnitude
- Article metadata 
- Causal chain summary

### `business_factors`  
One row per causal step (ML training)
- 53+ features per row
- Factor details, belief analysis, timing
- Target: stock price changes

---

## 🛠️ **Step-by-Step Resume**

### **1. Apply Database Schema** ⚠️ **DO THIS FIRST**
```sql
-- Copy/paste this entire file in Supabase SQL Editor:
src/database/migrations/002_business_tables.sql
```

### **2. Verify Schema Applied**
```bash
cd /path/to/AEIOU
npx ts-node -r tsconfig-paths/register -r dotenv/config -e "
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from './src/config/app';
const s = createClient(AppConfig.getInstance().supabaseConfig.projectUrl, AppConfig.getInstance().supabaseConfig.apiKey);
s.from('business_events').select('id').limit(1).then(r => console.log('✅ business_events exists')).catch(e => console.log('❌ business_events missing'));
"
```

### **3. Build Transformation Script**
```bash
# This will be your next coding task:
# - Read from ai_responses table (15 entries)
# - Parse nested JSON structure  
# - Flatten to business_events + business_factors tables
# - Create ~40-50 ML training rows
```

---

## 📁 **Key Files Reference**

- **🔥 Main SQL**: `src/database/migrations/002_business_tables.sql`
- **🤖 Working AI**: `src/scripts/use-actual-system.ts`
- **📋 Full Instructions**: `NEXT_SESSION_INSTRUCTIONS.md`
- **🎯 Schema Design**: `business_events_table_proposal.md`

---

## 🚨 **If Something's Broken**

1. **Check `.env`**: Supabase keys present?
2. **Check tables**: `articles` and `ai_responses` exist?
3. **Check git**: `git status` and `git log --oneline -3`
4. **Check AI data**: 15 responses in `ai_responses` table?

---

## 💡 **The Big Picture**

You're building a system that turns this:
```json
{
  "business_events": [{
    "event_type": "Product_Announcement",
    "causal_chain": [
      {"factor": "new_product_category", "magnitude": 0.15},
      {"factor": "market_share", "magnitude": 0.1}
    ]
  }]
}
```

Into this:
```
business_factors table:
│ factor_name │ magnitude │ ai_confidence │ market_intensity │ stock_change_7d │
│ new_product │    0.15   │     0.8       │       0.7        │      TBD       │
│ market_share│    0.1    │     0.7       │       0.6        │      TBD       │
```

**Goal**: Train ML to predict `stock_change_7d` from factor patterns! 🎯

---

**Ready to resume? Start with the schema, then build the transform! 🚀**