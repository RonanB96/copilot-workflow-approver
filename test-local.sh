#!/bin/bash

# Quick local test setup
echo "=== GitHub App Local Testing ==="
echo "1. Install ngrok: https://ngrok.com/download"
echo "2. Run: npm start (in one terminal)"
echo "3. Run: ngrok http 3000 (in another terminal)"
echo "4. Copy the ngrok URL to GitHub App webhook settings"
echo "5. Test with a Copilot PR"

# Check if ngrok is available
if command -v ngrok &> /dev/null; then
    echo "✓ ngrok is installed"
    echo "Run: ngrok http 3000"
else
    echo "✗ ngrok not found"
    echo "Install from: https://ngrok.com/download"
fi
