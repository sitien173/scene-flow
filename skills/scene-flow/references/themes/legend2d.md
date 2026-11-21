# Legend2d theme

Legend2d is flat 2D cartoon art for folk tales and children's stories. Each scene is a hand-drawn-style vignette
of inline SVG with thick near-black outlines and flat fills. There is no 3D, no WebGL, and no Three.js. Every frame
is a pure function of seek time, so renders are deterministic.

Use it when the author asks for `--theme legend2d` or for a story in a flat cartoon look. Do not pick it for the
author; ask (see [SKILL.md](../../SKILL.md)).

## Create and build a project

```bash
python3 "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme legend2d
```

The project carries `vignettes.json`, `SCRIPT.md`, and the theme's `parts/` (`scenes.part`, `stage.part`, `theme.css`,
`timeline.js`, `fontfaces.txt`). Build with the usual chain in [SKILL.md](../../SKILL.md): `scripts/build.py`,
`scripts/karaoke.py`, `scripts/add-sfx.py`, or `bash scripts/make.sh`.

## `vignettes.json` structure

```json
{"vignettes": [
  {"id": "village", "beats": {"boy": {"sentence": 1, "word": "chú bé"}}},
  {"id": "ridge", "anchor": {"sentence": 2, "word": "Mỗi"}, "in": {"kind": "cut"},
   "beats": {"bamboo": {"sentence": 2, "word": "đồi tre"}}},
  {"id": "lantern", "anchor": {"sentence": 5, "word": "Trong"}, "in": {"kind": "cut"},
   "beats": {"lamp": {"sentence": 5, "word": "lồng đèn"}}, "sfx": {"lamp": "pop"}}
]}
```

- The first vignette starts at 0 s and has no `anchor`.
- Every later vignette has `"in": {"kind": "cut"}`. Legend2d has hard cuts only.
- `anchor` and each `beats` entry name a sentence number (1 is the first line of `SCRIPT.md`) and a word. build.py
  finds the word in `syl-times.json` and uses its recorded start.
- `sfx` maps a beat name to a sound. Only `pop` is used by the sample. The name must be a beat of the same vignette.
- There is no `vignettes/` folder. Motion lives in `stage.part`.

## Art and motion

- `scenes.part` holds one `<svg class="l2d-v" data-v="<id>" data-pan="x0 x1" viewBox="0 0 1080 1920">` per vignette.
  Its `id` must equal the `vignettes.json` id. `data-pan` is the horizontal camera pan in px across the shot.
- Everything in the art sits in `<g class="cam">`. stage.part sets its transform each frame: a 6% push-in across
  the shot plus the pan.
- A `data-m="<name>"` group is a part that `stage.part` moves. `data-m="stem-N"` (with `data-x`) and
  `data-m="print-N"` (with `data-i`) are the repeated parts of the sample.
- `stage.part` holds one `MOTION[<id>](svg, t, duration, beats)` function per vignette. `t` is seconds from the
  vignette start. `beats` holds beat times relative to the vignette start. A vignette with no `MOTION` entry is static
  apart from the camera.
- Classes from `theme.css`: `.ink` (5 px near-black outline), `.f-*` flat fills from the palette, `.dash`, `.dot`,
  `.shadow`, `.star`, `.line`. Do not add gradients, blur, or filters to the art.
- Motion helpers in the sample: `ease`, `pop` (a 0.3 s overshoot), `hop` (a 0.6 s hop at 1.5 Hz), `pivot`.

To add a vignette: add an entry to `vignettes.json`, add a matching `<svg class="l2d-v" data-v="<id>">` to
`scenes.part`, and add a `MOTION` entry in `stage.part` if the vignette moves.

## Palette and type

| Role | Hex | CSS variable |
|---|---|---|
| Day sky | `#DCECEC` | `--sky` |
| Night sky | `#1C2C4C` | `--night` |
| Earth | `#BC8C5C` | `--earth` |
| Earth shade | `#A4744C` | `--earth-dk` |
| Straw | `#F4D484` | `--straw` |
| Soil | `#5C443C` | `--soil` |
| Deep soil | `#3B2C27` | `--soil-dk` |
| Outline ink | `#1A1410` | `--ink` |
| Caption active word | `#FFC247` | `--lamp` (set in karaoke.py) |

Font: Be Vietnam Pro 600, 700, and 800 from `assets/fonts/` (SIL OFL, see [SOURCES.md](../../assets/SOURCES.md)).

## Caption rules

- Captions are uppercase (`text-transform: uppercase` in `theme.css`) at 76 px, weight 800, in white with a thick
  dark outline (`-webkit-text-stroke: 6px var(--ink)`).
- The active word is `#FFC247` (`lit_color` in karaoke.py). Unlit words are `#FFFFFF`. Both use the `DHALO` shadow.
- Cues hold 2 to 3 words and at most 16 characters (`minu` 2, `maxu` 3, `maxc` 16). Sixteen uppercase characters
  at 76 px should fit the 936 px caption width on one line. This is an estimate, so confirm it with a snapshot.
- Captions sit at `bottom: 480px`. Text sizes follow the floors in [style.md](../style.md) §3: nothing below 40 px.
- Entry is a fade and rise (karaoke.py's `#ki` tween). No boxes, no scaling.

## Sound map

| Moment | Sound | Source |
|---|---|---|
| Start of the video | thud | house set, fixed in add-sfx.py |
| Each vignette cut | swoosh | `ledger.cues`, written by build.py from the vignette starts |
| Cut into the CTA and into the end card | swoosh | seams in the ledger, the default path |
| A `sfx` beat in `vignettes.json` | pop | `ledger.cues`, from each beat's time |
| Rain, footsteps, digging | ambience `amb-rain.mp3`, `amb-steps.mp3`, `amb-dig.mp3`, Freesound CC0; looped under the vignette span at category `medium`, faded in and out | a vignette's `ambience` in `vignettes.json`, e.g. `"ambience": {"file": "assets/audio/amb-rain.mp3", "gain": "medium"}`; the sample puts steps on `ridge`, digging on `cave`, rain on `night` |
| Music | "ukulele" by _steef, Freesound 173122, CC0, gain 0.266; a film longer than its 98.0 s gets a looped copy with a 2 s crossfade | `assets/audio/bgm-ukulele.mp3`, copied by `new-project.py` from `assets/legend2d/audio/` |

Sources and licenses of the bed and the three ambience files are in [SOURCES.md](../../assets/SOURCES.md). Any other
music bed or Freesound sound needs the author's approval first, then a CC0 license entry in
[SOURCES.md](../../assets/SOURCES.md) and the wiring in [audio-mix.md](../audio-mix.md#sounds-outside-the-house-set-freesound).

Loudness follows the house target in [audio-mix.md](../audio-mix.md). Do not match a reference master.

## Checks

```bash
python3 tests/legend2d-build-test.py
bash tests/theme-fixture.sh <tmp> --theme legend2d | tail -1
```

The fixture prints `29bdc9239b52e030e5d2eae325b5856687bf79f3676333b8d15003397f2c55a9`. CI pins only the default neon3d hash, so this value is not pinned yet. A change that
alters the generated legend2d video changes this hash. Say so in the pull request. Pinning the legend2d hash in
`.github/workflows/ci.yml` and [CONTRIBUTING.md](../../../../CONTRIBUTING.md) is an open issue.

Before a preview, check each vignette with `npx hyperframes snapshot --at "<t1>,<t2>" --no-end` as in
[verification.md](../verification.md). Check that every caption fits on one line and that no word is cut at a
vignette boundary.
