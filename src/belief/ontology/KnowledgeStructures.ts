/**
 * AEIOU Knowledge Structures - Type Definitions for Business Event Decomposition
 * 
 * This file captures the mathematical structure of investor reasoning and belief formation
 * Based on research from Factors.md (200+ metrics), Hypotheses.md (10 testable hypotheses),
 * and Core Concepts.md (dual-layer architecture)
 */

// =====================================================================================
// ARTICLE TAXONOMY - Temporal and Causal Classification System
// =====================================================================================

/**
 * Article Classification Framework
 * Based on user requirement: "categorizing different types of articles: what's reflective 
 * on the past versus about the future, announcement vs meta analysis"
 */
export interface ArticleTaxonomy {
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
  
  businessEventType: {
    category: BusinessFactorCategory;
    mechanismType: BusinessMechanism;
  };
}

/**
 * Business Factor Categories from Factors.md
 * Maps to the 200+ specific factors catalogued in existing research
 */
export type BusinessFactorCategory = 
  | 'financial_metrics'      // Revenue, margins, costs
  | 'customer_metrics'       // Acquisition, retention, satisfaction  
  | 'product_metrics'        // Launches, features, pricing
  | 'operational_metrics'    // Efficiency, quality, compliance
  | 'market_metrics'         // Competition, partnerships, expansion
  | 'sales_metrics'          // Conversion, pipeline, cycle
  | 'competitive_metrics'    // Market share, positioning
  | 'regulatory_metrics'     // Compliance, legal, government
  | 'innovation_metrics'     // R&D, patents, technology
  | 'risk_metrics';          // Cybersecurity, operational, financial

/**
 * Business Mechanisms from Core Concepts.md
 * Universal patterns that business events follow
 */
export type BusinessMechanism = 
  | 'partnership_leverage'     // Using partnerships to enhance capabilities
  | 'feature_driven_refresh'   // New features driving upgrade cycles
  | 'competitive_advantage'    // Gaining edge over competitors
  | 'market_expansion'         // Entering new markets/segments
  | 'cost_optimization'        // Reducing costs/improving efficiency
  | 'capability_enhancement'   // Building new business capabilities
  | 'risk_mitigation'          // Reducing business/operational risks
  | 'brand_strengthening'      // Improving brand perception/value
  | 'ecosystem_expansion'      // Growing platform/ecosystem effects
  | 'regulatory_compliance';   // Meeting regulatory requirements

// =====================================================================================
// BUSINESS CAUSAL CHAIN STRUCTURES - Multi-Step Business Logic
// =====================================================================================

/**
 * Business Causal Chain Structure
 * From Core Concepts.md: "Investors extrapolate multi-step business consequences"
 * Target: >70% human agreement on chain extraction (Hypotheses.md H1)
 */
export interface BusinessCausalChain {
  steps: BusinessChainStep[];
  cascadingEffects: CascadingEffect[];
  patternClassification: string;
  overallConfidence: number; // 0-1 scale
}

export interface BusinessChainStep {
  stepNumber: number;
  businessLogic: string;                // Human-readable description
  mechanism: BusinessMechanism;         // Type of business mechanism
  expectedOutcome: BusinessOutcome;     // What this step should achieve
  timeHorizon: TimeHorizon;            // When impact manifests
  confidence: number;                   // 0-1 scale
  factorImpacts: FactorImpact[];       // Specific factor changes
  source: 'article_stated' | 'our_analysis' | 'historical_pattern';
}

export interface BusinessOutcome {
  category: BusinessFactorCategory;
  direction: 'increase' | 'decrease' | 'neutral';
  magnitude: number; // 0-1 scale, relative impact size
  description: string;
}

export interface FactorImpact {
  factorName: string;                   // From 200+ factors in Factors.md
  impactDirection: 'increase' | 'decrease' | 'neutral';
  impactMagnitude: number;              // 0-1 scale
  reasoning: string;                    // Why this factor is affected
  confidence: number;                   // 0-1 scale
}

export interface CascadingEffect {
  trigger: string;                      // What triggers the cascade
  secondaryEvents: BusinessCausalChain[];
  tertiaryEvents: BusinessCausalChain[];
  probabilityOfCascade: number;         // 0-1 scale
}

export type TimeHorizon = 
  | '1_day' | '1_week' | '1_month' | '3_months' | '6_months' | '1_year' | '2_years';

// =====================================================================================
// BELIEF FORMATION STRUCTURES - Psychological Dimension Quantification
// =====================================================================================

