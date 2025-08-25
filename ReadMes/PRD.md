PRD 1

**Product Requirements Document (PRD)**

**Project Name:** AEIOU Belief Engine — Phase 1 MVP
**Goal:** Build an MVP that models how news creates investor beliefs through atomic factor decomposition, tracking the mathematical formation of market psychology to predict stock movements with epistemic rigor. The system distinguishes between perception artifacts (news) and business reality, modeling belief states as mathematical vectors rather than simple sentiment scores.

---

## I. Summary
AEIOU is a dual-layer inference engine that models both **business causality chains** and **belief formation** about those chains. It recognizes that investors don't just react to news—they extrapolate multi-step business consequences and form beliefs about each step. The system maps:

**Reality** → **Journalist Perception** → **News Article** → **Investor Business Reasoning** → **Causal Chain Extraction** → **Belief Formation Per Chain Step** → **Market Action**

**Key Innovation**: The system decomposes investor reasoning into:
1. **Business Causal Chains**: Multi-step business logic (e.g., tech release → refresh cycle → revenue growth → market share gain)
2. **Belief Factors Per Step**: Each business step gets scored across 10 belief dimensions (intensity, certainty, duration, etc.)
3. **Historical Analog Matching**: Match causal patterns (not just events) to predict outcomes

Example: "Apple AI release" might be unique, but "tech release → forced refresh cycle" has happened 30+ times and can be mathematically modeled.

---

## II. Phase 1: Core MVP Scope

### ✅ **Step-by-Step Roadmap**

#### Step 1: Data Foundation
**Goal:** Ingest and align historical news, price data, and fundamentals

1. **Choose 10-20 public companies** (e.g., Apple, Tesla, Nvidia, Meta, JPMorgan)
2. **Ingest historical news** (Alpha Vantage News API or similar)
   - Required: headline, full article, timestamp, source
3. **Ingest historical stock data** (Alpha Vantage)
   - Daily close price, open/high/low, volume
   - Optional: intraday data for precise reaction analysis
4. **Ingest financial health data** (Morningstar API)
   - Revenue, net income, margins, etc.
5. **Store all data** in linked Airtable schema (Phase 1) → Supabase (scaling)
   - `News Events` (main table with belief vectors)
   - `News Sources` (credibility scoring, bias detection)
   - `Authors` (expertise mapping, track record)
   - `Topics` (attention factors, market impact potential)
   - `Tickers` (volatility, news sensitivity)

#### Step 2: Business Causal Chain Extraction + Belief Formation
**Goal:** Extract multi-step business reasoning chains AND model beliefs about each step

1. **Business Causal Chain Extraction:**
   ```typescript
   // Example: Apple AI Partnership News
   {
     "causal_chain": [
       {
         "step": 1,
         "business_logic": "AI integration into iOS/macOS",
         "mechanism": "partnership_leverage",
         "raw_impact": 0.15,  // 15% capability boost
         "timeframe": "6_months"
       },
       {
         "step": 2, 
         "business_logic": "enhanced user experience → upgrade demand",
         "mechanism": "feature_driven_refresh",
         "raw_impact": 0.08,  // 8% sales boost
         "timeframe": "12_months"
       },
       {
         "step": 3,
         "business_logic": "market share gain vs competitors",
         "mechanism": "competitive_advantage",
         "raw_impact": 0.05,  // 5% market share
         "timeframe": "18_months"
       }
     ]
   }
   ```

2. **Belief Formation Per Chain Step:**
   ```typescript
   // Each step gets belief dimensions
   {
     "step_1_beliefs": {
       "intensity_belief": 0.80,      // Strong belief in AI integration
       "duration_belief": 0.90,       // Long-lasting capability
       "certainty_level": 0.75,       // Moderate confidence
       "hope_vs_fear": 0.70,         // Optimistic
       "doubt_factor": 0.30          // Some skepticism about execution
     },
     "step_2_beliefs": {
       "intensity_belief": 0.65,      // Moderate belief in upgrade cycle
       "duration_belief": 0.40,       // Shorter-term effect
       "certainty_level": 0.50,       // Lower confidence
       "hope_vs_fear": 0.75,         // Very optimistic
       "doubt_factor": 0.45          // Higher doubt about consumer response
     }
   }
   ```

3. **Historical Pattern Matching**: Match causal chain patterns (not just events) to historical analogs

#### Step 3: Temporal Belief Dynamics
**Goal:** Model how belief factors evolve and decay over time

1. Track belief factor evolution across multiple time horizons:
   ```typescript
   {
     "belief_half_life": 14,           // Days until 50% belief decay
     "attention_decay_rate": 0.15,     // Daily attention decrease
     "persistence_probability": 0.30,  // Chance of sustained coverage
     "amplification_curve": [0.9, 0.7, 0.4, 0.2] // Days 1-4 attention
   }
   ```

