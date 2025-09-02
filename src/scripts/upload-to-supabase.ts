#!/usr/bin/env npx tsx

/**
 * Upload collected articles to Supabase database
 */

import { config } from 'dotenv';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

config();

class SupabaseUploader {
    private supabaseUrl: string;
    private supabaseKey: string;

    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL || '';
        this.supabaseKey = process.env.SUPABASE_ANON_KEY || '';

        if (!this.supabaseUrl || !this.supabaseKey) {
            console.log('❌ Supabase credentials missing!');
            console.log('Add to your .env file:');
            console.log('SUPABASE_URL=your_supabase_project_url');
            console.log('SUPABASE_ANON_KEY=your_supabase_anon_key');
            throw new Error('Supabase credentials required');
        }
    }

    /**
     * Upload articles from JSON file to Supabase
     */
    async uploadArticlesFromFile(filename: string): Promise<void> {
        console.log('📤 Uploading Articles to Supabase');
        console.log('='.repeat(50));

        // Read the JSON file
        const filepath = path.join(process.cwd(), 'data', filename);

        try {
            const fileContent = await fs.readFile(filepath, 'utf-8');
            const articles = JSON.parse(fileContent);

            console.log(`📄 Loaded ${articles.length} articles from ${filename}`);

            // Show sample article structure
            if (articles.length > 0) {
                console.log('\n📰 Sample Article:');
                const sample = articles[0];
                console.log(`   Title: ${sample.title}`);
                console.log(`   Source: ${sample.source}`);
                console.log(`   Published: ${sample.published_at}`);
                console.log(`   Content: ${sample.body ? `${sample.body.length} chars` : 'No content'}`);
                console.log(`   Keywords: ${sample.keywords ? sample.keywords.length : 0} keywords`);
            }

            // Upload to Supabase
            await this.uploadToSupabase(articles);

        } catch (error: any) {
            console.log(`❌ Failed to read file: ${error.message}`);
        }
    }

    /**
     * Upload articles to Supabase database
     */
    private async uploadToSupabase(articles: any[]): Promise<void> {
        console.log('\n🔗 Uploading to Supabase...');

        try {
            // Test connection first
            const testResponse = await axios.get(
                `${this.supabaseUrl}/rest/v1/articles?select=count`,
                {
                    headers: {
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`
                    },
                    timeout: 10000
                }
            );

            console.log('✅ Supabase connection successful');

            // Upload articles in batches
            const batchSize = 10;
            let uploadedCount = 0;
            let errorCount = 0;

            for (let i = 0; i < articles.length; i += batchSize) {
                const batch = articles.slice(i, i + batchSize);
                console.log(`\n📦 Uploading batch ${Math.floor(i / batchSize) + 1} (${batch.length} articles)...`);

                try {
                    const response = await axios.post(
                        `${this.supabaseUrl}/rest/v1/articles`,
                        batch,
                        {
                            headers: {
                                'apikey': this.supabaseKey,
                                'Authorization': `Bearer ${this.supabaseKey}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'resolution=merge-duplicates'
                            },
                            timeout: 30000
                        }
                    );

                    uploadedCount += batch.length;
                    console.log(`   ✅ Uploaded ${batch.length} articles`);

                    // Show sample titles
                    batch.slice(0, 2).forEach(article => {
                        console.log(`      • "${article.title.substring(0, 60)}..."`);
                    });

                    // Rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (batchError: any) {
                    errorCount += batch.length;
                    console.log(`   ❌ Batch failed: ${batchError.message}`);

                    if (batchError.response?.data) {
                        console.log(`      Error details:`, batchError.response.data);
                    }
                }
            }

            console.log('\n📊 Upload Summary:');
            console.log(`   ✅ Successfully uploaded: ${uploadedCount} articles`);
            console.log(`   ❌ Failed uploads: ${errorCount} articles`);
            console.log(`   📊 Success rate: ${Math.round((uploadedCount / articles.length) * 100)}%`);

            if (uploadedCount > 0) {
                console.log('\n🎉 Articles are now in your Supabase database!');
                console.log('🔍 Check your Supabase dashboard > articles table to see them');
                console.log('🚀 Ready for AI processing and ML training');
            }

        } catch (error: any) {
            console.log(`❌ Supabase upload failed: ${error.message}`);

            if (error.response?.status === 401) {
                console.log('💡 Check your SUPABASE_ANON_KEY - it might be incorrect');
            } else if (error.response?.status === 404) {
                console.log('💡 Check your SUPABASE_URL - it might be incorrect');
            } else if (error.response?.data) {
                console.log('📋 Error details:', error.response.data);
            }
        }
    }

    /**
     * Check what's currently in the database
     */
    async checkDatabase(): Promise<void> {
        console.log('🔍 Checking Supabase Database');
        console.log('='.repeat(50));

        try {
            // Get article count
            const countResponse = await axios.get(
                `${this.supabaseUrl}/rest/v1/articles?select=count`,
                {
                    headers: {
                        'apikey': this.supabaseKey,
                        'Authorization': `Bearer ${this.supabaseKey}`
                    }
                }
            );

            const count = countResponse.data?.[0]?.count || 0;
            console.log(`📊 Current articles in database: ${count}`);

            if (count > 0) {
                // Get sample articles
                const sampleResponse = await axios.get(
                    `${this.supabaseUrl}/rest/v1/articles?select=title,source,published_at,data_source&limit=5&order=created_at.desc`,
                    {
                        headers: {
                            'apikey': this.supabaseKey,
                            'Authorization': `Bearer ${this.supabaseKey}`
                        }
                    }
                );

                const samples = sampleResponse.data || [];
                console.log('\n📰 Recent Articles:');
                samples.forEach((article: any, i: number) => {
                    console.log(`   ${i + 1}. "${article.title}"`);
                    console.log(`      Source: ${article.source} | Published: ${article.published_at?.split('T')[0]} | From: ${article.data_source}`);
                });
            }

        } catch (error: any) {
            console.log(`❌ Database check failed: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    const action = process.argv[2] || 'upload';
    const filename = process.argv[3] || 'articles_2025-09-02.json';

    try {
        const uploader = new SupabaseUploader();

        if (action === 'check') {
            await uploader.checkDatabase();
        } else if (action === 'upload') {
            await uploader.uploadArticlesFromFile(filename);
        } else {
            console.log('Usage:');
            console.log('  Upload articles: npx tsx src/scripts/upload-to-supabase.ts upload articles_2025-09-02.json');
            console.log('  Check database:  npx tsx src/scripts/upload-to-supabase.ts check');
        }

    } catch (error: any) {
        console.error('❌ Operation failed:', error.message);
    }
}

main();