/**
 * Atomic Belief Factors from Core Concepts.md
 * Target: <0.7 correlation between factors (Hypotheses.md H4)
 * Each factor is independently measurable and mathematically combinable
 */
export interface BeliefFactors {
  intensity_belief: number;      // How strongly investors believe this matters (0-1)
  duration_belief: number;       // How long this belief will persist (0-1)
  certainty_level: number;       // Confidence in assessment (0-1)
  hope_vs_fear: number;         // Emotional spectrum (0=fear, 0.5=neutral, 1=hope)
  doubt_factor: number;         // Skepticism level (0-1, higher = more doubt)
  attention_intensity: number;   // Media/social attention level (0-1)
  social_amplification: number;  // Viral/sharing potential (0-1)
  expert_consensus: number;      // Expert agreement level (0-1)
  urgency_perception: number;    // How urgent this feels (0-1)
  believability_score: number;   // Overall market credence (0-1)
}

/**
 * Belief Formation Analysis
 * Captures how beliefs form and evolve over time
 */
export interface BeliefFormationAnalysis {
  atomicFactors: BeliefFactors;
  sourceCredibilityImpact: SourceCredibilityAnalysis;
  temporalDecayProjection: TemporalDecayAnalysis;
  investorArchetypeVariance: InvestorArchetypeAnalysis;
}

export interface SourceCredibilityAnalysis {
  sourceCredibilityScore: number;      // 0-1 (Reuters=0.95, Seeking Alpha=0.65)
  baseFactors: BeliefFactors;          // Belief factors ignoring source
  credibilityMultiplier: number;       // How source affects beliefs
  adjustedFactors: BeliefFactors;      // Belief factors adjusted for source
}

/**
 * Temporal Decay Analysis from Core Concepts.md
 * Target: R² >0.7 for decay curve fitting (Hypotheses.md H6)
 */
export interface TemporalDecayAnalysis {
  halfLife: number;                    // Days until 50% belief decay
  decayFunction: 'exponential' | 'linear' | 'power_law';
  decayRate: number;                   // Decay constant
  persistenceProbability: number;      // Chance of sustained coverage (0-1)
  amplificationEvents: string[];       // Events that could reactivate belief
}

/**
 * Investor Archetype Analysis from Core Concepts.md
 * Target: Clear clustering of reaction patterns (Hypotheses.md H7)
 */
export interface InvestorArchetypeAnalysis {
  institutional: ArchetypeProfile;
  retail: ArchetypeProfile;
  algorithmic: ArchetypeProfile;
  overallMix: ArchetypeMix;
}

export interface ArchetypeProfile {
  reactionProbability: number;         // 0-1, likelihood of trading on this news
  reactionMagnitude: number;           // 0-1, typical position size
  timeToAction: number;               // Days until typical action
  credibilityWeighting: number;        // 0-1, source discrimination ability
  beliefPersistence: number;          // 0-1, how long beliefs last
  volatilityContribution: number;     // 0-1, contribution to price volatility
}

export interface ArchetypeMix {
  institutionalWeight: number;        // 0-1, estimated market percentage
  retailWeight: number;               // 0-1, estimated market percentage
  algorithmicWeight: number;          // 0-1, estimated market percentage
  dominantArchetype: 'institutional' | 'retail' | 'algorithmic' | 'mixed';
}

// =====================================================================================
// META-THREAD STRUCTURES - Narrative Continuity Framework
// =====================================================================================

/**
 * Meta Thread Structure
 * User requirement: "meta topic of AI and Apple's enhancements with AI's, and then 
 * everyday there are updates that people believe will reflect on one thing or another"
 */
export interface MetaThread {
  threadId: string;
  threadName: string;                  // "Apple AI Enhancement", "Supply Chain Resilience"
  threadDescription: string;
  initiationDate: Date;
  
  threadLifecycle: ThreadLifecycle;
  universalFactorMapping: UniversalFactorMapping;
  historicalAnalogs: ThreadAnalog[];
  currentMomentum: number;             // 0-1, current narrative strength
}

export interface ThreadLifecycle {
  initiationEvent: BusinessCausalChain;
  continuationEvents: ThreadEvent[];
  status: 'active' | 'dormant' | 'resolved' | 'superseded';
  expectedDuration: TimeHorizon;
  currentPhase: 'initiation' | 'growth' | 'maturity' | 'decline';
}

export interface ThreadEvent {
  event: BusinessCausalChain;
  connectionType: 'continuation' | 'amplification' | 'contradiction' | 'resolution';
  threadMomentum: number;              // 0-1, belief persistence after this event
  momentumChange: number;              // Change in momentum from this event
  eventDate: Date;
}

