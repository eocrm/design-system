# `<Logo>` Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship a `<Logo>` library component (eocrm mark + optional wordmark beside/below), then refactor the Login mockup + AppShell to use it, delete the playground SVG asset, and tick the `TODO.md` entry.

**Architecture:** A `BrandIcon`-style inline-SVG component: baked eocrm mark (`fill="currentColor"`, color from `--logo-color` → `--color-accent`), optional wordmark `text`, `textPlacement` end/bottom, `size` sm/md/lg, `label` for mark-only a11y. Then consumers swap their raw `<img>` for `<Logo>`.

**Tech Stack:** React + TS + SCSS modules (`@eocrm/design-system`) + playground.

**Spec:** `docs/superpowers/specs/2026-06-05-logo-component-design.md`.

**Verified facts:** `#0052CC === --color-accent`; `--size-sm/md/lg` = 24/32/40; `--font-size-lg/xl` = 16/20 (no 2xl → a `--logo-text-size-lg: 24px` component token); stylelint `property-disallowed-list` blocks `margin*`/`flex-grow`/`flex-basis`/`align-self`/`grid-*` but NOT `flex-shrink`/`display`/`flex-direction`/`align-items`/`width`/`height`; `declaration-strict-value` governs only color/border/opacity (so `width`/`font-size`/`px` need no token). `BrandIcon` is cluster `Display` in both manifest maps. Recolor knob is the `--logo-color` CSS variable (component-token convention), not `color`.

---

## Task 1: `<Logo>` library component

**Files:** Create `packages/design-system/src/components/Logo/{Logo.tsx,Logo.module.scss,Logo.tokens.scss,Logo.test.tsx,index.ts}`; modify `src/index.ts`, both manifest CLUSTERS maps, `AGENTS.md`; regenerate `components.manifest.json`.

- [ ] **Step 1: `Logo.tsx`** — write exactly:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Logo.module.scss';

/** Mark size — `sm` (24) / `md` (32, default) / `lg` (40); the shared `--size-*` scale. */
export type LogoSize = 'sm' | 'md' | 'lg';

/** Where the wordmark sits relative to the mark. */
export type LogoTextPlacement = 'end' | 'bottom';

export interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Wordmark rendered beside (or below) the mark — consumers pass `"eocrm"`.
   * Omit for a mark-only logo.
   */
  text?: ReactNode;
  /**
   * Where the wordmark sits relative to the mark. Defaults to `'end'` (beside);
   * `'bottom'` stacks it under the mark, centered.
   */
  textPlacement?: LogoTextPlacement;
  /** Mark size — `'sm'` (24) / `'md'` (32, default) / `'lg'` (40). */
  size?: LogoSize;
  /**
   * Accessible name for the mark when there's no `text`. Omit for a decorative
   * mark (`aria-hidden`) or when `text` is present (the text is the name).
   */
  label?: string;
}

const sizeClass: Record<LogoSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

/**
 * The eocrm brand logo: the layered-hex mark, optionally with the `eocrm`
 * wordmark beside it (default) or below. The mark is a single-color inline SVG
 * that inherits `--logo-color` (defaults to `--color-accent`, the brand blue) —
 * override the `--logo-color` CSS variable to recolor it (e.g. on a dark surface).
 *
 * @example
 * // Mark + wordmark — the common app-header / auth lockup:
 * <Logo text="eocrm" size="lg" />
 *
 * @example
 * // Mark only — give it an accessible name when it stands alone:
 * <Logo label="eocrm" />
 *
 * @example
 * // Wordmark below the mark, centered:
 * <Logo text="eocrm" textPlacement="bottom" />
 *
 * @remarks When NOT to use
 * - For a third-party brand mark (Google / Yandex SSO) → use `<BrandIcon>`.
 * - For arbitrary content images → `<Image>`; for avatars → `<Avatar>`.
 *
 * @remarks Anti-patterns
 * - ❌ Passing both `text` and `label` — double-announces ("eocrm eocrm"). With
 *   `text` the mark is already decorative; `label` is only for mark-only logos.
 */
