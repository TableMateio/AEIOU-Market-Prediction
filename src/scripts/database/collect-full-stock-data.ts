#!/usr/bin/env npx tsx

/**
 * Full Stock Data Collection: July 2024 - September 1, 2025
 * 
 * Collects complete AAPL minute-level data excluding already collected week
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('FullStockCollection');

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

async function collectFullRange() {
    logger.info('🎯 Starting full AAPL stock data collection...');

    // Define date ranges (excluding already collected Aug 12-16, 2024)
    const ranges = [
        // July 2024 - Aug 11, 2024
        { from: '2024-07-01', to: '2024-08-11', name: 'July-Aug11 2024' },

        // Aug 17, 2024 - Dec 31, 2024 (skip the week we already have)
        { from: '2024-08-17', to: '2024-12-31', name: 'Aug17-Dec 2024' },

        // Jan 1, 2025 - Sept 1, 2025
        { from: '2025-01-01', to: '2025-09-01', name: 'Jan-Sep1 2025' }
    ];

    logger.info('📅 Collection plan:', {
        totalRanges: ranges.length,
        excludedWeek: '2024-08-12 to 2024-08-16 (already collected)',
        estimatedDatapoints: '~150,000 minutes'
    });

    let totalFetched = 0;
    let totalStored = 0;

    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];

        logger.info(`\n📊 Range ${i + 1}/${ranges.length}: ${range.name}`);

        try {
            // Fetch data for this range
            const bars = await fetchPolygonData('AAPL', range.from, range.to);

            logger.info('✅ Fetched:', {
                count: bars.length,
                range: range.name,
                firstTime: new Date(bars[0]?.t).toISOString(),
                lastTime: new Date(bars[bars.length - 1]?.t).toISOString()
            });

            // Store in database
            const inserted = await storeStockData(bars, 'AAPL');

            totalFetched += bars.length;
            totalStored += inserted;

            logger.info(`✅ Range ${i + 1} complete:`, {
                fetched: bars.length,
                stored: inserted,
                totalProgress: `${totalStored} total rows`
            });

            // Brief pause between ranges to be API-friendly
            if (i < ranges.length - 1) {
                logger.info('⏱️ Pausing 2 seconds before next range...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

        } catch (error: any) {
            logger.error(`❌ Range ${i + 1} failed:`, error.message);
            throw error;
        }
    }

    logger.info('\n🎉 FULL COLLECTION COMPLETE!', {
        totalFetched,
        totalStored,
        timeRange: 'July 2024 - September 1, 2025',
        excludedWeek: 'Aug 12-16, 2024 (already collected)',
        status: 'Ready for news correlation analysis'
    });
}

// Run the collection
if (require.main === module) {
    collectFullRange().catch(error => {
        console.error('❌ Full collection failed:', error.message);
        process.exit(1);
    });
}
