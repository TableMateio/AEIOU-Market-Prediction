#!/usr/bin/env tsx

/**
 * Test Specific Minute Data Retrieval
 * 
 * Tests getting data for June 4th, 2024 at 1:03 PM (or nearby time)
 */

import 'dotenv/config';
import { polygonStockService } from '../services/polygonStockService.js';

const testSpecificMinute = async () => {
    console.log('🎯 Testing specific minute data retrieval...\n');

    try {
        // June 4th, 2024 at 1:03 PM EST (market hours)
        const targetDate = new Date('2024-06-04T13:03:00-04:00'); // 1:03 PM EST
        console.log(`🎯 Target time: ${targetDate.toISOString()} (June 4th, 2024 at 1:03 PM EST)`);
        console.log(`📅 Day of week: ${targetDate.toLocaleDateString('en-US', { weekday: 'long' })}\n`);

        // Test 1: Get data around that specific minute (±30 minutes window)
        console.log('📈 Fetching data around target minute (±30 min window)...');
        const windowData = await polygonStockService.getDataAroundTimestamp(
            'AAPL',
            targetDate,
            30 // 30 minutes window
        );

        if (windowData.length > 0) {
            console.log(`✅ Found ${windowData.length} data points in ±30 min window`);

            // Find the exact minute or closest
            const exactMinute = windowData.find(point =>
                point.timestamp.getTime() === targetDate.getTime()
            );

            if (exactMinute) {
                console.log('🎯 EXACT MINUTE FOUND!');
                console.log(`   Time: ${exactMinute.timestamp.toISOString()}`);
                console.log(`   OHLC: $${exactMinute.open} / $${exactMinute.high} / $${exactMinute.low} / $${exactMinute.close}`);
                console.log(`   Volume: ${exactMinute.volume.toLocaleString()}`);
                console.log(`   VWAP: $${exactMinute.vwap || 'N/A'}`);
                console.log(`   Trades: ${exactMinute.trade_count || 'N/A'}\n`);
            } else {
                // Find closest minute
                const closest = windowData.reduce((prev, curr) => {
                    const prevDiff = Math.abs(prev.timestamp.getTime() - targetDate.getTime());
                    const currDiff = Math.abs(curr.timestamp.getTime() - targetDate.getTime());
                    return currDiff < prevDiff ? curr : prev;
                });

                const timeDiff = Math.abs(closest.timestamp.getTime() - targetDate.getTime());
                const minutesDiff = Math.round(timeDiff / (1000 * 60));

                console.log(`🎯 CLOSEST MINUTE (${minutesDiff} minutes away):`);
                console.log(`   Time: ${closest.timestamp.toISOString()}`);
                console.log(`   OHLC: $${closest.open} / $${closest.high} / $${closest.low} / $${closest.close}`);
                console.log(`   Volume: ${closest.volume.toLocaleString()}`);
                console.log(`   VWAP: $${closest.vwap || 'N/A'}`);
                console.log(`   Trades: ${closest.trade_count || 'N/A'}\n`);
            }

            // Show first and last data points in window
            const firstPoint = windowData[0];
            const lastPoint = windowData[windowData.length - 1];

            console.log('📊 Window coverage:');
            console.log(`   First: ${firstPoint.timestamp.toISOString()}`);
            console.log(`   Last:  ${lastPoint.timestamp.toISOString()}`);
            console.log(`   Total: ${windowData.length} minutes of data\n`);

        } else {
            console.log('❌ No data found in ±30 minute window');
            console.log('Trying a larger window (±2 hours)...\n');

            // Test 2: Try larger window
            const largerWindow = await polygonStockService.getDataAroundTimestamp(
                'AAPL',
                targetDate,
                120 // 2 hours window
            );

            if (largerWindow.length > 0) {
                console.log(`✅ Found ${largerWindow.length} data points in ±2 hour window`);

                const closest = largerWindow.reduce((prev, curr) => {
                    const prevDiff = Math.abs(prev.timestamp.getTime() - targetDate.getTime());
                    const currDiff = Math.abs(curr.timestamp.getTime() - targetDate.getTime());
                    return currDiff < prevDiff ? curr : prev;
                });

                const timeDiff = Math.abs(closest.timestamp.getTime() - targetDate.getTime());
                const minutesDiff = Math.round(timeDiff / (1000 * 60));

                console.log(`🎯 CLOSEST DATA POINT (${minutesDiff} minutes away):`);
                console.log(`   Time: ${closest.timestamp.toISOString()}`);
                console.log(`   OHLC: $${closest.open} / $${closest.high} / $${closest.low} / $${closest.close}`);
                console.log(`   Volume: ${closest.volume.toLocaleString()}\n`);
            } else {
                console.log('❌ No data found even in ±2 hour window');
            }
        }

        // Test 3: Try getting daily data for that date as fallback
        console.log('📊 Trying daily data for June 4th, 2024...');
        const dailyStartDate = new Date('2024-06-04T00:00:00-04:00');
        const dailyEndDate = new Date('2024-06-04T23:59:59-04:00');

        const dailyData = await polygonStockService.getDailyAggregates(
            'AAPL',
            dailyStartDate,
            dailyEndDate
        );

        if (dailyData.length > 0) {
            const dayData = dailyData[0];
            console.log('✅ Daily data available:');
            console.log(`   Date: ${dayData.timestamp.toISOString().split('T')[0]}`);
            console.log(`   OHLC: $${dayData.open} / $${dayData.high} / $${dayData.low} / $${dayData.close}`);
            console.log(`   Volume: ${dayData.volume.toLocaleString()}`);
            console.log(`   VWAP: $${dayData.vwap || 'N/A'}\n`);
        }

        console.log('🎉 Specific minute test completed!');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);

        if (error.response?.status === 403) {
            console.log('\n💡 This might be a free tier limitation:');
            console.log('   - June 2024 might be outside the 2-year free tier window');
            console.log('   - Try a more recent date (within last 2 years)');
        }
    }
};

// Run the test
testSpecificMinute()
    .then(() => {
        console.log('\n🎯 Ready for precise minute-level analysis!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test script failed:', error);
        process.exit(1);
    });
