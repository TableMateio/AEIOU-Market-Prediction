# 🚀 AEIOU Scaling Strategy: From 119 to 10,000+ ML Training Rows

## 📊 Current State vs Target
- **Current**: 119 business factors from 12 articles
- **Target Phase 1**: 2,000+ business factors (200+ articles) 
- **Target Phase 2**: 10,000+ business factors (1,000+ articles)
- **Timeline**: 3-6 months to robust ML model

---

## 🗞️ News API Strategy

### **Recommended Primary API: NewsAPI.ai**
**Why NewsAPI.ai wins:**
✅ **Full article content** (not just headlines)  
✅ **Financial news focus** with advanced filtering  
✅ **150,000+ sources** including Bloomberg, Reuters, WSJ  
✅ **Entity extraction** and sentiment analysis built-in  
✅ **Historical data access** going back years  
✅ **Bulk pricing** scales with volume  

**Pricing Analysis:**
- **Starter**: $90/month - 10,000 articles/month  
- **Professional**: $290/month - 50,000 articles/month  
- **Enterprise**: $890/month - 200,000 articles/month  

**ROI Calculation:**
- **Target**: 1,000 articles = ~$290/month for robust dataset
- **Alternative**: GNews free (100/day) = 2.7 years to collect same data

### **Secondary Option: Polygon.io News**
- Already integrated in your system
- Good for Apple-specific financial coverage
- Can supplement NewsAPI.ai for redundancy

---

## 📈 Stock Data API Strategy

### **Recommended Primary API: Polygon.io**
**Why Polygon.io for stock data:**
✅ **Minute-level intraday data** (perfect for your time horizons)  
✅ **2+ years historical** minute-by-minute coverage  
✅ **Real-time data** for live analysis  
✅ **Already integrated** in your system  
✅ **Reasonable pricing** vs alternatives  

**Pricing:**
- **Starter**: $99/month - Real-time + 2 years historical
- **Developer**: $199/month - Unlimited historical + faster API
- **Advanced**: $399/month - Premium data feeds

### **Your Time Horizon Requirements:**
```
Publication Time → Stock Price Snapshots:
- 5 minutes before publication
- At publication time  
- +5 min, +15 min, +1 hour, +2 hour, +4 hour
- End of day, next morning
- +1 day, +3 days, +7 days, +14 days
- +1 month, +3 months, +6 months, +1 year
```

**Data Points Per Article**: ~15 time snapshots  
**1,000 articles × 15 snapshots = 15,000 stock price data points**

---

## 💻 Computing Infrastructure Strategy

### **Mac Studio Assessment**
**Your Mac Studio specs likely:**
- M2 Ultra: 24-core CPU, 60-core GPU
- 64-128GB RAM
- **Verdict**: Sufficient for 10,000 row random forest!

**Processing Estimates:**
- **Data Collection**: Mac Studio handles easily
- **AI Processing**: ~2-3 articles/minute with GPT-4o
- **Random Forest Training**: 10,000 rows trains in minutes
- **No cloud needed initially** - Mac Studio is overkill for this scale

### **When to Scale to Cloud:**
- **100,000+ articles** (probably never needed)
- **Real-time prediction API** serving users
- **Multiple stock symbols** beyond Apple

---

## 🎯 3-Phase Execution Plan

### **Phase 1: Foundation (Month 1)**
**Goal**: 2,000 business factors (200+ articles)

**Week 1-2: API Setup**
- [ ] Subscribe to NewsAPI.ai Starter ($90/month)
- [ ] Upgrade Polygon.io for historical data ($99/month)
- [ ] Create bulk article collection scripts
- [ ] Implement stock price time-horizon collection

**Week 3-4: Data Collection**
- [ ] Collect 50 articles/week using strategic sampling:
  - **2023**: 20 articles (various months)
  - **2024**: 20 articles (various months)  
  - **2025**: 10 articles (recent)
