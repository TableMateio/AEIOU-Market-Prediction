#!/usr/bin/env npx tsx

/**
 * Comprehensive duplicate checker for articles
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

interface Article {
    id: string;
    url: string;
    title: string;
    data_source: string;
    created_at: string;
    published_at: string;
}

class DuplicateChecker {
    private supabase: any;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    async checkAllDuplicates(): Promise<void> {
        console.log('🔍 COMPREHENSIVE DUPLICATE CHECKER');
        console.log('='.repeat(60));
        console.log('');

        // Check URL duplicates
        await this.checkUrlDuplicates();
        
        // Check title duplicates (potential content duplicates)
        await this.checkTitleDuplicates();
        
        // Check source distribution
        await this.checkSourceDistribution();
        
        // Check date distribution
        await this.checkDateDistribution();
        
        // Summary stats
        await this.showSummaryStats();
    }

    /**
     * Check for exact URL duplicates
     */
    private async checkUrlDuplicates(): Promise<void> {
        console.log('🔗 URL DUPLICATE CHECK');
        console.log('─'.repeat(40));

        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('id, url, title, data_source, created_at')
                .order('created_at', { ascending: true });

            if (error) {
                console.log(`❌ Error fetching articles: ${error.message}`);
                return;
            }

            console.log(`📊 Total articles: ${articles.length}`);

            // Group by URL
            const urlGroups = articles.reduce((acc: Record<string, Article[]>, article: Article) => {
                if (!acc[article.url]) {
                    acc[article.url] = [];
                }
                acc[article.url].push(article);
                return acc;
            }, {});

            const duplicateUrls = Object.entries(urlGroups).filter(([url, articles]) => articles.length > 1);
            
            console.log(`🔍 Unique URLs: ${Object.keys(urlGroups).length}`);
            console.log(`❌ Duplicate URLs: ${duplicateUrls.length}`);

            if (duplicateUrls.length > 0) {
                console.log('');
                console.log('📋 DUPLICATE URL DETAILS:');
                duplicateUrls.forEach(([url, articles]) => {
                    console.log(`   URL: ${url.substring(0, 80)}...`);
                    console.log(`   Count: ${articles.length} duplicates`);
                    articles.forEach((article, i) => {
                        console.log(`      ${i + 1}. ${article.data_source} | ${article.created_at.split('T')[0]} | ${article.title.substring(0, 50)}...`);
                    });
                    console.log('');
                });

                if (process.argv.includes('--remove-url-duplicates')) {
                    await this.removeUrlDuplicates(duplicateUrls);
                } else {
                    console.log('💡 Add --remove-url-duplicates flag to remove older duplicates');
                }
            } else {
                console.log('✅ No URL duplicates found');
            }
            console.log('');

        } catch (error: any) {
            console.log(`❌ Error checking URL duplicates: ${error.message}`);
        }
    }

    /**
     * Check for title duplicates (potential content duplicates)
     */
    private async checkTitleDuplicates(): Promise<void> {
        console.log('📰 TITLE DUPLICATE CHECK');
        console.log('─'.repeat(40));

        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('id, url, title, data_source, published_at')
                .order('published_at', { ascending: true });

            if (error) {
                console.log(`❌ Error fetching articles: ${error.message}`);
                return;
            }

            // Group by normalized title (lowercase, trimmed)
            const titleGroups = articles.reduce((acc: Record<string, Article[]>, article: Article) => {
                const normalizedTitle = article.title?.toLowerCase().trim() || 'untitled';
                if (!acc[normalizedTitle]) {
                    acc[normalizedTitle] = [];
                }
                acc[normalizedTitle].push(article);
                return acc;
            }, {});

            const duplicateTitles = Object.entries(titleGroups).filter(([title, articles]) => articles.length > 1);
            
            console.log(`🔍 Unique titles: ${Object.keys(titleGroups).length}`);
            console.log(`❌ Duplicate titles: ${duplicateTitles.length}`);

            if (duplicateTitles.length > 0) {
                console.log('');
                console.log('📋 DUPLICATE TITLE DETAILS (showing first 5):');
                duplicateTitles.slice(0, 5).forEach(([title, articles]) => {
                    console.log(`   Title: "${title.substring(0, 80)}..."`);
                    console.log(`   Count: ${articles.length} articles`);
                    articles.forEach((article, i) => {
                        console.log(`      ${i + 1}. ${article.data_source} | ${article.published_at?.split('T')[0] || 'No date'} | ${article.url.substring(0, 40)}...`);
                    });
                    console.log('');
                });

                if (duplicateTitles.length > 5) {
                    console.log(`   ... and ${duplicateTitles.length - 5} more duplicate title groups`);
                    console.log('');
                }

                console.log('💡 Title duplicates might indicate same story from different sources');
                console.log('💡 Consider if these should be kept or deduplicated based on your needs');
            } else {
                console.log('✅ No title duplicates found');
            }
            console.log('');

        } catch (error: any) {
            console.log(`❌ Error checking title duplicates: ${error.message}`);
        }
    }

    /**
     * Check source distribution
     */
    private async checkSourceDistribution(): Promise<void> {
        console.log('📊 SOURCE DISTRIBUTION');
        console.log('─'.repeat(40));

        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('data_source, source, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error fetching source data: ${error.message}`);
                return;
            }

            // Group by API data source
            const apiSources = articles.reduce((acc: Record<string, number>, article) => {
                acc[article.data_source] = (acc[article.data_source] || 0) + 1;
                return acc;
            }, {});

            console.log('📋 BY API SOURCE:');
            Object.entries(apiSources).forEach(([source, count]) => {
                console.log(`   ${source}: ${count} articles`);
            });

            // Group by actual news source (publisher)
            const newsSources = articles.reduce((acc: Record<string, number>, article) => {
                const source = article.source || 'Unknown';
                acc[source] = (acc[source] || 0) + 1;
                return acc;
            }, {});

            console.log('');
            console.log('📋 BY NEWS PUBLISHER (top 10):');
            Object.entries(newsSources)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 10)
                .forEach(([source, count]) => {
                    console.log(`   ${source}: ${count} articles`);
                });

            const totalSources = Object.keys(newsSources).length;
            console.log(`   ... and ${totalSources - 10} more publishers`);
            console.log('');

        } catch (error: any) {
            console.log(`❌ Error checking source distribution: ${error.message}`);
        }
    }

    /**
     * Check date distribution
     */
    private async checkDateDistribution(): Promise<void> {
        console.log('📅 DATE DISTRIBUTION');
        console.log('─'.repeat(40));

        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('published_at, data_source')
                .order('published_at', { ascending: true });

            if (error) {
                console.log(`❌ Error fetching date data: ${error.message}`);
                return;
            }

            // Filter out articles without dates
            const articlesWithDates = articles.filter(article => article.published_at);

            if (articlesWithDates.length === 0) {
                console.log('❌ No articles with publication dates found');
                return;
            }

            console.log(`📊 Articles with dates: ${articlesWithDates.length}/${articles.length}`);

            // Group by date
            const dateGroups = articlesWithDates.reduce((acc: Record<string, number>, article) => {
                const date = article.published_at.split('T')[0]; // Get YYYY-MM-DD
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});

            const uniqueDates = Object.keys(dateGroups).sort();
            console.log(`📅 Date range: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
            console.log(`📅 Unique dates: ${uniqueDates.length}`);

            // Show dates with most articles
            console.log('');
            console.log('📋 DATES WITH MOST ARTICLES (top 10):');
            Object.entries(dateGroups)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 10)
                .forEach(([date, count]) => {
                    console.log(`   ${date}: ${count} articles`);
                });

            // Check for clustering (dates with unusually high counts)
            const avgArticlesPerDate = articlesWithDates.length / uniqueDates.length;
            const clusteredDates = Object.entries(dateGroups)
                .filter(([date, count]) => (count as number) > avgArticlesPerDate * 2)
                .sort(([,a], [,b]) => (b as number) - (a as number));

            if (clusteredDates.length > 0) {
                console.log('');
                console.log(`⚠️  POTENTIAL DATE CLUSTERING (>${Math.round(avgArticlesPerDate * 2)} articles/day):`);
                clusteredDates.slice(0, 5).forEach(([date, count]) => {
                    console.log(`   ${date}: ${count} articles (${Math.round((count as number) / avgArticlesPerDate * 100) / 100}x avg)`);
                });
            }

            console.log('');

        } catch (error: any) {
            console.log(`❌ Error checking date distribution: ${error.message}`);
        }
    }

    /**
     * Show summary statistics
     */
    private async showSummaryStats(): Promise<void> {
        console.log('📈 SUMMARY STATISTICS');
        console.log('─'.repeat(40));

        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('id, url, title, data_source, published_at, source, apple_relevance_score')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error fetching summary data: ${error.message}`);
                return;
            }

            console.log(`📊 Total articles: ${articles.length}`);
            console.log(`📊 Unique URLs: ${new Set(articles.map(a => a.url)).size}`);
            console.log(`📊 Unique titles: ${new Set(articles.map(a => a.title)).size}`);
            console.log(`📊 Unique publishers: ${new Set(articles.map(a => a.source)).size}`);
            console.log(`📊 Articles with dates: ${articles.filter(a => a.published_at).length}`);

            // Relevance score distribution
            const relevantArticles = articles.filter(a => a.apple_relevance_score !== null);
            if (relevantArticles.length > 0) {
                const avgRelevance = relevantArticles.reduce((sum, a) => sum + (a.apple_relevance_score || 0), 0) / relevantArticles.length;
                console.log(`📊 Average relevance score: ${Math.round(avgRelevance * 100) / 100}`);
                console.log(`📊 High relevance (>80): ${relevantArticles.filter(a => (a.apple_relevance_score || 0) > 80).length} articles`);
            }

            console.log('');
            console.log('✅ Database health check complete!');

        } catch (error: any) {
            console.log(`❌ Error generating summary stats: ${error.message}`);
        }
    }

    /**
     * Remove URL duplicates (keep oldest)
     */
    private async removeUrlDuplicates(duplicateUrls: [string, Article[]][]): Promise<void> {
        console.log('🗑️  REMOVING URL DUPLICATES');
        console.log('─'.repeat(30));

        let removedCount = 0;

        for (const [url, articles] of duplicateUrls) {
            // Sort by created_at to keep the oldest
            const sortedArticles = articles.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            const toKeep = sortedArticles[0];
            const toRemove = sortedArticles.slice(1);

            console.log(`   Processing: ${url.substring(0, 40)}...`);
            console.log(`      Keeping: ${toKeep.id.substring(0, 8)}... (${toKeep.created_at.split('T')[0]})`);
            console.log(`      Removing: ${toRemove.length} duplicates`);

            // Remove duplicates
            for (const article of toRemove) {
                try {
                    const { error } = await this.supabase
                        .from('articles')
                        .delete()
                        .eq('id', article.id);

                    if (error) {
                        console.log(`      ❌ Failed to remove ${article.id.substring(0, 8)}...: ${error.message}`);
                    } else {
                        removedCount++;
                    }
                } catch (error: any) {
                    console.log(`      ❌ Error removing ${article.id.substring(0, 8)}...: ${error.message}`);
                }
            }
        }

        console.log(`✅ Removed ${removedCount} duplicate articles`);
        console.log('');
    }
}

// Main execution
async function main() {
    try {
        console.log('🧹 COMPREHENSIVE DUPLICATE CHECKER');
        console.log('Available flags:');
        console.log('  --remove-url-duplicates: Remove duplicate URLs (keep oldest)');
        console.log('');

        const checker = new DuplicateChecker();
        await checker.checkAllDuplicates();
        
    } catch (error: any) {
        console.error('❌ Duplicate checking failed:', error.message);
    }
}

main();
