# FilterChip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `FilterChip` — a compound primitive in `@eocrm/design-system` modeling the "active filter" pill (Label + tone-dotted Value + dismiss button). First consumer: the Audit mockup, which retires its escape-hatch Badge chips and closes the `DismissibleBadge` TODO.

**Architecture:** Single `.tsx` with a compound API (`FilterChip`, `FilterChip.Label`, `FilterChip.Value`). Root spreads its children plus a dismiss `<button>` when `onDismiss` is passed. No internal context — the parts are pure-presentation and self-contained. Tone-colored 6px dot on Value is a small `<span>` keyed off `data-tone` for the SCSS color map.

**Tech Stack:** React 19, TypeScript, Vitest + React Testing Library, SCSS modules, `lucide-react` X icon. No new deps.

**Spec:** `docs/superpowers/specs/2026-05-26-filter-chip-design.md`

**Branch:** `feat/filter-chip` (already checked out from spec commit)

---

## File Structure

| File | Role |
|---|---|
| `packages/design-system/src/components/FilterChip/FilterChip.tsx` (NEW) | Root + Label + Value + dismiss in one file |
| `packages/design-system/src/components/FilterChip/FilterChip.module.scss` (NEW) | Pill, tone-dot color map, dismiss-button hover, token-only |
| `packages/design-system/src/components/FilterChip/FilterChip.test.tsx` (NEW) | Hard rule 1 minimum + behavior tests |
| `packages/design-system/src/components/FilterChip/index.ts` (NEW) | Public exports |
| `packages/design-system/src/index.ts` (MODIFY) | Add FilterChip + types to public exports |
| `packages/design-system/AGENTS.md` (MODIFY) | TL;DR + canonical snippet |
| `packages/design-system/src/_meta/manifest.ts` (MODIFY) | Cluster mapping `FilterChip: 'Display'` |
| `packages/design-system/scripts/generate-manifest.mjs` (MODIFY) | Same cluster mapping (parallel JS copy) |
| `packages/design-system/src/components/TODO.md` (MODIFY) | Remove the `DismissibleBadge` entry — replaced by FilterChip |
| `packages/playground/src/pages/components/FilterChipDemo.tsx` (NEW) | DemoLayout + 4 InputExample blocks |
| `packages/playground/src/App.tsx` (MODIFY) | Route + import |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY) | Sidebar entry under Display cluster |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` (MODIFY) | Overview card |
| `packages/playground/src/pages/mockups/registry.ts` (MODIFY) | `ComponentName` union + audit `usesComponents` |
| `packages/playground/src/pages/mockups/Audit/Audit.tsx` (MODIFY) | Replace Badge-with-X chips with `<FilterChip>` |

---

## Task 1: Scaffold + smoke tests

**Files:**
- Create: `packages/design-system/src/components/FilterChip/FilterChip.tsx`
- Create: `packages/design-system/src/components/FilterChip/FilterChip.module.scss`
- Create: `packages/design-system/src/components/FilterChip/FilterChip.test.tsx`
- Create: `packages/design-system/src/components/FilterChip/index.ts`

- [ ] **Step 1: Create the TSX file with the compound API**

Write `packages/design-system/src/components/FilterChip/FilterChip.tsx`:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Text } from '../Text';
import { type BadgeTone } from '../Badge';
import styles from './FilterChip.module.scss';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface FilterChipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /**
   * Optional dismiss callback. When provided, a `×` button renders at the
   * end of the chip; clicking it fires this handler. Omit to render a
   * read-only chip.
   */
  onDismiss?: () => void;
  /**
   * Override the default `aria-label` on the dismiss button. Default
   * `'Remove filter'`. Pass a more specific label (e.g.,
   * `'Remove Event: auth.* filter'`) for screen-reader clarity.
   */
  dismissLabel?: string;
  children: ReactNode;
}

export interface FilterChipLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export interface FilterChipValueProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Optional dot tone — adds a colored 6px circle before the value text.
   * Use to distinguish filter categories. Omit for plain text values.
   */
  tone?: BadgeTone;
  children: ReactNode;
}

// ----------------------------------------------------------------------------
// Root
// ----------------------------------------------------------------------------

const FilterChipRoot = forwardRef<HTMLDivElement, FilterChipProps>(function FilterChipRoot(
  { onDismiss, dismissLabel = 'Remove filter', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.chip, className)}
      // role="group" so screen readers announce the chip as a single unit.
      // Placed AFTER {...rest} so consumer can't accidentally override (locked semantics).
      {...rest}
      role="group"
    >
      {children}
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label={dismissLabel}
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </div>
  );
});

// ----------------------------------------------------------------------------
// Label
// ----------------------------------------------------------------------------

const FilterChipLabel = forwardRef<HTMLSpanElement, FilterChipLabelProps>(function FilterChipLabel(
  { className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(styles.label, className)} {...rest}>
      <Text size="sm" tone="muted">
        {children}
      </Text>
    </span>
  );
});

// ----------------------------------------------------------------------------
// Value
// ----------------------------------------------------------------------------

const FilterChipValue = forwardRef<HTMLSpanElement, FilterChipValueProps>(function FilterChipValue(
  { tone, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(styles.value, className)} {...rest}>
      {tone && <span className={styles.dot} data-tone={tone} aria-hidden />}
      <Text size="sm">{children}</Text>
    </span>
  );
});

// ----------------------------------------------------------------------------
// Compound export
// ----------------------------------------------------------------------------

export const FilterChip = Object.assign(FilterChipRoot, {
  Label: FilterChipLabel,
  Value: FilterChipValue,
});
```

