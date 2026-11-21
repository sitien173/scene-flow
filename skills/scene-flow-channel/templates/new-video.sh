#!/usr/bin/env bash
# Create videos/<yyyy-mm>-<slug>/ with scene-flow, then apply the branding from brand/brand.json.
# usage: ./new-video.sh <slug> "Video name" <neon3d|terra3d|toon3d|atlas3d|cleanui> [voice-recording]
set -euo pipefail
cd "$(dirname "$0")"

[ $# -ge 3 ] || { echo "usage: $0 <slug> \"Video name\" <neon3d|terra3d|toon3d|atlas3d|cleanui> [voice-recording]" >&2; exit 1; }
SLUG="$1" NAME="$2" THEME="$3" VOICE="${4:-}"
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "slug must be lowercase ASCII words joined by hyphens" >&2; exit 1; }
DEST="videos/$(date +%Y-%m)-$SLUG"
[ -e "$DEST" ] && { echo "$DEST already exists" >&2; exit 1; }

# The scene-flow skill: SCENE_FLOW_SKILL in ~/.config/scene-flow/.env, else the newest Claude Code plugin cache,
# else the path written at setup. The environment is not read.
SKILL="$( { sed -n 's/^[[:space:]]*\(export[[:space:]]*\)\{0,1\}SCENE_FLOW_SKILL[[:space:]]*=//p' "$HOME/.config/scene-flow/.env" 2>/dev/null || true; } \
  | tail -1 | tr -d "\"'\r" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
SKILL="${SKILL:-$( { ls -d "$HOME"/.claude/plugins/cache/scene-flow/scene-flow/*/skills/scene-flow 2>/dev/null || true; } | sort -V | tail -1)}"
SKILL="${SKILL:-__SCENE_FLOW_SKILL__}"
[ -f "$SKILL/scripts/new-project.py" ] || { echo "scene-flow skill not found; set SCENE_FLOW_SKILL in ~/.config/scene-flow/.env" >&2; exit 1; }

python3 "$SKILL/scripts/new-project.py" "$DEST" --name "$NAME" --theme "$THEME" ${VOICE:+--voice "$VOICE"}
cp -R brand/logos/. "$DEST/assets/logos/"
python3 - "$DEST/scripts/build.py" <<'PY'
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
PY
echo "Created $DEST"
