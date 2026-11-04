# Runs the overnight lecture recording and restarts it (up to 3 times) if node crashes. Resume makes a restart safe: videos
# with a valid done marker are skipped. Works detached, with the repo as working directory:
#   Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File scripts\lectures\run-overnight.ps1' -WindowStyle Minimized
# Exit codes of record.mjs that do NOT trigger a restart: 0 done, 5 done with failed videos, 3 stopped on low disk,
# 4 preflight failed (it would fail again), 130 stopped by a signal.
param([string]$Langs = 'en,fil,ceb,ilo,hil', [string]$Target = 'all')
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $repo
$out = Join-Path $repo 'lecture-out'
New-Item -ItemType Directory -Force $out | Out-Null
$log = Join-Path $out 'run.log'
function Log([string]$m) { Add-Content -Path $log -Value ("[{0}] ps1: {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) }
$clean = @(0, 3, 4, 5, 130)
$code = 1
for ($attempt = 1; $attempt -le 4; $attempt++) {
  Log "starting node (run $attempt of 4)"
  $extra = @()
  if ($attempt -gt 1) { $extra = @('--no-build') }
  & node scripts/lectures/record.mjs $Target "--langs=$Langs" @extra
  $code = $LASTEXITCODE
  Log "node exited with code $code"
  if ($clean -contains $code) { break }
  Start-Sleep -Seconds 20
}
Log "finished with code $code"
exit $code
