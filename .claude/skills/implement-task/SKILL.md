---
name: implement-task
description: Use when asked to work an eocrm task from the DS space end-to-end — pick open DS tasks, implement the fix or feature in @eocrm/design-system, open & merge a PR, let the release publish, then add the published version to each task and move it to Done. Triggers on "check DS bugs", "work a DS task", "implement DS-12", "ship a task", "pick up a task", "fix a DS bug".
---

# Implement eocrm DS tasks (task → shipped → Done)

Take one DS task, or a batch the user picks, from open to a published
`@eocrm/design-system` version. Then record that version on each task and move
it to Done. A task can be anything actionable: a bug fix, a new prop, a new
component, or a docs change.

Work is tracked in **eocrm, space DS**. GitHub issues are not used.

**Announce at start:** "I'm using the implement-task skill."

## Environment (verified)

- **Repo:** `/home/dpws/projects/design-system`, package `@eocrm/design-system`,
  GitHub repo `eocrm/design-system`. GitHub hosts PRs and releases only.
- **Tasks:** eocrm workspace (`tenant`) `dpws`, space **DS**
  (`space_id: 01m5xdjgkqvncfjte8an2gs1x9`). Keys look like `DS-41`. Use the
  `mcp__plugin_eocrm-mcp_eocrm__tasks_*` tools and pass `tenant: "dpws"`. If the
  space id stops resolving, find it again with `tasks_list { search: "DS" }`.
- **Task types:** use the `eocrm:pick-type` skill. `bug` is for a defect, `epic`
  for a batch umbrella and `task` for a subtask.
- **Publishing is automatic on merge to `main`.** `.github/workflows/release.yml`
  runs only on a push to `main` touching `packages/**` or `.github/workflows/**`:
  it patch-bumps from the newest `v*` git tag, `npm publish`es to npmjs,
  pushes the new tag, and redeploys the playground. **There is no manual publish
  step — merging the PR IS releasing.** The shipped version is the new `v*` tag.
  Two no-version-bump cases to expect: **(a)** the merge touched **neither**
  `packages/**` nor `.github/workflows/**` (e.g. a `.claude/`- or root-docs-only
  change) → **no Release run is created at all**; **(b)** a Release run runs but its
  `publish` job is **skipped** because the diff matched neither
  `^packages/design-system/` nor the `release`/`quality`/`deploy-playground`
  workflow files (e.g. a `packages/playground`-only change).
- **Gates:** `make test`, `make build-lib`, `make lint` (root Makefile);
  `npm run format:check` (root). A Husky pre-push hook runs prettier + stylelint + ESLint +
  typecheck. The required PR status check is **`Quality / check`**.

## Scope

One task, or a batch of tasks the user picks. A batch shares **one branch and
one PR**.

## Phase 0 — Preconditions + pick

1. **Repo sane** — clean tree on `main`:
   ```bash
   git -C /home/dpws/projects/design-system fetch origin -q --prune
   git -C /home/dpws/projects/design-system status --porcelain   # must be empty
   git -C /home/dpws/projects/design-system rev-parse --abbrev-ref HEAD   # main
   ```
   If the tree is dirty or the branch isn't `main`, stop and ask the user to resolve it.
2. **Hooks installed:**
   ```bash
   git -C /home/dpws/projects/design-system config --get core.hooksPath   # .husky/_
   test -x /home/dpws/projects/design-system/.husky/pre-push
   ```
   If either check fails, run `npm install` in the repo and check again. If it still fails, stop.
3. **List open tasks and pick.** Run `tasks_list` with
   `{ tenant: "dpws", space_id: "01m5xdjgkqvncfjte8an2gs1x9", stage_key: "to_do" }`
   and again with `stage_key: "in_progress"`.
   - Show the user each task's key, type, title and a one-line read of what it asks.
   - Check whether any task is already fixed on `main`. Search the code and
     `git log` for the key. A task that is already fixed goes to Done with a
     note; don't rebuild it.
   - Ask which tasks to work, using AskUserQuestion. If the invocation named
     keys (for example `DS-41`), select those and skip the prompt.
4. **Read each task fully** with `tasks_get { tenant: "dpws", id: "DS-N" }`.
   Read the description, the checklist items and the parent epic, if it has one.
5. **Link the run** with the `eocrm:link-run` skill. Use the task key, or the
   batch's epic key. Move each picked task to In Progress with
   `tasks_move_stage { id, stage_key: "in_progress" }`.

