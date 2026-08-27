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

Colors, spacing, radii, shadows, font sizes — all via `var(--...)`. If you need a shared value that is not a token, add it to `packages/design-tokens/src/tokens.json`, regenerate, and run `npm run tokens:check`. Never edit `src/styles/tokens.scss` or generated token files directly. Stylelint blocks `color: #fff` and `background: red`-style raw values.

**Component tokens layer:** Within a component's `.module.scss`, prefer the component's own tokens (`var(--button-bg)`) over primitives (`var(--color-accent)`) directly. The component tokens live in `Component.tokens.scss` and default to the primitive — so the resolved value is identical, but the SCSS reads as "the button's background" instead of "the accent color we happen to use here." See `docs/superpowers/specs/2026-05-27-component-tokens-design.md` and AGENTS.md's "Theming via component tokens" section. Not enforced by stylelint (yet); convention-only in v1.

### 3a. Focus styling — `:focus-visible`, not `:focus`

For buttons, menu items, tabs, and other **non-input focusable elements**, style focus with `:focus-visible`, not `:focus`. The difference matters for mouse interaction:

- `:focus` matches whenever the element has focus — including after a mouse click. The element stays styled until something else takes focus. Clicking a DropdownMenu.Item or a Button leaves it visually highlighted even after the cursor moves away.
- `:focus-visible` matches only when focus arrived via the keyboard (Tab, Arrow keys, programmatic focus following a keydown). Mouse-click focus doesn't trigger it. This matches the actual UX intent — "highlight this so the user can see where they are on the keyboard."

Wrong:

```scss
.item:hover,
.item:focus {
  /* stays red after mouse click */
  background: var(--color-bg-danger-subtle);
}
```

Right:

```scss
.item:hover,
.item:focus-visible {
  background: var(--color-bg-danger-subtle);
}
```

**Exception — text inputs and textareas.** A text input always needs a visible focus ring when typed into, regardless of how focus arrived. Modern browsers treat typing as keyboard interaction, so `:focus-visible` works fine here too — the library's `<Input>` uses `:focus-visible` for consistency. `:focus` is also acceptable for text inputs. Either is fine; pick one and stay consistent in a given file.

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

Before completing a pull request that touches `packages/design-system/**`, you MUST run the review-fix loop — invoke the **`pre-push-review`** skill (variant A) and follow it exactly. Run baseline gates, open the PR as a draft, then autonomously review, fix, verify, commit, and push until a clean two-reviewer round allows the PR to be marked ready. This is not optional, including for one-line SCSS tweaks. The library is consumed by AI agents who pattern-match against whatever we ship — a missing JSDoc, broken ARIA, or token slip propagates to every page they generate.

**When this rule applies**: any change inside `packages/design-system/` — component code, tests, tokens, SCSS, `package.json`, `AGENTS.md`, `README.md`, or this `CLAUDE.md`.

**When this rule does NOT apply**: changes scoped to `packages/playground/**`, root `README.md`, root `CLAUDE.md`, GitHub workflows, the Makefile, or other non-library files. Push those normally.

The skill holds the gates, the reviewer brief, the exit criteria, and the trivial-change escape hatch. Each review round requires at least two independent fresh-context agents inheriting the session's currently selected/default model; do not override the reviewer model. The first round reviews the complete branch diff. Later rounds review only commits since the previously reviewed head, together with the findings those commits are meant to fix.

### 9. Every user-facing string goes through i18n

Library components must NEVER inline an English string for any user-visible surface. This includes:

- `aria-label="…"` on interactive elements
- `placeholder="…"` on inputs and selects
- Visible `>Text<` inside JSX (button labels, empty-state copy, headings)
- Default messages for "loading" / "empty" / "no matches" states

Each becomes a key in `src/i18n/messages.ts` with values in both `src/i18n/en.ts` AND `src/i18n/ru.ts`, consumed via `useTranslation()`.

```tsx
// ❌ Wrong
<Button aria-label="Close dialog" onClick={onClose}>
  ×
</Button>;

// ✅ Right
const t = useTranslation();
<Button aria-label={t('modal.close')} onClick={onClose}>
  ×
</Button>;
```

Dynamic per-render strings that mix translation + data are fine to interpolate at the call site:

```tsx
// ✅ OK — the dynamic name comes from props, not i18n.
<Button aria-label={`${t('tenant.actionsFor')} ${tenant.name}`}>⋯</Button>
```

