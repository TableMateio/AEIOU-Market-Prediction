# Current Batch Monitoring - AEIOU

## 🚀 **Active Causal Processing Batches**

### **New Batches (Missing Business Events Recovery)**
- `batch_68b99c44073081909febcb7231862a98` - 1,000 business events → **VALIDATING** ⏳
- `batch_68b99c4f958c8190b3a44fc2aec21960` - 200 business events → **VALIDATING** ⏳  
- `batch_68b99c7c358881909718f64c1f0c9c3e` - 1,000 business events → **VALIDATING** ⏳

### **Monitor Commands**
```bash
# Check individual batch status
npx tsx src/scripts/ai-processing/ai-pipeline.ts --check-batch=batch_68b99c44073081909febcb7231862a98
npx tsx src/scripts/ai-processing/ai-pipeline.ts --check-batch=batch_68b99c4f958c8190b3a44fc2aec21960  
npx tsx src/scripts/ai-processing/ai-pipeline.ts --check-batch=batch_68b99c7c358881909718f64c1f0c9c3e

# Save results when complete
npx tsx src/scripts/ai-processing/ai-pipeline.ts --save-batch=batch_68b99c44073081909febcb7231862a98 --stage=causal
npx tsx src/scripts/ai-processing/ai-pipeline.ts --save-batch=batch_68b99c4f958c8190b3a44fc2aec21960 --stage=causal
npx tsx src/scripts/ai-processing/ai-pipeline.ts --save-batch=batch_68b99c7c358881909718f64c1f0c9c3e --stage=causal

# Auto-monitor all batches
npx tsx src/scripts/ai-processing/batch-monitor.ts batch_68b99c44073081909febcb7231862a98,batch_68b99c4f958c8190b3a44fc2aec21960,batch_68b99c7c358881909718f64c1f0c9c3e --interval=30
```

## 📊 **Current Status**
- **Total Business Events**: 3,149
- **Previously Processed**: 2,004 (from old batches)
- **Newly Submitted**: 2,200 (3 new batches)
- **Remaining**: ~145 (will need one more small batch)

## 🎯 **Expected Results**
- **Total Causal Analyses**: ~3,149 (when complete)
- **Estimated Causal Steps**: ~12,596 (4x multiplier)
- **Processing Time**: 2-4 hours
- **Cost**: ~$11 (for new batches)

---
*Generated: 2025-09-04 10:05*
