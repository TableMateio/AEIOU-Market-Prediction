/**
 * Enhanced Pipeline Service with Duplicate Detection and Processing Results
 */

import ArticleScraper from './articleScraper';
import ArticleProcessingPipeline, { ArticleContent, ProcessedArticle } from './articleProcessingPipeline';
import Airtable from 'airtable';
import { v4 as uuidv4 } from 'uuid';

export interface EnhancedProcessingOptions {
    forceReprocess?: boolean;
    processingType?: 'Full Pipeline' | 'Pass 1 Only' | 'Pass 2 Only' | 'Pass 3 Only' | 'Reprocessing';
    humanReviewRequired?: boolean;
}

export interface ArticleIdentifier {
    title: string;
    publishedTime: Date;
    source: string;
}

export class EnhancedPipelineService {
    private scraper: ArticleScraper;
    private pipeline: ArticleProcessingPipeline;
    private base: any;

    constructor(openaiKey: string, anthropicKey: string, airtableKey: string, baseId: string) {
        this.scraper = new ArticleScraper();
        this.pipeline = new ArticleProcessingPipeline(openaiKey, anthropicKey);

        const airtable = new Airtable({ apiKey: airtableKey });
        this.base = airtable.base(baseId);
    }

    /**
     * Process article with duplicate detection and result tracking
     */
    async processArticleWithTracking(
        articleData: {
            url: string;
            title: string;
            summary: string;
            publishedTime: Date;
            source: string;
            authors: string[];
        },
        options: EnhancedProcessingOptions = {}
    ) {
        const processingId = uuidv4();
        const startTime = Date.now();

        console.log(`🔄 Starting Enhanced Processing: ${processingId}`);
        console.log(`📰 Article: "${articleData.title.substring(0, 50)}..."`);

        try {
            // Step 1: Check for existing article
            console.log("\n🔍 Step 1: Checking for duplicates...");
            const existingArticle = await this.findExistingArticle({
                title: articleData.title,
                publishedTime: articleData.publishedTime,
                source: articleData.source
            });

            let articleRecord;
            let isUpdate = false;

            if (existingArticle && !options.forceReprocess) {
                console.log(`✅ Found existing article: ${existingArticle.id}`);
                console.log(`🔄 Updating existing record instead of creating duplicate`);
                articleRecord = existingArticle;
                isUpdate = true;
            } else {
                console.log("📝 No duplicate found, will create new article record");
            }

            // Step 2: Scrape content
            console.log("\n📄 Step 2: Scraping article content...");
            const scrapedArticle = await this.scraper.scrapeArticle(
                articleData.url,
                articleData.title,
                articleData.summary,
                articleData.publishedTime,
                articleData.source,
                articleData.authors
            );

            console.log(`✅ Scraped ${scrapedArticle.fullText.length} characters`);

            // Step 3: AI Processing
            console.log("\n🧠 Step 3: AI Pipeline Processing...");
            const processedArticle = await this.pipeline.processArticle(scrapedArticle);
            const processingTime = Date.now() - startTime;

            console.log(`✅ AI processing completed in ${processingTime}ms`);

            // Step 4: Store/Update Article
            console.log("\n💾 Step 4: Storing article data...");

            if (isUpdate && articleRecord) {
                // Update existing article
                const updatedRecord = await this.base('Articles').update(articleRecord.id, {
                    'Body': scrapedArticle.fullText,
                    'Raw AV Data (JSON)': JSON.stringify({
                        lastProcessed: new Date().toISOString(),
                        processingId: processingId,
                        pass1: processedArticle.pass1,
                        pass2: processedArticle.pass2,
                        pass3: processedArticle.pass3
                    }, null, 2)
                });
                console.log(`✅ Updated existing article: ${updatedRecord.id}`);
                articleRecord = updatedRecord;
            } else {
                // Create new article
                const newRecord = await this.base('Articles').create({
                    'Title': scrapedArticle.title,
                    'Summary': scrapedArticle.summary,
                    'URL': scrapedArticle.url,
                    'Published Time': scrapedArticle.publishedTime.toISOString(),
                    'Body': scrapedArticle.fullText,
                    'AV Overall Sentiment Score': 0.244, // Placeholder
                    'AV Overall Sentiment': 'Somewhat-Bullish',
                    'Raw AV Data (JSON)': JSON.stringify({
                        processingId: processingId,
                        pass1: processedArticle.pass1,
                        pass2: processedArticle.pass2,
                        pass3: processedArticle.pass3
                    }, null, 2)
                });
                console.log(`✅ Created new article: ${newRecord.id}`);
                articleRecord = newRecord;
            }

            // Step 5: Create Processing Results Record
            console.log("\n📊 Step 5: Creating processing results record...");

            const processingResultRecord = await this.base('Processing Results').create({
                'Processing ID': processingId,
                'Article Link': [articleRecord.id],
                'Processing Date': new Date().toISOString(),
                'Processing Type': options.processingType || 'Full Pipeline',
                'AI Models Used': ['GPT-3.5-turbo', 'GPT-4', 'Claude-3.5-Sonnet'],
                'Processing Time (seconds)': Math.round(processingTime / 1000 * 10) / 10,
                'Total Cost': processedArticle.totalCost,

                // Pass 1 Results
                'Events Identified': processedArticle.pass1.eventsIdentified,
                'Article Type': processedArticle.pass1.articleType,
                'Overall Tone': processedArticle.pass1.overallTone,
                'Pass 1 Raw Results (JSON)': JSON.stringify(processedArticle.pass1, null, 2),

                // Pass 2 Results
                'Business Steps from Article': processedArticle.pass2.businessStepsFromArticle?.length || 0,
                'Our Business Predictions': processedArticle.pass2.ourBusinessPredictions?.length || 0,
                'Risk Factors Count': processedArticle.pass2.riskFactors?.length || 0,
                'Opportunity Factors Count': processedArticle.pass2.opportunityFactors?.length || 0,
                'Pass 2 Raw Results (JSON)': JSON.stringify(processedArticle.pass2, null, 2),

                // Pass 3 Results
                'Market Impact Score': processedArticle.pass3.marketImpactScore,
                'Overall Confidence': processedArticle.pass3.confidenceMatrix.overall,
                'Intensity Belief': processedArticle.pass3.beliefFactors.intensity_belief,
                'Duration Belief': processedArticle.pass3.beliefFactors.duration_belief,
                'Hope vs Fear': processedArticle.pass3.beliefFactors.hope_vs_fear,
                'Clarity Score': processedArticle.pass3.beliefFactors.clarity_score,
                'Pass 3 Raw Results (JSON)': JSON.stringify(processedArticle.pass3, null, 2),

                // Human Review
                'Human Review Status': options.humanReviewRequired ? 'pending' : 'reviewed',
                'Prompt Versions': JSON.stringify({
                    pass1_model: 'gpt-3.5-turbo',
                    pass2_model: 'gpt-4',
                    pass3_model: 'claude-3.5-sonnet',
                    timestamp: new Date().toISOString()
                }, null, 2)
            });

            console.log(`✅ Processing results recorded: ${processingResultRecord.id}`);

            // Step 6: Display Human-Readable Summary
            console.log("\n📋 PROCESSING SUMMARY");
            console.log("=".repeat(50));
            this.displayProcessingSummary(processedArticle, processingId, isUpdate);

            return {
                processingId,
                articleRecord,
                processingResultRecord,
                processedData: processedArticle,
                isUpdate,
                processingTime
            };

        } catch (error) {
            // Log error to Processing Results if possible
            try {
                await this.base('Processing Results').create({
                    'Processing ID': processingId,
                    'Processing Date': new Date().toISOString(),
                    'Processing Type': options.processingType || 'Full Pipeline',
                    'Error Messages': error.message,
                    'Human Review Status': 'needs_revision',
                    'Needs Reprocessing': true
                });
            } catch (logError) {
                console.error("Failed to log error:", logError.message);
            }

            throw new Error(`Enhanced processing failed: ${error.message}`);
        }
    }

