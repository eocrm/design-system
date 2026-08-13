# Resolve All Open Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve GitHub issues #446, #447, #448, #450, #451, #452, #455, #456, #457, #458, #459, #460, #461, and #462 in one published release.

**Architecture:** Make focused corrections to existing primitives. Extract Skeleton timing into a public hook, consume it from DataTable, route Field attributes to composite controls' focusable elements, and add narrow Card and Constrain layout capabilities. Keep one commit per task on the shared branch, then run the mandatory draft-PR review loop over the complete diff.

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library, Sass modules, JSON design tokens, npm workspaces, GitHub Actions.

## Global Constraints

- Work on `feat/resolve-all-open-issues` from design commit `ba98546`.
- Follow strict red-green-refactor for every runtime behavior change.
- Add no dependencies or raw styling values.
- Route fixed user-facing strings through English and Russian i18n catalogs.
- Update JSDoc, demos, and `packages/design-system/AGENTS.md` for public API changes.
- Use `Addresses`, not closing keywords, in the PR body.

---

### Task 1: Button aria-disabled visuals (#462)

**Files:** Modify `Button.module.scss`, `Button.test.tsx`, `Button.tsx`, and `ButtonDemo.tsx`.

**Produces:** `[aria-disabled='true']` looks unavailable and cannot acquire hover styling, but remains focusable and keeps pointer events.

- [ ] Add a raw-SCSS regression assertion, following existing repository patterns, requiring the aria-disabled state selector and hover exclusions. Add a DOM test proving `aria-disabled` does not imply native `disabled`.
- [ ] Run `npm test --workspace @eocrm/design-system -- Button.test.tsx`; expect the SCSS assertion to fail because the selector is absent.
- [ ] Group opacity and `cursor: not-allowed` under `:disabled, &[aria-disabled='true']`; keep `pointer-events: none` under native `:disabled` only; exclude both states from every variant hover selector.
- [ ] Document consumer-owned activation suppression and add an enabled/aria-disabled comparison to the demo.
- [ ] Run the focused test and `npm run lint:css --workspace @eocrm/design-system`, then commit `fix(Button): style focus-preserving aria-disabled state`.

### Task 2: Slider range names (#446, #461)

**Files:** Modify `Slider.tsx`, `Slider.test.tsx`, the three i18n catalog files, `SliderDemo.tsx`, and `AGENTS.md`.

**Produces:** `thumbLabels?: readonly [string, string]`; i18n keys `slider.minimum` and `slider.maximum`.

- [ ] Replace the duplicate-name test with assertions that `aria-label="Price range"` yields accessible names `Price range, minimum` and `Price range, maximum`. Add explicit tuple and external `aria-labelledby` cases while retaining single-thumb tests.
- [ ] Run `npm test --workspace @eocrm/design-system -- Slider.test.tsx`; expect both existing range thumbs to report `Price range`.
- [ ] Add the tuple prop. Explicit labels win; otherwise derive localized names from root `aria-label`. For `aria-labelledby`, render stable visually hidden localized suffix nodes and append each suffix id to the thumb's label references.
- [ ] Add English/Russian messages, JSDoc, demo examples, and AGENTS guidance.
- [ ] Run focused tests and package typecheck, then commit `fix(Slider): distinguish range thumb names`.

### Task 3: Picker and Field composition (#460, #456)

**Files:** Modify ColorPicker and IconPicker component/test files, both demos, and `AGENTS.md`.

**Produces:** Field's label and state props reach the focusable trigger and never leak to a role-less wrapper.

- [ ] Render each picker inside a real `<Field label>` and assert the label `htmlFor` equals the trigger id, the trigger's accessible name matches visible text, and wrappers lack naming/state props.
- [ ] Run `npm test --workspace @eocrm/design-system -- ColorPicker.test.tsx IconPicker.test.tsx`; expect association/leakage failures.
- [ ] In ColorPicker, destructure `id` and pass it to the default trigger with `aria-labelledby`/`aria-describedby`; do not leave it in root rest props.
- [ ] In IconPicker, explicitly consume `id`, `required`, `invalid`, `aria-invalid`, `aria-required`, `aria-labelledby`, and `aria-describedby`; map applicable values to the trigger and let external labelling suppress the generated name.
- [ ] Update examples, run focused tests/typecheck, and commit `fix(pickers): compose correctly with Field`.

### Task 4: Select ARIA routing (#451)

**Files:** Modify `Select.tsx` and `Select.test.tsx`.

