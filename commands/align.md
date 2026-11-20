---
description: Align the voiceover to SCRIPT.md and produce syllable times.
argument-hint: [ASR model: small | medium]
---

Align the voice in the project in the working directory. ASR model: `$ARGUMENTS`, or `small` when empty.

1. Load the `scene-flow` skill and read `references/alignment.md`.
2. If `asr-words.json` is missing and no Colab server is reachable, ask the author before running `colab-session.py up`.
3. Run in order:
   ```bash
   python scripts/asr.py <model>
   python scripts/plan-beats.py
   python scripts/align-asr.py
   python scripts/syl-times.py
   python scripts/fix-syl.py
   python scripts/silences.py
   ```
4. Report the exact-match rate. Below 90%, propose a rerun with `medium`. Cross-check brand names and numbers in `asr-words.json`.
5. Stop the Colab session if this command started it.
