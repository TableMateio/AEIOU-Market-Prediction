#!/usr/bin/env npx tsx

/**
 * Complete Stock Data Collection with Chunking
 * 
 * Handles Polygon's 5,000 result limit by using smaller date chunks
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CompleteStockCollection');

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

async function collectCompleteRange() {
    logger.info('🎯 Starting complete AAPL stock data collection with chunking...');

    // Check what we already have
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { data: existingData } = await supabase
        .from('stock_prices')
        .select('timestamp')
        .eq('ticker', 'AAPL')
        .order('timestamp', { ascending: true });

    if (existingData && existingData.length > 0) {
        logger.info('📊 Existing data:', {
            count: existingData.length,
            firstDate: existingData[0].timestamp,
            lastDate: existingData[existingData.length - 1].timestamp
        });
    }

    // Generate 7-day chunks to stay under 5,000 limit
    // Skip July 1 - July 11 (already have) and Aug 12-16 (already have)
    const ranges = [
        ...generateDateChunks('2024-07-12', '2024-08-11', 7), // Complete July-Aug gap
        ...generateDateChunks('2024-08-17', '2024-12-31', 7), // Aug-Dec 2024  
        ...generateDateChunks('2025-01-01', '2025-09-01', 7)  // Jan-Sep 2025
    ];

    logger.info('📅 Collection plan:', {
        totalChunks: ranges.length,
        chunkSize: '7 days each',
        strategy: 'Avoid 5,000 result limit',
        skipExisting: 'July 1-11 and Aug 12-16 already collected'
    });

    let totalFetched = 0;
    let totalStored = 0;
    let completedChunks = 0;

    for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];

        logger.info(`\n📊 Chunk ${i + 1}/${ranges.length}: ${range.name}`);

        try {
            // Fetch data for this chunk
            const bars = await fetchPolygonData('AAPL', range.from, range.to);

            if (bars.length >= 5000) {
                logger.error(`🚨 STILL HITTING LIMIT: Chunk ${range.name} returned ${bars.length} results`);
                logger.error('❌ Need to use smaller chunks (3-4 days instead of 7)');
                break;
            }

            // Store in database
            const inserted = await storeStockData(bars, 'AAPL');

            totalFetched += bars.length;
            totalStored += inserted;
            completedChunks++;

            logger.info(`✅ Chunk ${i + 1} complete:`, {
                fetched: bars.length,
                stored: inserted,
                totalProgress: `${totalStored} new rows`,
                completion: `${completedChunks}/${ranges.length} chunks`
            });

            // Rate limiting: brief pause for paid tier (up to 100 requests/second)
            if (i < ranges.length - 1) {
                logger.info('⏱️ Brief pause...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }

        } catch (error: any) {
            logger.error(`❌ Chunk ${i + 1} failed:`, error.message);
            throw error;
        }
    }

    logger.info('\n🎉 CHUNKED COLLECTION RESULTS:', {
        completedChunks: `${completedChunks}/${ranges.length}`,
        totalFetched,
        totalStored,
        status: completedChunks === ranges.length ? 'COMPLETE' : 'PARTIAL'
    });
}

// Run the collection
if (require.main === module) {
    collectCompleteRange().catch(error => {
        console.error('❌ Complete collection failed:', error.message);
        process.exit(1);
    });
}
