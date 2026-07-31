---
name: pre-push-review
description: Use when preparing a pull request that touches packages/design-system/** (library variant) or packages/playground/src/pages/mockups/** (mockup variant). Opens a draft PR after baseline gates, then runs the mandatory review-fix loop until two fresh reviewers say "clean enough to stop" before marking it ready. Required by design-system CLAUDE.md Hard rule 8 and playground CLAUDE.md Hard rule 7.
---

# Pre-push review-fix cycle

Two variants. Pick the one matching what you changed; if a PR touches both, run both.

## Reviewer model and freshness

Each review round uses at least **two independent fresh-context agents**.
Freshness means the agents receive the review brief and repository state, but
none of the implementation conversation or another reviewer's reasoning.

Use the session's currently selected/default model and **do not set a model
override**. Model inheritance is intentional: an Opus session reviews with
Opus, and a Codex session reviews with its active model. Do not substitute a
different model based on assumptions about strength, cost, or token usage.

Run the two reviews in parallel when the harness supports it. If fewer than
two agent slots are available, run them sequentially; they must still be
separate fresh contexts.

## Review scope by round

The first round reviews the complete branch diff from its merge base through
the current head. Record that head as `REVIEWED_HEAD`.

After fixes, each later round reviews only `REVIEWED_HEAD..HEAD`. Give reviewers
the prior round's blocking findings alongside that scoped diff so they can
verify each fix and detect breakage introduced by the fix commits. Do not ask
later rounds to re-review unchanged code from the original branch diff. After
the round completes, advance `REVIEWED_HEAD` to the head that was reviewed.

## Draft-first pull request lifecycle

The review loop runs against a visible draft pull request:

1. Run the variant's baseline gates.
2. Commit and push the scoped changes, then open a **draft** pull request.
3. Run the first two-reviewer round against the draft PR's complete branch
   diff, then record the reviewed head.
4. Fix every load-bearing finding autonomously, rerun affected gates, commit,
   and push the fixes to the same draft PR.
5. Repeat with two new fresh-context reviewers after every fix round, scoped
   to commits since the previously reviewed head.
6. Mark the pull request **ready for review** only when every reviewer in the
   same final round returns `clean enough to stop` and all exit criteria pass.

Never mark a PR ready while Critical or Important findings remain. Do not stop
after merely reporting review findings when an in-scope fix can be made safely;
continue the review-fix loop autonomously.

---

## Variant A — library changes (`packages/design-system/**`)

The library is consumed by AI agents who pattern-match against whatever we ship — a missing JSDoc, broken ARIA, or token slip propagates to every page they generate. Catching it here is cheaper than tracking it down across consumer code.

**Applies to**: any change inside `packages/design-system/` — component code, tests, tokens, SCSS, `package.json`, `AGENTS.md`, `README.md`, or that package's `CLAUDE.md`.

**Does NOT apply to**: changes scoped to `packages/playground/**`, root `README.md`, root `CLAUDE.md`, GitHub workflows, the Makefile, or other non-library files. Push those normally.

### The loop

1. **Run baseline gates** — `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system`. They must all pass before the draft PR is opened.
2. **Open the draft PR** — commit and push the scoped branch, then create a draft pull request. All review rounds and fixes target this same draft.
3. **Spawn at least two independent fresh-context review agents** against the complete branch diff, targeted at `packages/design-system/` and inheriting the current session's default model without an override. Brief each explicitly on the 10 review categories: bugs, a11y, API inconsistencies, type safety, rule violations (Rules 1–7), test coverage, token discipline, SCSS, cross-package leakage, package/distribution. Tell each to read `packages/design-system/CLAUDE.md`, `AGENTS.md`, and `README.md` first. Ask for output as Critical / Important / Nice-to-have / Regression-watch + a final verdict (`clean enough to stop` or `keep iterating`). Record the reviewed head.
4. **Fix every Critical and every Important finding**. Nice-to-have is judgment — fix when cheap, skip when churn outweighs.
5. **For every finding you deliberately skip**, leave a one-line explanation in your response so the next reviewer doesn't re-flag it.
6. **Re-run affected gates, commit, and push** fixes to the same draft PR.
7. **Spawn another round of at least two fresh reviewers** with the inherited default model. Give them the prior blocking findings and only the diff since the previously reviewed head; ask them to verify the fixes and inspect that scoped diff for new breakage.
8. **Repeat autonomously** until every reviewer in the same round returns `clean enough to stop`, then mark the PR ready for review.

### Hard exit criteria

- 0 Critical, 0 Important findings across both reviewers (or each remaining one has an explicit documented skip)
- Both fresh reviewers in the final round return `clean enough to stop`
- All four gates (test, typecheck, lint, build) green
- `npm pack --dry-run` shows no test files or internal-only paths in the tarball

### When to consider lint rules

If a reviewer keeps catching the same class of issue (raw values, missing JSDoc, ARIA omissions), codify it in `.stylelintrc.json` overrides or a Vitest meta-test so future agents can't reintroduce it. That's how `.stylelintrc.json` and `src/structure.test.ts` grew to their current size.

### Trivial-change escape hatch

A one-line doc typo or comment tweak doesn't need a full review loop. Use judgment — if the change couldn't plausibly introduce a regression, push without the cycle. When unsure, run the cycle.

---

## Variant B — mockup changes (`packages/playground/src/pages/mockups/**`)

Mockups are the most visible artifact of the library — they're what a new engineer or stakeholder loads first, and what AI agents pattern-match against when building real CRM screens. A drift here propagates straight into consumer code.

**Applies to**: any change touching files under `packages/playground/src/pages/mockups/**`, the mockup registry (`packages/playground/src/pages/mockups/registry.ts`), or mock data shared by mockups (`packages/playground/src/data/**`).

**Does NOT apply to**: demo pages, AppShell, root `App.tsx`, layout files, or other playground tooling. Push those normally. Pure docs changes also push directly per root CLAUDE.md's "standalone docs may be direct-pushed" carve-out.

### The loop

1. **Run baseline gates** — `make test`, `make build` (typecheck + bundle), `make lint`. They must all pass before the draft PR is opened.
2. **Open the draft PR** — commit and push the scoped branch, then create a draft pull request. All review rounds and fixes target this same draft.
3. **Spawn at least two independent fresh-context review agents** against the complete branch diff, targeted at the changed mockup file(s), inheriting the current session's default model without an override. Record the reviewed head and brief each on these 10 review categories:
   1. **Hard rule 6 compliance** — no inline `style={...}`, no raw HTML tags, no co-located `.module.scss`. Any escape-hatch mock has a matching entry in `packages/design-system/src/components/TODO.md` AND an inline `{/* TODO: replace when … */}` comment.
   2. **Registry sync** — every library component used in the mockup is listed in that mockup's `usesComponents` array in `registry.ts`. No stale entries (a name listed that's no longer imported).
   3. **Imports** — only from `@eocrm/design-system`, never relative paths into the library (Rule 2). Demo-only deps from Rule 5 stay out.
   4. **Realism** — does the mockup look like a real CRM screen, or a contrived demo? Mock data plausible (names, dates, currency formatting). No "lorem ipsum" or `"Click me"` placeholder text.
   5. **Accessibility** — landmarks (`<main>` / nav present via library components), heading hierarchy (one h1 per page), images have alt text via `<Avatar name>` or equivalent, interactive elements have accessible labels.
   6. **Keyboard / focus** — tab order matches visual order, no focus traps, Escape closes modals/popovers.
   7. **Layout discipline** — spacing comes from `<Stack gap>` / `<Cluster gap>` props, not from inline margins or custom CSS. Vertical rhythm consistent across the page.
   8. **Component coverage** — if a primitive exists for what the mockup does, the mockup uses it (no `<Button>` ignored in favor of a hand-rolled trigger). Cross-reference against the manifest at `packages/design-system/src/components.manifest.json`.
   9. **State realism** — interactive state (open/closed, selected, loading, empty) reflects how the CRM would use it. If the mockup has only a single state, flag whether the empty / loading / error variants are worth adding.
   10. **No stale TODOs** — any `{/* TODO: replace when … */}` comment has a matching open entry in `TODO.md`; any TODO entry whose listed primitive HAS shipped should be ticked + the inline mock refactored away.

   Ask for output as `Critical` / `Important` / `Nice-to-have` / `Regression-watch` + a final verdict line (`clean enough to stop` or `keep iterating`).

4. **Fix every Critical and every Important finding**. Nice-to-have is judgment — fix when cheap, skip when churn outweighs.
5. **For every finding deliberately skipped**, leave a one-line explanation so the next reviewer doesn't re-flag it.
6. **Re-run affected gates, commit, and push** fixes to the same draft PR.
7. **Spawn another round of at least two fresh reviewers** with the inherited default model. Give them the prior blocking findings and only the diff since the previously reviewed head; ask them to verify the fixes and inspect that scoped diff for new breakage.
8. **Repeat autonomously** until every reviewer in the same round returns `clean enough to stop`, then mark the PR ready for review.

### Hard exit criteria

- 0 Critical, 0 Important findings across both reviewers (or each remaining one has an explicit documented skip).
- Both fresh reviewers in the final round return `clean enough to stop`.
- All three gates (test, build, lint) green.
- All open TODOs in `packages/design-system/src/components/TODO.md` that the changed mockup touches are either still open with a matching inline comment, OR ticked + the refactor done in this PR.

### Trivial-change escape hatch

A one-character text fix or a typo in mock data doesn't need a full review loop. Use judgment — if the change couldn't plausibly affect Rule 6 compliance, layout, or component coverage, push without the cycle.
