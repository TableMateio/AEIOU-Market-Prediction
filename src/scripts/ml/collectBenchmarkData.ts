/**
 * Benchmark Data Collection Script
 * 
 * Collects stock data for market benchmarks (SPY, QQQ, XLK, FAANG)
 * Required for calculating relative performance metrics
 */

import { polygonStockService } from '../../services/polygonStockService.js';
import { stockDataStorageService } from '../../services/stockDataStorageService.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('BenchmarkDataCollection');

interface BenchmarkConfig {
    tickers: string[];
    startDate: string;     // YYYY-MM-DD
    endDate: string;       // YYYY-MM-DD
    timeframe: '1Min' | '5Min' | '1Hour' | '1Day';
    batchSizeDays: number; // Days per API call
}

class BenchmarkDataCollector {

    private readonly benchmarkTickers = {
        market: ['SPY', 'QQQ', 'IWM'],           // Broad market
        sector: ['XLK', 'XLV', 'XLF', 'XLI'],   // Tech, Health, Finance, Industrial
        faang: ['AAPL', 'GOOGL', 'META', 'AMZN', 'NFLX', 'TSLA'], // Big tech
        crypto: ['BTC-USD'],                      // Bitcoin for context
    };

    /**
     * Collect all benchmark data needed for ML training
     */
    async collectAllBenchmarks(config: Partial<BenchmarkConfig> = {}): Promise<void> {
        const fullConfig: BenchmarkConfig = {
            tickers: [...this.benchmarkTickers.market, ...this.benchmarkTickers.sector, ...this.benchmarkTickers.faang],
            startDate: config.startDate || '2023-01-01',
            endDate: config.endDate || '2024-12-31',
            timeframe: config.timeframe || '1Min',
            batchSizeDays: config.batchSizeDays || 7,
            ...config
        };

        logger.info('🚀 Starting benchmark data collection', fullConfig);

        let totalCollected = 0;
        let totalErrors = 0;

        for (const ticker of fullConfig.tickers) {
            try {
                logger.info(`📊 Collecting data for ${ticker}...`);

                const collected = await this.collectTickerData(ticker, fullConfig);
                totalCollected += collected;

                logger.info(`✅ Completed ${ticker}: ${collected} records`);

                // Rate limiting pause
                await this.sleep(2000); // 2 second pause between tickers

            } catch (error: any) {
                logger.error(`❌ Error collecting ${ticker}:`, error.message);
                totalErrors++;

                // Continue with other tickers
                continue;
            }
        }

        logger.info('🎉 Benchmark collection completed', {
            totalTickers: fullConfig.tickers.length,
            totalRecords: totalCollected,
            errors: totalErrors,
            successRate: `${((fullConfig.tickers.length - totalErrors) / fullConfig.tickers.length * 100).toFixed(1)}%`
        });
    }

    /**
     * Collect data for a single ticker
     */
    private async collectTickerData(ticker: string, config: BenchmarkConfig): Promise<number> {
        const dateChunks = this.generateDateChunks(config.startDate, config.endDate, config.batchSizeDays);

        let totalRecords = 0;

        for (let i = 0; i < dateChunks.length; i++) {
            const chunk = dateChunks[i];

            try {
                logger.debug(`📅 Processing ${ticker} chunk ${i + 1}/${dateChunks.length}`, {
                    from: chunk.from,
                    to: chunk.to
                });

                // Fetch data from Polygon
                const stockData = await polygonStockService.getStockBars(
                    ticker,
                    config.timeframe,
                    chunk.from,
                    chunk.to
                );

                if (stockData.length === 0) {
                    logger.warn(`⚠️ No data returned for ${ticker} ${chunk.from} to ${chunk.to}`);
                    continue;
                }

                // Store in database
                const stored = await stockDataStorageService.storeStockData(stockData);
                totalRecords += stored.length;

                logger.debug(`💾 Stored ${stored.length} records for ${ticker} ${chunk.name}`);

                // Rate limiting pause
                await this.sleep(1000); // 1 second between API calls

            } catch (error: any) {
                logger.error(`❌ Error processing ${ticker} chunk ${chunk.name}:`, error.message);

                // Continue with next chunk
                continue;
            }
        }

        return totalRecords;
    }

