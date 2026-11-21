---
description: Clone a reference video into a new theme with the theme-designer sub-agent.
argument-hint: <video link or file> <new theme name>
---

Clone a reference video into a new theme. Arguments: $ARGUMENTS

1. If the reference video or the theme name is missing, ask the author. Confirm the author has the right to clone the video, and ask whether that right extends to redistributing its music and SFX in the plugin.
2. Delegate stage 1 to the `scene-flow:theme-designer` sub-agent: measurement only, output `research/theme-<name>/SHOTS.md` and `research/theme-<name>/SPEC.md`. State the author's rights in the prompt.
3. Show the SPEC summary and ask the author to approve it.
4. Only after approval, delegate stage 2 to the same sub-agent and state in the prompt that the author approved the SPEC.
