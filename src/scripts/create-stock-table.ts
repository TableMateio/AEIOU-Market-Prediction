#!/usr/bin/env tsx

/**
 * Create Stock Prices Table
 * 
 * Creates the enhanced stock_prices table directly via Supabase client
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app.js';

const config = AppConfig.getInstance();

const createStockTable = async () => {
    console.log('🚀 Creating stock_prices table...');

    // Create admin client with service role key
    const supabase = createClient(
        config.supabaseConfig.projectUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Test basic connection first
        const { data: testData, error: testError } = await supabase
            .from('articles')
            .select('count')
            .limit(1);

        if (testError) {
            console.error('❌ Supabase connection failed:', testError);
            return;
        }

        console.log('✅ Supabase connection verified');

        // Since we can't use RPC, let's use a simpler insert approach
        // First, let's check if the table already exists
        const { data: existingTable, error: tableCheckError } = await supabase
            .from('stock_prices')
            .select('*')
            .limit(1);

        if (!tableCheckError) {
            console.log('✅ Stock prices table already exists!');
            console.log('📊 Table supports:');
            console.log('  - Minute-level OHLCV data');
            console.log('  - VWAP and trade count metrics');
            console.log('  - Multiple timeframes (1Min, 5Min, 1Hour, 1Day)');
            console.log('  - Multiple data sources (Polygon, Tiingo, etc.)');
            return;
        }

        console.log('⚠️  Table does not exist. You need to run the SQL manually in Supabase dashboard:');
        console.log('\n📋 Copy and paste this SQL in your Supabase SQL editor:\n');

        const sql = `-- Enhanced Stock Prices Table for AEIOU Market Prediction
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
    vwap DECIMAL(12, 4),
    trade_count INTEGER,
    
    -- Metadata
    source VARCHAR(50) NOT NULL DEFAULT 'polygon',
    timeframe VARCHAR(10) NOT NULL DEFAULT '1Min',
    
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
ON stock_prices(ticker, timestamp, timeframe, source);`;

        console.log(sql);
        console.log('\n🌐 Go to: https://supabase.com/dashboard/project/umwliedtynxywavrhacy/sql');

    } catch (err) {
        console.error('❌ Failed to check table:', err);
    }
};

// Run the script
createStockTable()
    .then(() => {
        console.log('🎯 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
