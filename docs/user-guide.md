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
   - **Start the server:**
     1. Open Google Colab and select **Edit > Notebook settings**. Choose **T4 GPU**, check **"Omit code cell output when saving this notebook"**, and click **Save**.
     2. Connect the Colab runtime and run the installation cell:
        ```python
        !pip install -q vieneu==3.8.4 openai-whisper fastapi uvicorn
        ```
     3. Upload `colab/server.py` into `/content` using the Colab **Files** panel on the left.
     4. Run the server cell:
        ```python
        !python server.py
        ```
        *Note: Colab resets temporary files when a session ends. Repeat steps 2 through 4 for each new session.*
   - **Set URL and token:**
     Copy the `COLAB_URL=` and `COLAB_TOKEN=` outputs printed by Colab. Set them as environment variables in the terminal where you run Claude Code (these change every session; never save them in files):
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

New projects default to the dark theme (`--theme dark`). To select the paper background theme, include `--theme paper` in your prompt. If the previous project used paper, Claude confirms before switching to dark.

For a 3D cartoon explainer, include `--theme world3d` in your prompt. The camera moves through one 3D world, and each stop starts on a spoken word you choose. The project has a `world.json` file that lists the objects and the camera stops. The starter project explains how ChatGPT answers a question. See [the world3d theme guide](../references/themes/world3d.md).

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

If HyperFrames Studio reports "the preview did not reload" or continues displaying previous frames, reload the browser tab (F5) and wait 20 seconds.

## 5. Exporting Video

When the preview looks right, enter **"render video"**. Claude renders a 1080x1920 MP4 file to the project's `renders/` directory.

A world3d video renders fastest on a computer with a graphics chip, about 2 to 3 minutes for 60 seconds. Without one, rendering takes about 16 minutes, on this computer or on Colab. Colab's T4 card does not speed up 3D rendering.

## 6. Troubleshooting

| Symptom | Resolution |
|---|---|
| `motion-doctrine not found` | Re-run HyperFrames skill installation from the [README installation section](../README.md#installation). |
| `ffmpeg` / `node` / `python` not found | Install missing tools per the [README installation section](../README.md#installation) and restart terminal. |
| ASR alignment match rate low (< 90%) | Ask Claude to run alignment using a larger Whisper model (`medium` or `large-v3`). |
| Video exceeds 2 minutes and paper background cuts off | Tell Claude to "extend paper background plate" (see [README notes](../README.md#notes)). |
