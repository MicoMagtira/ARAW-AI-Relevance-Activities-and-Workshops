<#
  ARAW overnight build runner (self-healing). Run once; it resumes by itself after crashes, a closed window or a reboot+login.
    powershell -ExecutionPolicy Bypass -File "C:\Users\mjmag\OneDrive\Desktop\ARAW\app\build\run-overnight.ps1"
  Options: -BudgetUsd 150 (total cap across runs)  -AttemptMinutes 120  -Only T07 (run one task)
  -Unattended is used by the watchdog scheduled task; you never need to pass it.
#>
param(
  [double]$BudgetUsd = 150,
  [int]$AttemptMinutes = 120,
  [string]$Only = '',
  [string]$TasksFile = 'tasks.json',
  [switch]$Unattended
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$env:DISABLE_AUTOUPDATER = '1'          # no Claude Code self-update mid-run
$env:CI = '1'                           # non-interactive npm/playwright behaviour

$BuildDir   = $PSScriptRoot
$App        = Split-Path -Parent $BuildDir
$Planning   = Join-Path (Split-Path -Parent $App) 'planning'
$LogDir     = Join-Path $BuildDir 'logs'
$StatePath  = Join-Path $BuildDir 'state.json'
$ReportPath = Join-Path $BuildDir 'MORNING_REPORT.md'
$LockPath   = Join-Path $BuildDir 'run.lock'
$TaskName   = 'ARAW-Overnight-Build'
New-Item -ItemType Directory -Force $LogDir, (Join-Path $BuildDir 'failed') | Out-Null
Set-Location $App
$Utf8 = New-Object System.Text.UTF8Encoding $false

# ---------------------------------------------------------------- helpers
function Log([string]$m) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m
  Write-Host $line
  try { [IO.File]::AppendAllText((Join-Path $LogDir 'run.log'), $line + "`r`n", $Utf8) } catch {}
}
function Save-Text([string]$path, [string]$text) { [IO.File]::WriteAllText($path, $text, $Utf8) }
function Git([string]$argLine) { cmd /c "git $argLine 2>&1" }
function Head { (cmd /c 'git rev-parse HEAD 2>nul') }
function Kill-Tree([int]$procId) { cmd /c "taskkill /PID $procId /T /F >nul 2>&1" | Out-Null }

# ---------------------------------------------------------------- single instance
if (Test-Path $LockPath) {
  $old = (Get-Content $LockPath -Raw).Trim()
  if ($old -match '^\d+$' -and (Get-Process -Id ([int]$old) -ErrorAction SilentlyContinue)) {
    if (-not $Unattended) { Write-Host "Another ARAW run is already active (PID $old). Watch build/logs/run.log." }
    exit 0
  }
}
Save-Text $LockPath "$PID"

# ---------------------------------------------------------------- state
if (Test-Path $StatePath) { $state = Get-Content $StatePath -Raw | ConvertFrom-Json } else {
  $state = [pscustomobject]@{ spent = 0.0; started = (Get-Date).ToString('s'); tasks = [pscustomobject]@{} }
}
foreach ($k in 'nodeDir','claudePath','finished','finishReason','current','oneDriveWasRunning','restarts') {
  if (-not ($state.PSObject.Properties.Name -contains $k)) { $state | Add-Member -NotePropertyName $k -NotePropertyValue $null }
}
function Save-State { Save-Text $StatePath ($state | ConvertTo-Json -Depth 8) }
function Task-State($id) {
  if (-not ($state.tasks.PSObject.Properties.Name -contains $id)) {
    $state.tasks | Add-Member -NotePropertyName $id -NotePropertyValue ([pscustomobject]@{ status='pending'; attempts=0; cost=0.0; minutes=0.0; note=''; startHead=''; sessionId='' })
  }
  $s = $state.tasks.$id
  foreach ($k in 'startHead','sessionId') { if (-not ($s.PSObject.Properties.Name -contains $k)) { $s | Add-Member -NotePropertyName $k -NotePropertyValue '' } }
  return $s
}

