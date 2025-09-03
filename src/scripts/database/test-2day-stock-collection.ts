#!/usr/bin/env npx tsx

/**
 * Test 1-Week Stock Data Collection
 * 
 * Validates bulk stock data collection and storage for one week
 */

import { stockDataService } from '../../services/stockDataService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('StockTest1Week');

async function test1WeekCollection() {
    logger.info('🎯 Testing 1-week bulk stock data collection...');

    // Pick 1 week of business days (Mon-Fri)
    const startDate = '2024-08-12T09:30:00Z'; // Monday
    const endDate = '2024-08-16T16:00:00Z';   // Friday

    logger.info('📅 Test window:', {
        start: startDate,
        end: endDate,
        duration: '1 week (5 business days)',
        expectedMinutes: '~1,950 datapoints'
    });

    try {
        // Test the bulk collection
        const result = await stockDataService.fetchAndStoreMinuteData(
            'AAPL',
            startDate,
            endDate,
            'alpaca' // Try Alpaca first
        );

        logger.info('✅ Bulk collection result:', result);

        if (result.success) {
            // Verify what we actually stored
            logger.info('🔍 Verifying stored data...');

            // Check a few specific minutes across the week
            const testTimes = [
                '2024-08-12T09:30:00Z', // Monday open
                '2024-08-12T15:59:00Z', // Monday close
                '2024-08-14T09:30:00Z', // Wednesday open  
                '2024-08-14T12:00:00Z', // Wednesday midday
                '2024-08-16T09:30:00Z', // Friday open
                '2024-08-16T15:59:00Z', // Friday close
            ];

            for (const testTime of testTimes) {
                const price = await stockDataService.getStockPriceAt({
                    ticker: 'AAPL',
                    timestamp: testTime,
                    toleranceMinutes: 1
                });

                if (price) {
                    console.log(`   ✅ ${testTime}: $${price.close} (vol: ${price.volume})`);
                } else {
                    console.log(`   ❌ ${testTime}: No data found`);
                }
            }

            logger.info('🎉 2-day test successful! Ready to scale.');

        } else {
            logger.error('❌ 2-day test failed. Check API configuration.');
        }

    } catch (error: any) {
        logger.error('❌ Test failed:', error.message);

        // Try fallback to Tiingo if Alpaca fails
        logger.info('🔄 Trying Tiingo as fallback...');
        try {
            const fallbackResult = await stockDataService.fetchAndStoreMinuteData(
                'AAPL',
                startDate,
                endDate,
                'tiingo'
            );
            logger.info('✅ Fallback result:', fallbackResult);
        } catch (fallbackError: any) {
            logger.error('❌ Both APIs failed:', fallbackError.message);
        }
    }
}

// Run the test
if (require.main === module) {
    test1WeekCollection().catch(error => {
        console.error('❌ Test script failed:', error.message);
        process.exit(1);
    });
}
