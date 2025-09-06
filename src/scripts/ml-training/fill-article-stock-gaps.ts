#!/usr/bin/env npx tsx

/**
 * Fill Article Stock Data Gaps
 * 
 * Comprehensive script to fill missing stock data for ML training
 * Uses market hours logic and existing Supabase stock data (no API calls needed)
 * Implements the same calculations as python/feature_config.py
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { StockDataLookupService, MLStockData } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ArticleStockGapFiller');

interface ArticleTimestamp {
    id: string;
    published_at: string;
    title: string;
}

interface GapFillResult {
    totalArticles: number;
    articlesWithMissingData: number;
    successfullyFilled: number;
    failed: number;
    strategies: Record<string, number>;
}

class ArticleStockGapFiller {
    private supabase: SupabaseClient;
    private stockLookupService: StockDataLookupService;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.stockLookupService = new StockDataLookupService();
    }

    /**
     * Find all articles missing stock data in the target date range
     */
    async findArticlesWithMissingStockData(startDate: string, endDate: string): Promise<ArticleTimestamp[]> {
        logger.info('🔍 Finding articles with missing stock data...');

        try {
            // Use direct SQL query to find articles missing stock data (same as our analysis)
            const sqlQuery = `
                SELECT 
                    a.id,
                    a.published_at,
                    a.title
                FROM articles a
                LEFT JOIN stock_prices sp ON (
                    sp.ticker = 'AAPL' 
                    AND sp.timestamp = DATE_TRUNC('minute', a.published_at)
                )
                WHERE a.published_at BETWEEN $1 AND $2
                AND sp.timestamp IS NULL
                ORDER BY a.published_at;
            `;
            
            const { data, error } = await this.supabase.rpc('execute_sql', {
                query: sqlQuery,
                params: [startDate, endDate]
            });
            
            let missingArticles: ArticleTimestamp[] = [];
            
            if (error && error.code === 'PGRST202') {
                // RPC doesn't exist, use direct query
                logger.info('Using Supabase client query...');
                
                const { data: rawData, error: queryError } = await this.supabase
                    .from('articles')
                    .select('id, published_at, title')
                    .gte('published_at', startDate)
                    .lte('published_at', endDate);
                    
                if (queryError) throw queryError;
                
                if (rawData && rawData.length > 0) {
                    logger.info(`Checking ${rawData.length} articles for missing stock data...`);
                    
                    for (let i = 0; i < rawData.length; i++) {
                        const article = rawData[i];
                        
                        // Truncate to minute precision like our SQL (DATE_TRUNC('minute', timestamp))
                        const publishedTime = new Date(article.published_at);
                        publishedTime.setSeconds(0, 0);
                        const truncatedTimestamp = publishedTime.toISOString();
                        
                        const { data: stockData } = await this.supabase
                            .from('stock_prices')
                            .select('timestamp')
                            .eq('ticker', 'AAPL')
                            .eq('timestamp', truncatedTimestamp)
                            .limit(1);
                            
                        if (!stockData || stockData.length === 0) {
                            missingArticles.push({
                                id: article.id,
                                published_at: article.published_at,
                                title: article.title
                            });
                        }
                        
                        // Progress logging
                        if ((i + 1) % 100 === 0) {
                            logger.info(`Progress: ${i + 1}/${rawData.length} articles checked`);
                        }
                    }
                }
            } else if (error) {
                throw error;
            } else {
                missingArticles = data || [];
            }

            logger.info(`📊 Found ${missingArticles.length} articles missing stock data`);

            return missingArticles;

        } catch (error: any) {
            logger.error('Error finding missing articles:', error.message);
            throw error;
        }
    }

    /**
     * Analyze missing data patterns
     */
    async analyzeMissingDataPatterns(articles: ArticleTimestamp[]): Promise<void> {
        logger.info('📈 Analyzing missing data patterns...');

        const patterns = {
            weekends: 0,
            holidays: 0,
            afterHours: 0,
            marketHours: 0,
            extendedHours: 0
        };

        const strategies = {
            exact: 0,
            previous_close: 0,
            next_open: 0
        };

        for (const article of articles) {
            const timestamp = new Date(article.published_at);
            const session = MarketHoursService.analyzeMarketSession(timestamp);
            const strategy = MarketHoursService.getStockDataStrategy(timestamp);

            if (session.isWeekend) patterns.weekends++;
            if (session.isHoliday) patterns.holidays++;
            if (session.isMarketOpen) patterns.marketHours++;
            if (session.isExtendedHours) patterns.extendedHours++;
            if (!session.isMarketOpen && !session.isExtendedHours && !session.isWeekend && !session.isHoliday) {
                patterns.afterHours++;
            }

            strategies[strategy.strategy]++;
        }

        logger.info('📊 Missing Data Patterns:');
        logger.info(`   Weekends: ${patterns.weekends}`);
        logger.info(`   Holidays: ${patterns.holidays}`);
        logger.info(`   After Hours: ${patterns.afterHours}`);
        logger.info(`   Market Hours: ${patterns.marketHours}`);
        logger.info(`   Extended Hours: ${patterns.extendedHours}`);

        logger.info('🎯 Strategies to Use:');
        logger.info(`   Exact Timestamp: ${strategies.exact}`);
        logger.info(`   Previous Close: ${strategies.previous_close}`);
        logger.info(`   Next Open: ${strategies.next_open}`);
    }

    /**
     * Fill stock data gaps for articles
     */
    async fillStockDataGaps(articles: ArticleTimestamp[], ticker: string = 'AAPL'): Promise<GapFillResult> {
        logger.info(`🔧 Filling stock data gaps for ${articles.length} articles...`);

        const result: GapFillResult = {
            totalArticles: articles.length,
            articlesWithMissingData: articles.length,
            successfullyFilled: 0,
            failed: 0,
            strategies: {}
        };

        const batchSize = 100;
        const stockDataToInsert: any[] = [];

        for (let i = 0; i < articles.length; i += batchSize) {
            const batch = articles.slice(i, i + batchSize);

            logger.info(`📊 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(articles.length / batchSize)} (${batch.length} articles)`);

            for (const article of batch) {
                try {
                    const timestamp = new Date(article.published_at);
                    const strategy = MarketHoursService.getStockDataStrategy(timestamp);

                    // Get ML stock data using our lookup service
                    const mlStockData = await this.stockLookupService.getMLStockData(timestamp, ticker);

                    if (mlStockData) {
                        // Create stock price record for the exact article timestamp
                        const stockRecord = {
                            ticker,
                            timestamp: timestamp.toISOString(),
                            open: mlStockData.price_at_event,
                            high: mlStockData.price_at_event,
                            low: mlStockData.price_at_event,
                            close: mlStockData.price_at_event,
                            volume: 0, // We don't have volume for interpolated data
                            timeframe: '1Min',
                            source: `interpolated_${strategy.strategy}`,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        stockDataToInsert.push(stockRecord);
                        result.successfullyFilled++;

                        // Track strategy usage
                        result.strategies[strategy.strategy] = (result.strategies[strategy.strategy] || 0) + 1;

                        logger.debug(`✅ ${article.id}: ${strategy.strategy} - $${mlStockData.price_at_event}`);
                    } else {
                        result.failed++;
                        logger.warn(`❌ ${article.id}: Could not find stock data`);
                    }

                } catch (error: any) {
                    result.failed++;
                    logger.error(`❌ ${article.id}: Error - ${error.message}`);
                }
            }

            // Insert batch of stock data
            if (stockDataToInsert.length > 0) {
                await this.insertStockDataBatch(stockDataToInsert.splice(0, stockDataToInsert.length));
            }

            // Progress update
            const processed = Math.min(i + batchSize, articles.length);
            logger.info(`📈 Progress: ${processed}/${articles.length} articles processed`);

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Insert any remaining stock data
        if (stockDataToInsert.length > 0) {
            await this.insertStockDataBatch(stockDataToInsert);
        }

        return result;
    }

    /**
     * Insert stock data batch into Supabase
     */
    private async insertStockDataBatch(stockData: any[]): Promise<void> {
        if (stockData.length === 0) return;

        try {
            const { error } = await this.supabase
                .from('stock_prices')
                .upsert(stockData, {
                    onConflict: 'ticker,timestamp,timeframe,source',
                    ignoreDuplicates: false // Overwrite existing interpolated data
                });

            if (error) {
                logger.error('Error inserting stock data batch:', error);
                throw error;
            }

            logger.debug(`💾 Inserted ${stockData.length} stock price records`);

        } catch (error: any) {
            logger.error('Error inserting stock data:', error.message);
            throw error;
        }
    }

    /**
     * Verify that articles now have stock data
     */
    async verifyGapsFilled(startDate: string, endDate: string): Promise<{
        totalArticles: number;
        articlesWithStockData: number;
        remainingMissing: number;
        completionPercentage: number;
    }> {
        logger.info('🔍 Verifying gaps have been filled...');

        try {
            // Count total articles in range
            const { count: totalArticles } = await this.supabase
                .from('articles')
                .select('id', { count: 'exact' })
                .gte('published_at', startDate)
                .lte('published_at', endDate);

            // Count articles with stock data (simplified approach)
            const { data: allArticles } = await this.supabase
                .from('articles')
                .select('id, published_at')
                .gte('published_at', startDate)
                .lte('published_at', endDate);

            let articlesWithStockCount = 0;

            if (allArticles) {
                for (const article of allArticles) {
                    const articleTime = new Date(article.published_at);
                    const roundedTime = new Date(articleTime);
                    roundedTime.setSeconds(0, 0);

                    const { data: stockData } = await this.supabase
                        .from('stock_prices')
                        .select('timestamp')
                        .eq('ticker', 'AAPL')
                        .eq('timestamp', roundedTime.toISOString())
                        .limit(1);

                    if (stockData && stockData.length > 0) {
                        articlesWithStockCount++;
                    }
                }
            }

            const articlesWithStockData = articlesWithStockCount;
            const remainingMissing = (totalArticles || 0) - articlesWithStockData;
            const completionPercentage = totalArticles ? (articlesWithStockData / totalArticles) * 100 : 0;

            return {
                totalArticles: totalArticles || 0,
                articlesWithStockData,
                remainingMissing,
                completionPercentage
            };

        } catch (error: any) {
            logger.error('Error verifying gaps filled:', error.message);
            throw error;
        }
    }

    /**
     * Main execution function
     */
    async execute(startDate: string = '2024-10-01', endDate: string = '2025-01-31'): Promise<void> {
        logger.info('🎯 Starting Article Stock Data Gap Filling...');
        logger.info(`📅 Date Range: ${startDate} → ${endDate}`);

        try {
            // Step 1: Find articles with missing stock data
            const missingArticles = await this.findArticlesWithMissingStockData(startDate, endDate);

            if (missingArticles.length === 0) {
                logger.info('✅ No missing stock data found! All articles have corresponding stock prices.');
                return;
            }

            // Step 2: Analyze patterns
            await this.analyzeMissingDataPatterns(missingArticles);

            // Step 3: Fill the gaps
            const result = await this.fillStockDataGaps(missingArticles);

            // Step 4: Verify completion
            const verification = await this.verifyGapsFilled(startDate, endDate);

            // Final report
            logger.info('\n🎉 GAP FILLING COMPLETE!');
            logger.info('=' * 50);
            logger.info(`📊 Results:`);
            logger.info(`   Total Articles: ${result.totalArticles}`);
            logger.info(`   Successfully Filled: ${result.successfullyFilled}`);
            logger.info(`   Failed: ${result.failed}`);
            logger.info(`   Success Rate: ${((result.successfullyFilled / result.totalArticles) * 100).toFixed(1)}%`);

            logger.info(`🎯 Strategies Used:`);
            Object.entries(result.strategies).forEach(([strategy, count]) => {
                logger.info(`   ${strategy}: ${count}`);
            });

            logger.info(`✅ Final Verification:`);
            logger.info(`   Articles with Stock Data: ${verification.articlesWithStockData}/${verification.totalArticles}`);
            logger.info(`   Completion: ${verification.completionPercentage.toFixed(1)}%`);
            logger.info(`   Remaining Missing: ${verification.remainingMissing}`);

            if (verification.completionPercentage >= 95) {
                logger.info('🎉 SUCCESS: ML training data is now complete!');
            } else {
                logger.warn(`⚠️  ${verification.remainingMissing} articles still missing stock data`);
            }

        } catch (error: any) {
            logger.error('❌ Gap filling failed:', error.message);
            throw error;
        }
    }
}

// Run the gap filler
if (require.main === module) {
    const gapFiller = new ArticleStockGapFiller();

    // You can customize the date range here
    const startDate = process.argv[2] || '2024-10-01';
    const endDate = process.argv[3] || '2025-01-31';

    gapFiller.execute(startDate, endDate).catch(error => {
        console.error('❌ Gap filling script failed:', error.message);
        process.exit(1);
    });
}
