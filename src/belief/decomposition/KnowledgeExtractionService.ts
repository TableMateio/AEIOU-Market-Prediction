/**
 * AEIOU Knowledge Extraction Service
 * 
 * This service implements the knowledge architecture for decomposing business events
 * and belief formation from news articles. It serves as the central reasoning engine
 * that captures and applies the frameworks defined in the documentation.
 * 
 * IMPLEMENTATION APPROACH:
 * 1. Start with manual implementations that capture reasoning
 * 2. Validate each component before automation
 * 3. Build incrementally based on validation results
 * 4. Use existing research as specification, not starting point
 */

import {
  ArticleTaxonomy,
  BusinessCausalChain,
  BusinessChainStep,
  BeliefFactors,
  BeliefFormationAnalysis,
  MetaThread,
  BusinessPattern,
  CombinedVector,
  HistoricalAnalog,
  DualLayerPrediction,
  ValidationResult,
  ArticleContent
} from './KnowledgeStructures';

// =====================================================================================
// KNOWLEDGE EXTRACTION SERVICE - Core Implementation
// =====================================================================================

export class KnowledgeExtractionService {
  private database: DatabaseInterface;
  private validator: ValidationService;
  private logger: Logger;

  constructor(database: DatabaseInterface, validator: ValidationService) {
    this.database = database;
    this.validator = validator;
    this.logger = new Logger('KnowledgeExtraction');
  }

  // =====================================================================================
  // ARTICLE TAXONOMY EXTRACTION
  // =====================================================================================

  /**
   * Extract Article Taxonomy - Temporal and Causal Classification
   * 
   * REASONING: User requirement for "categorizing different types of articles: 
   * what's reflective on the past versus about the future, announcement vs meta analysis"
   * 
   * IMPLEMENTATION: Manual rules first, then validate before automating
   */
  async extractArticleTaxonomy(article: ArticleContent): Promise<ArticleTaxonomy> {
    this.logger.info(`Extracting taxonomy for article: ${article.title.substring(0, 50)}...`);

    // STEP 1: Analyze temporal relationships
    const temporalAnalysis = this.analyzeTemporalRelationship(article);
    
    // STEP 2: Determine information type
    const informationAnalysis = this.analyzeInformationType(article);
    
    // STEP 3: Classify business event type
    const businessEventAnalysis = this.analyzeBusinessEventType(article);

    const taxonomy: ArticleTaxonomy = {
      temporalRelationship: temporalAnalysis,
      informationType: informationAnalysis,
      businessEventType: businessEventAnalysis
    };

    // STEP 4: Store for validation
    await this.database.storeTaxonomyExtraction(article.url, taxonomy);

    return taxonomy;
  }

  /**
   * Analyze Temporal Relationship
   * 
   * REASONING: Critical to distinguish news that predicts future vs explains past
   * This affects how we weight the causal chains and belief formation
   */
  private analyzeTemporalRelationship(article: ArticleContent): ArticleTaxonomy['temporalRelationship'] {
    const title = article.title.toLowerCase();
    const summary = article.summary.toLowerCase();
    const content = article.fullText.toLowerCase();

    // PREDICTIVE SIGNALS
    const predictiveSignals = [
      'will', 'plans to', 'expected to', 'forecast', 'outlook', 'guidance',
      'upcoming', 'next quarter', 'next year', 'anticipate', 'project'
    ];

    // EXPLANATORY SIGNALS
    const explanatorySignals = [
      'because', 'due to', 'resulted from', 'caused by', 'led to',
      'after', 'following', 'in response to', 'reacting to'
    ];

    // META ANALYSIS SIGNALS
    const metaAnalysisSignals = [
      'traders', 'investors', 'market', 'analysts believe', 'sentiment',
      'betting on', 'speculation', 'market reaction', 'wall street'
    ];

    const textToAnalyze = `${title} ${summary}`;
    
    let predictiveScore = 0;
    let explanatoryScore = 0;
    let metaScore = 0;

    // Score based on signal presence
    predictiveSignals.forEach(signal => {
      if (textToAnalyze.includes(signal)) predictiveScore++;
    });

    explanatorySignals.forEach(signal => {
      if (textToAnalyze.includes(signal)) explanatoryScore++;
    });

    metaAnalysisSignals.forEach(signal => {
      if (textToAnalyze.includes(signal)) metaScore++;
    });

    // Determine primary classification
    let primary: 'predictive' | 'explanatory' | 'real_time' | 'meta_analysis';
    
    if (metaScore > predictiveScore && metaScore > explanatoryScore) {
      primary = 'meta_analysis';
    } else if (predictiveScore > explanatoryScore) {
      primary = 'predictive';
    } else if (explanatoryScore > predictiveScore) {
      primary = 'explanatory';
    } else {
      primary = 'real_time'; // Default for announcements
    }

    // Determine time references
    const timeReference = this.extractTimeReferences(content);

    return {
      primary,
      timeReference
    };
  }

