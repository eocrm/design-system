# `implement-ds-todo` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a process-doc skill at `.claude/skills/implement-ds-todo/SKILL.md` that takes one consumer DS-TODO gap from "filed" to "shipped + recorded".

**Architecture:** A single Markdown skill file (YAML frontmatter + an ordered five-phase runbook). It hardcodes this environment's verified facts (paths, auto-publish-on-merge mechanics, eocrm-no-remote) and references the repo's canonical component checklist instead of duplicating drift-prone paths. Delivered on branch `chore/ds-todo-skill` via a PR to `main`.

**Tech Stack:** Markdown + YAML frontmatter; the runbook drives `git`, `gh`, `make`, and `npm` commands. No application code, so "tests" are document-verification gates (frontmatter parses, prettier clean, every referenced script/path resolves, spec coverage).

**Spec:** `docs/superpowers/specs/2026-06-02-implement-ds-todo-skill-design.md` (already committed on this branch).

---

## File structure

- **Create:** `.claude/skills/implement-ds-todo/SKILL.md` — the entire deliverable. One file, one responsibility: the runbook.
- No other source files. The PR also carries the already-committed spec + this plan.

## Verified facts the SKILL.md content depends on (do not re-derive — confirmed during planning)

- `.claude/` is **not** gitignored in design-system (committable; first tracked skill).
- Publish is automatic: `.github/workflows/release.yml` on push to `main` touching `packages/**` → patch-bump from newest `v*` tag → `npm publish` → push tag → chain playground deploy. Jobs are named `quality`, `detect-library-changes`, `publish`, `deploy-playground`. Newest tag today: `v0.1.10`.
- The required PR status check is named **`Quality / check`** (from `quality.yml`, used by `release.yml` and the PR gate).
- Demos live at `packages/playground/src/pages/components/<Name>Demo.tsx`; overview grid is `packages/playground/src/pages/components/ComponentsIndex.tsx` (the root `CLAUDE.md`'s `pages/demo/`+`DemoIndex.tsx` names are stale — the skill references the checklist, not these paths).
- Manifest: `packages/design-system/scripts/generate-manifest.mjs` → `packages/design-system/src/components.manifest.json`; regenerate with `npm run build:manifest` (run in `packages/design-system`).
- Gates: `make test`, `make build-lib`, `make lint` (root Makefile); `npm run format:check` (root). eocrm has no remote and no hooks.

---

## Task 1: Author the SKILL.md

**Files:**

- Create: `.claude/skills/implement-ds-todo/SKILL.md`

- [ ] **Step 1: Write the file with exactly this content**

````markdown
---
name: implement-ds-todo
description: Use when resolving a consumer-filed design-system gap end-to-end — pick one item from eocrm's DS-TODO.md, build & publish the @eocrm/design-system fix, then record the shipped package version back in DS-TODO.md. Triggers on "implement a DS-TODO", "resolve a DS gap", "ship a DS-TODO item".
---

# Implement a DS-TODO item (consumer gap → shipped + recorded)

Take ONE gap from the consumer's `DS-TODO.md` all the way to a published
`@eocrm/design-system` version and record that version back in the consumer.

**Announce at start:** "I'm using the implement-ds-todo skill."

## Environment (this setup — verified)

- **Consumer TODO:** `/Users/dpws/projects/eocrm/DS-TODO.md`
- **Consumer shims:** `/Users/dpws/projects/eocrm/apps/web/src/shared/ds-shims/`
- **Library repo:** `/Users/dpws/projects/design-system` — package `@eocrm/design-system`
- **Publishing is automatic on merge to `main`.** `.github/workflows/release.yml`
  runs on any push to `main` touching `packages/**`: it patch-bumps from the
  newest `v*` git tag, `npm publish`es to GitHub Packages, pushes the new tag,
  and redeploys the playground. **There is no manual publish step — merging the
  PR IS deploying.** The shipped version is the new `v*` tag. (Ignore the stale
  `publish.yml` reference in README/CLAUDE.md.)
- **eocrm has no git remote and no git hooks.** It has two local branches:
  `main` and an active dev branch checked out in the working dir. So "push to
  main" = a **local commit on `main`**, and because `main` is not the checked-out
  branch you **must use a git worktree** to commit to it. "Ignore eocrm
  workflows" = no PR, no CI, no feature-branch flow — just the doc commit.

## Scope

Exactly **one** gap per invocation. The consumer-side migration (deleting the
shim, repointing imports) is NOT in scope — that is the consumer's adoption
task; this skill only records the version that unblocks it.

---

## Phase 0 — Preconditions + pick

1. **Library repo sane:** in `/Users/dpws/projects/design-system`, require a
   clean tree on `main`:
   ```bash
   git -C /Users/dpws/projects/design-system fetch origin -q --prune
   git -C /Users/dpws/projects/design-system status --porcelain   # must be empty
   git -C /Users/dpws/projects/design-system rev-parse --abbrev-ref HEAD  # main
   ```
   If dirty or not on `main`, stop and ask the user to resolve it.
2. **Hooks installed:**
   ```bash
   git -C /Users/dpws/projects/design-system config --get core.hooksPath  # .husky/_
   test -x /Users/dpws/projects/design-system/.husky/pre-push
   ```
   If either fails, run `npm install` in the repo and re-check; if still failing,
   stop.
3. **Parse the TODO:** read `/Users/dpws/projects/eocrm/DS-TODO.md`. Collect the
   gap-table rows that are **not** marked resolved (no `✅` in the `#` cell and no
   matching `## Resolved` line). For each open gap, resolve its shim path (the
   `Shim` column) and skim the shim to gauge scope.
4. **Pick:** present the open gaps to the user with a one-line feasibility note
   each (component, rough size, anything ambiguous) and ask which to implement.
   If the invocation included an arg (`#N` or a gap name), select that and skip
   the prompt. Confirm exactly one gap before proceeding.

## Phase 1 — Spec the fix (shim-as-spec)

1. Read the chosen shim and find its consumer import sites to derive the real
   component's API (props, slots, behavior, responsive rules, token mapping):
   ```bash
   grep -rn "<ShimName>\|ds-shims/<ShimName>" /Users/dpws/projects/eocrm/apps/web/src
   ```
2. If the shim fully defines the component, the shim **is** the spec — proceed.
   If anything is genuinely ambiguous, invoke `superpowers:brainstorming` for
   **only** those open questions, then continue.
3. Enumerate the full deliverable. A library component is not done until it
   satisfies the **Core invariant** in `/Users/dpws/projects/design-system/CLAUDE.md`
   and the package Hard rules in `packages/design-system/CLAUDE.md`. Read both now;
   do not rely on memory. The checklist there covers: tests beside the component,
   a playground demo page, demo wiring (route + sidebar nav + overview grid),
   the `src/index.ts` re-export, JSDoc `@remarks` anti-patterns, and an
   `AGENTS.md` TL;DR. **Plus one step not in CLAUDE.md:** add a CLUSTERS entry in
   `packages/design-system/scripts/generate-manifest.mjs`, then regenerate:
   ```bash
   cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest
   ```
   (Demos currently live at `packages/playground/src/pages/components/<Name>Demo.tsx`
   and the grid is `ComponentsIndex.tsx` — but verify against the actual tree, the
   root CLAUDE.md names are stale.)

## Phase 2 — Build

1. Branch off fresh `main`:
   ```bash
   git -C /Users/dpws/projects/design-system checkout -B feat/<component> origin/main
   ```
2. Implement via `superpowers:writing-plans` → `superpowers:subagent-driven-development`
   (TDD per task). Honor the Hard rules: tokens-only SCSS, components don't own
   layout, `forwardRef` + prop spread, i18n via `useTranslation`.
3. Gates — all must pass:
   ```bash
   cd /Users/dpws/projects/design-system
   make test && make build-lib && make lint && npm run format:check
   npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -c '\.test\.'   # expect 0
   ```
   (The manifest meta-test runs inside `make test`; if it complains, re-run
   `npm run build:manifest` and commit the regenerated JSON.)
4. Run the **Hard-rule-8** pre-push library review-fix loop: fresh-context
   adversarial reviewers across correctness/types, tests, a11y, and API/packaging,
   fixing every Critical/Important finding, until a pass is clean. (When ultracode
   is on, orchestrate this with the Workflow tool: parallel finders → adversarial
   verify → fix loop.)

## Phase 3 — PR + deploy (autonomous after the gate is green)

1. **Record the pre-merge version** (to prove it advances):
   ```bash
   git -C /Users/dpws/projects/design-system fetch --tags --force origin -q
   PREV=$(git -C /Users/dpws/projects/design-system tag --list 'v*' --sort=-v:refname | head -1)
   ```
2. Push and open the PR:
   ```bash
   git -C /Users/dpws/projects/design-system push -u origin feat/<component>
   gh pr create --repo eocrm/design-system --base main --head feat/<component> \
     --title "feat: <Component> (resolves DS-TODO #N)" --body "<summary + test plan>"
   ```
3. Wait for the gate; do **not** merge on failure (iterate Phase 2 instead):
   ```bash
   gh pr checks <pr-number> --repo eocrm/design-system --watch
   ```
4. **Squash-merge:**
   ```bash
   gh pr merge <pr-number> --repo eocrm/design-system --squash --delete-branch
   ```
5. **Watch the Release run** on the merge commit and confirm `publish` actually
   ran (not `skipped`/`failed`):
   ```bash
   git -C /Users/dpws/projects/design-system fetch origin main -q
   MERGE_SHA=$(git -C /Users/dpws/projects/design-system rev-parse origin/main)
   # find the Release run whose headSha == MERGE_SHA:
   gh run list --repo eocrm/design-system --workflow=Release --branch=main \
     --limit 8 --json databaseId,headSha,status
   gh run watch <run-id> --repo eocrm/design-system
   gh run view <run-id> --repo eocrm/design-system --json jobs \
     --jq '.jobs[] | "\(.name): \(.conclusion)"'   # require "publish: success"
   ```
   If `publish` is `skipped` or `failed`, STOP — do not record a version; report
   the run URL.
6. **Capture the shipped version:**
   ```bash
   git -C /Users/dpws/projects/design-system fetch --tags --force origin -q
   NEW=$(git -C /Users/dpws/projects/design-system tag --list 'v*' --sort=-v:refname | head -1)
   ```
   Assert `NEW` != `PREV` and `NEW` sorts newer; cross-check it against the
   Release run's `## Published` job summary. The package version is `NEW` without
   the leading `v` (e.g. `v0.1.11` → `0.1.11`). If `NEW == PREV`, STOP and report.

## Phase 4 — Record in the consumer (worktree → `main`, DS-TODO.md only)

1. Add a worktree on `main` (outside the repo so it never pollutes the active
   tree); reuse/clean a stale one first:
   ```bash
   WT=/Users/dpws/projects/eocrm-ds-todo-wt
   git -C /Users/dpws/projects/eocrm worktree remove --force "$WT" 2>/dev/null || true
   git -C /Users/dpws/projects/eocrm worktree prune
   git -C /Users/dpws/projects/eocrm worktree add "$WT" main
   ```
2. Edit **only** `"$WT/DS-TODO.md"`:
   - Mark the resolved row's `#` cell with a ✅ (e.g. `| 1 |` → `| 1 ✅ |`).
   - Append a `## Resolved` section (create it if absent) with a dated line:
     ```
     - #N <Gap> — shipped in `@eocrm/design-system@<version>` (DS PR eocrm/design-system#<pr>, <YYYY-MM-DD>). Migration pending: remove `<shim path>` + update import sites.
     ```
   - Keep the row — removal is the consumer's adoption step.
3. Commit DS-TODO.md only, asserting nothing else is staged:
   ```bash
   git -C "$WT" add DS-TODO.md
   git -C "$WT" status --porcelain   # must list ONLY: A/M DS-TODO.md
   git -C "$WT" commit -m "docs(ds-todo): #N <Gap> shipped in @eocrm/design-system@<version>"
   ```
   eocrm has no remote, so the local `main` commit is the delivery. (If an
   `origin` with `main` ever exists, `git -C "$WT" push origin main` — DS-TODO.md
   only.)
4. **Always** remove the worktree, even on error:
   ```bash
   git -C /Users/dpws/projects/eocrm worktree remove "$WT"
   git -C /Users/dpws/projects/eocrm worktree prune
   ```

## Phase 5 — Report

Summarize: the gap resolved; the DS PR link + squash-merge SHA; the published
version + `v*` tag; the playground redeploy; the eocrm `main` commit SHA touching
DS-TODO.md; and the explicit remaining consumer step (remove the shim + repoint
imports).

## Error handling (stop conditions)

- Library repo dirty / not on `main` → stop before any work.
- Hooks missing after `npm install` → stop.
- Chosen gap already marked resolved → skip it.
- Shim missing/empty → confirm scope with the user (brainstorm) before building.
- `Quality / check` red → never merge; iterate Phase 2.
- `publish` job skipped/failed, or `NEW == PREV` → do NOT record a version; report
  the run URL and stop at Phase 3.
- eocrm commit must touch **only** DS-TODO.md; the worktree is always removed.
````

- [ ] **Step 2: Verify the frontmatter parses and the body is well-formed**

Run:

```bash
cd /Users/dpws/projects/design-system
python3 - <<'PY'
import re,sys
t=open('.claude/skills/implement-ds-todo/SKILL.md').read()
m=re.match(r'^---\n(.*?)\n---\n',t,re.S)
assert m, "no frontmatter block"
fm=m.group(1)
assert re.search(r'^name:\s*implement-ds-todo\s*$',fm,re.M), "name missing/wrong"
assert re.search(r'^description:\s*\S',fm,re.M), "description missing"
assert '# Implement a DS-TODO item' in t, "missing H1"
for p in ['Phase 0','Phase 1','Phase 2','Phase 3','Phase 4','Phase 5']:
    assert p in t, f"missing {p}"
print("SKILL.md frontmatter + phases OK")
PY
```

Expected: `SKILL.md frontmatter + phases OK`

- [ ] **Step 3: Verify every script/path the skill references actually resolves**

Run:

```bash
cd /Users/dpws/projects/design-system
test -f .github/workflows/release.yml && echo "release.yml ✓"
test -f packages/design-system/scripts/generate-manifest.mjs && echo "generate-manifest.mjs ✓"
node -p "require('./packages/design-system/package.json').scripts['build:manifest']" >/dev/null && echo "build:manifest ✓"
node -p "require('./package.json').scripts['format:check']" >/dev/null && echo "format:check ✓"
grep -qE '^build-lib' Makefile && grep -qE '^test' Makefile && grep -qE '^lint' Makefile && echo "make targets ✓"
test -f /Users/dpws/projects/eocrm/DS-TODO.md && echo "DS-TODO.md ✓"
test -d /Users/dpws/projects/eocrm/apps/web/src/shared/ds-shims && echo "ds-shims ✓"
```

Expected: all seven `✓` lines.

- [ ] **Step 4: Format with prettier (pre-push hook runs `prettier --check` repo-wide)**

Run:

```bash
cd /Users/dpws/projects/design-system
npx prettier --write .claude/skills/implement-ds-todo/SKILL.md
npx prettier --check .claude/skills/implement-ds-todo/SKILL.md
```

Expected: `All matched files use Prettier code style!`

- [ ] **Step 5: Commit**

```bash
cd /Users/dpws/projects/design-system
git add .claude/skills/implement-ds-todo/SKILL.md
git commit -m "feat(skill): implement-ds-todo runbook

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Open the PR

**Files:** none (git/gh only).

- [ ] **Step 1: Final repo-wide format check (matches the pre-push hook)**

Run:

```bash
cd /Users/dpws/projects/design-system && npm run format:check
```

Expected: `All matched files use Prettier code style!` (if it flags the spec/plan
docs, `npx prettier --write` them and amend.)

- [ ] **Step 2: Push the branch**

```bash
git -C /Users/dpws/projects/design-system push -u origin chore/ds-todo-skill
```

Expected: branch pushed, no pre-push hook failure.

- [ ] **Step 3: Create the PR**

```bash
gh pr create --repo eocrm/design-system --base main --head chore/ds-todo-skill \
  --title "feat(skill): implement-ds-todo — consumer DS-TODO → shipped + recorded" \
  --body "$(cat <<'EOF'
## Summary
Adds `.claude/skills/implement-ds-todo/SKILL.md`: a runbook that takes one consumer-filed gap from eocrm's `DS-TODO.md` to a published `@eocrm/design-system` version and records that version back in `DS-TODO.md`.

Five phases: pick (user chooses an open gap) → spec (shim-as-spec) → build (full Core-invariant component + Rule-8 review) → PR + deploy (squash-merge → watch the auto Release run → capture the new `v*` tag) → record (worktree on eocrm `main`, DS-TODO.md only, annotate-not-delete).

Encodes verified mechanics: publish is automatic on merge (no manual workflow), and eocrm has no remote/hooks so recording is a local doc commit on `main` via a worktree.

## Test plan
- [x] Frontmatter parses; all five phases present
- [x] Every referenced script/path resolves (release.yml, generate-manifest.mjs, build:manifest, format:check, make targets, DS-TODO.md, ds-shims)
- [x] `npm run format:check` clean
- [ ] CI `Quality / check`
- [ ] First real exercise (separate): run against gap #1 AppLayout

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: prints the new PR URL.

- [ ] **Step 4: Wait for the gate**

```bash
gh pr checks --repo eocrm/design-system --watch
```

Expected: `Quality / check` passes. Report the PR URL to the user for merge
(creating this skill is a normal PR; merging it is the user's call).

---

## Self-review (run after the plan is written)

**1. Spec coverage:** every spec section maps to a task — environment facts +
five phases + error handling are all embedded verbatim in the SKILL.md content
(Task 1 Step 1); the four brainstorming decisions are reflected (location =
`.claude/skills/...` via PR in Task 2; pick = Phase 0.4; shim-as-spec = Phase 1.2;
auto-merge+record = Phases 3–4). ✓

**2. Placeholder scan:** the `<component>`/`<Name>`/`#N`/`<version>`/`<pr>` tokens
are intentional runtime templates inside a runbook, not plan placeholders; every
plan-level command is concrete. ✓

**3. Consistency:** branch name `chore/ds-todo-skill` (this PR) vs `feat/<component>`
(what the skill creates at runtime) are deliberately different and used
consistently; gate name `Quality / check`, version vars `PREV`/`NEW`, worktree
var `WT`, and the `@eocrm/design-system` package name are uniform across tasks. ✓