export const Logo = forwardRef<HTMLDivElement, LogoProps>(function Logo(
  { text, textPlacement = 'end', size = 'md', label, className, ...props },
  ref,
) {
  const labelled = text == null && label != null && label !== '';
  return (
    // Pattern A — props last: Logo is consumer-overridable brand chrome.
    <div
      ref={ref}
      className={clsx(
        styles.logo,
        sizeClass[size],
        textPlacement === 'bottom' && styles.bottom,
        className,
      )}
      {...props}
    >
      <svg
        className={styles.mark}
        viewBox="0 0 160 160"
        role={labelled ? 'img' : undefined}
        aria-label={labelled ? label : undefined}
        aria-hidden={labelled ? undefined : true}
      >
        {labelled && <title>{label}</title>}
        <path
          d="M127.441 135.999L95.8134 152L80 144L64.1857 152L32.5579 136L80 112L127.441 135.999Z"
          fill="currentColor"
        />
        <path
          d="M160 96V119.529L143.256 127.999L80 96L16.7436 128L0 119.529V96L80 55.5294L160 96Z"
          fill="currentColor"
        />
        <path d="M160 40.4706V80L80 39.5294L0 80V40.4706L80 0L160 40.4706Z" fill="currentColor" />
      </svg>
      {text != null && <span className={styles.text}>{text}</span>}
    </div>
  );
});
```

- [ ] **Step 2: `Logo.tokens.scss`** — write exactly:

```scss
:root {
  // The mark color — defaults to the brand accent (#0052cc). Override this
  // variable to recolor the mark (e.g. on a dark surface).
  --logo-color: var(--color-accent);
  // Gap between the mark and the wordmark.
  --logo-gap: var(--space-2);
  // Wordmark size at `size="lg"` (no --font-size-2xl primitive exists).
  --logo-text-size-lg: 24px;
}
```

- [ ] **Step 3: `Logo.module.scss`** — write exactly:

```scss
@use './Logo.tokens';

.logo {
  display: inline-flex;
  align-items: center;
  gap: var(--logo-gap);
}

.bottom {
  flex-direction: column;
}

.mark {
  flex-shrink: 0;
  color: var(--logo-color);
}

