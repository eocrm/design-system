# Typography (Title + Text + Code) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three typography primitives (`<Title>`, `<Text>`, `<Code>`) to `@eocrm/design-system` so consumers never reach for raw `--font-*` / `--color-fg-*` tokens via inline `style` again.

**Architecture:** Three self-contained components, each in its own `src/components/<Name>/` directory. No compound API, no shared subcomponents — each renders one element and accepts a constrained prop surface. `<Title>` dispatches the heading tag from a required `order` prop (1–6) with an order→size default map. `<Text>` uses a constrained `as` string union (no polymorphic generic — see `<Link>` for the polymorphic pattern; not needed here) and supports both single-line `truncate` and multi-line `lineClamp`. `<Code>` is a leaf `<code>` chip with monospace + subtle bg.

**Tech Stack:** React 19, TypeScript, CSS Modules + SCSS, Vitest + React Testing Library, existing token vocab in `src/styles/tokens.scss`. No new deps.

---

**Reference spec:** `docs/superpowers/specs/2026-05-24-typography-design.md` (commit `3729bc6`).

**Branch:** `feat/typography` (already checked out, currently at spec commit).

**Conventions used throughout this plan:**

- **Plan-verbatim:** every code block is the literal file contents the implementer commits. Don't paraphrase, don't fold types, don't reorder imports.
- **Commit format:** subject line + blank line + body (1–3 short sentences) + blank line + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **`git add` discipline:** stage by explicit path. No `git add -A` / `git add .`.
- **Pattern A spread** (props last so consumer wins): used in all three components — consistent with Button/Card/Badge/Stack.
- **Stylelint requirement:** any `margin`, `padding` (only at internal scopes), or other property-disallowed declarations must have a `// stylelint-disable-next-line property-disallowed-list -- <reason>` comment **on the line immediately before** the declaration. Same exact form used in Card.module.scss / Accordion.module.scss / Breadcrumb.module.scss.
- **Gates after each source-touching task:** run `make test`, `make build-lib`, `make build`, `make lint`. All four must pass before commit + advance to next task.
- **If pre-push hook flags prettier:** run `npx prettier --write <flagged files>` and create a follow-up commit `<scope>: prettier --write` with the same Co-Authored-By footer. Don't squash.

---

## File structure

### NEW files

```
packages/design-system/src/components/Title/
  Title.tsx              ← forwardRef, heading-tag dispatch from order, size/tone/weight/truncate
  Title.module.scss      ← base .title + .sizeXs..3xl + .toneDefault..danger + .weightRegular..bold + .truncate
  Title.test.tsx         ← ~13 cases
  index.ts               ← re-exports Title + types

packages/design-system/src/components/Text/
  Text.tsx               ← forwardRef, constrained-as dispatch, size/tone/weight/align/truncate/lineClamp
  Text.module.scss       ← base .text + sizes + tones + weights + aligns + truncate + lineClamp
  Text.test.tsx          ← ~16 cases
  index.ts               ← re-exports Text + types

packages/design-system/src/components/Code/
  Code.tsx               ← forwardRef, leaf <code> with tone
  Code.module.scss       ← base .code chip + tone modifiers
  Code.test.tsx          ← ~8 cases
  index.ts               ← re-exports Code + types

packages/playground/src/pages/components/TitleDemo.tsx     ← demo page (DemoLayout + 5 Examples)
packages/playground/src/pages/components/TextDemo.tsx      ← demo page (DemoLayout + 8 Examples)
packages/playground/src/pages/components/CodeDemo.tsx      ← demo page (DemoLayout + 3 Examples)
```

### MODIFIED files

```
packages/design-system/src/index.ts                                 ← add 3 component + types re-exports
packages/design-system/AGENTS.md                                    ← prepend Typography section before <Button>
packages/playground/src/App.tsx                                     ← add 3 import lines + 3 <Route>s
packages/playground/src/layout/AppShell/AppShell.tsx                ← add 3 icon imports + 3 items in Display group
packages/playground/src/pages/components/ComponentsIndex.tsx        ← add 3 imports + 3 cards
packages/playground/src/pages/mockups/registry.ts                   ← extend ComponentName union + Dashboard's usesComponents
packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx       ← replace raw h1/h2/spans with Title/Text
packages/playground/src/pages/mockups/Dashboard/Dashboard.module.scss ← delete typography-only SCSS rules
```

---

## Task 1: Title source — `Title.tsx` + `Title.module.scss` + `index.ts`

**Files:**

- Create: `packages/design-system/src/components/Title/Title.tsx`
- Create: `packages/design-system/src/components/Title/Title.module.scss`
- Create: `packages/design-system/src/components/Title/index.ts`

### Step 1.1: Create `Title.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Title.module.scss';

/** Heading semantic level — what `<hN>` element to render and the default visual size. */
export type TitleOrder = 1 | 2 | 3 | 4 | 5 | 6;

/** Visual size override. When omitted, derived from `order` (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm). */
export type TitleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

/** Color tone. Tone maps to a `--color-*` token. */
export type TitleTone = 'default' | 'muted' | 'subtle' | 'accent' | 'danger';

/** Font weight. */
export type TitleWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /**
   * Heading semantic level (1–6). REQUIRED — forces the consumer to think about
   * heading hierarchy on the page. Drives both the rendered element (`<h1>`–`<h6>`)
   * and the default visual size (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm).
   */
  order: TitleOrder;
  /**
   * Visual size override. Defaults to the size for the given `order`. Use this
   * when the semantic level and the visual size need to diverge — e.g. a small
   * section title that's still an `<h2>` for screen readers.
   */
  size?: TitleSize;
  /**
   * Color tone. Defaults to `'default'` (full foreground).
   * - `default` — `--color-fg`
   * - `muted` — `--color-fg-muted`
   * - `subtle` — `--color-fg-subtle`
   * - `accent` — `--color-accent`
   * - `danger` — `--color-danger`
   */
  tone?: TitleTone;
  /**
   * Font weight. Defaults to `'semibold'` (matches the most common heading
   * weight across the existing mockups).
   */
  weight?: TitleWeight;
  /**
   * Truncate the title to a single line with ellipsis. Useful inside narrow
   * cards or grid cells. Defaults to `false`.
   */
  truncate?: boolean;
  /** Title text content. */
  children: ReactNode;
}

/**
 * Default size map keyed by `order`. Each heading level maps to one font-size
 * token. Override via the `size` prop when the semantic level and visual size
 * should diverge.
 */
const SIZE_BY_ORDER: Record<TitleOrder, TitleSize> = {
  1: '3xl',
  2: '2xl',
  3: 'xl',
  4: 'lg',
  5: 'md',
  6: 'sm',
};

const SIZE_CLASS: Record<TitleSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
  '2xl': styles.size2xl,
  '3xl': styles.size3xl,
};

const TONE_CLASS: Record<TitleTone, string> = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  subtle: styles.toneSubtle,
  accent: styles.toneAccent,
  danger: styles.toneDanger,
};

const WEIGHT_CLASS: Record<TitleWeight, string> = {
  regular: styles.weightRegular,
  medium: styles.weightMedium,
  semibold: styles.weightSemibold,
  bold: styles.weightBold,
};

/**
 * Semantic heading primitive. Renders `<h1>`–`<h6>` based on `order`, with a
 * default visual size from the order→size map. Use `size` to decouple the
 * visual size from the semantic level (e.g. a nested section that needs a
 * smaller-looking h2).
 *
 * Use `<Title>` for ALL heading text in your UI. Don't write raw `<h1>` /
 * `<h2>` / `<h3>` elements with className — the typography primitives exist
 * precisely so you never need to.
 *
 * @example
 * // Page title — biggest, h1 for screen readers:
 * <Title order={1}>Dashboard</Title>
 *
 * @example
 * // Section heading at the canonical size:
 * <Title order={2}>Recent activity</Title>
 *
 * @example
 * // Override visual size when nested deep but you still want the right SR level:
 * <Title order={2} size="lg">Section that's semantically h2 but visually compact</Title>
 *
 * @example
 * // De-emphasize via tone:
 * <Title order={3} tone="muted">Filter group label</Title>
 *
 * @remarks When NOT to use
 * - For body text. Use `<Text>` instead.
 * - For inline emphasis. Use `<strong>` / `<em>` / `<Text weight="semibold">`.
 * - When you only want monospaced text (e.g. a code identifier). Use `<Code>`.
 * - To pick a font size visually without thinking about heading hierarchy.
 *   The required `order` prop is there to force the conversation: what level
 *   is this heading on the page?
 *
 * @remarks Anti-patterns
 * - ❌ `<h2 className={styles.title}>` — use `<Title order={2}>`. The library
 *   exists so consumer SCSS never names a typography class.
 * - ❌ `<Title order={1} size="xs">` — almost certainly a sign that the page's
 *   heading hierarchy is wrong. Bump the order to a higher number instead of
 *   shrinking a low-order heading.
 * - ❌ Skipping heading levels (`order={1}` then jumping to `order={4}`).
 *   Hurts SR users. Use sequential orders.
 */
