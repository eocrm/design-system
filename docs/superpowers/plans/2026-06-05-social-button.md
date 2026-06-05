# `<SocialButton>` Implementation Plan (resolves issue #130)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship a `<SocialButton>` — a provider sign-in button (a `<Button>` + a `<BrandIcon>` mark + label) — and use it in the playground Login.

**Spec:** GitHub issue eocrm/design-system#130 (issue-as-spec). API: `<SocialButton provider="google" label="Continue with Google" onClick={…} />`; secondary Button + leading provider mark; extensible to providers.

**Architecture:** Pure composition over existing primitives (`Button` + `BrandIcon`) — no own styles. `provider` is tied to `BrandIcon`'s `BrandName` (so it extends as BrandIcon does). Cluster `Forms`.

**Verified facts:** structure.test requires the 4 files (`SocialButton.tsx`/`.test.tsx`/`.module.scss`/`index.ts`) — SocialButton has no styles, so its `.module.scss` is a documented empty file (not imported). `Button` is cluster `Forms` (both manifest maps). `BrandName = 'google' | 'yandex'`. Button handles icon+text layout itself. AppShell already imports the lucide `LogIn` icon. Vitest globals on (no describe/it/expect import).

---

## Task 1: SocialButton library component

**Files:** Create `packages/design-system/src/components/SocialButton/{SocialButton.tsx,SocialButton.module.scss,SocialButton.test.tsx,index.ts}`; modify `src/index.ts`, both manifest CLUSTERS maps, `AGENTS.md`; regenerate `components.manifest.json`.

- [ ] **Step 1: `SocialButton.tsx`** — write exactly:

```tsx
import { forwardRef, type ReactNode } from 'react';
import { Button, type ButtonProps, type ButtonSize } from '../Button';
import { BrandIcon, type BrandName } from '../BrandIcon';

const ICON_SIZE: Record<ButtonSize, number> = { xs: 14, sm: 16, md: 18, lg: 20 };

export interface SocialButtonProps extends Omit<ButtonProps, 'children' | 'iconOnly'> {
  /**
   * Which provider's brand mark to show. Tied to `<BrandIcon>`'s set, so it
   * grows as BrandIcon does (today: `'google'` / `'yandex'`).
   */
  provider: BrandName;
  /** The button text — e.g. `"Continue with Google"`. Required (consumer-supplied). */
  label: ReactNode;
}

/**
 * A provider sign-in button: a `<Button>` with the provider's brand mark
 * (`<BrandIcon>`) and a label — the common SSO row ("Continue with Google").
 *
 * Defaults to `variant="secondary"` and spreads the rest of `<Button>`'s props
 * (`onClick`, `size`, `disabled`, `type`, …). The brand mark is decorative; the
 * `label` is the accessible name. Width comes from the parent (stack/grid).
 *
 * @example
 * <SocialButton provider="google" label="Continue with Google" onClick={signInWithGoogle} />
 *
 * @example
 * // Stack a few providers:
 * <Stack gap="sm">
 *   <SocialButton provider="google" label="Continue with Google" onClick={...} />
 *   <SocialButton provider="yandex" label="Continue with Yandex" onClick={...} />
 * </Stack>
 *
 * @remarks When NOT to use
 * - For a generic action with an icon → use `<Button>` with a `lucide-react` icon.
 * - This is specifically for SSO provider marks from `<BrandIcon>`; for any other
 *   leading glyph, use `<Button>` directly.
 */
export const SocialButton = forwardRef<HTMLButtonElement, SocialButtonProps>(function SocialButton(
  { provider, label, variant = 'secondary', size = 'md', ...props },
  ref,
) {
  return (
    <Button ref={ref} variant={variant} size={size} {...props}>
      <BrandIcon name={provider} size={ICON_SIZE[size]} />
      {label}
    </Button>
  );
});
```

- [ ] **Step 2: `SocialButton.module.scss`** — write exactly (no styles; satisfies the four-file rule):

```scss
// SocialButton has no styles of its own — it composes <Button> (the chrome) and
// <BrandIcon> (the provider mark), each of which brings its own styling. This
// file exists only to satisfy the four-file component-structure convention; it
// is intentionally not imported.
```

