# AI Agent Instructions: Article → Structured JSON

## Context: What You Are Doing

You are not just summarizing news. You are training a reasoning system. Your job is to read an article and break it down into business events and their causal consequences. You are only interested in this through the lens of how it will affect Apple.

We are analyzing the events through the perspective of Apple, and Apple alone, not other companies. So when we structure the causal events, it's the events that will affect Apple. It could be industry moving, Apple moving, or it could be so miniscule. Consider this and ignore other companies except with their impact on Apple and all of the chains are through the lens of how they will affect Apple.

Each event should unfold into a chain of 3–5 causal steps that ends at fundamentals (units sold, revenue, costs, margins, market share). You may include intermediate, scalar proxies (e.g., competitiveness_index, differentiation_score, product_awareness) — but they are bridges, not endpoints. Within 1–2 steps after a proxy, terminate at a fundamental.

Keep the representation abstract and reusable so it generalizes across companies and time. Intermediate proxies must be quantified (unit = index, rating, %, binary, or count). Examples: competitiveness_index (index), product_awareness (rating), brand_preference_share (%), consideration_rate (%), price_premium (%), channel_coverage_index (index). Proxies are allowed only if they point clearly to a fundamental in the next link(s)

You are building repeatable, abstracted patterns. Don't get stuck in one-off details; instead, map events into reusable categories so that future articles can be compared.

⸻

## General Rules

**CRITICAL: Articles often contain multiple distinct business events. Look for separate announcements, different product categories, or events with significantly different timelines (>12 months apart). Each should be its own business_event with separate causal chains.**

**Event Separation Guidance**: Consider separating events that serve different customer segments, have different risk profiles, or occur >12 months apart. Use judgment based on distinct business value propositions rather than rigid timeline rules.

**CRITICAL RESPONSE LENGTH LIMITS - STRICT ENFORCEMENT:
- Limit to 1 to 3 core business events per article (ignore less important tertiary events)
- No more than 4 causal chain steps (step_0, step_1, step_2, step_3)
- Maximum 20 words per description field
- NO verbose explanations or examples
- Use shortest possible phrases while maintaining meaning**

1. **Multiple events per article** — capture each distinct event separately.
2. **Atomic causal steps** — one measurable factor per step. Factors may be proxies (e.g., product_awareness, competitiveness_index) or fundamentals (units, revenue, costs, margins, market share). Proxies must have a unit (index/rating/%/binary/count) and lead to a fundamental within 1–2 steps.
3. **Chain length** — aim for 3–5 steps after step 0. It's typical to see 1–2 proxy links before fundamentals. Allow branching when a proxy drives multiple fundamentals.
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
• **+0.1 to +0.3**: Mildly positive framing
• **-0.1 to +0.1**: Neutral, factual reporting tone
• **-0.1 to -0.3**: Mildly negative framing
• **-0.4 to -0.7**: Generally negative tone and word choice
• **-0.8 to -1.0**: Overwhelmingly negative language and framing

### Cognitive Assessment

#### Complexity vs Clarity (-1 → +1)
How complicated vs straightforward the matter appears.
• **+0.8 to +1.0**: Crystal clear ("obvious implications")
• **+0.4 to +0.7**: Generally clear ("straightforward situation")
• **+0.1 to +0.3**: Mostly clear ("some ambiguity")
• **-0.1 to +0.1**: Balanced complexity (neither simple nor complex)
• **-0.1 to -0.3**: Somewhat complex ("multiple variables")
• **-0.4 to -0.7**: Quite complex ("many unknowns")
• **-0.8 to -1.0**: Extremely complex ("too many variables to predict")

#### Risk Appetite (0–1)
Willingness to accept uncertainty and potential downsides.
• **0.9–1.0**: High risk tolerance (embracing bold moves, accepting volatility)
• **0.7–0.8**: Moderate risk acceptance (calculated risks, measured optimism)
• **0.5–0.6**: Balanced approach (weighing pros and cons equally)
• **0.3–0.4**: Risk-averse (preferring proven approaches, cautious outlook)
• **0.1–0.2**: Very conservative (avoiding uncertainty, safety-first mentality)
• **0.0**: Risk-avoidant (rejecting any uncertainty or downside potential)

