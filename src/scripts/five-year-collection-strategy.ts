#!/usr/bin/env npx tsx

/**
 * Comprehensive 5-Year Historical Apple Article Collection Strategy
 * Using NewsAPI.ai 5K Plan ($90/month) + GNews supplementation
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

interface CollectionPlan {
    phase: string;
    year: number;
    tokensPerYear: number;
    expectedArticles: number;
    searchStrategy: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
}

interface SmartSearchQuery {
    keyword: string;
    sourceCategory?: string;
    conceptUri?: string;
    categoryUri?: string;
    description: string;
}

class FiveYearCollectionStrategy {
    private newsApiKey: string;
    private gnewsKey: string;
    private monthlyTokens = 5000;
    private yearlyTokenCost = 5; // 5 tokens per year for historical searches

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
        this.gnewsKey = process.env.GNEWS_API_KEY || '';
    }

    /**
     * Create comprehensive 5-year collection plan
     */
    createFiveYearPlan(): CollectionPlan[] {
        const currentYear = new Date().getFullYear();
        const plan: CollectionPlan[] = [];

        // Distribute tokens across 5 years with strategic weighting
        const yearlyDistribution = [
            { year: currentYear - 1, tokens: 1200, priority: 'high', description: 'Most recent complete year - highest relevance' },
            { year: currentYear - 2, tokens: 1000, priority: 'high', description: 'Recent market conditions and trends' },
            { year: currentYear - 3, tokens: 800, priority: 'medium', description: 'Pre-pandemic baseline data' },
            { year: currentYear - 4, tokens: 600, priority: 'medium', description: 'Historical context and patterns' },
            { year: currentYear - 5, tokens: 400, priority: 'low', description: 'Long-term historical baseline' }
        ];

        for (const yearPlan of yearlyDistribution) {
            const searchesPerYear = Math.floor(yearPlan.tokens / this.yearlyTokenCost);
            const expectedArticles = searchesPerYear * 75; // Conservative 75 articles per search

            plan.push({
                phase: `Year ${yearPlan.year}`,
                year: yearPlan.year,
                tokensPerYear: yearPlan.tokens,
                expectedArticles,
                searchStrategy: this.getSearchStrategy(yearPlan.year),
                priority: yearPlan.priority as 'high' | 'medium' | 'low',
                description: yearPlan.description
            });
        }

        return plan;
    }

    /**
     * Generate smart search queries for diversity and quality
     */
    getSmartSearchQueries(): SmartSearchQuery[] {
        return [
            // Core Apple business queries
            {
                keyword: 'Apple earnings',
                sourceCategory: 'business',
                description: 'Financial performance and earnings reports'
            },
            {
                keyword: 'Apple iPhone',
                conceptUri: 'http://en.wikipedia.org/wiki/IPhone',
                description: 'iPhone product news and launches'
            },
            {
                keyword: 'Apple services revenue',
                sourceCategory: 'business',
                description: 'Services business and recurring revenue'
            },
            {
                keyword: 'Apple China market',
                categoryUri: 'business/markets',
                description: 'China market performance and geopolitical impact'
            },
            
            // Strategic business areas
            {
                keyword: 'Apple supply chain',
                sourceCategory: 'business',
                description: 'Manufacturing and supply chain developments'
            },
            {
                keyword: 'Apple AI artificial intelligence',
                conceptUri: 'http://en.wikipedia.org/wiki/Artificial_intelligence',
                description: 'AI strategy and product integration'
            },
            {
                keyword: 'Apple privacy antitrust',
                categoryUri: 'business/regulation',
                description: 'Regulatory and legal developments'
            },
            {
                keyword: 'Apple stock AAPL analyst',
                sourceCategory: 'financial',
                description: 'Analyst coverage and stock recommendations'
            },
            
            // Product categories
            {
                keyword: 'Apple Mac MacBook',
                conceptUri: 'http://en.wikipedia.org/wiki/Mac_(computer)',
                description: 'Mac product line and computing strategy'
            },
            {
                keyword: 'Apple Watch health',
                conceptUri: 'http://en.wikipedia.org/wiki/Apple_Watch',
                description: 'Wearables and health technology'
            },
            {
                keyword: 'Apple iPad tablet',
                conceptUri: 'http://en.wikipedia.org/wiki/IPad',
                description: 'Tablet market and productivity focus'
            },
            {
                keyword: 'Apple Vision Pro VR',
                description: 'Spatial computing and VR/AR developments'
            },
            
            // Market and competitive
            {
                keyword: 'Apple vs Samsung competition',
                categoryUri: 'business/competition',
                description: 'Competitive dynamics and market share'
            },
            {
                keyword: 'Apple market cap valuation',
                sourceCategory: 'financial',
                description: 'Valuation milestones and market performance'
            },
            {
                keyword: 'Apple Tim Cook CEO',
                conceptUri: 'http://en.wikipedia.org/wiki/Tim_Cook',
                description: 'Leadership and strategic direction'
            }
        ];
    }

    /**
     * Get search strategy for specific year
     */
    private getSearchStrategy(year: number): string {
        const strategies = {
            [new Date().getFullYear() - 1]: 'Focus on earnings, product launches, and market performance',
            [new Date().getFullYear() - 2]: 'Emphasize strategic initiatives and competitive positioning',
            [new Date().getFullYear() - 3]: 'Capture baseline market conditions and major events',
            [new Date().getFullYear() - 4]: 'Historical context and long-term trend establishment',
            [new Date().getFullYear() - 5]: 'Foundational data for pattern recognition'
        };
        
        return strategies[year] || 'General historical data collection';
    }

    /**
     * Generate business-day focused date ranges for a year
     */
    generateBusinessDayRanges(year: number, totalSearches: number): { start: string; end: string }[] {
        const ranges: { start: string; end: string }[] = [];
        
        // Create strategic date ranges throughout the year
        // Focus on earnings seasons, product launch periods, and key business periods
        const keyPeriods = [
            { month: 1, days: [15, 31], description: 'Q1 earnings season' },
            { month: 4, days: [15, 30], description: 'Q2 earnings season' }, 
            { month: 7, days: [15, 31], description: 'Q3 earnings season' },
            { month: 9, days: [1, 15], description: 'September event season' },
            { month: 10, days: [15, 31], description: 'Q4 earnings season' },
            { month: 11, days: [1, 30], description: 'Holiday season prep' }
        ];

        // Distribute searches across key periods
        const searchesPerPeriod = Math.ceil(totalSearches / keyPeriods.length);
        
        for (const period of keyPeriods) {
            for (let i = 0; i < searchesPerPeriod && ranges.length < totalSearches; i++) {
                const startDay = period.days[0] + (i * 3); // Spread within period
                const endDay = Math.min(startDay + 2, period.days[1]); // 3-day ranges
                
                const startDate = new Date(year, period.month - 1, startDay);
                const endDate = new Date(year, period.month - 1, endDay);
                
                // Only include if it's a valid business period
                if (this.isBusinessPeriod(startDate)) {
                    ranges.push({
                        start: startDate.toISOString().split('T')[0],
                        end: endDate.toISOString().split('T')[0]
                    });
                }
            }
        }
        
        return ranges;
    }

    /**
     * Check if date period includes business days
     */
    private isBusinessPeriod(date: Date): boolean {
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday-Friday
    }

    /**
     * Execute test search with smart parameters
     */
    async testSmartSearch(): Promise<void> {
        console.log('🧪 Testing Smart Search Parameters\n');
        
        if (!this.newsApiKey) {
            console.log('❌ NewsAPI.ai key not found');
            return;
        }

        const testQueries = this.getSmartSearchQueries().slice(0, 3); // Test first 3 queries
        const testYear = new Date().getFullYear() - 1; // Last year
        
        for (const [index, query] of testQueries.entries()) {
            try {
                console.log(`🔍 Test ${index + 1}: ${query.description}`);
                console.log(`   Query: "${query.keyword}"`);
                
                const params: any = {
                    resultType: 'articles',
                    keyword: query.keyword,
                    lang: 'eng',
                    dateStart: `${testYear}-01-01`,
                    dateEnd: `${testYear}-12-31`,
                    articlesSortBy: 'relevance',
                    includeArticleBody: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    articlesCount: 5, // Small test batch
                    apiKey: this.newsApiKey
                };

                // Add smart filtering parameters
                if (query.sourceCategory) {
                    params.sourceCategory = query.sourceCategory;
                }
                if (query.conceptUri) {
                    params.conceptUri = query.conceptUri;
                }
                if (query.categoryUri) {
                    params.categoryUri = query.categoryUri;
                }

                const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                    params,
                    timeout: 15000
                });

                const articles = response.data?.articles?.results || [];
                const totalResults = response.data?.articles?.totalResults || 0;

                console.log(`   📊 Results: ${articles.length} articles (${totalResults} total available)`);
                
                if (articles.length > 0) {
                    const sample = articles[0];
                    console.log(`   📰 Sample: "${sample.title}"`);
                    console.log(`   🌐 Source: ${sample.source?.title || 'Unknown'}`);
                    console.log(`   📄 Content: ${sample.body ? `${sample.body.length} chars` : 'No content'}`);
                    
                    // Analyze source diversity
                    const sources = [...new Set(articles.map(a => a.source?.title).filter(Boolean))];
                    console.log(`   🏢 Sources: ${sources.length} unique (${sources.slice(0, 3).join(', ')}...)`);
                }
                
                console.log('');
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error: any) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
    }

    /**
     * Display comprehensive collection plan
     */
    displayCollectionPlan(): void {
        console.log('📋 5-Year Historical Collection Plan ($90/month)');
        console.log('='.repeat(70));
        
        const plan = this.createFiveYearPlan();
        const totalTokens = plan.reduce((sum, p) => sum + p.tokensPerYear, 0);
        const totalArticles = plan.reduce((sum, p) => sum + p.expectedArticles, 0);
        
        for (const phase of plan) {
            console.log(`\n${phase.phase} (${phase.priority.toUpperCase()} PRIORITY):`);
            console.log(`   Tokens Allocated: ${phase.tokensPerYear}`);
            console.log(`   Searches Available: ${Math.floor(phase.tokensPerYear / 5)}`);
            console.log(`   Expected Articles: ${phase.expectedArticles.toLocaleString()}`);
            console.log(`   Strategy: ${phase.searchStrategy}`);
            console.log(`   Description: ${phase.description}`);
        }
        
        console.log(`\n💡 Plan Summary:`);
        console.log(`   Total Tokens Used: ${totalTokens}/5000 per month`);
        console.log(`   Total Expected Articles: ${totalArticles.toLocaleString()}`);
        console.log(`   Time Period: 5 years of comprehensive data`);
        console.log(`   Monthly Cost: $90 (NewsAPI.ai 5K plan)`);
        
        // Smart search diversity
        const smartQueries = this.getSmartSearchQueries();
        console.log(`\n🎯 Smart Search Diversity:`);
        console.log(`   Query Categories: ${smartQueries.length}`);
        console.log(`   Focus Areas: Earnings, Products, Competition, Regulation, AI, China`);
        console.log(`   Source Filtering: Business, Financial, Technology sources prioritized`);
        
        // Additional GNews supplementation
        console.log(`\n📰 GNews Supplementation (Free):`);
        console.log(`   Additional Articles: ~2,000 per month (100/day × 20 days)`);
        console.log(`   Purpose: Source diversity, recent context, volume boost`);
        console.log(`   Strategy: Fill gaps in NewsAPI.ai coverage`);
        
        console.log(`\n🚀 Total Monthly Collection Estimate:`);
        console.log(`   NewsAPI.ai Historical: ${Math.round(totalArticles/12).toLocaleString()} articles/month`);
        console.log(`   GNews Supplementation: 2,000 articles/month`);
        console.log(`   TOTAL: ${Math.round(totalArticles/12 + 2000).toLocaleString()} articles/month`);
        console.log(`   ANNUAL TOTAL: ${(totalArticles + 24000).toLocaleString()} articles`);
    }
}

// Main execution
async function main() {
    const strategy = new FiveYearCollectionStrategy();
    
    // Display the comprehensive plan
    strategy.displayCollectionPlan();
    
    // Test smart search parameters
    console.log('\n' + '='.repeat(70));
    await strategy.testSmartSearch();
    
    console.log('🎯 Next Steps:');
    console.log('1. Subscribe to NewsAPI.ai 5K plan ($90/month)');
    console.log('2. Implement smart search queries with source filtering');
    console.log('3. Execute systematic collection across 5 years');
    console.log('4. Supplement with GNews for additional volume');
    console.log('5. Build massive ML dataset with temporal diversity');
}

main();
