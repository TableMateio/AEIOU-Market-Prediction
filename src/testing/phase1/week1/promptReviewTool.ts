/**
 * Prompt Review Tool - Analyze and Score AI Pipeline Results
 */

import * as dotenv from 'dotenv';
import Airtable from 'airtable';

dotenv.config();

interface ProcessingRecord {
    id: string;
    fields: {
        'Processing ID': string;
        'Events Identified': number;
        'Article Type': string;
        'Overall Tone': string;
        'Market Impact Score': number;
        'Overall Confidence': number;
        'Pass 1 Raw Results (JSON)': string;
        'Pass 2 Raw Results (JSON)': string;
        'Pass 3 Raw Results (JSON)': string;
        'Human Review Status': string;
        'Quality Score (1-10)'?: number;
    };
}

class PromptReviewTool {
    private base: any;

    constructor(airtableKey: string, baseId: string) {
        const airtable = new Airtable({ apiKey: airtableKey });
        this.base = airtable.base(baseId);
    }

    /**
     * Review recent processing results and score them
     */
    async reviewRecentResults(limit: number = 5) {
        console.log("🔍 PROMPT REVIEW TOOL - Recent Results Analysis");
        console.log("=".repeat(60));

        try {
            // Fetch recent processing results
            const records = await this.base('Processing Results').select({
                maxRecords: limit,
                sort: [{ field: 'Processing Date', direction: 'desc' }]
            }).firstPage();

            console.log(`📊 Analyzing ${records.length} recent processing results...\n`);

            for (let i = 0; i < records.length; i++) {
                const record = records[i] as ProcessingRecord;
                console.log(`\n📝 RESULT ${i + 1}: ${record.fields['Processing ID']}`);
                console.log("-".repeat(50));

                await this.analyzeProcessingResult(record);
            }

            console.log("\n🎯 OVERALL ASSESSMENT:");
            console.log("=".repeat(60));
            await this.generateOverallAssessment(records);

        } catch (error) {
            console.error("❌ Error reviewing results:", error.message);
        }
    }

    /**
     * Analyze a single processing result
     */
    private async analyzeProcessingResult(record: ProcessingRecord) {
        const fields = record.fields;

        // Parse JSON results
        let pass1Data, pass2Data, pass3Data;
        try {
            pass1Data = JSON.parse(fields['Pass 1 Raw Results (JSON)'] || '{}');
            pass2Data = JSON.parse(fields['Pass 2 Raw Results (JSON)'] || '{}');
            pass3Data = JSON.parse(fields['Pass 3 Raw Results (JSON)'] || '{}');
        } catch (error) {
            console.log("❌ Failed to parse JSON results");
            return;
        }

        // Display key metrics
        console.log(`📊 Quick Stats:`);
        console.log(`   • Events: ${fields['Events Identified']}`);
        console.log(`   • Article Type: ${fields['Article Type']}`);
        console.log(`   • Tone: ${fields['Overall Tone']}`);
        console.log(`   • Market Impact: ${fields['Market Impact Score']?.toFixed(3)}`);
        console.log(`   • Confidence: ${fields['Overall Confidence']?.toFixed(3)}`);

        // Analyze Pass 1 Quality
        console.log(`\n🎯 Pass 1 Analysis (Event Extraction):`);
        const pass1Score = this.scorePass1(pass1Data);
        console.log(`   Score: ${pass1Score}/10`);

        if (pass1Data.events) {
            pass1Data.events.forEach((event: any, idx: number) => {
                console.log(`   Event ${idx + 1}: "${event.eventTitle}"`);
                console.log(`     Type: ${event.eventType} | Confidence: ${event.confidence?.toFixed(2)} | Relevance: ${event.relevanceToStock?.toFixed(2)}`);
            });
        }

        // Analyze Pass 2 Quality
        console.log(`\n🧠 Pass 2 Analysis (Business Logic):`);
        const pass2Score = this.scorePass2(pass2Data);
        console.log(`   Score: ${pass2Score}/10`);
        console.log(`   Article Steps: ${pass2Data.businessStepsFromArticle?.length || 0}`);
        console.log(`   Our Predictions: ${pass2Data.ourBusinessPredictions?.length || 0}`);
        console.log(`   Risk Factors: ${pass2Data.riskFactors?.length || 0}`);
        console.log(`   Opportunities: ${pass2Data.opportunityFactors?.length || 0}`);

        // Analyze Pass 3 Quality
        console.log(`\n💭 Pass 3 Analysis (Belief Factors):`);
        const pass3Score = this.scorePass3(pass3Data);
        console.log(`   Score: ${pass3Score}/10`);

        if (pass3Data.beliefFactors) {
            const bf = pass3Data.beliefFactors;
            console.log(`   Intensity: ${bf.intensity_belief?.toFixed(2)} | Duration: ${bf.duration_belief?.toFixed(2)}`);
            console.log(`   Hope vs Fear: ${bf.hope_vs_fear?.toFixed(2)} | Clarity: ${bf.clarity_score?.toFixed(2)}`);
            console.log(`   Doubt Factor: ${bf.doubt_factor?.toFixed(2)} | Predictability: ${bf.predictability?.toFixed(2)}`);
        }

        // Overall assessment
        const overallScore = Math.round((pass1Score + pass2Score + pass3Score) / 3);
        console.log(`\n⭐ Overall Quality Score: ${overallScore}/10`);

        // Red flags
        const redFlags = this.identifyRedFlags(pass1Data, pass2Data, pass3Data);
        if (redFlags.length > 0) {
            console.log(`🚨 Red Flags:`);
            redFlags.forEach(flag => console.log(`   • ${flag}`));
        }

        // Update quality score in Airtable if needed
        if (!fields['Quality Score (1-10)']) {
            try {
                await this.base('Processing Results').update(record.id, {
                    'Quality Score (1-10)': overallScore,
                    'Human Review Notes': `Auto-scored: Pass1=${pass1Score}, Pass2=${pass2Score}, Pass3=${pass3Score}. ${redFlags.length > 0 ? 'Red flags detected.' : 'No red flags.'}`
                });
                console.log(`✅ Updated quality score in Airtable`);
            } catch (error) {
                console.log(`⚠️  Failed to update Airtable: ${error.message}`);
            }
        }
    }

