param([string]$Session = 'shader-chrome', [string]$Browser = 'chrome')
$ErrorActionPreference = 'Stop'
$evidenceRoot = Join-Path $PSScriptRoot '../docs/evidence/stage-7'
function Invoke-BrowserFile([string]$File) {
  $raw = & npx --offline --package '@playwright/cli' playwright-cli "-s=$Session" run-code --filename $File --raw
  if ($LASTEXITCODE -ne 0 -or ($raw -join "`n") -match '^### Error') { throw ($raw -join "`n") }
  return $raw
}
$environment = Invoke-BrowserFile 'tools/browser-stage7-perf-start.cjs'
$environment | Set-Content (Join-Path $evidenceRoot "$Browser-performance-environment.json") -Encoding utf8
Write-Output "Warmed up $Browser"
for ($segment = 0; $segment -lt 3; $segment++) {
  $result = Invoke-BrowserFile 'tools/browser-stage6-perf-segment.cjs'
  Write-Output "$Browser segment $segment : $result"
}
$raw = Invoke-BrowserFile 'tools/browser-stage6-perf-finish.cjs'
$raw | Set-Content (Join-Path $evidenceRoot "$Browser-performance.json") -Encoding utf8
$data = ($raw -join "`n") | ConvertFrom-Json
if ($data.elapsedMs -lt 60000 -or $data.minAlive -ne 300 -or $data.maxAlive -ne 300 -or $data.phases.Count -ne 1 -or $data.phases[0] -ne 'running' -or $data.simulationSeconds -lt 59) { throw 'Invalid load measurement: foreground/continuous simulation required' }
if ($data.samples | Where-Object { !$_.enabled -or $_.passes -ne 1 -or $_.allocated -ne 1 -or $_.lights -gt 24 }) { throw 'Atmosphere disabled or pipeline/light budget invalid' }
if ($data.averageFps -lt 60 -or $data.p95Ms -gt (1000 / 60)) { throw '60 FPS target not met' }
Write-Output "$Browser : average=$($data.averageFps), p95=$($data.p95Ms), frames=$($data.frameCount)"
