# SettingRow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<SettingRow>` + `<SettingRow.List>` — a backend-driven settings row with a shared label column, label adornments, control adornments, and a footer aligned under the control — and rebuild the playground's Settings mockup onto it.

**Architecture:** `Field`'s control wiring (id ownership, `aria-labelledby`, the `aria-describedby` description/error swap, `aria-invalid`, `cloneElement` injection) is extracted to `_internal/fieldWiring.tsx` and consumed by both `Field` and `SettingRow`. `SettingRow` owns its own two-column grid because its `description` sits in the label column, where `Field` puts it under the control. `SettingRow.List` owns vertical rhythm, dividers, the shared `--setting-row-label-width`, and a `collapseBelow` container query.

**Tech Stack:** React 19 + TypeScript, CSS Modules + SCSS, Vitest + React Testing Library (`globals: true` — do NOT import `describe`/`it`/`expect`/`vi`), `clsx`.

**Spec:** `docs/superpowers/specs/2026-09-22-setting-row-design.md`

## Global Constraints

- **Repo root is `/home/dpws/projects/design-system`.** Vitest must be run from `packages/design-system` (`cd packages/design-system && npx vitest run …`), not from the repo root.
- **No raw values in `.module.scss`.** Colors, spacing, radii, font sizes go through `var(--…)`. Prefer the component's own token (`var(--setting-row-divider-color)`) over the primitive it defaults to.
- **Hard rule 4 — components don't own layout.** No `margin`, no `position`, no `top`/`left`/`right`/`bottom`, no `flex: 1`, no `width` other than `100%`/`auto`, no `grid-column` inside `SettingRow.module.scss`. Vertical padding and dividers belong to `SettingRow.List`, which is the parent.
- **Hard rule 3a — `:focus-visible`, not `:focus`** for non-input focusables. This component adds no focusable elements of its own, so no focus rules are expected.
- **Hard rule 6 — `forwardRef` + spread HTML attrs** on every component.
- **Hard rule 7 — JSDoc on the component function and every exported prop and union type**, with `@example` blocks and `@remarks` "When NOT to use" / "Anti-patterns".
- **Hard rule 9 — no inline English.** User-facing strings go through `useTranslation`. `SettingRow` renders no strings of its own except the `required` marker `*`, which is `aria-hidden` (copy `Field`'s exact pattern).
- **Four-file rule** (`src/structure.test.ts`): every non-underscore component directory needs `SettingRow.tsx`, `SettingRow.test.tsx`, `SettingRow.module.scss`, `index.ts`, and a re-export from `src/index.ts`. `_internal/` is exempt from the four-file rule but NOT from hard rules 9/10.
- **Component tokens must not shadow a semantic color value** (`structure.test.ts`): never write a hex literal in `SettingRow.tokens.scss` — always `var(--color-…)`.
- **Breakpoint constants:** `sm` 480px / `md` 640px / `lg` 768px, from `_internal/collapse.scss` (`$collapse-sm` / `-md` / `-lg`). Never retype the numbers.
- **`CollapseBreakpoint`** is already publicly exported (`src/index.ts:417`, via `Sortable`). Import it from `../_internal/collapse`; do not mint a parallel union.
- **Playground imports use `@eocrm/design-system`**, never relative paths into the library.
- **Git:** all of this is code, so it goes on a branch and through a PR. Branch from fresh `main` (`git checkout main && git pull`). Never `--no-verify`.

---

### Task 1: Extract `Field`'s control wiring to `_internal/fieldWiring.tsx`

Behavior-preserving refactor. `Field.test.tsx` (20 tests) is the guard and must pass **unchanged** — if any `Field` test needs editing, the extraction is wrong.

**Files:**

- Create: `packages/design-system/src/components/_internal/fieldWiring.tsx`
- Modify: `packages/design-system/src/components/Field/Field.tsx` (replace lines ~152–208 of the component body with a `useFieldWiring` call; keep the `FieldRenderProps` export path intact)
- Test: `packages/design-system/src/components/Field/Field.test.tsx` (unchanged — the guard)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `useFieldWiring(options: FieldWiringOptions): FieldWiring` and the `FieldRenderProps` interface, both from `../_internal/fieldWiring`. `FieldWiring` carries `{ controlId, labelId, descriptionId, errorId, describedBy, invalid, required, field, wire }`, where `wire(children)` returns the auto-wired or render-prop-invoked control.

- [ ] **Step 1: Run the Field suite to record the green baseline**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/components/Field/Field.test.tsx
```

Expected: PASS, 20 tests. Note the count — Step 5 must match it exactly.

- [ ] **Step 2: Create the extracted module**

Create `packages/design-system/src/components/_internal/fieldWiring.tsx`:

```tsx
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';

/** The wiring a field-like component hands to its control. Spread onto the control in render-prop form. */
export interface FieldRenderProps {
  id: string;
  'aria-describedby': string | undefined;
  /** Id of the label element to name the control — set only when a label is rendered. */
  'aria-labelledby': string | undefined;
  'aria-invalid': boolean | undefined;
  invalid: boolean;
  required: boolean;
  /** Id of the label/caption element — for manual `aria-labelledby` wiring. */
  labelId: string;
}

export interface FieldWiringOptions {
  /** Explicit control id. Omit to let the wiring own it (auto-generated). */
  id?: string;
  /** Whether the caller renders a label — drives `aria-labelledby` injection. */
  hasLabel: boolean;
  /** Whether the caller renders a description — drives `aria-describedby` when there is no error. */
  hasDescription: boolean;
  /** Truthy when the caller renders an error message. */
  hasError: boolean;
  /** Marks the control required. */
  required?: boolean;
  /** Group mode (radio/checkbox sets): skip id/ARIA injection, inject only `invalid`/`required`. */
  asGroup?: boolean;
}

export interface FieldWiring {
  controlId: string;
  labelId: string;
  descriptionId: string;
  errorId: string;
  /** The id the control's `aria-describedby` should point at — error wins over description. */
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
  field: FieldRenderProps;
  /** Auto-wire a single element child, or invoke a render-prop with `field`. */
  wire: (children: ReactNode | ((field: FieldRenderProps) => ReactNode)) => ReactNode;
}

/**
 * Shared control wiring for `<Field>` and `<SettingRow>`: id ownership, the
 * `aria-describedby` error-over-description choice, `aria-invalid`, and the
 * `cloneElement` injection onto a single child.
 *
 * Extracted rather than copied because the `||`-not-`??` rule below is subtle
 * and load-bearing for every named input in the library.
 */
export function useFieldWiring({
  id,
  hasLabel,
  hasDescription,
  hasError,
  required,
  asGroup = false,
}: FieldWiringOptions): FieldWiring {
  const reactId = useId();
  const controlId = id ?? reactId;
  const labelId = `${controlId}-label`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;

  const invalid = hasError;
  const requiredBool = Boolean(required);
  const describedBy = hasError ? errorId : hasDescription ? descriptionId : undefined;

  const field: FieldRenderProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-labelledby': hasLabel ? labelId : undefined,
    'aria-invalid': invalid || undefined,
    invalid,
    required: requiredBool,
    labelId,
  };

  const wire = (children: ReactNode | ((f: FieldRenderProps) => ReactNode)): ReactNode => {
    if (typeof children === 'function') return children(field);
    if (!isValidElement(children)) return children;

    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = child.props;
    let injected: Record<string, unknown>;
    if (asGroup) {
      injected = {
        invalid: childProps.invalid ?? invalid,
        required: childProps.required ?? requiredBool,
      };
    } else {
      injected = {
        id: controlId,
        // `||`, not `??`, on both ARIA id references: `aria-labelledby={sectionId ?? ''}`
        // is ordinary consumer code, and an empty id list references nothing — it
        // contributes no name and lets the computation fall through, exactly like an
        // empty `aria-label`. Treating it as an explicit override would suppress
        // `labelId` and leave the control anonymous, which matters more here than
        // anywhere else: Field names every input in the library through
        // `aria-labelledby` rather than `<label for>`. `invalid` / `required` keep `??`
        // — those are booleans, where `false` is a meaningful explicit value.
        'aria-describedby': childProps['aria-describedby'] || describedBy,
        invalid: childProps.invalid ?? invalid,
        required: childProps.required ?? requiredBool,
      };
      if (hasLabel) {
        injected['aria-labelledby'] = childProps['aria-labelledby'] || labelId;
      }
    }
    return cloneElement(child, injected);
  };

  return {
    controlId,
    labelId,
    descriptionId,
    errorId,
    describedBy,
    invalid,
    required: requiredBool,
    field,
    wire,
  };
}
```

- [ ] **Step 3: Refactor `Field.tsx` onto it**

In `packages/design-system/src/components/Field/Field.tsx`:

1. Delete the local `FieldRenderProps` interface declaration and re-export the shared one instead. Add near the top imports:

```tsx
import { useFieldWiring, type FieldRenderProps } from '../_internal/fieldWiring';

