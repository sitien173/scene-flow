#!/usr/bin/env bash
# Installs scene-flow and its tools on macOS and Linux. Each missing tool is installed only after
# you confirm; tools that are already present at the required version are left alone.
#   curl -fsSL https://raw.githubusercontent.com/sitien173/scene-flow/main/install.sh | bash
set -euo pipefail

REPO=sitien173/scene-flow
RAW=https://raw.githubusercontent.com/$REPO/main
HYPERFRAMES=hyperframes@0.8.140
MIN_PYTHON=3.10
MIN_NODE=22.0
MIN_BLENDER=4.2
HERE=$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)
export PATH="$HOME/.local/bin:$PATH"

ok()   { printf '  [ok]      %s\n' "$*"; }
miss() { printf '  [missing] %s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
die()  { printf '\nStopped: %s\n' "$*" >&2; exit 1; }
has()  { command -v "$1" >/dev/null 2>&1; }

# Prompts read the terminal, so they still work when the script is piped from curl.
ask() {
  local answer
  printf '  %s [y/N] ' "$1"
  read -r answer 2>/dev/null </dev/tty || { echo; return 1; }
  [[ $answer == [yY]* ]]
}

# ver_ge A B: true when version A >= version B.
ver_ge() {
  awk -v a="$1" -v b="$2" 'BEGIN { split(a, x, "."); split(b, y, ".")
    for (i = 1; i <= 3; i++) { if (x[i] + 0 > y[i] + 0) exit 0; if (x[i] + 0 < y[i] + 0) exit 1 }
    exit 0 }'
}

py_version() { "$1" -c 'import sys; print("%d.%d.%d" % sys.version_info[:3])' 2>/dev/null; }

# Package manager and the package names it uses.
if [[ $(uname -s) == Darwin ]]; then
  PM=brew
elif has apt-get; then PM=apt
elif has dnf; then PM=dnf
elif has pacman; then PM=pacman
else PM=none
fi

pm_install() {
  case $PM in
    brew)   brew install "$@" ;;
    apt)    sudo apt-get update -qq && sudo apt-get install -y "$@" ;;
    dnf)    sudo dnf install -y "$@" ;;
    pacman) sudo pacman -S --needed --noconfirm "$@" ;;
    none)   die "no supported package manager found. Install $* yourself, then run this script again." ;;
  esac
}

pkgs() {  # pkgs TOOL: package names for TOOL on this system
  case $PM:$1 in
    brew:python) echo python ;;   brew:node) echo node ;;     brew:*) echo "$1" ;;
    apt:python)  echo python3 python3-pip ;;                       apt:*) echo "$1" ;;
    dnf:python)  echo python3 python3-pip ;; dnf:node) echo nodejs ;; dnf:ffmpeg) echo ffmpeg-free ;; dnf:*) echo "$1" ;;
    pacman:python) echo python python-pip ;; pacman:node) echo nodejs npm ;; pacman:*) echo "$1" ;;
    *) echo "$1" ;;
  esac
}

install_tool() {  # install_tool TOOL LABEL
  ask "Install $2?" || die "$2 is required."
  if [[ $PM:$1 == apt:node ]]; then
    # Ubuntu and Debian ship an older Node; NodeSource provides the current release.
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    # shellcheck disable=SC2046
    pm_install $(pkgs "$1")
  fi
}

printf 'scene-flow installer\n'

