#!/usr/bin/env npx tsx

/**
 * Simple Gap Filler - Direct approach using MCP SQL queries
 * 
 * This script directly uses SQL to find missing articles and fills them
 * using our existing stock data lookup services
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { StockDataLookupService } from '../../services/stockDataLookupService';
import { MarketHoursService } from '../../services/marketHoursService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SimpleGapFiller');

interface MissingArticle {
    id: string;
    published_at: string;
    title: string;
}

class SimpleGapFiller {
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
     * Get missing articles directly via SQL (using our proven query)
     */
    async getMissingArticles(startDate: string, endDate: string): Promise<MissingArticle[]> {
        logger.info(`🔍 Finding articles missing stock data between ${startDate} and ${endDate}`);
        
        const query = `
            SELECT 
                a.id,
                a.published_at,
                a.title
            FROM articles a
            LEFT JOIN stock_prices sp ON (
                sp.ticker = 'AAPL' 
                AND sp.timestamp = DATE_TRUNC('minute', a.published_at)
            )
            WHERE a.published_at BETWEEN '${startDate}' AND '${endDate}'
            AND sp.timestamp IS NULL
            ORDER BY a.published_at;
        `;
        
        try {
            const { data, error } = await this.supabase.rpc('execute_sql', { query });
            
            if (error) {
                logger.error('SQL query error:', error);
                throw error;
            }
            
            const missingArticles = data || [];
            logger.info(`📊 Found ${missingArticles.length} articles missing stock data`);
            
            return missingArticles;
            
        } catch (error: any) {
            logger.error('Error getting missing articles:', error.message);
            throw error;
        }
    }
    
    /**
     * Fill gaps for a batch of missing articles
     */
    async fillGapsForArticles(missingArticles: MissingArticle[]): Promise<{
        successful: number;
        failed: number;
        strategies: Record<string, number>;
    }> {
        logger.info(`🔧 Filling gaps for ${missingArticles.length} articles...`);
        
        const result = {
            successful: 0,
            failed: 0,
            strategies: {} as Record<string, number>
        };
        
        const stockRecordsToInsert: any[] = [];
        
        for (let i = 0; i < missingArticles.length; i++) {
            const article = missingArticles[i];
            
            try {
                const articleTime = new Date(article.published_at);
                const strategy = MarketHoursService.getStockDataStrategy(articleTime);
                
                // Get the appropriate stock price using our lookup service
                const mlStockData = await this.stockLookupService.getMLStockData(articleTime, 'AAPL');
                
                if (mlStockData) {
                    // Create a stock record for the exact article timestamp (truncated to minute)
                    const truncatedTime = new Date(articleTime);
                    truncatedTime.setSeconds(0, 0);
                    
                    const stockRecord = {
                        ticker: 'AAPL',
                        timestamp: truncatedTime.toISOString(),
                        open: mlStockData.price_at_event,
                        high: mlStockData.price_at_event,
                        low: mlStockData.price_at_event,
                        close: mlStockData.price_at_event,
                        volume: 0, // Interpolated data has no volume
                        timeframe: '1Min',
                        source: `interpolated_${strategy.strategy}`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    
                    stockRecordsToInsert.push(stockRecord);
                    result.successful++;
                    
                    // Track strategy usage
                    result.strategies[strategy.strategy] = (result.strategies[strategy.strategy] || 0) + 1;
                    
                    logger.debug(`✅ ${article.id}: ${strategy.strategy} → $${mlStockData.price_at_event.toFixed(2)}`);
                } else {
                    result.failed++;
                    logger.warn(`❌ ${article.id}: Could not find stock data`);
                }
                
            } catch (error: any) {
                result.failed++;
                logger.error(`❌ ${article.id}: ${error.message}`);
            }
            
            // Progress logging
            if ((i + 1) % 50 === 0) {
                logger.info(`📈 Progress: ${i + 1}/${missingArticles.length} articles processed`);
            }
        }
        
        // Insert all the stock records
        if (stockRecordsToInsert.length > 0) {
            await this.insertStockRecords(stockRecordsToInsert);
        }
        
        return result;
    }
    
    /**
     * Insert stock records in batches
     */
    private async insertStockRecords(stockRecords: any[]): Promise<void> {
        logger.info(`💾 Inserting ${stockRecords.length} stock price records...`);
        
        const batchSize = 1000;
        
        for (let i = 0; i < stockRecords.length; i += batchSize) {
            const batch = stockRecords.slice(i, i + batchSize);
            
            try {
                const { error } = await this.supabase
                    .from('stock_prices')
                    .upsert(batch, {
                        onConflict: 'ticker,timestamp,timeframe,source',
                        ignoreDuplicates: false // Overwrite existing interpolated data
                    });
                    
                if (error) {
                    logger.error('Error inserting stock data batch:', error);
                    throw error;
                }
                
                logger.debug(`💾 Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(stockRecords.length/batchSize)}`);
                
            } catch (error: any) {
                logger.error('Error inserting stock records:', error.message);
                throw error;
            }
        }
        
        logger.info(`✅ Successfully inserted ${stockRecords.length} stock price records`);
    }
    
    /**
     * Verify the results
     */
    async verifyResults(startDate: string, endDate: string): Promise<{
        totalArticles: number;
        remainingMissing: number;
        completionPercentage: number;
    }> {
        logger.info('🔍 Verifying gap filling results...');
        
        // Count total articles
        const totalQuery = `SELECT COUNT(*) as total FROM articles WHERE published_at BETWEEN '${startDate}' AND '${endDate}';`;
        const { data: totalData } = await this.supabase.rpc('execute_sql', { query: totalQuery });
        const totalArticles = totalData?.[0]?.total || 0;
        
        // Count remaining missing
        const missingQuery = `
            SELECT COUNT(*) as missing
            FROM articles a
            LEFT JOIN stock_prices sp ON (
                sp.ticker = 'AAPL' 
                AND sp.timestamp = DATE_TRUNC('minute', a.published_at)
            )
            WHERE a.published_at BETWEEN '${startDate}' AND '${endDate}'
            AND sp.timestamp IS NULL;
        `;
        const { data: missingData } = await this.supabase.rpc('execute_sql', { query: missingQuery });
        const remainingMissing = missingData?.[0]?.missing || 0;
        
        const completionPercentage = totalArticles > 0 ? ((totalArticles - remainingMissing) / totalArticles) * 100 : 0;
        
        return {
            totalArticles,
            remainingMissing,
            completionPercentage
        };
    }
    
    /**
     * Main execution
     */
    async execute(startDate: string = '2024-10-01', endDate: string = '2025-01-31'): Promise<void> {
        logger.info('🎯 STARTING SIMPLE GAP FILLER');
        logger.info('=' * 50);
        logger.info(`📅 Date Range: ${startDate} → ${endDate}`);
        
        try {
            // Step 1: Get missing articles
            const missingArticles = await this.getMissingArticles(startDate, endDate);
            
            if (missingArticles.length === 0) {
                logger.info('✅ No gaps found! All articles have stock data.');
                return;
            }
            
            // Step 2: Analyze patterns
            logger.info('📊 PATTERN ANALYSIS:');
            const patterns = { weekend: 0, afterHours: 0, marketHours: 0, holiday: 0 };
            
            for (const article of missingArticles) {
                const session = MarketHoursService.analyzeMarketSession(new Date(article.published_at));
                if (session.isWeekend) patterns.weekend++;
                else if (session.isHoliday) patterns.holiday++;
                else if (session.isMarketOpen) patterns.marketHours++;
                else patterns.afterHours++;
            }
            
            logger.info(`   Weekends: ${patterns.weekend}`);
            logger.info(`   After Hours: ${patterns.afterHours}`);
            logger.info(`   Market Hours: ${patterns.marketHours}`);
            logger.info(`   Holidays: ${patterns.holiday}`);
            
            // Step 3: Fill the gaps
            const fillResult = await this.fillGapsForArticles(missingArticles);
            
            // Step 4: Verify results
            const verification = await this.verifyResults(startDate, endDate);
            
            // Final report
            logger.info('\n🎉 GAP FILLING COMPLETE!');
            logger.info('=' * 50);
            logger.info(`📊 RESULTS:`);
            logger.info(`   Articles Processed: ${missingArticles.length}`);
            logger.info(`   Successfully Filled: ${fillResult.successful}`);
            logger.info(`   Failed: ${fillResult.failed}`);
            logger.info(`   Success Rate: ${((fillResult.successful / missingArticles.length) * 100).toFixed(1)}%`);
            
            logger.info(`🎯 STRATEGIES USED:`);
            Object.entries(fillResult.strategies).forEach(([strategy, count]) => {
                logger.info(`   ${strategy}: ${count}`);
            });
            
            logger.info(`✅ FINAL VERIFICATION:`);
            logger.info(`   Total Articles: ${verification.totalArticles}`);
            logger.info(`   Remaining Missing: ${verification.remainingMissing}`);
            logger.info(`   Completion: ${verification.completionPercentage.toFixed(1)}%`);
            
            if (verification.completionPercentage >= 95) {
                logger.info('🎉 SUCCESS: ML training data is now complete!');
            } else {
                logger.warn(`⚠️  Still ${verification.remainingMissing} articles missing stock data`);
            }
            
        } catch (error: any) {
            logger.error('❌ Gap filling failed:', error.message);
            throw error;
        }
    }
}

// Run the gap filler
if (require.main === module) {
    const gapFiller = new SimpleGapFiller();
    
    const startDate = process.argv[2] || '2024-10-01';
    const endDate = process.argv[3] || '2025-01-31';
    
    gapFiller.execute(startDate, endDate).catch(error => {
        console.error('❌ Simple gap filling failed:', error.message);
        process.exit(1);
    });
}
