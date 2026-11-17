# Dark theme (default)

`scripts/new-project.py` selects this theme by default; pass `--theme dark` to choose
it explicitly. Follow the shared series-selection rules in
[`../house-style.md` §1](../house-style.md#1-workflow).

## Identity

| Element | Dark theme |
|---|---|
| Field | Near-black gradient with 28 deterministic drifting particles (`PARTICLE_SEED = 2402`, `PARTICLE_COUNT = 28`) |
| Type | Be Vietnam Pro 600, 700 and 800 |
| Accents | Mint `#4ADE80` and cyan `#22D3EE` for titles and interface accents; orange `#FB923C` only for the lit caption word |
| Cards | Dark rounded surfaces with a thin, light border |
| Progress | Thin mint-to-cyan bar at the top |
| Watermark | Soi Repo mark and name at the top-left and bottom-right |
| Brand | `BRAND_NAME` is `Soi Repo`; `BRAND_LOGO` is `assets/logos/soi-repo-mark.svg`; `SLOGAN` starts as `Slogan của bạn` |

The shared rules for the opening mascot and end-card timing are in
[`../house-style.md` §2](../house-style.md#2-bookends). Keep section titles mint or
cyan.

## Opening recipe

The bundled sample opens with `h1`, a repository walkthrough: a real capture of the repository page in a
browser card, and a camera that zooms, scrolls, moves a cursor, clicks and highlights on cue with the
voice. Keep the dark field quiet around the page.

1. Capture the page once per video. The command writes the image and the target rects measured from the
   same layout; it exits nonzero and writes nothing when a target is missing or below the height cap.

   ```bash
   node scripts/cdp.mjs page https://github.com/<owner>/<repo> assets/img/h1-page.webp \
     --json assets/img/h1-page.json \
     --targets "title=#repo-title-component,star=[data-testid=star-button],files=table[aria-labelledby=folders-and-files],readmeTitle=article.markdown-body h1"
   ```

2. Edit the browser address in the `h1` markup.
3. Write the cues in `timeline.js` in recorded seconds, as for every other scene. Skip a star click when
   the repository shows no stars.

A new project already carries the sample capture in `assets/img/`, so it builds with no extra step.

## Captions

Place captions in the lower middle. Use sentence case and Be Vietnam Pro. Unlit words
are white. The spoken word changes to orange; do not add a box, underline or scale
change. Cues hold up to five units and 30 characters. The generator tries to merge a
cue under three units with a neighbor in the same sentence when the combined cue fits
those limits.

## Seams

The dark theme uses a **blur-Z-everywhere** seam: every `ledger.json` row is a `blur
push` on axis `z`, direction `1`, with row-level `"blur": 10`. Each outgoing scene
blurs out and each incoming scene blurs in. This is a deliberate departure from
`/motion-doctrine`'s `LEFT` default. Keep this behavior consistent across dark cuts.

## Markup catalogue

These snippets use the class names in `template/themes/dark/scenes.part` and
`stage.part`. `@@particles@@`, `@@brand@@` and `@@trk@@` are build placeholders.

### Section title

```html
<div class="section-title cyan" id="p1-heading">MỘT CÂU LỆNH, MỘT BẢN DỰNG</div>
```

### Stage

```html
<div id="particle-field" aria-hidden="true">@@particles@@</div>
<div id="progress" aria-hidden="true"><i id="progress-fill"></i></div>
<div class="watermark" id="watermark-top"><img src="assets/logos/soi-repo-mark.svg" alt=""><span>@@brand@@</span></div>
<div class="watermark" id="watermark-bottom"><img src="assets/logos/soi-repo-mark.svg" alt=""><span>@@brand@@</span></div>
```

### `h1` repository walkthrough

`#w-h1` holds the browser card. Inside `.browser-view`, `#h1-zoom` holds scale only, about the view
center, and `#h1-pan` holds x and y only; the page image and the highlights live in `#h1-pan`, so they
move with the page. The cursor and the click ripple sit above the view in frame space. `.h1-decode` keeps
a full-size copy of the image decoded so every frame samples from the same pixels whatever the seek
order; leave it in. Never animate `#w-h1` itself: the seam stamps own it.

`build.py` inlines `h1-page.json` where the timeline says `@@walkthrough@@`. `walkthrough(PAGE)` returns
the helpers; each takes a target name from the rects, a start `t` and a duration `d` in recorded seconds:

| Helper | What it does |
|---|---|
| `zoomTo(name, t, d, zoom)` | zooms and pans so the target is centered, clamped to the page edges |
| `scrollTo(name, t, d)` | pans vertically to the target at the current zoom |
| `reset(t, d)` | returns to the full page |
| `cursorTo(name, t, d)` | moves the cursor to the target center under the current camera |
| `click(t)` | presses the cursor and ripples; `t` must be listed in `H1_CLICKS` |
| `spotlight(name, t, d)` | dims everything but the target |
| `outline(name, t, d)` | draws a box around the target |
| `underline(name, t, d)` | draws a marker line under the target |
| `done()` | checks that every time in `H1_CLICKS` was clicked |

The helpers throw while the timeline is built when a cue names an unknown target, when two camera cues
overlap, when a cursor cue overlaps a camera cue, or when the effective scale passes 2. Keep the camera
still while the cursor moves. Add a rect by hand in `timeline.js` for a part of a target, as the sample
does for the repository name. `H1_CLICKS` carries the `/*sfx:laser*/` marker, so `add-sfx.py` places a
laser under each click.

### `s1` comparison and number cards

```html
<div class="compare-row">
  <div class="compare-chip old surface"><span>Làm thủ công</span><i></i></div>
  <svg class="ic">…</svg>
  <div class="compare-chip new">Tự động chạy</div>
</div>
<article class="surface number-card"><strong>01</strong><span>Tải dự án mẫu</span></article>
<article class="surface number-card"><strong>02</strong><span>Chạy lệnh dựng</span></article>
```

### `s1` step tracker

```html
<div id="trk" data-layout-allow-overflow="true">
  @@trk@@
</div>
```

`build.py` expands `@@trk@@` into `.tk` tiles with `.tn` number badges, `.tr` progress
rings and `.dn` completion marks.

### `p1` browser evidence and source line

```html
<div class="surface browser-card" id="p1-shot">
  <div class="browser-bar">…</div><div class="browser-view">…</div>
</div>
<div class="source-line">Nguồn: github.com</div>
```

### `p1` prompt card

```html
<article class="surface prompt-card" id="p1-pc">
  <div class="prompt-head"><svg class="ic">…</svg><span>CÂU LỆNH</span></div>
  <div class="prompt-text">@@p:4@@</div>
</article>
```

### `p1` check and warning list

```html
<article class="surface status-card" id="p1-status">
  <div class="status-row ok"><svg class="ic">…</svg><span>Prompt đã sẵn sàng</span></div>
  <div class="status-row warn"><svg class="ic">…</svg><span>Chưa thêm video đầu ra</span></div>
</article>
```

### `cta` comment box

```html
<div class="surface comment-card" id="cta-cb">
  <div class="comment-icon"><svg class="ic">…</svg></div>
  <div class="comment-text"><span id="cta-ph">Bình luận…</span><span id="cta-word">@@ctaq@@</span></div>
  <div class="comment-send" id="cta-snd"><svg class="ic">…</svg></div>
</div>
```

### `ec` end card

```html
<img id="ec-logo" src="@@logo@@" alt="Soi Repo mark">
<div id="ec-brand">@@brand@@</div>
<div id="ec-slogan">@@slogan@@</div>
```

## Generated image prefix

Start every text-to-image prompt with this prefix, then name one subject
([`../house-style.md` §5](../house-style.md#5-real-media)):

```text
Flat vector illustration, one centred subject, near-black background, mint #4ADE80 and cyan #22D3EE accents with a soft glow, clean geometric shapes, no text, no letters, no logos.
```
