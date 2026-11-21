# Style: shared rules for every narrated short

Read this before designing a narrated short, not after the first review. These rules apply to
every author and every theme.

Rules live in three tiers. When two tiers disagree, the more specific one wins.

| Tier | File | Holds |
|---|---|---|
| Plugin | this file and the [theme guides](themes/) | rules for every author |
| Author | `AGENTS.md` in the folder that holds the author's projects | the author's own preferences, carried into every video |
| Project | `CLAUDE.md` in the project folder | feedback that applies to this video only |

Never write an author's feedback into this file. Record it as [SKILL.md](../SKILL.md#recording-feedback) describes.

---

## 1. Workflow

**Open the preview; never render unasked.** Build, verify with snapshots, then run
`npx hyperframes preview --background` and hand over the link. Render only when the author
asks. A render takes minutes and is wrong in exactly the way the composition is; the author
catches problems faster on playback.

**Don't poll a long render.** Run it in the background and wait for the notification.

**Confirm the voice plays from the first second to the last.** A voice track can be present in
the file and still silent on screen: a `data-start` past zero, a `data-duration` shorter than
the recording, a clip cut by a later edit. After placing it, check that `#vo`'s `data-duration`
equals the recording's real length from `ffprobe`. Measure the render's audio at the very start
and in the last ten seconds of speech.

**Voice length is the author's call.** When a recording runs long, measure how much
pause-tightening can recover, usually 6 to 20 s because TTS reads are already tight. Show the
options with their real cost and let the author choose. Offer; don't decide.

**Carry the latest project's style forward.** Open the latest project and keep its palette,
type, bookends, sound set and scripts.

**Always ask the author which theme to use before creating a project.** There is no default
theme. List neon3d, terra3d, atlas3d, and cleanui, and mark the latest project's theme as the
suggestion when there is one. Never pick a theme the author has not named. Then read the
selected guide in [themes/](themes/).

---

## 2. Bookends

The bookends are part of the template. Each theme ships its end card in
`template/themes/<theme>/timeline.js`. Use the selected theme's brand inputs; its
guide lists the bundled mark and defaults.

No mascot ships. The author may supply a transparent `.webm`; its size and placement are author
preferences.

**Match the rhythm to the voice; keep the selected identity.** A playful read can use faster
cuts and bouncier type. Use the palette in the selected theme guide.

**Keep the author's own words in captions.** Address terms and slang are part of the author's
voice. Transcribe them as spoken; never correct them.

---

## 3. Text economy

- **Full sentences appear only where the viewer will pause and copy them:** a prompt, a
  command, a template. Nothing else gets a paragraph.
- **Everything else is a picture:** an icon, a diagram, a real screenshot, a screen recording,
  a chart. The narration already says the words; the frame shows what the words mean.
- Titles, one-line theses and punchlines may stay as text. Explanations may not.

**Size is not negotiable.** Fewer words means each one can be big. Minimum sizes:

| element | minimum |
|---|---|
| chapter title | 104px / 800 |
| a time, number or key label | 62px / 800, in a pill or panel |
| body line | 44–46px / 600 |
| icon or glyph | 130–190px |
| chip | 44px |

Anything below 40px reads as a mistake on a phone.

---

## 4. What each scene needs

**Give a key idea its own scene, not a caption.** When the narration states the video's central
claim, it gets a visual beat built for it, not a line of text over whatever was already on
screen.

**Every chapter opener carries a picture of its meaning.** A number and a title are not enough.
The icon must depict the concept: an expert is a person with a tie and a verified badge, digging
is a spade planted in the ground, money is a coin with a currency mark. Test it at a glance; a
shovel can read as a pen and a coin stack as a database. Zoom into every glyph before handing
over with `snapshot --zoom "#id"`.

**Name a product, show its logo.** When the narration names ChatGPT, Claude, a PDF or a website,
the mark appears. Best placements: beside the product name in the hook, as the assistant's
avatar on every answer panel, beside a file type the scene is about.