    /**
     * Score Pass 1 results (Event Extraction)
     */
    private scorePass1(data: any): number {
        let score = 0;

        // Events identified (0-3 points)
        const eventCount = data.eventsIdentified || 0;
        if (eventCount >= 3) score += 3;
        else if (eventCount >= 2) score += 2;
        else if (eventCount >= 1) score += 1;

        // Event quality (0-3 points)
        if (data.events && data.events.length > 0) {
            const avgConfidence = data.events.reduce((sum: number, e: any) => sum + (e.confidence || 0), 0) / data.events.length;
            const avgRelevance = data.events.reduce((sum: number, e: any) => sum + (e.relevanceToStock || 0), 0) / data.events.length;

            if (avgConfidence > 0.7 && avgRelevance > 0.6) score += 3;
            else if (avgConfidence > 0.5 && avgRelevance > 0.4) score += 2;
            else score += 1;
        }

        // Article classification (0-2 points)
        if (data.articleType && data.overallTone) score += 2;
        else if (data.articleType || data.overallTone) score += 1;

        // Consistency (0-2 points)
        if (data.events && data.events.length > 0) {
            const hasConsistentTypes = data.events.every((e: any) => e.eventType);
            const hasConsistentTemporal = data.events.every((e: any) => e.temporalClassification);

            if (hasConsistentTypes && hasConsistentTemporal) score += 2;
            else if (hasConsistentTypes || hasConsistentTemporal) score += 1;
        }

        return Math.min(score, 10);
    }

