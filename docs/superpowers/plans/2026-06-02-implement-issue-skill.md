# `implement-issue` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a process-doc skill at `.claude/skills/implement-issue/SKILL.md` — a general GitHub-issue worker that takes one open `eocrm/design-system` issue from "open" to "shipped + closed".

**Architecture:** A single Markdown skill file (YAML frontmatter + an ordered five-phase runbook). It hardcodes this repo's verified facts (paths, auto-publish-on-merge mechanics, the `gh issue` flow) and references the canonical component checklist rather than duplicating drift-prone paths. Delivered on branch `chore/ds-todo-skill` via a PR to `main`. No consumer app is involved.

**Tech Stack:** Markdown + YAML frontmatter; the runbook drives `git`, `gh`, `make`, `npm`. No application code, so "tests" are document-verification gates (frontmatter parses, prettier clean, every referenced script/path resolves, spec coverage).

**Spec:** `docs/superpowers/specs/2026-06-02-implement-issue-skill-design.md` (committed on this branch). The full, canonical SKILL.md body matches that spec's five phases.

---

## File structure

- **Deliverable:** `.claude/skills/implement-issue/SKILL.md` — the runbook. One file, one responsibility.
- The PR also carries the spec + this plan (brainstorm/plan artifacts).

## Verified facts (confirmed during planning — do not re-derive)