function Write-Report([string]$headline) {
  $tasks = Get-Content (Join-Path $BuildDir $TasksFile) -Raw | ConvertFrom-Json
  $rows = foreach ($t in $tasks) { $s = Task-State $t.id; "| $($t.id) | $($t.title) | $($s.status) | $($s.attempts) | `$$([math]::Round([double]$s.cost,2)) | $([math]::Round([double]$s.minutes)) | $($s.note) |" }
  $done = @($tasks | Where-Object { (Task-State $_.id).status -eq 'done' }).Count
  $md = @"
# ARAW overnight build report

**$headline**

- Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')  ·  Tasks done: $done / $($tasks.Count)  ·  Spent: `$$([math]::Round([double]$state.spent,2)) of `$$BudgetUsd cap  ·  Automatic restarts: $([int]$state.restarts)
- Try it: open a terminal in ``$App`` and run ``npm run dev``, then open the printed localhost link (use browser device mode for phone view).
- Continue or retry: run the same command again; finished tasks are skipped, blocked ones are retried.
- Blocked tasks keep their partial work in ``build/failed/<id>.patch``; the repo is always left at the last green commit.
- Logs: ``build/logs/run.log`` (runner) and ``build/logs/<task>-a<n>*`` (each attempt).

| Task | Title | Status | Attempts | Cost | Min | Note |
|---|---|---|---|---|---|---|
$($rows -join "`r`n")
"@
  Save-Text $ReportPath $md
}

# Terminal stop: record why, report it, stop the watchdog from retrying pointlessly.
function Finish-Run([string]$reason, [string]$headline) {
  $state.finished = $true; $state.finishReason = $reason; Save-State
  Write-Report $headline
  try { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop; Log 'Watchdog task removed.' } catch {}
  throw "STOP:$reason"
}