- [ ] **Step 3: `index.ts`** — write exactly:

```ts
export { SocialButton } from './SocialButton';
export type { SocialButtonProps } from './SocialButton';
```

- [ ] **Step 4: `SocialButton.test.tsx`** — write exactly (vitest globals):

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import userEvent from '@testing-library/user-event';
import { SocialButton } from './SocialButton';

describe('SocialButton', () => {
  it('renders a button named by the label, with a decorative brand mark, and forwards ref', () => {
    const ref = createRef<HTMLButtonElement>();
    const { container } = render(
      <SocialButton ref={ref} provider="google" label="Continue with Google" />,
    );
    const btn = screen.getByRole('button', { name: 'Continue with Google' });
    expect(btn).toBeInTheDocument();
    expect(ref.current).toBe(btn);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('defaults to the secondary variant, overridable', () => {
    const { rerender } = render(<SocialButton provider="google" label="Google" />);
    expect(screen.getByRole('button', { name: 'Google' }).className).toMatch(/secondary/);
    rerender(<SocialButton provider="google" label="Google" variant="ghost" />);
    expect(screen.getByRole('button', { name: 'Google' }).className).toMatch(/ghost/);
  });

  it('fires onClick and spreads button attrs (disabled, data-*)', async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <SocialButton provider="google" label="Google" onClick={onClick} data-foo="bar" />,
    );
    const btn = screen.getByRole('button', { name: 'Google' });
    expect(btn).toHaveAttribute('data-foo', 'bar');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<SocialButton provider="google" label="Google" onClick={onClick} disabled />);
    expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled();
  });

  it('renders each provider', () => {
    const { container, rerender } = render(<SocialButton provider="google" label="g" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    rerender(<SocialButton provider="yandex" label="y" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: export from `src/index.ts`** — add after the `Button` export block (lines 3-4):

```ts
export { SocialButton } from './components/SocialButton';
export type { SocialButtonProps } from './components/SocialButton';
```

- [ ] **Step 6: manifest** — add `SocialButton: 'Forms',` immediately after `Button: 'Forms',` in BOTH `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`, then:

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest
```

Expected: `src/components.manifest.json` gains a `SocialButton` entry, cluster `Forms`, with `composes` including Button + BrandIcon (the generator derives composes from imports — that's expected/fine).

- [ ] **Step 7: AGENTS.md** — add after the `### <Button>` section:

````markdown
### `<SocialButton>` — provider sign-in button

```tsx
<SocialButton provider="google" label="Continue with Google" onClick={signIn} />
```

- A `<Button>` (default `variant="secondary"`) with the provider's `<BrandIcon>` mark + `label`. `provider`: `'google'` / `'yandex'` (BrandIcon's set). Spreads Button props (`onClick`, `size`, `disabled`, …); width comes from the parent.
- The mark is decorative — `label` is the accessible name. For a non-SSO icon button use `<Button>` + a lucide icon.
````

- [ ] **Step 8: library gates**

```bash
cd /Users/dpws/projects/design-system
npm run typecheck && make build-lib && make lint && make test && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

- [ ] **Step 9: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/SocialButton packages/design-system/src/index.ts \
  packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs \
  packages/design-system/src/components.manifest.json packages/design-system/AGENTS.md
git commit -m "feat(SocialButton): provider sign-in button (Button + BrandIcon) (#130)"
```

---

## Task 2: Demo + playground wiring

**Files:** Create `packages/playground/src/pages/components/SocialButtonDemo.tsx`; modify `App.tsx`, `AppShell.tsx` (Forms nav), `ComponentsIndex.tsx`.

- [ ] **Step 1: `SocialButtonDemo.tsx`** — write exactly:

```tsx
import { SocialButton, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function SocialButtonDemo() {
  return (
    <DemoLayout
      name="SocialButton"
      componentName="SocialButton"
      description="A provider sign-in button — a secondary Button with the provider's brand mark (BrandIcon) and a label. The common SSO row."
      files={getComponentFiles('SocialButton')}
    >
      <Example
        title="Providers"
        description="provider picks the brand mark; label is the (consumer-supplied) text. Width comes from the parent."
        code={`<Stack gap="sm">
  <SocialButton provider="google" label="Continue with Google" />
  <SocialButton provider="yandex" label="Continue with Yandex" />
</Stack>`}
      >
        <Stack gap="sm">
          <SocialButton provider="google" label="Continue with Google" />
          <SocialButton provider="yandex" label="Continue with Yandex" />
        </Stack>
      </Example>

      <Example
        title="Disabled"
        description="Spreads Button props (disabled, onClick, size, …)."
        code={`<SocialButton provider="google" label="Continue with Google" disabled />`}
      >
        <SocialButton provider="google" label="Continue with Google" disabled />
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: `App.tsx`** — add the import + the route (in the `/components/*` block, near the `button` route):

```tsx
import { SocialButtonDemo } from './pages/components/SocialButtonDemo';
```

```tsx
<Route path="/components/social-button" element={<SocialButtonDemo />} />
```

- [ ] **Step 3: `AppShell.tsx` Forms nav** — add to the `Forms` group's `items` array (after the `button-group` entry); `LogIn` is already imported:

```tsx
{ to: '/components/social-button', label: 'SocialButton', icon: LogIn, end: false },
```

- [ ] **Step 4: `ComponentsIndex.tsx`** — add the import and a card (near the Button card):

```tsx
import { SocialButton } from '@eocrm/design-system';
```

```tsx
  {
    to: '/components/social-button',
    name: 'SocialButton',
    description: 'Provider sign-in button — brand mark + label.',
    preview: <SocialButton provider="google" label="Continue with Google" />,
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
git add packages/playground/src/pages/components/SocialButtonDemo.tsx packages/playground/src/App.tsx \
  packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "feat(playground): SocialButton demo + nav/route/grid wiring"
```

---

## Task 3: Use SocialButton in the Login mockup (dogfood)

**Files:** modify `packages/playground/src/pages/mockups/Login/Login.tsx`, `registry.ts`.

- [ ] **Step 1: replace the inline Google button** — in `Login.tsx`, replace:

```tsx
<Button variant="secondary">
  <BrandIcon name="google" size={16} />
  Continue with Google
</Button>
```

with:

```tsx
<SocialButton provider="google" label="Continue with Google" />
```

- [ ] **Step 2: fix imports** — in `Login.tsx`: add `SocialButton` to the `@eocrm/design-system` import; **remove `BrandIcon`** (no longer used after this change — verify with `grep -n BrandIcon Login.tsx` → only the import line, then remove it). Keep `Button` only if still used elsewhere in the file (it is — the Continue / Sign in buttons), so keep `Button`.

- [ ] **Step 3: registry** — in `registry.ts`: add `'SocialButton'` to the `ComponentName` union; in the Login entry's `usesComponents`, add `'SocialButton'` and **remove `'BrandIcon'`** (no longer used).

- [ ] **Step 4: gates**

```bash
cd /Users/dpws/projects/design-system
make build && make lint && npm run format:check
grep -rn "BrandIcon" packages/playground/src/pages/mockups/Login/Login.tsx   # expect: no matches
```

- [ ] **Step 5: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/Login/Login.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "refactor(mockup): Login uses <SocialButton> for Google sign-in (#130)"
```

---

## Verification

- Library Rule-8 review loop + Playground Rule-7 review (Login mockup).
- Playwright smoke: `/components/social-button` (Google + Yandex render, brand marks, secondary); `/mockups/login` (the Google button is now SocialButton, accessible name "Continue with Google", brand mark shown).

## Self-review

- **Issue coverage:** `<SocialButton provider label onClick>` ✓; secondary Button + provider mark ✓; extensible (provider = BrandName) ✓; consumer usage demonstrated (Login) ✓.
- **Core invariant:** 4 files (incl. the documented empty `.module.scss`) ✓, test ✓, demo + 3-way wiring ✓, `src/index.ts` export ✓, JSDoc `@remarks` ✓, AGENTS.md ✓, manifest both maps + regen ✓.
- **Consistency:** `provider`/`label` props + `ICON_SIZE` map; cluster `Forms` in both maps; route `social-button` uniform across App/AppShell/ComponentsIndex.
