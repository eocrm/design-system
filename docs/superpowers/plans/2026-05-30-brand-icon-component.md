# BrandIcon Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `<BrandIcon name="google" | "yandex">` library primitive rendering full-color official brand marks, refactor the Login mockup's inline Google `<svg>` to use it, and update the TODO bookkeeping.

**Architecture:** A `forwardRef` `<svg>` whose paths come from an internal `Record<BrandName, {viewBox, body}>` registry (compile-time-complete; brand hex is inline — the documented exception to token-only color). `size` (px, default 20) sets width/height; decorative by default (`aria-hidden`), a `title` prop opts into `role="img"` + `aria-label`. A minimal `.icon` class gives the svg sane inline placement (and satisfies the 4-file structure test). Display cluster, primitive tier, no i18n.

**Tech Stack:** React 19 + TypeScript, `clsx`, SCSS module, Vitest (globals, jsdom, RTL). Branch: `feat/brand-icon` (already checked out).

**Spec:** `docs/superpowers/specs/2026-05-30-brand-icon-design.md`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/design-system/src/components/BrandIcon/BrandIcon.tsx` | NEW — component + `ICONS` registry |
| `packages/design-system/src/components/BrandIcon/BrandIcon.module.scss` | NEW — `.icon` class |
| `packages/design-system/src/components/BrandIcon/BrandIcon.test.tsx` | NEW — unit tests |
| `packages/design-system/src/components/BrandIcon/index.ts` | NEW — exports |
| `packages/design-system/src/index.ts` | MODIFY — re-export (after the Badge block) |
| `packages/design-system/src/_meta/manifest.ts` | MODIFY — `BrandIcon: 'Display'` |
| `packages/design-system/scripts/generate-manifest.mjs` | MODIFY — `BrandIcon: 'Display'` (kept in sync) |
| `packages/design-system/src/components.manifest.json` | REGEN — `npm run build:manifest` |
| `packages/design-system/src/components/TODO.md` | MODIFY — tick `<BrandIcon>`; annotate `<AuthScreen>` deferred |
| `packages/design-system/AGENTS.md` | MODIFY — `<BrandIcon>` TL;DR (Display) |
| `packages/playground/src/pages/mockups/Login/Login.tsx` | MODIFY — inline Google `<svg>` → `<BrandIcon>` |
| `packages/playground/src/pages/components/BrandIconDemo.tsx` | NEW — demo |
| `packages/playground/src/App.tsx` | MODIFY — `/components/brand-icon` route |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | MODIFY — Display nav entry + `Fingerprint` import |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` | MODIFY — overview card |

---

## Task 1: The `<BrandIcon>` component (TDD)

**Files:** under `packages/design-system/src/components/BrandIcon/`.

- [ ] **Step 1: Create `BrandIcon.module.scss`**

```scss
.icon {
  display: inline-block;
  vertical-align: middle;
}
```

- [ ] **Step 2: Write the failing test** — `BrandIcon.test.tsx`

```tsx
import { createRef } from 'react';
import { render } from '@testing-library/react';
import { BrandIcon } from './BrandIcon';

function svgOf(c: HTMLElement): SVGSVGElement {
  return c.querySelector('svg') as SVGSVGElement;
}

describe('BrandIcon', () => {
  it('renders the google mark (4 colored paths, 0 0 48 48)', () => {
    const { container } = render(<BrandIcon name="google" />);
    const svg = svgOf(container);
    expect(svg).not.toBeNull();
    expect(svg.querySelectorAll('path')).toHaveLength(4);
    expect(svg.getAttribute('viewBox')).toBe('0 0 48 48');
  });

  it('renders the yandex mark (distinct viewBox + brand red)', () => {
    const { container } = render(<BrandIcon name="yandex" />);
    expect(svgOf(container).getAttribute('viewBox')).toBe('0 0 24 24');
    expect(container.innerHTML).toMatch(/#FC3F1D/i);
  });

  it('renders every known brand without throwing', () => {
    (['google', 'yandex'] as const).forEach((name) => {
      expect(() => render(<BrandIcon name={name} />)).not.toThrow();
    });
  });

  it('sizes the svg (default 20, overridable)', () => {
    const { container, rerender } = render(<BrandIcon name="google" />);
    expect(svgOf(container).getAttribute('width')).toBe('20');
    expect(svgOf(container).getAttribute('height')).toBe('20');
    rerender(<BrandIcon name="google" size={32} />);
    expect(svgOf(container).getAttribute('width')).toBe('32');
    expect(svgOf(container).getAttribute('height')).toBe('32');
  });

  it('is decorative by default (aria-hidden, no role)', () => {
    const { container } = render(<BrandIcon name="google" />);
    const svg = svgOf(container);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('title makes it a labeled image', () => {
    const { container, getByTitle } = render(<BrandIcon name="yandex" title="Yandex" />);
    const svg = svgOf(container);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Yandex');
    expect(svg.getAttribute('aria-hidden')).toBeNull();
    expect(getByTitle('Yandex')).toBeInTheDocument();
  });

  it('forwards ref to the svg, merges className, spreads attrs', () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(
      <BrandIcon name="google" ref={ref} className="custom" data-testid="bi" />,
    );
    expect(ref.current).toBe(svgOf(container));
    expect(svgOf(container).getAttribute('class')).toMatch(/custom/);
    expect(svgOf(container).getAttribute('data-testid')).toBe('bi');
  });
});
```

