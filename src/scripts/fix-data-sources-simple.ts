#!/usr/bin/env npx tsx

/**
 * Simple script to fix data_source field without adding new columns
 */

import { createClient } from '@supabase/supabase-js';
import { AppConfig } from '../config/app';

class SimpleDataSourceFixer {
    private supabase: any;

    constructor() {
        const config = AppConfig.getInstance();
        this.supabase = createClient(
            config.supabaseConfig.projectUrl,
            config.supabaseConfig.apiKey
        );
    }

    async fix(): Promise<void> {
        console.log('🔧 FIXING DATA SOURCES (SIMPLE VERSION)');
        console.log('='.repeat(50));
        console.log('');

        try {
            // Get all articles with problematic data sources
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('id, data_source, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error fetching articles: ${error.message}`);
                return;
            }

            console.log(`📊 Total articles: ${articles.length}`);
            console.log('');

            // Define mapping rules
            const sourceMapping: Record<string, string> = {
                'newsapi_ai_test': 'newsapi_ai',
                'newsapi_ai_five_test': 'newsapi_ai',
                'newsapi_ai_smart': 'newsapi_ai',
                'newsapi_ai_social_sort': 'newsapi_ai',
                'newsapi_ai_final': 'newsapi_ai',
                'newsapi_ai_weekly': 'newsapi_ai'
            };

            // Count what needs fixing
            const needsFixing = articles.filter(article => sourceMapping[article.data_source]);
            console.log(`🎯 Articles needing fixes: ${needsFixing.length}`);
            
            if (needsFixing.length === 0) {
                console.log('✅ All data sources are already clean!');
                return;
            }

            console.log('');
            console.log('📋 FIXING DATA SOURCES:');

            let fixedCount = 0;

            for (const article of needsFixing) {
                const correctSource = sourceMapping[article.data_source];
                
                if (correctSource) {
                    console.log(`   ${article.data_source} → ${correctSource} (${article.id.substring(0, 8)}...)`);
                    
                    try {
                        const { error: updateError } = await this.supabase
                            .from('articles')
                            .update({
                                data_source: correctSource
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

            console.log('');
            console.log(`✅ Fixed ${fixedCount} data source entries`);

            // Verify results
            await this.verify();

        } catch (error: any) {
            console.log(`❌ Error fixing sources: ${error.message}`);
        }
    }

    /**
     * Verify results after fixes
     */
    private async verify(): Promise<void> {
        console.log('');
        console.log('✅ VERIFICATION');
        console.log('─'.repeat(30));

        try {
            const { data: articles, error } = await this.supabase
                .from('articles')
                .select('data_source')
                .order('created_at', { ascending: false });

            if (error) {
                console.log(`❌ Error verifying: ${error.message}`);
                return;
            }

            // Count by data source
            const sourceGroups = articles.reduce((acc: Record<string, number>, article) => {
                acc[article.data_source] = (acc[article.data_source] || 0) + 1;
                return acc;
            }, {});

            console.log('📊 FINAL DATA SOURCES:');
            Object.entries(sourceGroups).forEach(([source, count]) => {
                const isClean = ['alpha_vantage', 'newsapi_ai', 'polygon', 'finnhub', 'gnews', 'newsapi'].includes(source);
                const status = isClean ? '✅' : '⚠️';
                console.log(`   ${status} ${source}: ${count} articles`);
            });

            console.log('');
            console.log(`📊 Total articles: ${articles.length}`);

            // Check if any problematic sources remain
            const problematicSources = Object.keys(sourceGroups).filter(source => 
                source.includes('_test') || source.includes('_five') || source.includes('_smart')
            );

            if (problematicSources.length === 0) {
                console.log('🎉 All data sources are now clean!');
            } else {
                console.log(`⚠️  Still ${problematicSources.length} problematic sources remaining`);
            }

        } catch (error: any) {
            console.log(`❌ Error in verification: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    try {
        const fixer = new SimpleDataSourceFixer();
        await fixer.fix();
        
    } catch (error: any) {
        console.error('❌ Data source fixing failed:', error.message);
    }
}

main();
