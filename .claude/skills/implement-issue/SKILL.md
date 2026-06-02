---
name: implement-issue
description: Use when asked to work a GitHub issue in the design-system repo end-to-end — pick an open issue, implement the fix or feature in @eocrm/design-system, open & merge a PR, let the release publish, then comment the published version on the issue and close it. Triggers on "work an issue", "implement an issue", "ship an issue", "fix a DS issue", "pick up an issue".
---

# Implement a GitHub issue (issue → shipped → closed)

Take ONE open issue in the design-system repo from "open" to a published
`@eocrm/design-system` version, then comment that version on the issue and close
it. The issue can be anything actionable — a bug fix, a new prop, a whole new
component, a docs change.

**Announce at start:** "I'm using the implement-issue skill."

## Environment (verified)

- **Repo:** `/Users/dpws/projects/design-system` — local path. Package
  `@eocrm/design-system`. GitHub repo `eocrm/design-system` (the `eocrm` org owns
  the design system; this is NOT a separate consumer app).
- **Issues** live in `eocrm/design-system` on GitHub and are the unit of work.
- **Publishing is automatic on merge to `main`.** `.github/workflows/release.yml`
  runs only on a push to `main` touching `packages/**` or `.github/workflows/**`:
  it patch-bumps from the newest `v*` git tag, `npm publish`es to GitHub Packages,
  pushes the new tag, and redeploys the playground. **There is no manual publish
  step — merging the PR IS releasing.** The shipped version is the new `v*` tag.
  Two no-version-bump cases to expect: **(a)** the merge touched **neither**
  `packages/**` nor `.github/workflows/**` (e.g. a `.claude/`- or root-docs-only
  change) → **no Release run is created at all**; **(b)** a Release run runs but its
  `publish` job is **skipped** because the diff matched neither
  `^packages/design-system/` nor the `release`/`quality`/`deploy-playground`
  workflow files (e.g. a `packages/playground`-only change).
- **Gates:** `make test`, `make build-lib`, `make lint` (root Makefile);
  `npm run format:check` (root). A Husky pre-push hook runs prettier + stylelint +
  typecheck. The required PR status check is **`Quality / check`**.

## Scope

Exactly ONE issue per invocation.

## Phase 0 — Preconditions + pick

1. **Repo sane** — clean tree on `main`:
   ```bash
   git -C /Users/dpws/projects/design-system fetch origin -q --prune
   git -C /Users/dpws/projects/design-system status --porcelain   # must be empty
   git -C /Users/dpws/projects/design-system rev-parse --abbrev-ref HEAD   # main
   ```
   If dirty or not on `main`, stop and ask the user to resolve it.
2. **Hooks installed:**
   ```bash
   git -C /Users/dpws/projects/design-system config --get core.hooksPath   # .husky/_
   test -x /Users/dpws/projects/design-system/.husky/pre-push
   ```
   If either fails, run `npm install` in the repo and re-check; else stop.
3. **List open issues and pick:**
   ```bash
   gh issue list --repo eocrm/design-system --state open --limit 30 \
     --json number,title,labels,updatedAt
   ```
   Present them to the user (number, title, labels, a one-line read of what each
   asks). Ask which to work. If the invocation named an issue (`#N`), select that
   and skip the prompt. Confirm exactly one.
4. **Read it fully** (body + discussion):
   ```bash
   gh issue view <N> --repo eocrm/design-system --comments
   ```

## Phase 1 — Spec the work (issue-as-spec)

1. The issue body (+ comments) is the spec. Decide exactly what to change: a bug
   fix, a new prop, a new component, a docs change, etc.
2. If the issue is ambiguous or underspecified for a clean implementation, invoke
   `superpowers:brainstorming` for ONLY the open questions, then continue.
3. **If the work adds or changes a component**, it is not done until it satisfies
   the **Core invariant** in `/Users/dpws/projects/design-system/CLAUDE.md` and the
   package Hard rules in `packages/design-system/CLAUDE.md` — read both now, don't
   rely on memory. That checklist covers: tests beside the component, a playground
   demo page + wiring (route + sidebar nav + overview grid), the `src/index.ts`
   re-export, JSDoc `@remarks` anti-patterns, and an `AGENTS.md` TL;DR. (The
   playground demo lives at
   `packages/playground/src/pages/components/<Name>Demo.tsx` and the overview grid
   is `ComponentsIndex.tsx` — the root CLAUDE.md's `pages/demo/` + `DemoIndex.tsx`
   names are stale; trust the actual tree.) **Plus one step not in CLAUDE.md:** add
   a CLUSTERS entry in **both** parallel maps (they are kept in sync) —
   `packages/design-system/src/_meta/manifest.ts` **and**
   `packages/design-system/scripts/generate-manifest.mjs` — then regenerate:
   ```bash
   cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest
   ```
   (Editing only the `.mjs` leaves `_meta/manifest.ts` stale and fails the manifest
   drift test inside `make test`.)
   For a pure bug fix, scope to the fix plus a regression test. Honor the Hard
   rules: tokens-only SCSS, components don't own layout, `forwardRef` + prop
   spread, i18n via `useTranslation`.

## Phase 2 — Build

1. Branch off fresh `main` (`<kind>` = `fix` / `feat` / `docs` to match the issue):
   ```bash
   git -C /Users/dpws/projects/design-system checkout -B <kind>/<short-desc> origin/main
   ```
2. Implement via `superpowers:writing-plans` → `superpowers:subagent-driven-development`
   (TDD per task).
