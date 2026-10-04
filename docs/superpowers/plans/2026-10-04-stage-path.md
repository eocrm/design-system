# StagePath Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<StagePath>`: a chevron row of ordered record stages (done / current / upcoming), optionally clickable, with an outcome `tone`. It is complete per the repo's new-component invariant.

**Architecture:** One forwardRef component that renders `<ol>` → `<li>` → (`<button>` | `<span>`). Each stage's visible shape is a `clip-path` polygon, and stages overlap by the arrow depth so the chevrons interlock. Clipped labels get a controlled `Tooltip` through a new `_internal/useClippedTooltip` hook, extracted from `EntityChip` (which is migrated onto it).

**Tech Stack:** React 19 + TypeScript, CSS Modules (SCSS), Vitest + Testing Library, `clsx`, the library's `Tooltip` / `VisuallyHidden` / i18n.

**Spec:** `docs/superpowers/specs/2026-10-04-stage-path-design.md`

## Global Constraints

- Branch: `feat/stage-path` (already created; the spec is committed on it). One PR at the end.
- Props exactly: `stages: StagePathStage[]` (`{ id: string; label: ReactNode }`), `value: string` (required), `tone?: 'default' | 'success' | 'danger'` (default `'default'`), `onStageChange?: (id: string) => void`, plus `<ol>` HTML attributes; `ref` → `<ol>`.
- `md` only: height `--size-md` (32px). No `size` prop.
- The current stage is never a button. With `onStageChange`, every other stage is a `<button type="button">`.
- `tone` recolours done + current; upcoming stays neutral in every tone.
- Unknown `value`: every stage is upcoming, plus a dev-only `console.warn`. Never throw.
- No raw colours / spacing / radii in `.module.scss`. Everything comes through `StagePath.tokens.scss` → existing primitives. No new `tokens.json` entries.
- Rule 4: no `margin` except the one documented interlock overlap, with a `stylelint-disable-next-line property-disallowed-list -- <reason>` comment. Root `width: 100%`.
- Focus via `:focus-visible` only.
- Playground imports only from `@eocrm/design-system`.
- Vitest runs from `packages/design-system` (no root vitest config). `lint:css` and `format:check` run from the repo root.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. **No `Claude-Session:` trailer, no session URL.**

## Review Focus

1. **Interlocking geometry.** Adjacent chevrons must nest with a thin even gap (≈ `--space-05`), not a 12px V-shaped hole. The overlap (`margin-inline-start: calc(var(--space-05) - arrow)`) is what does this; verify in the browser in LTR **and** RTL.
2. **Pointer hit-testing in the overlap.** Clicking the visible tip of stage _n_ (which sits inside stage _n+1_'s box) must call `onStageChange` for stage _n_. `clip-path` excludes clipped regions from hit-testing; verify in the browser by clicking the tips.
3. **Hover contrast in light danger.** An 8% `color-mix` hover on `--color-tone-danger-bg` measured 4.62:1 against its fg. Don't raise the mix above 8%.
4. **Long / ReactNode labels.** A non-string label (e.g. `<b>Proposal</b>`) still truncates, and its tooltip shows plain text. Pinned by the `useClippedTooltip` tests (Task 1) and a StagePath smoke test (Task 2).
5. **`value` changing to an unknown id after mount** (a stale server value) must not crash, and warns once per value. Pinned in Task 2's tests.

---

## File Structure

| File                                                                                      | Responsibility                                                          |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/design-system/src/components/_internal/useClippedTooltip.ts` (create)           | Controlled-tooltip state that opens only when a label element overflows |
| `packages/design-system/src/components/_internal/useClippedTooltip.test.tsx` (create)     | Hook tests                                                              |
| `packages/design-system/src/components/EntityChip/EntityChip.tsx` (modify)                | Use the hook instead of inline state                                    |
| `packages/design-system/src/components/StagePath/StagePath.tsx` (create)                  | Component                                                               |
| `packages/design-system/src/components/StagePath/StagePath.module.scss` (create)          | Shape, states, tones, focus                                             |
| `packages/design-system/src/components/StagePath/StagePath.tokens.scss` (create)          | Component tokens                                                        |
| `packages/design-system/src/components/StagePath/StagePath.test.tsx` (create)             | Tests                                                                   |
| `packages/design-system/src/components/StagePath/index.ts` (create)                       | Barrel                                                                  |
| `packages/design-system/src/index.ts` (modify)                                            | Re-export                                                               |
| `packages/design-system/src/i18n/{messages,en,ru}.ts` (modify)                            | `stagePath.completed` / `stagePath.upcoming`                            |
| `packages/design-system/src/styles/contrast.test.ts` (modify)                             | Pin the four `--color-tone-*` text pairs StagePath paints               |
| `packages/design-system/src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` (modify) | `StagePath: 'Display'`                                                  |
| `packages/playground/src/pages/components/StagePathDemo.tsx` (create) + 5 wiring files    | Demo                                                                    |
| `packages/design-system/docs/components/StagePath.md` (create), `AI-PRIMER.md` (modify)   | Docs                                                                    |

---

### Task 1: Extract `useClippedTooltip` and migrate EntityChip

**Files:**

- Create: `packages/design-system/src/components/_internal/useClippedTooltip.ts`
- Create: `packages/design-system/src/components/_internal/useClippedTooltip.test.tsx`
- Modify: `packages/design-system/src/components/EntityChip/EntityChip.tsx` (≈ lines 443–509 state/handlers; ≈ 574–575 the label `Tooltip`)

**Interfaces:**

- Produces: `useClippedTooltip<T extends HTMLElement>(label: ReactNode, enabled?: boolean): { ref: RefObject<T | null>; open: boolean; onOpenChange: (next: boolean) => void; content: ReactNode }`

- [ ] **Step 1: Write the failing hook test**

```tsx
// useClippedTooltip.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Tooltip } from '../Tooltip';
import { useClippedTooltip } from './useClippedTooltip';

// jsdom has no layout: fake the label's box to say whether it is clipped.
function fakeClip(el: HTMLElement, clipped: boolean) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: clipped ? 300 : 100 });
}