- [ ] **Step 3: Run the test — verify it FAILS**

Run: `cd packages/design-system && npx vitest run src/components/BrandIcon/BrandIcon.test.tsx`
Expected: FAIL — `Failed to resolve import "./BrandIcon"`.

- [ ] **Step 4: Create `BrandIcon.tsx`**

```tsx
import { forwardRef, type ReactNode, type SVGAttributes } from 'react';
import clsx from 'clsx';
import styles from './BrandIcon.module.scss';

/** Brands shipped today. Extend the union + the `ICONS` registry to add more. */
export type BrandName = 'google' | 'yandex';

export interface BrandIconProps extends Omit<SVGAttributes<SVGSVGElement>, 'children'> {
  /** Which brand mark to render. */
  name: BrandName;
  /** Square pixel size (width = height). Defaults to `20`. */
  size?: number;
  /**
   * Accessible name. Omit (default) for a decorative icon beside a text label —
   * the icon renders `aria-hidden`. Set it for a standalone icon (e.g. an
   * icon-only button) → `role="img"` + `aria-label`.
   */
  title?: string;
}

type BrandSvg = { viewBox: string; body: ReactNode };

// `Record<BrandName, …>` makes the registry complete at COMPILE time — adding a
// brand to `BrandName` without art fails typecheck. Brand hex is inline (the
// documented exception to token-only color; the colors are brand-mandated).
const ICONS: Record<BrandName, BrandSvg> = {
  google: {
    viewBox: '0 0 48 48',
    body: (
      <>
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5z"
        />
        <path
          fill="#FBBC05"
          d="M10.4 28.3c-.5-1.4-.8-3-.8-4.3s.3-2.9.8-4.3l-7.8-6.1C1 16.8 0 20.3 0 24s1 7.2 2.6 10.4l7.8-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.8-3.8-13.6-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
        />
      </>
    ),
  },
  yandex: {
    viewBox: '0 0 24 24',
    body: (
      <>
        <rect width="24" height="24" rx="5" fill="#FC3F1D" />
        {/* v1 representation of the Yandex "Я" logomark; swap for official path art when sourced. */}
        <text
          x="12"
          y="17.5"
          textAnchor="middle"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif"
          fontWeight="700"
          fontSize="16"
          fill="#fff"
        >
          Я
        </text>
      </>
    ),
  },
};

/**
 * Renders a third-party brand's official multi-color mark — for SSO buttons and
 * brand chrome. Colors are brand-mandated (not themeable). Decorative by
 * default; pass `title` for standalone, labeled use.
 *
 * @example
 * // In an SSO button (decorative — the text carries the name):
 * <Button variant="secondary">
 *   <BrandIcon name="google" size={16} /> Continue with Google
 * </Button>
 *
 * @example
 * // Standalone, labeled:
 * <BrandIcon name="yandex" title="Yandex" size={24} />
 *
 * @remarks When NOT to use
 * - Generic UI glyphs (chevron, search, close) → use `lucide-react`. This is
 *   only for third-party brand marks.
 * - Recoloring to match your theme — unsupported; brand marks keep their
 *   official colors.
 *
 * @remarks Anti-patterns
 * - ❌ A decorative `BrandIcon` next to visible brand text AND a `title` —
 *   double-announces ("Google Continue with Google"). Keep it `aria-hidden`
 *   (the default) beside a label.
 */
export const BrandIcon = forwardRef<SVGSVGElement, BrandIconProps>(function BrandIcon(
  { name, size = 20, title, className, ...rest },
  ref,
) {
  const icon = ICONS[name];
  const labeled = title != null && title !== '';
  return (
    // {...rest} last (Pattern A) so a consumer can override the a11y defaults.
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={icon.viewBox}
      className={clsx(styles.icon, className)}
      role={labeled ? 'img' : undefined}
      aria-label={labeled ? title : undefined}
      aria-hidden={labeled ? undefined : true}
      {...rest}
    >
      {labeled && <title>{title}</title>}
      {icon.body}
    </svg>
  );
});
```

