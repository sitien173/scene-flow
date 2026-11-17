# World3d theme

World3d builds one continuous Three.js scene. Its camera stops follow words in the voiceover. Dark
remains the default theme. Select world3d explicitly when creating a project.

## Create and build a project

Create the project from the skill directory. Pass a recording with `--voice` to prepare it during
project creation.

```bash
python3 "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme world3d
cd "<folder>"
```

Write `SCRIPT.md` as one spoken sentence per line. Run the normal alignment steps to create
`syl-times.json`. Then edit the root `world.json` so each camera stop points to a spoken word or phrase.
Build with `bash scripts/make.sh`. This runs the build, captions, seam stamp, and sound-cue steps.

```bash
python scripts/asr.py small
python scripts/plan-beats.py
python scripts/align-asr.py
python scripts/syl-times.py
python scripts/fix-syl.py
bash scripts/make.sh
```

`scripts/build.py` validates `world.json`, resolves the anchors against `syl-times.json`, and prints a
stop table with each stop id, anchor, and resolved time. Fix any reported anchor or ordering error
before previewing.

## Model kit

The project copies Three.js 0.187.0 locally. It uses no CDN for Three.js. The kit has 30 pieces: 10
code-built pieces and 20 CC0 GLB models. The code-built pieces include ground, block, building, phone,
server, factory, road, data-box, token, and robot. The GLBs include city, road, furniture, space-base,
and expressive-robot models. `assets/world3d/kit.json` is the source of valid kit names and GLB
transforms. The robot registers the `Idle`, `Walking`, and `Wave` clips.

Use the exact `name` from the kit manifest in `world.json`. Licence files are in
[`assets/world3d/LICENSES/`](../../assets/world3d/LICENSES/). Source records and model hashes are in
[`assets/SOURCES.md`](../../assets/SOURCES.md).

## Scene design with 3dviz-pro-max

The `3dviz-pro-max` skill is an optional design aid. Use its recipes and design steps to plan a new
world: which objects appear, their proportions, the light, and the camera framing. Write the result
into `world.json` and, when a new piece is needed, into the kit. Do not copy its kits, rigs, or Vite
scaffold into this theme. They target interactive scenes and may read the clock or random numbers.
Every world3d frame must be computed from the video time alone.

## `world.json` structure

The root object has `objects`, `paths`, and `stops` lists. `objects` and `paths` may be empty. `stops`
must contain at least one entry.

| Entry | Required fields | Optional fields and behavior |
|---|---|---|
| Object | `id`, `kit`, `pos` | `rot`, positive `scale`, hex `color`, and a registered `animation` clip |
| Path | `id`, `points` | `points` are three-number positions. A path needs at least two points. |
| Stop | `id`, `anchor`, `camera` | `label` and `actions` |

An `anchor` has a one-based `sentence` and a `word` phrase. The phrase must appear as a contiguous
sequence in that sentence's `syl-times.json` entries. Matching normalizes Unicode, ignores case, and
strips punctuation at token edges. Stop anchors must resolve in strictly increasing order and before
the CTA scene.

A `camera` has `pos` and `look` three-number positions. It may have `fov`. A `label` has `text` and
`at`. Keep label text to one or two words. `at` is an object id or a three-number position.

Supported actions are:

- `tokens`: set `at` to an object id and `text` to a non-empty list of token strings.
- `send`: set `path` and `kit` to known ids and names, then set a positive `count` and `duration`.

The validator rejects unknown kit names, object or path references, malformed vectors, missing spoken
anchors, and stops that are out of order. `build.py` writes the resolved stop time into the generated
page. Edit `world.json`, not that inlined copy.

## Labels and sample timing

The label checker opens the built project in `chrome-headless-shell`. It seeks to each labelled stop,
then checks actual label rectangles against captions, watermarks, and the frame edge. Run it with
`CHROME_PATH` set:

```bash
CHROME_PATH="<path-to-chrome-headless-shell>" node "<skill>/tests/world3d-labels.mjs" "<project>"
```

The sample, “How ChatGPT answers a question,” has seven spoken-word stops and runs about 54 seconds.
Its scenes are `world`, `cta`, and `ec`. The scene seams use blur only at `world->cta` and `cta->ec`.
Camera moves have no whoosh. The model contact sheet is [`tests/world3d-kit.html`](../../tests/world3d-kit.html).

## Render paths and timeouts

The main path is a local HyperFrames render on a machine with a usable GPU. HyperFrames uses the
hardware GPU when available:

```bash
npx --yes hyperframes@0.8.140 render "<project>" --player-ready-timeout 180000 -o out.mp4
```

On this machine with Intel Iris Xe, a test measured about 137 seconds per 60-second video. Use
`--player-ready-timeout 180000` for rendering. Use `--timeout 170000` for snapshots because WebGL
setup can be slow:

```bash
npx --yes hyperframes@0.8.140 snapshot --at "<stop-time>" --no-end --timeout 170000 -o snapshots/world3d
```

The Colab script is a fallback for machines without a usable GPU, not a speed-up. A short test render
can use:

```bash
python3 "<skill>/scripts/render-colab.py" "<project>" --seconds 5 -o /tmp/world3d-test.mp4
```

The default requests a Colab T4 session. `--dry-run` prints the plan without starting a session. The
script stops the session after success or failure. `render-colab.py` stays in the skill's `scripts/`
directory; `new-project.py` does not copy it into the project. `--local` deliberately uses
deterministic software WebGL through `--no-browser-gpu`; this is the GPU-free local fallback. A short test
measured about 971 seconds per 60-second video at 1080x1920 with software WebGL. A full render of
the 54-second sample with `--local` took 11 minutes 9 seconds. To use that fallback:

```bash
python3 "<skill>/scripts/render-colab.py" "<project>" --local -o out.mp4
```

The Colab T4 test completed end to end, but Chrome did not use the T4 for WebGL. HyperFrames' probe
reported ANGLE Mesa llvmpipe software, even though the final summary said `hardware gpu`. Trust the
probe line. The five-second test took 96 seconds, about 16 minutes per 60-second video. Colab is a
fallback, not an accelerated render path.

For the contact sheet and other validation steps, see [verification.md](../verification.md). For
Studio and render pitfalls, see [traps.md](../traps.md).
