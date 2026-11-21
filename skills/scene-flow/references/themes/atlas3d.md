# Atlas3d theme

Atlas3d builds a sequence of short 3D vignettes for narrated vertical shorts (1080x1920) on an old-style cartographic stage. Each vignette represents one idea from the script, starting on a spoken word and ending where the next vignette begins. Vignettes share a parchment world map with smooth camera pans between map scenes, alongside photo backdrop scenes for off-map visuals. Select it with `--theme atlas3d` when creating a project.

## When to pick atlas3d

Pick atlas3d for narrated history, geography, geopolitics, and economics shorts told on a map.

Key visual elements:
- Parchment world map stage with Natural Earth shaded relief and delta-encoded country boundaries.
- Country territories raised as 3D slabs with black ink outlines, and custom historical polygons rendered as flat, stencil-clipped overlays slightly above land that fade in.
- Chibi toon figures standing on the map or backdrop floor with keyframed gestures and facial expressions.
- Six built-in historical and narrative props.
- Classic serif DOM labels projected from 3D coordinates.
- Photo backdrop scenes with directional shadows for paintings, documents, and portraits.
- Short white phrase captions without word-by-word highlighting.
- Light adventure pizzicato music bed and cartographic sound effects (pen scribbles, coins, drum hits).

## Create and build a project

Create the project from the skill directory. Pass a voice recording with `--voice` to prepare it during project creation.

```bash
python3 "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme atlas3d
cd "<folder>"
```

The project root receives `vignettes.json`, a `vignettes/` directory containing the nine vignette modules of the Louisiana Purchase 1803 sample (`deal.js`, `france.js`, `haiti.js`, `britain.js`, `neworleans.js`, `offer.js`, `treaty.js`, `louisiana.js`, `today.js`), the sample `SCRIPT.md`, `backdrops/` with the sample backdrop image, the local Three.js runtime with line addons, map data in `assets/atlas3d/map/`, the atlas3d kit in `assets/atlas3d/kit/`, and audio files in `assets/audio/`.

Run the alignment pipeline to generate `syl-times.json`:

```bash
python scripts/asr.py small
python scripts/plan-beats.py
python scripts/align-asr.py
python scripts/syl-times.py
python scripts/fix-syl.py
bash scripts/make.sh
```

`scripts/build.py` validates `vignettes.json` and declared regions, resolves all anchors and beats against `syl-times.json`, and prints the vignette table. For the shipped sample with its recorded 58.48 s voice it reads:

```text
atlas3d vignette table:
  vignette | kind  | in    | anchor                    | start | end
  deal     | map   | cut   | (film start)              |  0.00 |  4.40
  france   | map   | pan   | sentence 2: Người         |  4.40 | 12.44
  haiti    | map   | pan   | sentence 5: Nhưng         | 12.44 | 15.32
  britain  | map   | pan   | sentence 6: Chiến         | 15.32 | 17.18
  neworleans | map   | pan   | sentence 7: Tổng          | 17.18 | 23.50
  offer    | backdrop | cut   | sentence 9: Napoleon      | 23.50 | 31.50
  treaty   | map   | cut   | sentence 12: Hiệp         | 31.50 | 37.32
  louisiana | map   | pan   | sentence 14: Nước         | 37.32 | 47.36
  today    | map   | pan   | sentence 18: Vùng         | 47.36 | 58.24
```

Do not run `scripts/build.py` alone; `bash scripts/make.sh` runs the build, captions, seam stamp, and sound cues.

## `vignettes.json` structure

The root JSON object requires a `vignettes` list and an optional `regions` list.

```json
{
  "regions": [
    {
      "id": "fra",
      "label": "Pháp",
      "countries": ["FRA"]
    },
    {
      "id": "sample-triangle",
      "label": "Vùng mẫu",
      "polygon": [[-4.5, 40.5], [1.5, 40.5], [-1.5, 45.0]],
      "source": "USGS National Atlas, Territorial Acquisitions"
    }
  ],
  "vignettes": [
    {
      "id": "intro",
      "kind": "map",
      "beats": { "fill": { "sentence": 1, "word": "bản" } },
      "sfx": { "fill": "pen" }
    },
    {
      "id": "outro",
      "kind": "map",
      "anchor": { "sentence": 2, "word": "Đây" },
      "in": { "kind": "pan", "dur": 1.0 }
    },
    {
      "id": "scene",
      "kind": "backdrop",
      "image": "backdrops/sample.webp",
      "anchor": { "sentence": 3, "word": "Hãy" },
      "in": { "kind": "cut" }
    }
  ]
}
```