function Probe({ label, enabled = true }: { label: ReactNode; enabled?: boolean }) {
  const tip = useClippedTooltip<HTMLSpanElement>(label, enabled);
  return enabled ? (
    <Tooltip content={tip.content} open={tip.open} onOpenChange={tip.onOpenChange}>
      <span ref={tip.ref} data-testid="label">
        {label}
      </span>
    </Tooltip>
  ) : (
    <span data-testid="label">{label}</span>
  );
}

describe('useClippedTooltip', () => {
  it('opens on hover only when the label is clipped', async () => {
    const user = userEvent.setup();
    render(<Probe label="A very long stage name" />);
    const label = screen.getByTestId('label');
    fakeClip(label, false);
    await user.hover(label);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.unhover(label);
    fakeClip(label, true);
    await user.hover(label);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('A very long stage name');
  });

  it('shows plain text for a non-string label', async () => {
    const user = userEvent.setup();
    render(<Probe label={<b>Bold stage</b>} />);
    const label = screen.getByTestId('label');
    fakeClip(label, true);
    await user.hover(label);
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Bold stage');
    expect(tip.querySelector('b')).toBeNull();
  });

  it('does not remount already open after being disabled while open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Probe label="A very long stage name" />);
    const label = screen.getByTestId('label');
    fakeClip(label, true);
    await user.hover(label);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    rerender(<Probe label="A very long stage name" enabled={false} />);
    rerender(<Probe label="A very long stage name" />);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `packages/design-system`): `npx vitest run src/components/_internal/useClippedTooltip.test.tsx`
Expected: FAIL, because `./useClippedTooltip` cannot be resolved.

- [ ] **Step 3: Implement the hook**

```ts
// useClippedTooltip.ts
import { useRef, useState, type ReactNode, type RefObject } from 'react';

export interface ClippedTooltip<T extends HTMLElement> {
  /** Attach to the element whose text may be clipped by an ellipsis. */
  ref: RefObject<T | null>;
  open: boolean;
  /** Pass to `<Tooltip onOpenChange>`; refuses to open unless the label overflows. */
  onOpenChange: (next: boolean) => void;
  /** Pass to `<Tooltip content>`. */
  content: ReactNode;
}

/**
 * State for a controlled `Tooltip` that shows a label's full text only when the
 * label is actually clipped. A fully visible label gets no tooltip and no
 * `aria-describedby`, so it is not announced twice.
 *
 * `content`: a STRING `label` is used directly, so it is always fresh off the
 * prop, even if it changes while the tooltip is open. Any other `label` (styled
 * node, icon, …) falls back to plain text captured from the element's
 * `textContent` when the tooltip opens, so a styled label's colour and weight
 * don't leak onto the dark tooltip background.
 *
 * The captured text falls back to `label` with `||`, not `??`: Tooltip treats
 * `null`/`undefined`/`''` content as "disabled" (no listeners at all), so an
 * EMPTY capture (a label that renders no text, e.g. an icon) is stored as
 * `null` and must resolve back to the current `label`. Otherwise the tooltip
 * would stay disabled even after `label` becomes a long, clipped string (#592).
 *
 * `enabled`: pass `false` while the caller renders no Tooltip (e.g. a loading
 * state). An open tooltip that unmounts has nothing left to close it, so the
 * state resets during render and cannot remount already open.
 */
export function useClippedTooltip<T extends HTMLElement>(
  label: ReactNode,
  enabled = true,
): ClippedTooltip<T> {
  const ref = useRef<T>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  if (!enabled && open) setOpen(false);
  const onOpenChange = (next: boolean) => {
    const el = ref.current;
    if (next && el != null) setText(el.textContent || null);
    setOpen(next && el != null && el.scrollWidth > el.clientWidth);
  };
  const content = typeof label === 'string' ? label : text || label;
  return { ref, open, onOpenChange, content };
}
```

- [ ] **Step 4: Run the hook test**

Run: `npx vitest run src/components/_internal/useClippedTooltip.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Migrate EntityChip**

In `EntityChip.tsx`:

1. Delete `labelRef`, `labelTipOpen`/`setLabelTipOpen`, `labelTipText`/`setLabelTipText`, the `if (!labelTip && labelTipOpen) …` reset, `onLabelTip`, and `labelTipContent`, together with their long comment blocks (those comments now live in the hook). Keep `clippable` and `labelTip` exactly as they are.
2. Directly after `const labelTip = clippable && !loading;` add:

```tsx
// Full label on hover/focus, only when actually clipped (see useClippedTooltip).
const labelTipState = useClippedTooltip<HTMLSpanElement>(label, labelTip);
```

3. In `handleRootFocus`, replace `onLabelTip(true)` with `labelTipState.onOpenChange(true)`. Replace `const handleRootBlur = () => onLabelTip(false);` with `const handleRootBlur = () => labelTipState.onOpenChange(false);`.
4. Replace the label Tooltip opening tag and the label span ref:

```tsx
            <Tooltip
              content={labelTipState.content}
              open={labelTipState.open}
              onOpenChange={labelTipState.onOpenChange}
            >
              <span
                ref={labelTipState.ref}
```

5. Add `import { useClippedTooltip } from '../_internal/useClippedTooltip';`. Remove `useRef` / `useState` from the `react` import **only if** typecheck reports them unused.

- [ ] **Step 6: Run the EntityChip suite unchanged, and typecheck**

Run: `npx vitest run src/components/EntityChip src/components/_internal/useClippedTooltip.test.tsx && npm run typecheck`
Expected: all EntityChip tests PASS with **no test file edits**, and typecheck is clean.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/_internal/useClippedTooltip.ts packages/design-system/src/components/_internal/useClippedTooltip.test.tsx packages/design-system/src/components/EntityChip/EntityChip.tsx
git commit -m "refactor: extract useClippedTooltip from EntityChip

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `StagePath` component

**Files:**

- Create: `packages/design-system/src/components/StagePath/{StagePath.tsx,StagePath.module.scss,StagePath.tokens.scss,StagePath.test.tsx,index.ts}`
- Modify: `packages/design-system/src/index.ts`, `src/i18n/messages.ts`, `src/i18n/en.ts`, `src/i18n/ru.ts`, `src/styles/contrast.test.ts`, `src/_meta/manifest.ts`, `scripts/generate-manifest.mjs`

**Interfaces:**

- Consumes: `useClippedTooltip` (Task 1).
- Produces: `StagePath`, `StagePathProps`, `StagePathStage`, `StagePathTone`, exported from `@eocrm/design-system`.

- [ ] **Step 1: Add the i18n keys**

`src/i18n/messages.ts`, next to `breadcrumb` (alphabetical placement is not enforced):

```ts
stagePath: {
  /** Visually hidden state word after a done stage's label ("Lead, completed"). */
  completed: string;
  /** Visually hidden state word after an upcoming stage's label ("Negotiation, upcoming"). */
  upcoming: string;
}
```

`en.ts`: `stagePath: { completed: 'completed', upcoming: 'upcoming' },`
`ru.ts`: `stagePath: { completed: 'завершён', upcoming: 'предстоит' },`

- [ ] **Step 2: Write the failing tests**

```tsx
// StagePath.test.tsx
import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagePath, type StagePathStage } from './StagePath';

const STAGES: StagePathStage[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
];

function fakeClip(el: HTMLElement, clipped: boolean) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: clipped ? 300 : 100 });
}