export type { FieldRenderProps };
```

2. Remove `cloneElement`, `isValidElement`, `useId`, `ReactElement` from the `react` import if they become unused (`forwardRef`, `type HTMLAttributes`, `type ReactNode` stay).

3. Replace the block that starts at `const reactId = useId();` and ends at the closing of the `let control: ReactNode; … cloneElement(child, injected); … }` chain with:

```tsx
const {
  controlId,
  labelId,
  descriptionId,
  errorId,
  describedBy,
  invalid,
  required: requiredBool,
  wire,
} = useFieldWiring({
  id,
  hasLabel: label != null,
  hasDescription: description != null,
  hasError: error != null,
  required,
  asGroup,
});

const control = wire(children);
```

Everything after that (`labelClassName`, `markers`, `labelNode`, `messageNode`, `groupAria`, the returned JSX) is unchanged and still reads the same local names.

**Watch the two subtleties:**

- `Field` computed `invalid` as `Boolean(error)`; the hook takes `hasError: error != null`. `error={''}` differs between the two (`Boolean('')` is `false`, `'' != null` is `true`). `Field`'s `messageNode` already branches on `error != null`, so `error={''}` renders an (empty) error node — `hasError` matching `messageNode` is the _consistent_ choice. If a `Field` test pins the old `Boolean(error)` behavior, stop and report it rather than editing the test.
- `markers` still uses the `required` prop (not `requiredBool`) for its conditional — leave that exactly as it is.

- [ ] **Step 4: Typecheck**

```bash
cd /home/dpws/projects/design-system
npm run typecheck --workspace @eocrm/design-system
```

Expected: no errors.

- [ ] **Step 5: Run the Field suite — the extraction guard**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/components/Field/Field.test.tsx
```

Expected: PASS, the same 20 tests as Step 1, with `Field.test.tsx` unedited.

- [ ] **Step 6: Run the full library suite**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run
```

Expected: PASS. `structure.test.ts` must stay green — `_internal/` is exempt from the four-file rule, so the new file owes no test/export of its own.

- [ ] **Step 7: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src/components/_internal/fieldWiring.tsx packages/design-system/src/components/Field/Field.tsx
git commit -m "refactor(Field): extract control wiring to _internal/fieldWiring

Behavior-preserving. SettingRow needs the same id / aria-labelledby /
aria-describedby / invalid wiring but a different DOM shape, and the
empty-ARIA-id-list rule is too subtle to copy. Field.test.tsx unchanged."
```

---

### Task 2: `SettingRow` — grid, slots, wiring

**Files:**

- Create: `packages/design-system/src/components/SettingRow/SettingRow.tsx`
- Create: `packages/design-system/src/components/SettingRow/SettingRow.module.scss`
- Create: `packages/design-system/src/components/SettingRow/SettingRow.tokens.scss`
- Create: `packages/design-system/src/components/SettingRow/SettingRow.test.tsx`
- Create: `packages/design-system/src/components/SettingRow/index.ts`

**Interfaces:**

- Consumes: `useFieldWiring`, `FieldRenderProps` from `../_internal/fieldWiring` (Task 1).
- Produces: `SettingRow` (a `ForwardRefExoticComponent` that Task 3 attaches `.List` to), plus the exported types `SettingRowProps` and `SettingRowControlWidth`. Test ids/classes: the row root carries `data-setting-row=""`.

- [ ] **Step 1: Write the failing test file**

Create `packages/design-system/src/components/SettingRow/SettingRow.test.tsx`:

```tsx
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingRow } from './SettingRow';

describe('SettingRow', () => {
  it('renders with the minimum props', () => {
    render(
      <SettingRow label="Seats">
        <input type="number" defaultValue={50} />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton', { name: 'Seats' })).toBeInTheDocument();
  });

  it('associates the label with the control', async () => {
    const user = userEvent.setup();
    render(
      <SettingRow label="Seats">
        <input type="number" />
      </SettingRow>,
    );
    await user.click(screen.getByText('Seats'));
    expect(screen.getByRole('spinbutton')).toHaveFocus();
  });

  it('keeps labelAdornment out of the control accessible name', () => {
    render(
      <SettingRow label="Seats" labelAdornment={<span>From plan</span>}>
        <input type="number" />
      </SettingRow>,
    );
    // The badge renders...
    expect(screen.getByText('From plan')).toBeInTheDocument();
    // ...but is NOT part of the name. This is the regression the component exists to prevent.
    expect(screen.getByRole('spinbutton')).toHaveAccessibleName('Seats');
  });

  it('links the description via aria-describedby', () => {
    render(
      <SettingRow label="Seats" description="Member seats included for this tenant">
        <input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toHaveAccessibleDescription(
      'Member seats included for this tenant',
    );
  });

  it('error takes over aria-describedby and sets aria-invalid', () => {
    render(
      <SettingRow label="Seats" description="Helper text" error="Must be at least 1">
        <input type="number" />
      </SettingRow>,
    );
    const control = screen.getByRole('spinbutton');
    expect(control).toHaveAccessibleDescription('Must be at least 1');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    // Deliberately UNLIKE <Field>: the description stays visible. It lives in
    // the label column and the error in the control column, so they do not
    // occupy the same slot — hiding the "what is this setting" text because
    // the value is invalid would remove context from a different column.
    // Only the aria-describedby reference is replaced.
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('required injects required onto the control', () => {
    render(
      <SettingRow label="Seats" required>
        <input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toBeRequired();
  });

  it('renders trailing content after the control', () => {
    render(
      <SettingRow label="Seats" trailing={<button type="button">Reset</button>}>
        <input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('renders footer content', () => {
    render(
      <SettingRow label="Seats" footer={<p>0 of 50 included this month</p>}>
        <input type="number" />
      </SettingRow>,
    );
    expect(screen.getByText('0 of 50 included this month')).toBeInTheDocument();
  });

  it.each(['xs', 'sm', 'md', 'full'] as const)('controlWidth=%s sets the data attribute', (w) => {
    const { container } = render(
      <SettingRow label="Seats" controlWidth={w}>
        <input type="number" />
      </SettingRow>,
    );
    expect(container.querySelector('[data-control-width]')).toHaveAttribute(
      'data-control-width',
      w,
    );
  });

  it('supports the render-prop form', () => {
    render(
      <SettingRow label="Seats" description="Helper">
        {(field) => <input type="number" {...field} />}
      </SettingRow>,
    );
    const control = screen.getByRole('spinbutton', { name: 'Seats' });
    expect(control).toHaveAccessibleDescription('Helper');
  });

  it('honours an explicit id', () => {
    render(
      <SettingRow label="Seats" id="seats-control">
        <input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toHaveAttribute('id', 'seats-control');
  });

  it('forwards ref to the row element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow ref={ref} label="Seats">
        <input type="number" />
      </SettingRow>,
    );
    expect(ref.current).toHaveAttribute('data-setting-row');
  });

  it('merges className rather than replacing it', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow ref={ref} label="Seats" className="custom">
        <input type="number" />
      </SettingRow>,
    );
    expect(ref.current).toHaveClass('custom');
    expect(ref.current!.className.split(' ').length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/components/SettingRow/SettingRow.test.tsx
```