/**
 * Universal Factor Mapping
 * User requirement: "break it down into truer bits and interpolate so that we can 
 * relate it to other things with the same interpolation"
 */
export interface UniversalFactorMapping {
  primaryFactors: string[];            // Core business factors this thread affects
  secondaryFactors: string[];          // Indirect factor impacts
  beliefAmplifiers: BeliefAmplifiers;  // How this thread affects belief formation
  crossThreadConnections: string[];   // Other threads this connects to
}

export interface BeliefAmplifiers {
  intensityModifier: number;           // How this thread affects belief intensity
  attentionModifier: number;           // How this thread affects attention
  persistenceModifier: number;        // How this thread affects belief duration
  fearAmplifier: number;               // Amplification of fear-based beliefs
  hopeAmplifier: number;               // Amplification of hope-based beliefs
}

export interface ThreadAnalog {
  analogThreadId: string;              // Historical thread with similar pattern
  similarityScore: number;             // 0-1, pattern similarity
  outcomeCorrelation: number;          // 0-1, outcome similarity
  timeframeSimilarity: number;         // 0-1, duration similarity
  lessons: string[];                   // Key insights from analog
}

// =====================================================================================
// PATTERN RECOGNITION STRUCTURES - Historical Analog Matching
// =====================================================================================

/**
 * Pattern Library Structure
 * Target: >65% accuracy for pattern-based predictions (Hypotheses.md H2)
 */
export interface BusinessPattern {
  patternId: string;
  patternName: string;
  patternDescription: string;
  
  patternTemplate: PatternTemplate;
  historicalInstances: PatternInstance[];
  performanceMetrics: PatternPerformance;
  patternVector: number[];             // Mathematical representation
}

export interface PatternTemplate {
  stepTemplate: PatternStepTemplate[];
  variableComponents: VariableComponents;
  requiredConditions: string[];        // Conditions for pattern to apply
  excludingConditions: string[];       // Conditions that invalidate pattern
}

export interface PatternStepTemplate {
  stepNumber: number;
  mechanismType: BusinessMechanism;
  typicalTimeHorizon: TimeHorizon;
  expectedFactorImpacts: string[];     // Typical factors affected
  confidenceRange: [number, number];   // Min/max typical confidence
}

export interface VariableComponents {
  flexibleMechanisms: BusinessMechanism[];  // Mechanisms that can vary
  adjustableTimeframes: TimeHorizon[];      // Timeframes that can vary
  scalableImpacts: string[];               // Impacts that can scale up/down
}

export interface PatternInstance {
  instanceId: string;
  businessChain: BusinessCausalChain;
  matchQuality: number;                // 0-1, how well it fits pattern
  outcome: PatternOutcome;
  context: PatternContext;
}

export interface PatternOutcome {
  stockMovement: StockMovement;
  businessImpact: BusinessImpact;
  beliefEvolution: BeliefEvolution;
  timeToImpact: number;               // Days until outcome manifested
}

export interface StockMovement {
  direction: 'bullish' | 'bearish' | 'neutral';
  magnitude: number;                  // % change
  peakMagnitude: number;              // Maximum % change observed
  sustainedMagnitude: number;         // % change after 30 days
  volatility: number;                 // Standard deviation of returns
}

export interface BusinessImpact {
  factorChanges: FactorChange[];
  revenueImpact: number;              // Estimated % revenue change
  marginImpact: number;               // Estimated margin change
  competitiveImpact: string;          // Qualitative competitive effect
}

export interface FactorChange {
  factorName: string;
  expectedChange: number;             // Predicted change
  actualChange?: number;              // Actual change (if measurable)
  timeToImpact: number;              // Days until change observed
  confidence: number;                 // Prediction confidence
}

export interface BeliefEvolution {
  initialBeliefStrength: number;      // 0-1, initial belief intensity
  beliefHalfLife: number;            // Days to 50% decay
  sustainedImpact: boolean;          // Did beliefs persist >30 days?
  amplificationEvents: string[];     // Events that boosted beliefs
  contradictionEvents: string[];     // Events that weakened beliefs
}

export interface PatternContext {
  marketRegime: 'bull' | 'bear' | 'sideways';
  volatilityEnvironment: 'low' | 'medium' | 'high';
  sectorMomentum: 'positive' | 'negative' | 'neutral';
  competitiveContext: string;
  regulatoryContext: string;
}

