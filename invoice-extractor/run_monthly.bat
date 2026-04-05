@echo off
cd /d "C:\Users\amith\ads-dashboard\invoice-extractor"
set AUTO_LAST_MONTH=1
py -3.12 main.py >> run_log.txt 2>&1
