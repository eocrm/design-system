# Overlay Floating Z-Index Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Select` / `Popover` / `DropdownMenu` floating content render **above** a `Modal`/`Drawer` when opened from inside one, instead of behind it.

**Architecture:** A shared internal hook `useInOverlay(referenceRef, active)` detects when a floating surface's trigger lives inside a `[data-drawer-portal-root]`/`[data-modal-portal-root]`. Each floating Content sets `data-in-overlay` when nested, and SCSS elevates that element's `z-index` to a new `--z-overlay-floating` token (above `--z-modal`, below `--z-toast`). Page-level layering is unchanged; no public API change.

**Tech Stack:** React (`useLayoutEffect`), TypeScript, SCSS Modules, Floating UI (existing), Vitest + Testing Library. Branch: `fix/overlay-floating-z` (off `main`). Spec: `docs/superpowers/specs/2026-06-02-overlay-floating-z-design.md`.

---

## File map

**Create:**
- `packages/design-system/src/components/_internal/overlay/useInOverlay.ts`
- `packages/design-system/src/components/_internal/overlay/useInOverlay.test.ts`

**Modify:**
- `packages/design-system/src/components/_internal/overlay/index.ts` — export `useInOverlay`
- `packages/design-system/src/styles/tokens.scss` — add `--z-overlay-floating`
- `packages/design-system/src/components/Select/Listbox.tsx` + `Select/Select.module.scss`
- `packages/design-system/src/components/Popover/Content.tsx` + `Popover/Popover.module.scss`
- `packages/design-system/src/components/DropdownMenu/Content.tsx` + `DropdownMenu/DropdownMenu.module.scss` (one edit covers menus AND submenus — `Sub.tsx` renders through the same `Content`)
- Extend tests: `Select/Select.test.tsx`, `Popover/Popover.test.tsx`, `DropdownMenu/DropdownMenu.test.tsx`
- `packages/playground/src/pages/components/DrawerDemo.tsx` — add a "floating content inside a drawer" example

---

## Task 0: Pre-flight

**Files:** none (git only)

- [ ] **Step 1: Confirm branch + hooks**

Run:
```bash
cd /Users/dpws/projects/design-system
git branch --show-current        # expect: fix/overlay-floating-z
git config --get core.hooksPath  # expect: .husky/_
```
If not on the branch: `git checkout fix/overlay-floating-z` (it was branched off `main`).

---

## Task 1: `useInOverlay` hook + `--z-overlay-floating` token

**Files:**
- Create: `packages/design-system/src/components/_internal/overlay/useInOverlay.ts`
- Test: `packages/design-system/src/components/_internal/overlay/useInOverlay.test.ts`
- Modify: `packages/design-system/src/components/_internal/overlay/index.ts`
- Modify: `packages/design-system/src/styles/tokens.scss`

- [ ] **Step 1: Write the failing test**

Create `packages/design-system/src/components/_internal/overlay/useInOverlay.test.ts`:

```tsx
import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useInOverlay } from './useInOverlay';

// Probe renders a button and reflects the hook result onto a data attribute,
// mirroring how the real floating Contents consume the hook.
function Probe({ active }: { active: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const inOverlay = useInOverlay(ref, active);
  return (
    <button ref={ref} data-in-overlay={inOverlay || undefined}>
      probe
    </button>
  );
}

describe('useInOverlay', () => {
  it('is false when the reference is at the document root', () => {
    render(<Probe active />);
    expect(screen.getByRole('button')).not.toHaveAttribute('data-in-overlay');
  });

  it('is true when the reference is inside a drawer portal root', () => {
    render(
      <div data-drawer-portal-root="">
        <Probe active />
      </div>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-in-overlay', '');
  });

  it('is true when the reference is inside a modal portal root', () => {
    render(
      <div data-modal-portal-root="">
        <Probe active />
      </div>,
    );
    expect(screen.getByRole('button')).toHaveAttribute('data-in-overlay', '');
  });

  it('is false when inactive, even if nested', () => {
    render(
      <div data-drawer-portal-root="">
        <Probe active={false} />
      </div>,
    );
    expect(screen.getByRole('button')).not.toHaveAttribute('data-in-overlay');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/_internal/overlay/useInOverlay.test.ts`
