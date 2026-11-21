# Cleanui theme

Cleanui is a flat 2D explainer look for short narrated videos about working with AI tools. A warm
off-white page with a faint dot grid carries white icon tiles with soft shadows, product marks, a chat card,
a checklist, and one original teal mascot at each chapter opener. Text on screen is short: a chapter title,
product names and the picture's own labels. The spoken line stays in the captions only. Captions sit
in the top band and show one word at a time: spoken words turn ink and stay ink, unread words are grey.
Select it with `--theme cleanui` when creating a project. There are no 3D assets and no WebGL.

This theme has no vignettes. Its scene list, beats, and sounds live in `cues.json`, and its sample
`SCRIPT.md` is about splitting work between AI tools.

## Create and build a project

```bash
python3 "<skill>/scripts/new-project.py" "<folder>" --name "Tên video" --voice "<recording>" --theme cleanui
cd "<folder>"
```

The project root gets `cues.json` and the sample `SCRIPT.md`. The theme assets are copied to
`assets/cleanui/` (mascot and starburst art). The alignment, caption, seam, and sound steps are the
standard ones in `scripts/make.sh`.

## `cues.json` structure

`cues.json` has three keys. Times are never typed in by hand. Each one is an anchor, a sentence number and
a word, resolved against `syl-times.json` by `build.py`.

| Key | Meaning |
|---|---|
| `scenes` | Ordered scene list. The first scene starts at 0 and has no `in` or `at`. Every later scene needs `in` and `at`. |
| `beats` | Named anchor words that drive the motion. The name is `<scene>-<what>` and the anchor must sit inside its scene. |
| `sfx` | Sound per beat. Each row names a beat and one of `pop`, `laser`, `click`. |

Scene `in` kinds:

| `in` | Seam into the scene | Swoosh |
|---|---|---|
| `open` | Chapter opener. Slides up 0.50 s, the outgoing scene exits in 0.36 s. No blur. | yes |
| `slide` | Normal cut. Slides left 0.42 s with an 8 px blur, the outgoing scene blurs out in 0.34 s. | no |
| `cut` | Hard cut. Visibility only, no motion. | yes |

The end card `ec` always starts with a hard cut, so it gets a swoosh. Its time is the later of the last scene
plus 2.50 s and the last spoken syllable plus 0.30 s.

Rules that `build.py` enforces with an error:

- Scene ids are lowercase letters or digits, unique, and not `ec`.
- Scene start times are strictly increasing.
- A beat name must start with an existing scene id, and its time must fall inside that scene.
- A sound must name an existing beat and one of the three sound names.

## Scene markup and tokens

Each scene in `scenes.part` is a `div.scene.clip` with id `sc-<id>` and a wrapper `#w-<id>`. Its
`data-start` and `data-duration` use `@@start:<id>@@` and `@@dur:<id>@@`, which `build.py` fills in.

`timeline.js` reads beat times through `@@t:<beat>@@`. It calls the shared helpers in `parts/script.js`
(`pop`, `show`, `bump`, `tl`). It also takes the blur tweens from `@@slides@@`, which `build.py` fills with
the blurred seams. `timeline.js` must end with the tail pin `tl.set({}, {}, @@end@@);`, because
`karaoke.py` requires exactly one.

Text sizes:

- Chapter title: `.h1.chap` with `.bot` at 104 px, weight 800. This is the style.md floor for chapter titles. It is
  one line and it is a short label, not the spoken sentence.
- In-scene headline: `.h1` with `.top` at 72 px and `.bot` at 88 px. The sample uses none, because the caption
  already carries every spoken line. Use it only for a title that adds meaning the voice does not say.
- Number and step counter: `.num` at 104 px, accent colour.

## On-screen text and the sample scene plan

The rules come from style.md sections 3 and 4. Each scene shows only what the caption does not:

- The hook has no headline. The two product marks pop in on the first words, and the names sit under them.
- Each chapter opener has a number, a short title that the chapter's word reveals (`ch1-title` on "viết",
  `ch2-title` on "kiểm"), a large icon tile that shows the meaning (sparkles for a draft, a search glass for a
  check), and the teal mascot.
- The draft card body is a structure outline, "Mở bài · Thân bài · Kết luận". It is not the spoken line.
- The checklist is three chips under the ChatGPT tile. They are a picture of the list, not a copy of the sentence.
- The done scene shows a file tile and a two-line terminal mock: the command and the saved file name.
- The ask scene shows the two product marks and the send button, with no question text.
- The pick scene has the two product marks only. No label repeats the spoken verb.

No scene shows a word from its spoken line as a headline or label. Product names and the picture's own labels
are the only text.

## Palette and type

| Role | Value | Source |
|---|---|---|
| Page | `#F5F5F5` | measured from the reference frames |
| Dot grid | `#DCDCDC`, 156 px pitch | measured on one frame (approximate) |
| Ink | `#1C1C1C` | measured |
| Unread caption words | `#A3A3A3` | SPEC, author decision 7 |
| Accent | `#D87454` | SPEC, author decision 7 |
| Claude mark tile | `#D97757` | style.md section 6 |
| Teal mascot | `#2A9D8F` | original design |
| Blue highlight | `#2F6FDE` | theme.css token, not used on screen yet |

Typeface: Be Vietnam Pro, weights 600, 700 and 800, subset woff2 in `assets/fonts/`, under SIL OFL 1.1.
Caption text is 56 px at weight 700. Chips are 44 px, labels 62 px, body lines 44 to 56 px. Nothing is
below the 40 px floor.