    /**
     * Score Pass 2 results (Business Logic)
     */
    private scorePass2(data: any): number {
        let score = 0;

        // Business steps extraction (0-3 points)
        const articleSteps = data.businessStepsFromArticle?.length || 0;
        const ourSteps = data.ourBusinessPredictions?.length || 0;

        if (articleSteps >= 2 && ourSteps >= 2) score += 3;
        else if (articleSteps >= 1 && ourSteps >= 1) score += 2;
        else if (articleSteps >= 1 || ourSteps >= 1) score += 1;

        // Risk/opportunity balance (0-2 points)
        const risks = data.riskFactors?.length || 0;
        const opportunities = data.opportunityFactors?.length || 0;

        if (risks >= 2 && opportunities >= 2) score += 2;
        else if (risks >= 1 && opportunities >= 1) score += 1;

        // Causal sequence quality (0-3 points)
        if (data.causalSequence && data.causalSequence.length > 0) {
            const hasReasonableConfidence = data.causalSequence.every((s: any) => s.confidence >= 0.3 && s.confidence <= 0.9);
            const hasTimeHorizons = data.causalSequence.every((s: any) => s.timeHorizon);

            if (hasReasonableConfidence && hasTimeHorizons) score += 3;
            else if (hasReasonableConfidence || hasTimeHorizons) score += 2;
            else score += 1;
        }

        // Specificity (0-2 points)
        const allSteps = [...(data.businessStepsFromArticle || []), ...(data.ourBusinessPredictions || [])];
        if (allSteps.length > 0) {
            const hasSpecificMechanisms = allSteps.every((s: any) => s.mechanism && s.mechanism.length > 5);
            const hasSpecificOutcomes = allSteps.every((s: any) => s.expectedOutcome && s.expectedOutcome.length > 5);

            if (hasSpecificMechanisms && hasSpecificOutcomes) score += 2;
            else if (hasSpecificMechanisms || hasSpecificOutcomes) score += 1;
        }

        return Math.min(score, 10);
    }

    /**
     * Score Pass 3 results (Belief Factors)
     */
    private scorePass3(data: any): number {
        let score = 0;

        // Belief factors completeness (0-3 points)
        if (data.beliefFactors) {
            const requiredFactors = ['intensity_belief', 'duration_belief', 'certainty_level', 'hope_vs_fear', 'clarity_score'];
            const presentFactors = requiredFactors.filter(f => data.beliefFactors[f] !== undefined);

            if (presentFactors.length === requiredFactors.length) score += 3;
            else if (presentFactors.length >= 4) score += 2;
            else if (presentFactors.length >= 2) score += 1;
        }

        // Realistic ranges (0-3 points)
        if (data.beliefFactors) {
            const factors = Object.values(data.beliefFactors);
            const inReasonableRange = factors.every((f: any) => f >= 0 && f <= 1);
            const notExtremes = factors.every((f: any) => f > 0.1 && f < 0.9); // Avoid overconfidence

            if (inReasonableRange && notExtremes) score += 3;
            else if (inReasonableRange) score += 2;
            else score += 1;
        }

        // Internal consistency (0-2 points)
        if (data.beliefFactors) {
            const bf = data.beliefFactors;
            // High clarity should correlate with low doubt
            const clarityDoubtConsistent = !bf.clarity_score || !bf.doubt_factor ||
                (bf.clarity_score + bf.doubt_factor < 1.5);

            // High certainty should correlate with high predictability
            const certaintyPredictabilityConsistent = !bf.certainty_level || !bf.predictability ||
                Math.abs(bf.certainty_level - bf.predictability) < 0.4;

            if (clarityDoubtConsistent && certaintyPredictabilityConsistent) score += 2;
            else if (clarityDoubtConsistent || certaintyPredictabilityConsistent) score += 1;
        }

        // Confidence matrix quality (0-2 points)
        if (data.confidenceMatrix && data.confidenceMatrix.overall) {
            const overall = data.confidenceMatrix.overall;
            if (overall >= 0.4 && overall <= 0.85) score += 2; // Reasonable confidence
            else if (overall >= 0.2 && overall <= 0.95) score += 1;
        }

        return Math.min(score, 10);
    }

