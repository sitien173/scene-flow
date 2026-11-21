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
if [[ "$THEME" == "atlas3d" ]]; then VOICE_SECONDS=90.00; fi  # the Louisiana sample SCRIPT.md has 221 words
if [[ "$THEME" == "cleanui" ]]; then VOICE_SECONDS=36.50; fi  # the cleanui sample SCRIPT.md has 89 words, the last ends at 35.8 s
if [[ "$THEME" == "toon3d" ]]; then VOICE_SECONDS=33.50; fi  # the toon3d demo SCRIPT.md has 7 sentences and 96 syllables, the last ends at 33.16 s; its syl-times.json is the demo timing
# PCM WAV content keeps the probed duration exact on every ffmpeg version; MP3 padding is not.
ffmpeg -v error -y -f lavfi -i anullsrc=r=44100:cl=mono -t "$VOICE_SECONDS" -c:a pcm_s16le -f wav assets/audio/voiceover.mp3
if [[ "$THEME" != "toon3d" ]]; then
python3 - <<'PY'
import json
out = []
time = 0.3
sentence = 0
for line in open("SCRIPT.md", encoding="utf-8"):
    if not line.strip() or line.strip().startswith(("#", "-", ">", "|")):  # the headings, keyword lists and notes scriptmd.py skips
        continue
    sentence += 1
    for word in line.split():
        out.append({"i": sentence, "syl": word, "s": round(time, 2), "e": round(time + 0.3, 2)})
        time += 0.4
json.dump(out, open("syl-times.json", "w", encoding="utf-8"), ensure_ascii=False)
PY
fi
if [[ "$THEME" == "toon3d" ]]; then cp "$SKILL/template/themes/toon3d/syl-times.json" syl-times.json; fi  # recorded timing of the sample
bash scripts/make.sh >/dev/null
sha256sum index.html | cut -d' ' -f1
