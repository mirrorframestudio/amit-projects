# Run this script ONCE as Administrator to register the daily report task
# Right-click → "Run with PowerShell as Administrator"

$baseDir = "C:\Users\amith\ads-dashboard\fb-ads-analyzer"

# ── Task 1: Daily at 09:00 ──────────────────────────────────
$action1  = New-ScheduledTaskAction -Execute "$baseDir\run_daily.bat"
$trigger1 = New-ScheduledTaskTrigger -Daily -At "09:00"
$settings1 = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -StartWhenAvailable `
    -WakeToRun $false
Register-ScheduledTask `
    -TaskName "FbAds-DailyReport" `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings1 `
    -RunLevel Highest `
    -Force | Out-Null
Write-Host "OK: FbAds-DailyReport (every day 09:00)" -ForegroundColor Green

# ── Task 2: On logon — catch missed runs ────────────────────
$action2  = New-ScheduledTaskAction -Execute "$baseDir\run_if_missed.bat"
$trigger2 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings2 = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -StartWhenAvailable
Register-ScheduledTask `
    -TaskName "FbAds-RunIfMissed" `
    -Action $action2 `
    -Trigger $trigger2 `
    -Settings $settings2 `
    -RunLevel Highest `
    -Force | Out-Null
Write-Host "OK: FbAds-RunIfMissed (on every login)" -ForegroundColor Green

Write-Host ""
Write-Host "Done! Both tasks are now active." -ForegroundColor Cyan
Write-Host "  - Computer ON at 09:00  → runs automatically"
Write-Host "  - Computer OFF at 09:00 → runs on next login"
pause
