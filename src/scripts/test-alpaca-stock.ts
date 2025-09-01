#!/usr/bin/env npx tsx

/**
 * Comprehensive test script for Alpaca Stock API integration
 * Tests connection, data quality, multi-time-horizon functionality, and rate limiting
 */

import { alpacaStockService } from '../services/alpacaStockService.js';
import { logger } from '../utils/logger.js';

interface TestResult {
    testName: string;
    success: boolean;
    message: string;
    data?: any;
    duration?: number;
}

class AlpacaStockTester {
    private results: TestResult[] = [];
    private readonly testSymbol = 'AAPL';

    async runAllTests(): Promise<void> {
        logger.info('🧪 Starting comprehensive Alpaca Stock API tests');
        
        await this.testConnection();
        await this.testBasicDataRetrieval();
        await this.testIntradayData();
        await this.testClosestDataPoint();
        await this.testMultiTimeHorizon();
        await this.testRateLimiting();
        
        this.printResults();
    }

    private async testConnection(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('🔍 Testing Alpaca connection...');
            
            const result = await alpacaStockService.testConnection();
            
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

    private async testBasicDataRetrieval(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('📊 Testing basic stock data retrieval...');
            
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
            
            const dailyData = await alpacaStockService.getBars(
                this.testSymbol,
                '1Day',
                startDate.toISOString(),
                endDate.toISOString()
            );

            const hasValidData = dailyData.length > 0;
            const hasRequiredFields = dailyData.every(bar => 
                bar.open && bar.high && bar.low && bar.close && bar.volume && bar.timestamp
            );

            this.results.push({
                testName: 'Basic Data Retrieval',
                success: hasValidData && hasRequiredFields,
                message: `Retrieved ${dailyData.length} daily bars for ${this.testSymbol}`,
                data: {
                    barsCount: dailyData.length,
                    dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
                    sampleBar: dailyData[0] || null,
                    allFieldsPresent: hasRequiredFields
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Basic Data Retrieval',
                success: false,
                message: `Data retrieval test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testIntradayData(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('⏰ Testing intraday data retrieval...');
            
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
            
            const intradayData = await alpacaStockService.getBars(
                this.testSymbol,
                '5Min',
                startDate.toISOString(),
                endDate.toISOString()
            );

            const hasIntradayData = intradayData.length > 0;
            const hasHighFrequency = intradayData.length > 10; // Should have many 5-min bars in 24h

            this.results.push({
                testName: 'Intraday Data',
                success: hasIntradayData,
                message: `Retrieved ${intradayData.length} 5-minute bars for ${this.testSymbol} (last 24h)`,
                data: {
                    barsCount: intradayData.length,
                    timeframe: '5Min',
                    hasHighFrequency,
                    sampleBar: intradayData[0] || null,
                    timeSpread: intradayData.length > 1 ? {
                        first: intradayData[0]?.timestamp,
                        last: intradayData[intradayData.length - 1]?.timestamp
                    } : null
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

    private async testClosestDataPoint(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('🎯 Testing closest data point functionality...');
            
            // Use a specific timestamp from a few days ago
            const targetTime = new Date();
            targetTime.setDate(targetTime.getDate() - 3);
            targetTime.setHours(14, 30, 0, 0); // 2:30 PM ET
            
            const closestPoint = await alpacaStockService.getClosestDataPoint(
                this.testSymbol,
                targetTime.toISOString()
            );

            const hasClosestPoint = closestPoint !== null;
            let timeDifference = 0;
            
            if (closestPoint) {
                const pointTime = new Date(closestPoint.timestamp);
                timeDifference = Math.abs(pointTime.getTime() - targetTime.getTime()) / (1000 * 60); // minutes
            }

            this.results.push({
                testName: 'Closest Data Point',
                success: hasClosestPoint && timeDifference < 60, // Within 1 hour
                message: hasClosestPoint ? 
                    `Found data point ${Math.round(timeDifference)} minutes from target time` :
                    'No closest data point found',
                data: {
                    targetTime: targetTime.toISOString(),
                    foundPoint: closestPoint,
                    timeDifferenceMinutes: Math.round(timeDifference)
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
            
            // Use a timestamp from a few days ago for testing
            const articleTime = new Date();
            articleTime.setDate(articleTime.getDate() - 5);
            articleTime.setHours(11, 0, 0, 0); // 11:00 AM ET
            
            const horizonData = await alpacaStockService.getMultiTimeHorizonData(
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
                success: totalPoints >= totalPossible * 0.5, // At least 50% success rate
                message: `Retrieved ${totalPoints}/${totalPossible} time horizon data points (${beforePoints} before, ${afterPoints} after)`,
                data: {
                    articleTime: articleTime.toISOString(),
                    beforePoints,
                    afterPoints,
                    totalPoints,
                    totalPossible,
                    successRate: Math.round((totalPoints / totalPossible) * 100),
                    sampleBefore: horizonData.before['5min'],
                    sampleAfter: horizonData.after['5min']
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

    private async testRateLimiting(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('⏱️ Testing rate limiting behavior...');
            
            // Make multiple rapid requests to test rate limiting
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            
            const requests = [];
            for (let i = 0; i < 5; i++) {
                requests.push(alpacaStockService.getBars(
                    this.testSymbol,
                    '1Hour',
                    startDate.toISOString(),
                    endDate.toISOString()
                ));
            }

            const results = await Promise.allSettled(requests);
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failCount = results.filter(r => r.status === 'rejected').length;

            this.results.push({
                testName: 'Rate Limiting',
                success: successCount >= 3, // At least 3 out of 5 should succeed
                message: `${successCount} successful requests, ${failCount} failed requests in rapid succession`,
                data: {
                    successCount,
                    failCount,
                    totalRequests: requests.length,
                    errors: results
                        .filter(r => r.status === 'rejected')
                        .map(r => (r as PromiseRejectedResult).reason.message)
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Rate Limiting',
                success: false,
                message: `Rate limiting test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private printResults(): void {
        logger.info('\n🎯 Alpaca Stock API Test Results Summary:');
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
            logger.info('🎉 All tests passed! Alpaca Stock API is ready for production use.');
        } else {
            logger.info('⚠️ Some tests failed. Review the results above before proceeding.');
        }
        
        // Provide recommendations based on test results
        this.provideRecommendations();
    }

    private provideRecommendations(): void {
        logger.info('\n💡 Recommendations:');
        
        const connectionTest = this.results.find(r => r.testName === 'API Connection');
        const intradayTest = this.results.find(r => r.testName === 'Intraday Data');
        const horizonTest = this.results.find(r => r.testName === 'Multi-Time Horizon');
        
        if (!connectionTest?.success) {
            logger.info('🔧 Fix API credentials and connection issues first');
        }
        
        if (intradayTest?.success && intradayTest.data?.barsCount > 50) {
            logger.info('✅ Alpaca provides good intraday data coverage - suitable for short-term analysis');
        }
        
        if (horizonTest?.success && horizonTest.data?.successRate > 70) {
            logger.info('✅ Multi-time-horizon data collection is working well');
        } else if (horizonTest?.data?.successRate < 50) {
            logger.info('⚠️ Consider using Tiingo as backup for missing time horizons');
        }
        
        logger.info('📈 Ready to integrate with ML pipeline for stock price predictions');
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new AlpacaStockTester();
    tester.runAllTests().catch(error => {
        logger.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}
