# AI Short Video Generator: Claude Code Skill (`scene-flow`)

This Claude Code skill generates **vertical 9:16 shorts (TikTok, Reels, YouTube Shorts)** from a **script and voiceover audio**. Visual cues align to narration down to individual syllables. New projects default to the Soi Repo dark motion-graphics theme, with paper and world3d themes also selectable:

- **Dark theme (default)**: Deep dark background with subtle drifting particles, Be Vietnam Pro typography, mint `#4ADE80` and cyan `#22D3EE` accents.
- **Paper theme (selectable)**: Moving textured paper plate, K2D typography, violet `#7657FF` accents.
- **World3d theme (selectable)**: A continuous Three.js scene driven by `world.json`, with camera stops anchored to spoken words.
- **Visual evidence over text**: Real product logos, screen recordings, and public page captures rather than text slides.
- **Karaoke captions**: Spoken words highlight in sync with audio.
- **Full prompts on cards**: Prompts light up word by word as spoken.
- **Interactive CTA**: Chat comment input box before the end card.
- **Audio suite**: Sound effects (thud, swoosh, pop, laser, camera shutter, riser) and background music bed.

Supply a script and voice recording. If you do not have audio yet, the skill supports VieNeu-TTS running on a Google Colab GPU server (preset voices or cloned from a reference sample). Claude prompts you to select self-recording, your own TTS API, or the Colab server. Claude levels audio, aligns syllables, builds scenes, mixes sound, and provides a **local browser preview**. Renders export to MP4 only when requested.

## Capabilities

| Stage | Details |
|---|---|
| **Input** | Script (one sentence per line) and audio: self-recorded (`.wav`, `.mp3`, `.m4a`), your TTS API (ElevenLabs, OpenAI), or **VieNeu-TTS on Google Colab**. Optional: screen recordings, 9:16 video clips, web URLs, custom brand logos. |
| **Alignment** | Speech recognition via OpenAI Whisper on Google Colab aligns script syllables to recording timestamps. Scene cuts occur during pauses. |
| **Visuals** | Real video footage retimed to voice with privacy blurring, web captures via CDP, official product logos, prompt cards, step counters, comment CTA, and end card. |
| **Audio** | Voice normalized to -21.0 LUFS. Automated cue placement: opening thud, seam swooshes, pop on key icons, laser on clicks, camera shutter on key metrics, riser peak on hook cutoff, background music bed. |
| **Verification** | Frame snapshots for instant visual validation, seam gate audits, and sync checks. |
| **Output** | HyperFrames Studio preview (`localhost`). Full 1080x1920 30fps MP4 render on request. |

Detailed guidelines reside in [references/house-style.md](references/house-style.md), [references/themes/dark.md](references/themes/dark.md), [references/themes/paper.md](references/themes/paper.md), and [references/themes/world3d.md](references/themes/world3d.md).

## Requirements