### Temporal Factors

#### Duration Expectation (0–1)
Perceived longevity of the issue or its effects.
• **0.9–1.0**: Permanent/structural (fundamental business model shifts)
• **0.7–0.8**: Long-term (multi-year implications)
• **0.5–0.6**: Medium-term (1-2 year effects)
• **0.3–0.4**: Short-term (quarterly to annual impact)
• **0.1–0.2**: Brief impact (weeks to months)
• **0.0**: Fleeting (daily news cycle, minimal lasting effect)

#### Urgency (0–1)
How immediately people think action or attention is required.
• **0.9–1.0**: Immediate action required ("must respond today")
• **0.7–0.8**: High urgency ("needs prompt attention")
• **0.5–0.6**: Moderate urgency ("should address soon")
• **0.3–0.4**: Low urgency ("can wait for proper planning")
• **0.1–0.2**: Minimal urgency ("long-term consideration")
• **0.0**: No urgency ("vague future relevance")

### Amplification Metrics

#### Attention Amplification (0–1)
How much coverage, social spread, and media amplification is occurring.
• **0.9–1.0**: Viral/trending (social media explosion, front-page news)
• **0.7–0.8**: High amplification (multiple major outlets, significant sharing)
• **0.5–0.6**: Moderate coverage (industry media, some social traction)
• **0.3–0.4**: Limited coverage (niche outlets, minimal sharing)
• **0.1–0.2**: Minimal amplification (single source, little pickup)
• **0.0**: No amplification (buried news, no social traction)

### Emotional Profile (Array)
Select applicable emotions detected in the narrative. Multiple simultaneous emotions are common.

**Core Emotions**: anticipation, excitement, optimism, confidence, relief, satisfaction, interest, surprise, uncertainty, concern, skepticism, disappointment, fear, anger, disgust, indifference

**Market-Specific Emotions**: FOMO (fear of missing out), greed, euphoria, panic, dread, complacency

**Examples**:
• Accessory launch = ["indifference"]
• AI breakthrough = ["excitement", "anticipation", "FOMO"]
• Supply chain disruption = ["concern", "uncertainty"]
• Competitive threat = ["fear", "skepticism"]

### Cognitive Biases (Array)
List identifiable psychological biases influencing interpretation. Select applicable biases from this list:

**Available Biases**: availability_heuristic, anchoring_bias, confirmation_bias, optimism_bias, overconfidence_bias, loss_aversion, sunk_cost_fallacy, hindsight_bias, recency_bias, herding_behavior, authority_bias, halo_effect, planning_fallacy, survivorship_bias, dunning_kruger_effect

**Examples**:
• Recent similar success → ["availability_heuristic", "optimism_bias"]
• Analyst following prior prediction → ["anchoring_bias", "confirmation_bias"]
• Celebrity CEO involvement → ["authority_bias", "halo_effect"]

## Dual-Layer Belief Analysis

**CRITICAL ENHANCEMENT**: For each causal step, analyze both market perception AND analytical assessment. Markets often move on perception rather than fundamentals, creating gaps between sentiment and likely outcomes.

### Market Perception Layer
What investors and the market are actually feeling/believing, based on how the news is being covered and discussed:
- **Dominant narrative** being told in media coverage
- **Emotional sentiment** driving investor discussions  
- **Cognitive biases** visible in market reactions
- **Hype vs skepticism** levels in analyst/social commentary
**This is NOT your AI opinion - this is reading the room of actual market sentiment.**

### AI Assessment Layer  
Your data-driven, realistic assessment of what will likely happen in business reality. **CRITICAL: All assessment values should scale with the magnitude of the factor.** If magnitude is 0.01 (tiny impact), then competitive_risk, execution_risk, etc. should also be low values (0.05-0.15). If magnitude is 0.5 (massive impact), then risks can be proportionally higher.

**This is YOUR analytical judgment** - often more conservative than market hype. Markets tend to overestimate impact of small events.

Each causal step should have its own assessment - early steps (like "announce new feature") typically have different risk profiles than distant steps (like "revenue growth"):

