#!/usr/bin/env npx tsx

/**
 * Comprehensive comparison script for Alpaca vs Tiingo Stock APIs
 * Tests both APIs side-by-side and provides recommendations
 */

import { alpacaStockService } from '../services/alpacaStockService.js';
import { tiingoStockService } from '../services/tiingoStockService.js';
import { logger } from '../utils/logger.js';

interface ComparisonResult {
    metric: string;
    alpaca: {
        value: any;
        score: number; // 0-10
        notes?: string;
    };
    tiingo: {
        value: any;
        score: number; // 0-10
        notes?: string;
    };
    winner: 'alpaca' | 'tiingo' | 'tie';
    importance: 'critical' | 'high' | 'medium' | 'low';
}

class StockApiComparator {
    private results: ComparisonResult[] = [];
    private readonly testSymbol = 'AAPL';

    async runComparison(): Promise<void> {
        logger.info('🔍 Starting comprehensive Alpaca vs Tiingo comparison');
        
        await this.compareConnections();
        await this.compareDataAvailability();
        await this.compareDataQuality();
        await this.compareLatency();
        await this.compareRateLimits();
        await this.compareHistoricalDepth();
        await this.compareIntradayGranularity();
        await this.compareCostEffectiveness();
        
        this.printComparison();
        this.provideRecommendation();
    }

    private async compareConnections(): Promise<void> {
        logger.info('🔌 Comparing API connections...');
        
        const alpacaStart = Date.now();
        const alpacaConnection = await alpacaStockService.testConnection().catch(e => ({
            success: false,
            message: e.message
        }));
        const alpacaLatency = Date.now() - alpacaStart;

        const tiingoStart = Date.now();
        const tiingoConnection = await tiingoStockService.testConnection().catch(e => ({
            success: false,
            message: e.message
        }));
        const tiingoLatency = Date.now() - tiingoStart;

        this.results.push({
            metric: 'API Connection',
            alpaca: {
                value: `${alpacaConnection.success ? 'Success' : 'Failed'} (${alpacaLatency}ms)`,
                score: alpacaConnection.success ? 10 : 0,
                notes: alpacaConnection.message
            },
            tiingo: {
                value: `${tiingoConnection.success ? 'Success' : 'Failed'} (${tiingoLatency}ms)`,
                score: tiingoConnection.success ? 10 : 0,
                notes: tiingoConnection.message
            },
            winner: alpacaConnection.success && tiingoConnection.success ? 
                (alpacaLatency < tiingoLatency ? 'alpaca' : 'tiingo') :
                alpacaConnection.success ? 'alpaca' : 'tiingo',
            importance: 'critical'
        });
    }

    private async compareDataAvailability(): Promise<void> {
        logger.info('📊 Comparing data availability...');
        
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Test Alpaca daily data
        let alpacaDailyCount = 0;
        try {
            const alpacaDaily = await alpacaStockService.getBars(
                this.testSymbol,
                '1Day',
                startDate.toISOString(),
                endDate.toISOString()
            );
            alpacaDailyCount = alpacaDaily.length;
        } catch (error) {
            logger.warn('Alpaca daily data failed:', error);
        }

        // Test Tiingo daily data
        let tiingoDailyCount = 0;
        try {
            const tiingoDaily = await tiingoStockService.getDailyPrices(
                this.testSymbol,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );
            tiingoDailyCount = tiingoDaily.length;
        } catch (error) {
            logger.warn('Tiingo daily data failed:', error);
        }

        this.results.push({
            metric: 'Daily Data Availability',
            alpaca: {
                value: `${alpacaDailyCount} days`,
                score: Math.min(10, alpacaDailyCount * 2), // Max 10 for 5+ days
                notes: alpacaDailyCount > 0 ? 'Good coverage' : 'No data available'
            },
            tiingo: {
                value: `${tiingoDailyCount} days`,
                score: Math.min(10, tiingoDailyCount * 2),
                notes: tiingoDailyCount > 0 ? 'Good coverage' : 'No data available'
            },
            winner: alpacaDailyCount === tiingoDailyCount ? 'tie' : 
                alpacaDailyCount > tiingoDailyCount ? 'alpaca' : 'tiingo',
            importance: 'high'
        });
    }

