# Typography — Title + Text + Code design spec

**Date:** 2026-05-24
**Branch:** `feat/typography`
**Scope:** Add three typography primitives — `<Title>`, `<Text>`, `<Code>` — to `@eocrm/design-system`. Replace the 15+ inline `style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}` patterns and the raw-`<h1>`/`<h2>` + className-modules patterns in mockups and demos.

## Goal

Stop consumers (and ourselves, in demos and mockups) from reaching for raw `--font-*` / `--color-fg-*` tokens via inline `style` attributes. Today the playground has at minimum 15 files with `style={{ fontSize: 'var(--font-size-...)', color: 'var(--color-fg-...)' }}` and the Dashboard mockup has hand-styled `.title` / `.cardTitle` SCSS classes. The library has no typography primitive — that's the gap.

These three components give consumers an opinionated, token-backed surface so they never have to type a font-size value again.

## Why now

- Card compound just landed (`Card.Header` wraps a heading internally). The next mockup additions need freestanding titles and body text. Without these primitives, every new mockup will reintroduce the inline-style anti-pattern.
- Token vocabulary is settled — `--font-size-{xs|sm|md|lg|xl|2xl|3xl}`, `--font-weight-{regular|medium|semibold|bold}`, `--color-fg`/`-muted`/`-subtle`, `--line-height-{tight|normal|none}` already exist and are used by other components.
- The pattern is so common that consumers (and Claude) **will** invent ad-hoc inline styles unless the library offers a primitive that's cheaper to reach for.

## Non-goals (v1)

- **No semantic-recipe variants** (`variant="caption"` / `"lead"` / `"body"`). Composable `size` + `weight` + `tone` is enough. Recipes hide configuration; they don't add expressiveness.
- **No `italic`, `transform` (uppercase/lowercase), `font-family`, `decoration` props.** YAGNI — add when a real consumer needs them. The `<em>` / `<strong>` HTML primitives still work for inline emphasis inside `<Text>`.
- **No arbitrary `color="#hex"` prop.** Only the tone whitelist. Consumers MUST use a token; that's the whole point.
- **No polymorphic generic `as={Component}` for arbitrary components.** Only a fixed string-union for `<Text>` (`p | span | div | label`). The polymorphism complexity (`<Link>` has it for routers) is not worth it for typography.
- **No block-level `<Code>`** (multi-line code blocks). That's the playground's `CodeBlock` component (uses Prism). `<Code>` is inline-only.
- **No `Kbd` component.** Could add later; not in current mockups.
- **No `<Title order={0}>` for display sizes above h1.** No 4xl/5xl tokens. Easy to add later.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- Existing tokens: all `--font-*`, all `--color-fg`/`-muted`/`-subtle`, `--color-accent`, `--color-danger`, `--color-success`, `--color-warning` (used directly as text color — the `*-fg` suffix is reserved for "foreground on a tone bg" like white on accent, not used here), `--color-bg-muted` for Code chip background, `--space-1`, `--radius-sm`.

No new tokens needed for v1.

### File layout

```
packages/design-system/src/components/Title/
  Title.tsx              ← NEW
  Title.module.scss      ← NEW
  Title.test.tsx         ← NEW
  index.ts               ← NEW

packages/design-system/src/components/Text/
  Text.tsx               ← NEW
  Text.module.scss       ← NEW
  Text.test.tsx          ← NEW
  index.ts               ← NEW

packages/design-system/src/components/Code/
  Code.tsx               ← NEW
  Code.module.scss       ← NEW
  Code.test.tsx          ← NEW
  index.ts               ← NEW

packages/design-system/src/index.ts                                 ← MODIFY: re-exports
packages/design-system/AGENTS.md                                    ← MODIFY: add Typography section

packages/playground/src/pages/components/TitleDemo.tsx              ← NEW
packages/playground/src/pages/components/TextDemo.tsx               ← NEW
packages/playground/src/pages/components/CodeDemo.tsx               ← NEW
packages/playground/src/App.tsx                                     ← MODIFY: 3 routes
packages/playground/src/layout/AppShell/AppShell.tsx                ← MODIFY: add to "Display" group (sorted alphabetically)
packages/playground/src/pages/components/ComponentsIndex.tsx        ← MODIFY: 3 cards
packages/playground/src/pages/mockups/registry.ts                   ← MODIFY: add Title/Text/Code to ComponentName + mark dashboard as using them

packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx       ← MODIFY: swap inline-style spans and the local h2/h1 for Text/Title; delete the local .title and .cardTitle SCSS rules
packages/playground/src/pages/mockups/Dashboard/Dashboard.module.scss ← MODIFY: delete unused class rules after the refactor
```

