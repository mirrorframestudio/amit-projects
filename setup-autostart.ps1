# Run this script as Administrator to register n8n auto-start on login
$action = New-ScheduledTaskAction `
    -Execute 'powershell.exe' `
    -Argument '-WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\Users\amith\ads-dashboard\start-n8n.ps1"'

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit 0 `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
    -TaskName 'n8n AutoStart' `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Done! n8n will now start automatically when you log in." -ForegroundColor Green