- `.claude/` is **not** gitignored in design-system (committable).
- Publish is automatic: `release.yml` on push to `main` touching `packages/**` → patch-bump from newest `v*` tag → `npm publish` → push tag → chain playground deploy. Jobs: `quality`, `detect-library-changes`, `publish`, `deploy-playground`. `publish` is **skipped** for non-`packages/design-system` changes. Newest tag today: `v0.1.10`.
- Required PR check: **`Quality / check`**.
- Issues live in `eocrm/design-system` (the design-system repo's GitHub home). `gh` is authenticated for it (`gh repo view eocrm/design-system` works; issues enabled).
- Demos: `packages/playground/src/pages/components/<Name>Demo.tsx` + `ComponentsIndex.tsx`. Manifest: `packages/design-system/scripts/generate-manifest.mjs` → `components.manifest.json` via `npm run build:manifest`.
- Gates `make test` / `make build-lib` / `make lint` (Makefile) and `npm run format:check` (root) all exist.

---

## Task 1: Author the SKILL.md

**Files:** Create `.claude/skills/implement-issue/SKILL.md`.

The canonical content is the five-phase runbook described in the spec — frontmatter (`name: implement-issue`, trigger-oriented `description`) then `# Implement a GitHub issue` with sections: Environment, Scope, Phase 0 (preconditions + `gh issue list`/`view` pick), Phase 1 (issue-as-spec + Core-invariant + manifest step), Phase 2 (branch + writing-plans + subagent-driven + gates + Rule-8 loop), Phase 3 (record `PREV` → push → `gh pr create` with "Addresses #N" → `gh pr checks --watch` → `gh pr merge --squash` → watch `Release` run → read `publish` conclusion → resolve `NEW`), Phase 4 (`gh issue comment` the version + `gh issue close --reason completed`), Phase 5 (report), and Error handling. Use exact `git -C /Users/dpws/projects/design-system …` / `gh … --repo eocrm/design-system …` commands.

- [ ] **Step 1: Write/confirm the file content** matching the spec's five phases (frontmatter `name: implement-issue` + the runbook above).

- [ ] **Step 2: Verify frontmatter + phases**

```bash
cd /Users/dpws/projects/design-system
python3 - <<'PY'
import re
t=open('.claude/skills/implement-issue/SKILL.md').read()
m=re.match(r'^---\n(.*?)\n---\n',t,re.S); assert m, "no frontmatter"
fm=m.group(1)
assert re.search(r'^name:\s*implement-issue\s*$',fm,re.M), "name missing/wrong"
assert re.search(r'^description:\s*\S',fm,re.M), "description missing"
assert '# Implement a GitHub issue' in t, "missing H1"
for p in ['Phase 0','Phase 1','Phase 2','Phase 3','Phase 4','Phase 5']:
    assert p in t, f"missing {p}"
assert 'DS-TODO' not in t and 'worktree' not in t and '/Users/dpws/projects/eocrm' not in t, "stale consumer-app refs remain"
assert 'gh issue close' in t and 'gh issue comment' in t, "missing issue close/comment"
print("SKILL.md OK")
PY
```

Expected: `SKILL.md OK`

- [ ] **Step 3: Verify referenced scripts/paths resolve**

```bash
cd /Users/dpws/projects/design-system
test -f .github/workflows/release.yml && echo "release.yml ✓"
test -f packages/design-system/scripts/generate-manifest.mjs && echo "generate-manifest.mjs ✓"
node -p "require('./packages/design-system/package.json').scripts['build:manifest']" >/dev/null && echo "build:manifest ✓"
node -p "require('./package.json').scripts['format:check']" >/dev/null && echo "format:check ✓"
grep -qE '^build-lib' Makefile && grep -qE '^test' Makefile && grep -qE '^lint' Makefile && echo "make targets ✓"
gh repo view eocrm/design-system --json nameWithOwner -q .nameWithOwner && echo "gh repo ✓"
```

Expected: five `✓` lines + `eocrm/design-system`.

- [ ] **Step 4: Prettier**

```bash
cd /Users/dpws/projects/design-system
npx prettier --write .claude/skills/implement-issue/SKILL.md
npx prettier --check .claude/skills/implement-issue/SKILL.md
```

Expected: `All matched files use Prettier code style!`

- [ ] **Step 5: Commit**

```bash
cd /Users/dpws/projects/design-system
git add -A .claude/skills/
git commit -m "feat(skill): implement-issue runbook"
```

---

## Task 2: Open the PR

**Files:** none (git/gh only).

- [ ] **Step 1: Repo-wide format check (matches the pre-push hook)**

```bash
cd /Users/dpws/projects/design-system && npm run format:check
```

Expected: `All matched files use Prettier code style!` (if it flags the spec/plan docs, `npx prettier --write` them and amend).

- [ ] **Step 2: Push**

```bash
git -C /Users/dpws/projects/design-system push -u origin chore/ds-todo-skill
```

- [ ] **Step 3: Create the PR**

```bash
gh pr create --repo eocrm/design-system --base main --head chore/ds-todo-skill \
  --title "feat(skill): implement-issue — GitHub-issue worker (issue → shipped → closed)" \
  --body "$(cat <<'EOF'
## Summary
Adds `.claude/skills/implement-issue/SKILL.md`: a runbook that takes one open `eocrm/design-system` issue end-to-end — pick (user chooses) → issue-as-spec → build (full Core-invariant + Rule-8 review) → PR + release (squash-merge → watch the auto Release run → capture the new `v*` tag) → comment the published version on the issue and close it.

Encodes verified mechanics: publish is automatic on merge (no manual workflow), and a `publish`-skipped run (non-library change) is handled as "merged, no version bump". No consumer app is involved — GitHub issues are the sole source of work.

## Test plan
- [x] Frontmatter parses (`name: implement-issue`); all five phases present; no stale consumer-app refs
- [x] Every referenced script/path resolves (release.yml, generate-manifest.mjs, build:manifest, format:check, make targets, gh repo)
- [x] `npm run format:check` clean
- [ ] CI `Quality / check`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for the gate**

```bash
gh pr checks --repo eocrm/design-system --watch
```

Expected: `Quality / check` passes. Report the PR URL to the user (merging this skill PR is the user's call).

---

## Self-review

**Spec coverage:** all five phases + error handling are in the SKILL.md; the four decisions map (location = `.claude/skills/implement-issue` via PR; pick = Phase 0; issue-as-spec = Phase 1; auto-merge + comment/close = Phases 3–4). ✓
**Placeholder scan:** `<kind>`/`<short-desc>`/`<N>`/`<pr>`/`<version>` are runtime runbook templates, not plan placeholders; plan-level commands are concrete. ✓
**Consistency:** branch `chore/ds-todo-skill` (this PR) vs `<kind>/<short-desc>` (runtime); gate name `Quality / check`; vars `PREV`/`NEW`; repo `eocrm/design-system`; package `@eocrm/design-system` — uniform. ✓
