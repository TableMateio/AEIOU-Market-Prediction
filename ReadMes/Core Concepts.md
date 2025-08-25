# AEIOU Core Concepts - Dual-Layer Belief Engine

## 🎯 Fundamental Architecture

**AEIOU operates on a dual-layer inference system that separates business logic from psychological belief formation, recognizing that markets are driven by both rational analysis and human psychology.**

---

## 📰 **Core Concept 1: News as Perception Artifacts**

**Concept**: News articles are not "what happened" but rather journalist interpretations of events, creating a perception layer between reality and investor reactions.

**Framework**: 
```
Reality → Journalist Perception → News Article → Investor Interpretation → Market Action
```

**Mathematical Implementation**:
- Source credibility scoring (0-1): Reuters=0.95, Seeking Alpha=0.65
- Bias detection: Institutional weight vs Retail weight per source
- Perception variance measurement across multiple sources for same event

**Test**: Compare same event across 3+ sources, measure belief factor variance >0.3
**Success**: Source credibility independently affects market reactions

---

## 🔗 **Core Concept 2: Business Causal Chain Extraction**

**Concept**: Investors extrapolate multi-step business consequences that aren't explicitly stated in news articles. These chains follow logical business patterns.

**Framework**:
```
News Event → Business Step 1 → Business Step 2 → Business Step 3 → Market Impact
Example: "AI Partnership" → "Capability Boost" → "UX Enhancement" → "Upgrade Demand" → "Revenue Growth"
```

**Mathematical Implementation**:
```typescript
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
    }
  ]
}
```

**Test**: Human agreement >70% on chain structure extraction
**Success**: Causal chains correlate with actual business outcomes over time

---

## 🧠 **Core Concept 3: Atomic Belief Factor Decomposition**

**Concept**: Complex investor beliefs can be broken down into 10 independent, measurable mathematical factors that can be scored and combined.

**Framework**: Every business factor gets scored across belief dimensions:
```typescript
{
  "intensity_belief": 0.75,      // How strongly they believe it
  "duration_belief": 0.60,       // How long they think it will last
  "certainty_level": 0.80,       // Confidence in assessment
  "hope_vs_fear": 0.65,         // Emotional spectrum (0=fear, 1=hope)
  "doubt_factor": 0.25,          // Skepticism level
  "attention_intensity": 0.90,   // Media/social attention
  "social_amplification": 0.70,  // Viral/sharing potential
  "expert_consensus": 0.85,      // Do experts agree?
  "urgency_perception": 0.60,    // How urgent this feels
  "believability_score": 0.72    // Overall market credence
}
```

**Test**: Factor analysis shows independence (correlation <0.7), combined factors predict better than individual
**Success**: Atomic factors meaningfully combine to predict market reactions

---

## 🔄 **Core Concept 4: Business Pattern Reusability**

**Concept**: While specific events are unique, underlying business patterns repeat and can be mathematically matched across different time periods and companies.

**Framework**:
```
Unique Event: "Apple AI Partnership with OpenAI" (never happened before)
↓
Reusable Pattern: "tech_capability_boost → feature_driven_refresh → upgrade_cycle"
↓ 
Historical Matches: iPhone Face ID (2017), M1 chip (2020), 5G integration (2020)
```

**Mathematical Implementation**:
- Pattern taxonomy: partnership_leverage, feature_driven_refresh, competitive_advantage
- Vector similarity matching on business mechanism sequences
- Outcome correlation: Historical pattern outcomes predict current pattern results

**Test**: Pattern-based predictions >65% accuracy, >10% improvement over event-specific matching
**Success**: Business patterns show predictive stability across time

---

## 👥 **Core Concept 5: Investor Archetype Differentiation**

**Concept**: Different investor types (retail, institutional, algorithmic) process the same belief information through different psychological and operational frameworks.

**Framework**:
```typescript
{
  "institutional": {
    "reaction_probability": 0.75,
    "reaction_magnitude": 0.40,
    "time_to_action": 1,          // days
    "credibility_weighting": 0.90, // High source discrimination
    "belief_persistence": 0.60
  },
  "retail": {
    "reaction_probability": 0.85,
    "reaction_magnitude": 0.70,
    "time_to_action": 0.5,
    "credibility_weighting": 0.40, // Lower source discrimination
    "belief_persistence": 0.30
  }
}
```

**Mathematical Implementation**:
- Trading volume signatures by time-of-day
- Reaction speed analysis (immediate vs delayed)
- Source credibility sensitivity measurement

**Test**: Clear clustering of reaction patterns, archetype-specific models outperform general models
**Success**: Investor type detection improves prediction accuracy

