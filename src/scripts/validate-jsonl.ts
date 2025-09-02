#!/usr/bin/env npx tsx

/**
 * Validate JSONL File Format
 * 
 * Comprehensive validation of JSONL files for OpenAI Batch API:
 * - JSON parsing validation
 * - Required field validation  
 * - Schema structure validation
 * - Token estimation
 * - OpenAI Batch API compliance
 */

import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('JSONLValidator');

interface ValidationResult {
    isValid: boolean;
    totalLines: number;
    validLines: number;
    errors: Array<{
        line: number;
        error: string;
        content?: string;
    }>;
    warnings: Array<{
        line: number;
        warning: string;
    }>;
    summary: {
        estimatedTokens: number;
        averageTokensPerLine: number;
        maxTokensPerLine: number;
        minTokensPerLine: number;
        hasSystemMessages: boolean;
        hasSchema: boolean;
        uniqueCustomIds: number;
    };
}

class JSONLValidator {

    async validateFile(filePath: string): Promise<ValidationResult> {
        logger.info(`🔍 Validating JSONL file: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        const result: ValidationResult = {
            isValid: true,
            totalLines: lines.length,
            validLines: 0,
            errors: [],
            warnings: [],
            summary: {
                estimatedTokens: 0,
                averageTokensPerLine: 0,
                maxTokensPerLine: 0,
                minTokensPerLine: Infinity,
                hasSystemMessages: false,
                hasSchema: false,
                uniqueCustomIds: 0
            }
        };

        const customIds = new Set<string>();
        const tokenCounts: number[] = [];

        for (let i = 0; i < lines.length; i++) {
            const lineNumber = i + 1;
            const line = lines[i];

            try {
                // Parse JSON
                const jsonLine = JSON.parse(line);

                // Validate structure
                const lineValidation = this.validateJSONLLine(jsonLine, lineNumber);

                if (lineValidation.isValid) {
                    result.validLines++;

                    // Track custom IDs
                    if (jsonLine.custom_id) {
                        customIds.add(jsonLine.custom_id);
                    }

                    // Estimate tokens
                    const lineTokens = Math.ceil(line.length / 4);
                    tokenCounts.push(lineTokens);
                    result.summary.estimatedTokens += lineTokens;

                    if (lineTokens > result.summary.maxTokensPerLine) {
                        result.summary.maxTokensPerLine = lineTokens;
                    }
                    if (lineTokens < result.summary.minTokensPerLine) {
                        result.summary.minTokensPerLine = lineTokens;
                    }

                    // Check for system messages and schema
                    if (jsonLine.body?.messages?.some((m: any) => m.role === 'system')) {
                        result.summary.hasSystemMessages = true;
                    }
                    if (jsonLine.body?.response_format?.json_schema) {
                        result.summary.hasSchema = true;
                    }

                } else {
                    result.errors.push(...lineValidation.errors);
                    result.warnings.push(...lineValidation.warnings);
                }

            } catch (error: any) {
                result.errors.push({
                    line: lineNumber,
                    error: `JSON parsing error: ${error.message}`,
                    content: line.substring(0, 100) + '...'
                });
            }
        }

        // Calculate summary stats
        result.summary.uniqueCustomIds = customIds.size;
        result.summary.averageTokensPerLine = tokenCounts.length > 0
            ? Math.round(tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length)
            : 0;

        if (result.summary.minTokensPerLine === Infinity) {
            result.summary.minTokensPerLine = 0;
        }

        // Overall validation
        result.isValid = result.errors.length === 0 && result.validLines === result.totalLines;

        // Additional warnings
        if (customIds.size !== result.totalLines) {
            result.warnings.push({
                line: 0,
                warning: `Duplicate custom_ids detected. Expected ${result.totalLines}, got ${customIds.size} unique`
            });
        }

        if (result.summary.estimatedTokens > 2000000) { // 2M tokens
            result.warnings.push({
                line: 0,
                warning: `Large batch detected: ${result.summary.estimatedTokens.toLocaleString()} tokens. Consider splitting.`
            });
        }

        return result;
    }

    private validateJSONLLine(jsonLine: any, lineNumber: number): {
        isValid: boolean;
        errors: Array<{ line: number; error: string }>;
        warnings: Array<{ line: number; warning: string }>;
    } {
        const errors: Array<{ line: number; error: string }> = [];
        const warnings: Array<{ line: number; warning: string }> = [];

        // Required fields for OpenAI Batch API
        if (!jsonLine.custom_id) {
            errors.push({ line: lineNumber, error: 'Missing required field: custom_id' });
        }
        if (jsonLine.method !== 'POST') {
            errors.push({ line: lineNumber, error: 'method must be "POST"' });
        }
        if (jsonLine.url !== '/v1/chat/completions') {
            errors.push({ line: lineNumber, error: 'url must be "/v1/chat/completions"' });
        }
        if (!jsonLine.body) {
            errors.push({ line: lineNumber, error: 'Missing required field: body' });
            return { isValid: false, errors, warnings };
        }

        // Validate body structure
        const body = jsonLine.body;
        if (!body.model) {
            errors.push({ line: lineNumber, error: 'Missing required field: body.model' });
        }
        if (!body.messages || !Array.isArray(body.messages)) {
            errors.push({ line: lineNumber, error: 'Missing or invalid field: body.messages (must be array)' });
        }

        // Validate messages
        if (body.messages) {
            if (body.messages.length < 1) {
                errors.push({ line: lineNumber, error: 'body.messages must contain at least one message' });
            }

            let hasSystemMessage = false;
            let hasUserMessage = false;

            body.messages.forEach((message: any, msgIndex: number) => {
                if (!message.role) {
                    errors.push({ line: lineNumber, error: `Message ${msgIndex}: missing role` });
                }
                if (!message.content) {
                    errors.push({ line: lineNumber, error: `Message ${msgIndex}: missing content` });
                }

                if (message.role === 'system') hasSystemMessage = true;
                if (message.role === 'user') hasUserMessage = true;
            });

            if (!hasSystemMessage) {
                warnings.push({ line: lineNumber, warning: 'No system message found - consider adding instructions' });
            }
            if (!hasUserMessage) {
                warnings.push({ line: lineNumber, warning: 'No user message found' });
            }
        }

        // Validate response format for structured output
        if (body.response_format) {
            if (body.response_format.type !== 'json_schema') {
                warnings.push({ line: lineNumber, warning: 'response_format.type should be "json_schema" for structured output' });
            }
            if (!body.response_format.json_schema) {
                warnings.push({ line: lineNumber, warning: 'Missing json_schema in response_format' });
            } else {
                const schema = body.response_format.json_schema;
                if (!schema.strict) {
                    warnings.push({ line: lineNumber, warning: 'json_schema.strict should be true for reliable structured output' });
                }
                if (!schema.schema) {
                    errors.push({ line: lineNumber, error: 'Missing schema definition in json_schema' });
                }
            }
        }

        // Check token limits (rough estimate)
        const estimatedTokens = Math.ceil(JSON.stringify(jsonLine).length / 4);
        if (estimatedTokens > 120000) {
            warnings.push({ line: lineNumber, warning: `Line may exceed token limit: ~${estimatedTokens} tokens` });
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    printValidationReport(result: ValidationResult) {
        console.log('\n📋 JSONL VALIDATION REPORT');
        console.log('='.repeat(50));

        // Overall status
        if (result.isValid) {
            console.log('✅ VALIDATION PASSED');
        } else {
            console.log('❌ VALIDATION FAILED');
        }

        console.log(`\n📊 SUMMARY:`);
        console.log(`   📄 Total lines: ${result.totalLines}`);
        console.log(`   ✅ Valid lines: ${result.validLines}`);
        console.log(`   ❌ Invalid lines: ${result.totalLines - result.validLines}`);
        console.log(`   ⚠️  Warnings: ${result.warnings.length}`);
        console.log(`   🆔 Unique custom IDs: ${result.summary.uniqueCustomIds}`);

        console.log(`\n🪙 TOKEN ANALYSIS:`);
        console.log(`   📈 Total estimated tokens: ${result.summary.estimatedTokens.toLocaleString()}`);
        console.log(`   📊 Average tokens per line: ${result.summary.averageTokensPerLine.toLocaleString()}`);
        console.log(`   📈 Max tokens per line: ${result.summary.maxTokensPerLine.toLocaleString()}`);
        console.log(`   📉 Min tokens per line: ${result.summary.minTokensPerLine.toLocaleString()}`);

        console.log(`\n🔧 STRUCTURE ANALYSIS:`);
        console.log(`   📝 Has system messages: ${result.summary.hasSystemMessages ? '✅' : '❌'}`);
        console.log(`   📋 Has JSON schema: ${result.summary.hasSchema ? '✅' : '❌'}`);

        // Errors
        if (result.errors.length > 0) {
            console.log(`\n❌ ERRORS (${result.errors.length}):`);
            result.errors.forEach(error => {
                console.log(`   Line ${error.line}: ${error.error}`);
                if (error.content) {
                    console.log(`      Content: ${error.content}`);
                }
            });
        }

        // Warnings
        if (result.warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS (${result.warnings.length}):`);
            result.warnings.forEach(warning => {
                if (warning.line === 0) {
                    console.log(`   General: ${warning.warning}`);
                } else {
                    console.log(`   Line ${warning.line}: ${warning.warning}`);
                }
            });
        }

        // Recommendations
        console.log(`\n💡 RECOMMENDATIONS:`);
        if (result.isValid) {
            console.log('   🎉 File is ready for OpenAI Batch API!');
            console.log(`   💰 Estimated cost: ~$${(result.summary.estimatedTokens * 0.00001).toFixed(2)} (batch pricing)`);
        } else {
            console.log('   🔧 Fix errors before submitting to OpenAI Batch API');
        }

        if (result.warnings.length > 0) {
            console.log('   ⚠️  Review warnings to optimize batch performance');
        }
    }
}

// CLI interface
async function main() {
    try {
        const args = process.argv.slice(2);
        const filePath = args[0] || 'sample_batch.jsonl';

        if (!filePath) {
            console.log('Usage: npx tsx validate-jsonl.ts <file.jsonl>');
            console.log('Example: npx tsx validate-jsonl.ts sample_batch.jsonl');
            process.exit(1);
        }

        const validator = new JSONLValidator();
        const result = await validator.validateFile(filePath);
        validator.printValidationReport(result);

        // Exit with error code if validation failed
        process.exit(result.isValid ? 0 : 1);

    } catch (error: any) {
        logger.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}
