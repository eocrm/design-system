# Rail Group Subitem Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent collapsed Rail group subitems from rendering a redundant automatic Tooltip while preserving standalone collapsed item tooltips.

**Architecture:** Introduce an internal boolean React context in the Rail component folder. `RailGroup` provides the group boundary around children, including children later rendered through the portal; `RailItem` reads it when deciding whether to wrap itself in `Tooltip`.

**Tech Stack:** React 19 context and portals, TypeScript, Vitest, Testing Library, Playwright/Chrome.

## Global Constraints

- Preserve the public `Rail` API and existing JSDoc contract.
- Keep standalone collapsed string-labelled item tooltips unchanged.
- Suppress only the automatic Tooltip for items under `RailGroup`.
- Add no dependencies, user-facing strings, styling, or public exports.
- Validate both unit behavior and the real collapsed flyout in Playwright.

---

### Task 1: Lock the tooltip boundary with regression tests

**Files:**

- Modify: `packages/design-system/src/components/Rail/Rail.test.tsx`

**Interfaces:**

- Consumes: existing `Rail`, `Rail.Group`, `Rail.Item`, and `Tooltip` DOM behavior.
- Produces: regression coverage for grouped suppression and standalone preservation.

- [ ] **Step 1: Write a failing grouped-item test**

Render a controlled collapsed rail with a group and string-labelled subitem, open the flyout, hover the subitem, advance timers past the Tooltip delay, and assert no element with `role="tooltip"` appears while the visible subitem label remains.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test --workspace @eocrm/design-system -- Rail/Rail.test.tsx`

Expected: FAIL because the current grouped item opens a tooltip containing the same label.

- [ ] **Step 3: Add the preservation assertion**

Render a standalone collapsed string-labelled item, hover it, advance timers, and assert its tooltip still appears. This guards against disabling collapsed Rail tooltips globally.

### Task 2: Add the private group context and minimal fix

**Files:**

- Create: `packages/design-system/src/components/Rail/RailGroupContext.ts`
- Modify: `packages/design-system/src/components/Rail/RailGroup.tsx`
- Modify: `packages/design-system/src/components/Rail/RailItem.tsx`

**Interfaces:**

- Produces: `RailGroupContext`, an internal `Context<boolean>` defaulting to `false`.
- Consumes: `useContext(RailGroupContext)` in `RailItem`; `<RailGroupContext.Provider value>` in `RailGroup`.

- [ ] **Step 1: Define the internal context**

Create `RailGroupContext.ts` with `createContext(false)` and an internal comment explaining that React context crosses the collapsed flyout portal.

- [ ] **Step 2: Provide the boundary once around group children**

Wrap the shared group children at their logical ownership point so both expanded inline rendering and collapsed portal rendering inherit `true`, without cloning children or exporting the context publicly.

- [ ] **Step 3: Gate automatic Tooltip creation**

Read `insideGroup` in `RailItem` and change the wrapper condition to `collapsed && typeof children === 'string' && !insideGroup`.

- [ ] **Step 4: Run focused tests**

Run: `npm test --workspace @eocrm/design-system -- Rail/Rail.test.tsx`

Expected: all Rail tests pass.

- [ ] **Step 5: Commit the tested implementation**

Commit message: `fix(Rail): suppress group subitem tooltips`

### Task 3: Browser and repository verification

**Files:**

- No production files expected.

**Interfaces:**

- Consumes: the completed Rail fix.
- Produces: verification evidence for PR #400.

- [ ] **Step 1: Run the full baseline gates**

Run `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, and `npm pack --dry-run -w @eocrm/design-system`; verify the tarball contains no tests or internal-only paths.

- [ ] **Step 2: Validate in Playwright**

Start the playground, open the Rail component route in Chrome, collapse the rail, open a group flyout, hover and focus a subitem, and assert exactly one visible label and zero tooltip surfaces for that subitem. Also hover a standalone collapsed item and assert its tooltip still opens.

- [ ] **Step 3: Run the mandatory draft-PR review loop**

Open a draft PR, have two independent fresh-context reviewers inspect the complete branch diff, fix all Critical/Important findings, and repeat scoped reviews until both reviewers in the same round return `clean enough to stop`.

- [ ] **Step 4: Complete CI, merge, and release**

Mark the PR ready only after review and gates are clean, wait for required CI, squash-merge, verify the exact release tag and playground deployment, then comment the shipped version on issue #400 and close it.
