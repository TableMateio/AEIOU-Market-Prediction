#!/usr/bin/env tsx

/**
 * Setup Stock Database Table
 * 
 * Creates the stock_prices table in Supabase using the client
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function setupStockDatabase() {
    console.log('🗄️ SETTING UP STOCK DATABASE');
    console.log('============================\n');

    const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase environment variables:');
        console.log('   SUPABASE_PROJECT_URL (or SUPABASE_URL)');
        console.log('   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
        return;
    }

    console.log(`Supabase URL: ${supabaseUrl}`);
    console.log(`Using key: ${supabaseKey.substring(0, 10)}...`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection first
    console.log('\n🔌 Testing database connection...');
    try {
        const { data, error } = await supabase.from('articles').select('count').limit(1);
        if (error) {
            console.log(`❌ Connection failed: ${error.message}`);
            return;
        }
        console.log('✅ Database connection successful');
    } catch (error: any) {
        console.log(`❌ Connection error: ${error.message}`);
        return;
    }

    // Create stock_prices table
    console.log('\n📊 Creating stock_prices table...');

    const createTableSQL = `
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
    `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

        if (error) {
            console.log(`❌ Table creation failed: ${error.message}`);
            console.log('   This might be expected if the table already exists');
        } else {
            console.log('✅ stock_prices table created successfully');
        }
    } catch (error: any) {
        console.log(`❌ Table creation error: ${error.message}`);
        console.log('   Trying alternative method...');

        // Try using a simple INSERT to test if we can at least work with existing tables
        try {
            const { data, error: testError } = await supabase
                .from('stock_prices')
                .select('*')
                .limit(1);

            if (testError && testError.message.includes('relation "stock_prices" does not exist')) {
                console.log('❌ stock_prices table does not exist and cannot be created automatically');
                console.log('   Please create it manually in the Supabase dashboard with this SQL:');
                console.log('\n' + createTableSQL);
                return;
            } else if (testError) {
                console.log(`❌ Table test failed: ${testError.message}`);
                return;
            } else {
                console.log('✅ stock_prices table already exists and is accessible');
            }
        } catch (altError: any) {
            console.log(`❌ Alternative test failed: ${altError.message}`);
            return;
        }
    }

    // Test inserting sample data
    console.log('\n📝 Testing data insertion...');

    const sampleData = {
        ticker: 'AAPL',
        timestamp: new Date().toISOString(),
        price: 229.72,
        volume: 44075638,
        source: 'test'
    };

    try {
        const { data, error } = await supabase
            .from('stock_prices')
            .upsert([sampleData])
            .select();

        if (error) {
            console.log(`❌ Sample insert failed: ${error.message}`);
            return;
        }

        console.log('✅ Sample data inserted successfully');
        console.log(`   Record ID: ${data[0]?.id}`);

        // Clean up test data
        await supabase
            .from('stock_prices')
            .delete()
            .eq('source', 'test');

        console.log('✅ Test data cleaned up');

    } catch (error: any) {
        console.log(`❌ Sample insert error: ${error.message}`);
        return;
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start fetching stock data with Tiingo API');
    console.log('2. Store daily prices for Apple');
    console.log('3. Build time-series queries for article correlation');
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
    setupStockDatabase().catch(console.error);
}

export { setupStockDatabase };
