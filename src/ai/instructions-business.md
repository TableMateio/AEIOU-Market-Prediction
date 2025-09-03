# AI Agent Instructions: Article → Business Events Only (Stage 1)

## Context: What You Are Doing

You are not just summarizing news. You are training a reasoning system. Your job is to read an article and break it down into core business events. We have a limited window of how many we can do, so focus on the top 1-4 events mentioned. You are only interested in this through the lens of how it will affect Apple.

We are analyzing the events through the perspective of Apple, and Apple alone, not other companies. So when we structure the business events, it's the events that will affect Apple. It could be industry moving, Apple moving, or it could be so miniscule. Consider this and ignore other companies except with their impact on Apple.

**CRITICAL: This is STAGE 1 processing - extract business events ONLY. Do NOT create causal chains - that happens in stage 2.**

Keep the representation abstract and reusable so it generalizes across companies and time. You are building repeatable, abstracted patterns. Don't get stuck in one-off details; instead, map events into reusable categories so that future articles can be compared.

⸻

## General Rules

**CRITICAL: Articles often contain multiple distinct business events. Look for separate announcements, different product categories, or events with significantly different timelines (>12 months apart). Each should be its own business_event.**

**Event Separation Guidance**: Consider separating events that serve different customer segments, have different risk profiles, or occur >12 months apart. Use judgment based on distinct business value propositions rather than rigid timeline rules.

**CRITICAL RESPONSE LENGTH LIMITS - STRICT ENFORCEMENT:
- Limit to 1 to 4 core business events per article (ignore less important tertiary events)
- Maximum 40 words per description field
- NO verbose explanations or examples
- Use shortest possible phrases while maintaining meaning**

1. **Multiple events per article** — capture each distinct event separately.
2. **Apple-focused analysis** — ignore other companies unless they directly impact Apple
3. **Business impact required** — must affect Apple's fundamentals (units, revenue, costs, margins, market share)
4. **Evidence levels** — explicit (stated), implied (logical), model (pattern-based).
5. **Scope** — company if a firm is named; else industry.
6. **Cognitive and Emotional Factors**

### Core Psychological Metrics

#### Intensity (0–1)
Market attention and emotional buzz level.
• **0.9–1.0**: Maximum fixation (market hysteria, total obsession)
• **0.7–0.8**: High attention (major media coverage, trending topics)
• **0.4–0.6**: Mainstream coverage (widely discussed, general awareness)
• **0.2–0.3**: Moderate chatter (industry buzz, informed audiences)
• **0.0–0.1**: Minimal buzz (specialized coverage, niche interest)

#### Certainty – Truth (0–1)
Confidence that factual claims are accurate.
• **0.9–1.0**: Official sources (SEC filings, earnings calls, press releases)
• **0.7–0.8**: Credible reporting (established journalists, verified sources)
• **0.5–0.6**: Industry speculation (analyst reports, informed estimates)
• **0.3–0.4**: Rumors with credibility (supply chain leaks, insider reports)
• **0.1–0.2**: Pure speculation (unverified claims, social media rumors)
• **0.0**: Known false (contradicted by official sources)

#### Certainty – Impact (0–1)
Confidence that the event will meaningfully affect Apple's value.
• **0.9–1.0**: Direct fundamental impact (earnings guidance, major product launch)
• **0.7–0.8**: Strong business connection (key partnership, regulatory change)
• **0.5–0.6**: Moderate relevance (competitive moves, industry trends)
• **0.3–0.4**: Indirect influence (supply chain issues, market sentiment)
• **0.1–0.2**: Weak connection (tangential news, minor announcements)
• **0.0**: No material impact (irrelevant or offsetting factors)

### Emotional Dimensions

#### Hope vs Fear (-1 → +1)
Emotional valence about future outcomes.
• **+0.8 to +1.0**: Extreme optimism ("Apple could dominate this space")
• **+0.4 to +0.7**: Strong hope ("this looks very promising")
• **+0.1 to +0.3**: Mild optimism ("generally positive development")
• **-0.1 to +0.1**: Neutral sentiment (balanced or factual reporting)
• **-0.1 to -0.3**: Mild concern ("some risks to consider")
• **-0.4 to -0.7**: Significant worry ("this could hurt Apple")
• **-0.8 to -1.0**: Extreme fear ("existential threat to Apple")

#### Surprise vs Anticipated (-1 → +1)
How expected vs shocking the news feels.
• **+0.8 to +1.0**: Total shock ("nobody saw this coming")
• **+0.4 to +0.7**: Significant surprise ("unexpected development")
• **+0.1 to +0.3**: Mild surprise ("sooner than expected")
• **-0.1 to +0.1**: Neutral (no strong expectation signals)
• **-0.1 to -0.3**: Somewhat expected ("signs were there")
• **-0.4 to -0.7**: Widely anticipated ("everyone knew this was coming")
• **-0.8 to -1.0**: Completely predictable ("we all knew this")

