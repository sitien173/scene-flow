# User Guide: AI Short Video Generator

This guide is designed for creators and non-programmers. Follow the steps in sequence. Step 1 is a one-time setup; steps 2 through 5 apply to each video project.

## 1. Installation

1. Install [Claude Code](https://claude.com/claude-code) and sign in.
2. Install required system tools (Python 3.12, Node.js 22+, FFmpeg, and Git) following the platform instructions in the [README installation section](../README.md#installation).
3. Clone this repository into your Claude Code skills folder:
   - On Windows (PowerShell):
     ```powershell
     git clone https://github.com/sitien173/scene-flow "$env:USERPROFILE\.claude\skills\scene-flow"
     ```
   - On macOS or Linux:
     ```bash
     git clone https://github.com/sitien173/scene-flow ~/.claude/skills/scene-flow
     ```
   If Git is not installed yet, download the repository ZIP file (via GitHub **Code -> Download ZIP**) and extract it to your skills folder (`%USERPROFILE%\.claude\skills\scene-flow` on Windows, or `~/.claude/skills/scene-flow` on macOS or Linux).
4. Install Python dependencies and HyperFrames skills as detailed in the [README installation section](../README.md#installation).
5. Restart Claude Code.

## 2. Preparing Content

### Script

Write your script in plain text with **one sentence per line**, exactly as it will be spoken. If a prompt or command should appear in full on screen, place that prompt on its own single line.

### Voiceover

Select one of three audio sources:

1. **Self-recording (most natural)**: Record narration in a quiet room, saving as `.wav` or `.mp3`. Leave a short breath pause between sentences.
2. **Third-party TTS service**: Use your existing TTS service (ElevenLabs, OpenAI). When Claude asks for an API key, provide it in the chat. Claude uses it for that session only and never writes it to disk.
3. **VieNeu-TTS on Google Colab (free GPU voice generation and ASR)**:
   - **Start the server (automatic):**
     1. Install the `colab` CLI and sign in to your Google account once.
     2. Ask Claude to start the Colab server, or run:
        ```bash
        python skills/scene-flow/scripts/colab-session.py up
        ```
        This opens a T4 GPU session, installs the packages, starts `colab/server.py`, and waits until the server answers. The URL and token are saved to `~/.config/scene-flow/colab.json`, readable only by you, and are never printed. `tts.py` and `asr.py` read this file.
     3. When the voice and ASR are done, stop the session so it stops using compute units:
        ```bash
        python skills/scene-flow/scripts/colab-session.py down
        ```
        `colab-session.py status` shows whether the server is reachable.
   - **Start the server by hand (without the `colab` CLI):**
     1. Open Google Colab and select **Edit > Notebook settings**. Choose **T4 GPU**, check **"Omit code cell output when saving this notebook"**, and click **Save**.
     2. Connect the Colab runtime and run the installation cell:
        ```python
        !pip install -q vieneu==3.8.4 openai-whisper fastapi uvicorn
        ```
     3. Upload `skills/scene-flow/colab/server.py` into `/content` using the Colab **Files** panel on the left.
     4. Run the server cell:
        ```python
        !python server.py
        ```
        *Note: Colab resets temporary files when a session ends. Repeat steps 2 through 4 for each new session.*
   - **Set URL and token (manual start only):**
     Copy the `COLAB_URL=` and `COLAB_TOKEN=` outputs printed by Colab. Set them as environment variables in the terminal where you run Claude Code (these change every session; never commit them). Environment variables take precedence over the session file:
     - On Windows PowerShell:
       ```powershell
       $env:COLAB_URL="<the URL printed by Colab>"
       $env:COLAB_TOKEN="<the token printed by Colab>"
       ```
     - On macOS or Linux bash:
       ```bash
       export COLAB_URL="<the URL printed by Colab>"
       export COLAB_TOKEN="<the token printed by Colab>"
       ```
   - **Voice generation commands (`scripts/tts.py`):**
     - `python scripts/tts.py --list` (list preset voices)
     - `python scripts/tts.py` (generate with default voice `Hải Đăng`)
     - `python scripts/tts.py --voice "<name>"` (select voice by name or ID)
     - `python scripts/tts.py --ref "<clip.wav>"` (clone voice from a reference audio clip)

### Optional Assets

- Screen recordings of software demonstrations or workflows.
- Video clips to insert at specific sentences.
- URLs of public web pages to capture.
- Brand logo image and slogan for the end card.
- Specific keyword for the comment CTA box.
- Mascot video (optional, if you have one; no mascot ships with the skill): your own transparent `.webm` clip for the opening hook.
- Extra sound effects or music from Freesound. Apply for a free API key at https://freesound.org/apiv2/apply/ and add the line `FREESOUND_API_KEY=<key>` to `~/.config/scene-flow/.env`, the same file the Postiz key goes in, and run `chmod 600` on it. Never paste the key into the chat. Claude proposes CC0 or CC BY sounds and downloads one only after you approve it. CC BY sounds need a credit line in the post caption.

## 3. Creating a Video Project

Open Claude Code in the directory where you want to store your video projects, then send a prompt with your requirements:

```text
Tạo video tiktok về <chủ đề>. Đây là file âm thanh nói: "recordings/voice.wav"
1. Phải có logo của các công cụ xuất hiện trong video.
2. Hạn chế chữ, dùng video / hình ảnh để giải thích.
3. Đoạn đầu dùng video này: "clips/intro.mp4"
4. Phần comment dùng từ khóa CHATBOT.
Kịch bản:
<dán kịch bản, mỗi câu một dòng>
```
*(English gloss: Create a TikTok video about topic. Voice file: "recordings/voice.wav". 1. Include product logos. 2. Use visuals/recordings instead of text. 3. Use intro.mp4 for the opening. 4. Use keyword CHATBOT in the comment CTA. Script: one sentence per line.)*

There is no default theme. Before creating each project, Claude asks which theme to use and suggests the previous project's theme. To answer up front, include `--theme dark` or `--theme paper` in your prompt.

For a 3D cartoon explainer, include `--theme world3d` in your prompt. The camera moves through one 3D world, and each stop starts on a spoken word you choose. The project has a `world.json` file that lists the objects and the camera stops. The starter project explains how ChatGPT answers a question. See [the world3d theme guide](../skills/scene-flow/references/themes/world3d.md).

For short neon 3D scenes with one idea each, include `--theme neon3d` in your prompt. Each scene starts on a spoken word you choose and moves to the next with a cut, a camera dive, or a short flash. The project has a `vignettes.json` file and one code file per scene in `vignettes/`. The starter project explains AI reward hacking. See [the neon3d theme guide](../skills/scene-flow/references/themes/neon3d.md).

If you have not recorded audio yet, omit the audio file path. Claude offers the voice options above. To synthesize voice via Colab, state: `Dùng giọng AI từ Colab`.

If screen recordings contain private information (conversation names, emails, filesystem paths), Claude automatically blurs or cuts them, and tells you.

## 4. Preview and Feedback

When generation completes, Claude provides a preview link such as `http://localhost:3002/#project/<name>`. Open the link in your browser and press play.

To adjust the composition, describe what needs refinement:

| What you say | What Claude adjusts |
|---|---|
| "hình nhanh hơn voice" (visuals lead voice) | Shifts visual elements to align with spoken words |
| "lướt qua nhanh quá" (scene passes too quickly) | Extends display duration for that scene |
| "chữ nhỏ quá", "chưa đẹp" (text small or unappealing) | Applies larger font sizes per house guidelines |
| "đoạn đầu dùng video này..." (change intro video) | Swaps footage and recalculates timing |
| "cho mascot to lên ở góc dưới bên trái" | Repositions or scales the mascot graphic (if you have one; no mascot ships with the skill) |

### Keeping feedback for later videos

Claude saves your feedback so it does not repeat a mistake. Rules come from three files, and the more specific file wins:

| File | Holds | Who edits it |
|---|---|---|
| `references/style.md` in the plugin | Rules for every author, such as text size, real media, and fact checks | Only the plugin repository. A plugin update overwrites local edits |
| `AGENTS.md` in the folder that holds your projects | Your preferences for every video, such as voice register, mascot, and sound density | You and Claude |
| `CLAUDE.md` in the project folder | Feedback for this video only | You and Claude |

If you do not say where a piece of feedback belongs, Claude asks: "Áp dụng cho mọi video sau, hay chỉ video này?" *(Apply to every later video, or only this one?)*

To create your author file, ask Claude, or set it up yourself in the folder that holds your projects:

```bash
cp <plugin>/skills/scene-flow/author/AGENTS.template.md AGENTS.md
echo '@AGENTS.md' > CLAUDE.md
```

The template contains example preferences. Edit them to match your style and delete the ones that do not apply. Claude Code loads this `CLAUDE.md` in every project below the folder. Do not create the file in your home folder, because Claude Code would then load it in every session you start there.

If HyperFrames Studio reports "the preview did not reload" or continues displaying previous frames, reload the browser tab (F5) and wait 20 seconds.

## 5. Exporting Video

When the preview looks right, enter **"render video"**. Claude renders a 1080x1920 MP4 file to the project's `renders/` directory.

A world3d video renders fastest on a computer with a graphics chip, about 2 to 3 minutes for 60 seconds. Without one, rendering takes about 16 minutes, on this computer or on Colab. Colab's T4 card does not speed up 3D rendering.

## 6. Publishing with Postiz

This section is optional. The script uploads a finished render to your own Postiz instance and creates one post covering the channels listed in `postiz.json`. The default creates a draft. It publishes only when you pass `--schedule` or `--now`.

### Setup

1. **Connect the channels.** In your Postiz instance, connect the TikTok, Instagram, and YouTube accounts you want to post to.
2. **Create an API key.** In Postiz, go to **Settings → Developers → Public API** and create a key.
3. **Save the address and key.** `POSTIZ_URL` is the base address of your Postiz instance. Use `https`; plain `http` is accepted only for `localhost` and `127.0.0.1`. The address must not contain a username or password. The script adds the `/public/v1` paths itself.
   Add both to `~/.config/scene-flow/.env`, the file that also holds your Freesound key, and make the file readable only by you. The script refuses the file otherwise. The commands below append, so an existing Freesound line stays.
   ```bash
   mkdir -p ~/.config/scene-flow
   cat >> ~/.config/scene-flow/.env <<'EOF'
   POSTIZ_URL=<your Postiz address>
   POSTIZ_API_KEY=<your API key>
   EOF
   chmod 600 ~/.config/scene-flow/.env
   ```
   On Windows the file is `%USERPROFILE%\.config\scene-flow\.env`; add the same two lines in a text editor.
   `POSTIZ_URL` or `POSTIZ_API_KEY` set in the environment overrides the file. Never paste the key into the chat. The script never prints the key.
4. **Fill `postiz.json`** in the project root:

   | Field | What to enter |
   |---|---|
   | `caption` | Post text. The caption with hashtags is limited to 2,200 characters for TikTok and Instagram. The TikTok limit is unverified. |
   | `hashtags` | A list of tags. The leading `#` is optional. Instagram accepts at most 5 hashtags (a conservative value; unverified). |
   | `ai_generated` | `true` or `false`. The script refuses to run until it is set. It refuses `false` when `assets/SOURCES.md` lists an AI-generated picture. |
   | `youtube_title` | 2 to 100 characters. Checked only when YouTube is in `channels`. |
   | `channels` | A list of channel entries. Each entry is a Postiz integration ID, or a platform name (`tiktok`, `instagram`, or `youtube`) when exactly one connected channel matches it. |

### Check and post

5. **List the channels.** Run `python scripts/postiz.py channels`. Each line shows the integration ID, the identifier, the name, and `(disabled)` for a disabled channel. Disabled channels cannot be matched. If a platform name matches more than one channel, the script stops and lists the IDs. Put one ID in `postiz.json`.
6. **Dry run.** Run `python scripts/postiz.py renders/<file>.mp4 --dry-run`. The script runs the video and channel checks and prints the planned post. It does not check the receipt. It uploads nothing and creates no post.
7. **Create a draft (default).** Run `python scripts/postiz.py renders/<file>.mp4`. The script uploads the video to the Postiz server and creates a draft. Review and publish the draft in Postiz. The video stays on the Postiz server even for a draft.
8. **Schedule or publish now.** Use `--schedule "2030-01-01T10:00:00+07:00"` to publish at a set time. The time must include a timezone offset. Use `--now` to publish immediately. Use either option only when you have decided to publish automatically.
9. **Receipt and `--again`.** After every successful post, including a draft, the script writes `postiz-receipt.json` in the project root. The receipt stores the SHA-256 hash of the file, the post type, and the post IDs. The script then refuses another `--schedule` or `--now` of the same file. Pass `--again` to post it again. The guard does not block a file whose bytes have changed. A draft of an already posted file runs with a warning.

### Platform notes

- **TikTok.** The script requests public posting with direct posting. An unaudited TikTok app may be limited to private posts. Check the visibility in TikTok after posting.
- **Instagram.** The script warns when the video is longer than 60 seconds. This threshold is unverified. The script sends the Instagram post type `post`; whether a video appears as a Reel is unverified.
- **YouTube Shorts.** Shorts must be 180 seconds or shorter. The script warns above that length. Videos post as public.
- **AI label.** When `ai_generated` is `true`, the script sets the AI setting for TikTok. Set the AI label for Instagram and YouTube by hand in Postiz.
- **Drafts and uploads.** A draft still uploads the video to the Postiz server.

### If the outcome is unknown

If the script prints `Post outcome unknown, check Postiz before re-running`, the post may or may not exist. The script never retries a post. Open Postiz and check its posts before you run the script again. Running again first can create a duplicate.

### Existing projects

Projects created before this feature do not have the publisher. Copy `scripts/postiz.py` from the scene-flow skill's `scripts/` folder into your project's `scripts/` folder. Copy `postiz.json` from the skill's `template/` folder into the project root, then fill it in.

## 7. Troubleshooting

| Symptom | Resolution |
|---|---|
| `motion-doctrine not found` | Re-run HyperFrames skill installation from the [README installation section](../README.md#installation). |
| `ffmpeg` / `node` / `python` not found | Install missing tools per the [README installation section](../README.md#installation) and restart terminal. |
| ASR alignment match rate low (< 90%) | Ask Claude to run alignment using a larger Whisper model (`medium` or `large-v3`). |
| Video exceeds 2 minutes and paper background cuts off | Tell Claude to "extend paper background plate" (see [README notes](../README.md#notes)). |