- [ ] **Step 2: Create the SCSS module**

Write `packages/design-system/src/components/FilterChip/FilterChip.module.scss`:

```scss
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg-base);
}

.label {
  display: inline-flex;
  align-items: center;
}

.value {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  flex-shrink: 0;

  // Tone color map — drives the 6px dot's background per filter category.
  &[data-tone='neutral'] {
    background: var(--color-fg-subtle);
  }
  &[data-tone='info'] {
    background: var(--color-info-base);
  }
  &[data-tone='success'] {
    background: var(--color-success-base);
  }
  &[data-tone='warning'] {
    background: var(--color-warning-base);
  }
  &[data-tone='danger'] {
    background: var(--color-danger-base);
  }
  &[data-tone='purple'] {
    background: var(--color-purple-base);
  }
}

.dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-fg-subtle);

  &:hover {
    background: var(--color-bg-muted);
    color: var(--color-fg-default);
  }

  &:focus-visible {
    @include focus-ring;
  }
}
```

Note: the `@include focus-ring` requires `@use` at the top. Add this as the first line:

```scss
@use '../../styles/mixins' as *;
```

If the actual `mixins` path or focus-ring name differs, check `packages/design-system/src/components/OptionsPicker/OptionsPicker.module.scss` line 1 for the canonical pattern (it uses the same mixin). Adjust to match.

If any token name in the tone map doesn't exist (e.g., `--color-purple-base` might be `--color-violet-base`), grep `packages/design-system/src/styles/tokens.scss` for the actual names and update the map. Hard rule 3 forbids raw values.

- [ ] **Step 3: Create the index re-exports**

Write `packages/design-system/src/components/FilterChip/index.ts`:

```ts
export { FilterChip } from './FilterChip';
export type {
  FilterChipProps,
  FilterChipLabelProps,
  FilterChipValueProps,
} from './FilterChip';
```

- [ ] **Step 4: Write the smoke tests**

