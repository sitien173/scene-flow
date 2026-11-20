# AGENTS.md

Guide for coding agents that change this repository. To make a video with the plugin, follow
`skills/scene-flow/SKILL.md` instead.

## What this is

scene-flow is an Agent Skills plugin for Claude Code, Codex, Pi, and agy. It builds a 9:16
narrated short in HyperFrames from a script and a voiceover, with picture and voice aligned per
syllable. The skill in `skills/scene-flow/` is the product. Everything else packages, documents,
or tests it.

## Layout

```text
skills/scene-flow/SKILL.md      entry point the agent reads; routing table, order of work, hard rules
skills/scene-flow/references/   style.md (rules for every author), themes/*.md, alignment, audio mix, traps, verification
skills/scene-flow/scripts/      pipeline scripts; scripts/README.md documents each one
skills/scene-flow/template/     starter project copied by scripts/new-project.py; one folder per theme in themes/
skills/scene-flow/author/       AGENTS.template.md, the author-preferences file users copy next to their projects
skills/scene-flow/colab/        server.py for Whisper ASR and VieNeu-TTS on a Colab GPU
skills/scene-flow/assets/       fonts, logos, audio, paper background; licenses in SOURCES.md
skills/<other>/                 bundled third-party skills, unmodified from upstream
agents/                         Claude Code sub-agents (topic-scout, script-writer, ...)
commands/                       Claude Code slash commands, invoked as /scene-flow:<name>
install.sh, install.ps1         end-user installers for macOS/Linux and Windows
docs/user-guide.md              step-by-step guide for non-programmers
tests/                          CI checks; see "Checks"
.claude-plugin/, .codex-plugin/, plugin.json, package.json   manifests for each host
```

## Rules

- Do not edit the bundled skills under `skills/` other than `skills/scene-flow/`.
  `tests/check-bundled.sh` fails on any change.
- Never edit version numbers or `CHANGELOG.md`. release-please sets the version in all five
  manifests from Conventional Commit messages.
- There is no default theme. `new-project.py` requires `--theme`, and the agent asks the author.
- Style rules have three tiers: `references/style.md` holds rules for every author; author
  preferences live in the user's projects folder, never in the plugin; per-video feedback lives
  in the project's `CLAUDE.md`. Keep author-specific taste out of `style.md`.
- Write instructions in English. Keep Vietnamese only where it is data: trigger phrases in
  `description` fields, the author-feedback table, spoken-register examples, and questions to the
  author.
- Renders must be deterministic: frames depend only on time. No network calls or unseeded
  randomness during render.
- The HyperFrames version `0.8.140` is pinned in several files, including `template/package.json`,
  `SKILL.md`, references, `scripts/render-colab.py`, `commands/render.md`, and both installers.
  Change every match of `grep -rl 0.8.140 .` together. Minimum tool versions in `SKILL.md` and the
  installers must also agree.
- `agents/` and `commands/` work only in Claude Code. Skill text must still work on hosts without
  them.
- Add only assets you may redistribute, and record each in `assets/SOURCES.md`.
- `install.ps1` must stay ASCII and must not call `exit`, because users run it through `iex`.

## Checks

Run from the repository root. These match CI:

```bash
python3 tests/spec-check.py
bash tests/check-versions.sh
bash tests/check-bundled.sh
python3 tests/postiz-test.py
python3 tests/neon3d-build-test.py
claude plugin validate --strict .
bash tests/theme-fixture.sh /tmp/sf-check | tail -1
```

The fixture must print `9bd8551cea28e48788b3400bf148b2c53d1054ec705a17e4db1c62e779daa2a2`. If a
change intentionally alters the generated video, update the hash in `.github/workflows/ci.yml` and
`CONTRIBUTING.md`.

## Commits

Use Conventional Commits; release-please builds the changelog from them. Details are in
`CONTRIBUTING.md`.