- [ ] Process all through updated AI system
- [ ] Collect corresponding stock price time-series

**Success Metrics:**
- ✅ 2,000+ business factors
- ✅ 3,000+ stock price data points
- ✅ 18+ month time range coverage

### **Phase 2: Scale (Month 2-3)**
**Goal**: 10,000 business factors (1,000+ articles)

**Strategy**: 
- **Historical Sweep**: Systematic collection across 2+ years
- **Event Diversity**: Earnings, product launches, analyst reports, market events
- **Time Distribution**: Even sampling across quarters/seasons
- **Quality Focus**: Apple-relevant financial news priority

**Weekly Target**: 100 articles/week processing
**Pipeline**: Automated daily collection + batch processing

### **Phase 3: ML Model (Month 3-6)**
**Goal**: Production random forest model

**Model Development:**
- **Feature Engineering**: Technical indicators, volatility measures  
- **Target Variables**: Multi-horizon returns (5min to 1year)
- **Random Forest Tuning**: 100-500 trees, optimal depth
- **Validation**: Time-series cross-validation
- **Production API**: Real-time prediction endpoint

---

## 💰 Cost Analysis

### **Monthly API Costs**
| Service | Plan | Cost | Capacity |
|---------|------|------|----------|
| NewsAPI.ai | Professional | $290 | 50,000 articles/month |
| Polygon.io | Developer | $199 | Unlimited historical |
| **Total** | | **$489/month** | Production-ready scale |

### **ROI Justification**
- **6 months total cost**: ~$3,000
- **Alternative**: 27 months of free APIs + engineer time
- **Benefit**: Professional-grade dataset ready for investment decisions

---

## 🔧 Implementation Scripts Needed

### **Article Collection Pipeline**
```typescript
// src/pipelines/bulk-collection.ts
- NewsAPI.ai integration with financial filters
- Strategic date sampling across 2+ years  
- Duplicate detection and quality filtering
- Rate limiting and error handling
```

### **Stock Price Collection Pipeline**  
```typescript
// src/pipelines/stock-timeseries.ts
- Article timestamp → 15 stock price snapshots
- Bulk historical data collection
- Intraday minute-level precision
- Market hours handling (pre/after market)
```

### **ML Pipeline**
```typescript
// src/ml/random-forest.ts
- Feature engineering from business factors
- Multi-horizon target variable creation
- Time-series aware train/test splits
- Model training and evaluation
```

---

## 🎯 Success Metrics by Phase

### **Phase 1 (Month 1)**
- [ ] 2,000+ business factors
- [ ] Zero processing waste
- [ ] 15+ time horizons per article
- [ ] <5% data collection errors

### **Phase 2 (Month 2-3)**  
- [ ] 10,000+ business factors
- [ ] 2+ year time coverage
- [ ] 500+ unique calendar days
- [ ] Automated daily collection pipeline

### **Phase 3 (Month 3-6)**
- [ ] Random forest accuracy >65% (1-day returns)
- [ ] Feature importance rankings
- [ ] Real-time prediction API
- [ ] Backtesting framework

---

## 🚨 Risk Mitigation

**API Limitations:**
- NewsAPI.ai backup: Perigon or NewsCatcher
- Polygon.io backup: Alpha Vantage
- Rate limiting: Implement exponential backoff

**Data Quality:**
- Multiple validation layers
- Manual spot-checking of samples
- Automated anomaly detection

**Computing Limits:**
- Monitor Mac Studio memory usage
- Implement batch processing if needed
- Cloud migration plan ready if required

---

## 🔄 Next Steps (This Week)

1. **Subscribe to NewsAPI.ai Starter** ($90/month trial)
2. **Upgrade Polygon.io plan** for historical access
3. **Create bulk collection scripts** 
4. **Test end-to-end pipeline** with 50 articles
5. **Validate stock price time-horizon collection**

**Ready to transform 119 rows into a 10,000+ row production ML system!** 🚀
