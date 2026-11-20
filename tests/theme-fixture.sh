#!/usr/bin/env bash
# Build a fixed sample project from the template, for theme regression checks.
# usage: bash tests/theme-fixture.sh <out-dir> [new-project.py options, e.g. --theme neon3d]
# Prints the sha256 of the built index.html. The project is <out-dir>/demo.
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/../skills/scene-flow" && pwd)"
OUT="$1"; shift
ARGS=("$@")
THEME=neon3d
for ((i = 0; i < ${#ARGS[@]}; i++)); do
  if [[ "${ARGS[$i]}" == "--theme" ]]; then
    THEME="${ARGS[$((i + 1))]:-neon3d}"
    break
  elif [[ "${ARGS[$i]}" == --theme=* ]]; then
    THEME="${ARGS[$i]#--theme=}"
  fi
done
[[ " ${ARGS[*]-} " == *" --theme"* ]] || ARGS+=(--theme neon3d)
rm -rf "$OUT/demo"; mkdir -p "$OUT"
python3 "$SKILL/scripts/new-project.py" "$OUT/demo" --name "Demo" "${ARGS[@]}" >/dev/null
cd "$OUT/demo"
VOICE_SECONDS=81.00
if [[ "$THEME" == "terra3d" ]]; then VOICE_SECONDS=59.95; fi
# PCM WAV content keeps the probed duration exact on every ffmpeg version; MP3 padding is not.
ffmpeg -v error -y -f lavfi -i anullsrc=r=44100:cl=mono -t "$VOICE_SECONDS" -c:a pcm_s16le -f wav assets/audio/voiceover.mp3
python3 - <<'PY'
import json
out = []
time = 0.3
for sentence, line in enumerate(open("SCRIPT.md", encoding="utf-8"), 1):
    for word in line.split():
        out.append({"i": sentence, "syl": word, "s": round(time, 2), "e": round(time + 0.3, 2)})
        time += 0.4
json.dump(out, open("syl-times.json", "w", encoding="utf-8"), ensure_ascii=False)
PY
bash scripts/make.sh >/dev/null
sha256sum index.html | cut -d' ' -f1