## Captions

- Top band, top edge at `y = 300`, below the 240 px top safe area. The caption box is 160 px high.
- `minu` 1, `maxu` 4 units and `maxc` 26 characters per line. Per-word timing comes from `syl-times.json`.
- Unread words use `.kb` colour `#A3A3A3`. A word that is being read turns `#1C1C1C` at its start and stays
  ink, because the theme is `sticky`. Read words never fade back.
- No text halo. The lit and unlit shadows are both `LIT`, a transparent value.

## Cards, tiles, and components

- Icon tile: white, 184 px, radius 40 px, soft shadow `0 18px 40px rgba(0,0,0,0.14)`.
- Product tile: the product mark on its own tile. Claude uses `#D97757` with a white mark. ChatGPT uses
  white with an ink mark. Both marks come from `assets/logos/` through the `mk-claude` and `mk-openai`
  symbols in `head.part`, as style.md section 6 requires.
- Chat card: 936 by 520 px, radius 36 px, Claude header, body at 56 px, accent send button of 88 px.
- Checklist chip: white pill, 300 by 68 px, square tick box, 44 px text, per the SPEC checklist component. Three
  chips stack at 90 px pitch, centred at x 390 under the ChatGPT tile.
- Large icon tile: 320 by 320 px, radius 72 px, glyph 170 px. Used for chapter openers and the done scene.
- Terminal panel: near-black `#141414`, radius 28 px, green text. It is an original CSS mock, not a
  screenshot.
- Black label pill: 62 px, weight 800. The component is kept, but the sample does not use it.

## Camera and transition timings

No camera moves. All motion is 2D: slides, blur, and pops.

| Move | Timing |
|---|---|
| Chapter opener slide up | 0.50 s entry, starts on the seam cut time |
| Normal slide left with blur | 0.42 s entry, 8 px blur, 0.34 s exit before the cut |
| Hard cut | 0 s, visibility only |
| Pop on beat | `pop()` with `back.out(1.6)`, 0.5 s |
| Press on send button | `bump()` to 0.86 scale, 0.12 s down, 0.3 s back |
| Pick emphasis | Claude tile `bump` to 1.08 and GPT tile dims to 0.35 alpha |

Seams are stamped into `index.html` by `motion-doctrine`'s `seam-stamp.mjs` from `ledger.json`. Slides use
the `cut` type with `x` or `y` axis. Hard cuts are rows with `type` set to `hard`, which seam-stamp turns
into visibility only.

## Sound map

Sounds come from the house set in `assets/audio/` only. No Freesound clips are used.

| Sound | Use | Level |
|---|---|---|
| `thud` | start of the video, added by `add-sfx.py` | house default |
| `swoosh` | chapter openers and hard cuts only | house default, see the rule below |
| `pop` | hook claude mark, chapter mascot, check chip | `G_POP` |
| `laser` | send button press, pick | `G_LASER` |
| `click` | reserved for numbers, not used in the sample | `G_CLICK` |

Music: `bgm-little-things.mp3`, the house bed, under the voice. In the sample build the bed sits 12 dB
under the voice. Tempo and genre are not verified, see the open items below.

### Theme rule: swoosh only on hard cuts and chapter openers

This rule is specific to cleanui. It overrides the house rule in `style.md` section 7, which puts a swoosh
on every cut. `style.md` is unchanged.

- Each ledger seam row carries `swoosh`. `add-sfx.py` adds a swoosh only when the flag is true. Its default
  is true, so other themes are unchanged.
- cleanui sets `swoosh` true for `open` and `cut` seams, and false for `slide` seams.
- Slides with a blur do not play a swoosh, so the blur carries the transition without extra sound.

## Original assets and what cleanui does not use

Cleanui uses only redistributable or original assets. Every file is listed in
`skills/scene-flow/assets/SOURCES.md`.

- Mascot: `assets/cleanui/mascot.svg`, an original teal squircle with two dot eyes and a smile.
- Starburst: `assets/cleanui/starburst.svg`, an original six-ray accent.
- Product marks: `assets/logos/` (Claude and OpenAI), house set, used under style.md section 6.

Not used: any character, mascot, or hoodie from the reference video, any third-party app or site
screenshot, any stock photo, and the reference's music or sound effects. Terminal and chat panels are
drawn in CSS.

## Checks

```bash
bash tests/theme-fixture.sh /tmp/sf-cleanui --theme cleanui
python3 tests/cleanui-build-test.py
```

The fixture's voice is 36.50 s for the 89-word sample script. Its hash is set in `.github/workflows/ci.yml`.
Snapshot the sample project before any render, with `npx --yes hyperframes@0.8.140 snapshot --at <times>
--no-end -o snapshots/<name>`. Check the chapter opener frames, the hard cut frames, and the end card.

## Open items, unverified

These values come from the approved SPEC and are not verified:

- Tempo (86 or 108 BPM) and genre of the reference bed. The house track is used in its place.
- Safe areas: top 240 px and bottom 440 px. Platform guidance has not been checked.
- Dot-grid pitch of 156 px. It was measured on one frame.
- Voice-under-music level in LUFS. Stem separation was not available, so the reference level is not measured.
- Text review: the sample no longer repeats captions as headlines. The author should confirm this in the
  preview before the first real video.