### Composition example

```tsx
<Stack gap="md">
  <Title order={1}>Dashboard</Title>
  <Text size="lg" tone="muted">
    Good morning, Alex.
  </Text>

  <Card>
    <Card.Header headerLevel="h2">Recent activity</Card.Header>
    <Card.List>
      <Card.ListRow>
        <Stack gap="xs">
          <Text weight="medium">Priya Shah replied</Text>
          <Text size="sm" tone="subtle">
            12m ago
          </Text>
        </Stack>
      </Card.ListRow>
    </Card.List>
  </Card>

  <Text size="sm">
    Use <Code>npm install</Code> to add packages.
  </Text>
</Stack>
```

## Public API

### `<Title>`

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Heading semantic level. */
export type TitleOrder = 1 | 2 | 3 | 4 | 5 | 6;

/** Visual size override. When omitted, derived from `order`. */
export type TitleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/** Color tone. */
export type TitleTone = 'default' | 'muted' | 'subtle' | 'accent' | 'danger';

/** Font weight. */
export type TitleWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading semantic level — also drives default visual size. Required. */
  order: TitleOrder;
  /** Visual size. Defaults from `order`: 1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm. */
  size?: TitleSize;
  /** Color tone. Defaults to `'default'` (full foreground). */
  tone?: TitleTone;
  /** Font weight. Defaults to `'semibold'`. */
  weight?: TitleWeight;
  /** Truncate to a single line with ellipsis. Defaults to `false`. */
  truncate?: boolean;
  /** Title text content. */
  children: ReactNode;
}
```

Renders:

```tsx
<Heading className={clsx(styles.title, ...modifiers)} {...rest}>
  {children}
</Heading>
```

Where `Heading` is dispatched from `order` (`'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'`).

Default order→size map (in code):

```ts
const SIZE_BY_ORDER: Record<TitleOrder, TitleSize> = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
  5: 'md',
  6: 'sm',
};
```

### `<Text>`

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Element to render. */
export type TextAs = 'p' | 'span' | 'div' | 'label';

/** Visual size. */
export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Color tone. */
export type TextTone = 'default' | 'muted' | 'subtle' | 'accent' | 'danger' | 'success' | 'warning';

/** Font weight. */
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/** Text alignment. */
export type TextAlign = 'left' | 'center' | 'right';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Rendered element. Defaults to `'p'`. */
  as?: TextAs;
  /** Visual size. Defaults to `'md'`. */
  size?: TextSize;
  /** Color tone. Defaults to `'default'`. */
  tone?: TextTone;
  /** Font weight. Defaults to `'regular'`. */
  weight?: TextWeight;
  /** Text alignment. Defaults to `'left'`. */
  align?: TextAlign;
  /**
   * Truncate to a single line with ellipsis. Defaults to `false`.
   * Mutually exclusive with `lineClamp` — if both are set, `lineClamp` wins.
   */
  truncate?: boolean;
  /**
   * Clamp to N lines with ellipsis (uses `-webkit-line-clamp`). Defaults to undefined.
   * Overrides `truncate` when set.
   */
  lineClamp?: number;
  /** Text content. */
  children: ReactNode;
}
```

When `as="label"`, the consumer is responsible for passing `htmlFor` via the spread (`HTMLAttributes<HTMLElement>` covers it). We're not adding a separate `<Label>` wrapper.

`<p>` browser default margins are reset in the component's SCSS (component-internal reset, not at the boundary — see Rule 4 carve-out for component-internal layout).

### `<Code>`

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Color tone. */
export type CodeTone = 'default' | 'muted' | 'accent' | 'danger';

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  /** Color tone. Defaults to `'default'`. */
  tone?: CodeTone;
  /** Code content. */
  children: ReactNode;
}
```

Renders `<code className={styles.code} ...>{children}</code>`. Styling:

- `font-family: var(--font-family-mono)`
- `font-size: var(--font-size-code)` (relative em, scales with parent)
- `padding: 0 var(--space-1)` (or similar small inline padding)
- `border-radius: var(--radius-sm)`
- `background: var(--color-bg-subtle)` or a similar subtle gray (verify token exists)
- Tone changes only the text color, not background

## Styling — module SCSS rules

Each component has its own `.module.scss`. All values use tokens.

### `Title.module.scss`

```scss
.title {
  // stylelint-disable-next-line property-disallowed-list -- native heading margin reset
  margin: 0;
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  color: var(--color-fg);
}