## Phase 1 — Spec the work (task-as-spec)

1. The task description is the spec. Decide exactly what to change: a bug fix,
   a new prop, a new component, a docs change, and so on. Critique the task as
   well. If its proposed API or ARIA is wrong, say so and propose the better
   option; don't build it as written.
2. If the task is ambiguous or underspecified for a clean implementation, invoke
   `superpowers:brainstorming` for ONLY the open questions, then continue.
3. **If the work adds or changes a component**, it is not done until it
   satisfies two sets of rules. Read both now; don't rely on memory.
   - The **Core invariant** in `/home/dpws/projects/design-system/CLAUDE.md`.
   - The package Hard rules in `packages/design-system/CLAUDE.md`.

   That checklist covers:
   - tests beside the component;
   - a playground demo page, wired in through the route, the sidebar nav and
     the overview grid;
   - the `src/index.ts` re-export;
   - `docs/components/<Name>.md` (TL;DR, anti-patterns, generated props
     table) and its `AI-PRIMER.md` index line;
   - the CLUSTERS manifest entry.

   **CLUSTERS step:** add the entry to **both** parallel maps, which are kept
   in sync:
   - `packages/design-system/src/_meta/manifest.ts`
   - `packages/design-system/scripts/generate-manifest.mjs`

   Then regenerate:

   ```bash
   cd /home/dpws/projects/design-system/packages/design-system && npm run build:manifest
   ```

   If only the `.mjs` is edited, `_meta/manifest.ts` goes stale and the manifest
   drift test fails inside `make test`.

   For a pure bug fix, scope the work to the fix plus a regression test.

   Honor the Hard rules:
   - tokens-only SCSS;
   - components don't own layout;
   - `forwardRef` + prop spread;
   - i18n via `useTranslation`.

4. **Defects found along the way** that are out of scope get filed as new DS
   tasks with `tasks_create`, using the `bug` type and the DS `space_id`. Don't
   leave them only in chat.

## Phase 2 — Build

1. Branch off fresh `main`. `<kind>` is `fix`, `feat` or `docs` to match the work.
   ```bash
   cd /home/dpws/projects/design-system
   git checkout main && git pull
   git checkout -b <kind>/<short-desc>
   ```
2. Implement via `superpowers:writing-plans` → `superpowers:subagent-driven-development`
   (TDD per task). A small, explicit fix may be built directly; see "Planning
   proportionality" in the root `CLAUDE.md`.
3. **Gates — all must pass:**
   ```bash
   cd /home/dpws/projects/design-system
   make test && make build-lib && make lint && npm run format:check
   npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
     | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0 (mirrors the CI tarball gate)
   ```
   The manifest meta-test runs inside `make test`. If it complains, re-run
   `npm run build:manifest` and commit the regenerated JSON. If a CSS change
   breaks `npm run size`, rebuild first, then measure again before you raise a
   budget in `size-budgets.json`.
4. Run the `pre-push-review` skill. It covers the draft PR and the review-fix
   loop that Hard rule 8 requires.

## Phase 3 — PR + release

1. **Record the pre-merge version** so you can tell later whether the release
   bumped it:
   ```bash
   git -C /home/dpws/projects/design-system fetch --tags --force origin -q
   PREV=$(git -C /home/dpws/projects/design-system tag --list 'v*' --sort=-v:refname | head -1)
   ```
2. **PR.** The `pre-push-review` skill opens the draft PR. Put the task keys in
   the title, e.g. `fix: <summary> (DS-38/40/41)`. The body lists each key with
   one line on what changed, plus the test plan. Don't add GitHub closing
   keywords; there's no issue to close.

3. **Wait for the gate.** Never merge while the gate is red; go back to Phase 2
   instead. Treat a non-zero exit as "do not merge": `gh pr checks` exits `0`
   only when every check passed, `8` while checks are pending and `1` on
   failure.
   ```bash
   gh pr checks <pr> --repo eocrm/design-system --watch
   ```
   **Ask the user before merging.** Merging publishes to npm.
