# AEIOU Database Schema - Knowledge Architecture Implementation

## 🎯 Overview
This schema captures the knowledge architecture for business event decomposition and belief formation analysis, building on the existing Airtable structure.

---

## 📊 **Enhanced Airtable Schema**

### Table 1: Articles (Enhanced Existing)
**Purpose**: Core article storage with added knowledge architecture fields

```typescript
interface ArticleRecord {
  // Existing fields (keep all current fields)
  'Title': string;
  'Summary': string;
  'URL': string;
  'Published Time': string;
  'Body': string;
  'AV Overall Sentiment Score': number;
  'AV Overall Sentiment': string;
  'Raw AV Data (JSON)': string;
  
  // NEW: Knowledge Architecture Fields
  'Article Taxonomy (JSON)': {
    temporalRelationship: {
      primary: 'predictive' | 'explanatory' | 'real_time' | 'meta_analysis';
      timeReference: {
        pastReflection?: '2_hours' | '1_day' | '1_week' | '6_months';
        futureProjection?: '1_day' | '1_week' | '3_months' | '1_year';
      };
    };
    informationType: {
      primary: 'primary_announcement' | 'secondary_analysis' | 'market_reaction' | 'speculation';
      newsToMovement: 'predictive_signal' | 'explanatory_response' | 'simultaneous' | 'delayed_chain';
    };
  };
  
  'Belief Factors (JSON)': {
    intensity_belief: number;      // 0-1
    duration_belief: number;       // 0-1
    certainty_level: number;       // 0-1
    hope_vs_fear: number;         // 0-1 (0=fear, 1=hope)
    doubt_factor: number;         // 0-1
    attention_intensity: number;   // 0-1
    social_amplification: number;  // 0-1
    expert_consensus: number;      // 0-1
    urgency_perception: number;    // 0-1
    believability_score: number;   // 0-1
  };
  
  'Source Credibility Score': number; // 0-1 (Reuters=0.95, Seeking Alpha=0.65)
  'Processing Status': 'pending' | 'taxonomy_complete' | 'chains_extracted' | 'fully_processed';
  'Validation Status': 'unvalidated' | 'human_validated' | 'failed_validation';
  'Meta Thread Connections': string[]; // Links to MetaThreads table
  'Business Causal Chains': string[]; // Links to BusinessCausalChains table
}
```

### Table 2: BusinessCausalChains (New)
**Purpose**: Store extracted business logic chains with factor impacts

```typescript
interface BusinessCausalChainRecord {
  'Chain ID': string;
  'Source Article': string; // Link to Articles table
  'Chain Position': number; // 1, 2, 3... for ordering
  
  'Business Logic': string; // Human-readable description
  'Mechanism Type': 'partnership_leverage' | 'feature_driven_refresh' | 'competitive_advantage' | 
                   'market_expansion' | 'cost_optimization' | 'capability_enhancement' | 'risk_mitigation';
  
  'Expected Outcome': string;
  'Time Horizon': '1_day' | '1_week' | '1_month' | '6_months' | '1_year';
  'Confidence Level': number; // 0-1
  
  'Factor Impacts (JSON)': Array<{
    factorName: string; // From 200+ factors in Factors.md
    impactDirection: 'increase' | 'decrease' | 'neutral';
    impactMagnitude: number; // 0-1
    reasoning: string;
  }>;
  
  'Cascading Effects (JSON)': Array<{
    trigger: string;
    secondaryChainIds: string[];
    tertiaryChainIds: string[];
  }>;
  
  'Pattern Classification': string; // For pattern matching
  'Historical Analogs': string[]; // Links to HistoricalAnalogs table
  'Validation Results': string; // Link to ValidationResults table
}
```

### Table 3: MetaThreads (New)
**Purpose**: Track ongoing narrative themes across multiple events

