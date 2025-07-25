PRD 1

**Product Requirements Document (PRD)**

**Project Name:** Narrative Signal — Phase 1 MVP
**Goal:** Build an MVP of a stock movement prediction system that models how investor beliefs are formed in response to news, tracks the causal impact of those beliefs on expected business outcomes, and distinguishes perceived vs real value to predict market reaction with epistemic rigor.

---

## I. Summary
Narrative Signal is an inference engine that models how news creates investor beliefs about business consequences, and how those beliefs shape capital flows. The system maps cause-effect chains from news → belief → expected business impact → stock movement, distinguishing short-term narrative spikes from long-term value. MVP will focus on a small subset of companies and event types, while establishing the data backbone and belief modeling layer.

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
5. **Store all data** in PostgreSQL (initial), structured for causal chaining
   - `news_articles`, `stock_prices`, `financials`, `narrative_threads`

#### Step 2: News-Belief-Price Causal Chains
**Goal:** Build structured chains from news to expected business outcomes to market reaction

1. For each article, use GPT to extract:
   - **Event Type** (e.g., product launch, lawsuit, executive exit)
   - **Affected Business Area** (e.g., growth driver, trust signal, cost center)
   - **Forecasted Business Consequence** (e.g., revenue dip, margin expansion)
   - **Investor Interpretation** (bullish/bearish, believable/unbelievable)
2. Store as structured causal paths:
   ```json
   {
     "event": "Product Launch",
     "belief": "Will drive upgrade cycle",
     "business_impact": "Revenue up",
     "investor_reaction": "Price up (1-day)"
   }
   ```

#### Step 3: Narrative Arc Tracker
**Goal:** Track narrative evolution over time

1. Cluster articles into evolving "narrative threads"
2. Assign lifespan, amplification decay curve, belief-shift points
3. Link investor reaction not to single headlines, but to cumulative belief formed across the arc

#### Step 4: Analog Finder + Credence Estimator
**Goal:** Search for past narratives with similar causal paths

1. Use vector DB (Pinecone/Weaviate) + event type ontology
2. Retrieve similar causal chains based on:
   - Event type
   - Business area affected
   - Investor segment likely to react
   - Degree of belief credibility (e.g., from market reaction, volatility, follow-on coverage)

#### Step 5: Belief Propagation Model
**Goal:** Predict if this belief will hold, spread, or collapse

1. Simulate belief lifespan using:
   - Similar past cases
   - Price + volume + news recurrence decay curves
   - Type of investor affected (retail/institutional/quant)
2. Assign:
   - **Belief Strength** (probability it will persist)
   - **Impact Vector** (expected business outcome class: margin, churn, etc.)
   - **Market Reaction Type** (short spike, long build, fade-out)

#### Step 6: Prediction + Explanation Output
**Goal:** Provide not just a label, but a reasoning chain

1. Output:
   - Predicted direction (up/down/neutral)
   - Confidence score (based on analogs + believability)
   - Reasoning chain (narrative → business impact → forecast → market reaction)
   - Belief classification (e.g., perceived hype, probable truth, lagging belief)

#### Step 7: Evaluation + Reflexivity Loop
**Goal:** Track belief accuracy and system integrity

1. Monitor real price movement + earnings vs prediction
2. Update belief validity scores
3. Add failed predictions to inverse log:
   - Was the logic bad?
   - Did market disbelieve?
   - Did real results contradict the narrative?

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