export const Title = forwardRef<HTMLHeadingElement, TitleProps>(function Title(
  {
    order,
    size,
    tone = 'default',
    weight = 'semibold',
    truncate = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const Heading = `h${order}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const effectiveSize = size ?? SIZE_BY_ORDER[order];
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <Heading
      ref={ref}
      className={clsx(
        styles.title,
        SIZE_CLASS[effectiveSize],
        TONE_CLASS[tone],
        WEIGHT_CLASS[weight],
        truncate && styles.truncate,
        className,
      )}
      {...rest}
    >
      {children}
    </Heading>
  );
});
```

### Step 1.2: Create `Title.module.scss`

- [ ] Write file contents (verbatim):

```scss
.title {
  // stylelint-disable-next-line property-disallowed-list -- native heading margin reset
  margin: 0;
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  color: var(--color-fg);
}

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

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
```

### Step 1.3: Create `index.ts`

- [ ] Write file contents (verbatim):

```ts
export { Title } from './Title';
export type { TitleProps, TitleOrder, TitleSize, TitleTone, TitleWeight } from './Title';
```

### Step 1.4: Verify gates

- [ ] Run `make build-lib`. Expected: zero output / clean exit. Type errors here usually mean the `SIZE_CLASS` / `TONE_CLASS` / `WEIGHT_CLASS` keys don't line up with the union — re-check the spread.
- [ ] Run `make lint`. Expected: clean. If stylelint flags the `margin: 0` line, the disable comment is missing or in the wrong place — must be on the line IMMEDIATELY before the declaration with the exact form shown.

### Step 1.5: Commit

```bash
git add packages/design-system/src/components/Title/Title.tsx \
        packages/design-system/src/components/Title/Title.module.scss \
        packages/design-system/src/components/Title/index.ts
git commit -m "$(cat <<'EOF'
Title: heading primitive (order 1-6 with size/tone/weight/truncate)

Renders <h1>-<h6> from a required order prop. Default visual size derived
from order (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm); explicit size prop decouples.
Five tones, four weights, single-line truncate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Title tests — `Title.test.tsx`

**Files:**

- Create: `packages/design-system/src/components/Title/Title.test.tsx`

### Step 2.1: Create `Title.test.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Title, type TitleOrder, type TitleSize, type TitleTone, type TitleWeight } from './Title';

describe('Title', () => {
  it('renders its children', () => {
    render(<Title order={1}>Hello</Title>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it.each<[TitleOrder, string]>([
    [1, 'H1'],
    [2, 'H2'],
    [3, 'H3'],
    [4, 'H4'],
    [5, 'H5'],
    [6, 'H6'],
  ])('order=%i renders a %s element', (order, tag) => {
    const { container } = render(<Title order={order}>x</Title>);
    expect(container.firstElementChild!.tagName).toBe(tag);
  });

  it.each<[TitleOrder, string]>([
    [1, /size3xl/.source],
    [2, /size2xl/.source],
    [3, /sizeXl/.source],
    [4, /sizeLg/.source],
    [5, /sizeMd/.source],
    [6, /sizeSm/.source],
  ])('order=%i defaults to its mapped size class (%s)', (order, classMatch) => {
    const { container } = render(<Title order={order}>x</Title>);
    expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(classMatch));
  });

  it('explicit size overrides the order-derived size', () => {
    const { container } = render(
      <Title order={1} size="xs">
        x
      </Title>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/sizeXs/);
    expect(cls).not.toMatch(/size3xl/);
  });

  it.each<TitleTone>(['default', 'muted', 'subtle', 'accent', 'danger'])(
    'tone="%s" applies the matching tone class',
    (tone) => {
      const { container } = render(
        <Title order={3} tone={tone}>
          x
        </Title>,
      );
      const cap = tone[0].toUpperCase() + tone.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`tone${cap}`));
    },
  );

  it.each<TitleWeight>(['regular', 'medium', 'semibold', 'bold'])(
    'weight="%s" applies the matching weight class',
    (weight) => {
      const { container } = render(
        <Title order={3} weight={weight}>
          x
        </Title>,
      );
      const cap = weight[0].toUpperCase() + weight.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`weight${cap}`));
    },
  );

  it('truncate adds the truncate class', () => {
    const { container } = render(
      <Title order={2} truncate>
        x
      </Title>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/truncate/);
  });

  it('omitting truncate does NOT add the truncate class', () => {
    const { container } = render(<Title order={2}>x</Title>);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/truncate/);
  });

  it('className from props merges with the base class (not replace)', () => {
    const { container } = render(
      <Title order={3} className="custom">
        x
      </Title>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/title/);
  });

  it('forwards ref to the underlying heading element', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Title order={2} ref={ref}>
        x
      </Title>,
    );
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    expect(ref.current?.tagName).toBe('H2');
  });

  it('spreads native HTML attributes to the heading element', () => {
    render(
      <Title order={3} id="page-heading" data-testid="t" aria-label="ariaLabel">
        x
      </Title>,
    );
    const el = screen.getByTestId('t');
    expect(el).toHaveAttribute('id', 'page-heading');
    expect(el).toHaveAttribute('aria-label', 'ariaLabel');
  });

  it<{ size: TitleSize }>('every size token maps to a class (smoke test)', () => {
    const sizes: TitleSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
    sizes.forEach((size) => {
      const { container } = render(
        <Title order={3} size={size}>
          x
        </Title>,
      );
      const cap = size === '2xl' || size === '3xl' ? size : size[0].toUpperCase() + size.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`size${cap}`));
    });
  });
});
```

### Step 2.2: Verify gates

- [ ] Run `make test`. Expected: all Title tests pass. If a parameterized case fails, check that the CSS-Modules hash for the class still contains the literal substring (`size3xl`, `toneAccent`, etc.). The regex matches the substring within the hashed class name.
- [ ] Run `make build-lib`. Expected: clean.

### Step 2.3: Commit

```bash
git add packages/design-system/src/components/Title/Title.test.tsx
git commit -m "$(cat <<'EOF'
Title: unit tests (~13 cases)

Covers element dispatch per order, default size derivation, size override,
all tones, all weights, truncate, className merge, ref forwarding, native
attr spread.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Text source — `Text.tsx` + `Text.module.scss` + `index.ts`

**Files:**

- Create: `packages/design-system/src/components/Text/Text.tsx`
- Create: `packages/design-system/src/components/Text/Text.module.scss`
- Create: `packages/design-system/src/components/Text/index.ts`

### Step 3.1: Create `Text.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Text.module.scss';

/**
 * Rendered element. Constrained to a small string union (not polymorphic).
 * If you need to render Text as a router-aware link or a custom element, use
 * `<Link>` (polymorphic via `as`) or `<Text as="span">` + your own wrapper —
 * not a generic Text.
 */
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
  /**
   * Rendered element. Defaults to `'p'` (block, default body text). Use
   * `'span'` for inline runs, `'div'` for block containers that can't be a
   * `<p>` (e.g. when the body needs nested block-level elements that React
   * would warn about inside `<p>`), `'label'` for form labels (pair with
   * `htmlFor`).
   */
  as?: TextAs;
  /**
   * Visual size. Defaults to `'md'` (body text).
   * - `xs` — 11px, dense metadata / captions
   * - `sm` — 12px, small body / labels
   * - `md` — 14px, body text (default)
   * - `lg` — 16px, large body / lead text
   * - `xl` — 20px, very large body (rare)
   */
  size?: TextSize;
  /**
   * Color tone. Defaults to `'default'`.
   * - `default` — `--color-fg`
   * - `muted` — `--color-fg-muted` (for secondary copy)
   * - `subtle` — `--color-fg-subtle` (for tertiary metadata)
   * - `accent` — `--color-accent`
   * - `danger` / `success` / `warning` — state-coded text
   */
  tone?: TextTone;
  /** Font weight. Defaults to `'regular'`. */
  weight?: TextWeight;
  /** Text alignment. Defaults to `'left'`. */
  align?: TextAlign;
  /**
   * Truncate to a single line with ellipsis. Defaults to `false`. Use inside
   * narrow containers (table cells, card list rows). Mutually exclusive with
   * `lineClamp` — if both are set, `lineClamp` wins.
   */
  truncate?: boolean;
  /**
   * Clamp to N lines with ellipsis (uses `-webkit-line-clamp`). Defaults to
   * `undefined`. Overrides `truncate` when set. Example: `lineClamp={2}` for
   * a 2-line description that ellipses on the third.
   */
  lineClamp?: number;
  /** Text content. */
  children: ReactNode;
}

const SIZE_CLASS: Record<TextSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

const TONE_CLASS: Record<TextTone, string> = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  subtle: styles.toneSubtle,
  accent: styles.toneAccent,
  danger: styles.toneDanger,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
};

const WEIGHT_CLASS: Record<TextWeight, string> = {
  regular: styles.weightRegular,
  medium: styles.weightMedium,
  semibold: styles.weightSemibold,
  bold: styles.weightBold,
};

const ALIGN_CLASS: Record<TextAlign, string> = {
  left: styles.alignLeft,
  center: styles.alignCenter,
  right: styles.alignRight,
};

/**
 * Body / inline text primitive. Constrained-as dispatch (no polymorphic
 * generic) — accepts `p` (default), `span`, `div`, or `label`. Use for ALL
 * non-heading text in your UI: paragraphs, captions, labels, inline runs.
 *
 * Don't reach for raw `style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}` —
 * that's the whole reason `<Text>` exists. If you need a size / tone the
 * primitive doesn't expose, that's a token-vocabulary conversation, not a
 * component-skipping one.
 *
 * @example
 * // Default body text — block, md, regular:
 * <Text>Acme Inc · Renewal due Q3.</Text>
 *
 * @example
 * // Inline run inside a parent — span, smaller, muted:
 * <Text as="span" size="sm" tone="muted">12m ago</Text>
 *
 * @example
 * // Form label paired with an input:
 * <Text as="label" htmlFor="email" weight="medium">Email</Text>
 * <Input id="email" />
 *
 * @example
 * // Multi-line clamp inside a narrow card:
 * <Text lineClamp={2}>
 *   A long deal description that we want to ellipsis after two lines so the
 *   card stays at a predictable height.
 * </Text>
 *
 * @example
 * // State-coded inline text (e.g. validation message):
 * <Text size="sm" tone="danger">Email is required.</Text>
 *
 * @remarks When NOT to use
 * - For heading text. Use `<Title order={N}>`.
 * - For inline `<code>`-style content. Use `<Code>`.
 * - For action triggers (clickable text). Use `<Button>` or `<Link>`.
 * - For pure layout containers. Use `<Stack>` / `<Cluster>` / `<Grid>`.
 *
 * @remarks Anti-patterns
 * - ❌ `<span style={{ fontSize: 'var(--font-size-sm)' }}>` — use `<Text as="span" size="sm">`.
 * - ❌ `<Text style={{ color: '#someHex' }}>` — pick a tone from the whitelist.
 *   The whitelist is the contract.
 * - ❌ `<Text as="h2">` — Text doesn't accept heading tags. Use `<Title order={2}>`.
 * - ❌ Wrapping a `<Title>` in `<Text>` for tone/weight tweaks. Pass tone/weight
 *   directly to the `<Title>` instead.
 */
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    as = 'p',
    size = 'md',
    tone = 'default',
    weight = 'regular',
    align = 'left',
    truncate = false,
    lineClamp,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const Component = as as 'p' | 'span' | 'div' | 'label';
  // lineClamp overrides truncate when both are set — lineClamp is strictly
  // more expressive.
  const useLineClamp = typeof lineClamp === 'number' && lineClamp > 0;
  const useTruncate = !useLineClamp && truncate;

  // lineClamp's `-webkit-line-clamp` is a dynamic value — set inline rather
  // than generate one class per N. Merge with any consumer-provided style.
  const mergedStyle: CSSProperties | undefined = useLineClamp
    ? { ...style, WebkitLineClamp: lineClamp }
    : style;

  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <Component
      ref={ref as React.Ref<HTMLParagraphElement>}
      className={clsx(
        styles.text,
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        WEIGHT_CLASS[weight],
        ALIGN_CLASS[align],
        useTruncate && styles.truncate,
        useLineClamp && styles.lineClamp,
        className,
      )}
      style={mergedStyle}
      {...rest}
    >
      {children}
    </Component>
  );
});
```

### Step 3.2: Create `Text.module.scss`

- [ ] Write file contents (verbatim):

```scss
.text {
  // stylelint-disable-next-line property-disallowed-list -- native <p> margin reset (component-internal, not at the boundary)
  margin: 0;
  font-family: var(--font-family-sans);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--color-fg);
}

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

