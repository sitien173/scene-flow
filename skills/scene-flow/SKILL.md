---
name: scene-flow
description: >-
  Build a vertical narrated short (TikTok, Reels, Shorts; 1080x1920) in HyperFrames from a script
  and a voiceover, with picture and voice in sync to the syllable. The voice can be the author's
  recording, a TTS API, or VieNeu-TTS on a local GPU or a Colab server. Themes: neon3d, terra3d, atlas3d;
  the author picks one for every project. Ships the project template, pipeline, house sound set, and assets. Use it for ANY
  narrated short: when the author sends a script to make into a video, says "làm video",
  "tạo video tiktok", "đây là file audio nói", "đây là voice", "giọng đọc", "tôi sẽ thu âm",
  sends a .wav or .mp3 of narration, asks to learn the previous video's style ("học phong cách
  video trước"), says voice and picture do not line up ("chưa khớp", "hình nhanh hơn voice",
  "mất voice"), or asks to post a render via Postiz. Load it before designing the first frame.
license: Apache-2.0
compatibility: Requires Node 22+, Python 3.10+ with the packages in requirements.txt, ffmpeg on PATH, and for ASR and TTS either a Colab server started with scripts/colab-session.py up, or whisper.cpp and vieneu on a local NVIDIA GPU or Apple Silicon, per scripts/gpu-check.py. Optional Postiz publishing needs POSTIZ_URL and POSTIZ_API_KEY in ~/.config/scene-flow/.env.
---

# Narrated short pipeline

Two jobs, in this order:

1. **Build what the author wants.** The rules live in three tiers: [style.md](references/style.md) with the selected theme guide, the author's style file, and the project's `CLAUDE.md`. See [Recording feedback](#recording-feedback).
2. **Put the picture exactly on the voice.** Every cue is written in recorded seconds.

`<skill>` below means this skill's folder. "The author" is the person making the video.

## Where to look and what to invoke

Read the reference before the step. In Claude Code, delegate to the listed sub-agent (`scene-flow:<name>`, shipped in this plugin's `agents/` folder). On other hosts, follow the reference yourself.

| Task | Read | Invoke |
|---|---|---|
| Set up a channel folder for many videos, or suggest channel ideas | none | skill `scene-flow-channel` |
| Find a video topic | none | sub-agent `topic-scout` |
| Write or revise `SCRIPT.md` | [style.md §8 and §9](references/style.md#9-the-script) | sub-agent `script-writer` |
| Fact-check the script | [style.md §8](references/style.md#8-content-and-accuracy) | sub-agent `fact-checker` |
| Review hook, pacing, length | [style.md §3 and §9](references/style.md) | sub-agent `script-reviewer` |
| Plan scenes and visuals | [style.md §3 to §6](references/style.md), theme guide | sub-agent `storyboard` |
| Align voice to script | [alignment.md](references/alignment.md) | none |
| Get stock, images, icons, cutouts | [style.md §5](references/style.md#5-real-media) | skill `media-use` |
| Add a sound outside the house set | [audio-mix.md](references/audio-mix.md#sounds-outside-the-house-set-freesound) | skill `freesound` |
| Compose scenes in `parts/` | theme guide, [traps.md](references/traps.md) | skills `hyperframes` and `motion-doctrine`, which routes to `cut-the-curve`, `seam-craft`, `oversized-cursor` |
| Build 3D objects for neon3d, terra3d, or atlas3d | [neon3d.md](references/themes/neon3d.md), [terra3d.md](references/themes/terra3d.md), [atlas3d.md](references/themes/atlas3d.md) | skill `3dviz-pro-max` |
| Snapshot, preview, render | [verification.md](references/verification.md) | skill `hyperframes-cli` |
| Mix audio | [audio-mix.md](references/audio-mix.md) | none |
| Write post caption and hashtags | none | sub-agent `caption-writer` |
| Create a new theme from a reference video | all theme guides | sub-agent `theme-designer` |

Theme guides: [neon3d.md](references/themes/neon3d.md), [terra3d.md](references/themes/terra3d.md), [atlas3d.md](references/themes/atlas3d.md).

## Setup

Install `pip install -r requirements.txt` (numpy, Pillow). Run `npx --yes hyperframes@0.8.140 doctor` once per machine; HyperFrames runs through `npx`, pinned in each project's `package.json`, and the first run downloads headless Chrome. Stop if Node, ffmpeg, ffprobe, or Chrome fails. Ignore the upgrade notice and the optional engines Kokoro and MusicGen.

Credentials and machine config live only in `~/.config/scene-flow/.env` (mode 600, one `NAME=value` per line), read through `scripts/settings.py`; scripts never read them from environment variables. The author adds each key to that file. Never ask for a key in chat, never print the file or a key, and never copy a key into a project. If the author pastes a key into chat, do not use it: ask them to add it to the file and tell them once to rotate it.

Run `python "<skill>/scripts/gpu-check.py"` once per machine. On `recommendation: local`, an NVIDIA GPU or Apple Silicon was found: suggest local speech to the author before any Colab session, for example "Máy bạn có GPU, dùng whisper.cpp và VieNeu-TTS ngay trên máy thay vì Colab nhé?", and give the install steps it prints. Once the author picks local and the steps are done, use `asr.py --local` and `tts.py --provider local`. On `recommendation: colab`, the Colab server covers speech.

## What ships with this skill

| Folder | Contents |
|---|---|
| `template/` | shared starter files in `parts/`, plus one folder per theme in `themes/`; `new-project.py` copies the selected theme into `parts/` |
| `scripts/` | the pipeline, copied into each project ([scripts/README.md](scripts/README.md)) |
| `references/` | style rules, theme guides, alignment, audio mix, verification, traps |
| `author/` | `AGENTS.template.md`, the starting author style file; not copied into projects |
| `assets/audio/` | house sound set: `sfx-thud`, `sfx-swoosh`, `sfx-pop`, `sfx-laser`, `sfx-click` (shutter), `sfx-riser`, `sfx-risercut3`, `bgm-little-things.mp3` |
| `assets/fonts/` | Be Vietnam Pro, Nunito for terra3d, and Lora for atlas3d, woff2 subsets under SIL OFL |
| `assets/logos/` | official product marks and `soi-repo-mark.svg` |

No mascot ships. The author may add a transparent `.webm`; its size and placement belong in the author's style file.

## Order of work

1. **Read the author style, then ask for the theme.** Read `AGENTS.md` in the folder that holds the author's projects, or the nearest `AGENTS.md` above the project, such as a channel folder from the `scene-flow-channel` skill. If it is missing, ask the author whether to create it from [author/AGENTS.template.md](author/AGENTS.template.md); see [Recording feedback](#recording-feedback). There is no default theme. Before creating any project, ask which of neon3d, terra3d, or atlas3d to use, and mark the latest project's theme as the suggestion when there is one. Never pick a theme the author has not named. Carry the latest project's other style choices forward.
2. **Get the script.** `SCRIPT.md` holds one sentence per plain line, exactly as spoken. `plan-beats.py` skips lines starting with `#`, `-`, `>`, or `|`, so a markdown table yields zero sentences. Three optional marks, read by `scripts/scriptmd.py`, never reach alignment or captions: a leading `[tense]`, `[normal]`, or `[calm]` sets the delivery, which `tts.py` sends to ElevenLabs and Vibi on `eleven_v3` as an audio tag; a `[pause:0.6s]` line sets the silence after the sentence above it; and `- term -> spelling` lines respell English terms for VieNeu-TTS only.

   The author may bring a script written anywhere, such as ChatGPT, in any shape: a scene table, labelled prose, or paragraphs. Normalize it into `SCRIPT.md` before step 3:
   - Save the author's text unchanged as `SCRIPT.source.md`.
   - Keep only the spoken words: the voiceover column of a table, or the body of prose. Drop beat labels such as `Hook:`, timestamps, list numbers, quotes around a line, markdown, and visual, camera, music, or sound notes; those stay in `SCRIPT.source.md` for the storyboard.
   - Put one sentence per line, splitting at `.`, `?`, and `!`. Keep the author's words and their order. Change only numbers, times, percentages, and symbols into the words a speaker says, such as `90%` into "chín mươi phần trăm".
   - Carry over what maps onto the marks: tone cues as `[tense]`, `[normal]`, or `[calm]`; a pause without a length as `[pause:0.6s]`; a phonetic glossary as `- term -> spelling` lines; bold keywords as the `# Từ khóa phụ đề` list. Leave out marks the source does not suggest.
   - Run `python "<skill>/scripts/scriptmd.py" SCRIPT.md`. It prints the sentences, or stops on lines that still hold markdown, timestamps, labels, or list numbers.
   - Tell the author what changed, which sentences pass 20 syllables, and that the facts are not checked yet. Do not rewrite the script unless the author asks.
3. **Get the voice.** If there is no recording yet, see [Voice sources](#voice-sources).
4. **Start the project.**
   ```bash
   python "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme <theme>
   ```
   `--theme` is required and takes the author's answer from step 1. Each theme gets only its own assets, plus `vignettes.json` and `vignettes/`. The voice is leveled to -21.0 LUFS by plain gain (`prep-voice.py`).
5. **Align.**
   ```bash
   python scripts/asr.py small          # -> asr-words.json; add --local for local speech
   python scripts/plan-beats.py         # -> beats.json; group sentences in SCENES
   python scripts/align-asr.py          # -> vo-alignment.json
   python scripts/syl-times.py          # -> syl-times.json
   python scripts/fix-syl.py            # moves starts stamped inside a pause onto the voice
   python scripts/silences.py           # cut points in silence
   ```
   Trust the map only at 90% exact match or better; below that, rerun ASR with a larger model. Cross-check distinct brand names and numbers directly in `asr-words.json`.
6. **Prepare media.** Retime recordings and blur private data with `scripts/make-media.py`. Capture public pages with `node scripts/cdp.mjs shot <url> research/shots/x.png --w 1280 --dpr 2`. Use official logo files only; never generate or trace a logo. For pictures of an idea, use licensed stock through `media-use` first; use text-to-image only when the author has set `IMAGE_API_URL`, `IMAGE_API_KEY`, and `IMAGE_MODEL` in `~/.config/scene-flow/.env`.
7. **Compose.** Build scenes in `parts/` at syllable times from `syl-times.json`. Per-project settings:

   | File | Settings |
   |---|---|
   | `scripts/build.py` | `SC` scene cuts, `CTA_WORD` comment keyword, `STEPS` step counter, `BRAND_NAME`, `BRAND_LOGO`, `SLOGAN` |
   | `scripts/karaoke.py` | captions: `SIDES`, `DARK`, `SKIP` |
   | `scripts/add-sfx.py` | cues: `RISER`, `LASER`, `CLICK`, `POP`, `EXTRA`; gains are constants at the top of the file |

   The end card lives in `template/themes/<theme>/timeline.js` and reads `BRAND_NAME`, `BRAND_LOGO`, and `SLOGAN` (placeholder `Slogan của bạn`).
8. **Build and verify.**
   ```bash
   bash scripts/make.sh
   npm run check
   npx hyperframes snapshot --at 0.6,4.5,9.9 --no-end -o snapshots/v1
   npx hyperframes snapshot --at 45.5 --no-end --zoom "#b-glyph" -o snapshots/zoom
   node "<motion-doctrine>/scripts/seam-gate.mjs" verify --ledger ledger.json --url http://127.0.0.1:3002
   ```
   Snapshot 0.2 to 0.4 s after every cut, and zoom on every icon. Set `CHROME_PATH` to the HyperFrames headless Chrome for `seam-gate.mjs`. Verify sync against the recording with `scripts/audit-sync.py`, never against captions.
9. **Hand over the preview.** Run `npx hyperframes preview --background` and give the author the URL.
10. **Render only when the author asks.**
    ```bash
    npx --yes hyperframes@0.8.140 render --browser-gpu -o renders/<name>.mp4
    ```
    Add `--player-ready-timeout 180000`. The summary's second line must say `hardware gpu`; `software gpu` means the capture ran on the CPU.
11. **Publish only when the author asks.** See [Publishing via Postiz](#publishing-via-postiz).

## Voice sources

When a script arrives without audio, offer these three options in this order. If the author says "dùng giọng AI miễn phí" or "tạo giọng luôn", go straight to option 3. The author's choice of provider is final: run its scripts without asking again, including services that charge credits and Colab sessions.

1. **Self-recording.** Give the author the script line by line and wait for the audio.
2. **Third-party TTS** such as ElevenLabs or OpenAI. The key goes in `~/.config/scene-flow/.env` (see [Setup](#setup)).
   For Vibi (`api.vibi.pro`, ElevenLabs voices), with `VIBI_API_KEY` in that file, `tts.py` does the whole voice with `python scripts/tts.py --provider vibi [--voice <ElevenLabs voice id>] [--lang vi] [--model eleven_v3]`. Default voice is Quang Toan (`ZsjEJaLQy3sgvwxicmDx`). Vibi charges credits per character of `SCRIPT.md`.
   For ElevenLabs directly, with `ELEVENLABS_API_KEY` in that file, run `python scripts/tts.py --provider elevenlabs` with the same `--voice`, `--lang`, and `--model` options and the same default voice. `--list` prints the voices in the author's ElevenLabs account. A Voice Library voice must be added to that account first. ElevenLabs also charges credits per character.
3. **VieNeu-TTS on this machine or on Colab.** With local speech set up (see [Setup](#setup)), run `python scripts/tts.py --provider local [--voice "<name>" | --ref "<clip.wav>"]`; `--list` works too, and no Colab session is needed. Otherwise use Colab. A session spends the author's Colab compute units. The `colab` CLI must be signed in to the author's Google account.
   ```bash
   python "<skill>/scripts/colab-session.py" up       # T4 session; waits for /health
   python scripts/tts.py --list                      # preset voices
   python scripts/tts.py [--voice "<name>" | --ref "<clip.wav>"]
   python "<skill>/scripts/colab-session.py" down     # as soon as voice and ASR are done
   ```
   `up` saves the URL and token to `~/.config/scene-flow/colab.json` (mode 0600), which `tts.py` and `asr.py` read. Never print, copy, or commit the token. `COLAB_URL` and `COLAB_TOKEN` in `~/.config/scene-flow/.env` take precedence, for a server started by hand ([user guide](https://github.com/sitien173/scene-flow/blob/main/docs/user-guide.md#2-preparing-content)). `tts.py` writes `assets/audio/voiceover.mp3`.

## Voice last

The standard mode is voice first: cues use recorded seconds directly. When the picture must be built before the recording:

1. Build against the estimates in `beats.json` from `plan-beats.py`, with every tween routed through the time map:
   ```js
   var OLD = [], NEW = [];
   var TL = { to: (a,b,t) => tl.to(a,b,T(t)), fromTo: (a,b,c,t) => tl.fromTo(a,b,c,T(t)), set: (a,b,t) => tl.set(a,b,T(t)) };
   ```
   `T()` is a piecewise-linear map from estimated to recorded time. It moves positions, not durations, and extrapolates past the last anchor.
2. Give the author the script and wait for the recording.
3. Align it, then run `install-map.py`, which fills `OLD` and `NEW`.
4. Run `resfx.py` for SFX. Keep bookends and end cards in real seconds.

Details in [scripts/README.md](scripts/README.md) and [audio-mix.md](references/audio-mix.md).

## Publishing via Postiz

Run `scripts/postiz.py` only when the author asks, and only after the author has reviewed the render. The default creates drafts. Use `--schedule <ISO 8601 with offset>` or `--now` only when the author asks for automatic publishing. This is not `npm run publish`, which uploads to HyperFrames hosting. Never add it to `make.sh` or to a render.

```bash
python scripts/postiz.py channels
python scripts/postiz.py renders/<file>.mp4 --dry-run
python scripts/postiz.py renders/<file>.mp4
```

- `POSTIZ_URL` and `POSTIZ_API_KEY` come from `~/.config/scene-flow/.env` (mode 600). Never ask the author to paste the key into the chat.
- `postiz.json` holds `caption`, `hashtags`, `ai_generated` (`true` or `false`), `youtube_title`, and `channels`. The `caption-writer` sub-agent drafts the copy.
- When `postiz-receipt.json` shows the file was already posted, `--schedule` and `--now` are refused unless `--again` is passed; a draft only warns.
- Setup: [user guide §6](https://github.com/sitien173/scene-flow/blob/main/docs/user-guide.md#6-publishing-with-postiz).

## Recording feedback

Rules live in three tiers. The more specific tier wins.

| Tier | File | Write here when the feedback |
|---|---|---|
| Plugin | `references/style.md`, theme guides | never; these change only through the plugin repository |
| Author | `AGENTS.md` in the folder that holds the author's projects | should apply to every future video |
| Project | `CLAUDE.md` in the project folder | applies to this video only |

- If the author does not say which tier, ask: "Áp dụng cho mọi video sau, hay chỉ video này?"
- Write one entry under the matching heading: the rule, then the reason in one line.
- To create the author file, ask the author first. Copy `<skill>/author/AGENTS.template.md` to `<projects folder>/AGENTS.md` and write `<projects folder>/CLAUDE.md` containing only `@AGENTS.md`, so Claude Code loads it in every project below. On other hosts, step 1 of the order of work reads it. Never create it in the home folder or the filesystem root.
- Never write feedback into the plugin's install folder; a plugin update overwrites it.

## Hard rules

- **Never render unasked.** Snapshots answer picture questions in seconds; a render takes minutes.
- **`npm run check` checks structure only**, not layout or sync.
- **Never verify sync against captions.** Captions and cues share one timing model. Use `scripts/audit-sync.py`, a rare-word check, or the author's ears ([verification.md](references/verification.md)).
- **Read [traps.md](references/traps.md) before composing.** It covers hidden scenes, `autoAlpha` on seek, timed `<video>` nesting, z-order, and shell escaping.
- **Studio rewrites `index.html` on preview load.** Edit `parts/` and rebuild with `make.sh`. For a file the author edited in Studio, patch through `scripts/edit_helpers.py` (`replace_el`, `retop`, `sub`). Write patch scripts with the file-editing tool, never with shell heredocs or `python -c`.
- **Keys and tokens never enter a project file, a video, or the chat output.**
- **Terra3d has hard cuts only and no sound on cuts.** Its ambience is per project: CC0 sounds from the freesound skill, approved by the author, named in `vignettes.json`, attribution kept. Read [references/themes/terra3d.md](references/themes/terra3d.md) before writing a vignette or choosing a sound.
- **Atlas3d vignettes use shared map pans and backdrop scenes in `vignettes.json`.** Read [references/themes/atlas3d.md](references/themes/atlas3d.md) before writing an atlas3d vignette.

## Reading author feedback

Take it literally and find which case it is; the fixes are opposite.

| The author says | Meaning | Fix |
|---|---|---|
| "hình nhanh hơn voice" | cues fire before their words | the map, or the cue's position |
| "lướt qua nhanh quá" | too little screen time | the duration, or cut something |
| "chưa đẹp", "nhỏ quá" | a style miss | re-read style.md §3 and §4 |
| "chưa thể hiện được nội dung" | skeleton where substance was needed | real phrases, style.md §4 |

Reporting the wrong one as fixed is worse than not fixing it. After two attempts that do not land, stop patching and question the approach.