    private async compareDataQuality(): Promise<void> {
        logger.info('🎯 Comparing data quality...');
        
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

        // Test Alpaca intraday data quality
        let alpacaQuality = { bars: 0, completeness: 0, accuracy: 0 };
        try {
            const alpacaBars = await alpacaStockService.getBars(
                this.testSymbol,
                '1Hour',
                startDate.toISOString(),
                endDate.toISOString()
            );
            
            alpacaQuality.bars = alpacaBars.length;
            alpacaQuality.completeness = alpacaBars.filter(b => 
                b.open && b.high && b.low && b.close && b.volume
            ).length / Math.max(alpacaBars.length, 1);
            
            // Check for realistic price ranges
            alpacaQuality.accuracy = alpacaBars.filter(b => 
                b.high >= b.low && b.high >= b.open && b.high >= b.close &&
                b.low <= b.open && b.low <= b.close
            ).length / Math.max(alpacaBars.length, 1);
            
        } catch (error) {
            logger.warn('Alpaca quality test failed:', error);
        }

        // Test Tiingo intraday data quality
        let tiingoQuality = { bars: 0, completeness: 0, accuracy: 0 };
        try {
            const tiingoBars = await tiingoStockService.getIntradayPrices(
                this.testSymbol,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0],
                '1hour'
            );
            
            tiingoQuality.bars = tiingoBars.length;
            tiingoQuality.completeness = tiingoBars.filter(b => 
                b.open && b.high && b.low && b.close && b.volume
            ).length / Math.max(tiingoBars.length, 1);
            
            tiingoQuality.accuracy = tiingoBars.filter(b => 
                b.high >= b.low && b.high >= b.open && b.high >= b.close &&
                b.low <= b.open && b.low <= b.close
            ).length / Math.max(tiingoBars.length, 1);
            
        } catch (error) {
            logger.warn('Tiingo quality test failed:', error);
        }

        const alpacaScore = Math.round((alpacaQuality.completeness + alpacaQuality.accuracy) * 5);
        const tiingoScore = Math.round((tiingoQuality.completeness + tiingoQuality.accuracy) * 5);

