@echo off
cd /d C:\Users\amith\ads-dashboard\fb-ads-analyzer

:: Check if today's report already exists
set TODAY=%date:~6,4%%date:~3,2%%date:~0,2%
if exist "reports\ads_report_%TODAY%.xlsx" (
    echo Report already exists for today, skipping.
    exit /b 0
)

:: Wait 2 minutes for network to be ready
timeout /t 120 /nobreak >/dev/null

:: Run the pipeline
cd /d C:\Users\amith\ads-dashboard\monday-pnl
C:\Users\amith\AppData\Local\Programs\Python\Python312\python.exe -m src.main

cd /d C:\Users\amith\ads-dashboard\fb-ads-analyzer
C:\Users\amith\AppData\Local\Programs\Python\Python312\python.exe -m src.main >> logs\cron.log 2>&1
