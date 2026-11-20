---
description: Design a new theme from a reference video with the theme-designer sub-agent.
argument-hint: <video link or file> <new theme name>
---

Design a new theme. Arguments: $ARGUMENTS

1. If the reference video or the theme name is missing, ask the author. Confirm the author has the right to use the video for analysis.
2. Delegate stage 1 to the `scene-flow:theme-designer` sub-agent: analysis only, output `research/theme-<name>/SPEC.md`.
3. Show the SPEC summary and ask the author to approve it.
4. Only after approval, delegate stage 2 to the same sub-agent and state in the prompt that the author approved the SPEC.