// Size modifiers (one per token):
.sizeXs {
  font-size: var(--font-size-xs);
}
.sizeSm {
  font-size: var(--font-size-sm);
}
.sizeMd {
  font-size: var(--font-size-md);
}
.sizeLg {
  font-size: var(--font-size-lg);
}
.sizeXl {
  font-size: var(--font-size-xl);
}
.size2xl {
  font-size: var(--font-size-2xl);
}
.size3xl {
  font-size: var(--font-size-3xl);
}

// Weight modifiers:
.weightRegular {
  font-weight: var(--font-weight-regular);
}
.weightMedium {
  font-weight: var(--font-weight-medium);
}
.weightSemibold {
  font-weight: var(--font-weight-semibold);
}
.weightBold {
  font-weight: var(--font-weight-bold);
}

// Tone modifiers:
.toneDefault {
  color: var(--color-fg);
}
.toneMuted {
  color: var(--color-fg-muted);
}
.toneSubtle {
  color: var(--color-fg-subtle);
}
.toneAccent {
  color: var(--color-accent);
}
.toneDanger {
  color: var(--color-danger);
}

// Truncate:
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
```

### `Text.module.scss`

```scss
.text {
  // stylelint-disable-next-line property-disallowed-list -- native <p> margin reset
  margin: 0;
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--color-fg);
}

// Size modifiers (xs through xl only — Text doesn't go heading-sized):
.sizeXs {
  font-size: var(--font-size-xs);
}
.sizeSm {
  font-size: var(--font-size-sm);
}
.sizeMd {
  font-size: var(--font-size-md);
}
.sizeLg {
  font-size: var(--font-size-lg);
}
.sizeXl {
  font-size: var(--font-size-xl);
}

// Weight modifiers (same as Title):
.weightRegular {
  font-weight: var(--font-weight-regular);
}
.weightMedium {
  font-weight: var(--font-weight-medium);
}
.weightSemibold {
  font-weight: var(--font-weight-semibold);
}
.weightBold {
  font-weight: var(--font-weight-bold);
}

// Tone modifiers (adds success/warning to Title's set):
.toneDefault {
  color: var(--color-fg);
}
.toneMuted {
  color: var(--color-fg-muted);
}
.toneSubtle {
  color: var(--color-fg-subtle);
}
.toneAccent {
  color: var(--color-accent);
}
.toneDanger {
  color: var(--color-danger);
}
.toneSuccess {
  color: var(--color-success);
}
.toneWarning {
  color: var(--color-warning);
}

// Align modifiers:
.alignLeft {
  text-align: left;
}
.alignCenter {
  text-align: center;
}
.alignRight {
  text-align: right;
}

// Truncate + line-clamp:
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.lineClamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  // -webkit-line-clamp is set inline via style (dynamic value), not via a CSS class
}
```

For `lineClamp={N}`, the component sets `style={{ WebkitLineClamp: N }}` inline (this is one of the rare cases where inline `style` is acceptable — the value is dynamic and there's no equivalent CSS-modules pattern).

### `Code.module.scss`

```scss
.code {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-code);
  // stylelint-disable-next-line property-disallowed-list -- inline padding for visual code chip
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
  background: var(--color-bg-muted);
  color: var(--color-fg);
}