#### Execution Risk (0–1)
Likelihood of implementation challenges and practical barriers.
• **0.9–1.0**: Extremely high risk (complex technology, unproven at scale, major operational challenges)
• **0.7–0.8**: Significant challenges expected (difficult but achievable, resource-intensive)
• **0.5–0.6**: Moderate implementation difficulty (standard complexity, manageable risks)
• **0.3–0.4**: Some risks but manageable (proven approaches, minor challenges)
• **0.1–0.2**: Low execution risk (straightforward implementation, established processes)
• **0.0**: Trivial to execute (simple operational changes, minimal barriers)

#### Competitive Risk (0–1)
Risk that competitive dynamics will undermine this specific causal step. **Scale with magnitude**: tiny factors (0.01) should have tiny risks (0.05), massive factors (0.5) can have proportional risks.
• **0.9–1.0**: Competitors likely to neutralize impact (fast follower advantage, existing solutions)
• **0.7–0.8**: Strong competitive response expected (direct threat to competitor revenue)
• **0.5–0.6**: Moderate competitive pressure (some competitor reaction likely)
• **0.3–0.4**: Limited competitive threat (differentiated approach, first-mover advantage)
• **0.1–0.2**: Minimal competitive risk (unique capabilities, high switching costs)
• **0.05–0.1**: Tiny competitive risk (for minor updates, accessories, routine changes)
• **0.0**: No competitive threat (proprietary advantage, market leadership)

#### Business Impact Likelihood (0–1)
Probability this event will have the claimed business impact. **For tiny magnitudes (0.01), use conservative confidence (0.2-0.4)** since small effects are harder to detect and achieve.
• **0.9–1.0**: Highly likely to achieve claimed impact (proven track record, clear mechanisms)
• **0.7–0.8**: Probably will deliver (strong indicators, favorable conditions)
• **0.5–0.6**: Uncertain outcome (mixed signals, dependent on execution)
• **0.3–0.4**: Probably won't meet expectations (challenging conditions, weak indicators)
• **0.2–0.3**: Low confidence (typical for minor changes with unclear business impact)
• **0.1–0.2**: Unlikely to deliver (poor track record, unfavorable conditions)
• **0.0**: Almost certain to fail (fundamental barriers, impossible conditions)

#### Timeline Realism (0–1)
Realism of proposed timeline and delivery schedule.
• **0.9–1.0**: Very realistic timeline (conservative estimates, proven delivery capability)
• **0.7–0.8**: Achievable with effort (reasonable timeline, some stretch goals)
• **0.5–0.6**: Ambitious but possible (tight timeline, requires good execution)
• **0.3–0.4**: Overly optimistic (compressed timeline, high risk of delays)
• **0.1–0.2**: Unrealistic timeline (impossible schedule, ignores constraints)
• **0.0**: Impossible schedule (physically impossible, contradicts reality)

#### Fundamental Strength (0–1)
How sound the underlying business logic is for this specific causal step.
• **0.9–1.0**: Rock-solid business logic (proven causal mechanisms, strong historical precedent)
• **0.7–0.8**: Sound business reasoning (logical connection, supported by evidence)
• **0.5–0.6**: Reasonable logic (plausible connection, some supporting data)
• **0.3–0.4**: Weak business case (tenuous connection, limited supporting evidence)
• **0.1–0.2**: Poor business logic (speculative connection, contradicts evidence)
• **0.0**: Fundamentally flawed reasoning (no logical connection, contradicts known patterns)

### Perception Gap Analysis
The tension between market belief and analytical assessment:

#### Optimism Bias (-1 → +1)
Is market over or under-confident compared to analytical assessment?
• **+0.8 to +1.0**: Extreme market overconfidence (euphoric, ignoring major risks)
• **+0.4 to +0.7**: Significant overoptimism (market too bullish vs reality)
• **+0.1 to +0.3**: Mild overconfidence (slightly too optimistic)
• **-0.1 to +0.1**: Well-calibrated (market perception matches analysis)
• **-0.1 to -0.3**: Mild underconfidence (market slightly too pessimistic)
• **-0.4 to -0.7**: Significant pessimism bias (market too bearish vs reality)
• **-0.8 to -1.0**: Extreme market underconfidence (panic, ignoring positives)

