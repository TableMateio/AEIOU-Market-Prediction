#!/usr/bin/env npx tsx

/**
 * Test publisher-based filtering approach instead of keyword exclusions
 */

import 'dotenv/config';
import { NewsApiAiService } from '../services/newsApiAiService';

class PublisherFilterTest {
    private newsService: NewsApiAiService;

    // Trusted business/financial publishers
    private readonly TRUSTED_PUBLISHERS = [
        // Financial News
        'Investing.com', 'Yahoo Finance', 'MarketWatch', 'Bloomberg', 'Reuters',
        'The Wall Street Journal', 'Financial Times', 'CNBC', 'Fox Business',

        // Investment/Analysis
        'The Motley Fool', 'Seeking Alpha', 'InvestorPlace', 'Benzinga',
        'Zacks Investment Research', "Investor's Business Daily", 'TheStreet',

        // Press Releases
        'GlobeNewswire', 'PR Newswire', 'Business Wire', 'EIN Presswire',

        // Tech Business
        'TechCrunch', 'VentureBeat', 'Ars Technica', 'The Verge',

        // General Business
        'Forbes', 'Fortune', 'Harvard Business Review', 'Fast Company',

        // News Agencies
        'Associated Press', 'AP News', 'BBC Business', 'CNN Business'
    ];

    constructor() {
        this.newsService = new NewsApiAiService();
    }

    async testPublisherApproach(): Promise<void> {
        console.log('🏢 TESTING PUBLISHER-BASED FILTERING');
        console.log('='.repeat(60));
        console.log('');

        console.log('📋 TRUSTED PUBLISHERS LIST:');
        console.log('─'.repeat(40));

        console.log('📊 Financial News:');
        console.log('   • Investing.com, Yahoo Finance, MarketWatch, Bloomberg, Reuters');
        console.log('   • Wall Street Journal, Financial Times, CNBC, Fox Business');
        console.log('');

        console.log('📈 Investment/Analysis:');
        console.log('   • The Motley Fool, Seeking Alpha, InvestorPlace, Benzinga');
        console.log('   • Zacks, Investor\'s Business Daily, TheStreet');
        console.log('');

        console.log('📢 Press Releases:');
        console.log('   • GlobeNewswire, PR Newswire, Business Wire');
        console.log('');

        console.log('💻 Tech Business:');
        console.log('   • TechCrunch, VentureBeat, Ars Technica, The Verge');
        console.log('');

        console.log('🏢 General Business:');
        console.log('   • Forbes, Fortune, Harvard Business Review, Fast Company');
        console.log('');

        console.log('📰 News Agencies:');
        console.log('   • Associated Press, BBC Business, CNN Business');
        console.log('');

        console.log(`📊 Total trusted publishers: ${this.TRUSTED_PUBLISHERS.length}`);
        console.log('');

        // Test the approach
        await this.testWithPublisherFiltering();
    }

    private async testWithPublisherFiltering(): Promise<void> {
        console.log('🧪 COLLECTING WITH PUBLISHER FILTERING');
        console.log('─'.repeat(50));

        try {
            // Collect articles with AAPL query
            const articles = await this.newsService.searchAppleArticles({
                query: 'AAPL',
                dateFrom: '2024-08-05',
                dateTo: '2024-08-07',
                sortBy: 'relevance',
                pageSize: 20 // Get more to have better selection after filtering
            });

            console.log(`✅ Raw collection: ${articles.length} articles`);
            console.log('');

            // Filter by trusted publishers
            const filteredArticles = this.filterByPublisher(articles);

            console.log('📊 PUBLISHER FILTERING RESULTS:');
            console.log('─'.repeat(40));
            console.log(`📰 Articles from trusted publishers: ${filteredArticles.length}/${articles.length}`);
            console.log(`📈 Publisher filter rate: ${Math.round(filteredArticles.length / articles.length * 100)}%`);
            console.log('');

            // Analyze the filtered articles
            this.analyzeFilteredArticles(filteredArticles);

            // Show comparison
            this.showPublisherComparison(articles, filteredArticles);

        } catch (error: any) {
            console.log(`❌ Test failed: ${error.message}`);
        }
    }

    private filterByPublisher(articles: any[]): any[] {
        return articles.filter(article => {
            const source = article.source?.title || article.source || '';

            // Check if source matches any trusted publisher
            return this.TRUSTED_PUBLISHERS.some(publisher => {
                // Flexible matching (case-insensitive, partial matches)
                return source.toLowerCase().includes(publisher.toLowerCase()) ||
                    publisher.toLowerCase().includes(source.toLowerCase());
            });
        });
    }