### Regions schema

Regions declare map territories. Each entry in `regions` has the following fields:

| Field | Type | Rule |
|---|---|---|
| `id` | string | Matches `[a-z0-9][a-z0-9_-]*` (starts with a lowercase letter or digit, followed by lowercase letters, digits, `-`, or `_`). Unique across all regions. |
| `label` | string | Optional metadata string (validated as a string if present). Region construction does not draw it; text appears only through `kit.map.label(target, text, opts)`. |
| `countries` | array | Non-empty list of ISO 3166-1 alpha-3 uppercase country codes (e.g. `["FRA"]`). Checked against `assets/atlas3d/map/index.json`. Mutually exclusive with `polygon`. |
| `polygon` | array | List of at least 3 `[lon, lat]` number pairs. Longitude must be in `[-180, 180]`; latitude must be in `[-90, 90]`. Mutually exclusive with `countries`. Clipped to land via WebGL stencil pass. |
| `source` | string | Required when `polygon` is used. Non-empty string citing the historical source or map record. |

Each region requires exactly one of `countries` or `polygon`.

### Vignettes schema

Vignettes play in list order:

| Field | Type | Rule |
|---|---|---|
| `id` | string | Matches `[a-z0-9][a-z0-9_-]*` (starts with a lowercase letter or digit, followed by lowercase letters, digits, `-`, or `_`). The module file is `vignettes/<id>.js`. Ids are unique. |
| `kind` | string | Vignette kind: `"map"` (default) or `"backdrop"`. |
| `image` | string | Required when `kind` is `"backdrop"`. Relative path to an existing image inside the project (e.g. `"backdrops/sample.webp"`). |
| `anchor` | object | `{ "sentence": n, "word": "..." }`. The vignette starts when that word is spoken. The first vignette has no anchor and starts at 0.0. Subsequent anchors must resolve strictly in increasing time order and before the CTA scene start. |
| `beats` | object | Optional map of beat name to `{ "sentence": n, "word": "..." }`. Each beat must resolve within its vignette (`v.t <= t < v.end`). Modules read beat offsets in seconds via `kit.beat(name)`. |
| `in` | object | `{ "kind": "cut" \| "pan", "dur": seconds }`. Default kind is `cut`. Duration is between 0.3 and 2.0 seconds (default 1.0 for `pan`, 0.3 for `cut`). |
| `sfx` | object | Optional map of beat name to sound cue identifier. `build.py` checks `[a-z0-9-]+`, and `add-sfx.py` accepts only `thud`, `swoosh`, `pop`, `laser`, `click`, `pen`, `coins`, or `drum`. Each key must name a beat defined in `beats`. |

The last vignette ends when the CTA scene starts. The CTA starts at the latest of 17.5 s, 2.5 s after the last vignette starts, and 0.3 s after the last spoken syllable in `syl-times.json`.

## Transitions

| Kind | Behavior | Build rule |
|---|---|---|
| `cut` | Hard cut on the anchor word. | The voiceover must contain a quiet 20 ms window below -45 dBFS in the 0.4 s window before the anchor. |
| `pan` | Camera eases smoothly from the previous vignette's end pose toward the incoming vignette's camera pose at the current local time (`time - v.t`), not its frozen initial pose. To hold the incoming vignette's initial pose throughout the pan, delay its `kit.move(...)` with `{ start: <panDur> }` (or keep `camera` at `startPose` while `t < panDur`). | Both the incoming and outgoing vignettes must have `kind: "map"`. Pan cannot start or end on a `backdrop`. Duration must be at most 60% of the incoming vignette duration. |

Each `pan` transition automatically triggers a `swoosh` sound cue at `v.t`, unless the cut point lands within 0.05 s of an existing scene seam.

## Map events and absolute-time semantics

The shared map object (`map.js`) is constructed once at setup and updated continuously. Map state depends strictly on absolute video time `T`:

```javascript
map.update(T, camera);
```

Because `update(T, camera)` evaluates all visual states directly from `T`, seeking forward or backward produces identical pixels and DOM label positions.

Vignette modules access the shared map via `kit.map`, which automatically offsets local vignette time `t` to absolute video time `T = v.t + t`:

