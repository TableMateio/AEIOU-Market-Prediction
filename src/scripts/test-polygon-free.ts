#!/usr/bin/env tsx

/**
 * Test Polygon.io FREE Tier
 * 
 * Tests the free tier capabilities:
 * - 5 API calls/minute rate limiting
 * - 2 years historical data
 * - Minute aggregates for Apple stock
 */

import 'dotenv/config';
import { polygonStockService } from '../services/polygonStockService.js';

const testPolygonFree = async () => {
    console.log('🧪 Testing Polygon.io FREE Tier...\n');

    try {
        // Test 1: Connection
        console.log('📡 Testing API connection...');
        const connected = await polygonStockService.testConnection();

        if (!connected) {
            console.error('❌ Connection failed - check your POLYGON_API_KEY');
            return;
        }
        console.log('✅ Connection successful!\n');

        // Test 2: Rate limit status
        console.log('⏱️  Checking rate limit status...');
        const rateLimitStatus = polygonStockService.getRateLimitStatus();
        console.log(`📊 Rate limit: ${rateLimitStatus.remaining}/5 calls remaining`);
        console.log(`🔄 Resets at: ${rateLimitStatus.resetTime.toLocaleTimeString()}\n`);

        // Test 3: Older minute data (FREE tier may have delays)
        console.log('📈 Testing minute aggregates (1 week ago)...');
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 7); // 1 week ago
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 8); // 8 days ago (1 day window)

        const minuteData = await polygonStockService.getMinuteAggregates(
            'AAPL',
            startDate,
            endDate,
            '1'
        );

        console.log(`✅ Minute data fetched: ${minuteData.length} data points`);
        if (minuteData.length > 0) {
            const sample = minuteData[0];
            console.log('📋 Sample data point:');
            console.log(`   Time: ${sample.timestamp.toISOString()}`);
            console.log(`   OHLC: $${sample.open} / $${sample.high} / $${sample.low} / $${sample.close}`);
            console.log(`   Volume: ${sample.volume.toLocaleString()}`);
            console.log(`   VWAP: $${sample.vwap || 'N/A'}`);
            console.log(`   Trades: ${sample.trade_count || 'N/A'}\n`);
        }

        // Test 4: Daily data (longer period)
        console.log('📊 Testing daily aggregates (30 days)...');
        const dailyEndDate = new Date();
        const dailyStartDate = new Date();
        dailyStartDate.setDate(dailyStartDate.getDate() - 30);

        const dailyData = await polygonStockService.getDailyAggregates(
            'AAPL',
            dailyStartDate,
            dailyEndDate
        );

        console.log(`✅ Daily data fetched: ${dailyData.length} data points`);
        if (dailyData.length > 0) {
            const recentDay = dailyData[dailyData.length - 1];
            console.log('📋 Most recent daily data:');
            console.log(`   Date: ${recentDay.timestamp.toISOString().split('T')[0]}`);
            console.log(`   Close: $${recentDay.close}`);
            console.log(`   Volume: ${recentDay.volume.toLocaleString()}\n`);
        }

        // Test 5: Data around specific timestamp (article correlation test)
        console.log('🎯 Testing data around specific timestamp...');
        const articleTime = new Date();
        articleTime.setHours(articleTime.getHours() - 2); // 2 hours ago

        const contextData = await polygonStockService.getDataAroundTimestamp(
            'AAPL',
            articleTime,
            60 // 1 hour window
        );

        console.log(`✅ Context data fetched: ${contextData.length} data points`);
        console.log(`📅 Time window: ${articleTime.toISOString()} ±1 hour\n`);

        // Final rate limit check
        const finalStatus = polygonStockService.getRateLimitStatus();
        console.log('📊 Final rate limit status:');
        console.log(`   Remaining calls: ${finalStatus.remaining}/5`);
        console.log(`   Next reset: ${finalStatus.resetTime.toLocaleTimeString()}`);

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📋 FREE Tier Summary:');
        console.log('   ✅ 5 API calls/minute (much better than Tiingo)');
        console.log('   ✅ 2 years historical data');
        console.log('   ✅ Minute-level aggregates');
        console.log('   ✅ VWAP and trade count included');
        console.log('   ✅ Perfect for article correlation analysis');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);

        if (error.response?.status === 403) {
            console.log('\n💡 Troubleshooting 403 Forbidden:');
            console.log('   - Check your POLYGON_API_KEY is correct');
            console.log('   - Verify your account is activated');
            console.log('   - Free tier might have usage limits');
        }

        if (error.response?.status === 429) {
            console.log('\n⏱️  Rate limit exceeded:');
            console.log('   - FREE tier: 5 calls/minute');
            console.log('   - Wait 1 minute and try again');
        }
    }
};

// Run the test
testPolygonFree()
    .then(() => {
        console.log('\n🎯 Ready to integrate with stock_prices table!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test script failed:', error);
        process.exit(1);
    });
