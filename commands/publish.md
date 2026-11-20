---
description: Send a reviewed render to Postiz. Creates drafts unless asked otherwise.
argument-hint: <render file> [--schedule <ISO 8601> | --now]
disable-model-invocation: true
---

Publish through Postiz. Arguments: $ARGUMENTS

1. Load the `scene-flow` skill and follow its "Publishing via Postiz" section.
2. Confirm the author has reviewed the render. Confirm `postiz.json` has a caption; if not, suggest `/scene-flow:caption`.
3. Run `python scripts/postiz.py <render file> --dry-run` and show the plan.
4. Ask the author to confirm, then run the same command without `--dry-run`. Pass `--schedule` or `--now` only when the arguments include it.
5. Report the result from `postiz-receipt.json`. Never ask for or print the API key.
