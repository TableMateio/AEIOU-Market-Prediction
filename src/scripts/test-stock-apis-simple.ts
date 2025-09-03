#!/usr/bin/env tsx

/**
 * Simple Stock API Test
 * 
 * Tests Alpaca and Tiingo APIs without database dependency
 */

// Load environment variables
import 'dotenv/config';

import { alpacaStockService } from '../services/alpacaStockService.js';
import { tiingoStockService } from '../services/tiingoStockService.js';
import { logger } from '../utils/logger.js';

async function testAlpacaAPI() {
    console.log('\n📊 TESTING ALPACA API');
    console.log('====================');

    try {
        // Test connection
        const connectionTest = await alpacaStockService.testConnection();
        console.log(`Connection: ${connectionTest.success ? '✅' : '❌'} ${connectionTest.message}`);

        if (!connectionTest.success) {
            return false;
        }

        // Test minute-level data fetching
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour ago

        console.log(`\nFetching AAPL minute data from ${startTime.toISOString()} to ${endTime.toISOString()}`);

        const bars = await alpacaStockService.getBars(
            'AAPL',
            '1Min',
            startTime.toISOString(),
            endTime.toISOString()
        );

        console.log(`✅ Retrieved ${bars.length} minute-level data points`);

        if (bars.length > 0) {
            const sample = bars[0];
            console.log(`📊 Sample: $${sample.close} at ${sample.timestamp} (Vol: ${sample.volume})`);
        }

        // Test specific minute precision
        const targetTime = new Date(endTime.getTime() - 30 * 60 * 1000); // 30 min ago
        console.log(`\nTesting minute precision for: ${targetTime.toISOString()}`);

        const closest = await alpacaStockService.getClosestDataPoint(
            'AAPL',
            targetTime.toISOString(),
            '1Min',
            2 // 2-hour search window
        );

        if (closest) {
            const timeDiff = Math.abs(new Date(closest.timestamp).getTime() - targetTime.getTime());
            const diffMinutes = Math.round(timeDiff / (60 * 1000));
            console.log(`✅ Found closest price: $${closest.close} at ${closest.timestamp}`);
            console.log(`   Time difference: ${diffMinutes} minutes`);
        } else {
            console.log(`❌ No data found near target time`);
        }

        return true;

    } catch (error: any) {
        console.log(`❌ Alpaca API error: ${error.message}`);
        return false;
    }
}

