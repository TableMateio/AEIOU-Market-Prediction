# 🧠 AEIOU System Context & Logic README

## 📊 **Current Database State (as of Sept 2, 2025)**

### **Total Articles: 63**
- **newsapi_ai**: 19 articles (✅ JUST ADDED - full content, 2020-2024)
- **gnews**: 21 articles (full content)
- **alpha_vantage**: 4 articles (metadata only)
- **polygon**: 11 articles (metadata only)
- **newsapi**: 4 articles (metadata only)
- **finnhub**: 4 articles (metadata only)

### **Content Status:**
- **31 articles with full content** (scraped status: 'scraped')
- **28 articles pending scraping** (only metadata)
- **17 articles processed by AI** (have business_factors extracted)

---

## 🏗️ **Database Architecture**

### **Primary Tables:**
1. **`articles`** - News articles from multiple sources
2. **`ai_responses`** - AI-generated business factor analysis

### **Articles Table Schema (Working Columns):**
```sql
-- Core identification
external_id TEXT              -- Source-specific ID (e.g., 'gnews_abc123')
external_id_type TEXT         -- Source type ('gnews', 'newsapi_ai', etc.)
title TEXT                    -- Article title (max 500 chars)
url TEXT UNIQUE               -- Article URL (primary deduplication key)

-- Content
body TEXT                     -- Full article content (when available)
article_description TEXT      -- Summary/description (max 1000 chars)
source TEXT                   -- Publisher name
published_at TIMESTAMP        -- When article was published

-- Processing status
scraping_status TEXT          -- 'scraped', 'pending', 'failed'
data_source TEXT              -- API source ('gnews', 'newsapi_ai', etc.)
content_type TEXT             -- 'snippet', 'general_news', 'earnings', etc.
apple_relevance_score DECIMAL -- 0.0-1.0 relevance to Apple business

-- Metadata
image_url TEXT                -- Optional image
created_at TIMESTAMP          -- When added to our DB
updated_at TIMESTAMP          -- Last modified
```

### **AI Responses Table:**
```sql
article_id UUID               -- Links to articles.id
agent_id TEXT                 -- AI model identifier
structured_output JSONB       -- Business events and factors
success BOOLEAN               -- Processing success
tokens_used INTEGER           -- API cost tracking
```

---

## 🔄 **Article Collection Workflow**

### **Step 1: Collection from APIs**
- **NewsAPI.ai**: ✅ WORKING - Historical data, full content, 5 tokens/year
- **GNews**: ✅ WORKING - Recent articles, full content, free tier
- **Alpha Vantage**: Metadata only, needs scraping
- **Polygon**: Metadata only, needs scraping

### **Step 2: Database Integration**
- Use existing Supabase client from `src/config/app.ts`
- Follow patterns from `src/scripts/comprehensive-gnews-collection.ts`
- Generate `external_id` using Buffer encoding: `${source}_${base64(url).substring(0,16)}`
- Calculate `apple_relevance_score` based on content analysis

### **Step 3: AI Processing**
- Process articles with full content using `src/scripts/batch-process-articles.ts`
- Extract business factors using GPT-4o with structured output
- Store results in `ai_responses` table

---

## 💾 **Database Integration Guide**

### **Required Environment Variables:**
```bash
# Add to your .env file (you already have these set up)
SUPABASE_PROJECT_URL=https://your-project-id.supabase.co
SUPABASE_API_KEY=your_supabase_anon_key_here
NEWSAPIAI_API_KEY=your_newsapi_ai_key_here
```

### **Database Operations Scripts:**

#### **Check Current Database State:**
```bash
npx tsx src/scripts/check-database-state.ts
```
- Shows total articles by source and status
- Displays recent articles
- Counts AI-processed articles

#### **Add New Articles to Database:**
```bash
# Add collected articles using correct schema
npx tsx src/scripts/add-newsapi-articles-correct.ts
```
- Transforms articles to match existing schema
- Handles duplicates via URL conflicts
- Calculates Apple relevance scores
- Uses existing Supabase client patterns

#### **Process Articles with AI:**
```bash
npx tsx src/scripts/batch-process-articles.ts
```
- Processes articles with full content
- Extracts business factors using structured GPT-4o
- Stores results in `ai_responses` table

### **Database Schema Integration:**
```typescript
// Standard article transformation pattern
const transformedArticle = {
    external_id: `newsapi_ai_${Buffer.from(url).toString('base64').substring(0, 16)}`,
    external_id_type: 'newsapi_ai',
    title: title.substring(0, 500),
    url: url,
    published_at: new Date(date).toISOString(),
    source: source,
    article_description: body ? body.substring(0, 1000) : null,
    body: body, // Full content
    scraping_status: body ? 'scraped' : 'pending',
    data_source: 'newsapi_ai',
    content_type: 'general_news',
    apple_relevance_score: calculateRelevanceScore(title, body),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

// Insert using existing Supabase client
const { data, error } = await supabase
    .from('articles')
    .insert(transformedArticle)
    .select('id');
```

---

## 🎯 **NewsAPI.ai Collection Strategy**

### **Token Economics:**
- **Cost**: 5 tokens per YEAR searched (not per article)
- **Budget**: 5000 tokens/month ($90/month plan)
- **Efficiency**: Can search Jan-Dec 2024 for same cost as Aug 2024

