---
description: Write or revise SCRIPT.md with the script-writer sub-agent.
argument-hint: <topic, source links, or revision notes>
---

Write or revise the spoken script. Input: $ARGUMENTS

1. If there is no topic, source, or revision note, ask the author for one, or suggest `/scene-flow:topic`.
2. Delegate to the `scene-flow:script-writer` sub-agent with the input and the path of the project folder or `SCRIPT.md`.
3. Report the file path and the estimated length. Suggest `/scene-flow:review` next.