.text {
  color: var(--color-fg);
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.sizeSm .mark {
  width: var(--size-sm);
  height: var(--size-sm);
}

.sizeSm .text {
  font-size: var(--font-size-lg);
}

.sizeMd .mark {
  width: var(--size-md);
  height: var(--size-md);
}

.sizeMd .text {
  font-size: var(--font-size-xl);
}

.sizeLg .mark {
  width: var(--size-lg);
  height: var(--size-lg);
}

.sizeLg .text {
  font-size: var(--logo-text-size-lg);
}
```

- [ ] **Step 4: `index.ts`** — write exactly:

```ts
export { Logo } from './Logo';
export type { LogoProps, LogoSize, LogoTextPlacement } from './Logo';
```

- [ ] **Step 5: `Logo.test.tsx`** — write exactly (vitest globals; no describe/it/expect imports):

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders the mark <svg> and forwards ref to the wrapper <div>', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<Logo ref={ref} />);
    expect(container.firstChild?.nodeName).toBe('DIV');
    expect(ref.current).toBe(container.firstChild);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders the wordmark and marks the svg aria-hidden when text is present', () => {
    const { container } = render(<Logo text="eocrm" />);
    expect(screen.getByText('eocrm')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('labels the mark when there is no text but a label', () => {
    render(<Logo label="eocrm" />);
    const img = screen.getByRole('img', { name: 'eocrm' });
    expect(img.tagName.toLowerCase()).toBe('svg');
  });

  it('mark is decorative (aria-hidden, no name) with neither text nor label', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('aria-label');
  });

  it('does not label the mark when both text and label are passed (text wins)', () => {
    const { container } = render(<Logo text="eocrm" label="ignored" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each(['sm', 'md', 'lg'] as const)('size="%s" applies the size class', (size) => {
    const { container } = render(<Logo size={size} />);
    expect((container.firstChild as HTMLElement).className).toMatch(
      new RegExp(`size${size[0].toUpperCase()}${size.slice(1)}`),
    );
  });

  it('textPlacement="bottom" applies the bottom class; default does not', () => {
    const { container, rerender } = render(<Logo text="eocrm" textPlacement="bottom" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/bottom/);
    rerender(<Logo text="eocrm" />);
    expect((container.firstChild as HTMLElement).className).not.toMatch(/bottom/);
  });

  it('merges className and spreads other attrs onto the wrapper', () => {
    const { container } = render(<Logo className="brand" data-foo="bar" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/brand/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
```

- [ ] **Step 6: export from `src/index.ts`** — add a `Logo` export block adjacent to the `BrandIcon` export block:

```ts
export { Logo } from './components/Logo';
export type { LogoProps, LogoSize, LogoTextPlacement } from './components/Logo';
```

- [ ] **Step 7: manifest** — add `Logo: 'Display',` immediately after `BrandIcon: 'Display',` in BOTH `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`, then:

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest
```

Expected: `src/components.manifest.json` gains a `Logo` entry, cluster `Display`.

- [ ] **Step 8: AGENTS.md TL;DR** — add after the `### <BrandIcon>` section:

````markdown
### `<Logo>` — eocrm brand logo

```tsx
<Logo text="eocrm" size="lg" />        // mark + wordmark
<Logo label="eocrm" />                 // mark only (accessible name)
<Logo text="eocrm" textPlacement="bottom" />
```

- The eocrm layered-hex mark; optional `eocrm` wordmark beside (default) or below (`textPlacement="bottom"`).
- `size`: `sm` (24) / `md` (32, default) / `lg` (40). Single-color inline SVG; mark color is `--logo-color` (defaults to `--color-accent`) — override that variable to recolor.
- `text` → wordmark + decorative mark; `label` → accessible name for a mark-only logo (never pass both). For third-party SSO marks use `<BrandIcon>`, not `<Logo>`.
````

- [ ] **Step 9: library gates**

```bash
cd /Users/dpws/projects/design-system
npm run typecheck && make build-lib && make lint && make test && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

- [ ] **Step 10: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Logo packages/design-system/src/index.ts \
  packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs \
  packages/design-system/src/components.manifest.json packages/design-system/AGENTS.md
git commit -m "feat(Logo): eocrm brand logo primitive (mark + optional wordmark)"
```

---

## Task 2: Logo demo + playground wiring

**Files:** Create `packages/playground/src/pages/components/LogoDemo.tsx`; modify `App.tsx`, `AppShell.tsx` (Display nav group + lucide import), `ComponentsIndex.tsx`.

- [ ] **Step 1: `LogoDemo.tsx`** — write exactly:

```tsx
import { Cluster, Logo } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function LogoDemo() {
  return (
    <DemoLayout
      name="Logo"
      componentName="Logo"
      description="The eocrm brand logo — the layered-hex mark, optionally with the eocrm wordmark beside it or below. Single-color inline SVG that inherits --logo-color (the brand accent); override that variable to recolor."
      files={getComponentFiles('Logo')}
    >
      <Example
        title="Mark + wordmark"
        description="The common header / auth lockup — text='eocrm' renders the wordmark beside the mark."
        code={`<Logo text="eocrm" />`}
      >
        <Logo text="eocrm" />
      </Example>

      <Example
        title="Mark only"
        description="Omit text for just the mark. Pass label for a standalone accessible name."
        code={`<Logo label="eocrm" />`}
      >
        <Logo label="eocrm" />
      </Example>

      <Example
        title="Wordmark below the mark"
        description="textPlacement='bottom' stacks the wordmark under the mark, centered."
        code={`<Logo text="eocrm" textPlacement="bottom" />`}
      >
        <Logo text="eocrm" textPlacement="bottom" />
      </Example>

      <Example
        title="Sizes"
        description="sm (24) / md (32, default) / lg (40)."
        code={`<Logo text="eocrm" size="sm" />
<Logo text="eocrm" size="md" />
<Logo text="eocrm" size="lg" />`}
      >
        <Cluster gap="lg" align="center">
          <Logo text="eocrm" size="sm" />
          <Logo text="eocrm" size="md" />
          <Logo text="eocrm" size="lg" />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: `App.tsx`** — add the import (with the other component-demo imports) and the route (in the `/components/*` block, near the `brand-icon` route):

```tsx
import { LogoDemo } from './pages/components/LogoDemo';
```

```tsx
<Route path="/components/logo" element={<LogoDemo />} />
```

- [ ] **Step 3: `AppShell.tsx` Display nav** — add `Hexagon` to the `lucide-react` import block (verify it isn't already imported; if it is, use `Shapes`-free alternative `Box`), then add to the `Display` group's `items` array (near the `brand-icon` entry):

```tsx
{ to: '/components/logo', label: 'Logo', icon: Hexagon, end: false },
```

- [ ] **Step 4: `ComponentsIndex.tsx`** — add the import and a card (near the BrandIcon card):

```tsx
import { Logo } from '@eocrm/design-system';
```

```tsx
  {
    to: '/components/logo',
    name: 'Logo',
    description: 'The eocrm brand logo — mark + optional wordmark.',
    preview: <Logo text="eocrm" size="md" />,
  },
```

- [ ] **Step 5: gates**

```bash
cd /Users/dpws/projects/design-system
make build && make lint && npm run format:check
```

- [ ] **Step 6: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/components/LogoDemo.tsx packages/playground/src/App.tsx \
  packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "feat(playground): Logo demo + nav/route/grid wiring"
```

---

## Task 3: Consumer refactor (Login + AppShell), delete asset, tick TODO

**Files:** modify `Login/Login.tsx`, `registry.ts`, `AppShell.tsx`, `AppShell.module.scss`; delete `assets/eocrm-logo.svg`; modify `packages/design-system/src/components/TODO.md`.

- [ ] **Step 1: Login brand block** — in `packages/playground/src/pages/mockups/Login/Login.tsx`, replace:

```tsx
        <Cluster gap="sm" align="center">
          {/* TODO: replace with a <Logo>/fixed-size image primitive when it ships —
              see packages/design-system/src/components/TODO.md. Image reserves a
              full-width box with skeleton/fallback (wrong for a small chrome logo). */}
          <img src={eocrmLogo} alt="" width={28} height={28} />
          <Text as="span" size="xl" weight="bold">
            eocrm
          </Text>
        </Cluster>

        <Card padding="lg">
