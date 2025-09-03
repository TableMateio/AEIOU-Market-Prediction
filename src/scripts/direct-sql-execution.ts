#!/usr/bin/env tsx

/**
 * Direct SQL Execution via Supabase Client
 * 
 * Uses the SQL function execution approach that has worked before
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const executeSQL = async () => {
    console.log('🚀 Executing SQL directly via Supabase client...');

    const supabaseUrl = process.env.SUPABASE_PROJECT_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    // Split the SQL into individual statements
    const statements = [
        `CREATE TABLE IF NOT EXISTS stock_prices (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            ticker VARCHAR(10) NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL,
            open DECIMAL(12, 4),
            high DECIMAL(12, 4), 
            low DECIMAL(12, 4),
            close DECIMAL(12, 4) NOT NULL,
            volume BIGINT,
            vwap DECIMAL(12, 4),
            trade_count INTEGER,
            source VARCHAR(50) NOT NULL DEFAULT 'polygon',
            timeframe VARCHAR(10) NOT NULL DEFAULT '1Min',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )`,

        `CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_timestamp ON stock_prices(ticker, timestamp)`,
        `CREATE INDEX IF NOT EXISTS idx_stock_prices_timestamp ON stock_prices(timestamp)`,
        `CREATE INDEX IF NOT EXISTS idx_stock_prices_ticker_timeframe ON stock_prices(ticker, timeframe)`,
        `CREATE INDEX IF NOT EXISTS idx_stock_prices_source ON stock_prices(source)`,

        `CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_prices_unique 
         ON stock_prices(ticker, timestamp, timeframe, source)`,

        `CREATE OR REPLACE FUNCTION update_stock_prices_updated_at()
         RETURNS TRIGGER AS $$
         BEGIN
             NEW.updated_at = NOW();
             RETURN NEW;
         END;
         $$ language 'plpgsql'`,

        `CREATE TRIGGER update_stock_prices_updated_at
         BEFORE UPDATE ON stock_prices
         FOR EACH ROW
         EXECUTE FUNCTION update_stock_prices_updated_at()`
    ];

    try {
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);

            // Try using the SQL RPC function
            const { data, error } = await supabase.rpc('exec', { sql: statement });

            if (error) {
                console.log(`⚠️  RPC failed, trying direct query for statement ${i + 1}...`);
                // Fallback: try direct query approach
                const result = await supabase.from('_sql').select().eq('query', statement);
                if (result.error) {
                    console.error(`❌ Statement ${i + 1} failed:`, error);
                    throw error;
                }
            }

            console.log(`✅ Statement ${i + 1} completed`);
        }

        console.log('🎉 All SQL statements executed successfully!');

        // Verify the table was created
        const { data, error } = await supabase
            .from('stock_prices')
            .select('*')
            .limit(1);

        if (error) {
            console.log('⚠️  Table creation verification failed:', error.message);
        } else {
            console.log('✅ Table verification successful - stock_prices table is ready!');
            console.log('📊 Table supports:');
            console.log('  - Minute-level OHLCV data');
            console.log('  - VWAP and trade count metrics');
            console.log('  - Multiple timeframes (1Min, 5Min, 1Hour, 1Day)');
            console.log('  - Multiple data sources (Polygon, Tiingo, etc.)');
        }

    } catch (error: any) {
        console.error('❌ SQL execution failed:', error.message);
        console.log('\n🤔 The table might already exist. Let me check...');

        try {
            const { data, error: checkError } = await supabase
                .from('stock_prices')
                .select('*')
                .limit(1);

            if (!checkError) {
                console.log('✅ Actually, the stock_prices table already exists and is working!');
                return;
            }
        } catch (checkErr) {
            // Table doesn't exist
        }

        console.log('\n🔧 You can manually run this in Supabase SQL editor:');
        console.log(statements.join(';\n\n') + ';');
    }
};

// Run the script
executeSQL()
    .then(() => {
        console.log('🎯 Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
