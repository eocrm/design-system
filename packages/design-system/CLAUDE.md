# CLAUDE.md — `@eocrm/design-system`

The library that ships to the CRM. Source-distributed (no compile step) — consumers' bundlers process `.tsx` and `.module.scss` from `node_modules`.

`package.json` `files` field whitelists what gets published: `src`, `AGENTS.md`. `README.md` is auto-included by npm. Anything outside that won't reach the consumer.

## Hard rules

### 1. Every component has unit tests

A new `<Name>.tsx` requires `<Name>.test.tsx` next to it. Minimum coverage:

- Renders without crashing with default props
- All `variant` / `size` / `tone` etc. options render the right classes
- Controlled props (e.g. `value` + `onChange`) round-trip correctly
- `ref` is forwarded to the right DOM node
- `className` from props is merged, not replaced
- Disabled / readonly / invalid states render as expected
- A11y attributes (`aria-*`, `role`) where the component sets them

**Vitest is configured with `globals: true`.** Tests do NOT import `describe`, `it`, `expect`, or `vi` — they're global. React Testing Library auto-cleans the DOM between tests.

Imports tests DO need:

- `render`, `screen` from `@testing-library/react`
- `userEvent` (default) from `@testing-library/user-event`
- The component under test

Run with `make test` (single run) or `make test-watch`. Tests run as part of the publish workflow before npm publish — a failing test blocks the release.

### 2. Every component has a playground demo

When adding `src/components/<Name>/`, the same change must add `packages/playground/src/pages/demo/<Name>Demo.tsx` and wire it into the playground's nav. Components without demos are invisible to the team and accumulate inconsistency.

### 3. No raw values in `.module.scss`

Colors, spacing, radii, shadows, font sizes — all via `var(--...)`. If you need a value that isn't a token, **add it to `src/styles/tokens.scss` first**, then use it. Stylelint blocks `color: #fff` and `background: red`-style raw values.

### 4. No layout properties on components

Forbidden inside a component's `.module.scss`:

- `margin` (any side)
- `position` (when not `relative` for an internal child anchor)
- `top` / `left` / `right` / `bottom`
- `flex: 1`, `flex-grow`, `align-self`
- `width` other than `100%` of intrinsic / `auto`
- `grid-column` / `grid-row`

These are the _parent's_ responsibility. If a CRM page needs to position a Button, it does so via its own `.module.scss` (passed via `className`) or by wrapping in `Stack`/`Cluster`.

### 5. Export discipline

Every public component is re-exported from `src/index.ts` with both its component and its types:

```ts
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';
```

Forgetting this = the CRM cannot import it. Tests will pass; consumer imports will fail at install/typecheck time.

### 6. forwardRef + spread HTML attrs

Every component must:

- Use `forwardRef` so consumers can attach refs
- Accept the relevant `HTMLAttributes<...>` interface and spread `{...props}`
- Default `type="button"` for `<button>` so consumers don't accidentally submit forms

### 7. Every exported prop, variant type, and component has JSDoc

This library's main consumer is AI coding agents building the EOCRM. They read TypeScript types and JSDoc — that's their highest-fidelity signal for "how do I use this thing." Every exported member must carry JSDoc:

- **Component function** — one-paragraph description + 2-3 `@example` blocks showing canonical usage (the most common pattern, an edge case, and integration with `Stack`/`Cluster` if relevant).
- **Each prop in `*Props`** — what it does, when to use each option, default value. For variants like `tone`/`variant`/`size`/`gap`, list every option with one-line guidance.
- **Each exported union type** (`ButtonVariant`, `BadgeTone`, etc.) — short summary; details live on the prop that uses it.

Skipping JSDoc means the agent has to guess from the literal string union. They guess wrong about half the time. Don't make them guess.

The existing 8 components are fully JSDoc'd — match that pattern.

**Spread order — pick deliberately:**

```tsx
// Pattern A — props last (consumer wins):
<button ref={ref} type="button" className={...} {...props} />

// Pattern B — props first (component wins):
<span {...props} ref={ref} role="img" aria-label={name} />
```

- Use **A (props last)** for components where the consumer should be able to override anything: Button, Card, Stack, Cluster, Badge.
- Use **B (props first)** for components whose semantic ARIA contract MUST be preserved no matter what the consumer passes: Avatar (role/aria-label), Tabs (role/aria-orientation/onKeyDown), Input (className composition).
- Whatever you pick, write a brief comment in the JSX (`// {...props} first so X wins`) so the next reader understands the choice.

### 8. Pre-push review-fix cycle (library changes only)

Before pushing changes that touch `packages/design-system/**`, run the review-fix loop. The library is consumed by AI agents who pattern-match against whatever we ship — a missing JSDoc, broken ARIA, or token slip propagates to every page they generate. Catching it here is cheaper than tracking it down across consumer code.

