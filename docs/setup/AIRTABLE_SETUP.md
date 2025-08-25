# Airtable Setup Instructions - Dual-Layer Belief Engine Schema

Since Airtable doesn't allow programmatic table creation via API, you need to manually create the tables and fields in your Airtable base.

## Base ID
Your base ID is: `appELkTs9OjcY6g74`

---

## 🏗️ **LINKED RECORD ARCHITECTURE**

This schema uses linked records to normalize data and enable sophisticated analysis of source credibility, author expertise, and topic patterns.

---

## 📰 **Table 1: News Events (Main Table)**

Create a table named "News Events" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| **Title** | Single line text | Primary field |
| **Summary** | Long text | |
| **URL** | URL | |
| **Published Time** | Date and time | Format: ISO |
| **Banner Image** | URL | |
| **Source** | Link to another record | Links to "News Sources" table |
| **Authors** | Link to another record | Links to "Authors" table (multiple) |
| **Topics** | Link to another record | Links to "Topics" table (multiple) |
| **Tickers** | Link to another record | Links to "Tickers" table (multiple) |
| **Overall Sentiment Score** | Number | Precision: 2, Range: -1 to 1 |
| **Overall Sentiment** | Single select | Options: Bearish, Neutral, Bullish |
| **Ticker Sentiments (JSON)** | Long text | Store JSON array of ticker-specific sentiments |
| **Belief Factors (JSON)** | Long text | Store JSON object with 10 belief dimensions |
| **Business Causal Chain (JSON)** | Long text | Store JSON array of business logic steps |
| **Pattern Type** | Single select | Options: feature_driven_refresh, partnership_leverage, competitive_advantage, cost_optimization, market_expansion |
| **Processing Status** | Single select | Options: pending, processing, completed, failed |
| **Causal Chains Extracted** | Checkbox | |
| **Price Impact Measured** | Checkbox | |
| **Created** | Created time | |
| **Last Modified** | Last modified time | |

---

## 📡 **Table 2: News Sources**

Create a table named "News Sources" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| **Source Name** | Single line text | Primary field |
| **Domain** | Single line text | |
| **Credibility Score** | Number | Precision: 2, Range: 0 to 1 |
| **Bias Score** | Number | Precision: 2, Range: -1 to 1 |
| **Institutional Weight** | Number | Precision: 2, Range: 0 to 1 |
| **Retail Weight** | Number | Precision: 2, Range: 0 to 1 |
| **Average Response Time** | Number | Precision: 0, Minutes after event |
| **Article Count** | Count | Count of linked News Events |
| **News Events** | Link to another record | Links to "News Events" table |
| **Created** | Created time | |
| **Last Modified** | Last modified time | |

---

## ✍️ **Table 3: Authors**

Create a table named "Authors" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| **Author Name** | Single line text | Primary field |
| **Source** | Link to another record | Links to "News Sources" table |
| **Expertise Areas** | Multiple select | Options: Technology, Earnings, Financial Markets, Manufacturing, M&A, IPO, Blockchain |
| **Track Record Score** | Number | Precision: 2, Range: 0 to 1 |
| **Sentiment Bias** | Number | Precision: 2, Range: -1 to 1 |
| **Article Count** | Count | Count of linked News Events |
| **News Events** | Link to another record | Links to "News Events" table |
| **Created** | Created time | |
| **Last Modified** | Last modified time | |

---

## 🏷️ **Table 4: Topics**

Create a table named "Topics" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| **Topic Name** | Single line text | Primary field |
| **Category** | Single select | Options: Business, Financial, Strategic, Regulatory, Technical |
| **Market Impact Potential** | Number | Precision: 2, Range: 0 to 1 |
| **Retail Attention Factor** | Number | Precision: 2, Range: 0 to 1 |
| **Institutional Attention Factor** | Number | Precision: 2, Range: 0 to 1 |
| **Article Count** | Count | Count of linked News Events |
| **News Events** | Link to another record | Links to "News Events" table |
| **Created** | Created time | |
| **Last Modified** | Last modified time | |

---

## 📈 **Table 5: Tickers**

Create a table named "Tickers" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| **Symbol** | Single line text | Primary field |
| **Company Name** | Single line text | |
| **Sector** | Single select | Options: Technology, Financial, Healthcare, Consumer, Industrial, Energy |
| **Market Cap** | Number | Precision: 0 |
| **Volatility Score** | Number | Precision: 2, Range: 0 to 1 |
| **News Sensitivity** | Number | Precision: 2, Range: 0 to 1 |
| **Article Count** | Count | Count of linked News Events |
| **News Events** | Link to another record | Links to "News Events" table |
| **Created** | Created time | |
| **Last Modified** | Last modified time | |

