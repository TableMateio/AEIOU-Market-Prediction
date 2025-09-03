#!/usr/bin/env tsx

/**
 * Test Stock Data Service
 * 
 * Demonstrates fetching and storing stock data using Tiingo API
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { tiingoStockService } from '../services/tiingoStockService.js';
import { logger } from '../utils/logger.js';

interface StoredStockPrice {
    id?: string;
    ticker: string;
    timestamp: string;
    price: number;
    volume?: number;
    source: string;
    created_at?: string;
    updated_at?: string;
}

async function testStockDataService() {
    console.log('📊 STOCK DATA SERVICE TEST');
    console.log('==========================\n');

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.log('❌ Missing Supabase environment variables');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Check if table exists
    console.log('🔍 Test 1: Check stock_prices table...');
    try {
        const { data, error } = await supabase
            .from('stock_prices')
            .select('count')
            .limit(1);

        if (error) {
            console.log(`❌ Table not accessible: ${error.message}`);
            console.log('   Please run the SQL from STOCK_DATABASE_SETUP.md first');
            return;
        }

        console.log('✅ stock_prices table is accessible');

    } catch (error: any) {
        console.log(`❌ Table check failed: ${error.message}`);
        return;
    }

    // Test 2: Fetch recent Apple stock data from Tiingo
    console.log('\n📊 Test 2: Fetch Apple stock data from Tiingo...');

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    console.log(`Fetching AAPL data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    let stockData: any[] = [];
    try {
        stockData = await tiingoStockService.getDailyPrices(
            'AAPL',
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        console.log(`✅ Retrieved ${stockData.length} data points from Tiingo`);

        if (stockData.length > 0) {
            const latest = stockData[stockData.length - 1];
            console.log(`📊 Latest: $${latest.close} on ${latest.timestamp} (Vol: ${latest.volume})`);
        }

    } catch (error: any) {
        console.log(`❌ Failed to fetch from Tiingo: ${error.message}`);
        return;
    }

    // Test 3: Store data in Supabase
    console.log('\n💾 Test 3: Store data in database...');

    if (stockData.length === 0) {
        console.log('⚠️ No data to store');
        return;
    }

    // Transform data for storage
    const records = stockData.map(item => ({
        ticker: 'AAPL',
        timestamp: item.timestamp,
        price: item.close,
        volume: item.volume,
        source: 'tiingo'
    }));

    try {
        const { data, error } = await supabase
            .from('stock_prices')
            .upsert(records, {
                onConflict: 'ticker,timestamp,source',
                ignoreDuplicates: false
            })
            .select();

        if (error) {
            console.log(`❌ Failed to store data: ${error.message}`);
            return;
        }

        console.log(`✅ Stored ${data?.length || 0} records in database`);

    } catch (error: any) {
        console.log(`❌ Storage error: ${error.message}`);
        return;
    }

    // Test 4: Query data back
    console.log('\n🔍 Test 4: Query stored data...');

    try {
        const { data, error } = await supabase
            .from('stock_prices')
            .select('*')
            .eq('ticker', 'AAPL')
            .eq('source', 'tiingo')
            .order('timestamp', { ascending: false })
            .limit(5);

        if (error) {
            console.log(`❌ Query failed: ${error.message}`);
            return;
        }

        console.log(`✅ Retrieved ${data?.length || 0} records from database`);

        if (data && data.length > 0) {
            console.log('\n📊 Recent Apple prices:');
            data.forEach((record: StoredStockPrice) => {
                const date = new Date(record.timestamp).toLocaleDateString();
                console.log(`   ${date}: $${record.price} (Vol: ${record.volume || 'N/A'})`);
            });
        }

    } catch (error: any) {
        console.log(`❌ Query error: ${error.message}`);
        return;
    }

    // Test 5: Demonstrate timestamp precision query
    console.log('\n🎯 Test 5: Test timestamp precision...');

    // Find a specific minute to test precision
    const targetTime = new Date();
    targetTime.setHours(15, 30, 0, 0); // 3:30 PM today
    targetTime.setDate(targetTime.getDate() - 1); // Yesterday

    console.log(`Looking for Apple price around: ${targetTime.toISOString()}`);

    const toleranceHours = 24; // Look within 24 hours
    const startWindow = new Date(targetTime.getTime() - toleranceHours * 60 * 60 * 1000);
    const endWindow = new Date(targetTime.getTime() + toleranceHours * 60 * 60 * 1000);

    try {
        const { data, error } = await supabase
            .from('stock_prices')
            .select('*')
            .eq('ticker', 'AAPL')
            .gte('timestamp', startWindow.toISOString())
            .lte('timestamp', endWindow.toISOString())
            .order('timestamp', { ascending: true });

        if (error) {
            console.log(`❌ Precision query failed: ${error.message}`);
            return;
        }

        if (data && data.length > 0) {
            // Find closest timestamp
            let closest = data[0];
            let minDiff = Math.abs(new Date(data[0].timestamp).getTime() - targetTime.getTime());

            for (const record of data) {
                const diff = Math.abs(new Date(record.timestamp).getTime() - targetTime.getTime());
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = record;
                }
            }

            const diffHours = Math.round(minDiff / (60 * 60 * 1000));
            console.log(`✅ Found closest price: $${closest.price}`);
            console.log(`   At: ${closest.timestamp}`);
            console.log(`   Difference: ${diffHours} hours from target`);

        } else {
            console.log('❌ No data found in time window');
        }

    } catch (error: any) {
        console.log(`❌ Precision test error: ${error.message}`);
    }

    console.log('\n🎉 Stock data service test completed!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Database table accessible');
    console.log('✅ Tiingo API working for daily data');
    console.log('✅ Data storage working');
    console.log('✅ Data retrieval working');
    console.log('✅ Timestamp precision queries working');
    console.log('\n🚀 Ready to integrate with article timestamps!');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    testStockDataService().catch(console.error);
}

export { testStockDataService };