| Method | Arguments | Behavior |
|---|---|---|
| `kit.map.fill(regionId, opts)` | `regionId, { at, dur, color, persist }` | Fills a declared region with a toon material. `at` defaults to 0 (vignette start). `dur` defaults to 0.4. `color` is a palette name or hex string. `persist` defaults to `true` (stays filled for subsequent vignettes). |
| `kit.map.label(target, text, opts)` | `target, text, { at, dur, offset, persist }` | Places a serif DOM label. `target` is a region id or `[lon, lat]` array. `offset` is a `[dx, dy]` pixel offset. `persist` defaults to `false` (hidden when the vignette ends). |
| `kit.map.route(points, opts)` | `points, { at, dur, color, linewidth, persist }` | Animates a golden glowing route along `[lon, lat]` coordinates. `linewidth` defaults to 5. `persist` defaults to `true`. |

## Camera helpers

The kit provides dedicated helpers for positioning and moving the camera:

| Helper | Signature | Description |
|---|---|---|
| `kit.view` | `kit.view(lon, lat, zoom, tilt)` | Computes camera position and quaternion oriented toward `[lon, lat]`. `tilt` is in degrees from top-down (typically 18 to 22). `zoom` scales distance (typically 0.8 to 1.2). Automatically offsets the target southward by `0.045 * distance` so territories remain centered above the bottom caption band. |
| `kit.applyView` | `kit.applyView(camera, viewPose)` | Immediately applies position and quaternion from `kit.view` to the camera. |
| `kit.move` | `kit.move(camera, t, fromPose, toPose, dur, opts)` | Smoothly eases the camera from `fromPose` to `toPose` over `dur` seconds using `kit.ease`. Local start offset is configurable via `opts.start`. |
| `kit.camera` | `kit.camera(fov = 35)` | Creates a perspective camera configured for 1080x1920 portrait framing. |
| `kit.lonLatToWorld` | `kit.lonLatToWorld(lon, lat, y = 0.08)` | Converts longitude and latitude coordinates into 3D world space coordinates (default `y = LAND_H = 0.08`, the base land surface). |

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
- atlas3d: build with `kit.look.toonMaterial` and outline each mesh with
  `kit.look.addToonWithHull`. Keep chibi proportions, head about one third of the height. Set
  `group.userData.atlasHero = true` and call `kit.hero({ group })` inside the factory so the
  layout check sees it. Pop in with `kit.place` and `kit.popWindow`.

## Sample models

The starter project ships agent-built models in `vignettes/<name>/`. They show the house style; a
new video copies them, extends them, or builds its own.

| Model | Factory | Notes |
|---|---|---|
| `townsfolk` | `townsfolk(kit, opts)` | Chibi character. `role`: `king`, `soldier`, `merchant`, `diplomat`, `farmer`. `expression`: `neutral`, `smile`, `angry`, `shocked`. `gesture`: `idle`, `wave`, `point`, `hold`, `shrug`. |
| `trade-ship` | `tradeShip(kit, opts)` | Schooner with fore-and-aft sails, so the sails read side-on. |
| `cargo-crate` | `cargoCrate(kit, opts)` | Wooden freight crate. |
| `coin-sack` | `coinSack(kit, opts)` | Cloth money sack with a tied neck. |
| `price-tag` | `priceTag(kit, opts)` | Hanging tag; `opts.text` is drawn on a canvas texture. |
| `map-arrow` | `mapArrow(kit, opts)` | Extruded arrow with an ink outline. |

Every sample model takes `position`, `rotationY`, `scale`, `at`, `popDur`, `outAt`, and `outDur`,
registers itself as a hero, and exposes `group` and `update(t)`. Call `model.update(t)` inside the
vignette `update(t)`.

```javascript
import { townsfolk } from "./townsfolk/townsfolk.js";

const diplomat = townsfolk(kit, {
  role: "diplomat",
  expression: "neutral",
  gesture: "point",
  position: kit.lonLatToWorld(3.9, 46.8, 0.145),
  rotationY: -0.28,
  at: 0.65,
  outAt: 5.45,
});
```

### River path

