#!/usr/bin/env tsx

/**
 * Enhanced Stock Schema for Minute-Level Analysis
 * 
 * Creates comprehensive stock_prices table with all available data fields
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const ENHANCED_STOCK_SCHEMA = `
-- Enhanced Stock Prices Table for Minute-Level Analysis
-- Captures comprehensive market data for news correlation analysis

CREATE TABLE IF NOT EXISTS stock_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic identifiers
    ticker VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- OHLCV (Open, High, Low, Close, Volume)
    open_price DECIMAL(12, 4),
    high_price DECIMAL(12, 4), 
    low_price DECIMAL(12, 4),
    close_price DECIMAL(12, 4) NOT NULL,
    volume BIGINT,
    
    -- Advanced price metrics
    vwap DECIMAL(12, 4),                    -- Volume Weighted Average Price
    adjusted_close DECIMAL(12, 4),          -- Corporate action adjusted price
    
    -- Trading activity metrics  
    trade_count INTEGER,                    -- Number of trades in this minute
    notional_value DECIMAL(15, 2),          -- Total dollar value traded
    
    -- Market microstructure (if available)
    bid_price DECIMAL(12, 4),               -- Best bid price
    ask_price DECIMAL(12, 4),               -- Best ask price  
    bid_size INTEGER,                       -- Shares at bid
    ask_size INTEGER,                       -- Shares at ask
    spread DECIMAL(8, 4),                   -- Bid-ask spread
    
    -- Corporate actions (for daily adjustments)
    dividend_amount DECIMAL(10, 4),         -- Dividend paid this period
    split_coefficient DECIMAL(8, 4),        -- Stock split ratio
    
    -- Metadata
    timeframe VARCHAR(10) NOT NULL DEFAULT '1Min',  -- 1Min, 5Min, 1Hour, 1Day
    source VARCHAR(50) NOT NULL,            -- alpaca, tiingo, polygon, etc.
    data_quality_score DECIMAL(3, 2),       -- Quality score (0.0-1.0)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient minute-level querying
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_timestamp ON stock_prices(ticker, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_timestamp ON stock_prices(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_timeframe ON stock_prices(ticker, timeframe);
CREATE INDEX IF NOT EXISTS idx_stock_prices_source ON stock_prices(source);
CREATE INDEX IF NOT EXISTS idx_stock_prices_volume ON stock_prices(volume) WHERE volume IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_prices_vwap ON stock_prices(vwap) WHERE vwap IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_timestamp_timeframe 
ON stock_prices(ticker, timestamp, timeframe);

-- Unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_prices_unique 
ON stock_prices(ticker, timestamp, timeframe, source);

-- Partial indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_prices_minute_data 
ON stock_prices(ticker, timestamp) 
WHERE timeframe = '1Min';

-- Comments for documentation
COMMENT ON TABLE stock_prices IS 'Comprehensive minute-level stock price data for news correlation analysis';
COMMENT ON COLUMN stock_prices.ticker IS 'Stock ticker symbol (e.g., AAPL)';
COMMENT ON COLUMN stock_prices.timestamp IS 'Exact timestamp of the price data point';
COMMENT ON COLUMN stock_prices.timeframe IS 'Data granularity: 1Min, 5Min, 1Hour, 1Day';
COMMENT ON COLUMN stock_prices.vwap IS 'Volume-weighted average price for this period';
COMMENT ON COLUMN stock_prices.trade_count IS 'Number of individual trades in this period';
COMMENT ON COLUMN stock_prices.notional_value IS 'Total dollar value of shares traded';
COMMENT ON COLUMN stock_prices.data_quality_score IS 'Data completeness/reliability score (0.0-1.0)';

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_prices_updated_at 
    BEFORE UPDATE ON stock_prices 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Example minute-level queries for article correlation
-- 
-- 1. Get Apple price at specific article publish time:
-- SELECT * FROM stock_prices 
-- WHERE ticker = 'AAPL' 
-- AND timestamp BETWEEN '2024-01-15 14:30:00' AND '2024-01-15 14:35:00'
-- AND timeframe = '1Min'
-- ORDER BY timestamp LIMIT 1;
--
-- 2. Get price movement around news event:
-- SELECT timestamp, close_price, volume, trade_count 
-- FROM stock_prices 
-- WHERE ticker = 'AAPL'
-- AND timestamp BETWEEN '2024-01-15 14:25:00' AND '2024-01-15 14:45:00'  
-- AND timeframe = '1Min'
-- ORDER BY timestamp;
--
-- 3. Calculate price impact in 30 minutes after article:
-- WITH article_time AS (SELECT '2024-01-15 14:30:00'::timestamptz as pub_time)
-- SELECT 
--   AVG(close_price) as avg_price_after,
--   MAX(high_price) as max_price_after,
--   SUM(volume) as total_volume_after
-- FROM stock_prices, article_time
-- WHERE ticker = 'AAPL'
-- AND timestamp BETWEEN pub_time AND pub_time + INTERVAL '30 minutes'
-- AND timeframe = '1Min';
`;

async function createEnhancedStockSchema() {
    console.log('🗄️ CREATING ENHANCED STOCK SCHEMA');
    console.log('=================================\n');
    
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase environment variables');
        console.log('📋 MANUAL SETUP REQUIRED:');
        console.log('Copy this SQL to your Supabase SQL Editor:');
        console.log('=====================================');
        console.log(ENHANCED_STOCK_SCHEMA);
        return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection
    console.log('🔌 Testing database connection...');
    try {
        const { error } = await supabase.from('articles').select('count').limit(1);
        if (error && !error.message.includes('does not exist')) {
            console.log(`❌ Connection failed: ${error.message}`);
            return;
        }
        console.log('✅ Database connection successful');
    } catch (error: any) {
        console.log(`❌ Connection error: ${error.message}`);
        return;
    }
    
    console.log('\n📊 This enhanced schema includes:');
    console.log('- ✅ Full OHLCV data (Open, High, Low, Close, Volume)');
    console.log('- ✅ VWAP (Volume Weighted Average Price)');
    console.log('- ✅ Trade count and notional value');
    console.log('- ✅ Bid/Ask prices and sizes (when available)');
    console.log('- ✅ Corporate action adjustments');
    console.log('- ✅ Multiple timeframes (1Min, 5Min, 1Hour, 1Day)');
    console.log('- ✅ Data quality scoring');
    console.log('- ✅ Optimized indexes for minute-level queries');
    
    console.log('\n📋 MANUAL SETUP REQUIRED:');
    console.log('Since automatic table creation failed, please:');
    console.log('1. Go to: https://supabase.com/dashboard/project/umwliedtynxywavrhacy');
    console.log('2. Click "SQL Editor"');  
    console.log('3. Run the SQL schema shown above');
    console.log('4. Then test with: npx tsx src/scripts/test-minute-precision.ts');
    
    console.log('\n🎯 This schema solves your minute-level requirements:');
    console.log('- Store Apple stock price at EXACT minute of article publication');
    console.log('- Track price movements before/after news events');
    console.log('- Capture comprehensive market data for analysis');
    console.log('- Support multiple timeframes for different analysis needs');
}

// Export the schema for manual setup
export const STOCK_SCHEMA_SQL = ENHANCED_STOCK_SCHEMA;

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
    createEnhancedStockSchema().catch(console.error);
}

export { createEnhancedStockSchema };