- [ ] **Step 5: Create `index.ts`**

```ts
export { BrandIcon } from './BrandIcon';
export type { BrandIconProps, BrandName } from './BrandIcon';
```

- [ ] **Step 6: Run the test — verify it PASSES**

Run: `cd packages/design-system && npx vitest run src/components/BrandIcon/BrandIcon.test.tsx`
Expected: PASS — all 7 tests green.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/BrandIcon
git commit -m "feat(BrandIcon): multi-color brand marks (google, yandex)"
```

---

## Task 2: Library wiring (export + manifest + AGENTS + TODO)

- [ ] **Step 1: Re-export from `src/index.ts`** — add directly after the Badge export block (`export type { BadgeProps, … } from './components/Badge';`):

```ts
export { BrandIcon } from './components/BrandIcon';
export type { BrandIconProps, BrandName } from './components/BrandIcon';
```

- [ ] **Step 2: Classify in BOTH manifest sources** — add `BrandIcon: 'Display',` to the `CLUSTERS` map in `packages/design-system/src/_meta/manifest.ts` AND in `packages/design-system/scripts/generate-manifest.mjs` (next to `Badge: 'Display',`).

- [ ] **Step 3: Regenerate the manifest**

Run: `cd packages/design-system && npm run build:manifest`
Expected: `components.manifest.json` gains `BrandIcon` with `tier: 'primitive'`, `cluster: 'Display'`, `composes: []`. Stage it.

- [ ] **Step 4: Update `TODO.md`**

In `packages/design-system/src/components/TODO.md`:

(a) Tick the `<BrandIcon>` entry — change its heading to `### [x]` and add a shipped note after the **Filed:** line:

```markdown
**Shipped:** 2026-05-30 — `packages/design-system/src/components/BrandIcon/`. The Login mockup's inline Google `<svg>` now uses `<BrandIcon name="google" size={16} />`. Ships `google` + `yandex`; extend the `BrandName` union + `ICONS` registry for more.
```

(b) Annotate the `<AuthScreen>` entry as deferred (leave it `[ ]` open — the Login mockup keeps its layout escape hatch). Add after its **Filed:** line:

```markdown
**Deferred:** 2026-05-30 — the login screen is a single playground mockup; a reusable auth-layout primitive is YAGNI for one screen. The Login wrapper escape hatches stay as a contained one-off. Revisit only if a second auth screen appears.
```

- [ ] **Step 5: Add the AGENTS.md TL;DR** (Display section):

````markdown
### `<BrandIcon>` — third-party brand marks

```tsx
<Button variant="secondary">
  <BrandIcon name="google" size={16} /> Continue with Google
</Button>
```

Full-color official brand marks for SSO buttons. Ships `google` + `yandex`.

- `name`: `'google' | 'yandex'`. `size`: px (default 20). Colors are brand-mandated (not themeable).
- Decorative by default (`aria-hidden`); pass `title` for a labeled standalone icon (`role="img"`).

**When NOT to use:** generic UI glyphs → `lucide-react`. Don't recolor brand marks.
````

- [ ] **Step 6: Verify library gates**

Run: `make build-lib && make test`
Expected: typecheck clean; all tests pass (incl. `structure.test.ts` — BrandIcon has the 4 files + export — and the manifest meta-test).

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json packages/design-system/src/components/TODO.md packages/design-system/AGENTS.md
git commit -m "feat(BrandIcon): export + manifest + AGENTS; tick TODO, defer AuthScreen"
```

---

## Task 3: Login refactor + playground demo

- [ ] **Step 1: Refactor the Login mockup** — `packages/playground/src/pages/mockups/Login/Login.tsx`

Add `BrandIcon` to the `@eocrm/design-system` import (alphabetically, after `Alert,`):

```tsx
  Alert,
  BrandIcon,
  Button,