`kit.riverPath(opts)` is part of the theme, not a model, because it draws on the map itself. It
ignores `position` and `popDur`, builds its path from `points` (`[lon, lat]` at height
`y = LAND_H + 0.022` when `space` is `"lonlat"`, or `[x, y, z]` when `space` is `"world"`), and
draws along the curve from `at` over `dur` seconds, default `1.4`. It supports `rotationY`,
`scale`, `outAt`, `outDur`, `color`, `glowColor`, and `linewidth`, default `6`.

## Backdrop vignettes

Backdrop vignettes (`kind: "backdrop"`) render off-map scenes such as historical paintings, landscape photos, or document plates.

Setup:
- Declare `"kind": "backdrop"` and `"image": "backdrops/<filename>.webp"` in `vignettes.json`.
- In the vignette module, initialize the backdrop with `kit.backdrop(scene, { image: kit.image })`.
- `backdrop.js` constructs a vertical photo plate (`PlaneGeometry(5.6, 10.0)`), a shadow-receiving ground floor at `y = 0` (`THREE.ShadowMaterial`), a shadow-casting directional light (`castShadow = true`), and a hemisphere fill light.
- Figures and props placed at `y = 0` cast soft directional shadows onto the floor.
- Transitions into or out of backdrop vignettes must use `in: { "kind": "cut" }`. `build.py` rejects `pan` transitions on backdrop vignettes.
- Use `kit.dolly` to move the camera across the backdrop scene.

## Captions

Captions are generated by `scripts/karaoke.py` using theme-specific configuration:
- Container `#kara .kc` is positioned 523 px from the bottom of the 1080x1920 frame (line center near y 1363 px).
- Settings: `maxu: 4` (word units per card), `maxc: 24` (maximum characters per card).
- `highlight: False`: whole phrases appear in white (`#FFFFFF`) with dark shadow (`DHALO`). Word-by-word highlight coloring is disabled.
- Figures, props, and DOM labels must remain clear of the caption band.

## Sound cues and the bed

Audio is mixed by `scripts/add-sfx.py`:

### Music bed
- Track: `assets/audio/bgm-pizzicato.mp3` ("Short Pizzicato Song" by DanJFilms, CC0).
- Level: -33 dB target (gain `0.305`).
- Looping: `LOOP_BED = True`. Films longer than 56.3 s loop seamlessly with `LOOP_OVERLAP = 5.0` s under the track's quiet tail.

### Sound cues
- Every `pan` transition triggers a `swoosh` cue at `v.t` (gain 0.70, duration 1.12 s), unless within 0.05 s of an existing seam.
- Vignette beats declared in `sfx` map beat names to sounds:
  - `pen`: Scribble sound (CC0, gain 6.5, duration 1.19 s). Limit: one pen sound peaks at 0.25; three simultaneous pen cues reach 0.76 peak, but four reach 1.0+ and trip the premix peak assertion in `add-sfx.py`. Keep simultaneous pen cues to at most three.
  - `coins`: Coin dropping sound (CC0, gain 0.89, duration 2.26 s).
  - `drum`: Timpani hit (CC0, gain 0.90, duration 2.99 s).
  - Standard cues: `thud` (0.30), `swoosh` (0.70), `pop` (0.40), `laser` (0.55), `click` (0.60).

## Browser checker

Run the layout and determinism check from a scene-flow checkout:

```bash
CHROME_PATH="<path-to-chrome-headless-shell>" node "<checkout>/tests/atlas3d-check.mjs" "<project>"
```

The check verifies:
1. Ban scan: Scans `vignettes/` and `assets/atlas3d/kit/` for non-deterministic APIs.
2. Build ready: Waits for `window.__hf.buildReady.atlas3d` within 180 s.
3. Seeks and determinism: Seeks vignettes out of order and compares frame hashes (`first === again`).
4. Transition stability: Checks `cut` and `pan` frames under forward and reverse seeking.
5. `mapOrder`: Verifies that forward and reverse seeks across all map timestamps produce identical WebGL pixels and DOM label bounding boxes.
6. `mapColors`: Asserts that filled regions produce distinct screen colors from unfilled land (`|dr|+|dg|+|db| >= 30`).
7. `mapLabels`: Asserts that serif DOM map labels remain visible, stay inside the 24 px frame margin, and do not touch captions or watermarks.
8. `heroAudit`: Ensures all figures and props are declared in `hero` and remain clear of captions, watermarks, and 24 px margins.
9. `figureSeek`: Poses a figure mid-gesture and verifies deterministic world matrices on reverse seek.
10. Deadline check: Ensures backdrop load timeouts are handled cleanly.

