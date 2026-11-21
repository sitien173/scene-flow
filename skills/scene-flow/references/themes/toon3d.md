# Toon3d theme

Toon3d shows short 3D explainers in a toon look: thin black ink outlines, flat pastel shading, grey concrete
ground, and a high three-quarter camera. Each sentence is one 3D vignette. The sample project is a 33.5 s demo
on a solar topic. It runs one continuous camera with no hard cut inside the sequence, and the kit parts from
the reference video are all on screen.

Use toon3d when the topic is a physical process or object that a viewer must see from above: building,
installing, wiring, or maintaining equipment. Do not use it for abstract or data topics. Use neon3d or cleanui
for those.

## Identity

- **Look.** Toon-shaded materials with a three-band violet ramp, black ink on every silhouette and crease
  (`ink()`, 0.014 units on the sample models, 2 to 3 px at 1080 px, against the reference's 2 px median), and violet cast shadows (`shadows()`, `#7E72B4`). Solar panels
  carry a blue cell grid drawn on a canvas. `assets/toon3d/kit/look.js` holds the palette, the `toon()`
  material, the `ink()` outline, and the ground.
- **Ground.** `concreteTexture()` gives a rough grey concrete (`#DDDAD0`, seeded noise). `road()` gives a flat
  street strip (`#888C91`) with a white dashed centre line for exterior framing.
- **Camera.** Portrait 1080 x 1920, vertical fov 36. See "Camera grammar".
- **Stage.** A flat pastel sky colour (`#CFE6F2`) behind the ground, with no environment map.
- **Provisional.** Palette values, outline width, shadow colour, and the sky band are first-pass choices.
  The palette keeps the SPEC values for wall and sky. Sampled reference frames differ slightly; see "Gaps
  against the reference". The author tunes these after the first preview.

## Create and build a project

```bash
python3 "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme toon3d
cd "<folder>"
```

The project root gets `vignettes.json`, a `vignettes/` folder with one module per vignette and its models,
and a sample `SCRIPT.md` about solar power. The sample has one vignette, `roof`, of 33.46 s. Replace the script,
vignettes, and beats with your own. The `# Từ khóa phụ đề` block in the sample is the emphasis list; keep it.

Run `scripts/make.sh` after every change in `parts/` or `vignettes/`. Preview with `npx hyperframes snapshot`
before rendering, as in [verification.md](../verification.md).

## vignettes.json structure

The sample `vignettes.json`, as shipped:

```json
{
  "vignettes": [
    {"id": "roof",
     "beats": {
       "panel": {"sentence": 1, "word": "tấm pin"},
       "cable": {"sentence": 2, "word": "dây"},
       "series": {"sentence": 3, "word": "nối tiếp"},
       "tenx": {"sentence": 4, "word": "Chín"},
       "rain": {"sentence": 5, "word": "mưa"},
       "ripple": {"sentence": 5, "word": "nước"},
       "tilt": {"sentence": 6, "word": "nghiêng"},
       "close": {"sentence": 7, "word": "Nhờ"}
     },
     "sfx": {"panel": "pop", "cable": "click", "series": "pop", "tenx": "laser",
             "rain": "pop", "ripple": "click", "tilt": "pop", "close": "laser"}}
  ]
}
```

- `id` names the module `vignettes/<id>.js`. Ids are lowercase letters, digits, and underscores.
- `anchor` is the first word of the vignette. The first vignette starts at 0.00 and has no anchor.
- `in` is `{"kind": "cut"}`. Toon3d has hard cuts only between vignettes. A vignette shorter than 1.0 s is an error.
- `beats` names moments inside the vignette. Each beat resolves to the start time of the named word, and
  `kit.beat(name)` returns it in seconds.
- `sfx` maps a beat name to a sound: `pop`, `click`, or `laser`. Each sound plays once at its beat. Any other
  name is an error. A `sfx` key must name a beat of the same vignette.
- `ambience` is not used by toon3d. The house bed plays under the whole video.

`build.py` checks these rules and prints the vignette table. Errors name the vignette and the rule.

## Vignette modules

Each module exports `async function build(kit)` and returns `{ scene, camera, update, hero }`.
`update(t)` must be a pure function of `t`. The renderer calls it at seek time, so state carried between calls is a bug.

The sample `vignettes/roof.js` is the reference for every kit part. Read it before writing a new vignette.

## Kit contract

`createKit({ id, beats, layer })` gives each vignette:

| Member | Use |
|---|---|
| `stage()` | async; returns the lit toon scene with the ground |
| `camera(fov)` | portrait `PerspectiveCamera`, default fov 36 |
| `beat(name)` | seconds from the vignette start to a named beat; throws on an unknown name |
| `toon(color, map)`, `ink(object, width)` | the toon material and the outline |
| `concreteTexture()`, `road({ z0, depth })` | the concrete ground map and the street strip |
| `iso`, `push`, `orbit`, `whip`, `dolly`, `crane`, `chain` | the camera moves; `chain` is the whip sequence |
| `shadows(object)`, `panelTexture()` | cast and receive shadows; the blue panel cell map |
| `popIn(items, t, dur)` | panel pop-in: each `{ mesh, start }` grows from zero at its start |
| `counter({ anchors, start, step, end, badge, badgeAnchor, badgeOffset, badgeStart, badgeEnd })` | one DOM number per anchor, appearing every `step` s, and a yellow multiplier badge |
| `cableLights({ points, bulbs, start, step })` | striped cable with bulbs that light in sequence |
| `rain({ box, start, ... })` | falling white streaks in a box |
| `ripples({ center, spread, y, start, debris, ... })` | expanding rings on a surface, with optional debris chips |
| `sun({ right, up, dist, ... })` | a sun disc with rays in a fixed corner of the frame |
| `pill({ text, at, offset, start, end })` | the white callout label at 62 px, with a leader and a dot at `at` |
| `flash({ at, frames, fps, color })` | one full-frame violet frame; optional |
| `updateOverlays(t, camera)` | advance every pill and flash of the vignette |
| `projectPoint(pos, camera)` | screen point of a world point |
| `PALETTE`, `ease`, `progress`, `pop`, `lerp`, `clamp01` | colours and motion helpers |
| `rand(seed)` | seeded generator; the only allowed randomness |
| `loadGlb`, `validateClip`, `cloneGlb`, `clipPose` | GLB helpers from the shared kit; no toon3d sample uses them |

## Kit effects

Each entry names the reference measurement it follows. Frame times are in
`research/theme-toon3d/SHOTS.md` and `research/theme-toon3d/SPEC.md`.

- **Striped cable with bulbs** (`cableLights`). Black and yellow bands along a tube, with bulbs that light one
  after another, `step` seconds apart, from `start`. A lit bulb stays lit. The demo has 12 bulbs on a 6 m run,
  0.55 m apart, drawn from the first whip (not before it), and lights them from the `cable` beat with `step` 0.2 s.
  The 7.3 s whip pose sits 8.0 m from the cable, which puts the bulb spacing near the measured lamp spacing of about
  185 px. Reference: the cable with bulbs at about 6 to 9 s on the 1 fps grid.
- **Numbered panel counter** (`counter`). Each panel gets a white number 1 to 9 on its top face, with the yellow badge
  from `badgeStart` to `badgeEnd`. The numbers are DOM tags, so the edge check covers them, and a number whose anchor
  projects past the 40 px inset is hidden. The demo shows ten panels and a yellow `×10` badge with a dark outline
  from the `tenx` beat to the rain beat. The script says "mười" (ten). Reference: the white numbers and a yellow `×10`
  badge near 18 s.
- **Rain streaks** (`rain`). Thin white streaks that fall and wrap inside `box`. Reference: streaks falling over
  the array from 22.80 s (SHOTS row 3). They fade in over 0.6 s from `start`.
- **Ripple rings with debris** (`ripples`). Flat rings that grow and fade on a surface. With `debris > 0`, each
  ring also throws dark chips on a hop arc once per period. The demo uses pale blue `#8CAFC8` discs, 0.26 m radius,
  aspect 0.92, opacity 1, and 16 brown debris chips per ring. Reference: pale blue pool discs with brown debris from
  24.63 s (SHOTS row 4). Measured at 24.63 s, the largest panel-blue component is 616 px wide in the demo against 800 px
  in the reference.
- **Panel pop-in** (`popIn`). Each panel grows from zero at its own start, 0.2 s apart in the demo.
- **Pill with dot** (`pill`). The reference pill has a leader and a dot at the target point. Pills clamp to 40 px
  from each frame edge using their measured width.
- **Violet flash** (`flash`). One full-frame frame in `#8686A8`. Reference: f3985 at 132.83 s, one frame before the
  whip at f3986 (SHOTS row 33). The demo places it one frame before the last whip, at 29.23 s.
- **Whip sequence** (`chain`). Six whips with the measured frame counts 19, 10, 7, 7, 10, and 9 frames at 30 fps,
  in the same order as the reference's whips at 13.37, 15.93, 22.80, 24.63, 24.97, and 28.57 s. Each whip is
  centred on its beat. The first pose comes from `crane`.

## Models

The kit holds no characters or objects. Each model is a folder under `vignettes/` with a `model.json` and a
factory `.js` file. The sample project ships these:

- `vignettes/house/`: a flat roof with a parapet, two windows, a door, a row of panels on rails, and optional
  inverter. Anchors: `panel`, `rail`, `inverter`.
- `vignettes/panel-array/`: a deck, rows of tilted panels on rails, a black tank, and an optional white
  inverter with a cable. The `roof` vignette uses it with `cols: 5, rows: 2`.
- `vignettes/tree/`: a round toon tree on a brown trunk.
- `vignettes/technician/`: a procedural figure. No sample vignette uses it now; it stays as a model example.

`model.json` fields: `name`, `theme` (must be `toon3d`), `kind` (`character` or `object`), `factory` (the
exported function), `glb` (empty for procedural models), `clips` (empty), `opts` (the defaults passed to the
factory), and `scene_flow_version`. Models that need a new character or object follow the `model-builder`
agent, which writes them to the project and asks the author before saving to the channel library.

## Camera grammar

- The `roof` shot opens on a crane that rises on an arc over 5.5 s, lifted 0.6 m at mid-move.
- Then six whips, `chain` in `camera.js`. Each whip lasts `frames / fps` and is centred on its beat. A pose holds
  until the next whip starts.
- No hard cut inside the sequence. The reference has no hard cut in 0 to 30 s; every spike is a sweep (SHOTS.md).
- `dolly(camera, t, { from, to, look, start, dur, curve })`: eased move, held at `to` after it ends.
- The sample vignettes keep the house and the array inside the portrait frame with the watermarks, pills, and
  captions clear. Moving a camera closer makes the array wider than the frame, and the browser check fails.
  Rerun `tests/toon3d-check.mjs` after any camera change.

## Caption rules

- **Font.** Be Vietnam Pro, weight 800, 84 px, in the top band (`theme.css`). The face is subset for Vietnamese and
  licensed under SIL OFL (see `assets/SOURCES.md`).
- **Ink.** Caption text fill is `#191B1F` with a white stroke (`-webkit-text-stroke` 6 px, `paint-order: stroke fill`,
  so about 3 px shows outside each glyph). Fill `#000000` was the earlier value.
- **Lines of 2 to 4 words.** `karaoke.py` groups each sentence into lines of 2 to 4 words (`maxu` 4, `minu` 2).
  A sentence starts a new line. The reference groups the same way: "với một bóng đèn" and "năng lượng hơn thế"
  are 3 and 4 words.
- **Reveal.** A word shows in grey (`#9AA3AD`) 0.2 s before it is spoken, turns white (`#FFFFFF`) when spoken,
  and the line grows as words arrive.
- **Emphasis.** Words under the `# Từ khóa phụ đề` heading in `SCRIPT.md` turn red (`#DF342C`) when spoken. Use the
  existing list syntax, no new markup:
  - `- Câu 3: nối tiếp` marks the phrase in sentence 3 only.
  - `- nối tiếp` marks every sentence that contains the phrase.
  The list lines are not spoken. `scriptmd.py` and the fixture skip them.
- **Compounds.** Phrases in the karaoke list stay on one unit, for example `mặt trời`, `tấm pin`, and `biến tần`.
- **Callouts.** Labels are not captions. They are white pills at 62 px (the style.md floor for key labels) with
  a dark rim, placed by `kit.pill`. Their text is not timed per word.
- **Provisional.** The keyword rule and the 84 px size are first-pass choices. Check them on the first preview.

## Sound map

Toon3d has no sound on cuts. The house bed is the only background audio, and sound effects come only from
`vignettes.json` beats. The sample cues, from `ledger.json`, are at 3.50 (pop), 7.07 (click), 12.56 (pop), 15.49
(laser), 20.98 (pop), 21.30 (click), 25.51 (pop), and 29.40 s (laser).

| Sound | When | Gain | Source |
|---|---|---|---|
| house bed `bgm-little-things.mp3` | from 0:00, under the voice | 0.219 (~12 dB under voice) | `assets/audio/`, see `assets/SOURCES.md` |
| `pop` | sample: `panel`, `series`, `rain`, `tilt` beats | 0.40 | `assets/audio/sfx-pop.mp3` |
| `click` | sample: `cable`, `ripple` beats | 0.60 | `assets/audio/sfx-click.mp3` |
| `laser` | sample: `tenx`, `close` beats | 0.55 | `assets/audio/sfx-laser.mp3` |

The reference's 0 to 30 s audio is narration. Demucs separation found no music bed to ship: in the narration
gaps the residual decays from -31 to -41 dB and sits at -55 to -63 dB elsewhere. The whip-time bursts overlap
narrated words, so no SFX clip from the reference was shipped. The sample uses only the house sounds above.

## Checks

Run from the repository root:

```bash
python3 tests/toon3d-build-test.py
bash tests/theme-fixture.sh /tmp/sf-check --theme toon3d | tail -1
CHROME_PATH=<chrome-headless-shell> node tests/toon3d-check.mjs <project folder>
```

- The build test covers the cue times and sounds, the emphasis list, the 2 to 4 word caption lines, the
  first-vignette anchor rule, and the ban scan.
- The fixture hash is `c8cb7d1fcdf83832115c0f11b85a9cb951c7e9938eaf9b8034fa3ca4d86870f2`. It is pinned in
  `.github/workflows/ci.yml`. It covers the built `index.html` only, so a change to a vignette module's code does not move it.
- The browser check renders the vignette twice to confirm determinism and rejects blank frames. It sweeps every
  pill rectangle every 0.1 s over the whole timeline and fails any pill within 24 px of a frame edge or outside
  the frame. Captions must stay clear of heroes and pills; every rect must stay clear of the caption band and of
  both watermarks. Round 3 adds a check that no scene line (poles, wires, the array cable once shown) crosses a caption box.
  The cable is not drawn before the first whip, so it is excluded from the line list until then. This rule applies to toon3d only. It needs a local chrome-headless-shell. CI does not run it.

## Gaps against the reference

These are measured or checked against frames. They are not claims of a match.

- Rain streaks in the demo at 22.5 s are faint next to the reference streaks at 22.3 s. Stronger contrast needs an
  author decision on the streak colour and opacity.
- Ripple rings and debris are small in the demo frame at 25.5 s compared with the reference frame at 24.4 s, which
  shows larger rings. This is a visual comparison only; the sizes are not measured.
- The caption and overlay overlap check now covers numbers, badges, dots, pills, and the hero box. The fixed demo has no
  caption overlap in the 0.1 s sweep. The 7.3 s frame shows the counter numbers 1 to 4 under the caption band, not on it.
- The 7.3 s whip pose frames the panel row, not the striped cable. The reference frame at 7.3 s shows the cable with lit
  bulbs in the lower half. The cable pose is a known gap.
- A four-word cap splits phrases in places, for example "điện áp" and "sẽ cộng". The reference splits in similar
  places, but not identically.
- Sampled reference frames give a wall near `#EEC8AE` and a sky near `#B9D7EB`. The palette keeps the SPEC
  values, `#E3C0A9` and `#CFE6F2`. Changing them is an author decision.
- The demo timing file `syl-times.json` is a generated rhythm, not an aligned recording. Replace it with the
  voice's ASR alignment before any preview that claims a sync.
- No reference frame confirms panel pop-in. The kit part is a timing pattern for the demo, not a copy of a measured
  reference motion.
