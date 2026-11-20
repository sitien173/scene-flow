---
description: Start a new scene-flow video project. Asks for the theme first.
argument-hint: <folder> [video name] [voice file]
---

Start a new narrated-short project. Arguments: $ARGUMENTS

1. Load the `scene-flow` skill. `<skill>` below is its base directory.
2. Read the author's style file, `AGENTS.md` in the folder that will hold the project. If it is missing, follow the skill's "Recording feedback" section and ask whether to create it.
3. Ask the author which theme to use: neon3d, terra3d, or atlas3d. Find the latest project's `meta.json` and mark its theme as the suggestion. Do not pick a theme yourself. If the arguments already name a theme, use it.
4. Ask for any missing value: the project folder, the video name, and the voice file. If there is no voice file yet, offer the voice sources from the skill, or point to `/scene-flow:voice`.
5. Run:
   ```bash
   python "<skill>/scripts/new-project.py" "<folder>" --name "<video name>" --voice "<voice file>" --theme <theme>
   ```
6. Report the folder, the theme, and the next step: `/scene-flow:align`.
