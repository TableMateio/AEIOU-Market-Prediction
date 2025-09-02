-- Stock Prices Table Migration
-- Stores minute-level stock price data for analysis

CREATE TABLE IF NOT EXISTS stock_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    price DECIMAL(10, 4) NOT NULL,
    volume BIGINT,
    source VARCHAR(50) NOT NULL DEFAULT 'alpaca',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_timestamp ON stock_prices(ticker, timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_timestamp ON stock_prices(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker ON stock_prices(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_prices_source ON stock_prices(source);

-- Create a composite unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_prices_unique 
ON stock_prices(ticker, timestamp, source);

-- Add comments for documentation
COMMENT ON TABLE stock_prices IS 'Stores minute-level stock price data from various sources';
COMMENT ON COLUMN stock_prices.ticker IS 'Stock ticker symbol (e.g., AAPL)';
COMMENT ON COLUMN stock_prices.timestamp IS 'Exact timestamp of the price data point';
COMMENT ON COLUMN stock_prices.price IS 'Stock price at the given timestamp';
COMMENT ON COLUMN stock_prices.volume IS 'Trading volume at the given timestamp';
COMMENT ON COLUMN stock_prices.source IS 'Data source (alpaca, tiingo, etc.)';

-- Create updated_at trigger
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
