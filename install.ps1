# Installs scene-flow and its tools on Windows. Each missing tool is installed only after you
# confirm; tools that are already present at the required version are left alone.
#   irm https://raw.githubusercontent.com/sitien173/scene-flow/main/install.ps1 | iex
& {
$ErrorActionPreference = 'Stop'
$Repo = 'sitien173/scene-flow'
$Raw = "https://raw.githubusercontent.com/$Repo/main"
$Hyperframes = 'hyperframes@0.8.140'
$MinPython = [version]'3.10'
$MinNode = [version]'22.0'

function Ok($m) { Write-Host "  [ok]      $m" }
function Miss($m) { Write-Host "  [missing] $m" }
function Step($m) { Write-Host "`n== $m" }
function Stop-Install($m) { throw $m }
function Ask($q) { (Read-Host "  $q [y/N]") -match '^[yY]' }
function Test-Command($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }

function Update-SessionPath {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
    [Environment]::GetEnvironmentVariable('Path', 'User') + ";$HOME\.local\bin"
}

# Version printed by "<cmd> <argList>", or $null when the command is missing or fails.
function Get-ToolVersion($cmd, $argList) {
  if (-not (Test-Command $cmd)) { return $null }
  $ErrorActionPreference = 'Continue'
  try { $out = & $cmd @argList 2>$null | Out-String } catch { return $null }
  if ($LASTEXITCODE -eq 0 -and $out -match '(\d+\.\d+(\.\d+)?)') { return [version]$Matches[1] }
  return $null
}

function Install-Tool($id, $label) {
  if (-not (Ask "Install $label?")) { Stop-Install "$label is required." }
  winget install -e --id $id --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { Stop-Install "winget could not install $label." }
  Update-SessionPath
}

try {
  Write-Host 'scene-flow installer'
  Update-SessionPath
  if (-not (Test-Command winget)) {
    Stop-Install 'winget is missing. Install "App Installer" from the Microsoft Store, then run this script again.'
  }

  Step 'Git (includes Git Bash)'
  $v = Get-ToolVersion git @('--version')
  if ($v) { Ok "git $v" }
  else {
    Miss 'Git'
    Install-Tool 'Git.Git' 'Git'
    $v = Get-ToolVersion git @('--version')
    if (-not $v) { Stop-Install 'Git installed, but this window cannot find it yet. Open a new PowerShell window and run this script again.' }
    Ok "git $v"
  }

  Step "Python $MinPython or newer"
  $v = Get-ToolVersion python @('--version')
  if ($v -and $v -ge $MinPython) { Ok "python $v" }
  else {
    if ($v) { Miss "Python $MinPython+ (found $v)" } else { Miss "Python $MinPython+" }
    Install-Tool 'Python.Python.3.12' 'Python 3.12'
    $v = Get-ToolVersion python @('--version')
    if (-not ($v -and $v -ge $MinPython)) {
      Stop-Install ('Python installed, but this window cannot run it yet. Open a new PowerShell window and run this script again. ' +
        'If it still fails, turn off the python.exe entries in Settings > Apps > Advanced app settings > App execution aliases.')
    }
    Ok "python $v"
  }

  Step "Node.js $MinNode or newer"
  $v = Get-ToolVersion node @('--version')
  if ($v -and $v -ge $MinNode) { Ok "node $v" }
  else {
    if ($v) { Miss "Node.js $MinNode+ (found $v)" } else { Miss "Node.js $MinNode+" }
    Install-Tool 'OpenJS.NodeJS.LTS' 'Node.js LTS'
    $v = Get-ToolVersion node @('--version')
    if (-not ($v -and $v -ge $MinNode)) { Stop-Install 'Node.js installed, but this window cannot find it yet. Open a new PowerShell window and run this script again.' }
    Ok "node $v"
  }

  Step 'FFmpeg'
  if ((Test-Command ffmpeg) -and (Test-Command ffprobe)) { Ok "ffmpeg $(Get-ToolVersion ffmpeg @('-version'))" }
  else {
    Miss 'ffmpeg and ffprobe'
    Install-Tool 'Gyan.FFmpeg' 'FFmpeg'
    if (-not ((Test-Command ffmpeg) -and (Test-Command ffprobe))) { Stop-Install 'FFmpeg installed, but this window cannot find it yet. Open a new PowerShell window and run this script again.' }
    Ok 'ffmpeg installed'
  }

  Step 'Python packages'
  $req = if ($PSScriptRoot) { Join-Path $PSScriptRoot 'skills\scene-flow\requirements.txt' }
  if (-not ($req -and (Test-Path $req))) {
    $req = Join-Path $env:TEMP 'scene-flow-requirements.txt'
    Invoke-WebRequest -UseBasicParsing "$Raw/skills/scene-flow/requirements.txt" -OutFile $req
  }
  # Prints each requirement that is missing or older than requested.
  $check = Join-Path $env:TEMP 'scene-flow-check.py'
  Set-Content -Encoding ASCII $check @'
import re, sys, importlib.metadata as md
def ver(s): return tuple(int(n) for n in re.findall(r"\d+", s)[:3])
for line in open(sys.argv[1]):
    line = line.split("#")[0].strip()
    if not line: continue
    name, _, want = line.partition(">=")
    try: have = md.version(name.strip())
    except md.PackageNotFoundError: print(line); continue
    if want and ver(have) < ver(want): print(line)
'@
  $missing = @(python $check $req | Where-Object { $_ })
  if ($missing.Count -eq 0) { Ok ((Get-Content $req | Where-Object { $_.Trim() }) -join ' ') }
  else {
    Miss ($missing -join ' ')
    if (-not (Ask 'Install them for your user with pip?')) { Stop-Install 'the Python packages are required.' }
    python -m pip install --user @missing
    if ($LASTEXITCODE -ne 0) { Stop-Install 'pip could not install the Python packages.' }
    Ok 'Python packages installed'
  }

  Step 'Claude Code'
  $v = Get-ToolVersion claude @('--version')
  if ($v) { Ok "claude $v" }
  else {
    Miss 'Claude Code'
    if (-not (Ask 'Install Claude Code?')) { Stop-Install 'Claude Code is required.' }
    powershell -NoProfile -ExecutionPolicy Bypass -Command 'irm https://claude.ai/install.ps1 | iex'
    Update-SessionPath
    if (-not (Test-Command claude)) { Stop-Install 'Claude Code installed, but this window cannot find it yet. Open a new PowerShell window and run this script again.' }
    Ok 'Claude Code installed. Run "claude" once to sign in.'
  }

  Step 'scene-flow plugin'
  $plugins = claude plugin list --json | Out-String | ConvertFrom-Json
  if ($plugins | Where-Object { $_.id -eq 'scene-flow@scene-flow' -and $_.scope -eq 'user' }) {
    Ok 'scene-flow (update later with: claude plugin update scene-flow@scene-flow)'
  }
  else {
    Miss 'scene-flow plugin for Claude Code'
    if (-not (Ask 'Install the scene-flow plugin?')) { Stop-Install 'the plugin was not installed.' }
    $markets = claude plugin marketplace list --json | Out-String | ConvertFrom-Json
    if (-not ($markets | Where-Object { $_.name -eq 'scene-flow' })) { claude plugin marketplace add $Repo }
    claude plugin install scene-flow@scene-flow
    if ($LASTEXITCODE -ne 0) { Stop-Install 'the plugin did not install.' }
    Ok 'scene-flow installed. Restart Claude Code to load it.'
  }

  Step 'HyperFrames check'
  Write-Host '  The first check downloads the headless Chrome browser that HyperFrames renders with.'
  if (Ask 'Run the HyperFrames check now?') {
    npx --yes $Hyperframes doctor
    if ($LASTEXITCODE -ne 0) { Write-Host "  Fix the failed items above, then run: npx --yes $Hyperframes doctor" }
  }
  else { Write-Host "  Skipped. Run it later with: npx --yes $Hyperframes doctor" }

  Write-Host "`nDone. Open a new PowerShell window, run ""claude"" in the folder for your videos, and ask for a video."
}
catch {
  Write-Host "`nStopped: $($_.Exception.Message)" -ForegroundColor Red
}
}
