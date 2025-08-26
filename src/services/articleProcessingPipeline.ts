/**
 * Multi-Pass Article Processing Pipeline
 * Cost-optimized with different models for different tasks
 */

import { NewsEvent, BusinessChainStep, BeliefFactors } from '../data/models/newsSchema';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface ArticleContent {
    url: string;
    title: string;
    summary: string;
    fullText: string;
    publishedTime: Date;
    source: string;
    authors: string[];
}

export interface Pass1Result {
    eventsIdentified: number;
    events: Array<{
        eventTitle: string;
        eventType: 'predictive' | 'explanatory' | 'analytical';
        temporalClassification: 'past' | 'present' | 'future' | 'mixed';
        confidence: number;
        relevanceToStock: number;
    }>;
    articleType: 'breaking_news' | 'analysis' | 'earnings_coverage' | 'opinion' | 'research';
    overallTone: 'bullish' | 'bearish' | 'neutral' | 'mixed';
}

export interface Pass2Result {
    businessStepsFromArticle: BusinessChainStep[];
    ourBusinessPredictions: BusinessChainStep[];
    causalSequence: Array<{
        step: number;
        mechanism: string;
        timeHorizon: string;
        confidence: number;
    }>;
    riskFactors: string[];
    opportunityFactors: string[];
}

export interface Pass3Result {
    beliefFactors: BeliefFactors;
    marketImpactScore: number;
    confidenceMatrix: {
        eventIdentification: number;
        businessLogic: number;
        beliefQuantification: number;
        overall: number;
    };
    validationFlags: {
        needsHumanReview: boolean;
        highUncertainty: boolean;
        conflictingSignals: boolean;
    };
}

export interface ProcessedArticle {
    original: ArticleContent;
    pass1: Pass1Result;
    pass2: Pass2Result;
    pass3: Pass3Result;
    processingTime: number;
    totalCost: number;
    modelVersions: {
        pass1Model: string;
        pass2Model: string;
        pass3Model: string;
    };
}

export class ArticleProcessingPipeline {
    private openai: OpenAI;
    private anthropic: Anthropic;

    constructor(openaiKey: string, anthropicKey: string) {
        this.openai = new OpenAI({
            apiKey: openaiKey,
        });

        this.anthropic = new Anthropic({
            apiKey: anthropicKey,
        });
    }

    /**
     * Pass 1: Event Extraction & Temporal Classification
     * Model: GPT-3.5-turbo (cost-effective for structured extraction)
     */
    async pass1EventExtraction(article: ArticleContent): Promise<Pass1Result> {
        const prompt = `
TASK: Extract and classify news events from this article.

ARTICLE:
Title: ${article.title}
Summary: ${article.summary}
Full Text: ${article.fullText}
Published: ${article.publishedTime.toISOString()}

INSTRUCTIONS:
1. Identify all distinct news events mentioned in the article
2. Classify each event's temporal nature (past, present, future, mixed)
3. Determine if each event is predictive (will cause change) or explanatory (explains past change)
4. Rate relevance to stock movement (0-1 scale)
5. Classify overall article type

OUTPUT FORMAT (JSON):
{
  "eventsIdentified": <number>,
  "events": [
    {
      "eventTitle": "Specific event title",
      "eventType": "predictive|explanatory|analytical",
      "temporalClassification": "past|present|future|mixed",
      "confidence": 0.85,
      "relevanceToStock": 0.7
    }
  ],
  "articleType": "breaking_news|analysis|earnings_coverage|opinion|research",
  "overallTone": "bullish|bearish|neutral|mixed"
}

CRITICAL: 
- Focus on ACTIONABLE events that could impact stock price
- Distinguish between new events vs commentary on past events
- Rate confidence honestly (0.5 = uncertain, 0.9+ = very confident)
`;

        try {
            const response = await this.callOpenAI(prompt, 'gpt-3.5-turbo');
            return JSON.parse(response) as Pass1Result;
        } catch (error) {
            throw new Error(`Pass 1 failed: ${error.message}`);
        }
    }

