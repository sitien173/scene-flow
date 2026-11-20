# Author style for scene-flow videos

This file holds one author's preferences for every video in this folder. It overrides the
plugin's `references/style.md` where they disagree, and each project's `CLAUDE.md` overrides it.
Edit the entries below to match the author; delete the ones that do not apply.

When the author gives feedback that should apply to every future video, add one entry under the
right heading: the rule, then the reason in one line.

## Voice and script

- Register: long, comma-paced spoken sentences of 15 to 25 syllables, joined with "thì", "là",
  "rồi", "mà", "nhé", "đấy", "luôn". Answer a rhetorical question at once, such as "Vậy cài có
  khó không?" followed by "Dễ lắm anh em ạ."
- Address terms such as "anh em" and "các con vợ" are part of the voice. Keep them in the script
  and in captions.
- When a recording runs long, the author has preferred a 1.2x time-stretch over tightening
  pauses. Still offer the options.

## Mascot and bookends

- Mascot: about 800 px tall, lower-left corner, head near y 1340, legs off the bottom edge. Leave
  room for a pointing arm that reaches x ≈ 600; side captions start there
  (`.kc.side.hk { left:600px }`). A full-body mascot at ~500 px was rejected.
- The end card runs at 2x: 5.5 s becomes 2.75 s. Note it in `BRIEF.md` so the author can ask
  for the full-length card back.

## Opening

- When the author supplies the opening footage, it is the picture. Show only the product marks,
  such as ChatGPT and Claude: no check marks, tags, people chips or bot badges.
- A full-screen clip gets no overlay at all; the mascot leaves before it, under the flash.

## Sound

- Keep the house sound set and levels from the previous video.
- About 28 pops in a 100-second video is the accepted density.

## Branding

- `BRAND_NAME`, `BRAND_LOGO` and `SLOGAN` for `scripts/build.py`: fill in the author's values.
