# Terra3d theme

Terra3d is a sequence of short daylight 3D vignettes for narrated engineering, geography, and history
shorts. Each vignette is one shot of one idea from the script: a globe with route arcs, an ocean with
ships, terrain seen from a drone, a cutaway of soil and water, low-poly workers. Every change of shot is a
hard cut on a spoken word, so a vignette lasts 2 to 4 s. Captions show one word at a time. Select it with
`--theme terra3d` when creating a project.

## Create and build a project

Create the project from the skill directory. Pass a recording with `--voice` to prepare it during
project creation.

```bash
python3 "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme terra3d
cd "<folder>"
```

The project root gets `vignettes.json`, a `vignettes/` folder with one module per vignette, and a sample
`SCRIPT.md` about the Panama Canal. Replace the sample script, vignettes, and anchors with your own. The
alignment and build steps are the neon3d ones, including the `SCENES` edit in `scripts/plan-beats.py` for a
script longer than 5 sentences; see [neon3d.md](neon3d.md).

```bash
python scripts/asr.py small
python scripts/plan-beats.py
python scripts/align-asr.py
python scripts/syl-times.py
python scripts/fix-syl.py
bash scripts/make.sh
```

`scripts/build.py` validates `vignettes.json`, resolves every anchor against `syl-times.json`, and prints
the vignette table. Fix any reported error before previewing. Do not run `scripts/build.py` alone; it does
not add captions or sound.

## `vignettes.json` structure

The root object has one `vignettes` list. Vignettes play in list order.