#### Risk Awareness (-1 → +1)
How well does market understand the real risks compared to analytical view?
• **+0.8 to +1.0**: Market over-estimates risks (paranoid, seeing problems everywhere)
• **+0.4 to +0.7**: Market somewhat risk-averse (conservative vs reality)
• **+0.1 to +0.3**: Market slightly overcautious (minor risk overestimation)
• **-0.1 to +0.1**: Appropriate risk assessment (market matches analysis)
• **-0.1 to -0.3**: Market slightly underestimates risks (minor blind spots)
• **-0.4 to -0.7**: Market significantly ignores risks (dangerous complacency)
• **-0.8 to -1.0**: Market completely blind to risks (reckless disregard)

#### Correction Potential (0–1)
Likelihood of market perception shifting toward analytical reality.
• **0.9–1.0**: High correction potential (clear catalysts, unsustainable narrative)
• **0.7–0.8**: Likely correction (mounting evidence, narrative strain)
• **0.5–0.6**: Moderate correction chance (mixed signals, gradual shift possible)
• **0.3–0.4**: Low correction potential (entrenched views, limited catalysts)
• **0.1–0.2**: Unlikely correction (strong narrative momentum, few catalysts)
• **0.0**: No correction expected (permanent perception gap, no catalysts)

### Examples of Dual-Layer Analysis:

**Foldable iPhone Entry**:
- *Market Perception*: "Apple will perfect foldables and dominate the category" (high optimism)
- *AI Assessment*: "Late entry with significant technical/competitive risks" (moderate pessimism)  
- *Perception Gap*: Market underestimating Samsung's lead and execution complexity

**Supply Chain Diversification**:
- *Market Perception*: "Boring operational change, minimal impact" (low interest)
- *AI Assessment*: "Major strategic shift reducing China risk" (high long-term value)
- *Perception Gap*: Market undervaluing geopolitical risk mitigation

This dual-layer approach helps predict:
- **Short-term moves** (driven by perception/sentiment)
- **Long-term corrections** (when analysis proves more accurate)  
- **Volatility opportunities** (when gaps become obvious to market)

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

### Regime Sensitivity Factors
For each step in causal chains, assess how market context influences event interpretation:

#### Regime Alignment (-1 → +1)
How much this event aligns with current market regime expectations.
• **+0.8 to +1.0**: Perfectly aligned (bad news in bear market, good news in bull market)
• **+0.4 to +0.7**: Moderately aligned (reinforces current sentiment)
• **+0.1 to +0.3**: Slightly aligned (somewhat fits current narrative)
• **-0.1 to +0.1**: Regime-neutral (independent of market context)
• **-0.1 to -0.3**: Slightly counter-regime (mild contradiction to sentiment)
• **-0.4 to -0.7**: Moderately counter-regime (challenges current narrative)
• **-0.8 to -1.0**: Strongly counter-regime (good news in bear market, bad news in bull market)

#### Reframing Potential (0–1)
How easily can this event be reframed to fit dominant narrative.
• **0.9–1.0**: Highly reframable (ambiguous interpretation, easily spun either way)
• **0.7–0.8**: Moderately reframable (some spin possible with context)
• **0.5–0.6**: Somewhat reframable (limited interpretation flexibility)
• **0.3–0.4**: Limited reframing options (fairly clear implications)
• **0.1–0.2**: Hard facts (difficult to reframe, objective data)
• **0.0**: Impossible to reframe (unambiguous, black-and-white results)

#### Narrative Disruption (0–1)
How much this event challenges current market narrative.
• **0.9–1.0**: Highly disruptive (forces major narrative reconsideration)
• **0.7–0.8**: Significantly challenging (questions established views)
• **0.5–0.6**: Moderately challenging (raises some doubts about assumptions)
• **0.3–0.4**: Mildly questioning (minor narrative friction)
• **0.1–0.2**: Slightly reinforcing (mostly supports existing narrative)
• **0.0**: Perfectly confirming (completely validates current narrative)

## Magnitude Scale (0-1 Decimal Scale)

**CRITICAL**: Use 0-1 decimal scale representing % of Apple's ~$100B annual net income.