### **Current Approach (WORKING):**
```typescript
// Random sampling across years
const searches = [
    { query: 'Apple', dateStart: '2020-01-01', dateEnd: '2020-12-31', sort: 'relevance' },
    { query: 'AAPL', dateStart: '2021-01-01', dateEnd: '2021-12-31', sort: 'date' },
    { query: 'Apple Inc', dateStart: '2022-01-01', dateEnd: '2022-12-31', sort: 'socialScore' }
];
```

### **Randomization Strategy:**
- **Time**: Spread across 2020-2024 (5 years)
- **Queries**: Rotate between 'Apple', 'AAPL', 'Apple Inc'
- **Sorts**: Mix 'relevance', 'date', 'socialScore'
- **Sources**: 50% use top 25% Alexa ranking filter

### **Quality Filters:**
- Must mention Apple/AAPL in title or body
- Minimum 300 characters body length
- Exclude how-to/tutorial articles
- English language only
- US sources preferred

---

## 🔍 **Your Specific Questions - ANSWERED**

### **Q: "Why different sort orders for randomization?"**
**A**: Different sorts return different article sets from the same time period:
- `relevance` - Most important/relevant articles first
- `date` - Chronological order (newest first)
- `socialScore` - Most shared/discussed articles first

### **Q: "How to get variety within a time period?"**
**A**: Two approaches:
1. **Current**: Use different sort orders to get different "slices" of articles
2. **Alternative**: Search day-by-day and take top N from each day

### **Q: "Are these official content types?"**
**A**: Mixed - some are NewsAPI.ai official categories, others we assign:
- **Official**: Categories from `article.categories[0].label`
- **Assigned**: Based on query type ('earnings', 'stock_news', 'general_news')

### **Q: "Can one search have multiple content types?"**
**A**: No - each search returns articles, we categorize them individually after collection.

### **Q: "Top 50% vs 25% source filtering?"**
**A**: Need to test - use `sourceRankingThreshold: 50` vs `25` to compare quality/quantity.

---

## 🚀 **Scaling Strategy**

### **Immediate Next Steps:**
1. **Scale Collection**: Use 100-200 tokens to get ~100 more diverse articles
2. **Process with AI**: Run batch processing on full-content articles
3. **Add Stock Data**: Integrate Alpaca/Tiingo for price movements
4. **Build ML Dataset**: Flatten business_factors for random forest training

### **Collection Commands:**
```bash
# Get 100 diverse articles (cost: ~50 tokens = $1)
npx tsx src/scripts/collect-and-save-final.ts 100

# Check current database state
npx tsx src/scripts/check-database-state.ts

# Process articles with AI
npx tsx src/scripts/batch-process-articles.ts
```

---

## 🔧 **Working Scripts Reference**

### **Database Operations:**
- `src/scripts/check-database-state.ts` - Check current articles
- `src/scripts/add-newsapi-articles-correct.ts` - Add new articles (WORKING)
- `src/scripts/batch-process-articles.ts` - AI processing

### **Collection Scripts:**
- `src/scripts/collect-and-save-final.ts` - Main collection script
- `src/scripts/comprehensive-gnews-collection.ts` - GNews collection patterns

### **Configuration:**
- `src/config/app.ts` - Supabase and API key configuration
- Environment variables: `SUPABASE_PROJECT_URL`, `SUPABASE_API_KEY`, `NEWSAPIAI_API_KEY`

---

## ⚠️ **Common Pitfalls - DON'T DO THIS**

### **❌ Wrong Approaches:**
1. **Don't reinvent database integration** - Use existing Supabase client
2. **Don't create new schemas** - Use existing column names
3. **Don't search by individual days** - Use year ranges for efficiency
4. **Don't ignore duplicate handling** - Always use `ON CONFLICT (url)`

### **✅ Correct Patterns:**
1. **Follow existing scripts** - Copy patterns from working GNews scripts
2. **Use proper column names** - `external_id`, `data_source`, `apple_relevance_score`
3. **Calculate relevance scores** - Based on content analysis like existing scripts
4. **Handle errors gracefully** - Track inserted/duplicate/error counts

---

## 📈 **Success Metrics**

### **Current Status:**
- ✅ **63 total articles** (up from 44)
- ✅ **Multiple data sources** working
- ✅ **31 articles with full content** ready for AI
- ✅ **Proper database integration** using existing systems

### **Next Milestones:**
- **Target**: 200+ articles for robust ML training
- **Diversity**: 50+ unique sources across 5 years
- **AI Processing**: 100+ articles with business factors extracted
- **Stock Integration**: Price data for all article timestamps

---

## 💡 **Key Insights**

### **What's Working:**
- NewsAPI.ai provides excellent historical coverage with full content
- Random sampling across time/queries/sources gives good diversity
- Existing database schema handles multiple sources well
- AI processing pipeline is functional and scalable

### **What Needs Attention:**
- Date randomization within time periods (your concern about day spread)
- Source filtering optimization (50% vs 25% testing)
- Pending article scraping (28 articles need full content)
- Stock data integration for ML targets

### **Business Logic:**
- Focus on Apple business relevance, not just mention frequency
- Exclude tutorial/how-to content as requested
- Prioritize articles that discuss business impacts, not product features
- Balance temporal distribution for ML training effectiveness

---

This README should prevent future context loss and ensure consistent development patterns. Update it as the system evolves!
