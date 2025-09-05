#!/bin/bash

echo "🚀 Starting continuous ML data processing..."
echo "This will run batches until all pending events are processed."
echo ""

batch_count=0

while true; do
    # Increment batch counter
    ((batch_count++))
    
    echo "🔄 Starting batch #$batch_count..."
    echo "⏰ $(date)"
    echo ""
    
    # Run the batch processor
    npx tsx src/scripts/ml/ml-data-processor-updated.ts --mode=batch-optimized
    
    # Check the exit status
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Batch #$batch_count completed successfully"
    else
        echo ""
        echo "❌ Batch #$batch_count failed. Retrying in 30 seconds..."
        sleep 30
        continue
    fi
    
    echo ""
    echo "⏸️  Waiting 10 seconds before next batch..."
    echo "   (Press Ctrl+C to stop)"
    sleep 10
    echo ""
    echo "----------------------------------------"
    echo ""
done
