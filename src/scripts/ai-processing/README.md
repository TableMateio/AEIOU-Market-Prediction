# AI Processing Pipeline - Usage Guide

## 🚀 **ONE UNIVERSAL PIPELINE**

**Single Script**: `ai-pipeline.ts` - handles all AI processing modes

### Direct Processing (Immediate Results)
```bash
# Process 1 article directly and save
npx tsx ai-pipeline.ts --direct --limit=1 --save

# Process 5 articles directly  
npx tsx ai-pipeline.ts --direct --limit=5 --save

# Process all unprocessed articles directly
npx tsx ai-pipeline.ts --direct --limit=0 --save
```

### Batch Processing (Bulk Processing)
```bash
# Submit 50 articles to batch API
npx tsx ai-pipeline.ts --batch --limit=50 --save

# Submit all unprocessed articles to batch
npx tsx ai-pipeline.ts --batch --limit=0 --save

# Submit with offset for manual batching
npx tsx ai-pipeline.ts --batch --limit=1000 --offset=1000 --save --force
```

### Batch Monitoring & Management
```bash
# Check batch status
npx tsx ai-pipeline.ts --check-batch=batch_68b8dd087cf88190b870f9ca693c6ce2

# Save completed batch results
npx tsx ai-pipeline.ts --save-batch=batch_68b8dd087cf88190b870f9ca693c6ce2

# Cancel batch (if still validating/in_progress)
npx tsx ai-pipeline.ts --cancel-batch=batch_68b8dd087cf88190b870f9ca693c6ce2

# Auto-monitor multiple batches (checks every 3 hours)
npx tsx batch-monitor.ts --batches=batch_ID1,batch_ID2 --monitor --interval=180

# One-time check all batches
npx tsx batch-monitor.ts --batches=batch_ID1,batch_ID2
```

## 📋 **ACTIVE BATCHES - Stage 1 (Business Events)**

**Current Processing (Started: 2025-01-03 20:27):**
- **Batch 1**: `batch_68b8dd087cf88190b870f9ca693c6ce2` (1,000 articles, offset 0-999)
- **Batch 2**: `batch_68b8dd2a29c88190a8035494bda59824` (520 articles, offset 1000-1519)
- **Total**: 1,520 articles (all valid articles)
- **Estimated completion**: 8-12 hours

**Auto-Monitor Command:**
```bash
npx tsx batch-monitor.ts --batches=batch_68b8dd087cf88190b870f9ca693c6ce2,batch_68b8dd2a29c88190a8035494bda59824 --monitor --interval=180
```

## 🏗️ Current Pipeline Architecture

### Stage 1: Business Events Extraction ✅ WORKING
- **Input**: Raw articles from `articles` table (3,311 articles available)
- **Instructions**: `instructions-business.md` (10,500 chars, detailed psychological factors)
- **Schema**: `schema-business.json` (strict enforcement, all required fields)
- **Output**: `business_events_ai` table (raw + structured responses)
- **Model**: `gpt-4.1-mini` with OpenAI Structured Outputs
- **Performance**: ~7 seconds per article, ~5K tokens, 100% schema compliance

### Stage 2: Causal Chain Processing (TODO)
- **Input**: Individual business events from `business_events_flat` table
- **Instructions**: `instructions-causal.md` (TBD)
- **Schema**: `schema-causal.json` (TBD)
- **Output**: `causal_events_ai` table (TBD)

## 🔧 **Universal Pipeline Flags**

### `ai-pipeline.ts` - ONE SCRIPT FOR EVERYTHING

**Processing Modes**:
- `--direct`: Direct OpenAI calls (immediate results, ~7 seconds per article)
- `--batch`: OpenAI Batch API (bulk processing, 24-hour window)

**Control Flags**:
- `--limit=N`: Process N articles (use `--limit=0` for ALL unprocessed articles)
- `--save`: Save to database (DEFAULT: true - always saves unless you add `--no-save`)
- `--force`: Process articles even if already processed (reprocessing)

**Examples**:
```bash
# Process 1 article (testing) - saves by default
npx tsx ai-pipeline.ts --direct --limit=1

# Process 10 articles directly  
npx tsx ai-pipeline.ts --direct --limit=10

# Process all unprocessed articles directly
npx tsx ai-pipeline.ts --direct --limit=0

# Submit 100 articles to batch API
npx tsx ai-pipeline.ts --batch --limit=100
```

## 📊 **Performance Metrics** ✅ VALIDATED

**Stage 1 Business Events**:
- **Speed**: ~7 seconds per article (direct processing)
- **Tokens**: ~4,700 tokens per article (69% reduction from full causal chains)
- **Success Rate**: 100% JSON parsing and schema compliance ✅
- **Schema Compliance**: 100% - ALL required fields populated ✅

## 🔧 **Schema Enforcement - How It Works**

**Two-Layer Enforcement**:
1. **Schema Definition**: `schema-business.json` defines required fields
2. **API Request**: `response_format.type="json_schema"` with `strict: true`

**Critical API Request Format**:
```javascript
{
  model: "gpt-4.1-mini",
  messages: [...],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "business_events_only", 
      strict: true,
      schema: { ...your schema... }
    }
  }
}
```

**Result**: OpenAI enforces 100% schema compliance - invalid JSON gets rejected and retried internally.

## 🎯 **Next Steps**

1. **Test larger batches** (5-10 articles) to validate scaling
2. **Build Stage 2** - causal chain processing pipeline  
3. **Create flattening scripts** - convert AI responses to individual rows
4. **Add duplicate checking** - skip already processed articles