.alignLeft {
  text-align: left;
}
.alignCenter {
  text-align: center;
}
.alignRight {
  text-align: right;
}

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
  // -webkit-line-clamp value is set inline via style (dynamic), not a class.
}
```

### Step 3.3: Create `index.ts`

- [ ] Write file contents (verbatim):

```ts
export { Text } from './Text';
export type { TextProps, TextAs, TextSize, TextTone, TextWeight, TextAlign } from './Text';
```

### Step 3.4: Verify gates

- [ ] Run `make build-lib`. Expected: clean. The `ref as React.Ref<HTMLParagraphElement>` cast is intentional — `HTMLElement` is the type-erased ref the consumer sees; React requires a concrete element type for `ref` on a dispatched JSX element.
- [ ] Run `make lint`. Expected: clean. If stylelint complains about `text-align: left`, it's the strict-value rule misfiring — left/center/right are valid bare keywords and don't need tokens; if it does flag, add a `// stylelint-disable-next-line scale-unlimited/declaration-strict-value` above. Don't change to a token.

### Step 3.5: Commit

```bash
git add packages/design-system/src/components/Text/Text.tsx \
        packages/design-system/src/components/Text/Text.module.scss \
        packages/design-system/src/components/Text/index.ts
git commit -m "$(cat <<'EOF'
Text: body/inline primitive (constrained-as, size/tone/weight/align, truncate + lineClamp)

Constrained-as dispatch (p/span/div/label, no polymorphic generic). Five sizes,
seven tones (incl. success/warning for state-coded text), four weights, three
alignments. truncate (single-line) and lineClamp (multi-line, dynamic value
via inline style); lineClamp overrides truncate when both set.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Text tests — `Text.test.tsx`

**Files:**

- Create: `packages/design-system/src/components/Text/Text.test.tsx`

### Step 4.1: Create `Text.test.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import {
  Text,
  type TextAlign,
  type TextAs,
  type TextSize,
  type TextTone,
  type TextWeight,
} from './Text';

describe('Text', () => {
  it('renders its children', () => {
    render(<Text>Hello body</Text>);
    expect(screen.getByText('Hello body')).toBeInTheDocument();
  });

  it('defaults to a <p> element', () => {
    const { container } = render(<Text>x</Text>);
    expect(container.firstElementChild!.tagName).toBe('P');
  });

  it.each<[TextAs, string]>([
    ['p', 'P'],
    ['span', 'SPAN'],
    ['div', 'DIV'],
    ['label', 'LABEL'],
  ])('as="%s" renders a %s element', (asValue, tag) => {
    const { container } = render(<Text as={asValue}>x</Text>);
    expect(container.firstElementChild!.tagName).toBe(tag);
  });

  it('defaults to size="md"', () => {
    const { container } = render(<Text>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(/sizeMd/);
  });

  it.each<TextSize>(['xs', 'sm', 'md', 'lg', 'xl'])(
    'size="%s" applies the matching size class',
    (size) => {
      const { container } = render(<Text size={size}>x</Text>);
      const cap = size[0].toUpperCase() + size.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`size${cap}`));
    },
  );

  it.each<TextTone>(['default', 'muted', 'subtle', 'accent', 'danger', 'success', 'warning'])(
    'tone="%s" applies the matching tone class',
    (tone) => {
      const { container } = render(<Text tone={tone}>x</Text>);
      const cap = tone[0].toUpperCase() + tone.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`tone${cap}`));
    },
  );

  it.each<TextWeight>(['regular', 'medium', 'semibold', 'bold'])(
    'weight="%s" applies the matching weight class',
    (weight) => {
      const { container } = render(<Text weight={weight}>x</Text>);
      const cap = weight[0].toUpperCase() + weight.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`weight${cap}`));
    },
  );

  it.each<TextAlign>(['left', 'center', 'right'])(
    'align="%s" applies the matching align class',
    (align) => {
      const { container } = render(<Text align={align}>x</Text>);
      const cap = align[0].toUpperCase() + align.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`align${cap}`));
    },
  );

  it('truncate adds the truncate class', () => {
    const { container } = render(<Text truncate>x</Text>);
    expect((container.firstChild as HTMLElement).className).toMatch(/truncate/);
  });

  it('lineClamp={N} adds the lineClamp class AND sets style.WebkitLineClamp', () => {
    const { container } = render(<Text lineClamp={3}>x</Text>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/lineClamp/);
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('3');
  });

  it('lineClamp overrides truncate when both set', () => {
    const { container } = render(
      <Text truncate lineClamp={2}>
        x
      </Text>,
    );
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/lineClamp/);
    expect(cls).not.toMatch(/truncate/);
  });

  it('lineClamp={0} is ignored (no class, no style)', () => {
    const { container } = render(<Text lineClamp={0}>x</Text>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toMatch(/lineClamp/);
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('');
  });

  it('className from props merges with the base class (not replace)', () => {
    const { container } = render(<Text className="custom">x</Text>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/text/);
  });

  it('merges consumer style with the dynamic lineClamp style', () => {
    const { container } = render(
      <Text lineClamp={2} style={{ marginTop: 8 }}>
        x
      </Text>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.marginTop).toBe('8px');
    expect(el.style.getPropertyValue('-webkit-line-clamp')).toBe('2');
  });

  it('forwards ref to the underlying element (default <p>)', () => {
    const ref = createRef<HTMLElement>();
    render(<Text ref={ref}>x</Text>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it('forwards ref to a <label> when as="label"', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Text as="label" ref={ref}>
        x
      </Text>,
    );
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('spreads native HTML attributes (htmlFor on <label>)', () => {
    render(
      <Text as="label" htmlFor="email-input" data-testid="lbl">
        Email
      </Text>,
    );
    const el = screen.getByTestId('lbl');
    expect(el).toHaveAttribute('for', 'email-input');
  });
});
```

### Step 4.2: Verify gates

- [ ] Run `make test`. Expected: every Text test passes. If the `WebkitLineClamp` assertion fails, the inline-style prop name is wrong — React maps the camelCase `WebkitLineClamp` JSX prop to the `-webkit-line-clamp` CSS property; querying via `getPropertyValue('-webkit-line-clamp')` is the right read. Don't use `el.style.webkitLineClamp` — that path is unreliable across jsdom versions.
- [ ] Run `make build-lib`. Expected: clean.

### Step 4.3: Commit

```bash
git add packages/design-system/src/components/Text/Text.test.tsx
git commit -m "$(cat <<'EOF'
Text: unit tests (~16 cases)

Covers default <p>, each `as` value, default size md, all sizes/tones/weights/aligns,
truncate, lineClamp + dynamic WebkitLineClamp style, lineClamp overrides truncate,
lineClamp=0 ignored, className merge, style merge with lineClamp, ref forwarding
(default and as="label"), native attr spread.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Code source — `Code.tsx` + `Code.module.scss` + `index.ts`

**Files:**

- Create: `packages/design-system/src/components/Code/Code.tsx`
- Create: `packages/design-system/src/components/Code/Code.module.scss`
- Create: `packages/design-system/src/components/Code/index.ts`

### Step 5.1: Create `Code.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Code.module.scss';

/** Color tone. */
export type CodeTone = 'default' | 'muted' | 'accent' | 'danger';

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  /**
   * Color tone for the code text. The chip background stays the same;
   * only the text color changes.
   * - `default` — `--color-fg`
   * - `muted` — `--color-fg-muted`
   * - `accent` — `--color-accent`
   * - `danger` — `--color-danger`
   */
  tone?: CodeTone;
  /** Code content. */
  children: ReactNode;
}

const TONE_CLASS: Record<CodeTone, string> = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  accent: styles.toneAccent,
  danger: styles.toneDanger,
};

/**
 * Inline `<code>` primitive — monospace text with a subtle chip background.
 * Use for inline identifiers, snippets, file paths inside body text.
 *
 * **Inline only.** For multi-line code blocks with syntax highlighting, the
 * playground's `CodeBlock` (Prism-backed) is the right tool — but that's a
 * playground concern, not a library primitive. Don't try to make `<Code>` do
 * block code.
 *
 * @example
 * // Inline inside body text:
 * <Text>Use <Code>npm install</Code> to add a dependency.</Text>
 *
 * @example
 * // Standalone identifier:
 * <Code>userId</Code>
 *
 * @example
 * // Tone-coded — e.g. a removed flag in a release note:
 * <Code tone="danger">--no-verify</Code>
 *
 * @remarks When NOT to use
 * - For block-level code with multiple lines or syntax highlighting.
 * - For action triggers that LOOK like code (`<Button variant="ghost">`).
 * - As a substitute for `<kbd>` (keyboard input rendering — not yet shipped).
 */
export const Code = forwardRef<HTMLElement, CodeProps>(function Code(
  { tone = 'default', className, children, ...rest },
  ref,
) {
  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <code ref={ref} className={clsx(styles.code, TONE_CLASS[tone], className)} {...rest}>
      {children}
    </code>
  );
});
```

### Step 5.2: Create `Code.module.scss`

- [ ] Write file contents (verbatim):

```scss
.code {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-code);
  // stylelint-disable-next-line property-disallowed-list -- inline chip padding (component-internal, not at the boundary)
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

### Step 5.3: Create `index.ts`

- [ ] Write file contents (verbatim):

```ts
export { Code } from './Code';
export type { CodeProps, CodeTone } from './Code';
```

### Step 5.4: Verify gates