    /**
     * Pass 2: Business Logic & Causal Chain Analysis  
     * Model: GPT-4 (sophisticated reasoning required)
     */
    async pass2BusinessLogic(article: ArticleContent, pass1: Pass1Result): Promise<Pass2Result> {
        const prompt = `
TASK: Extract business logic and predict causal chains from this article.

ARTICLE CONTEXT:
Title: ${article.title}
Events Identified: ${JSON.stringify(pass1.events, null, 2)}
Article Type: ${pass1.articleType}

FULL ARTICLE TEXT:
${article.fullText}

INSTRUCTIONS:
1. Extract business reasoning chains mentioned IN the article
2. Generate OUR independent business predictions based on the events
3. Map causal sequences (A leads to B leads to C)
4. Identify risk factors and opportunity factors
5. Estimate time horizons and confidence levels

BUSINESS LOGIC FRAMEWORK:
- Revenue Impact: How will this affect sales/revenue?
- Cost Impact: How will this affect expenses/margins?
- Competitive Position: How does this change competitive dynamics?
- Market Perception: How will investors/market react?
- Operational Changes: What business processes change?

OUTPUT FORMAT (JSON):
{
  "businessStepsFromArticle": [
    {
      "step": 1,
      "mechanism": "product_innovation",
      "description": "New iPhone design announced",
      "expectedOutcome": "increased_consumer_interest",
      "timeHorizon": "3-6_months",
      "confidence": 0.8,
      "source": "article_stated"
    }
  ],
  "ourBusinessPredictions": [
    {
      "step": 1,
      "mechanism": "refresh_cycle",
      "description": "Design change triggers upgrade cycle",
      "expectedOutcome": "revenue_growth",
      "timeHorizon": "6-12_months", 
      "confidence": 0.7,
      "source": "our_analysis"
    }
  ],
  "causalSequence": [
    {
      "step": 1,
      "mechanism": "announcement_effect",
      "timeHorizon": "immediate",
      "confidence": 0.9
    }
  ],
  "riskFactors": ["Economic slowdown could reduce upgrade demand"],
  "opportunityFactors": ["Pent-up demand from delayed purchases"]
}

CRITICAL:
- Separate what the article CLAIMS will happen vs what YOU predict
- Focus on measurable business outcomes
- Be specific about mechanisms (how A causes B)
- Consider multiple time horizons
`;

        try {
            const response = await this.callOpenAI(prompt, 'gpt-4');
            return JSON.parse(response) as Pass2Result;
        } catch (error) {
            throw new Error(`Pass 2 failed: ${error.message}`);
        }
    }

    /**
     * Pass 3: Belief Factor Synthesis & Confidence Scoring
     * Model: Claude-3.5-Sonnet (nuanced psychological analysis)
     */
    async pass3BeliefSynthesis(
        article: ArticleContent,
        pass1: Pass1Result,
        pass2: Pass2Result
    ): Promise<Pass3Result> {
        const prompt = `
TASK: Synthesize belief factors and confidence metrics for this processed article.

CONTEXT:
Article: ${article.title}
Events: ${pass1.eventsIdentified} events identified
Business Steps: ${pass2.businessStepsFromArticle.length} from article, ${pass2.ourBusinessPredictions.length} our predictions
Overall Tone: ${pass1.overallTone}

FULL ANALYSIS:
Pass 1 Results: ${JSON.stringify(pass1, null, 2)}
Pass 2 Results: ${JSON.stringify(pass2, null, 2)}

INSTRUCTIONS:
Generate atomic belief factors based on the psychological dimensions of how investors would perceive this information:

ATOMIC BELIEF DIMENSIONS:
- intensity_belief: How strongly will investors believe this matters (0-1)
- duration_belief: How long will this belief persist (0-1)  
- certainty_level: How certain are investors about outcomes (0-1)
- hope_vs_fear: Emotional weighting (0=fear, 0.5=neutral, 1=hope)
- doubt_factor: Skepticism level (0-1, higher = more doubt)
- predictability: How predictable are the outcomes (0-1)
- clarity_score: How clear/understandable is the situation (0-1)
- impact_feeling: Perceived magnitude of impact (0-1)
- durability_score: How lasting are the expected changes (0-1)
- sensitivity: How sensitive is outcome to external factors (0-1)

OUTPUT FORMAT (JSON):
{
  "beliefFactors": {
    "intensity_belief": 0.75,
    "duration_belief": 0.60,
    "certainty_level": 0.70,
    "hope_vs_fear": 0.65,
    "doubt_factor": 0.30,
    "predictability": 0.55,
    "clarity_score": 0.80,
    "impact_feeling": 0.70,
    "durability_score": 0.60,
    "sensitivity": 0.45
  },
  "marketImpactScore": 0.68,
  "confidenceMatrix": {
    "eventIdentification": 0.85,
    "businessLogic": 0.75,
    "beliefQuantification": 0.65,
    "overall": 0.75
  },
  "validationFlags": {
    "needsHumanReview": false,
    "highUncertainty": false,
    "conflictingSignals": true
  }
}

CRITICAL:
- Base belief factors on psychological realism, not just business logic
- Consider source credibility, timing, market context
- Flag articles that need human review (conflicting signals, high uncertainty)
- Be conservative with confidence - better to underestimate than overestimate
`;

        try {
            const response = await this.callClaude(prompt);
            return JSON.parse(response) as Pass3Result;
        } catch (error) {
            throw new Error(`Pass 3 failed: ${error.message}`);
        }
    }