| Field | Rule |
|---|---|
| `id` | Lowercase letters, digits, `-` or `_`. The module is `vignettes/<id>.js`. Ids are unique. |
| `anchor` | `{ "sentence": n, "word": "..." }`. The vignette starts when that word is spoken. The first vignette has no anchor and starts at 0. |
| `beats` | Optional object of name to anchor. Each beat must fall inside its own vignette. The module reads it with `kit.beat(name)`. |
| `in` | Optional `{ "kind": "cut" }`. Terra3d has hard cuts only; `fly` and `flash` are build errors. |
| `ambience` | Optional `{ "file": "<project path>", "gain": "soft" \| "medium" \| "strong" }`. See [Sound map](#sound-map). |

A vignette must last at least 1.0 s. Terra3d has no silence rule for cuts: a cut lands on the visual beat of
the anchor word, even in the middle of speech. The last vignette ends when the CTA scene starts, by the same
rule as neon3d. Every time comes from the recorded voice through the anchors; never write a time by hand.

## Vignette modules

Each module exports `build(kit)`, which may be async. It runs once when the page loads and returns:

| Key | Required | Meaning |
|---|---|---|
| `scene` | yes | A `THREE.Scene`, usually from `await kit.stage()`. |
| `camera` | yes | A Three.js camera, usually from `kit.camera(fov)`. The frame is 1080 x 1920. |
| `update(t)` | yes | Poses the scene for local time `t`, in seconds since the vignette started. |
| `hero` | for checks | The main object, or a list of objects. The layout check keeps it clear of captions, watermarks, and a 24 px frame margin. |

`update(t)` must depend on `t` only, because the renderer seeks backward and forward. `build.py` rejects
any vignette or kit file that contains these words, even in a comment: `random`, `Date`, `performance`,
`requestAnimationFrame`, `setAnimationLoop`, `setTimeout`, `setInterval`, `Clock`, `Timer`, `getDelta`,
`GlitchPass`, `FilmPass`, `fetch`, `XMLHttpRequest`, `WebSocket`, and network URLs. Use `kit.rand(seed)` for
seeded randomness. Time-driven parts, such as the ocean, rain, and animation clips, are closed-form
functions of `t` or are set to `t` before each render.

## Kit contract

`assets/terra3d/kit/index.js` builds the `kit` object passed to `build`. The source files are the reference
for every option.

| Group | Members |
|---|---|
| Look, `look.js` | `PALETTE`, `stage({ sky, ground, fog, sunPos, shadow })` daylight scene with a sky from an LDR image, `matte(color)`, `glow(color, intensity)`, `canvasTexture`, `loadTexture`, `loadSky` |
| Ocean, `ocean.js` | `ocean({ size, segments, amp })` Gerstner water, `oceanMaterial`, and the CPU copies `heightAt(x, z, t)` and `gerstnerAt` that boats read to bob and roll |
| Terrain, `terrain.js` | `terrain(opts)` heightfield with river and lake mask and red-earth walls, `createHeightfield({ seed })`, `terrainHeight` |
| Globe, `globe.js` | `globe()`, `routeArc({ from, to, start, dur })` drawn by progress, `globeZoom`, `latLonToVec3` |
| Cutaway, `cutaway.js` | `cutaway()` soil strata and water chambers, `chamberLevel`, `gateAngle` |
| Actors, `actors.js` | `human`, `shipGlb`, `containerShip`, `locomotive`, `loadGlb`, `validateClip` |
| Particles, `particles.js` | `rain`, `swarm`, `fleet` as instanced meshes |
| Overlays, `overlay.js` | `callout` numeric count-up near the top, `pill` place label on a 3D point, `ibar` vertical and `span` horizontal dimension markers, `countValue`, `projectPoint`, all drawn in the vignette's text layer; the kit's `updateOverlays(t, camera)` poses them |
| Motion, `motion.js` | `clamp01`, `lerp`, `ease`, `progress`, `pop`, `rand`, `dolly` |
| Per vignette | `THREE`, `camera(fov)`, `beat(name)`, `layer` |

Bundled textures, sky, and models are CC0 or public domain. Their sources and licenses are in
`assets/SOURCES.md` and `assets/terra3d/LICENSES/`. A vignette loads them through the kit, never by URL.

## Models

The kit holds the look and the stage. Every character and object the script needs is a model:
an original module the agent builds once, or reuses from the channel library. Build and reuse
models with the `model-builder` sub-agent, or follow `agents/model-builder.md` yourself on hosts
without sub-agents.

A model lives in `vignettes/<name>/`, where `<name>` is kebab-case and is not a vignette id:

```text
vignettes/ship-name/
  ship-name.js     exports the factory
  model.json       name, theme, kind, factory, glb, clips, opts, scene_flow_version
  preview.png      one snapshot of the model
  ship-name.glb    optional
```

```js
// vignettes/ship-name/ship-name.js
export function shipName(kit, opts = {}) {
  return {
    group,             // root Object3D
    hero,              // Object3D or array, passed into the vignette's hero
    update(t, state),  // depends only on t; safe under out-of-order seeks
  };
}
```

- The factory takes everything from `kit` and never imports a kit file. It is `async` only when
  it loads a GLB.
- Vignettes import it with `import { shipName } from "./ship-name/ship-name.js";`. Do not list
  model folders in `vignettes.json`.
- `build.py` scans model folders with the same banned-API check as vignettes.
- GLB route: `const gltf = await kit.loadGlb("./vignettes/ship-name/ship-name.glb")`, then
  `const root = kit.cloneGlb(gltf)` and `const walk = kit.clipPose(root, gltf, "Walk")` in the
  factory, and `walk.pose(t)` in `update`. `kit.validateClip(modelName, clipName, vignetteId,
  names)` throws a clear error for a clip name the GLB lacks. `build.py` rejects GLBs that use
  Draco, meshopt, or KTX2.
- The channel library is `<channel>/library/<theme>/<name>/`, with the same files. Copy a library
  model into `vignettes/`; never import from the library.
- terra3d: use `kit.matte` under the daylight rig from `kit.stage`. Models return `group`;
  environment helpers such as `kit.ocean` keep `object`. Pass a model's geometry to
  `kit.fleet({ geometry })` to repeat it.

## Camera grammar

One move per vignette, as in the reference style. Each is a kit helper, called as `kit.<move>(camera, t,
opts)` inside `update(t)`, that eases between a start and an end pose over `dur` seconds.

| Move | Use |
|---|---|
| `drone` | Slow push-in over landscape or sea. The default opening move for a place. |
| `orbit` | Circles a subject, such as a ship or a lock. |
| `track` | Lateral slide along a line, such as a ship passing or a row of workers. |
| `topdown` | Looking straight down, for plans, locks, and routes. |
| `ground` | Low dolly at eye level, for scale and people. |
| `crane` | Rise from low to high, for a reveal. |

Set `dur` to the vignette length so the move ends as the cut arrives. Keep every hero above the caption band.

## Caption rules

- One cue holds one unit. A unit is a syllable or one compound from the COMPOUNDS lists in
  `scripts/karaoke.py`. The theme adds `kênh đào`, `Trái Đất`, `con tàu`, `công trình`, `đại dương`,
  `con người`, `kỹ sư`, `mặt nước`, `cửa âu`, and `đường sắt`. Add a compound there when its two syllables
  must read as one word.
- A cue is never boxed or scaled. It is white, heavy, rounded sans with a thin dark outline and a soft
  shadow, centered at 52% of the frame height, in title case.
- Numbers and labels belong in the top zone: a `callout` near y 260 and `pill` labels attached to 3D points.
  The caption band, about y 918 to 1078, stays clear of heroes and overlays.
- The watermark sits at the top left, at y 184.

## Sound map

Terra3d has no sound on cuts. It gets no swoosh on the cuts between vignettes and none on the seams into
the CTA and the end card. The one house cue is the thud at 0 s. Ambience is the sound of a place, mixed under
its vignette, and the music bed stays under the voice as in every theme.

No audio file is bundled. Each project downloads its own ambience through the bundled `freesound` skill, after
the author approves each sound:

- Filter every search to CC0 with `--license cc0`. A sound from any other license is not used on this theme.
- Download with `download-preview`, first without `--yes` to read the plan, then with `--yes` once the author
  approves. Save under `assets/audio/freesound/`.
- Keep `assets/audio/freesound/ATTRIBUTION.md` and `attribution.json` with the project. CC0 needs no credit
  on screen, but the record of each sound's ID, creator, and license is kept for every download.
- Prefer a file at least as long as the longest vignette that uses it. A shorter file is looped without a
  crossfade, so choose one that loops cleanly.

```bash
FS="<freesound skill>/scripts/freesound.js"
node "$FS" search "<query>" --license cc0 --duration-min 6 --limit 10
node "$FS" sound <id>
node "$FS" download-preview <id> --quality hq --format mp3 --output assets/audio/freesound
```

Each ambience category has a Freesound query and a gain category. The queries are starting points; judge each
result by ear and by `sound <id>`.

| Ambience | Freesound query | Gain category | Fits |
|---|---|---|---|
| `ocean` | `ocean waves open sea` | medium | Ships, globe-to-sea, fleets |
| `rain` | `heavy rain outdoors` | medium | Storm over terrain, excavation in rain |
| `jungle` | `jungle ambience birds insects` | soft | Tropical terrain, mosquito swarms |
| `wind` | `wind outdoors steady` | soft | Drone shots over land, exposed ridges |
| `water-rush` | `water rushing flooding channel` | strong | Lock chambers filling, spillways |
| `machinery` | `heavy machinery diesel engine` | medium | Excavation, cranes, construction |
| `crowd` | `crowd murmur outdoors distant` | soft | Workers, towns, ports |
| `train` | `train passing rails` | medium | The locomotive, mule track |

Name the file in `vignettes.json`. The vignette does not need a sound; the field is optional.

```json
{ "id": "rain", "anchor": { "sentence": 4, "word": "Đầu tiên" },
  "ambience": { "file": "assets/audio/freesound/rain-123456.mp3", "gain": "medium" } }
```

`build.py` stops with `vignettes.json missing ambience file` when the file is not in the project, and with
`vignettes.json invalid ambience` for an unknown gain category. The ledger copies the field.
`scripts/add-sfx.py` mixes each file looped under its vignette span into the effects premix, with a 0.25 s
fade in and out. Neighbouring vignettes that name the same file and category are one span, so the loop does not
restart or dip at the cut between them.

Gains follow the model in [audio-mix.md](../audio-mix.md): `gain = 10 ^ ((target dB - file mean dB) / 20)`,
computed by `add-sfx.py` from the measured mean of each file. The category sets the target:

| Category | Target mean level | Relative to the bed at -33 dB |
|---|---|---|
| `soft` | -42 dB | 9 dB under |
| `medium` | -39 dB | 6 dB under |
| `strong` | -36 dB | 3 dB under |

With the voice at -21 LUFS, every category sits at least 15 dB under the voice and under the bed.

## Checks

From a scene-flow source checkout, run the layout and determinism check on a built project:

```bash
CHROME_PATH="<path-to-chrome-headless-shell>" node "<checkout>/tests/terra3d-check.mjs" "<project>"
```

It scans for banned APIs, seeks each vignette out of order and compares frame hashes, rejects blank frames,
checks heroes and overlays against the caption band, watermarks, and the frame edge, and fails on console
errors. `TERRA3D_CHECK_SCALE` sets the capture scale and defaults to 0.5. Image quality and timing against the
voice still need a contact sheet and a human viewer:

```bash
npx --yes hyperframes@0.8.140 snapshot --at "<t1>,<t2>" --no-end --timeout 170000 -o snapshots/terra3d
```

Render with the hardware GPU and check that the second line of the render summary says `hardware gpu`:

```bash
npx --yes hyperframes@0.8.140 render "<project>" --browser-gpu --player-ready-timeout 180000 -o out.mp4
```
