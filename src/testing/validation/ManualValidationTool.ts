/**
 * Manual Validation Tool for AEIOU Knowledge Architecture
 * 
 * This tool provides a structured interface for humans to manually extract
 * business causal chains, belief factors, and article taxonomy. It serves as:
 * 
 * 1. Ground truth generator for AI training
 * 2. Inter-annotator agreement measurement tool  
 * 3. Validation system for testing core hypotheses
 * 4. Quality control mechanism for system outputs
 * 
 * USAGE:
 * - Run this tool to manually process articles
 * - Compare results across multiple annotators
 * - Measure agreement against success criteria from Hypotheses.md
 * - Use results to validate or refute core assumptions
 */

import {
  ArticleTaxonomy,
  BusinessCausalChain,
  BusinessChainStep,
  BeliefFactors,
  ValidationResult,
  ManualExtraction,
  BusinessMechanism,
  BusinessFactorCategory,
  TimeHorizon
} from '../belief/ontology/KnowledgeStructures';
import { ArticleContent } from '../data/models/newsSchema';
import * as readline from 'readline';
import * as fs from 'fs';

// =====================================================================================
// MANUAL VALIDATION TOOL - Core Implementation
// =====================================================================================

export class ManualValidationTool {
  private rl: readline.Interface;
  private validatorName: string;
  private currentSession: ValidationSession;

  constructor(validatorName: string) {
    this.validatorName = validatorName;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.currentSession = {
      sessionId: `session_${Date.now()}`,
      validatorName,
      startTime: new Date(),
      articlesProcessed: 0,
      results: []
    };
  }

  // =====================================================================================
  // MAIN VALIDATION WORKFLOW
  // =====================================================================================

  /**
   * Main validation workflow for processing articles
   * 
   * PROCESS:
   * 1. Present article to human annotator
   * 2. Guide through systematic extraction process
   * 3. Capture reasoning and confidence levels
   * 4. Store results for comparison and analysis
   */
  async validateArticle(article: ArticleContent): Promise<ManualExtraction> {
    console.log('\n' + '='.repeat(80));
    console.log(`📰 MANUAL VALIDATION SESSION`);
    console.log(`Validator: ${this.validatorName}`);
    console.log(`Article: ${article.title}`);
    console.log(`Source: ${article.source} | Published: ${article.publishedTime.toISOString()}`);
    console.log('='.repeat(80));

    const startTime = Date.now();

    try {
      // STEP 1: Present article content
      await this.presentArticleContent(article);

      // STEP 2: Extract article taxonomy
      console.log('\n📊 STEP 1: ARTICLE TAXONOMY CLASSIFICATION');
      console.log('-'.repeat(50));
      const taxonomy = await this.extractTaxonomyManually(article);

      // STEP 3: Extract business causal chains
      console.log('\n🔗 STEP 2: BUSINESS CAUSAL CHAIN EXTRACTION');
      console.log('-'.repeat(50));
      const businessChains = await this.extractChainsManually(article, taxonomy);

      // STEP 4: Extract belief factors
      console.log('\n🧠 STEP 3: BELIEF FACTOR ASSESSMENT');
      console.log('-'.repeat(50));
      const beliefFactors = await this.extractBeliefsManually(article, businessChains);

      // STEP 5: Overall confidence assessment
      console.log('\n⭐ STEP 4: CONFIDENCE ASSESSMENT');
      console.log('-'.repeat(50));
      const extractorConfidence = await this.getOverallConfidence();

      const extractionTime = (Date.now() - startTime) / 1000 / 60; // Convert to minutes

      const manualExtraction: ManualExtraction = {
        taxonomy,
        businessChains,
        beliefFactors,
        extractionTime,
        extractorConfidence,
        extractorName: this.validatorName
      };

      // STEP 6: Store results
      await this.storeValidationResult(article, manualExtraction);

      console.log('\n✅ VALIDATION COMPLETE');
      console.log(`⏱️  Time taken: ${extractionTime.toFixed(2)} minutes`);
      console.log(`🎯 Confidence: ${extractorConfidence.toFixed(2)}`);

      this.currentSession.articlesProcessed++;
      this.currentSession.results.push({
        articleId: article.url,
        extraction: manualExtraction,
        timestamp: new Date()
      });

      return manualExtraction;

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      throw error;
    }
  }

  // =====================================================================================
  // ARTICLE CONTENT PRESENTATION
  // =====================================================================================