    /**
     * Find existing article by title, publish time, and source
     */
    private async findExistingArticle(identifier: ArticleIdentifier): Promise<any> {
        try {
            const records = await this.base('Articles').select({
                filterByFormula: `AND(
          {Title} = '${identifier.title.replace(/'/g, "\\'")}',
          {Source} = '${identifier.source}'
        )`
            }).firstPage();

            // Check if any record has the same publish date (within 1 hour tolerance)
            for (const record of records) {
                const recordTime = new Date(record.fields['Published Time']);
                const timeDiff = Math.abs(recordTime.getTime() - identifier.publishedTime.getTime());

                if (timeDiff < 60 * 60 * 1000) { // 1 hour tolerance
                    return record;
                }
            }

            return null;
        } catch (error) {
            console.warn("Error checking for duplicates:", error.message);
            return null;
        }
    }

    /**
     * Display human-readable processing summary
     */
    private displayProcessingSummary(processedArticle: ProcessedArticle, processingId: string, isUpdate: boolean) {
        console.log(`🆔 Processing ID: ${processingId}`);
        console.log(`📄 Article: ${isUpdate ? 'UPDATED' : 'NEW'}`);
        console.log(`⏱️  Processing Time: ${processedArticle.processingTime}ms`);
        console.log(`💰 Cost: $${processedArticle.totalCost.toFixed(4)}`);
        console.log("");

        console.log("🎯 EVENTS IDENTIFIED:");
        processedArticle.pass1.events.forEach((event, i) => {
            console.log(`   ${i + 1}. "${event.eventTitle}"`);
            console.log(`      Type: ${event.eventType} | Confidence: ${event.confidence.toFixed(2)} | Relevance: ${event.relevanceToStock.toFixed(2)}`);
        });

        console.log("\n🧠 BUSINESS ANALYSIS:");
        console.log(`   • Article mentioned: ${processedArticle.pass2.businessStepsFromArticle?.length || 0} business steps`);
        console.log(`   • Our predictions: ${processedArticle.pass2.ourBusinessPredictions?.length || 0} business steps`);
        console.log(`   • Risk factors: ${processedArticle.pass2.riskFactors?.length || 0}`);
        console.log(`   • Opportunities: ${processedArticle.pass2.opportunityFactors?.length || 0}`);

        console.log("\n💭 BELIEF ANALYSIS:");
        console.log(`   • Market Impact: ${processedArticle.pass3.marketImpactScore.toFixed(3)}`);
        console.log(`   • Overall Confidence: ${processedArticle.pass3.confidenceMatrix.overall.toFixed(3)}`);
        console.log(`   • Investor Intensity: ${processedArticle.pass3.beliefFactors.intensity_belief.toFixed(2)}`);
        console.log(`   • Duration Belief: ${processedArticle.pass3.beliefFactors.duration_belief.toFixed(2)}`);
        console.log(`   • Hope vs Fear: ${processedArticle.pass3.beliefFactors.hope_vs_fear.toFixed(2)}`);
        console.log(`   • Clarity Score: ${processedArticle.pass3.beliefFactors.clarity_score.toFixed(2)}`);

        console.log("\n✅ Results stored in Airtable 'Processing Results' table for review");
        console.log("📋 Check Airtable to review AI analysis quality and approve/reject");
    }