### Scale Definition:
• **0.01** = 1% of profits (~$1B effect) - Major iPhone refresh
• **0.05** = 5% of profits (~$5B effect) - Significant new product line
• **0.10** = 10% of profits (~$10B effect) - Major services expansion
• **0.25** = 25% of profits (~$25B effect) - New industry entry (AR glasses at scale)
• **0.50** = 50% of profits (~$50B effect) - Transformative shift (cars/healthcare)
• **1.00** = 100% of profits (~$100B effect) - Company doubling (new trillion-dollar category)

### Practical Guidelines:
• **0.01–0.03** = iPhone/iPad refreshes, minor new products
• **0.04–0.08** = Major product launches, significant service updates
• **0.09–0.15** = New product categories, major strategic shifts
• **0.16–0.25** = Industry-changing innovations (AR, major M&A)
• **0.26–0.50** = Business model transformation
• **0.51–1.00** = Company reinvention (reserved for cars, healthcare, AI breakthroughs)

### Calibration Examples:
• **iPhone 15 launch**: 0.02-0.03 (incremental refresh)
• **Apple Watch launch**: 0.05-0.08 (new category)
• **Services push**: 0.08-0.12 (business model shift)
• **Vision Pro**: 0.03-0.06 (early-stage new category)
• **Hypothetical Apple Car**: 0.30-0.70 (industry transformation)

### CRITICAL GUARDRAIL:
**Do not assign values >0.25 unless the event is plausibly on the scale of cars, healthcare, or AI breakthroughs that could reshape entire industries.**

⸻

## Causal Reasoning Assessment

For each step in a causal chain, evaluate the strength and logic of the causal connection.

### Causal Certainty (0–1)
How certain is this step given the previous one?

**Guidelines**:
• **0.9–1.0**: Nearly inevitable
  - Direct mechanical relationships (price cut → demand increase)
  - Well-established patterns (earnings beat → stock price rise)
  - Physical/operational necessities (supply shortage → delivery delays)

• **0.7–0.8**: Highly probable
  - Strong historical correlations (iPhone launch → revenue growth)
  - Market-tested relationships (innovation → competitive advantage)
  - Logical business connections (cost reduction → margin improvement)

• **0.5–0.6**: Moderately likely
  - Reasonable but uncertain (new market entry → market share gain)
  - Context-dependent outcomes (R&D investment → future innovation)
  - Industry-typical patterns with variation (marketing spend → brand awareness)

• **0.3–0.4**: Possible but uncertain
  - Speculative connections (patent filing → future product)
  - Early-stage relationships (startup acquisition → talent retention)
  - Complex multi-factor dependencies (regulation change → business impact)

• **0.1–0.2**: Low probability
  - Weak or unproven links (executive hire → culture change)
  - Long-term speculative chains (basic research → commercial product)
  - Highly variable outcomes (legal case → settlement terms)

### Logical Directness (0–1)
How direct is the causal connection (vs requiring intermediate steps)?

**Guidelines**:
• **0.9–1.0**: Immediate, direct causation
  - No intermediate steps required (price increase → revenue increase)
  - Direct operational impact (factory closure → reduced production)
  - Immediate market response (earnings miss → stock decline)

• **0.7–0.8**: One clear intermediate step
  - Single logical link (product improvement → customer satisfaction → retention)
  - Direct but delayed (investment → development → product launch)
  - Clear mechanism (acquisition → talent → capability)

• **0.5–0.6**: Multiple intermediate steps
  - Two or three logical connections (research → innovation → differentiation → market share)
  - Some uncertainty in intermediate links
  - Clear end-to-end logic but complex path

• **0.3–0.4**: Many intermediate steps
  - Complex causal chains with multiple dependencies
  - Uncertain intermediate mechanisms
  - Long-term indirect effects

• **0.1–0.2**: Highly indirect
  - Many uncertain intermediate steps
  - Weak logical connections
  - Speculative end-to-end relationships

### Market Consensus on Causality (0–1)
How much does the market agree this causal step makes sense?

**Guidelines**:
• **0.9–1.0**: Universal agreement
  - Textbook business relationships (cost cutting → margins)
  - Widely accepted market principles (quality → brand value)
  - Standard analyst frameworks (user growth → revenue)

