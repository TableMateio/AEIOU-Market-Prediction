#!/usr/bin/env npx tsx

/**
 * Check for duplicates and fix data_source field
 * Add proper metadata fields for search criteria
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

class DatabaseCleaner {
    private supabase: any;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    async checkAndFix(): Promise<void> {
        console.log('🔍 CHECKING DUPLICATES AND FIXING DATA SOURCES');
        console.log('='.repeat(60));
        console.log('');

        // First, check for duplicates
        await this.checkForDuplicates();
        
        // Then, analyze current data sources
        await this.analyzeDataSources();
        
        // Add new metadata fields if needed
        await this.addMetadataFields();
        
        // Fix data sources
        await this.fixDataSources();
        
        // Final verification
        await this.verifyResults();
    }

    /**
     * Check for duplicate articles by URL
     */
    private async checkForDuplicates(): Promise<void> {
        console.log('🔍 CHECKING FOR DUPLICATES');
        console.log('─'.repeat(40));

        try {
            // Get all articles with their URLs
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('id, url, title, data_source, created_at')
                .order('created_at', { ascending: true });

            if (error) {
                console.log(`❌ Error fetching articles: ${error.message}`);
                return;
            }

            console.log(`📊 Total articles in database: ${articles.length}`);

            // Group by URL to find duplicates
            const urlGroups = articles.reduce((acc: Record<string, any[]>, article) => {
                if (!acc[article.url]) {
                    acc[article.url] = [];
                }
                acc[article.url].push(article);
                return acc;
            }, {});

            // Find duplicates
            const duplicateUrls = Object.entries(urlGroups).filter(([url, articles]) => articles.length > 1);
            
            console.log(`🔍 Unique URLs: ${Object.keys(urlGroups).length}`);
            console.log(`❌ Duplicate URLs: ${duplicateUrls.length}`);
            console.log('');

            if (duplicateUrls.length > 0) {
                console.log('📋 DUPLICATE ARTICLES FOUND:');
                duplicateUrls.slice(0, 10).forEach(([url, articles]) => {
                    console.log(`   URL: ${url.substring(0, 60)}...`);
                    console.log(`   Count: ${articles.length} duplicates`);
                    articles.forEach((article, i) => {
                        console.log(`      ${i + 1}. ID: ${article.id} | Source: ${article.data_source} | Created: ${article.created_at.split('T')[0]}`);
                    });
                    console.log('');
                });

                if (duplicateUrls.length > 10) {
                    console.log(`   ... and ${duplicateUrls.length - 10} more duplicate URLs`);
                    console.log('');
                }

                // Ask if we should remove duplicates
                console.log('⚠️  DUPLICATES DETECTED');
                console.log('   Run with --fix-duplicates flag to remove older duplicates');
                console.log('   Example: npx tsx src/scripts/check-duplicates-and-fix-sources.ts --fix-duplicates');
                
                if (process.argv.includes('--fix-duplicates')) {
                    await this.removeDuplicates(duplicateUrls);
                }
            } else {
                console.log('✅ No duplicates found');
            }
            console.log('');

        } catch (error: any) {
            console.log(`❌ Error checking duplicates: ${error.message}`);
        }
    }

    /**
     * Remove duplicate articles (keep the oldest one)
     */
    private async removeDuplicates(duplicateUrls: [string, any[]][]): Promise<void> {
        console.log('🗑️  REMOVING DUPLICATES');
        console.log('─'.repeat(30));

        let removedCount = 0;

        for (const [url, articles] of duplicateUrls) {
            // Sort by created_at to keep the oldest
            const sortedArticles = articles.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            const toKeep = sortedArticles[0];
            const toRemove = sortedArticles.slice(1);

            console.log(`   Processing: ${url.substring(0, 40)}...`);
            console.log(`      Keeping: ${toKeep.id} (${toKeep.created_at.split('T')[0]})`);
            console.log(`      Removing: ${toRemove.length} duplicates`);

            // Remove duplicates
            for (const article of toRemove) {
                try {
                    const { error } = await this.supabase
                        .from('articles')
                        .delete()
                        .eq('id', article.id);

                    if (error) {
                        console.log(`      ❌ Failed to remove ${article.id}: ${error.message}`);
                    } else {
                        removedCount++;
                    }
                } catch (error: any) {
                    console.log(`      ❌ Error removing ${article.id}: ${error.message}`);
                }
            }
        }

        console.log(`✅ Removed ${removedCount} duplicate articles`);
        console.log('');
    }

    /**
     * Analyze current data sources
     */
    private async analyzeDataSources(): Promise<void> {
        console.log('📊 ANALYZING DATA SOURCES');
        console.log('─'.repeat(40));

        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('data_source, external_id_type, content_type')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error fetching data sources: ${error.message}`);
                return;
            }

            // Group by data_source
            const sourceGroups = articles.reduce((acc: Record<string, number>, article) => {
                acc[article.data_source] = (acc[article.data_source] || 0) + 1;
                return acc;
            }, {});

            console.log('📋 CURRENT DATA SOURCES:');
            Object.entries(sourceGroups).forEach(([source, count]) => {
                const isClean = ['alpha_vantage', 'newsapi_ai', 'polygon', 'finnhub', 'gnews', 'newsapi'].includes(source);
                const status = isClean ? '✅' : '⚠️';
                console.log(`   ${status} ${source}: ${count} articles`);
            });
            console.log('');

            // Identify problematic sources
            const problematicSources = Object.keys(sourceGroups).filter(source => 
                source.includes('_test') || source.includes('_five') || source.includes('_smart')
            );

            if (problematicSources.length > 0) {
                console.log('⚠️  PROBLEMATIC DATA SOURCES (contain test/metadata):');
                problematicSources.forEach(source => {
                    console.log(`   ${source}: ${sourceGroups[source]} articles`);
                });
                console.log('');
                console.log('💡 These should be fixed to show actual API source');
            }

        } catch (error: any) {
            console.log(`❌ Error analyzing sources: ${error.message}`);
        }
    }

    /**
     * Add metadata fields for search criteria
     */
    private async addMetadataFields(): Promise<void> {
        console.log('🔧 ADDING METADATA FIELDS');
        console.log('─'.repeat(40));

        try {
            // Try to add new columns for search metadata
            const alterQuery = `
                ALTER TABLE articles 
                ADD COLUMN IF NOT EXISTS search_start_date DATE,
                ADD COLUMN IF NOT EXISTS search_end_date DATE,
                ADD COLUMN IF NOT EXISTS search_name VARCHAR(255),
                ADD COLUMN IF NOT EXISTS search_criteria JSONB,
                ADD COLUMN IF NOT EXISTS collection_batch VARCHAR(255);
            `;

            console.log('📝 Adding columns: search_start_date, search_end_date, search_name, search_criteria, collection_batch');

            // We'll use a simple approach since we can't use RPC
            console.log('⚠️  Manual SQL required - Please run this in Supabase SQL editor:');
            console.log('');
            console.log(alterQuery);
            console.log('');
            console.log('📋 New fields will store:');
            console.log('   • search_start_date: Start date of the search period');
            console.log('   • search_end_date: End date of the search period');
            console.log('   • search_name: Human-readable name (e.g., "Period-1", "Test-Single")');
            console.log('   • search_criteria: JSON with filters, sort order, etc.');
            console.log('   • collection_batch: Batch identifier for grouping');
            console.log('');

        } catch (error: any) {
            console.log(`❌ Error adding metadata fields: ${error.message}`);
        }
    }

    /**
     * Fix data sources to show actual API sources
     */
    private async fixDataSources(): Promise<void> {
        console.log('🔧 FIXING DATA SOURCES');
        console.log('─'.repeat(40));

        if (!process.argv.includes('--fix-sources')) {
            console.log('⚠️  Add --fix-sources flag to actually fix the data sources');
            console.log('   Example: npx tsx src/scripts/check-duplicates-and-fix-sources.ts --fix-sources');
            return;
        }

        try {
            // Get all articles with problematic data sources
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('id, data_source, external_id_type, content_type, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error fetching articles: ${error.message}`);
                return;
            }

            // Define mapping rules
            const sourceMapping: Record<string, string> = {
                'newsapi_ai_test': 'newsapi_ai',
                'newsapi_ai_five_test': 'newsapi_ai',
                'newsapi_ai_smart': 'newsapi_ai',
                'newsapi_ai_social_sort': 'newsapi_ai',
                'newsapi_ai_final': 'newsapi_ai',
                'newsapi_ai_weekly': 'newsapi_ai'
            };

            let fixedCount = 0;

            for (const article of articles) {
                const correctSource = sourceMapping[article.data_source];
                
                if (correctSource) {
                    console.log(`   Fixing: ${article.data_source} → ${correctSource} (ID: ${article.id})`);
                    
                    // Determine search metadata based on the original source
                    let searchName = 'Unknown';
                    let searchCriteria: any = {
                        query: 'Apple',
                        sort: 'socialScore',
                        articles_count: 25,
                        source_threshold: 50
                    };

                    if (article.data_source.includes('test')) {
                        searchName = article.data_source.includes('five') ? 'Five-Periods-Test' : 'Single-Period-Test';
                    } else if (article.data_source.includes('smart')) {
                        searchName = 'Smart-Collection';
                    } else if (article.data_source.includes('social')) {
                        searchName = 'Social-Score-Collection';
                    }

                    try {
                        const { error: updateError } = await this.supabase
                            .from('articles')
                            .update({
                                data_source: correctSource,
                                search_name: searchName,
                                search_criteria: searchCriteria,
                                collection_batch: article.data_source // Store original as batch identifier
                            })
                            .eq('id', article.id);

                        if (updateError) {
                            console.log(`      ❌ Failed: ${updateError.message}`);
                        } else {
                            fixedCount++;
                        }

                    } catch (updateError: any) {
                        console.log(`      ❌ Error: ${updateError.message}`);
                    }
                }
            }

            console.log(`✅ Fixed ${fixedCount} data source entries`);

        } catch (error: any) {
            console.log(`❌ Error fixing sources: ${error.message}`);
        }
    }

    /**
     * Verify results after fixes
     */
    private async verifyResults(): Promise<void> {
        console.log('✅ VERIFICATION');
        console.log('─'.repeat(30));

        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('data_source, search_name, collection_batch')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error verifying: ${error.message}`);
                return;
            }

            // Count by clean data source
            const sourceGroups = articles.reduce((acc: Record<string, number>, article) => {
                acc[article.data_source] = (acc[article.data_source] || 0) + 1;
                return acc;
            }, {});

            console.log('📊 FINAL DATA SOURCES:');
            Object.entries(sourceGroups).forEach(([source, count]) => {
                console.log(`   ${source}: ${count} articles`);
            });

            // Count by search name if available
            const searchGroups = articles.reduce((acc: Record<string, number>, article) => {
                if (article.search_name) {
                    acc[article.search_name] = (acc[article.search_name] || 0) + 1;
                }
                return acc;
            }, {});

            if (Object.keys(searchGroups).length > 0) {
                console.log('');
                console.log('📋 BY SEARCH NAME:');
                Object.entries(searchGroups).forEach(([name, count]) => {
                    console.log(`   ${name}: ${count} articles`);
                });
            }

            console.log('');
            console.log(`📊 Total articles: ${articles.length}`);
            console.log('✅ Database cleaned and verified');

        } catch (error: any) {
            console.log(`❌ Error in verification: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    try {
        console.log('🧹 DATABASE CLEANER');
        console.log('Available flags:');
        console.log('  --fix-duplicates: Remove duplicate articles');
        console.log('  --fix-sources: Fix data_source field to show API source');
        console.log('');

        const cleaner = new DatabaseCleaner();
        await cleaner.checkAndFix();
        
    } catch (error: any) {
        console.error('❌ Database cleaning failed:', error.message);
    }
}

main();