But if the WHOLE string is a fixed English phrase, it goes through `t()`.

The `labels?: Foo` / `cancelLabel?: string` per-component prop pattern is DELETED. The provider is the single override surface — don't reintroduce per-component label props on new components. If a new component needs translation, add to `Messages` instead.

See `AGENTS.md` "Localization (i18n)" section for the consumer-facing API and how to add a new string.

### 10. Transient state must reach assistive tech — and the mechanism is not a coin flip

A component with a transient or async state (`loading`, `busy`, `pending`, an
async failure) must expose it to screen readers. Which mechanism depends on one
question:

**Is this a property of the thing as the user arrives at it, or a change that
happens while their attention is elsewhere?**

- **A property they arrive at → fold it into the accessible name.** A user
  tabbing onto an `EntityChip` placeholder needs to know it is a placeholder
  before they act on it. Nothing will announce it later; it has to be in the
  name. Accept that the name mutates when the state resolves — that is the
  cost, and it is the right trade when the alternative is silence.
- **A change while they are elsewhere → the component owns a live region.**
  `role="status" aria-live="polite"` on a visually-hidden span, **rendered
  unconditionally** so only its _text_ mutates.

**Render the region unconditionally.** A region that mounts together with its
text is the unreliable case — most screen readers do not announce content that
was already present when the region appeared. `PasswordInput`'s caps-lock
warning and `PasswordStrengthMeter` are the reference implementations.

**`aria-busy` is never sufficient on its own.** It is a valid global attribute
and it does appear in the accessibility tree, but no mainstream screen reader
speaks `busy` on a non-live element. Four components shipped relying on it and
their state reached nobody. Pair it with one of the two mechanisms above, or
drop it.

**A control the user just activated is a change, not a property.** They are
already focused on it, so there is nothing to "arrive at" — `Switch` and
`StatusMenu` announce; they do not rename themselves. Renaming a focused
control mid-interaction is worse than announcing, because it also breaks
name-exact queries in consumer tests. (`ConfirmationPopover` is a known gap on
this rule: its pending state sets neither. Tracked separately.)

**Visual-only is a legitimate answer, but it must be deliberate and written
down.** `Badge`'s tone is a durable visual property with no state change to
announce, so announcing it is the consumer's call — and `Badge`'s JSDoc says so.
`Skeleton` is `aria-hidden` by design and documents the hand-off. Silence you
chose and documented is fine; silence you defaulted into is the bug this rule
exists to stop.

Every string here goes through `useTranslation()` — see Rule 9.

## What does NOT belong here

- Pages, layouts (`AppShell`, etc.), mock data — playground only
- App-specific business logic — CRM code
- `react-router`, `prismjs`, `prism-react-renderer`, `@types/prismjs` — playground-only deps. **Never import them from a library file**, even casually. They're not in this package's `dependencies` and will fail in the consumer.

## Changing shared tokens

Tokens are CSS custom properties (NOT SCSS variables), so they're theme-able at runtime. Naming: `--<category>-<name>(-<modifier>)`. Examples: `--color-accent-hover`, `--space-3`, `--radius-md`, `--shadow-lg`.

Add shared tokens to `packages/design-tokens/src/tokens.json`, including their
web and/or Compose outputs. Then run `npm run tokens:generate` and
`npm run tokens:check`, and commit the generated outputs. Do not edit
`src/styles/tokens.scss`, `packages/design-tokens/generated/**`, or generated
Kotlin files directly.

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

## Dependency policy & component gaps

The CRM should NOT roll its own version of a design-system component. If something is missing, use a placeholder + token-correct native HTML, or request the component.

**Dependency policy:** No UI / component libraries. Two narrow exceptions: (a) `@floating-ui/react-dom` for collision-aware positioning (DropdownMenu and any future popover-shaped component), and (b) `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` for drag-and-drop sortable behavior (used by DataTable's column reorder and by Sortable). Everything else — ARIA, focus, keyboard, dismissal — is hand-rolled per WAI-ARIA APG patterns. When CSS anchor positioning has acceptable browser support, Floating UI can be removed without changing public APIs.

See `AGENTS.md` for the full component roster.

Genuinely still-missing:

- A standalone `IconButton` is **not** planned — use `<Button iconOnly aria-label="…">` for icon-only buttons, or `<TopBar.IconButton>` inside the top bar. Only extract a dedicated component if a third, distinct context appears.
