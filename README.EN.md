# scene-flow: narrated vertical videos with Claude

[![CI](https://github.com/sitien173/scene-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/sitien173/scene-flow/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[Tiếng Việt](README.md)

scene-flow turns a script and a voice recording into a 9:16 video for TikTok, Reels, and YouTube Shorts. Pictures, captions, and sound effects follow the voice word by word. You describe the video in plain language, review it in your browser, and ask for changes until you are happy. Claude exports the MP4 only when you ask.

## What you get

- **Three looks:** `neon3d` (short neon 3D scenes), `terra3d` (short daylight 3D scenes for engineering, geography, and history), and `atlas3d` (old-style map scenes with map pans and backdrop photos). Claude asks which one to use for each video.
- **Real pictures over text:** product logos, your screen recordings, and captures of web pages.
- **Captions in sync:** each spoken word lights up as it is said.
- **Sound:** a music bed and sound effects on scene changes and key moments.
- **Voice:** use your own recording, or generate one with a free AI voice on Google Colab.

## Install

Open a terminal and paste one line. The installer checks each tool first and skips the ones you already have. Before installing anything, it asks you to confirm.

**Windows:** open PowerShell and run:

```powershell
irm https://raw.githubusercontent.com/sitien173/scene-flow/main/install.ps1 | iex
```

**macOS and Linux:** open Terminal and run:

```bash
curl -fsSL https://raw.githubusercontent.com/sitien173/scene-flow/main/install.sh | bash
```

The installer sets up:

| Tool | Version |
|---|---|
| Git (on Windows, includes Git Bash) | any |
| Python, with the numpy and Pillow packages | 3.10 or newer |
| Node.js | 22 or newer |
| FFmpeg | any |
| Claude Code and the scene-flow plugin | latest |

At the end it offers to run a HyperFrames check, which downloads the browser used to draw the video. When it finishes, open a new terminal and run `claude` once to sign in.

Speech recognition and the AI voice run on Google Colab. You need a Google account. Setup is in the [user guide](docs/user-guide.md#voiceover).

### Other agents

scene-flow also works in Codex, Pi, agy, and the Antigravity IDE. Install the tools above first, then add the plugin:

| Agent | Command |
|---|---|
| Codex | `codex plugin marketplace add sitien173/scene-flow` then `codex plugin add scene-flow@scene-flow` |
| Pi | `pi install https://github.com/sitien173/scene-flow` |
| agy | `git clone https://github.com/sitien173/scene-flow` then `agy plugin install scene-flow` |
| Antigravity IDE | `git clone https://github.com/sitien173/scene-flow` then run `python install-agy-ide.py` from the clone folder; see [Antigravity IDE](#antigravity-ide) |

The commands and helper agents below work only in Claude Code.

#### Antigravity IDE

If you installed scene-flow with `agy plugin install`, the Antigravity IDE already loads it. Skip this section. The script refuses that folder.

Otherwise, clone the repository and run the install script from the clone folder. It needs Python 3.10 or later:

```bash
git clone https://github.com/sitien173/scene-flow
cd scene-flow
python install-agy-ide.py
```

This copies the plugin to `~/.gemini/config/plugins/scene-flow` for every workspace. To install it for one project only, pass the project folder. The plugin goes to `<project>/.agents/plugins/scene-flow`:

```bash
python install-agy-ide.py --project <project>
```

Restart the Antigravity IDE after you install, update, or uninstall.

To update, pull the clone and run the same command again:

```bash
git pull
python install-agy-ide.py
```

To uninstall, add `--uninstall`. For a project install, also pass `--project <project>`:

```bash
python install-agy-ide.py --uninstall
```

The script replaces or removes only a folder it created. It prints one line: `installed`, `updated`, `removed`, `not installed`, or `refused:` with the reason.

## Make your first video

1. Create a folder for your videos and open Claude Code in it.
2. Send a message like this one, in Vietnamese or English:

   ```text
   Tạo video tiktok về cách tạo chatbot AI. File giọng đọc: recordings/voice.wav
   Phải có logo của các công cụ. Hạn chế chữ. Phần comment dùng từ khóa CHATBOT.
   Kịch bản:
   <your script, one sentence per line>
   ```

   *(Make a TikTok video about building an AI chatbot. Voice file: recordings/voice.wav. Show the tools' logos. Keep text short. Use CHATBOT as the comment keyword. Script: one sentence per line.)*
3. Pick a look when Claude asks. Claude then lines up the pictures with the voice and sends you a preview link.
4. Open the link and press play. Ask for changes in your own words, for example "chữ nhỏ quá" *(the text is too small)*.
5. Say **"render video"** to get the MP4.

The [user guide](docs/user-guide.md) covers each step in detail, including voice options, feedback, publishing, and troubleshooting.

## Commands

In Claude Code, type these commands to run one step at a time:

| Command | What it does |
|---|---|
| `/scene-flow:topic` | Finds trending topics for your niche |
| `/scene-flow:script` | Writes or edits the script |
| `/scene-flow:review` | Checks facts and reviews the script |
| `/scene-flow:new` | Creates a video project |
| `/scene-flow:voice` | Generates the AI voice on Colab |
| `/scene-flow:align` | Lines up the script with the voice |
| `/scene-flow:storyboard` | Plans scenes and the pictures for each line |
| `/scene-flow:build` | Builds the video and opens the preview |
| `/scene-flow:render` | Exports the MP4 |
| `/scene-flow:caption` | Writes the post title, description, and hashtags |
| `/scene-flow:publish` | Sends the video to Postiz as a draft |
| `/scene-flow:theme` | Designs a new look from a reference video |

You can also just describe what you want. Claude picks the right step.

## Your style

Claude saves your feedback so it does not repeat a mistake. Preferences for all your videos go in `AGENTS.md` in the folder that holds them; feedback for one video goes in that video's `CLAUDE.md`. See [Keeping feedback for later videos](docs/user-guide.md#keeping-feedback-for-later-videos).

## License

The code and documentation use the [Apache-2.0](LICENSE) license; see [NOTICE](NOTICE). Fonts use the SIL Open Font License, icons come from [Lucide](https://lucide.dev), and logos belong to their owners. Check the audio and background licenses in [SOURCES.md](skills/scene-flow/assets/SOURCES.md) before commercial use. Sounds downloaded from Freesound are CC0 or CC BY; credit CC BY sounds in your post.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and the [Code of Conduct](CODE_OF_CONDUCT.md).