```

with (wraps the Card in `Constrain width="sm"` so step 2 doesn't shrink):

```tsx
        <Logo text="eocrm" size="lg" />

        <Constrain width="sm">
          <Card padding="lg">
```

- [ ] **Step 2: close the Constrain** — the `<Card>` currently closes with `</Card>` followed by the outer `</Stack>`. Add `</Constrain>` after the Card's closing tag. Find:

```tsx
          </Stack>
        </Card>
      </Stack>
    </Screen>
```

replace with:

```tsx
          </Stack>
        </Card>
        </Constrain>
      </Stack>
    </Screen>
```

(Prettier will re-indent — run `npx prettier --write` after.)

- [ ] **Step 3: Login imports** — remove `import eocrmLogo from '../../../assets/eocrm-logo.svg';`; add `Logo` and `Constrain` to the `@eocrm/design-system` import (keep `Text` — still used for labels/errors/subtitle).

- [ ] **Step 4: remove the password placeholder** — delete the line `placeholder="••••••••"` from the `PasswordInput`.

- [ ] **Step 5: registry** — in `packages/playground/src/pages/mockups/registry.ts`: add `'Logo'` to the `ComponentName` union (near the other names); add `'Constrain'` and `'Logo'` to the Login entry's `usesComponents` (keep it sorted with the rest).

- [ ] **Step 6: AppShell brand** — in `packages/playground/src/layout/AppShell/AppShell.tsx`: add `Logo` to the `@eocrm/design-system` import; remove `import eocrmLogo from '../../assets/eocrm-logo.svg';`; replace `<img src={eocrmLogo} className={styles.brandLogo} alt="" />` with `<Logo size="sm" />`. In `AppShell.module.scss` remove the `.brandLogo` block.

- [ ] **Step 7: delete the asset**

```bash
cd /Users/dpws/projects/design-system
git rm packages/playground/src/assets/eocrm-logo.svg
```

- [ ] **Step 8: tick the TODO** — in `packages/design-system/src/components/TODO.md`, change `### [ ] \`<Logo>\``to`### [x] \`<Logo>\``and append a line under it:`**Shipped:** 2026-06-05 — `<Logo>` lib component; Login + AppShell refactored to use it; asset deleted.`

- [ ] **Step 9: gates**

```bash
cd /Users/dpws/projects/design-system
make test && make build && make lint && npm run format:check
```

(`make build` will fail if any dangling `eocrmLogo` import remains — confirm both were removed. `make test` includes the manifest meta-test.)

- [ ] **Step 10: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/Login/Login.tsx packages/playground/src/pages/mockups/registry.ts \
  packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/layout/AppShell/AppShell.module.scss \
  packages/design-system/src/components/TODO.md packages/playground/src/assets/eocrm-logo.svg
git commit -m "refactor(playground): use <Logo>; login card width-stable + no password placeholder; drop asset + tick TODO"
```

---

## Verification

- Library Rule-8 review loop + Playground Rule-7 review (Login mockup).
- Playwright smoke: `/components/logo` (all variants); `/mockups/login` (Logo above card, card width stable between steps, no password placeholder); `/mockups/dashboard` rail shows the `<Logo>` mark.

## Self-review

- **Spec coverage:** component (T1), demo+wiring (T2), Login refactor + Constrain width + placeholder removal + AppShell + asset delete + TODO tick (T3). ✓
- **Placeholders:** full verbatim code throughout. ✓
- **Consistency:** `LogoProps`/`LogoSize`/`LogoTextPlacement` consistent; size class names `sizeSm/sizeMd/sizeLg` match the test regex and `sizeClass` map; `--logo-color`/`--logo-gap`/`--logo-text-size-lg` defined in tokens + used in scss; cluster `Display` in both maps. ✓