**Produces:** naming/description ARIA exists only on the combobox trigger.

- [ ] Add a test passing all three ARIA props plus `data-testid` and assert the role-less root has none while the combobox has all three.
- [ ] Run `npm test --workspace @eocrm/design-system -- Select.test.tsx`; expect the root assertions to fail.
- [ ] Destructure the ARIA props before `...rest` and pass the local variables to Trigger.
- [ ] Run focused tests/typecheck and commit `fix(Select): keep trigger ARIA off root wrapper`.

### Task 5: Switch loading focus (#447)

**Files:** Modify `Switch.tsx`, `Switch.test.tsx`, `SwitchDemo.tsx`, and `AGENTS.md`.

**Produces:** only explicit `disabled` sets native disabled; loading remains focusable and suppresses changes.

- [ ] Rewrite loading tests to focus the input, attempt click and Space, and assert focus remains, native disabled is absent, busy state is present, and `onChange` is not called.
- [ ] Run `npm test --workspace @eocrm/design-system -- Switch.test.tsx`; expect the desired native-disabled assertion to fail.
- [ ] Set `disabled={disabled}` and guard the input change handler with `if (loading) return;` before calling the consumer handler.
- [ ] Update docs/demo, run focused tests and CSS lint, then commit `fix(Switch): preserve focus while loading`.

### Task 6: Modal mounted-open restoration (#450)

**Files:** Modify `ModalRoot.tsx` and `Modal.test.tsx`.

**Produces:** initially-open instances capture and restore focus on close or open unmount exactly once.

- [ ] Add harness tests for an initially-open Modal that closes normally and one that conditionally unmounts while open. Assert the original trigger regains focus once.
- [ ] Run `npm test --workspace @eocrm/design-system -- Modal.test.tsx`; expect focus not to return.
- [ ] Initialize previous-open tracking to false, capture in the first layout effect, and return an open-unmount cleanup. Centralize restoration in an idempotent helper that clears its ref before calling `focus({ preventScroll: true })`, guarded by `document.contains`.
- [ ] Run the full Modal suite/typecheck and commit `fix(Modal): restore focus for initially-open instances`.

### Task 7: ErrorState transition guidance (#448)

**Files:** Modify `ErrorState.tsx`, `ErrorStateDemo.tsx`, and `AGENTS.md`.

**Produces:** documentation only; no runtime API change.

- [ ] Add a canonical example with one persistently mounted `Card role="status" aria-busy={!failed}` containing either loading content or `<ErrorState role={undefined}>`.
- [ ] Explain that mounting a live region together with the error creates no mutation to announce and that a page-sized assertive alert is inappropriate.
- [ ] Mirror the rule in AGENTS and add a loading-to-error demo.
- [ ] Run Prettier and `git diff --check`, then commit `docs(ErrorState): clarify arriving-error announcements`.

### Task 8: Skeleton visibility hook (#457)

**Files:** Create `useSkeletonVisibility.ts` and `.test.ts`; modify Skeleton implementation/tests/index, root index, demo, and AGENTS.

**Produces:** `SkeletonVisibilityOptions { delay?: number; minDuration?: number }` and `useSkeletonVisibility(loading, options): boolean`.

- [ ] With fake timers, test immediate display, cancellation inside delay, delayed display, minimum-duration tail, zero/negative normalization, rerender restart, and unmount cleanup.
- [ ] Run `npm test --workspace @eocrm/design-system -- useSkeletonVisibility.test.ts`; expect missing-module failure.
- [ ] Extract existing `useTimedVisibility` behavior. Normalize each option with `Math.max(0, value ?? 0)` and preserve timer cleanup. Make Skeleton call the public hook.
- [ ] Export the hook/type and document a mutually exclusive placeholder/content branch in JSDoc, demo, and AGENTS.
- [ ] Run Skeleton/hook tests and typecheck, then commit `feat(Skeleton): expose timed visibility hook`.

### Task 9: DataTable skeleton timing (#458)

**Files:** Modify `DataTable.tsx`, `DataTable.test.tsx`, `DataTableDemo.tsx`, and `AGENTS.md`.

**Consumes:** Task 8 hook. **Produces:** `skeletonDelay?: number` and `skeletonMinDuration?: number`.

