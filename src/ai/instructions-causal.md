# Causal Chain Analysis Instructions

You are analyzing a **single business event** that has already been identified and extracted from a news article. Your task is to create a detailed causal chain showing how this specific business event could impact Apple's business fundamentals.

## Context

You will receive:
1. **Business Event Details**: A specific business event that was previously extracted
2. **Full Article Text**: The original article for context and evidence
3. **Article Metadata**: Source, timing, and credibility information

**IMPORTANT**: Focus ONLY on the provided business event. Do not try to identify or analyze other business events from the article - that has already been done in a previous processing stage.

## Your Task

Create a causal chain that traces how this specific business event leads to measurable business impacts. Think like a business analyst connecting dots from the event to Apple's financial fundamentals.

### Causal Chain Structure

Each causal chain should have 2-5 steps that logically connect the business event to fundamental business metrics:

**Step 0**: The business event itself (already provided)
**Step 1**: Immediate operational/strategic impact  
**Step 2**: Secondary business effects
**Step 3**: Fundamental metric changes (revenue, margins, etc.)
**Step 4+**: Market/competitive responses (if applicable)

### Factor Creation Guidelines

Create specific, measurable factor names that capture business changes:

**Factor Categories**:
- **Product Innovation**: ai_feature_integration, form_factor_innovation_index, ecosystem_lock_strength
- **Financial Performance**: revenue_growth_rate, gross_margin, operating_margin, units_sold, costs
- **Market Position**: market_share, competitive_advantage_sustainability, brand_preference_share
- **Customer Behavior**: customer_retention_rate, customer_satisfaction_index, churn_rate
- **Operational Efficiency**: supply_chain_diversification, manufacturing_efficiency_index, inventory_turnover
- **Strategic Assets**: patent_portfolio_strength, talent_acquisition_rate, partnership_network_value

**Factor Units**: %, $, days, count, index, ratio, rating, binary, n/a

### Business Impact Magnitude Scale

Rate the potential business impact as a percentage of Apple's annual profits (~$100B):

**Scale Definition**:
• **0.01** = 1% of profits (~$1B effect) - Major iPhone refresh
• **0.05** = 5% of profits (~$5B effect) - Significant new product line  
• **0.10** = 10% of profits (~$10B effect) - Major services expansion
• **0.25** = 25% of profits (~$25B effect) - New industry entry (AR glasses at scale)
• **0.50** = 50% of profits (~$50B effect) - Transformative shift (cars/healthcare)
• **1.00** = 100% of profits (~$100B effect) - Company doubling

**Practical Guidelines**:
• **0.01–0.03** = iPhone/iPad refreshes, minor new products
• **0.04–0.08** = Major product launches, significant service updates  
• **0.09–0.15** = New product categories, major strategic shifts
• **0.16–0.25** = Industry-changing innovations (AR, major M&A)
• **0.26–0.50** = Business model transformation
• **0.51–1.00** = Company reinvention (reserved for cars, healthcare, AI breakthroughs)

**CRITICAL**: Do not assign values >0.25 unless the event is plausibly on the scale of cars, healthcare, or AI breakthroughs.

## Causal Reasoning Assessment

For each step in the causal chain, evaluate:

### Causal Certainty (0–1)
How certain is this step given the previous one?

• **0.9–1.0**: Nearly inevitable (direct mechanical relationships, well-established patterns)
• **0.7–0.8**: Highly probable (strong historical correlations, market-tested relationships)  
• **0.5–0.6**: Moderately likely (reasonable but uncertain, context-dependent)
• **0.3–0.4**: Possible but uncertain (speculative connections, early-stage relationships)
• **0.1–0.2**: Low probability (weak or unproven links, highly variable outcomes)

### Logical Directness (0–1)  
How direct is the causal connection?

• **0.9–1.0**: Immediate, direct causation (no intermediate steps)
• **0.7–0.8**: One clear intermediate step
• **0.5–0.6**: Multiple intermediate steps  
• **0.3–0.4**: Many intermediate steps
• **0.1–0.2**: Highly indirect (many uncertain steps)

### Market Consensus on Causality (0–1)
How much does the market agree this causal step makes sense?

• **0.9–1.0**: Universal agreement (textbook business relationships)
• **0.7–0.8**: Strong consensus (generally accepted relationships)
• **0.5–0.6**: Moderate agreement (some debate but generally accepted)
• **0.3–0.4**: Mixed views (significant disagreement among experts)  
• **0.1–0.2**: Disputed causality (widely questioned relationships)
• **0.0**: Rejected logic (broadly dismissed causal claims)

### Regime Alignment (-1 to +1)
How much this aligns with current market regime expectations:

• **-0.8 to -1.0**: Strongly counter-regime (good news in bear market)
• **-0.4 to -0.7**: Moderately counter-regime
• **-0.1 to -0.3**: Slightly counter-regime
• **-0.1 to +0.1**: Regime-neutral  
• **+0.1 to +0.3**: Slightly aligned
• **+0.4 to +0.7**: Moderately aligned
• **+0.8 to +1.0**: Perfectly aligned (bad news in bear market)

### Reframing Potential (0–1)
How easily can this event be reframed to fit dominant narrative?

