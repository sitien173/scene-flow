#!/usr/bin/env bash
# Fail if a bundled third-party skill differs from tests/bundled.sha256.
# After a deliberate upstream update, regenerate with: bash tests/check-bundled.sh --update
set -euo pipefail
cd "$(dirname "$0")/.."
sums() { find skills \( -path skills/scene-flow -o -path skills/scene-flow-channel \) -prune -o -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum; }
if [ "${1:-}" = "--update" ]; then sums > tests/bundled.sha256; exit 0; fi
diff <(sums) tests/bundled.sha256 && echo "OK  bundled skills unchanged"
