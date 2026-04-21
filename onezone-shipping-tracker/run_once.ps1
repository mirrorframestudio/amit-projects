# OneZone HFD Polling - Manual Run Script
# Runs workflow logic directly, tracks state in sent_state.json
# Usage: .\run_once.ps1 -Limit 10     (test: first 10 orders)
#        .\run_once.ps1               (full run: all orders)

param([int]$Limit = 0)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

$STATE_FILE = "$PSScriptRoot\sent_state.json"
$MONDAY_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU1OTAyMjM2MiwiYWFpIjoxMSwidWlkIjo2Mzc3NjA5NywiaWFkIjoiMjAyNS0wOS0wN1QxNTowMToxNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MjQ1MzIyMjcsInJnbiI6ImV1YzEifQ.d86GOnxc-RhtZND7Q7LIoIg3ShFUW0xImLCVjRlzXHQ'
$JONI_URL = 'https://joni-e746b-default-rtdb.europe-west1.firebasedatabase.app//joni/send.json'

# --- Load state ---
$state = @{}
if (Test-Path $STATE_FILE) {
    $state = Get-Content $STATE_FILE -Raw -Encoding UTF8 | ConvertFrom-Json -AsHashtable
}

function Save-State {
    $state | ConvertTo-Json -Depth 5 | Out-File $STATE_FILE -Encoding UTF8
}

# --- Time check: 09:00-20:00 Israel time (UTC+3) ---
$israelHour = ([datetime]::UtcNow.Hour + 3) % 24
if ($israelHour -lt 9 -or $israelHour -ge 20) {
    Write-Host "[SKIP] Outside hours (Israel time: $israelHour:00). Allowed: 09:00-20:00." -ForegroundColor Yellow
    exit
}

# --- Fetch Monday orders (2 pages) ---
Write-Host "`n[1/4] Fetching Monday.com orders..." -ForegroundColor Cyan