4. **Squash-merge.** If another PR merged while yours was open, your branch is
   `BEHIND`. Branch protection blocks the merge until the branch is up to date,
   so handle that first, then merge:
   ```bash
   if [ "$(gh pr view <pr> --repo eocrm/design-system --json mergeStateStatus --jq .mergeStateStatus)" = "BEHIND" ]; then
     gh pr update-branch <pr> --repo eocrm/design-system
     gh pr checks <pr> --repo eocrm/design-system --watch
   fi
   gh pr merge <pr> --repo eocrm/design-system --squash --delete-branch
   ```
   If `gh pr merge` prints the `--auto` / `--admin` hint instead of merging,
   the merge requirements still aren't met. For example, the branch is still
   `BEHIND`, or a required check isn't green. STOP and report; never force the
   merge with `--admin`.
5. **Find the Release run for the merge commit.** The run takes a few seconds to
   appear after the merge. Poll by the exact commit; never match it by eye from
   a list:

   ```bash
   git -C /home/dpws/projects/design-system fetch origin main -q
   MERGE_SHA=$(git -C /home/dpws/projects/design-system rev-parse origin/main)
   RUN_ID=""
   for _ in $(seq 1 12); do
     RUN_ID=$(gh run list --repo eocrm/design-system --workflow=Release \
       --commit "$MERGE_SHA" --json databaseId --jq '.[0].databaseId // empty')
     [ -n "$RUN_ID" ] && break
     sleep 5
   done
   ```

   - **`RUN_ID` is still empty after polling:** no Release run was created.
     - If the merge touched neither `packages/**` nor `.github/workflows/**`,
       that is expected. Go to Phase 4 on the "no version bump" path.
     - If it did touch those paths and still no run appeared, STOP and
       investigate.
   - **`RUN_ID` is set:** watch the run in the background (it can take more
     than 10 minutes), then read the outcome of the `publish` job:
     ```bash
     gh run watch "$RUN_ID" --repo eocrm/design-system --exit-status
     gh run view "$RUN_ID" --repo eocrm/design-system --json jobs \
       --jq '.jobs[] | "\(.name): \(.conclusion)"'
     ```

6. **Resolve the version from the publish outcome.** Fetch tags only after the
   run finishes. The `publish` job pushes the tag, so an earlier fetch reads
   `NEW == PREV` and wrongly reports "no bump".

   ```bash
   git -C /home/dpws/projects/design-system fetch --tags --force origin -q
   NEW=$(git -C /home/dpws/projects/design-system tag --list 'v*' --sort=-v:refname | head -1)
   ```

   - **No Release run** (step 5) or **`publish: skipped`**: no new version. Use
     the "merged, no version bump" note in Phase 4.
   - **`publish: success`** and `NEW != PREV`: the shipped version is `NEW`
     without the leading `v`.
   - **`publish: failure`**, or `NEW == PREV` when a bump was expected: STOP
     and report the run URL. Do NOT move any task to Done.

## Phase 4 — Record the version and close the tasks

For each task in the batch:

1. **Add a release note** at the top of the description with
   `tasks_update { tenant: "dpws", id: "DS-N", description: "<note>\n\n<existing description>" }`.
   The note:
   - When a version shipped:
     `**Released in \`@eocrm/design-system@<version>\`\*\* (PR #<pr>, tag \`v<version>\`).`
     followed by one or two lines on what changed for consumers. Name any
     workaround they can now delete, and any behaviour change they will see.
   - When nothing was published: `Resolved in PR #<pr> (merged to main; no package version change).`

   `tasks_update` can return `changed: {}` even when the write landed. Confirm
   with `tasks_get`, and retry once if the note is missing.

2. **Move the task to Done** with `tasks_move_stage { id, stage_key: "done" }`.
   A task linked to the run may already be Done after the merge; that's fine.
3. When the batch has an epic, close the epic last, once every child is Done.
4. Unlink the run with `eocrm:link-run none`.

Move a task to Done only after its PR has merged and, when a publish was
expected, after the version is known.

## Phase 5 — Report

Summarize:

- the tasks;
- the PR link and the squash-merge SHA;
- the published version and `v*` tag, or "no version bump";
- the playground redeploy;
- confirmation that every task has a release note and is Done;
- any follow-up tasks you filed;
- anything consumers should watch for.

## Error handling (stop conditions)

- Repo dirty / not on `main` → stop before any work.
- Hooks missing after `npm install` → stop.
- The task isn't actionable as code, or it asks for something you think is
  wrong: confirm with the user before building.
- `Quality / check` red → never merge; iterate Phase 2.
- `publish` failed, or an expected version bump didn't happen → STOP, report the
  run URL, leave the tasks In Progress.
- Move a task to Done ONLY after its PR is merged.
