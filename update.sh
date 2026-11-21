#!/usr/bin/env bash
# Updates the scene-flow plugin on macOS and Linux for each coding agent that already has it.
# Agents without scene-flow are skipped; install.sh adds them.
#   curl -fsSL https://raw.githubusercontent.com/sitien173/scene-flow/main/update.sh | bash
set -euo pipefail

REPO=sitien173/scene-flow
HERE=$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)
# agy and the Antigravity IDE load the plugin from the same folder.
GEMINI_PLUGIN=$HOME/.gemini/config/plugins/scene-flow
# install-agy-ide.py writes this marker; agy installs carry none.
IDE_MARKER=$GEMINI_PLUGIN/.scene-flow-agy-ide.json
export PATH="$HOME/.local/bin:$PATH"

ok()   { printf '  [ok]      %s\n' "$*"; }
skip() { printf '  [skip]    %s\n' "$*"; }
has()  { command -v "$1" >/dev/null 2>&1; }
label() { case $1 in claude) echo "Claude Code" ;; codex) echo Codex ;; pi) echo Pi ;; agy) echo agy ;; antigravity) echo "Antigravity IDE" ;; esac; }

# agy and the Antigravity IDE install from a local copy of the repository.
source_dir() {
  if [[ -f $HERE/install-agy-ide.py ]]; then echo "$HERE"; return; fi
  local d=${XDG_DATA_HOME:-$HOME/.local/share}/scene-flow
  if [[ -d $d/.git ]]; then git -C "$d" pull -q --ff-only >&2; else git clone -q --depth 1 "https://github.com/$REPO" "$d" >&2; fi && echo "$d"
}
pi_source() { pi list </dev/null 2>/dev/null | awk -v r="$REPO" 'index($0, r) { print $1; exit }'; }
installed_for() {
  case $1 in
    claude) claude plugin list --json </dev/null 2>/dev/null | python -c 'import json, sys
sys.exit(not any(p.get("id") == "scene-flow@scene-flow" and p.get("scope") == "user" for p in json.load(sys.stdin)))' 2>/dev/null ;;
    codex) grep -qE '^scene-flow@scene-flow +installed' <<<"$(codex plugin list </dev/null 2>/dev/null)" ;;
    pi) [[ -n $(pi_source) ]] ;;
    agy|antigravity) [[ -f $GEMINI_PLUGIN/plugin.json ]] ;;
  esac
}
update_for() {
  local src
  case $1 in
    claude) claude plugin marketplace update scene-flow && claude plugin update scene-flow@scene-flow --scope user ;;
    # Codex has no update command; adding again reinstalls from the refreshed marketplace.
    codex) codex plugin marketplace upgrade scene-flow && codex plugin add scene-flow@scene-flow ;;
    pi) pi update "$(pi_source)" ;;
    agy) src=$(source_dir) && agy plugin install "$src" ;;
    antigravity) src=$(source_dir) && python "$src/install-agy-ide.py" ;;
  esac
}

printf 'scene-flow updater\n\n'
agents=()
for a in claude codex pi; do has $a && agents+=("$a"); done
# One plugin folder serves agy and the Antigravity IDE; the marker tells which one installed it.
if [[ -f $IDE_MARKER ]]; then agents+=(antigravity)
elif has agy; then agents+=(agy)
fi
(( ${#agents[@]} )) || { printf 'No coding agent found. Run install.sh first.\n'; exit 1; }

updated=() failed=0
for a in "${agents[@]}"; do
  name=$(label "$a")
  if ! installed_for "$a"; then skip "scene-flow is not installed for $name"; continue; fi
  if update_for "$a"; then ok "scene-flow updated for $name"; updated+=("$name")
  else printf '  [failed]  scene-flow for %s\n' "$name"; failed=1
  fi
done

if (( ${#updated[@]} )); then printf '\nDone. Restart %s to load the update.\n' "$(IFS=/; echo "${updated[*]}")"
elif (( ! failed )); then printf '\nNothing was updated. Run install.sh to add scene-flow to an agent.\n'
fi
exit $failed