.toneDefault {
  color: var(--color-fg);
}
.toneMuted {
  color: var(--color-fg-muted);
}
.toneAccent {
  color: var(--color-accent);
}
.toneDanger {
  color: var(--color-danger);
}
```

**Rule 4 check (cross-component):**

- All three components reset `margin: 0` (native heading / `<p>` reset). Documented inline disables. Same pattern as Accordion/Breadcrumb/Card.Header.
- `Code` has `padding: 0 var(--space-1)` — internal chip padding, not at the component boundary; documented inline disable.
- No `width` / `position` / `top` / `left` / `right` / `bottom` / `flex` properties anywhere.
- `min-width: 0` on `.truncate` is permitted (it's not `width:`, and it's needed for the truncate-inside-flex-container case).

## ARIA + semantics reference

| Concern          | Behavior                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `<Title>` tag    | `<h1>` … `<h6>` per `order`. Always a real heading element — screen readers announce heading level + text correctly.             |
| `<Text>` tag     | `<p>` (default), `<span>`, `<div>`, or `<label>` per `as`. No `role` overrides.                                                  |
| `<Code>` tag     | `<code>`. Native screen-reader announcement ("code"). No `role` override.                                                        |
| Focus            | None of the three are focusable. Interactive children (e.g. a `<Link>` inside `<Text>`) carry their own focus.                   |
| Truncate / clamp | Visually clipped; full text remains in the accessibility tree. Screen readers read the entire string.                            |
| `tone` semantics | `tone` is visual only — no `aria-` attribute. Consumers needing semantic intent (e.g. error text) use `role="alert"` themselves. |

## Testing

Each component gets `<Name>.test.tsx` with the standard suite shape (matches Card/Button/Accordion tests):

### `Title.test.tsx` (~14 cases)

1. Renders an `<h1>` for `order={1}`, `<h2>` for `order={2}`, … `<h6>` for `order={6}` (parameterized — single `it.each`)
2. Default size for each order matches the SIZE_BY_ORDER map (parameterized)
3. Explicit `size` overrides the order-derived size
4. Explicit `weight` applies the matching class
5. Each tone applies the matching class (parameterized)
6. `truncate` adds the truncate class
7. `className` from props merges (does not replace) base class
8. `ref` is forwarded to the underlying heading element
9. Renders children text
10. Spread props reach the DOM (e.g. `data-testid`, `id`, `aria-label`)

### `Text.test.tsx` (~16 cases)

1. Renders `<p>` by default
2. Each `as` value renders the matching element (parameterized: `p` / `span` / `div` / `label`)
3. Default size is `md`
4. Each size applies the matching class (parameterized)
5. Each tone applies the matching class (parameterized)
6. Each weight applies the matching class (parameterized)
7. Each align value applies the matching class (parameterized)
8. `truncate` adds the truncate class
9. `lineClamp={3}` adds the lineClamp class AND sets `style.WebkitLineClamp = '3'`
10. `lineClamp` overrides `truncate` when both set (lineClamp class present, truncate class absent)
11. `className` merges, not replaces
12. `ref` forwards to the rendered element (verify for `as="span"` and `as="label"`)
13. Spread props reach the DOM (`htmlFor` on `as="label"`, `id`, etc.)

### `Code.test.tsx` (~8 cases)

1. Renders a `<code>` element
2. Renders children text
3. Default tone applies the default class
4. Each tone applies the matching class (parameterized: default / muted / accent / danger)
5. `className` merges, not replaces
6. `ref` forwards
7. Spread props reach the DOM
8. Composes inside `<Text>`: `<Text>x <Code>y</Code> z</Text>` renders the code inline within the text

## Demo additions

Three new demo pages under `packages/playground/src/pages/components/`. Each follows the established `DemoLayout` + `Example` pattern.

### `TitleDemo.tsx` — examples

1. **Orders 1–6** — six `<Title>` elements side by side showing the default size for each.
2. **Size override** — `<Title order={2} size="lg">` next to `<Title order={2}>` to show decoupling.
3. **Tones** — five `<Title order={3} tone="...">` showing default/muted/subtle/accent/danger.
4. **Weights** — four `<Title order={3} weight="...">` showing all four weights.
5. **Truncate** — `<Title order={4} truncate>` inside a narrow `Box` showing the ellipsis behavior.

### `TextDemo.tsx` — examples

1. **Sizes** — five `<Text size="...">` (xs through xl).
2. **As variants** — `<Text>` (p), `<Text as="span">`, `<Text as="div">`, `<Text as="label" htmlFor="x">`. Show the resulting DOM in the description.
3. **Tones** — seven tones (default / muted / subtle / accent / danger / success / warning).
4. **Weights** — four weights.
5. **Alignments** — left / center / right.
6. **Truncate** — one-liner that overflows its container.
7. **Line clamp** — multi-line block clamped to 2 lines.
8. **Composing with `<Code>`** — `<Text>Use <Code>npm install</Code> to add deps.</Text>`

### `CodeDemo.tsx` — examples

1. **Inline default** — `<Text>The variable <Code>userId</Code> is required.</Text>`
2. **Tones** — default / muted / accent / danger side-by-side.
3. **Standalone (no surrounding `<Text>`)** — a standalone `<Code>fetch('/api/users')</Code>` block.

Wire all three into:

- `App.tsx` — three new `<Route>`s.
- `AppShell.tsx` — three new items under the `Display` group, alphabetical (Code → Text → Title slot in).
- `ComponentsIndex.tsx` — three new cards with small live previews.
- `mockups/registry.ts` — extend `ComponentName` union with `Title | Text | Code`. Mark the Dashboard mockup's `usesComponents` to include these after the cleanup pass.

## Mockup cleanup (in scope)

Dashboard mockup currently has hand-rolled typography in two places:

1. `Dashboard.tsx` line ~61: `<h1 className={styles.title}>Dashboard</h1>` + `<p className={styles.subtitle}>Good morning…</p>`
2. `Dashboard.tsx` line ~144 (post-Card-compound iteration): `<h2 className={styles.cardTitle}>Recent contacts</h2>`
3. Multiple inline-style spans inside the activity / deals rows (`fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-...)'`) and `font-weight: 'var(--font-weight-medium)'` patterns.

