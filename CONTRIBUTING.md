# Contributing to scene-flow

Thanks for helping. This guide covers local checks, commit messages, and pull requests.

## Ground rules

- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security problems privately, as described in [SECURITY.md](SECURITY.md).
- Open an issue before a large change, so the approach can be agreed first.
- Do not edit the bundled third-party skills under `skills/` other than `skills/scene-flow/`. They ship unmodified from upstream. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Only add assets you have the right to redistribute, and record each one in `skills/scene-flow/assets/SOURCES.md`.

## Local checks

You need Node 22+, Python 3.10+, ffmpeg, and jq. Install the Python packages:

```bash
pip install pyyaml -r skills/scene-flow/requirements.txt
```

Run the same checks as CI from the repository root:

```bash
python3 tests/spec-check.py
python3 tests/agy-ide-install-test.py
bash tests/check-versions.sh
bash tests/check-bundled.sh
claude plugin validate --strict .
bash tests/theme-fixture.sh /tmp/sf-check | tail -1
```

The last command must print `9bd8551cea28e48788b3400bf148b2c53d1054ec705a17e4db1c62e779daa2a2`. If your change intentionally alters the generated video, say so in the pull request and update the hash in `.github/workflows/ci.yml` and this file.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/). release-please builds the changelog and the next version from them.

| Type | Use for | Changelog |
|---|---|---|
| `feat` | a new capability | Features, minor bump |
| `fix` | a bug fix | Bug Fixes, patch bump |
| `docs` | documentation and skill reference text | Documentation |
| `perf` | a speed or size improvement | Performance |
| `refactor`, `test`, `ci`, `chore` | everything else | hidden |

Mark a breaking change with `!` after the type, for example `feat!: rename the paper theme`, or with a `BREAKING CHANGE:` footer.

Do not edit version numbers or `CHANGELOG.md` by hand. release-please updates them in its release pull request.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Make one focused change per pull request.
3. Run the local checks.
4. Fill in the pull request template.

Maintainers squash-merge pull requests, so the pull request title must also follow Conventional Commits.

## License

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE).