export interface PatternPerformance {
  totalInstances: number;
  successfulPredictions: number;
  accuracy: number;                   // successfulPredictions / totalInstances
  averageImpact: number;             // Average stock movement magnitude
  averageConfidence: number;          // Average prediction confidence
  falsePositiveRate: number;         // % of predictions that were wrong
  confidenceCalibration: number;     // How well confidence matches accuracy
  lastUpdated: Date;
}

// =====================================================================================
// MATHEMATICAL COMPOSITION STRUCTURES - Vector Similarity Matching
// =====================================================================================

/**
 * Combined Vector Representation from Core Concepts.md
 * Target: >15% improvement over content similarity (Hypotheses.md H10)
 */
export interface CombinedVector {
  businessPatternVector: number[];    // Business logic similarity
  beliefFactorVector: number[];       // Belief formation similarity
  temporalContextVector: number[];    // Timing and context similarity
  combinedVector: number[];           // Weighted combination
  vectorWeights: VectorWeights;
}

export interface VectorWeights {
  businessWeight: number;             // Weight for business pattern (suggested 0.6)
  beliefWeight: number;               // Weight for belief factors (suggested 0.4)
  temporalWeight: number;             // Weight for temporal context
  totalWeight: number;                // Should sum to 1.0
}

/**
 * Historical Analog Matching System
 * Mathematical similarity matching for prediction
 */
export interface HistoricalAnalog {
  analogId: string;
  currentEvent: BusinessCausalChain;
  historicalEvent: BusinessCausalChain;
  
  similarityScores: SimilarityScores;
  historicalOutcome: PatternOutcome;
  prediction: AnalogPrediction;
  confidence: AnalogConfidence;
}

export interface SimilarityScores {
  overallSimilarity: number;          // 0-1, cosine similarity of combined vectors
  businessSimilarity: number;         // 0-1, business pattern match
  beliefSimilarity: number;           // 0-1, belief factor match
  temporalSimilarity: number;         // 0-1, context/timing match
  mechanismSimilarity: number;        // 0-1, business mechanism match
}

export interface AnalogPrediction {
  directionPrediction: 'bullish' | 'bearish' | 'neutral';
  magnitudePrediction: number;        // Expected % stock movement
  timeHorizonPrediction: TimeHorizon; // When impact will manifest
  beliefEvolutionPrediction: BeliefEvolution;
  businessImpactPrediction: BusinessImpact;
}

export interface AnalogConfidence {
  analogQuality: number;              // 0-1, how good the analog is
  outcomeReliability: number;         // 0-1, how reliable historical outcome was
  contextSimilarity: number;          // 0-1, how similar contexts are
  overallConfidence: number;          // 0-1, combined confidence score
}

// =====================================================================================
// VALIDATION AND MEASUREMENT STRUCTURES
// =====================================================================================

/**
 * Validation Framework for Human-AI Agreement
 * Target metrics from Hypotheses.md
 */
export interface ValidationResult {
  validationId: string;
  articleId: string;
  validatorName: string;
  validationDate: Date;
  validationType: ValidationType;
  
  manualExtraction: ManualExtraction;
  aiExtraction: AIExtraction;
  agreementMetrics: AgreementMetrics;
  qualityScores: QualityScores;
  passedValidation: boolean;
}

export type ValidationType = 
  | 'taxonomy' | 'business_chains' | 'belief_factors' | 'pattern_matching' | 'full_pipeline';

export interface ManualExtraction {
  taxonomy?: ArticleTaxonomy;
  businessChains?: BusinessCausalChain[];
  beliefFactors?: BeliefFactors;
  patternClassification?: string;
  extractionTime: number;             // Minutes spent on extraction
  extractorConfidence: number;        // 0-1, how confident extractor was
}

export interface AIExtraction {
  taxonomy?: ArticleTaxonomy;
  businessChains?: BusinessCausalChain[];
  beliefFactors?: BeliefFactors;
  patternClassification?: string;
  processingTime: number;             // Milliseconds
  processingCost: number;             // Dollar cost
  aiConfidence: number;               // 0-1, AI's confidence score
}

/**
 * Agreement Metrics for Inter-Annotator Reliability
 * Success criteria from Hypotheses.md
 */
export interface AgreementMetrics {
  taxonomyAgreement: number;          // 0-1, agreement on classification
  chainAgreement: number;             // 0-1, agreement on business chains
  beliefFactorCorrelation: number;    // 0-1, correlation of belief scores
  patternAgreement: number;           // 0-1, agreement on pattern classification
  overallAgreement: number;           // 0-1, weighted average agreement
  
  // Specific success targets from Hypotheses.md
  meetsChainThreshold: boolean;       // >70% agreement (H1)
  meetsBeliefsThreshold: boolean;     // <70% correlation (H4)
  meetsOverallThreshold: boolean;     // Overall validation passes
}