2. Model belief interaction effects between factors
3. Distinguish memory vs fresh belief formation
4. Track passive investor cohorts (who don't react initially)

#### Step 4: Causal Chain Pattern Matching + Belief Similarity
**Goal:** Find historical analogs using both business logic patterns AND belief similarities

1. **Business Pattern Matching:**
   ```typescript
   // Match causal chain structures
   {
     "pattern_type": "feature_driven_refresh",
     "chain_structure": ["capability_boost", "ux_improvement", "upgrade_demand"],
     "historical_matches": [
       {
         "event": "iPhone Face ID introduction",
         "similarity": 0.85,
         "outcome": "12% sales boost in next quarter"
       },
       {
         "event": "M1 chip release", 
         "similarity": 0.78,
         "outcome": "15% market share gain"
       }
     ]
   }
   ```

2. **Belief Vector Similarity:**
   ```typescript
   belief_similarity = cosine_similarity(
     current_step_beliefs,
     historical_step_beliefs
   )
   ```

3. **Combined Scoring:** Business pattern similarity (0.6 weight) + Belief similarity (0.4 weight)

#### Step 5: Investor Archetype Belief Processing
**Goal:** Model how different investor types process the same belief information

1. Separate belief processing by investor archetype:
   ```typescript
   {
     "institutional": {
       "reaction_probability": 0.75,
       "reaction_magnitude": 0.40,
       "time_to_action": 1,          // days
       "belief_persistence": 0.60,
       "credibility_weighting": 0.90 // High source credibility focus
     },
     "retail": {
       "reaction_probability": 0.85,
       "reaction_magnitude": 0.70,
       "time_to_action": 0.5,
       "belief_persistence": 0.30,
       "credibility_weighting": 0.40 // Lower source discrimination
     }
   }
   ```

2. Model counterfactual scenarios and belief surprise factors
3. Detect passive belief cohorts (who form beliefs but don't trade)

#### Step 6: Mathematical Prediction with Belief Decomposition
**Goal:** Generate predictions with full mathematical audit trail

1. Output comprehensive belief-based prediction:
   ```typescript
   {
     "predicted_direction": "up",
     "confidence_interval": [0.65, 0.85],
     "belief_vector_similarity": 0.82,
     "dominant_factors": ["revenue_growth", "market_expansion"],
     "investor_archetype_reactions": {
       "institutional": {"direction": "up", "magnitude": 0.40},
       "retail": {"direction": "up", "magnitude": 0.70}
     },
     "temporal_prediction": {
       "1_day": 0.75,
       "1_week": 0.45,
       "1_month": 0.20
     },
     "mathematical_audit_trail": [
       "Source credibility (0.90) × belief intensity (0.75) = 0.675",
       "Business factor magnitude (0.08) × certainty (0.80) = 0.064",
       "Combined belief strength: 0.72"
     ]
   }
   ```

#### Step 7: Belief Factor Validation and System Learning
**Goal:** Validate belief factors against market outcomes and improve the system

1. Mathematical validation framework:
   - Track accuracy of individual belief factors vs outcomes
   - Measure belief factor stability over time
   - Validate belief vector combinations vs single factors
   - Test belief decay curves against actual attention patterns

2. Pattern degradation detection:
   - Monitor if successful belief patterns stop working
   - Detect when market "learns" about our patterns
   - Track overfitting to historical data

3. Continuous belief calibration:
   - Update source credibility scores based on prediction accuracy
   - Refine belief factor weightings based on outcomes
   - Improve investor archetype detection algorithms

#### Step 8: Testing Interface
**Goal:** Let users explore the system with transparency

1. Streamlit or React front-end
   - Input: headline or article
   - Outputs:
     - Causal path generated
     - Matching analogs
     - Predicted belief + market reaction
     - Confidence levels
     - Option to view past prediction logs

---

## III. Future Phases (Preview)

### Phase 2: Temporal Causal Graph Engine
- Upgrade structured chains into dynamic graph model
- Use TGNs or DoWhy to simulate interventions (e.g., "What if this happened in a recession?")

### Phase 3: Investor Archetype Inference
- Build latent segments based on reaction behavior and sources
- Customize prediction weighting per group

### Phase 4: Market Memory + Feedback
- Model how beliefs shift over time and reemerge
- Measure predictive half-lives of narratives by type and source

---

## IV. Engineering Requirements
- Python backend (FastAPI preferred)
- PostgreSQL for structured storage
- Pinecone or Weaviate for analog retrieval
- GPT-4 API for narrative decomposition
- Streamlit/React for UI
- GitHub CI + optional Docker for reproducibility

---

## V. Success Metrics (Epistemic + Functional)
- Causal path extraction accuracy > 75%
- Prediction hit rate > 60% for high-believability cases
- Distinction between perceived vs proven value achieved in >70% of stories
- Reflexive improvement loop reduces repeat errors over 3 cycles
- Time to explainable prediction < 5 seconds

---

**Note:** MVP is **not** a movement classifier. It’s an epistemic reasoning engine built atop a causal inference scaffold. Prediction is a *byproduct* of understanding.