  /**
   * Present article content to human annotator
   * Provide structured view for systematic analysis
   */
  private async presentArticleContent(article: ArticleContent): Promise<void> {
    console.log('\n📄 ARTICLE CONTENT:');
    console.log('-'.repeat(50));
    console.log(`Title: ${article.title}`);
    console.log(`Summary: ${article.summary}`);
    console.log(`\nFull Text (first 500 chars):`);
    console.log(article.fullText.substring(0, 500) + '...');
    
    const readMore = await this.askQuestion('\nRead full article? (y/n): ');
    if (readMore.toLowerCase() === 'y') {
      console.log('\n' + article.fullText);
    }

    await this.askQuestion('\nPress Enter when ready to begin extraction...');
  }

  // =====================================================================================
  // TAXONOMY EXTRACTION
  // =====================================================================================

  /**
   * Manual Article Taxonomy Extraction
   * 
   * REASONING: Test hypothesis H1 component - can humans reliably classify articles
   * by temporal relationship and information type?
   */
  private async extractTaxonomyManually(article: ArticleContent): Promise<ArticleTaxonomy> {
    console.log('🎯 TAXONOMY CLASSIFICATION GUIDE:');
    console.log('   Analyze the article\'s temporal and informational characteristics');

    // TEMPORAL RELATIONSHIP
    console.log('\n1. TEMPORAL RELATIONSHIP:');
    console.log('   - predictive: Discusses what WILL happen');
    console.log('   - explanatory: Explains what DID happen');
    console.log('   - real_time: Announces what IS happening');
    console.log('   - meta_analysis: Analyzes what traders/market thinks');

    const temporalPrimary = await this.askChoice(
      'Primary temporal relationship',
      ['predictive', 'explanatory', 'real_time', 'meta_analysis']
    ) as 'predictive' | 'explanatory' | 'real_time' | 'meta_analysis';

    // TIME REFERENCES
    const timeReference: any = {};
    
    if (temporalPrimary === 'explanatory' || temporalPrimary === 'meta_analysis') {
      console.log('\n   Past time reference (if any):');
      const pastRef = await this.askChoice(
        'How far back does this reflect',
        ['none', '2_hours', '1_day', '1_week', '6_months']
      );
      if (pastRef !== 'none') {
        timeReference.pastReflection = pastRef;
      }
    }

    if (temporalPrimary === 'predictive') {
      console.log('\n   Future time reference:');
      const futureRef = await this.askChoice(
        'How far ahead does this predict',
        ['1_day', '1_week', '3_months', '1_year']
      );
      timeReference.futureProjection = futureRef;
    }

    // INFORMATION TYPE
    console.log('\n2. INFORMATION TYPE:');
    console.log('   - primary_announcement: First/official announcement');
    console.log('   - secondary_analysis: Analysis of existing info');
    console.log('   - market_reaction: Discussing market response');
    console.log('   - speculation: Rumor or speculation');

    const informationPrimary = await this.askChoice(
      'Primary information type',
      ['primary_announcement', 'secondary_analysis', 'market_reaction', 'speculation']
    ) as any;

    console.log('\n   News-to-movement relationship:');
    console.log('   - predictive_signal: News likely to cause movement');
    console.log('   - explanatory_response: News explains past movement');
    console.log('   - simultaneous: News and movement happening together');
    console.log('   - delayed_chain: News will cause delayed effects');

    const newsToMovement = await this.askChoice(
      'News-to-movement relationship',
      ['predictive_signal', 'explanatory_response', 'simultaneous', 'delayed_chain']
    ) as any;

    // BUSINESS EVENT TYPE
    console.log('\n3. BUSINESS EVENT TYPE:');
    const businessCategory = await this.askChoice(
      'Primary business category',
      [
        'financial_metrics', 'customer_metrics', 'product_metrics',
        'operational_metrics', 'market_metrics', 'sales_metrics',
        'competitive_metrics', 'regulatory_metrics', 'innovation_metrics', 'risk_metrics'
      ]
    ) as BusinessFactorCategory;

    const mechanismType = await this.askChoice(
      'Business mechanism type',
      [
        'partnership_leverage', 'feature_driven_refresh', 'competitive_advantage',
        'market_expansion', 'cost_optimization', 'capability_enhancement',
        'risk_mitigation', 'brand_strengthening', 'ecosystem_expansion', 'regulatory_compliance'
      ]
    ) as BusinessMechanism;

    return {
      temporalRelationship: {
        primary: temporalPrimary,
        timeReference
      },
      informationType: {
        primary: informationPrimary,
        newsToMovement
      },
      businessEventType: {
        category: businessCategory,
        mechanismType
      }
    };
  }

