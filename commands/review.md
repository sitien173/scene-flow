---
description: Fact-check and review SCRIPT.md with two sub-agents in parallel.
argument-hint: [path to SCRIPT.md]
---

Check the script at `$ARGUMENTS`, or `SCRIPT.md` in the working directory when no path is given.

1. Delegate in parallel, in one message: `scene-flow:fact-checker` and `scene-flow:script-reviewer`, each with the script path.
2. Merge the results into one report: false or unverified claims first, then hook, pacing, length, and CTA notes with the suggested lines.
3. Do not edit `SCRIPT.md`. Ask the author which fixes to apply, then apply them through `/scene-flow:script`.
