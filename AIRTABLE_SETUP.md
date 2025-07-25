# Airtable Setup Instructions

Since Airtable doesn't allow programmatic table creation via API, you need to manually create the tables and fields in your Airtable base.

## Base ID
Your base ID is: `appELkTs9OjcY6g74`

## Required Tables

### 1. News Events
Create a table named "News Events" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| headline | Single line text | |
| summary | Long text | |
| source | Single line text | |
| sourceCredibility | Number | Precision: 0 |
| publishedAt | Date and time | Format: ISO |
| discoveredAt | Date and time | Format: ISO |
| stockSymbol | Single line text | |
| eventType | Single select | Options: earnings, product_launch, acquisition, regulatory, executive_change, market_news, other |
| sentiment | Single select | Options: positive, negative, neutral |
| sentimentScore | Number | Precision: 2 |
| relevanceScore | Number | Precision: 2 |
| url | URL | |
| content | Long text | |
| tags | Multiple select | (Start empty, will populate as data comes in) |
| rawData | Long text | |

### 2. Stock Data
Create a table named "Stock Data" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| stockSymbol | Single line text | |
| timestamp | Date and time | Format: ISO |
| open | Number | Precision: 4 |
| high | Number | Precision: 4 |
| low | Number | Precision: 4 |
| close | Number | Precision: 4 |
| volume | Number | Precision: 0 |
| priceChange | Number | Precision: 4 |
| priceChangePercent | Number | Precision: 2 |
| volumeChange | Number | Precision: 0 |
| volumeChangePercent | Number | Precision: 2 |
| marketCap | Number | Precision: 0 |
| dataSource | Single select | Options: alpha_vantage, yahoo_finance, other |
| interval | Single select | Options: 1min, 5min, 15min, 30min, 60min, daily |
| rawData | Long text | |

### 3. Causal Chains
Create a table named "Causal Chains" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| newsEventId | Single line text | |
| stockSymbol | Single line text | |
| extractionMethod | Single select | Options: manual, gpt4, rule_based |
| extractedBy | Single line text | |
| businessFactors | Long text | (Will store JSON data) |
| investorBeliefs | Long text | (Will store JSON data) |
| expectedImpacts | Long text | (Will store JSON data) |
| confidence | Number | Precision: 2 |
| validated | Checkbox | |
| validationNotes | Long text | |
| extractedAt | Date and time | Format: ISO |
| validatedAt | Date and time | Format: ISO |

### 4. Validation Results
Create a table named "Validation Results" with these fields:

| Field Name | Type | Options |
|------------|------|---------|
| newsEventId | Single line text | |
| causalChainId | Single line text | |
| stockSymbol | Single line text | |
| validationType | Single select | Options: timestamp_accuracy, news_coverage, correlation_analysis, prediction_accuracy, manual_review |
| testDescription | Long text | |
| testParameters | Long text | (Will store JSON data) |
| passed | Checkbox | |
| score | Number | Precision: 3 |
| actualValue | Number | Precision: 4 |
| expectedValue | Number | Precision: 4 |
| threshold | Number | Precision: 4 |
| testPeriodStart | Date and time | Format: ISO |
| testPeriodEnd | Date and time | Format: ISO |
| marketConditions | Single select | Options: bull, bear, sideways, volatile |
| validatedBy | Single select | Options: automated, manual |
| validatorId | Single line text | |
| notes | Long text | |

## Quick Setup Steps

1. Go to your Airtable base: https://airtable.com/appELkTs9OjcY6g74
2. Create each table using the "Add or import" button
3. For each table, add the fields as specified above
4. Make sure the field types and options match exactly
5. The application will automatically start using these tables once they're created

## Verification

Once you've created the tables, run the application with:
```bash
npm run dev
```

The application will verify the tables exist and log any missing tables or fields.

## Notes

- The Long text fields will store JSON data for complex objects
- Single select options can be expanded later as more data varieties are encountered
- Date fields should use ISO format for consistency
- Number precision settings are important for proper data storage 