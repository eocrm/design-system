#!/usr/bin/env bash
# Decide which Quality stages a change needs (#614).
#   ci-changes.sh <event> <base-sha> <head-sha>   # CI: diff base...head
#   ci-changes.sh --files <list-file> [event]       # dry run on a file list
# Emits key=true|false lines to $GITHUB_OUTPUT (stdout when unset); log on stderr.
# Non-pull_request events (the release.yml workflow_call backstop) and any
# change to workflows / root tooling run EVERYTHING.
set -euo pipefail

# Keys go to $GITHUB_OUTPUT, or stdout on a dry run; the decision log is stderr.
emit() { if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$1" >> "$GITHUB_OUTPUT"; else echo "$1"; fi; }
keys=(ds tokens compose playground package tooling)

if [ "${1:-}" = "--files" ]; then
  files=$(cat "$2")
  event="${3:-pull_request}"
else
  event="$1"
  files=""
  if [ "$event" = "pull_request" ]; then
    # --no-renames lists BOTH sides of a move; quotePath=false keeps non-ASCII paths unquoted.
    files=$(git -c core.quotePath=false diff --name-only --no-renames "$2...$3")
  fi
fi

emit_all() {
  echo "decision: $1 -> run everything" >&2
  for k in "${keys[@]}"; do emit "$k=true"; done
  exit 0
}

[ "$event" = "pull_request" ] || emit_all "event '$event' (release backstop)"

printf 'changed files:\n%s\n' "$files" >&2

FORCE='^(\.github/|scripts/ci-changes\.sh$|package\.json$|package-lock\.json$|\.npmrc$|\.nvmrc$|tsconfig[^/]*\.json$|\.prettierrc|\.prettierignore$|\.stylelintrc|playwright\.config\.|tests/|Makefile$)'
if grep -Eq "$FORCE" <<<"$files"; then emit_all "root tooling / workflow change"; fi

has() { grep -Eq "$1" <<<"$files" && echo true || echo false; }
LIB='^packages/(design-system|design-tokens)/'
# Release/workflow tooling and its tests (test:tooling); .github/ already forces all.
TOOLING='^(scripts/|packages/design-tokens/scripts/|packages/design-tokens/test/tooling/)'
# Playground files read by library/token tests (guarded by ci-changes-contract.test.mjs):
#   contrast.test.ts -> props.manifest.json ; package-boundary.test.mjs -> TokensPage.tsx
DS_EXTRA='^packages/playground/src/lib/props\.manifest\.json$'
TOK_EXTRA='^packages/playground/src/pages/Tokens/TokensPage\.tsx$'
has2() { [ "$(has "$1")" = true ] || [ "$(has "$2")" = true ] && echo true || echo false; }
for line in \
  "ds=$(has2 "$LIB" "$DS_EXTRA")" \
  "tokens=$(has2 "$LIB|^scripts/verify-package-contents\.mjs\$" "$TOK_EXTRA")" \
  "compose=$(has '^packages/design-tokens/')" \
  "playground=$(has '^packages/(design-system|design-tokens|playground)/')" \
  "package=$(has "$LIB|^scripts/verify-package-contents\.mjs\$")" \
  "tooling=$(has "$TOOLING")"; do
  emit "$line"; echo "$line" >&2
done
