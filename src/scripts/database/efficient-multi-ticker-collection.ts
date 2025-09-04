#!/usr/bin/env npx tsx

/**
 * Efficient Multi-Ticker Collection
 * 
 * Uses optimal 6-day chunks and overwrites existing data for clean collection
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EfficientMultiTicker');

interface PolygonBar {
    t: number; o: number; h: number; l: number; c: number; v: number;
}

async function fetchPolygonData(symbol: string, from: string, to: string) {
    const apiKey = process.env.POLYGON_API_KEY;
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/${from}/${to}?adjusted=true&sort=asc&apikey=${apiKey}`;

    logger.info(`📡 ${symbol}: ${from} → ${to}`);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status !== 'OK') {
        throw new Error(`API status: ${data.status}`);
    }

    const results = data.results as PolygonBar[] || [];

    if (results.length >= 5000) {
        logger.warn(`⚠️ ${symbol}: Hit 5,000 limit (${results.length} results)`);
    }

    return results;
}

async function storeStockData(bars: PolygonBar[], ticker: string) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const stockPrices = bars.map(bar => ({
        ticker,
        timestamp: new Date(bar.t).toISOString(),
        open: bar.o, high: bar.h, low: bar.l, close: bar.c, volume: bar.v,
        timeframe: '1Min',
        source: 'polygon'
    }));

    if (stockPrices.length === 0) return 0;

    // Use UPSERT to overwrite existing data (clean approach)
    const { error } = await supabase
        .from('stock_prices')
        .upsert(stockPrices, {
            onConflict: 'ticker,timestamp,timeframe,source',
            ignoreDuplicates: false  // OVERWRITE existing data
        });

    if (error) throw error;
    return stockPrices.length;
}

function generate6DayChunks(startDate: string, endDate: string): Array<{ from: string, to: string }> {
    const chunks = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let current = new Date(start);

    while (current < end) {
        const chunkEnd = new Date(current);
        chunkEnd.setDate(chunkEnd.getDate() + 5); // 6-day chunks (0-5 = 6 days)

        if (chunkEnd > end) {
            chunkEnd.setTime(end.getTime());
        }

        chunks.push({
            from: current.toISOString().split('T')[0],
            to: chunkEnd.toISOString().split('T')[0]
        });

        current.setDate(current.getDate() + 6);
    }

    return chunks;
}

async function collectAllTickers() {
    logger.info('🎯 Efficient multi-ticker collection with 6-day chunks...');

    // All tickers we need
    const tickers = ['AAPL', 'QQQ', 'SPY', 'DIA'];

    // Generate optimal 6-day chunks
    const chunks = generate6DayChunks('2024-07-01', '2025-09-01');

    logger.info('📅 Collection Plan:', {
        tickers: tickers.length,
        chunks: chunks.length,
        totalRequests: tickers.length * chunks.length,
        chunkSize: '6 days (optimal for 5,000 limit)',
        strategy: 'Overwrite existing data for clean collection'
    });

    // Estimate time
    const totalRequests = tickers.length * chunks.length;
    const estimatedMinutes = Math.ceil(totalRequests * 5 / 60); // 5 seconds per request
    logger.info(`⏱️ Estimated time: ~${estimatedMinutes} minutes`);

    let grandTotal = 0;

    for (let tickerIndex = 0; tickerIndex < tickers.length; tickerIndex++) {
        const ticker = tickers[tickerIndex];

        logger.info(`\n🎯 Starting ${ticker} (${tickerIndex + 1}/${tickers.length})...`);

        let tickerTotal = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            logger.info(`📊 ${ticker} ${i + 1}/${chunks.length}: ${chunk.from} → ${chunk.to}`);

            try {
                const bars = await fetchPolygonData(ticker, chunk.from, chunk.to);
                const inserted = await storeStockData(bars, ticker);

                tickerTotal += inserted;
                grandTotal += inserted;

                logger.info(`✅ ${ticker} chunk ${i + 1}: ${inserted} rows (${tickerTotal} total)`);

                // Conservative 5-second delay
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

            } catch (error: any) {
                logger.error(`❌ ${ticker} chunk ${i + 1} failed:`, error.message);

                if (error.message.includes('429')) {
                    logger.warn('🚨 Rate limit - waiting 30 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 30000));
                    i--; // Retry this chunk
                    continue;
                }

                logger.warn(`⏭️ Skipping ${ticker} chunk ${i + 1}`);
            }
        }

        logger.info(`✅ ${ticker} COMPLETE: ${tickerTotal} rows`);

        // Brief pause between tickers
        if (tickerIndex < tickers.length - 1) {
            logger.info('⏱️ Waiting 10 seconds before next ticker...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    logger.info('\n🎉 ALL TICKERS COMPLETE:', {
        tickers: tickers,
        totalRows: grandTotal,
        status: 'Ready for relative performance analysis'
    });

    // Final verification
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { data: finalCounts } = await supabase
        .from('stock_prices')
        .select('ticker')
        .eq('source', 'polygon');

    const tickerCounts = tickers.map(ticker => ({
        ticker,
        count: finalCounts?.filter(row => row.ticker === ticker).length || 0
    }));

    logger.info('📊 Final Ticker Counts:', tickerCounts);
}

if (require.main === module) {
    collectAllTickers().catch(error => {
        console.error('❌ Multi-ticker collection failed:', error.message);
        process.exit(1);
    });
}