  /**
   * Extract Time References from Article Content
   * 
   * REASONING: Understanding time horizons is critical for prediction accuracy
   * Different time horizons require different validation approaches
   */
  private extractTimeReferences(content: string): ArticleTaxonomy['temporalRelationship']['timeReference'] {
    const pastSignals = {
      '2_hours': ['earlier today', 'this morning', 'this afternoon'],
      '1_day': ['yesterday', 'last night', 'previous day'],
      '1_week': ['last week', 'past week', 'recent days'],
      '6_months': ['last quarter', 'past quarter', 'previous quarter', 'last six months']
    };

    const futureSignals = {
      '1_day': ['tomorrow', 'next day', 'later today'],
      '1_week': ['next week', 'coming week', 'in the next few days'],
      '3_months': ['next quarter', 'coming quarter', 'in the next three months'],
      '1_year': ['next year', 'coming year', 'over the next year']
    };

    const timeReference: any = {};

    // Check for past references
    for (const [timeframe, signals] of Object.entries(pastSignals)) {
      if (signals.some(signal => content.includes(signal))) {
        timeReference.pastReflection = timeframe;
        break;
      }
    }

    // Check for future references
    for (const [timeframe, signals] of Object.entries(futureSignals)) {
      if (signals.some(signal => content.includes(signal))) {
        timeReference.futureProjection = timeframe;
        break;
      }
    }

    return timeReference;
  }

  // =====================================================================================
  // BUSINESS CAUSAL CHAIN EXTRACTION
  // =====================================================================================

  /**
   * Extract Business Causal Chains
   * 
   * REASONING: Core hypothesis H1 - "News events can be reliably decomposed into 2-5 step 
   * business causal chains where each step represents a logical business consequence"
   * 
   * TARGET: >70% human agreement on chain extraction
   * 
   * IMPLEMENTATION: Start with manual rule-based extraction, validate with humans
   */
  async extractBusinessCausalChains(
    article: ArticleContent, 
    taxonomy: ArticleTaxonomy
  ): Promise<BusinessCausalChain[]> {
    this.logger.info(`Extracting business causal chains from: ${article.title.substring(0, 50)}...`);

    // STEP 1: Identify primary business events in article
    const primaryEvents = this.identifyPrimaryBusinessEvents(article, taxonomy);

    // STEP 2: For each event, extract causal chains
    const chains: BusinessCausalChain[] = [];
    
    for (const event of primaryEvents) {
      const chain = await this.extractSingleChain(event, article, taxonomy);
      if (chain) {
        chains.push(chain);
      }
    }

    // STEP 3: Identify cascading effects between chains
    const chainsWithCascades = this.identifyCascadingEffects(chains);

    // STEP 4: Store for validation
    await this.database.storeCausalChains(article.url, chainsWithCascades);

    return chainsWithCascades;
  }

