---
name: scene-flow
description: >-
  Build a vertical narrated short (TikTok/Reels/Shorts, 1080x1920) in HyperFrames from a script and
  a voiceover, with picture and voice exactly in sync. The voice can be the author's recording, a
  TTS API, or VieNeu-TTS on a Colab server. The default theme is the Soi Repo dark motion-graphics
  theme. Paper and world3d themes are selectable. It uses real logos and real footage instead of
  text, karaoke captions, a comment-box CTA, the house sound set, and a theme-matched end card.
  Ships the project template, pipeline, and assets. Use this for ANY narrated short: when the user
  sends a script to make into a video, says "làm video", "tạo video tiktok", "đây là file audio nói",
  "đây là voice", "giọng đọc", "tôi sẽ thu âm", sends a .wav/.mp3 of narration, asks to learn the
  previous video's style ("học phong cách video trước"), or says voice and picture do not line up
  ("chưa khớp", "hình nhanh hơn voice", "mất voice"). Load it before designing the first frame.
license: Apache-2.0
compatibility: Requires Node 22+, Python 3.10+ with the packages in requirements.txt, ffmpeg on PATH, and a running Colab server for ASR and TTS. Set COLAB_URL and COLAB_TOKEN for each session.
---

# Narrated short pipeline

Two jobs, in this order of importance:

1. **Build what the author actually wants.** Read [references/house-style.md](references/house-style.md) and the selected theme guide before designing. House style holds shared rules; the theme guide holds selected identity and components.
2. **Put the picture exactly on the voice.** The rest of this file.

Read `/hyperframes` for routing and composition contracts, and load `/motion-doctrine` for seams (`seam-stamp.mjs` and `seam-gate.mjs` run in the pipeline).

## What ships with this skill

| folder | what |
|---|---|
| `template/` | shared starter files in `parts/` plus `themes/dark/`, `themes/paper/`, and `themes/world3d/`; `new-project.py` copies the selected theme into `parts/` |
| `references/themes/` | [dark.md](references/themes/dark.md) default, [paper.md](references/themes/paper.md), and [world3d.md](references/themes/world3d.md) selectable themes |
| `scripts/` | pipeline copied into each project by `new-project.py` ([scripts/README.md](scripts/README.md)) |
| `assets/audio/` | house sound set: `sfx-thud`, `sfx-swoosh`, `sfx-pop`, `sfx-laser`, `sfx-click` (shutter), `sfx-riser`, `sfx-risercut3`, `bgm-little-things.mp3` |
| `assets/background/` | paper only: `paper-bg.mp4` (moving plate, 124s, 1080x1920) and `paper.webp` (still plate) |
| `assets/fonts/` | Be Vietnam Pro (dark) and K2D (paper), localized woff2 subsets under SIL OFL |
| `assets/logos/` | official marks, `soi-repo-mark.svg` (dark), and `brand-logo.svg` (paper placeholder) |

No mascot ships with the skill. Add your own transparent `.webm` if you have one (§Bookends).

**Requirements:** Node 22+, Python 3.10+ (`pip install -r requirements.txt`: numpy, Pillow), ffmpeg on PATH, running Colab server (`colab/server.py`) with `COLAB_URL` and `COLAB_TOKEN` set for ASR/TTS, and the HyperFrames skills bundled with this plugin. HyperFrames runs through `npx` pinned in project `package.json`; first run downloads headless Chrome. Run `npx --yes hyperframes@0.8.140 doctor` once per machine. Stop if Node, ffmpeg, ffprobe or Chrome fails. Ignore the upgrade notice and the optional engines whisper-cpp, Kokoro and MusicGen; the Colab server covers speech.

## The order of work

1. **Read house-style.md and the selected theme guide.** Open the latest project if there is one and carry its theme forward. A new series starts with dark. If the latest project uses paper, ask before switching it to dark.
2. **Start the project** (voice first, the common case):
   ```bash
   python "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme dark
   ```
   `--theme dark|paper|world3d` selects the theme (dark default). Paper projects get paper background assets only. World3d projects include `world.json` and the local 3D kit. Levels voice to -21.0 LUFS (`prep-voice.py`, plain gain).
3. **The script** goes in `SCRIPT.md`, one sentence per plain line, exactly as spoken. Group sentences into scenes in `scripts/plan-beats.py` (`SCENES`). `plan-beats.py` skips lines starting with `#`, `-`, `>`, or `|` (a markdown table script yields zero sentences).
4. **Align** (every cue is written in recorded seconds):
   ```bash
   python scripts/asr.py small          # -> asr-words.json (larger model if match rate < 90%)
   python scripts/plan-beats.py         # -> beats.json (scaffold for the map)
   python scripts/align-asr.py          # -> vo-alignment.json
   python scripts/syl-times.py          # -> syl-times.json
   python scripts/fix-syl.py            # starts stamped inside a pause move to the voice
   python scripts/silences.py           # cut points in silence
   ```