    /**
     * Main pipeline orchestrator
     */
    async processArticle(article: ArticleContent): Promise<ProcessedArticle> {
        const startTime = Date.now();
        let totalCost = 0;

        try {
            console.log(`🔄 Processing: "${article.title.substring(0, 50)}..."`);

            // Pass 1: Event Extraction (GPT-3.5-turbo)
            console.log("   📝 Pass 1: Event extraction...");
            const pass1 = await this.pass1EventExtraction(article);
            totalCost += 0.002; // Estimated cost for GPT-3.5-turbo

            // Pass 2: Business Logic (GPT-4)
            console.log("   🧠 Pass 2: Business logic analysis...");
            const pass2 = await this.pass2BusinessLogic(article, pass1);
            totalCost += 0.03; // Estimated cost for GPT-4

            // Pass 3: Belief Synthesis (Claude)
            console.log("   💭 Pass 3: Belief factor synthesis...");
            const pass3 = await this.pass3BeliefSynthesis(article, pass1, pass2);
            totalCost += 0.015; // Estimated cost for Claude

            const processingTime = Date.now() - startTime;

            console.log(`✅ Processed in ${processingTime}ms, cost: $${totalCost.toFixed(4)}`);
            console.log(`   📊 Found ${pass1.eventsIdentified} events, ${pass2.businessStepsFromArticle.length + pass2.ourBusinessPredictions.length} business steps`);

            return {
                original: article,
                pass1,
                pass2,
                pass3,
                processingTime,
                totalCost,
                modelVersions: {
                    pass1Model: 'gpt-3.5-turbo',
                    pass2Model: 'gpt-4',
                    pass3Model: 'claude-3.5-sonnet'
                }
            };

        } catch (error) {
            throw new Error(`Pipeline failed: ${error.message}`);
        }
    }

    private async callOpenAI(prompt: string, model: string): Promise<string> {
        try {
            const completion = await this.openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: "You are a financial news analysis expert. Always respond with valid JSON only, no additional text or explanation."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1, // Low temperature for consistent structured output
                max_tokens: 2000,
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error("No response from OpenAI");
            }

            return response.trim();
        } catch (error) {
            throw new Error(`OpenAI API call failed: ${error.message}`);
        }
    }

    private async callClaude(prompt: string): Promise<string> {
        try {
            const response = await this.anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 2000,
                temperature: 0.1, // Low temperature for consistent structured output
                system: "You are a financial news analysis expert specializing in investor psychology. Always respond with valid JSON only, no additional text or explanation.",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';
            if (!responseText) {
                throw new Error("No response from Claude");
            }

            return responseText.trim();
        } catch (error) {
            throw new Error(`Claude API call failed: ${error.message}`);
        }
    }
}

export default ArticleProcessingPipeline;
