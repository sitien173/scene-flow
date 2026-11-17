# Bundled Asset Sources

Assets in `assets/` are shared across projects. `scripts/new-project.py` copies them into each new project.
The dark theme uses Be Vietnam Pro and the Soi Repo mark; the paper theme uses K2D and the paper background plate.
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

## Backgrounds: `assets/background/`

| File | Source | Notes |
|---|---|---|
| `paper-bg.mp4` | `Backrunground giấy.mov` in author library | paper theme only; 26 graded sheets of paper, 0.5s each, pre-assembled 124s total, 1080x1920 |
| `paper.webp` | one frame from the file above | paper theme only; static paper plate (freeze-frame, "dừng hình") |

## Fonts: `assets/fonts/`

- **Dark theme:** Be Vietnam Pro, from Google Fonts via Fontsource, split into latin / latin-ext / vietnamese subsets, woff2, weights 600, 700, and 800. Files: `BeVietnamPro-{latin,latin-ext,vietnamese}-{600,700,800}.woff2`. SIL Open Font License 1.1: [fonts/BeVietnamPro-OFL.txt](fonts/BeVietnamPro-OFL.txt).
- **Paper theme:** K2D (Cadson Demak), split into latin / latin-ext / vietnamese subsets, woff2, weights 400–800. SIL Open Font License 1.1: [fonts/OFL.txt](fonts/OFL.txt).

## Logos: `assets/logos/`

External product logos are trademarks of their respective owners, used solely for product reference within videos. Official assets are used; do not generate or trace them with AI.

| File | Source |
|---|---|
| `openai.svg`, `openai-path.txt` | official OpenAI logo |
| `claude.svg` | official Claude logo |
| `github-mark.svg` | official GitHub mark |
| `google-g.png` | official Google "G" mark |
| `soi-repo-mark.svg` | Soi Repo mark for dark theme; clean SVG drawn by author's assistant from AI draft |
| `brand-logo.svg` | placeholder logo for paper theme; replace with custom logo (`build.py BRAND_LOGO`) |

## Icons

