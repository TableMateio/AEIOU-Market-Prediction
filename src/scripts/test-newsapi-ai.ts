#!/usr/bin/env npx tsx

/**
 * Comprehensive test script for NewsAPI.ai integration
 * Tests connection, Apple filtering, content quality, and historical access
 */

import { newsApiAiService } from '../services/newsApiAiService.js';
import { logger } from '../utils/logger.js';

interface TestResult {
    testName: string;
    success: boolean;
    message: string;
    data?: any;
    duration?: number;
}

class NewsApiAiTester {
    private results: TestResult[] = [];

    async runAllTests(): Promise<void> {
        logger.info('🧪 Starting comprehensive NewsAPI.ai tests');
        
        await this.testConnection();
        await this.testAppleFiltering();
        await this.testContentQuality();
        await this.testHistoricalAccess();
        await this.testRateLimiting();
        await this.testUsageStats();
        
        this.printResults();
    }

    private async testConnection(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('🔍 Testing NewsAPI.ai connection...');
            
            const result = await newsApiAiService.testConnection();
            
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

    private async testAppleFiltering(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('🍎 Testing Apple-specific filtering...');
            
            const articles = await newsApiAiService.searchAppleArticles({
                query: 'Apple OR AAPL OR "Apple Inc"',
                pageSize: 10,
                sortBy: 'publishedAt'
            });

            const appleRelevant = articles.filter(article => 
                article.title.toLowerCase().includes('apple') ||
                article.body?.toLowerCase().includes('apple') ||
                article.title.toLowerCase().includes('aapl')
            );

            const relevanceRate = appleRelevant.length / articles.length;
            
            this.results.push({
                testName: 'Apple Filtering',
                success: relevanceRate >= 0.8, // 80% relevance threshold
                message: `Found ${articles.length} articles, ${appleRelevant.length} Apple-relevant (${Math.round(relevanceRate * 100)}% relevance)`,
                data: {
                    totalArticles: articles.length,
                    appleRelevant: appleRelevant.length,
                    relevanceRate: Math.round(relevanceRate * 100),
                    sampleTitles: articles.slice(0, 3).map(a => a.title)
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Apple Filtering',
                success: false,
                message: `Apple filtering test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testContentQuality(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('📄 Testing content quality and completeness...');
            
            const articles = await newsApiAiService.searchAppleArticles({
                pageSize: 5,
                sortBy: 'publishedAt'
            });

            let fullContentCount = 0;
            let avgContentLength = 0;
            let hasMetadataCount = 0;

            for (const article of articles) {
                if (article.body && article.body.length > 200) {
                    fullContentCount++;
                    avgContentLength += article.body.length;
                }
                
                if (article.source && article.published_at && article.url) {
                    hasMetadataCount++;
                }
            }

            avgContentLength = avgContentLength / Math.max(fullContentCount, 1);
            const fullContentRate = fullContentCount / articles.length;
            const metadataRate = hasMetadataCount / articles.length;

            this.results.push({
                testName: 'Content Quality',
                success: fullContentRate >= 0.8 && metadataRate >= 0.9,
                message: `${fullContentCount}/${articles.length} articles have full content (avg ${avgContentLength} chars), ${hasMetadataCount}/${articles.length} have complete metadata`,
                data: {
                    fullContentRate: Math.round(fullContentRate * 100),
                    metadataRate: Math.round(metadataRate * 100),
                    avgContentLength: Math.round(avgContentLength),
                    sampleContent: articles[0]?.body?.substring(0, 200) + '...'
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Content Quality',
                success: false,
                message: `Content quality test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testHistoricalAccess(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('📅 Testing historical data access...');
            
            // Test 30 days ago
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            
            const articles = await newsApiAiService.searchAppleArticles({
                dateFrom: startDate.toISOString().split('T')[0],
                dateTo: endDate.toISOString().split('T')[0],
                pageSize: 10
            });

            const historicalArticles = articles.filter(article => {
                const publishedDate = new Date(article.published_at);
                return publishedDate >= startDate && publishedDate <= endDate;
            });

            this.results.push({
                testName: 'Historical Access',
                success: historicalArticles.length > 0,
                message: `Found ${historicalArticles.length} historical articles from last 30 days`,
                data: {
                    totalFound: articles.length,
                    historicalCount: historicalArticles.length,
                    dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
                    oldestArticle: historicalArticles.length > 0 ? 
                        historicalArticles.reduce((oldest, current) => 
                            new Date(current.published_at) < new Date(oldest.published_at) ? current : oldest
                        ).published_at : null
                },
                duration: Date.now() - startTime
            });
            
        } catch (error: any) {
            this.results.push({
                testName: 'Historical Access',
                success: false,
                message: `Historical access test failed: ${error.message}`,
                duration: Date.now() - startTime
            });
        }
    }

    private async testRateLimiting(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('⏱️ Testing rate limiting behavior...');
            
            // Make 3 rapid requests to test rate limiting
            const requests = [];
            for (let i = 0; i < 3; i++) {
                requests.push(newsApiAiService.searchAppleArticles({
                    pageSize: 1,
                    page: i + 1
                }));
            }

            const results = await Promise.allSettled(requests);
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failCount = results.filter(r => r.status === 'rejected').length;

            this.results.push({
                testName: 'Rate Limiting',
                success: successCount >= 2, // At least 2 out of 3 should succeed
                message: `${successCount} successful requests, ${failCount} failed requests in rapid succession`,
                data: {
                    successCount,
                    failCount,
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

    private async testUsageStats(): Promise<void> {
        const startTime = Date.now();
        try {
            logger.info('📊 Testing usage statistics...');
            
            const stats = await newsApiAiService.getUsageStats();
            
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
        logger.info('\n🎯 NewsAPI.ai Test Results Summary:');
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
            logger.info('🎉 All tests passed! NewsAPI.ai is ready for production use.');
        } else {
            logger.info('⚠️ Some tests failed. Review the results above before proceeding.');
        }
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new NewsApiAiTester();
    tester.runAllTests().catch(error => {
        logger.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}