  // =====================================================================================
  // BUSINESS CAUSAL CHAIN EXTRACTION
  // =====================================================================================

  /**
   * Manual Business Causal Chain Extraction
   * 
   * REASONING: Core hypothesis H1 - "News events can be reliably decomposed into 2-5 step 
   * business causal chains where each step represents a logical business consequence"
   * 
   * TARGET: >70% inter-annotator agreement
   */
  private async extractChainsManually(
    article: ArticleContent, 
    taxonomy: ArticleTaxonomy
  ): Promise<BusinessCausalChain[]> {
    
    console.log('🔗 BUSINESS CAUSAL CHAIN EXTRACTION GUIDE:');
    console.log('   Extract logical business consequence chains (2-5 steps each)');
    console.log('   Each step should follow: Event → Business Logic → Expected Outcome');

    const chains: BusinessCausalChain[] = [];

    // Ask how many distinct chains they see
    const chainCount = await this.askNumber(
      'How many distinct business causal chains do you see? (1-3)',
      1, 3
    );

    for (let i = 0; i < chainCount; i++) {
      console.log(`\n--- CHAIN ${i + 1} ---`);
      const chain = await this.extractSingleChainManually(article, taxonomy, i + 1);
      chains.push(chain);
    }

    return chains;
  }

  /**
   * Extract Single Business Causal Chain
   */
  private async extractSingleChainManually(
    article: ArticleContent,
    taxonomy: ArticleTaxonomy,
    chainNumber: number
  ): Promise<BusinessCausalChain> {
    
    console.log(`\n🔗 CHAIN ${chainNumber} EXTRACTION:`);

    // Get number of steps
    const stepCount = await this.askNumber(
      `How many steps in chain ${chainNumber}? (2-5)`,
      2, 5
    );

    const steps: BusinessChainStep[] = [];

    for (let i = 0; i < stepCount; i++) {
      console.log(`\n  --- STEP ${i + 1} ---`);
      const step = await this.extractChainStepManually(i + 1);
      steps.push(step);
    }

    // Get overall chain confidence
    const overallConfidence = await this.askNumber(
      `Overall confidence in chain ${chainNumber} (0.0-1.0)`,
      0, 1
    );

    // Pattern classification
    const patternName = await this.askQuestion(
      `Pattern name for this chain (e.g., "partnership_leverage → capability_boost"): `
    );

    return {
      steps,
      cascadingEffects: [], // Simplified for manual extraction
      patternClassification: patternName,
      overallConfidence
    };
  }

  /**
   * Extract Individual Chain Step
   */
  private async extractChainStepManually(stepNumber: number): Promise<BusinessChainStep> {
    console.log(`    STEP ${stepNumber} DETAILS:`);

    const businessLogic = await this.askQuestion(
      `    Business logic (what happens): `
    );

    const mechanism = await this.askChoice(
      '    Business mechanism',
      [
        'partnership_leverage', 'feature_driven_refresh', 'competitive_advantage',
        'market_expansion', 'cost_optimization', 'capability_enhancement',
        'risk_mitigation', 'brand_strengthening', 'ecosystem_expansion', 'regulatory_compliance'
      ]
    ) as BusinessMechanism;

    const timeHorizon = await this.askChoice(
      '    Time horizon',
      ['1_day', '1_week', '1_month', '3_months', '6_months', '1_year', '2_years']
    ) as TimeHorizon;

    const confidence = await this.askNumber(
      '    Confidence in this step (0.0-1.0)',
      0, 1
    );

    const outcomeCategory = await this.askChoice(
      '    Outcome category',
      [
        'financial_metrics', 'customer_metrics', 'product_metrics',
        'operational_metrics', 'market_metrics', 'sales_metrics',
        'competitive_metrics', 'regulatory_metrics', 'innovation_metrics', 'risk_metrics'
      ]
    ) as BusinessFactorCategory;

    const outcomeDirection = await this.askChoice(
      '    Outcome direction',
      ['increase', 'decrease', 'neutral']
    ) as 'increase' | 'decrease' | 'neutral';

    const outcomeMagnitude = await this.askNumber(
      '    Outcome magnitude (0.0-1.0, relative impact)',
      0, 1
    );

    const outcomeDescription = await this.askQuestion(
      '    Outcome description: '
    );

    const source = await this.askChoice(
      '    Information source',
      ['article_stated', 'our_analysis', 'historical_pattern']
    ) as 'article_stated' | 'our_analysis' | 'historical_pattern';

    return {
      stepNumber,
      businessLogic,
      mechanism,
      expectedOutcome: {
        category: outcomeCategory,
        direction: outcomeDirection,
        magnitude: outcomeMagnitude,
        description: outcomeDescription
      },
      timeHorizon,
      confidence,
      factorImpacts: [], // Simplified for manual extraction
      source
    };
  }