    /**
     * Batch process multiple articles
     */
    async batchProcessArticles(
        articles: Array<{
            url: string;
            title: string;
            summary: string;
            publishedTime: Date;
            source: string;
            authors: string[];
        }>,
        options: EnhancedProcessingOptions = {}
    ) {
        console.log(`🔄 BATCH PROCESSING ${articles.length} ARTICLES`);
        console.log("=".repeat(60));

        const results = [];
        let totalCost = 0;
        let duplicatesSkipped = 0;

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`\n📰 Article ${i + 1}/${articles.length}: ${article.title.substring(0, 50)}...`);

            try {
                const result = await this.processArticleWithTracking(article, options);
                results.push(result);
                totalCost += result.processedData.totalCost;

                if (result.isUpdate) {
                    duplicatesSkipped++;
                }

                // Rate limiting between articles
                if (i < articles.length - 1) {
                    console.log("⏳ Waiting 2 seconds before next article...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                console.error(`❌ Failed to process article ${i + 1}: ${error.message}`);
                results.push({ error: error.message, article });
            }
        }

        console.log("\n🎉 BATCH PROCESSING COMPLETE!");
        console.log("=".repeat(60));
        console.log(`✅ Successfully processed: ${results.filter(r => !r.error).length}/${articles.length}`);
        console.log(`🔄 Duplicates updated: ${duplicatesSkipped}`);
        console.log(`💰 Total cost: $${totalCost.toFixed(4)}`);
        console.log(`📊 Average cost per article: $${(totalCost / results.filter(r => !r.error).length).toFixed(4)}`);

        return results;
    }
}

export default EnhancedPipelineService;

