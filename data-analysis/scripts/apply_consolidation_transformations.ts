#!/usr/bin/env bun

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Load mapping files
const factorMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../mappings/factor_names_mapping_complete.json'), 'utf8'));
const eventMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../mappings/event_types_mapping_complete.json'), 'utf8'));
const tagMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../mappings/event_tags_mapping_complete.json'), 'utf8'));

// Create reverse mappings for efficient lookup
const factorLookup: Record<string, { consolidated: string, category: string }> = {};
const eventLookup: Record<string, { consolidated: string, category: string }> = {};
const tagLookup: Record<string, { consolidated: string, category: string }> = {};

// Build factor lookup
Object.entries(factorMapping).forEach(([consolidated, data]: [string, any]) => {
    data.original_terms.forEach((term: string) => {
        factorLookup[term] = { consolidated, category: data.category };
    });
});

// Build event lookup
Object.entries(eventMapping).forEach(([consolidated, data]: [string, any]) => {
    data.original_terms.forEach((term: string) => {
        eventLookup[term] = { consolidated, category: data.category };
    });
});

// Build tag lookup
Object.entries(tagMapping).forEach(([consolidated, data]: [string, any]) => {
    data.original_terms.forEach((term: string) => {
        tagLookup[term] = { consolidated, category: data.category };
    });
});

interface MLTrainingRecord {
    id: string;
    factor_name: string;
    factor_category: string;
    event_type: string;
    event_tags: string[];
    consolidated_factor_name?: string;
    consolidated_event_type?: string;
    event_category?: string;
    consolidated_event_tags?: string[];
    event_tag_category?: string;
}

async function processRecords() {
    console.log('🚀 Starting consolidation transformation process...');

    let processedCount = 0;
    let updatedCount = 0;
    const batchSize = 100;
    let offset = 0;

    while (true) {
        console.log(`📊 Processing batch starting at offset ${offset}...`);

        // Fetch batch of records
        const { data: records, error } = await supabase
            .from('ml_training_data')
            .select('id, factor_name, factor_category, event_type, event_tags')
            .range(offset, offset + batchSize - 1)
            .order('id');

        if (error) {
            console.error('❌ Error fetching records:', error);
            return;
        }

        if (!records || records.length === 0) {
            console.log('✅ No more records to process');
            break;
        }

        // Process each record
        const updates = records.map((record: MLTrainingRecord) => {
            const update: any = { id: record.id };
            let hasChanges = false;

            // Transform factor_name
            if (record.factor_name && factorLookup[record.factor_name]) {
                const factorInfo = factorLookup[record.factor_name];
                update.consolidated_factor_name = factorInfo.consolidated;
                update.factor_category = factorInfo.category; // Update existing field
                hasChanges = true;
            }

            // Transform event_type
            if (record.event_type && eventLookup[record.event_type]) {
                const eventInfo = eventLookup[record.event_type];
                update.consolidated_event_type = eventInfo.consolidated;
                update.event_category = eventInfo.category;
                hasChanges = true;
            }

            // Transform event_tags
            if (record.event_tags && Array.isArray(record.event_tags)) {
                const consolidatedTags: string[] = [];
                const tagCategories: string[] = [];

                record.event_tags.forEach(tag => {
                    if (tagLookup[tag]) {
                        const tagInfo = tagLookup[tag];
                        if (!consolidatedTags.includes(tagInfo.consolidated)) {
                            consolidatedTags.push(tagInfo.consolidated);
                        }
                        if (!tagCategories.includes(tagInfo.category)) {
                            tagCategories.push(tagInfo.category);
                        }
                    }
                });

                if (consolidatedTags.length > 0) {
                    update.consolidated_event_tags = consolidatedTags;
                    update.event_tag_category = tagCategories.join(', '); // Join multiple categories
                    hasChanges = true;
                }
            }

            return hasChanges ? update : null;
        }).filter(Boolean);

        // Apply updates in batch
        if (updates.length > 0) {
            console.log(`🔄 Updating ${updates.length} records...`);

            for (const update of updates) {
                const { error: updateError } = await supabase
                    .from('ml_training_data')
                    .update(update)
                    .eq('id', update.id);

                if (updateError) {
                    console.error('❌ Error updating record:', update.id, updateError);
                } else {
                    updatedCount++;
                }
            }
        }

        processedCount += records.length;
        console.log(`✅ Processed ${processedCount} records, updated ${updatedCount} so far`);

        offset += batchSize;

        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n🎉 Transformation complete!`);
    console.log(`📊 Total records processed: ${processedCount}`);
    console.log(`🔄 Total records updated: ${updatedCount}`);

    // Print some statistics
    await printStatistics();
}

async function printStatistics() {
    console.log('\n📈 Transformation Statistics:');

    // Factor consolidation stats
    const { data: factorStats } = await supabase
        .from('ml_training_data')
        .select('consolidated_factor_name')
        .not('consolidated_factor_name', 'is', null);

    if (factorStats) {
        const uniqueFactors = [...new Set(factorStats.map(r => r.consolidated_factor_name))];
        console.log(`🔍 Consolidated ${factorStats.length} factor names into ${uniqueFactors.length} unique factors`);
    }

    // Event consolidation stats
    const { data: eventStats } = await supabase
        .from('ml_training_data')
        .select('consolidated_event_type')
        .not('consolidated_event_type', 'is', null);

    if (eventStats) {
        const uniqueEvents = [...new Set(eventStats.map(r => r.consolidated_event_type))];
        console.log(`📅 Consolidated ${eventStats.length} event types into ${uniqueEvents.length} unique events`);
    }

    // Tag consolidation stats
    const { data: tagStats } = await supabase
        .from('ml_training_data')
        .select('consolidated_event_tags')
        .not('consolidated_event_tags', 'is', null);

    if (tagStats) {
        const allTags = tagStats.flatMap(r => r.consolidated_event_tags || []);
        const uniqueTags = [...new Set(allTags)];
        console.log(`🏷️  Consolidated event tags into ${uniqueTags.length} unique tags across ${tagStats.length} records`);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏹️  Process interrupted by user');
    process.exit(0);
});

// Run the transformation
if (require.main === module) {
    processRecords().catch(console.error);
}

export { processRecords };
