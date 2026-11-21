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
$MinBlender = [version]'4.2'

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

  # Coding agents scene-flow runs in. The installer needs one of them and installs nothing else.
  Step 'Coding agent'
  $labels = @{ claude = 'Claude Code'; codex = 'Codex'; pi = 'Pi'; agy = 'agy'; antigravity = 'Antigravity IDE' }
  $agents = @(@('claude', 'codex', 'pi', 'agy') | Where-Object { Test-Command $_ })
  if ((Test-Command antigravity) -or (Test-Path "$env:LOCALAPPDATA\Programs\Antigravity*")) { $agents += 'antigravity' }
  if (-not $agents) { Stop-Install 'no coding agent found. Install one of Claude Code, Codex, Pi, agy, or the Antigravity IDE, then run this script again.' }
  foreach ($a in $agents) { Ok $labels[$a] }

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

  Step "Blender $MinBlender or newer (optional)"
  # winget installs Blender without adding it to PATH.
  function Get-BlenderVersion {
    $paths = @('blender') + @(Get-ChildItem "$env:ProgramFiles\Blender Foundation\Blender *\blender.exe" -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending | ForEach-Object { $_.FullName })
    foreach ($p in $paths) { $v = Get-ToolVersion $p @('--version'); if ($v) { return $v } }
    return $null
  }
  $v = Get-BlenderVersion
  if ($v -and $v -ge $MinBlender) { Ok "blender $v" }
  else {
    $found = if ($v) { " (found $v)" } else { '' }
    Miss "Blender $MinBlender+$found, for detailed 3D characters and models; without it 3D is built in Three.js only"
    if (Ask 'Install Blender?') {
      winget install -e --id BlenderFoundation.Blender --accept-package-agreements --accept-source-agreements
      $v = Get-BlenderVersion
      if ($v -and $v -ge $MinBlender) { Ok "blender $v" }
      else { Write-Host "  Blender $MinBlender+ is still missing. Install it from https://www.blender.org/download/ later." }
    }
    else { Write-Host "  Skipped. Install Blender $MinBlender+ from https://www.blender.org/download/ later if you want it." }
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

  Step 'scene-flow plugin'
  # agy and the Antigravity IDE load the plugin from the same folder.
  $geminiPlugin = "$HOME\.gemini\config\plugins\scene-flow"
  # agy and the Antigravity IDE install from a local copy of the repository.
  function Get-Source {
    if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'install-agy-ide.py'))) { return $PSScriptRoot }
    $d = Join-Path $env:LOCALAPPDATA 'scene-flow'
    if (Test-Path "$d\.git") { git -C $d pull -q --ff-only | Out-Host } else { git clone -q --depth 1 "https://github.com/$Repo" $d | Out-Host }
    if ($LASTEXITCODE -ne 0) { throw 'git could not download scene-flow.' }
    return $d
  }
  function Test-Installed($a) {
    $ErrorActionPreference = 'Continue'
    switch ($a) {
      'claude' {
        $plugins = claude plugin list --json 2>$null | Out-String | ConvertFrom-Json
        [bool]($plugins | Where-Object { $_.id -eq 'scene-flow@scene-flow' -and $_.scope -eq 'user' })
      }
      'codex' { (codex plugin list 2>$null | Out-String) -match '(?m)^scene-flow@scene-flow +installed' }
      'pi' { (pi list 2>$null | Out-String) -match [regex]::Escape($Repo) }
      default { Test-Path "$geminiPlugin\plugin.json" }
    }
  }
  function Install-Plugin($a) {
    $ErrorActionPreference = 'Continue'
    switch ($a) {
      'claude' {
        $markets = claude plugin marketplace list --json 2>$null | Out-String | ConvertFrom-Json
        if (-not ($markets | Where-Object { $_.name -eq 'scene-flow' })) { claude plugin marketplace add $Repo | Out-Host }
        claude plugin install scene-flow@scene-flow | Out-Host
      }
      'codex' {
        if ((codex plugin list 2>$null | Out-String) -notmatch 'Marketplace `scene-flow`') { codex plugin marketplace add $Repo | Out-Host }
        codex plugin add scene-flow@scene-flow | Out-Host
      }
      'pi' { pi install "https://github.com/$Repo" | Out-Host }
      'agy' { agy plugin install (Get-Source) | Out-Host }
      'antigravity' { python (Join-Path (Get-Source) 'install-agy-ide.py') | Out-Host }
    }
    $LASTEXITCODE -eq 0
  }
  $ready = @()
  foreach ($a in $agents) {
    if ($a -eq 'antigravity' -and $agents -contains 'agy') { continue }  # the agy install covers it
    $name = $labels[$a]
    if (Test-Installed $a) { Ok "scene-flow for $name"; $ready += $name; continue }
    Miss "scene-flow for $name"
    if (-not (Ask "Install the scene-flow plugin for ${name}?")) { continue }
    try { $done = Install-Plugin $a } catch { $done = $false }
    if ($done) { Ok "scene-flow installed for $name. Restart $name to load it."; $ready += $name }
    else { Write-Host "  [failed]  scene-flow for $name" }
  }
  if (-not $ready) { Stop-Install 'scene-flow is not installed for any coding agent.' }

  Step 'HyperFrames check'
  Write-Host '  The first check downloads the headless Chrome browser that HyperFrames renders with.'
  if (Ask 'Run the HyperFrames check now?') {
    npx --yes $Hyperframes doctor
    if ($LASTEXITCODE -ne 0) { Write-Host "  Fix the failed items above, then run: npx --yes $Hyperframes doctor" }
  }
  else { Write-Host "  Skipped. Run it later with: npx --yes $Hyperframes doctor" }

  Write-Host "`nDone. Open a new PowerShell window, start $($ready -join '/') in the folder for your videos, and ask for a video."
}
catch {
  Write-Host "`nStopped: $($_.Exception.Message)" -ForegroundColor Red
}
}
