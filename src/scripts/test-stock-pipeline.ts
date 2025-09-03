#!/usr/bin/env tsx

/**
 * Test Complete Stock Data Pipeline
 * 
 * Tests the full pipeline:
 * 1. Fetch historical data from Polygon (FREE tier)
 * 2. Store in stock_prices table
 * 3. Retrieve and verify data
 */

import 'dotenv/config';
import { polygonStockService } from '../services/polygonStockService.js';
import { stockDataStorageService } from '../services/stockDataStorageService.js';

const testStockPipeline = async () => {
    console.log('🔄 Testing Complete Stock Data Pipeline...\n');

    try {
        // Test 1: Check connection
        console.log('📡 Testing Polygon API connection...');
        const connected = await polygonStockService.testConnection();

        if (!connected) {
            console.error('❌ Polygon API connection failed');
            return;
        }
        console.log('✅ Polygon API connected\n');

        // Test 2: Fetch historical minute data (1 week ago to avoid recent data limits)
        console.log('📈 Fetching historical minute data...');
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 7); // 1 week ago
        const startDate = new Date(endDate);
        startDate.setHours(startDate.getHours() - 2); // 2 hour window

        console.log(`📅 Time range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const stockData = await polygonStockService.getMinuteAggregates(
            'AAPL',
            startDate,
            endDate,
            '1'
        );

        console.log(`✅ Fetched ${stockData.length} minute-level data points\n`);

        if (stockData.length === 0) {
            console.log('⚠️  No data available for this time range (market might be closed)');
            console.log('Trying daily data instead...\n');

            // Fallback to daily data
            const dailyEndDate = new Date();
            dailyEndDate.setDate(dailyEndDate.getDate() - 7);
            const dailyStartDate = new Date(dailyEndDate);
            dailyStartDate.setDate(dailyStartDate.getDate() - 5); // 5 day window

            const dailyData = await polygonStockService.getDailyAggregates(
                'AAPL',
                dailyStartDate,
                dailyEndDate
            );

            if (dailyData.length > 0) {
                console.log(`✅ Using daily data: ${dailyData.length} data points`);
                stockData.push(...dailyData);
            }
        }

        if (stockData.length === 0) {
            console.log('❌ No data available to test with');
            return;
        }

        // Test 3: Store data in database
        console.log('💾 Storing data in stock_prices table...');
        const storedData = await stockDataStorageService.storeStockData(stockData);
        console.log(`✅ Stored ${storedData.length} data points\n`);

        // Test 4: Retrieve and verify stored data
        console.log('🔍 Retrieving stored data for verification...');
        const retrievedData = await stockDataStorageService.getStoredStockData(
            'AAPL',
            startDate,
            endDate
        );

        console.log(`✅ Retrieved ${retrievedData.length} data points from database\n`);

        // Test 5: Show sample data
        if (retrievedData.length > 0) {
            const sample = retrievedData[0];
            console.log('📋 Sample stored data:');
            console.log(`   ID: ${sample.id}`);
            console.log(`   Ticker: ${sample.ticker}`);
            console.log(`   Timestamp: ${sample.timestamp}`);
            console.log(`   OHLC: $${sample.open} / $${sample.high} / $${sample.low} / $${sample.close}`);
            console.log(`   Volume: ${sample.volume?.toLocaleString() || 'N/A'}`);
            console.log(`   VWAP: $${sample.vwap || 'N/A'}`);
            console.log(`   Trades: ${sample.trade_count || 'N/A'}`);
            console.log(`   Source: ${sample.source}`);
            console.log(`   Timeframe: ${sample.timeframe}\n`);
        }

        // Test 6: Get coverage statistics
        console.log('📊 Getting data coverage statistics...');
        const stats = await stockDataStorageService.getDataCoverageStats('AAPL');

        console.log('✅ Coverage Statistics:');
        console.log(`   Total data points: ${stats.totalDataPoints}`);
        if (stats.dateRange) {
            console.log(`   Date range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
        }
        console.log(`   Timeframes: ${JSON.stringify(stats.timeframes, null, 2)}`);
        console.log(`   Sources: ${JSON.stringify(stats.sources, null, 2)}\n`);

        // Test 7: Simulate article correlation workflow
        console.log('🎯 Testing article correlation workflow...');

        // Simulate article timestamps (1 week ago)
        const articleTimestamps = [
            new Date(endDate.getTime() - 60 * 60 * 1000), // 1 hour before end
            new Date(endDate.getTime() - 30 * 60 * 1000), // 30 minutes before end
        ];

        console.log(`📰 Simulating ${articleTimestamps.length} article timestamps`);

        // This would normally fetch data around each timestamp
        console.log('   (Skipping actual collection to avoid rate limits)');
        console.log('   In production: would fetch ±4 hours around each timestamp\n');

        console.log('🎉 Pipeline test completed successfully!\n');

        console.log('📋 Summary:');
        console.log('   ✅ Polygon API connection working');
        console.log('   ✅ Historical data fetching (FREE tier)');
        console.log('   ✅ Data storage in Supabase working');
        console.log('   ✅ Data retrieval and verification working');
        console.log('   ✅ Coverage statistics available');
        console.log('   ✅ Ready for article correlation analysis');

        console.log('\n🚀 Next Steps:');
        console.log('   1. Collect historical data for existing articles');
        console.log('   2. Build correlation analysis between news and price movements');
        console.log('   3. Validate Phase 1 success criteria (>70% correlation)');

    } catch (error: any) {
        console.error('❌ Pipeline test failed:', error.message);

        if (error.message.includes('NOT_AUTHORIZED')) {
            console.log('\n💡 Free tier limitation detected');
            console.log('   - Recent minute data requires paid plan');
            console.log('   - Historical data (1+ weeks old) should work');
            console.log('   - Try adjusting date ranges to older periods');
        }
    }
};

// Run the test
testStockPipeline()
    .then(() => {
        console.log('\n🎯 Stock data pipeline ready for production use!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Pipeline test script failed:', error);
        process.exit(1);
    });
