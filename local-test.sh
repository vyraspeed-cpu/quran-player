#!/bin/bash
# ============================================
# Local Test - Run vps-deploy locally
# ============================================
# Usage: bash local-test.sh
# ============================================

cd "$(dirname "$0")/vps-deploy"

echo "Open: http://localhost:3000"
echo "Press Ctrl+C to stop"

PORT=3000 AUDIO_BASE_URL=https://audio.tilawat.org/ node server.js
