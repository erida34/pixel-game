param([string]$Session = 'stage5', [int]$Segments = 14)
$ErrorActionPreference = 'Stop'
$evidenceRoot = Join-Path $PSScriptRoot '../docs/evidence/stage-5'
for ($segment = 1; $segment -le $Segments; $segment++) {
  $raw = & npx --offline --package '@playwright/cli' playwright-cli "-s=$Session" run-code --filename tools/browser-stage5-run.cjs --raw
  $outputPath = Join-Path $evidenceRoot "run-segment-$segment.json"
  $raw | Set-Content -LiteralPath $outputPath -Encoding utf8
  if ($LASTEXITCODE -ne 0) { throw "Browser segment $segment failed; see $outputPath" }
  $result = ($raw -join "`n") | ConvertFrom-Json
  Write-Output "Segment $segment : time=$($result.time), hp=$($result.hp), level=$($result.level), kills=$($result.kills), phase=$($result.phase)"
  if ($null -ne $result.result) { break }
}
& node tools/collect-stage5-run.mjs