3. **Gates — all must pass:**
   ```bash
   cd /Users/dpws/projects/design-system
   make test && make build-lib && make lint && npm run format:check
   npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
     | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0 (mirrors the CI tarball gate)
   ```
   (The manifest meta-test runs inside `make test`; if it complains, re-run
   `npm run build:manifest` and commit the regenerated JSON.)
4. Run the **Hard-rule-8** pre-push library review-fix loop: fresh-context
   adversarial reviewers across correctness/types, tests, a11y, and API/packaging,
   fixing every Critical/Important finding, until a pass is clean. (When ultracode
   is on, orchestrate with the Workflow tool: parallel finders → adversarial
   verify → fix loop.)

## Phase 3 — PR + release (autonomous after the gate is green)

1. **Record the pre-merge version** (to detect whether the release bumped it):
   ```bash
   git -C /Users/dpws/projects/design-system fetch --tags --force origin -q
   PREV=$(git -C /Users/dpws/projects/design-system tag --list 'v*' --sort=-v:refname | head -1)
   ```
2. **Push + open the PR.** Reference the issue but do NOT use a closing keyword —
   the skill closes the issue itself in Phase 4, after the version is known:

   ```bash
   git -C /Users/dpws/projects/design-system push -u origin <kind>/<short-desc>
   gh pr create --repo eocrm/design-system --base main --head <kind>/<short-desc> \
     --title "<kind>: <summary> (#<N>)" \
     --body "Addresses #<N>.

   ## Summary
   <what changed>

   ## Test plan
   <how it was verified>"
   ```

   Use "Addresses #N", never "Closes/Fixes #N" (a closing keyword would auto-close
   the issue at merge, before we have the version).

3. **Wait for the gate**; never merge on red (iterate Phase 2 instead). Treat a
   non-zero exit as "do not merge" — `gh pr checks` exits `0` only when every check
   passed (`8` while still pending, `1` on failure):
   ```bash
   gh pr checks <pr> --repo eocrm/design-system --watch
   ```
4. **Squash-merge:**
   ```bash
   gh pr merge <pr> --repo eocrm/design-system --squash --delete-branch
   ```
5. **Find the Release run for the merge commit.** It takes a few seconds to
   register after the merge, so poll by the exact commit — never eyeball-match a
   list:

   ```bash
   git -C /Users/dpws/projects/design-system fetch origin main -q
   MERGE_SHA=$(git -C /Users/dpws/projects/design-system rev-parse origin/main)
   RUN_ID=""
   for _ in $(seq 1 12); do
     RUN_ID=$(gh run list --repo eocrm/design-system --workflow=Release \
       --commit "$MERGE_SHA" --json databaseId --jq '.[0].databaseId // empty')
     [ -n "$RUN_ID" ] && break
     sleep 5
   done
   ```

   - **`RUN_ID` empty after the poll** → no Release run was created. If the merge
     touched neither `packages/**` nor `.github/workflows/**`, this is expected →
     go to Phase 4 on the **"no version bump"** path. (If it _did_ touch those
     paths yet no run appeared, STOP and investigate.)
   - **`RUN_ID` set** → watch it and read the `publish` job outcome:
     ```bash
     gh run watch "$RUN_ID" --repo eocrm/design-system
     gh run view "$RUN_ID" --repo eocrm/design-system --json jobs \
       --jq '.jobs[] | "\(.name): \(.conclusion)"'
     ```

6. **Resolve the version from the publish outcome.** Fetch tags only AFTER
   `gh run watch` returns — the `publish` job pushes the tag, so an earlier fetch
   would read `NEW == PREV` and misreport "no bump":

   ```bash
   git -C /Users/dpws/projects/design-system fetch --tags --force origin -q
   NEW=$(git -C /Users/dpws/projects/design-system tag --list 'v*' --sort=-v:refname | head -1)
   ```

   - **No Release run** (step 5) or **`publish: skipped`** → no new version; carry
     a "merged, no version bump" note into Phase 4.
   - **`publish: success`** and `NEW != PREV` → shipped version is `NEW` without the
     leading `v` (e.g. `v0.1.11` → `0.1.11`). Cross-check against the run's
     `## Published` summary.
   - **`publish: failure`**, or `NEW == PREV` when a bump was expected → STOP,
     report the run URL, and do NOT close the issue.

## Phase 4 — Comment the version and close the issue

```bash
# When a version shipped:
gh issue comment <N> --repo eocrm/design-system \
  --body "Resolved in \`@eocrm/design-system@<version>\` (PR #<pr>, tag \`v<version>\`). Bump your dependency to pick up the fix."

# When the change shipped but bumped no package version (non-library change):
gh issue comment <N> --repo eocrm/design-system \
  --body "Resolved in PR #<pr> (merged to main; no package version change)."

gh issue close <N> --repo eocrm/design-system --reason completed
```

Only close the issue AFTER the PR is merged (and the version captured, when a
publish was expected).

## Phase 5 — Report

Summarize: the issue; the PR link + squash-merge SHA; the published version + `v*`
tag (or "no version bump"); the playground redeploy; and confirmation the issue
was commented and closed.

## Error handling (stop conditions)

- Repo dirty / not on `main` → stop before any work.
- Hooks missing after `npm install` → stop.
- Issue is a `question` / `invalid` / `wontfix`, or otherwise not actionable as
  code → confirm intent with the user before building.
- `Quality / check` red → never merge; iterate Phase 2.
- `publish` failed, or an expected version bump didn't happen → STOP, report the
  run URL, do NOT close the issue.
- Close the issue ONLY after the PR is merged.
