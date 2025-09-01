#!/usr/bin/env npx tsx

/**
 * Comprehensive test script for Tiingo Stock API integration
 * Tests connection, data quality, multi-time-horizon functionality, and compares with Alpaca
 */

import { tiingoStockService } from '../services/tiingoStockService.js';
import { logger } from '../utils/logger.js';

interface TestResult {
    testName: string;
    success: boolean;
    message: string;
    data?: any;
    duration?: number;
}

class TiingoStockTester {
    private results: TestResult[] = [];
    private readonly testSymbol = 'AAPL';

    async runAllTests(): Promise<void> {
        logger.info('🧪 Starting comprehensive Tiingo Stock API tests');
        
        await this.testConnection();
        await this.testDailyData();
        await this.testIntradayData();
        await this.testStockMetadata();
        await this.testClosestDataPoint();
        await this.testMultiTimeHorizon();
        await this.testUsageStats();
        
        this.printResults();
    }

    private async testConnection(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('🔍 Testing Tiingo connection...');
            
            const result = await tiingoStockService.testConnection();
            
            this.results.push({
                testName: 'API Connection',
                success: result.success,
                message: result.message,
                data: result.sampleData,
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'API Connection',
                success: false,
                message: `Connection test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testDailyData(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('📊 Testing daily stock data retrieval...');
            
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
            
            const dailyData = await tiingoStockService.getDailyPrices(
                this.testSymbol,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );

            const hasValidData = dailyData.length > 0;
            const hasRequiredFields = dailyData.every(bar => 
                bar.open && bar.high && bar.low && bar.close && bar.volume && bar.timestamp
            );

            this.results.push({
                testName: 'Daily Data Retrieval',
                success: hasValidData && hasRequiredFields,
                message: `Retrieved ${dailyData.length} daily prices for ${this.testSymbol}`,
                data: {
                    pricesCount: dailyData.length,
                    dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
                    samplePrice: dailyData[0] || null,
                    allFieldsPresent: hasRequiredFields,
                    avgVolume: dailyData.length > 0 ? 
                        Math.round(dailyData.reduce((sum, p) => sum + p.volume, 0) / dailyData.length) : 0
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Daily Data Retrieval',
                success: false,
                message: `Daily data test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testIntradayData(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('⏰ Testing intraday data retrieval...');
            
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
            
            const intradayData = await tiingoStockService.getIntradayPrices(
                this.testSymbol,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0],
                '5min'
            );

            const hasIntradayData = intradayData.length > 0;
            const hasHighFrequency = intradayData.length > 20; // Should have many 5-min bars in 2 days

            this.results.push({
                testName: 'Intraday Data',
                success: hasIntradayData,
                message: `Retrieved ${intradayData.length} 5-minute bars for ${this.testSymbol} (last 2 days)`,
                data: {
                    barsCount: intradayData.length,
                    timeframe: '5min',
                    hasHighFrequency,
                    sampleBar: intradayData[0] || null,
                    timeSpread: intradayData.length > 1 ? {
                        first: intradayData[0]?.timestamp,
                        last: intradayData[intradayData.length - 1]?.timestamp
                    } : null,
                    note: 'Free tier has 30-minute delay for intraday data'
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Intraday Data',
                success: false,
                message: `Intraday data test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testStockMetadata(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('📋 Testing stock metadata retrieval...');
            
            const metadata = await tiingoStockService.getStockMetadata(this.testSymbol);
            
            const hasMetadata = metadata && typeof metadata === 'object';
            const hasCompanyInfo = hasMetadata && (metadata.name || metadata.description);

            this.results.push({
                testName: 'Stock Metadata',
                success: hasMetadata,
                message: hasMetadata ? 
                    `Retrieved metadata for ${metadata.name || this.testSymbol}` :
                    'No metadata available',
                data: {
                    metadata: hasMetadata ? {
                        name: metadata.name,
                        ticker: metadata.ticker,
                        exchangeCode: metadata.exchangeCode,
                        startDate: metadata.startDate,
                        endDate: metadata.endDate
                    } : null,
                    hasCompanyInfo
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Stock Metadata',
                success: false,
                message: `Metadata test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testClosestDataPoint(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('🎯 Testing closest data point functionality...');
            
            // Use a specific timestamp from a few days ago
            const targetTime = new Date();
            targetTime.setDate(targetTime.getDate() - 7);
            targetTime.setHours(14, 30, 0, 0); // 2:30 PM ET
            
            const closestPoint = await tiingoStockService.getClosestDataPoint(
                this.testSymbol,
                targetTime.toISOString(),
                false // Use daily data for more reliable results
            );

            const hasClosestPoint = closestPoint !== null;
            let timeDifference = 0;
            
            if (closestPoint) {
                const pointTime = new Date(closestPoint.timestamp);
                timeDifference = Math.abs(pointTime.getTime() - targetTime.getTime()) / (1000 * 60 * 60 * 24); // days
            }

            this.results.push({
                testName: 'Closest Data Point',
                success: hasClosestPoint && timeDifference < 7, // Within 1 week for daily data
                message: hasClosestPoint ? 
                    `Found data point ${Math.round(timeDifference * 24)} hours from target time` :
                    'No closest data point found',
                data: {
                    targetTime: targetTime.toISOString(),
                    foundPoint: closestPoint,
                    timeDifferenceHours: Math.round(timeDifference * 24)
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Closest Data Point',
                success: false,
                message: `Closest data point test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testMultiTimeHorizon(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('🌅 Testing multi-time-horizon data generation...');
            
            // Use a timestamp from a few weeks ago for better data availability
            const articleTime = new Date();
            articleTime.setDate(articleTime.getDate() - 14);
            articleTime.setHours(11, 0, 0, 0); // 11:00 AM ET
            
            const horizonData = await tiingoStockService.getMultiTimeHorizonData(
                this.testSymbol,
                articleTime.toISOString()
            );

            // Count how many data points we successfully retrieved
            const beforePoints = Object.values(horizonData.before).filter(Boolean).length;
            const afterPoints = Object.values(horizonData.after).filter(Boolean).length;
            const totalPoints = beforePoints + afterPoints;
            const totalPossible = Object.keys(horizonData.before).length + Object.keys(horizonData.after).length;

            this.results.push({
                testName: 'Multi-Time Horizon',
                success: totalPoints >= totalPossible * 0.4, // At least 40% success rate (lower than Alpaca due to free tier limitations)
                message: `Retrieved ${totalPoints}/${totalPossible} time horizon data points (${beforePoints} before, ${afterPoints} after)`,
                data: {
                    articleTime: articleTime.toISOString(),
                    beforePoints,
                    afterPoints,
                    totalPoints,
                    totalPossible,
                    successRate: Math.round((totalPoints / totalPossible) * 100),
                    sampleBefore: horizonData.before['1hour'],
                    sampleAfter: horizonData.after['1hour'],
                    note: 'Free tier limitations may affect intraday data availability'
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Multi-Time Horizon',
                success: false,
                message: `Multi-time horizon test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testUsageStats(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('📊 Testing usage statistics...');
            
            const stats = await tiingoStockService.getUsageStats();
            
            this.results.push({
                testName: 'Usage Statistics',
                success: stats.success,
                message: stats.message,
                data: stats.stats,
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Usage Statistics',
                success: false,
                message: `Usage stats test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private printResults(): void {
        logger.info('\n🎯 Tiingo Stock API Test Results Summary:');
        logger.info('=' .repeat(60));
        
        let totalTests = this.results.length;
        let passedTests = this.results.filter(r => r.success).length;
        let totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);

        for (const result of this.results) {
            const status = result.success ? '✅ PASS' : '❌ FAIL';
            const duration = result.duration ? `(${result.duration}ms)` : '';
            
            logger.info(`${status} ${result.testName} ${duration}`);
            logger.info(`    ${result.message}`);
            
            if (result.data && Object.keys(result.data).length > 0) {
                logger.info(`    Data: ${JSON.stringify(result.data, null, 2)}`);
            }
            logger.info('');
        }

        logger.info('=' .repeat(60));
        logger.info(`📊 Overall Results: ${passedTests}/${totalTests} tests passed`);
        logger.info(`⏱️ Total Duration: ${totalDuration}ms`);
        
        if (passedTests === totalTests) {
            logger.info('🎉 All tests passed! Tiingo Stock API is ready for production use.');
        } else {
            logger.info('⚠️ Some tests failed. Review the results above before proceeding.');
        }
        
        // Provide recommendations based on test results
        this.provideRecommendations();
    }

    private provideRecommendations(): void {
        logger.info('\n💡 Tiingo API Recommendations:');
        
        const connectionTest = this.results.find(r => r.testName === 'API Connection');
        const dailyTest = this.results.find(r => r.testName === 'Daily Data Retrieval');
        const intradayTest = this.results.find(r => r.testName === 'Intraday Data');
        const horizonTest = this.results.find(r => r.testName === 'Multi-Time Horizon');
        
        if (!connectionTest?.success) {
            logger.info('🔧 Fix API credentials and connection issues first');
        }
        
        if (dailyTest?.success && dailyTest.data?.pricesCount > 20) {
            logger.info('✅ Tiingo provides excellent daily data coverage - great for long-term analysis');
        }
        
        if (intradayTest?.success) {
            logger.info('✅ Intraday data available (with 30min delay on free tier)');
            logger.info('💰 Consider paid plan for real-time intraday data if needed');
        } else {
            logger.info('⚠️ Intraday data limited - use Alpaca for real-time short-term analysis');
        }
        
        if (horizonTest?.success && horizonTest.data?.successRate > 50) {
            logger.info('✅ Multi-time-horizon data collection working well');
        }
        
        logger.info('\n🔄 Alpaca vs Tiingo Comparison:');
        logger.info('• Alpaca: Better for real-time intraday data, free tier');
        logger.info('• Tiingo: Better for historical data, company metadata, longer history');
        logger.info('• Recommendation: Use both APIs for comprehensive coverage');
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new TiingoStockTester();
    tester.runAllTests().catch(error => {
        logger.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}
