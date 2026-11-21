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

### Atlas3d sounds: `assets/atlas3d/audio/`

Freesound downloads, copied by `scripts/new-project.py` into atlas3d projects as `assets/audio/` files. All four are licensed CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/), so no credit is required. Each is the Freesound HQ MP3 preview, retrieved 2026-11-20 (no OAuth token, so no original file). Gains and the way they were measured are in the `scripts/add-sfx.py` header.

| File | Freesound ID | Name | Author | URL | Licence | Retrieved | Video usage |
|---|---|---|---|---|---|---|---|
| `bgm-pizzicato.mp3` | 529008 | Short Pizzicato Song | DanJFilms | https://freesound.org/people/DanJFilms/sounds/529008/ | CC0 1.0 | 2026-11-20 | atlas3d background music from 0:00, gain 0.305, looped by `add-sfx.py` on a film longer than 56.3 s |
| `sfx-pen.mp3` | 211247 | Scribble | Tomoyo Ichijouji | https://freesound.org/people/Tomoyo%20Ichijouji/sounds/211247/ | CC0 1.0 | 2026-11-20 | atlas3d `sfx` beat `pen`, gain 6.5 |
| `sfx-coins.mp3` | 17502 | Coin dropping.wav | Jace | https://freesound.org/people/Jace/sounds/17502/ | CC0 1.0 | 2026-11-20 | atlas3d `sfx` beat `coins`, gain 0.89 |
| `sfx-drum.mp3` | 573275 | Timpani 2.wav | Sorinious_Genious | https://freesound.org/people/Sorinious_Genious/sounds/573275/ | CC0 1.0 | 2026-11-20 | atlas3d `sfx` beat `drum`, gain 0.90 |

## Fonts: `assets/fonts/`