Write `packages/design-system/src/components/FilterChip/FilterChip.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChip } from './FilterChip';

it('renders Label + Value text', () => {
  render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByText('Event')).toBeInTheDocument();
  expect(screen.getByText('auth.*')).toBeInTheDocument();
});

it('renders dismiss button only when onDismiss is provided', () => {
  const { rerender } = render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.queryByRole('button', { name: 'Remove filter' })).not.toBeInTheDocument();

  rerender(
    <FilterChip onDismiss={() => {}}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByRole('button', { name: 'Remove filter' })).toBeInTheDocument();
});

it('clicking the dismiss button fires onDismiss', async () => {
  const user = userEvent.setup();
  const onDismiss = vi.fn();
  render(
    <FilterChip onDismiss={onDismiss}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  await user.click(screen.getByRole('button', { name: 'Remove filter' }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('dismiss button is keyboard-actionable (Enter, Space)', async () => {
  const user = userEvent.setup();
  const onDismiss = vi.fn();
  render(
    <FilterChip onDismiss={onDismiss}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  const dismissBtn = screen.getByRole('button', { name: 'Remove filter' });
  dismissBtn.focus();
  await user.keyboard('{Enter}');
  expect(onDismiss).toHaveBeenCalledTimes(1);
  await user.keyboard(' ');
  expect(onDismiss).toHaveBeenCalledTimes(2);
});

it('dismissLabel overrides the default aria-label', () => {
  render(
    <FilterChip
      onDismiss={() => {}}
      dismissLabel="Remove Event: auth.* filter"
    >
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(
    screen.getByRole('button', { name: 'Remove Event: auth.* filter' }),
  ).toBeInTheDocument();
});

it('Value renders a tone dot when tone is set', () => {
  const { container, rerender } = render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  // No tone → no dot
  expect(container.querySelector('[data-tone]')).toBeNull();

  rerender(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value tone="info">auth.*</FilterChip.Value>
    </FilterChip>,
  );
  const dot = container.querySelector('[data-tone="info"]');
  expect(dot).not.toBeNull();
  expect(dot).toHaveAttribute('aria-hidden');
});

it('root has role="group"', () => {
  const { container } = render(
    <FilterChip>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value>auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(container.firstElementChild).toHaveAttribute('role', 'group');
});

it('className on root, Label, and Value merges with internal styles', () => {
  const { container } = render(
    <FilterChip className="custom-chip">
      <FilterChip.Label className="custom-label">Event</FilterChip.Label>
      <FilterChip.Value className="custom-value">auth.*</FilterChip.Value>
    </FilterChip>,
  );
  expect(container.firstElementChild).toHaveClass('custom-chip');
  expect(container.querySelector('.custom-label')).toBeInTheDocument();
  expect(container.querySelector('.custom-value')).toBeInTheDocument();
});

it('value-only chip (no label) renders cleanly', () => {
  render(
    <FilterChip onDismiss={() => {}}>
      <FilterChip.Value tone="warning">Platform only</FilterChip.Value>
    </FilterChip>,
  );
  expect(screen.getByText('Platform only')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove filter' })).toBeInTheDocument();
});
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm test -- FilterChip 2>&1 | tail -15
```
Expected: 9 tests pass.

If the `Value renders a tone dot` test fails because the dot's `aria-hidden` lands as `aria-hidden="true"` instead of bare `aria-hidden`, change the assertion to `.toHaveAttribute('aria-hidden', 'true')` or remove the second assertion and rely on the existence check alone.

If the `role="group"` test fails because the container's firstElementChild is the wrapper from React Testing Library, query directly: `expect(screen.getByRole('group')).toBeInTheDocument()` instead.

- [ ] **Step 6: Typecheck**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -5
```
Expected: clean exit.

- [ ] **Step 7: Lint**

```bash
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -5
```
Expected: clean. If SCSS lint catches anything (e.g., the `&[data-tone='X']` pattern), check `packages/design-system/.stylelintrc.json` for the allowed selector form and adjust.

- [ ] **Step 8: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/FilterChip
git commit -m "$(cat <<'EOF'
FilterChip: scaffold compound primitive (Root + Label + Value)

Pill container with optional dismiss button (auto-renders when
onDismiss is provided). Value carries an optional tone dot via
data-tone attribute mapped to token colors. Tests cover render,
dismiss click + keyboard, aria-label override, tone dot presence,
role=group on root, and className merging.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Public exports + manifest + AGENTS.md

**Files:**
- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/_meta/manifest.ts`
- Modify: `packages/design-system/scripts/generate-manifest.mjs`
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add to library index**

Open `packages/design-system/src/index.ts`. Find the alphabetic location for `FilterChip` (between `Drawer`/`DropdownMenu` neighbors and `Grid`/`ImageCrop` — depends on existing order). Add:

```ts
export { FilterChip } from './components/FilterChip';
export type {
  FilterChipProps,
  FilterChipLabelProps,
  FilterChipValueProps,
} from './components/FilterChip';
```

Match the existing ordering convention (read 5–10 lines before/after the insertion point).

- [ ] **Step 2: Add to manifest source**

Open `packages/design-system/src/_meta/manifest.ts`. Find the `CLUSTERS` map. Add an entry:

```ts
FilterChip: 'Display',
```

Place alphabetically.

- [ ] **Step 3: Add to the parallel generator script**

Open `packages/design-system/scripts/generate-manifest.mjs`. It has a parallel `CLUSTERS` map (JS copy of the TS one). Add the same entry:

```js
FilterChip: 'Display',
```

