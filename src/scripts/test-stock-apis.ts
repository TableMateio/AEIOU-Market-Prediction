#!/usr/bin/env tsx

/**
 * Test Stock APIs and Database Integration
 * 
 * This script tests:
 * 1. API connectivity (Alpaca & Tiingo)
 * 2. Database connectivity (Supabase)
 * 3. Minute-level precision data retrieval
 * 4. Data storage and retrieval
 */

import { stockDataService } from '../services/stockDataService.js';
import { logger } from '../utils/logger.js';

async function testAPIConnections() {
    logger.info('🧪 Testing API and Database Connections...');

    const results = await stockDataService.testConnections();

    console.log('\n📊 CONNECTION TEST RESULTS:');
    console.log('==========================');
    console.log(`Alpaca API: ${results.alpaca.success ? '✅' : '❌'} ${results.alpaca.message}`);
    console.log(`Tiingo API: ${results.tiingo.success ? '✅' : '❌'} ${results.tiingo.message}`);
    console.log(`Database:   ${results.database.success ? '✅' : '❌'} ${results.database.message}`);

    return results;
}

async function testMinutePrecision() {
    logger.info('🎯 Testing Minute-Level Precision...');

    // Test specific minutes during market hours (using recent trading day)
    const testTimestamps = [
        '2024-01-02T15:30:00Z', // Market open
        '2024-01-02T16:00:00Z', // Mid-morning
        '2024-01-02T18:30:00Z', // Mid-day
        '2024-01-02T20:45:00Z', // Late afternoon
        '2024-01-02T21:00:00Z'  // Market close
    ];

    console.log('\n🎯 MINUTE PRECISION TEST:');
    console.log('========================');

    for (const timestamp of testTimestamps) {
        try {
            logger.info(`Testing precision for: ${timestamp}`);

            const result = await stockDataService.getMinutePrecisionPrice('AAPL', timestamp);

            if (result.found && result.price) {
                const timeDiff = Math.abs(
                    new Date(result.price.timestamp).getTime() - new Date(timestamp).getTime()
                );
                const diffMinutes = Math.round(timeDiff / (60 * 1000));

                console.log(`✅ ${timestamp} → Found: $${result.price.price} at ${result.price.timestamp}`);
                console.log(`   Source: ${result.price.source}, Diff: ${diffMinutes} min, Volume: ${result.price.volume || 'N/A'}`);
                console.log(`   ${result.fetchedNew ? '📡 Fetched new data' : '💾 Used cached data'}`);
            } else {
                console.log(`❌ ${timestamp} → No data found`);
            }

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error: any) {
            console.log(`❌ ${timestamp} → Error: ${error.message}`);
        }
    }
}

async function testDataFetchAndStorage() {
    logger.info('💾 Testing Data Fetch and Storage...');

    // Test fetching a small range of recent data
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

    console.log('\n💾 DATA FETCH & STORAGE TEST:');
    console.log('============================');
    console.log(`Fetching AAPL data from ${startTime.toISOString()} to ${endTime.toISOString()}`);

    try {
        // Test Alpaca first
        console.log('📡 Testing Alpaca API...');
        const alpacaResult = await stockDataService.fetchAndStoreMinuteData(
            'AAPL',
            startTime.toISOString(),
            endTime.toISOString(),
            'alpaca'
        );

        console.log(`✅ Alpaca: ${alpacaResult.success ? 'Success' : 'Failed'} - Stored ${alpacaResult.stored} records`);

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Test Tiingo
        console.log('📡 Testing Tiingo API...');
        const tiingoResult = await stockDataService.fetchAndStoreMinuteData(
            'AAPL',
            startTime.toISOString(),
            endTime.toISOString(),
            'tiingo'
        );

        console.log(`✅ Tiingo: ${tiingoResult.success ? 'Success' : 'Failed'} - Stored ${tiingoResult.stored} records`);

        // Test data retrieval
        console.log('🔍 Testing data retrieval...');
        const retrievedData = await stockDataService.getStockPricesInRange(
            'AAPL',
            startTime.toISOString(),
            endTime.toISOString()
        );

        console.log(`✅ Retrieved ${retrievedData.length} records from database`);

        if (retrievedData.length > 0) {
            const sample = retrievedData[0];
            console.log(`📊 Sample record: $${sample.price} at ${sample.timestamp} (${sample.source})`);
        }

    } catch (error: any) {
        console.log(`❌ Error in fetch/storage test: ${error.message}`);
    }
}

async function testSpecificMinuteQuery() {
    logger.info('🔍 Testing Specific Minute Query...');

    console.log('\n🔍 SPECIFIC MINUTE QUERY TEST:');
    console.log('=============================');

    // Test querying for a very specific minute
    const specificMinute = '2024-01-02T15:35:00Z';

    try {
        const result = await stockDataService.getStockPriceAt({
            ticker: 'AAPL',
            timestamp: specificMinute,
            source: 'any',
            toleranceMinutes: 10
        });

        if (result) {
            console.log(`✅ Found price for ${specificMinute}:`);
            console.log(`   Price: $${result.price}`);
            console.log(`   Actual time: ${result.timestamp}`);
            console.log(`   Source: ${result.source}`);
            console.log(`   Volume: ${result.volume || 'N/A'}`);

            // Calculate time difference
            const requestedTime = new Date(specificMinute);
            const actualTime = new Date(result.timestamp);
            const diffMs = Math.abs(actualTime.getTime() - requestedTime.getTime());
            const diffMinutes = Math.round(diffMs / (60 * 1000));

            console.log(`   Time difference: ${diffMinutes} minutes`);
        } else {
            console.log(`❌ No price found for ${specificMinute}`);
        }

    } catch (error: any) {
        console.log(`❌ Error querying specific minute: ${error.message}`);
    }
}

async function runAllTests() {
    console.log('🚀 AEIOU Stock API & Database Test Suite');
    console.log('========================================\n');

    try {
        // Test 1: API Connections
        const connections = await testAPIConnections();

        // Only proceed with data tests if we have at least one working API and database
        const hasWorkingAPI = connections.alpaca.success || connections.tiingo.success;
        const hasWorkingDB = connections.database.success;

        if (!hasWorkingAPI) {
            console.log('\n❌ No working stock APIs available. Cannot proceed with data tests.');
            return;
        }

        if (!hasWorkingDB) {
            console.log('\n❌ Database connection failed. Cannot proceed with storage tests.');
            return;
        }

        // Test 2: Data Fetch and Storage
        await testDataFetchAndStorage();

        // Test 3: Minute Precision
        await testMinutePrecision();

        // Test 4: Specific Minute Query
        await testSpecificMinuteQuery();

        console.log('\n🎉 All tests completed!');

    } catch (error: any) {
        logger.error('❌ Test suite failed', { error: error.message });
        console.log(`\n❌ Test suite failed: ${error.message}`);
    }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}

export { runAllTests };
