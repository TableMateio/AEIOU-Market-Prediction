-- Enhanced Stock Prices Table for AEIOU Market Prediction
-- Supports minute-level data from multiple sources (Polygon, Tiingo, etc.)

CREATE TABLE IF NOT EXISTS stock_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Core identifiers
    ticker VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- OHLCV data (standard)
    open DECIMAL(12, 4),
    high DECIMAL(12, 4), 
    low DECIMAL(12, 4),
    close DECIMAL(12, 4) NOT NULL,
    volume BIGINT,
    
    -- Advanced trading metrics
    vwap DECIMAL(12, 4),           -- Volume-Weighted Average Price
    trade_count INTEGER,           -- Number of trades in this period
    
    -- Metadata
    source VARCHAR(50) NOT NULL DEFAULT 'polygon',
    timeframe VARCHAR(10) NOT NULL DEFAULT '1Min', -- 1Min, 5Min, 1Hour, 1Day
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_timestamp ON stock_prices(ticker, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_timestamp ON stock_prices(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_timeframe ON stock_prices(ticker, timeframe);
CREATE INDEX IF NOT EXISTS idx_stock_prices_source ON stock_prices(source);

-- Prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_prices_unique 
ON stock_prices(ticker, timestamp, timeframe, source);

-- Add update trigger
CREATE OR REPLACE FUNCTION update_stock_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stock_prices_updated_at
    BEFORE UPDATE ON stock_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_prices_updated_at();