• **0.7–0.8**: Strong consensus
  - Generally accepted relationships (innovation → competitiveness)
  - Established industry patterns (scale → efficiency)
  - Common investment themes (ecosystem → stickiness)

• **0.5–0.6**: Moderate agreement
  - Some debate but generally accepted (platform strategy → dominance)
  - Context-dependent relationships (regulation → opportunity/threat)
  - Mixed track record (acquisition → synergies)

• **0.3–0.4**: Mixed views
  - Significant disagreement among experts
  - Unproven or controversial relationships
  - High variability in historical outcomes

• **0.1–0.2**: Disputed causality
  - Widely questioned relationships
  - Poor historical track record
  - Alternative explanations preferred

• **0.0**: Rejected logic
  - Broadly dismissed causal claims
  - Contradicted by evidence or theory
  - Illogical or impossible relationships

## Factor Creation Guidelines

### Factor Naming Strategy
Create specific, measurable factor names that capture the essence of business changes. Prefer concrete concepts over abstract ones.

### Factor Categories (Examples, Not Exhaustive)

**Product Innovation**: ai_feature_integration, form_factor_innovation_index, ecosystem_lock_strength, platform_stickiness, differentiation_score

**Financial Performance**: revenue_growth_rate, gross_margin, operating_margin, units_sold, costs, dividend_yield, share_buyback_amount, earnings_per_share

**Market Position**: market_share, competitive_advantage_sustainability, brand_preference_share, consideration_rate, purchase_intent_score

**Customer Behavior**: customer_retention_rate, customer_satisfaction_index, churn_rate, average_revenue_per_user, customer_lifetime_value

**Operational Efficiency**: supply_chain_diversification, manufacturing_efficiency_index, inventory_turnover, cost_per_unit, delivery_time

**Strategic Assets**: patent_portfolio_strength, talent_acquisition_rate, regulatory_compliance_score, partnership_network_value

### Factor Normalization Strategy
After initial factor extraction, factors will be normalized across articles for machine learning analysis. The goal is to balance novel factor discovery with standardization:

1. **Novel factors are encouraged** - especially for unique business events
2. **Common factors should converge** - use standard names for recurring concepts  
3. **Synonyms help pattern matching** - use factor_synonyms for semantic richness
4. **Category classification** - helps group similar factors across novel naming

### Proxies (Intermediate Factors)
Allowed but must lead to fundamentals within 1-2 steps:

**Competitive Position**: competitiveness_index (index), differentiation_score (index), competitive_advantage_sustainability (index)
**Market Perception**: product_awareness (rating), brand_preference_share (%), consideration_rate (%), purchase_intent_score (index)  
**Operational Quality**: efficiency_index (index), quality_score (index), reliability_rating (rating)
**Strategic Position**: ecosystem_strength (index), platform_value (index), network_effects_power (index)

**Rule**: Proxies are allowed, but must point to a fundamental within the next 1–2 steps.

### Natural Factor Progression in Causal Chains
Factors naturally progress from novel/unique at the beginning of causal chains to standardized/fundamental at the end. Early steps (step 0-1) often involve unique business events like "ai_feature_integration" or "supply_chain_diversification", while later steps (step 2-4) converge on universal fundamentals like "revenue_growth_rate" and "units_sold". This progression is expected and beneficial for analysis.

### Post-Processing Normalization Note
After initial factor extraction, factors will be normalized across articles for machine learning analysis. Consistent factor naming following these guidelines will minimize the normalization effort required. Novel factors that emerge frequently across articles may become standard factors in future iterations.

• **factor_synonyms** (optional): Array of related factor concepts that describe the same mechanism. Examples: for "ecosystem_lock_strength" you might include ["platform_stickiness", "switching_cost_barrier", "vendor_lockin_index"]. This provides semantic richness for pattern matching across articles.
• **factor_category**: financial | sales | customer | product | operations | supply_chain | regulatory | legal | hr | marketing | partnerships | external | other.
• **factor_unit**: %, $, days, count, index, ratio, rating, binary, n/a.
• **raw_value / delta**: Use numbers when available; omit "+" (positive is implicit). Examples: raw_value: 2,000,000; delta: 10 (pp or % as appropriate). If unknown, use null.
• **description**: Short, plain explanation of the change.
• **magnitude**: 0–1 scale of business impact (see calibration above).
• **evidence_level/source/citation**: Use categorical source (article_text, press_release, analyst_report, company_statement, model_inference). Citation optional but encouraged.
• **quoted_people**: Distinguish from authors. Capture key quoted individuals here if relevant.