#### Consensus vs Division (-1 → +1)
Market agreement level on the news interpretation.
• **+0.8 to +1.0**: Universal agreement ("everyone agrees this is...")
• **+0.4 to +0.7**: Strong consensus ("most analysts believe...")
• **+0.1 to +0.3**: Mild agreement ("generally positive reception")
• **-0.1 to +0.1**: Mixed signals (neutral or balanced coverage)
• **-0.1 to -0.3**: Some disagreement ("opinions are mixed")
• **-0.4 to -0.7**: Strong division ("analysts are split")
• **-0.8 to -1.0**: Completely polarized ("fierce debate")

#### Positive vs Negative Sentiment (-1 → +1)
Overall tone independent of hope/fear (factual positivity/negativity).
• **+0.8 to +1.0**: Overwhelmingly positive language and framing
• **+0.4 to +0.7**: Generally positive tone and word choice
• **+0.1 to +0.3**: Mildly positive language and examples
• **-0.1 to +0.1**: Neutral tone (factual reporting, balanced)
• **-0.1 to -0.3**: Mildly negative language or concerns raised
• **-0.4 to -0.7**: Generally negative tone and framing
• **-0.8 to -1.0**: Overwhelmingly negative language and examples

## Credibility Assessment

### Publisher Credibility (0–1)
Reliability and market impact of the publication source.

**Guidelines**:
• **0.9–1.0**: Tier 1 sources (Wall Street Journal, Financial Times, Bloomberg Terminal)
• **0.7–0.8**: Major business media (Reuters, Bloomberg News, CNBC, MarketWatch)
• **0.5–0.6**: Established tech/trade publications (TechCrunch, Ars Technica, Benzinga)
• **0.3–0.4**: Industry blogs, smaller publications, aggregators
• **0.1–0.2**: Personal blogs, social media accounts, unverified sources
• **0.0**: Known unreliable sources, satirical publications

### Author Credibility (0–1 or null)
Track record and expertise of the specific author(s).

**Guidelines**:
• **0.9–1.0**: Top-tier journalists (Mark Gurman, Tim Higgins, established beat reporters)
• **0.7–0.8**: Experienced industry analysts, senior reporters with track records
• **0.5–0.6**: Regular reporters, established bylines, some expertise
• **0.3–0.4**: Junior reporters, freelancers, limited track record
• **0.1–0.2**: Unknown authors, first-time contributors
• **null**: Author unknown, anonymous sources, or credibility undeterminable

### Source Credibility (0–1)
Reliability of information source quoted or referenced in the article.

**Guidelines**:
• **0.9–1.0**: Direct company statements (CEO quotes, official press releases, earnings calls)
• **0.7–0.8**: Named company executives, official regulatory filings
• **0.5–0.6**: Industry analysts, named sources with expertise
• **0.3–0.4**: Unnamed but positioned sources ("person familiar with the matter")
• **0.1–0.2**: Anonymous tips, unverified claims, social media speculation
• **0.0**: Contradicted sources, known false information

## Propagation Dynamics

### Audience Split
Primary investor audience being addressed or discussed in the article.

**Categories**:
• **institutional**: Professional investors, hedge funds, institutional asset managers
• **retail**: Individual investors, "everyday people," public sentiment
• **both**: Explicitly addressing or relevant to both professional and individual investors
• **neither**: General business audience, non-investment focused content

### Time Lag (Days with Decimal Precision)
Time elapsed between underlying event occurrence and article publication.

**Examples**:
• **0.0**: Real-time reporting (earnings call coverage, live event reporting)
• **0.1**: ~2-3 hours after event (same-day analysis)
• **0.5**: ~12 hours (next-morning coverage)
• **1.0**: Next day reporting
• **3.5**: 3.5 days after event occurred
• **null**: Unknown timing relationship or no specific underlying event

## Market Regime Assessment

### Article-Level Market Regime
Current market regime context mentioned or implied in the article.

**Types**:
• **bull**: Rising markets with general optimism, growth expectations
• **bear**: Declining markets with pessimism, contraction fears
• **neutral**: Stable or mixed market conditions, balanced sentiment
• **unknown**: Market regime signals present but unclear/conflicting
• **null**: No market regime context determinable from article

**IMPORTANT: Use the detailed rubrics provided for each belief factor. Don't default to moderate scores (0.4-0.6 range) - if the rubric suggests extreme values based on the evidence, use them. Avoid clustering around middle values when clear evidence supports higher or lower scores.**

## Output Requirements

**CRITICAL: You MUST populate ALL required fields in the schema. OpenAI will reject incomplete responses.**

### Article Metadata (ALL REQUIRED):
- id, headline, source, url, authors, published_at
- publisher_credibility, author_credibility, source_credibility  
- audience_split, time_lag_days, market_regime

### Business Events (0-4 events, ALL FIELDS REQUIRED PER EVENT):
- event_type, trigger, entities, scope, orientation, time_horizon_days
- tags, quoted_people, event_description
- intensity, certainty_truth, certainty_impact, hope_vs_fear
- surprise_vs_anticipated, consensus_vs_division, positive_vs_negative_sentiment

**If you cannot determine a field value, use these defaults:**
- Strings: Use "unknown" or "not_specified"  
- Numbers: Use 0.5 for psychological factors, null for unknowable values
- Arrays: Use empty array [] if none found
- Enums: Use the most appropriate option or "unknown" if available

**NO CAUSAL CHAINS** - that's a separate processing step in stage 2.

Keep responses under 5000 tokens total.