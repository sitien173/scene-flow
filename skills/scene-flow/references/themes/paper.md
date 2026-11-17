# Paper theme (selectable)

Choose this theme with `--theme paper`. Projects whose `meta.json` has no `theme` keep
rebuilding as paper. Follow the shared series-selection rules in
[`../house-style.md` §1](../house-style.md#1-workflow).

## Identity

| Element | Paper theme |
|---|---|
| Field | Moving paper plate; `paper.webp` is the still version. These assets are copied into paper projects only. |
| Type | K2D, localised woff2, weights 400–800 |
| Palette | violet `#7657FF` and `#A78BFA` on `#05061F`; gold `#FFC857` for step numbers only |
| Brand | `BRAND_LOGO` starts as `assets/logos/brand-logo.svg`; replace it with your logo. Set the end-card slogan in `SLOGAN`. |

## Opening recipe

Build the opening around the real product or its screen recording. Place it in a large
glass window tilted in 3D, lit from behind and turning toward the viewer. Put the product
mark beside the window and one claim-bearing object in the foreground.

## Background and captions

The paper plate steps aside while a recording plays. Prompt cards, a ring around the
control being tapped and other overlays sit above the recording. Paper captions use
K2D in the lower band, in uppercase. Unlit text is dark. The spoken word is white in a
violet box and scales to 1.08. Over black app footage, use white text with a dark halo.

## Transitions

Paper cuts follow the `LEFT` motion default. Chapter openers use `UP`; the bundled
sample marks `s1` as a chapter. The build writes `cut-the-curve LEFT` for other cuts
and `cut-the-curve UP` for cuts into `CHAPTERS`.

## Components

The paper theme's component catalogue lives in
`template/themes/paper/theme.css`. Its components include round badges, number discs,
brand tiles, browser and app windows, the glass bezel, evidence rings, marker, cursor,
step tracker and opener, Google search box, download bar, prompt card, link chip, task
rows, website sketch and chat widget, use-case cards, guide document, comment box,
captions and end card. Dark components are documented in [`dark.md`](dark.md).

## Generated image prefix

Start every text-to-image prompt with this prefix, then name one subject
([`../house-style.md` §5](../house-style.md#5-real-media)):

```text
Flat illustration, one centred subject, plain flat light lavender-grey background, violet #7657FF and #A78BFA fills with #05061F outlines, no text, no letters, no logos.
```