- [ ] Run `make build-lib`. Expected: clean.
- [ ] Run `make lint`. Expected: clean. The `padding` line MUST have its inline disable comment on the line immediately above. The `var(--font-size-code)` token already exists; if stylelint flags it for some reason, that's a token-vocabulary issue not a Code issue — stop and investigate.

### Step 5.5: Commit

```bash
git add packages/design-system/src/components/Code/Code.tsx \
        packages/design-system/src/components/Code/Code.module.scss \
        packages/design-system/src/components/Code/index.ts
git commit -m "$(cat <<'EOF'
Code: inline <code> chip (monospace + subtle bg, 4 tones)

Inline-only — block code lives in the playground's CodeBlock (Prism), not the
library. Default chip uses var(--font-size-code) which scales with surrounding
text. Four tones change only the text color, not the chip background.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Code tests — `Code.test.tsx`

**Files:**

- Create: `packages/design-system/src/components/Code/Code.test.tsx`

### Step 6.1: Create `Code.test.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Code, type CodeTone } from './Code';

describe('Code', () => {
  it('renders its children', () => {
    render(<Code>npm install</Code>);
    expect(screen.getByText('npm install')).toBeInTheDocument();
  });

  it('renders a <code> element', () => {
    const { container } = render(<Code>x</Code>);
    expect(container.firstElementChild!.tagName).toBe('CODE');
  });

  it('defaults to tone="default"', () => {
    const { container } = render(<Code>x</Code>);
    expect((container.firstChild as HTMLElement).className).toMatch(/toneDefault/);
  });

  it.each<CodeTone>(['default', 'muted', 'accent', 'danger'])(
    'tone="%s" applies the matching tone class',
    (tone) => {
      const { container } = render(<Code tone={tone}>x</Code>);
      const cap = tone[0].toUpperCase() + tone.slice(1);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(`tone${cap}`));
    },
  );

  it('className from props merges with the base class (not replace)', () => {
    const { container } = render(<Code className="custom">x</Code>);
    const cls = (container.firstChild as HTMLElement).className;
    expect(cls).toMatch(/custom/);
    expect(cls).toMatch(/code/);
  });

  it('forwards ref to the underlying <code> element', () => {
    const ref = createRef<HTMLElement>();
    render(<Code ref={ref}>x</Code>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('CODE');
  });

  it('spreads native HTML attributes to the <code> element', () => {
    render(
      <Code data-testid="c" id="cli" aria-label="cli">
        x
      </Code>,
    );
    const el = screen.getByTestId('c');
    expect(el).toHaveAttribute('id', 'cli');
    expect(el).toHaveAttribute('aria-label', 'cli');
  });

  it('composes inline inside text — DOM nesting check', () => {
    render(
      <p data-testid="wrapper">
        Use <Code>npm install</Code> to add deps.
      </p>,
    );
    const wrapper = screen.getByTestId('wrapper');
    expect(wrapper.querySelector('code')).toHaveTextContent('npm install');
  });
});
```

### Step 6.2: Verify gates

- [ ] Run `make test`. Expected: all 8 Code tests pass.

### Step 6.3: Commit

```bash
git add packages/design-system/src/components/Code/Code.test.tsx
git commit -m "$(cat <<'EOF'
Code: unit tests (~8 cases)

Covers <code> element, default tone, all 4 tones, className merge, ref
forwarding, native attr spread, composition inside body text.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Barrel re-exports + AGENTS.md Typography section

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/AGENTS.md`

### Step 7.1: Modify `packages/design-system/src/index.ts`

The current file (read first if you don't have it in context) starts with the Button re-export at line 2. Add the three Typography re-exports as a NEW first block, before Button. Use the Edit tool:

- [ ] Read the file first (required by Edit semantics): the top of `packages/design-system/src/index.ts` reads:

```ts
// Public API of the design system. The CRM consumes from here.
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';
```

- [ ] Edit (use `replace_all: false`):

**old_string:**

```ts
// Public API of the design system. The CRM consumes from here.
export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';
```

**new_string:**

```ts
// Public API of the design system. The CRM consumes from here.

// Typography primitives — use these instead of raw <h*> / <p> / <span> + inline styles.
export { Title } from './components/Title';
export type { TitleProps, TitleOrder, TitleSize, TitleTone, TitleWeight } from './components/Title';

export { Text } from './components/Text';
export type {
  TextProps,
  TextAs,
  TextSize,
  TextTone,
  TextWeight,
  TextAlign,
} from './components/Text';

export { Code } from './components/Code';
export type { CodeProps, CodeTone } from './components/Code';

export { Button } from './components/Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './components/Button';
```

### Step 7.2: Modify `packages/design-system/AGENTS.md`

Insert a new top-level Typography section BEFORE the `<Button>` section. The Button section header is at line 34 (`### \`<Button>\` — action triggers`). The new content goes immediately before that line.

- [ ] Read the AGENTS.md region around the Button section so the `old_string` matches uniquely. Look for the boundary right before line 34. The current file has:

```markdown
Each component is fully JSDoc'd. Hover any usage in your editor for inline docs including `@example` blocks, `@remarks` "When NOT to use" and "Anti-patterns" sections. The summaries below are for orientation only — the **JSDoc is the contract**.

### `<Button>` — action triggers
```

- [ ] Edit (use `replace_all: false`):

**old_string:**

```markdown
Each component is fully JSDoc'd. Hover any usage in your editor for inline docs including `@example` blocks, `@remarks` "When NOT to use" and "Anti-patterns" sections. The summaries below are for orientation only — the **JSDoc is the contract**.

### `<Button>` — action triggers
```

**new_string:**

````markdown
Each component is fully JSDoc'd. Hover any usage in your editor for inline docs including `@example` blocks, `@remarks` "When NOT to use" and "Anti-patterns" sections. The summaries below are for orientation only — the **JSDoc is the contract**.

### `<Title>` — semantic heading

```tsx
<Title order={1}>Dashboard</Title>
<Title order={2}>Recent activity</Title>
<Title order={3} tone="muted">Filter group</Title>
<Title order={2} size="lg">Visually compact h2</Title>
```

- `order: 1 | 2 | 3 | 4 | 5 | 6` — required. Renders `<h1>` … `<h6>` AND drives the default visual size.
- Default size map: `1→3xl`, `2→2xl`, `3→xl`, `4→lg`, `5→md`, `6→sm`. Override with `size` (same vocab: `xs | sm | md | lg | xl | 2xl | 3xl`).
- `tone`: `default | muted | subtle | accent | danger`.
- `weight`: `regular | medium | semibold | bold` (default `semibold`).
- `truncate`: single-line ellipsis.
- **Use `<Title>` for every heading in your UI.** Raw `<h1>` / `<h2>` is forbidden.

### `<Text>` — body / inline text

```tsx
<Text>Default body — block <p>, md, regular.</Text>
<Text as="span" size="sm" tone="muted">12m ago</Text>
<Text as="label" htmlFor="email" weight="medium">Email</Text>
<Text lineClamp={2}>A long description that wraps and ellipses after two lines.</Text>
<Text size="sm" tone="danger">Email is required.</Text>
```

- `as: 'p' | 'span' | 'div' | 'label'` (default `'p'`). Constrained string union — no polymorphic generic.
- `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'` (default `'md'`).
- `tone`: `default | muted | subtle | accent | danger | success | warning`.
- `weight`: `regular | medium | semibold | bold` (default `regular`).
- `align`: `left | center | right` (default `left`).
- `truncate`: single-line ellipsis. `lineClamp: number`: multi-line ellipsis. `lineClamp` overrides `truncate`.
- **Use `<Text>` for every non-heading run.** No more `<span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>`.

### `<Code>` — inline `<code>` chip

```tsx
<Text>Use <Code>npm install</Code> to add deps.</Text>
<Code tone="danger">--no-verify</Code>
```

- `tone`: `default | muted | accent | danger` (only the text color changes; chip background stays the same).
- **Inline only.** Block code with syntax highlighting belongs in the playground's `CodeBlock` (Prism), not the library.

### Typography hard rule

- ❌ `style={{ fontSize: 'var(--font-size-sm)' }}` / `style={{ color: 'var(--color-fg-muted)' }}` — use `<Text size="sm" tone="muted">`.
- ❌ Raw `<h1>` / `<h2>` / `<h3>` — use `<Title order={N}>`.
- ❌ `<Text style={{ color: '#someHex' }}>` — pick a tone from the whitelist.
- If the size / tone / weight you need isn't on `<Title>` or `<Text>`, **that's a token-vocabulary conversation, not a component-skipping conversation.**

### `<Button>` — action triggers
````

### Step 7.3: Verify gates

- [ ] Run `make build-lib`. Expected: clean (the new re-exports must resolve).
- [ ] Run `make build`. Expected: clean (playground typechecks against the new exports).

### Step 7.4: Commit

```bash
git add packages/design-system/src/index.ts packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
Typography: barrel re-exports + AGENTS.md section

Re-exports Title/Text/Code + all type unions from the package root. New
Typography section in AGENTS.md (placed before <Button> since text is the
most atomic primitive) with examples and a "hard rule" anti-pattern list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Playground demos + 4-place wiring

**Files:**

- Create: `packages/playground/src/pages/components/TitleDemo.tsx`
- Create: `packages/playground/src/pages/components/TextDemo.tsx`
- Create: `packages/playground/src/pages/components/CodeDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

### Step 8.1: Create `TitleDemo.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { Title } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Title/Title.tsx?raw';
import scssSource from '@lib-source/components/Title/Title.module.scss?raw';

