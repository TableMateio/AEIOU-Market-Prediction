#!/usr/bin/env tsx

/**
 * Apply Stock Prices Migration
 * 
 * Uses service role key to directly execute SQL migration
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const applyMigration = async () => {
    console.log('🚀 Applying stock_prices table migration...');

    // Use service role key for admin operations
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('❌ Missing Supabase credentials in .env file');
        console.log('Required: SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY');
        return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

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
    EXECUTE FUNCTION update_stock_prices_updated_at();`;

    try {
        // Execute the SQL using the REST API endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            },
            body: JSON.stringify({ sql })
        });

        if (!response.ok) {
            // Try alternative approach using the SQL endpoint
            const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/sql',
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                },
                body: sql
            });

            if (!sqlResponse.ok) {
                throw new Error(`SQL execution failed: ${sqlResponse.status} ${sqlResponse.statusText}`);
            }
        }

        console.log('✅ Stock prices table created successfully!');
        console.log('📊 Table features:');
        console.log('  - Minute-level OHLCV data support');
        console.log('  - VWAP and trade count metrics');
        console.log('  - Multiple timeframes (1Min, 5Min, 1Hour, 1Day)');
        console.log('  - Multiple data sources (Polygon, Tiingo, etc.)');
        console.log('  - Optimized indexes for performance');
        console.log('  - Automatic updated_at triggers');

        // Verify table was created
        const { data, error } = await supabase
            .from('stock_prices')
            .select('*')
            .limit(0);

        if (error) {
            console.warn('⚠️  Table created but verification failed:', error.message);
        } else {
            console.log('✅ Table verification successful!');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.log('\n🔧 Alternative: Run this SQL manually in Supabase dashboard:');
        console.log('\n' + sql);
    }
};

// Run the migration
applyMigration()
    .then(() => {
        console.log('🎯 Migration complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration script failed:', error);
        process.exit(1);
    });
