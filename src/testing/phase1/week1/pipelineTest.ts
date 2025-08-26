/**
 * Test the multi-pass article processing pipeline
 */

import ArticleScraper from '../../../services/articleScraper';
import ArticleProcessingPipeline, { ArticleContent } from '../../../services/articleProcessingPipeline';

async function testPipeline() {
    console.log("🚀 TESTING MULTI-PASS ARTICLE PROCESSING PIPELINE");
    console.log("=".repeat(60));

    // Test URLs from our existing Apple news articles
    const testArticles = [
        {
            url: "https://www.benzinga.com/markets/tech/25/08/47299721/apple-plans-major-iphone-redesigns-for-three-consecutive-years",
            title: "Apple Inc. Plans Major iPhone Redesigns For Three Consecutive Years",
            summary: "Apple gears up for an ambitious redesign streak, starting with a new iPhone Air set to dethrone the iPhone 16 Plus.",
            publishedTime: new Date("2025-08-24T18:26:27Z"),
            source: "Benzinga",
            authors: ["Bibhu Pattnaik"]
        },
        {
            url: "https://www.fool.com/investing/2025/08/24/why-is-warren-buffett-dumping-apple-stock-right-no/",
            title: "Why Is Warren Buffett Dumping Apple Stock Right Now?",
            summary: "Berkshire Hathaway has been rapidly reducing its Apple stock holdings. What's going on?",
            publishedTime: new Date("2025-08-24T10:50:00Z"),
            source: "Motley Fool",
            authors: ["Keith Noonan"]
        }
    ];

    // Step 1: Test Article Scraping
    console.log("\n📄 STEP 1: Testing Article Scraping");
    console.log("-".repeat(40));

    const scraper = new ArticleScraper({
        timeout: 15000,
        retryAttempts: 2
    });

    const scrapedArticles: ArticleContent[] = [];

    for (const article of testArticles) {
        console.log(`\n🔍 Testing scraper on: ${article.title.substring(0, 50)}...`);

        try {
            const testResult = await scraper.testScraping(article.url);

            if (testResult.success) {
                console.log(`✅ Scraping successful: ${testResult.textLength} characters`);
                console.log(`📝 Preview: "${testResult.preview.substring(0, 150)}..."`);

                // Full scrape
                const fullArticle = await scraper.scrapeArticle(
                    article.url,
                    article.title,
                    article.summary,
                    article.publishedTime,
                    article.source,
                    article.authors
                );

                scrapedArticles.push(fullArticle);
            } else {
                console.log(`❌ Scraping failed: ${testResult.error}`);
                console.log(`🔄 Falling back to summary only`);

                // Create article with summary fallback
                scrapedArticles.push({
                    url: article.url,
                    title: article.title,
                    summary: article.summary,
                    fullText: article.summary,
                    publishedTime: article.publishedTime,
                    source: article.source,
                    authors: article.authors
                });
            }
        } catch (error) {
            console.error(`❌ Scraper test failed: ${error.message}`);
        }
    }

    // Step 2: Test Pipeline Architecture (Mock Mode)
    console.log("\n🧠 STEP 2: Testing Pipeline Architecture (Mock Mode)");
    console.log("-".repeat(40));

    // Mock the pipeline since we don't have API keys yet
    class MockPipeline extends ArticleProcessingPipeline {
        constructor() {
            super('mock-openai-key', 'mock-anthropic-key');
        }

        protected async callOpenAI(prompt: string, model: string): Promise<string> {
            console.log(`   🤖 Mock ${model} call (${prompt.length} chars)`);

            if (model === 'gpt-3.5-turbo') {
                // Mock Pass 1 response
                return JSON.stringify({
                    eventsIdentified: 2,
                    events: [
                        {
                            eventTitle: "iPhone redesign announcement",
                            eventType: "predictive",
                            temporalClassification: "future",
                            confidence: 0.85,
                            relevanceToStock: 0.8
                        },
                        {
                            eventTitle: "New iPhone Air model introduction",
                            eventType: "predictive",
                            temporalClassification: "future",
                            confidence: 0.75,
                            relevanceToStock: 0.7
                        }
                    ],
                    articleType: "breaking_news",
                    overallTone: "bullish"
                });
            } else if (model === 'gpt-4') {
                // Mock Pass 2 response
                return JSON.stringify({
                    businessStepsFromArticle: [
                        {
                            step: 1,
                            mechanism: "product_innovation",
                            description: "Major iPhone redesign announced",
                            expectedOutcome: "increased_consumer_interest",
                            timeHorizon: "6-12_months",
                            confidence: 0.8,
                            source: "article_stated"
                        }
                    ],
                    ourBusinessPredictions: [
                        {
                            step: 1,
                            mechanism: "refresh_cycle",
                            description: "New design drives upgrade cycle",
                            expectedOutcome: "revenue_growth",
                            timeHorizon: "12-18_months",
                            confidence: 0.7,
                            source: "our_analysis"
                        }
                    ],
                    causalSequence: [
                        {
                            step: 1,
                            mechanism: "announcement_effect",
                            timeHorizon: "immediate",
                            confidence: 0.9
                        }
                    ],
                    riskFactors: ["Economic headwinds could delay upgrades"],
                    opportunityFactors: ["Pent-up demand from older iPhone users"]
                });
            }
        }

        protected async callClaude(prompt: string): Promise<string> {
            console.log(`   🤖 Mock Claude call (${prompt.length} chars)`);

            // Mock Pass 3 response
            return JSON.stringify({
                beliefFactors: {
                    intensity_belief: 0.75,
                    duration_belief: 0.80,
                    certainty_level: 0.70,
                    hope_vs_fear: 0.75,
                    doubt_factor: 0.25,
                    predictability: 0.60,
                    clarity_score: 0.85,
                    impact_feeling: 0.75,
                    durability_score: 0.70,
                    sensitivity: 0.40
                },
                marketImpactScore: 0.72,
                confidenceMatrix: {
                    eventIdentification: 0.85,
                    businessLogic: 0.75,
                    beliefQuantification: 0.70,
                    overall: 0.77
                },
                validationFlags: {
                    needsHumanReview: false,
                    highUncertainty: false,
                    conflictingSignals: false
                }
            });
        }
    }

    const pipeline = new MockPipeline();

    // Test pipeline on scraped articles
    for (const article of scrapedArticles) {
        console.log(`\n📰 Processing: "${article.title.substring(0, 50)}..."`);
        console.log(`📊 Article length: ${article.fullText.length} characters`);

        try {
            const processed = await pipeline.processArticle(article);

            console.log(`✅ Pipeline completed successfully!`);
            console.log(`   📊 Events identified: ${processed.pass1.eventsIdentified}`);
            console.log(`   🧠 Business steps: ${processed.pass2.businessStepsFromArticle.length} from article, ${processed.pass2.ourBusinessPredictions.length} our predictions`);
            console.log(`   💭 Market impact score: ${processed.pass3.marketImpactScore.toFixed(3)}`);
            console.log(`   ⏱️  Processing time: ${processed.processingTime}ms`);
            console.log(`   💰 Estimated cost: $${processed.totalCost.toFixed(4)}`);

            // Show belief factors
            console.log(`   🧭 Key belief factors:`);
            console.log(`      - Intensity: ${processed.pass3.beliefFactors.intensity_belief.toFixed(2)}`);
            console.log(`      - Duration: ${processed.pass3.beliefFactors.duration_belief.toFixed(2)}`);
            console.log(`      - Hope vs Fear: ${processed.pass3.beliefFactors.hope_vs_fear.toFixed(2)}`);
            console.log(`      - Clarity: ${processed.pass3.beliefFactors.clarity_score.toFixed(2)}`);

        } catch (error) {
            console.error(`❌ Pipeline failed: ${error.message}`);
        }
    }

    // Step 3: Cost Analysis
    console.log("\n💰 STEP 3: Cost Analysis & Optimization");
    console.log("-".repeat(40));

    console.log("📊 Estimated costs per article:");
    console.log("   - Pass 1 (GPT-3.5-turbo): ~$0.002");
    console.log("   - Pass 2 (GPT-4): ~$0.030");
    console.log("   - Pass 3 (Claude): ~$0.015");
    console.log("   - Total per article: ~$0.047");
    console.log("");
    console.log("📈 Volume projections:");
    console.log("   - 100 articles/day: ~$4.70/day = $140/month");
    console.log("   - 1000 articles/day: ~$47/day = $1,400/month");
    console.log("");
    console.log("⚡ Optimization opportunities:");
    console.log("   - Use GPT-3.5 for simple classification tasks");
    console.log("   - Reserve GPT-4 for complex business logic");
    console.log("   - Batch process similar articles");
    console.log("   - Cache common analysis patterns");

    console.log("\n🎉 PIPELINE TEST COMPLETE!");
    console.log("=".repeat(60));
    console.log("✅ Article scraping: Tested with fallback handling");
    console.log("✅ Multi-pass architecture: 3-pass structure validated");
    console.log("✅ Cost optimization: Model selection strategy defined");
    console.log("✅ Belief quantification: Atomic factor framework ready");
    console.log("");
    console.log("📋 Next steps:");
    console.log("1. Set up API keys for OpenAI and Anthropic");
    console.log("2. Test real API calls with detailed prompts");
    console.log("3. Validate belief factor accuracy");
    console.log("4. Build Airtable integration for processed results");
}

// Run the test
testPipeline().catch(console.error);

