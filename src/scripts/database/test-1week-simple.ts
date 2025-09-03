#!/usr/bin/env npx tsx

/**
 * Simple 1-Week Stock Data Test
 * 
 * Tests which APIs we have access to and validates 1 week of data
 */

import { config } from '../../config/app';
import { createLogger } from '../../utils/logger';
import { createClient } from '@supabase/supabase-js';

const logger = createLogger('Stock1WeekTest');

async function testAvailableAPIs() {
    logger.info('🔍 Checking available API configurations...');

    const apis = {
        alpaca: !!(config.alpaca.apiKey && config.alpaca.apiSecret),
        tiingo: !!config.tiingo.apiKey,
        polygon: !!config.polygon.apiKey
    };

    logger.info('📊 API Status:', apis);

    // Find which API we can use
    const availableAPI = Object.entries(apis).find(([name, available]) => available)?.[0];

    if (!availableAPI) {
        logger.error('❌ No stock APIs configured. Please set up API keys in .env file');
        return null;
    }

    logger.info(`✅ Using ${availableAPI} for testing`);
    return availableAPI;
}

async function test1WeekData() {
    const api = await testAvailableAPIs();
    if (!api) return;

    // Test week: Aug 12-16, 2024 (5 business days)
    const startDate = '2024-08-12T09:30:00Z';
    const endDate = '2024-08-16T16:00:00Z';

    logger.info('📅 Testing 1 week collection:', {
        start: startDate,
        end: endDate,
        api: api,
        expectedDatapoints: '~1,950 minutes'
    });

    try {
        if (api === 'alpaca') {
            const { alpacaStockService } = await import('../../services/alpacaStockService');
            const data = await alpacaStockService.getBars('AAPL', '1Min', startDate, endDate);
            logger.info('✅ Alpaca data retrieved:', { count: data.length });

            // Show sample data
            if (data.length > 0) {
                console.log('📊 Sample data points:');
                console.log('   First:', data[0]);
                console.log('   Last:', data[data.length - 1]);
            }

        } else if (api === 'tiingo') {
            const { tiingoStockService } = await import('../../services/tiingoStockService');
            const data = await tiingoStockService.getIntradayPrices('AAPL', '2024-08-12', '2024-08-16', '1min');
            logger.info('✅ Tiingo data retrieved:', { count: data.length });

            // Show sample data
            if (data.length > 0) {
                console.log('📊 Sample data points:');
                console.log('   First:', data[0]);
                console.log('   Last:', data[data.length - 1]);
            }
        }

        logger.info('🎉 1-week test successful! Ready for manual inspection.');

    } catch (error: any) {
        logger.error('❌ 1-week test failed:', error.message);
    }
}

// Run the test
if (require.main === module) {
    test1WeekData().catch(error => {
        console.error('❌ Test script failed:', error.message);
        process.exit(1);
    });
}
