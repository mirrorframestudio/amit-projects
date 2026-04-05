@echo off
REM Monthly P&L Report — runs on 1st of each month
REM Generates last month's report and emails to mymeluvo@gmail.com

cd /d "%~dp0"
python -m src.run_weekly_pnl --last-month --email mymeluvo@gmail.com
