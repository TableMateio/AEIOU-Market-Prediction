#!/usr/bin/env npx tsx

/**
 * Debug Supabase Connection - Test basic connectivity and data
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';

const logger = createLogger('DebugSupabase');

async function main() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    logger.info('🔍 SUPABASE CONNECTION DEBUG');
    logger.info('=' * 50);
    logger.info(`URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'}`);
    logger.info(`Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'MISSING'}`);

    if (!supabaseUrl || !supabaseKey) {
        logger.error('❌ Supabase configuration missing!');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Test 1: Basic connection with simple count
        logger.info('\n📊 Test 1: Count all articles...');
        const { data: countData, error: countError } = await supabase
            .from('articles')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            logger.error('❌ Count error:', countError);
        } else {
            logger.info(`✅ Total articles in database: ${countData?.length || 'unknown'}`);
        }

        // Test 2: Get first 5 articles
        logger.info('\n📄 Test 2: Get first 5 articles...');
        const { data: articles, error: articlesError } = await supabase
            .from('articles')
            .select('id, published_at, title')
            .limit(5);

        if (articlesError) {
            logger.error('❌ Articles error:', articlesError);
        } else {
            logger.info(`✅ Found ${articles?.length || 0} articles:`);
            articles?.forEach((article, i) => {
                logger.info(`   ${i + 1}. ${article.published_at} - ${article.title.substring(0, 50)}...`);
            });
        }

        // Test 3: Get articles in our date range
        logger.info('\n📅 Test 3: Get articles in date range 2024-07-01 to 2025-02-10...');
        const { data: dateRangeArticles, error: dateError } = await supabase
            .from('articles')
            .select('id, published_at, title')
            .gte('published_at', '2024-07-01')
            .lte('published_at', '2025-02-10')
            .limit(5);

        if (dateError) {
            logger.error('❌ Date range error:', dateError);
        } else {
            logger.info(`✅ Found ${dateRangeArticles?.length || 0} articles in date range:`);
            dateRangeArticles?.forEach((article, i) => {
                logger.info(`   ${i + 1}. ${article.published_at} - ${article.title.substring(0, 50)}...`);
            });
        }

        // Test 4: Check stock_prices table
        logger.info('\n📈 Test 4: Check stock_prices table...');
        const { data: stockData, error: stockError } = await supabase
            .from('stock_prices')
            .select('ticker, timestamp, close')
            .eq('ticker', 'AAPL')
            .limit(5);

        if (stockError) {
            logger.error('❌ Stock data error:', stockError);
        } else {
            logger.info(`✅ Found ${stockData?.length || 0} stock records:`);
            stockData?.forEach((stock, i) => {
                logger.info(`   ${i + 1}. ${stock.timestamp} - $${stock.close}`);
            });
        }

        // Test 5: Check for missing stock data example
        logger.info('\n🔍 Test 5: Check for missing stock data example...');
        if (dateRangeArticles && dateRangeArticles.length > 0) {
            const testArticle = dateRangeArticles[0];
            const publishedAt = new Date(testArticle.published_at);
            publishedAt.setSeconds(0, 0);

            logger.info(`   Testing article: ${testArticle.title.substring(0, 50)}...`);
            logger.info(`   Published at: ${testArticle.published_at}`);
            logger.info(`   Looking for stock data at: ${publishedAt.toISOString()}`);

            const { data: matchingStock, error: matchError } = await supabase
                .from('stock_prices')
                .select('timestamp, close')
                .eq('ticker', 'AAPL')
                .eq('timestamp', publishedAt.toISOString())
                .limit(1);

            if (matchError) {
                logger.error('❌ Match error:', matchError);
            } else {
                if (matchingStock && matchingStock.length > 0) {
                    logger.info(`✅ Found matching stock data: $${matchingStock[0].close}`);
                } else {
                    logger.info(`❌ NO matching stock data found - this article needs gap filling!`);
                }
            }
        }

    } catch (error: any) {
        logger.error('❌ Connection test failed:', error.message);
    }
}

main().catch(error => {
    console.error('Debug script failed:', error);
    process.exit(1);
});
