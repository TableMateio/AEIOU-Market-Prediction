# AEIOU Core Hypotheses - Dual-Layer Inference Engine

## 🎯 Overview
These hypotheses test both **business causal chain extraction** and **belief formation modeling** as separate but intertwined layers of market prediction.

---

## 📊 **LAYER 1: Business Causal Chain Hypotheses**

### H1: Multi-Step Business Reasoning Extraction
**Assumption**: Investors extrapolate multi-step business consequences from news that aren't explicitly stated in articles.

**Hypothesis**: News events can be reliably decomposed into 2-5 step business causal chains where each step represents a logical business consequence.

**Example**: 
- News: "Apple announces AI partnership"
- Chain: AI integration → enhanced UX → upgrade demand → revenue growth → market share gain

**Testing Method**:
- Manual extraction of causal chains from 50 major events
- Inter-annotator agreement >70% on chain structure
- Validate chain steps map to actual business metrics over time

**Success Criteria**: 
✅ Human agreement >70% on causal chain identification
✅ Chain steps correlate with actual business outcomes
❌ If chains are inconsistent or don't predict outcomes

---

### H2: Business Pattern Reusability  
**Assumption**: While specific events are unique, underlying business patterns repeat and can be mathematically matched.

**Hypothesis**: Causal chain patterns (e.g., "tech_release → forced_refresh → sales_boost") occur multiple times across different events and can predict outcomes based on historical analogs.

**Example**:
- "Apple AI release" (unique) → "tech_release → forced_refresh" pattern (30+ historical matches)

**Testing Method**:
- Classify 100+ events into business pattern types
- Test pattern matching accuracy vs random matching
- Validate pattern-based predictions vs event-specific predictions

**Success Criteria**:
✅ Pattern-based predictions >65% accuracy
✅ Outperforms event-specific matching by >10%
❌ If patterns show no predictive improvement

---

### H3: Business Mechanism Classification
**Assumption**: Business logic follows predictable mechanisms that can be categorized and quantified.

**Hypothesis**: Causal chain steps operate through identifiable mechanisms (partnership_leverage, feature_driven_refresh, competitive_advantage, etc.) that have measurable impact ranges.

**Testing Method**:
- Build taxonomy of business mechanisms
- Measure impact ranges for each mechanism type
- Test if mechanism classification improves prediction accuracy

**Success Criteria**:
✅ Mechanism taxonomy covers >90% of causal chain steps
✅ Impact ranges show statistical significance
❌ If mechanisms are too vague or don't cluster meaningfully

---

## 🧠 **LAYER 2: Belief Formation Hypotheses**

### H4: Atomic Belief Factor Independence
**Assumption**: Complex investor beliefs can be decomposed into independent, measurable factors.

**Hypothesis**: The 10 belief dimensions (intensity, certainty, duration, hope/fear, etc.) can be measured independently and meaningfully combined to predict market reactions.

**Testing Method**:
- Extract belief factors from 100+ news events
- Factor analysis to test independence
- Test combined belief scores vs individual factors for prediction

**Success Criteria**:
✅ Factor analysis shows reasonable independence (correlation <0.7)
✅ Combined factors predict better than individual factors
❌ If factors are too correlated or don't improve prediction

---

### H5: Source Credibility Independent Impact
**Assumption**: Source credibility affects belief formation independent of news content.

**Hypothesis**: The same news content from different sources generates measurably different belief factor scores and market reactions.

**Testing Method**:
- Find identical/similar news from different sources
- Compare belief factor extraction across sources
- Measure market reaction variance for same content/different sources

**Success Criteria**:
✅ Credible sources generate stronger belief factors
✅ Market reactions correlate with source credibility scores
❌ If source has no measurable impact independent of content

---

### H6: Belief Temporal Decay Predictability
**Assumption**: Belief factors decay over time following predictable mathematical patterns.

**Hypothesis**: Belief strength follows exponential decay curves that can be modeled and used to predict belief persistence.

**Testing Method**:
- Track belief factor evolution over 30+ days post-event
- Fit decay curves to belief evolution patterns
- Test decay curve predictions vs actual belief persistence

**Success Criteria**:
✅ Decay curves fit belief evolution with R² >0.7
✅ Decay predictions correlate with sustained market impact
❌ If belief evolution is random or unpredictable

---

## 👥 **LAYER 3: Investor Archetype Hypotheses**

### H7: Investor Archetype Belief Differentiation
**Assumption**: Different investor types (retail, institutional, algorithmic) process the same belief information differently.

