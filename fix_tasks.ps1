# Fix Scheduled Tasks - Run as Admin!
# Right-click > Run with PowerShell (as Administrator)

Write-Host "Fixing scheduled tasks..." -ForegroundColor Cyan

# 1. Change time to 13:00
schtasks /change /tn "FB Ads Analyzer" /st 13:00
Write-Host "FB Ads Analyzer -> 13:00" -ForegroundColor Green

schtasks /change /tn "Monday-PnL-Daily" /st 13:00
Write-Host "Monday-PnL-Daily -> 13:00" -ForegroundColor Green

# 2. Fix battery & sleep settings
$tasks = @("FB Ads Analyzer", "Monday-PnL-Daily")
foreach ($t in $tasks) {
    $task = Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue
    if ($task) {
        $task.Settings.DisallowStartIfOnBatteries = $false
        $task.Settings.StopIfGoingOnBatteries = $false
        $task.Settings.WakeToRun = $true
        Set-ScheduledTask -InputObject $task
        Write-Host "Fixed battery/wake settings: $t" -ForegroundColor Green
    }
}

# 3. Remove duplicate task
$dup = Get-ScheduledTask -TaskName "OneZoneJersey_PnL_Daily" -ErrorAction SilentlyContinue
if ($dup) {
    Unregister-ScheduledTask -TaskName "OneZoneJersey_PnL_Daily" -Confirm:$false
    Write-Host "Removed duplicate: OneZoneJersey_PnL_Daily" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Done! Both tasks now run at 13:00, even on battery/locked." -ForegroundColor Green
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
