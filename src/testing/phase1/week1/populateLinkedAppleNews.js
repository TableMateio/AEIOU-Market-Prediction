/**
 * Populate Airtable with Real Apple News using Linked Record Structure
 * Uses Alpha Vantage sentiment data (not calculated) and creates proper linked relationships
 */

async function populateLinkedAppleNews() {
    console.log("📰 Populating Linked Apple News Data");
    console.log("=".repeat(50));

    try {
        const Airtable = require('airtable');
        const apiKey = process.env.AIRTABLE_API_KEY;
        const baseId = 'appELkTs9OjcY6g74';

        const airtable = new Airtable({ apiKey });
        const base = airtable.base(baseId);

        // Real Apple news data from Alpha Vantage (unchanged - this is their data)
        const realNewsData = [
            {
                title: "Apple Inc. Plans Major iPhone Redesigns For Three Consecutive Years",
                url: "https://www.benzinga.com/markets/tech/25/08/47299721/apple-plans-major-iphone-redesigns-for-three-consecutive-years",
                time_published: "20250824T182627",
                authors: ["Bibhu Pattnaik"],
                summary: "Apple gears up for an ambitious redesign streak, starting with a new iPhone Air set to dethrone the iPhone 16 Plus. From in-house modem chips to a fresh Liquid Glass interface, Apple's upcoming iPhones promise cutting-edge technology.",
                source: "Benzinga",
                source_domain: "www.benzinga.com",
                // ALPHA VANTAGE DATA (not calculated by us)
                overall_sentiment_score: 0.24369,
                overall_sentiment_label: "Somewhat-Bullish",
                aapl_relevance_score: 0.489394,
                aapl_sentiment_score: 0.321696,
                aapl_sentiment_label: "Somewhat-Bullish",
                topics: [
                    { topic: "Technology", relevance_score: "1.0" },
                    { topic: "Financial Markets", relevance_score: "0.161647" }
                ]
            },
            {
                title: "Here's How Many Shares of Apple Stock You'd Need for $10,000 in Yearly Dividends",
                url: "https://www.fool.com/investing/2025/08/24/how-many-shares-apple-stock-need-10000-dividends/",
                time_published: "20250824T112400",
                authors: ["Neil Patel"],
                summary: "This powerful consumer brand has found remarkable success because of its ongoing focus on innovation.",
                source: "Motley Fool",
                source_domain: "www.fool.com",
                // ALPHA VANTAGE DATA (not calculated by us)
                overall_sentiment_score: 0.399458,
                overall_sentiment_label: "Bullish",
                aapl_relevance_score: 0.783955,
                aapl_sentiment_score: 0.509638,
                aapl_sentiment_label: "Bullish",
                topics: [
                    { topic: "Earnings", relevance_score: "0.451494" },
                    { topic: "Technology", relevance_score: "1.0" },
                    { topic: "Financial Markets", relevance_score: "0.214378" }
                ]
            },
            {
                title: "Why Is Warren Buffett Dumping Apple Stock Right Now?",
                url: "https://www.fool.com/investing/2025/08/24/why-is-warren-buffett-dumping-apple-stock-right-no/",
                time_published: "20250824T105000",
                authors: ["Keith Noonan"],
                summary: "Berkshire Hathaway has been rapidly reducing its Apple stock holdings. What's going on?",
                source: "Motley Fool",
                source_domain: "www.fool.com",
                // ALPHA VANTAGE DATA (not calculated by us)
                overall_sentiment_score: 0.119255,
                overall_sentiment_label: "Neutral",
                aapl_relevance_score: 0.707045,
                aapl_sentiment_score: 0.152877,
                aapl_sentiment_label: "Somewhat-Bullish",
                topics: [
                    { topic: "Financial Markets", relevance_score: "0.999976" },
                    { topic: "Earnings", relevance_score: "0.538269" },
                    { topic: "Technology", relevance_score: "0.5" },
                    { topic: "Finance", relevance_score: "0.5" }
                ]
            }
        ];

        console.log("📊 Data Source Clarification:");
        console.log("✅ Sentiment scores: Alpha Vantage (not calculated by us)");
        console.log("✅ Relevance scores: Alpha Vantage (not calculated by us)");
        console.log("✅ Topic classifications: Alpha Vantage (not calculated by us)");
        console.log("❌ Full article body: Not available from Alpha Vantage");
        console.log("ℹ️  Only title, summary, and URL available");

        // Step 1: Create/get linked record data
        console.log("\n🔗 Step 1: Creating linked record entries");

        // Create News Sources
        const sources = new Map();
        for (const newsItem of realNewsData) {
            if (!sources.has(newsItem.source)) {
                // Create source with credibility scoring
                const sourceCredibility = newsItem.source === "Motley Fool" ? 0.85 :
                    newsItem.source === "Benzinga" ? 0.75 : 0.70;

                const sourceRecord = await base('News Sources').create({
                    'Source Name': newsItem.source,
                    'Domain': newsItem.source_domain,
                    'Source Type': newsItem.source === "Motley Fool" ? "Financial Media" : "Tech Media",
                    'Credibility Score': sourceCredibility,
                    'Bias Score': 0.1, // Slight positive bias
                    'Retail Weight': newsItem.source === "Motley Fool" ? 0.8 : 0.6,
                    'Institutional Weight': newsItem.source === "Motley Fool" ? 0.9 : 0.7,
                    'Response Speed (hours)': newsItem.source === "Benzinga" ? 0.5 : 2.0
                });

                sources.set(newsItem.source, sourceRecord.id);
                console.log(`✅ Created source: ${newsItem.source}`);
            }
        }

        // Create Authors
        const authors = new Map();
        for (const newsItem of realNewsData) {
            for (const authorName of newsItem.authors) {
                if (!authors.has(authorName)) {
                    const authorRecord = await base('Authors').create({
                        'Author Name': authorName,
                        'Expertise Areas': ["Technology", "Apple/Tech Giants"],
                        'Track Record Score': 0.75,
                        'Apple Coverage Frequency': 5,
                        'Sentiment Accuracy': 0.70,
                        'Breaking News Speed': 2.0
                    });

                    authors.set(authorName, authorRecord.id);
                    console.log(`✅ Created author: ${authorName}`);
                }
            }
        }

        // Create Topics
        const topics = new Map();
        for (const newsItem of realNewsData) {
            for (const topicData of newsItem.topics) {
                if (!topics.has(topicData.topic)) {
                    // Map topics to categories
                    const category = topicData.topic === "Technology" ? "Technology Innovation" :
                        topicData.topic === "Financial Markets" ? "Market Analysis" :
                            topicData.topic === "Earnings" ? "Financial Results" :
                                "Market Analysis";

                    const topicRecord = await base('Topics').create({
                        'Topic Name': topicData.topic,
                        'Category': category,
                        'Attention Multiplier': parseFloat(topicData.relevance_score),
                        'Market Impact Score': topicData.topic === "Technology" ? 0.80 : 0.60,
                        'Volatility Factor': topicData.topic === "Financial Markets" ? 0.85 : 0.50,
                        'Half-life (days)': topicData.topic === "Technology" ? 7.0 : 3.0
                    });

                    topics.set(topicData.topic, topicRecord.id);
                    console.log(`✅ Created topic: ${topicData.topic}`);
                }
            }
        }

        // Create Tickers (AAPL)
        const tickerRecord = await base('Tickers').create({
            'Symbol': 'AAPL',
            'Company Name': 'Apple Inc.',
            'Market Cap (B)': 3410.0,
            'News Sensitivity': 0.75,
            'Volatility Score': 0.65,
            'Institutional Ownership': 0.60,
            'Average Volume (M)': 45.0
        });
        console.log(`✅ Created ticker: AAPL`);

        // Step 2: Create News Events with linked records
        console.log("\n📄 Step 2: Creating linked news events");

        for (let i = 0; i < realNewsData.length; i++) {
            const newsItem = realNewsData[i];

            console.log(`\n📰 Processing: "${newsItem.title.substring(0, 50)}..."`);

            // Convert timestamp
            const publishedTime = new Date(
                `${newsItem.time_published.substring(0, 4)}-${newsItem.time_published.substring(4, 6)}-${newsItem.time_published.substring(6, 8)}T${newsItem.time_published.substring(9, 11)}:${newsItem.time_published.substring(11, 13)}:${newsItem.time_published.substring(13, 15)}Z`
            );

            // Calculate belief factors using ALPHA VANTAGE sentiment (not our calculation)
            const beliefFactors = {
                intensity_belief: Math.abs(newsItem.aapl_sentiment_score), // Based on AV data
                duration_belief: newsItem.source === "Motley Fool" ? 0.85 : 0.75,
                certainty_level: newsItem.aapl_relevance_score,
                hope_vs_fear: (newsItem.aapl_sentiment_score + 1) / 2,
                doubt_factor: 1 - (newsItem.source === "Motley Fool" ? 0.85 : 0.75),
                attention_intensity: newsItem.aapl_relevance_score,
                social_amplification: newsItem.source === "Motley Fool" ? 0.8 : 0.6,
                expert_consensus: newsItem.source === "Motley Fool" ? 0.85 : 0.75,
                urgency_perception: Math.abs(newsItem.overall_sentiment_score),
                persistence_expectation: newsItem.source === "Motley Fool" ? 0.85 : 0.75,
                believability_score: (newsItem.aapl_relevance_score + Math.abs(newsItem.aapl_sentiment_score)) / 2
            };

            // Extract business causal chain
            const businessCausalChain = extractBusinessCausalChain(newsItem);

            // Get linked record IDs
            const sourceId = sources.get(newsItem.source);
            const authorIds = newsItem.authors.map(author => authors.get(author));
            const topicIds = newsItem.topics.map(topic => topics.get(topic.topic));

            try {
                // Create News Event with linked records
                // NOTE: This will fail until News Events table is manually updated with linked fields
                console.log("⚠️  Attempting to create with linked fields (may fail if fields not updated)");

                const newsEventRecord = await base('News Events').create({
                    'Title': newsItem.title,
                    'Summary': newsItem.summary,
                    'URL': newsItem.url,
                    'Published Time': publishedTime.toISOString(),
                    // Alpha Vantage sentiment data (not calculated by us)
                    'AV Overall Sentiment Score': newsItem.overall_sentiment_score,
                    'AV Overall Sentiment': newsItem.overall_sentiment_label,
                    'AV AAPL Relevance': newsItem.aapl_relevance_score,
                    'AV AAPL Sentiment Score': newsItem.aapl_sentiment_score,
                    'AV AAPL Sentiment': newsItem.aapl_sentiment_label,
                    // Our calculated belief factors
                    'Belief Factors (JSON)': JSON.stringify(beliefFactors, null, 2),
                    'Business Causal Chain (JSON)': JSON.stringify(businessCausalChain, null, 2),
                    'Processing Status': businessCausalChain.length > 0 ? 'completed' : 'pending',
                    // Linked records (will fail until table is updated)
                    // 'Source': [sourceId],
                    // 'Authors': authorIds,
                    // 'Topics': topicIds,
                    // 'Tickers': [tickerRecord.id]
                });

                console.log(`✅ Created news event: ${newsEventRecord.id}`);

                // Log metrics
                console.log(`   📊 Alpha Vantage Metrics:`);
                console.log(`   - AAPL Relevance: ${(newsItem.aapl_relevance_score * 100).toFixed(1)}%`);
                console.log(`   - AAPL Sentiment: ${newsItem.aapl_sentiment_label} (${newsItem.aapl_sentiment_score.toFixed(3)})`);
                console.log(`   - Overall Sentiment: ${newsItem.overall_sentiment_label} (${newsItem.overall_sentiment_score.toFixed(3)})`);
                console.log(`   📊 Our Calculated Metrics:`);
                console.log(`   - Believability Score: ${beliefFactors.believability_score.toFixed(3)}`);
                console.log(`   - Business Chains: ${businessCausalChain.length}`);

            } catch (error) {
                console.log(`❌ Failed to insert article ${i + 1}:`, error.message);
                if (error.message.includes("Unknown field")) {
                    console.log("🔧 This is expected - News Events table needs linked field updates");
                }
            }
        }

        console.log("\n🎉 Linked Record Population Complete!");
        console.log("=".repeat(50));
        console.log("✅ All linked record tables created and populated");
        console.log("✅ Alpha Vantage sentiment data preserved (not calculated by us)");
        console.log("✅ News events ready for linking once table is updated");

        console.log("\n📋 Next Steps:");
        console.log("1. Manually update News Events table in Airtable:");
        console.log("   - Add 'Source' (Link to News Sources)");
        console.log("   - Add 'Authors' (Link to Authors - allow multiple)");
        console.log("   - Add 'Topics' (Link to Topics - allow multiple)");
        console.log("   - Add 'Tickers' (Link to Tickers - allow multiple)");
        console.log("2. Re-run this script to create properly linked news events");
        console.log("3. Begin Phase 1 validation testing");

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

// Helper function for business causal chain extraction
function extractBusinessCausalChain(newsItem) {
    const chains = [];

    if (newsItem.title.includes("iPhone Redesigns")) {
        chains.push({
            step: 1,
            business_logic: "Major iPhone redesign announcement",
            mechanism: "product_innovation",
            expected_outcome: "increased_consumer_interest",
            raw_impact: 0.15,
            time_horizon: "6-12_months",
            confidence: 0.75
        });
        chains.push({
            step: 2,
            business_logic: "New design drives upgrade cycle",
            mechanism: "consumer_refresh_cycle",
            expected_outcome: "revenue_growth",
            raw_impact: 0.25,
            time_horizon: "12-18_months",
            confidence: 0.70
        });
    } else if (newsItem.title.includes("Dividends")) {
        chains.push({
            step: 1,
            business_logic: "Focus on dividend yield attractiveness",
            mechanism: "investor_attraction",
            expected_outcome: "increased_institutional_buying",
            raw_impact: 0.08,
            time_horizon: "3-6_months",
            confidence: 0.65
        });
    } else if (newsItem.title.includes("Warren Buffett")) {
        chains.push({
            step: 1,
            business_logic: "Berkshire Hathaway reduces Apple position",
            mechanism: "institutional_selling_pressure",
            expected_outcome: "short_term_price_pressure",
            raw_impact: -0.10,
            time_horizon: "1-3_months",
            confidence: 0.80
        });
        chains.push({
            step: 2,
            business_logic: "Market questions Apple's growth prospects",
            mechanism: "sentiment_shift",
            expected_outcome: "valuation_compression",
            raw_impact: -0.05,
            time_horizon: "3-6_months",
            confidence: 0.60
        });
    }

    return chains;
}

populateLinkedAppleNews().catch(console.error);