  // =====================================================================================
  // BELIEF FACTOR EXTRACTION
  // =====================================================================================

  /**
   * Manual Belief Factor Extraction
   * 
   * REASONING: Test hypothesis H4 - "The 10 belief dimensions can be measured 
   * independently and meaningfully combined to predict market reactions"
   * 
   * TARGET: <0.7 correlation between factors (independence)
   */
  private async extractBeliefsManually(
    article: ArticleContent,
    businessChains: BusinessCausalChain[]
  ): Promise<BeliefFactors> {
    
    console.log('🧠 BELIEF FACTOR ASSESSMENT GUIDE:');
    console.log('   Score each psychological dimension independently (0.0-1.0)');
    console.log('   Consider how typical investors would perceive this information');

    console.log('\n💡 BELIEF FACTOR DEFINITIONS:');
    console.log('   intensity_belief: How strongly investors believe this matters');
    console.log('   duration_belief: How long this belief will persist');
    console.log('   certainty_level: Confidence in assessment');
    console.log('   hope_vs_fear: Emotional spectrum (0=fear, 0.5=neutral, 1=hope)');
    console.log('   doubt_factor: Skepticism level (higher = more doubt)');
    console.log('   attention_intensity: Media/social attention level');
    console.log('   social_amplification: Viral/sharing potential');
    console.log('   expert_consensus: Expert agreement level');
    console.log('   urgency_perception: How urgent this feels');
    console.log('   believability_score: Overall market credence');

    const beliefFactors: BeliefFactors = {
      intensity_belief: await this.askNumber('intensity_belief', 0, 1),
      duration_belief: await this.askNumber('duration_belief', 0, 1),
      certainty_level: await this.askNumber('certainty_level', 0, 1),
      hope_vs_fear: await this.askNumber('hope_vs_fear (0=fear, 1=hope)', 0, 1),
      doubt_factor: await this.askNumber('doubt_factor', 0, 1),
      attention_intensity: await this.askNumber('attention_intensity', 0, 1),
      social_amplification: await this.askNumber('social_amplification', 0, 1),
      expert_consensus: await this.askNumber('expert_consensus', 0, 1),
      urgency_perception: await this.askNumber('urgency_perception', 0, 1),
      believability_score: await this.askNumber('believability_score', 0, 1)
    };

    return beliefFactors;
  }

  // =====================================================================================
  // CONFIDENCE AND QUALITY ASSESSMENT
  // =====================================================================================

  /**
   * Get Overall Confidence Assessment
   */
  private async getOverallConfidence(): Promise<number> {
    console.log('⭐ OVERALL CONFIDENCE ASSESSMENT:');
    console.log('   Consider the quality of your extraction across all components');
    
    const confidence = await this.askNumber(
      'Overall confidence in your extraction (0.0-1.0)',
      0, 1
    );

    const reasoning = await this.askQuestion(
      'Brief reasoning for confidence level: '
    );

    console.log(`📝 Confidence reasoning: ${reasoning}`);
    
    return confidence;
  }

  // =====================================================================================
  // DATA STORAGE AND SESSION MANAGEMENT
  // =====================================================================================

  /**
   * Store Validation Result
   */
  private async storeValidationResult(
    article: ArticleContent,
    extraction: ManualExtraction
  ): Promise<void> {
    
    const result = {
      sessionId: this.currentSession.sessionId,
      articleId: article.url,
      articleTitle: article.title,
      validatorName: this.validatorName,
      timestamp: new Date().toISOString(),
      extraction
    };

    // Store to file (in production, would store to database)
    const filename = `validation_${this.validatorName}_${Date.now()}.json`;
    const filepath = `./validation_results/${filename}`;
    
    // Ensure directory exists
    if (!fs.existsSync('./validation_results')) {
      fs.mkdirSync('./validation_results', { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    
    console.log(`💾 Results saved to: ${filepath}`);
  }

  /**
   * Save Session Summary
   */
  async saveSessionSummary(): Promise<void> {
    this.currentSession.endTime = new Date();
    this.currentSession.duration = 
      (this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()) / 1000 / 60;

    const filename = `session_${this.currentSession.sessionId}.json`;
    const filepath = `./validation_results/${filename}`;
    
    fs.writeFileSync(filepath, JSON.stringify(this.currentSession, null, 2));
    
    console.log('\n📊 SESSION SUMMARY:');
    console.log(`   Validator: ${this.validatorName}`);
    console.log(`   Articles processed: ${this.currentSession.articlesProcessed}`);
    console.log(`   Total time: ${this.currentSession.duration?.toFixed(2)} minutes`);
    console.log(`   Average time per article: ${(this.currentSession.duration! / this.currentSession.articlesProcessed).toFixed(2)} minutes`);
    console.log(`   Session saved to: ${filepath}`);
  }

  // =====================================================================================
  // USER INTERFACE UTILITIES
  // =====================================================================================

  /**
   * Ask text question
   */
  private askQuestion(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, resolve);
    });
  }

