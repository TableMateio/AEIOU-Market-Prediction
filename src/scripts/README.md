# Scripts Organization

## Folder Structure

### `collection/`
Production scripts for collecting Apple articles:
- `smart-collection-entity.ts` - Main collection script with keyword search
- `check-database-state.ts` - Monitor database state and article quality

### `ai-processing/`
OpenAI Batch API processing:
- `generate-batch-jsonl.ts` - Generate JSONL files for batch processing
- `openai-batch-pipeline.ts` - Full batch processing pipeline
- `save-batch-results.ts` - Save batch results to database
- `test-single-batch-request.ts` - Test single requests

### `database/`
Database management:
- `migrate.ts` - Run database migrations
- `force-delete-all-articles.ts` - Emergency database cleanup

### `validation/`
Validation and testing:
- `validate-jsonl.ts` - Validate JSONL file format

## Usage

All scripts should be run from project root:
```bash
npx tsx src/scripts/collection/smart-collection-entity.ts
npx tsx src/scripts/ai-processing/generate-batch-jsonl.ts
```
