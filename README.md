# AEIOU - News-Driven Market Prediction Engine

## 🎯 Project Overview

**AEIOU** is an experimental system that goes beyond simple stock prediction to understand **how news creates investor beliefs and drives market behavior**. Instead of just predicting if a stock will go up or down, it aims to understand *why* by mapping causal chains from:

**News Event** → **Investor Interpretation** → **Expected Business Impact** → **Stock Movement**

## 🏗️ Architecture

This project follows clean architecture principles with TypeScript, Express.js, and modular design:

```
src/
├── config/           # Configuration management with validation
├── data/            
│   ├── sources/     # Abstracted API clients (AlphaVantage, Yahoo, etc.)
│   ├── models/      # Data models and schemas
│   └── storage/     # Airtable and other storage abstractions
├── analysis/
│   ├── causal/      # Causal chain extraction logic
│   ├── validation/  # Reusable validation functions
│   └── patterns/    # Pattern matching algorithms
├── services/        # Business logic services
├── utils/           # Shared utilities (logging, error handling)
└── api/             # Express routes and controllers
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Alpha Vantage API key
- Airtable account and API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file based on the required configuration:
   ```env
   # Environment
   NODE_ENV=development
   PORT=3000
   
   # API Keys (REQUIRED)
   ALPHA_VANTAGE_API_KEY=your_key_here
   AIRTABLE_API_KEY=your_key_here
   AIRTABLE_BASE_ID=your_base_id_here
   
   # Optional configurations
   LOG_LEVEL=info
   MIN_CORRELATION_THRESHOLD=0.7
   DEFAULT_STOCK_SYMBOLS=AAPL,MSFT,GOOGL
   ```

3. **Run in development:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## 📊 Current Status: Phase 1 - Data Foundation

We're currently in **Week 1** of the lean development strategy, focusing on:

- ✅ **Project Setup Complete**: TypeScript, Express, configuration system
- 🔄 **Next**: API access setup, Airtable configuration, data ingestion

### Core Success Criteria for Phase 1:
- News-to-price correlation visible in >70% of major events
- Timestamp accuracy within 30 minutes
- If we can't reliably connect news to price movements, STOP and fix data pipeline

## 🔧 Development Standards

This project follows strict development quality standards:

- **No Hacky Code**: Every piece of code is production-ready
- **Configuration-Driven**: No hardcoded values, everything configurable
- **Clean Separation**: Data layer, business logic, validation, and UI are separate
- **Abstract Smart**: Designed for multiple data sources and stocks, not just Apple

## 📝 Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Run production server
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code quality
npm run lint:fix     # Fix linting issues
```

## 🌐 API Endpoints

Once running, the API will be available at `http://localhost:3000`:

- `GET /health` - Health check
- `GET /api/v1/` - API status and available endpoints
- `GET /api/v1/config` - Configuration (development only)

## 📚 Key Documents

- **[Lean Development Strategy](./ReadMes/Lean%20Development%20Strategy.md)** - Build-test-learn approach
- **[Research](./ReadMes/Research.md)** - 236-page analysis of existing approaches
- **[Hypotheses](./ReadMes/Hypotheses.md)** - 7 core testable hypotheses
- **[Project Description](./ReadMes/Project%20Description.md)** - Detailed vision and goals

## 🚨 Environment Setup Requirements

The application **will not start** without these required environment variables:

- `ALPHA_VANTAGE_API_KEY` - Get from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
- `AIRTABLE_API_KEY` - Get from [Airtable Account](https://airtable.com/account)
- `AIRTABLE_BASE_ID` - Create a base and copy the ID from the URL

## 🎯 Next Steps

1. **Get API Keys**: Alpha Vantage (free tier: 25 requests/day)
2. **Set up Airtable**: Create base with tables for news_events, stock_data, causal_chains
3. **Data Validation**: Test news timestamp precision and coverage
4. **Manual Verification**: Build dashboard for reviewing correlations

---

*This is an experimental research project focused on understanding market psychology through news analysis.* 