---

## ⏰ **Core Concept 6: Temporal Belief Dynamics**

**Concept**: Belief factors evolve and decay over time following predictable mathematical patterns that can be modeled and used for prediction.

**Framework**:
```typescript
{
  "belief_half_life": 14,           // Days until 50% belief decay
  "attention_decay_rate": 0.15,     // Daily attention decrease
  "persistence_probability": 0.30,  // Chance of sustained coverage
  "amplification_curve": [0.9, 0.7, 0.4, 0.2] // Days 1-4 attention
}
```

**Mathematical Implementation**:
- Exponential decay curve fitting: B(t) = B₀ × e^(-λt)
- Attention half-life calculation
- Belief persistence probability modeling

**Test**: Decay curves fit belief evolution with R² >0.7, predict sustained market impact
**Success**: Temporal dynamics improve multi-day prediction accuracy

---

## 🔍 **Core Concept 7: Passive Belief Cohort Detection**

**Concept**: Many investors form beliefs but don't trade immediately, creating "passive belief cohorts" that can be detected and their activation predicted.

**Framework**:
- High attention metrics + Low trading volume = Passive cohort formation
- Passive-to-active triggers: confirmation events, threshold breaches, time decay
- Cohort size estimation via attention/volume mismatches

**Mathematical Implementation**:
```typescript
{
  "attention_volume_ratio": 3.2,    // 3.2x normal attention vs volume
  "passive_cohort_size": 0.65,      // 65% of interested investors not trading
  "activation_probability": 0.40,    // 40% chance of future activation
  "activation_triggers": ["confirmation_event", "price_threshold", "time_decay"]
}
```

**Test**: Identifiable passive patterns, >60% activation prediction accuracy
**Success**: Passive cohort detection improves delayed reaction prediction

---

## 🧮 **Core Concept 8: Mathematical Composability**

**Concept**: Business causal chains and belief factors can be mathematically combined using vector operations to find better historical analogs than content similarity alone.

**Framework**:
```typescript
// Combined Vector Representation
combined_vector = [
  ...business_pattern_vector,  // [0.8, 0.6, 0.9] - pattern similarity
  ...belief_factor_vector     // [0.75, 0.60, 0.80] - belief dimensions
]

// Similarity Matching
similarity_score = cosine_similarity(current_vector, historical_vectors)
```

**Mathematical Implementation**:
- Vector space representation of events
- Weighted combination: Business pattern (60%) + Belief factors (40%)
- Cosine similarity matching for historical analogs

**Test**: Combined vectors find analogs that predict outcomes >15% better than content similarity
**Success**: Mathematical composability improves analog quality and prediction accuracy

---

## 🎯 **Integration Framework: How Concepts Combine**

```
1. News Article (Perception Artifact)
         ↓
2. Business Causal Chain Extraction (Multi-step Logic)
         ↓
3. Belief Factor Scoring (Per Chain Step)
         ↓
4. Pattern Matching (Historical Business Patterns + Belief Similarity)
         ↓
5. Investor Archetype Processing (Different Types React Differently)
         ↓
6. Temporal Dynamics Modeling (Belief Evolution Over Time)
         ↓
7. Passive Cohort Detection (Delayed Reactions)
         ↓
8. Mathematical Prediction (Combined Vector Similarity + Decay Curves)
```

---

## 📊 **Success Metrics for Core Concepts**

| Concept | Measurement | Success Threshold |
|---------|-------------|------------------|
| News as Perception | Source credibility variance | Measurable impact on reactions |
| Business Causal Chains | Human agreement | >70% consistency |
| Atomic Belief Factors | Factor independence | <0.7 correlation |
| Pattern Reusability | Prediction accuracy | >65% vs random |
| Investor Archetypes | Clustering quality | Clear differentiation |
| Temporal Dynamics | Curve fitting | R² >0.7 |
| Passive Cohorts | Activation prediction | >60% accuracy |
| Mathematical Composability | Analog quality | >15% improvement |

---

## 🚀 **Why This Architecture Works**

1. **Separates Logic from Psychology**: Business reasoning ≠ Belief formation
2. **Mathematically Precise**: All components are quantifiable and testable
3. **Historically Grounded**: Patterns based on actual market behavior
4. **Psychologically Realistic**: Models actual investor cognitive processes
5. **Temporally Aware**: Accounts for belief evolution over time
6. **Scalable**: Vector operations work for any number of events/stocks
7. **Validatable**: Every component has clear success criteria

This framework transforms market prediction from pattern recognition to understanding the mathematical structure of investor reasoning and belief formation.
