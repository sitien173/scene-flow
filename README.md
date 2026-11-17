# AI Short Video Generator: Agent Skills Plugin (`scene-flow`)

This Agent Skills plugin for Claude Code, Codex, Pi, and agy generates **vertical 9:16 shorts (TikTok, Reels, YouTube Shorts)** from a **script and voiceover audio**. Visual cues align to narration down to individual syllables. New projects default to the Soi Repo dark motion-graphics theme, with paper and world3d themes also selectable:

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

Detailed guidelines reside in [skills/scene-flow/references/house-style.md](skills/scene-flow/references/house-style.md), [skills/scene-flow/references/themes/dark.md](skills/scene-flow/references/themes/dark.md), [skills/scene-flow/references/themes/paper.md](skills/scene-flow/references/themes/paper.md), and [skills/scene-flow/references/themes/world3d.md](skills/scene-flow/references/themes/world3d.md).

## Requirements

- Python 3.10+ (3.12 recommended)
- Node.js 22+
- FFmpeg
- Git and bash (on Windows, Git Bash is required for `scripts/make.sh`)
- [Claude Code](https://claude.com/claude-code)
- Disk space for the HyperFrames headless Chrome browser (downloaded automatically on the first run)

ASR and TTS features require a running Google Colab instance (`skills/scene-flow/colab/server.py`) with `COLAB_URL` and `COLAB_TOKEN` environment variables configured.

## Installation

### Install the plugin

Install from GitHub or from a clean clone. Local folder installs copy the whole working tree for Claude Code, Codex, and agy.

#### Claude Code

Clone the repository, then add the clone as a marketplace:

```bash
git clone https://github.com/sitien173/scene-flow
claude plugin marketplace add <dir>
claude plugin install scene-flow@scene-flow
```

Replace `<dir>` with the path to the `scene-flow` folder that `git clone` created.

Restart Claude Code after installing.

#### Codex

```bash
codex plugin marketplace add sitien173/scene-flow
codex plugin add scene-flow@scene-flow
```

#### Pi

```bash
pi install https://github.com/sitien173/scene-flow
```

#### agy

Clone the repository, then install from the clone folder:

```bash
git clone https://github.com/sitien173/scene-flow
agy plugin install <dir>
```

Replace `<dir>` with the path to the `scene-flow` folder that `git clone` created.

**Note:** If you also install the HyperFrames plugin or skills separately, they duplicate the bundled skills. Keep one copy.

### Install dependencies

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

### Install Python packages

Run these steps from the root of a clone of the repository. If you have no clone yet, run `git clone https://github.com/sitien173/scene-flow` and `cd scene-flow` first:

On Debian/Ubuntu (or environments enforcing virtual environments):
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r skills/scene-flow/requirements.txt
```
*(Windows and macOS may use plain `pip install -r skills/scene-flow/requirements.txt` without a virtual environment.)*

Check the machine once with `npx --yes hyperframes@0.8.140 doctor`.

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

For step-by-step instructions designed for non-programmers, read [docs/user-guide.md](docs/user-guide.md). The internal execution protocol is documented in [skills/scene-flow/SKILL.md](skills/scene-flow/SKILL.md).

## Repository Structure

```text
.claude-plugin/                       Claude Code plugin and marketplace manifests
.codex-plugin/                        Codex plugin manifest
plugin.json                           agy plugin manifest
package.json                          Pi package manifest and npm file list
LICENSE                               license text
THIRD_PARTY_NOTICES.md                attribution for bundled skills
skills/scene-flow/                    the scene-flow skill, files listed below
skills/scene-flow/SKILL.md            internal instructions for Claude Code
README.md                             this overview and setup guide
docs/user-guide.md                    non-programmer step-by-step user guide
skills/scene-flow/requirements.txt    Python libraries (numpy, Pillow)
skills/scene-flow/colab/server.py     Colab Whisper ASR and VieNeu-TTS server
skills/scene-flow/references/         rules: house style, dark, paper and world3d themes, traps, alignment, audio mixing
skills/scene-flow/scripts/            pipeline: voice prep, ASR, syllable timing, scene build, captions, SFX mix
skills/scene-flow/scripts/README.md   pipeline scripts reference
skills/scene-flow/template/           starter project files, dark, paper and world3d themes
tests/                                theme fixture tests
skills/scene-flow/assets/SOURCES.md   asset licensing and source references
skills/scene-flow/assets/audio/       house sound effects and background music bed
skills/scene-flow/assets/background/  paper background video (124s) and still image
skills/scene-flow/assets/fonts/       Be Vietnam Pro (dark) and K2D (paper)
skills/scene-flow/assets/logos/       official product logos and theme marks
skills/3dviz-pro-max/                 bundled dependency skill
skills/cut-the-curve/                 bundled dependency skill
skills/hyperframes/                   bundled dependency skill
skills/hyperframes-cli/               bundled dependency skill
skills/hyperframes-registry/          bundled dependency skill
skills/media-use/                     bundled dependency skill
skills/motion-doctrine/               bundled dependency skill
skills/oversized-cursor/              bundled dependency skill
skills/seam-craft/                    bundled dependency skill
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

Skill code and documentation are freely usable. Bundled assets belong to their original creators, detailed in [skills/scene-flow/assets/SOURCES.md](skills/scene-flow/assets/SOURCES.md):

- **Fonts:** SIL Open Font License 1.1 ([K2D](skills/scene-flow/assets/fonts/OFL.txt), [Be Vietnam Pro](skills/scene-flow/assets/fonts/BeVietnamPro-OFL.txt)).
- **Icons:** [Lucide](https://lucide.dev) under ISC license.
- **Logos:** Trademarks of their respective owners, used solely for product reference within videos.
- **Audio and background media:** Sourced from the author's library, mostly Pixabay. Check individual licenses in [skills/scene-flow/assets/SOURCES.md](skills/scene-flow/assets/SOURCES.md) prior to commercial use.

## Release checklist

- [ ] Audio redistribution rights verified by the owner.
- [ ] `LICENSE` copyright holder line set by the owner.
- [ ] Version bumped to the same value in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json`, `plugin.json`, and `package.json`.
- [ ] `claude plugin validate --strict .` and `agy plugin validate --strict .` pass.
- [ ] `bash tests/theme-fixture.sh /tmp/sf-check | tail -1` prints `9bd8551cea28e48788b3400bf148b2c53d1054ec705a17e4db1c62e779daa2a2`.
