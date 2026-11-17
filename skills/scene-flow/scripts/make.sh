#!/usr/bin/env bash
# First-build pipeline (before the author opens Studio): parts/ -> index.html, then the generated
# blocks: captions, seam tweens (motion-doctrine's seam-stamp, from the HyperFrames skills), sound.
# After Studio has opened the project and the author has edited in it, patch with edit_helpers instead.
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONIOENCODING=utf-8

# motion-doctrine ships with the HyperFrames skills (heygen-com/hyperframes). Look for it in the bundle
# named by .skills-dir (written by new-project.py), then in any parent folder's .claude/skills or
# .agents/skills, then in the home folder.
find_skill() {
  local name="$1" d="$PWD"
  if [ -n "${HF_SKILLS_DIR:-}" ] && [ -f "$HF_SKILLS_DIR/$name/SKILL.md" ]; then echo "$HF_SKILLS_DIR/$name"; return; fi
  local bundle="$(cat "$PWD/.skills-dir" 2>/dev/null || true)"
  if [ -n "$bundle" ] && [ -f "$bundle/$name/SKILL.md" ]; then echo "$bundle/$name"; return; fi
  while [ -n "$d" ] && [ "$d" != "/" ]; do
    for s in "$d/.claude/skills" "$d/.agents/skills"; do
      if [ -f "$s/$name/SKILL.md" ]; then echo "$s/$name"; return; fi
    done
    [ "$d" = "$(dirname "$d")" ] && break
    d="$(dirname "$d")"
  done
  for s in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
    if [ -f "$s/$name/SKILL.md" ]; then echo "$s/$name"; return; fi
  done
}
MD="$(find_skill motion-doctrine)"
if [ -z "$MD" ]; then
  echo "motion-doctrine not found. It ships in this plugin's skills/ folder; reinstall the plugin if it is missing." >&2
  echo "  The bundle pointer .skills-dir may be missing or stale. Rerun new-project.py on the project, or set HF_SKILLS_DIR." >&2
  exit 1
fi

python scripts/build.py
python scripts/karaoke.py
node "$MD/scripts/seam-stamp.mjs" --ledger ledger.json --write index.html
python scripts/add-sfx.py