function Get-MondayPage($cursor) {
    $cursorPart = if ($cursor) { ", cursor: `"$cursor`"" } else { "" }
    $query = "{ boards(ids: [2131896795]) { items_page(limit: 500$cursorPart) { cursor items { id name column_values { id text } } } } }"
    $body = @{ query = $query } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri 'https://api.monday.com/v2' -Method POST -Headers @{
        Authorization = $MONDAY_TOKEN; 'Content-Type' = 'application/json'; 'API-Version' = '2023-10'
    } -Body $body
    return $resp.data.boards[0].items_page
}

$page1 = Get-MondayPage $null
$allItems = $page1.items
if ($page1.cursor) {
    $page2 = Get-MondayPage $page1.cursor
    $allItems += $page2.items
}
Write-Host "   Total items fetched: $($allItems.Count)"

# --- Parse and filter ---
$now = [datetime]::UtcNow
$cutoff30 = $now.AddDays(-30)
$cutoff24 = $now.AddHours(-24)

$orders = @()
foreach ($item in $allItems) {
    $cols = @{}
    foreach ($c in $item.column_values) { $cols[$c.id] = if ($c.text) { $c.text.Trim() } else { '' } }

    $dateStr = $cols['date__1']
    if (-not $dateStr) { continue }

    # Parse date
    $d = $null
    if ($dateStr -match '^\d{4}-\d{2}-\d{2}$') { $d = [datetime]::Parse($dateStr) }
    elseif ($dateStr -match '^\d{2}/\d{2}/\d{2,4}$') {
        $parts = $dateStr -split '/'
        $y = if ($parts[2].Length -eq 2) { "20$($parts[2])" } else { $parts[2] }
        $d = [datetime]::Parse("$y-$($parts[1])-$($parts[0])")
    }
    if (-not $d -or $d -lt $cutoff30 -or $d -gt $cutoff24) { continue }

    $tracking = (if ($cols['text__1']) { $cols['text__1'] } else { '' }) -replace '\s', ''
    if (-not $tracking) { continue }
    $phone = (if ($cols['phone__1']) { $cols['phone__1'] } else { '' }) -replace '[^0-9]', ''
    if ($phone.Length -lt 9) { continue }
    if ($item.name -match 'TEST') { continue }

    $orders += [PSCustomObject]@{ name = $item.name; tracking = $tracking; phone = $phone }
    if ($Limit -gt 0 -and $orders.Count -ge $Limit) { break }
}

Write-Host "   Orders in last 30 days (excl. 24h): $($orders.Count)" -ForegroundColor Green
if ($Limit -gt 0) { Write-Host "   [TEST MODE] Limited to first $Limit orders" -ForegroundColor Yellow }

# --- Stage messages ---
$stageMessages = @{
    '10'    = @{ h = "בדרכה לארץ! ✈️";           d = "זמני האספקה הם 7-21 ימי עסקים מרגע קבלת מספר המעקב, אנו נעדכן אותכם כאן בכל שלב ושלב." }
    '21'    = @{ h = "בדרכה לארץ! ✈️";           d = "זמני האספקה הם 7-21 ימי עסקים מרגע קבלת מספר המעקב, אנו נעדכן אותכם כאן בכל שלב ושלב." }
    '103'   = @{ h = "בדרכה לארץ! ✈️";           d = "זמני האספקה הם 7-21 ימי עסקים מרגע קבלת מספר המעקב, אנו נעדכן אותכם כאן בכל שלב ושלב." }
    '18'    = @{ h = "הגיעה לישראל! 🛃";          d = "החבילה שלך הגיעה לישראל ועוברת בדיקת מכס.`nבדרך כלל לוקח 2-5 ימי עסקים." }
    '13'    = @{ h = "עברה מכס בהצלחה! ✅";       d = "החבילה שלך עברה את המכס ובדרכה למרכז מיון." }
    '521'   = @{ h = "במרכז מיון בישראל 📦";      d = "החבילה שלך הגיעה למרכז המיון — בקרוב תישלח לאיזורך!" }
    '23'    = @{ h = "בדרך אליך 🚚";              d = "החבילה שלך ארוזה ומוכנה למסירה." }
    '48'    = @{ h = "בדרך אליך 🚚";              d = "החבילה שלך בדרכה אליך." }
    '27'    = @{ h = "יוצאת למסירה עכשיו! 🚚";   d = "השליח בדרכו אליך היום — שמור על הטלפון פתוח!" }
    '29'    = @{ h = "מחכה לך בנקודת חלוקה 📍";  d = "החבילה שלך מחכה לאיסוף בנקודת החלוקה הקרובה אליך." }
    '429'   = @{ h = "מחכה לך בנקודת חלוקה 📍";  d = "החבילה שלך מחכה לאיסוף בנקודת החלוקה הקרובה אליך." }
    '19'    = @{ h = "עדכון פרטי משלוח 📝";       d = "בוצע עדכון כתובת/פרטים להזמנה שלך." }
    '99'    = @{ h = "נמסרה! 🎉";                 d = "ההזמנה שלך נמסרה בהצלחה!`nתהנה מהמוצר! ⚽" }
    'STUCK' = @{ h = "עדכון על ההזמנה שלך ⏳";   d = "ההזמנה שלך מתעכבת מעט יותר מהצפוי.`nאנחנו בודקים מה קורה ונחזור אליך בהקדם.`nמתנצלים על האיחור 🙏" }
}
$skipCodes = @('4','5','6')
$transitCodes = @('10','21','103')
$realtimeCodes = @('18','13','521','23','27','29','429','48','99','19')
$warNotice = "בעקבות מבצע שאגת הארי צפויים עיכובים קלים במשלוחים, אנחנו עם יד על הדופק ובודקים מה עם המשלוח שלך בכל יום ויום.`nנא להיות סבלניים 🙏"

# --- Process each order ---
Write-Host "`n[2/4] Checking HFD status for each order..." -ForegroundColor Cyan
$sent = 0; $skipped = 0; $errors = 0

foreach ($order in $orders) {
    Write-Host "   [$($orders.IndexOf($order)+1)/$($orders.Count)] $($order.name) | $($order.tracking)" -NoNewline

    # Get HFD status
    try {
        $xml = Invoke-RestMethod -Uri 'https://ws.hfd.co.il/Epost-Tracking/service.php' -Method POST `
            -Body "client_id=8260&tracking_id=$($order.tracking)&ref=ALL&lang=he" `
            -ContentType 'application/x-www-form-urlencoded'
    } catch {
        Write-Host " [HFD ERROR]" -ForegroundColor Red; $errors++; continue
    }

    # Parse stage
    $stagesXml = $xml.document.details.ship_stages.InnerXml
    if (-not $stagesXml) { Write-Host " [NO STAGES]" -ForegroundColor Gray; $skipped++; continue }

    $stageTags = [regex]::Matches($stagesXml, '<stage>([\s\S]*?)<\/stage>')
    if (-not $stageTags.Count) { Write-Host " [NO STAGES]" -ForegroundColor Gray; $skipped++; continue }

    $lastTag = $stageTags[$stageTags.Count - 1].Groups[1].Value
    $code = ([regex]::Match($lastTag, '<code>\s*(\d+)\s*</code>')).Groups[1].Value
    $date = ([regex]::Match($lastTag, '<date>(.*?)</date>')).Groups[1].Value
    $time = ([regex]::Match($lastTag, '<time>(.*?)</time>')).Groups[1].Value
    $regDate = $xml.document.details.reg_date

    if ($skipCodes -contains $code) { Write-Host " [SKIP code=$code]" -ForegroundColor Gray; $skipped++; continue }

    # Check stuck
    if ($transitCodes -contains $code -and $regDate) {
        try {
            $parts = $regDate.Trim() -split '/'
            $regD = [datetime]::Parse("20$($parts[2])-$($parts[1])-$($parts[0])")
            $daysSince = ([datetime]::UtcNow - $regD).Days
            if ($daysSince -gt 25) {
                $stuckKey = "$($order.tracking)_stuck"
                if ($state.ContainsKey($stuckKey)) { Write-Host " [ALREADY STUCK SENT]" -ForegroundColor Gray; $skipped++; continue }
                $state[$stuckKey] = $true
                $code = 'STUCK'
            }
        } catch {}
    }

    # Check if already sent this stage
    $lastKnown = $state[$order.tracking]
    if ($lastKnown -eq $code) { Write-Host " [NO CHANGE code=$code]" -ForegroundColor Gray; $skipped++; continue }

    # Get message
    $info = $stageMessages[$code]
    if (-not $info) { Write-Host " [UNKNOWN code=$code]" -ForegroundColor Gray; $skipped++; continue }

    # Build message
    $dateLine = ''
    if ($date -and $realtimeCodes -contains $code) {
        $dateLine = "`nעדכון אחרון: $date $time"
    }
    $firstName = ($order.name -split ' ')[0]
    $greeting = if ($firstName) { "שלום $firstName! 👋`n`n" } else { '' }

    $message = "*עדכון משלוח | OneZone* 🏆`n`n${greeting}*סטטוס:* $($info.h)`n`n$($info.d)${dateLine}`n`n${warNotice}`n`n*מס' מעקב:* $($order.tracking)`n`n🔍 *למעקב:* https://www.hfd.co.il/איתור-חבילה/`n_(יש להקליד את מספר המעקב ידנית)_`n`n_להפסקת עדכונים שלח STOP_"

    # Send via JONI
    $payload = @{ to = $order.phone; text = $message }
    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Compress))
    $client = New-Object System.Net.WebClient
    $client.Headers.Add('Content-Type', 'application/json; charset=utf-8')
    try {
        $resp = $client.UploadData($JONI_URL, 'POST', $jsonBytes)
        $respText = [System.Text.Encoding]::UTF8.GetString($resp)
        Write-Host " [SENT code=$code] -> $respText" -ForegroundColor Green
        $state[$order.tracking] = $code
        Save-State
        $sent++
    } catch {
        Write-Host " [SEND ERROR: $_]" -ForegroundColor Red; $errors++; continue
    }

    # Wait 34 seconds between messages (anti-spam)
    if ($sent -lt $orders.Count) {
        Write-Host "   Waiting 34s..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 34
    }
}

Write-Host "`n[DONE] Sent: $sent | Skipped: $skipped | Errors: $errors" -ForegroundColor Cyan
Write-Host "State saved to: $STATE_FILE"