Refactor:

- `<h1 className={styles.title}>Dashboard</h1>` → `<Title order={1}>Dashboard</Title>`
- `<p className={styles.subtitle}>Good morning…</p>` → `<Text size="lg" tone="muted">Good morning…</Text>`
- `<h2 className={styles.cardTitle}>Recent contacts</h2>` → `<Title order={2}>Recent contacts</Title>` (Dashboard's hierarchy: h1 = page title, h2 = section titles including all the Card.Header `headerLevel="h2"` sections + this Recent contacts section)
- `<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-subtle)' }}>…</span>` → `<Text as="span" size="sm" tone="subtle">…</Text>`
- `<span style={{ fontWeight: 'var(--font-weight-medium)' }}>…</span>` → `<Text as="span" weight="medium">…</Text>`

Then delete `.title`, `.subtitle`, `.cardTitle`, `.statLabel`, `.statValue`, `.contactName`, `.listRowTitle`, `.listRowMeta`, `.activityLine`, `.activityTarget` from `Dashboard.module.scss` — replacing each call site with the appropriate `<Text>` / `<Title>` composition. Only retain SCSS classes that style layout / grid / containers (e.g. `.statsGrid`, `.twoCol`, `.contactGrid`, `.statIcon`).

This is in-scope for the Typography PR because it's the proof that the primitives are doing their job. If the Dashboard refactor isn't included, we ship primitives nobody uses.

## AGENTS.md update

Add a new top-level "Typography" section before or near the Card section (alphabetical / topical grouping — pick whichever fits the existing AGENTS.md flow). Section contents:

- One-paragraph intro on when to reach for Title vs Text vs Code.
- Compact API tables for each prop (order/size/tone/weight for Title, as/size/tone/weight/align/truncate/lineClamp for Text, tone for Code).
- A "Don't" subsection: "Don't reach for raw `--font-*` / `--color-fg-*` tokens via inline style. If you need a size/tone the components don't expose, that's a token-vocabulary conversation, not a component-skipping conversation."

Also extend the `index.ts` re-exports to include all three components plus all the exported type unions.

## Self-imposed constraints / decisions baked in

- **Constrained `as`**: `<Text>` accepts only `p | span | div | label`. No generic, no polymorphic ref forwarding. This is a deliberate complexity reduction compared to `<Link>`'s polymorphic generic.
- **Order is required on `<Title>`**: no default. Forces the consumer to think about heading hierarchy. Skipping it raises a TS error.
- **Default `<Text>` element is `<p>`**: block-level by default. Pass `as="span"` for inline.
- **Default Title weight is `semibold`**: matches existing `.title` / `.cardTitle` mockup styles and the rest of the library (Card.Header uses semibold). Per-order weight customization deferred.
- **Tone vocabulary alignment**:
  - `<Title>` tones: default / muted / subtle / accent / danger
  - `<Text>` tones: default / muted / subtle / accent / danger / success / warning
  - `<Code>` tones: default / muted / accent / danger
  - Differences are deliberate: warning/success make sense for state-coded body text but not for headings; subtle isn't needed for Code (the chip background already de-emphasizes).

## Hard Rule 8

Standard cycle: gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None — design space resolved during brainstorming.