```typescript
interface MetaThreadRecord {
  'Thread ID': string;
  'Thread Name': string; // "Apple AI Enhancement", "Supply Chain Resilience"
  'Thread Description': string;
  'Initiation Date': string;
  'Status': 'active' | 'dormant' | 'resolved';
  
  'Universal Factor Mapping (JSON)': {
    primaryFactors: string[]; // Core business factors this thread affects
    secondaryFactors: string[]; // Indirect factor impacts
    beliefAmplifiers: {
      intensity_modifier: number; // How this thread affects belief intensity
      attention_modifier: number; // How this thread affects attention
      persistence_modifier: number; // How this thread affects belief duration
    };
  };
  
  'Thread Events': string[]; // Links to Articles via BusinessCausalChains
  'Thread Momentum': number; // 0-1, current narrative strength
  'Belief Persistence': number; // Days, typical belief half-life for this thread
  
  'Historical Performance (JSON)': {
    totalEvents: number;
    averageStockImpact: number;
    accuratePredictions: number;
    predictionAccuracy: number;
  };
}
```

### Table 4: HistoricalAnalogs (New) 
**Purpose**: Store pattern matching results and validation

```typescript
interface HistoricalAnalogRecord {
  'Analog ID': string;
  'Current Event': string; // Link to BusinessCausalChains
  'Historical Event': string; // Link to BusinessCausalChains
  
  'Similarity Score': number; // 0-1 cosine similarity
  'Business Pattern Match': number; // 0-1 business logic similarity
  'Belief Pattern Match': number; // 0-1 belief factor similarity
  'Temporal Context Match': number; // 0-1 market regime similarity
  
  'Historical Outcome (JSON)': {
    stockMovement: {
      direction: 'bullish' | 'bearish' | 'neutral';
      magnitude: number; // % change
      timeframe: string; // When impact manifested
    };
    businessOutcome: {
      factorChanges: Array<{
        factor: string;
        actualChange: number;
        timeToImpact: number;
      }>;
    };
    beliefEvolution: {
      beliefHalfLife: number; // Days
      sustainedImpact: boolean;
      amplificationEvents: string[];
    };
  };
  
  'Prediction (JSON)': {
    directionPrediction: 'bullish' | 'bearish' | 'neutral';
    magnitudePrediction: number;
    timeHorizonPrediction: string;
    confidenceScore: number;
  };
  
  'Validation Status': 'pending' | 'accurate' | 'inaccurate' | 'partially_accurate';
  'Actual Outcome (JSON)': {
    // Filled in after waiting for timeHorizonPrediction
    actualDirection: string;
    actualMagnitude: number;
    actualTimeframe: string;
    predictionAccuracy: number;
  };
}
```

### Table 5: ValidationResults (New)
**Purpose**: Track manual validation and inter-annotator agreement

```typescript
interface ValidationResultRecord {
  'Validation ID': string;
  'Article ID': string; // Link to Articles
  'Validator Name': string;
  'Validation Date': string;
  'Validation Type': 'taxonomy' | 'business_chains' | 'belief_factors' | 'pattern_matching';
  
  'Manual Extraction (JSON)': {
    // Stores human annotation results for comparison
    taxonomy?: ArticleTaxonomy;
    businessChains?: BusinessCausalChain[];
    beliefFactors?: BeliefFactors;
    patternClassification?: string;
  };
  
  'Agreement Metrics (JSON)': {
    // Compared to other validators
    taxonomyAgreement: number; // 0-1
    chainAgreement: number; // 0-1
    beliefFactorCorrelation: number; // 0-1
    overallAgreement: number; // 0-1
  };
  
  'Quality Scores (JSON)': {
    extractionQuality: number; // 0-1, how good the extraction is
    consistencyScore: number; // 0-1, how consistent with other validators
    confidenceLevel: number; // 0-1, validator's confidence
  };
  
  'Notes': string; // Free text for validation insights
  'Passed Validation': boolean; // Meets minimum criteria
}
```

### Table 6: PatternLibrary (New)
**Purpose**: Store identified business patterns for reuse

