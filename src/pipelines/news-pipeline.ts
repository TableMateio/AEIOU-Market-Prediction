#!/usr/bin/env tsx

/**
 * Comprehensive News Pipeline
 * 
 * Usage:
 *   tsx src/pipelines/news-pipeline.ts --mode=collect_new
 *   tsx src/pipelines/news-pipeline.ts --mode=reprocess_all  
 *   tsx src/pipelines/news-pipeline.ts --mode=full_pipeline
 * 
 * Modes:
 * - collect_new: Collect new articles only
 * - reprocess_all: Reanalyze existing articles with updated AI
 * - transform_new: Process only unprocessed AI responses to ML table
 * - transform_all: Process ALL AI responses to ML table (replace existing)
 * - full_pipeline: collect_new → AI analysis → transform_new
 */

import { createLogger } from '../utils/logger';
import { DatabaseFactory } from '../data/storage/databaseFactory';

const logger = createLogger('NewsPipeline');

interface PipelineConfig {
    mode: 'collect_new' | 'reprocess_all' | 'transform_new' | 'transform_all' | 'full_pipeline';
    dryRun?: boolean;
    batchSize?: number;
    overwriteExisting?: boolean;
}

class NewsPipeline {
    constructor(private config: PipelineConfig) { }

    async run(): Promise<void> {
        logger.info(`🚀 Starting News Pipeline in mode: ${this.config.mode}`);

        switch (this.config.mode) {
            case 'collect_new':
                await this.collectNewArticles();
                break;
            case 'reprocess_all':
                await this.reprocessAllArticles();
                break;
            case 'transform_new':
                await this.transformNewResponses();
                break;
            case 'transform_all':
                await this.transformAllResponses();
                break;
            case 'full_pipeline':
                await this.runFullPipeline();
                break;
            default:
                throw new Error(`Unknown mode: ${this.config.mode}`);
        }

        logger.info(`✅ Pipeline completed successfully`);
    }

    private async collectNewArticles(): Promise<void> {
        logger.info('📰 Collecting new articles...');

        // This would typically call the GNews collection script
        // For now, generate instructions
        console.log('\n=== COLLECTION INSTRUCTIONS ===');
        console.log('Run: npx tsx src/scripts/comprehensive-historical-collection.ts');
        console.log('Then manually execute the generated SQL file');
        console.log('================================\n');
    }

    private async reprocessAllArticles(): Promise<void> {
        logger.info('🔄 Reprocessing all articles with updated AI...');

        // Get count of articles to reprocess
        const db = DatabaseFactory.create();
        const articles = await this.getArticleStats();

        logger.info(`📊 Found ${articles.total} articles to reprocess`);
        logger.info(`  - ${articles.withAI} already have AI responses`);
        logger.info(`  - ${articles.withoutAI} need initial AI analysis`);

        console.log('\n=== REPROCESSING INSTRUCTIONS ===');
        console.log('1. User updates OpenAI agent with new instructions');
        console.log('2. Run AI analysis on ALL articles (overwrite existing)');
        console.log('3. Articles with existing AI responses will be replaced');
        console.log('=====================================\n');
    }

    private async transformNewResponses(): Promise<void> {
        logger.info('🔄 Transforming NEW AI responses to ML table...');

        const stats = await this.getTransformationStats();

        logger.info(`📊 Transformation Status:`);
        logger.info(`  - ${stats.totalResponses} total AI responses`);
        logger.info(`  - ${stats.alreadyFlattened} already in business_factors_flat`);
        logger.info(`  - ${stats.needsFlattening} need flattening`);

        if (stats.needsFlattening > 0) {
            console.log('\n=== TRANSFORM NEW INSTRUCTIONS ===');
            console.log(`Run: npx tsx src/scripts/transform-unprocessed-responses.ts`);
            console.log('=====================================\n');
        } else {
            logger.info('✅ All AI responses already flattened');
        }
    }

    private async transformAllResponses(): Promise<void> {
        logger.info('🔄 Transforming ALL AI responses to ML table (REPLACE existing)...');

        const stats = await this.getTransformationStats();

        logger.info(`📊 Will transform ${stats.totalResponses} AI responses`);
        logger.info(`⚠️  This will REPLACE ${stats.alreadyFlattened} existing flattened records`);

        console.log('\n=== TRANSFORM ALL INSTRUCTIONS ===');
        console.log('1. Clear existing business_factors_flat table');
        console.log('2. Transform ALL AI responses to flattened format');
        console.log('3. Run: npx tsx src/scripts/transform-all-responses.ts');
        console.log('====================================\n');
    }

    private async runFullPipeline(): Promise<void> {
        logger.info('🔄 Running FULL pipeline: collect → AI analyze → transform');

        await this.collectNewArticles();

        console.log('\n=== FULL PIPELINE INSTRUCTIONS ===');
        console.log('1. Execute article collection (above)');
        console.log('2. Wait for user to update OpenAI agent');
        console.log('3. Run AI analysis on NEW articles only');
        console.log('4. Transform new AI responses to ML table');
        console.log('===================================\n');
    }

    private async getArticleStats() {
        // Mock implementation - would query database
        return {
            total: 39,
            withAI: 15,
            withoutAI: 24
        };
    }

    private async getTransformationStats() {
        // Mock implementation - would query database
        return {
            totalResponses: 15,
            alreadyFlattened: 4, // From our test
            needsFlattening: 11
        };
    }

    private async cleanupDuplicates(): Promise<void> {
        logger.info('🧹 Cleaning up duplicates...');

        console.log('\n=== DUPLICATE CLEANUP ===');
        console.log('Run: npx tsx src/scripts/cleanup-duplicates.ts');
        console.log('=========================\n');
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const modeArg = args.find(arg => arg.startsWith('--mode='));
    const dryRunArg = args.includes('--dry-run');

    if (!modeArg) {
        console.log(`
Usage: tsx src/pipelines/news-pipeline.ts --mode=<mode> [--dry-run]

Modes:
  collect_new     - Collect new articles via GNews API
  reprocess_all   - Reanalyze ALL existing articles with updated AI  
  transform_new   - Process only unprocessed AI responses to ML table
  transform_all   - Process ALL AI responses to ML table (replace existing)
  full_pipeline   - collect_new → AI analysis → transform_new

Examples:
  tsx src/pipelines/news-pipeline.ts --mode=collect_new
  tsx src/pipelines/news-pipeline.ts --mode=reprocess_all
  tsx src/pipelines/news-pipeline.ts --mode=full_pipeline
        `);
        process.exit(1);
    }

    const mode = modeArg.split('=')[1] as PipelineConfig['mode'];

    const pipeline = new NewsPipeline({
        mode,
        dryRun: dryRunArg,
        overwriteExisting: mode === 'reprocess_all' || mode === 'transform_all'
    });

    await pipeline.run();
}

if (require.main === module) {
    main().catch(console.error);
}