- [ ] With fake timers, test a fast load hidden inside the delay, delayed skeleton appearance, minimum-duration retention, no simultaneous real rows, populated refetch preservation, and `aria-busy` tied to actual loading.
- [ ] Run `npm test --workspace @eocrm/design-system -- DataTable.test.tsx`; expect missing-prop/immediate-render failures.
- [ ] Call the hook with `loading && !hasRenderedRows`. Render skeleton rows from its boolean, suppress empty state while actual loading or visual tail is active, and keep populated refetch behavior.
- [ ] Update docs/demo, run tests/typecheck, and commit `feat(DataTable): add skeleton timing controls`.

### Task 10: Constrain viewport height (#459)

**Files:** Modify Constrain component, SCSS, tests, demo, and AGENTS.

**Produces:** `ConstrainHeight` includes `'viewport-70'` for all three height axes.

- [ ] Add `viewport-70` to height/min/max table tests and assert its three modifier classes.
- [ ] Run `npm test --workspace @eocrm/design-system -- Constrain.test.tsx`; expect union/map failure.
- [ ] Add `70vh` followed by `70dvh` rules for height, min-height, and max-height. Add narrowly scoped stylelint rationale only if required.
- [ ] Document composition with `maxHeight="lg"`, update demo/AGENTS, run tests/CSS lint, and commit `feat(Constrain): add 70-percent viewport height`.

### Task 11: Card.Body scrolling region (#455)

**Files:** Create `CardBody.tsx`; modify Card root, SCSS, tokens, tests, indexes, demo, and AGENTS.

**Produces:** `CardBodyProps extends HTMLAttributes<HTMLDivElement> { scroll?: boolean }`, named `CardBody`, and `Card.Body`.

- [ ] Test `<Card fill><Card.Header>…</Card.Header><Card.Body scroll ref={ref}>…</Card.Body></Card>` for exports, forwarded ref/attrs, non-leaking `scroll`, compound padding, and modifier classes.
- [ ] Run `npm test --workspace @eocrm/design-system -- Card.test.tsx`; expect `Card.Body` to be undefined.
- [ ] Implement a forwardRef Body merging base/scroll classes and spreading HTML attrs. Recognize it in compound-child detection.
- [ ] When `fill` contains Body, establish Card's internal column/min-height chain. Body uses section padding/min-height; `scroll` uses `flex: 1 1 auto` and `overflow-y: auto`. Document this explicit compound-layout ownership.
- [ ] Export, demo, run tests/CSS lint/typecheck, and commit `feat(Card): add scrollable body region`.

### Task 12: Avatar contrast tokens (#452)

**Files:** Modify `tokens.json`, the nearest design-token behavior test, and regenerated design-token outputs.

**Produces:** all six avatar backgrounds have contrast ratio at least 4.5 against avatar foreground.

- [ ] Locate the token test command from `packages/design-tokens/package.json`. Add a test parsing source tokens, converting hex channels to linear sRGB, and reporting each token below `(lighter + 0.05) / (darker + 0.05) >= 4.5`.
- [ ] Run the focused test and observe failures for slots 1, 2, and 3.
- [ ] Darken only those cyan, green, and orange source values, preserving distinct hue families and choosing values with a safety margin above 4.5.
- [ ] Run `npm run tokens:generate`, the focused test, and `npm run tokens:check`.
- [ ] Commit source and generated outputs as `fix(tokens): make avatar palette AA compliant`.

### Task 13: Full verification, review, release, and issue closure

**Produces:** one reviewed PR, one successful release, and all 14 issues closed with the published version.

- [ ] Run fresh gates: `make test`, `make build-lib`, `make lint`, `npm run format:check`, `npm run tokens:check`, and the dry-run tarball grep from `.claude/skills/implement-issue/SKILL.md`; require all exits zero and tarball count `0`.
- [ ] Push the branch and open one draft PR listing every `Addresses #N`, subsystem summaries, and exact verification commands. Record its head as `REVIEWED_HEAD`.
- [ ] Invoke `.claude/skills/pre-push-review/SKILL.md` Variant A. Use two independent fresh-context reviewers per round over the mandated diff. Fix every Critical/Important finding, rerun affected gates, commit/push, and repeat until both reviewers in one round say `clean enough to stop`.
- [ ] Repeat all full gates after the final review-fix commit and mark the draft ready.
- [ ] Watch `Quality / check`; update a behind branch and wait again. Squash-merge without protection bypasses.
- [ ] Locate Release by exact merge SHA, wait for publish success, fetch the new tag, comment the PR/version/tag on all 14 issues, and close them. If publish fails or an expected tag is absent, leave every issue open and report the run URL.