```

Replace the SSO button's inline-svg escape hatch. Change:

```tsx
              <Button variant="secondary">
                {/* TODO: replace when a brand/social icon set ships — see components/TODO.md.
                    Multi-color Google "G"; not in lucide. Brand hex is intentional. */}
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.4 28.3c-.5-1.4-.8-3-.8-4.3s.3-2.9.8-4.3l-7.8-6.1C1 16.8 0 20.3 0 24s1 7.2 2.6 10.4l7.8-6.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.8-3.8-13.6-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
                  />
                </svg>
                Continue with Google
              </Button>
```

to:

```tsx
              <Button variant="secondary">
                <BrandIcon name="google" size={16} />
                Continue with Google
              </Button>
```

(This deletes a Hard-rule-6 escape hatch + its TODO comment — a net improvement to the mockup.)

- [ ] **Step 2: Create the demo** — `packages/playground/src/pages/components/BrandIconDemo.tsx`

```tsx
import { BrandIcon, Button, Cluster, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function BrandIconDemo() {
  return (
    <DemoLayout
      name="BrandIcon"
      componentName="BrandIcon"
      description="Full-color official brand marks for SSO buttons and brand chrome. Ships google + yandex; colors are brand-mandated (not themeable). For generic UI glyphs use lucide-react."
      files={getComponentFiles('BrandIcon')}
    >
      <Example
        title="The marks"
        description="Each brand at a few sizes. size is pixels (default 20)."
        code={`<BrandIcon name="google" />
<BrandIcon name="yandex" size={32} />`}
      >
        <Cluster gap="lg" align="center">
          {(['google', 'yandex'] as const).map((name) => (
            <Stack key={name} gap="xs" align="center">
              <Cluster gap="sm" align="center">
                <BrandIcon name={name} size={16} />
                <BrandIcon name={name} size={20} />
                <BrandIcon name={name} size={32} />
              </Cluster>
              <Text size="xs" tone="muted">
                {name}
              </Text>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="In SSO buttons"
        description="The canonical use — decorative icon (aria-hidden) beside the provider name."
        code={`<Button variant="secondary"><BrandIcon name="google" size={16} /> Continue with Google</Button>`}
      >
        <Stack gap="sm">
          <Button variant="secondary">
            <BrandIcon name="google" size={16} /> Continue with Google
          </Button>
          <Button variant="secondary">
            <BrandIcon name="yandex" size={16} /> Continue with Yandex
          </Button>
        </Stack>
      </Example>

      <Example
        title="Labeled (standalone)"
        description="Pass title for a standalone icon — renders role=img + aria-label."
        code={`<BrandIcon name="yandex" title="Yandex" size={28} />`}
      >
        <BrandIcon name="yandex" title="Yandex" size={28} />
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 3: Add the route in `App.tsx`** — import + route near the other Display demos (e.g. after the `/components/badge` route):

```tsx
import { BrandIconDemo } from './pages/components/BrandIconDemo';
```
```tsx
            <Route path="/components/brand-icon" element={<BrandIconDemo />} />
```

- [ ] **Step 4: Add the nav entry in `AppShell.tsx`** — add `Fingerprint` to the `lucide-react` import (confirm it isn't already imported; if unavailable, use `BadgeCheck`), then add to the `Display` group after the Badge item:

```tsx
      { to: '/components/brand-icon', label: 'BrandIcon', icon: Fingerprint, end: false },
```

- [ ] **Step 5: Add the overview card in `ComponentsIndex.tsx`** — add `import { BrandIcon } from '@eocrm/design-system';` and an `items` entry:

```tsx
  {
    to: '/components/brand-icon',
    name: 'BrandIcon',
    description: 'Full-color brand marks (Google, Yandex) for SSO buttons.',
    preview: (
      <Cluster gap="md" justify="center">
        <BrandIcon name="google" size={28} />
        <BrandIcon name="yandex" size={28} />
      </Cluster>
    ),
  },
```

(`Cluster` is already imported in `ComponentsIndex.tsx`.)

- [ ] **Step 6: Build the playground**

Run: `make build`
Expected: typecheck + bundle pass. If `Fingerprint` doesn't resolve, swap to `BadgeCheck` and rebuild.

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/pages/mockups/Login/Login.tsx packages/playground/src/pages/components/BrandIconDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "feat(playground): BrandIcon demo + nav + index; Login uses BrandIcon"
```

---

## Task 4: Gates + review loops

This touches `packages/design-system/**` (Rule-8 library loop) AND a mockup `packages/playground/src/pages/mockups/Login/**` (Rule-7 mockup loop). One reviewer pass covers both.

- [ ] **Step 1: Run all gates**

```bash
make test
make build-lib
make lint
make build
npm pack --dry-run -w @eocrm/design-system   # ships BrandIcon source, excludes the test
```
All must pass.

- [ ] **Step 2: Spawn a fresh-context reviewer** (`general-purpose`) on `git diff main..HEAD`. Brief it on:
  - **Rule-8 (library):** bugs, a11y (decorative default vs `title` → role=img + `<title>`; spread-last lets consumer override), API/types (`Record<BrandName>` completeness; `Omit<SVGAttributes,'children'>`), Rules 1/4/5/6/7 (tests; `.icon` class is Rule-4-clean — only `display`/`vertical-align`; export; forwardRef + spread; JSDoc), token discipline (brand hex is the documented inline exception; `.module.scss` token-free is fine), manifest in both files, `npm pack` excludes the test.
  - **Rule-7 (Login mockup):** the inline-svg escape hatch is fully removed (no leftover raw `<svg>`/`style`), the `{/* TODO: replace when a brand/social icon set ships */}` comment is gone, the `<BrandIcon>` TODO entry is ticked, and no new Hard-rule-6 violations were introduced. The two remaining `<AuthScreen>` escape hatches in Login are intentionally kept (deferred).
  - Confirm the Yandex `<text>`-based "Я" is acceptable as a documented v1 representation (vs official path art).
  Ask for Critical/Important/Nice-to-have/Regression-watch + verdict.

- [ ] **Step 3: Fix every Critical + Important.** Re-run gates. Re-review. Repeat until `clean enough to stop` (0 Critical / 0 Important).

- [ ] **Step 4: Commit any fixes.**

---

## Task 5: Visual verification + PR

- [ ] **Step 1: Visual check** — `make dev` (or reuse the running playground on :8080); drive a browser (Playwright MCP) to `http://localhost:8080/components/brand-icon` (marks at sizes, SSO buttons, labeled) AND `http://localhost:8080/mockups/login` (the Google mark still renders in the SSO button via `<BrandIcon>`). Screenshot both; confirm no new console errors.

- [ ] **Step 2: Push** — `git push -u origin feat/brand-icon` (fix any prettier issues with `prettier --write`; never `--no-verify`).

- [ ] **Step 3: Open the PR**

```bash
gh pr create --base main --title "Add BrandIcon component (Google, Yandex)" --body "$(cat <<'EOF'
## Summary
A `<BrandIcon name="google" | "yandex">` primitive — full-color official brand marks for SSO buttons. Extensible via the `BrandName` union + `ICONS` registry (compile-time-complete). `size` px (default 20); decorative by default (`aria-hidden`), `title` opts into a labeled `role="img"`. Brand hex is inline (documented exception to token-only color). Refactors the Login mockup's inline Google `<svg>` escape hatch → `<BrandIcon>`, ticks the `<BrandIcon>` TODO, and defers `<AuthScreen>`.

Note: the Yandex mark uses an SVG `<text>` "Я" as a v1 representation; swap for official logomark path art in a follow-up.

## Test Plan
- [x] make test / build-lib / lint / build green; npm pack excludes the test
- [x] Rule-8 (library) + Rule-7 (Login mockup) review → clean
- [x] Visual: /components/brand-icon + /mockups/login (Google mark via BrandIcon)
- [ ] CI Quality / check

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Wait for `Quality / check`.**

---

## Self-review checklist

1. **Spec coverage:** single `<BrandIcon name>` + registry (Task 1) ✓; google + yandex marks ✓; `size` default 20 ✓; decorative/`title` a11y ✓; `.module.scss` for structure-test ✓; full-color inline hex ✓; export/manifest(both)/AGENTS ✓ (Task 2); tick BrandIcon + defer AuthScreen (Task 2) ✓; Login refactor ✓ + demo/route/nav/index (Task 3) ✓; Rule-8 + Rule-7 review (Task 4) ✓; Display/primitive/no-i18n ✓.
2. **Placeholders:** none — full source for scss/test/tsx/index, exact registry SVGs, exact Login before/after, exact wiring + TODO edits + commands.
3. **Type/name consistency:** `BrandName`/`BrandIconProps`, `ICONS`/`BrandSvg`, `name`/`size`/`title`/`labeled`, `styles.icon` used consistently across component, test, and demo.
