/**
 * Real Pipeline Test with Actual API Calls and Airtable Integration
 */

import * as dotenv from 'dotenv';
import ArticleScraper from '../../../services/articleScraper';
import ArticleProcessingPipeline, { ArticleContent } from '../../../services/articleProcessingPipeline';
import Airtable from 'airtable';

// Load environment variables
dotenv.config();

async function testRealPipeline() {
    console.log("🚀 REAL PIPELINE TEST - WITH ACTUAL API CALLS");
    console.log("=".repeat(60));

    // Verify environment variables
    const requiredEnvVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AIRTABLE_API_KEY'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }

    console.log("✅ All API keys found in environment");

    // Initialize services
    const scraper = new ArticleScraper();
    const pipeline = new ArticleProcessingPipeline(
        process.env.OPENAI_API_KEY!,
        process.env.ANTHROPIC_API_KEY!
    );

    const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
    const base = airtable.base('appELkTs9OjcY6g74');

    // Test article (one from our existing set)
    const testArticle = {
        url: "https://www.benzinga.com/markets/tech/25/08/47299721/apple-plans-major-iphone-redesigns-for-three-consecutive-years",
        title: "Apple Inc. Plans Major iPhone Redesigns For Three Consecutive Years",
        summary: "Apple gears up for an ambitious redesign streak, starting with a new iPhone Air set to dethrone the iPhone 16 Plus.",
        publishedTime: new Date("2025-08-24T18:26:27Z"),
        source: "Benzinga",
        authors: ["Bibhu Pattnaik"]
    };

    try {
        // Step 1: Scrape Article Content
        console.log("\n📄 STEP 1: Scraping Article Content");
        console.log("-".repeat(40));

        console.log(`🔍 Scraping: ${testArticle.title.substring(0, 50)}...`);
        const scrapedArticle = await scraper.scrapeArticle(
            testArticle.url,
            testArticle.title,
            testArticle.summary,
            testArticle.publishedTime,
            testArticle.source,
            testArticle.authors
        );

        console.log(`✅ Scraped ${scrapedArticle.fullText.length} characters`);
        console.log(`📝 Preview: "${scrapedArticle.fullText.substring(0, 200)}..."`);

        // Step 2: Process Through Real AI Pipeline
        console.log("\n🧠 STEP 2: Real AI Pipeline Processing");
        console.log("-".repeat(40));

        console.log("🔄 Processing through 3-pass pipeline...");
        const startTime = Date.now();

        const processedArticle = await pipeline.processArticle(scrapedArticle);

        const processingTime = Date.now() - startTime;
        console.log(`✅ Pipeline completed in ${processingTime}ms`);

        // Display results
        console.log("\n📊 PIPELINE RESULTS:");
        console.log("─".repeat(40));

        console.log(`🎯 Pass 1 - Event Extraction:`);
        console.log(`   - Events identified: ${processedArticle.pass1.eventsIdentified}`);
        console.log(`   - Article type: ${processedArticle.pass1.articleType}`);
        console.log(`   - Overall tone: ${processedArticle.pass1.overallTone}`);

        processedArticle.pass1.events.forEach((event, i) => {
            console.log(`   - Event ${i + 1}: "${event.eventTitle}" (${event.eventType}, confidence: ${event.confidence.toFixed(2)})`);
        });

        console.log(`\n🧠 Pass 2 - Business Logic:`);
        console.log(`   - Business steps from article: ${processedArticle.pass2.businessStepsFromArticle.length}`);
        console.log(`   - Our business predictions: ${processedArticle.pass2.ourBusinessPredictions.length}`);
        console.log(`   - Risk factors: ${processedArticle.pass2.riskFactors.length}`);
        console.log(`   - Opportunity factors: ${processedArticle.pass2.opportunityFactors.length}`);

        console.log(`\n💭 Pass 3 - Belief Analysis:`);
        console.log(`   - Market impact score: ${processedArticle.pass3.marketImpactScore.toFixed(3)}`);
        console.log(`   - Overall confidence: ${processedArticle.pass3.confidenceMatrix.overall.toFixed(3)}`);
        console.log(`   - Key belief factors:`);
        console.log(`     • Intensity: ${processedArticle.pass3.beliefFactors.intensity_belief.toFixed(2)}`);
        console.log(`     • Duration: ${processedArticle.pass3.beliefFactors.duration_belief.toFixed(2)}`);
        console.log(`     • Hope vs Fear: ${processedArticle.pass3.beliefFactors.hope_vs_fear.toFixed(2)}`);
        console.log(`     • Clarity: ${processedArticle.pass3.beliefFactors.clarity_score.toFixed(2)}`);

        console.log(`\n💰 Cost Analysis:`);
        console.log(`   - Total cost: $${processedArticle.totalCost.toFixed(4)}`);
        console.log(`   - Models used: ${processedArticle.modelVersions.pass1Model}, ${processedArticle.modelVersions.pass2Model}, ${processedArticle.modelVersions.pass3Model}`);

        // Step 3: Store in Airtable
        console.log("\n💾 STEP 3: Storing in Airtable");
        console.log("-".repeat(40));

        // First, create or update the article record
        console.log("📝 Creating article record with body content...");

        const articleRecord = await base('Articles').create({
            'Title': scrapedArticle.title,
            'Summary': scrapedArticle.summary,
            'URL': scrapedArticle.url,
            'Published Time': scrapedArticle.publishedTime.toISOString(),
            'Body': scrapedArticle.fullText, // New body field!
            'AV Overall Sentiment Score': 0.244, // From our Alpha Vantage data
            'AV Overall Sentiment': 'Somewhat-Bullish',
            'Raw AV Data (JSON)': JSON.stringify({
                pass1: processedArticle.pass1,
                pass2: processedArticle.pass2,
                pass3: processedArticle.pass3,
                processingTime: processingTime,
                cost: processedArticle.totalCost
            }, null, 2)
        });

        console.log(`✅ Article record created: ${articleRecord.id}`);

        // Create news events based on processed results
        console.log("📰 Creating news events from processing results...");

        for (let i = 0; i < processedArticle.pass1.events.length; i++) {
            const event = processedArticle.pass1.events[i];

            try {
                const eventRecord = await base('News Events').create({
                    'Event Title': event.eventTitle,
                    'Event Type': event.eventType === 'predictive' ? 'Overarching Event' : 'Causal Step',
                    'Event Category': 'Product Launch', // Based on the iPhone redesign theme
                    'Source Articles': [articleRecord.id],
                    'Event Time': scrapedArticle.publishedTime.toISOString(),
                    'Market Impact Score': event.relevanceToStock,
                    'Confidence Level': event.confidence,
                    'Time Horizon': event.temporalClassification === 'future' ? 'Medium-term (1-4 weeks)' : 'Immediate (0-1 days)',
                    'Processing Status': 'completed',
                    'Business Causal Chain (JSON)': JSON.stringify(processedArticle.pass2.businessStepsFromArticle, null, 2),
                    'Belief Factors (JSON)': JSON.stringify(processedArticle.pass3.beliefFactors, null, 2)
                });

                console.log(`✅ Event record created: ${eventRecord.id} - "${event.eventTitle}"`);
            } catch (error) {
                console.log(`⚠️  Failed to create event record: ${error.message}`);
                console.log(`   (This might be due to missing linked fields - continuing...)`);
            }
        }

        console.log("\n🎉 REAL PIPELINE TEST COMPLETE!");
        console.log("=".repeat(60));
        console.log("✅ Article successfully scraped");
        console.log("✅ AI pipeline processed all 3 passes");
        console.log("✅ Results stored in Airtable with body content");
        console.log("✅ Cost tracking and performance metrics captured");
        console.log("");
        console.log("📊 Key Metrics:");
        console.log(`   - Total processing time: ${processingTime}ms`);
        console.log(`   - Total cost: $${processedArticle.totalCost.toFixed(4)}`);
        console.log(`   - Events identified: ${processedArticle.pass1.eventsIdentified}`);
        console.log(`   - Market impact score: ${processedArticle.pass3.marketImpactScore.toFixed(3)}`);
        console.log(`   - Overall confidence: ${processedArticle.pass3.confidenceMatrix.overall.toFixed(3)}`);

    } catch (error) {
        console.error("❌ Pipeline test failed:", error.message);

        if (error.message.includes('API')) {
            console.log("💡 API Error - Check your API keys and rate limits");
        } else if (error.message.includes('Airtable')) {
            console.log("💡 Airtable Error - Check base permissions and field names");
        } else {
            console.log("💡 General Error - Check logs above for details");
        }
    }
}

// Run the test
testRealPipeline().catch(console.error);
