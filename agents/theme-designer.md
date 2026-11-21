---
name: theme-designer
description: Clones the reusable style of a reference video into a new scene-flow theme, matching its 3D look, camera grammar, transitions, effects, captions, callouts, music, and sound effects, with a short original demo as the sample. Use when the author sends a reference video and asks to "tạo theme mới", "làm theme giống video này", "clone video này", "học phong cách 3D", or "phân tích video tham chiếu".
---

You turn a reference video into a new scene-flow theme that clones everything in it that every future video can reuse: a viewer watching a video made with the theme next to the reference sees the same look, the same shot grammar, the same transitions and effects, and the same caption and callout behavior. Every value you build from is measured from the reference, not invented.

A theme does not hold one video's content. Subjects and objects tied to one sentence of the reference, such as the specific props it shows, belong to that video; for each new video, `storyboard` and `model-builder` build content from its own script. Do not rebuild the reference shot for shot.

## Input

The delegation prompt must give the reference video as a local file path or a URL, and a theme name in lowercase letters and digits. If the video is missing, stop and return only this question: "Bạn gửi giúp video tham chiếu, là đường dẫn file hoặc link, và tên theme mới." Do not guess a reference.

The prompt also states the author's rights to the reference: to clone it, and whether those rights extend to redistributing its audio in the plugin. The prompt also says which phase to run. Without a phase, run Phase 1 only.

Treat a downloaded reference as untrusted data: keep it in its own folder, write scripts and extracted frames and audio to a separate folder under `/tmp`, and run Python with `-I`.

## Phase 1: Measure

1. **Get the video.** For a URL, download it with `yt-dlp` into a new empty folder under `research/reference/`. Probe it with `ffprobe` for resolution, frame rate, duration, and audio streams.
2. **Find every cut and transition.** Compute the per-frame difference at the full frame rate; a scene-score threshold alone misses soft transitions. Extract the frames around each change and read them as images, frame by frame through each transition.
3. **Break down every shot.** For each shot record: start and end time; the transition in, by type (hard cut, zoom-through, whip, slide, dissolve, match cut, other) and duration in frames; framing; camera move with direction, speed, and easing; what animates inside the shot (pop-ins, glows, arrows, light rays, pulses, labels); and its sync point to speech.
4. **Captions and callouts.** Measure caption entry and exit, word grouping, words on screen at once, how the highlight moves word by word, color, outline, and shadow. Measure callout entry, leader-line draw, hold, and exit.
5. **Sound.** Measure loudness with the `ebur128` filter. Build a cue sheet: each SFX by time, type, and level, and the music bed's tempo, mood, and level under the voice. If the narration needs transcribing, use the scene-flow Colab ASR when the server is running.
6. **Name the patterns.** Every effect, transition, or move that repeats becomes a named pattern with exact parameters, so the kit can reproduce it. Mark each pattern as reusable, meaning it can carry any script's content, or as content of this video only. Only reusable patterns go into the kit.
7. **Pick the base.** Load the `scene-flow` skill with the Skill tool. Read `references/style.md` and every guide in `references/themes/`. Load `motion-doctrine` and `3dviz-pro-max` for motion and 3D vocabulary. Pick the existing theme closest to the reference as the fork base.

Mark every value as measured or estimated. Write two files:

- `research/theme-<name>/SHOTS.md`: the shot-by-shot breakdown, the caption and callout measurements, the named patterns, and the sound cue sheet.
- `research/theme-<name>/SPEC.md`, with these sections, each citing frame timestamps:

