# 📈 Tiingo Stock Data Implementation Plan

## 🎯 **Strategy: FREE Tier First**

Based on Tiingo's pricing analysis, we're starting with the **FREE tier** which provides:

✅ **Excellent Coverage**:
- 30+ years of historical data
- 44,066 US & Chinese stocks
- Real-time data access
- EOD "Composite Prices"

✅ **Sufficient Limits for Development**:
- 1,000 requests/day (plenty for testing)
- 500 unique symbols/month
- 1GB bandwidth/month

⚠️ **Rate Limiting Considerations**:
- 50 requests/hour (need to pace requests)
- Internal use only license

---

## 🏗️ **Implementation Architecture**

### Phase 1: Historical Data Foundation
**Goal**: Get historical minute-level data for Apple around article timestamps

**Approach**:
1. **Smart Request Batching**: Group requests to stay under 50/hour limit
2. **Strategic Time Windows**: Focus on ±4 hours around article publication times
3. **Incremental Collection**: Build dataset over time rather than bulk download

### Phase 2: Real-Time Integration
**Goal**: Add real-time data for current analysis

**Approach**:
1. **Daily EOD Updates**: Use composite prices for end-of-day data
2. **Event-Driven Fetching**: Only fetch real-time data when articles are published
3. **Cache Strategy**: Store frequently accessed data locally

---

## 📊 **Data Collection Strategy**

### Target Data Points Per Article:
For each article timestamp, collect stock prices at:
- **Pre-event**: -4h, -1h, -30min, -5min
- **Event time**: Article publication minute
- **Post-event**: +5min, +30min, +1h, +4h, end-of-day, +1 day, +7 days

### Request Optimization:
- **Batch requests**: 10 time points = ~3-4 API calls (using time ranges)
- **Daily budget**: 1000 requests ÷ 4 calls per article = ~250 articles/day
- **Monthly capacity**: ~7,500 articles with historical data

---

## 🔧 **Technical Implementation**

### Rate Limiting Strategy:
```typescript
// Smart rate limiter respects 50/hour limit
class TiingoRateLimiter {
    private requestQueue: Array<() => Promise<any>> = [];
    private lastRequestTime = 0;
    private readonly HOUR_LIMIT = 50;
    private readonly MIN_INTERVAL = 72000; // 72 seconds between requests
}
```

### Data Storage Schema:
Using our existing `stock_prices` table with:
- `source: 'tiingo'`
- `timeframe: '1Min'` for minute data
- `timeframe: '1Day'` for EOD data

### API Endpoints to Use:
1. **EOD Prices**: `/tiingo/daily/{ticker}/prices` (historical)
2. **Intraday**: `/iex/{ticker}/prices` (minute-level, limited history)
3. **Real-time**: `/iex/{ticker}` (current prices)

---

## 📅 **Development Timeline**

### Week 1: Foundation
- [x] Create enhanced stock_prices table ✅
- [ ] Implement Tiingo service with rate limiting
- [ ] Test basic EOD data fetching for Apple
- [ ] Verify data storage pipeline

### Week 2: Historical Collection
- [ ] Implement smart batching for article timestamps
- [ ] Create background job for historical data collection
- [ ] Build data quality validation
- [ ] Test correlation analysis with existing articles

### Week 3: Real-Time Integration
- [ ] Add real-time data fetching
- [ ] Implement event-driven collection triggers
- [ ] Create monitoring dashboard for API usage
- [ ] Optimize request patterns

---

## 💰 **Cost Analysis**

### FREE Tier Capacity:
- **Development Phase**: Perfect for testing and validation
- **Initial Production**: Handle ~250 articles/day with full historical context
- **Scaling Point**: When we exceed 1,000 requests/day consistently

### Upgrade Triggers:
- Need more than 50 requests/hour for real-time analysis
- Require access to Tiingo News feed
- Need fundamental data integration
- Exceed 500 unique symbols/month

### Cost Comparison:
- **Tiingo FREE**: $0/month (perfect for Phase 1)
- **Polygon.io**: $29/month (when we need more throughput)
- **Tiingo Paid**: Unknown pricing (need to contact for quote)

---

## 🚦 **Success Metrics**

### Phase 1 Validation:
- [ ] Successfully fetch historical data for 50+ Apple articles
- [ ] Achieve >70% correlation between news and price movements
- [ ] Stay within rate limits while collecting comprehensive data
- [ ] Validate data quality and timestamp accuracy

### Ready for Phase 2:
- [ ] Automated historical data collection working
- [ ] Clear patterns visible in news-to-price correlations
- [ ] Rate limiting system handling 1,000+ requests/day efficiently
- [ ] Decision point: upgrade to paid tier or continue with free

---

## 🔄 **Next Steps**

1. **Implement Tiingo Service** with smart rate limiting
2. **Test EOD data collection** for Apple stock
3. **Create batch processing** for existing article timestamps
4. **Validate correlation analysis** with collected data
5. **Monitor usage patterns** and optimize request efficiency

**Goal**: Prove the concept works with free tier before committing to paid services! 🎯
