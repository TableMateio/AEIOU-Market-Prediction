#!/usr/bin/env npx tsx

/**
 * Test Weekend Article - Test the improved stock lookup on a weekend article
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { StockDataLookupService } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('TestWeekendArticle');

async function testWeekendArticle() {
    logger.info('🧪 Testing improved stock lookup on weekend article');

    // Test article: "I was wrong about Kamala Harris" published 2024-08-03 09:09:41+00 (Saturday)
    const articleTime = new Date('2024-08-03T09:09:41.000Z');
    logger.info(`📅 Testing article: ${articleTime.toISOString()}`);

    try {
        const stockLookupService = new StockDataLookupService();

        // Get strategy
        const strategy = MarketHoursService.getStockDataStrategy(articleTime);
        logger.info(`🎯 Strategy: ${strategy.strategy} - ${strategy.reasoning}`);

        // Test the ML stock data lookup
        const mlData = await stockLookupService.getMLStockData(articleTime, 'AAPL');

        if (mlData) {
            logger.info('✅ SUCCESS!');
            logger.info(`   Price at event: $${mlData.price_at_event.toFixed(2)}`);
            logger.info(`   1-day change: ${mlData.abs_change_1day_after_pct?.toFixed(2) || 'N/A'}%`);
            logger.info(`   1-week change: ${mlData.abs_change_1week_after_pct?.toFixed(2) || 'N/A'}%`);
            logger.info(`   Strategy used: ${mlData.strategy_used}`);
            logger.info(`   Source timestamp: ${mlData.source_timestamp}`);
        } else {
            logger.warn('❌ FAILED: Could not find stock data');
        }

    } catch (error: any) {
        logger.error('❌ Test failed:', error.message);
    }
}

// Run the test
testWeekendArticle();
