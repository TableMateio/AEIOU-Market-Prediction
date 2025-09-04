#!/bin/bash

# Overnight AI Processing Automation
# Runs in background and logs to file

echo "🌙 Starting overnight automation pipeline..."
echo "📁 Logs will be written to: automation.log"
echo "🛑 To stop: kill \$(pgrep -f overnight-automation)"

# Run in background with logging
nohup npx tsx src/scripts/ai-processing/overnight-automation.ts > automation.log 2>&1 &

# Get the process ID
PID=$!
echo "🚀 Automation started with PID: $PID"
echo "📊 Monitor progress: tail -f automation.log"
echo "🔍 Check status: ps aux | grep $PID"

# Save PID for easy killing later
echo $PID > automation.pid
echo "💾 PID saved to automation.pid"

echo ""
echo "🌅 Sleep well! Your data will be processed overnight."
echo "📱 Check automation.log in the morning for results."