  /**
   * Identify Primary Business Events
   * 
   * REASONING: Need to separate multiple events in single article
   * Each event should have its own causal chain
   */
  private identifyPrimaryBusinessEvents(article: ArticleContent, taxonomy: ArticleTaxonomy): string[] {
    const content = article.fullText;
    const title = article.title;

    // Business event signal patterns
    const eventSignals = [
      'announced', 'launches', 'releases', 'introduces', 'unveils',
      'partnership', 'acquisition', 'merger', 'investment', 'funding',
      'expansion', 'enters', 'exits', 'discontinues', 'upgrades',
      'price increase', 'price decrease', 'new product', 'feature',
      'hiring', 'layoffs', 'restructuring', 'reorganization'
    ];

    const events: string[] = [];
    
    // Always include the title as primary event
    events.push(title);

    // Look for additional events in content
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      
      if (eventSignals.some(signal => lowerSentence.includes(signal))) {
        // This sentence describes a business event
        if (sentence.length > 20 && sentence.length < 200) {
          events.push(sentence.trim());
        }
      }
    }

    // Deduplicate and limit to 3 primary events
    const uniqueEvents = [...new Set(events)].slice(0, 3);
    
    this.logger.debug(`Identified ${uniqueEvents.length} primary business events`);
    return uniqueEvents;
  }

  /**
   * Extract Single Business Causal Chain
   * 
   * REASONING: Each business event follows logical sequences:
   * Event → Immediate Impact → Business Mechanism → Expected Outcome → Market Impact
   * 
   * IMPLEMENTATION: Use business logic patterns from existing research
   */
  private async extractSingleChain(
    event: string, 
    article: ArticleContent, 
    taxonomy: ArticleTaxonomy
  ): Promise<BusinessCausalChain | null> {
    
    // STEP 1: Analyze the business mechanism
    const mechanism = this.identifyBusinessMechanism(event, article.fullText);
    
    if (!mechanism) {
      this.logger.debug(`Could not identify business mechanism for event: ${event.substring(0, 50)}...`);
      return null;
    }

    // STEP 2: Generate causal chain steps based on mechanism
    const steps = this.generateCausalSteps(event, mechanism, article);

    // STEP 3: Apply factor impacts from research (Factors.md)
    const stepsWithFactors = this.applyFactorImpacts(steps, mechanism);

    // STEP 4: Assess overall confidence
    const overallConfidence = this.assessChainConfidence(stepsWithFactors, article);

    const chain: BusinessCausalChain = {
      steps: stepsWithFactors,
      cascadingEffects: [], // Will be filled in identifyCascadingEffects
      patternClassification: this.classifyPattern(stepsWithFactors),
      overallConfidence
    };

    return chain;
  }

  /**
   * Identify Business Mechanism
   * 
   * REASONING: From Core Concepts.md - business events follow predictable mechanisms
   * Each mechanism has different causal pathways and factor impacts
   */
  private identifyBusinessMechanism(event: string, content: string): BusinessMechanism | null {
    const eventLower = event.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Partnership mechanism signals
    if (eventLower.includes('partnership') || eventLower.includes('alliance') || 
        eventLower.includes('collaboration') || eventLower.includes('joint venture')) {
      return 'partnership_leverage';
    }

    // Feature/product mechanism signals
    if (eventLower.includes('feature') || eventLower.includes('upgrade') || 
        eventLower.includes('enhancement') || eventLower.includes('new product')) {
      return 'feature_driven_refresh';
    }

    // Market expansion signals
    if (eventLower.includes('expansion') || eventLower.includes('enters') || 
        eventLower.includes('new market') || eventLower.includes('international')) {
      return 'market_expansion';
    }

    // Competitive advantage signals
    if (eventLower.includes('competitive') || eventLower.includes('differentiat') || 
        eventLower.includes('unique') || eventLower.includes('exclusive')) {
      return 'competitive_advantage';
    }

    // Cost optimization signals
    if (eventLower.includes('efficiency') || eventLower.includes('cost') || 
        eventLower.includes('optimization') || eventLower.includes('streamlin')) {
      return 'cost_optimization';
    }

    // Capability enhancement signals
    if (eventLower.includes('capability') || eventLower.includes('technology') || 
        eventLower.includes('innovation') || eventLower.includes('R&D')) {
      return 'capability_enhancement';
    }

    // Default fallback
    this.logger.debug(`Could not classify business mechanism for: ${event.substring(0, 50)}...`);
    return null;
  }

  /**
   * Generate Causal Steps Based on Business Mechanism
   * 
   * REASONING: Each mechanism follows predictable causal pathways
   * Use patterns from existing research to generate logical sequences
   */
  private generateCausalSteps(
    event: string, 
    mechanism: BusinessMechanism, 
    article: ArticleContent
  ): BusinessChainStep[] {
    
    const steps: BusinessChainStep[] = [];

    switch (mechanism) {
      case 'partnership_leverage':
        steps.push(
          {
            stepNumber: 1,
            businessLogic: "Partnership integration enhances capabilities",
            mechanism: 'partnership_leverage',
            expectedOutcome: {
              category: 'innovation_metrics',
              direction: 'increase',
              magnitude: 0.15,
              description: "Enhanced technological capabilities through partnership"
            },
            timeHorizon: '6_months',
            confidence: 0.75,
            factorImpacts: [],
            source: 'our_analysis'
          },
          {
            stepNumber: 2,
            businessLogic: "Enhanced capabilities lead to improved user experience",
            mechanism: 'feature_driven_refresh',
            expectedOutcome: {
              category: 'customer_metrics',
              direction: 'increase',
              magnitude: 0.12,
              description: "Improved user experience drives satisfaction"
            },
            timeHorizon: '1_year',
            confidence: 0.65,
            factorImpacts: [],
            source: 'our_analysis'
          },
          {
            stepNumber: 3,
            businessLogic: "Improved experience triggers upgrade demand",
            mechanism: 'feature_driven_refresh',
            expectedOutcome: {
              category: 'sales_metrics',
              direction: 'increase',
              magnitude: 0.08,
              description: "Upgrade cycle drives revenue growth"
            },
            timeHorizon: '1_year',
            confidence: 0.55,
            factorImpacts: [],
            source: 'our_analysis'
          }
        );
        break;

      case 'feature_driven_refresh':
        steps.push(
          {
            stepNumber: 1,
            businessLogic: "New feature announcement generates interest",
            mechanism: 'feature_driven_refresh',
            expectedOutcome: {
              category: 'customer_metrics',
              direction: 'increase',
              magnitude: 0.20,
              description: "Feature announcement drives customer attention"
            },
            timeHorizon: '1_week',
            confidence: 0.85,
            factorImpacts: [],
            source: 'our_analysis'
          },
          {
            stepNumber: 2,
            businessLogic: "Feature differentiation creates competitive advantage",
            mechanism: 'competitive_advantage',
            expectedOutcome: {
              category: 'competitive_metrics',
              direction: 'increase',
              magnitude: 0.10,
              description: "Unique features strengthen market position"
            },
            timeHorizon: '3_months',
            confidence: 0.70,
            factorImpacts: [],
            source: 'our_analysis'
          }
        );
        break;

      // Add more mechanism patterns as needed
      default:
        this.logger.warn(`No causal pattern defined for mechanism: ${mechanism}`);
        return [];
    }

    return steps;
  }

  // =====================================================================================
  // BELIEF FORMATION ANALYSIS
  // =====================================================================================

  /**
   * Extract Belief Formation Analysis
   * 
   * REASONING: From Core Concepts.md - Complex investor beliefs can be broken down 
   * into 10 independent, measurable mathematical factors
   * 
   * TARGET: <0.7 correlation between factors (Hypotheses.md H4)
   */
  async extractBeliefFormation(
    article: ArticleContent,
    taxonomy: ArticleTaxonomy,
    businessChains: BusinessCausalChain[]
  ): Promise<BeliefFormationAnalysis> {
    
    this.logger.info(`Extracting belief formation for: ${article.title.substring(0, 50)}...`);

    // STEP 1: Calculate atomic belief factors
    const atomicFactors = this.calculateAtomicBeliefFactors(article, taxonomy, businessChains);

    // STEP 2: Analyze source credibility impact
    const sourceCredibilityImpact = this.analyzeSourceCredibility(article, atomicFactors);

    // STEP 3: Project temporal decay
    const temporalDecayProjection = this.projectTemporalDecay(atomicFactors, businessChains);

    // STEP 4: Analyze investor archetype variance
    const investorArchetypeVariance = this.analyzeInvestorArchetypeVariance(
      atomicFactors, 
      businessChains,
      article
    );

    const beliefAnalysis: BeliefFormationAnalysis = {
      atomicFactors,
      sourceCredibilityImpact,
      temporalDecayProjection,
      investorArchetypeVariance
    };

    // STEP 5: Store for validation
    await this.database.storeBeliefAnalysis(article.url, beliefAnalysis);

    return beliefAnalysis;
  }

  /**
   * Calculate Atomic Belief Factors
   * 
   * REASONING: Each of the 10 belief dimensions can be independently measured
   * based on article content, business logic, and contextual factors
   */
  private calculateAtomicBeliefFactors(
    article: ArticleContent,
    taxonomy: ArticleTaxonomy,
    businessChains: BusinessCausalChain[]
  ): BeliefFactors {
    
    const content = article.fullText.toLowerCase();
    const title = article.title.toLowerCase();
    
    // Calculate each belief factor independently
    const intensity_belief = this.calculateIntensityBelief(title, content, businessChains);
    const duration_belief = this.calculateDurationBelief(taxonomy, businessChains);
    const certainty_level = this.calculateCertaintyLevel(content, businessChains);
    const hope_vs_fear = this.calculateHopeFearBalance(content, businessChains);
    const doubt_factor = this.calculateDoubtFactor(content, article.source);
    const attention_intensity = this.calculateAttentionIntensity(title, content);
    const social_amplification = this.calculateSocialAmplification(content);
    const expert_consensus = this.calculateExpertConsensus(content, article.source);
    const urgency_perception = this.calculateUrgencyPerception(content, taxonomy);
    const believability_score = this.calculateBelievabilityScore(
      article.source, content, businessChains
    );

    return {
      intensity_belief,
      duration_belief,
      certainty_level,
      hope_vs_fear,
      doubt_factor,
      attention_intensity,
      social_amplification,
      expert_consensus,
      urgency_perception,
      believability_score
    };
  }

  /**
   * Calculate Intensity Belief
   * 
   * REASONING: How strongly investors will believe this matters
   * Based on magnitude of business impact and signal strength
   */
  private calculateIntensityBelief(
    title: string, 
    content: string, 
    businessChains: BusinessCausalChain[]
  ): number {
    let intensityScore = 0.5; // Base score

    // Boost for strong signal words in title
    const strongSignals = ['major', 'significant', 'breakthrough', 'revolutionary', 'massive'];
    strongSignals.forEach(signal => {
      if (title.includes(signal)) intensityScore += 0.1;
    });

    // Boost for business impact magnitude
    const averageImpact = businessChains.reduce((sum, chain) => {
      return sum + chain.steps.reduce((stepSum, step) => {
        return stepSum + step.expectedOutcome.magnitude;
      }, 0) / chain.steps.length;
    }, 0) / Math.max(businessChains.length, 1);

    intensityScore += averageImpact * 0.3;

    // Cap at 1.0
    return Math.min(intensityScore, 1.0);
  }

  /**
   * Calculate Duration Belief
   * 
   * REASONING: How long this belief will persist
   * Based on time horizons in business chains and event type
   */
  private calculateDurationBelief(
    taxonomy: ArticleTaxonomy,
    businessChains: BusinessCausalChain[]
  ): number {
    let durationScore = 0.5; // Base score

    // Predictive articles have longer belief duration
    if (taxonomy.temporalRelationship.primary === 'predictive') {
      durationScore += 0.2;
    }

    // Longer business impact timeframes = longer belief duration
    const averageTimeHorizon = this.calculateAverageTimeHorizon(businessChains);
    if (averageTimeHorizon >= 365) { // 1 year+
      durationScore += 0.3;
    } else if (averageTimeHorizon >= 90) { // 3 months+
      durationScore += 0.2;
    } else if (averageTimeHorizon >= 30) { // 1 month+
      durationScore += 0.1;
    }

    return Math.min(durationScore, 1.0);
  }

  // ... Additional belief factor calculation methods would go here ...
  // For brevity, showing the pattern without implementing all 10 factors

  // =====================================================================================
  // PATTERN MATCHING AND HISTORICAL ANALOGS
  // =====================================================================================

  /**
   * Find Historical Analogs
   * 
   * REASONING: From Hypotheses.md H10 - Vector similarity matching on combined 
   * business+belief vectors finds better historical analogs than content similarity
   * 
   * TARGET: >15% improvement over content similarity alone
   */
  async findHistoricalAnalogs(
    currentChain: BusinessCausalChain,
    currentBeliefs: BeliefFactors
  ): Promise<HistoricalAnalog[]> {
    
    this.logger.info(`Finding historical analogs for pattern: ${currentChain.patternClassification}`);

    // STEP 1: Create combined vector representation
    const currentVector = this.createCombinedVector(currentChain, currentBeliefs);

    // STEP 2: Query database for historical events
    const historicalEvents = await this.database.getHistoricalEvents();

    // STEP 3: Calculate similarity scores
    const analogs: HistoricalAnalog[] = [];
    
    for (const historicalEvent of historicalEvents) {
      const historicalVector = this.createCombinedVector(
        historicalEvent.businessChain, 
        historicalEvent.beliefFactors
      );
      
      const similarity = this.calculateVectorSimilarity(currentVector, historicalVector);
      
      if (similarity.overallSimilarity > 0.6) { // Minimum similarity threshold
        const analog: HistoricalAnalog = {
          analogId: `analog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          currentEvent: currentChain,
          historicalEvent: historicalEvent.businessChain,
          similarityScores: similarity,
          historicalOutcome: historicalEvent.outcome,
          prediction: this.generatePredictionFromAnalog(historicalEvent.outcome),
          confidence: this.calculateAnalogConfidence(similarity, historicalEvent)
        };
        
        analogs.push(analog);
      }
    }

    // STEP 4: Sort by similarity and return top matches
    analogs.sort((a, b) => b.similarityScores.overallSimilarity - a.similarityScores.overallSimilarity);
    
    return analogs.slice(0, 10); // Top 10 analogs
  }

  // =====================================================================================
  // VALIDATION AND QUALITY CONTROL
  // =====================================================================================

  /**
   * Validate Extraction Quality
   * 
   * REASONING: Critical to measure human-AI agreement before trusting automation
   * Success criteria from Hypotheses.md must be met
   */
  async validateExtraction(
    articleId: string,
    humanValidation: ManualExtraction
  ): Promise<ValidationResult> {
    
    // Get AI extraction results
    const aiExtraction = await this.database.getAIExtraction(articleId);
    
    // Calculate agreement metrics
    const agreementMetrics = this.calculateAgreementMetrics(humanValidation, aiExtraction);
    
    // Assess quality scores
    const qualityScores = this.assessQualityScores(humanValidation, aiExtraction);
    
    // Determine if validation passed
    const passedValidation = this.assessValidationSuccess(agreementMetrics);
    
    const validationResult: ValidationResult = {
      validationId: `validation_${Date.now()}`,
      articleId,
      validatorName: humanValidation.extractorName || 'unknown',
      validationDate: new Date(),
      validationType: 'full_pipeline',
      manualExtraction: humanValidation,
      aiExtraction,
      agreementMetrics,
      qualityScores,
      passedValidation
    };
    
    // Store validation result
    await this.database.storeValidationResult(validationResult);
    
    return validationResult;
  }

  // =====================================================================================
  // HELPER METHODS AND UTILITIES
  // =====================================================================================

  /**
   * Helper methods for calculations, database operations, and utility functions
   * These support the main extraction methods above
   */

  private calculateAverageTimeHorizon(chains: BusinessCausalChain[]): number {
    const timeHorizonDays = {
      '1_day': 1,
      '1_week': 7,
      '1_month': 30,
      '3_months': 90,
      '6_months': 180,
      '1_year': 365,
      '2_years': 730
    };

    let totalDays = 0;
    let stepCount = 0;

    chains.forEach(chain => {
      chain.steps.forEach(step => {
        totalDays += timeHorizonDays[step.timeHorizon] || 30;
        stepCount++;
      });
    });

    return stepCount > 0 ? totalDays / stepCount : 30;
  }

  private classifyPattern(steps: BusinessChainStep[]): string {
    // Simple pattern classification based on mechanism sequence
    const mechanisms = steps.map(step => step.mechanism);
    return mechanisms.join(' → ');
  }

  private assessChainConfidence(steps: BusinessChainStep[], article: ArticleContent): number {
    // Average confidence of all steps, weighted by step importance
    const avgConfidence = steps.reduce((sum, step) => sum + step.confidence, 0) / steps.length;
    
    // Adjust based on article quality indicators
    let adjustment = 0;
    
    if (article.fullText.length > 1000) adjustment += 0.1; // Longer articles = more info
    if (article.authors.length > 0) adjustment += 0.05;    // Attributed articles = more credible
    
    return Math.min(avgConfidence + adjustment, 1.0);
  }

  // Additional helper methods would be implemented here...
}

// =====================================================================================
// SUPPORTING INTERFACES AND TYPES
// =====================================================================================

interface DatabaseInterface {
  storeTaxonomyExtraction(articleUrl: string, taxonomy: ArticleTaxonomy): Promise<void>;
  storeCausalChains(articleUrl: string, chains: BusinessCausalChain[]): Promise<void>;
  storeBeliefAnalysis(articleUrl: string, analysis: BeliefFormationAnalysis): Promise<void>;
  getHistoricalEvents(): Promise<HistoricalEvent[]>;
  getAIExtraction(articleId: string): Promise<AIExtraction>;
  storeValidationResult(result: ValidationResult): Promise<void>;
}

interface HistoricalEvent {
  eventId: string;
  businessChain: BusinessCausalChain;
  beliefFactors: BeliefFactors;
  outcome: PatternOutcome;
  context: PatternContext;
}

interface ValidationService {
  validateTaxonomy(manual: ArticleTaxonomy, ai: ArticleTaxonomy): number;
  validateChains(manual: BusinessCausalChain[], ai: BusinessCausalChain[]): number;
  validateBeliefs(manual: BeliefFactors, ai: BeliefFactors): number;
}

interface Logger {
  info(message: string): void;
  debug(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// Temporary imports until types are properly organized
interface AIExtraction {
  taxonomy?: ArticleTaxonomy;
  businessChains?: BusinessCausalChain[];
  beliefFactors?: BeliefFactors;
  processingTime: number;
  processingCost: number;
  aiConfidence: number;
}

interface ManualExtraction {
  taxonomy?: ArticleTaxonomy;
  businessChains?: BusinessCausalChain[];
  beliefFactors?: BeliefFactors;
  extractionTime: number;
  extractorConfidence: number;
  extractorName?: string;
}

interface PatternOutcome {
  stockMovement: any;
  businessImpact: any;
  beliefEvolution: any;
  timeToImpact: number;
}

interface PatternContext {
  marketRegime: string;
  volatilityEnvironment: string;
  sectorMomentum: string;
  competitiveContext: string;
  regulatoryContext: string;
}

export default KnowledgeExtractionService;
