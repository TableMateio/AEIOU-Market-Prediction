# Stock Database Setup Instructions

## Manual Database Setup Required

Since we can't automatically create tables via the client, please run this SQL in your Supabase dashboard:

### 1. Go to Supabase Dashboard
- Navigate to: https://supabase.com/dashboard/project/umwliedtynxywavrhacy
- Click on "SQL Editor" in the left sidebar

### 2. Run This SQL to Create the Stock Prices Table

```sql
-- Stock Prices Table Migration
-- Stores stock price data for analysis

CREATE TABLE IF NOT EXISTS stock_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    price DECIMAL(10, 4) NOT NULL,
    volume BIGINT,
    source VARCHAR(50) NOT NULL DEFAULT 'tiingo',
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
COMMENT ON TABLE stock_prices IS 'Stores stock price data from various sources';
COMMENT ON COLUMN stock_prices.ticker IS 'Stock ticker symbol (e.g., AAPL)';
COMMENT ON COLUMN stock_prices.timestamp IS 'Exact timestamp of the price data point';
COMMENT ON COLUMN stock_prices.price IS 'Stock price at the given timestamp';
COMMENT ON COLUMN stock_prices.volume IS 'Trading volume at the given timestamp';
COMMENT ON COLUMN stock_prices.source IS 'Data source (tiingo, alpaca, etc.)';

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
```

### 3. Verify Table Creation

After running the SQL, you should see:
- ✅ `stock_prices` table created
- ✅ Indexes created for performance
- ✅ Unique constraint to prevent duplicates
- ✅ Trigger for automatic `updated_at` timestamps

### 4. Test the Setup

Run our test script to verify everything works:

```bash
npx tsx src/scripts/test-stock-data-service.ts
```

## Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `ticker` | VARCHAR(10) | Stock symbol (e.g., 'AAPL') |
| `timestamp` | TIMESTAMPTZ | Date/time of the price point |
| `price` | DECIMAL(10,4) | Stock price (close price) |
| `volume` | BIGINT | Trading volume (optional) |
| `source` | VARCHAR(50) | Data source ('tiingo', 'alpaca', etc.) |
| `created_at` | TIMESTAMPTZ | Record creation time |
| `updated_at` | TIMESTAMPTZ | Last update time |

## Usage Examples

Once set up, you can:

1. **Store daily Apple prices from Tiingo**
2. **Query prices at specific timestamps**
3. **Get price ranges around article publication times**
4. **Build time-series for correlation analysis**

## Next Steps After Setup

1. ✅ Create table manually (follow steps above)
2. 🔄 Test data insertion and retrieval
3. 📊 Start collecting Apple stock data
4. 🔗 Connect to article timestamps
5. 📈 Build correlation analysis