**When this rule applies**: any change inside `packages/design-system/` — component code, tests, tokens, SCSS, `package.json`, `AGENTS.md`, `README.md`, or this `CLAUDE.md`.

**When this rule does NOT apply**: changes scoped to `packages/playground/**`, root `README.md`, root `CLAUDE.md`, GitHub workflows, the Makefile, or other non-library files. Push those normally.

**The loop**:

1. **Run gates first** — `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system`. They must all pass before review.
2. **Spawn a fresh-context review agent** (`general-purpose`) targeted at `packages/design-system/`. Brief it explicitly on the 10 review categories: bugs, a11y, API inconsistencies, type safety, rule violations (Rules 1–7), test coverage, token discipline, SCSS, cross-package leakage, package/distribution. Tell it to read this `CLAUDE.md`, `AGENTS.md`, and `README.md` first. Ask for output as Critical / Important / Nice-to-have / Regression-watch + a final verdict (`clean enough to stop` or `keep iterating`).
3. **Fix every Critical and every Important finding**. Nice-to-have is judgment — fix when cheap, skip when churn outweighs.
4. **For every finding you deliberately skip**, leave a one-line explanation in your response so the next reviewer doesn't re-flag it.
5. **Re-run gates** after fixes.
6. **Spawn another reviewer** with the same prompt.
7. **Repeat** until the verdict is `clean enough to stop`.

**Hard exit criteria**:

- 0 Critical, 0 Important findings (or each remaining one has an explicit documented skip)
- All four gates (test, typecheck, lint, build) green
- `npm pack --dry-run` shows no test files or internal-only paths in the tarball

**When to consider lint rules**: if a reviewer keeps catching the same class of issue (raw values, missing JSDoc, ARIA omissions), codify it in `.stylelintrc.json` overrides or a Vitest meta-test so future agents can't reintroduce it. That's how `.stylelintrc.json` and `src/structure.test.ts` grew to their current size.

**Trivial-change escape hatch**: a one-line doc typo or comment tweak doesn't need a full review loop. Use judgment — if the change couldn't plausibly introduce a regression, push without the cycle. When unsure, run the cycle.

## What does NOT belong here

- Pages, layouts (`AppShell`, etc.), mock data — playground only
- App-specific business logic — CRM code
- `react-router-dom`, `prismjs`, `prism-react-renderer`, `@types/prismjs` — playground-only deps. **Never import them from a library file**, even casually. They're not in this package's `dependencies` and will fail in the consumer.

## Adding a token

Tokens are CSS custom properties (NOT SCSS variables), so they're theme-able at runtime. Naming: `--<category>-<name>(-<modifier>)`. Examples: `--color-accent-hover`, `--space-3`, `--radius-md`, `--shadow-lg`.

Add to `src/styles/tokens.scss` with a `:root { ... }` declaration. Document its purpose with a SCSS comment if not self-evident.

## File layout for a new component

```
src/components/<Name>/
  <Name>.tsx              ← forwardRef + spread HTMLAttributes + full JSDoc (rule 7)
  <Name>.module.scss      ← tokens only, no layout
  <Name>.test.tsx         ← unit tests (rule 1)
  index.ts                ← export { Name } + export type { NameProps, ... }
```

Then:

- Update `src/index.ts` (rule 5)
- Add the playground demo (rule 2)
- Update `AGENTS.md` with a one-section TL;DR + canonical snippet for the new component
- Per-component "when NOT to use / anti-patterns" goes in the component's JSDoc (`@remarks` blocks), NOT in a separate markdown file

## Components we don't have yet

Wishlist for the CRM, in rough priority order. Until each exists, CRM pages should NOT roll their own — use a placeholder + token-correct native HTML, or request the component.

**Dependency policy:** No UI / component libraries. `@floating-ui/react-dom` is used for collision-aware positioning (DropdownMenu and any future popover-shaped component); everything else — ARIA, focus, keyboard, dismissal — is hand-rolled per WAI-ARIA APG patterns. When CSS anchor positioning has acceptable browser support, Floating UI can be removed without changing public APIs.

- `Select` / `Combobox` (hand-roll on Floating UI)
- `Modal` / `Dialog` (hand-roll, no positioning needed; needs focus trap + scroll lock)
- `Tooltip` (hand-roll on Floating UI; lightweight, no focus trap)
- `Popover` (hand-roll on Floating UI; generalized non-menu floating panel)
- `Toast` / notification (hand-roll; no Floating UI — fixed corner placement)
- `Textarea`
- `Checkbox`, `Radio`, `Switch`
- `DatePicker` (hand-roll; calendar grid is the bulk of the work)
- `Table` (TanStack Table headless is acceptable here — it's a behavioral hook, not a UI library, and the alternative is rebuilding sort/filter/pagination state. Revisit when we actually need it.)
- `Skeleton` (loading state)
- `EmptyState`
- `Pagination`
- `Breadcrumb`
- `Link` (router-aware button-like link)
- `IconButton` (the topbar uses an inline one — extract when reused)
