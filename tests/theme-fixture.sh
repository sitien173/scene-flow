#!/usr/bin/env bash
# Build a fixed sample project from the template, for theme regression checks.
# usage: bash tests/theme-fixture.sh <out-dir> [new-project.py options, e.g. --theme paper]
# Prints the sha256 of the built index.html. The project is <out-dir>/demo.
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/../skills/scene-flow" && pwd)"
OUT="$1"; shift
ARGS=("$@")
THEME=dark
for ((i = 0; i < ${#ARGS[@]}; i++)); do
  if [[ "${ARGS[$i]}" == "--theme" ]]; then
    THEME="${ARGS[$((i + 1))]:-dark}"
    break
  elif [[ "${ARGS[$i]}" == --theme=* ]]; then
    THEME="${ARGS[$i]#--theme=}"
  fi
done
export THEME
rm -rf "$OUT/demo"; mkdir -p "$OUT"
python3 "$SKILL/scripts/new-project.py" "$OUT/demo" --name "Demo" "${ARGS[@]}" >/dev/null
cd "$OUT/demo"
VOICE_SECONDS=26.95
if [[ "$THEME" == "world3d" ]]; then VOICE_SECONDS=54.45; fi
if [[ "$THEME" == "neon3d" ]]; then VOICE_SECONDS=81.00; fi
if [[ "$THEME" == "terra3d" ]]; then VOICE_SECONDS=59.95; fi
# PCM WAV content keeps the probed duration exact on every ffmpeg version; MP3 padding is not.
ffmpeg -v error -y -f lavfi -i anullsrc=r=44100:cl=mono -t "$VOICE_SECONDS" -c:a pcm_s16le -f wav assets/audio/voiceover.mp3
python3 - <<'PY'
import json
import os
if os.environ["THEME"] in ("world3d", "neon3d", "terra3d"):
    out = []
    time = 0.3
    for sentence, line in enumerate(open("SCRIPT.md", encoding="utf-8"), 1):
        for word in line.split():
            out.append({"i": sentence, "syl": word, "s": round(time, 2), "e": round(time + 0.3, 2)})
            time += 0.4
else:
    words = {1: "Xin chào anh em hôm nay", 2: "Claude Code giúp bạn làm video", 3: "Đầu tiên mở công cụ",
             4: "tạo video ngắn bằng AI", 5: "Bình luận chữ video bên dưới"}
    starts = {1: 0.3, 2: 4.8, 3: 7.0, 4: 10.2, 5: 17.7}
    out = []
    for i, text in words.items():
        t = starts[i]
        for w in text.split():
            out.append({"i": i, "syl": w, "s": round(t, 2), "e": round(t + 0.3, 2)})
            t += 0.4
json.dump(out, open("syl-times.json", "w", encoding="utf-8"), ensure_ascii=False)
PY
bash scripts/make.sh >/dev/null
sha256sum index.html | cut -d' ' -f1