- [ ] **Step 4: Regenerate the manifest**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npm run build:manifest 2>&1 | tail -3
```

This rewrites `packages/design-system/src/components.manifest.json`. Verify the file now lists `FilterChip` with `cluster: "Display"`.

- [ ] **Step 5: Add JSDoc to the FilterChip root**

Open `packages/design-system/src/components/FilterChip/FilterChip.tsx`. Add this JSDoc block immediately above `function FilterChipRoot(`:

```tsx
/**
 * Dismissible "active filter" pill — the chips above a filter bar that show
 * which filters are currently applied. Compound API: `<FilterChip>` root
 * with optional `<FilterChip.Label>` and `<FilterChip.Value>` children.
 * A dismiss button auto-renders at the end when `onDismiss` is provided.
 *
 * Use it for filter UX (audit log, contacts owner filter, deals stage
 * filter). Not for tags / status pills — use `<Badge>` for those.
 *
 * @example
 * // Label + tone-dotted value + dismiss
 * <FilterChip onDismiss={() => removeFilter('event')}>
 *   <FilterChip.Label>Event</FilterChip.Label>
 *   <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
 * </FilterChip>
 *
 * @example
 * // Value-only (no label slot, no tone)
 * <FilterChip onDismiss={() => removeFilter('tenant')}>
 *   <FilterChip.Value>beta</FilterChip.Value>
 * </FilterChip>
 *
 * @example
 * // Read-only (no dismiss button)
 * <FilterChip>
 *   <FilterChip.Label>Status</FilterChip.Label>
 *   <FilterChip.Value>Active</FilterChip.Value>
 * </FilterChip>
 *
 * @remarks When NOT to use
 * - Status/category pills with no dismiss UX — use `<Badge>` instead.
 *   FilterChip's white pill + thin border + optional X is purpose-built
 *   for "currently applied filter", not "this contact is a VIP".
 * - Tags on an entity (e.g., deal labels) — `<Badge>` again. Tags don't
 *   carry a `Label: Value` shape.
 *
 * @remarks Anti-patterns
 * - ❌ Putting interactive children inside `<FilterChip.Label>` or
 *   `<FilterChip.Value>`. The dismiss button is the only interactive
 *   target. Wrapping a Button inside the chip violates `role="group"`
 *   composition and confuses screen readers.
 * - ❌ Calling `onDismiss` and expecting the chip to animate out. The
 *   chip doesn't animate — the consumer's state update unmounts it.
 *   Wrap the chip in your own transition if you need one.
 */
```

- [ ] **Step 6: Add AGENTS.md section**

Open `packages/design-system/AGENTS.md`. Find the right alphabetic location — likely between `Drawer` / `DropdownMenu` neighbors. The existing file is ordered by use-affinity rather than strict alpha (e.g., the OptionsPicker section follows Select). For FilterChip, place it near Badge or after `DropdownMenu` since both are display primitives.

Add this section:

````markdown
## FilterChip

**Use for "currently applied" filter pills, not tags.** A compound chip that
shows `Label: Value` with an optional colored dot and an auto-rendered
dismiss button. Pair with `OptionsPicker` triggers: the picker selects,
chips show what's selected.

```tsx
<FilterChip onDismiss={() => removeFilter('event')}>
  <FilterChip.Label>Event</FilterChip.Label>
  <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
</FilterChip>
```

`<FilterChip.Value tone={…}>` adds the colored 6px dot. Omit `tone` for a plain
value (e.g., a tenant slug). Omit `onDismiss` for a read-only chip.

Don't use for tags / status badges (use `<Badge>`), or as a clickable filter
trigger (use `<Button>` or `<OptionsPicker.Trigger>`).
````

- [ ] **Step 7: Gates**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system/packages/design-system && npm run typecheck 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

Expected: tests pass (count rises by 9 — Task 1's tests are now counted), typecheck clean, lint clean, build clean. The manifest's structure test should pass because `FilterChip` is now both re-exported AND has a cluster assignment.

- [ ] **Step 8: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/src/components.manifest.json packages/design-system/src/components/FilterChip/FilterChip.tsx packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
FilterChip: public exports, manifest, JSDoc, AGENTS.md TL;DR

Adds FilterChip (+ all types) to the library's public surface and
registers it in the Display cluster. JSDoc carries three @example
blocks (label+tone, value-only, read-only) and "When NOT to use" +
"Anti-patterns" remarks per Hard rule 7. AGENTS.md gains a one-section
TL;DR with the canonical snippet.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Component demo + nav wiring

**Files:**
- Create: `packages/playground/src/pages/components/FilterChipDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Create the demo page**

Write `packages/playground/src/pages/components/FilterChipDemo.tsx`:

```tsx
import { useState } from 'react';
import { Cluster, FilterChip } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import tsxSource from '@lib-source/components/FilterChip/FilterChip.tsx?raw';
import scssSource from '@lib-source/components/FilterChip/FilterChip.module.scss?raw';

export function FilterChipDemo() {
  const [chips, setChips] = useState<string[]>(['event', 'tenant']);
  const removeChip = (id: string) => setChips((prev) => prev.filter((c) => c !== id));

  return (
    <DemoLayout
      name="FilterChip"
      componentName="FilterChip"
      description='Dismissible "active filter" pill: Label + tone-dotted Value + auto-rendered × button when onDismiss is passed.'
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="FilterChip.tsx"
      scssFilename="FilterChip.module.scss"
    >
      <Example
        title="Label + tone-dotted value + dismiss"
        description="The canonical filter-chip shape. tone='info' prefixes a 6px blue dot before the value text."
        code={`<FilterChip onDismiss={() => removeChip('event')}>
  <FilterChip.Label>Event</FilterChip.Label>
  <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
</FilterChip>`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            {chips.includes('event') && (
              <FilterChip onDismiss={() => removeChip('event')}>
                <FilterChip.Label>Event</FilterChip.Label>
                <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
              </FilterChip>
            )}
            {chips.includes('tenant') && (
              <FilterChip onDismiss={() => removeChip('tenant')}>
                <FilterChip.Label>Tenant</FilterChip.Label>
                <FilterChip.Value>beta</FilterChip.Value>
              </FilterChip>
            )}
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Tone variants"
        description="One chip per BadgeTone — info / success / warning / danger / purple / neutral. The dot color is sourced from the matching token."
        code={`<FilterChip onDismiss={() => {}}>
  <FilterChip.Label>Event</FilterChip.Label>
  <FilterChip.Value tone="success">auth.login_succeeded</FilterChip.Value>
</FilterChip>`}
      >
        <InputExample width="auto">
          <Cluster gap="sm" wrap>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="info">role.assigned</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="success">auth.login_succeeded</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="warning">invitation.expired</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="danger">auth.login_failed</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="purple">deal.won</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Label>Event</FilterChip.Label>
              <FilterChip.Value tone="neutral">system_setting.updated</FilterChip.Value>
            </FilterChip>
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Value-only (no label)"
        description="Omit the Label subcomponent for chips that don't need a category prefix."
        code={`<FilterChip onDismiss={() => {}}>
  <FilterChip.Value tone="warning">Platform only</FilterChip.Value>
</FilterChip>`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Value tone="warning">Platform only</FilterChip.Value>
            </FilterChip>
            <FilterChip onDismiss={() => {}}>
              <FilterChip.Value>acme</FilterChip.Value>
            </FilterChip>
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Read-only (no dismiss button)"
        description="Omit onDismiss to render a static chip with no × button — useful for displaying filters that aren't user-removable."
        code={`<FilterChip>
  <FilterChip.Label>Status</FilterChip.Label>
  <FilterChip.Value>Active</FilterChip.Value>
</FilterChip>`}
      >
        <InputExample width="auto">
          <FilterChip>
            <FilterChip.Label>Status</FilterChip.Label>
            <FilterChip.Value>Active</FilterChip.Value>
          </FilterChip>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
```

If the `DemoLayout`/`Example`/`InputExample` prop names differ from what's shown above, read `packages/playground/src/pages/components/DemoLayout.tsx` and adjust. The OptionsPicker demo at `packages/playground/src/pages/components/OptionsPickerDemo.tsx` is a close reference for the structure.

- [ ] **Step 2: Add route in App.tsx**

Open `packages/playground/src/App.tsx`. Add the import at the top (alphabetically):

```tsx
import { FilterChipDemo } from './pages/components/FilterChipDemo';
```

Add the route alongside the other component routes:

```tsx
<Route path="/components/filter-chip" element={<FilterChipDemo />} />
```

- [ ] **Step 3: Add sidebar entry in AppShell**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. Locate the `componentGroups` map. `FilterChip` belongs in the **Display** group (matching its manifest cluster — sits with Badge, Avatar, Code, etc.). Add the entry (icon name is your judgment; `Tag` from lucide-react is a good semantic fit):

```tsx
{ to: '/components/filter-chip', label: 'FilterChip', icon: Tag, end: false },
```

Add the `Tag` import at the top if not already imported:

```tsx
import { Tag, /* …other lucide icons… */ } from 'lucide-react';
```

If `Tag` is already imported, just add it to the existing import list. If the `icon` field isn't part of the sidebar shape (read the existing entries first to confirm), match whatever shape they use.

- [ ] **Step 4: Add card to ComponentsIndex**

Open `packages/playground/src/pages/components/ComponentsIndex.tsx`. Read the file structure first — it may iterate over a constant array of cards. Add the FilterChip card matching the existing pattern:

```tsx
{
  name: 'FilterChip',
  path: '/components/filter-chip',
  description: 'Dismissible "active filter" pill — Label + tone-dotted Value + ×.',
  preview: (
    <FilterChip onDismiss={() => {}}>
      <FilterChip.Label>Event</FilterChip.Label>
      <FilterChip.Value tone="info">auth.*</FilterChip.Value>
    </FilterChip>
  ),
},
```

Make sure to add the `FilterChip` import if needed.

- [ ] **Step 5: Add to ComponentName union**

Open `packages/playground/src/pages/mockups/registry.ts`. Add `'FilterChip'` to the `ComponentName` union (alphabetically — between `EmptyState` / `FileUpload` neighbors based on existing ordering).

- [ ] **Step 6: Gates**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

Expected: all green. If `make build` fails on a missing primitive prop, walk back and read the actual primitive's source.

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/components/FilterChipDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
FilterChip: playground demo + routes + sidebar + index card

Four examples: canonical label+tone, full tone palette, value-only,
read-only. Wired into the Display cluster in the sidebar, the
ComponentsIndex overview card, and the ComponentName union.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Audit mockup integration + TODO cleanup

**Files:**
- Modify: `packages/playground/src/pages/mockups/Audit/Audit.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`
- Modify: `packages/design-system/src/components/TODO.md`

- [ ] **Step 1: Read current chip block in Audit.tsx**

```bash
grep -n "Badge\|removeChip\|cursor: 'pointer'\|escape hatch" /Users/dpws/projects/design-system/packages/playground/src/pages/mockups/Audit/Audit.tsx | head -20
```

Locate the `chips.map` block. It looks roughly like:

```tsx
{chips.map((c) => (
  // TODO: replace inline cursor style when DismissibleBadge ships — …
  <Badge
    key={c.key}
    tone={c.tone}
    dot="start"
    role="button"
    tabIndex={0}
    onClick={() => removeChip(c.key)}
    onKeyDown={(e) => { … }}
    aria-label={`Remove ${c.label}: ${c.value} filter`}
    style={{ cursor: 'pointer' }}
  >
    {c.label}: {c.value} <X size={12} aria-hidden />
  </Badge>
))}
```

- [ ] **Step 2: Update the Audit imports**

In `packages/playground/src/pages/mockups/Audit/Audit.tsx`, add `FilterChip` to the design-system import block (alphabetically — between `Divider` and `OptionsPicker`):

```tsx
import {
  Avatar,
  Badge,
  Button,
  Cluster,
  Code,
  DataTable,
  DefinitionList,
  Divider,
  FilterChip,
  OptionsPicker,
  PageHeader,
  Stack,
  Text,
  Tooltip,
  useDataTable,
  type BadgeTone,
  type ColumnDef,
} from '@eocrm/design-system';
```

Also REMOVE the `X` icon from the `lucide-react` import if it's only used by the chip block (it'll be re-added by FilterChip internally). Grep for other usages first:

```bash
grep -n "<X " packages/playground/src/pages/mockups/Audit/Audit.tsx
```

If `<X` only appears in the chip block, remove it from the lucide-react import. Otherwise leave it.

- [ ] **Step 3: Replace the chip block**

Find the `{chips.map((c) => (...))}` block and replace it with:

```tsx
{chips.map((c) => (
  <FilterChip
    key={c.key}
    onDismiss={() => removeChip(c.key)}
    dismissLabel={`Remove ${c.label}: ${c.value} filter`}
  >
    <FilterChip.Label>{c.label}</FilterChip.Label>
    <FilterChip.Value tone={c.tone === 'neutral' ? undefined : c.tone}>
      {c.value}
    </FilterChip.Value>
  </FilterChip>
))}
```

- [ ] **Step 4: Verify Badge is still used elsewhere in the file**

```bash
grep -n "Badge" packages/playground/src/pages/mockups/Audit/Audit.tsx | head -10
```

If Badge is still used (e.g., the impersonation badge in the Actor column), keep the import. Otherwise drop it.

- [ ] **Step 5: Update audit `usesComponents` array in registry**

Open `packages/playground/src/pages/mockups/registry.ts`. Find the `audit` mockup entry. Add `'FilterChip'` to its `usesComponents` array alphabetically. If Badge is no longer used in the mockup, remove it; otherwise leave it.