Expected: FAIL — cannot resolve `./SettingRow`.

- [ ] **Step 3: Write the tokens**

Create `packages/design-system/src/components/SettingRow/SettingRow.tokens.scss`:

```scss
// SettingRow.tokens.scss — Component-scoped tokens for <SettingRow> and
// <SettingRow.List>. Covers the label column width, the two-column gap,
// description typography, per-spacing row padding, and the divider color.
// No hex literals here — a component token that duplicates a semantic value
// is a structure.test.ts failure.
:root {
  // Label column — a LENGTH, not max-content, so every row in a List resolves
  // the same column without a subgrid.
  --setting-row-label-width: 16rem;

  // Gap between the label column and the control column
  --setting-row-column-gap: var(--space-4);

  // Gap between stacked pieces inside each column
  --setting-row-stack-gap: var(--space-1);

  // Gap between the control and its trailing adornments
  --setting-row-trailing-gap: var(--space-2);

  // Label typography
  --setting-row-label-font-size: var(--font-size-sm);
  --setting-row-label-font-weight: var(--font-weight-medium);
  --setting-row-label-fg: var(--color-fg);

  // Description under the label
  --setting-row-description-fg: var(--color-fg-muted);

  // Spacing variants — padding-block per row, set by the List
  --setting-row-padding-y-sm: var(--space-2);
  --setting-row-padding-y-md: var(--space-3);
  --setting-row-padding-y-lg: var(--space-4);

  // Divider between rows when the List sets dividers
  --setting-row-divider-color: var(--color-border);

  // Control cell caps — mirror Constrain's measure scale
  --setting-row-control-width-xs: var(--measure-xs);
  --setting-row-control-width-sm: var(--measure-sm);
  --setting-row-control-width-md: var(--measure-md);
}
```

Before writing this file, confirm `--measure-xs` / `--measure-sm` / `--measure-md` exist:

```bash
cd /home/dpws/projects/design-system
grep -n "measure-xs\|measure-sm\|measure-md" packages/design-system/src/styles/tokens.scss
```

If they do not exist under those exact names, read `packages/design-system/src/components/Constrain/Constrain.module.scss` and use whatever token names it resolves its `width` steps to. Do **not** invent a new token or write a raw length.

- [ ] **Step 4: Write the styles**

Create `packages/design-system/src/components/SettingRow/SettingRow.module.scss`:

```scss
@use './SettingRow.tokens';

// Two columns: label | control. The label column is a length resolved from
// --setting-row-label-width, so sibling rows align without a subgrid.
// minmax(0, …) on both tracks so a long description or a wide control
// shrinks instead of overflowing the List.
.row {
  display: grid;
  grid-template-columns:
    minmax(0, var(--setting-row-label-width))
    minmax(0, 1fr);
  column-gap: var(--setting-row-column-gap);
  align-items: start;
}

.term,
.control {
  display: flex;
  flex-direction: column;
  gap: var(--setting-row-stack-gap);
  min-width: 0;
}

// Label line — the <label> plus any adornment, which sits OUTSIDE the <label>
// so it never joins the control's accessible name.
.labelLine {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--setting-row-trailing-gap);
}

.label {
  font-size: var(--setting-row-label-font-size);
  font-weight: var(--setting-row-label-font-weight);
  line-height: var(--line-height-tight);
  color: var(--setting-row-label-fg);
}

.required {
  color: var(--color-danger);
}

.description {
  font-size: var(--font-size-sm);
  color: var(--setting-row-description-fg);
}

// Control + its trailing adornments on one line. wrap so a narrow row drops
// the adornments below instead of overflowing.
.controlLine {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--setting-row-trailing-gap);
}

// Control width caps apply to the control CELL, not a wrapper around the
// control — wrapping the child in <Constrain> would make Constrain the
// element cloneElement wires, silently stripping the control's id and aria-*.
.controlLine[data-control-width='xs'] {
  max-width: var(--setting-row-control-width-xs);
}

.controlLine[data-control-width='sm'] {
  max-width: var(--setting-row-control-width-sm);
}

.controlLine[data-control-width='md'] {
  max-width: var(--setting-row-control-width-md);
}

.controlLine[data-control-width='full'] {
  max-width: 100%;
}
```

- [ ] **Step 5: Write the component**

Create `packages/design-system/src/components/SettingRow/SettingRow.tsx`:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Text } from '../Text';
import { useFieldWiring, type FieldRenderProps } from '../_internal/fieldWiring';
import styles from './SettingRow.module.scss';

/** Max width applied to the control cell. Mirrors `<Constrain>`'s measure scale. */
export type SettingRowControlWidth = 'auto' | 'xs' | 'sm' | 'md' | 'full';

export interface SettingRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Label text. Renders a `<label htmlFor>` that names the control. Required. */
  label: ReactNode;
  /**
   * Badges / chips on the label line, rendered as a SIBLING of the `<label>`.
   * Deliberately outside it: label content becomes the control's accessible
   * name, so a provenance badge placed inside makes the input announce
   * "Seats From plan".
   */
  labelAdornment?: ReactNode;
  /** Helper text under the label, in the label column. Linked via `aria-describedby`. */
  description?: ReactNode;
  /** Max width of the control cell. Default `'auto'` — the control's intrinsic width. */
  controlWidth?: SettingRowControlWidth;
  /** Content after the control on the same line — a mode select, a state badge, a reset button. */
  trailing?: ReactNode;
  /** Block under the control column — a usage meter, a caveat, a preview. */
  footer?: ReactNode;
  /**
   * Error message. Takes over `aria-describedby` and flips the control to
   * `invalid`. Unlike `<Field>`, the `description` stays VISIBLE alongside it —
   * the two sit in different columns, so an invalid value is no reason to
   * remove the explanation of what the setting is.
   *
   * **Not announced, deliberately** — `aria-describedby` is read on focus, so
   * the form owns the submit-time summary. Same reasoning as `<Field error>`;
   * see #494.
   */
  error?: ReactNode;
  /** Marks the row required: shows `*` and injects `required` onto the control. */
  required?: boolean;
  /** Explicit control id. The row owns the id by default so the label always matches. */
  id?: string;
  /** A single control element (auto-wired) or a render-prop `(field) => ReactNode`. */
  children: ReactNode | ((field: FieldRenderProps) => ReactNode);
}