**The opening is a picture, not a title.** The first five seconds decide the view. They need the
product logo, one picture that states the promise, and something moving. The captions already
carry the words; the opening's own text is a small series pill plus at most one or two words
inside the picture, such as a price on a tag. The selected theme guide gives the opening
recipe. Before handing it over:
- **Nothing covers the logo, at any moment.** Snapshot the hook at 5 to 8 times. Product footage
  zooms and pans, so a spot that is clear at 1 s can sit on the logo at 4 s.
- **Never crop footage that zooms.** A crop tuned to the wide phase cuts the zoomed one off at
  both sides. Use the full frame.
- **Trim the source's static intro.** Official demos often hold a wide frame with a tiny logo
  before zooming in. Start at the motion; slowing a 60 fps source up to 2x stays smooth.
- **Reveal with an edge, not a fade.** An object emerging from behind another is opaque from its
  first frame and revealed by the front object's edge through z-index. Cross-fading it while it
  travels shows a half-transparent block mid-way.

**A cut must land on something.** Snapshot 0.2 to 0.4 s after every seam. The scene's opening
element, such as the chapter number, the warning sign or the first logo, fires on the cut; only
the title waits for the word that names it. Otherwise the wrapper entry animates an empty frame.

**Put a supplied clip where the author points,** not where it would also fit.

**Result panels show substance, not quantity.** Skeleton bars suit text the viewer need not read,
but a result is the one place they do need the content. Show three short real phrases instead
of bars. When a prompt asks for X, Y and Z, the result panel shows `+ X · + Y · + Z`; the causal
link is the point.

**A comment CTA is a chat input:** a rounded input with the keyword typed in and a send button
that pops when the word lands. Not a big word on its own.

**Scenes may change setting; the language may not.** A video need not stay in one workspace, but
it keeps one visual identity, palette, typography, icon system and motion language. Connect
scenes with a meaningful object, image or transition instead of a full reset; use
`/motion-doctrine`'s seam law.

---

## 5. Real media

**Prefer the real thing when the author supplies it.** The author's footage, screenshots and
screen recordings beat any simulation. When one arrives, delete the mock-up it replaces.
- Trim to the action. Crop to the region that shows it, then let it bleed wider than the safe
  margin; a desktop UI strip in a 9:16 frame only gets bigger by going wider.
- Frame it as a browser window with a short URL line so it reads as evidence.
- Keep it `muted`, at stage level or inside a scene wrapper, never nested in another timed clip.

**A vertical clip plays full-frame, uncropped.**

**Phone recordings play full-frame, not in a window.**
- Cut only the status bar, where the red record pill sits, and keep every other pixel of the UI.
  An iPhone recording is narrower than 9:16: scale it to the frame height and fill the two side
  strips with the same frame blurred and darkened. Never crop the input bar or the top bar to
  fill the width.
- Follow the selected theme guide for its background and caption treatment over recordings.
- Privacy applies frame by frame: an animated greeting with the account's name can slide
  through more than one position. Step through it at 0.05 s before trusting a blur box.

**Capture public pages with `npx hyperframes capture <url>`**, not the browser pane, whose
~800px viewport scales up blurry. `capture` writes 1920×1080 PNGs. Crop to the two sentences
that carry the claim, at a width that lands near 1:1 in the frame. A whole help page shrunk to
888px proves a document exists and lets nobody read it.

**Never screenshot the author's own logged-in account.** A Claude or ChatGPT sidebar lists every
conversation title, and a published video exposes them. Use a public page, a UI simulation, or
ask for a clean recording.

**Scrub the author's recordings for private data before using them.** Search suggestions, usage
statistics and task lists naming client work are easy to miss when a clip is sent. Blur the
region but keep the typed query visible, since it carries the story; or crop to the part that
does the work: the input box, the result, the button. When media the author sent contains
legible private detail, use it, but say so in one line so the author can choose to blur it.

