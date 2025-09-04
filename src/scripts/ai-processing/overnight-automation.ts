#!/usr/bin/env npx tsx

/**
 * Overnight Automation Pipeline
 * 
 * Monitors Stage 1 batches, auto-saves results, flattens events,
 * submits Stage 2 causal processing, and monitors completion.
 * 
 * Usage:
 * npx tsx overnight-automation.ts
 */

import 'dotenv/config';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { createLogger } from '../../utils/logger';

const logger = createLogger('OvernightAutomation');

interface BatchStatus {
    id: string;
    status: 'validating' | 'in_progress' | 'finalizing' | 'completed' | 'failed' | 'expired' | 'cancelled';
    saved: boolean;
}

interface AutomationState {
    stage1Batches: BatchStatus[];
    stage1Complete: boolean;
    businessEventsFlattened: boolean;
    stage2Batches: BatchStatus[];
    stage2Complete: boolean;
    causalEventsFlattened: boolean;
    allComplete: boolean;
}

class OvernightAutomation {
    private state: AutomationState;
    private stateFile = 'automation-state.json';
    private pollInterval = 30 * 60 * 1000; // 30 minutes in milliseconds
    private isRunning = false;

    constructor() {
        this.state = {
            stage1Batches: [
                { id: 'batch_68b917720b008190a74fb1a553f6d8c3', status: 'completed', saved: true },
                { id: 'batch_68b9177facb8819091232e0a061bc9e6', status: 'completed', saved: true }
            ],
            stage1Complete: true,
            businessEventsFlattened: true,
            stage2Batches: [
                { id: 'batch_68b91b4eab4481908855bae26f36c1c5', status: 'validating', saved: false },
                { id: 'batch_68b91b5e05088190bf2d055a8ba4ed7a', status: 'validating', saved: false }
            ],
            stage2Complete: false,
            causalEventsFlattened: false,
            allComplete: false
        };
    }

    async start() {
        logger.info('🌙 Starting overnight automation pipeline...');
        logger.info(`📊 Stage 1 Complete, monitoring ${this.state.stage2Batches.length} Stage 2 batches`);
        logger.info(`⏰ Polling every ${this.pollInterval / (60 * 1000)} minutes`);

        // Load existing state if available
        await this.loadState();

        this.isRunning = true;
        await this.runAutomationLoop();
    }

    async stop() {
        logger.info('🛑 Stopping automation...');
        this.isRunning = false;
    }

    private async runAutomationLoop() {
        while (this.isRunning && !this.state.allComplete) {
            try {
                logger.info('🔍 Checking automation status...');

                // Stage 1: Monitor and save business event batches
                if (!this.state.stage1Complete) {
                    await this.processStage1();
                }

                // Flatten business events
                if (this.state.stage1Complete && !this.state.businessEventsFlattened) {
                    await this.flattenBusinessEvents();
                }

                // Stage 2: Submit and monitor causal processing
                if (this.state.businessEventsFlattened && !this.state.stage2Complete) {
                    await this.processStage2();
                }

                // Flatten causal events
                if (this.state.stage2Complete && !this.state.causalEventsFlattened) {
                    await this.flattenCausalEvents();
                    this.state.allComplete = true;
                }

                // Save state
                await this.saveState();

                if (this.state.allComplete) {
                    logger.info('🎉 ALL PROCESSING COMPLETE! Ready for ML training.');
                    break;
                }

                // Wait for next poll
                logger.info(`😴 Sleeping for ${this.pollInterval / (60 * 60 * 1000)} hours...`);
                await this.sleep(this.pollInterval);

            } catch (error) {
                logger.error('❌ Error in automation loop:', error);
                await this.sleep(30 * 60 * 1000); // Wait 30 minutes on error
            }
        }

        if (this.state.allComplete) {
            logger.info('🌅 Good morning! Your data is ready for ML training.');
        }
    }

    private async processStage1() {
        logger.info('📦 Processing Stage 1 batches...');

        // Check status of all Stage 1 batches
        for (const batch of this.state.stage1Batches) {
            if (!batch.saved) {
                const status = await this.checkBatchStatus(batch.id);
                batch.status = status;

                if (status === 'completed') {
                    logger.info(`✅ Batch ${batch.id} completed - saving results...`);
                    await this.saveBatchResults(batch.id, 'business');
                    batch.saved = true;
                } else if (status === 'failed' || status === 'expired') {
                    logger.error(`❌ Batch ${batch.id} ${status}`);
                    batch.saved = true; // Mark as "processed" to avoid infinite retries
                }
            }
        }

        // Check if all Stage 1 batches are complete
        const allSaved = this.state.stage1Batches.every(b => b.saved);
        if (allSaved && !this.state.stage1Complete) {
            logger.info('🎯 All Stage 1 batches complete!');
            this.state.stage1Complete = true;
        }
    }