async function testTiingoAPI() {
    console.log('\n📊 TESTING TIINGO API');
    console.log('====================');

    try {
        // Test connection
        const connectionTest = await tiingoStockService.testConnection();
        console.log(`Connection: ${connectionTest.success ? '✅' : '❌'} ${connectionTest.message}`);

        if (!connectionTest.success) {
            return false;
        }

        // Test daily data first (should always work)
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

        console.log(`\nFetching AAPL daily data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

        const dailyPrices = await tiingoStockService.getDailyPrices(
            'AAPL',
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        console.log(`✅ Retrieved ${dailyPrices.length} daily data points`);

        if (dailyPrices.length > 0) {
            const sample = dailyPrices[dailyPrices.length - 1];
            console.log(`📊 Latest daily: $${sample.close} at ${sample.timestamp} (Vol: ${sample.volume})`);
        }

        // Test intraday data (might be limited on free tier)
        console.log(`\nTesting intraday data (5min intervals)...`);

        try {
            const intradayPrices = await tiingoStockService.getIntradayPrices(
                'AAPL',
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0],
                '5min'
            );

            console.log(`✅ Retrieved ${intradayPrices.length} intraday data points`);

            if (intradayPrices.length > 0) {
                const sample = intradayPrices[intradayPrices.length - 1];
                console.log(`📊 Latest intraday: $${sample.close} at ${sample.timestamp} (Vol: ${sample.volume})`);
            }

        } catch (intradayError: any) {
            console.log(`⚠️ Intraday data limited: ${intradayError.message}`);
            console.log(`   (This is normal for free tier - may have 30min delay)`);
        }

        return true;

    } catch (error: any) {
        console.log(`❌ Tiingo API error: ${error.message}`);
        return false;
    }
}

async function testEnvironmentVariables() {
    console.log('\n🔧 CHECKING ENVIRONMENT VARIABLES');
    console.log('=================================');

    const checks = [
        { name: 'ALPACA_API_KEY', value: process.env.ALPACA_API_KEY },
        { name: 'ALPACA_API_SECRET', value: process.env.ALPACA_API_SECRET },
        { name: 'TIINGO_API_KEY', value: process.env.TIINGO_API_KEY }
    ];

    let allPresent = true;

    for (const check of checks) {
        const present = !!(check.value && check.value.length > 0);
        console.log(`${check.name}: ${present ? '✅' : '❌'} ${present ? 'Set' : 'Missing'}`);
        if (!present) allPresent = false;
    }

    return allPresent;
}

async function demonstrateMinutePrecision() {
    console.log('\n🎯 MINUTE PRECISION DEMONSTRATION');
    console.log('=================================');

    // Create some specific minute timestamps for testing
    const now = new Date();
    const testMinutes = [
        new Date(now.getTime() - 5 * 60 * 1000),   // 5 minutes ago
        new Date(now.getTime() - 15 * 60 * 1000),  // 15 minutes ago
        new Date(now.getTime() - 30 * 60 * 1000),  // 30 minutes ago
        new Date(now.getTime() - 60 * 60 * 1000)   // 1 hour ago
    ];

    console.log('Testing if we can get Apple stock price at specific minutes:');

    for (const targetMinute of testMinutes) {
        console.log(`\n🕒 Target: ${targetMinute.toISOString()}`);

        try {
            const result = await alpacaStockService.getClosestDataPoint(
                'AAPL',
                targetMinute.toISOString(),
                '1Min',
                1 // 1-hour search window
            );

            if (result) {
                const actualTime = new Date(result.timestamp);
                const diffMs = Math.abs(actualTime.getTime() - targetMinute.getTime());
                const diffMinutes = Math.round(diffMs / (60 * 1000));

                console.log(`   ✅ Found: $${result.close} at ${result.timestamp}`);
                console.log(`   📏 Precision: ${diffMinutes} minute(s) difference`);
                console.log(`   📊 Volume: ${result.volume}, Source: ${result.source}`);
            } else {
                console.log(`   ❌ No data found`);
            }

        } catch (error: any) {
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 200));
    }
}

async function runSimpleTests() {
    console.log('🚀 AEIOU Simple Stock API Test');
    console.log('==============================\n');

    try {
        // Check environment variables first
        const envOk = await testEnvironmentVariables();

        if (!envOk) {
            console.log('\n❌ Missing required environment variables!');
            console.log('Please ensure your .env file contains the API keys.');
            return;
        }

        // Test APIs
        const alpacaWorks = await testAlpacaAPI();
        const tiingoWorks = await testTiingoAPI();

        if (!alpacaWorks && !tiingoWorks) {
            console.log('\n❌ No working stock APIs found!');
            return;
        }

        // Demonstrate minute precision if at least one API works
        if (alpacaWorks) {
            await demonstrateMinutePrecision();
        }

        console.log('\n🎉 Tests completed!');
        console.log('\n📋 SUMMARY:');
        console.log(`- Alpaca API: ${alpacaWorks ? '✅ Working' : '❌ Failed'}`);
        console.log(`- Tiingo API: ${tiingoWorks ? '✅ Working' : '❌ Failed'}`);
        console.log(`- Minute precision: ${alpacaWorks ? '✅ Supported' : '❌ Not available'}`);

        if (alpacaWorks || tiingoWorks) {
            console.log('\n✅ Ready to proceed with database setup!');
        }

    } catch (error: any) {
        logger.error('❌ Test suite failed', { error: error.message });
        console.log(`\n❌ Test suite failed: ${error.message}`);
    }
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
    runSimpleTests().catch(console.error);
}

export { runSimpleTests };
