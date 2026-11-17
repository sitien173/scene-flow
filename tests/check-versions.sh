#!/usr/bin/env bash
# Fail unless every manifest carries the same version as .release-please-manifest.json.
set -euo pipefail
cd "$(dirname "$0")/.."
want="$(jq -r '."."' .release-please-manifest.json)"
fail=0
check() {
  got="$(jq -r "$2" "$1")"
  if [ "$got" = "$want" ]; then echo "OK  $1 $got"; else echo "BAD $1 $got, want $want"; fail=1; fi
}
check .claude-plugin/plugin.json .version
check .claude-plugin/marketplace.json '.plugins[0].version'
check .codex-plugin/plugin.json .version
check plugin.json .version
check package.json .version
exit "$fail"
