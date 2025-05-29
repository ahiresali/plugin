#!/bin/bash
# Start AutoCut Whisper Service on macOS/Linux

echo "Starting AutoCut Whisper Service..."
echo
echo "This service needs to run while using AutoCut in Premiere Pro"
echo "Press Ctrl+C to stop the service"
echo

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Start the Python service
python3 "$SCRIPT_DIR/python/whisper_service.py" --port 8888 --host localhost --model base