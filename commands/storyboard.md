---
description: Plan scenes, visuals, and media with the storyboard sub-agent.
argument-hint: [project folder]
---

Plan the storyboard for the project at `$ARGUMENTS`, or the working directory when no folder is given.

1. Read the theme from the project's `meta.json`. If there is no project yet, ask the author for the theme. Never assume one.
2. Delegate to the `scene-flow:storyboard` sub-agent with the project folder and the theme.
3. Report the `STORYBOARD.md` path and the media list the author must prepare.