    /**
     * Identify red flags in the analysis
     */
    private identifyRedFlags(pass1Data: any, pass2Data: any, pass3Data: any): string[] {
        const flags: string[] = [];

        // Pass 1 red flags
        if (pass1Data.eventsIdentified === 0) {
            flags.push("No events identified");
        }

        if (pass1Data.events?.some((e: any) => e.confidence > 0.95)) {
            flags.push("Overconfident event predictions (>95%)");
        }

        // Pass 2 red flags
        if (!pass2Data.businessStepsFromArticle?.length && !pass2Data.ourBusinessPredictions?.length) {
            flags.push("No business logic extracted");
        }

        if (pass2Data.businessStepsFromArticle?.some((s: any) => !s.mechanism || s.mechanism.length < 5)) {
            flags.push("Vague business mechanisms");
        }

        // Pass 3 red flags
        if (pass3Data.beliefFactors) {
            const bf = pass3Data.beliefFactors;

            if (Object.values(bf).some((v: any) => v === 0 || v === 1)) {
                flags.push("Extreme belief factor values (0 or 1)");
            }

            if (bf.intensity_belief > 0.9 && bf.certainty_level > 0.9) {
                flags.push("Unrealistically high intensity + certainty");
            }

            if (bf.clarity_score > 0.8 && bf.doubt_factor > 0.8) {
                flags.push("Contradictory clarity vs doubt scores");
            }
        }

        if (pass3Data.confidenceMatrix?.overall > 0.9) {
            flags.push("Overconfident overall assessment");
        }

        return flags;
    }

    /**
     * Generate overall assessment across all results
     */
    private async generateOverallAssessment(records: ProcessingRecord[]) {
        const scores = records.map(r => r.fields['Quality Score (1-10)'] || 0);
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

        const highQuality = scores.filter(s => s >= 7).length;
        const mediumQuality = scores.filter(s => s >= 4 && s < 7).length;
        const lowQuality = scores.filter(s => s < 4).length;

        console.log(`📊 Quality Distribution:`);
        console.log(`   • High Quality (7-10): ${highQuality}/${records.length}`);
        console.log(`   • Medium Quality (4-6): ${mediumQuality}/${records.length}`);
        console.log(`   • Low Quality (1-3): ${lowQuality}/${records.length}`);
        console.log(`   • Average Score: ${avgScore.toFixed(1)}/10`);

        console.log(`\n💡 Recommendations:`);
        if (avgScore < 5) {
            console.log(`   • System quality below acceptable threshold`);
            console.log(`   • Review and revise prompts`);
            console.log(`   • Consider using higher-quality models`);
        } else if (avgScore < 7) {
            console.log(`   • System quality is acceptable but has room for improvement`);
            console.log(`   • Focus on prompt refinement for specific passes`);
        } else {
            console.log(`   • System quality is good`);
            console.log(`   • Monitor for consistency and edge cases`);
        }

        if (lowQuality > records.length * 0.3) {
            console.log(`   • High rate of low-quality results - immediate attention needed`);
        }
    }

    /**
     * Show the actual prompts being used
     */
    displayCurrentPrompts() {
        console.log("📋 CURRENT AI PROMPTS");
        console.log("=".repeat(60));
        console.log("📁 Full prompts available in: docs/ai-prompts/prompt-library.md");
        console.log("");
        console.log("🎯 Pass 1 (GPT-3.5-turbo): Event Extraction");
        console.log("   • Focus: Identify and classify news events");
        console.log("   • Output: JSON with events, types, confidence, relevance");
        console.log("   • Cost: ~$0.002 per article");
        console.log("");
        console.log("🧠 Pass 2 (GPT-4): Business Logic Analysis");
        console.log("   • Focus: Extract business reasoning and causal chains");
        console.log("   • Output: Business steps from article + our predictions");
        console.log("   • Cost: ~$0.030 per article");
        console.log("");
        console.log("💭 Pass 3 (Claude): Belief Factor Synthesis");
        console.log("   • Focus: Quantify investor psychology dimensions");
        console.log("   • Output: 10 atomic belief factors + confidence matrix");
        console.log("   • Cost: ~$0.015 per article");
        console.log("");
        console.log("📖 To see full prompts: cat docs/ai-prompts/prompt-library.md");
    }
}

async function runPromptReview() {
    console.log("🔍 PROMPT REVIEW & QUALITY ANALYSIS TOOL");
    console.log("=".repeat(70));

    if (!process.env.AIRTABLE_API_KEY) {
        throw new Error("Missing AIRTABLE_API_KEY environment variable");
    }

    const reviewTool = new PromptReviewTool(
        process.env.AIRTABLE_API_KEY,
        'appELkTs9OjcY6g74'
    );

    // Show current prompts
    reviewTool.displayCurrentPrompts();

    // Review recent results
    await reviewTool.reviewRecentResults(10);
}

runPromptReview().catch(console.error);