Expected: FAIL — `Failed to resolve import "./useInOverlay"`.

- [ ] **Step 3: Implement the hook**

Create `packages/design-system/src/components/_internal/overlay/useInOverlay.ts`:

```ts
import { useLayoutEffect, useState, type RefObject } from 'react';

// Modal/Drawer portal roots. A floating surface whose trigger lives inside one
// of these is being opened from within an overlay and must stack above it.
const OVERLAY_PORTAL_SELECTOR = '[data-drawer-portal-root], [data-modal-portal-root]';

/**
 * True when `referenceRef`'s element is rendered inside a `Modal`/`Drawer`
 * overlay portal. Floating surfaces (`Select` / `Popover` / `DropdownMenu`) use
 * this to elevate their portaled content above the overlay — their default
 * z-index sits below `--z-modal`, so without elevation they render behind it.
 *
 * Recomputed whenever `active` toggles (the trigger is mounted by then). Uses
 * `useLayoutEffect` so the elevation attribute is set before the browser paints
 * the opened surface (no flash behind the overlay).
 *
 * @example
 * const inOverlay = useInOverlay(ctx.triggerRef, ctx.open);
 * // <ul data-in-overlay={inOverlay || undefined} ...>
 */
export function useInOverlay(referenceRef: RefObject<HTMLElement | null>, active: boolean): boolean {
  const [inOverlay, setInOverlay] = useState(false);
  useLayoutEffect(() => {
    if (!active) {
      setInOverlay(false);
      return;
    }
    setInOverlay(Boolean(referenceRef.current?.closest(OVERLAY_PORTAL_SELECTOR)));
  }, [active, referenceRef]);
  return inOverlay;
}
```

- [ ] **Step 4: Export from the overlay barrel**

In `packages/design-system/src/components/_internal/overlay/index.ts`, add:

```ts
export { useInOverlay } from './useInOverlay';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/_internal/overlay/useInOverlay.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 6: Add the token**

In `packages/design-system/src/styles/tokens.scss`, add a line directly after the `--z-modal` declaration:

```scss
  --z-modal: 1100;
  --z-overlay-floating: 1190; // floating content (Select/Popover/DropdownMenu) opened INSIDE a modal/drawer
  --z-toast: 1200;
```

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/_internal/overlay/useInOverlay.ts \
        packages/design-system/src/components/_internal/overlay/useInOverlay.test.ts \
        packages/design-system/src/components/_internal/overlay/index.ts \
        packages/design-system/src/styles/tokens.scss
git commit -m "$(cat <<'EOF'
feat(overlay): useInOverlay hook + --z-overlay-floating token

Shared internal hook that detects when a floating surface's trigger is inside a
Modal/Drawer portal, plus a z-index token above --z-modal (below --z-toast) for
elevating floating content opened within an overlay.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Elevate Select / Popover / DropdownMenu when nested

**Files:**
- Modify: `Select/Listbox.tsx`, `Select/Select.module.scss`, `Select/Select.test.tsx`
- Modify: `Popover/Content.tsx`, `Popover/Popover.module.scss`, `Popover/Popover.test.tsx`
- Modify: `DropdownMenu/Content.tsx`, `DropdownMenu/DropdownMenu.module.scss`, `DropdownMenu/DropdownMenu.test.tsx`

All three follow the identical pattern: call `useInOverlay(ctx.triggerRef, ctx.open)`, set `data-in-overlay` on the portaled element, add an SCSS elevation rule.

- [ ] **Step 1: Write the failing tests**

In `packages/design-system/src/components/Select/Select.test.tsx`, add inside the top-level `describe` (imports `render`, `screen`, `userEvent`, `Select`, `SelectOption` already present):

```tsx
it('elevates the listbox (data-in-overlay) when opened inside an overlay', async () => {
  const user = userEvent.setup();
  render(
    <div data-drawer-portal-root="">
      <Select options={STATUSES} aria-label="Status" />
    </div>,
  );
  await user.click(screen.getByRole('button'));
  expect(screen.getByRole('listbox')).toHaveAttribute('data-in-overlay', '');
});

