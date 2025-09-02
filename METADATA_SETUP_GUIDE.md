# 🔧 Metadata Setup Guide - Search Tracking Fields

## 📋 Overview

This guide covers the setup and testing of metadata fields for tracking search parameters and debugging collection strategies. These fields provide crucial debugging information for your ML pipeline.

## 🗃️ New Database Fields

The following fields will be added to the `articles` table:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `search_start_date` | DATE | Start date of search period | `2024-08-05` |
| `search_end_date` | DATE | End date of search period | `2024-08-07` |
| `search_name` | VARCHAR(255) | Human-readable search identifier | `"Period-1"` |
| `search_criteria` | JSONB | Search parameters and filters | `{"query": "Apple", "sort": "socialScore"}` |
| `collection_batch` | VARCHAR(255) | Batch identifier for grouping | `"smart-collection-2025-09-02"` |

## 🚀 Setup Steps

### Step 1: Apply Database Schema

**Run this SQL in your Supabase SQL Editor:**

```sql
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS search_start_date DATE,
ADD COLUMN IF NOT EXISTS search_end_date DATE,
ADD COLUMN IF NOT EXISTS search_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS search_criteria JSONB,
ADD COLUMN IF NOT EXISTS collection_batch VARCHAR(255);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_search_name ON articles(search_name);
CREATE INDEX IF NOT EXISTS idx_articles_collection_batch ON articles(collection_batch);
CREATE INDEX IF NOT EXISTS idx_articles_search_dates ON articles(search_start_date, search_end_date);
```

### Step 2: Test Field Setup

```bash
npx tsx src/scripts/test-and-add-metadata-fields.ts
```

This will:
- ✅ Verify all fields exist
- ✅ Test metadata updates
- ✅ Show example data

### Step 3: Test Collection System

```bash
npx tsx src/scripts/test-metadata-collection.ts
```

This will:
- ✅ Create a mock article with metadata
- ✅ Show collection statistics
- ✅ Verify metadata coverage

### Step 4: Test Smart Collection

```bash
npx tsx src/scripts/smart-collection.ts 1 --execute
```

The smart collection system now automatically populates:
- `search_start_date` / `search_end_date`: From period dates
- `search_name`: e.g., "Period-1", "Period-2"
- `search_criteria`: Complete search parameters
- `collection_batch`: Daily batch identifier

## 🔍 Debugging Capabilities

### Query by Collection Batch
```sql
SELECT * FROM articles 
WHERE collection_batch = 'smart-collection-2025-09-02'
ORDER BY search_start_date;
```

### Query by Search Period
```sql
SELECT search_name, COUNT(*) as article_count,
       search_start_date, search_end_date
FROM articles 
WHERE search_start_date IS NOT NULL
GROUP BY search_name, search_start_date, search_end_date
ORDER BY search_start_date;
```

### Analyze Search Criteria
```sql
SELECT search_criteria->>'query' as query,
       search_criteria->>'sort' as sort_order,
       COUNT(*) as articles
FROM articles 
WHERE search_criteria IS NOT NULL
GROUP BY search_criteria->>'query', search_criteria->>'sort';
```

## 📊 Example Metadata

When you collect articles, each will have metadata like:

```json
{
  "search_start_date": "2024-08-05",
  "search_end_date": "2024-08-07", 
  "search_name": "Period-1",
  "search_criteria": {
    "query": "Apple",
    "sort": "socialScore",
    "articles_count": 25,
    "source_threshold": 50,
    "period_type": "3-day",
    "business_days_only": true
  },
  "collection_batch": "smart-collection-2025-09-02"
}
```

## 🛠️ Available Scripts

| Script | Purpose |
|--------|---------|
| `test-and-add-metadata-fields.ts` | Test if fields exist, provide setup SQL |
| `test-metadata-collection.ts` | Test collection with metadata |
| `smart-collection.ts` | Updated to use metadata fields |
| `comprehensive-duplicate-checker.ts` | Includes metadata in health checks |

## 🎯 Benefits

1. **Debugging**: Track which search parameters produced which articles
2. **Reproducibility**: Re-run specific collection periods
3. **Analysis**: Compare effectiveness of different search strategies
4. **Batch Management**: Group and manage collections by date/strategy
5. **Performance**: Indexed fields for fast queries

## 🚨 Important Notes

- All new collections will automatically include metadata
- Existing articles will have NULL values for metadata fields
- The `smart-collection.ts` script prevents duplicates using these fields
- Metadata is essential for ML pipeline debugging and validation

---

**Next Steps:** Once the schema is applied, test the system and then scale your collection! 🚀