- Python 3.10+ (3.12 recommended)
- Node.js 22+
- FFmpeg
- Git and bash (on Windows, Git Bash is required for `scripts/make.sh`)
- [Claude Code](https://claude.com/claude-code)
- Disk space for the HyperFrames headless Chrome browser (downloaded automatically on the first run)

ASR and TTS features require a running Google Colab instance (`colab/server.py`) with `COLAB_URL` and `COLAB_TOKEN` environment variables configured.

## Installation

### 1. Clone the skill

Clone into your Claude Code skills directory:

```bash
git clone https://github.com/slimsoftvietnam/scene-flow ~/.claude/skills/scene-flow
```

On Windows PowerShell:

```powershell
git clone https://github.com/slimsoftvietnam/scene-flow "$env:USERPROFILE\.claude\skills\scene-flow"
```

To install for a single project folder, clone into `<project-folder>/.claude/skills/scene-flow`.

### 2. Install dependencies

**Windows (winget):**
```powershell
winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements
```
Open a new terminal after running winget so PATH refreshes. Git Bash is required for `scripts/make.sh`.

**macOS (Homebrew):**
```bash
brew install python@3.12 ffmpeg node git
```

**Debian / Ubuntu (apt):**
```bash
sudo apt update && sudo apt install -y python3 python3-venv python3-pip ffmpeg git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```
Check `node --version` is 22 or higher.

### 3. Install Python packages and HyperFrames skills

From the skill directory:

On Debian/Ubuntu (or environments enforcing virtual environments):
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
*(Windows and macOS may use plain `pip install -r requirements.txt` without a virtual environment.)*

Install HyperFrames skills:
```bash
npx --yes hyperframes@0.8.140 skills update motion-doctrine hyperframes-core hyperframes-cli media-use
npx --yes hyperframes@0.8.140 doctor
```

Restart Claude Code after installing.

## Quick Start

Open Claude Code in your project directory and send a prompt with your script and recording:

```text
Tạo video tiktok về cách tạo chatbot AI. Đây là file âm thanh nói: D:\recordings\chatbot.wav.
1. Phải có logo của các công cụ xuất hiện trong video.
2. Hạn chế chữ, dùng video / hình ảnh để giải thích.
3. Đoạn đầu dùng video này: D:\clip\demo.mp4
4. Phần comment dùng từ khóa CHATBOT.
Kịch bản:
<dán kịch bản, mỗi câu một dòng>
```
*(English gloss: Create a TikTok video about building an AI chatbot. Here is the voiceover: D:\recordings\chatbot.wav. 1. Include product logos. 2. Minimize text, use visuals/recordings. 3. Use demo.mp4 for hook. 4. Use CHATBOT in comment CTA. Script: one sentence per line.)*

Additional prompt options:
- `"Dùng theme paper"` *(Use the paper theme)*
- `"Dùng theme world3d"` *(Use the world3d theme)*
- `"Dùng giọng AI từ Colab"` *(Synthesize voiceover via Colab)*

Workflow steps executed by Claude:
1. Creates project scaffolding.
2. Levels voice audio and aligns syllables.
3. Authors timeline scenes and mixes audio.
4. Validates layout via frame snapshots.
5. Launches Studio preview link (`http://localhost:3002/#project/<name>`).

Inspect the preview in your browser. Request edits as needed ("visuals lead voice", "scene duration too short", "make typography larger"). When satisfied, say **"render video"** to export the MP4 file.

For step-by-step instructions designed for non-programmers, read [docs/user-guide.md](docs/user-guide.md). The internal execution protocol is documented in [SKILL.md](SKILL.md).

## Repository Structure

```text
SKILL.md                 internal instructions for Claude Code
README.md                this overview and setup guide
docs/user-guide.md       non-programmer step-by-step user guide
requirements.txt         Python libraries (numpy, Pillow)
colab/server.py          Colab Whisper ASR and VieNeu-TTS server
references/              rules: house style, dark, paper and world3d themes, traps, alignment, audio mixing
scripts/                 pipeline: voice prep, ASR, syllable timing, scene build, captions, SFX mix
scripts/README.md        pipeline scripts reference
template/                starter project files, dark, paper and world3d themes
tests/                   theme fixture tests
assets/SOURCES.md        asset licensing and source references
assets/audio/            house sound effects and background music bed
assets/background/       paper background video (124s) and still image
assets/fonts/            Be Vietnam Pro (dark) and K2D (paper)
assets/logos/            official product logos and theme marks
```

No mascot ships with the skill. If you have your own mascot (a transparent `.webm` file), ask Claude to place it in the lower-left corner during the opening hook.

## Notes

- **Paper background loop:** The bundled moving paper video is 124 seconds long. For longer films, loop the plate before building:
  ```bash
  ffmpeg -stream_loop 1 -i paper-bg.mp4 -c copy paper-bg-long.mp4
  ```
- **Pinned HyperFrames version:** Each project pins `hyperframes@0.8.140` in `package.json` to preserve consistent visual output over time.
- **Studio "did not reload":** If HyperFrames Studio shows "the preview did not reload (it took too long to load)", refresh the page (F5) and wait 20 seconds.

## Asset Licensing

Skill code and documentation are freely usable. Bundled assets belong to their original creators, detailed in [assets/SOURCES.md](assets/SOURCES.md):

- **Fonts:** SIL Open Font License 1.1 ([K2D](assets/fonts/OFL.txt), [Be Vietnam Pro](assets/fonts/BeVietnamPro-OFL.txt)).
- **Icons:** [Lucide](https://lucide.dev) under ISC license.
- **Logos:** Trademarks of their respective owners, used solely for product reference within videos.
- **Audio and background media:** Sourced from the author's library, mostly Pixabay. Check individual licenses in [assets/SOURCES.md](assets/SOURCES.md) prior to commercial use.
