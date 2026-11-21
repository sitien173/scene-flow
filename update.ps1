# Updates the scene-flow plugin on Windows for each coding agent that already has it.
# Agents without scene-flow are skipped; install.ps1 adds them.
#   irm https://raw.githubusercontent.com/sitien173/scene-flow/main/update.ps1 | iex
& {
$ErrorActionPreference = 'Stop'
$Repo = 'sitien173/scene-flow'
# agy and the Antigravity IDE load the plugin from the same folder.
$geminiPlugin = "$HOME\.gemini\config\plugins\scene-flow"
# install-agy-ide.py writes this marker; agy installs carry none.
$ideMarker = "$geminiPlugin\.scene-flow-agy-ide.json"

function Ok($m) { Write-Host "  [ok]      $m" }
function Skip($m) { Write-Host "  [skip]    $m" }
function Test-Command($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }

# agy and the Antigravity IDE install from a local copy of the repository.
function Get-Source {
  if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'install-agy-ide.py'))) { return $PSScriptRoot }
  $d = Join-Path $env:LOCALAPPDATA 'scene-flow'
  if (Test-Path "$d\.git") { git -C $d pull -q --ff-only | Out-Host } else { git clone -q --depth 1 "https://github.com/$Repo" $d | Out-Host }
  if ($LASTEXITCODE -ne 0) { throw 'git could not download scene-flow.' }
  return $d
}
function Get-PiSource {
  $ErrorActionPreference = 'Continue'
  $line = pi list 2>$null | Where-Object { $_ -match [regex]::Escape($Repo) } | Select-Object -First 1
  if ($line) { $line.Trim() }
}
function Test-Installed($a) {
  $ErrorActionPreference = 'Continue'
  switch ($a) {
    'claude' {
      $plugins = claude plugin list --json 2>$null | Out-String | ConvertFrom-Json
      [bool]($plugins | Where-Object { $_.id -eq 'scene-flow@scene-flow' -and $_.scope -eq 'user' })
    }
    'codex' { (codex plugin list 2>$null | Out-String) -match '(?m)^scene-flow@scene-flow +installed' }
    'pi' { [bool](Get-PiSource) }
    default { Test-Path "$geminiPlugin\plugin.json" }
  }
}
function Update-Plugin($a) {
  $ErrorActionPreference = 'Continue'
  switch ($a) {
    'claude' {
      claude plugin marketplace update scene-flow | Out-Host
      if ($LASTEXITCODE -eq 0) { claude plugin update scene-flow@scene-flow --scope user | Out-Host }
    }
    'codex' {
      # Codex has no update command; adding again reinstalls from the refreshed marketplace.
      codex plugin marketplace upgrade scene-flow | Out-Host
      if ($LASTEXITCODE -eq 0) { codex plugin add scene-flow@scene-flow | Out-Host }
    }
    'pi' { pi update (Get-PiSource) | Out-Host }
    'agy' { agy plugin install (Get-Source) | Out-Host }
    'antigravity' { python (Join-Path (Get-Source) 'install-agy-ide.py') | Out-Host }
  }
  $LASTEXITCODE -eq 0
}

try {
  Write-Host "scene-flow updater`n"
  $labels = @{ claude = 'Claude Code'; codex = 'Codex'; pi = 'Pi'; agy = 'agy'; antigravity = 'Antigravity IDE' }
  $agents = @(@('claude', 'codex', 'pi') | Where-Object { Test-Command $_ })
  # One plugin folder serves agy and the Antigravity IDE; the marker tells which one installed it.
  if (Test-Path $ideMarker) { $agents += 'antigravity' }
  elseif (Test-Command agy) { $agents += 'agy' }
  if (-not $agents) { throw 'no coding agent found. Run install.ps1 first.' }

  $updated = @()
  $failed = $false
  foreach ($a in $agents) {
    $name = $labels[$a]
    if (-not (Test-Installed $a)) { Skip "scene-flow is not installed for $name"; continue }
    try { $done = Update-Plugin $a } catch { $done = $false }
    if ($done) { Ok "scene-flow updated for $name"; $updated += $name }
    else { Write-Host "  [failed]  scene-flow for $name"; $failed = $true }
  }

  if ($updated) { Write-Host "`nDone. Restart $($updated -join '/') to load the update." }
  elseif (-not $failed) { Write-Host "`nNothing was updated. Run install.ps1 to add scene-flow to an agent." }
}
catch {
  Write-Host "`nStopped: $($_.Exception.Message)" -ForegroundColor Red
}
}