/**
 * One row of a settings screen: label (+ provenance adornment) and description
 * in a shared left column, the control (+ adornments that act on it) and an
 * optional footer block in the right column.
 *
 * Rows align because the label column is a length, shared via
 * `--setting-row-label-width` — set it once on `<SettingRow.List>`.
 *
 * Wiring (`id`, `aria-labelledby`, `aria-describedby`, `invalid`) works exactly
 * as `<Field>`'s, and the render-prop receives the same `field` object.
 *
 * @example
 * // A metered limit with provenance, a mode adornment and a usage meter:
 * <SettingRow.List dividers labelWidth="18rem">
 *   <SettingRow
 *     label="Seats"
 *     labelAdornment={<Badge tone="neutral" size="sm">From plan</Badge>}
 *     description="Member seats included for this tenant"
 *     controlWidth="xs"
 *     trailing={<Select size="sm" options={modes} value={mode} onChange={setMode} />}
 *     footer={<Progress value={0} max={50} aria-label="Seats usage" />}
 *   >
 *     <Input type="number" />
 *   </SettingRow>
 * </SettingRow.List>
 *
 * @example
 * // A plain setting — no adornments:
 * <SettingRow label="Default currency" description="Currency preselected for new records">
 *   <Select options={currencies} value={currency} onChange={setCurrency} />
 * </SettingRow>
 *
 * @example
 * // Render-prop for a wrapped or native control:
 * <SettingRow label="Webhook URL" error={errors.url}>
 *   {(field) => <input type="url" {...field} />}
 * </SettingRow>
 *
 * @remarks When NOT to use
 * - Read-only key/value display — use `<DefinitionList>`.
 * - A form field in a normal form — use `<Field>`; a settings row's shared
 *   label column is wrong for a two-up `<FormRow>`.
 * - A single `<Checkbox>` / `<Switch>` that already self-labels — put it in a
 *   `<Cluster>`, or pass it as the row's control with the row's `label` as the
 *   only label (don't double-label).
 *
 * @remarks Anti-patterns
 * - ❌ Putting a badge inside `label` instead of `labelAdornment` — it joins
 *   the control's accessible name.
 * - ❌ Wrapping the control in `<Constrain>` to size it — that makes
 *   `Constrain` the element the row wires, so the control silently loses its
 *   `id` and `aria-*`. Use `controlWidth`.
 * - ❌ A bare `<Cluster justify="between">` or a packed-left `<Cluster>` for a
 *   settings row — the first flings the control to the far edge of a wide
 *   card, the second leaves every row's control at a different x.
 * - ❌ `margin` on a row to separate rows — that is `<SettingRow.List>`'s job.
 */
export const SettingRow = forwardRef<HTMLDivElement, SettingRowProps>(function SettingRow(
  {
    label,
    labelAdornment,
    description,
    controlWidth = 'auto',
    trailing,
    footer,
    error,
    required,
    id,
    className,
    children,
    ...rest
  },
  ref,
) {
  const { controlId, labelId, descriptionId, errorId, wire } = useFieldWiring({
    id,
    hasLabel: true,
    hasDescription: description != null,
    hasError: error != null,
    required,
  });

  return (
    <div ref={ref} data-setting-row="" className={clsx(styles.row, className)} {...rest}>
      <div className={styles.term}>
        <div className={styles.labelLine}>
          <label htmlFor={controlId} id={labelId} className={styles.label}>
            {label}
            {required && (
              <span aria-hidden="true" className={styles.required}>
                {' '}
                *
              </span>
            )}
          </label>
          {labelAdornment}
        </div>
        {description != null && (
          <Text as="div" id={descriptionId} size="sm" tone="muted">
            {description}
          </Text>
        )}
      </div>
      <div className={styles.control}>
        <div className={styles.controlLine} data-control-width={controlWidth}>
          {wire(children)}
          {trailing}
        </div>
        {footer}
        {error != null && (
          <Text as="div" id={errorId} size="sm" tone="danger">
            {error}
          </Text>
        )}
      </div>
    </div>
  );
});
```

- [ ] **Step 6: Write the barrel**

Create `packages/design-system/src/components/SettingRow/index.ts`:

```ts
export { SettingRow } from './SettingRow';
export type { SettingRowProps, SettingRowControlWidth } from './SettingRow';
```

- [ ] **Step 7: Run the tests until green**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/components/SettingRow/SettingRow.test.tsx
```

Expected: PASS, all cases.

If `toHaveAccessibleDescription` / `toHaveAccessibleName` are unavailable, check that `jest-dom` is wired in the vitest setup file before changing the assertions — those matchers are the point of the test.

- [ ] **Step 8: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src/components/SettingRow
git commit -m "feat(SettingRow): add the row primitive

Label + adornment + description in a shared left column; control,
trailing adornments and a footer block in the right. Wiring is Field's,
via _internal/fieldWiring. labelAdornment renders outside the <label> so
a provenance badge never joins the control's accessible name."
```

---

### Task 3: `SettingRow.List` — rhythm, dividers, shared label width, collapse

**Files:**

- Modify: `packages/design-system/src/components/SettingRow/SettingRow.tsx` (add the `List` sub-component and attach it)
- Modify: `packages/design-system/src/components/SettingRow/SettingRow.module.scss` (list styles + container query)
- Modify: `packages/design-system/src/components/SettingRow/SettingRow.test.tsx` (add a `SettingRow.List` describe block)
- Modify: `packages/design-system/src/components/SettingRow/index.ts` (export the List props type)

**Interfaces:**

- Consumes: `SettingRow` (Task 2), `CollapseBreakpoint` from `../_internal/collapse`, `$collapse-sm|-md|-lg` from `../_internal/collapse.scss`.
- Produces: `SettingRow.List` and the exported type `SettingRowListProps`. The list root carries `data-setting-row-list=""`, `data-spacing`, and `data-dividers` when dividers are on.

- [ ] **Step 1: Add the failing tests**

Append to `packages/design-system/src/components/SettingRow/SettingRow.test.tsx`:

```tsx
describe('SettingRow.List', () => {
  it('renders its rows', () => {
    render(
      <SettingRow.List>
        <SettingRow label="Seats">
          <input type="number" />
        </SettingRow>
        <SettingRow label="API calls">
          <input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(screen.getByRole('spinbutton', { name: 'Seats' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'API calls' })).toBeInTheDocument();
  });

  it('defaults to md spacing and no dividers', () => {
    const { container } = render(
      <SettingRow.List>
        <SettingRow label="Seats">
          <input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    const list = container.querySelector('[data-setting-row-list]')!;
    expect(list).toHaveAttribute('data-spacing', 'md');
    expect(list).not.toHaveAttribute('data-dividers');
  });

  it('dividers sets the data attribute', () => {
    const { container } = render(
      <SettingRow.List dividers>
        <SettingRow label="Seats">
          <input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(container.querySelector('[data-setting-row-list]')).toHaveAttribute(
      'data-dividers',
      'true',
    );
  });

  it.each(['sm', 'md', 'lg'] as const)('spacing=%s sets the data attribute', (s) => {
    const { container } = render(
      <SettingRow.List spacing={s}>
        <SettingRow label="Seats">
          <input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(container.querySelector('[data-setting-row-list]')).toHaveAttribute('data-spacing', s);
  });

  it('labelWidth sets the shared custom property', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow.List ref={ref} labelWidth="18rem">
        <SettingRow label="Seats">
          <input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(ref.current!.style.getPropertyValue('--setting-row-label-width')).toBe('18rem');
  });

  it('omits the custom property when labelWidth is not set, so the token default applies', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow.List ref={ref}>
        <SettingRow label="Seats">
          <input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(ref.current!.style.getPropertyValue('--setting-row-label-width')).toBe('');
  });

  it.each(['sm', 'md', 'lg'] as const)('collapseBelow=%s renders the collapse class', (bp) => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow.List ref={ref} collapseBelow={bp}>
        <SettingRow label="Seats">
          <input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    // CSS Modules hashes class names in the real build but vitest maps them to
    // the raw name; assert on the substring so either form passes.
    expect(ref.current!.className).toMatch(
      new RegExp(`collapse${bp[0]!.toUpperCase()}${bp[1]}`, 'i'),
    );
  });

  it('forwards ref and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow.List ref={ref} className="custom">
        <SettingRow label="Seats">
          <input type="number" />
        </SettingRow>
      </SettingRow.List>,
    );
    expect(ref.current).toHaveClass('custom');
    expect(ref.current).toHaveAttribute('data-setting-row-list');
  });
});
```

- [ ] **Step 2: Run and watch it fail**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/components/SettingRow/SettingRow.test.tsx
```