**Treat a background plate before using it.** A supplied loop is often brightest where the
captions sit. Darken it with a graded scrim, heaviest at the bottom. Loop it seamlessly, as
[traps.md](traps.md) describes, and pre-render it to the full duration instead of relying on
runtime looping.

### Finding a picture

Find a picture before you draw or generate one. A chapter opener or an abstract claim needs a
picture of its meaning (§4). Take the first source that fits:

| order | source | use it for |
|---|---|---|
| 1 | the author's footage, screen recordings, public page captures | the default, everything above |
| 2 | official logo files (§6) | any product the voice names |
| 3 | HeyGen asset search through `media-use`, licence checked per file | a concrete object, place or person the voice names |
| 4 | text-to-image through an OpenAI-compatible API, optional | an abstract idea that no search returns |

Text-to-video is not part of this pipeline. Motion comes from the composition.

Search stock with the bundled `media-use` skill. It needs a free HyperFrames sign-in. Check
sign-in with `npx --yes hyperframes@0.8.140 auth status` first. If the author is signed out, ask
them to run `npx --yes hyperframes@0.8.140 auth login` themselves, because it is interactive.
`--provider heygen` pins resolution to HeyGen asset search. Use it on every `--type image`
request; without it, a catalog miss can fall through to a local generator.
```bash
npx --yes hyperframes@0.8.140 media-use resolve --type icon --intent "person digging with a spade" --project .
npx --yes hyperframes@0.8.140 media-use resolve --type image --intent "empty piggy bank" --provider heygen --project .
```
A picture found on a site that states its licence, such as Openverse, Wikimedia Commons, Pexels
or Unsplash, comes in by direct URL:
`npx --yes hyperframes@0.8.140 media-use resolve --type image --from "<image url>" --intent "<what it shows>" --project .`.
Never take a picture from a search-engine results page or a site with no stated licence.

Generate only when the author has set `IMAGE_API_URL` (base URL ending in `/v1`),
`IMAGE_API_KEY` and `IMAGE_MODEL` in `~/.config/scene-flow/.env`. Without them, draw the icon.
`python scripts/settings.py IMAGE_API_KEY > /dev/null` exits non-zero when one is missing. Never
ask for the key in chat, never type it into a command, never print it, never commit it. Require
`IMAGE_API_URL` to start with `https://`.
```bash
mkdir -p research/gen
url=$(python scripts/settings.py IMAGE_API_URL) && model=$(python scripts/settings.py IMAGE_MODEL) &&
jq -n --arg m "$model" --arg p "<theme prefix> <subject>" \
  '{model: $m, prompt: $p, n: 1, size: "1024x1536"}' > research/gen/<name>.req.json &&
python scripts/settings.py IMAGE_API_KEY | sed 's/.*/header = "Authorization: Bearer &"/' \
| curl -sS --fail-with-body -K - "$url/images/generations" \
    -H "Content-Type: application/json" -d @research/gen/<name>.req.json \
    -o research/gen/<name>.json
```
Never add `-v`, `--trace` or `--trace-ascii`; they print the key. Delete
`research/gen/<name>.json` after decoding the picture, and keep `research/gen/` out of git.

Start the prompt with the selected theme's image prefix. Decode `data[0].b64_json` to a PNG, or
download `data[0].url` when the provider returns a link. Then ingest the file with
`npx --yes hyperframes@0.8.140 media-use resolve --type image --from <file>` so it lands in the
ledger.

- A generated picture illustrates; it never proves. Never generate a product interface, a logo,
  a screenshot, a real person, or anything that stands in for evidence.
- Keep words out of the picture. Captions and titles carry the text.
- Zoom into every generated picture as for icons (§4): it must read at a glance.
- Tell the author which scenes use generated pictures, so they can decide on the platform's
  AI-content label before publishing.

Record every sourced or generated picture in the project's `assets/SOURCES.md`: file, source URL
or provider and model, licence or "AI-generated", the credit line a licence requires, the date,
and for a generated picture the full prompt.

---

## 6. Logos and brand marks

**Use official files for external product marks. Never generate or trace those marks.**

