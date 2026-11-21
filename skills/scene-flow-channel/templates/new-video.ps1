# Create videos\<yyyy-mm>-<slug>\ with scene-flow, then apply the branding from brand\brand.json.
# usage: powershell -ExecutionPolicy Bypass -File .\new-video.ps1 <slug> "Video name" <neon3d|terra3d|atlas3d|legend2d> [voice-recording]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9]+(-[a-z0-9]+)*$')][string]$Slug,
  [Parameter(Mandatory = $true)][string]$Name,
  [Parameter(Mandatory = $true)][ValidateSet('neon3d', 'terra3d', 'atlas3d', 'legend2d')][string]$Theme,
  [string]$Voice
)
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
  $dest = Join-Path 'videos' ("{0}-{1}" -f (Get-Date -Format 'yyyy-MM'), $Slug)
  if (Test-Path $dest) { throw "$dest already exists" }

  # The scene-flow skill: SCENE_FLOW_SKILL in ~/.config/scene-flow/.env, else the newest Claude Code plugin cache,
  # else the path written at setup. The environment is not read.
  $skill = $null
  $envFile = Join-Path $HOME '.config/scene-flow/.env'
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile -Encoding UTF8) {
      if (($line.Trim() -replace '^export\s+', '') -match '^SCENE_FLOW_SKILL\s*=(.*)$') { $skill = $Matches[1].Trim().Trim('"', "'") }
    }
  }
  if (-not $skill) {
    $skill = Get-ChildItem (Join-Path $HOME '.claude/plugins/cache/scene-flow/scene-flow/*/skills/scene-flow') -Directory -ErrorAction SilentlyContinue |
      Sort-Object { try { [version]$_.Parent.Parent.Name } catch { [version]'0.0' } } |
      Select-Object -Last 1 -ExpandProperty FullName
  }
  if (-not $skill) { $skill = '__SCENE_FLOW_SKILL__' }
  if (-not (Test-Path (Join-Path $skill 'scripts/new-project.py'))) { throw 'scene-flow skill not found; set SCENE_FLOW_SKILL in ~/.config/scene-flow/.env' }

  $projectArgs = @((Join-Path $skill 'scripts/new-project.py'), $dest, '--name', $Name, '--theme', $Theme)
  if ($Voice) { $projectArgs += @('--voice', $Voice) }
  & python @projectArgs
  if ($LASTEXITCODE -ne 0) { throw "new-project.py failed with exit code $LASTEXITCODE" }
  Copy-Item -Path 'brand/logos/*' -Destination (Join-Path $dest 'assets/logos') -Recurse -Force

  $branding = @'
import json, re, sys
brand = json.load(open("brand/brand.json", encoding="utf-8"))
values = {"BRAND_NAME": brand.get("name"), "SLOGAN": brand.get("slogan"),
          "BRAND_LOGO": brand.get("logo") and "assets/logos/" + brand["logo"]}
src = open(sys.argv[1], encoding="utf-8").read()
for key, value in values.items():
    if value:
        src = re.sub(r"^%s = .*$" % key, lambda m: "%s = %s" % (key, json.dumps(value, ensure_ascii=False)), src, count=1, flags=re.M)
open(sys.argv[1], "w", encoding="utf-8").write(src)
if not brand.get("logo"):
    print("brand/brand.json has no logo; the end card keeps the template logo")
'@
  $branding | & python - (Join-Path $dest 'scripts/build.py')
  if ($LASTEXITCODE -ne 0) { throw "branding failed with exit code $LASTEXITCODE" }
  Write-Output "Created $dest"
}
finally {
  Pop-Location
}