# ---------------------------------------------------------------- environment checks and repairs
function Test-Internet {
  foreach ($u in 'https://registry.npmjs.org/', 'https://api.anthropic.com/') {
    try { Invoke-WebRequest $u -Method Head -UseBasicParsing -TimeoutSec 15 | Out-Null; return $true }
    catch { if ($_.Exception.Response) { return $true } }   # any HTTP answer means we are online
  }
  return $false
}
function Wait-Internet([int]$maxMinutes) {
  $start = Get-Date
  while (-not (Test-Internet)) {
    if (((Get-Date) - $start).TotalMinutes -ge $maxMinutes) { return $false }
    Log '  offline: waiting 2 minutes for the internet...'
    Start-Sleep -Seconds 120
  }
  return $true
}
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  if ($state.nodeDir -and (Test-Path (Join-Path $state.nodeDir 'node.exe'))) { $env:Path = "$($state.nodeDir);$env:Path" }
}
# Portable Node LTS in %LOCALAPPDATA% (no admin, no Windows prompt). Used when node is missing or broken.
function Ensure-Node {
  Refresh-Path
  if (Get-Command node -ErrorAction SilentlyContinue) { try { if ((node --version) -match '^v\d+') { return } } catch {} }
  Log 'Node.js missing: installing portable Node LTS (no admin needed)...'
  if (-not (Wait-Internet 180)) { Finish-Run 'offline' 'Stopped: no internet for 3 hours while installing Node.js. Rerun when online.' }
  for ($i = 1; $i -le 3; $i++) {
    try {
      $idx = Invoke-RestMethod 'https://nodejs.org/dist/index.json' -UseBasicParsing -TimeoutSec 60
      $lts = $idx | Where-Object { $_.lts -and ($_.files -contains 'win-x64-zip') } | Select-Object -First 1
      $ver = $lts.version
      $root = Join-Path $env:LOCALAPPDATA 'araw-tools'; New-Item -ItemType Directory -Force $root | Out-Null
      $zip = Join-Path $root "node-$ver-win-x64.zip"
      Invoke-WebRequest "https://nodejs.org/dist/$ver/node-$ver-win-x64.zip" -OutFile $zip -UseBasicParsing -TimeoutSec 900
      Expand-Archive $zip -DestinationPath $root -Force
      $state.nodeDir = Join-Path $root "node-$ver-win-x64"; Save-State
      Refresh-Path
      if ((node --version) -match '^v\d+') { Log "Installed portable Node $ver."; return }
    } catch { Log "  Node install try $i failed: $($_.Exception.Message)"; Start-Sleep -Seconds (60 * $i) }
  }
  Finish-Run 'node' 'Stopped: could not install Node.js after 3 tries. Install Node LTS from nodejs.org, then rerun.'
}
function Ensure-Claude {
  if ($state.claudePath -and (Test-Path $state.claudePath)) { $script:claude = $state.claudePath; return }
  $c = Get-Command claude -ErrorAction SilentlyContinue
  if (-not $c) { $guess = Join-Path $env:USERPROFILE '.local\bin\claude.exe'; if (Test-Path $guess) { $c = Get-Item $guess } }
  if (-not $c) { Finish-Run 'claude' 'Stopped: Claude Code (claude.exe) was not found. Reinstall it, then rerun.' }
  $script:claude = if ($c.Source) { $c.Source } else { $c.FullName }
  $state.claudePath = $script:claude; Save-State
}
function Free-Ports {
  foreach ($port in 4173, 5173) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
      ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  }
}
function Clear-GitLock {
  $lock = Join-Path $App '.git\index.lock'
  if ((Test-Path $lock) -and -not (Get-Process git -ErrorAction SilentlyContinue)) { Remove-Item $lock -Force; Log '  removed stale git index.lock' }
}
function Check-Disk {
  $free = (Get-PSDrive ($App.Substring(0,1))).Free
  if ($free -lt 5GB) { Finish-Run 'disk' "Stopped: less than 5 GB free on drive $($App.Substring(0,1)):. Free some space, then rerun." }
}
# npm packages and Playwright browser; safe to call any time.
function Ensure-Deps {
  if (-not (Test-Path (Join-Path $App 'package.json'))) { return }
  $marker = Join-Path $App 'node_modules\.package-lock.json'
  $need = -not (Test-Path $marker)
  if (-not $need) {
    $mt = (Get-Item $marker).LastWriteTime
    foreach ($f in 'package.json','package-lock.json') { $p = Join-Path $App $f; if ((Test-Path $p) -and (Get-Item $p).LastWriteTime -gt $mt) { $need = $true } }
  }
  if ($need) {
    for ($i = 1; $i -le 3; $i++) {
      [void](Wait-Internet 120)
      cmd /c "npm install --no-audit --no-fund > `"$LogDir\npm-install.txt`" 2>&1"
      if ($LASTEXITCODE -eq 0) { break }
      Log "  npm install failed (try $i); cleaning cache and retrying"
      cmd /c 'npm cache verify >nul 2>&1'
      if ($i -eq 2 -and (Test-Path (Join-Path $App 'node_modules'))) { cmd /c "rmdir /s /q `"$App\node_modules`"" }
      Start-Sleep -Seconds (60 * $i)
    }
  }
  if ((Get-Content (Join-Path $App 'package.json') -Raw) -match '@playwright/test') {
    $pw = Join-Path $env:LOCALAPPDATA 'ms-playwright'
    if (-not (Get-ChildItem $pw -Directory -Filter 'chromium*' -ErrorAction SilentlyContinue)) {
      for ($i = 1; $i -le 3; $i++) {
        [void](Wait-Internet 120)
        cmd /c "npx playwright install chromium > `"$LogDir\pw-install.txt`" 2>&1"
        if ($LASTEXITCODE -eq 0) { Log '  Playwright Chromium installed.'; break }
        Start-Sleep -Seconds (60 * $i)
      }
    }
  }
}
# Runs the project's verify with environment repairs; returns @{ ok; tail }.
function Run-Verify([string]$logFile) {
  if (-not (Test-Path (Join-Path $App 'package.json'))) { Save-Text $logFile 'no package.json yet: verify skipped'; return @{ ok = $true; tail = '' } }
  for ($pass = 1; $pass -le 2; $pass++) {
    Ensure-Deps; Free-Ports; Clear-GitLock
    cmd /c "npm run verify > `"$logFile`" 2>&1"
    $ok = ($LASTEXITCODE -eq 0)
    $tail = (Get-Content $logFile -Tail 60) -join "`n"
    if ($ok) { return @{ ok = $true; tail = $tail } }
    $envProblem = $tail -match "Cannot find module|ERR_MODULE_NOT_FOUND|Executable doesn't exist|browserType\.launch|EADDRINUSE|ENOSPC|EBUSY|EPERM|ECONNRESET|ETIMEDOUT|is not recognized as an internal"
    if (-not $envProblem -or $pass -eq 2) { return @{ ok = $false; tail = $tail } }
    Log '  verify hit an environment problem; repairing dependencies and retrying once'
    $marker = Join-Path $App 'node_modules\.package-lock.json'; if (Test-Path $marker) { Remove-Item $marker -Force }
    $pwDir = Join-Path $env:LOCALAPPDATA 'ms-playwright'; if ($tail -match "Executable doesn't exist" -and (Test-Path $pwDir)) { Get-ChildItem $pwDir -Directory -Filter 'chromium*' | Remove-Item -Recurse -Force }
  }
}

# ---------------------------------------------------------------- Claude calls
function Invoke-Claude([string[]]$cliArgs, [string]$inFile, [string]$outFile, [string]$errFile, [int]$minutes) {
  if (Test-Path $outFile) { Remove-Item $outFile -Force }
  $p = Start-Process -FilePath $script:claude -ArgumentList $cliArgs -WorkingDirectory $App -NoNewWindow -PassThru `
         -RedirectStandardInput $inFile -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  $finished = $p.WaitForExit($minutes * 60 * 1000)
  if (-not $finished) { Kill-Tree $p.Id; Start-Sleep -Seconds 3 }
  Free-Ports    # clean up any dev/preview server the session left behind
  return $finished
}
# Classifies a Claude run: ok | error | budget | transient | auth | credit
function Read-ClaudeResult([string]$outFile, [string]$errFile) {
  $r = @{ kind = 'transient'; cost = 0.0; session = ''; detail = '' }
  $raw = if (Test-Path $outFile) { Get-Content $outFile -Raw } else { '' }
  $err = if (Test-Path $errFile) { Get-Content $errFile -Raw } else { '' }
  $j = $null; try { if ($raw) { $j = $raw | ConvertFrom-Json } } catch {}
  if ($j) {
    if ($j.total_cost_usd) { $r.cost = [double]$j.total_cost_usd }
    if ($j.session_id) { $r.session = [string]$j.session_id }
    $status = [string]$j.api_error_status; $sub = [string]$j.subtype; $text = "$sub $($j.result) $status"
    $r.detail = $text.Trim()
    if (-not $j.is_error) { $r.kind = 'ok'; return $r }
    if ($text -match 'budget|max_turns') { $r.kind = 'budget'; return $r }
    if ($text -match 'credit|billing|balance|402') { $r.kind = 'credit'; return $r }
    if ($status -match '^(401|403)$' -or $text -match 'auth|login|unauthori|token') { $r.kind = 'auth'; return $r }
    if ($status -match '^(408|409|429|5\d\d)$' -or $text -match 'overload|rate.?limit|timeout|network|ECONN|socket') { $r.kind = 'transient'; return $r }
    $r.kind = 'error'; return $r
  }
  $r.detail = ($err + ' ' + $raw).Trim()
  if ($r.detail -match 'credit|billing|balance|402') { $r.kind = 'credit' }
  elseif ($r.detail -match '401|403|auth|login|unauthori') { $r.kind = 'auth' }
  else { $r.kind = 'transient' }          # killed, timed out, crashed, offline: retry later
  return $r
}

# ---------------------------------------------------------------- watchdog (scheduled task)
function Register-Watchdog {
  try {
    $argLine = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File `"$PSCommandPath`" -Unattended -BudgetUsd $BudgetUsd -AttemptMinutes $AttemptMinutes"
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argLine -WorkingDirectory $App
    $every = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(20) -RepetitionInterval (New-TimeSpan -Minutes 20) -RepetitionDuration (New-TimeSpan -Days 4)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Days 4)
    $triggers = @($every)
    try { $triggers += New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME" } catch {}
    try { Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings -Force -ErrorAction Stop | Out-Null }
    catch { Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $every -Settings $settings -Force -ErrorAction Stop | Out-Null }
    Log 'Watchdog scheduled task registered (checks every 20 min and at login; exits instantly if a run is active).'
  } catch { Log "WARNING: could not register the watchdog task ($($_.Exception.Message)). The run still works but will not auto-restart." }
}

# ---------------------------------------------------------------- main
$oneDriveExe = Join-Path $env:LOCALAPPDATA 'Microsoft\OneDrive\OneDrive.exe'
Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);' -ErrorAction SilentlyContinue