| mark | where it lives | how it renders |
|---|---|---|
| OpenAI / ChatGPT | `assets/logos/openai.svg` (its path in `openai-path.txt`, read by build.py) | black on a white tile; `filter:invert(1)` for white |
| Claude | `assets/logos/claude.svg` | white on a `#D97757` terracotta tile |
| GitHub | `assets/logos/github-mark.svg` | black on white |
| Google | `assets/logos/google-g.png` | as-is |
| PDF | draw it: document outline + folded corner + "PDF" in red | not a brand mark |

Copy into the project's `assets/logos/` and record provenance in a `SOURCES.md` beside them.

---

## 7. Sound

The house sound set ships in `assets/audio/` and `scripts/add-sfx.py` places it:

| cue | file | when | target |
|---|---|---|---|
| thud | `sfx-thud.mp3` | once, t=0 | −22 dB |
| swoosh | `sfx-swoosh.mp3` | every scene cut, which is every ledger row | −28 dB |
| pop | `sfx-pop.mp3` | only an important icon appearing; see below | −29 dB, −33 inside a fast cascade |
| laser | `sfx-laser.mp3` | a click on a control the picture shows | −26 dB |
| shutter | `sfx-click.mp3` | an important number such as 99% or a count | −30 dB |
| riser | `sfx-risercut3.mp3` | the hook; peaks on its dead stop | −24 dB |
| bed | `bgm-little-things.mp3` | whole film | −31 to −33 dB, 10 to 12 under the voice |

Levels are computed, not tuned by ear: see [audio-mix.md](audio-mix.md). The voice is
normalised to **−21.0 LUFS** first so every video lands at the same loudness.

**Pop is rationed, not per element.** A pop on everything that appears gives over 100 pops in a
100-second video. Give a pop only to an icon that carries the point of its sentence: a product or
logo arriving, the object the claim is about, the summary points, the end-card logo. Titles,
labels, chapter numbers, skeleton lines, cascades and anything within ~0.5 s of a swoosh stay
silent. Aim for roughly one pop every 3 to 4 seconds.

---

## 8. Content and accuracy

**API keys never enter a project.** Read a key only from `~/.config/scene-flow/.env` through
`scripts/settings.py`, never from the environment; if it is absent, fall back to native SVG and
CSS and never error. Never hardcode a key, store it in source, or show it in a video. If the
author pastes a key into chat, do not use it: ask them to add it to that file, and tell them once
that it is now in the transcript and should be rotated.

**Plain language.** No jargon on screen, such as "Critical threshold" or a benchmark's internal
name. Say what it means.

**Fact-check every claim against the primary source** before it goes on screen. Drafts can carry
a wrong attribution, such as a benchmark score belonging to a different model version, or an
unsupported figure. Correct the error, drop the unverifiable, and say which in `BRIEF.md`.

**The picture must never promise more than the source does.** When a recorded line overstates,
don't silently re-word the voice and don't contradict it on screen. Show the source untranslated
so the picture stays honest, and tell the author what the line omits so they can decide whether
to re-record.

**A money figure inside a prompt is an example, not a result.** Set it at body size, inside the
prompt, with no count-up and no chart. If the narration later disowns it, the picture recedes
with it.

---

## 9. The script

**Write the way the author talks.** Read the author's style file and their last `SCRIPT.md`
before drafting; `template/SCRIPT.md` shows a sample register. Use flowing, comma-paced spoken
sentences, not clipped fragments: a draft built from short lines reads as a list being recited,
not a person talking. A line under ~10 syllables should be a deliberate beat, not the default.

**A dictated line is kept as dictated.** When the author writes "sửa X thành Y", Y is the line.
Smooth only its grammar and word order; do not rephrase it into your own style. If Y introduces
a claim, fact-check it like any other and raise a problem rather than quietly rewriting.

**Name both halves when a video does two things.** A how-to that creates and edits must say both
in the hook and label both in the steps, such as "tạo video" and "edit video". A hook that
promises only one undersells the video.
