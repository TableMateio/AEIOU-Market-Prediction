#!/usr/bin/env npx tsx

import { logger } from '../utils/logger';
import { ArticleScraper } from '../services/articleScraper';

/**
 * Simple script to scrape pending articles using direct SQL
 */
async function scrapePendingArticles() {
    try {
        logger.info('🕷️ Starting simple pending article scraping...');

        const scraper = new ArticleScraper();

        // Get pending articles using MCP (we'll import this directly in the script)
        const { mcp_supabase_execute_sql } = await import('../../../mcp_supabase');

        // Query for pending articles
        const result = await mcp_supabase_execute_sql({
            query: `SELECT id, title, url, source 
              FROM articles 
              WHERE scraping_status = 'pending' 
              AND url NOT LIKE '%finnhub.io%'
              LIMIT 10`
        });

        const pendingArticles = JSON.parse(result);
        logger.info(`📋 Found ${pendingArticles.length} pending articles to scrape`);

        for (const [index, article] of pendingArticles.entries()) {
            logger.info(`\n📰 [${index + 1}/${pendingArticles.length}] ${article.title.substring(0, 60)}...`);
            logger.info(`🔗 ${article.url}`);

            try {
                logger.info('🔍 Scraping content...');
                const content = await scraper.scrapeContent(article.url);

                if (content && content.length > 200) {
                    // Update with scraped content
                    await mcp_supabase_execute_sql({
                        query: `UPDATE articles 
                    SET body = $1, 
                        scraping_status = 'scraped', 
                        updated_at = NOW()
                    WHERE id = $2`,
                        params: [content, article.id]
                    });

                    logger.info(`✅ Success! Content length: ${content.length} characters`);
                } else {
                    logger.warn(`❌ Failed - content too short: ${content?.length || 0} chars`);

                    await mcp_supabase_execute_sql({
                        query: `UPDATE articles 
                    SET scraping_status = 'failed', 
                        updated_at = NOW()
                    WHERE id = $1`,
                        params: [article.id]
                    });
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (error: any) {
                logger.error(`❌ Error: ${error.message}`);

                await mcp_supabase_execute_sql({
                    query: `UPDATE articles 
                  SET scraping_status = 'failed', 
                      updated_at = NOW()
                  WHERE id = $1`,
                    params: [article.id]
                });
            }
        }

        logger.info('\n🎉 Scraping completed!');

    } catch (error) {
        logger.error('💥 Fatal error:', error);
    }
}

// Run if directly executed
if (require.main === module) {
    scrapePendingArticles();
}
