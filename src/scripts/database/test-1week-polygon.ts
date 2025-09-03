#!/usr/bin/env npx tsx

/**
 * 1-Week Polygon Stock Data Test
 * 
 * Tests Polygon.io bulk collection for 1 week, stores in Supabase
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Polygon1WeekTest');

interface PolygonBar {
    t: number;  // timestamp (ms)
    o: number;  // open
    h: number;  // high
    l: number;  // low
    c: number;  // close
    v: number;  // volume
}

async function fetchPolygonData(symbol: string, from: string, to: string) {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey) throw new Error('POLYGON_API_KEY not configured');

    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/${from}/${to}?adjusted=true&sort=asc&apikey=${apiKey}`;

    logger.info('📡 Fetching from Polygon:', { symbol, from, to });

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
        throw new Error(`Polygon API status: ${data.status}`);
    }

    return data.results as PolygonBar[];
}

async function storeStockData(bars: PolygonBar[], ticker: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Transform Polygon data to our schema
    const stockPrices = bars.map(bar => ({
        ticker,
        timestamp: new Date(bar.t).toISOString(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        source: 'polygon'
    }));

    logger.info('💾 Storing to Supabase:', { count: stockPrices.length });

    // Insert in batches (Supabase limit ~1000 rows per insert)
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < stockPrices.length; i += batchSize) {
        const batch = stockPrices.slice(i, i + batchSize);

        const { error } = await supabase
            .from('stock_prices')
            .insert(batch);

        if (error) {
            logger.error('❌ Insert error:', error);
            throw error;
        }

        inserted += batch.length;
        logger.info(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${stockPrices.length} rows`);
    }

    return inserted;
}

async function test1WeekCollection() {
    logger.info('🎯 Testing 1-week Polygon.io bulk collection...');

    // One week: Aug 12-16, 2024 (Mon-Fri)
    const fromDate = '2024-08-12';  // Polygon uses YYYY-MM-DD format
    const toDate = '2024-08-16';

    logger.info('📅 Test window:', {
        from: fromDate,
        to: toDate,
        duration: '1 week (5 business days)',
        expectedMinutes: '~1,950 datapoints'
    });

    try {
        // Fetch the data
        const bars = await fetchPolygonData('AAPL', fromDate, toDate);

        logger.info('✅ Data fetched:', {
            count: bars.length,
            firstTime: new Date(bars[0]?.t).toISOString(),
            lastTime: new Date(bars[bars.length - 1]?.t).toISOString()
        });

        // Store in database
        const inserted = await storeStockData(bars, 'AAPL');

        logger.info('🎉 1-week test complete!', {
            fetched: bars.length,
            stored: inserted,
            status: 'Ready for manual inspection'
        });

        // Show sample data for inspection
        console.log('\n📊 Sample data points for inspection:');
        const samples = [0, Math.floor(bars.length / 4), Math.floor(bars.length / 2), Math.floor(bars.length * 3 / 4), bars.length - 1];

        samples.forEach(i => {
            if (bars[i]) {
                const bar = bars[i];
                const time = new Date(bar.t).toISOString();
                console.log(`   ${time}: Open=$${bar.o}, Close=$${bar.c}, Vol=${bar.v}`);
            }
        });

    } catch (error: any) {
        logger.error('❌ 1-week test failed:', error.message);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    test1WeekCollection().catch(error => {
        console.error('❌ Test script failed:', error.message);
        process.exit(1);
    });
}
