#!/usr/bin/env bash
# Run the P&L pipeline once.
# Usage: ./run.sh
set -euo pipefail
cd "$(dirname "$0")"
python -m src.main
