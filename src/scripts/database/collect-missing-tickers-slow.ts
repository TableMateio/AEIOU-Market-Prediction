#!/usr/bin/env npx tsx

/**
 * Slow & Reliable Ticker Collection
 * 
 * Collects missing SPY, DIA and completes QQQ with aggressive rate limiting
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SlowTickerCollection');

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

    logger.info('📡 Fetching:', { symbol, from, to });

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
        throw new Error(`Polygon API status: ${data.status}`);
    }

    const results = data.results as PolygonBar[] || [];

    if (results.length >= 5000) {
        logger.warn('⚠️ Hit 5,000 limit - chunk incomplete');
    }

    return results;
}

async function storeStockData(bars: PolygonBar[], ticker: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const stockPrices = bars.map(bar => ({
        ticker,
        timestamp: new Date(bar.t).toISOString(),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v,
        timeframe: '1Min',
        source: 'polygon'
    }));

    if (stockPrices.length === 0) return 0;

    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < stockPrices.length; i += batchSize) {
        const batch = stockPrices.slice(i, i + batchSize);

        const { error } = await supabase
            .from('stock_prices')
            .upsert(batch, {
                onConflict: 'ticker,timestamp,timeframe,source',
                ignoreDuplicates: true
            });

        if (error) {
            logger.error('❌ Insert error:', error);
            throw error;
        }

        inserted += batch.length;
    }

    return inserted;
}

function generateDateChunks(startDate: string, endDate: string, chunkDays: number = 3): Array<{ from: string, to: string }> {
    const chunks = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let current = new Date(start);

    while (current < end) {
        const chunkEnd = new Date(current);
        chunkEnd.setDate(chunkEnd.getDate() + chunkDays - 1);

        if (chunkEnd > end) {
            chunkEnd.setTime(end.getTime());
        }

        chunks.push({
            from: current.toISOString().split('T')[0],
            to: chunkEnd.toISOString().split('T')[0]
        });

        current.setDate(current.getDate() + chunkDays);
    }

    return chunks;
}

async function collectMissingData() {
    logger.info('🎯 Collecting missing ticker data with slow, reliable approach...');

    // Define what we need to collect
    const collections = [
        // Complete QQQ (missing Aug 17, 2024 onwards)
        {
            ticker: 'QQQ',
            ranges: [
                ...generateDateChunks('2024-08-17', '2024-12-31', 3),
                ...generateDateChunks('2025-01-01', '2025-09-01', 3)
            ]
        },
        // Full SPY collection
        {
            ticker: 'SPY',
            ranges: [
                ...generateDateChunks('2024-07-01', '2024-12-31', 3),
                ...generateDateChunks('2025-01-01', '2025-09-01', 3)
            ]
        },
        // Full DIA collection
        {
            ticker: 'DIA',
            ranges: [
                ...generateDateChunks('2024-07-01', '2024-12-31', 3),
                ...generateDateChunks('2025-01-01', '2025-09-01', 3)
            ]
        }
    ];

    let grandTotal = 0;

    for (const collection of collections) {
        logger.info(`\n🎯 Starting ${collection.ticker} collection...`);
        logger.info(`📅 ${collection.ticker} plan: ${collection.ranges.length} chunks (3 days each)`);

        let tickerTotal = 0;

        for (let i = 0; i < collection.ranges.length; i++) {
            const range = collection.ranges[i];

            logger.info(`📊 ${collection.ticker} ${i + 1}/${collection.ranges.length}: ${range.from} to ${range.to}`);

            try {
                const bars = await fetchPolygonData(collection.ticker, range.from, range.to);
                const inserted = await storeStockData(bars, collection.ticker);

                tickerTotal += inserted;
                grandTotal += inserted;

                logger.info(`✅ ${collection.ticker} chunk ${i + 1}: ${inserted} rows (${tickerTotal} total)`);

                // AGGRESSIVE rate limiting to avoid 429 errors
                if (i < collection.ranges.length - 1) {
                    logger.info('⏱️ Waiting 10 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }

            } catch (error: any) {
                logger.error(`❌ ${collection.ticker} chunk ${i + 1} failed:`, error.message);

                if (error.message.includes('429')) {
                    logger.warn('🚨 Rate limit hit - waiting 30 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 30000));
                    i--; // Retry this chunk
                    continue;
                }

                logger.warn(`⏭️ Skipping ${collection.ticker} chunk ${i + 1}`);
            }
        }

        logger.info(`✅ ${collection.ticker} COMPLETE: ${tickerTotal} rows`);

        // Long pause between tickers
        logger.info('⏱️ Waiting 30 seconds before next ticker...');
        await new Promise(resolve => setTimeout(resolve, 30000));
    }

    logger.info('\n🎉 MISSING DATA COLLECTION COMPLETE:', {
        totalAdded: grandTotal,
        status: 'All tickers should now have complete coverage'
    });
}

if (require.main === module) {
    collectMissingData().catch(error => {
        console.error('❌ Collection failed:', error.message);
        process.exit(1);
    });
}
