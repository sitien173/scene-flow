---
description: Render the final MP4 with GPU capture.
argument-hint: [output name]
disable-model-invocation: true
---

Render the project in the working directory to `renders/$ARGUMENTS.mp4`. When no name is given, use the `name` in `meta.json`.

1. Read the theme from `meta.json`.
2. Run:
   ```bash
   npx --yes hyperframes@0.8.140 render --browser-gpu -o renders/<name>.mp4
   ```
   Add `--player-ready-timeout 180000`.
3. The summary's second line must say `hardware gpu`. If it says `software gpu`, report that the capture ran on the CPU.
4. Report the file path and duration. Do not publish.
