#!/usr/bin/env bash
# Decide which Quality stages a change needs (#614).
#   ci-changes.sh <event> <base-sha> <head-sha>   # CI: diff base...head
#   ci-changes.sh --files <list-file> [event]       # dry run on a file list
# Emits key=true|false lines to $GITHUB_OUTPUT (stdout when unset).
# Non-pull_request events (the release.yml workflow_call backstop) and any
# change to workflows / root tooling run EVERYTHING.
set -euo pipefail

out="${GITHUB_OUTPUT:-/dev/stdout}"
keys=(ds tokens compose playground package)

if [ "${1:-}" = "--files" ]; then
  files=$(cat "$2")
  event="${3:-pull_request}"
else
  event="$1"
  files=""
  if [ "$event" = "pull_request" ]; then
    files=$(git diff --name-only "$2...$3")
  fi
fi

emit_all() {
  echo "decision: $1 -> run everything" >&2
  for k in "${keys[@]}"; do echo "$k=true" >> "$out"; done
  exit 0
}

[ "$event" = "pull_request" ] || emit_all "event '$event' (release backstop)"

printf 'changed files:\n%s\n' "$files" >&2

FORCE='^(\.github/workflows/|scripts/ci-changes\.sh$|package\.json$|package-lock\.json$|\.npmrc$|\.nvmrc$|tsconfig[^/]*\.json$|\.prettierrc|\.prettierignore$|\.stylelintrc|playwright\.config\.|tests/|Makefile$)'
if grep -Eq "$FORCE" <<<"$files"; then emit_all "root tooling / workflow change"; fi

has() { grep -Eq "$1" <<<"$files" && echo true || echo false; }
LIB='^packages/(design-system|design-tokens)/'
{
  echo "ds=$(has "$LIB")"
  echo "tokens=$(has "$LIB")"
  echo "compose=$(has '^packages/design-tokens/')"
  echo "playground=$(has '^packages/(design-system|design-tokens|playground)/')"
  echo "package=$(has "$LIB")"
} | tee -a "$out" >&2