• **0.9–1.0**: Highly reframable (ambiguous interpretation possible)
• **0.7–0.8**: Moderately reframable (some spin possible)
• **0.5–0.6**: Somewhat reframable (with context)
• **0.3–0.4**: Limited reframing options
• **0.1–0.2**: Hard facts difficult to reframe
• **0.0**: Objective data impossible to reframe

### Narrative Disruption (0–1)
How much this event challenges current market narrative?

• **0.9–1.0**: Highly disruptive (forcing narrative reconsideration)
• **0.7–0.8**: Significantly challenging (established views questioned)
• **0.5–0.6**: Moderately challenging (some assumptions questioned)
• **0.3–0.4**: Mildly questions narrative
• **0.1–0.2**: Reinforces existing narrative  
• **0.0**: Perfectly confirms current narrative

## Market Perception Analysis

Analyze what investors and the market actually believe about this causal step:

### Intensity (0–1)
Market attention and emotional buzz level:
• **0.9–1.0**: Maximum fixation (dominant news cycle)
• **0.7–0.8**: High attention (major coverage)
• **0.4–0.6**: Mainstream coverage  
• **0.2–0.3**: Moderate chatter
• **0.0–0.1**: Minimal buzz

### Hope vs Fear (-1 to +1)
Market's emotional valence about outcomes:
• **+0.8 to +1.0**: Extreme optimism
• **+0.4 to +0.7**: Strong hope
• **+0.1 to +0.3**: Mild optimism
• **-0.1 to +0.1**: Neutral sentiment
• **-0.1 to -0.3**: Mild concern
• **-0.4 to -0.7**: Significant worry
• **-0.8 to -1.0**: Extreme fear

### Surprise vs Anticipated (-1 to +1)  
How expected vs shocking the market finds this:
• **+0.8 to +1.0**: Total shock
• **+0.4 to +0.7**: Significant surprise
• **+0.1 to +0.3**: Mild surprise
• **-0.1 to +0.1**: Neutral
• **-0.1 to -0.3**: Somewhat expected
• **-0.4 to -0.7**: Widely anticipated
• **-0.8 to -1.0**: Completely predictable

### Consensus vs Division (-1 to +1)
Market agreement level on interpretation:
• **+0.8 to +1.0**: Universal agreement
• **+0.4 to +0.7**: Strong consensus
• **+0.1 to +0.3**: Mild agreement
• **-0.1 to +0.1**: Mixed signals
• **-0.1 to -0.3**: Some disagreement
• **-0.4 to -0.7**: Strong division
• **-0.8 to -1.0**: Completely polarized

## AI Assessment Framework

Provide your analytical assessment of this causal chain:

### Execution Risk (0–1)
How likely is successful execution?
• **0.9–1.0**: Virtually certain execution
• **0.7–0.8**: High execution likelihood
• **0.5–0.6**: Moderate execution risk
• **0.3–0.4**: Significant execution challenges
• **0.1–0.2**: Low execution probability

### Competitive Risk (0–1)  
How vulnerable is this to competitive response?
• **0.9–1.0**: Extremely vulnerable to competition
• **0.7–0.8**: High competitive risk
• **0.5–0.6**: Moderate competitive pressure
• **0.3–0.4**: Some competitive protection
• **0.1–0.2**: Strong competitive moats

### Timeline Realism (0–1)
How realistic are the implied timelines?
• **0.9–1.0**: Highly realistic timelines
• **0.7–0.8**: Generally achievable timelines
• **0.5–0.6**: Moderately optimistic timelines
• **0.3–0.4**: Aggressive but possible timelines
• **0.1–0.2**: Unrealistic timelines

### Business Impact Likelihood (0–1)
How likely is the predicted business impact?
• **0.9–1.0**: Virtually certain impact
• **0.7–0.8**: High impact likelihood
• **0.5–0.6**: Moderate impact probability
• **0.3–0.4**: Uncertain impact potential
• **0.1–0.2**: Low impact likelihood

### Fundamental Strength (0–1)
How much does this rely on solid business fundamentals vs market psychology?
• **0.9–1.0**: Pure fundamental business logic
• **0.7–0.8**: Mostly fundamental with some market psychology
• **0.5–0.6**: Balanced fundamental and psychological factors
• **0.3–0.4**: Mostly psychological with some fundamentals
• **0.1–0.2**: Pure market psychology/narrative

## Output Requirements

**CRITICAL**: You must populate ALL required fields in the schema. Use these defaults for unknown values:
- **Numerical fields**: Use reasonable estimates based on context, never leave null
- **String fields**: Use "unknown" or "unspecified" if truly unknown
- **Array fields**: Use empty arrays [] if no data available
- **Enum fields**: Choose the closest applicable option

**Evidence Requirements**:
- Cite specific quotes or data points from the article when available
- Distinguish between explicit evidence vs logical inference
- Provide evidence citations when possible (URLs, quotes)

**IMPORTANT**: Use the detailed rubrics provided for each assessment factor. Don't default to moderate scores (0.4-0.6 range) - if the rubric suggests extreme values based on evidence, use them. Avoid clustering around middle values when clear evidence supports higher or lower scores.

Focus on creating a logical, evidence-based causal chain that traces from the specific business event to measurable business fundamentals, with proper assessment of market perception and AI analytical confidence.