**Hypothesis**: Retail and institutional investors show measurably different belief factor patterns and reaction probabilities to the same news.

**Testing Method**:
- Analyze trading volume signatures by time-of-day
- Compare immediate vs delayed reactions
- Test if archetype classification improves prediction

**Success Criteria**:
✅ Clear clustering of reaction patterns by investor type
✅ Archetype-specific models outperform general models
❌ If all investors show similar belief processing

---

### H8: Passive Belief Cohort Detection
**Assumption**: Many investors form beliefs but don't trade immediately, creating "passive belief cohorts."

**Hypothesis**: We can detect investors who form beliefs (via sentiment/attention metrics) but don't immediately trade, and predict when they might activate.

**Testing Method**:
- Track attention metrics vs trading volume mismatches
- Identify events with high attention but delayed/minimal trading
- Test passive cohort activation prediction

**Success Criteria**:
✅ Identifiable passive cohort patterns
✅ Passive-to-active transition predictions >60% accuracy
❌ If no detectable passive behavior or unpredictable activation

---

## 🔄 **LAYER 4: System Integration Hypotheses**

### H9: Dual-Layer Prediction Superiority
**Assumption**: Combining business causal chains with belief formation predicts better than either layer alone.

**Hypothesis**: Business pattern matching + belief factor modeling outperforms sentiment analysis, simple causal chains, or belief factors alone.

**Testing Method**:
- Backtest 4 models: sentiment-only, causal-only, belief-only, dual-layer
- Compare prediction accuracy across multiple time horizons
- Test statistical significance of improvement

**Success Criteria**:
✅ Dual-layer model >65% directional accuracy
✅ Outperforms single-layer approaches by >10%
✅ Statistical significance p<0.05

---

### H10: Mathematical Composability
**Assumption**: Business factors and belief factors can be mathematically combined using vector operations.

**Hypothesis**: Vector similarity matching on combined business+belief vectors finds better historical analogs than content similarity alone.

**Testing Method**:
- Build combined vectors: [business_pattern_vector + belief_factor_vector]
- Test cosine similarity matching vs traditional content similarity
- Validate analog quality predicts actual outcomes

**Success Criteria**:
✅ Vector similarity finds more predictive analogs
✅ Combined vectors outperform content similarity by >15%
❌ If mathematical combination shows no improvement

---

## 🧪 **Validation Framework**

### Phase 1 Validation (Weeks 1-4)
- **H1, H2, H3**: Business causal chain extraction and pattern matching
- **H4, H5**: Basic belief factor independence and source credibility

### Phase 2 Validation (Weeks 5-8)  
- **H6, H7**: Temporal dynamics and investor archetypes
- **H8**: Passive cohort detection

### Phase 3 Validation (Weeks 9-12)
- **H9, H10**: System integration and mathematical composability
- **Overall system validation**: >60% prediction accuracy

### Kill Criteria
**Stop development if**:
- Business causal chain agreement <60% (H1 fails)
- Pattern matching shows no improvement over random (H2 fails)
- Belief factors are too correlated or meaningless (H4 fails)
- Dual-layer approach shows no improvement (H9 fails)

### Pivot Criteria
**Consider pivots if**:
- Causal chains work but belief factors don't → Focus on business logic only
- Belief factors work but causal chains don't → Focus on sentiment enhancement
- Both work but can't combine → Build parallel systems
- Apple-specific success only → Become Apple specialist tool

---

## 📈 **Success Metrics Summary**

| Hypothesis | Success Threshold | Measurement Method |
|------------|------------------|-------------------|
| H1: Causal Chain Extraction | >70% human agreement | Inter-annotator reliability |
| H2: Pattern Reusability | >65% accuracy | Backtesting vs random |
| H3: Mechanism Classification | >90% coverage | Taxonomy completeness |
| H4: Belief Factor Independence | <0.7 correlation | Factor analysis |
| H5: Source Credibility Impact | Measurable variance | Market reaction correlation |
| H6: Temporal Decay | R² >0.7 | Curve fitting |
| H7: Archetype Differentiation | Clear clustering | Volume signature analysis |
| H8: Passive Cohort Detection | >60% activation prediction | Trading pattern analysis |
| H9: Dual-Layer Superiority | >65% accuracy, >10% improvement | Backtesting comparison |
| H10: Mathematical Composability | >15% analog improvement | Vector similarity validation |

This framework ensures every component of our dual-layer system is testable, measurable, and can be validated against real market outcomes.
