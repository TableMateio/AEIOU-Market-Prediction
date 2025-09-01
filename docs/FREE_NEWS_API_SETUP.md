# 🆓 Free News API Setup Guide

This guide will help you get **free API keys** for collecting Apple news articles with **full content** and **date filtering**.

## 🚀 Quick Setup (5 minutes total)

### 1. **GNews API** (Priority #1 - Full Content!)
- **URL**: https://gnews.io/
- **Free Tier**: 100 requests/day
- **Content**: ✅ **FULL article body text**
- **Date Range**: ✅ Any date range
- **Apple Search**: ✅ Keyword filtering

**Setup Steps**:
1. Go to https://gnews.io/
2. Click "Get API Key"
3. Sign up with email
4. Copy your API key
5. Add to `.env`: `GNEWS_API_KEY=your_key_here`

---

### 2. **NewsData.io** (Priority #2 - High Volume)
- **URL**: https://newsdata.io/
- **Free Tier**: 500 requests/day
- **Content**: ❌ Headlines only (need to scrape)
- **Date Range**: ✅ Up to 5 years back
- **Apple Search**: ✅ Advanced filtering

**Setup Steps**:
1. Go to https://newsdata.io/
2. Click "Get Free API Key"
3. Create account
4. Copy your API key
5. Add to `.env`: `NEWSDATA_API_KEY=your_key_here`

---

### 3. **NewsAPI.org** (Priority #3 - Backup)
- **URL**: https://newsapi.org/
- **Free Tier**: 1000 requests/day
- **Content**: ❌ Headlines only
- **Date Range**: ✅ Last 30 days only
- **Apple Search**: ✅ Keyword filtering

**Setup Steps**:
1. Go to https://newsapi.org/
2. Click "Get API Key"
3. Register account
4. Copy your API key
5. Add to `.env`: `NEWSAPI_ORG_KEY=your_key_here`

---

### 4. **MediaStack** (Optional - Low Volume)
- **URL**: https://mediastack.com/
- **Free Tier**: 500 requests/month (not daily!)
- **Content**: ❌ Headlines only
- **Date Range**: ✅ Any date range
- **Apple Search**: ✅ Keyword filtering

**Setup Steps**:
1. Go to https://mediastack.com/
2. Sign up for free account
3. Get API key from dashboard
4. Add to `.env`: `MEDIASTACK_API_KEY=your_key_here`

---

## 📊 **Combined Daily Capacity**

| API | Daily Limit | Content Type | Best Use |
|-----|-------------|--------------|----------|
| GNews | 100 | **Full Content** | High-priority articles |
| NewsData.io | 500 | Headlines only | Article discovery |
| NewsAPI.org | 1000 | Headlines only | Recent news backup |
| MediaStack | ~16/day | Headlines only | Historical backup |

**Total**: ~1,600 articles/day (100 with full content + 1,500 for scraping)

---

## 🎯 **Usage Strategy**

### **Phase 1: Core Collection**
```bash
# Collect 60 high-quality articles with full content (GNews)
npm run collect-historical-apple-news
```

### **Phase 2: Scale Up**
```bash
# Collect 500+ article URLs for scraping (NewsData.io)
npm run collect-newsdata-articles
```

### **Phase 3: Recent News**
```bash
# Daily monitoring with NewsAPI.org (1000/day)
npm run monitor-recent-apple-news
```

---

## 🔧 **Environment Setup**

After getting your API keys, your `.env` file should look like:

```bash
# News API Keys (FREE TIERS)
GNEWS_API_KEY=abc123def456...                    # 100/day, FULL content
NEWSDATA_API_KEY=xyz789uvw456...                 # 500/day, metadata only
NEWSAPI_ORG_KEY=mno345pqr678...                  # 1000/day, headlines only
MEDIASTACK_API_KEY=stu901vwx234...               # 500/month, headlines only
```

---

## 📈 **Expected Results**

With all APIs configured, you can collect:

- **60-100 full articles/day** (with complete body text)
- **1,500+ article URLs/day** (for scraping)
- **Historical data** going back 5+ years
- **Real-time monitoring** of Apple news

This gives us enough data to:
1. ✅ Test our AI analysis pipeline
2. ✅ Validate news-to-price correlations
3. ✅ Build historical pattern database
4. ✅ Scale to other stocks

---

## 🚨 **Rate Limit Monitoring**

Our scripts automatically track usage:
- **GNews**: Shows `X/100` daily usage
- **NewsData**: Shows `X/500` daily usage  
- **NewsAPI**: Shows `X/1000` daily usage
- **MediaStack**: Shows `X/500` monthly usage

---

## 🎉 **Next Steps**

1. **Get API keys** (5 minutes)
2. **Update `.env` file** 
3. **Run collection script**: `npm run collect-historical-apple-news`
4. **Check results** in database
5. **Scale up** with additional APIs

Need help? Check the logs for detailed API usage and error handling!
