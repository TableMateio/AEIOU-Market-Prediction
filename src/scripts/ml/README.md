# ML Data Processor

The ML Data Processor transforms causal events from `causal_events_flat` into ML-ready training data in `ml_training_data` with comprehensive stock price metrics and market analysis.

## Quick Start

```bash
# Process 20 pending records
npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=batch --limit=20

# Process a specific record
npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=single --id=<causal_event_id>

# Test the system
npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=test
```

## Processing Modes

### `--mode=batch`
Processes multiple causal events in batches.

**Options:**
- `--limit=N` - Process up to N records
- `--ticker=SYMBOL` - Override ticker detection (e.g., `--ticker=TSLA`)
- `--start-date=YYYY-MM-DD` - Only process events from this date
- `--end-date=YYYY-MM-DD` - Only process events until this date

**Examples:**
```bash
# Process 50 pending records
npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=batch --limit=50

# Process all Tesla events from 2024
npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=batch --ticker=TSLA --start-date=2024-01-01 --end-date=2024-12-31

# Process all pending events (no limit)
npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=batch
```

### `--mode=single`
Processes a single causal event by ID.

**Required Options:**
- `--id=<causal_event_id>` - The UUID of the causal event

**Examples:**
```bash
npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=single --id=941e0998-c435-483a-95fc-55e315f9d230
```

### `--mode=test`
Runs a quick test by processing 1 record and showing results.

### `--mode=assign-splits`
Assigns train/test splits to existing ML training data.

## Force Flags

### `--force-process`
Process records even if their `processing_status` in `causal_events_flat` is not `'pending'`.

**Use cases:**
- Reprocess records that were marked as `'completed'` or `'skipped'`
- Process all records regardless of status

### `--force-overwrite`
Overwrite existing records in `ml_training_data` even if they already exist.

**Use cases:**
- Update existing ML records with new calculations
- Fix data after script improvements

### `--force` (DEPRECATED)
Legacy flag that combines `--force-process` and `--force-overwrite`. Use the specific flags instead.

## Flag Combinations

| Scenario | Flags | Behavior |
|----------|--------|----------|
| **Normal processing** | `--mode=batch --limit=20` | Process 20 pending records, skip if already in ml_training_data |
| **Reprocess completed** | `--mode=batch --force-process --limit=20` | Process 20 records regardless of status, skip if already in ml_training_data |
| **Update existing data** | `--mode=batch --force-overwrite --limit=20` | Process 20 pending records, overwrite existing ml_training_data |
| **Full reprocess** | `--mode=batch --force-process --force-overwrite --limit=20` | Process 20 records regardless of status, overwrite everything |

## Data Flow

```
causal_events_flat (source) → ML Data Processor → ml_training_data (destination)
```

### Processing Status Tracking

The processor updates `processing_status` in `causal_events_flat`:
- `'pending'` → `'completed'` (successful processing)
- `'pending'` → `'skipped'` (processing failed)

### Data Quality Metrics

Each processed record includes:
- **Data Quality Score**: Percentage of successfully calculated metrics (0-1)
- **Approximation Quality**: Detailed metrics for any approximated data points
- **Missing Data Points**: List of metrics that couldn't be calculated
- **Processing Time**: Time taken to process the record

## Output Metrics

### Price-Based Metrics
- **Absolute Changes**: `abs_change_*_before_pct`, `abs_change_*_after_pct`
- **Alpha Metrics**: `alpha_vs_spy_*`, `alpha_vs_qqq_*` (relative performance)
- **Benchmark Prices**: SPY and QQQ prices at all time windows
- **Confidence Scores**: Data quality for each price point

### Time Windows
- **Short-term**: 1min, 5min, 10min, 30min, 1hour, 4hour
- **Medium-term**: end_of_day, next_day_open, 1day, 1week, 1month
- **Long-term**: 6month, 1year

### Market Context
- **Market Hours**: Whether event occurred during trading hours
- **Market Regime**: Bull/bear/sideways market classification
- **Momentum**: 30-day momentum for SPY and QQQ

### Volume/Volatility Metrics (Placeholder)
Currently set to NULL with TODO comments for future implementation:
- Volume metrics: `volume_*_relative`, `volume_burst_first_hour`
- Volatility metrics: `volatility_*_before`, `volatility_*_after`
- Attention metrics: `attention_half_life_hours`

## Error Handling

### Robust Data Collection
- **Progressive Fallback**: If exact timestamp unavailable, searches up to 5 business days
- **Weekend/Holiday Handling**: Automatically skips to next trading day
- **Tolerance Levels**: Smart tolerance based on time window (5min for short-term, weeks for long-term)

### Approximation Quality Tracking
Records detailed metrics when approximations are used:
```json
{
  "1hour_before": {
    "timeDeviationMinutes": 30,
    "percentageDeviation": 50,
    "fallbackDays": 0,
    "confidence": 0.5
  }
}
```

### Missing Data Handling
- Long-term data (6 months, 1 year) often unavailable for recent events
- Missing data tracked in `missing_data_points` array
- Data quality score reflects completeness

## Performance

### Batch Processing
- Processes in batches of 5 records simultaneously
- 1-second pause between batches to avoid rate limits
- Comprehensive logging for monitoring progress

### Typical Performance
- **Single Record**: ~15-20 seconds (includes 3 tickers: main + SPY + QQQ)
- **Batch of 20**: ~5-7 minutes
- **Data Quality**: Typically 80-85% for recent events

## Troubleshooting

### Common Issues

**"No price data found"**
- Event date outside available stock data range
- Weekend/holiday event with no fallback data
- Check data coverage: `SELECT MIN(timestamp), MAX(timestamp) FROM stock_prices WHERE ticker = 'AAPL'`

**"Processing status constraint violation"**
- Trying to set invalid status in `causal_events_flat`
- Valid statuses: `'pending'`, `'completed'`, `'skipped'`, `'submitted'`

**"Column not found errors"**
- Schema mismatch between script and database
- Run latest migrations or check column names

### Debugging

**Enable verbose logging:**
```bash
DEBUG=* npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=single --id=<id>
```

**Check processing status:**
```sql
SELECT processing_status, COUNT(*) 
FROM causal_events_flat 
GROUP BY processing_status;
```

**Verify data quality:**
```sql
SELECT 
  AVG(data_quality_score) as avg_quality,
  COUNT(*) as total_records,
  COUNT(CASE WHEN data_quality_score > 0.8 THEN 1 END) as high_quality
FROM ml_training_data;
```

## Development

### Adding New Metrics
1. Add column to `ml_training_data` table via migration
2. Add calculation logic in `calculateDerivedMetrics()`
3. Update interface definitions if needed
4. Test with single record first

### Schema Changes
- Use Supabase migrations for database changes
- Update TypeScript interfaces accordingly
- Test with existing data to ensure compatibility

## Examples

### Process Recent Events
```bash
# Process last 30 days of events
npx tsx src/scripts/ml/ml-data-processor-updated.ts \
  --mode=batch \
  --start-date=2024-08-01 \
  --end-date=2024-08-31 \
  --limit=100
```

### Update Existing Data
```bash
# Reprocess and overwrite existing records
npx tsx src/scripts/ml/ml-data-processor-updated.ts \
  --mode=batch \
  --force-process \
  --force-overwrite \
  --limit=50
```

### Process Specific Stock
```bash
# Process Tesla events only
npx tsx src/scripts/ml/ml-data-processor-updated.ts \
  --mode=batch \
  --ticker=TSLA \
  --limit=25
```