    private async processStage2() {
        // Submit Stage 2 batches if not started
        if (this.state.stage2Batches.length === 0) {
            logger.info('🚀 Submitting Stage 2 causal processing...');
            await this.submitStage2Batches();
        }

        // Monitor Stage 2 batches
        if (this.state.stage2Batches.length > 0) {
            logger.info('📦 Processing Stage 2 batches...');

            for (const batch of this.state.stage2Batches) {
                if (!batch.saved) {
                    const status = await this.checkBatchStatus(batch.id);
                    batch.status = status;

                    if (status === 'completed') {
                        logger.info(`✅ Stage 2 batch ${batch.id} completed - saving results...`);
                        await this.saveBatchResults(batch.id, 'causal');
                        batch.saved = true;
                    } else if (status === 'failed' || status === 'expired') {
                        logger.error(`❌ Stage 2 batch ${batch.id} ${status}`);
                        batch.saved = true;
                    }
                }
            }

            // Check if all Stage 2 batches are complete
            const allSaved = this.state.stage2Batches.every(b => b.saved);
            if (allSaved && !this.state.stage2Complete) {
                logger.info('🎯 All Stage 2 batches complete!');
                this.state.stage2Complete = true;
            }
        }
    }

    private async flattenBusinessEvents() {
        logger.info('🔄 Flattening business events...');
        try {
            await this.runScript('src/scripts/database/flatten-business-events.ts');
            this.state.businessEventsFlattened = true;
            logger.info('✅ Business events flattened successfully');
        } catch (error) {
            logger.error('❌ Failed to flatten business events:', error);
            throw error;
        }
    }

    private async submitStage2Batches() {
        // Stage 2 batches already submitted manually
        logger.info('✅ Stage 2 batches already submitted, monitoring existing batches');
        return;
    }

    private async flattenCausalEvents() {
        logger.info('🔄 Flattening causal events...');
        try {
            await this.runScript('src/scripts/database/flatten-causal-events.ts');
            this.state.causalEventsFlattened = true;
            logger.info('✅ Causal events flattened successfully');
        } catch (error) {
            logger.error('❌ Failed to flatten causal events:', error);
            throw error;
        }
    }

    private async checkBatchStatus(batchId: string): Promise<string> {
        try {
            const result = await this.runScript(
                'src/scripts/ai-processing/ai-pipeline.ts',
                [`--check-batch=${batchId}`]
            );

            // Extract status from output - more flexible matching
            const statusMatch = result.match(/status['":\s]*([a-z_]+)/i);
            const status = statusMatch ? statusMatch[1] : 'unknown';

            logger.info(`📊 Batch ${batchId}: ${status}`);
            return status;
        } catch (error) {
            logger.error(`❌ Failed to check batch ${batchId}:`, error?.message || error);
            return 'unknown';
        }
    }

    private async saveBatchResults(batchId: string, stage: 'business' | 'causal') {
        try {
            await this.runScript(
                'src/scripts/ai-processing/ai-pipeline.ts',
                [`--save-batch=${batchId}`, `--stage=${stage}`]
            );
            logger.info(`✅ Saved results for batch ${batchId}`);
        } catch (error) {
            logger.error(`❌ Failed to save batch ${batchId}:`, error);
            throw error;
        }
    }

    private async runScript(scriptPath: string, args: string[] = []): Promise<string> {
        return new Promise((resolve, reject) => {
            const process = spawn('npx', ['tsx', scriptPath, ...args], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let output = '';
            let errorOutput = '';

            process.stdout?.on('data', (data) => {
                output += data.toString();
            });

            process.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Script failed with code ${code}: ${errorOutput}`));
                }
            });

            process.on('error', (error) => {
                reject(error);
            });
        });
    }

    private async loadState() {
        try {
            const stateData = await fs.readFile(this.stateFile, 'utf8');
            this.state = JSON.parse(stateData);
            logger.info('📂 Loaded existing automation state');
        } catch (error) {
            logger.info('📝 Starting with fresh automation state');
        }
    }

    private async saveState() {
        try {
            await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
        } catch (error) {
            logger.error('❌ Failed to save state:', error);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('🛑 Received shutdown signal');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('🛑 Received termination signal');
    process.exit(0);
});

// Start automation
const automation = new OvernightAutomation();
automation.start().catch((error) => {
    logger.error('💥 Fatal error in automation:', error);
    process.exit(1);
});
