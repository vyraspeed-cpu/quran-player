#!/bin/bash
# ============================================
# Local Test - Run server locally
# ============================================
# Usage: bash local-test.sh
# ============================================

echo "Open: http://localhost:3000"
echo "Press Ctrl+C to stop"

export PORT=3000
export AUDIO_BASE_URL=https://audio.tilawat.org/
node server.js