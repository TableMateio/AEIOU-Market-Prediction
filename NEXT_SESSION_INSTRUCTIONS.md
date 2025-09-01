# 🎯 NEXT SESSION: Business Events ML Pipeline Setup

**Status**: Schema ready to apply, transformation script to build  
**Date**: August 31, 2025  
**Progress**: Phase 1 Week 1 COMPLETE, moving to ML data pipeline  

---

## 🔥 **What We Just Accomplished**

### ✅ **Phase 1 Week 1 - COMPLETE**
- **15 AI responses** processed from 23 articles with full body text
- **Article collection pipeline** working (GNews = 100% success rate)
- **AI analysis system** operational (GPT-4o with structured output)
- **Core assumptions validated**: News timing, causal extraction, belief analysis

### 🎯 **Current Goal: ML Data Pipeline**
Transform nested AI responses → flat relational tables → ML training data

---

## 📊 **The Two-Table Schema Design**

### **Why Two Tables?**
1. **`business_events`**: One row per business event (summary level)
2. **`business_factors`**: One row per causal step (ML training data)

**Relationship**: 1 AI Response → 3 Business Events → 9 Causal Steps  
**Result**: Rich ML dataset with 53+ features per row

### **Data Flow**:
```
AI Responses (15 nested JSON) 
    ↓ transform
Business Events (~45 events)
    ↓ flatten causal chains  
Business Factors (~120 ML rows)
    ↓ add stock data later
Complete ML Training Dataset
```

---

## 🛠️ **IMMEDIATE NEXT STEPS**

### **Step 1: Apply Database Schema** ⚠️ **REQUIRED FIRST**

#### **Option A: Supabase Dashboard (Recommended)**
1. Go to your Supabase project: [Your Project URL]/sql
2. Copy SQL from: `src/database/migrations/002_business_tables.sql`
3. Paste and run in SQL Editor
4. Verify tables created: `business_events` and `business_factors`

#### **Option B: Using MCP (If Available)**
```bash
# If you have Supabase MCP setup:
cd /path/to/AEIOU
supabase db reset  # Reset with new migration
# OR
supabase db push   # Push new migration
```

#### **Option C: Direct psql (If you have credentials)**
```bash
psql "your-supabase-connection-string" -f src/database/migrations/002_business_tables.sql
```

### **Step 2: Build Transformation Script**
After schema is applied:
```bash
cd /path/to/AEIOU
npm run dev  # Or however you start development
# Then build the transformation script to populate tables
```

---

## 📁 **Key Files Created**

### **Database Schema**
- `src/database/migrations/002_business_tables.sql` - **THE MAIN SQL FILE**
- `supabase/migrations/20250831_business_factors.sql` - (older single-table version)

### **Documentation**
- `SCHEMA_SETUP_INSTRUCTIONS.md` - Detailed schema instructions
- `business_events_table_proposal.md` - Original design proposal
- `MILESTONE_ARTICLE_PROCESSING.md` - Phase 1 completion summary

### **Working AI System**
- `src/scripts/use-actual-system.ts` - **The working AI processing script**
- `src/ai/schema.json` - GPT-4o structured output schema
- `src/ai/instructions.md` - 773-line AI prompt

---

## 🎯 **The Schema Details**

### **`business_events` Table**
**Purpose**: One row per business event (summary data)
**Key Fields**:
- Event metadata: type, description, scope, magnitude
- Article context: title, source, published date
- Causal summary: total steps, complexity
- Target variables: stock price changes (to be filled later)

### **`business_factors` Table** 
**Purpose**: One row per causal step (ML training data)
**53+ ML Features**:
- **Numeric**: magnitudes, confidence scores, time horizons
- **Categorical**: factor names, event types, sources
- **JSON Arrays**: synonyms, cognitive biases, emotions
- **Target Variables**: stock_price_change_1d, _7d, _30d

---

## 🔧 **MCP Setup Instructions**

### **If You Have Supabase MCP Server**
```bash
# Check if MCP is configured
ls ~/.config/mcp/  # Look for supabase config

# If configured, you can:
supabase status
supabase db reset
supabase db push
```

### **If MCP Needs Setup**
1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref your-project-ref`
4. Apply migration: `supabase db push`

---

## 🧠 **Technical Context**

### **Current Database State**
- ✅ `articles` table: 35 articles (23 with full body)
- ✅ `ai_responses` table: 15 successful AI analyses
- ❌ `business_events` table: **NEEDS TO BE CREATED**
- ❌ `business_factors` table: **NEEDS TO BE CREATED**

### **AI System Architecture**
- **Model**: GPT-4o-2024-08-06 with structured output
- **Schema**: `business_event_chain_article` (src/ai/schema.json)
- **Prompt**: Apple-focused causal chain analysis (773 lines)
- **Success Rate**: ~73% (some JSON parsing failures expected)

### **Next Phase Goals**
1. **Week 2**: Manual validation of causal chains  
2. **Pattern Analysis**: Identify recurring business factors
3. **ML Training**: Deep Forest on business factors
4. **Stock Correlation**: Add price data and test predictions

---

## 🚨 **Troubleshooting**

### **If Schema Application Fails**
- Check Supabase connection in `.env`
- Verify `ai_responses` and `articles` tables exist first
- Run SQL statements one by one if batch fails

### **If Transformation Fails**
- Verify tables exist: `SELECT * FROM business_events LIMIT 1;`
- Check AI response format in database
- Reference working script: `src/scripts/use-actual-system.ts`

---

## 📞 **Quick Status Check Commands**

```bash
# Check current database state
npx ts-node -r tsconfig-paths/register -r dotenv/config -e "
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from './src/config/app';
const supabase = createClient(AppConfig.getInstance().supabaseConfig.projectUrl, AppConfig.getInstance().supabaseConfig.apiKey);
supabase.from('ai_responses').select('count(*)').then(r => console.log('AI Responses:', r.data));
supabase.from('business_events').select('count(*)').then(r => console.log('Business Events:', r.data)).catch(e => console.log('business_events missing'));
"

# Check git status
git status
git log --oneline -5
```

---

## 🎉 **Success Criteria**

**You'll know it's working when**:
1. ✅ Both tables exist and are queryable
2. ✅ Transformation script processes 15 AI responses
3. ✅ ~40-50 business factors created with full ML features  
4. ✅ Ready for stock price integration and ML training

**Then you're ready for Deep Forest and predictions! 🚀**

---

**File locations for quick access**:
- Main SQL: `src/database/migrations/002_business_tables.sql`
- Working AI script: `src/scripts/use-actual-system.ts`  
- Config: `.env` (Supabase keys)
- Schema: `src/ai/schema.json`