---

## 📊 **Table 6: Stock Data**

Create a table named "Stock Data" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| **Ticker** | Link to another record | Links to "Tickers" table |
| **Timestamp** | Date and time | Format: ISO |
| **Open** | Number | Precision: 4 |
| **High** | Number | Precision: 4 |
| **Low** | Number | Precision: 4 |
| **Close** | Number | Precision: 4 |
| **Volume** | Number | Precision: 0 |
| **Price Change** | Number | Precision: 4 |
| **Price Change %** | Number | Precision: 2 |
| **Data Source** | Single select | Options: alpha_vantage, yahoo_finance, other |
| **Interval** | Single select | Options: 1min, 5min, 15min, 30min, 60min, daily |
| **Created** | Created time | |

---

## 🧪 **Table 7: Validation Results**

Create a table named "Validation Results" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| **News Event** | Link to another record | Links to "News Events" table |
| **Test Type** | Single select | Options: timestamp_accuracy, causal_chain_extraction, belief_factor_scoring, pattern_matching, prediction_accuracy |
| **Test Description** | Long text | |
| **Passed** | Checkbox | |
| **Score** | Number | Precision: 3 |
| **Expected Value** | Number | Precision: 4 |
| **Actual Value** | Number | Precision: 4 |
| **Test Parameters (JSON)** | Long text | |
| **Market Conditions** | Single select | Options: bull, bear, sideways, volatile |
| **Validated By** | Single select | Options: automated, manual |
| **Notes** | Long text | |
| **Test Date** | Date and time | Format: ISO |

---

## 🚀 **Quick Setup Steps**

1. **Go to your Airtable base**: https://airtable.com/appELkTs9OjcY6g74
2. **Create each table** using the "Add or import" button
3. **Add fields in order** as specified above
4. **Set up linked relationships**:
   - News Events → Sources (many-to-one)
   - News Events → Authors (many-to-many)
   - News Events → Topics (many-to-many)
   - News Events → Tickers (many-to-many)
   - Authors → Sources (many-to-one)
   - Stock Data → Tickers (many-to-one)
   - Validation Results → News Events (many-to-one)

5. **Configure field types carefully**:
   - Linked record fields must point to correct tables
   - Number fields need proper precision settings
   - Single select options should match exactly

---

## 🔗 **Linked Record Benefits**

**Source Analysis**: Track credibility and bias patterns across all articles
**Author Expertise**: Identify which authors are most accurate for specific topics
**Topic Impact**: Measure which topics drive the most market reaction
**Ticker Sensitivity**: Understand which stocks are most news-sensitive
**Historical Patterns**: Easy to find similar events across time

---

## 🧮 **JSON Data Structure Examples**

### Ticker Sentiments JSON:
```json
[
  {
    "ticker_symbol": "AAPL",
    "relevance_score": 1.0,
    "sentiment_score": 0.8,
    "sentiment_label": "Bullish"
  }
]
```

### Belief Factors JSON:
```json
{
  "intensity_belief": 0.75,
  "duration_belief": 0.60,
  "certainty_level": 0.80,
  "hope_vs_fear": 0.65,
  "doubt_factor": 0.25,
  "attention_intensity": 0.90,
  "social_amplification": 0.70,
  "expert_consensus": 0.85,
  "urgency_perception": 0.60,
  "believability_score": 0.72
}
```

### Business Causal Chain JSON:
```json
[
  {
    "step": 1,
    "business_logic": "AI integration into iOS/macOS",
    "mechanism": "partnership_leverage",
    "raw_impact": 0.15,
    "timeframe": "6_months"
  },
  {
    "step": 2,
    "business_logic": "enhanced user experience → upgrade demand",
    "mechanism": "feature_driven_refresh", 
    "raw_impact": 0.08,
    "timeframe": "12_months"
  }
]
```

---

## ✅ **Verification**

Once tables are created, test the system:

```bash
npm run test
```

The system will verify table structure and populate with test data.

---

## 📋 **Notes**

- **Linked records enable sophisticated analysis** that flat tables cannot support
- **JSON fields store complex data** while maintaining Airtable usability
- **Count fields automatically track** article frequency per source/author/topic
- **This schema scales** to thousands of articles with maintained performance
- **Ready for Supabase migration** when volume requires database upgrade