```typescript
interface PatternLibraryRecord {
  'Pattern ID': string;
  'Pattern Name': string; // "tech_capability_boost_cycle", "partnership_leverage_play"
  'Pattern Description': string;
  
  'Pattern Template (JSON)': {
    stepTemplate: Array<{
      stepNumber: number;
      mechanismType: string;
      typicalTimeHorizon: string;
      expectedFactorImpacts: string[];
    }>;
    
    variableComponents: {
      // Which parts can vary while maintaining pattern
      flexibleMechanisms: string[];
      adjustableTimeframes: string[];
      scalableImpacts: string[];
    };
  };
  
  'Historical Instances': string[]; // Links to BusinessCausalChains that match this pattern
  'Success Rate': number; // 0-1, how often this pattern predicts correctly
  'Average Impact': number; // Typical stock movement magnitude
  'Confidence Range': [number, number]; // Min/max confidence for this pattern
  
  'Pattern Vector (JSON)': number[]; // Mathematical representation for similarity matching
  'Last Updated': string;
  'Pattern Status': 'active' | 'deprecated' | 'experimental';
}
```

---

## 🔄 **Database Workflow Integration**

### Article Processing Pipeline
```typescript
async function processArticle(articleContent: ArticleContent): Promise<void> {
  // 1. Store basic article
  const articleId = await createArticleRecord(articleContent);
  
  // 2. Extract taxonomy (manual or AI)
  const taxonomy = await extractArticleTaxonomy(articleContent);
  await updateArticleRecord(articleId, { taxonomy });
  
  // 3. Extract business causal chains
  const chains = await extractBusinessChains(articleContent);
  for (const chain of chains) {
    const chainId = await createBusinessChainRecord(chain, articleId);
    
    // 4. Find pattern matches
    const patterns = await findPatternMatches(chain);
    await linkToPatterns(chainId, patterns);
    
    // 5. Find historical analogs
    const analogs = await findHistoricalAnalogs(chain);
    await createAnalogRecords(chainId, analogs);
  }
  
  // 6. Extract belief factors
  const beliefFactors = await extractBeliefFactors(articleContent, chains);
  await updateArticleRecord(articleId, { beliefFactors });
  
  // 7. Link to meta threads
  const threads = await identifyMetaThreads(chains, articleContent);
  await linkToMetaThreads(articleId, threads);
  
  // 8. Update processing status
  await updateArticleRecord(articleId, { processingStatus: 'fully_processed' });
}
```

### Validation Workflow
```typescript
async function validateArticle(articleId: string, validatorName: string): Promise<ValidationResult> {
  // 1. Get article and existing AI extraction
  const article = await getArticleRecord(articleId);
  const aiExtraction = await getAIExtractionResults(articleId);
  
  // 2. Present to human for manual annotation
  const manualExtraction = await presentForManualAnnotation(article);
  
  // 3. Compare manual vs AI
  const agreementMetrics = calculateAgreement(manualExtraction, aiExtraction);
  
  // 4. Store validation results
  const validationId = await createValidationRecord({
    articleId,
    validatorName,
    manualExtraction,
    agreementMetrics,
    passedValidation: agreementMetrics.overallAgreement > 0.7
  });
  
  // 5. Update article validation status
  await updateArticleRecord(articleId, { 
    validationStatus: agreementMetrics.overallAgreement > 0.7 ? 'human_validated' : 'failed_validation'
  });
  
  return validationId;
}
```

### Pattern Learning Pipeline
```typescript
async function updatePatternLibrary(): Promise<void> {
  // 1. Get all validated business chains
  const validatedChains = await getValidatedBusinessChains();
  
  // 2. Cluster similar chains
  const patterns = await identifyPatterns(validatedChains);
  
  // 3. For each pattern, calculate success metrics
  for (const pattern of patterns) {
    const instances = await getPatternInstances(pattern);
    const outcomes = await getOutcomesForInstances(instances);
    
    const successRate = calculateSuccessRate(outcomes);
    const averageImpact = calculateAverageImpact(outcomes);
    
    // 4. Update or create pattern record
    await upsertPatternRecord({
      pattern,
      successRate,
      averageImpact,
      instances: instances.map(i => i.id)
    });
  }
}
```