A passing check prints:

```text
ATLAS3D CHECK: PASSED
```

## Authoring rules and forbidden APIs

Every frame must be a pure function of local time `t`. Vignette modules must not store state between calls.

Forbidden APIs (rejected by `build.py` and `atlas3d-check.mjs`):
- `random`, `Date`, `performance`
- `requestAnimationFrame`, `setAnimationLoop`, `setTimeout`, `setInterval`
- `Clock`, `Timer`, `getDelta`
- `GlitchPass`, `FilmPass`
- `fetch`, `XMLHttpRequest`, `WebSocket`, and network URLs (`http:`, `https:`, `ws:`, `wss:`)

Use `kit.rand(seed)` for seeded pseudo-random numbers.

Placement guidelines:
- Placement heights: sea sits at `y = 0` (place sea props such as ships at `y = 0.015`); base land sits at `LAND_H = 0.08` (the `kit.lonLatToWorld` default, with polygon overlays at `0.085` and borders at `0.084`/`0.087`, so place base-land markers around `y = 0.09`); raised country slabs sit at `LAND_H + FILL_H = 0.13` with outlines at `0.134` (place figures and props on filled countries at `y = 0.145` to avoid z-fighting).
- Keep figures and props above y 1360 px to avoid intersecting captions.

## Common build errors quoted verbatim from build.py

`build.py` validates `vignettes.json` and raises `SystemExit` with exact error strings. Common errors include:

- `vignettes.json load failed: <detail>`
- `vignettes.json invalid schema: vignettes must be a non-empty list`
- `vignettes.json invalid id: entry %d needs an id of lowercase letters, digits, - or _`
- `vignettes.json duplicate vignette id: <id>`
- `vignettes.json invalid anchor: '<id>' is the first vignette, which starts at 0; remove its anchor`
- `vignettes.json invalid anchor: '<id>' <what> needs a positive sentence and a word`
- `vignettes.json invalid beats: '<id>' beats must be an object of name -> anchor`
- `vignettes.json invalid transition: '<id>' in.kind must be one of cut, pan`
- `vignettes.json invalid transition: '<id>' in.dur must be between 0.3 and 2.0 seconds`
- `vignettes.json invalid transition: '<id>' is the first vignette; a pan needs a map vignette before it`
- `vignettes.json invalid kind: '<id>' kind must be map or backdrop`
- `vignettes.json invalid backdrop: '<id>' image '<image>' must be an existing file inside the project`
- `vignettes.json invalid sfx: '<id>' sfx must be an object of beat -> sound`
- `vignettes.json invalid sfx: '<id>' sfx '<name>': sound must match [a-z0-9-]+`
- `vignettes.json invalid sfx: '<id>' sfx '<name>' names no beat of this vignette`
- `vignettes.json missing vignette module: '<id>': vignettes/<id>.js`
- `vignettes.json banned API: <file>:<line> uses '<pattern>'; frames must depend on seek time only`
- `vignettes.json anchors not strictly increasing in time: '<id>' at <time> is not after <prev>`
- `vignettes.json anchor at or after cta scene start: '<id>' resolves to <time>; cta starts at <cta>`
- `vignettes.json beat outside its vignette: '<id>' beat '<name>' at <time> is outside <start>-<end>`
- `vignettes.json pan with backdrop: '<id>' pans between '<prev>' and '<id>'; pan needs two map vignettes`
- `vignettes.json pan too long: '<id>' pan of <dur>s exceeds 60% of its vignette (<len>s)`
- `vignettes.json cut outside silence: '<id>': no quiet 20 ms window in the 0.4 s before <time>; move the anchor or use another transition`
- `vignettes.json invalid regions: regions must be a list`
- `vignettes.json invalid region id: region %d needs an id of lowercase letters, digits, - or _`
- `vignettes.json duplicate region id: <id>`
- `vignettes.json invalid region: '<id>' label must be a string`
- `vignettes.json invalid region: '<id>' needs exactly one of countries or polygon`
- `vignettes.json invalid region: '<id>' countries must be a non-empty list`
- `vignettes.json unknown country code: '<id>': '<code>' is not in assets/atlas3d/map/index.json`
- `vignettes.json invalid polygon: '<id>' needs at least 3 [lon, lat] points`
- `vignettes.json invalid polygon: '<id>' points must be [lon, lat] pairs of numbers`
- `vignettes.json invalid polygon: '<id>' point <point> is out of range`
- `vignettes.json missing source: '<id>' polygon needs a non-empty source`

