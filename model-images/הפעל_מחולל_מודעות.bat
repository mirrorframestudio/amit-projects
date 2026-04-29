@echo off
chcp 65001 >nul
echo.
echo  Meta Ads Generator
echo  http://localhost:5050
echo.
start http://localhost:5050
python "%~dp0ads_web.py"
pause
