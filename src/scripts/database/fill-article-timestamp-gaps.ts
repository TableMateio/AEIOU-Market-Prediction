#!/usr/bin/env npx tsx

/**
 * Fill Article Timestamp Gaps
 * 
 * Gets stock data for exact timestamps where articles were published but stock data is missing
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ArticleTimestampGaps');

interface PolygonBar {
    t: number; o: number; h: number; l: number; c: number; v: number;
}

async function findMissingTimestamps() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    logger.info('🔍 Finding article timestamps missing stock data...');

    const { data: missingTimestamps } = await supabase.rpc('find_missing_stock_timestamps', {
        start_date: '2024-10-01',
        end_date: '2025-01-31'
    }).select();

    // If RPC doesn't exist, use direct query
    if (!missingTimestamps) {
        const { data } = await supabase
            .from('articles')
            .select('published_at')
            .gte('published_at', '2024-10-01')
            .lte('published_at', '2025-01-31');

        if (!data) return [];

        // Get unique minute timestamps
        const uniqueMinutes = [...new Set(
            data.map(article => {
                const date = new Date(article.published_at);
                date.setSeconds(0, 0); // Round down to minute
                return date.toISOString();
            })
        )];

        // Check which ones are missing stock data
        const missing = [];
        for (const timestamp of uniqueMinutes) {
            const { data: stockData } = await supabase
                .from('stock_prices')
                .select('timestamp')
                .eq('ticker', 'AAPL')
                .eq('timestamp', timestamp)
                .limit(1);

            if (!stockData || stockData.length === 0) {
                missing.push(timestamp);
            }
        }

        return missing;
    }

    return missingTimestamps;
}

async function fetchPolygonDataForTimestamp(timestamp: string) {
    const apiKey = process.env.POLYGON_API_KEY;

    // For specific timestamps, we need to get a small range around that time
    const targetDate = new Date(timestamp);
    const startDate = new Date(targetDate);
    startDate.setHours(targetDate.getHours() - 1); // 1 hour before
    const endDate = new Date(targetDate);
    endDate.setHours(targetDate.getHours() + 1); // 1 hour after

    const fromDate = startDate.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];

    const url = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/minute/${fromDate}/${toDate}?adjusted=true&sort=asc&apikey=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status !== 'OK') {
        throw new Error(`API status: ${data.status}`);
    }

    return data.results as PolygonBar[] || [];
}

async function storeStockData(bars: PolygonBar[], ticker: string = 'AAPL') {
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

    const { error } = await supabase
        .from('stock_prices')
        .upsert(stockPrices, {
            onConflict: 'ticker,timestamp,timeframe,source',
            ignoreDuplicates: false
        });

    if (error) throw error;
    return stockPrices.length;
}

async function fillArticleTimestampGaps() {
    logger.info('🎯 Filling stock data gaps for article timestamps...');

    const missingTimestamps = await findMissingTimestamps();

    if (missingTimestamps.length === 0) {
        logger.info('✅ No missing timestamps found!');
        return;
    }

    logger.info(`📋 Found ${missingTimestamps.length} missing timestamps`);

    // Group timestamps by date to minimize API calls
    const timestampsByDate = missingTimestamps.reduce((acc, timestamp) => {
        const date = timestamp.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(timestamp);
        return acc;
    }, {} as Record<string, string[]>);

    const dates = Object.keys(timestampsByDate);
    logger.info(`📅 Processing ${dates.length} unique dates`);

    let totalFilled = 0;

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const timestampsForDate = timestampsByDate[date];

        logger.info(`📊 Date ${i + 1}/${dates.length}: ${date} (${timestampsForDate.length} timestamps)`);

        try {
            // Get stock data for this entire date
            const bars = await fetchPolygonDataForTimestamp(timestampsForDate[0]);
            const inserted = await storeStockData(bars);

            totalFilled += inserted;

            logger.info(`✅ Date ${date}: ${inserted} rows filled`);

            // Conservative delay
            if (i < dates.length - 1) {
                logger.info('⏱️ Waiting 10 seconds...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }

        } catch (error: any) {
            logger.error(`❌ Date ${date} failed:`, error.message);

            if (error.message.includes('429')) {
                logger.warn('🚨 Rate limit - waiting 60 seconds...');
                await new Promise(resolve => setTimeout(resolve, 60000));
                i--; // Retry this date
                continue;
            }
        }
    }

    logger.info('\n🎉 ARTICLE TIMESTAMP GAPS FILLED:', {
        totalRowsFilled: totalFilled,
        datesProcessed: dates.length,
        status: 'ML training data should now be complete'
    });

    // Verify the fix
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { data: verification } = await supabase
        .from('articles')
        .select(`
            published_at,
            stock_prices!left(timestamp)
        `)
        .gte('published_at', '2024-10-01')
        .lte('published_at', '2025-01-31')
        .is('stock_prices.timestamp', null);

    logger.info(`📊 Remaining missing timestamps: ${verification?.length || 0}`);
}

if (require.main === module) {
    fillArticleTimestampGaps().catch(error => {
        console.error('❌ Gap filling failed:', error.message);
        process.exit(1);
    });
}
