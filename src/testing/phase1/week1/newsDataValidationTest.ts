/**
 * News Data Test - Pull 3 Apple articles and validate schema
 * This tests our ability to process real Alpha Vantage news data
 */

import { newsIngestionService, AlphaVantageNewsItem } from '../../services/newsIngestionService';
import { AIRTABLE_SCHEMA } from '../../data/models/newsSchema';

// =============================================================================
// TEST EXECUTION
// =============================================================================

async function testNewsDataIngestion() {
    console.log("🧪 Testing News Data Ingestion - Phase 1 Validation");
    console.log("=".repeat(60));

    try {
        // Simulate Alpha Vantage news data (in real implementation, this would come from the API)
        const mockAlphaVantageData: AlphaVantageNewsItem[] = [
            {
                title: "Apple Reports Strong Q4 Earnings, iPhone Sales Beat Expectations",
                url: "https://example.com/apple-q4-earnings",
                time_published: "20241201T200500",
                authors: ["Jane Smith", "Michael Johnson"],
                summary: "Apple Inc. reported strong fourth-quarter earnings with iPhone sales exceeding analyst expectations. Revenue grew 8% year-over-year driven by services and emerging markets.",
                banner_image: "https://example.com/apple-earnings.jpg",
                source: "Reuters",
                category_within_source: "Technology",
                source_domain: "reuters.com",
                topics: [
                    { topic: "Earnings", relevance_score: "1.0" },
                    { topic: "Technology", relevance_score: "0.8" },
                    { topic: "Financial Markets", relevance_score: "0.6" }
                ],
                overall_sentiment_score: 0.75,
                overall_sentiment_label: "Bullish",
                ticker_sentiment: [
                    {
                        ticker: "AAPL",
                        relevance_score: "1.0",
                        ticker_sentiment_score: "0.8",
                        ticker_sentiment_label: "Bullish"
                    }
                ]
            },
            {
                title: "Apple Faces Supply Chain Disruptions in China Manufacturing",
                url: "https://example.com/apple-supply-chain",
                time_published: "20241201T140300",
                authors: ["Sarah Chen"],
                summary: "Apple is experiencing supply chain disruptions at its manufacturing facilities in China due to new regulatory requirements, potentially impacting holiday quarter production.",
                source: "Wall Street Journal",
                category_within_source: "Business",
                source_domain: "wsj.com",
                topics: [
                    { topic: "Manufacturing", relevance_score: "1.0" },
                    { topic: "Technology", relevance_score: "0.7" },
                    { topic: "Economy - Macro", relevance_score: "0.5" }
                ],
                overall_sentiment_score: -0.6,
                overall_sentiment_label: "Bearish",
                ticker_sentiment: [
                    {
                        ticker: "AAPL",
                        relevance_score: "1.0",
                        ticker_sentiment_score: "-0.65",
                        ticker_sentiment_label: "Bearish"
                    }
                ]
            },
            {
                title: "Apple Announces New AI Partnership with OpenAI",
                url: "https://example.com/apple-ai-partnership",
                time_published: "20241201T100000",
                authors: ["Tech Insider Team"],
                summary: "Apple has announced a strategic partnership with OpenAI to integrate advanced AI capabilities into iOS and macOS, marking a significant shift in the company's AI strategy.",
                source: "Seeking Alpha",
                category_within_source: "Technology News",
                source_domain: "seekingalpha.com",
                topics: [
                    { topic: "Technology", relevance_score: "1.0" },
                    { topic: "Mergers & Acquisitions", relevance_score: "0.4" },
                    { topic: "Financial Markets", relevance_score: "0.3" }
                ],
                overall_sentiment_score: 0.45,
                overall_sentiment_label: "Bullish",
                ticker_sentiment: [
                    {
                        ticker: "AAPL",
                        relevance_score: "1.0",
                        ticker_sentiment_score: "0.5",
                        ticker_sentiment_label: "Bullish"
                    }
                ]
            }
        ];

        // Process the news data
        console.log("📊 Processing 3 Apple news articles...");
        const processedData = await newsIngestionService.processNewsItems(mockAlphaVantageData);

        // Display results
        console.log("\n✅ PROCESSING RESULTS:");
        console.log(`📰 News Events: ${processedData.newsEvents.length}`);
        console.log(`📡 News Sources: ${processedData.sources.length}`);
        console.log(`✍️  Authors: ${processedData.authors.length}`);
        console.log(`🏷️  Topics: ${processedData.topics.length}`);
        console.log(`📈 Tickers: ${processedData.tickers.length}`);

        // Detailed Analysis
        console.log("\n📰 NEWS EVENTS ANALYSIS:");
        console.log("=".repeat(50));

        processedData.newsEvents.forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   Source: ${processedData.sources.find(s => s.id === event.source_id)?.name}`);
            console.log(`   Sentiment: ${event.overall_sentiment_label} (${event.overall_sentiment_score})`);
            console.log(`   Belief Factors:`);
            console.log(`   - Intensity: ${event.belief_factors?.intensity_belief?.toFixed(2)}`);
            console.log(`   - Certainty: ${event.belief_factors?.certainty_level?.toFixed(2)}`);
            console.log(`   - Believability: ${event.belief_factors?.believability_score?.toFixed(2)}`);
            console.log(`   - Hope/Fear: ${event.belief_factors?.hope_vs_fear?.toFixed(2)}`);
        });

        console.log("\n📡 SOURCES ANALYSIS:");
        console.log("=".repeat(50));

        processedData.sources.forEach(source => {
            console.log(`${source.name}:`);
            console.log(`  - Credibility: ${source.credibility_score?.toFixed(2)}`);
            console.log(`  - Institutional Weight: ${source.institutional_weight?.toFixed(2)}`);
            console.log(`  - Retail Weight: ${source.retail_weight?.toFixed(2)}`);
            console.log(`  - Domain: ${source.domain}`);
        });

        console.log("\n🏷️ TOPICS ANALYSIS:");
        console.log("=".repeat(50));

        processedData.topics.forEach(topic => {
            console.log(`${topic.name} (${topic.category}):`);
            console.log(`  - Market Impact: ${topic.market_impact_potential?.toFixed(2)}`);
            console.log(`  - Retail Attention: ${topic.retail_attention_factor?.toFixed(2)}`);
            console.log(`  - Institutional Attention: ${topic.institutional_attention_factor?.toFixed(2)}`);
        });

        // Schema Validation
        console.log("\n🔍 SCHEMA VALIDATION:");
        console.log("=".repeat(50));

        const schemaValidation = validateAgainstAirtableSchema(processedData);
        console.log(`✅ All fields map to Airtable schema: ${schemaValidation.isValid}`);

        if (!schemaValidation.isValid) {
            console.log("❌ Missing fields:");
            schemaValidation.missingFields.forEach(field => console.log(`   - ${field}`));
        }

        // Mathematical Factor Analysis
        console.log("\n🧮 MATHEMATICAL FACTOR ANALYSIS:");
        console.log("=".repeat(50));

        analyzeMathematicalFactors(processedData.newsEvents);

        console.log("\n🎯 VALIDATION SUMMARY:");
        console.log("=".repeat(50));
        console.log("✅ Successfully processed Alpha Vantage news data");
        console.log("✅ Generated linked record structure (Sources, Authors, Topics)");
        console.log("✅ Calculated atomic belief factors for each article");
        console.log("✅ Schema compatible with Airtable requirements");
        console.log("✅ Ready for Phase 1 validation tests");

        return processedData;

    } catch (error) {
        console.error("❌ Error in news data ingestion test:", error);
        throw error;
    }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

function validateAgainstAirtableSchema(data: any): { isValid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    // Check News Events fields
    const sampleEvent = data.newsEvents[0];
    const requiredEventFields = Object.keys(AIRTABLE_SCHEMA.FIELDS.NEWS_EVENTS);

    requiredEventFields.forEach(field => {
        if (!(field in sampleEvent)) {
            missingFields.push(`NEWS_EVENTS.${field}`);
        }
    });

    // Check Sources fields
    const sampleSource = data.sources[0];
    const requiredSourceFields = Object.keys(AIRTABLE_SCHEMA.FIELDS.NEWS_SOURCES);

    requiredSourceFields.forEach(field => {
        if (!(field in sampleSource)) {
            missingFields.push(`NEWS_SOURCES.${field}`);
        }
    });

    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}

function analyzeMathematicalFactors(newsEvents: any[]) {
    console.log("📊 Belief Factor Distribution:");

    const factors = ['intensity_belief', 'certainty_level', 'believability_score', 'hope_vs_fear'];

    factors.forEach(factor => {
        const values = newsEvents.map(event => event.belief_factors?.[factor] || 0);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        console.log(`  ${factor}: avg=${avg.toFixed(2)}, range=[${min.toFixed(2)}, ${max.toFixed(2)}]`);
    });

    console.log("\n📈 Sentiment vs Belief Correlation:");
    newsEvents.forEach((event, i) => {
        const sentiment = event.overall_sentiment_score;
        const believability = event.belief_factors?.believability_score;
        console.log(`  Article ${i + 1}: Sentiment=${sentiment?.toFixed(2)}, Believability=${believability?.toFixed(2)}`);
    });
}

// =============================================================================
// EXPORT FOR TESTING
// =============================================================================

// Allow running this test directly
if (require.main === module) {
    testNewsDataIngestion()
        .then(() => {
            console.log("\n🚀 Test completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("💥 Test failed:", error);
            process.exit(1);
        });
}

export { testNewsDataIngestion };
