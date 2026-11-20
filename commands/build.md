---
description: Build the project, run checks and snapshots, and hand over the preview URL.
argument-hint: [snapshot times, e.g. 0.6,4.5,9.9]
---

Build and verify the project in the working directory. Snapshot times: $ARGUMENTS

1. Load the `scene-flow` skill and read `references/verification.md`.
2. Run:
   ```bash
   bash scripts/make.sh
   npm run check
   ```
3. Take snapshots at the given times. With no times, snapshot 0.2 to 0.4 s after every cut in `SC` in `scripts/build.py`. Look at each image.
4. Check sync with `python scripts/audit-sync.py`, never against captions.
5. Run `npx hyperframes preview --background` and give the author the URL. Do not render.