⸻

**IMPORTANT: Use the detailed rubrics provided for each belief factor. Don't default to moderate scores (0.4-0.6 range) - if the rubric suggests extreme values based on the evidence, use them. Avoid clustering around middle values when clear evidence supports higher or lower scores.**

## Example

**Article**: "Analyst says Apple to (1) introduce iPhone 17 redesign, (2) launch foldable iPhone in 2026, and (3) expand buyback."
**Authors**: ["Mark Gurman"]
**Quoted_people**: ["Senior supply chain source"]
**Tags**: ["Apple","iPhone 17","foldable iPhone","buyback","smartphones","innovation"]

```json
{
  "business_events": [
    {
      "event_type": "Product_Announcement",
      "trigger": "analyst_report",
      "entities": ["Apple"],
      "authors": ["Mark Gurman"],
      "scope": "company",
      "orientation": "predictive",
      "time_horizon_days": 360,
      "tags": ["Apple","iPhone 17","smartphones","innovation"],
      "quoted_people": ["Senior supply chain source"],
      "event_description": "iPhone 17 redesign signaled",
      "causal_chain": [
        {
          "step": 0,
          "factor": "product_versions_count",
          "factor_category": "product",
          "factor_unit": "count",
          "raw_value": null,
          "delta": 1,
          "description": "New redesigned SKU added",
          "movement": 1,
          "magnitude": 0.025,
          "orientation": "predictive",
          "about_time_days": 180,
          "effect_horizon_days": 365,
          "evidence_level": "implied",
          "evidence_source": "analyst_report",
          "causal_certainty": 0.8,
          "logical_directness": 0.9,
          "market_consensus_on_causality": 0.7,
          "belief": {
            "market_perception": {
              "intensity": 0.6,
              "hope_vs_fear": 0.5,
              "surprise_vs_anticipated": 0.2,
              "consensus_vs_division": 0.4,
              "narrative_strength": 0.7,
              "emotional_profile": ["anticipation", "optimism", "excitement"],
              "cognitive_biases": ["optimism_bias", "availability_heuristic"]
            },
            "ai_assessment": {
              "execution_risk": 0.6,
              "competitive_risk": 0.7,
              "business_impact_likelihood": 0.5,
              "timeline_realism": 0.4,
              "fundamental_strength": 0.6
            },
            "perception_gap": {
              "optimism_bias": 0.4,
              "risk_awareness": 0.5,
              "correction_potential": 0.6
            }
          }
        },
        {
          "step": 1,
          "factor": "units_sold",
          "factor_category": "sales",
          "factor_unit": "count",
          "raw_value": null,
          "delta": 1500000,
          "description": "Incremental units from refresh cycle",
          "movement": 1,
          "magnitude": 0.030,
          "orientation": "predictive",
          "about_time_days": 210,
          "effect_horizon_days": 365,
          "evidence_level": "implied",
          "evidence_source": "analyst_report",
          "causal_certainty": 0.7,
          "logical_directness": 0.8,
          "market_consensus_on_causality": 0.8,
          "belief": {
            "market_perception": {
              "intensity": 0.4,
              "hope_vs_fear": 0.3,
              "surprise_vs_anticipated": 0.1,
              "consensus_vs_division": 0.7,
              "narrative_strength": 0.6,
              "emotional_profile": ["anticipation", "confidence"],
              "cognitive_biases": ["anchoring_bias", "confirmation_bias"]
            },
            "ai_assessment": {
              "execution_risk": 0.05,
              "competitive_risk": 0.1,
              "business_impact_likelihood": 0.3,
              "timeline_realism": 0.9,
              "fundamental_strength": 0.6
            },
            "perception_gap": {
              "optimism_bias": 0.1,
              "risk_awareness": 0.0,
              "correction_potential": 0.2
            }
          }
        },
        {
          "step": 2,
          "factor": "revenue_growth_rate",
          "factor_category": "financial",
          "factor_unit": "%",
          "raw_value": null,
          "delta": 2,
          "description": "Units lift expected to raise revenue growth",
          "movement": 1,
          "magnitude": 0.035,
          "orientation": "predictive",
          "about_time_days": 240,
          "effect_horizon_days": 365,
          "evidence_level": "implied",
          "evidence_source": "model_inference",
          "causal_certainty": 0.7,
          "logical_directness": 0.8,
          "market_consensus_on_causality": 0.8,
          "belief": {
            "market_perception": {
              "intensity": 0.4,
              "hope_vs_fear": 0.3,
              "surprise_vs_anticipated": 0.1,
              "consensus_vs_division": 0.7,
              "narrative_strength": 0.5,
              "emotional_profile": ["anticipation"],
              "cognitive_biases": ["anchoring_bias"]
            },
            "ai_assessment": {
              "execution_risk": 0.15,
              "competitive_risk": 0.2,
              "business_impact_likelihood": 0.25,
              "timeline_realism": 0.7,
              "fundamental_strength": 0.5
            },
            "perception_gap": {
              "optimism_bias": -0.1,
              "risk_awareness": -0.1,
              "correction_potential": 0.1
            }
          }
        }
      ]
    },
    {
      "event_type": "Product_Announcement",
      "trigger": "analyst_report",
      "entities": ["Apple"],
      "authors": ["Mark Gurman"],
      "scope": "company",
      "orientation": "predictive",
      "time_horizon_days": 720,
      "tags": ["Apple","foldable iPhone","innovation"],
      "quoted_people": ["Senior supply chain source"],
      "event_description": "Foldable iPhone planned for 2026",
      "causal_chain": [
        {
          "step": 0,
          "factor": "new_product_category",
          "factor_category": "product",
          "factor_unit": "bool",
          "raw_value": null,
          "delta": 1,
          "description": "Apple enters foldable phone segment",
          "movement": 1,
          "magnitude": 0.065,
          "orientation": "predictive",
          "about_time_days": 365,
          "effect_horizon_days": 730,
          "evidence_level": "explicit",
          "evidence_source": "analyst_report",
          "causal_certainty": 1.0,
          "logical_directness": 1.0,
          "market_consensus_on_causality": 0.9,
          "belief": { "intensity": 0.6, "certainty_truth": 0.7, "certainty_impact": 0.8, "hope_vs_fear": 0.6, "surprise_vs_anticipated": 0.5, "consensus_vs_division": 0.4, "positive_vs_negative_sentiment": 0.5, "complexity_vs_clarity": 0.2, "risk_appetite": 0.7, "duration_expectation": 0.8, "urgency": 0.2, "attention_amplification": 0.7, "emotional_profile": ["excitement", "anticipation", "FOMO"], "cognitive_biases": ["optimism_bias", "availability_heuristic"] }
        },
        {
          "step": 1,
          "factor": "market_share",
          "factor_category": "financial",
          "factor_unit": "%",
          "raw_value": null,
          "delta": 1,
          "description": "Potential share gain from competing in new device category",
          "movement": 1,
          "magnitude": 0.070,
          "orientation": "predictive",
          "about_time_days": 365,
          "effect_horizon_days": 1095,
          "evidence_level": "implied",
          "evidence_source": "model_inference",
          "causal_certainty": 0.6,
          "logical_directness": 0.6,
          "market_consensus_on_causality": 0.6,
          "belief": { "intensity": 0.6, "certainty_truth": 0.6, "certainty_impact": 0.6, "hope_vs_fear": 0.7, "surprise_vs_anticipated": 0.2, "consensus_vs_division": 0.1, "positive_vs_negative_sentiment": 0.4, "complexity_vs_clarity": -0.1, "risk_appetite": 0.8, "duration_expectation": 0.9, "urgency": 0.1, "attention_amplification": 0.8, "emotional_profile": ["optimism", "uncertainty", "FOMO"], "cognitive_biases": ["overconfidence_bias"] }
        }
      ]
    }
  ]
}
```