        this.results.push({
            metric: 'Data Quality',
            alpaca: {
                value: `${alpacaQuality.bars} bars, ${Math.round(alpacaQuality.completeness * 100)}% complete, ${Math.round(alpacaQuality.accuracy * 100)}% accurate`,
                score: alpacaScore,
                notes: `Completeness: ${Math.round(alpacaQuality.completeness * 100)}%`
            },
            tiingo: {
                value: `${tiingoQuality.bars} bars, ${Math.round(tiingoQuality.completeness * 100)}% complete, ${Math.round(tiingoQuality.accuracy * 100)}% accurate`,
                score: tiingoScore,
                notes: `Completeness: ${Math.round(tiingoQuality.completeness * 100)}%`
            },
            winner: alpacaScore === tiingoScore ? 'tie' : alpacaScore > tiingoScore ? 'alpaca' : 'tiingo',
            importance: 'critical'
        });
    }

    private async compareLatency(): Promise<void> {
        logger.info('⚡ Comparing API latency...');
        
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

        // Test Alpaca latency
        const alpacaStart = Date.now();
        let alpacaLatency = 0;
        try {
            await alpacaStockService.getBars(
                this.testSymbol,
                '1Day',
                startDate.toISOString(),
                endDate.toISOString()
            );
            alpacaLatency = Date.now() - alpacaStart;
        } catch (error) {
            alpacaLatency = Date.now() - alpacaStart;
        }

        // Test Tiingo latency
        const tiingoStart = Date.now();
        let tiingoLatency = 0;
        try {
            await tiingoStockService.getDailyPrices(
                this.testSymbol,
                startDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );
            tiingoLatency = Date.now() - tiingoStart;
        } catch (error) {
            tiingoLatency = Date.now() - tiingoStart;
        }

        // Score based on latency (lower is better)
        const alpacaScore = Math.max(0, 10 - Math.floor(alpacaLatency / 200)); // -1 point per 200ms
        const tiingoScore = Math.max(0, 10 - Math.floor(tiingoLatency / 200));

        this.results.push({
            metric: 'API Latency',
            alpaca: {
                value: `${alpacaLatency}ms`,
                score: alpacaScore,
                notes: alpacaLatency < 1000 ? 'Fast' : 'Slow'
            },
            tiingo: {
                value: `${tiingoLatency}ms`,
                score: tiingoScore,
                notes: tiingoLatency < 1000 ? 'Fast' : 'Slow'
            },
            winner: alpacaLatency === tiingoLatency ? 'tie' : alpacaLatency < tiingoLatency ? 'alpaca' : 'tiingo',
            importance: 'medium'
        });
    }

    private async compareRateLimits(): Promise<void> {
        logger.info('🚦 Comparing rate limits...');
        
        // Based on known API limits
        this.results.push({
            metric: 'Rate Limits',
            alpaca: {
                value: '200 req/min (free)',
                score: 8,
                notes: 'Generous free tier limits'
            },
            tiingo: {
                value: '1000 req/day (free)',
                score: 6,
                notes: 'Daily limit may be restrictive for heavy use'
            },
            winner: 'alpaca',
            importance: 'high'
        });
    }

    private async compareHistoricalDepth(): Promise<void> {
        logger.info('📅 Comparing historical data depth...');
        
        // Test how far back we can get data
        const veryOldDate = new Date('2020-01-01');
        const endDate = new Date('2020-01-31');

        let alpacaHistorical = false;
        try {
            const alpacaData = await alpacaStockService.getBars(
                this.testSymbol,
                '1Day',
                veryOldDate.toISOString(),
                endDate.toISOString()
            );
            alpacaHistorical = alpacaData.length > 0;
        } catch (error) {
            logger.warn('Alpaca historical test failed:', error);
        }

        let tiingoHistorical = false;
        try {
            const tiingoData = await tiingoStockService.getDailyPrices(
                this.testSymbol,
                veryOldDate.toISOString().split('T')[0],
                endDate.toISOString().split('T')[0]
            );
            tiingoHistorical = tiingoData.length > 0;
        } catch (error) {
            logger.warn('Tiingo historical test failed:', error);
        }

        this.results.push({
            metric: 'Historical Data Depth',
            alpaca: {
                value: alpacaHistorical ? '2020+ available' : 'Limited history',
                score: alpacaHistorical ? 9 : 5,
                notes: 'Good historical coverage'
            },
            tiingo: {
                value: tiingoHistorical ? '2020+ available' : 'Limited history',
                score: tiingoHistorical ? 10 : 5,
                notes: 'Excellent historical coverage, goes back decades'
            },
            winner: tiingoHistorical && alpacaHistorical ? 'tiingo' : 
                tiingoHistorical ? 'tiingo' : alpacaHistorical ? 'alpaca' : 'tie',
            importance: 'high'
        });
    }

    private async compareIntradayGranularity(): Promise<void> {
        logger.info('🔍 Comparing intraday granularity...');
        
        this.results.push({
            metric: 'Intraday Granularity',
            alpaca: {
                value: '1min, 5min, 15min, 1hour (real-time)',
                score: 10,
                notes: 'Excellent granularity, real-time data'
            },
            tiingo: {
                value: '1min, 5min, 30min, 1hour (30min delay)',
                score: 7,
                notes: 'Good granularity but 30min delay on free tier'
            },
            winner: 'alpaca',
            importance: 'critical'
        });
    }

    private async compareCostEffectiveness(): Promise<void> {
        logger.info('💰 Comparing cost effectiveness...');
        
        this.results.push({
            metric: 'Cost Effectiveness',
            alpaca: {
                value: 'Free (with limits)',
                score: 10,
                notes: 'Completely free for reasonable usage'
            },
            tiingo: {
                value: 'Free (with limits), $10/month for real-time',
                score: 8,
                notes: 'Free tier good, affordable paid tier'
            },
            winner: 'alpaca',
            importance: 'high'
        });
    }

    private printComparison(): void {
        logger.info('\n🏆 Comprehensive API Comparison Results:');
        logger.info('=' .repeat(80));
        
        let alpacaTotalScore = 0;
        let tiingoTotalScore = 0;
        let totalWeight = 0;

        for (const result of this.results) {
            const importance = result.importance;
            const weight = importance === 'critical' ? 4 : 
                          importance === 'high' ? 3 : 
                          importance === 'medium' ? 2 : 1;
            
            alpacaTotalScore += result.alpaca.score * weight;
            tiingoTotalScore += result.tiingo.score * weight;
            totalWeight += weight;

            const winner = result.winner === 'alpaca' ? '🥇 Alpaca' : 
                          result.winner === 'tiingo' ? '🥇 Tiingo' : '🤝 Tie';
            
            logger.info(`\n📊 ${result.metric} (${importance} importance)`);
            logger.info(`   Alpaca: ${result.alpaca.value} (Score: ${result.alpaca.score}/10)`);
            if (result.alpaca.notes) logger.info(`           ${result.alpaca.notes}`);
            logger.info(`   Tiingo: ${result.tiingo.value} (Score: ${result.tiingo.score}/10)`);
            if (result.tiingo.notes) logger.info(`           ${result.tiingo.notes}`);
            logger.info(`   Winner: ${winner}`);
        }

        const alpacaAvg = Math.round((alpacaTotalScore / totalWeight) * 10) / 10;
        const tiingoAvg = Math.round((tiingoTotalScore / totalWeight) * 10) / 10;

        logger.info('\n' + '=' .repeat(80));
        logger.info(`📈 Weighted Overall Scores:`);
        logger.info(`   🔵 Alpaca: ${alpacaAvg}/10`);
        logger.info(`   🟢 Tiingo: ${tiingoAvg}/10`);
        
        const overallWinner = alpacaAvg === tiingoAvg ? 'TIE' : 
                             alpacaAvg > tiingoAvg ? 'ALPACA WINS' : 'TIINGO WINS';
        
        logger.info(`\n🏆 OVERALL WINNER: ${overallWinner}`);
    }

    private provideRecommendation(): void {
        logger.info('\n💡 Strategic Recommendations:');
        logger.info('=' .repeat(60));
        
        const criticalTests = this.results.filter(r => r.importance === 'critical');
        const alpacaCriticalWins = criticalTests.filter(r => r.winner === 'alpaca').length;
        const tiingoCriticalWins = criticalTests.filter(r => r.winner === 'tiingo').length;

        logger.info('\n🎯 Use Case Recommendations:');
        
        logger.info('\n📈 For ML Stock Prediction (Your Use Case):');
        if (alpacaCriticalWins >= tiingoCriticalWins) {
            logger.info('✅ PRIMARY: Alpaca Stock API');
            logger.info('   • Real-time intraday data for short-term predictions');
            logger.info('   • Excellent granularity (1min, 5min intervals)');
            logger.info('   • Free tier sufficient for development');
            logger.info('   • Perfect for multi-time-horizon analysis');
            
            logger.info('\n🔄 SECONDARY: Tiingo Stock API');
            logger.info('   • Use for historical backtesting');
            logger.info('   • Company metadata and fundamentals');
            logger.info('   • Backup for when Alpaca has gaps');
        } else {
            logger.info('✅ PRIMARY: Tiingo Stock API');
            logger.info('   • Excellent historical data depth');
            logger.info('   • Good for long-term analysis');
            logger.info('   • Company metadata available');
            
            logger.info('\n🔄 SECONDARY: Alpaca Stock API');
            logger.info('   • Use for real-time short-term data');
            logger.info('   • Better rate limits for development');
        }

        logger.info('\n🔧 Implementation Strategy:');
        logger.info('1. Start with Alpaca for development and testing');
        logger.info('2. Implement Tiingo as backup/complement');
        logger.info('3. Use both APIs in your multi-time-horizon data collection');
        logger.info('4. Alpaca for <1 day horizons, Tiingo for >1 week horizons');
        
        logger.info('\n💰 Cost Optimization:');
        logger.info('• Both APIs offer generous free tiers for development');
        logger.info('• Total monthly cost: $0 (free tiers) to $10-20 (paid tiers)');
        logger.info('• Well within your $100/month total budget');
        
        logger.info('\n⚡ Next Steps:');
        logger.info('1. Run individual test scripts: npm run test-alpaca, npm run test-tiingo');
        logger.info('2. Implement both in your article processing pipeline');
        logger.info('3. A/B test prediction accuracy with each API');
        logger.info('4. Scale up with the winner for production');
    }
}

// Run comparison if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const comparator = new StockApiComparator();
    comparator.runComparison().catch(error => {
        logger.error('❌ Comparison execution failed:', error);
        process.exit(1);
    });
}