Expected: FAIL — `SettingRow.List` is not a function / not a valid element type.

- [ ] **Step 3: Add the list styles**

Append to `packages/design-system/src/components/SettingRow/SettingRow.module.scss`, and add `@use '../_internal/collapse' as bp;` at the **top** of the file (next to the existing `@use './SettingRow.tokens';`):

```scss
// --- SettingRow.List ---------------------------------------------------
// The List owns vertical rhythm and dividers — hard rule 4 keeps them off
// the row, which is the child.
.list {
  display: flex;
  flex-direction: column;
}

.list[data-spacing='sm'] > [data-setting-row] {
  padding-block: var(--setting-row-padding-y-sm);
}

.list[data-spacing='md'] > [data-setting-row] {
  padding-block: var(--setting-row-padding-y-md);
}

.list[data-spacing='lg'] > [data-setting-row] {
  padding-block: var(--setting-row-padding-y-lg);
}

.list[data-dividers='true'] > [data-setting-row] + [data-setting-row] {
  border-top: var(--border-width) solid var(--setting-row-divider-color);
}

// --- collapseBelow -----------------------------------------------------
// Only a List with collapseBelow becomes a size container, so existing
// lists get no containment change. The queries target the ROWS, which are
// descendants — an element is never matched by a query against its own
// container (same constraint Grid and Split document).
.collapsible {
  container-type: inline-size;
}

@container (max-width: #{bp.$collapse-sm}) {
  .collapsible.collapseSm > [data-setting-row] {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--setting-row-stack-gap);
  }
}

@container (max-width: #{bp.$collapse-md}) {
  .collapsible.collapseMd > [data-setting-row] {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--setting-row-stack-gap);
  }
}

@container (max-width: #{bp.$collapse-lg}) {
  .collapsible.collapseLg > [data-setting-row] {
    grid-template-columns: minmax(0, 1fr);
    row-gap: var(--setting-row-stack-gap);
  }
}
```

- [ ] **Step 4: Add the List component**

In `SettingRow.tsx`, add to the imports:

```tsx
import { type CSSProperties } from 'react';
import { type CollapseBreakpoint } from '../_internal/collapse';
```

(Merge the `react` import with the existing one rather than adding a second import statement.)

Then, after the `SettingRow` definition, add:

```tsx
/** Vertical padding per row: `sm` = `--space-2`, `md` = `--space-3`, `lg` = `--space-4`. */
export type SettingRowListSpacing = 'sm' | 'md' | 'lg';

export interface SettingRowListProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * CSS length for the label column, shared by every row in the list
   * (e.g. `'18rem'`, `'240px'`). Default `'16rem'` via the
   * `--setting-row-label-width` token.
   *
   * A LENGTH, not `max-content` — rows align because they each resolve the
   * same value, with no subgrid.
   */
  labelWidth?: string;
  /** 1px border between rows. Default `false`, matching `<DefinitionList>`. */
  dividers?: boolean;
  /** Vertical padding per row. Default `'md'`. */
  spacing?: SettingRowListSpacing;
  /**
   * Container width at or below which each row stacks its label column above
   * its control column. `'sm'` 480px / `'md'` 640px / `'lg'` 768px, measured
   * against the LIST's own box (a container query, like `<Grid>` and
   * `<Split>`). Default `'sm'`.
   */
  collapseBelow?: CollapseBreakpoint;
  /** The rows. */
  children: ReactNode;
}

const COLLAPSE_CLASS: Record<CollapseBreakpoint, string> = {
  sm: styles.collapseSm!,
  md: styles.collapseMd!,
  lg: styles.collapseLg!,
};

/**
 * A list of `<SettingRow>`s. Owns the shared label column, the vertical
 * rhythm, the optional dividers, and the narrow-container collapse — all of
 * which are the parent's job, not the row's.
 *
 * @example
 * <SettingRow.List dividers labelWidth="18rem">
 *   <SettingRow label="Seats" description="Member seats for this tenant">
 *     <Input type="number" />
 *   </SettingRow>
 *   <SettingRow label="API calls" description="Requests included per month">
 *     <Input type="number" />
 *   </SettingRow>
 * </SettingRow.List>
 *
 * @remarks When NOT to use
 * - A single row — render the `<SettingRow>` on its own; it falls back to the
 *   `16rem` token default.
 * - Grouping rows under a heading — that is `<FormSection>`, which can wrap a
 *   `<SettingRow.List>`.
 *
 * @remarks Anti-patterns
 * - ❌ A `<Stack>` of rows with ad-hoc `gap` instead of this — the rows then
 *   have no shared label-column owner and no divider rhythm.
 * - ❌ Setting `--setting-row-label-width` on individual rows — the point is
 *   one value for the whole list.
 */
const SettingRowList = forwardRef<HTMLDivElement, SettingRowListProps>(function SettingRowList(
  {
    labelWidth,
    dividers = false,
    spacing = 'md',
    collapseBelow = 'sm',
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-setting-row-list=""
      data-spacing={spacing}
      data-dividers={dividers ? 'true' : undefined}
      className={clsx(styles.list, styles.collapsible, COLLAPSE_CLASS[collapseBelow], className)}
      style={
        labelWidth != null
          ? ({ ...style, '--setting-row-label-width': labelWidth } as CSSProperties)
          : style
      }
      {...rest}
    >
      {children}
    </div>
  );
});
```

Finally, attach it — place this **after** both `forwardRef` definitions, at the bottom of the file:

```tsx
type SettingRowComponent = typeof SettingRow & { List: typeof SettingRowList };

(SettingRow as SettingRowComponent).List = SettingRowList;

export type { SettingRowComponent };
```

If that cast reads awkwardly against the repo's other compound components, check how `DefinitionList` attaches `.Term` / `.Description` (`src/components/DefinitionList/DefinitionList.tsx`) and match that pattern exactly instead — consistency beats this particular spelling.

- [ ] **Step 5: Update the barrel**

`packages/design-system/src/components/SettingRow/index.ts`:

```ts
export { SettingRow } from './SettingRow';
export type {
  SettingRowProps,
  SettingRowControlWidth,
  SettingRowListProps,
  SettingRowListSpacing,
} from './SettingRow';
```

- [ ] **Step 6: Run the tests**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/components/SettingRow/SettingRow.test.tsx
```

Expected: PASS, both describe blocks.

- [ ] **Step 7: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src/components/SettingRow
git commit -m "feat(SettingRow): add SettingRow.List

Owns the shared label column, row rhythm, optional dividers and the
narrow-container collapse — hard rule 4 keeps all four off the row."
```

---

### Task 4: Public export, manifest, and agent docs

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/_meta/manifest.ts`
- Modify: `packages/design-system/scripts/generate-manifest.mjs`
- Modify: `packages/design-system/AGENTS.md`

**Interfaces:**

- Consumes: the `SettingRow` barrel (Tasks 2–3).
- Produces: `SettingRow` importable from `@eocrm/design-system`; `CLUSTERS.SettingRow = 'Forms'` in both parallel maps.

- [ ] **Step 1: Re-export from the library index**

In `packages/design-system/src/index.ts`, next to the existing `Field` export (around line 744):

```ts
export { SettingRow } from './components/SettingRow';
export type {
  SettingRowProps,
  SettingRowControlWidth,
  SettingRowListProps,
  SettingRowListSpacing,
} from './components/SettingRow';
```

- [ ] **Step 2: Add the CLUSTERS entry to BOTH maps**

The two maps are kept in sync by a drift test. Editing only one fails `npm test`.

In `packages/design-system/src/_meta/manifest.ts`, in the `// Forms` block:

```ts
  SettingRow: 'Forms',
```

In `packages/design-system/scripts/generate-manifest.mjs`, in its `// Forms` block, at the **same relative position**:

```js
  SettingRow: 'Forms',
```

- [ ] **Step 3: Rebuild the manifest**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npm run build:manifest
```

Expected: the generated manifest updates. If the diff includes unrelated churn, that is the known nondeterminism in this script — keep only the `SettingRow` lines and revert the rest.

- [ ] **Step 4: Add the AGENTS.md TL;DR**

In `packages/design-system/AGENTS.md`, immediately after the `### <Field> — labeled-control unit` section and before `### <FormSection>`, insert:

````markdown
### `<SettingRow>` — one row of a settings screen

```tsx
<SettingRow.List dividers labelWidth="18rem">
  <SettingRow
    label="Seats"
    labelAdornment={
      <Badge tone="neutral" size="sm">
        From plan
      </Badge>
    }
    description="Member seats included for this tenant"
    controlWidth="xs"
    trailing={<Select size="sm" options={modes} value={mode} onChange={setMode} />}
    footer={<Progress value={used} max={included} aria-label="Seats usage" />}
  >
    <Input type="number" />
  </SettingRow>
</SettingRow.List>
```

