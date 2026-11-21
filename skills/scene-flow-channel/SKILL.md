---
name: scene-flow-channel
description: >-
  Set up a folder for a TikTok, Reels, or Shorts channel that holds many scene-flow videos: the
  channel's AGENTS.md style file, brand logos, a new-video script that creates each video with the
  channel branding, and videos/ and publish/ folders. Also suggests channel ideas: niche, audience,
  look, voice, and first topics. Use it when the author wants to start or organize a channel, says
  "tạo kênh", "lập kênh tiktok", "xây kênh", "dựng kênh", "khởi tạo kênh", or asks for channel ideas
  ("gợi ý ý tưởng kênh"). For a single video, use the scene-flow skill instead.
---

# scene-flow channel setup

This skill creates a channel folder. Each video inside it is a normal scene-flow project, made with
the `scene-flow` skill. Talk to the author in their language; the questions below are in Vietnamese
because most authors are.

## Order of work

Do one step at a time and wait for the author's answer.

1. **Find the channel idea.** If the author already has a channel name and niche, skip to step 2.
   Otherwise ask: "Bạn am hiểu hoặc thích chủ đề gì? Muốn nói với ai? Bạn tự thu giọng hay dùng
   giọng AI? Mỗi tuần đăng được mấy video?" Then propose three channel ideas, each with:
   - niche and audience;
   - the look that fits it, from the table below;
   - a voice option: the author's own recording, Vibi, or VieNeu-TTS on Colab;
   - two or three name ideas;
   - three first-video topics.
   Prefer niches where the author can show real footage or real expertise. In Claude Code you may
   check that the topics are current with the `scene-flow:topic-scout` sub-agent.

   | Look | Fits |
   |---|---|
   | `neon3d` | technology, AI tools, software, digital products |
   | `terra3d` | engineering, construction, geography, history |
   | `atlas3d` | history, geography, geopolitics, economics told on a map |
   | `legend2d` | folk tales and children's stories in flat 2D cartoon art |

2. **Collect the channel values.** Ask for any that are missing:
   - channel name and folder name: suggest a lowercase ASCII slug, such as `tiktok-goc-nhin-mo`;
   - parent folder: ask "Bạn muốn tạo kênh trong thư mục nào?";
   - slogan for the end card;
   - official logo files: the author's own files only. Never generate, draw, or trace a logo;
   - looks the channel will use, voice choice, address terms, and fixed hashtags.
   Leave an answer blank when the author has none yet.

3. **Confirm the path.** Show the full target path, `<parent>/<folder name>`, and the tree from
   "Layout" with the script name for this OS. Ask: "Tạo kênh tại `<path>`?" Write nothing before the
   author confirms. Refuse the home folder itself, the filesystem root, and any folder inside a
   plugin install or cache. If the target exists and is not empty, list what is there and ask
   before adding to it; never overwrite an existing file.

4. **Create the layout.** See "Layout" and "Files".

5. **Check it.**
   - macOS or Linux: `bash -n new-video.sh`.
   - Windows: `powershell -NoProfile -Command "Get-Command -Syntax .\new-video.ps1"` prints the
     usage line, or the parse error.

6. **Hand over.** Tell the author how to make the first video and offer to run it now:
   - macOS or Linux: `./new-video.sh <slug> "Tên video" <neon3d|terra3d|atlas3d|legend2d> [voice file]`
   - Windows: `powershell -ExecutionPolicy Bypass -File .\new-video.ps1 <slug> "Tên video" <neon3d|terra3d|atlas3d|legend2d> [voice file]`
   Then open the agent in `videos/<yyyy-mm>-<slug>/` and continue with the `scene-flow` skill,
   starting from a topic or a script.

## Layout

```text
<folder name>/
├── AGENTS.md              # channel rules: voice, branding, hashtags
├── CLAUDE.md              # one line: @AGENTS.md
├── brand/
│   ├── brand.json         # channel name, logo file name, slogan
│   └── logos/             # the channel's official logo files
├── new-video.sh           # macOS and Linux; new-video.ps1 on Windows
├── videos/
│   └── <yyyy-mm>-<slug>/  # one scene-flow project per video
└── publish/
    └── <yyyy-mm>-<slug>.mp4
```

Create `videos/` and `publish/` empty. Write only the script for the author's OS; write both only
if the author asks.

## Files

- **`AGENTS.md`.** Start with the title and the two opening paragraphs of
  `<scene-flow skill>/author/AGENTS.template.md`, where `<scene-flow skill>` is the base directory
  of the `scene-flow` skill. Add a `## Channel` heading with the name, niche, audience, looks, and
  voice choice. Under the template's other headings, write only what the author told you, such as
  address terms under "Voice and script" and fixed hashtags under "Branding". Do not copy the
  template's example entries; they describe another author.
- **`CLAUDE.md`.** Exactly one line: `@AGENTS.md`. Claude Code then loads the channel rules in
  every video folder below it.
- **`brand/brand.json`.** `{"name": "<channel name>", "logo": "<file name in brand/logos, or empty>", "slogan": "<slogan>"}`,
  written as UTF-8 JSON. Copy the author's logo files into `brand/logos/`. When there is no logo
  yet, leave `logo` empty and tell the author that the end card keeps the template logo until
  they add one.
- **New-video script.** Copy `templates/new-video.sh` or `templates/new-video.ps1` from this skill
  and replace `__SCENE_FLOW_SKILL__` with the absolute path of the `scene-flow` skill directory.
  On macOS and Linux, make `new-video.sh` executable. Write `new-video.ps1` as UTF-8 with a BOM,
  so Windows PowerShell 5.1 reads a non-ASCII path correctly.
  The script finds the skill in this order: `SCENE_FLOW_SKILL` in `~/.config/scene-flow/.env`, the
  newest version in the Claude Code plugin cache, then the path written at setup. It copies
  `brand/logos/` into the new project and sets `BRAND_NAME`, `BRAND_LOGO`, and `SLOGAN` in the
  project's `scripts/build.py` from `brand/brand.json`.

## Rules

- Ask before writing anything, and write only inside the confirmed folder.
- Never put API keys, tokens, or passwords in any channel file. Keys stay in `~/.config/scene-flow/.env`.
- Record later feedback that applies to every video of the channel in the channel's `AGENTS.md`,
  following the scene-flow skill's "Recording feedback" section.
- Final renders go to `publish/<yyyy-mm>-<slug>.mp4` when the author asks to publish or archive
  them.
