#!/usr/bin/env npx tsx

/**
 * Debug Stock Lookup - Test our stock lookup service with a single article
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { StockDataLookupService } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DebugStockLookup');

async function testStockLookup() {
    logger.info('🧪 TESTING STOCK LOOKUP SERVICE');
    
    try {
        // Test article: 2024-10-01 09:12:23.683+00
        const testTimestamp = new Date('2024-10-01T09:12:23.683Z');
        
        logger.info(`📅 Test timestamp: ${testTimestamp.toISOString()}`);
        
        // Analyze market session
        const session = MarketHoursService.analyzeMarketSession(testTimestamp);
        logger.info('📊 Market session analysis:');
        logger.info(`   Market Open: ${session.isMarketOpen}`);
        logger.info(`   Extended Hours: ${session.isExtendedHours}`);
        logger.info(`   Weekend: ${session.isWeekend}`);
        logger.info(`   Holiday: ${session.isHoliday}`);
        
        // Get strategy
        const strategy = MarketHoursService.getStockDataStrategy(testTimestamp);
        logger.info('🎯 Strategy:');
        logger.info(`   Strategy: ${strategy.strategy}`);
        logger.info(`   Target Timestamp: ${strategy.targetTimestamp.toISOString()}`);
        logger.info(`   Reasoning: ${strategy.reasoning}`);
        
        // Test stock lookup service
        logger.info('🔍 Testing stock lookup...');
        const stockLookupService = new StockDataLookupService();
        
        // First, let's test finding a single stock price
        logger.info('   Testing findNearestStockPrice...');
        const nearestStock = await stockLookupService.findNearestStockPrice(testTimestamp, 'AAPL');
        
        if (nearestStock) {
            logger.info(`   ✅ Found nearest stock: ${nearestStock.timestamp} - $${nearestStock.close}`);
        } else {
            logger.warn(`   ❌ No nearest stock found`);
        }
        
        // Now test the full ML stock data
        logger.info('   Testing getMLStockData...');
        const mlData = await stockLookupService.getMLStockData(testTimestamp, 'AAPL');
        
        if (mlData) {
            logger.info(`   ✅ ML Stock Data:`);
            logger.info(`      Price at event: $${mlData.price_at_event}`);
            logger.info(`      Price 1 day after: $${mlData.price_1day_after || 'N/A'}`);
            logger.info(`      Price 1 week after: $${mlData.price_1week_after || 'N/A'}`);
            logger.info(`      1-day change: ${mlData.abs_change_1day_after_pct?.toFixed(2) || 'N/A'}%`);
            logger.info(`      1-week change: ${mlData.abs_change_1week_after_pct?.toFixed(2) || 'N/A'}%`);
            logger.info(`      Strategy used: ${mlData.strategy_used}`);
        } else {
            logger.warn(`   ❌ No ML stock data found`);
        }
        
    } catch (error: any) {
        logger.error('❌ Test failed:', error.message);
        logger.error('Stack trace:', error.stack);
    }
}

// Run the test
testStockLookup();