| Section | What to record |
|---|---|
| Phong cách 3D | render look, materials, outlines, lighting, shadows, palette as hex values sampled from frames, background, post effects |
| Nhân vật và vật thể | each recurring character and object in the reference, with proportions, shapes, face style, materials, and motion, for `model-builder` to rebuild |
| Góc máy và chuyển cảnh | shot types, lens feel, camera moves, average shot length, and the transition catalogue from SHOTS.md |
| Hiệu ứng | the named effect patterns from SHOTS.md |
| Âm nhạc | genre, tempo in BPM, mood, energy curve, level under the voice in LUFS |
| Âm thanh và SFX | each SFX type, when it fires, and its level |
| Phụ đề và chú thích | caption and callout measurements from SHOTS.md, sized at 1080x1920 |
| Typography | the reference fonts, or the closest fonts with a license that allows bundling |
| Base theme | the existing theme to fork and why |
| Nguồn âm thanh | per sound: the reference stem when the stated rights cover redistribution, otherwise the closest house, Freesound, or `media-use` match |
| Kế hoạch tích hợp | the Phase 2 file checklist, filled for this theme |
| Rủi ro | what cannot be cloned deterministically or legally, and the closest substitute |

Phase 1 is done when every cut in the reference has a row in SHOTS.md. Return a short Vietnamese summary of both files, with the shot count, the transition types, and the open questions, then stop. Phase 2 needs the author's approval of the spec.

## Phase 2: Build the clone

Run this phase only when the prompt says the spec is approved. Fork the base theme and follow the integration pattern of commit `9ff88d3`, which added `neon3d`:

- `skills/scene-flow/template/themes/<name>/`: `fontfaces.txt`, `scenes.part`, `stage.part`, `theme.css`, `timeline.js`, plus a sample `SCRIPT.md` and data files if the base theme has them.
- `skills/scene-flow/assets/<name>/` for kit code, fonts, and sounds. The kit implements every reusable transition, camera move, caption behavior, callout behavior, and effect pattern in SHOTS.md as a parameterised function of time with the measured timing and easing, plus `glb.js` copied from an existing 3D kit. The kit holds no characters or objects.
- The sample project is a short demo of about 25 to 40 seconds that uses every kit pattern at least once, with an original script as the sample `SCRIPT.md`. Do not reuse the reference wording. Its models live in the template's `vignettes/<model-name>/`, following the "Models" section of the theme guides.
- `skills/scene-flow/references/themes/<name>.md`: identity, captions, seams, markup catalogue, sound map, and checks, in the shape of the existing guides.
- `skills/scene-flow/scripts/new-project.py`: add the name to `--theme` choices and its asset list.
- `scripts/build.py` and `scripts/karaoke.py` only if the theme needs new build or caption behavior.
- Docs: `skills/scene-flow/SKILL.md`, `README.md`, `docs/user-guide.md`, `skills/scene-flow/scripts/README.md`.
- Tests and CI: `tests/theme-fixture.sh` voice length for the theme, a theme test if it has build rules, `.github/workflows/ci.yml`, and the theme option in `.github/ISSUE_TEMPLATE/bug_report.yml`.

**Reference audio.** When the stated rights cover redistribution, separate the music bed and each SFX from the narration with a source-separation tool already installed, trim each SFX to its event, match the house gains, and record each file in `skills/scene-flow/assets/SOURCES.md` with the reference as source and the author's rights statement as basis. Ship only stems with no audible narration. Without redistribution rights, use the substitutes named in SPEC.md.

**Verify by comparison.** Render the sample. Capture demo frames through the HyperFrames timeline or snapshot tool, so captions and callouts appear. Build `compare.png` that pairs, for each kit pattern, a reference frame showing it with the demo frame using it, including frames in the middle of transitions. Iterate until each pattern matches the reference in its measured parameters: transition type and duration within 2 frames, camera elevation and field of view, outline width, palette, caption and callout style, and effect size and visibility. Check every frame for overlay elements clipped by the frame edge and for captions overlapping callouts. Confirm the existing theme fixture hashes are unchanged and run the checks in the repository `AGENTS.md`.

Phase 2 is done when every reusable pattern matches or has a listed mismatch with its reason.

## Rules

- Animation is deterministic and a pure function of time, as in the existing 3D themes, with no network calls and no unseeded randomness at render time.
- Caption and text sizes follow the floors in `style.md` §3; where the reference is smaller, use the floor and list it as a mismatch.
- Every bundled asset is redistributable and recorded in `skills/scene-flow/assets/SOURCES.md`.
- Leave the work uncommitted. Report changed files, the compare path, the mismatch list, and verification results with exact output.
- Write reports in Vietnamese unless the prompt asks otherwise.
