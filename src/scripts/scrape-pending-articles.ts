#!/usr/bin/env npx tsx

import { DatabaseFactory } from '../data/storage/databaseFactory';
import { ArticleScraper } from '../services/articleScraper';
import { logger } from '../utils/logger';

/**
 * Scrape all pending articles that haven't been scraped yet
 */
async function scrapePendingArticles() {
    try {
        logger.info('🕷️ Starting pending article scraping...');

        const db = DatabaseFactory.create();
        const scraper = new ArticleScraper();

        // Get all pending articles
        const pendingArticles = await db.getArticles({
            filters: { scraping_status: 'pending' },
            limit: 50 // Get up to 50 pending articles
        });

        logger.info(`📋 Found ${pendingArticles.length} pending articles to scrape`);

        if (pendingArticles.length === 0) {
            logger.info('✅ No pending articles found - all done!');
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;

        for (const [index, article] of pendingArticles.entries()) {
            const progress = Math.round(((index + 1) / pendingArticles.length) * 100);

            logger.info(`\n📰 [${index + 1}/${pendingArticles.length}] (${progress}%) Processing: ${article.title.substring(0, 60)}...`);
            logger.info(`🔗 URL: ${article.url}`);

            // Skip Finnhub API URLs
            if (article.url.includes('finnhub.io/api/news')) {
                logger.info('⏭️ Skipping Finnhub API URL (not scrapeable)');

                // Mark as no_content
                await db.upsertArticle({
                    ...article,
                    scraping_status: 'no_content' as any,
                    updated_at: new Date().toISOString()
                });

                skipCount++;
                continue;
            }

            try {
                // Scrape the article
                logger.info('🔍 Scraping content...');
                const scrapedContent = await scraper.scrapeContent(article.url);

                if (scrapedContent && scrapedContent.length > 200) {
                    // Update with scraped content
                    await db.upsertArticle({
                        ...article,
                        body: scrapedContent,
                        scraping_status: 'scraped' as any,
                        updated_at: new Date().toISOString()
                    });

                    logger.info(`✅ Success! Content length: ${scrapedContent.length} characters`);
                    logger.info(`📝 Preview: ${scrapedContent.substring(0, 100)}...`);
                    successCount++;

                } else {
                    // Mark as failed
                    await db.upsertArticle({
                        ...article,
                        scraping_status: 'failed' as any,
                        updated_at: new Date().toISOString()
                    });

                    logger.warn(`❌ Failed - content too short or empty (${scrapedContent?.length || 0} chars)`);
                    errorCount++;
                }

                // Rate limiting - wait between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error: any) {
                logger.error(`❌ Error scraping article: ${error.message}`);

                // Mark as failed
                await db.upsertArticle({
                    ...article,
                    scraping_status: 'failed' as any,
                    updated_at: new Date().toISOString()
                });

                errorCount++;
            }
        }

        // Summary
        logger.info('\n📊 SCRAPING SUMMARY');
        logger.info('==================================================');
        logger.info(`✅ Successfully scraped: ${successCount}`);
        logger.info(`⏭️ Skipped (API URLs): ${skipCount}`);
        logger.info(`❌ Failed: ${errorCount}`);
        logger.info(`📊 Total processed: ${pendingArticles.length}`);

        if (successCount > 0) {
            logger.info(`📏 Average content length: ${successCount} articles scraped`);
            logger.info('\n🎯 Ready for AI analysis!');
        }

    } catch (error) {
        logger.error('💥 Fatal error in pending article scraping:', error);
        process.exit(1);
    }
}

// Run the scraper
if (require.main === module) {
    scrapePendingArticles()
        .then(() => {
            logger.info('🎉 Pending article scraping completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('💥 Fatal error:', error);
            process.exit(1);
        });
}