---

## 📊 **Query Interface Design**

### Core Query Functions
```typescript
interface DatabaseQueries {
  // Article queries
  getArticlesByTaxonomy(taxonomy: Partial<ArticleTaxonomy>): Promise<ArticleRecord[]>;
  getArticlesByBeliefFactors(factors: Partial<BeliefFactors>): Promise<ArticleRecord[]>;
  getArticlesByMetaThread(threadId: string): Promise<ArticleRecord[]>;
  
  // Business chain queries
  getChainsByMechanism(mechanismType: string): Promise<BusinessCausalChainRecord[]>;
  getChainsByPattern(patternId: string): Promise<BusinessCausalChainRecord[]>;
  getChainsWithFactorImpact(factorName: string): Promise<BusinessCausalChainRecord[]>;
  
  // Pattern matching queries
  findSimilarChains(chain: BusinessCausalChain, threshold: number): Promise<HistoricalAnalogRecord[]>;
  getPatternPerformance(patternId: string): Promise<PatternPerformance>;
  getBestPatterns(minSuccessRate: number): Promise<PatternLibraryRecord[]>;
  
  // Meta thread queries
  getActiveThreads(): Promise<MetaThreadRecord[]>;
  getThreadPerformance(threadId: string): Promise<ThreadPerformance>;
  getThreadMomentum(threadId: string): Promise<number>;
  
  // Validation queries
  getInterAnnotatorAgreement(articleId: string): Promise<number>;
  getValidationStats(): Promise<ValidationStatistics>;
  getFailedValidations(): Promise<ValidationResultRecord[]>;
}
```

### Analytics Queries
```typescript
interface AnalyticsQueries {
  // Success metrics
  getOverallPredictionAccuracy(): Promise<number>;
  getAccuracyByPattern(patternId: string): Promise<number>;
  getAccuracyByBeliefFactor(factorName: string): Promise<number>;
  
  // Pattern analysis
  getMostSuccessfulPatterns(): Promise<PatternLibraryRecord[]>;
  getPatternEvolution(patternId: string): Promise<PatternEvolution>;
  getEmergingPatterns(): Promise<PatternLibraryRecord[]>;
  
  // Belief factor analysis
  getBeliefFactorCorrelations(): Promise<CorrelationMatrix>;
  getBeliefDecayRates(): Promise<DecayAnalysis>;
  getFactorImportance(): Promise<FactorImportance>;
  
  // Meta thread analysis
  getThreadSuccessRates(): Promise<ThreadAnalysis>;
  getThreadInteractions(): Promise<ThreadInteractionMatrix>;
  getCascadingEffectAnalysis(): Promise<CascadingAnalysis>;
}
```

---

## 🚀 **Implementation Priority**

### Phase 1: Core Schema (Week 1)
- [ ] Enhance Articles table with taxonomy and belief factor fields
- [ ] Create BusinessCausalChains table
- [ ] Create ValidationResults table
- [ ] Build basic insert/update functions

### Phase 2: Pattern System (Week 2-3)
- [ ] Create PatternLibrary table
- [ ] Create HistoricalAnalogs table  
- [ ] Build pattern matching functions
- [ ] Implement similarity calculation

### Phase 3: Meta Threads (Week 4)
- [ ] Create MetaThreads table
- [ ] Build thread detection and linking logic
- [ ] Implement momentum calculation
- [ ] Create thread analytics

### Phase 4: Analytics Layer (Week 5-6)
- [ ] Build query interface
- [ ] Create analytics functions
- [ ] Implement performance dashboards
- [ ] Add validation reporting

This schema provides the complete infrastructure to capture, validate, and analyze the knowledge architecture while building incrementally on your existing Airtable structure.