  /**
   * Ask for number input with validation
   */
  private async askNumber(prompt: string, min: number, max: number): Promise<number> {
    while (true) {
      const input = await this.askQuestion(`${prompt} (${min}-${max}): `);
      const num = parseFloat(input);
      
      if (!isNaN(num) && num >= min && num <= max) {
        return num;
      }
      
      console.log(`❌ Please enter a number between ${min} and ${max}`);
    }
  }

  /**
   * Ask for choice from options
   */
  private async askChoice(prompt: string, options: string[]): Promise<string> {
    console.log(`\n${prompt}:`);
    options.forEach((option, index) => {
      console.log(`   ${index + 1}. ${option}`);
    });

    while (true) {
      const input = await this.askQuestion(`Select option (1-${options.length}): `);
      const index = parseInt(input) - 1;
      
      if (index >= 0 && index < options.length) {
        return options[index];
      }
      
      console.log(`❌ Please enter a number between 1 and ${options.length}`);
    }
  }

  /**
   * Close interface
   */
  close(): void {
    this.rl.close();
  }
}

// =====================================================================================
// SUPPORTING INTERFACES
// =====================================================================================

interface ValidationSession {
  sessionId: string;
  validatorName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  articlesProcessed: number;
  results: Array<{
    articleId: string;
    extraction: ManualExtraction;
    timestamp: Date;
  }>;
}

// =====================================================================================
// COMMAND LINE INTERFACE
// =====================================================================================

/**
 * Main CLI function for running manual validations
 */
export async function runManualValidation(): Promise<void> {
  console.log('🎯 AEIOU MANUAL VALIDATION TOOL');
  console.log('================================');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const validatorName = await new Promise<string>(resolve => {
    rl.question('Enter your name: ', resolve);
  });

  rl.close();

  const tool = new ManualValidationTool(validatorName);

  try {
    // In a real implementation, you would load test articles from database
    const testArticles: ArticleContent[] = [
      {
        url: "https://example.com/test-article",
        title: "Apple Plans Major iPhone Redesigns For Three Consecutive Years",
        summary: "Apple gears up for an ambitious redesign streak, starting with a new iPhone Air set to dethrone the iPhone 16 Plus.",
        fullText: "Apple Inc. is reportedly planning major iPhone redesigns for three consecutive years, according to sources familiar with the matter. The company is said to be working on a new iPhone Air model that would replace the iPhone 16 Plus in the lineup. This move represents a significant shift in Apple's product strategy, potentially signaling a new era of more frequent design updates. The iPhone Air is expected to feature a thinner profile and enhanced AI capabilities, positioning it as a premium offering in the mid-tier segment.",
        publishedTime: new Date("2024-08-24T18:26:27Z"),
        source: "Benzinga",
        authors: ["Test Author"]
      }
    ];

    console.log(`\n🚀 Starting validation session for ${validatorName}`);
    console.log(`📄 ${testArticles.length} articles to process\n`);

    for (const article of testArticles) {
      await tool.validateArticle(article);
      
      const continueValidation = await new Promise<string>(resolve => {
        const rl2 = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rl2.question('\nContinue to next article? (y/n): ', answer => {
          rl2.close();
          resolve(answer);
        });
      });

      if (continueValidation.toLowerCase() !== 'y') {
        break;
      }
    }

    await tool.saveSessionSummary();

  } catch (error) {
    console.error('❌ Validation session failed:', error.message);
  } finally {
    tool.close();
  }
}

// Run if called directly
if (require.main === module) {
  runManualValidation().catch(console.error);
}

export default ManualValidationTool;
