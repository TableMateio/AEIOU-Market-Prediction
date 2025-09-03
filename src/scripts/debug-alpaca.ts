#!/usr/bin/env tsx

/**
 * Debug Alpaca API Issues
 */

import 'dotenv/config';
import axios from 'axios';

async function debugAlpacaAPI() {
    console.log('🐛 DEBUGGING ALPACA API');
    console.log('=======================\n');

    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_API_SECRET;

    console.log('Environment Variables:');
    console.log(`ALPACA_API_KEY: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT SET'}`);
    console.log(`ALPACA_API_SECRET: ${apiSecret ? `${apiSecret.substring(0, 8)}...` : 'NOT SET'}`);

    if (!apiKey || !apiSecret) {
        console.log('❌ Missing Alpaca credentials');
        return;
    }

    // Test 1: Try to get account info (simpler endpoint)
    console.log('\n📊 Test 1: Account Information');
    console.log('------------------------------');

    try {
        const accountResponse = await axios.get('https://paper-api.alpaca.markets/v2/account', {
            headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-API-SECRET-KEY': apiSecret
            },
            timeout: 10000
        });

        console.log('✅ Account endpoint successful');
        console.log(`Account ID: ${accountResponse.data.id}`);
        console.log(`Account Status: ${accountResponse.data.status}`);

    } catch (error: any) {
        console.log('❌ Account endpoint failed');
        console.log(`Status: ${error.response?.status}`);
        console.log(`Message: ${error.response?.data?.message || error.message}`);

        if (error.response?.status === 401) {
            console.log('🔑 This looks like an authentication issue');
            console.log('   - Check if your Alpaca API keys are correct');
            console.log('   - Make sure you\'re using paper trading credentials for testing');
        }
    }

    // Test 2: Try market data endpoint with different approach
    console.log('\n📊 Test 2: Market Data Endpoint');
    console.log('-------------------------------');

    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

        const marketDataResponse = await axios.get('https://data.alpaca.markets/v2/stocks/AAPL/bars', {
            params: {
                timeframe: '1Day',
                start: startDate.toISOString(),
                end: endDate.toISOString(),
                page_size: 1
            },
            headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-API-SECRET-KEY': apiSecret
            },
            timeout: 10000
        });

        console.log('✅ Market data endpoint successful');
        console.log(`Bars returned: ${marketDataResponse.data.bars?.AAPL?.length || 0}`);

        if (marketDataResponse.data.bars?.AAPL?.length > 0) {
            const bar = marketDataResponse.data.bars.AAPL[0];
            console.log(`Sample bar: $${bar.c} at ${bar.t}`);
        }

    } catch (error: any) {
        console.log('❌ Market data endpoint failed');
        console.log(`Status: ${error.response?.status}`);
        console.log(`Message: ${error.response?.data?.message || error.message}`);
        console.log(`URL: ${error.config?.url}`);
        console.log(`Params: ${JSON.stringify(error.config?.params, null, 2)}`);

        if (error.response?.status === 400) {
            console.log('🔧 400 Bad Request suggests:');
            console.log('   - Invalid parameters (date format, timeframe, etc.)');
            console.log('   - Check if you have market data permissions');
            console.log('   - Free tier may have limitations');
        }

        if (error.response?.status === 403) {
            console.log('🚫 403 Forbidden suggests:');
            console.log('   - Insufficient permissions for market data');
            console.log('   - May need to upgrade to paid plan for real-time data');
        }
    }

    // Test 3: Check API key format
    console.log('\n🔍 Test 3: API Key Format Check');
    console.log('-------------------------------');

    const isValidKeyFormat = /^[A-Z0-9]{20}$/.test(apiKey);
    const isValidSecretFormat = /^[A-Za-z0-9\/\+]{40}$/.test(apiSecret);

    console.log(`API Key format: ${isValidKeyFormat ? '✅' : '❌'} (should be 20 alphanumeric chars)`);
    console.log(`API Secret format: ${isValidSecretFormat ? '✅' : '❌'} (should be 40 base64 chars)`);

    if (!isValidKeyFormat || !isValidSecretFormat) {
        console.log('⚠️  Your API credentials might not be in the expected format');
        console.log('   - Double-check you copied them correctly from Alpaca dashboard');
        console.log('   - Make sure there are no extra spaces or characters');
    }

    console.log('\n📋 SUMMARY & RECOMMENDATIONS:');
    console.log('=============================');
    console.log('Based on the 400 error from our original test:');
    console.log('1. Check if your Alpaca account has market data permissions');
    console.log('2. Verify you\'re using the correct endpoint (paper vs live)');
    console.log('3. Consider upgrading to paid plan if you need minute-level data');
    console.log('4. For now, we can proceed with Tiingo for daily data and add minute precision later');
}

// Run the debug
if (import.meta.url === `file://${process.argv[1]}`) {
    debugAlpacaAPI().catch(console.error);
}

export { debugAlpacaAPI };
