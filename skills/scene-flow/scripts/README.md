# The pipeline scripts

`new-project.py` copies these into a project's `scripts/`; run them from the project root. They read
and write project files in the working directory (`SCRIPT.md`, `beats.json`, `asr-words.json`,
`vo-alignment.json`, `syl-times.json`, `parts/`, `index.html`, `ledger.json`).

## Themes and project branding

`new-project.py` requires `--theme dark|paper|world3d|neon3d`; there is no default theme. It copies the selected theme into
the project's `parts/`, records the theme in `meta.json`, and copies theme-specific assets for paper or
world3d. An older project without a `theme` value continues to build as paper. World3d projects also
receive `world.json` at the project root and the local Three.js runtime and model kit. See the
[world3d theme guide](../references/themes/world3d.md). In `build.py`, `BRAND_NAME`
defaults to `Soi Repo`; `BRAND_LOGO` selects `soi-repo-mark.svg` for dark, world3d, and neon3d, and `brand-logo.svg` for paper.
`SLOGAN` starts as `Slogan của bạn`.

## Voice first — the common case

```bash
python "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme <theme>
cd "<folder>"
python scripts/asr.py small              # -> asr-words.json
python scripts/plan-beats.py             # -> beats.json (scaffold for the aligner only)
python scripts/align-asr.py              # -> vo-alignment.json (real newA/newB per sentence)
python scripts/syl-times.py              # -> syl-times.json (every syllable)
python scripts/fix-syl.py                # starts inside a pause snap to the voice
python scripts/silences.py               # silent span of every sentence gap -> the cuts
python scripts/make-media.py             # the author's clips retimed + blurred, page stills
# ... author parts/ at the syllable times, set SC & co. in build.py ...
bash scripts/make.sh                     # build.py -> karaoke.py -> seam-stamp -> add-sfx.py
npm run check
```

## Voice last — the author records after seeing the picture

The voice-last recaption helpers are paper-only: `recaption.py` and `recaption-real.py`.

```bash
python scripts/asr.py small
python scripts/align-asr.py              # -> timing-map.json + vo-alignment.json
python scripts/install-map.py            # writes OLD[]/NEW[] into index.html, reads back
python scripts/recaption.py              # captions through the map
python scripts/resfx.py                  # SFX at mapped times
python scripts/audit-sync.py 0 110       # every cue vs the sentence playing then
```

## What each one is

| script | generic? | edit per project |
|---|---|---|
| `new-project.py` | **yes** | — run from the skill: shared template + selected theme + scripts + assets into a new folder; `--theme dark|paper|world3d|neon3d` (required) |
| `prep-voice.py` | **yes** | `--tempo` only when the author chooses a faster read |
| `tts.py` | **yes** | — Vietnamese voice from SCRIPT.md via VieNeu-TTS on Colab: default voice Hải Đăng, `--voice <preset>`, `--ref <clip.wav>`, `--list`; levels it with prep-voice.py |
| `asr.py` | mostly | `language="vi"`; model as argv (`small`, `medium`) via OpenAI Whisper on Colab |
| `colab.py` | **yes** | — shared client for the Colab server (reads `COLAB_URL` and `COLAB_TOKEN` from env, else the session file `colab-session.py up` writes) |
| `colab-session.py` | **yes** | — run from the skill: `up` starts a T4 Colab session running `colab/server.py` through the `colab` CLI, `status`, `down` stops it and deletes the session file |
| `postiz.py` | **yes** | — optional: uploads a finished render and creates a Postiz post (reads `POSTIZ_URL` and `POSTIZ_API_KEY` from env, else `~/.config/scene-flow/.env`); run only when the author asks |
| `plan-beats.py` | no | the `SCENES` table — sentence ranges per scene |
| `align-asr.py` | **yes** | — |
| `syl-times.py` | **yes** | — |
| `fix-syl.py` | **yes** | — |
| `silences.py` | **yes** | — optional times as argv print whether each sits in silence |
| `make-media.py` | engine yes | the `CLIPS` and `CROPS` lists (segments, crops, blur boxes) |
| `cdp.mjs` | **yes** | — `shot <url> <out.png> [--w --h --dpr --wait --js --clip --pad]`, `eval <url> <out.txt> --expr`, `page <url> <out.webp> --targets "name=selector,..." [--json --max-h --wait]` |
| `build.py` | mostly | `SC` (cuts), `PROMPTS`, `CTA_WORD`, `STEPS`, `BRAND_NAME`, `BRAND_LOGO`, `SLOGAN`, `CHAPTERS`, `PARTS` |
| `karaoke.py` | mostly | `SIDES`, `DARK`, `SKIP`; add `COMPOUNDS` for new two-syllable words |
| `add-sfx.py` | mostly | `RISER`, `LASER`, `CLICK`, `POP`, `EXTRA`, `BED`. Duration, voice end and swooshes are read from the files |
| `sfx-gain.py` | **yes** | — gain for a new sound file from its measured mean: `--cue thud|swoosh|pop|pop-soft|click|bed` or `--target <dB>`; `--seconds <n>` measures only the first n seconds |
| `make.sh` | **yes** | Finds `motion-doctrine` in this order: `$HF_SKILLS_DIR`; the bundle named by `.skills-dir` (written by `new-project.py`); `.claude/skills` or `.agents/skills` in the project folder and each parent folder, except `/`; then the home folder (`~/.claude/skills` or `~/.agents/skills`) |
| `render-colab.py` | **yes** | Run from the skill via `python "<skill>/scripts/render-colab.py" "<project>"`; it is not copied into each project. Uses a temporary Colab T4 session by default. `--seconds <n>` limits duration, `-o <file>` sets output, `--dry-run` prints the plan, and `--local` uses software WebGL without browser GPU. |
| `sheet.py` | **yes** | — contact sheet of any video: `python scripts/sheet.py in.mp4 out.jpg 2.0` |
| `edit_helpers.py` | **yes** | — import it; see below |
| `install-map.py` | **yes** | — (voice-last only) |
| `recaption.py` | paper only | `HILITE`, `GAP`, `MAXW` (voice-last only) |
| `recaption-real.py` | paper only | older one-word caption generator |
| `resfx.py` | no | the `CUES` list and `EC`; update on every retime (voice-last only) |
| `word-times.py` | no | the `QUERIES` list of phrases you want times for |
| `audit-sync.py` | **yes** | — |
| `synth-sfx.py` | **yes** | a synthesised palette, for pieces that do not use the house cues |

