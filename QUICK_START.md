# 🚀 AEIOU Quick Start Guide

## 📋 Prerequisites Checklist

- [x] ✅ Node.js 18+ installed
- [x] ✅ Git repository set up: https://github.com/TableMateio/AEIOU-Market-Prediction
- [x] ✅ Alpha Vantage API key: `6C0N1DD7TBKHWGWN`
- [x] ✅ Airtable API key: `patsX17jaZx0VrzHQ.946a080e741106266d959f6e57fdd1d19a9edc7bdfa0b5dd675494ab3f41db00`
- [x] ✅ Airtable Base ID: `appELkTs9OjcY6g74`
- [ ] ⏳ Airtable tables created
- [ ] ⏳ Environment file configured

## 🏁 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Create Environment File
Copy `env.example` to `.env` and update with your keys:
```bash
cp env.example .env
```

Edit `.env` with your API keys:
```env
NODE_ENV=development
PORT=3000

# Your actual API keys
ALPHA_VANTAGE_API_KEY=6C0N1DD7TBKHWGWN
AIRTABLE_API_KEY=patsX17jaZx0VrzHQ.946a080e741106266d959f6e57fdd1d19a9edc7bdfa0b5dd675494ab3f41db00
AIRTABLE_BASE_ID=appELkTs9OjcY6g74

# Default settings (can be left as-is)
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=25
LOG_LEVEL=info
LOG_FORMAT=simple
MIN_CORRELATION_THRESHOLD=0.7
TIMESTAMP_ACCURACY_THRESHOLD_MINUTES=30
NEWS_COVERAGE_THRESHOLD=0.8
DEFAULT_STOCK_SYMBOLS=AAPL,MSFT,GOOGL
MARKET_HOURS_START=09:30
MARKET_HOURS_END=16:00
TIMEZONE=America/New_York
```

### Step 3: Set Up Airtable Tables
Follow the detailed instructions in `AIRTABLE_SETUP.md`:

1. Go to: https://airtable.com/appELkTs9OjcY6g74
2. Create 4 tables: "News Events", "Stock Data", "Causal Chains", "Validation Results"
3. Add fields as specified in the setup guide

### Step 4: Test the System
```bash
# Start the development server
npm run dev

# In another terminal, test the system
curl http://localhost:3000/api/v1/test
```

## 🧪 System Test Results

When you visit `http://localhost:3000/api/v1/test`, you should see:

### ✅ Successful Response:
```json
{
  "success": true,
  "message": "All systems operational! AEIOU is ready for Phase 1 validation.",
  "testResults": {
    "alphaVantageConnection": true,
    "stockDataFetch": true,
    "newsFetch": true,
    "airtableStorage": true,
    "overall": true
  },
  "timestamp": "2024-01-XX..."
}
```

### ❌ If Something Fails:
- **Alpha Vantage Connection**: Check your API key in `.env`
- **Stock/News Fetch**: Verify API key is valid and has remaining requests
- **Airtable Storage**: Ensure tables are created with exact field names from setup guide

## 🎯 Available Endpoints

Once running, you can access:

- **Health Check**: `GET http://localhost:3000/health`
- **API Info**: `GET http://localhost:3000/api/v1/`
- **System Test**: `GET http://localhost:3000/api/v1/test`
- **API Usage**: `GET http://localhost:3000/api/v1/test/usage`
- **Config** (dev only): `GET http://localhost:3000/api/v1/config`

## 📊 What the Test Does

The system test validates:

1. **Alpha Vantage API**: Connects and checks rate limits
2. **Stock Data**: Fetches live Apple (AAPL) stock quote
3. **News Data**: Retrieves 5 latest Apple news articles
4. **Airtable Storage**: Creates a test validation record

## 🔄 Development Workflow

Following our Git practices:

```bash
# Make changes
git add .
git commit -m "🔥 [TYPE] Description - Context"
git push origin main
```

## 📈 Alpha Vantage Usage

**Current Limits** (Free Tier):
- 25 requests/day
- 5 requests/minute
- Perfect for initial Phase 1 validation

**Upgrade Path** (if validation succeeds):
- Premium: $49.99/month = 1,200 requests/minute
- See `docs/Alpha-Vantage-Scaling.md` for details

## 🎯 Phase 1 Next Steps

Once all tests pass:

1. **Timestamp Validation**: Test news-to-price correlation timing
2. **Coverage Testing**: Compare Alpha Vantage vs manual news search
3. **Data Accuracy**: Cross-validate with Yahoo Finance
4. **Manual Dashboard**: Build verification interface

**Success Criteria**: >70% correlation between news events and stock movements within 30 minutes

## 🆘 Troubleshooting

### Common Issues:

**"Config validation error"**
- Check your `.env` file exists and has all required variables

**"Alpha Vantage rate limit exceeded"**
- Wait 15 minutes or check usage with `/api/v1/test/usage`

**"Airtable API error"**
- Verify tables exist with exact names from setup guide
- Check API key permissions include read/write access

**TypeScript errors**
- Run `npm run build` to check for compilation issues
- Ensure all imports are correctly typed

## 🎉 Ready to Go!

If the system test passes, you're ready to begin Phase 1 validation testing. The foundation is solid and all data sources are connected and working!

---

**Repository**: https://github.com/TableMateio/AEIOU-Market-Prediction  
**Current Phase**: Phase 1 - Data Foundation ✅  
**Next Milestone**: Validate news-to-price correlation assumptions 