try {
  if (-not $Unattended) { $state.finished = $null; $state.finishReason = $null; Save-State }   # a manual run always resumes
  elseif ($state.finished) { exit 0 }
  if ($Unattended) {
    $state.restarts = [int]$state.restarts + 1; Save-State; Log "=== Watchdog restart #$($state.restarts) ==="
    if ($state.restarts -gt 30) { Finish-Run 'restarts' 'Stopped: the run crashed and restarted more than 30 times. Check build/logs/run.log, then rerun.' }
  }

  [Win32.Power]::SetThreadExecutionState([uint32]2147483649) | Out-Null   # ES_CONTINUOUS | ES_SYSTEM_REQUIRED

  # ---------- preflight ----------
  Log '=== Preflight ==='
  Check-Disk
  if (-not (Wait-Internet 180)) { Finish-Run 'offline' 'Stopped: no internet for 3 hours. Rerun when online.' }
  Ensure-Node
  Log ("node {0} / npm {1}" -f (node --version), (cmd /c 'npm --version'))
  Ensure-Claude

  # Claude login/billing probe, with waiting for transient problems
  $probeIn = Join-Path $LogDir 'probe.txt'; Save-Text $probeIn 'Reply with the single word OK.'
  for ($i = 1; $i -le 6; $i++) {
    [void](Invoke-Claude @('-p','--model','claude-haiku-5-5','--output-format','json','--max-budget-usd','0.05') $probeIn (Join-Path $LogDir 'probe.json') (Join-Path $LogDir 'probe.err.txt') 5)
    $pr = Read-ClaudeResult (Join-Path $LogDir 'probe.json') (Join-Path $LogDir 'probe.err.txt')
    if ($pr.kind -eq 'ok') { break }
    if ($pr.kind -eq 'credit') { Finish-Run 'credit' 'Stopped: the Claude account has no credit left. Ask Anthony to top up or raise the limit, then rerun.' }
    if ($i -eq 6) {
      if ($pr.kind -eq 'auth') { Finish-Run 'auth' 'Stopped: Claude login expired. Run claude, type /login, then rerun.' }
      Finish-Run 'api' "Stopped: Claude API unavailable for about an hour ($($pr.detail)). Rerun later."
    }
    Log "  Claude check failed ($($pr.kind)); retrying in 10 minutes"; Start-Sleep -Seconds 600
  }
  Log 'Claude CLI OK.'

  $mockSrc = Join-Path $Planning 'mockup\project'; $mockDst = Join-Path $App 'design\mockup'
  if ((Test-Path $mockSrc) -and -not (Test-Path $mockDst)) { New-Item -ItemType Directory -Force $mockDst | Out-Null; Copy-Item (Join-Path $mockSrc '*.dc.html') $mockDst; Log 'Copied mockup v1 into design/mockup.' }

  if (-not (Test-Path (Join-Path $App '.git'))) {
    Git 'init -b main' | Out-Null
    if (-not (cmd /c 'git config user.email')) { Git 'config user.email "mjmagtira@gmail.com"' | Out-Null; Git 'config user.name "Mico Magtira"' | Out-Null }
    Git 'add -A' | Out-Null; Git 'commit -m "Build harness: brief, permissions, task plan, mockup baseline"' | Out-Null
    Log 'Initialised git repo.'
  }
  Clear-GitLock

  $od = Get-Process OneDrive -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($od) {
    $state.oneDriveWasRunning = if ($od.Path) { $od.Path } else { $true }; Save-State
    Stop-Process -Name OneDrive -Force -ErrorAction SilentlyContinue
    Log 'Closed OneDrive for the run.'
  }
  Register-Watchdog
  if (-not $Unattended) {
    Log 'Preflight complete: you can leave now. Keep the PC plugged in, lid open and online.'
    Log 'Tip: Settings > Windows Update > Pause updates for 1 week, so no restart happens tonight.'
  }
  Write-Report 'Run in progress...'

  # ---------- build loop ----------
  $tasks = Get-Content (Join-Path $BuildDir $TasksFile) -Raw | ConvertFrom-Json
  if ($Only) { $tasks = @($tasks | Where-Object { $_.id -eq $Only }) }

  foreach ($t in $tasks) {
    $ts = Task-State $t.id
    if ($ts.status -eq 'done') { continue }
    if ($ts.status -eq 'blocked') {
      if ($Unattended) { continue }                       # watchdog never loops on blocked tasks
      $ts.status = 'pending'; $ts.attempts = 0             # manual rerun retries them
    }
    Check-Disk
    $resuming = ($ts.status -eq 'running' -and $ts.startHead)
    if (-not $resuming) { $ts.startHead = Head; $ts.sessionId = ''; $ts.attempts = 0 }
    $ts.status = 'running'; $state.current = $t.id; Save-State
    Log ("=== {0}: {1} [{2}]{3} ===" -f $t.id, $t.title, $t.model, $(if ($resuming) { ' (resuming interrupted task)' } else { '' }))
    $taskStart = Get-Date
    $verifyTail = ''
    $ok = $false
    $transient = 0

    # an interrupted task: capture the current verify state so Claude can check and finish it (never auto-marked done)
    if ($resuming) { $verifyTail = (Run-Verify (Join-Path $LogDir "$($t.id)-resume-verify.txt")).tail }

    while (-not $ok -and $ts.attempts -lt 3) {
      $remaining = $BudgetUsd - [double]$state.spent
      if ($remaining -lt 1.5) { Finish-Run 'budget' 'Stopped: budget cap reached. Rerun with a higher -BudgetUsd to continue.' }
      if (-not (Wait-Internet 240)) { Finish-Run 'offline' 'Stopped: no internet for 4 hours. Rerun when online.' }
      $attempt = $ts.attempts + 1
      $cap = [math]::Min([double]$t.budget, $remaining)
      $canResume = [bool]$ts.sessionId

      if ($attempt -eq 1 -and -not $resuming) {
        $body = @"
You are ARAW's developer working unattended overnight (rules in CLAUDE.md). Current task: $($t.id) - $($t.title).

$($t.prompt)

Definition of done: fully implemented at production quality; consistent with docs/SPEC.md, docs/CONTENT_GUIDE.md and the design/mockup style; seamless at phone, tablet and desktop sizes; tests added or updated; 'npm run verify' passes (skip only if package.json does not exist yet); committed with message '$($t.id): $($t.title)'. If a dependency is missing, install it with npm. Never ask questions; log decisions in docs/DECISIONS-LOG.md. Finish with a summary of at most 5 lines.
"@
      } elseif ($canResume -and $attempt -lt 3) {
        $body = "Continue task $($t.id) - $($t.title). Your previous step ended before the task was verified and committed (it may have hit its budget or been interrupted). The runner's latest 'npm run verify' output:`n$verifyTail`nInspect git status and diff, finish the task, fix the root cause of any failure (do not delete or weaken valid tests), re-run verify until it passes, then commit with message '$($t.id): $($t.title)'."
      } else {
        $ts.sessionId = ''; $canResume = $false
        $body = "You are ARAW's developer working unattended (rules in CLAUDE.md). Task $($t.id) - $($t.title) was attempted before but is not finished or 'npm run verify' fails. Task description:`n$($t.prompt)`n`nLatest verify output:`n$verifyTail`nInspect the current code (git status / git diff), finish the task, make verify pass, then commit with message '$($t.id): $($t.title)'."
      }

      $pf = Join-Path $LogDir "$($t.id)-a$attempt-prompt.txt"
      $of = Join-Path $LogDir "$($t.id)-a$attempt.json"
      $ef = Join-Path $LogDir "$($t.id)-a$attempt.err.txt"
      Save-Text $pf $body
      $fallback = if ($t.model -eq 'claude-opus-5-5') { 'claude-sonnet-5-5' } else { 'claude-opus-5-5' }
      $cliArgs = @('-p','--model',$t.model,'--effort',$t.effort,'--output-format','json',
                   '--permission-mode','auto','--permission-prompts','none',
                   '--settings','.claude/settings.json','--max-budget-usd',([string][math]::Round($cap,2)),
                   '--fallback-model',$fallback)
      if ($t.addDirs) { foreach ($d in $t.addDirs) { $full = Join-Path $App $d; if (Test-Path $full) { $cliArgs += @('--add-dir', (Resolve-Path $full).Path) } } }
      if ($canResume) { $cliArgs += @('--resume', $ts.sessionId) }

      Log "  attempt $attempt (cap `$$([math]::Round($cap,2)))$(if ($canResume) { ' resuming session' })"
      $inTime = Invoke-Claude $cliArgs $pf $of $ef $AttemptMinutes
      $res = Read-ClaudeResult $of $ef
      if (-not $inTime -and $res.kind -eq 'transient') { $res.kind = 'error'; $res.detail = 'attempt timed out' }
      $cost = $res.cost
      if ($cost -eq 0 -and $res.kind -ne 'transient') { $cost = [math]::Min(0.5, $cap) }   # unknown cost: small safe estimate
      $state.spent = [double]$state.spent + $cost; $ts.cost = [double]$ts.cost + $cost
      if ($res.session) { $ts.sessionId = $res.session }
      Save-State
      Log ("  result: {0}  cost `${1:N2}  total `${2:N2}  {3}" -f $res.kind, $cost, $state.spent, $res.detail.Substring(0, [math]::Min(160, $res.detail.Length)))

      if ($res.kind -eq 'credit') { Finish-Run 'credit' 'Stopped: the Claude account ran out of credit. Ask Anthony to top up or raise the limit, then rerun.' }
      if ($res.kind -eq 'auth') {
        $transient++
        if ($transient -gt 4) { Finish-Run 'auth' 'Stopped: Claude login expired. Run claude, type /login, then rerun.' }
        Log '  auth problem: waiting 15 minutes (tokens sometimes refresh) then retrying'; Start-Sleep -Seconds 900
        continue
      }
      if ($res.kind -eq 'transient') {
        $transient++
        if ($transient -gt 10) { Finish-Run 'api' 'Stopped: Claude API kept failing for several hours. Rerun later; progress is saved.' }
        $wait = [int][math]::Min(30, [math]::Pow(2, $transient))
        Log "  temporary problem (network/API/crash): waiting $wait min, attempt not counted"; Start-Sleep -Seconds ($wait * 60)
        continue
      }
      $ts.attempts = $attempt; Save-State

      $v = Run-Verify (Join-Path $LogDir "$($t.id)-a$attempt-verify.txt")
      $verifyTail = $v.tail
      Clear-GitLock
      $dirty = [bool](cmd /c 'git status --porcelain')
      if ($v.ok -and $dirty) { Git 'add -A' | Out-Null; Git "commit -m `"$($t.id): $($t.title) (runner commit)`"" | Out-Null; $dirty = [bool](cmd /c 'git status --porcelain') }
      $committed = ((Head) -ne $ts.startHead)
      $ok = $v.ok -and $committed -and -not $dirty
      if (-not $ok) { Log "  not done yet (verify ok: $($v.ok), committed: $committed)" }
    }

    $ts.minutes = [double]$ts.minutes + ((Get-Date) - $taskStart).TotalMinutes
    if ($ok) {
      $ts.status = 'done'; $ts.note = ''; Log "  DONE $($t.id)"
    } else {
      $patch = Join-Path $BuildDir "failed\$($t.id).patch"
      Clear-GitLock
      Git 'add -A' | Out-Null
      cmd /c "git diff --cached $($ts.startHead) > `"$patch`""
      Git "reset --hard $($ts.startHead)" | Out-Null
      Git 'clean -fd' | Out-Null
      $ts.status = 'blocked'; $ts.note = "see build/failed/$($t.id).patch"
      Log "  BLOCKED $($t.id): partial work saved to $patch; repo reset to last green commit."
      if ($t.id -in @('T00','T01')) { Save-State; Finish-Run 'foundation' "Stopped: foundation task $($t.id) failed 3 times. See build/logs, then rerun." }
    }
    $state.current = $null; Save-State
    Write-Report 'Run in progress...'
  }

  $left = @($tasks | Where-Object { (Task-State $_.id).status -ne 'done' }).Count
  if ($left -eq 0) { Finish-Run 'complete' 'Finished: every task is done and verified.' }
  else { Finish-Run 'pass-complete' "Finished the pass with $left task(s) blocked. Rerun to retry them." }
}
catch {
  $msg = $_.Exception.Message
  if ($msg -like 'STOP:*') { Log "=== Run stopped: $($msg.Substring(5)) ===" }
  else {
    Log "UNEXPECTED ERROR: $msg  (at line $($_.InvocationInfo.ScriptLineNumber)); the watchdog will restart the run within 20 minutes."
    Write-Report "Recovering from an unexpected error: $msg. The watchdog restarts automatically."
  }
}
finally {
  [Win32.Power]::SetThreadExecutionState([uint32]2147483648) | Out-Null
  if ($state.finished -and $state.oneDriveWasRunning) {
    $candidates = @([string]$state.oneDriveWasRunning, $oneDriveExe, 'C:\Program Files\Microsoft OneDrive\OneDrive.exe', 'C:\Program Files (x86)\Microsoft OneDrive\OneDrive.exe')
    $exe = $candidates | Where-Object { $_ -and $_ -like '*.exe' -and (Test-Path $_) } | Select-Object -First 1
    if ($exe) { Start-Process $exe -ArgumentList '/background'; $state.oneDriveWasRunning = $null; Log "OneDrive restarted ($exe)." }
    else { Log 'WARNING: could not find OneDrive.exe to restart it; start OneDrive from the Start menu.' }
  }
  Save-State
  if (Test-Path $LockPath) { if ((Get-Content $LockPath -Raw).Trim() -eq "$PID") { Remove-Item $LockPath -Force } }
}
