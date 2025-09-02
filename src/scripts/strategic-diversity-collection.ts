#!/usr/bin/env npx tsx

/**
 * Strategic Diversity Collection System
 * Smart approach to get 1000 diverse Apple articles from 100K+ available
 */

import { config } from 'dotenv';
import axios from 'axios';

config();

interface DiversityDimension {
    name: string;
    searches: SearchStrategy[];
    tokensAllocated: number;
    expectedArticles: number;
    rationale: string;
}

interface SearchStrategy {
    query: string;
    timeframe: { start: string; end: string };
    articlesPerSearch: number;
    priority: 'high' | 'medium' | 'low';
    expectedType: string;
}

class StrategicDiversityCollector {
    private newsApiKey: string;
    private totalTokenBudget = 100; // Start conservative for testing
    private targetArticles = 1000;

    constructor() {
        this.newsApiKey = process.env.NEWSAPIAI_API_KEY || '';
    }

    /**
     * Create strategic diversity plan across multiple dimensions
     */
    createDiversityPlan(): DiversityDimension[] {
        return [
            // DIMENSION 1: Content Type Diversity (25% of tokens)
            {
                name: 'Content Type Diversity',
                tokensAllocated: 25,
                expectedArticles: 250,
                rationale: 'Mix of earnings, product news, analysis, breaking news, opinion pieces',
                searches: [
                    { query: 'Apple earnings results', timeframe: { start: '2024-01-01', end: '2024-12-31' }, articlesPerSearch: 20, priority: 'high', expectedType: 'earnings' },
                    { query: 'Apple iPhone launch', timeframe: { start: '2023-09-01', end: '2024-09-30' }, articlesPerSearch: 20, priority: 'high', expectedType: 'product_launch' },
                    { query: 'Apple analyst rating', timeframe: { start: '2024-01-01', end: '2024-12-31' }, articlesPerSearch: 15, priority: 'medium', expectedType: 'analyst_report' },
                    { query: 'Apple stock price', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 15, priority: 'medium', expectedType: 'market_news' },
                    { query: 'Apple breaking news', timeframe: { start: '2024-01-01', end: '2024-12-31' }, articlesPerSearch: 10, priority: 'low', expectedType: 'breaking_news' }
                ]
            },

            // DIMENSION 2: Temporal Distribution (25% of tokens)
            {
                name: 'Temporal Distribution',
                tokensAllocated: 25,
                expectedArticles: 250,
                rationale: 'Even spread across 5 years to capture different market cycles',
                searches: [
                    { query: 'Apple', timeframe: { start: '2024-01-01', end: '2024-12-31' }, articlesPerSearch: 15, priority: 'high', expectedType: 'recent_comprehensive' },
                    { query: 'Apple', timeframe: { start: '2023-01-01', end: '2023-12-31' }, articlesPerSearch: 15, priority: 'high', expectedType: 'year_2023' },
                    { query: 'Apple', timeframe: { start: '2022-01-01', end: '2022-12-31' }, articlesPerSearch: 12, priority: 'medium', expectedType: 'year_2022' },
                    { query: 'Apple', timeframe: { start: '2021-01-01', end: '2021-12-31' }, articlesPerSearch: 10, priority: 'medium', expectedType: 'year_2021' },
                    { query: 'Apple', timeframe: { start: '2020-01-01', end: '2020-12-31' }, articlesPerSearch: 8, priority: 'low', expectedType: 'year_2020' }
                ]
            },

            // DIMENSION 3: Geographic/Market Focus (20% of tokens)
            {
                name: 'Geographic & Market Focus',
                tokensAllocated: 20,
                expectedArticles: 200,
                rationale: 'Different geographic markets and regulatory environments',
                searches: [
                    { query: 'Apple China market', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 15, priority: 'high', expectedType: 'china_market' },
                    { query: 'Apple Europe EU', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 12, priority: 'medium', expectedType: 'europe_regulatory' },
                    { query: 'Apple India market', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 10, priority: 'medium', expectedType: 'india_growth' },
                    { query: 'Apple antitrust regulation', timeframe: { start: '2022-01-01', end: '2024-12-31' }, articlesPerSearch: 8, priority: 'low', expectedType: 'regulatory' }
                ]
            },

            // DIMENSION 4: Business Segment Diversity (15% of tokens)
            {
                name: 'Business Segment Diversity',
                tokensAllocated: 15,
                expectedArticles: 150,
                rationale: 'Coverage across all major Apple business lines',
                searches: [
                    { query: 'Apple services revenue', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 15, priority: 'high', expectedType: 'services_business' },
                    { query: 'Apple Mac sales', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 12, priority: 'medium', expectedType: 'mac_segment' },
                    { query: 'Apple Watch health', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 10, priority: 'medium', expectedType: 'wearables' },
                    { query: 'Apple iPad tablet', timeframe: { start: '2022-01-01', end: '2024-12-31' }, articlesPerSearch: 8, priority: 'low', expectedType: 'ipad_segment' }
                ]
            },

            // DIMENSION 5: Strategic Themes (15% of tokens)
            {
                name: 'Strategic Themes',
                tokensAllocated: 15,
                expectedArticles: 150,
                rationale: 'Future-focused strategic developments and competitive dynamics',
                searches: [
                    { query: 'Apple AI artificial intelligence', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 15, priority: 'high', expectedType: 'ai_strategy' },
                    { query: 'Apple supply chain', timeframe: { start: '2022-01-01', end: '2024-12-31' }, articlesPerSearch: 10, priority: 'medium', expectedType: 'supply_chain' },
                    { query: 'Apple competition Samsung', timeframe: { start: '2023-01-01', end: '2024-12-31' }, articlesPerSearch: 8, priority: 'medium', expectedType: 'competitive' },
                    { query: 'Apple innovation R&D', timeframe: { start: '2022-01-01', end: '2024-12-31' }, articlesPerSearch: 7, priority: 'low', expectedType: 'innovation' }
                ]
            }
        ];
    }

