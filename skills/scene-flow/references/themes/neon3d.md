# Neon3d theme

Neon3d is a sequence of short 3D vignettes on a dark neon stage with bloom. Each vignette is one idea
from the script. It starts on a spoken word and ends where the next vignette starts. Select it with
`--theme neon3d` when creating a project.

## Create and build a project

Create the project from the skill directory. Pass a recording with `--voice` to prepare it during
project creation.

```bash
python3 "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme neon3d
cd "<folder>"
```

The project root gets `vignettes.json`, a `vignettes/` folder with one module per vignette, and a sample
`SCRIPT.md` about AI reward hacking. Replace the sample script, vignettes, and anchors with your own.
Run the normal alignment steps to create `syl-times.json`, then build with `bash scripts/make.sh`.
Before `plan-beats.py`, set `SCENES` in `scripts/plan-beats.py` to cover every sentence of `SCRIPT.md`,
for example one entry per vignette. The default `SCENES` covers only sentences 1 to 5, and
`align-asr.py` fails on a longer script.

```bash
python scripts/asr.py small
python scripts/plan-beats.py
python scripts/align-asr.py
python scripts/syl-times.py
python scripts/fix-syl.py
bash scripts/make.sh
```

`scripts/build.py` validates `vignettes.json`, resolves every anchor against `syl-times.json`, and
prints a vignette table with each id, transition, anchor, start, and end. Fix any reported error before
previewing. Do not run `scripts/build.py` alone; it does not add captions.

## `vignettes.json` structure

The root object has one `vignettes` list. Vignettes play in list order.

| Field | Rule |
|---|---|
| `id` | Lowercase letters, digits, `-` or `_`. The module is `vignettes/<id>.js`. Ids are unique. |
| `anchor` | `{ "sentence": n, "word": "..." }`. The vignette starts when that word is spoken. The first vignette has no anchor and starts at 0. |
| `beats` | Optional object of name to anchor. Each beat must fall inside its own vignette. The module reads it with `kit.beat(name)`. |
| `in` | `{ "kind": "cut" \| "fly" \| "flash", "dur": seconds }`. Default kind `cut`. `dur` is 0.2 to 2.0; default 0.9 for fly and 0.3 otherwise. |

The last vignette ends when the CTA scene starts. The CTA starts at the latest of 17.5 s, 2.5 s after
the last vignette starts, and 0.3 s after the last spoken syllable in `syl-times.json`. The
sample script has no spoken CTA line, so the card never covers the narration.

## Transitions

| Kind | Behavior | Build rule |
|---|---|---|
| `cut` | Hard cut on the anchor word. | The voice must have a quiet 20 ms window below -45 dBFS in the 0.4 s before the anchor. |
| `fly` | The outgoing camera dives into the previous vignette's `portal()` object until its color fills the frame. The new vignette pulls back out of the same color. | The previous module must return `portal()`. `dur` must be at most 60% of the previous vignette. |
| `flash` | A short capped flash with time-seeded glitch slices. | At most 3 flash transitions in any 1 s, per WCAG 2.3.1. The shader caps flash brightness. |

Transitions between vignettes have no sound effects. The seams into the CTA and the end card use the
same blur push and sound cues as every scene cut.

## Vignette modules

Each module exports `build(kit)`. It runs once when the page loads and returns:

| Key | Required | Meaning |
|---|---|---|
| `scene` | yes | A `THREE.Scene`, usually from `kit.stage()`. |
| `camera` | yes | A Three.js camera, usually from `kit.camera(fov)`. |
| `update(t)` | yes | Poses the scene for local time `t`, in seconds since the vignette started. |
| `hero` | for checks | The main object, or a list of objects. The layout check keeps it clear of captions, watermarks, and a 24 px frame margin. |
| `portal()` | before a fly | Returns the object the camera dives into. Its `userData.portalColor` or material color sets the fill color. |

`update(t)` must depend on `t` only. It must not keep state between calls, because the renderer seeks
backward and forward. `build.py` rejects any vignette or kit file that contains these words, even in a
comment: `random`, `Date`, `performance`, `requestAnimationFrame`, `setAnimationLoop`, `setTimeout`,
`setInterval`, `Clock`, `Timer`, `getDelta`, `GlitchPass`, `FilmPass`, `fetch`, `XMLHttpRequest`,
`WebSocket`, and network URLs. Use `kit.rand(seed)` for seeded randomness.

Keep heroes above the caption band, which sits about 640 px above the bottom of the 1080 x 1920 frame.
Typed labels sit near y 300.

## Kit

`assets/neon3d/kit/index.js` builds the `kit` object passed to `build`. The source files are the
reference for every option.

| Group | Members |
|---|---|
| Look, `look.js` | `PALETTE`, `stage({ fog })`, `neon(color)` toon material with rim light, `glow(color, intensity)` for bloom, `halo(color)`, `canvasTexture` |
| Character, `blob.js` | `blob({ shape: "drop" \| "bean" \| "bowl" \| "cube", color, size, seed })`. One large eye, blink, bob, look, squash, and pixel steam. It returns `group`, `body`, `iris`, `portal`, and `update(t, { popAt, hop, look, bob, squint })`. |
| Props, `props.js` | `network`, `maze`, `hexCore`, `uiWindow`, `laptop`, `serverRack` |
| Motion, `motion.js` | `clamp01`, `lerp`, `ease`, `progress`, `pop`, `rand`, `dolly`, `orbit`, `pixels`, `trail`, `type` |
| Per vignette | `THREE`, `camera(fov)`, `beat(name)`, and `type(text, opts)` bound to the vignette's text layer |

Glowing parts use colors brighter than 1.0, so only they cross the bloom threshold. The character is
this theme's own design. Do not copy a channel's mascot.

## Checks

From a scene-flow source checkout, run the layout and determinism check on a built project:

```bash
CHROME_PATH="<path-to-chrome-headless-shell>" node "<checkout>/tests/neon3d-check.mjs" "<project>"
```

It scans for banned APIs, seeks each vignette out of order and compares frame hashes, rejects blank
frames, checks hero and label rectangles against captions, watermarks, and the frame edge, and fails on
console errors. It prints a budget table and ends with `NEON3D CHECK: PASSED` or
`NEON3D CHECK: FAILED - <reason>`. It runs WebGL in software, so a 9-vignette project takes several
minutes. Image quality and timing against the voice still need a contact sheet and a human viewer:

```bash
npx --yes hyperframes@0.8.140 snapshot --at "<t1>,<t2>" --no-end --timeout 170000 -o snapshots/neon3d
```

Render with the hardware GPU and check that the second line of the render summary says `hardware gpu`:

```bash
npx --yes hyperframes@0.8.140 render "<project>" --browser-gpu --player-ready-timeout 180000 -o out.mp4
```

On Intel Iris Xe, a 52.9-second sample took 129 seconds at `--quality draft` with 3 workers. SwiftShader
used 1 worker and captured 0.275 frames per second, about 96 minutes for the same video.