Icons in `template/parts/head.part` come from [Lucide](https://lucide.dev) (ISC license). Custom icons for PDF, laptop, teacup were drawn specifically for this project.

## World3d model kit

The GLBs below were packed from the source `.gltf`, `.bin`, and atlas PNG files without geometry or texture compression. The packer retained the glTF JSON and geometry buffer, appended the PNG atlas to the binary buffer, registered the atlas as a buffer view, and wrote a GLB 2.0 JSON chunk and BIN chunk. It did not change mesh data. Model transforms are normalised in `assets/world3d/kit.json`. Full source licence files are preserved in `assets/world3d/LICENSES/`.

The KayKit GLBs use the source packs' Y-up coordinate system. Their `rot` values in `kit.json` are zero-degree corrections; `offset` recentres each pivot on x/z and places the lowest point at y=0. Scale values bring the largest model dimension to approximately two world units.

### KayKit City Builder Bits 1.0

- Source: [KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0](https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0), downloaded 2026-11-17 from `https://codeload.github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/zip/refs/heads/main`.
- Commit: `63976910ca04d16f0fc531b9c614244be8128713`.
- Source zip SHA-256: `0d1a41ef653751fcd718a57531c29d600be61eb71700cb7f062f75cdea0d7e0b`.
- Licence: CC0. Exact wording from the downloaded `Assets/LICENSE.txt`:

  > License: (Creative Commons Zero, CC0)
  > http://creativecommons.org/publicdomain/zero/1.0/
  > This content is free to use in personal, educational and commercial projects.
  > Support me by crediting Kay Lousberg, www.kaylousberg.com (this is not mandatory)

- The full file is copied verbatim to `assets/world3d/LICENSES/KayKit-City-Builder-Bits-CC0.txt`.

| GLB | SHA-256 |
|---|---|
| `assets/world3d/models/city-building_A.glb` | `f2f660fab3654d3e43e430d276ae7cf4d9a32601f7e7872392a0589ea6a55754` |
| `assets/world3d/models/city-building_B.glb` | `91b0d73c094ba23d78fd0ad2e0d0b2ee1dd8291bb22f8049703042dbf0395432` |
| `assets/world3d/models/city-building_C.glb` | `0246a691d5d1cf31a31b947a9abf3f6da87bc2cfadb888828648707eeac5e71c` |
| `assets/world3d/models/city-building_E.glb` | `172395044ac1705d32c4ab64c11a641beb004a63c484e07ca3a789225e6137ae` |
| `assets/world3d/models/city-road_straight.glb` | `a657417ea70612eeb18189645f04dd55e2fc40e5c1de42a08a1eb258f743e1ef` |
| `assets/world3d/models/city-road_corner.glb` | `9724fa22da707b1b592ea9087be46e2cd0c7ae95190a022c25ca85b6fce57493` |
| `assets/world3d/models/city-road_junction.glb` | `9062677a3afad651f801c3081681f531f862916d33c4af7886d5d435b245882a` |
| `assets/world3d/models/city-streetlight.glb` | `bd7956c0a1004fafad3fc3d67bbe112b143a48d0ec262541e1baf4a938d2a0cc` |
| `assets/world3d/models/city-bush.glb` | `c91b9e8980883df79fca6a5173b63a020aaa61cb96cede566fca18c3ad1b3d22` |
| `assets/world3d/models/city-base.glb` | `b4e03ce1f1bb32056227e92becf5605f5865ee2cc2924d4520f53a3acdb43ec5` |

### KayKit Space Base Bits 1.0

- Source: [KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0](https://github.com/KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0), downloaded 2026-11-17 from `https://codeload.github.com/KayKit-Game-Assets/KayKit-Space-Base-Bits-1.0/zip/refs/heads/main`.
- Commit: `6dfbcac9927d06283752c4defd4882cfe0d29666`.
- Source zip SHA-256: `b6b384378f38f60fbfb0bb187b71387885261dd67beba4ccfcc4a681d820a6e8`.
- Licence: CC0. Exact wording from the downloaded `Assets/LICENSE.txt`:

  > License: (Creative Commons Zero, CC0)
  > http://creativecommons.org/publicdomain/zero/1.0/
  > This content is free to use in personal, educational and commercial projects.
  > Support me by crediting Kay Lousberg, www.kaylousberg.com (this is not mandatory)

  The full file is copied verbatim to `assets/world3d/LICENSES/KayKit-Space-Base-Bits-CC0.txt`.

| GLB | SHA-256 |
|---|---|
| `assets/world3d/models/space-basemodule_A.glb` | `69546fca6b9b60a59c2a40e2733a6b95792a99e51271d19ea332cfa3915d3ac4` |
| `assets/world3d/models/space-basemodule_garage.glb` | `a0d16277e435f5e2e2161cc00330fcfeb1da2790399feefb817c7a0ca67d21fb` |
| `assets/world3d/models/space-structure_tall.glb` | `cc323c8dbd7a0c4e6b3c36d45fdfb909eb713013433f00e2dbb3bcca586c1612` |
| `assets/world3d/models/space-containers_A.glb` | `2e8ad7632db15d96208a8da407b3973415d6eb071e0399fd4c47c4bafe1e0835` |
| `assets/world3d/models/space-cargo_A.glb` | `0734063f94f87af9eddaeea3eaffc65ffbc5f6771bfd9745a68678e1b1a95e34` |
| `assets/world3d/models/space-solarpanel.glb` | `22fb0c0efffc16a400da372ca9e422cb1dc2c443dee256b8fd97458f0092cbef` |
| `assets/world3d/models/space-windturbine_tall.glb` | `0ae131b6aec190ade3f711c7ed5318df3d89ad7ba4e5c204b81acf010ae25126` |

### KayKit Furniture Bits 1.0

- Source: [KayKit-Game-Assets/KayKit-Furniture-Bits-1.0](https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0), downloaded 2026-11-17 from `https://codeload.github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0/zip/refs/heads/main`.
- Commit: `96d5930a8dbdb363409bbc2d3341718b00e17c9c`.
- Source zip SHA-256: `973ba87b154d7e734531253314df07e8b1bf2d76cda2a79dc63ee9bc07af9a02`.
- Licence: CC0. Exact wording from the downloaded `Assets/LICENSE.txt`:

  > License: (Creative Commons Zero, CC0)
  > http://creativecommons.org/publicdomain/zero/1.0/
  > This content is free to use in personal, educational and commercial projects.
  > Support me by crediting Kay Lousberg, www.kaylousberg.com (this is not mandatory)

  The full file is copied verbatim to `assets/world3d/LICENSES/KayKit-Furniture-Bits-CC0.txt`.

| GLB | SHA-256 |
|---|---|
| `assets/world3d/models/furniture-table_medium.glb` | `6724f87d838ed22629ee04006cce09be61309454d11260fa43fce41e7f6f7c46` |
| `assets/world3d/models/furniture-shelf_B_large.glb` | `ca4a7466aa4ce916d21747c8ff512b41ab149334ed742271e4a52603daae034d` |

### RobotExpressive

- Source: [three.js r187 RobotExpressive example](https://github.com/mrdoob/three.js/tree/456a78fd22f4ce11d929fd62c8579b83be06008a/examples/models/gltf/RobotExpressive), commit `456a78fd22f4ce11d929fd62c8579b83be06008a`, downloaded 2026-11-17.
- Licence evidence: the source `README.md` is copied to `assets/world3d/LICENSES/RobotExpressive-README.md`. Exact wording: `Model by [Tomás Laulhé](https://www.patreon.com/quaternius). Before using this model on a project, consider supporting the creator's Patreon. CC0 1.0.`
- The GLB contains `Dance`, `Death`, `Idle`, `Jump`, `No`, `Punch`, `Running`, `Sitting`, `Standing`, `ThumbsUp`, `Walking`, `WalkJump`, `Wave`, and `Yes` clips. The kit registers `Idle`, `Walking`, and `Wave`.
- GLB SHA-256: `047f5e5fb3bb6d378bd1df16ca6137f2a596c99b3a1b5690b4020c05aaf6f319`.

### Vendored Three.js loader addons

`GLTFLoader.js`, `BufferGeometryUtils.js`, and `SkeletonUtils.js` were copied byte-identically from the Three.js `0.187.0` npm tarball (`https://registry.npmjs.org/three/-/three-0.187.0.tgz`). The package's MIT licence is `assets/vendor/three/LICENSE`.

## Walkthrough: `assets/walkthrough/`

Sample capture for the dark theme repo walkthrough opening. Captured 2026-11-17, signed out.

- Source: public GitHub page [slimsoftvietnam/scene-flow](https://github.com/slimsoftvietnam/scene-flow). The page content belongs to the repository owner; verify the right to publish it before use in a video.
- Command: `node scripts/cdp.mjs page https://github.com/slimsoftvietnam/scene-flow assets/walkthrough/h1-page.webp --targets "title=#repo-title-component,star=[data-testid=star-button],fork=[data-testid=fork-button],files=table[aria-labelledby=folders-and-files],readmeTitle=article.markdown-body h1"`
- Viewport: 1280 CSS px wide, 2000 CSS px tall (`--max-h` default), DPR 2, `prefers-color-scheme: dark`. Output: `h1-page.webp` at 2560 x 4000 px.
- Rects in `h1-page.json` (page CSS px, `[x, y, w, h]`): `title`, `star`, `fork`, `files`, `readmeTitle`.
- Target `readme` (`article.markdown-body`) is not in the sample. Its rect does not fit inside the 2000 px cap. With `--targets "readme=article.markdown-body"` alone, the command fails with `ERROR readme: outside (article.markdown-body)` and writes no file.