    private analyzeFilteredArticles(articles: any[]): void {
        console.log('🔍 FILTERED ARTICLES ANALYSIS:');
        console.log('─'.repeat(40));

        // Group by publisher
        const publisherGroups = articles.reduce((acc: Record<string, any[]>, article) => {
            const source = article.source?.title || article.source || 'Unknown';
            if (!acc[source]) acc[source] = [];
            acc[source].push(article);
            return acc;
        }, {});

        console.log('📋 ARTICLES BY PUBLISHER:');
        Object.entries(publisherGroups)
            .sort(([, a], [, b]) => b.length - a.length)
            .forEach(([publisher, articles]) => {
                console.log(`   • ${publisher}: ${articles.length} articles`);
            });
        console.log('');

        // Show sample articles
        console.log('📋 SAMPLE FILTERED ARTICLES:');
        articles.slice(0, 8).forEach((article, i) => {
            const source = article.source?.title || article.source || 'Unknown';
            console.log(`   ${i + 1}. "${article.title}"`);
            console.log(`      Publisher: ${source}`);
            console.log(`      Likely Quality: ${this.assessArticleQuality(article)}`);
            console.log('');
        });
    }

    private assessArticleQuality(article: any): string {
        const title = article.title?.toLowerCase() || '';
        const source = article.source?.title || article.source || '';

        // High quality indicators
        if (title.includes('apple') && (
            title.includes('earnings') || title.includes('revenue') ||
            title.includes('stock') || title.includes('shares')
        )) {
            return '🟢 High (Apple-specific business)';
        }

        // Financial publisher + AAPL mention = likely good
        const financialPublishers = ['Investing.com', 'Yahoo Finance', 'MarketWatch', 'Motley Fool'];
        if (financialPublishers.some(pub => source.includes(pub))) {
            return '🟡 Medium (Financial publisher)';
        }

        // Press release = usually high quality
        if (source.includes('GlobeNewswire') || source.includes('PR Newswire')) {
            return '🟢 High (Press release)';
        }

        return '🟡 Medium (Trusted publisher)';
    }

    private showPublisherComparison(originalArticles: any[], filteredArticles: any[]): void {
        console.log('📊 PUBLISHER APPROACH vs KEYWORD APPROACH');
        console.log('─'.repeat(50));

        // Show what gets filtered out
        const removedArticles = originalArticles.filter(article =>
            !filteredArticles.some(filtered => filtered.url === article.url)
        );

        console.log('🚫 ARTICLES REMOVED BY PUBLISHER FILTER:');
        removedArticles.slice(0, 5).forEach((article, i) => {
            const source = article.source?.title || article.source || 'Unknown';
            console.log(`   ${i + 1}. "${article.title?.substring(0, 60)}..."`);
            console.log(`      Publisher: ${source}`);
            console.log(`      Reason: Not in trusted publisher list`);
            console.log('');
        });

        if (removedArticles.length > 5) {
            console.log(`   ... and ${removedArticles.length - 5} more removed articles`);
            console.log('');
        }

        // Show advantages
        console.log('✅ PUBLISHER APPROACH ADVANTAGES:');
        console.log('   • No risk of filtering out legitimate Apple business terms');
        console.log('   • Focuses on editorial quality and credibility');
        console.log('   • Automatically excludes low-quality sources');
        console.log('   • Preserves Apple board elections, shareholder votes, etc.');
        console.log('   • Simpler to maintain (add/remove publishers vs many keywords)');
        console.log('');

        console.log('⚠️  CONSIDERATIONS:');
        console.log('   • Need to ensure publisher list is comprehensive');
        console.log('   • May miss some legitimate sources not on the list');
        console.log('   • Publisher names in API might not match exactly');
        console.log('');

        console.log('🎯 RECOMMENDATION:');
        if (filteredArticles.length >= 10) {
            console.log('   ✅ Publisher filtering shows promise - good article count');
            console.log('   📋 Review filtered articles to assess quality');
            console.log('   🔧 Consider combining: publisher filter + minimal keyword exclusions');
        } else {
            console.log('   ⚠️  Too few articles after publisher filtering');
            console.log('   🔧 May need to expand trusted publisher list');
        }
    }
}

// Main execution
async function main() {
    try {
        const tester = new PublisherFilterTest();
        await tester.testPublisherApproach();

    } catch (error: any) {
        console.error('❌ Publisher filtering test failed:', error.message);
    }
}

main();