## World3d checks and renders

Run `bash scripts/make.sh` from a world3d project before checking or rendering it. It builds the page,
adds captions, stamps the seams, and writes sound cues. `scripts/build.py` alone does not add captions.

`render-colab.py` accepts a built project directory. Run it from the skill because
`new-project.py` does not copy it into each project's `scripts/`. Its default path requests a Colab T4
session. Use `--seconds 5` for a short render or `--dry-run` to inspect the commands. `--local` selects
the software WebGL fallback. Render timings and limitations are in the
[world3d theme guide](../references/themes/world3d.md).

[`tests/world3d-labels.mjs`](https://github.com/sitien173/scene-flow/blob/main/tests/world3d-labels.mjs) checks rendered label positions against
captions, watermarks, and frame edges. Set `CHROME_PATH` to `chrome-headless-shell` and pass the built project directory. The
[`tests/world3d-kit.html`](https://github.com/sitien173/scene-flow/blob/main/tests/world3d-kit.html) page lays out every kit piece for a contact sheet.

Neon3d projects receive `vignettes.json`, `vignettes/`, and a sample `SCRIPT.md` at the project root, plus
the local Three.js runtime, bloom passes, and the neon kit. Build them with `bash scripts/make.sh` too.
`build.py` prints the vignette table and rejects bad anchors, missing modules, banned APIs, a fly
without `portal()`, a cut outside silence, and more than 3 flashes in 1 s. See the
[neon3d theme guide](../references/themes/neon3d.md).
[`tests/neon3d-check.mjs`](https://github.com/sitien173/scene-flow/blob/main/tests/neon3d-check.mjs) checks determinism, blank frames, and
layout in a built project. Set `CHROME_PATH` as for the world3d check.

## Patching an index.html the author has previewed

Studio rewrites every tag when the preview opens. If the author edited in Studio, never match HTML by
literal text — and do not rebuild over their edits:

```python
import sys; sys.path.insert(0, "scripts")
from edit_helpers import Doc

d = Doc("index.html")
d.replace_el("h-title", '          <div class="pad" id="h-title" style="top:500px;">…</div>')
d.drop_el("e-cursor")
d.retop("e-card", 640)
d.sub(".kc { bottom:196px; }", ".kc { bottom:240px; }")   # CSS / <script> only
d.save()
```

Write the patch as a file with the Write tool — never a heredoc or `python -c` (a `\b` in a regex
became a literal backspace byte twice).