export function TitleDemo() {
  return (
    <DemoLayout
      name="Title"
      description="Semantic heading primitive. Renders <h1>-<h6> from the required `order` prop. Use for every heading in your UI."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Title.tsx"
      scssFilename="Title.module.scss"
      componentName="Title"
    >
      <Example
        title="Orders 1-6"
        description="The required `order` prop drives both the rendered element (h1-h6) and the default visual size (1→3xl, 2→2xl, 3→xl, 4→lg, 5→md, 6→sm)."
        code={`<Title order={1}>Order 1 (h1, 3xl)</Title>
<Title order={2}>Order 2 (h2, 2xl)</Title>
<Title order={3}>Order 3 (h3, xl)</Title>
<Title order={4}>Order 4 (h4, lg)</Title>
<Title order={5}>Order 5 (h5, md)</Title>
<Title order={6}>Order 6 (h6, sm)</Title>`}
      >
        <Stack gap="sm">
          <Title order={1}>Order 1 (h1, 3xl)</Title>
          <Title order={2}>Order 2 (h2, 2xl)</Title>
          <Title order={3}>Order 3 (h3, xl)</Title>
          <Title order={4}>Order 4 (h4, lg)</Title>
          <Title order={5}>Order 5 (h5, md)</Title>
          <Title order={6}>Order 6 (h6, sm)</Title>
        </Stack>
      </Example>

      <Example
        title="Size override"
        description="Pass `size` to decouple the visual size from the semantic level. Useful when a nested section still needs the right h-level for SR but a smaller visual treatment."
        code={`<Title order={2}>Default h2 (2xl)</Title>
<Title order={2} size="lg">h2 with size="lg"</Title>
<Title order={2} size="md">h2 with size="md"</Title>`}
      >
        <Stack gap="sm">
          <Title order={2}>Default h2 (2xl)</Title>
          <Title order={2} size="lg">
            h2 with size="lg"
          </Title>
          <Title order={2} size="md">
            h2 with size="md"
          </Title>
        </Stack>
      </Example>

      <Example
        title="Tones"
        description="Five tones map to --color-fg / -muted / -subtle / --color-accent / --color-danger."
        code={`<Title order={3} tone="default">default</Title>
<Title order={3} tone="muted">muted</Title>
<Title order={3} tone="subtle">subtle</Title>
<Title order={3} tone="accent">accent</Title>
<Title order={3} tone="danger">danger</Title>`}
      >
        <Stack gap="sm">
          <Title order={3} tone="default">
            default
          </Title>
          <Title order={3} tone="muted">
            muted
          </Title>
          <Title order={3} tone="subtle">
            subtle
          </Title>
          <Title order={3} tone="accent">
            accent
          </Title>
          <Title order={3} tone="danger">
            danger
          </Title>
        </Stack>
      </Example>

      <Example
        title="Weights"
        description="Four weights. Default for Title is `semibold`."
        code={`<Title order={3} weight="regular">regular</Title>
<Title order={3} weight="medium">medium</Title>
<Title order={3} weight="semibold">semibold (default)</Title>
<Title order={3} weight="bold">bold</Title>`}
      >
        <Stack gap="sm">
          <Title order={3} weight="regular">
            regular
          </Title>
          <Title order={3} weight="medium">
            medium
          </Title>
          <Title order={3} weight="semibold">
            semibold (default)
          </Title>
          <Title order={3} weight="bold">
            bold
          </Title>
        </Stack>
      </Example>

      <Example
        title="Truncate"
        description="Single-line ellipsis inside a narrow container. The full text remains in the accessibility tree."
        code={`<div style={{ width: 200 }}>
  <Title order={3} truncate>A very long title that exceeds the container width</Title>
</div>`}
      >
        <Cluster gap="md" align="start">
          <div style={{ width: 200, border: '1px dashed var(--color-border)', padding: 8 }}>
            <Title order={3} truncate>
              A very long title that exceeds the container width
            </Title>
          </div>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
```

### Step 8.2: Create `TextDemo.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { Text } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Text/Text.tsx?raw';
import scssSource from '@lib-source/components/Text/Text.module.scss?raw';

export function TextDemo() {
  return (
    <DemoLayout
      name="Text"
      description="Body / inline text primitive. Constrained-as (p/span/div/label). Use for every non-heading run — stop reaching for raw <p> + style={{ fontSize: ... }}."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Text.tsx"
      scssFilename="Text.module.scss"
      componentName="Text"
    >
      <Example
        title="Sizes"
        description="Five sizes from --font-size-xs (11px) to --font-size-xl (20px). Default is `md` (14px)."
        code={`<Text size="xs">xs — 11px, dense metadata</Text>
<Text size="sm">sm — 12px, small body / labels</Text>
<Text size="md">md — 14px, body (default)</Text>
<Text size="lg">lg — 16px, large body</Text>
<Text size="xl">xl — 20px, very large body</Text>`}
      >
        <Stack gap="xs">
          <Text size="xs">xs — 11px, dense metadata</Text>
          <Text size="sm">sm — 12px, small body / labels</Text>
          <Text size="md">md — 14px, body (default)</Text>
          <Text size="lg">lg — 16px, large body</Text>
          <Text size="xl">xl — 20px, very large body</Text>
        </Stack>
      </Example>

      <Example
        title="As variants"
        description="Constrained-as dispatch — exactly four rendered elements. <p> (block, default), <span> (inline), <div> (block, no <p> nesting constraints), <label> (pair with htmlFor)."
        code={`<Text>Default — renders <p></Text>
<Text as="span">as="span" — renders inline <span></Text>
<Text as="div">as="div" — renders block <div></Text>
<Text as="label" htmlFor="email-demo">as="label" htmlFor — renders <label></Text>
<Input id="email-demo" placeholder="Email" />`}
      >
        <Stack gap="sm" align="start">
          <Text>Default — renders &lt;p&gt;</Text>
          <Text as="span">as="span" — renders inline &lt;span&gt;</Text>
          <Text as="div">as="div" — renders block &lt;div&gt;</Text>
          <Text as="label" htmlFor="email-demo">
            as="label" htmlFor — renders &lt;label&gt;
          </Text>
          <Input id="email-demo" placeholder="Email" />
        </Stack>
      </Example>

      <Example
        title="Tones"
        description="Seven tones: default + muted + subtle (foreground variants), accent, plus state-coded danger / success / warning."
        code={`<Text tone="default">default</Text>
<Text tone="muted">muted</Text>
<Text tone="subtle">subtle</Text>
<Text tone="accent">accent</Text>
<Text tone="danger">danger</Text>
<Text tone="success">success</Text>
<Text tone="warning">warning</Text>`}
      >
        <Stack gap="xs">
          <Text tone="default">default</Text>
          <Text tone="muted">muted</Text>
          <Text tone="subtle">subtle</Text>
          <Text tone="accent">accent</Text>
          <Text tone="danger">danger</Text>
          <Text tone="success">success</Text>
          <Text tone="warning">warning</Text>
        </Stack>
      </Example>

      <Example
        title="Weights"
        description="Four weights. Default for Text is `regular`."
        code={`<Text weight="regular">regular (default)</Text>
<Text weight="medium">medium</Text>
<Text weight="semibold">semibold</Text>
<Text weight="bold">bold</Text>`}
      >
        <Stack gap="xs">
          <Text weight="regular">regular (default)</Text>
          <Text weight="medium">medium</Text>
          <Text weight="semibold">semibold</Text>
          <Text weight="bold">bold</Text>
        </Stack>
      </Example>

      <Example
        title="Alignment"
        description="Text-align applied via class — left / center / right."
        code={`<Text align="left">left aligned</Text>
<Text align="center">center aligned</Text>
<Text align="right">right aligned</Text>`}
      >
        <Stack gap="xs" style={{ width: 360 }}>
          <Text align="left">left aligned</Text>
          <Text align="center">center aligned</Text>
          <Text align="right">right aligned</Text>
        </Stack>
      </Example>

      <Example
        title="Truncate"
        description="Single-line ellipsis. The full text remains in the accessibility tree."
        code={`<div style={{ width: 240 }}>
  <Text truncate>A long single line that will be ellipsed when it overflows the parent.</Text>
</div>`}
      >
        <div style={{ width: 240, border: '1px dashed var(--color-border)', padding: 8 }}>
          <Text truncate>
            A long single line that will be ellipsed when it overflows the parent.
          </Text>
        </div>
      </Example>

      <Example
        title="Line clamp"
        description="Multi-line ellipsis via `lineClamp={N}` — uses CSS -webkit-line-clamp (the dynamic value is set inline)."
        code={`<div style={{ width: 320 }}>
  <Text lineClamp={2}>
    A long paragraph that wraps onto multiple lines, but we want to ellipsis
    after exactly two lines so the surrounding card has a predictable height.
  </Text>
</div>`}
      >
        <div style={{ width: 320, border: '1px dashed var(--color-border)', padding: 8 }}>
          <Text lineClamp={2}>
            A long paragraph that wraps onto multiple lines, but we want to ellipsis after exactly
            two lines so the surrounding card has a predictable height. This sentence is here just
            to make sure the text overflows so the clamp visibly fires in the demo.
          </Text>
        </div>
      </Example>

      <Example
        title="Composing with <Code>"
        description="<Code> is inline by default and scales with the surrounding text (uses --font-size-code, a relative 0.92em)."
        code={`<Text>Run <Code>npm install</Code> to add a dependency.</Text>
<Text size="sm">In dev mode, set <Code>VITE_BASE_PATH=/</Code> to serve from root.</Text>`}
      >
        <Cluster gap="md" align="start">
          <Stack gap="xs" style={{ maxWidth: 360 }}>
            <Text>
              Run <Code>npm install</Code> to add a dependency.
            </Text>
            <Text size="sm">
              In dev mode, set <Code>VITE_BASE_PATH=/</Code> to serve from root.
            </Text>
          </Stack>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
```

### Step 8.3: Create `CodeDemo.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { Code } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Code/Code.tsx?raw';
import scssSource from '@lib-source/components/Code/Code.module.scss?raw';

export function CodeDemo() {
  return (
    <DemoLayout
      name="Code"
      description="Inline <code> chip — monospace text with a subtle background. Inline only; block code with syntax highlighting lives in the playground's CodeBlock (Prism)."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Code.tsx"
      scssFilename="Code.module.scss"
      componentName="Code"
    >
      <Example
        title="Inline inside text"
        description="The default chip — used as part of a sentence."
        code={`<Text>The variable <Code>userId</Code> is required.</Text>
<Text>Use <Code>npm install</Code> to add a dependency.</Text>`}
      >
        <Stack gap="xs">
          <Text>
            The variable <Code>userId</Code> is required.
          </Text>
          <Text>
            Use <Code>npm install</Code> to add a dependency.
          </Text>
        </Stack>
      </Example>

      <Example
        title="Tones"
        description="Four tones change only the text color — the chip background stays the same."
        code={`<Code tone="default">default()</Code>
<Code tone="muted">muted()</Code>
<Code tone="accent">accent()</Code>
<Code tone="danger">danger()</Code>`}
      >
        <Cluster gap="sm">
          <Code tone="default">default()</Code>
          <Code tone="muted">muted()</Code>
          <Code tone="accent">accent()</Code>
          <Code tone="danger">danger()</Code>
        </Cluster>
      </Example>

      <Example
        title="Standalone"
        description="A <Code> outside a surrounding <Text>. The chip uses var(--font-size-code), which is 0.92em — so a standalone Code inherits the document's base font-size and scales accordingly."
        code={`<Code>fetch('/api/users')</Code>`}
      >
        <Code>fetch('/api/users')</Code>
      </Example>
    </DemoLayout>
  );
}
```

### Step 8.4: Modify `App.tsx` — add 3 imports + 3 routes

- [ ] Read the current imports + Routes block in `packages/playground/src/App.tsx` (covered earlier — see lines 1–107).

- [ ] Edit 1 (add the 3 imports — insert alphabetically near the existing component imports). Use the Edit tool with `replace_all: false`.

**old_string:**

```tsx
import { CardDemo } from './pages/components/CardDemo';
```

**new_string:**

```tsx
import { CardDemo } from './pages/components/CardDemo';
import { CodeDemo } from './pages/components/CodeDemo';
import { TextDemo } from './pages/components/TextDemo';
import { TitleDemo } from './pages/components/TitleDemo';
```

- [ ] Edit 2 (add the 3 routes — insert alphabetically near related routes).

**old_string:**

```tsx
<Route path="/components/card" element={<CardDemo />} />
```

**new_string:**

```tsx
          <Route path="/components/card" element={<CardDemo />} />
          <Route path="/components/code" element={<CodeDemo />} />
          <Route path="/components/text" element={<TextDemo />} />
          <Route path="/components/title" element={<TitleDemo />} />
```

### Step 8.5: Modify `AppShell.tsx` — add icons + nav items

The Typography sections fit best in the `Display` group (alphabetical: Avatar / Badge / Calendar / Code / EmptyState / Pagination / Skeleton / Table / DataTable / Text / Title). Lucide icons: `Heading` for Title, `Type` for Text, `Code` for Code.

- [ ] Edit 1 (add to the lucide imports). The existing import block already imports many icons; this Edit only adds three new ones.

**old_string:**

```tsx
  ListCollapse,
  MoveRight,
  ToggleRight,
  type LucideIcon,
} from 'lucide-react';
```

**new_string:**

```tsx
  ListCollapse,
  MoveRight,
  ToggleRight,
  Heading,
  Type,
  Code as CodeIcon,
  type LucideIcon,
} from 'lucide-react';
```

- [ ] Edit 2 (add the 3 items to the Display group, sorted alphabetically — Code slots between Calendar and EmptyState; Text slots between Table/DataTable and what follows; Title slots after Text).

**old_string:**

```tsx
  {
    heading: 'Display',
    items: [
      { to: '/components/avatar', label: 'Avatar', icon: CircleUser, end: false },
      { to: '/components/badge', label: 'Badge', icon: Tag, end: false },
      { to: '/components/calendar', label: 'Calendar', icon: CalendarDays, end: false },
      { to: '/components/empty-state', label: 'EmptyState', icon: Inbox, end: false },
      { to: '/components/pagination', label: 'Pagination', icon: ListOrdered, end: false },
      { to: '/components/skeleton', label: 'Skeleton', icon: Square, end: false },
      { to: '/components/table', label: 'Table', icon: TableIcon, end: false },
      { to: '/components/datatable', label: 'DataTable', icon: TableProperties, end: false },
    ],
  },
```

**new_string:**

```tsx
  {
    heading: 'Display',
    items: [
      { to: '/components/avatar', label: 'Avatar', icon: CircleUser, end: false },
      { to: '/components/badge', label: 'Badge', icon: Tag, end: false },
      { to: '/components/calendar', label: 'Calendar', icon: CalendarDays, end: false },
      { to: '/components/code', label: 'Code', icon: CodeIcon, end: false },
      { to: '/components/empty-state', label: 'EmptyState', icon: Inbox, end: false },
      { to: '/components/pagination', label: 'Pagination', icon: ListOrdered, end: false },
      { to: '/components/skeleton', label: 'Skeleton', icon: Square, end: false },
      { to: '/components/table', label: 'Table', icon: TableIcon, end: false },
      { to: '/components/datatable', label: 'DataTable', icon: TableProperties, end: false },
      { to: '/components/text', label: 'Text', icon: Type, end: false },
      { to: '/components/title', label: 'Title', icon: Heading, end: false },
    ],
  },
```

### Step 8.6: Modify `ComponentsIndex.tsx` — add 3 cards

- [ ] Edit 1 (add the imports — insert near the Card import).

**old_string:**

```tsx
import { Card } from '@eocrm/design-system';
```

**new_string:**

```tsx
import { Card } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Title } from '@eocrm/design-system';
```

- [ ] Edit 2 (add 3 entries to the `items` array, inserted in alphabetical order — Code after Cluster, Text/Title in their alphabetical slots). The exact entries to add:

  Find the Cluster entry first (search for `name: 'Cluster',` to locate the surrounding card). Insert the Code card AFTER the Cluster entry but BEFORE whatever comes next alphabetically (probably ConfirmationPopover or DataTable). Use this exact card shape:

```tsx
  {
    to: '/components/code',
    name: 'Code',
    description: 'Inline <code> chip — monospace text with subtle bg. Use for inline identifiers / snippets.',
    preview: (
      <Cluster gap="sm" justify="center">
        <Code>userId</Code>
        <Code tone="danger">--no-verify</Code>
      </Cluster>
    ),
  },
```

Find the Tabs entry (search `name: 'Tabs',`). Insert the Text card AFTER it (Text is alphabetically just after Tabs):

```tsx
  {
    to: '/components/text',
    name: 'Text',
    description: 'Body / inline text primitive with size/tone/weight/align/truncate/lineClamp props.',
    preview: (
      <Stack gap="xs" align="center">
        <Text size="sm" tone="muted">12 minutes ago</Text>
        <Text weight="medium">Acme Inc</Text>
      </Stack>
    ),
  },
```

Insert the Title card AFTER Text (Title is alphabetically right after Text):

```tsx
  {
    to: '/components/title',
    name: 'Title',
    description: 'Semantic heading primitive — renders h1-h6 from the required `order` prop.',
    preview: (
      <Stack gap="xs" align="center">
        <Title order={3}>Dashboard</Title>
        <Title order={5} tone="muted">Subtitle</Title>
      </Stack>
    ),
  },
```

Because the exact alphabetical position depends on what other entries are around Tabs / Cluster in the current file, the implementer must read the file first and apply the Edit with enough surrounding context (the preceding and following card entries) to make `old_string` unique. **Pattern to follow:** for each new card, the `old_string` is the entire `{ ... },` block of the entry immediately before the insertion point, and the `new_string` is that same block plus the new card's `{ ... },` block.

### Step 8.7: Modify `registry.ts` — extend ComponentName union + Dashboard

- [ ] Edit 1 (extend `ComponentName` union — insert `Title`, `Text`, `Code` alphabetically):

**old_string:**

```ts
  | 'Cluster'
  | 'ConfirmationPopover'
```

**new_string:**

```ts
  | 'Cluster'
  | 'Code'
  | 'ConfirmationPopover'
```

**old_string:**

```ts
  | 'Textarea'
  | 'Toast'
  | 'Tooltip';
```

**new_string:**

```ts
  | 'Text'
  | 'Textarea'
  | 'Title'
  | 'Toast'
  | 'Tooltip';
```

- [ ] Edit 2 (extend Dashboard's `usesComponents` list — Dashboard will use Title + Text after the refactor in Task 9):

**old_string:**

```ts
    usesComponents: ['Card', 'Stack', 'Cluster', 'Avatar', 'Badge', 'Button'],
```

**new_string:**

```ts
    usesComponents: ['Card', 'Stack', 'Cluster', 'Avatar', 'Badge', 'Button', 'Link', 'Title', 'Text'],
```

(Note: `Link` is included because the Card.Header on Dashboard already uses `<Link>` for the "View all" action since the Card compound PR — it was missing from the registry. This Edit fixes that incidentally; verify it matches the current Dashboard imports before committing.)

### Step 8.8: Verify gates

- [ ] Run `make build`. Expected: clean. This is the playground typecheck + build — any missing imports surface here.
- [ ] Run `make lint`. Expected: clean.

### Step 8.9: Commit

```bash
git add packages/playground/src/pages/components/TitleDemo.tsx \
        packages/playground/src/pages/components/TextDemo.tsx \
        packages/playground/src/pages/components/CodeDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
Typography demos + 4-place wiring

TitleDemo (5 examples), TextDemo (8 examples), CodeDemo (3 examples). All
three wired into App.tsx routes, AppShell Display nav group, ComponentsIndex
overview cards, mockup registry ComponentName union. Dashboard's
usesComponents extended for Title/Text/Link.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Dashboard mockup refactor

**Files:**

- Modify: `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx`
- Modify: `packages/playground/src/pages/mockups/Dashboard/Dashboard.module.scss`

**Goal of this task:** every raw `<h1>`, `<h2>`, and inline-style `<span>` / `<p>` in Dashboard.tsx is replaced with `<Title>` / `<Text>`. The corresponding SCSS rules in Dashboard.module.scss are deleted. Layout-only SCSS rules (`.statsGrid`, `.twoCol`, `.contactGrid`, `.statIcon`) are preserved.

### Step 9.1: Modify `Dashboard.tsx`

- [ ] Edit 1 — add Text + Title to the imports.

**old_string:**

```tsx
import { Card } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Link } from '@eocrm/design-system';
```

**new_string:**

```tsx
import { Card } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Link } from '@eocrm/design-system';
import { Title } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
```

- [ ] Edit 2 — replace the page header (h1 + subtitle paragraph).

**old_string:**

```tsx
<div>
  <h1 className={styles.title}>Dashboard</h1>
  <p className={styles.subtitle}>Good morning, Alex. Here's where your pipeline stands.</p>
</div>
```

**new_string:**

```tsx
<div>
  <Title order={1}>Dashboard</Title>
  <Text size="md" tone="muted">
    Good morning, Alex. Here's where your pipeline stands.
  </Text>
</div>
```

- [ ] Edit 3 — replace the stat card labels and values (inside the `stats.map` block).

**old_string:**

```tsx
<Stack gap="xs">
  <span className={styles.statLabel}>{label}</span>
  <span className={styles.statValue}>{value}</span>
  <Badge tone={deltaTone}>
    <ArrowUpRight size={10} /> {delta}
  </Badge>
</Stack>
```

**new_string:**

```tsx
<Stack gap="xs">
  <Text as="span" size="sm" tone="muted" weight="medium">
    {label}
  </Text>
  <Text as="span" size="2xl" weight="semibold">
    {value}
  </Text>
  <Badge tone={deltaTone}>
    <ArrowUpRight size={10} /> {delta}
  </Badge>
</Stack>
```

**Note:** `<Text size="2xl">` is intentionally outside the spec's Text size range (xs..xl). This is a deliberate exception flagged here: the statValue currently uses `font-size-2xl` (24px), which is heading-territory. The right primitive is `<Title order={2}>` (h2, 2xl). But a stat value is NOT semantically a heading — it's a piece of data. After looking at the options, the implementer should choose:

**Option A (recommended, cleanest):** use `<Text as="span" size="lg" weight="semibold">` — the statValue downsizes from 24px to 16px. Slightly smaller than today but semantically correct (lg is the upper bound of body text). The stat cards have always been visually loud; this brings them into the body-text scale.

**Option B:** add `'2xl' | '3xl'` to `TextSize` to support stat-value-style emphasis. Adds spec-divergence but matches the prior visual exactly.

**Decision for this plan:** go with Option A. Use `size="lg"`. If the user objects after seeing the live mockup, we revisit and bump TextSize. Update the edit accordingly:

**Corrected new_string for Edit 3:**

```tsx
<Stack gap="xs">
  <Text as="span" size="sm" tone="muted" weight="medium">
    {label}
  </Text>
  <Text as="span" size="lg" weight="semibold">
    {value}
  </Text>
  <Badge tone={deltaTone}>
    <ArrowUpRight size={10} /> {delta}
  </Badge>
</Stack>
```

- [ ] Edit 4 — replace `listRowTitle` and `listRowMeta` spans in the Deals card.

**old_string:**

```tsx
<Stack gap="xs">
  <Cluster gap="sm">
    <span className={styles.listRowTitle}>{d.title}</span>
    {d.tags.map((t) => (
      <Badge key={t.label} tone={t.tone}>
        {t.label}
      </Badge>
    ))}
  </Cluster>
  <span className={styles.listRowMeta}>
    {d.company} · ${d.amount.toLocaleString()}
  </span>
</Stack>
```

**new_string:**

```tsx
<Stack gap="xs">
  <Cluster gap="sm">
    <Text as="span" weight="medium">
      {d.title}
    </Text>
    {d.tags.map((t) => (
      <Badge key={t.label} tone={t.tone}>
        {t.label}
      </Badge>
    ))}
  </Cluster>
  <Text as="span" size="sm" tone="subtle">
    {d.company} · ${d.amount.toLocaleString()}
  </Text>
</Stack>
```

- [ ] Edit 5 — replace the activity line spans.

**old_string:**

```tsx
<Cluster gap="sm" wrap={false} align="start">
  <Avatar name={a.who} size="sm" />
  <Stack gap="xs">
    <span className={styles.activityLine}>
      <strong>{a.who}</strong> {a.what} <span className={styles.activityTarget}>{a.target}</span>
    </span>
    <span className={styles.listRowMeta}>{a.when}</span>
  </Stack>
</Cluster>
```

**new_string:**

```tsx
<Cluster gap="sm" wrap={false} align="start">
  <Avatar name={a.who} size="sm" />
  <Stack gap="xs">
    <Text as="span" size="sm" tone="muted">
      <strong>{a.who}</strong> {a.what}{' '}
      <Text as="span" tone="accent">
        {a.target}
      </Text>
    </Text>
    <Text as="span" size="sm" tone="subtle">
      {a.when}
    </Text>
  </Stack>
</Cluster>
```

**Note on nested `<Text>`:** the activity line has an inner `<Text as="span" tone="accent">` nested inside an outer `<Text as="span" size="sm" tone="muted">`. The nested Text inherits the outer size (no explicit `size`) — the nested only overrides tone. This composition is valid: nesting `<span>` inside `<span>` is legal HTML and the inner element's class wins for tone color. Confirm the rendered output looks right in the playground before pushing.

- [ ] Edit 6 — replace the "Recent contacts" h2 + contact name/title spans.

**old_string:**

```tsx
<Card padding="md">
  <h2 className={styles.cardTitle}>Recent contacts</h2>
  <div className={styles.contactGrid}>
    {contacts.slice(0, 4).map((c) => (
      <Cluster key={c.id} gap="sm" wrap={false} align="center">
        <Avatar name={c.name} size="md" />
        <Stack gap="xs">
          <span className={styles.contactName}>{c.name}</span>
          <span className={styles.listRowMeta}>{c.title}</span>
        </Stack>
      </Cluster>
    ))}
  </div>
</Card>
```

**new_string:**

```tsx
<Card padding="md">
  <Stack gap="md">
    <Title order={2} size="md">
      Recent contacts
    </Title>
    <div className={styles.contactGrid}>
      {contacts.slice(0, 4).map((c) => (
        <Cluster key={c.id} gap="sm" wrap={false} align="center">
          <Avatar name={c.name} size="md" />
          <Stack gap="xs">
            <Text as="span" weight="medium">
              {c.name}
            </Text>
            <Text as="span" size="sm" tone="subtle">
              {c.title}
            </Text>
          </Stack>
        </Cluster>
      ))}
    </div>
  </Stack>
</Card>
```

**Note on h2 size override:** the previous `<h2 className={styles.cardTitle}>` SCSS sized this heading at `var(--font-size-md)` (14px) — much smaller than h2's default of `2xl` (24px). Preserving that visual requires the `size="md"` override on `<Title order={2}>`. This is exactly the case the `size` override exists for.

Also wraps the content in `<Stack gap="md">` so the title + grid have spacing (the previous CSS gave `.contactGrid` a `margin-top: var(--space-3)` which is forbidden by Rule 4 anyway and will be deleted in step 9.2).

### Step 9.2: Modify `Dashboard.module.scss`

Delete typography-only rules. Keep layout-only rules. Read the current file first.

- [ ] Edit 1 — delete `.title`.

**old_string:**

```scss
.title {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg);
}

// Section heading for non-list cards (e.g. Recent contacts) where the
// Card.Header subcomponent's border-bottom + padding don't fit.
.cardTitle {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg);
}

.subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-md);
}
```

**new_string:** (empty — these classes are all replaced by Title/Text)

```scss

```

- [ ] Edit 2 — delete `.statLabel`, `.statValue`.

**old_string:**

```scss
.statLabel {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-medium);
}

.statValue {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg);
  line-height: var(--line-height-tight);
}
```

**new_string:** (empty)

```scss

```

- [ ] Edit 3 — delete `.listRowTitle`, `.listRowMeta`, `.activityLine`, `.activityTarget`.

**old_string:**

```scss
.listRowTitle {
  font-weight: var(--font-weight-medium);
  color: var(--color-fg);
}

.listRowMeta {
  font-size: var(--font-size-sm);
  color: var(--color-fg-subtle);
}

.activityLine {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
  line-height: var(--line-height-normal);
}

.activityTarget {
  color: var(--color-accent);
}
```

**new_string:** (empty)

```scss

```

- [ ] Edit 4 — delete `.contactName` and drop `margin-top` from `.contactGrid` (margin is forbidden by Rule 4; the wrapping `<Stack>` now provides the gap).

**old_string:**

```scss
.contactGrid {
  margin-top: var(--space-3);
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.contactName {
  font-weight: var(--font-weight-medium);
  color: var(--color-fg);
}
```

**new_string:**

```scss
.contactGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}
```

**What remains in Dashboard.module.scss after these edits:** `.statsGrid`, `.statIcon`, `.twoCol`, `.contactGrid`, plus the `@media` block at the bottom. All pure layout. No typography classes. Verify by re-reading the file after the edits.

### Step 9.3: Verify gates

- [ ] Run `make build`. Expected: clean. Any leftover reference to a deleted SCSS class (e.g. an `<X className={styles.listRowTitle}>` we missed) surfaces here as `TS18048` or similar.
- [ ] Run `make lint`. Expected: clean.
- [ ] Run `make up` for 10–15 seconds and load `http://localhost:8090/components/title`, `/components/text`, `/components/code`, `/mockups/dashboard`. Eyeball each:
  - Title demo: all 6 orders visible, weights & tones swatches readable, truncate row clips inside the 200px container.
  - Text demo: all sizes visible, tone swatches readable, lineClamp clamps to 2 lines, Code-composition row shows inline code.
  - Code demo: chip visible with subtle bg, 4 tones differ only in text color.
  - Dashboard: page heading still h1-sized, subtitle muted body text, stat cards visually intact (label small/muted, value bold), Deals list rows show medium-weight title + sm/subtle meta, Recent activity preserves <strong> emphasis + accent target, Recent contacts h2 is small (md size) like before.

  Don't claim "task done" without doing this visual check. If anything looks visually wrong, stop and fix before committing.

### Step 9.4: Commit

```bash
git add packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx \
        packages/playground/src/pages/mockups/Dashboard/Dashboard.module.scss
git commit -m "$(cat <<'EOF'
Dashboard: refactor raw h1/h2/inline-style spans to <Title>/<Text>

Replaces all hand-rolled typography in the Dashboard mockup with the new
primitives. statValue size drops from 2xl→lg (Text doesn't expose 2xl; if a
24px stat value is needed, that's a TextSize-vocabulary conversation).
Recent contacts h2 uses Title order={2} size="md" to preserve the previously
hand-rolled small-heading look.

Deletes .title / .subtitle / .cardTitle / .statLabel / .statValue /
.listRowTitle / .listRowMeta / .activityLine / .activityTarget / .contactName
and the margin-top on .contactGrid (margin is forbidden by Rule 4; the new
Stack wrapper supplies the gap).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Hard Rule 8 review-fix cycle + push + PR

**Files:** none directly — this task is the review loop on the work shipped in Tasks 1–9.

### Step 10.1: Run all four gates from the repo root

- [ ] `cd /home/dpws/projects/design-system && make test`. Expected: every test passes (Card 32 + new Title ~13 + new Text ~16 + new Code ~8 = library suite grows by ~37 tests; total should be ~1572 or whatever 1535 + 37 lands at).
- [ ] `make build-lib`. Expected: clean.
- [ ] `make build`. Expected: clean (the playground also typechecks against the new exports).
- [ ] `make lint`. Expected: clean.

  If any gate fails, fix and re-run all four. Don't proceed to step 10.2 until all are green.

### Step 10.2: Dispatch the HR8 reviewer (round 1)

Use a fresh-context `general-purpose` agent. Brief it on the 10 review categories from `packages/design-system/CLAUDE.md` Rule 8: bugs, a11y, API inconsistencies, type safety, rule violations (Rules 1–7), test coverage, token discipline, SCSS, cross-package leakage, package/distribution.

**Particular things to ask for fresh eyes on:**

1. **Constrained-as vs polymorphic-`as`** — `<Text>` uses a string union, `<Link>` uses a polymorphic generic. Is the inconsistency justified, or should `<Text>` also be polymorphic for symmetry with Link?
2. **TextSize doesn't include 2xl/3xl** — Dashboard stat values had to downsize from 2xl→lg. Is that the right call (Text is body, headings are headings — keep the split) or did we over-constrain?
3. **`size` override on `<Title>`** — Mantine has `size="h1"|"h2"|...` so size always references heading vocabulary; we have `size="xs"..."3xl"` so it's the token vocabulary. Either works; is one more discoverable in the IDE for an unfamiliar consumer?
4. **`lineClamp` inline style** — setting `WebkitLineClamp` inline is the only path for a dynamic value; is the consumer-style merge in Text.tsx safe (the dynamic value comes after `...style` so it always wins — but a consumer who explicitly sets `WebkitLineClamp` in their own style would expect their value to be used)? Worth flagging the precedence in JSDoc.
5. **JSDoc completeness** — does every exported member (component, props interface, union type) have JSDoc per Rule 7?
6. **Stylelint disables** — every `margin: 0` / `padding: 0 var(--space-1)` should have the `// stylelint-disable-next-line property-disallowed-list -- <reason>` comment on the immediately-preceding line. Verify.
7. **Nested `<Text>` in Dashboard's activity line** — `<Text as="span" tone="accent">` nested in `<Text as="span" size="sm" tone="muted">`. The outer's `size` and `weight` classes are applied to the outer span; the inner span has its own `size="md"` (default) and `weight="regular"` (default) classes which would override the inherited values. Is that the visual we want, or should the inner just be a `<strong>` or a raw `<span>`?
8. **Dashboard stat value downsize** — 24px→16px is a visible change. Is the regression-watch item, "stat cards visually less loud than before," intentional? (My take: yes, it's a deliberate reset away from the old 2xl which fought the stat-card hierarchy. But the user should sign off after seeing it live.)

Output format: Critical / Important / Nice-to-have / Regression-watch + a final verdict line: `clean enough to stop` or `keep iterating`.

### Step 10.3: Fix every Critical + Important finding

- [ ] For each Critical, fix it in-line and commit with `Typography: HR8 review-cycle fixes (round N) — <short rationale>`.
- [ ] For each Important, same treatment.
- [ ] Nice-to-haves are judgment calls — fix when cheap.
- [ ] For every finding deliberately skipped, include a one-line "why we skipped" in the next response so the next reviewer doesn't re-flag it.

### Step 10.4: Re-run all four gates after fixes

- [ ] `make test && make build-lib && make build && make lint`. Expected: all clean.

### Step 10.5: Dispatch HR8 reviewer (round 2+)

Same prompt as 10.2 but framed as "round N — verify round (N-1) fixes". Continue the cycle until the verdict is `clean enough to stop`.

### Step 10.6: Push the branch

- [ ] `git push -u origin feat/typography`. If the pre-push husky hook fails on `format:check`:
  1. `npx prettier --write <listed files>`
  2. `git add <files> && git commit -m "Typography: prettier --write" -m "" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`
  3. `git push`

### Step 10.7: Open the PR

```bash
gh pr create --title "Typography: Title + Text + Code + Dashboard refactor" --body "$(cat <<'EOF'
## Summary

Three new typography primitives + Dashboard mockup refactor that proves they do their job.

- **`<Title order={1..6}>`** — semantic heading. Renders `<h1>`–`<h6>`. Default visual size from order (1→3xl, 2→2xl, …, 6→sm). Size override decouples visual size from semantic level. Five tones, four weights, single-line truncate.
- **`<Text as="p|span|div|label">`** — body / inline text. Constrained-as (no polymorphic generic — that's `<Link>`'s job). Five sizes, seven tones (incl. success/warning), four weights, three alignments. `truncate` for single-line; `lineClamp={N}` for multi-line (uses `-webkit-line-clamp` with a dynamic inline-style value).
- **`<Code>`** — inline `<code>` chip with monospace + subtle bg. Four tones (text color only — chip bg stays). Inline-only; block code is the playground's `CodeBlock`, not a library concern.

## Why now

15+ files in the playground had raw `style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}` inline patterns. Dashboard had hand-rolled `.title` / `.cardTitle` / `.statValue` SCSS rules. Without primitives, every new mockup reintroduces the anti-pattern.

## Dashboard refactor (in scope)

Replaced all raw `<h1>` / `<h2>` / inline-style `<span>` / `<p>` in the Dashboard mockup with `<Title>` / `<Text>`. Deleted 10 typography-only SCSS rules from `Dashboard.module.scss`. Only layout-only rules remain (`.statsGrid`, `.statIcon`, `.twoCol`, `.contactGrid`).

One intentional visual change: stat values downsized from 24px (`--font-size-2xl`) to 16px (`--font-size-lg`). `<Text>` doesn't expose `2xl/3xl` — those are heading sizes, and a stat value isn't a heading. If a 24px stat-value treatment is required, that's a Text-size vocabulary conversation, not a typography-primitive conversation.

## Test plan

- [ ] All Title orders render the right `<hN>` tag (DOM check).
- [ ] Title default sizes match the order map (1→3xl, …, 6→sm).
- [ ] Title `size` override decouples visual size from semantic level.
- [ ] Text default is `<p>`; `as="span"|"div"|"label"` renders the right element.
- [ ] Text `lineClamp={N}` sets `style.WebkitLineClamp` correctly; `lineClamp` overrides `truncate`.
- [ ] Text `lineClamp={0}` is ignored (no class, no style).
- [ ] Code renders `<code>`, four tones, composes inline inside Text.
- [ ] Dashboard mockup looks visually correct: h1 page title, muted subtitle, stat cards readable, Deals list rows preserved, activity feed `<strong>` emphasis + accent target preserved, Recent contacts h2 small (16px) like before.
- [ ] AGENTS.md Typography section is the first component section (above Button).
- [ ] No new raw-`<h*>` or inline-style typography appears in the playground (grep check).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] Print the PR URL when done.

---

## Self-review (run before invoking subagent-driven-development)

### Spec coverage

Every spec section maps to a task:

- Spec §Goal / §Why now — Task 9 (Dashboard refactor proves the goal); Tasks 7+8 (AGENTS.md + demos) make the primitives discoverable.
- Spec §Non-goals — encoded into the API surfaces in Tasks 1, 3, 5 (no semantic-variant prop, no italic/transform, no polymorphic generic on Text, no block Code, no Kbd, no order={0}).
- Spec §Architecture — file layout matches Task 1/3/5 (per-component dirs); composition example matches the Text+Title+Code combination in TaskDemo.
- Spec §Public API — Title (Task 1), Text (Task 3), Code (Task 5). All exported types named exactly as in the spec.
- Spec §Styling — every SCSS rule from the spec appears verbatim in Tasks 1, 3, 5.
- Spec §ARIA + semantics — covered by element-dispatch logic in Tasks 1/3/5; tests in Tasks 2/4/6 verify the rendered DOM.
- Spec §Testing — test files in Tasks 2, 4, 6 cover the spec's case counts.
- Spec §Demo additions — TitleDemo (5 examples), TextDemo (8 examples), CodeDemo (3 examples) in Task 8.
- Spec §Mockup cleanup — Task 9, the Dashboard refactor.
- Spec §AGENTS.md update — Task 7, new Typography section before `<Button>`.
- Spec §Self-imposed constraints — encoded in JSDoc and code in Tasks 1, 3, 5.
- Spec §Hard Rule 8 — Task 10.
- Spec §Open questions — none, design space resolved during brainstorming. ✅

### Placeholder scan

- "TBD" / "TODO" / "implement later" / "fill in details" — none.
- "Add appropriate error handling" / "handle edge cases" — none.
- "Write tests for the above" without code — none (every test is fully spelled out in Task 2/4/6).
- "Similar to Task N" — none (each task has its own complete code blocks; even when the patterns repeat across Title/Text/Code, the code is fully written each time).

### Type consistency

- `TitleOrder`, `TitleSize`, `TitleTone`, `TitleWeight` — declared in Task 1; tested in Task 2; re-exported in Task 7; used in TitleDemo (Task 8); used in Dashboard refactor (Task 9). Consistent vocabulary throughout.
- `TextAs`, `TextSize`, `TextTone`, `TextWeight`, `TextAlign` — same pattern. Note `TextSize` is `xs|sm|md|lg|xl` (no 2xl/3xl) deliberately and is flagged in Task 9 step 9.1 Edit 3 as the reason for the statValue downsize.
- `CodeTone` — `default|muted|accent|danger`. Distinct from TextTone (no subtle/success/warning). Documented in spec and JSDoc.
- Class-mapping objects: `SIZE_CLASS`, `TONE_CLASS`, `WEIGHT_CLASS`, `ALIGN_CLASS` — keys are typed `Record<XxxSize, string>` etc. so the TypeScript compiler enforces the union-to-class mapping is complete.

### Found and fixed inline

- Earlier draft of Task 9 Edit 3 had `<Text size="2xl">` which doesn't exist in TextSize. Fixed to `size="lg"` and documented the decision.
- Task 8 ComponentsIndex.tsx ordering: deferred to runtime read because the implementer has to find the surrounding entries to make `old_string` unique. Documented the pattern explicitly.
- Task 8 mockup registry: `Link` was missing from Dashboard's `usesComponents` already (pre-existing bug); flagged as an incidental fix.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-05-24-typography.md`.

Per `feedback_plan_execution_mode` memory: always subagent-driven, no asking.

Use **superpowers:subagent-driven-development** to execute.

- Tasks 1–4, 8, 9: sonnet implementer
- Tasks 5, 6, 7: haiku implementer
- Task 10 reviewers: opus