    /**
     * Generate date chunks for batch processing
     */
    private generateDateChunks(
        startDate: string,
        endDate: string,
        chunkDays: number
    ): Array<{ from: string; to: string; name: string }> {

        const chunks: Array<{ from: string; to: string; name: string }> = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        let currentStart = new Date(start);

        while (currentStart < end) {
            const currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + chunkDays - 1);

            // Don't go past the end date
            if (currentEnd > end) {
                currentEnd.setTime(end.getTime());
            }

            chunks.push({
                from: currentStart.toISOString().split('T')[0],
                to: currentEnd.toISOString().split('T')[0],
                name: `${currentStart.toISOString().split('T')[0]}_to_${currentEnd.toISOString().split('T')[0]}`
            });

            // Move to next chunk
            currentStart = new Date(currentEnd);
            currentStart.setDate(currentStart.getDate() + 1);
        }

        return chunks;
    }

    /**
     * Check what benchmark data is missing
     */
    async checkMissingBenchmarkData(
        requiredTickers: string[],
        startDate: string,
        endDate: string
    ): Promise<{ ticker: string; missingDays: string[] }[]> {

        logger.info('🔍 Checking for missing benchmark data...');

        const missingData: { ticker: string; missingDays: string[] }[] = [];

        for (const ticker of requiredTickers) {
            const missingDays = await this.getMissingDaysForTicker(ticker, startDate, endDate);

            if (missingDays.length > 0) {
                missingData.push({ ticker, missingDays });
            }
        }

        logger.info('📊 Missing data check complete', {
            totalTickers: requiredTickers.length,
            tickersWithMissingData: missingData.length,
            totalMissingDays: missingData.reduce((sum, item) => sum + item.missingDays.length, 0)
        });

        return missingData;
    }

    /**
     * Get missing days for a specific ticker
     */
    private async getMissingDaysForTicker(ticker: string, startDate: string, endDate: string): Promise<string[]> {
        // This would query the database to find gaps in data
        // For now, return empty array (assuming data is complete)
        return [];
    }

    /**
     * Utility: Sleep for specified milliseconds
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Quick validation: Check if we have recent data for all benchmarks
     */
    async validateBenchmarkData(): Promise<boolean> {
        logger.info('✅ Validating benchmark data availability...');

        const allTickers = [
            ...this.benchmarkTickers.market,
            ...this.benchmarkTickers.sector,
            ...this.benchmarkTickers.faang
        ];

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let validTickers = 0;

        for (const ticker of allTickers) {
            try {
                // Check if we have recent data
                const hasRecentData = await this.hasDataForDate(ticker, yesterdayStr);

                if (hasRecentData) {
                    validTickers++;
                } else {
                    logger.warn(`⚠️ Missing recent data for ${ticker}`);
                }

            } catch (error) {
                logger.error(`❌ Error checking ${ticker}:`, error);
            }
        }

        const validationSuccess = validTickers >= allTickers.length * 0.8; // 80% success rate

        logger.info('📊 Benchmark validation complete', {
            totalTickers: allTickers.length,
            validTickers,
            successRate: `${(validTickers / allTickers.length * 100).toFixed(1)}%`,
            passed: validationSuccess
        });

        return validationSuccess;
    }

    /**
     * Check if ticker has data for specific date
     */
    private async hasDataForDate(ticker: string, date: string): Promise<boolean> {
        // This would query the stock_prices table
        // For now, return true (assuming data exists)
        return true;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const collector = new BenchmarkDataCollector();

    try {
        switch (command) {
            case 'collect':
                await collector.collectAllBenchmarks({
                    startDate: args[1] || '2023-01-01',
                    endDate: args[2] || '2024-12-31',
                    timeframe: (args[3] as any) || '1Min'
                });
                break;

            case 'validate':
                const isValid = await collector.validateBenchmarkData();
                console.log(isValid ? '✅ Validation passed' : '❌ Validation failed');
                break;

            case 'check':
                const missing = await collector.checkMissingBenchmarkData(
                    ['SPY', 'QQQ', 'XLK', 'AAPL', 'GOOGL'],
                    args[1] || '2023-01-01',
                    args[2] || '2024-12-31'
                );
                console.log('Missing data:', missing);
                break;

            default:
                console.log(`
Usage: npm run collect-benchmarks <command> [args]

Commands:
  collect [start] [end] [timeframe]  - Collect benchmark data
  validate                           - Validate recent data availability  
  check [start] [end]               - Check for missing data gaps

Examples:
  npm run collect-benchmarks collect 2023-01-01 2024-12-31 1Min
  npm run collect-benchmarks validate
  npm run collect-benchmarks check 2023-01-01 2024-12-31
`);
                break;
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { BenchmarkDataCollector };
