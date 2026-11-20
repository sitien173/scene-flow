---
description: Generate the voiceover with VieNeu-TTS on a local GPU or on Colab. Asks before spending Colab compute.
argument-hint: [--voice "<preset>" | --ref "<clip.wav>"]
disable-model-invocation: true
---

Generate the voiceover for the project in the working directory. Options: $ARGUMENTS

1. Load the `scene-flow` skill. `<skill>` below is its base directory. Follow its "Voice sources" section.
2. Confirm `SCRIPT.md` exists. Run `python "<skill>/scripts/gpu-check.py"`. On `recommendation: local`, suggest local speech to the author. If the author agrees and the printed install steps are done, run `python scripts/tts.py --provider local $ARGUMENTS`, then `python scripts/asr.py small --local` if the author will align next, and stop here.
3. Otherwise ask the author before starting a Colab session, because it spends their compute units. Run:
   ```bash
   python "<skill>/scripts/colab-session.py" up
   python scripts/tts.py $ARGUMENTS
   ```
   With no options, run `python scripts/tts.py --list` first and let the author pick a voice.
4. If the author will align next, run ASR now with `python scripts/asr.py small` while the session is up.
5. Run `python "<skill>/scripts/colab-session.py" down` as soon as voice and ASR are done. Never print the Colab token.