- [ ] **Step 6: Remove the DismissibleBadge TODO entry**

Open `packages/design-system/src/components/TODO.md`. Find the section header `### ChipBar / DismissibleBadge` (or similar). DELETE the entire section through to the next `### ` heading (or end of file). The replacement primitive (`FilterChip`) has shipped, so the TODO is closed.

If the TODO file becomes empty after removal, keep the `# Wishlist` H1 (or whatever top-level header it has) and leave a comment or placeholder so the file stays as an intentional artifact rather than vanishing.

- [ ] **Step 7: Gates**

```bash
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -5
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
```

Expected: all green. If lint fails on the now-unused `X` icon import, remove it.

- [ ] **Step 8: Manual verification**

If the dev server is running at `http://localhost:8080`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/mockups/audit
```

If it returns `200`, navigate to `/mockups/audit` and confirm:
- Three filter chips render with the new pill shape (label + dot + value + ×).
- Clicking × on any chip removes it.
- The page still renders identically (no Badge-with-cursor remnant).

If the dev server isn't running, ask the user to run `make up` and confirm when ready — don't start the dev server from the agent.

- [ ] **Step 9: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/Audit/Audit.tsx packages/playground/src/pages/mockups/registry.ts packages/design-system/src/components/TODO.md
git commit -m "$(cat <<'EOF'
Audit mockup: retire Badge-with-X chips for real FilterChip

Replaces the escape-hatch Badge composition (with role=button +
inline cursor: pointer + manual onKeyDown) with native <FilterChip>
instances. Closes the DismissibleBadge TODO; that primitive shipped
as FilterChip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Hard rule 8 review-fix cycle

**Files:** depends on review findings.

Per `packages/design-system/CLAUDE.md` Hard rule 8, library changes go through a fresh-context review-fix loop until verdict is `clean enough to stop`.

- [ ] **Step 1: Final gate sweep**

```bash
cd /Users/dpws/projects/design-system && npm test 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm run typecheck --workspaces --if-present 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make lint 2>&1 | tail -3
cd /Users/dpws/projects/design-system && make build 2>&1 | tail -5
cd /Users/dpws/projects/design-system && npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "\.(test|spec)\.tsx?$" | head -5
```

All four gates must be green, and the `npm pack` grep must produce zero output (no test files in the tarball).

- [ ] **Step 2: Spawn the review agent**

Use the `Agent` tool (`subagent_type: general-purpose`) with a prompt covering the 10 Hard rule 8 categories from `packages/design-system/CLAUDE.md`. Brief the agent on:

- Files changed: read `git diff main..HEAD --stat`.
- Required reading: `packages/design-system/CLAUDE.md` (rules 1–8), `packages/design-system/AGENTS.md`, the spec at `docs/superpowers/specs/2026-05-26-filter-chip-design.md`, and the FilterChip source + tests.
- 10 categories: bugs, a11y, API inconsistencies, type safety, rule violations, test coverage, token discipline, SCSS, cross-package leakage, package/distribution.
- Output format: Critical / Important / Nice-to-have / Regression-watch + final verdict.

- [ ] **Step 3: Address Critical + Important findings**

Fix each Critical and Important finding. Skip Nice-to-have judiciously with a one-line explanation per skip.

- [ ] **Step 4: Re-run gates**

```bash
cd /Users/dpws/projects/design-system && npm test && make lint && make build 2>&1 | tail -10
```

- [ ] **Step 5: Re-spawn review agent**

Same prompt. Repeat Steps 3–5 until verdict is `clean enough to stop`.

- [ ] **Step 6: Commit review-fix changes (if any)**

If any review-fix changes landed but weren't committed during the loop, commit them now with a message describing the round.

---

## Task 6: Push + PR

**Files:** none.

- [ ] **Step 1: Push the branch**

```bash
cd /Users/dpws/projects/design-system && git push -u origin feat/filter-chip 2>&1 | tail -10
```

Expected: pre-push hook (prettier + stylelint + typecheck) passes; branch pushed.

If prettier fails on any file, run `npx prettier --write <files>` for the flagged paths, commit as a separate `chore: prettier` commit, and re-push.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "FilterChip: dismissible \"active filter\" pill" --body "$(cat <<'EOF'
## Summary

New compound primitive in `@eocrm/design-system` — `FilterChip` — modeling the "active filter" pill. Compound API with `<FilterChip>` root + `<FilterChip.Label>` + `<FilterChip.Value>`. Dismiss button auto-renders when the root receives an `onDismiss` callback. Optional `tone` on Value adds a colored 6px dot.

First consumer: the Audit mockup retires its escape-hatch Badge chips (role=button + inline cursor: pointer + manual keyboard handling) and closes the `DismissibleBadge` TODO.

- Spec: `docs/superpowers/specs/2026-05-26-filter-chip-design.md`
- Plan: `docs/superpowers/plans/2026-05-26-filter-chip.md`

## Test plan

- [x] Unit tests — 9 new on FilterChip covering: render, dismiss click + keyboard, aria-label override, tone dot presence, role=group, className merging, value-only.
- [x] `make build`, `make lint`, `npm run typecheck` — all green
- [x] `npm pack --dry-run` — no test files in the tarball
- [x] Hard rule 8 review-fix cycle — final verdict `clean enough to stop`
- [x] Component demo at `/components/filter-chip` with 4 examples
- [x] Audit mockup at `/mockups/audit` — filter chips render as real `<FilterChip>`; X removes them; no Badge-with-cursor remnant
- [x] `DismissibleBadge` TODO removed from `packages/design-system/src/components/TODO.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" 2>&1 | tail -3
```

- [ ] **Step 3: Report the PR URL**

The `gh pr create` command outputs the PR URL on success. Report it back.

---

## Self-Review

**1. Spec coverage:**
- Compound API (`<FilterChip>` + `.Label` + `.Value`) — Task 1 ✓
- `onDismiss` auto-renders the × — Task 1 ✓
- `tone` on Value adds a 6px colored dot — Task 1 ✓
- Read-only chip (no dismiss) — Task 1 (test) + Task 3 (demo) ✓
- Value-only chip (no label) — Task 1 (test) + Task 3 (demo) ✓
- `role="group"` on root, `aria-hidden` on dot — Task 1 ✓
- `aria-label` on dismiss with `dismissLabel` override — Task 1 ✓
- Files at correct paths — Task 1 ✓
- Public exports — Task 2 ✓
- Manifest cluster `Display` — Task 2 ✓
- JSDoc + AGENTS.md — Task 2 ✓
- Component demo + nav + index card + ComponentName union — Task 3 ✓
- Audit mockup integration — Task 4 ✓
- TODO closure — Task 4 ✓
- Hard rule 8 review-fix loop — Task 5 ✓
- Push + PR — Task 6 ✓
- Out-of-scope items (no size variants, no animation, no drag) — covered by their absence ✓

**2. Placeholder scan:** no "TBD" / "TODO" / "implement later" / vague "add appropriate handling." Every step has concrete code, commands, or instructions.

**3. Type consistency:**
- `FilterChipProps`, `FilterChipLabelProps`, `FilterChipValueProps` defined in Task 1 and re-exported identically in Task 2.
- `onDismiss?: () => void` consistent across spec, types, runtime check, and tests.
- `dismissLabel?: string` with `'Remove filter'` default consistent in spec + Task 1 + Task 1 tests + Task 4 audit integration.
- `tone?: BadgeTone` on Value uses the existing `BadgeTone` type from `../Badge` — same union the rest of the library uses.
- `data-tone` attribute referenced by both Task 1's TSX and Task 1's SCSS map.

One known risk surfaced as instructions (not gaps): the `--color-purple-base` token may have a different name (`--color-violet-base` etc.); Task 1 Step 2 includes a grep-and-substitute fallback. Similarly the `focus-ring` mixin path may differ — Task 1 Step 2 notes the OptionsPicker pattern as the canonical reference.