it('does not elevate the listbox at page level', async () => {
  const user = userEvent.setup();
  render(<Select options={STATUSES} aria-label="Status" />);
  await user.click(screen.getByRole('button'));
  expect(screen.getByRole('listbox')).not.toHaveAttribute('data-in-overlay');
});
```

In `packages/design-system/src/components/Popover/Popover.test.tsx`, add (imports `render`, `screen`, `userEvent`, `Popover` already present):

```tsx
it('elevates the content (data-in-overlay) when opened inside an overlay', async () => {
  const user = userEvent.setup();
  render(
    <div data-drawer-portal-root="">
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>Panel</Popover.Content>
      </Popover>
    </div>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(document.querySelector('[data-popover-content]')).toHaveAttribute('data-in-overlay', '');
});

it('does not elevate the popover content at page level', async () => {
  const user = userEvent.setup();
  render(
    <Popover>
      <Popover.Trigger>
        <button type="button">Open</button>
      </Popover.Trigger>
      <Popover.Content>Panel</Popover.Content>
    </Popover>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(document.querySelector('[data-popover-content]')).not.toHaveAttribute('data-in-overlay');
});
```

In `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx`, add (imports `render`, `screen`, `userEvent`, `DropdownMenu` already present; the file's `beforeEach` already mocks `ResizeObserver`):

```tsx
it('elevates the menu content (data-in-overlay) when opened inside an overlay', async () => {
  const user = userEvent.setup();
  render(
    <div data-drawer-portal-root="">
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Item</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(document.querySelector('[data-dropdown-menu-content]')).toHaveAttribute(
    'data-in-overlay',
    '',
  );
});

it('does not elevate the menu content at page level', async () => {
  const user = userEvent.setup();
  render(
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <button type="button">Open</button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onSelect={() => {}}>Item</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(document.querySelector('[data-dropdown-menu-content]')).not.toHaveAttribute(
    'data-in-overlay',
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/design-system && npx vitest run src/components/Select/Select.test.tsx src/components/Popover/Popover.test.tsx src/components/DropdownMenu/DropdownMenu.test.tsx`
Expected: FAIL — the four new cases fail (`data-in-overlay` attribute absent) while existing cases stay green.

- [ ] **Step 3: Implement — Select**

In `packages/design-system/src/components/Select/Listbox.tsx`:
1. Add `useInOverlay` to the existing `'../_internal/overlay'` import (the file already imports from there for the overlay stack; if not, add `import { useInOverlay } from '../_internal/overlay';`).
2. Inside `Listbox()`, after `const ctx = useSelectContext('Listbox');`, add:
   ```tsx
   const inOverlay = useInOverlay(ctx.triggerRef, ctx.open);
   ```
3. On the portaled `<ul ...>` (the one with `role="listbox"`), add the attribute:
   ```tsx
   data-in-overlay={inOverlay || undefined}
   ```

In `packages/design-system/src/components/Select/Select.module.scss`, directly after the `.listbox { … }` rule, add:
```scss
.listbox[data-in-overlay] {
  z-index: var(--z-overlay-floating);
}
```

- [ ] **Step 4: Implement — Popover**

In `packages/design-system/src/components/Popover/Content.tsx`:
1. Add `import { useInOverlay } from '../_internal/overlay';` (or extend the existing overlay import).
2. After the component reads its context (the `ctx` with `triggerRef`/`open`), add:
   ```tsx
   const inOverlay = useInOverlay(ctx.triggerRef, ctx.open);
   ```
3. On the portaled element that carries `data-popover-content=""`, add:
   ```tsx
   data-in-overlay={inOverlay || undefined}
   ```

In `packages/design-system/src/components/Popover/Popover.module.scss`, directly after the `.content { … }` rule, add:
```scss
.content[data-in-overlay] {
  z-index: var(--z-overlay-floating);
}
```

- [ ] **Step 5: Implement — DropdownMenu**

In `packages/design-system/src/components/DropdownMenu/Content.tsx`:
1. Add `import { useInOverlay } from '../_internal/overlay';` (or extend the existing overlay import).
2. After the component reads its context (`ctx` with `triggerRef`/`open`), add:
   ```tsx
   const inOverlay = useInOverlay(ctx.triggerRef, ctx.open);
   ```
3. On the portaled element that carries `data-dropdown-menu-content=""`, add:
   ```tsx
   data-in-overlay={inOverlay || undefined}
   ```
   (This covers submenus too — `Sub.tsx` renders through this same `Content`, each instance with its own `ctx.triggerRef`/`ctx.open`.)

In `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss`, directly after the `.content { … }` rule, add:
```scss
.content[data-in-overlay] {
  z-index: var(--z-overlay-floating);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd packages/design-system && npx vitest run src/components/Select src/components/Popover src/components/DropdownMenu`
Expected: PASS — the new cases pass and all existing Select/Popover/DropdownMenu tests stay green.

- [ ] **Step 7: Typecheck + lint**

Run:
```bash
cd /Users/dpws/projects/design-system
make build-lib
make lint
```
Expected: both clean.

- [ ] **Step 8: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Select/Listbox.tsx \
        packages/design-system/src/components/Select/Select.module.scss \
        packages/design-system/src/components/Select/Select.test.tsx \
        packages/design-system/src/components/Popover/Content.tsx \
        packages/design-system/src/components/Popover/Popover.module.scss \
        packages/design-system/src/components/Popover/Popover.test.tsx \
        packages/design-system/src/components/DropdownMenu/Content.tsx \
        packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss \
        packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx
git commit -m "$(cat <<'EOF'
fix(overlay): elevate Select/Popover/DropdownMenu above Modal/Drawer

When a floating surface's trigger is inside a Modal/Drawer, its portaled content
now sets data-in-overlay and elevates to --z-overlay-floating, so it renders
above the overlay instead of behind it. DropdownMenu submenus are covered via
the shared Content. Page-level layering is unchanged.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Demo + full verification + Rule 8 loop + PR

**Files:**
- Modify: `packages/playground/src/pages/components/DrawerDemo.tsx`

- [ ] **Step 1: Add a "floating content inside a drawer" demo example**

In `packages/playground/src/pages/components/DrawerDemo.tsx`, add a new `<Example>` that opens a `Drawer` containing a `Select` and a `DropdownMenu`, so the fix is demonstrable. Add `Select` and `DropdownMenu` to the `@eocrm/design-system` import. Mirror the open-state pattern the file already uses for its other Drawer examples (a `useState` boolean + a trigger `Button`). The drawer body content:

```tsx
<Stack gap="md">
  <Text>Selects and menus opened in here now layer above the drawer.</Text>
  <Select
    options={[
      { value: 'admin', label: 'Admin' },
      { value: 'member', label: 'Member' },
      { value: 'guest', label: 'Guest' },
    ]}
    placeholder="Pick a role"
  />
  <DropdownMenu>
    <DropdownMenu.Trigger>
      <Button variant="secondary">Actions</Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Item onSelect={() => {}}>Rename</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu>
</Stack>
```

Use a `title` like `"Floating content inside a drawer"` and a `description` noting that Select/DropdownMenu/Popover now elevate above the overlay (the fix in this change).

- [ ] **Step 2: Full library gates**

Run:
```bash
cd /Users/dpws/projects/design-system
make test            # full vitest suite — all green
make build-lib       # typecheck library
make build           # typecheck + bundle playground (smoke-tests library)
make lint            # stylelint
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -ciE '\.test\.|\.spec\.'   # expect: 0
```
Expected: all green; `0` test files in the tarball.

- [ ] **Step 3: Library Rule 8 review-fix loop**

This change touches `packages/design-system/**`, so run the pre-push review-fix cycle (`packages/design-system/CLAUDE.md` Rule 8): dispatch a fresh-context `general-purpose` reviewer over the library diff, briefed on the 10 review categories (bugs, a11y, API consistency, type safety, Rules 1–7, test coverage, token discipline, SCSS, cross-package leakage, packaging). Fix every Critical/Important; document deliberate skips; re-run gates; re-review until "clean enough to stop".

- [ ] **Step 4: Manual smoke (recommended)**

`make dev`, open `http://localhost:8080/components/drawer`, open the new example's drawer, and confirm the `Select` listbox and the `DropdownMenu` menu both render **above** the drawer panel and are clickable. Repeat mentally for Popover via `ConfirmationPopover`/`Popover` if convenient.

- [ ] **Step 5: Commit the demo + push + PR**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/components/DrawerDemo.tsx
git commit -m "$(cat <<'EOF'
docs(drawer): demo Select + DropdownMenu inside a Drawer

Exercises the overlay floating z-index fix.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin fix/overlay-floating-z
gh pr create --base main --head fix/overlay-floating-z \
  --title "fix: floating content (Select/Popover/DropdownMenu) renders above Modal/Drawer" \
  --body "$(cat <<'EOF'
## Summary
`Select` / `Popover` / `DropdownMenu` opened from inside a `Modal`/`Drawer` rendered **behind** the overlay (their z-index sat below `--z-modal`). This adds a shared `useInOverlay` hook + a `--z-overlay-floating` token: when a floating surface's trigger is inside an overlay portal, its content sets `data-in-overlay` and elevates above the overlay. Page-level layering is unchanged; no public API change. Fixes `ConfirmationPopover` (built on Popover) and DropdownMenu submenus too.

## Test plan
- [x] `useInOverlay` unit test (nested → true, page-level/inactive → false)
- [x] Per-component tests: content gets `data-in-overlay` inside a drawer portal, not at page level
- [x] `make test` / `make build` / `make lint` green; `npm pack --dry-run` test-free
- [x] Library Rule 8 review loop clean
- [ ] Manual: Select + DropdownMenu inside the Drawer demo render above the panel

## Notes
`OptionsPicker` and other non-listed floating surfaces are out of scope (follow-up if they show the same issue).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR created. Wait for `Quality / check` before merge.

---

## Self-review (against the spec)

**Spec coverage:** ✅ `--z-overlay-floating` token (Task 1). ✅ `useInOverlay` hook + export (Task 1). ✅ `data-in-overlay` + SCSS elevation on Select, Popover, DropdownMenu (+submenus) (Task 2). ✅ Tests: hook unit + per-component nested/page-level (Tasks 1–2). ✅ Drawer demo example (Task 3). ✅ Rule 8 loop + packaging check (Task 3). ✅ No public API change (hook stays in `_internal/overlay`). ✅ Non-goals respected (no base-scale reorder; OptionsPicker out of scope).

**Placeholder scan:** none — full hook/test/SCSS code and exact edits given. The demo example gives the drawer-body JSX and points at the file's existing open-state pattern for the wrapper (the only non-verbatim part, and it's playground-only, Rule-6-exempt).

**Type consistency:** `useInOverlay(referenceRef: RefObject<HTMLElement | null>, active: boolean): boolean` — called identically in all three components as `useInOverlay(ctx.triggerRef, ctx.open)` (every Content already exposes `ctx.triggerRef` and `ctx.open`). The `data-in-overlay={inOverlay || undefined}` attribute name matches the SCSS selector `[data-in-overlay]` and the test assertions in every task.

## Follow-ups (out of scope)
- Audit `OptionsPicker` and any Calendar/DatePicker popovers for the same z issue.
