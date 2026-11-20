# Bundled Asset Sources

Assets in `assets/` are shared across projects. `scripts/new-project.py` copies them into each new project.
The neon3d theme uses Be Vietnam Pro and the Soi Repo mark.
Each project records its own source material (snapshots, clips, logos) in `assets/logos/SOURCES.md`.

## Audio: `assets/audio/`

Sourced from the author's sound effects and music library. Original file names indicate sources where available (Pixabay numeric ID at end of name).
Licenses belong to each file's original creator: verify individual licenses before commercial use.

| File | Original library filename | Video usage |
|---|---|---|
| `sfx-thud.mp3` | `thud-sound-effect-405470.mp3` (Pixabay) | once at 0s, gain 0.30 |
| `sfx-swoosh.mp3` | `universfield-swoosh-ngắn.mp3` (Universfield, Pixabay) | every scene cut, gain 0.70 |
| `sfx-pop.mp3` | `pop-402324.mp3` (Pixabay) | key icons only, gain 0.40 (0.26 in fast cascade) |
| `sfx-laser.mp3` | "laser" sound in author library | control click on screen, gain 0.55 |
| `sfx-click.mp3` | camera shutter cut from `sound chụp ảnh nhanh.m4a` | shutter on key numbers, gain 0.60 |
| `sfx-riser.mp3` | `cinematic-riser-sound kịch tính.mp3` | full track |
| `sfx-risercut3.mp3` | first 3.20s of the riser file above (to peak) | opening hook: peak lands on dead stop, gain 0.17 |
| `bgm-little-things.mp3` | `Little Things Immaterial.mp3` (author music library) | background music from 0:00, gain 0.219 (~12 dB under voice) |

## Fonts: `assets/fonts/`

- **Be Vietnam Pro:** from Google Fonts via Fontsource, split into latin / latin-ext / vietnamese subsets, woff2, weights 600, 700, and 800. Files: `BeVietnamPro-{latin,latin-ext,vietnamese}-{600,700,800}.woff2`. SIL Open Font License 1.1: [fonts/BeVietnamPro-OFL.txt](fonts/BeVietnamPro-OFL.txt).

## Logos: `assets/logos/`

External product logos are trademarks of their respective owners, used solely for product reference within videos. Official assets are used; do not generate or trace them with AI.

| File | Source |
|---|---|
| `openai.svg`, `openai-path.txt` | official OpenAI logo |
| `claude.svg` | official Claude logo |
| `github-mark.svg` | official GitHub mark |
| `google-g.png` | official Google "G" mark |
| `soi-repo-mark.svg` | Soi Repo mark; clean SVG drawn by author's assistant from AI draft |

## Icons

Icons in `template/parts/head.part` come from [Lucide](https://lucide.dev) (ISC license). Custom icons for PDF, laptop, teacup were drawn specifically for this project.

## Vendored Three.js loader addons

`GLTFLoader.js`, `BufferGeometryUtils.js`, and `SkeletonUtils.js` were copied byte-identically from the Three.js `0.187.0` npm tarball (`https://registry.npmjs.org/three/-/three-0.187.0.tgz`). The package's MIT licence is `assets/vendor/three/LICENSE`.

For the neon3d theme, `addons/postprocessing/EffectComposer.js`, `Pass.js`, `RenderPass.js`, `ShaderPass.js`, `MaskPass.js`, `UnrealBloomPass.js`, `OutputPass.js` and `addons/shaders/CopyShader.js`, `LuminosityHighPassShader.js`, `OutputShader.js` were copied byte-identically from the same tarball's `examples/jsm/` folder.
