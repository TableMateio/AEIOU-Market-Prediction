# Interpretation B Features Summary

Generated: 2025-09-05 16:35:28

## What Changed
- **Before**: 12K individual causal event rows (Interpretation A - Dilution)
- **After**: Daily feature vectors with confidence metrics (Interpretation B - Confidence)

## Feature Structure
- **Trading days**: 5
- **Consolidated factors**: 54
- **Features per factor**: 6 (present, confidence, magnitude, consensus, weighted_mag, evidence)
- **Total features**: 331

## Key Features Per Factor
- `{factor}_present`: Binary flag (0/1)
- `{factor}_confidence`: Number of articles mentioning this factor
- `{factor}_avg_magnitude`: Average effect size
- `{factor}_bullish_consensus`: % of mentions that are positive
- `{factor}_credibility_weighted_magnitude`: Magnitude weighted by source credibility
- `{factor}_evidence_count`: Total causal events supporting this factor

## Why This Matters
**Interpretation A (Wrong)**: 10 articles about iPhone → Each article has 1/10th impact
**Interpretation B (Correct)**: 10 articles about iPhone → iPhone effect is highly confident

More repetition = Higher confidence in the pattern, NOT weaker individual impact.
