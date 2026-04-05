#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# Linux Cron Setup — runs P&L pipeline daily at 09:00 Asia/Jerusalem
# ──────────────────────────────────────────────────────────────────
#
# OPTION 1: Direct crontab entry (if system TZ = Asia/Jerusalem)
#   Run: crontab -e
#   Add: 0 9 * * * cd /path/to/monday-pnl && /usr/bin/python3 -m src.main >> logs/cron.log 2>&1
#
# OPTION 2: With explicit TZ override (works on any system TZ)
#   Run: crontab -e
#   Add: CRON_TZ=Asia/Jerusalem
#        0 9 * * * cd /path/to/monday-pnl && /usr/bin/python3 -m src.main >> logs/cron.log 2>&1
#
# OPTION 3: Use this script to install the cron job automatically:

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON="${SCRIPT_DIR}/venv/bin/python3"
if [ ! -f "$PYTHON" ]; then
    PYTHON="/usr/bin/python3"
fi

CRON_LINE="CRON_TZ=Asia/Jerusalem
0 9 * * * cd ${SCRIPT_DIR} && ${PYTHON} -m src.main >> ${SCRIPT_DIR}/logs/cron.log 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "monday-pnl"; then
    echo "Cron job already exists. Current crontab:"
    crontab -l | grep "monday-pnl"
    exit 0
fi

# Install
(crontab -l 2>/dev/null; echo ""; echo "# monday-pnl daily P&L sync"; echo "$CRON_LINE") | crontab -
echo "Cron job installed. Verify with: crontab -l"
