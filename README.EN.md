# scene-flow: narrated vertical videos with Claude

[![CI](https://github.com/sitien173/scene-flow/actions/workflows/ci.yml/badge.svg)](https://github.com/sitien173/scene-flow/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[Tiếng Việt](README.md)

scene-flow turns a script and a voice recording into a 9:16 video for TikTok, Reels, and YouTube Shorts. Pictures, captions, and sound effects follow the voice word by word. You describe the video in plain language, review it in your browser, and ask for changes until you are happy. Claude exports the MP4 only when you ask.

## What you get

- **Real pictures over text:** product logos, your screen recordings, and captures of web pages.
- **Captions in sync:** each spoken word lights up as it is said.
- **Sound:** a music bed and sound effects on scene changes and key moments, leveled against the voice automatically.
- **Voice:** use your own recording, ElevenLabs voices through Vibi, or the VieNeu-TTS AI voice on Google Colab.

### Three looks

Claude asks which look to use for each video. Pick by topic:

| Look | What it looks like | Good for |
|---|---|---|
| `neon3d` | Short 3D scenes on a dark neon stage with bloom | Technology, AI tools, software, digital products |
| `terra3d` | Daylight 3D scenes: a globe with route arcs, ships on the ocean, terrain from a drone, cutaways of soil and water. Hard cuts on spoken words, captions one word at a time | Engineering, construction, geography, history |
| `atlas3d` | An old-style world map with camera pans between regions, territories raised in 3D, chibi figures on the map, and photo backdrop scenes | History, geography, geopolitics, and economics told on a map |

Keep a channel to one or two looks so viewers recognize it from the first frame.

### Make the channel your own

Look-alike videos get scrolled past. These make your channel different:

- **Real pictures and footage.** Record your screen while you use a tool. Claude trims the clips, retimes them, and blurs private data. Send a web link and Claude captures the page. Logos always come from official files; Claude never draws a logo. For pictures of an idea, Claude prefers licensed stock and uses AI images only when you have set `IMAGE_API_URL`, `IMAGE_API_KEY`, and `IMAGE_MODEL`.
- **Voice.** Pick one voice and keep it for the whole channel. Your own recording is the most distinctive. For an AI voice that sounds like you, ask Claude to clone it from a sample recording. Clone only your own voice or the voice of someone who has agreed.
- **Sound.** The music bed can be any track; Claude measures it and levels it under the voice. Use only music you have the right to use. Say whether you want more or fewer sound effects. `terra3d` has no sound on scene changes.
- **Branding.** Your channel name, logo, and the slogan on the end card. Add your channel's address terms, fixed opening line, or fixed closing line.

Write these choices into `AGENTS.md` so Claude applies them to every later video. See [Your style](#your-style) and [A TikTok channel with many videos](#a-tiktok-channel-with-many-videos).

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

## Make a video with prompts

You do not need to remember commands. Each step below has a sample prompt to type into Claude Code, and a shortcut command if you prefer to call it directly. Claude does one step at a time and waits for your approval. Prompts work in Vietnamese or English.

### 1. Find a topic

Name the niche and the audience. The more specific, the closer the topics.

```text
Find 5 trending topics about AI tools for office workers aged 22 to 35.
```

Shortcut: `/scene-flow:topic <niche and audience>`. Claude returns a ranked list and asks you to pick one.

### 2. Write and check the script

Give Claude the topic, source links, or your notes. The script lives in `SCRIPT.md`, one sentence per line.

```text
Write a script of about 60 seconds on topic 2. Source: <link>.
Open with a question, keep it conversational, and end by asking viewers to comment the keyword CHATBOT.
```

If you already have a script, paste it into the message. Then ask Claude to check it:

```text
Fact-check the script and point out sentences that are hard to read aloud.
```

Shortcuts: `/scene-flow:script` to write or revise, `/scene-flow:review` to fact-check and review.

### 3. Choose a voice

If you have no voice file yet, Claude offers three options in this order:

| Option | What to tell Claude | What you need |
|---|---|---|
| Your own recording | `Voice file: recordings/voice.wav` | Record from `SCRIPT.md`. Claude can give you the script one sentence at a time. |
| Vibi, ElevenLabs voices | `Use a Vibi voice` | The `VIBI_API_KEY` environment variable. Vibi charges credits per character of the script, so Claude asks before running it. |
| VieNeu-TTS on Google Colab | `Use the free AI voice` | The `colab` CLI signed in to your Google account. No per-character charge, but it spends Colab compute units, so Claude asks before starting a session. |

To keep the default, do not name a voice. The VieNeu-TTS default is Hải Đăng; the Vibi default is Quang Toan. To pick another voice:

```text
List the available VieNeu voices.
Use the voice "<voice name>".
Clone the voice from voice-sample.wav.
Use Vibi with voice id <ElevenLabs id>.
```

Set `VIBI_API_KEY` in your terminal before opening Claude Code. Do not paste the key into the chat. Shortcut for VieNeu-TTS: `/scene-flow:voice`.

### 4. Pick a look and build the video

```text
Make a video from this script. Show the logos of the tools it mentions. Keep text on screen short.
```

Claude asks you to pick `neon3d`, `terra3d`, or `atlas3d`, lines up the pictures with the voice, and sends a preview link. Name the look in the prompt if you already know which one you want.

### 5. Give feedback, render, and publish

- Open the preview link and press play. Ask for changes in plain words, for example "the text is too small" or "switch scene 3 to the GitHub logo".
- Say **"render video"** to get the MP4.
- Say "write the caption and hashtags" for a title, description, and hashtags.
- Say "send it to Postiz" to create a draft. Claude posts immediately or schedules only when you ask for it explicitly.

### A TikTok channel with many videos

When you post regularly for one channel, keep every video in one channel folder so Claude remembers your branding and style between videos. Type `/scene-flow:channel`, or say:

```text
Set up a new TikTok channel for me.
```

If you have no idea yet, Claude asks what you like, who you want to talk to, and which voice you will use, then suggests three channel ideas. Each idea has a niche, an audience, a matching look, name ideas, and three first-video topics. Claude then asks for the channel name, slogan, logo, and the folder to create it in, shows you the full path, and creates it only after you agree:

```text
<channel-name>/
├── AGENTS.md              # channel-wide rules: voice, branding, hashtags
├── CLAUDE.md              # one line: @AGENTS.md
├── brand/
│   ├── brand.json         # channel name, logo file, slogan
│   └── logos/             # the channel's official logos
├── new-video.sh           # creates a new video and applies the branding; new-video.ps1 on Windows
├── videos/
│   └── <yyyy-mm>-<slug>/  # each video is its own scene-flow project
└── publish/
    └── <yyyy-mm>-<slug>.mp4
```

Create a new video for the channel:

```bash
./new-video.sh <slug> "Video name" <neon3d|terra3d|atlas3d> [voice file]
```

On Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\new-video.ps1 <slug> "Video name" <neon3d|terra3d|atlas3d> [voice file]
```

Put what applies to every video of the channel in `AGENTS.md`, for example brand colors, address terms, a fixed closing line, or "at most 5 hashtags, always include #xuhuong". For each video, open Claude Code in that video's folder, not in the channel folder. If you use Git, ignore `publish/` and each video's `renders/`, `snapshots/`, and `assets/audio/src/` folders, since they are large.

The [user guide](docs/user-guide.md) covers each step in detail, including voice options, feedback, publishing, and troubleshooting.

## Commands

In Claude Code, type these commands to run one step at a time:

| Command | What it does |
|---|---|
| `/scene-flow:channel` | Sets up a channel folder or suggests channel ideas |
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
