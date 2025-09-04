/**
 * Update Processing Status Script
 * 
 * Updates articles.processing_status based on business_events_ai responses
 * Marks articles as 'completed' if they have been processed by AI
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger';
import { AppConfig } from '../../config/app';

const logger = createLogger('UpdateProcessingStatus');

class ProcessingStatusUpdater {
    private supabase: any;

    constructor() {
        const appConfig = AppConfig.getInstance();
        this.supabase = createClient(
            appConfig.supabaseConfig.projectUrl,
            appConfig.supabaseConfig.apiKey
        );
    }

    async updateProcessingStatus() {
        logger.info('🔄 Starting processing status update...');

        try {
            // Use direct SQL UPDATE with JOIN to mark processed articles as completed
            const updateQuery = `
                UPDATE articles 
                SET processing_status = 'completed'
                WHERE id IN (
                    SELECT DISTINCT article_id 
                    FROM business_events_ai 
                    WHERE success = true
                )
                AND processing_status != 'completed'
            `;

            const { data: updateResult, error: updateError } = await this.supabase.rpc('exec_sql', {
                sql_query: updateQuery
            });

            if (updateError) {
                // Fallback to direct SQL execution if RPC doesn't exist
                logger.info('📝 Using direct SQL execution...');

                const { error: directError } = await this.supabase
                    .from('articles')
                    .update({ processing_status: 'completed' })
                    .in('id', this.supabase.from('business_events_ai').select('article_id').eq('success', true));

                if (directError) {
                    throw new Error(`Failed to update processing status: ${directError.message}`);
                }
            }

            // Get count of processed articles for reporting
            const { data: processedCount, error: countError } = await this.supabase
                .from('business_events_ai')
                .select('article_id', { count: 'exact', head: true })
                .eq('success', true);

            const uniqueProcessedCount = processedCount || 0;
            logger.info(`✅ Updated articles to 'completed' status based on ${uniqueProcessedCount} processed articles`);

            // Get summary of current status
            const { data: statusSummary, error: summaryError } = await this.supabase
                .from('articles')
                .select('processing_status')
                .not('body', 'is', null)
                .gte('body', 'length', 100);

            if (!summaryError) {
                const summary = statusSummary.reduce((acc: any, article: any) => {
                    acc[article.processing_status] = (acc[article.processing_status] || 0) + 1;
                    return acc;
                }, {});

                logger.info('📊 Processing status summary:', summary);
            }

            return {
                processedCount: processedIds.length,
                updatedCount: updateResult?.length || 0
            };

        } catch (error: any) {
            logger.error('❌ Failed to update processing status:', error.message);
            throw error;
        }
    }

    async getUnprocessedArticles(limit?: number, offset?: number) {
        logger.info('🔍 Fetching unprocessed articles...');

        let query = this.supabase
            .from('articles')
            .select('id, title, body, url, source, authors, published_at')
            .eq('processing_status', 'pending')
            .not('body', 'is', null)
            .gte('body', 'length', 100)
            .order('published_at', { ascending: false });

        if (offset) {
            const endRange = offset + (limit || 1000000) - 1;
            query = query.range(offset, endRange);
        } else if (limit) {
            query = query.limit(limit);
        }

        const { data: articles, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch unprocessed articles: ${error.message}`);
        }

        logger.info(`📊 Found ${articles?.length || 0} unprocessed articles`);
        return articles || [];
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);

    const options = {
        update: false,
        list: false,
        limit: 0,
        offset: 0
    };

    for (const arg of args) {
        if (arg === '--update') options.update = true;
        if (arg === '--list') options.list = true;
        if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1]);
        if (arg.startsWith('--offset=')) options.offset = parseInt(arg.split('=')[1]);
    }

    return options;
}

// Main execution
async function main() {
    try {
        const options = parseArgs();
        const updater = new ProcessingStatusUpdater();

        if (options.update) {
            const result = await updater.updateProcessingStatus();
            logger.info(`🎉 Processing status update complete!`);
            logger.info(`📊 ${result.processedCount} processed articles, ${result.updatedCount} updated`);
        }

        if (options.list) {
            const unprocessedArticles = await updater.getUnprocessedArticles(options.limit, options.offset);
            logger.info(`📋 Unprocessed articles: ${unprocessedArticles.length}`);

            if (unprocessedArticles.length > 0) {
                logger.info(`📝 Sample titles:`);
                unprocessedArticles.slice(0, 5).forEach((article: any, index: number) => {
                    logger.info(`  ${index + 1}. ${article.title?.substring(0, 60)}...`);
                });
            }
        }

        if (!options.update && !options.list) {
            console.log('Usage:');
            console.log('  --update    Update processing status based on business_events_ai');
            console.log('  --list      List unprocessed articles');
            console.log('  --limit=N   Limit results (for --list)');
            console.log('  --offset=N  Offset results (for --list)');
            console.log('');
            console.log('Examples:');
            console.log('  npx tsx update-processing-status.ts --update');
            console.log('  npx tsx update-processing-status.ts --list --limit=10');
        }

    } catch (error: any) {
        logger.error('❌ Script failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
