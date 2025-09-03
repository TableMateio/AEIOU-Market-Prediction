#!/usr/bin/env npx tsx

/**
 * Benchmark Tickers Collection: QQQ, SPY, DIA
 * 
 * Collects benchmark index data to compare against AAPL performance
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('BenchmarkCollection');

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

    logger.info('📡 Fetching chunk:', { symbol, from, to });

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
        throw new Error(`Polygon API status: ${data.status}`);
    }

    const results = data.results as PolygonBar[] || [];

    // Check if we hit the limit
    if (results.length >= 5000) {
        logger.warn('⚠️ Hit 5,000 limit - chunk may be incomplete');
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

    // Transform Polygon data to our schema
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

    if (stockPrices.length === 0) {
        logger.info('📭 No new data to store for this chunk');
        return 0;
    }

    // Insert in batches
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < stockPrices.length; i += batchSize) {
        const batch = stockPrices.slice(i, i + batchSize);

        // Use upsert to handle duplicates
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

function generateDateChunks(startDate: string, endDate: string, chunkDays: number = 7): Array<{ from: string, to: string, name: string }> {
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

        const fromStr = current.toISOString().split('T')[0];
        const toStr = chunkEnd.toISOString().split('T')[0];

        chunks.push({
            from: fromStr,
            to: toStr,
            name: `${fromStr} to ${toStr}`
        });

        current.setDate(current.getDate() + chunkDays);
    }

    return chunks;
}

async function collectBenchmarkTickers() {
    logger.info('🎯 Starting benchmark ticker collection (QQQ, SPY, DIA)...');

    // Benchmark tickers to collect
    const tickers = ['QQQ', 'SPY', 'DIA'];

    // Generate 7-day chunks for full range (same as AAPL)
    const ranges = [
        ...generateDateChunks('2024-07-01', '2024-12-31', 7), // July-Dec 2024
        ...generateDateChunks('2025-01-01', '2025-09-01', 7)  // Jan-Sep 2025
    ];

    logger.info('📅 Collection plan:', {
        tickers: tickers,
        totalChunks: ranges.length,
        totalRequests: tickers.length * ranges.length,
        chunkSize: '7 days each',
        timeRange: 'July 2024 - September 1, 2025'
    });

    let grandTotalFetched = 0;
    let grandTotalStored = 0;

    // Process each ticker separately
    for (let tickerIndex = 0; tickerIndex < tickers.length; tickerIndex++) {
        const ticker = tickers[tickerIndex];

        logger.info(`\n🎯 Starting ${ticker} collection (${tickerIndex + 1}/${tickers.length})...`);

        let tickerTotalFetched = 0;
        let tickerTotalStored = 0;
        let completedChunks = 0;

        for (let i = 0; i < ranges.length; i++) {
            const range = ranges[i];

            logger.info(`📊 ${ticker} Chunk ${i + 1}/${ranges.length}: ${range.name}`);

            try {
                // Fetch data for this chunk
                const bars = await fetchPolygonData(ticker, range.from, range.to);

                if (bars.length >= 5000) {
                    logger.warn(`⚠️ ${ticker}: Hit 5,000 limit on chunk ${range.name}`);
                }

                // Store in database
                const inserted = await storeStockData(bars, ticker);

                tickerTotalFetched += bars.length;
                tickerTotalStored += inserted;
                completedChunks++;

                logger.info(`✅ ${ticker} chunk ${i + 1}:`, {
                    fetched: bars.length,
                    stored: inserted,
                    tickerProgress: `${tickerTotalStored} ${ticker} rows`,
                    completion: `${completedChunks}/${ranges.length} chunks`
                });

                // Conservative rate limiting for paid tier
                if (i < ranges.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error: any) {
                logger.error(`❌ ${ticker} chunk ${i + 1} failed:`, error.message);

                // Continue with next chunk instead of failing entirely
                logger.warn(`⏭️ Skipping ${ticker} chunk ${i + 1}, continuing...`);
                continue;
            }
        }

        grandTotalFetched += tickerTotalFetched;
        grandTotalStored += tickerTotalStored;

        logger.info(`✅ ${ticker} COMPLETE:`, {
            fetched: tickerTotalFetched,
            stored: tickerTotalStored,
            completedChunks: `${completedChunks}/${ranges.length}`
        });

        // Pause between tickers
        if (tickerIndex < tickers.length - 1) {
            logger.info(`⏱️ Pausing 5 seconds before next ticker...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    logger.info('\n🎉 ALL BENCHMARK TICKERS COMPLETE:', {
        tickers: tickers,
        totalFetched: grandTotalFetched,
        totalStored: grandTotalStored,
        status: 'Ready for relative performance analysis'
    });
}

// Run the collection
if (require.main === module) {
    collectBenchmarkTickers().catch(error => {
        console.error('❌ Benchmark collection failed:', error.message);
        process.exit(1);
    });
}
