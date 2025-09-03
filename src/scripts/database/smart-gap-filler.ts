#!/usr/bin/env npx tsx

/**
 * Smart Gap Filler for Stock Data
 * 
 * Analyzes existing data and fills only the missing gaps with slow, reliable collection
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SmartGapFiller');

interface PolygonBar {
    t: number; o: number; h: number; l: number; c: number; v: number;
}

async function analyzeExistingData() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    logger.info('🔍 Analyzing existing stock data...');

    // Check what we have for each ticker
    const { data: summary } = await supabase
        .from('stock_prices')
        .select('ticker')
        .eq('source', 'polygon');

    const tickers = [...new Set(summary?.map(row => row.ticker) || [])];

    const analysis: Record<string, any> = {};

    for (const ticker of tickers) {
        const { data } = await supabase
            .from('stock_prices')
            .select('timestamp')
            .eq('ticker', ticker)
            .eq('source', 'polygon')
            .order('timestamp');

        if (data && data.length > 0) {
            analysis[ticker] = {
                count: data.length,
                firstDate: data[0].timestamp.split('T')[0],
                lastDate: data[data.length - 1].timestamp.split('T')[0],
                hasData: true
            };
        }
    }

    // Check what's missing
    const targetTickers = ['AAPL', 'QQQ', 'SPY', 'DIA'];
    const targetStart = '2024-07-01';
    const targetEnd = '2025-09-01';

    const gaps = [];

    for (const ticker of targetTickers) {
        if (!analysis[ticker]) {
            // Completely missing
            gaps.push({
                ticker,
                type: 'MISSING_ENTIRELY',
                needsCollection: { from: targetStart, to: targetEnd }
            });
        } else {
            const data = analysis[ticker];

            // Check if coverage is incomplete
            if (data.firstDate > targetStart) {
                gaps.push({
                    ticker,
                    type: 'MISSING_START',
                    needsCollection: { from: targetStart, to: data.firstDate }
                });
            }

            if (data.lastDate < targetEnd) {
                gaps.push({
                    ticker,
                    type: 'MISSING_END',
                    needsCollection: { from: data.lastDate, to: targetEnd }
                });
            }
        }
    }

    logger.info('📊 Data Analysis:', analysis);
    logger.info('🚨 Gaps Found:', gaps);

    return { analysis, gaps };
}

async function fetchPolygonData(symbol: string, from: string, to: string) {
    const apiKey = process.env.POLYGON_API_KEY;
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/${from}/${to}?adjusted=true&sort=asc&apikey=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status !== 'OK') {
        throw new Error(`Polygon API status: ${data.status}`);
    }

    return data.results as PolygonBar[] || [];
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

    // Insert in small batches to be conservative
    const batchSize = 200;
    let inserted = 0;

    for (let i = 0; i < stockPrices.length; i += batchSize) {
        const batch = stockPrices.slice(i, i + batchSize);

        const { error } = await supabase
            .from('stock_prices')
            .upsert(batch, {
                onConflict: 'ticker,timestamp,timeframe,source',
                ignoreDuplicates: true
            });

        if (error) throw error;
        inserted += batch.length;
    }

    return inserted;
}

function generateSmallChunks(startDate: string, endDate: string): Array<{ from: string, to: string }> {
    const chunks = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let current = new Date(start);

    while (current < end) {
        const chunkEnd = new Date(current);
        chunkEnd.setDate(chunkEnd.getDate() + 2); // 3-day chunks to stay well under 5,000 limit

        if (chunkEnd > end) {
            chunkEnd.setTime(end.getTime());
        }

        chunks.push({
            from: current.toISOString().split('T')[0],
            to: chunkEnd.toISOString().split('T')[0]
        });

        current.setDate(current.getDate() + 3);
    }

    return chunks;
}

async function fillGaps() {
    logger.info('🎯 Starting smart gap-filling collection...');

    const { analysis, gaps } = await analyzeExistingData();

    if (gaps.length === 0) {
        logger.info('✅ No gaps found - all data complete!');
        return;
    }

    logger.info(`📋 Found ${gaps.length} gaps to fill`);

    let totalFilled = 0;

    for (let gapIndex = 0; gapIndex < gaps.length; gapIndex++) {
        const gap = gaps[gapIndex];

        logger.info(`\n🔧 Filling gap ${gapIndex + 1}/${gaps.length}:`);
        logger.info(`   ${gap.ticker}: ${gap.type}`);
        logger.info(`   Range: ${gap.needsCollection.from} → ${gap.needsCollection.to}`);

        // Generate small chunks for this gap
        const chunks = generateSmallChunks(gap.needsCollection.from, gap.needsCollection.to);

        logger.info(`   📅 Plan: ${chunks.length} chunks (3 days each)`);

        let gapFilled = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            logger.info(`   📊 ${gap.ticker} chunk ${i + 1}/${chunks.length}: ${chunk.from} to ${chunk.to}`);

            try {
                const bars = await fetchPolygonData(gap.ticker, chunk.from, chunk.to);
                const inserted = await storeStockData(bars, gap.ticker);

                gapFilled += inserted;
                totalFilled += inserted;

                logger.info(`   ✅ Chunk ${i + 1}: ${inserted} rows (${gapFilled} total for ${gap.ticker})`);

                // VERY conservative rate limiting - 20 seconds between requests
                if (i < chunks.length - 1) {
                    logger.info('   ⏱️ Waiting 20 seconds (rate limit safety)...');
                    await new Promise(resolve => setTimeout(resolve, 20000));
                }

            } catch (error: any) {
                logger.error(`   ❌ ${gap.ticker} chunk ${i + 1} failed:`, error.message);

                if (error.message.includes('429')) {
                    logger.warn('   🚨 Rate limit - waiting 60 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 60000));
                    i--; // Retry this chunk
                    continue;
                }

                logger.warn(`   ⏭️ Skipping chunk ${i + 1}`);
            }
        }

        logger.info(`✅ ${gap.ticker} gap filled: ${gapFilled} rows`);

        // Long pause between different tickers/gaps
        if (gapIndex < gaps.length - 1) {
            logger.info('⏱️ Waiting 60 seconds before next gap...');
            await new Promise(resolve => setTimeout(resolve, 60000));
        }
    }

    logger.info('\n🎉 GAP FILLING COMPLETE:', {
        totalGapsFilled: gaps.length,
        totalRowsAdded: totalFilled,
        status: 'All tickers should now have complete coverage'
    });

    // Final verification
    const { analysis: finalAnalysis } = await analyzeExistingData();
    logger.info('📊 Final Coverage:', finalAnalysis);
}

if (require.main === module) {
    fillGaps().catch(error => {
        console.error('❌ Gap filling failed:', error.message);
        process.exit(1);
    });
}