- **Be Vietnam Pro:** from Google Fonts via Fontsource, split into latin / latin-ext / vietnamese subsets, woff2, weights 600, 700, and 800. Files: `BeVietnamPro-{latin,latin-ext,vietnamese}-{600,700,800}.woff2`. SIL Open Font License 1.1: [fonts/BeVietnamPro-OFL.txt](fonts/BeVietnamPro-OFL.txt).
- **Terra3d theme:** Nunito, from Google Fonts via Fontsource (`@fontsource/nunito` 5.3.0), split into latin / latin-ext / vietnamese subsets, woff2, weights 800 and 900. SIL Open Font License 1.1: [fonts/Nunito-OFL.txt](fonts/Nunito-OFL.txt), copied from the package `LICENSE`.
  - Source: [fontsource.org/fonts/nunito](https://fontsource.org/fonts/nunito), tarball `https://registry.npmjs.org/@fontsource/nunito/-/nunito-5.3.0.tgz`, downloaded 2026-11-20. Tarball SHA-256: `4d8e1fb4f4a40c125c7a302b21e5c6810b86569b60bac0fa0405c04380f4c77b`. Its SHA-512 matched the registry `dist.integrity` value `sha512-vw9TaTQJ/zpEpKrsODuPmOvaVjXgdda6B+xXA4YqjrdeJ62MLgVoDerdRXFQHyBnSCt2yQ2nHKCHPP/Pv7Xq4Q==`.
  - Author: The Nunito Project Authors ([googlefonts/nunito](https://github.com/googlefonts/nunito)). Licence line from the package `LICENSE`, checked 2026-11-20: `This Font Software is licensed under the SIL Open Font License, Version 1.1.` The package metadata also states `OFL-1.1`.
  - Vietnamese check, run with `fonttools` 4.68.0 in a throwaway venv under `/tmp`: every precomposed glyph U+1EA0 to U+1EF9 (90 code points) is present across the three subset files at weight 800 and at weight 900. Latin and latin-ext alone cover 8 of the 90, so the vietnamese subset is required.
- **Atlas3d theme (map labels):** Lora (Google Fonts v37 via Fontsource `@fontsource/lora` 5.3.0, `https://registry.npmjs.org/@fontsource/lora/-/lora-5.3.0.tgz`), split into latin / latin-ext / vietnamese subsets, normal style, woff2, weights 600 and 700. Files: `Lora-{latin,latin-ext,vietnamese}-{600,700}.woff2`. Copyright 2011 The Lora Project Authors (https://github.com/cyrealtype/Lora-Cyrillic), with Reserved Font Name "Lora". SIL Open Font License 1.1: [fonts/Lora-OFL.txt](fonts/Lora-OFL.txt).

| Path | Source URL | Author | License | Date checked | SHA-256 |
|---|---|---|---|---|---|
| `assets/fonts/Nunito-latin-800.woff2` | `files/nunito-latin-800-normal.woff2` in the Fontsource package | The Nunito Project Authors | OFL 1.1 | 2026-11-20 | `2363d3ed037283ebb961e8c4b4917e40a8bc8853cf9965cf1ea7b4daa1df630a` |
| `assets/fonts/Nunito-latin-900.woff2` | `files/nunito-latin-900-normal.woff2` in the Fontsource package | The Nunito Project Authors | OFL 1.1 | 2026-11-20 | `9ca32f5d8334579387361096944286df451272a557bb09bd906254a623aba99e` |
| `assets/fonts/Nunito-latin-ext-800.woff2` | `files/nunito-latin-ext-800-normal.woff2` in the Fontsource package | The Nunito Project Authors | OFL 1.1 | 2026-11-20 | `39f54b55b83547df294894bdf68d75c11e2ac626bc0c88b73ba8993422de2fe7` |
| `assets/fonts/Nunito-latin-ext-900.woff2` | `files/nunito-latin-ext-900-normal.woff2` in the Fontsource package | The Nunito Project Authors | OFL 1.1 | 2026-11-20 | `f7e97aafcd3aa2d08b9410f147e9bde44fe8c11f6f6bd4e71199f5d89067bff6` |
| `assets/fonts/Nunito-vietnamese-800.woff2` | `files/nunito-vietnamese-800-normal.woff2` in the Fontsource package | The Nunito Project Authors | OFL 1.1 | 2026-11-20 | `fac6740eb7a0d5627c287a8283dd91649f31261c81f4bf965b1403c74fb1fcd8` |
| `assets/fonts/Nunito-vietnamese-900.woff2` | `files/nunito-vietnamese-900-normal.woff2` in the Fontsource package | The Nunito Project Authors | OFL 1.1 | 2026-11-20 | `97f0651f726034fc130a9e0c26dddfa5634b657f98a385a022bf24e888f73ec3` |
| `assets/fonts/Nunito-OFL.txt` | `LICENSE` in the Fontsource package | The Nunito Project Authors | OFL 1.1 | 2026-11-20 | `40991bfa02ac620aae16dc527f3c47765a25e43f270d4c301ee6ab663a8d9015` |

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

For the atlas3d theme, `addons/lines/LineMaterial.js`, `LineSegments2.js`, `LineSegmentsGeometry.js`, `Line2.js`, and `LineGeometry.js` were copied byte-identically from the same tarball's `examples/jsm/lines/` folder.

## Terra3d assets

Static files for the terra3d theme. Each file is CC0 or public domain, checked on the source page on the date shown. Pillow resized and converted the sources: textures to WebP at quality 85 (long side at most 2048 px), the sky map to JPEG at quality 88 (1024 x 512 px). Nothing is fetched at build or run time.

### Textures and sky map

Poly Haven licence line, quoted from [polyhaven.com/license](https://polyhaven.com/license): `Our assets are all licensed as CC0, which is effectively Public Domain even in jurisdictions that do not support the Public Domain.` The captured excerpt is in `assets/terra3d/LICENSES/PolyHaven-CC0.txt`.

NASA usage line, quoted from [nasa.gov media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/): `NASA content - images, audio, video, and media files used in the rendition of 3-dimensional models, such as texture maps and polygon data in any format - generally are not subject to copyright in the United States.` The excerpt and the creator credit are in `assets/terra3d/LICENSES/NASA-BlueMarble-usage.txt`. NASA is not a CC0 publisher. The terms are public domain in the United States, with no endorsement implied.

| Path | Source URL | Author | License | Date checked | SHA-256 |
|---|---|---|---|---|---|
| `assets/terra3d/textures/earth-day.webp` | [NASA Blue Marble: Next Generation with Topography](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography), file `world.topo.200408.3x5400x2700.jpg` (August 2004, 5400 x 2700 px, resized to 2048 x 1024) | Reto Stöckli and Robert Simmon, NASA Earth Observatory | Public domain (NASA content, not subject to copyright in the United States) | 2026-11-20 | `139d14c69eec1200b2e9336b1485b548dce18d949e86124c72d69e159e6d8f30` |
| `assets/terra3d/textures/ground-grass.webp` | [Poly Haven Grass Path 2](https://polyhaven.com/a/grass_path_2), file `grass_path_2_diff_2k.jpg` (2048 x 2048 px) | Rob Tuytel | CC0 | 2026-11-20 | `3f820e724820de7103bd73f98dcb86875745492c2b6aa378637328d08563650e` |
| `assets/terra3d/textures/ground-red-earth.webp` | [Poly Haven Red Laterite Soil Stones](https://polyhaven.com/a/red_laterite_soil_stones), file `red_laterite_soil_stones_diff_2k.jpg` (2048 x 2048 px) | Amal Kumar | CC0 | 2026-11-20 | `3a7a05b2eee88d7228805c7d5f646b9bd44b3c8e12d9d0d63610cfaf2fd591a3` |
| `assets/terra3d/textures/ground-rock.webp` | [Poly Haven Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), file `rock_boulder_dry_diff_2k.jpg` (2048 x 2048 px) | Dimitrios Savva (photography), Rico Cilliers (processing) | CC0 | 2026-11-20 | `329f910fcec785df1125a1f0b82c479d12876a62eb3d99f6db2158e440de509a` |
| `assets/terra3d/env/sky-day.jpg` | [Poly Haven Kloofendal 43d Clear (Pure Sky)](https://polyhaven.com/a/kloofendal_43d_clear_puresky), Tonemapped JPG (24576 x 12288 px, resized to 1024 x 512) | Greg Zaal | CC0 | 2026-11-20 | `9992a76bb8bf6469e5d3003cc352f7396f026dd5fb6ab27f75843e365713d243` |

Download integrity: each Poly Haven source file matched the MD5 in the Poly Haven files API (`https://api.polyhaven.com/files/<id>`) before conversion.

### Models

`assets/terra3d/models/ship-large.glb` was packed from Kenney's source GLB, which referenced `Textures/colormap.png` as an external file. The packer kept the glTF JSON and the geometry buffer, appended the PNG to the binary buffer as a buffer view, pointed the image at that view with `mimeType` `image/png`, and wrote GLB 2.0 JSON and BIN chunks. It did not change mesh data. The embedded PNG is byte-identical to the source `colormap.png`. The KayKit characters ship as single GLB files with the image already embedded, so they are copied byte-identically. No GLB uses Draco, meshopt, or KTX2. Clip names and durations are in `assets/terra3d/assets.json`, read from the animation samplers in each GLB.

Licence line, quoted from each downloaded licence file: `License: (Creative Commons Zero, CC0)`. The full files are `assets/terra3d/LICENSES/Kenney-PirateKit-CC0.txt` and `assets/terra3d/LICENSES/KayKit-Character-Pack-Adventures-CC0.txt`.

- Ship: Kenney Pirate Kit 2.1, creation date 17-02-2026. Page checked 2026-11-20: [kenney.nl/assets/pirate-kit](https://kenney.nl/assets/pirate-kit) states `License Creative Commons CC0`, and [OpenGameArt Pirate Kit](https://opengameart.org/content/pirate-kit) states `License(s): CC0`. Kenney's own download is a script-driven donation prompt, so the zip came from the OpenGameArt copy, `https://opengameart.org/sites/default/files/kenney_pirate-kit_2.1.zip`, downloaded 2026-11-20. Source zip SHA-256: `667ed2caf92954ddb98f7b7cede831fe99ab75063c26b25e23d32715bee9c943`. Source file: `Models/GLB format/ship-large.glb`.
- Humans: [KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), downloaded 2026-11-20 from `https://codeload.github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/zip/refs/heads/main`. Commit: `672074b73ba276876a19e8816ecdc5241817ab47`. Source zip SHA-256: `e19176d799036452bc783c00dd1036e158c66c5a43b7285ccbfea3466d6f57bf`. Source files: `addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb` and `Mage.glb`. Each has a skinned rig and 76 clips, for example `Idle`, `Walking_A`, `Running_A`, and `Cheer`.

| Path | Source URL | Author | License | Date checked | SHA-256 |
|---|---|---|---|---|---|
| `assets/terra3d/models/ship-large.glb` | [Kenney Pirate Kit](https://kenney.nl/assets/pirate-kit) via [OpenGameArt](https://opengameart.org/content/pirate-kit) | Kenney | CC0 | 2026-11-20 | `8567386c64faf3a73832f77a0dcfcc44208487c34b46440b9a3fa8d452068579` |
| `assets/terra3d/models/Knight.glb` | [KayKit Adventurers Character Pack 1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) | Kay Lousberg | CC0 | 2026-11-20 | `60428e3abc09ba83e595d256e3af8c5c976b46cdae599f0802fc82b4a3445168` |
| `assets/terra3d/models/Mage.glb` | [KayKit Adventurers Character Pack 1.0](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) | Kay Lousberg | CC0 | 2026-11-20 | `cf898585da33fab50c724d31605fb931eb2912e6d2280092141e98ca81ad507d` |

## Atlas3d map: `assets/atlas3d/map/`

Natural Earth map data, public domain. Licence note and download details: [atlas3d/map/LICENSES/natural-earth.md](atlas3d/map/LICENSES/natural-earth.md).

- Source: Natural Earth 1:50m admin-0 countries, `nvkelso/natural-earth-vector` tag `v5.1.2`, commit `f1890d9f152c896d250a77557a5751a93d494776`, downloaded 2026-11-19 from `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson`.
- Source SHA-256: `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`.
- Source: Natural Earth Shaded Relief 50m, `SR_50M.zip` version 2.0.0, downloaded 2026-11-19 from `https://naciscdn.org/naturalearth/50m/raster/SR_50M.zip`.
- Source SHA-256: `ff810f5f2747463fd8ffa612b23e5f5e5d593a345218976872b6749610976ab7`.
- Licence: public domain, per the [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/).
- Generator: `python3 tools/atlas3d-map.py --relief` (developer tool, not copied into projects). The tool pins both SHA-256 values.

| Generated file | Output SHA-256 |
|---|---|
| `assets/atlas3d/map/world.js` | `a2f2bb018525cbe78830630f5c1c537ca2307944103e9351ca56524730961dd6` |
| `assets/atlas3d/map/index.json` | `7f0c950ce3b6d5a9be4daf4c92eae8ddc8bb12ae31556798d04e44a18ade3251` |
| `assets/atlas3d/map/relief.webp` | `e384721a4f902c8f20398061808a49f036e0d13b77c1bc0168f7a4221e483e38` |

## Atlas3d sample backdrop: `template/themes/atlas3d/backdrops/`

| File | Source | Notes |
|---|---|---|
| `template/themes/atlas3d/backdrops/sample.webp` | Original generated work (author/project-owned) | Deterministic 1080x1920 painted cartographic landscape generated with Python + Pillow (`random.Random(1803)`): sky gradient, clouds, layered rolling hills, sunlit meadow foreground, and subtle parchment grain. SHA-256: `a089bbe30fc5cefe660a4c188b67256f3656ee9e4cd85d59572ef7f7c60359dd`. |

## Cleanui assets: `assets/cleanui/`

Original art drawn for the cleanui theme with plain SVG geometry. No third-party character, logo, or artwork is used. Licence: the same as this repository.

| File | Source | Notes | SHA-256 |
|---|---|---|---|
| `assets/cleanui/mascot.svg` | Original work, scene-flow project | Teal squircle with two dot eyes and a smile. Not derived from any reference character. | `4e253f5bc6f130a0f67e980a5b95babb0b62dc7fcaeeb29ebbdd43e6bb9ff011` |
| `assets/cleanui/starburst.svg` | Original work, scene-flow project | Six-ray orange accent drawn as a stroked asterisk. | `d9eb550a43f89624895e8865669576456f71fae3181351453e7448e5d0f1d414` |