## Complete examples

### `vignettes.json`

The following complete configuration defines two map scenes and one backdrop scene. It anchors to sentence 1 beat `"bản"`, sentence 2 `"Đây"`, and sentence 3 `"Hãy"` of a three-sentence script:

```json
{
  "vignettes": [
    {
      "id": "intro",
      "kind": "map",
      "beats": {
        "fill": { "sentence": 1, "word": "bản" }
      },
      "sfx": {
        "fill": "pen"
      }
    },
    {
      "id": "outro",
      "kind": "map",
      "anchor": { "sentence": 2, "word": "Đây" },
      "in": { "kind": "pan", "dur": 1.0 }
    },
    {
      "id": "scene",
      "kind": "backdrop",
      "image": "backdrops/sample.webp",
      "anchor": { "sentence": 3, "word": "Hãy" },
      "in": { "kind": "cut" }
    }
  ],
  "regions": [
    {
      "id": "fra",
      "label": "Pháp",
      "countries": ["FRA"]
    },
    {
      "id": "sample-triangle",
      "label": "Vùng mẫu",
      "polygon": [[-4.5, 40.5], [1.5, 40.5], [-1.5, 45.0]],
      "source": "placeholder for validation and stencil-clip test; replace with a sourced boundary"
    }
  ]
}
```

### Vignette module: `vignettes/intro.js`

The module exports `build(kit)`. It places the shared map, two `townsfolk` characters, and three object models in the scene:

```javascript
// Sentence 1: shared parchment map focusing on France, with two characters and three objects on the vignette's layer.
import { townsfolk } from "./townsfolk/townsfolk.js";
import { tradeShip } from "./trade-ship/trade-ship.js";
import { cargoCrate } from "./cargo-crate/cargo-crate.js";
import { coinSack } from "./coin-sack/coin-sack.js";

export function build(kit) {
  const { THREE } = kit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(kit.PALETTE.sea);
  kit.look.lights(scene);
  scene.add(kit.map.group);

  const camera = kit.camera(35);
  const startPose = kit.view(2.3, 46.8, 0.85, 22);
  const endPose = kit.view(2.3, 46.5, 0.95, 20);
  kit.applyView(camera, startPose);

  const fillAt = kit.beat("fill");
  kit.map.fill("fra", { at: fillAt, dur: 0.45, color: "blue" });
  kit.map.label([2.3, 49.0], "Pháp", { at: 0.25, dur: 0.35, offset: [0, -18] });

  const layerGroup = new THREE.Group();
  scene.add(layerGroup);

  const king = townsfolk(kit, {
    role: "king",
    expression: "smile",
    gesture: "wave",
    scale: 1.0,
    position: kit.lonLatToWorld(0.6, 46.8, 0.145),
    rotationY: 0.22,
    at: 0.45,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });
  const diplomat = townsfolk(kit, {
    role: "diplomat",
    expression: "neutral",
    gesture: "point",
    scale: 0.98,
    position: kit.lonLatToWorld(3.9, 46.8, 0.145),
    rotationY: -0.28,
    at: 0.65,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });

  const ship = tradeShip(kit, {
    position: kit.lonLatToWorld(-2.4, 45.6, 0.015),
    rotationY: 0.6,
    scale: 1.15,
    at: 0.7,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });
  const crate = cargoCrate(kit, {
    position: kit.lonLatToWorld(0.4, 45.2, 0.145),
    rotationY: 0.35,
    scale: 0.95,
    at: 0.85,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });
  const bag = coinSack(kit, {
    position: kit.lonLatToWorld(4.1, 45.4, 0.145),
    rotationY: -0.25,
    scale: 1.0,
    at: 1.0,
    popDur: 0.45,
    outAt: 5.45,
    outDur: 0.35,
  });

  layerGroup.add(king.group, diplomat.group, ship.group, crate.group, bag.group);

  function update(t) {
    kit.move(camera, t, startPose, endPose, 4.5);
    king.update(t);
    diplomat.update(t);
    ship.update(t);
    crate.update(t);
    bag.update(t);
  }

  return {
    scene,
    camera,
    update,
    hero: [king.group, diplomat.group, ship.group, crate.group, bag.group],
  };
}
```