export interface QualityScores {
  extractionQuality: number;          // 0-1, quality of extraction
  consistencyScore: number;           // 0-1, consistency with other validators
  completenessScore: number;          // 0-1, how complete the extraction is
  clarityScore: number;               // 0-1, how clear/interpretable results are
}

// =====================================================================================
// SYSTEM INTEGRATION AND PREDICTION STRUCTURES
// =====================================================================================

/**
 * Dual-Layer Prediction System
 * Target: >65% accuracy, >10% improvement over baselines (Hypotheses.md H9)
 */
export interface DualLayerPrediction {
  businessLayerPrediction: BusinessLayerPrediction;
  beliefLayerPrediction: BeliefLayerPrediction;
  combinedPrediction: CombinedPrediction;
  predictionMetadata: PredictionMetadata;
}

export interface BusinessLayerPrediction {
  patternMatch: BusinessPattern;
  mechanismAnalysis: BusinessMechanism[];
  factorImpactPrediction: FactorImpact[];
  timeHorizonPrediction: TimeHorizon;
  businessConfidence: number;         // 0-1
}

export interface BeliefLayerPrediction {
  beliefFormation: BeliefFormationAnalysis;
  investorReaction: InvestorArchetypeAnalysis;
  attentionPrediction: number;        // 0-1, expected attention level
  persistencePrediction: number;      // Expected belief half-life in days
  beliefConfidence: number;           // 0-1
}

export interface CombinedPrediction {
  directionPrediction: 'bullish' | 'bearish' | 'neutral';
  magnitudePrediction: number;        // Expected % stock movement
  timeframePrediction: TimeHorizon;   // When impact will manifest
  volatilityPrediction: number;       // Expected volatility increase
  sustainabilityPrediction: number;   // 0-1, chance of sustained impact
  overallConfidence: number;          // 0-1, combined confidence
}

export interface PredictionMetadata {
  predictionId: string;
  predictionDate: Date;
  modelVersions: ModelVersions;
  inputDataQuality: number;           // 0-1, quality of input data
  analogQuality: number;              // 0-1, quality of historical analogs
  uncertaintyFactors: string[];       // Known sources of uncertainty
  predictionBasis: string[];          // Key factors driving prediction
}

export interface ModelVersions {
  businessModelVersion: string;
  beliefModelVersion: string;
  combinationModelVersion: string;
  dataSchemaVersion: string;
}

/**
 * Performance Tracking and Learning
 * System improvement and adaptation over time
 */
export interface SystemPerformance {
  overallAccuracy: number;            // % of correct predictions
  accuracyByTimeHorizon: Map<TimeHorizon, number>;
  accuracyByPattern: Map<string, number>;
  accuracyByBeliefFactor: Map<string, number>;
  
  improvedBaselines: BaselineComparison;
  learningMetrics: LearningMetrics;
  adaptationHistory: AdaptationEvent[];
}

export interface BaselineComparison {
  sentimentAnalysisAccuracy: number;
  simpleMovingAverageAccuracy: number;
  randomPredictionAccuracy: number;
  improvementOverSentiment: number;   // Target: >10% (H9)
  improvementOverTechnical: number;
  improvementOverRandom: number;
}

export interface LearningMetrics {
  patternDecayRate: number;           // How fast patterns lose effectiveness
  beliefCalibration: number;          // How well belief predictions match reality
  adaptationSpeed: number;            // How quickly system adapts to new patterns
  overfittingRisk: number;           // Risk of overfitting to historical data
}

export interface AdaptationEvent {
  eventDate: Date;
  adaptationType: 'pattern_update' | 'belief_recalibration' | 'mechanism_discovery';
  description: string;
  performanceImpact: number;          // Change in accuracy
  confidence: number;                 // Confidence in adaptation
}

// =====================================================================================
// EXPORT ALL TYPES FOR SYSTEM USE
// =====================================================================================

export type {
  // Core structures
  ArticleTaxonomy,
  BusinessCausalChain,
  BeliefFactors,
  MetaThread,
  BusinessPattern,
  
  // Analysis structures
  BeliefFormationAnalysis,
  InvestorArchetypeAnalysis,
  TemporalDecayAnalysis,
  
  // Mathematical structures
  CombinedVector,
  HistoricalAnalog,
  PatternPerformance,
  
  // Validation structures
  ValidationResult,
  AgreementMetrics,
  
  // Prediction structures
  DualLayerPrediction,
  SystemPerformance
};
