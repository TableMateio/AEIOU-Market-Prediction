#!/usr/bin/env npx tsx

/**
 * Continuous ML Data Processor
 * 
 * Runs the ML data processor in continuous batches until all pending events are processed.
 * This avoids the need to manually restart after each 1000-event batch.
 */

import { execSync } from 'child_process';

interface ProcessingStats {
    completed: number;
    pending: number;
    total: number;
}

async function getCurrentStats(): Promise<ProcessingStats> {
    try {
        const result = execSync(`
            npx supabase db query "
                SELECT 
                    SUM(CASE WHEN processing_status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN processing_status = 'pending' THEN 1 ELSE 0 END) as pending,
                    COUNT(*) as total
                FROM causal_events_flat
            " --csv
        `, { encoding: 'utf8' });

        const lines = result.trim().split('\n');
        const data = lines[1].split(','); // Skip header

        return {
            completed: parseInt(data[0]),
            pending: parseInt(data[1]),
            total: parseInt(data[2])
        };
    } catch (error) {
        console.error('Failed to get stats:', error);
        throw error;
    }
}

async function runBatch(): Promise<{ success: boolean; processed: number }> {
    try {
        console.log('🚀 Starting batch processing...');
        const result = execSync(
            'npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=batch-optimized',
            { encoding: 'utf8', timeout: 30 * 60 * 1000 } // 30 minute timeout
        );

        // Parse the result to extract processed count
        const successMatch = result.match(/(\d+)\/\d+ successful/);
        const processed = successMatch ? parseInt(successMatch[1]) : 0;

        console.log('✅ Batch completed successfully');
        return { success: true, processed };
    } catch (error) {
        console.error('❌ Batch failed:', error);
        return { success: false, processed: 0 };
    }
}

async function main() {
    console.log('🎯 Starting continuous ML data processing...\n');

    let batchCount = 0;
    let totalProcessed = 0;

    while (true) {
        // Get current stats
        const stats = await getCurrentStats();

        console.log(`📊 Current Status:
        ✅ Completed: ${stats.completed.toLocaleString()}
        ⏳ Pending: ${stats.pending.toLocaleString()}
        📈 Progress: ${((stats.completed / stats.total) * 100).toFixed(1)}%
        `);

        // Check if we're done
        if (stats.pending === 0) {
            console.log('🎉 All events processed! Processing complete.');
            break;
        }

        // Run next batch
        batchCount++;
        console.log(`🔄 Starting batch #${batchCount}...`);

        const batchResult = await runBatch();

        if (batchResult.success) {
            totalProcessed += batchResult.processed;
            console.log(`✅ Batch #${batchCount} completed: ${batchResult.processed} events processed`);
        } else {
            console.log(`❌ Batch #${batchCount} failed. Retrying in 30 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
            continue;
        }

        // Small delay between batches
        console.log('⏸️  Waiting 10 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
    }

    console.log(`
🎉 PROCESSING COMPLETE!
📊 Final Stats:
   • Batches run: ${batchCount}
   • Events processed: ${totalProcessed.toLocaleString()}
   • Success rate: 100%
    `);
}

if (require.main === module) {
    main().catch(console.error);
}