5. **Prepare media.** Retime recordings and apply privacy blur via `scripts/make-media.py`. Capture public web pages with `node scripts/cdp.mjs shot <url> research/shots/x.png --w 1280 --dpr 2`. Product logos use official files only; never generate or trace them. Use the selected theme's bundled house mark for its brand. Pictures of an idea follow the source order in [house-style.md §5](references/house-style.md#5-real-media): licensed stock through `media-use` first, text-to-image through an OpenAI-compatible API only when the author has set `IMAGE_API_URL`, `IMAGE_API_KEY` and `IMAGE_MODEL`.
6. **Author composition.** Build scenes in `parts/` at syllable timestamps from `syl-times.json`. Configure per-project knobs in `scripts/build.py`: `SC` (scene cuts), `PROMPTS` (prompt cards), `CTA_WORD` (comment keyword), `STEPS` (step counter), `BRAND_NAME`, `BRAND_LOGO`, `SLOGAN`. Define captions in `scripts/karaoke.py` (`SIDES`, `DARK`, `SKIP`), and SFX in `scripts/add-sfx.py` (`RISER`, `LASER`, `CLICK`, `POP`).
7. **Build and verify with snapshots**:
   ```bash
   bash scripts/make.sh
   npm run check
   npx hyperframes snapshot --at 0.6,4.5,9.9 --no-end -o snapshots/v1
   npx hyperframes snapshot --at 45.5 --no-end --zoom "#b-glyph" -o snapshots/zoom
   ```
   Snapshot 0.2 to 0.4 s after every cut: a cut must land on something. Use `--zoom` on every icon to catch misread glyphs.
   `check` passing verifies structure only, not composition layout or sync.
   The seams: `node "<motion-doctrine>/scripts/seam-gate.mjs" verify --ledger ledger.json --url http://127.0.0.1:3002` against preview (set `CHROME_PATH` to HyperFrames headless Chrome).
   Never verify sync against captions; compare against recording via `scripts/audit-sync.py`, rare-word check, or author ears ([references/verification.md](references/verification.md)).
8. **Preview handoff.** Start preview via `npx hyperframes preview --background` and provide URL. Never render immediately following modifications. Render only upon explicit user request.

## Voice sources

When a script arrives without audio, present these three choices in order:

1. **Self-recording**: Author records spoken narration. Provide script line by line and wait for audio.
2. **Third-party TTS**: Author provides an API key (ElevenLabs, OpenAI). Pass key only via inline command environment variables, never write to disk, and advise key rotation.
3. **VieNeu-TTS on Colab**: Run `colab/server.py` on a Colab GPU instance. `tts.py` reads `SCRIPT.md` sentence by sentence, requires internet, and writes `assets/audio/voiceover.mp3`. Voice should be handed over before picture is built. Never save `COLAB_TOKEN`, never commit it; URL and token change each session. Setup details in [docs/user-guide.md#2-preparing-content](https://github.com/sitien173/scene-flow/blob/main/docs/user-guide.md#2-preparing-content). Set session variables:
   PowerShell:
   ```powershell
   $env:COLAB_URL="<url>"; $env:COLAB_TOKEN="<token>"
   ```
   Bash:
   ```bash
   export COLAB_URL="<url>" COLAB_TOKEN="<token>"
   ```
   Synthesize speech:
   ```bash
   python scripts/tts.py --list
   python scripts/tts.py
   python scripts/tts.py --voice "<name>"
   python scripts/tts.py --ref "<clip.wav>"
   ```

Shortcut: If user asks for "dùng giọng AI miễn phí" or "tạo giọng luôn", proceed directly to option 3.

## Two execution modes

### Voice first (standard)

Script and narration recording exist together. Author visual timings directly against recorded seconds. Timings map 1:1 without remapping formulas.

### Voice last

Author visuals against timing estimates before voice recording:
1. Generate estimates in `scripts/plan-beats.py` (`beats.json`).
2. Provide script text to author and await audio recording.
3. Align recording and install time mapping:
   ```js
   var OLD = [], NEW = [];
   var TL = { to: (a,b,t) => tl.to(a,b,T(t)), fromTo: (a,b,c,t) => tl.fromTo(a,b,c,T(t)), set: (a,b,t) => tl.set(a,b,T(t)) };
   ```
   `T()` is a piecewise-linear map from estimate to recorded time: positions move; durations do not. Note that `T()` extrapolates past the last anchor.
4. Run scripts that finish the mapping: `install-map.py` fills `OLD`/`NEW`, `recaption.py` regenerates captions, and `resfx.py` remaps SFX in Python. Keep bookends and end cards in real seconds.

## Alignment verification

Do not rely on pause heuristics. `scripts/align-asr.py` calculates syllable matches against Whisper ASR outputs using edit distance and diacritic folding:
- Target match rate: at least 90%. Use a larger Whisper model if match rate falls below 90%.
- Check sentence rate spread across the whole read (< 1.5x variation across the read, with short dramatic lines legitimately stretching).
- A run of adjacent slow sentences is a red flag indicating misalignment.
- Cross-check timestamps of distinct brand names and numbers directly in `asr-words.json`.
- Keep exactly one sentence per plain line in `SCRIPT.md`. Details in [references/alignment.md](references/alignment.md).

## Verification with frames

Full video renders require minutes; snapshots complete in seconds. Use `npx hyperframes snapshot` for visual layout inspection:
- `npm run check` verifies structural syntax only, not composition layout or sync.
- Verify seams with `seam-gate.mjs` against a live preview.
- Never verify synchronization against generated captions because both share the same timing model. Verify against recorded audio using `scripts/audit-sync.py`. Details in [references/verification.md](references/verification.md).

## Studio rewrites and patch helpers

HyperFrames Studio rewrites `index.html` on preview load (injects `data-hf-id`, standardizes void tags). For projects edited in Studio, apply changes using `scripts/edit_helpers.py`:
- `replace_el(id, html)`: replaces elements by identifier.
- `retop(id, px)`: updates `top` positioning.
- `sub(old, new)`: literal text replacements in CSS and `<script>` blocks only.

A file that differs from a fresh build only in serialization holds no author edits, so edit `parts/` and rebuild with `make.sh`.
Write patch scripts with the file editing tool, never shell heredocs or `python -c` (`\b` in regex turned into literal backspace byte). If preview reports "did not reload", reload the page and wait 20 seconds.

## Audio mixing

Voice normalizes to -21.0 LUFS (`prep-voice.py`). Sound effect levels use calculated gains (`output dB = file mean dB + 20*log10(gain)`):
- Thud: t=0, target -22 dB (gain 0.30)
- Swoosh: every scene seam, target -28 dB (gain 0.70)
- Pop: key icons only, target -29 dB (gain 0.40); cascade gain is 0.26 (`G_POP_SOFT`), target -33 dB
- Laser: click interactions, target -26 dB (gain 0.55)
- Shutter: key metric reveals, target -30 dB (gain 0.60)
- Riser: opening hook climax, target -24 dB (gain 0.17)
- Bed music: full duration under voice, target -31 to -33 dB (0.18 at -31 dB, 0.219 (shipped) at -33 dB)

Refer to [references/audio-mix.md](references/audio-mix.md) for audio guidelines.

## Bookends

- **Opening mascot (optional, no mascot ships)**: your own transparent `.webm`, BIG in lower-left corner with feet off frame, 0.25 s to hook dead stop, leaves under flash so nothing sits on following full-screen clip (commented in `template/themes/paper/scenes.part`).
- **End card**: defined in `template/themes/<theme>/timeline.js`. Dark theme shows Soi Repo mark, brand name (`BRAND_NAME`), and slogan (`SLOGAN`). Paper theme shows logo (`BRAND_LOGO`, starts with `assets/logos/brand-logo.svg`), oversized cursor click, and slogan (`SLOGAN`) at 2x for 2.75 s. Both use placeholder `Slogan của bạn`. See theme guides and knobs `BRAND_NAME`, `BRAND_LOGO`, `SLOGAN` in `scripts/build.py`.

## Critical traps

Review [references/traps.md](references/traps.md) before composition authoring:
- Setting `.scene { opacity:0 }` hides the composition. Manage visibility via wrapper `autoAlpha:0`.
- Supplying `autoAlpha` only in `fromTo` from-vars causes elements to vanish on seek. Supply in to-vars as well.
- Timed `<video>` elements inside timed scenes produce lint errors. Keep container scenes untimed.
- DOM sequence determines visual layering (z-order).
- World3d labels and camera stops come from spoken-word anchors in `world.json`. Read [references/themes/world3d.md](references/themes/world3d.md) before editing that theme.

## Troubleshooting author feedback

Take it literally and find which it is: the fixes are opposite:

| They say | Means | Fix |
|---|---|---|
| "hình nhanh hơn voice" | cues fire before their words | the map, or the cue's position |
| "lướt qua nhanh quá" | too little screen time | the duration, or cut something |
| "chưa đẹp", "nhỏ quá" | a house-style miss | re-read house-style.md §3 to 4 |
| "chưa thể hiện được nội dung" | skeleton where substance was needed | real phrases, house-style.md §4 |

Answering the wrong one and reporting it fixed is worse than not fixing it. After two attempts that do not land, stop patching and question the approach.
