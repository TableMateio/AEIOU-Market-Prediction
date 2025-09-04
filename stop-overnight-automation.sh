#!/bin/bash

# Stop Overnight Automation

echo "🛑 Stopping overnight automation..."

if [ -f automation.pid ]; then
    PID=$(cat automation.pid)
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "✅ Stopped automation process (PID: $PID)"
        rm automation.pid
    else
        echo "⚠️ Process $PID not running"
        rm automation.pid
    fi
else
    echo "🔍 Looking for running automation processes..."
    pkill -f overnight-automation
    echo "✅ Killed any running automation processes"
fi

echo "📊 Final status check:"
tail -n 10 automation.log 2>/dev/null || echo "No log file found"
