# AI Agent Evaluation Criteria - AEIOU Market Prediction

## 📊 Current Agent Status

✅ **AI Agent is Working**: Confirmed functional with OpenAI GPT-4o  
✅ **Metadata Complete**: Sends title, summary, body, source, authors, publish date  
✅ **Full Article Content**: Includes complete body text for analysis  
✅ **Response Format**: Returns structured JSON analysis  

---

## 🧪 What We're Testing For

### **1. Metadata Completeness**
Check that the agent receives:
- ✅ **Title** (headline)
- ✅ **Summary** (if available)  
- ✅ **Body** (full article text)
- ✅ **Source** (publication name)
- ✅ **Authors** (byline authors)
- ✅ **Publish Date** (timestamp)
- ✅ **URL** (original link)
- 🔄 **Publisher Credibility** (0-1 scale)
- 🔄 **Author Credibility** (0-1 scale)
- 🔄 **Market Regime Context** (bull/bear/neutral)

### **2. Business Event Extraction Quality**

#### **Event Identification**
- [ ] **Multiple Events**: 1-5 distinct business events per article
- [ ] **Event Specificity**: Clear, actionable business developments
- [ ] **Apple Focus**: All events analyzed through Apple impact lens
- [ ] **Event Types**: Proper categorization (Product_Launch, M&A, etc.)

#### **Temporal Classification**
- [ ] **Past vs Future**: Accurate classification of predictive vs explanatory
- [ ] **Time Horizons**: Realistic timeframes (days/months/years)
- [ ] **Sequence Logic**: Events follow logical chronological order

### **3. Causal Chain Analysis**

#### **Chain Structure**
- [ ] **Length**: 3-5 steps per chain ending in fundamentals
- [ ] **Progression**: Logical A→B→C→Fundamental progression
- [ ] **Endpoints**: Chains end in measurable outcomes (revenue, units, margins)
- [ ] **Proxies**: Intermediate proxies lead to fundamentals within 1-2 steps

#### **Business Logic**
- [ ] **Mechanism Clarity**: Clear explanation of HOW A causes B
- [ ] **Quantification**: Factors have units (%, $, count, index, rating)
- [ ] **Magnitude Scoring**: Realistic 0-1 scale (0.01-0.15 for most events)
- [ ] **Movement Direction**: Proper +1/-1/0 directional indication

### **4. Belief Factor Analysis**

#### **Dual-Layer Assessment**
- [ ] **Market Perception**: What investors actually believe
- [ ] **AI Assessment**: Analytical reality check
- [ ] **Perception Gap**: Meaningful differences identified
- [ ] **Correction Potential**: Realistic assessment of narrative shifts

#### **Psychological Dimensions**
- [ ] **Emotional Profiles**: Match article tone and content
- [ ] **Cognitive Biases**: Appropriate bias identification
- [ ] **Confidence Calibration**: Scores reflect actual uncertainty
- [ ] **Narrative Strength**: Realistic assessment of story power

### **5. Quality Indicators**

#### **✅ Good Signs**
- **Diverse Factors**: Different factor names across articles
- **Realistic Magnitudes**: Most events 0.01-0.15 range
- **Logical Progressions**: Each step follows from previous
- **Specific Mechanisms**: Clear business reasoning
- **Confident Uncertainty**: High confidence only when warranted
- **Rich Belief Analysis**: Nuanced psychological assessment

#### **❌ Red Flags**
- **Score Clustering**: All confidence scores around 0.5
- **Generic Factors**: Same factor names for different events
- **Magnitude Inflation**: Too many events >0.20 magnitude
- **Missing Links**: Causal steps don't connect logically
- **Emotion Mismatch**: Emotional profile contradicts article tone
- **Extreme Confidence**: 0.9+ confidence on uncertain topics

---

## 🎯 Manual Evaluation Process

### **Step 1: Run Test Scripts**
```bash
# Simple agent test
npx ts-node -r tsconfig-paths/register -r dotenv/config src/scripts/simple-agent-test.ts

# Process multiple articles
npx ts-node -r tsconfig-paths/register -r dotenv/config src/scripts/batch-process-articles.ts
```

### **Step 2: Database Review**
Check `ai_responses` table in Supabase for:
- Processing completion rates
- Response structure validity
- Output quality patterns
- Cost and time efficiency

### **Step 3: Manual Quality Review**

#### **Content Review Checklist**
- [ ] **Event Relevance**: Are identified events actually about Apple?
- [ ] **Business Logic**: Do causal chains make business sense?
- [ ] **Factor Realism**: Are magnitude scores realistic for Apple's scale?
- [ ] **Evidence Basis**: Are claims supported by article content?
- [ ] **Temporal Logic**: Do time horizons match event complexity?

#### **Consistency Testing**
- [ ] **Repeat Processing**: Same article produces similar analysis
- [ ] **Cross-Article**: Different articles produce different patterns
- [ ] **Factor Evolution**: Factor names show reasonable variation
- [ ] **Confidence Patterns**: Confidence correlates with evidence strength

---

## 📋 Sample Good vs Bad Outputs

### **✅ Good Event Analysis**
```json
{
  "event_type": "Product_Announcement",
  "causal_chain": [
    {
      "step": 0,
      "factor": "ai_feature_integration",
      "magnitude": 0.03,
      "description": "New AI capabilities announced for iOS"
    },
    {
      "step": 1,
      "factor": "user_engagement_score", 
      "magnitude": 0.04,
      "description": "Enhanced user experience drives engagement"
    },
    {
      "step": 2,
      "factor": "units_sold",
      "magnitude": 0.03,
      "description": "Increased engagement triggers upgrade cycle"
    }
  ]
}
```

### **❌ Poor Event Analysis**
```json
{
  "event_type": "Generic_News",
  "causal_chain": [
    {
      "step": 0,
      "factor": "generic_factor",
      "magnitude": 0.5,
      "description": "Something happens"
    },
    {
      "step": 1,
      "factor": "stock_price",
      "magnitude": 0.8,
      "description": "Stock goes up"
    }
  ]
}
```

---

## 🚨 Testing Priorities

### **Phase 1: Basic Functionality** ✅
- [x] Agent responds to requests
- [x] Receives complete metadata
- [x] Returns structured output

### **Phase 2: Content Quality** 🔄
- [ ] Process 10-20 diverse articles
- [ ] Manual review of business logic
- [ ] Magnitude score calibration
- [ ] Factor name standardization

### **Phase 3: Consistency & Scale** ⏳
- [ ] Repeat processing tests
- [ ] Batch processing validation
- [ ] Cost/time optimization
- [ ] Schema refinement

---

## 📊 Success Metrics

### **Quantitative Targets**
- **Processing Success Rate**: >95%
- **Valid JSON Output**: >98%
- **Average Processing Time**: <30 seconds
- **Cost Per Article**: <$0.10
- **Events Per Article**: 1-5 range
- **Causal Chain Length**: 3-5 steps

### **Qualitative Indicators**
- Business logic makes sense to domain experts
- Factor progressions follow logical sequences
- Magnitude scores feel realistic for Apple's scale
- Belief analysis captures market psychology accurately
- Confidence scores correlate with evidence strength

---

## 💡 Next Steps

1. **Process Sample Batch**: Run 10-20 articles through agent
2. **Manual Review Session**: Check outputs against criteria
3. **Schema Refinement**: Fix any structural issues found
4. **Consistency Testing**: Verify repeatability
5. **Production Deployment**: Scale up processing pipeline

---

**Last Updated**: September 1, 2025  
**Agent Version**: Single-pass structured output (GPT-4o)  
**Schema**: business_event_chain_article v1