# Coding agents scene-flow runs in. The installer needs one of them and installs nothing else.
label() { case $1 in claude) echo "Claude Code" ;; codex) echo Codex ;; pi) echo Pi ;; agy) echo agy ;; antigravity) echo "Antigravity IDE" ;; esac; }
step "Coding agent"
agents=()
for a in claude codex pi agy; do has $a && agents+=("$a"); done
if has antigravity || compgen -G "/Applications/Antigravity*.app" >/dev/null; then agents+=(antigravity); fi
(( ${#agents[@]} )) || die "no coding agent found. Install one of Claude Code, Codex, Pi, agy, or the Antigravity IDE, then run this script again."
for a in "${agents[@]}"; do ok "$(label "$a")"; done

if [[ $PM == brew ]] && ! has brew; then
  step "Homebrew"
  miss "Homebrew, the macOS package manager used to install the other tools"
  ask "Install Homebrew?" || die "Homebrew is required on macOS."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" </dev/tty
  eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"
fi

step "Git"
if has git; then ok "git $(git --version | awk '{print $3}')"
else miss "git"; install_tool git Git; has git || die "Git did not install."; ok "git installed"
fi

step "Python $MIN_PYTHON or newer"
PY=
for cmd in python3 python; do
  v=$(py_version "$cmd" || true)
  if [[ -n $v ]] && ver_ge "$v" "$MIN_PYTHON"; then PY=$cmd; ok "$cmd $v"; break; fi
done
if [[ -z $PY ]]; then
  miss "Python $MIN_PYTHON+"
  install_tool python Python
  v=$(py_version python3 || true)
  [[ -n $v ]] && ver_ge "$v" "$MIN_PYTHON" || die "Python ${v:-not found} is older than $MIN_PYTHON. Install Python $MIN_PYTHON+ from https://www.python.org/downloads/ and run this script again."
  PY=python3; ok "python3 $v"
fi
# The pipeline scripts call "python", so it must point to the same Python.
v=$(py_version python || true)
if [[ -n $v ]] && ver_ge "$v" "$MIN_PYTHON"; then
  [[ $PY == python ]] || ok "python $v"
else
  miss "the \"python\" command (scene-flow runs scripts with it)"
  ask "Create $HOME/.local/bin/python pointing to $(command -v "$PY")?" || die "the \"python\" command is required."
  mkdir -p "$HOME/.local/bin" && ln -sf "$(command -v "$PY")" "$HOME/.local/bin/python"
  ok "python -> $(command -v "$PY")"
  printf '  Add %s to PATH in your shell profile if new terminals cannot find "python".\n' "$HOME/.local/bin"
fi

step "Node.js $MIN_NODE or newer"
v=$(node -p process.versions.node 2>/dev/null || true)
if [[ -n $v ]] && ver_ge "$v" "$MIN_NODE"; then ok "node $v"
else
  miss "Node.js $MIN_NODE+${v:+ (found $v)}"
  install_tool node Node.js
  v=$(node -p process.versions.node 2>/dev/null || true)
  [[ -n $v ]] && ver_ge "$v" "$MIN_NODE" || die "Node.js ${v:-not found} is older than $MIN_NODE. Install it from https://nodejs.org and run this script again."
  ok "node $v"
fi

step "FFmpeg"
if has ffmpeg && has ffprobe; then ok "$(ffmpeg -version | head -1 | awk '{print $1, $3}')"
else
  miss "ffmpeg and ffprobe"
  install_tool ffmpeg FFmpeg
  has ffmpeg && has ffprobe || die "FFmpeg did not install."
  ok "ffmpeg installed"
fi

step "Blender $MIN_BLENDER or newer (optional)"
blender_version() {  # prints the version of the first Blender that runs
  local b v
  for b in "$(command -v blender || true)" /Applications/Blender.app/Contents/MacOS/Blender \
           "$HOME/Applications/Blender.app/Contents/MacOS/Blender" /snap/bin/blender; do
    [[ -x $b ]] || continue
    v=$("$b" --version 2>/dev/null | awk '/^Blender/ {print $2; exit}')
    [[ -n $v ]] && { echo "$v"; return; }
  done
}
v=$(blender_version || true)
if [[ -n $v ]] && ver_ge "$v" "$MIN_BLENDER"; then ok "blender $v"
else
  miss "Blender $MIN_BLENDER+${v:+ (found $v)}, for detailed 3D characters and models; without it 3D is built in Three.js only"
  if ask "Install Blender?"; then
    # Distribution packages are often older than $MIN_BLENDER; the snap tracks the current release.
    if [[ $PM == brew ]]; then brew install --cask blender
    elif has snap; then sudo snap install blender --classic
    elif [[ $PM != none ]]; then pm_install blender
    fi || true
    v=$(blender_version || true)
    if [[ -n $v ]] && ver_ge "$v" "$MIN_BLENDER"; then ok "blender $v"
    else printf '  Blender %s+ is still missing. Install it from https://www.blender.org/download/ later.\n' "$MIN_BLENDER"
    fi
  else
    printf '  Skipped. Install Blender %s+ from https://www.blender.org/download/ later if you want it.\n' "$MIN_BLENDER"
  fi
fi

step "Python packages"
REQ="$HERE/skills/scene-flow/requirements.txt"
if [[ ! -f $REQ ]]; then REQ=$(mktemp); curl -fsSL "$RAW/skills/scene-flow/requirements.txt" -o "$REQ"; fi
# Prints each requirement that is missing or older than requested.
missing=$(python - "$REQ" <<'EOF'
import re, sys, importlib.metadata as md
def ver(s): return tuple(int(n) for n in re.findall(r"\d+", s)[:3])
for line in open(sys.argv[1]):
    line = line.split("#")[0].strip()
    if not line: continue
    name, _, want = line.partition(">=")
    try: have = md.version(name.strip())
    except md.PackageNotFoundError: print(line); continue
    if want and ver(have) < ver(want): print(line)
EOF
)
if [[ -z $missing ]]; then ok "$(tr '\n' ' ' <"$REQ")"
else
  if ! python -m pip --version >/dev/null 2>&1; then
    miss "pip"
    [[ $PM == apt || $PM == dnf ]] && pip_pkg=python3-pip || pip_pkg=python-pip
    ask "Install pip?" || die "pip is required to install the Python packages."
    pm_install "$pip_pkg"
  fi
  miss "$(echo "$missing" | tr '\n' ' ')"
  ask "Install them for your user with pip?" || die "the Python packages are required."
  flags=(--user)
  if python -c 'import os, sysconfig; raise SystemExit(not os.path.exists(os.path.join(sysconfig.get_path("stdlib"), "EXTERNALLY-MANAGED")))'; then
    printf '  This Python blocks pip outside a virtual environment. --break-system-packages installs\n'
    printf '  into your home folder only and leaves system packages untouched.\n'
    ask "Use --break-system-packages?" || die "the Python packages are required."
    flags+=(--break-system-packages)
  fi
  # shellcheck disable=SC2086
  python -m pip install "${flags[@]}" $missing
  ok "Python packages installed"
fi

step "scene-flow plugin"
# agy and the Antigravity IDE load the plugin from the same folder.
GEMINI_PLUGIN=$HOME/.gemini/config/plugins/scene-flow
# agy and the Antigravity IDE install from a local copy of the repository.
source_dir() {
  if [[ -f $HERE/install-agy-ide.py ]]; then echo "$HERE"; return; fi
  local d=${XDG_DATA_HOME:-$HOME/.local/share}/scene-flow
  if [[ -d $d/.git ]]; then git -C "$d" pull -q --ff-only >&2; else git clone -q --depth 1 "https://github.com/$REPO" "$d" >&2; fi && echo "$d"
}
installed_for() {
  case $1 in
    claude) claude plugin list --json </dev/null 2>/dev/null | python -c 'import json, sys
sys.exit(not any(p.get("id") == "scene-flow@scene-flow" and p.get("scope") == "user" for p in json.load(sys.stdin)))' 2>/dev/null ;;
    codex) grep -qE '^scene-flow@scene-flow +installed' <<<"$(codex plugin list </dev/null 2>/dev/null)" ;;
    pi) grep -q "$REPO" <<<"$(pi list </dev/null 2>/dev/null)" ;;
    agy|antigravity) [[ -f $GEMINI_PLUGIN/plugin.json ]] ;;
  esac
}
install_for() {
  local src
  case $1 in
    claude) { grep -q '"name": *"scene-flow"' <<<"$(claude plugin marketplace list --json </dev/null 2>/dev/null)" ||
                claude plugin marketplace add "$REPO"; } && claude plugin install scene-flow@scene-flow ;;
    codex) { grep -q 'Marketplace `scene-flow`' <<<"$(codex plugin list </dev/null 2>/dev/null)" ||
               codex plugin marketplace add "$REPO"; } && codex plugin add scene-flow@scene-flow ;;
    pi) pi install "https://github.com/$REPO" ;;
    agy) src=$(source_dir) && agy plugin install "$src" ;;
    antigravity) src=$(source_dir) && python "$src/install-agy-ide.py" ;;
  esac
}
ready=()
for a in "${agents[@]}"; do
  [[ $a == antigravity && " ${agents[*]} " == *" agy "* ]] && continue   # the agy install covers it
  name=$(label "$a")
  if installed_for "$a"; then ok "scene-flow for $name"; ready+=("$name"); continue; fi
  miss "scene-flow for $name"
  ask "Install the scene-flow plugin for $name?" || continue
  if install_for "$a"; then ok "scene-flow installed for $name. Restart $name to load it."; ready+=("$name")
  else printf '  [failed]  scene-flow for %s\n' "$name"; fi
done
(( ${#ready[@]} )) || die "scene-flow is not installed for any coding agent."

step "HyperFrames check"
printf '  The first check downloads the headless Chrome browser that HyperFrames renders with.\n'
if ask "Run the HyperFrames check now?"; then
  npx --yes "$HYPERFRAMES" doctor || printf '  Fix the failed items above, then run: npx --yes %s doctor\n' "$HYPERFRAMES"
else
  printf '  Skipped. Run it later with: npx --yes %s doctor\n' "$HYPERFRAMES"
fi

printf '\nDone. Open a new terminal, start %s in the folder for your videos, and ask for a video.\n' "$(IFS=/; echo "${ready[*]}")"