describe('<StagePath>', () => {
  it('renders an ordered list with one item per stage', () => {
    render(<StagePath aria-label="Deal stage" stages={STAGES} value="proposal" />);
    const list = screen.getByRole('list', { name: 'Deal stage' });
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
  });

  it('derives done / current / upcoming from value', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveAttribute('data-state', 'done');
    expect(items[1]).toHaveAttribute('data-state', 'done');
    expect(items[2]).toHaveAttribute('data-state', 'current');
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(items[3]).toHaveAttribute('data-state', 'upcoming');
    expect(items.filter((li) => li.hasAttribute('aria-current'))).toHaveLength(1);
  });

  it('speaks done and upcoming state as hidden text, not colour alone', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Lead, completed');
    expect(items[2]).toHaveTextContent(/^Proposal$/);
    expect(items[3]).toHaveTextContent('Negotiation, upcoming');
  });

  it.each(['default', 'success', 'danger'] as const)('tone="%s" sets data-tone', (tone) => {
    render(<StagePath stages={STAGES} value="lead" tone={tone} />);
    expect(screen.getByRole('list')).toHaveAttribute('data-tone', tone);
  });

  it('defaults tone to "default"', () => {
    render(<StagePath stages={STAGES} value="lead" />);
    expect(screen.getByRole('list')).toHaveAttribute('data-tone', 'default');
  });

  it('is read-only without onStageChange: no buttons', () => {
    render(<StagePath stages={STAGES} value="proposal" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('with onStageChange, every non-current stage is a button that reports its id', async () => {
    const user = userEvent.setup();
    const onStageChange = vi.fn();
    render(<StagePath stages={STAGES} value="proposal" onStageChange={onStageChange} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Proposal/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Lead, completed' }));
    expect(onStageChange).toHaveBeenLastCalledWith('lead');
    screen.getByRole('button', { name: 'Negotiation, upcoming' }).focus();
    await user.keyboard('{Enter}');
    expect(onStageChange).toHaveBeenLastCalledWith('negotiation');
    expect(onStageChange).toHaveBeenCalledTimes(2);
  });

  it('stage buttons are type="button" (never submit an enclosing form)', () => {
    render(<StagePath stages={STAGES} value="lead" onStageChange={() => {}} />);
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAttribute('type', 'button');
  });

  it('unknown value: every stage upcoming, warns once per value, does not throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<StagePath stages={STAGES} value="lead" />);
    expect(warn).not.toHaveBeenCalled();
    rerender(<StagePath stages={STAGES} value="ghost" />);
    rerender(<StagePath stages={STAGES} value="ghost" />);
    for (const li of screen.getAllByRole('listitem')) {
      expect(li).toHaveAttribute('data-state', 'upcoming');
      expect(li).not.toHaveAttribute('aria-current');
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('ghost');
    warn.mockRestore();
  });

  it('forwards ref to the <ol> and merges className', () => {
    const ref = createRef<HTMLOListElement>();
    render(<StagePath ref={ref} className="mine" stages={STAGES} value="lead" />);
    expect(ref.current?.tagName).toBe('OL');
    expect(ref.current).toHaveClass('mine');
    expect(ref.current?.className.split(' ').length).toBeGreaterThan(1);
  });

  it('shows the full label in a tooltip when it is clipped, and not otherwise', async () => {
    const user = userEvent.setup();
    render(<StagePath stages={STAGES} value="lead" />);
    const label = screen.getByText('Negotiation');
    fakeClip(label, false);
    await user.hover(label);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.unhover(label);
    fakeClip(label, true);
    await user.hover(label);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Negotiation');
  });

  it('clipped ReactNode label tooltips as plain text', async () => {
    const user = userEvent.setup();
    render(<StagePath stages={[{ id: 'a', label: <b>Bold stage</b> }]} value="a" />);
    const label = screen.getByText('Bold stage').parentElement!;
    fakeClip(label, true);
    await user.hover(label);
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('Bold stage');
    expect(tip.querySelector('b')).toBeNull();
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npx vitest run src/components/StagePath`
Expected: FAIL, because `./StagePath` cannot be resolved.

- [ ] **Step 4: Write the tokens**

```scss
// StagePath.tokens.scss — Component-scoped tokens for <StagePath>: the chevron
// row of ordered record stages. Done/current fills follow `tone`; upcoming is
// neutral in every tone.
:root {
  --stage-path-height: var(--size-md);
  // Horizontal depth of each chevron's tip (and of the next stage's notch).
  --stage-path-arrow: var(--space-3);
  // Visible gap between interlocked chevrons.
  --stage-path-gap: var(--space-05);
  --stage-path-padding-x: var(--space-2);
  --stage-path-radius: var(--radius-md);
  --stage-path-font-size: var(--font-size-md);
  --stage-path-font-weight: var(--font-weight-medium);
  --stage-path-current-font-weight: var(--font-weight-semibold);
  // How far a hovered stage's fill moves toward its text colour. Measured at
  // 8%: light danger lands at 4.62:1 — do not raise it.
  --stage-path-hover-mix: 8%;

  --stage-path-upcoming-bg: var(--color-tone-neutral-bg);
  --stage-path-upcoming-fg: var(--color-tone-neutral-fg);

  --stage-path-done-bg: var(--color-tone-info-bg);
  --stage-path-done-fg: var(--color-tone-info-fg);
  --stage-path-current-bg: var(--color-accent);
  --stage-path-current-fg: var(--color-accent-fg);
  --stage-path-ring: var(--ring-accent);

  --stage-path-done-bg-success: var(--color-tone-success-bg);
  --stage-path-done-fg-success: var(--color-tone-success-fg);
  --stage-path-current-bg-success: var(--color-success);
  --stage-path-current-fg-success: var(--color-success-fg);
  --stage-path-ring-success: var(--ring-success);

  --stage-path-done-bg-danger: var(--color-tone-danger-bg);
  --stage-path-done-fg-danger: var(--color-tone-danger-fg);
  --stage-path-current-bg-danger: var(--color-danger);
  --stage-path-current-fg-danger: var(--color-danger-fg);
  --stage-path-ring-danger: var(--ring-danger);
}
```

- [ ] **Step 5: Write the styles**

```scss
// StagePath.module.scss
@use './StagePath.tokens';

// Shapes. Each stage's box is clipped to a chevron; the next stage overlaps it
// by the arrow depth (minus the gap) so the tip nests into the next notch.
// RTL mirrors the polygons; padding/radius already use logical properties.
$a: var(--stage-path-arrow);
$middle: polygon(0 0, calc(100% - #{$a}) 0, 100% 50%, calc(100% - #{$a}) 100%, 0 100%, #{$a} 50%);
$first: polygon(0 0, calc(100% - #{$a}) 0, 100% 50%, calc(100% - #{$a}) 100%, 0 100%);
$last: polygon(0 0, 100% 0, 100% 100%, 0 100%, #{$a} 50%);
$middle-rtl: polygon(100% 0, #{$a} 0, 0 50%, #{$a} 100%, 100% 100%, calc(100% - #{$a}) 50%);
$first-rtl: polygon(100% 0, #{$a} 0, 0 50%, #{$a} 100%, 100% 100%);
$last-rtl: polygon(100% 0, 0 0, 0 100%, 100% 100%, calc(100% - #{$a}) 50%);

.path {
  // Per-tone palette, read by the stage states below.
  --sp-done-bg: var(--stage-path-done-bg);
  --sp-done-fg: var(--stage-path-done-fg);
  --sp-current-bg: var(--stage-path-current-bg);
  --sp-current-fg: var(--stage-path-current-fg);
  --sp-ring: var(--stage-path-ring);

  display: flex;
  width: 100%;
  list-style: none;
  /* stylelint-disable-next-line property-disallowed-list -- native <ol> margin reset */
  margin: 0;
  padding: 0;
  font-size: var(--stage-path-font-size);
  font-weight: var(--stage-path-font-weight);
}

.path[data-tone='success'] {
  --sp-done-bg: var(--stage-path-done-bg-success);
  --sp-done-fg: var(--stage-path-done-fg-success);
  --sp-current-bg: var(--stage-path-current-bg-success);
  --sp-current-fg: var(--stage-path-current-fg-success);
  --sp-ring: var(--stage-path-ring-success);
}

.path[data-tone='danger'] {
  --sp-done-bg: var(--stage-path-done-bg-danger);
  --sp-done-fg: var(--stage-path-done-fg-danger);
  --sp-current-bg: var(--stage-path-current-bg-danger);
  --sp-current-fg: var(--stage-path-current-fg-danger);
  --sp-ring: var(--stage-path-ring-danger);
}

// Internal row distribution: equal shares, shrinkable so labels can ellipsize.
.stage {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
}

.stage + .stage {
  /* stylelint-disable-next-line property-disallowed-list -- internal interlock: each chevron overlaps its predecessor by the arrow depth so the tip nests into this stage's notch; not placement of the component */
  margin-inline-start: calc(var(--stage-path-gap) - var(--stage-path-arrow));
}

.done {
  --sp-fill: var(--sp-done-bg);
  --sp-fg: var(--sp-done-fg);
}

.current {
  --sp-fill: var(--sp-current-bg);
  --sp-fg: var(--sp-current-fg);

  font-weight: var(--stage-path-current-font-weight);
}

.upcoming {
  --sp-fill: var(--stage-path-upcoming-bg);
  --sp-fg: var(--stage-path-upcoming-fg);
}

// The painted chevron: a <button> (interactive) or <span> (read-only).
.target {
  --sp-shape: #{$middle};
  --sp-bg: var(--sp-fill);

  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  height: var(--stage-path-height);
  padding-inline: calc(var(--stage-path-arrow) + var(--stage-path-padding-x));
  border: 0;
  background: var(--sp-bg);
  color: var(--sp-fg);
  font: inherit;
  white-space: nowrap;
  clip-path: var(--sp-shape);
}

.stage:first-child .target {
  --sp-shape: #{$first};

  padding-inline-start: var(--stage-path-padding-x);
  border-start-start-radius: var(--stage-path-radius);
  border-end-start-radius: var(--stage-path-radius);
}

.stage:last-child .target {
  --sp-shape: #{$last};

  padding-inline-end: var(--stage-path-padding-x);
  border-start-end-radius: var(--stage-path-radius);
  border-end-end-radius: var(--stage-path-radius);
}

// A single stage is both first and last: a plain rounded box.
.stage:only-child .target {
  --sp-shape: none;
}

.path:dir(rtl) .target {
  --sp-shape: #{$middle-rtl};
}

.path:dir(rtl) .stage:first-child .target {
  --sp-shape: #{$first-rtl};
}

.path:dir(rtl) .stage:last-child .target {
  --sp-shape: #{$last-rtl};
}

.path:dir(rtl) .stage:only-child .target {
  --sp-shape: none;
}

.button {
  cursor: pointer;
}

.button:hover {
  --sp-bg: color-mix(in srgb, var(--sp-fill), var(--sp-fg) var(--stage-path-hover-mix));
}

// Chevron-shaped focus ring. clip-path would cut off any outline, so the ring
// is the stage's own background in the ring colour, with the fill redrawn
// ring-width inside it on ::before, clipped to the same shape.
.button:focus-visible {
  background: var(--sp-ring);
}

.button:focus-visible::before {
  position: absolute;
  inset: var(--ring-width);
  border-radius: inherit;
  background: var(--sp-bg);
  clip-path: var(--sp-shape);
  content: '';
}

.label {
  position: relative; // above the focus ::before
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

> If `npm run lint:css` rejects `inset` / `position: absolute` on the internal `::before`, check how `src/structure.test.ts` and stylelint treat internal pseudo-elements, and match the precedent (EntityChip's `.hiddenLabel` uses `position: absolute` via the `visually-hidden` mixin). Don't drop the ring.

- [ ] **Step 6: Write the component**

```tsx
// StagePath.tsx
import { forwardRef, useEffect, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Tooltip } from '../Tooltip';
import { VisuallyHidden } from '../VisuallyHidden';
import { useClippedTooltip } from '../_internal/useClippedTooltip';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './StagePath.module.scss';

/**
 * Outcome colour for the done + current stages. Upcoming stages stay neutral.
 * - `'default'` — blue; the record is in progress.
 * - `'success'` — green; the record reached a positive outcome (deal won).
 * - `'danger'` — red; the record reached a negative outcome (deal lost).
 */
export type StagePathTone = 'default' | 'success' | 'danger';

export interface StagePathStage {
  /** Stable id: matched against `value` and passed to `onStageChange`. */
  id: string;
  /** Visible stage name. Ellipsizes when space runs out; the full label shows in a tooltip only when clipped. */
  label: ReactNode;
}

export interface StagePathProps extends Omit<HTMLAttributes<HTMLOListElement>, 'children'> {
  /** Ordered stages, first to last. */
  stages: StagePathStage[];
  /**
   * Id of the current stage. Stages before it render as done, after it as
   * upcoming. An id not in `stages` renders every stage as upcoming (and warns
   * in development) rather than throwing.
   */
  value: string;
  /** Outcome colour for done + current stages. See `StagePathTone`. @default 'default' */
  tone?: StagePathTone;
  /**
   * Makes the path interactive: every non-current stage renders as a button
   * that calls this with its id. The current stage is never a button.
   * Omit for a read-only path. Whether a move is allowed (e.g. backwards) is
   * the consumer's rule — confirm or ignore inside the handler.
   */
  onStageChange?: (id: string) => void;
}

type StageState = 'done' | 'current' | 'upcoming';

interface StageProps {
  stage: StagePathStage;
  state: StageState;
  onStageChange?: (id: string) => void;
}

function Stage({ stage, state, onStageChange }: StageProps) {
  const t = useTranslation();
  const tip = useClippedTooltip<HTMLSpanElement>(stage.label);
  const content = (
    <>
      <span ref={tip.ref} className={styles.label}>
        {stage.label}
      </span>
      {state !== 'current' && (
        <VisuallyHidden>
          , {t(state === 'done' ? 'stagePath.completed' : 'stagePath.upcoming')}
        </VisuallyHidden>
      )}
    </>
  );
  const target =
    onStageChange != null && state !== 'current' ? (
      <button
        type="button"
        className={clsx(styles.target, styles.button)}
        onClick={() => onStageChange(stage.id)}
      >
        {content}
      </button>
    ) : (
      <span className={styles.target}>{content}</span>
    );
  return (
    <li
      className={clsx(styles.stage, styles[state])}
      data-state={state}
      aria-current={state === 'current' ? 'step' : undefined}
    >
      <Tooltip content={tip.content} open={tip.open} onOpenChange={tip.onOpenChange}>
        {target}
      </Tooltip>
    </li>
  );
}

/**
 * Chevron row of a record's ordered stages — done, current, upcoming; optionally clickable.
 * @see docs/components/StagePath.md
 */
export const StagePath = forwardRef<HTMLOListElement, StagePathProps>(function StagePath(
  { stages, value, tone = 'default', onStageChange, className, ...rest },
  ref,
) {
  const currentIndex = stages.findIndex((s) => s.id === value);
  const unknown = currentIndex === -1;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !unknown) return;
    // eslint-disable-next-line no-console
    console.warn(
      `<StagePath> value "${value}" is not the id of any stage; every stage renders as upcoming.`,
    );
  }, [unknown, value]);

  return (
    <ol
      ref={ref}
      className={clsx(styles.path, className)}
      // {...rest} before data-tone: the tone attribute is the component's styling contract.
      {...rest}
      data-tone={tone}
    >
      {stages.map((stage, i) => {
        const state: StageState = unknown
          ? 'upcoming'
          : i < currentIndex
            ? 'done'
            : i === currentIndex
              ? 'current'
              : 'upcoming';
        return <Stage key={stage.id} stage={stage} state={state} onStageChange={onStageChange} />;
      })}
    </ol>
  );
});
```

`index.ts`:

```ts
export { StagePath } from './StagePath';
export type { StagePathProps, StagePathStage, StagePathTone } from './StagePath';
```

`src/index.ts`, directly after the Breadcrumb exports (≈ line 553):

```ts
export { StagePath } from './components/StagePath';
export type { StagePathProps, StagePathStage, StagePathTone } from './components/StagePath';
```

- [ ] **Step 7: Run the StagePath tests**

Run: `npx vitest run src/components/StagePath`
Expected: PASS. If the hidden-text assertions fail on whitespace (`"Lead, completed"`), check how `VisuallyHidden` renders `, {t(...)}`. JSX keeps the `, ` literal, so the text should be `Lead, completed`. Fix the component, not the test.

- [ ] **Step 8: Pin the contrast pairs**

In `src/styles/contrast.test.ts`, append to `PAIRS` (all were measured ≥ 5.2:1 in both themes):

```ts
  // StagePath (and Badge) paint text on these tone tints.
  ['tone info text on tone info tint', '--color-tone-info-fg', '--color-tone-info-bg', 4.5],
  ['tone success text on tone success tint', '--color-tone-success-fg', '--color-tone-success-bg', 4.5],
  ['tone danger text on tone danger tint', '--color-tone-danger-fg', '--color-tone-danger-bg', 4.5],
  ['tone neutral text on tone neutral tint', '--color-tone-neutral-fg', '--color-tone-neutral-bg', 4.5],
```

- [ ] **Step 9: Manifest clusters**

Add `StagePath: 'Display',` next to `Timeline: 'Display',` in **both** `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`. Then run `npm run build:manifest` (from `packages/design-system`).

- [ ] **Step 10: Full gates**

Run from `packages/design-system`: `npm test; echo EXIT=$?` and `npm run typecheck`. From the repo root: `npm run lint:css` and `npx prettier --check "packages/design-system/src/**/*.{ts,tsx,scss}"`.
Expected: `EXIT=0`, typecheck clean, stylelint clean, prettier clean. If `src/structure.test.ts` flags the chevron ring (the "focus ring goes through the focus-ring mixin" or "not suppressed" gates), add a waiver entry in that gate with `file: 'StagePath/StagePath.module.scss'`, the exact selector, and `reason: 'clip-path clips any outline; the ring is the stage background in the ring colour under a ring-width inset fill on ::before'`. Don't change the ring design.

- [ ] **Step 11: Commit**

```bash
git add packages/design-system/src packages/design-system/scripts/generate-manifest.mjs
git commit -m "feat: StagePath — chevron stage row with outcome tone and optional stage clicks

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Playground demo + wiring

**Files:**

- Create: `packages/playground/src/pages/components/StagePathDemo.tsx`
- Modify: `packages/playground/src/App.tsx`, `src/layout/AppShell/navItems.ts`, `src/pages/components/ComponentsIndex.tsx`, `src/pages/components/overviewSchematics.tsx`, `src/pages/mockups/registry.ts`, and `src/lib/props.manifest.json` (regenerated)

**Interfaces:**

- Consumes: `StagePath`, `StagePathTone` from `@eocrm/design-system` (Task 2).

- [ ] **Step 1: Write the demo**

```tsx
// StagePathDemo.tsx
import { useState } from 'react';
import {
  Button,
  Cluster,
  PillMenu,
  Stack,
  StagePath,
  Text,
  type StagePathTone,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const DEAL = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
];

const PROJECT = [
  { id: 'planned', label: 'Planned' },
  { id: 'active', label: 'Active' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export function StagePathDemo() {
  const [stage, setStage] = useState('proposal');
  const [tone, setTone] = useState<StagePathTone>('default');

  return (
    <DemoLayout
      name="StagePath"
      componentName="StagePath"
      description="Chevron row of a record's ordered stages: done, current, upcoming. Read-only by default; pass onStageChange to make the other stages clickable. tone recolours done + current for a won / lost outcome."
      files={getComponentFiles('StagePath')}
    >
      <Example
        title="Record header"
        description="Stage chip, the path and outcome actions in a non-wrapping Cluster; the path takes the remaining width. Click a stage to move; Won / Lost switch the tone."
        code={`const [stage, setStage] = useState('proposal');
const [tone, setTone] = useState<StagePathTone>('default');

<Cluster wrap={false}>
  <PillMenu label="pipeline" current={{ id: 'ent', name: 'Enterprise', color: 'slate' }} />
  <StagePath
    aria-label="Deal stage"
    stages={DEAL}
    value={stage}
    tone={tone}
    onStageChange={(id) => { setStage(id); setTone('default'); }}
  />
  <Button variant="success" onClick={() => setTone('success')}>Won</Button>
  <Button variant="danger-outline" onClick={() => setTone('danger')}>Lost</Button>
</Cluster>`}
      >
        <Cluster wrap={false}>
          <PillMenu label="pipeline" current={{ id: 'ent', name: 'Enterprise', color: 'slate' }} />
          <StagePath
            aria-label="Deal stage"
            stages={DEAL}
            value={stage}
            tone={tone}
            onStageChange={(id) => {
              setStage(id);
              setTone('default');
            }}
          />
          <Button variant="success" onClick={() => setTone('success')}>
            Won
          </Button>
          <Button variant="danger-outline" onClick={() => setTone('danger')}>
            Lost
          </Button>
        </Cluster>
      </Example>

      <Example
        title="Read-only"
        description="No onStageChange: no buttons, no hover. For list rows, previews, and users without permission to move the record."
        code={`<StagePath aria-label="Project stage" stages={PROJECT} value="done" />`}
      >
        <StagePath aria-label="Project stage" stages={PROJECT} value="done" />
      </Example>

      <Example
        title="Tones"
        description="default (in progress) / success (won) / danger (lost). Upcoming stages stay neutral."
        code={`<StagePath stages={DEAL} value="proposal" />
<StagePath stages={DEAL} value="proposal" tone="success" />
<StagePath stages={DEAL} value="proposal" tone="danger" />`}
      >
        <Stack gap="sm">
          <StagePath aria-label="Default tone" stages={DEAL} value="proposal" />
          <StagePath aria-label="Success tone" stages={DEAL} value="proposal" tone="success" />
          <StagePath aria-label="Danger tone" stages={DEAL} value="proposal" tone="danger" />
        </Stack>
      </Example>

      <Example
        title="Narrow width"
        description="Stages share the width equally; labels ellipsize and show the full name in a tooltip on hover or keyboard focus."
        code={`<div style={{ maxWidth: 300 }}>
  <StagePath stages={DEAL} value="proposal" onStageChange={() => {}} />
</div>`}
      >
        <div style={{ maxWidth: 300 }}>
          <StagePath aria-label="Narrow" stages={DEAL} value="proposal" onStageChange={() => {}} />
        </div>
      </Example>

      <Example
        title="Right-to-left"
        description="Chevrons mirror under dir='rtl'."
        code={`<div dir="rtl"><StagePath stages={DEAL} value="proposal" onStageChange={() => {}} /></div>`}
      >
        <div dir="rtl">
          <Text tone="muted">dir=&quot;rtl&quot;</Text>
          <StagePath aria-label="RTL" stages={DEAL} value="proposal" onStageChange={() => {}} />
        </div>
      </Example>
    </DemoLayout>
  );
}
```

Before writing it, confirm against the library: `PillMenu`'s `color` value `'slate'` exists, `Stack`'s `gap` accepts `'sm'`, and `Text` accepts `tone="muted"` (grep their `*.tsx` prop types). Adjust to the real names. Don't add props to the library.

- [ ] **Step 2: Wire it**

1. `App.tsx`: `import { StagePathDemo } from './pages/components/StagePathDemo';` next to the `TimelineDemo` import, and `<Route path="/components/stage-path" element={<StagePathDemo />} />` next to the timeline route.
2. `navItems.ts`: in the group containing Timeline, alphabetically before `Table`: `{ to: '/components/stage-path', label: 'StagePath', icon: ChevronsRight, end: false },`. Add `ChevronsRight` to the `lucide-react` import.
3. `registry.ts`: add `| 'StagePath'` to `ComponentName` (alphabetical).
4. `ComponentsIndex.tsx`: an item `{ to: '/components/stage-path', name: 'StagePath', description: 'Chevron row of record stages — done, current, upcoming; optional stage clicks.', preview: SCHEMATICS['StagePath'] }`, placed alphabetically.
5. `overviewSchematics.tsx`: add after `Timeline` (exactly one `Solid` = the current stage):

```tsx
  StagePath: (
    <Row gap={2}>
      <Box w={44} h={20} style={{ clipPath: 'polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%)' }} />
      <Box w={44} h={20} style={{ clipPath: 'polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%, 20% 50%)' }} />
      <Solid w={44} h={20} style={{ clipPath: 'polygon(0 0, 80% 0, 100% 50%, 80% 100%, 0 100%, 20% 50%)' }} />
      <Outline w={44} h={20} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 20% 50%)' }} />
    </Row>
  ),
```

6. Regenerate props: `npm run build:props` from `packages/playground`.

- [ ] **Step 3: Verify**

From the repo root: `npm run typecheck && npm test; echo EXIT=$?` and `npx prettier --check "packages/playground/src/**/*.{ts,tsx}"`.
Expected: clean, `EXIT=0` (any playground meta-tests about nav/index/schematics pass).

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src
git commit -m "feat(playground): StagePath demo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Docs

**Files:**

- Create: `packages/design-system/docs/components/StagePath.md`
- Modify: `packages/design-system/AI-PRIMER.md` (Display list, after the `Timeline` line ≈ 199)

- [ ] **Step 1: Write the doc**

````markdown
# `<StagePath>` — chevron row of record stages

A record's ordered stages as interlocking chevrons: done (tinted), current (solid), upcoming (neutral). Read-only by default; pass `onStageChange` to make every non-current stage a button. `tone` recolours done + current once the record reaches an outcome.

```tsx
import { Button, Cluster, StagePath } from '@eocrm/design-system';

<Cluster wrap={false}>
  <StagePath
    aria-label="Deal stage"
    stages={[
      { id: 'lead', label: 'Lead' },
      { id: 'qualified', label: 'Qualified' },
      { id: 'proposal', label: 'Proposal' },
      { id: 'negotiation', label: 'Negotiation' },
    ]}
    value={deal.stage}
    tone={deal.outcome === 'won' ? 'success' : deal.outcome === 'lost' ? 'danger' : 'default'}
    onStageChange={(id) => moveDeal(deal.id, id)}
  />
  <Button variant="success">Won</Button>
  <Button variant="danger-outline">Lost</Button>
</Cluster>;

// Read-only (list rows, previews, no permission)
<StagePath aria-label="Project stage" stages={projectStages} value={project.stage} />;
```

<!-- props:start -->
<!-- props:end -->

- **Always controlled.** `value` is required; there is no internal state. `onStageChange` is a request — update `value` when the move succeeds (after a confirmation or server call if needed).
- **Stage semantics.** `<ol>` with `aria-current="step"` on the current stage; done/upcoming stages carry visually hidden, localised "completed" / "upcoming" text, so state is never colour alone.
- **Fills its container.** `width: 100%`, equal-width stages, labels ellipsize with a tooltip only when clipped. Beside other controls, use `<Cluster wrap={false}>` so the path takes the remaining width instead of wrapping onto its own line.
- **Every non-current stage is clickable** when `onStageChange` is passed, including going backwards. Enforce business rules in the handler.
- One size (32px, matches `Button` `md`).

#### When NOT to use

- ❌ Navigation between pages → `<Breadcrumb>` / `<Tabs>`.
- ❌ A multi-step form wizard. StagePath reflects a record's state; it doesn't drive a form flow.
- ❌ A history of what happened and when → `<Timeline>`.
- ❌ Percentage progress → `<Progress>`.

#### Anti-patterns

- ❌ Encoding the outcome as an extra stage ("Closed Lost") instead of `tone="danger"`.
- ❌ `tone="success"` to celebrate reaching the last stage. Tone is for an outcome (won/lost), not for being on the final step.
- ❌ More than ~7 stages: labels truncate to uselessness. Group stages or show a summary.
- ❌ Wrapping StagePath in a wrapping `Cluster`: at `width: 100%` it drops onto its own line.
````

- [ ] **Step 2: Generate the props table and add the primer line**

Run `npm run build:docs` from `packages/design-system`. Confirm the `props:start/end` block now holds `StagePathProps` and `StagePathStage` tables. Add to `AI-PRIMER.md` after the Timeline line:

```markdown
- [`StagePath`](docs/components/StagePath.md) — chevron row of record stages (done / current / upcoming)
```

- [ ] **Step 3: Verify**

Run (from `packages/design-system`): `npm run build:docs -- --check && npm test; echo EXIT=$?` and, from the root, `npx prettier --check packages/design-system/docs/components/StagePath.md packages/design-system/AI-PRIMER.md`.
Expected: clean, `EXIT=0`.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/docs/components/StagePath.md packages/design-system/AI-PRIMER.md
git commit -m "docs: StagePath component doc + primer line

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5 (controller, not a subagent): browser check, user demo check, PR

- [ ] Start the playground on port 8090+ (never the default port) and check `/components/stage-path` with Playwright in light and dark:
  - the chevrons interlock with a thin gap (LTR and RTL)
  - clicking a visible tip hits the right stage
  - Tab shows the chevron-shaped ring
  - hover is visible but subtle
  - narrow-width tooltips appear only on truncated labels
- [ ] Pause and send the user the live playground link (the user's "demo check before PR" rule). Wait for their OK.
- [ ] Then run the `pre-push-review` skill (library variant) for the PR and its review-fix loop.
- [ ] Afterwards, kill the Playwright Chrome (WSLg cleanup).
