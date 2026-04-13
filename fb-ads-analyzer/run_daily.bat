@echo off

:: Step 1: Update P&L data (fresh Monday.com orders)
cd /d C:\Users\amith\ads-dashboard\monday-pnl
C:\Users\amith\AppData\Local\Programs\Python\Python312\python.exe -m src.main --no-upload >> logs\pnl.log 2>&1

:: Step 2: Run ads analyzer + send WhatsApp (reads fresh P&L data)
cd /d C:\Users\amith\ads-dashboard\fb-ads-analyzer
C:\Users\amith\AppData\Local\Programs\Python\Python312\python.exe -m src.main >> logs\cron.log 2>&1