    /**
     * Execute a single strategic search with quality filtering
     */
    async executeStrategicSearch(search: SearchStrategy, dimension: string): Promise<any[]> {
        console.log(`🔍 ${dimension}: "${search.query}" (${search.timeframe.start} to ${search.timeframe.end})`);

        try {
            const response = await axios.get('https://eventregistry.org/api/v1/article/getArticles', {
                params: {
                    resultType: 'articles',
                    keyword: search.query,
                    lang: 'eng',
                    dateStart: search.timeframe.start,
                    dateEnd: search.timeframe.end,
                    articlesSortBy: 'relevance',
                    includeArticleBody: true,
                    includeArticleConcepts: true,
                    includeArticleCategories: true,
                    articlesCount: search.articlesPerSearch,
                    apiKey: this.newsApiKey
                },
                timeout: 30000
            });

            const articles = response.data?.articles?.results || [];
            const totalAvailable = response.data?.articles?.totalResults || 0;

            console.log(`   📊 Found: ${articles.length} articles (${totalAvailable} total available)`);

            // Quality filtering
            const qualityFiltered = this.applyQualityFilters(articles, search);
            console.log(`   ✅ After quality filtering: ${qualityFiltered.length} articles`);

            if (qualityFiltered.length > 0) {
                const sample = qualityFiltered[0];
                console.log(`   📰 Sample: "${sample.title}"`);
                console.log(`   🌐 Source: ${sample.source?.title || 'Unknown'}`);
                console.log(`   📄 Content: ${sample.body ? `${sample.body.length} chars` : 'No content'}`);

                // Source diversity check
                const sources = [...new Set(qualityFiltered.map(a => a.source?.title).filter(Boolean))];
                console.log(`   🏢 Source diversity: ${sources.length} unique sources`);
            }

            return qualityFiltered.map(article => ({
                ...article,
                search_dimension: dimension,
                search_query: search.query,
                search_type: search.expectedType,
                search_priority: search.priority
            }));

        } catch (error: any) {
            console.log(`   ❌ Failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Apply quality filters to ensure diverse, high-quality articles
     */
    private applyQualityFilters(articles: any[], search: SearchStrategy): any[] {
        return articles.filter(article => {
            // Filter 1: Must have substantial content
            if (!article.body || article.body.length < 200) return false;

            // Filter 2: Title must be relevant to Apple
            const title = (article.title || '').toLowerCase();
            const isAppleRelevant = title.includes('apple') || title.includes('aapl') ||
                title.includes('iphone') || title.includes('ipad') ||
                title.includes('mac') || title.includes('tim cook');
            if (!isAppleRelevant) return false;

            // Filter 3: Avoid duplicate/similar titles (basic check)
            const titleWords = title.split(' ').filter(w => w.length > 3);
            if (titleWords.length < 3) return false; // Too short/generic

            // Filter 4: Prefer business/financial sources for certain search types
            if (search.expectedType === 'earnings' || search.expectedType === 'analyst_report') {
                const source = (article.source?.title || '').toLowerCase();
                const isBusinessSource = source.includes('bloomberg') || source.includes('reuters') ||
                    source.includes('financial') || source.includes('business') ||
                    source.includes('wall street') || source.includes('market');
                // Don't exclude, but note preference
            }

            return true;
        });
    }

    /**
     * Execute strategic diversity collection with progress tracking
     */
    async executeStrategicCollection(): Promise<void> {
        console.log('🎯 Strategic Diversity Collection System');
        console.log('='.repeat(70));
        console.log(`Target: ${this.targetArticles} diverse articles`);
        console.log(`Token Budget: ${this.totalTokenBudget} tokens`);
        console.log('Strategy: Multi-dimensional diversification');
        console.log('');

        const diversityPlan = this.createDiversityPlan();
        let totalTokensUsed = 0;
        let totalArticlesCollected = 0;
        const allArticles: any[] = [];

        // Display plan overview
        console.log('📋 Diversity Strategy:');
        diversityPlan.forEach(dimension => {
            console.log(`   ${dimension.name}: ${dimension.tokensAllocated} tokens → ${dimension.expectedArticles} articles`);
            console.log(`      Rationale: ${dimension.rationale}`);
        });
        console.log('');

        // Execute each dimension
        for (const dimension of diversityPlan) {
            if (totalTokensUsed >= this.totalTokenBudget) {
                console.log('⚠️ Token budget reached. Stopping collection.');
                break;
            }

            console.log(`\n🎯 DIMENSION: ${dimension.name.toUpperCase()}`);
            console.log('='.repeat(50));

            for (const search of dimension.searches) {
                if (totalTokensUsed >= this.totalTokenBudget) break;

                const searchArticles = await this.executeStrategicSearch(search, dimension.name);
                allArticles.push(...searchArticles);
                totalArticlesCollected += searchArticles.length;

                // Calculate token cost (5 tokens per historical year)
                const startYear = parseInt(search.timeframe.start.split('-')[0]);
                const endYear = parseInt(search.timeframe.end.split('-')[0]);
                const yearsCovered = endYear - startYear + 1;
                const tokenCost = yearsCovered * 5;
                totalTokensUsed += tokenCost;

                console.log(`   💰 Token cost: ${tokenCost} (Total: ${totalTokensUsed}/${this.totalTokenBudget})`);
                console.log('');

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Final analysis
        console.log('\n🎉 Strategic Collection Complete!');
        console.log('='.repeat(70));
        console.log(`Total articles collected: ${totalArticlesCollected}`);
        console.log(`Total tokens used: ${totalTokensUsed}/${this.totalTokenBudget}`);
        console.log(`Collection efficiency: ${Math.round(totalArticlesCollected / totalTokensUsed)} articles per token`);

        // Diversity analysis
        this.analyzeDiversityMetrics(allArticles);

        console.log('\n🚀 Next Steps:');
        console.log('1. Review diversity metrics above');
        console.log('2. If satisfied, scale up token budget to 500-1000 tokens');
        console.log('3. Execute full collection to get your 10,000+ article dataset');
        console.log('4. Process articles through AI system for ML features');
    }

    /**
     * Analyze diversity metrics of collected articles
     */
    private analyzeDiversityMetrics(articles: any[]): void {
        console.log('\n📊 Diversity Analysis:');

        // Temporal diversity
        const byYear = articles.reduce((acc, a) => {
            const year = new Date(a.date || a.dateTime).getFullYear();
            acc[year] = (acc[year] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);

        console.log('   📅 Temporal Distribution:');
        Object.entries(byYear).sort().forEach(([year, count]) => {
            console.log(`      ${year}: ${count} articles`);
        });

        // Source diversity
        const sources = [...new Set(articles.map(a => a.source?.title).filter(Boolean))];
        console.log(`   🏢 Source Diversity: ${sources.length} unique sources`);
        console.log(`      Top sources: ${sources.slice(0, 5).join(', ')}`);

        // Content type diversity
        const byType = articles.reduce((acc, a) => {
            acc[a.search_type] = (acc[a.search_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('   📰 Content Type Distribution:');
        Object.entries(byType).forEach(([type, count]) => {
            console.log(`      ${type}: ${count} articles`);
        });

        // Quality metrics
        const fullContent = articles.filter(a => a.body && a.body.length > 500);
        const avgLength = fullContent.reduce((sum, a) => sum + (a.body?.length || 0), 0) / fullContent.length;

        console.log('   📄 Quality Metrics:');
        console.log(`      Full content rate: ${fullContent.length}/${articles.length} (${Math.round((fullContent.length / articles.length) * 100)}%)`);
        console.log(`      Average content length: ${Math.round(avgLength)} characters`);

        // Dimension coverage
        const byDimension = articles.reduce((acc, a) => {
            acc[a.search_dimension] = (acc[a.search_dimension] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('   🎯 Dimension Coverage:');
        Object.entries(byDimension).forEach(([dimension, count]) => {
            console.log(`      ${dimension}: ${count} articles`);
        });
    }
}

// Main execution
async function main() {
    try {
        const collector = new StrategicDiversityCollector();
        await collector.executeStrategicCollection();

    } catch (error: any) {
        console.error('❌ Strategic collection failed:', error.message);
    }
}

main();