- Label (+ `labelAdornment`) and `description` in a shared LEFT column; control (+ `trailing`) and `footer` in the right. Wiring is `<Field>`'s — same `id` / `aria-labelledby` / `aria-describedby` / `invalid`, same render-prop `field` object.
- `error` takes over `aria-describedby` and flips the control invalid, but — unlike `<Field>` — leaves the `description` VISIBLE: they sit in different columns.
- `labelAdornment` renders OUTSIDE the `<label>` on purpose: label content becomes the control's accessible name, so a badge inside makes the input announce "Seats From plan".
- `controlWidth` (`auto` default, `xs`/`sm`/`md`/`full`) caps the control CELL. ❌ Don't wrap the control in `<Constrain>` — that makes `Constrain` the element the row wires, silently stripping the control's `id` and `aria-*`.
- `<SettingRow.List>` owns the shared label column (`labelWidth`, default `16rem`), `spacing` (`sm`/`md`/`lg`, default `md`), `dividers` (default `false`) and `collapseBelow` (default `'sm'` — a container query on the list's own box that stacks each row).
- ❌ Read-only key/value → `<DefinitionList>`. ❌ An ordinary form field → `<Field>`. ❌ `margin` on a row to space rows → that is the List.
````

- [ ] **Step 5: Verify the import path end to end**

```bash
cd /home/dpws/projects/design-system
npm run typecheck
cd packages/design-system && npx vitest run src/structure.test.ts
```

Expected: typecheck clean; `structure.test.ts` green (four files present, `SettingRow` re-exported, no shadowed token values).

- [ ] **Step 6: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src/index.ts packages/design-system/src/_meta/manifest.ts packages/design-system/scripts/generate-manifest.mjs packages/design-system/AGENTS.md
git commit -m "feat(SettingRow): export, manifest entry, AGENTS TL;DR"
```

---

### Task 5: Playground demo page + nav wiring

**Files:**

- Create: `packages/playground/src/pages/components/SettingRowDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (import + route)
- Modify: `packages/playground/src/layout/AppShell/navItems.ts` (icon import + Forms group entry)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` (grid entry)
- Modify: `packages/playground/src/pages/components/overviewSchematics.tsx` (schematic)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (`ComponentName` union)

**Interfaces:**

- Consumes: `SettingRow` from `@eocrm/design-system` (Task 4).
- Produces: the route `/components/setting-row` and `SCHEMATICS['SettingRow']`.

- [ ] **Step 1: Add the name to the `ComponentName` union**

In `packages/playground/src/pages/mockups/registry.ts`, in alphabetical position among the `| 'Xxx'` entries (after `'Select'`, before `'Skeleton'` — check the actual neighbours):

```ts
  | 'SettingRow'
```

This is required because the demo passes `componentName="SettingRow"` to `DemoLayout`, whose prop is typed to that union.

- [ ] **Step 2: Write the demo page**

Create `packages/playground/src/pages/components/SettingRowDemo.tsx`:

```tsx
import { useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Progress,
  Select,
  SettingRow,
  Stack,
  Switch,
  Text,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const MODES = [
  { value: 'hard', label: 'Hard limit' },
  { value: 'metered', label: 'Metered' },
];

const CURRENCIES = [
  { value: 'usd', label: 'US Dollar (USD)' },
  { value: 'eur', label: 'Euro (EUR)' },
  { value: 'gbp', label: 'British Pound (GBP)' },
];

export function SettingRowDemo() {
  const [seats, setSeats] = useState('50');
  const [mode, setMode] = useState('metered');
  const [currency, setCurrency] = useState('usd');
  const [notify, setNotify] = useState(true);
  const seatsError = Number(seats) < 1 ? 'Seats must be at least 1.' : undefined;

  return (
    <DemoLayout
      name="SettingRow"
      description="One row of a settings screen — label and description in a shared left column, control, adornments and an optional footer in the right. Wiring is Field's."
      files={getComponentFiles('SettingRow')}
      componentName="SettingRow"
    >
      <Example
        title="A list of rows"
        description="Every row resolves the same label-column length, so the controls line up. The List owns the rhythm and the dividers."
        code={`import { Input, Select, SettingRow } from '@eocrm/design-system';

export function Demo() {
  return (
    <SettingRow.List dividers labelWidth="18rem">
      <SettingRow label="Seats" description="Member seats included for this tenant" controlWidth="xs">
        <Input type="number" />
      </SettingRow>
      <SettingRow label="Default currency" description="Currency preselected for new records">
        <Select options={currencies} value={currency} onChange={setCurrency} clearable={false} />
      </SettingRow>
    </SettingRow.List>
  );
}`}
      >
        <SettingRow.List dividers labelWidth="18rem">
          <SettingRow
            label="Seats"
            description="Member seats included for this tenant"
            controlWidth="xs"
          >
            <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </SettingRow>
          <SettingRow label="Default currency" description="Currency preselected for new records">
            <Select
              options={CURRENCIES}
              value={currency}
              onChange={(v) => setCurrency(v as string)}
              clearable={false}
            />
          </SettingRow>
        </SettingRow.List>
      </Example>

      <Example
        title="Adornments — label, trailing, footer"
        description="labelAdornment sits outside the <label> so the badge never joins the control's accessible name. trailing acts on the control; footer carries the usage meter."
        code={`import { Badge, Button, Input, Progress, Select, SettingRow, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <SettingRow.List dividers labelWidth="18rem">
      <SettingRow
        label="Seats"
        labelAdornment={<Badge tone="neutral" size="sm">From plan</Badge>}
        description="Member seats included for this tenant"
        controlWidth="xs"
        trailing={
          <>
            <Select size="sm" options={modes} value={mode} onChange={setMode} clearable={false} />
            <Badge tone="warning" size="sm">Overridden</Badge>
            <Button variant="ghost" size="sm">Reset to default</Button>
          </>
        }
        footer={
          <Stack gap="xs">
            <Progress value={12} max={50} aria-label="Seats usage" />
            <Text as="span" size="xs" tone="muted">
              12 of 50 included this month.
            </Text>
          </Stack>
        }
      >
        <Input type="number" />
      </SettingRow>
    </SettingRow.List>
  );
}`}
      >
        <SettingRow.List dividers labelWidth="18rem">
          <SettingRow
            label="Seats"
            labelAdornment={
              <Badge tone="neutral" size="sm">
                From plan
              </Badge>
            }
            description="Member seats included for this tenant"
            controlWidth="xs"
            trailing={
              <>
                <Select
                  size="sm"
                  options={MODES}
                  value={mode}
                  onChange={(v) => setMode(v as string)}
                  clearable={false}
                  aria-label="Seats limit mode"
                />
                <Badge tone="warning" size="sm">
                  Overridden
                </Badge>
                <Button variant="ghost" size="sm">
                  Reset to default
                </Button>
              </>
            }
            footer={
              <Stack gap="xs">
                <Progress value={12} max={50} aria-label="Seats usage" />
                <Text as="span" size="xs" tone="muted">
                  12 of 50 included this month.
                </Text>
              </Stack>
            }
          >
            <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
          </SettingRow>
        </SettingRow.List>
      </Example>

      <Example
        title="Required + live error"
        description="error replaces the description, links the message, and flips the control invalid — same contract as Field. Set seats to 0."
        code={`import { Input, SettingRow } from '@eocrm/design-system';

export function Demo() {
  const seatsError = Number(seats) < 1 ? 'Seats must be at least 1.' : undefined;

  return (
    <SettingRow
      label="Seats"
      description="Member seats included for this tenant"
      controlWidth="xs"
      required
      error={seatsError}
    >
      <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
    </SettingRow>
  );
}`}
      >
        <SettingRow
          label="Seats"
          description="Member seats included for this tenant"
          controlWidth="xs"
          required
          error={seatsError}
        >
          <Input type="number" value={seats} onChange={(e) => setSeats(e.target.value)} />
        </SettingRow>
      </Example>

      <Example
        title="Switch as the control"
        description="A Switch self-labels, so pass it without its own label prop and let the row name it."
        code={`import { SettingRow, Switch } from '@eocrm/design-system';

export function Demo() {
  return (
    <SettingRow label="Email notifications" description="Send a digest when a deal changes stage.">
      <Switch checked={notify} onChange={setNotify} />
    </SettingRow>
  );
}`}
      >
        <SettingRow
          label="Email notifications"
          description="Send a digest when a deal changes stage."
        >
          <Switch checked={notify} onChange={setNotify} />
        </SettingRow>
      </Example>
    </DemoLayout>
  );
}
```

Before finishing this step, open a neighbouring demo (`packages/playground/src/pages/components/FieldDemo.tsx`) and confirm the `Example` prop names (`title`, `description`, `code`) and the `Select` / `Switch` / `Progress` signatures used above match the current library. Fix any mismatch here rather than in the library.

- [ ] **Step 3: Wire the route**

In `packages/playground/src/App.tsx`, add the import next to the other component demo imports:

```tsx
import { SettingRowDemo } from './pages/components/SettingRowDemo';
```

and the route next to the other `/components/*` routes:

```tsx
<Route path="/components/setting-row" element={<SettingRowDemo />} />
```

- [ ] **Step 4: Wire the sidebar nav**

In `packages/playground/src/layout/AppShell/navItems.ts`:

1. Add an icon to the `lucide-react` import list — `SlidersHorizontal` (confirm it is not already imported; if it is, reuse it).
2. Add to the `Forms` group's `items` array, right after the `Field` entry:

```ts
      { to: '/components/setting-row', label: 'SettingRow', icon: SlidersHorizontal, end: false },
```

- [ ] **Step 5: Wire the overview grid entry**

In `packages/playground/src/pages/components/ComponentsIndex.tsx`, add next to the other Forms entries:

```tsx
  {
    to: '/components/setting-row',
    name: 'SettingRow',
    description:
      'Settings-screen row — shared label column, control adornments, and a footer for a usage meter.',
    preview: SCHEMATICS['SettingRow'],
  },
```

- [ ] **Step 6: Wire the schematic**

In `packages/playground/src/pages/components/overviewSchematics.tsx`, add a `SettingRow` key alongside the others. Use the file's existing `Row` / `Col` / `Box` / `Outline` / `Solid` primitives — do not invent new ones:

```tsx
  SettingRow: (
    <Col gap={6}>
      <Row gap={8}>
        <Col gap={3}>
          <Box w={22} h={5} />
          <Box w={30} h={3} />
        </Col>
        <Col gap={3}>
          <Outline w={16} h={7} />
          <Solid w={24} h={3} />
        </Col>
      </Row>
      <Box w={62} h={1} />
      <Row gap={8}>
        <Col gap={3}>
          <Box w={18} h={5} />
          <Box w={26} h={3} />
        </Col>
        <Outline w={22} h={7} />
      </Row>
    </Col>
  ),
```

Check the prop names and the `w`/`h` scale the neighbouring schematics use and match them; if `Col` takes no `gap`, follow whatever the file does.

- [ ] **Step 7: Typecheck and build the playground**

```bash
cd /home/dpws/projects/design-system
npm run typecheck
npm run build --workspace playground
```

Expected: both clean.

- [ ] **Step 8: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/playground/src
git commit -m "feat(playground): add SettingRow demo + nav wiring"
```

---

### Task 6: Rebuild the Settings mockup onto the real component

**Files:**

- Modify: `packages/playground/src/data/systemSettings.ts` (add the metered fields)
- Modify: `packages/playground/src/pages/mockups/Settings/Settings.tsx` (delete the local `SettingRow`, use the library one)

**Interfaces:**

- Consumes: `SettingRow` from `@eocrm/design-system` (Task 4).
- Produces: nothing downstream.

- [ ] **Step 1: Extend the data with metered cases**

In `packages/playground/src/data/systemSettings.ts`, add two optional fields to `NumberSetting` so a row can exercise `footer` and a mode adornment:

```ts
export interface NumberSetting {
  key: string;
  label: string;
  description: string;
  type: 'number';
  defaultValue: number;
  currentValue: number;
  unit?: string;
  min?: number;
  max?: number;
  /** Current consumption against `currentValue`. Present = the row shows a usage meter. */
  used?: number;
  /** Shown as a provenance badge on the label line — e.g. 'From plan'. */
  source?: string;
}
```

Then add `used` (and `source` where it reads naturally) to at least two existing number settings in `settingsSections`, e.g.:

```ts
        currentValue: 365,
        unit: 'days',
        min: 7,
        max: 3650,
        used: 128,
        source: 'From plan',
```

Pick values where `used < currentValue` so the meter is partially filled, not empty or overflowing.

- [ ] **Step 2: Rewrite the mockup's row**

In `packages/playground/src/pages/mockups/Settings/Settings.tsx`:

1. **Delete the entire local `SettingRow` function** (currently ~`:41`–`:141`, including its `SettingRowProps` interface) and the now-unused `Cluster` / `Divider` imports if nothing else in the file uses them.
2. Add `SettingRow` to the `@eocrm/design-system` import, plus `Progress` for the meter.
3. Keep the per-type control `switch` — extract it to a small `controlFor(setting, value, onChange)` helper that returns just the control element, since the row now owns everything around it.
4. Rewrite `SectionCard`'s body so the rows render inside one list:

```tsx
<SettingRow.List dividers labelWidth="20rem">
  {section.settings.map((setting) => {
    const value = values[setting.key];
    const modified = isModified(setting, value);
    const metered = setting.type === 'number' && setting.used !== undefined;
    return (
      <SettingRow
        key={setting.key}
        label={setting.label}
        labelAdornment={
          <>
            {setting.type === 'number' && setting.source && (
              <Badge tone="neutral" size="sm">
                {setting.source}
              </Badge>
            )}
            <Code tone="muted">{setting.key}</Code>
          </>
        }
        description={setting.description}
        controlWidth={setting.type === 'number' ? 'xs' : 'auto'}
        trailing={
          <>
            {setting.type === 'number' && setting.unit && (
              <Text as="span" size="sm" tone="muted">
                {setting.unit}
              </Text>
            )}
            {modified && (
              <>
                <Tooltip content={`Default: ${String(setting.defaultValue)}`}>
                  <Badge tone="info" size="sm">
                    Modified
                  </Badge>
                </Tooltip>
                <Tooltip content={`Reset to ${String(setting.defaultValue)}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    aria-label={`Reset ${setting.label} to default`}
                    onClick={() =>
                      setValues((prev) => ({
                        ...prev,
                        [setting.key]: setting.defaultValue,
                      }))
                    }
                  >
                    <RotateCcw size={14} />
                  </Button>
                </Tooltip>
              </>
            )}
          </>
        }
        footer={
          metered ? (
            <Stack gap="xs">
              <Progress
                value={(setting as NumberSetting).used!}
                max={Number(value)}
                aria-label={`${setting.label} usage`}
              />
              <Text as="span" size="xs" tone="muted">
                {(setting as NumberSetting).used} of {String(value)} used.
              </Text>
            </Stack>
          ) : undefined
        }
      >
        {controlFor(setting, value, (next) =>
          setValues((prev) => ({ ...prev, [setting.key]: next })),
        )}
      </SettingRow>
    );
  })}
</SettingRow.List>
```

5. Drop the `aria-label={setting.label}` from every control inside `controlFor` — the row names them now, and leaving both in place makes the explicit `aria-label` win over the row's `<label>`, which defeats the point of the component.
6. Import `NumberSetting` as a type from `../../../data/systemSettings` if the cast above is used; better, narrow with `setting.type === 'number' && setting.used !== undefined` so no cast is needed.

- [ ] **Step 3: Typecheck and build**

```bash
cd /home/dpws/projects/design-system
npm run typecheck
npm run build --workspace playground
```

Expected: both clean. A "declared but never read" error on `Cluster` or `Divider` means step 2.1's import cleanup was missed.

- [ ] **Step 4: Verify in the browser**

```bash
cd /home/dpws/projects/design-system
npm run dev --workspace playground -- --port 8090
```

Open `http://localhost:8090/mockups/system-settings` (confirm the route in `App.tsx`) and check, at a 1400px viewport:

- every control in a card starts at the same x
- the meter is confined to the control column, not the full card width
- no control announces its badge — inspect one input's accessible name in devtools
- narrow the window to ~420px and confirm each row stacks label-above-control rather than overflowing

Also open `http://localhost:8090/components/setting-row` and check all four examples render.

Kill the dev server and any Playwright Chrome afterwards.

- [ ] **Step 5: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/playground/src/data/systemSettings.ts packages/playground/src/pages/mockups/Settings/Settings.tsx
git commit -m "refactor(playground): rebuild the Settings mockup on SettingRow

Deletes the mockup's hand-rolled row, whose justify=\"between\" flung the
control to the far edge of a wide card. Adds metered entries to the data
so the footer and trailing slots are exercised."
```

---

### Task 7: Full gate, then the mandatory review loop

**Files:** none — verification only.

- [ ] **Step 1: Run the whole gate**

```bash
cd /home/dpws/projects/design-system
npm run format:check
npm run lint:css
npm run typecheck
npm test
echo "exit=$?"
```

Read the **exit code**, not a filtered pipeline — `npm test` covers every workspace including design-tokens, and piping through `grep` reports grep's status instead.

Expected: all four clean. In particular `npm test` must show the manifest drift test green, which it only will if Task 4 Step 3 ran.

- [ ] **Step 2: Open the PR and run the review loop**

This branch touches `packages/design-system/**`, so design-system CLAUDE.md Hard rule 8 applies and the review-fix cycle is **not optional**.

**REQUIRED SUB-SKILL:** use the `pre-push-review` skill (library variant). It opens a draft PR after the baseline gates, then runs the review-fix loop until two fresh reviewers say "clean enough to stop" before marking it ready.

- [ ] **Step 3: Wait for `Quality / check`, then merge**

```bash
cd /home/dpws/projects/design-system
gh pr checks --watch
```

Merge once green. The `Release` workflow then auto-publishes a patch bump of `@eocrm/design-system` and redeploys the playground.

---

## Notes for the executor

- **The spec's accepted cost:** the mockup rebuild deliberately does NOT reproduce the vertical-`Tabs` + module-panel screen that prompted this work. Don't add one — that was decided.
- **Read-only rows are out of scope.** `DefinitionList` covers read-only key/value.
- **If Task 1's extraction requires editing `Field.test.tsx`, stop and report.** That test is the guard; an edit means the refactor changed behavior.
