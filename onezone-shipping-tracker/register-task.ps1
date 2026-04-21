# Run as Administrator
$action = New-ScheduledTaskAction `
    -Execute 'node' `
    -Argument 'C:\Users\amith\ads-dashboard\onezone-shipping-tracker\run_once.js'

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

$trigger = New-ScheduledTaskTrigger -Daily -At 10:00

Register-ScheduledTask `
    -TaskName 'OneZone - Shipping Updates' `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host "Done! Task registered." -ForegroundColor Green
Write-Host "To run manually: open Task Scheduler -> find 'OneZone - Shipping Updates' -> Run"
