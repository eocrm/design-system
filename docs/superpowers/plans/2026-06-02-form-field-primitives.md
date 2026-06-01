# Form Field Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three composable form primitives to `@eocrm/design-system` — `<Field>` (labeled-control unit with automatic a11y wiring), `<FormRow>` (responsive side-by-side fields), and `<FormSection>` (titled group) — without touching the existing controls or adding any validation/state.

**Architecture:** `<Field>` wraps a single control (or a render-prop) and injects `id` / `aria-describedby` / `invalid` / `required` by `cloneElement`; the control set already maps `invalid → aria-invalid`, so no control changes are needed. `<FormRow>` is a thin wrapper over the existing `<Grid>` (auto-fit `minColumnWidth` for responsive reflow, or fixed `columns`). `<FormSection>` composes `<Title>` + `<Text>` + a stack of fields. Each ships with the full repo "done" checklist.

**Tech Stack:** React 18+ (`forwardRef`, `cloneElement`, `useId`), TypeScript, SCSS Modules (vitest `classNameStrategy: 'stable'`), `clsx`, Vitest + Testing Library. Spec: `docs/superpowers/specs/2026-06-01-form-field-primitives-design.md`.

---

## File map

**Create (library):**
- `packages/design-system/src/components/Field/Field.tsx`
- `packages/design-system/src/components/Field/Field.module.scss`
- `packages/design-system/src/components/Field/Field.test.tsx`
- `packages/design-system/src/components/Field/index.ts`
- `packages/design-system/src/components/FormSection/FormSection.tsx`
- `packages/design-system/src/components/FormSection/FormSection.module.scss`
- `packages/design-system/src/components/FormSection/FormSection.test.tsx`
- `packages/design-system/src/components/FormSection/index.ts`
- `packages/design-system/src/components/FormRow/FormRow.tsx`
- `packages/design-system/src/components/FormRow/FormRow.test.tsx`
- `packages/design-system/src/components/FormRow/index.ts`  *(no `.module.scss` — FormRow delegates all styling to `<Grid>`)*

**Create (playground):**
- `packages/playground/src/pages/components/FieldDemo.tsx`
- `packages/playground/src/pages/components/FormSectionDemo.tsx`
- `packages/playground/src/pages/components/FormRowDemo.tsx`

**Modify:**
- `packages/design-system/src/index.ts` — re-export the three components + types
- `packages/design-system/AGENTS.md` — three TL;DR sections
- `packages/playground/src/App.tsx` — imports + routes
- `packages/playground/src/layout/AppShell/AppShell.tsx` — lucide icon imports + 3 nav entries
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — imports + 3 grid entries

---

## Task 0: Pre-flight — branch + hooks

**Files:** none (git only)

- [ ] **Step 1: Verify hooks are installed (repo invariant)**

Run:
```bash
cd /Users/dpws/projects/design-system
git config --get core.hooksPath   # must print: .husky/_
test -x .husky/pre-push && echo "pre-push OK"
```
Expected: prints `.husky/_` and `pre-push OK`. If not, run `npm install` and re-check before proceeding.

- [ ] **Step 2: Branch off main**

Run:
```bash
git checkout main && git pull --ff-only
git checkout -b feat/form-field-primitives
```
Expected: on branch `feat/form-field-primitives`.

---

## Task 1: `<Field>` — labeled-control unit

**Files:**
- Create: `packages/design-system/src/components/Field/Field.tsx`
- Create: `packages/design-system/src/components/Field/Field.module.scss`
- Test: `packages/design-system/src/components/Field/Field.test.tsx`
- Create: `packages/design-system/src/components/Field/index.ts`
- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/AGENTS.md`
- Create: `packages/playground/src/pages/components/FieldDemo.tsx`
- Modify: `packages/playground/src/App.tsx`, `.../AppShell/AppShell.tsx`, `.../components/ComponentsIndex.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/design-system/src/components/Field/Field.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Field } from './Field';

// A stub control mimicking the DS control contract: reads `invalid` and
// reflects it to aria-invalid; forwards id / aria-describedby / required.
function StubControl(props: {
  id?: string;
  invalid?: boolean;
  required?: boolean;
  'aria-describedby'?: string;
}) {
  return (
    <input
      data-testid="control"
      id={props.id}
      required={props.required}
      aria-invalid={props.invalid || undefined}
      aria-describedby={props['aria-describedby']}
    />
  );
}

describe('Field', () => {
  it('associates the label with the control via htmlFor/id', () => {
    const { container } = render(
      <Field label="Work email">
        <StubControl />
      </Field>,
    );
    const input = screen.getByTestId('control');
    expect(input.id).toBeTruthy();
    const label = container.querySelector(`label[for="${input.id}"]`);
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Work email');
  });

  it('renders description and links aria-describedby to it (no error)', () => {
    render(
      <Field label="Email" description="We only use this for sign-in.">
        <StubControl />
      </Field>,
    );
    const input = screen.getByTestId('control');
    const desc = screen.getByText('We only use this for sign-in.');
    expect(desc.id).toBeTruthy();
    expect(input).toHaveAttribute('aria-describedby', desc.id);
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('error replaces description, flips invalid, links aria-describedby', () => {
    render(
      <Field label="Email" description="hint" error="Enter a valid email.">
        <StubControl />
      </Field>,
    );
    const input = screen.getByTestId('control');
    const err = screen.getByText('Enter a valid email.');
    expect(input).toHaveAttribute('aria-describedby', err.id);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('hint')).not.toBeInTheDocument();
  });

  it('required shows a marker and injects required on the control', () => {
    render(
      <Field label="Email" required>
        <StubControl />
      </Field>,
    );
    expect(screen.getByTestId('control')).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('optional shows an "(optional)" marker', () => {
    render(
      <Field label="Phone" optional>
        <StubControl />
      </Field>,
    );
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it('render-prop receives the full field object incl. aria-invalid', () => {
    let received: Record<string, unknown> = {};
    render(
      <Field label="Email" error="bad">
        {(field) => {
          received = field as unknown as Record<string, unknown>;
          return <input data-testid="control" {...field} />;
        }}
      </Field>,
    );
    expect(received.id).toBeTruthy();
    expect(received.invalid).toBe(true);
    expect(received['aria-invalid']).toBe(true);
    expect(received['aria-describedby']).toBeTruthy();
  });

  it("the child's explicit prop wins over Field's injected value", () => {
    render(
      <Field label="Email" error="bad">
        <StubControl aria-describedby="custom-id" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAttribute('aria-describedby', 'custom-id');
  });

  it('group mode: role=group, aria-labelledby caption, child gets invalid, no <label>', () => {
    const { container } = render(
      <Field asGroup label="Notify me" error="Pick one">
        <StubControl />
      </Field>,
    );
    const group = container.querySelector('[role="group"]') as HTMLElement;
    expect(group).toBeInTheDocument();
    const caption = screen.getByText('Notify me');
    expect(caption.tagName).not.toBe('LABEL');
    expect(group).toHaveAttribute('aria-labelledby', caption.id);
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('control')).toHaveAttribute('aria-invalid', 'true');
  });

  it('horizontal orientation applies the modifier class', () => {
    const { container } = render(
      <Field label="Timezone" orientation="horizontal">
        <StubControl />
      </Field>,
    );
    expect((container.firstChild as HTMLElement).className).toMatch(/horizontal/);
  });

  it('forwards ref, merges className, spreads rest', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <Field ref={ref} className="my-cls" data-foo="bar" label="X">
        <StubControl />
      </Field>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/my-cls/);
    expect(root).toHaveAttribute('data-foo', 'bar');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/Field/Field.test.tsx`
Expected: FAIL — `Failed to resolve import "./Field"` (module not created yet).

- [ ] **Step 3: Create the SCSS module**

Create `packages/design-system/src/components/Field/Field.module.scss`:

```scss
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

// Label-beside-control. `--field-label-width` is overridable per consumer.
// grid-template-columns is not token-linted (only color/border-width/opacity are);
// the literal fallback mirrors DefinitionList's `--dl-term-width` pattern.
.horizontal {
  display: grid;
  grid-template-columns: var(--field-label-width, 12rem) 1fr;
  gap: var(--space-2) var(--space-4);
  align-items: start;
}

.label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  color: var(--color-fg);
}

.sizeSm {
  font-size: var(--font-size-xs);
}

.sizeLg {
  font-size: var(--font-size-md);
}

.required {
  color: var(--color-danger);
}

.optional {
  font-weight: var(--font-weight-regular);
  color: var(--color-fg-muted);
}

.body {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}
```

- [ ] **Step 4: Implement the component**

Create `packages/design-system/src/components/Field/Field.tsx`:

```tsx
import {
  forwardRef,
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Text, type TextSize } from '../Text';
import styles from './Field.module.scss';

/** Label placement relative to the control. */
export type FieldOrientation = 'vertical' | 'horizontal';

/** Label/message type scale; pairs with the control's own `size`. */
export type FieldSize = 'sm' | 'md' | 'lg';

/** The wiring Field hands to its control. Spread onto the control in render-prop form. */
export interface FieldRenderProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': boolean | undefined;
  invalid: boolean;
  required: boolean;
  /** Id of the label/caption element — for manual `aria-labelledby` wiring. */
  labelId: string;
}

type FieldChild = ReactNode | ((field: FieldRenderProps) => ReactNode);

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Label text. Renders a `<label htmlFor>` (or, in `asGroup`, a `role="group"` caption). */
  label?: ReactNode;
  /** Helper text below the control. Hidden while `error` is present. */
  description?: ReactNode;
  /** Error message. Replaces `description`, flips the control to `invalid`, links `aria-describedby`. */
  error?: ReactNode;
  /** Marks the field required: shows `*` and injects `required` onto the control. */
  required?: boolean;
  /** Marks the field optional: shows `(optional)`. Mutually exclusive with `required`. */
  optional?: boolean;
  /** Label placement. Default `'vertical'`. `'horizontal'` puts the label beside the control. */
  orientation?: FieldOrientation;
  /** Label/message type scale. Default `'md'`. */
  size?: FieldSize;
  /** Explicit control id. Field owns the id by default (auto-generated) so the label always matches. */
  id?: string;
  /** Group mode for radio/checkbox sets: label becomes a `role="group"` caption (no `htmlFor`). */
  asGroup?: boolean;
  /** A single control element (auto-wired) or a render-prop `(field) => ReactNode`. */
  children: FieldChild;
}

const MSG_SIZE: Record<FieldSize, TextSize> = { sm: 'xs', md: 'sm', lg: 'sm' };

/**
 * Labeled-control unit — the editable sibling of `<DefinitionList>`. Wraps a
 * single control with its label, helper/error message, required marker, and the
 * `id` / `aria-describedby` / `aria-invalid` wiring done by construction.
 *
 * The common case auto-wires a single child via `cloneElement`. For wrapped,
 * nested, or native controls, pass a render-prop and spread the `field` object.
 *
 * Field owns NO validation/state — pass `error` from your form layer.
 *
 * @example
 * // Auto-wired (DS control):
 * <Field label="Work email" error={errors.email} required>
 *   <Input type="email" />
 * </Field>
 *
 * @example
 * // Render-prop escape hatch (wrapped / native control):
 * <Field label="Email" error={errors.email}>
 *   {(field) => <input type="email" {...field} />}
 * </Field>
 *
 * @example
 * // Radio/checkbox group — label becomes a role="group" caption:
 * <Field asGroup label="Notify me" error={errors.notify}>
 *   <RadioGroup name="notify">
 *     <Radio value="all" label="All activity" />
 *     <Radio value="mentions" label="Only mentions" />
 *   </RadioGroup>
 * </Field>
 *
 * @remarks When NOT to use
 * - A single `<Checkbox>` / `<Switch>` — they carry their own inline `label`; wrapping
 *   them in a top-labeled Field double-labels. Use the control's `label` prop instead.
 * - Read-only key/value display — use `<DefinitionList>`, not a Field.
 * - Arranging multiple fields — that's `<FormRow>` / `<FormSection>` / `<Stack>`, not Field.
 *
 * @remarks Anti-patterns
 * - ❌ Setting the control's `id` directly to "override" Field — Field owns the id so the
 *   label always matches. Pass `<Field id>` instead.
 * - ❌ Auto-wiring a raw native `<input>` and expecting `aria-invalid` — auto-clone injects
 *   the DS `invalid` prop (controls map it to `aria-invalid`). For a native element use the
 *   render-prop and spread `field` (it includes `aria-invalid`).
 * - ❌ Passing both `required` and `optional`.
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    label,
    description,
    error,
    required,
    optional,
    orientation = 'vertical',
    size = 'md',
    id,
    asGroup = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const controlId = id ?? reactId;
  const labelId = `${controlId}-label`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;

  const invalid = Boolean(error);
  const requiredBool = Boolean(required);
  const describedBy = error ? errorId : description != null ? descriptionId : undefined;

  const field: FieldRenderProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': invalid || undefined,
    invalid,
    required: requiredBool,
    labelId,
  };

  let control: ReactNode;
  if (typeof children === 'function') {
    control = children(field);
  } else if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = child.props;
    const injected: Record<string, unknown> = asGroup
      ? { invalid: childProps.invalid ?? invalid }
      : {
          id: controlId,
          'aria-describedby': childProps['aria-describedby'] ?? describedBy,
          invalid: childProps.invalid ?? invalid,
          required: childProps.required ?? requiredBool,
        };
    control = cloneElement(child, injected);
  } else {
    control = children;
  }

  const labelClassName = clsx(
    styles.label,
    size === 'sm' && styles.sizeSm,
    size === 'lg' && styles.sizeLg,
  );

  const markers = (
    <>
      {required && (
        <span aria-hidden="true" className={styles.required}> *</span>
      )}
      {optional && <span className={styles.optional}> (optional)</span>}
    </>
  );

  let labelNode: ReactNode = null;
  if (label != null) {
    labelNode = asGroup ? (
      <span id={labelId} className={labelClassName}>
        {label}
        {markers}
      </span>
    ) : (
      <label htmlFor={controlId} id={labelId} className={labelClassName}>
        {label}
        {markers}
      </label>
    );
  }

  let messageNode: ReactNode = null;
  if (error != null) {
    messageNode = (
      <Text as="div" id={errorId} size={MSG_SIZE[size]} tone="danger">
        {error}
      </Text>
    );
  } else if (description != null) {
    messageNode = (
      <Text as="div" id={descriptionId} size={MSG_SIZE[size]} tone="muted">
        {description}
      </Text>
    );
  }

  const groupAria = asGroup
    ? {
        role: 'group' as const,
        'aria-labelledby': label != null ? labelId : undefined,
        'aria-describedby': describedBy,
        'aria-invalid': invalid || undefined,
      }
    : {};

  return (
    <div
      ref={ref}
      className={clsx(styles.field, orientation === 'horizontal' && styles.horizontal, className)}
      {...groupAria}
      {...rest}
    >
      {labelNode}
      <div className={styles.body}>
        {control}
        {messageNode}
      </div>
    </div>
  );
});
```

- [ ] **Step 5: Create the barrel index**

Create `packages/design-system/src/components/Field/index.ts`:

```ts
export { Field } from './Field';
export type { FieldProps, FieldOrientation, FieldSize, FieldRenderProps } from './Field';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/Field/Field.test.tsx`
Expected: PASS — all 10 tests green.

- [ ] **Step 7: Re-export from the package root**

In `packages/design-system/src/index.ts`, append after the last existing export block:

```ts
export { Field } from './components/Field';
export type { FieldProps, FieldOrientation, FieldSize, FieldRenderProps } from './components/Field';
```

- [ ] **Step 8: Add the AGENTS.md TL;DR**

In `packages/design-system/AGENTS.md`, add this section in the component reference area (near the other Forms entries):

````markdown
### `<Field>` — labeled-control unit

```tsx
<Field label="Work email" error={errors.email} required>
  <Input type="email" />
</Field>

// wrapped / native control → render-prop, spread `field`:
<Field label="Email" error={errors.email}>
  {(field) => <input type="email" {...field} />}
</Field>
```

- Wraps ONE control with its label + help/error + required marker, and auto-wires
  `id` / `aria-describedby` / `invalid` (controls map `invalid → aria-invalid`).
- `error` replaces `description` and flips the control invalid. `required` shows `*`;
  `optional` shows `(optional)`. `orientation="horizontal"` = label beside control.
- Field owns the control `id` — to set one, use `<Field id>`, not the control.
- Groups: `<Field asGroup>` around `<RadioGroup>` → label becomes a `role="group"` caption.
- ❌ Don't wrap a single `<Checkbox>`/`<Switch>` (they self-label). ❌ No validation/state — pass `error` from your form layer.
````

- [ ] **Step 9: Create the demo page**

Create `packages/playground/src/pages/components/FieldDemo.tsx`:

```tsx
import { useState } from 'react';
import { Field, Input, Radio, RadioGroup } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function FieldDemo() {
  const [email, setEmail] = useState('');
  const emailError =
    email.length > 0 && !email.includes('@') ? 'Enter a valid email address.' : undefined;

  return (
    <DemoLayout
      name="Field"
      description="Labeled-control unit — wires label, help, error, the required marker, and id/aria-describedby/invalid onto any control. No validation or state of its own."
      files={getComponentFiles('Field')}
    >
      <Example
        title="Label + description"
        description="Label associated to the control; helper text linked via aria-describedby."
        code={`<Field label="Work email" description="We only use this for sign-in.">
  <Input type="email" placeholder="you@company.com" />
</Field>`}
      >
        <Field label="Work email" description="We only use this for sign-in.">
          <Input type="email" placeholder="you@company.com" />
        </Field>
      </Example>

      <Example
        title="Required + live error"
        description="error replaces the description, flips the control to invalid, and links the message. Type a value without an '@'."
        code={`<Field label="Email" required error={emailError}>
  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
</Field>`}
      >
        <Field label="Email" required error={emailError}>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </Example>

      <Example
        title="Optional + horizontal orientation"
        description="orientation='horizontal' places the label beside the control — the Settings-row layout."
        code={`<Field label="Display name" optional orientation="horizontal">
  <Input placeholder="Ada Lovelace" />
</Field>`}
      >
        <Field label="Display name" optional orientation="horizontal">
          <Input placeholder="Ada Lovelace" />
        </Field>
      </Example>

      <Example
        title="Group mode (radio set)"
        description="asGroup renders the label as a role=group caption (no htmlFor) and wires the group's aria-labelledby / error."
        code={`<Field asGroup label="Notify me" error="Pick one option.">
  <RadioGroup name="notify">
    <Radio value="all" label="All activity" />
    <Radio value="mentions" label="Only mentions" />
  </RadioGroup>
</Field>`}
      >
        <Field asGroup label="Notify me" error="Pick one option.">
          <RadioGroup name="notify-demo">
            <Radio value="all" label="All activity" />
            <Radio value="mentions" label="Only mentions" />
          </RadioGroup>
        </Field>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 10: Wire the route in App.tsx**

In `packages/playground/src/App.tsx`:
1. Add the import alongside the other `pages/components/*Demo` imports:
   ```tsx
   import { FieldDemo } from './pages/components/FieldDemo';
   ```
2. Add the route inside the `/components/*` route block (next to `<Route path="/components/input" .../>`):
   ```tsx
   <Route path="/components/field" element={<FieldDemo />} />
   ```

- [ ] **Step 11: Wire the sidebar nav in AppShell.tsx**

In `packages/playground/src/layout/AppShell/AppShell.tsx`:
1. Add `FormInput` to the existing `lucide-react` import block.
2. In the `heading: 'Forms'` group's `items` array, add (immediately after the Checkbox entry):
   ```tsx
   { to: '/components/field', label: 'Field', icon: FormInput, end: false },
   ```

- [ ] **Step 12: Wire the overview grid in ComponentsIndex.tsx**

In `packages/playground/src/pages/components/ComponentsIndex.tsx`:
1. Add the import near the other `@eocrm/design-system` imports:
   ```tsx
   import { Field } from '@eocrm/design-system';
   ```
   (`Input` is already imported.)
2. Add an entry to the `items` array:
   ```tsx
   {
     to: '/components/field',
     name: 'Field',
     description: 'Labeled-control unit — label, help, error, required, a11y wiring.',
     preview: (
       <Field label="Email" description="We only use this for sign-in.">
         <Input placeholder="you@company.com" />
       </Field>
     ),
   },
   ```

- [ ] **Step 13: Typecheck, lint, and run the Field tests**

Run:
```bash
cd /Users/dpws/projects/design-system
make build-lib                 # tsc over the library
make lint                      # stylelint both packages
cd packages/design-system && npx vitest run src/components/Field
```
Expected: typecheck clean, stylelint clean, all Field tests PASS.

- [ ] **Step 14: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Field \
        packages/design-system/src/index.ts \
        packages/design-system/AGENTS.md \
        packages/playground/src/pages/components/FieldDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "$(cat <<'EOF'
feat: <Field> labeled-control unit

Auto-wires id/aria-describedby/invalid onto a single control (or render-prop
escape hatch), with label, help/error precedence, required/optional markers,
horizontal orientation, and role=group mode for radio/checkbox sets.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `<FormSection>` — titled group

**Files:**
- Create: `packages/design-system/src/components/FormSection/FormSection.tsx`
- Create: `packages/design-system/src/components/FormSection/FormSection.module.scss`
- Test: `packages/design-system/src/components/FormSection/FormSection.test.tsx`
- Create: `packages/design-system/src/components/FormSection/index.ts`
- Modify: `packages/design-system/src/index.ts`, `AGENTS.md`
- Create: `packages/playground/src/pages/components/FormSectionDemo.tsx`
- Modify: `App.tsx`, `AppShell.tsx`, `ComponentsIndex.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/design-system/src/components/FormSection/FormSection.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { FormSection } from './FormSection';

describe('FormSection', () => {
  it('renders the title at the configured heading level + the description', () => {
    render(
      <FormSection title="Profile" description="Public details" titleOrder={3}>
        x
      </FormSection>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Public details')).toBeInTheDocument();
  });

  it('defaults the heading to level 2', () => {
    render(<FormSection title="Profile">x</FormSection>);
    expect(screen.getByRole('heading', { level: 2, name: 'Profile' })).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <FormSection title="T">
        <span data-testid="child">c</span>
      </FormSection>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('omits the header when no title/description', () => {
    render(
      <FormSection>
        <span data-testid="child">c</span>
      </FormSection>,
    );
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('renders a <section> and forwards ref + className + rest', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(
      <FormSection ref={ref} className="my-cls" data-foo="bar">
        x
      </FormSection>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.tagName).toBe('SECTION');
    expect(ref.current).toBe(root);
    expect(root.className).toMatch(/my-cls/);
    expect(root).toHaveAttribute('data-foo', 'bar');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/FormSection/FormSection.test.tsx`
Expected: FAIL — `Failed to resolve import "./FormSection"`.

- [ ] **Step 3: Create the SCSS module**

Create `packages/design-system/src/components/FormSection/FormSection.module.scss`:

```scss
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

// Separator between consecutive sections — padding + border only (no margin),
// keyed by adjacency so the first section has none.
.section + .section {
  padding-top: var(--space-6);
  border-top: var(--border-width) solid var(--color-border);
}

.header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
```

- [ ] **Step 4: Implement the component**

Create `packages/design-system/src/components/FormSection/FormSection.tsx`:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Title, type TitleOrder } from '../Title';
import { Text } from '../Text';
import styles from './FormSection.module.scss';

export interface FormSectionProps extends HTMLAttributes<HTMLElement> {
  /** Section heading. */
  title?: ReactNode;
  /** Secondary text under the heading. */
  description?: ReactNode;
  /** Heading level for `title`. Default `2`. */
  titleOrder?: TitleOrder;
  /** The fields (usually `<Field>` / `<FormRow>`). */
  children: ReactNode;
}

/**
 * Titled group of form fields — a heading + description over a vertical stack of
 * fields. Consecutive `<FormSection>`s are separated by a divider automatically.
 *
 * A layout-family primitive (like `<FormRow>`); it arranges its own children only
 * (no outer margin).
 *
 * @example
 * <FormSection title="Profile" description="Basic contact details.">
 *   <FormRow>
 *     <Field label="First name" required><Input /></Field>
 *     <Field label="Last name" required><Input /></Field>
 *   </FormRow>
 *   <Field label="Work email" required><Input type="email" /></Field>
 * </FormSection>
 *
 * @remarks When NOT to use
 * - A whole page's heading/actions — that's `<PageHeader>`, not FormSection.
 * - A bordered surface/card — wrap the form in `<Card>`; FormSection has no background.
 * - A single field — just render the `<Field>`.
 *
 * @remarks Anti-patterns
 * - ❌ Adding `margin` around it to separate sections — render two FormSections as
 *   siblings and the built-in adjacency divider handles it.
 */
export const FormSection = forwardRef<HTMLElement, FormSectionProps>(function FormSection(
  { title, description, titleOrder = 2, className, children, ...rest },
  ref,
) {
  const hasHeader = title != null || description != null;
  return (
    <section ref={ref} className={clsx(styles.section, className)} {...rest}>
      {hasHeader && (
        <div className={styles.header}>
          {title != null && (
            <Title order={titleOrder} size="md">
              {title}
            </Title>
          )}
          {description != null && (
            <Text as="p" size="sm" tone="muted">
              {description}
            </Text>
          )}
        </div>
      )}
      <div className={styles.fields}>{children}</div>
    </section>
  );
});
```

- [ ] **Step 5: Create the barrel index**

Create `packages/design-system/src/components/FormSection/index.ts`:

```ts
export { FormSection } from './FormSection';
export type { FormSectionProps } from './FormSection';
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/FormSection/FormSection.test.tsx`
Expected: PASS — all 5 tests green.

- [ ] **Step 7: Re-export from the package root**

In `packages/design-system/src/index.ts`, append:

```ts
export { FormSection } from './components/FormSection';
export type { FormSectionProps } from './components/FormSection';
```

- [ ] **Step 8: Add the AGENTS.md TL;DR**

In `packages/design-system/AGENTS.md`, add:

````markdown
### `<FormSection>` — titled group of fields

```tsx
<FormSection title="Profile" description="Basic contact details.">
  <FormRow>
    <Field label="First name" required><Input /></Field>
    <Field label="Last name" required><Input /></Field>
  </FormRow>
  <Field label="Work email" required><Input type="email" /></Field>
</FormSection>
```

- Heading (`title`, level via `titleOrder`, default 2) + `description` over a stack of fields.
- Consecutive `<FormSection>`s get an automatic divider (adjacency, no margin).
- Layout-family primitive — arranges its own children only. ❌ Not a `<Card>` (no surface), ❌ not a `<PageHeader>`.
````

- [ ] **Step 9: Create the demo page**

Create `packages/playground/src/pages/components/FormSectionDemo.tsx`:

```tsx
import { Field, FormRow, FormSection, Input } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function FormSectionDemo() {
  return (
    <DemoLayout
      name="FormSection"
      description="Titled group of form fields — a heading + description over a vertical stack of fields. Consecutive sections are separated by a divider automatically."
      files={getComponentFiles('FormSection')}
    >
      <Example
        title="Titled group"
        description="Heading + description over a stack of fields (here a FormRow plus a full-width Field)."
        code={`<FormSection title="Profile" description="Basic details that appear on the contact record.">
  <FormRow>
    <Field label="First name" required><Input placeholder="Ada" /></Field>
    <Field label="Last name" required><Input placeholder="Lovelace" /></Field>
  </FormRow>
  <Field label="Work email" required><Input type="email" placeholder="ada@example.com" /></Field>
</FormSection>`}
      >
        <FormSection title="Profile" description="Basic details that appear on the contact record.">
          <FormRow>
            <Field label="First name" required>
              <Input placeholder="Ada" />
            </Field>
            <Field label="Last name" required>
              <Input placeholder="Lovelace" />
            </Field>
          </FormRow>
          <Field label="Work email" required>
            <Input type="email" placeholder="ada@example.com" />
          </Field>
        </FormSection>
      </Example>

      <Example
        title="Consecutive sections get a divider"
        description="Render two sections as siblings; the divider between them is automatic."
        code={`<FormSection title="Profile" description="Public details">
  <Field label="Display name"><Input /></Field>
</FormSection>
<FormSection title="Preferences" description="Defaults for this contact">
  <Field label="Timezone" orientation="horizontal"><Input /></Field>
</FormSection>`}
      >
        <>
          <FormSection title="Profile" description="Public details">
            <Field label="Display name">
              <Input placeholder="Ada Lovelace" />
            </Field>
          </FormSection>
          <FormSection title="Preferences" description="Defaults for this contact">
            <Field label="Timezone" orientation="horizontal">
              <Input placeholder="Europe/London" />
            </Field>
          </FormSection>
        </>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 10: Wire route / nav / grid**

1. `App.tsx`: add `import { FormSectionDemo } from './pages/components/FormSectionDemo';` and route `<Route path="/components/form-section" element={<FormSectionDemo />} />`.
2. `AppShell.tsx`: add `Group` to the `lucide-react` import; in the `'Forms'` group add `{ to: '/components/form-section', label: 'FormSection', icon: Group, end: false },`.
3. `ComponentsIndex.tsx`: add `import { FormSection } from '@eocrm/design-system';`; add the items entry:
   ```tsx
   {
     to: '/components/form-section',
     name: 'FormSection',
     description: 'Titled group of fields with heading + description.',
     preview: (
       <FormSection title="Profile" description="Public details">
         <Field label="Name">
           <Input placeholder="Ada Lovelace" />
         </Field>
       </FormSection>
     ),
   },
   ```

- [ ] **Step 11: Typecheck, lint, test**

Run:
```bash
cd /Users/dpws/projects/design-system
make build-lib && make lint
cd packages/design-system && npx vitest run src/components/FormSection
```
Expected: clean typecheck/lint, all FormSection tests PASS.

- [ ] **Step 12: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/FormSection \
        packages/design-system/src/index.ts \
        packages/design-system/AGENTS.md \
        packages/playground/src/pages/components/FormSectionDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "$(cat <<'EOF'
feat: <FormSection> titled group of fields

Heading + description over a stacked group of fields, with an automatic
adjacency divider between consecutive sections.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `<FormRow>` — responsive side-by-side fields

**Files:**
- Create: `packages/design-system/src/components/FormRow/FormRow.tsx`
- Test: `packages/design-system/src/components/FormRow/FormRow.test.tsx`
- Create: `packages/design-system/src/components/FormRow/index.ts`
- Modify: `packages/design-system/src/index.ts`, `AGENTS.md`
- Create: `packages/playground/src/pages/components/FormRowDemo.tsx`
- Modify: `App.tsx`, `AppShell.tsx`, `ComponentsIndex.tsx`

- [ ] **Step 1: Write the failing test**

Create `packages/design-system/src/components/FormRow/FormRow.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { createRef } from 'react';
import { FormRow } from './FormRow';

describe('FormRow', () => {
  it('defaults to responsive auto-fit at 16rem', () => {
    const { container } = render(
      <FormRow>
        <div>a</div>
        <div>b</div>
      </FormRow>,
    );
    const cols = (container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns');
    expect(cols).toContain('auto-fit');
    expect(cols).toContain('16rem');
  });

  it('columns={2} renders a fixed 2-column template', () => {
    const { container } = render(
      <FormRow columns={2}>
        <div>a</div>
        <div>b</div>
      </FormRow>,
    );
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns')).toBe(
      'repeat(2, minmax(0, 1fr))',
    );
  });

  it('honors a custom minColumnWidth', () => {
    const { container } = render(
      <FormRow minColumnWidth="20rem">
        <div>a</div>
      </FormRow>,
    );
    expect(
      (container.firstChild as HTMLElement).style.getPropertyValue('--grid-columns'),
    ).toContain('20rem');
  });

  it('forwards ref, className, and rest to the grid element', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <FormRow ref={ref} className="my-cls" data-foo="bar">
        <div>a</div>
      </FormRow>,
    );
    const el = container.firstChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el.className).toMatch(/my-cls/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/design-system && npx vitest run src/components/FormRow/FormRow.test.tsx`
Expected: FAIL — `Failed to resolve import "./FormRow"`.

- [ ] **Step 3: Implement the component (no SCSS — delegates to Grid)**

Create `packages/design-system/src/components/FormRow/FormRow.tsx`:

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { Grid, type GridGap } from '../Grid';

// Extends HTMLAttributes<HTMLElement> (not HTMLDivElement) to match Grid's prop
// surface, so {...rest} spreads cleanly onto Grid.
export interface FormRowProps extends HTMLAttributes<HTMLElement> {
  /** Fixed equal-width column count. Omit for responsive auto-fit (the default). */
  columns?: 2 | 3;
  /** Min field width before the row reflows to stacked (auto-fit mode). Default `'16rem'`. */
  minColumnWidth?: string;
  /** Gap between fields. Default `'lg'`. */
  gap?: GridGap;
  /** The fields (usually `<Field>`). */
  children: ReactNode;
}

/**
 * Lays form fields side by side. Thin wrapper over `<Grid>`: by default the row
 * auto-fits and reflows to stacked as the container narrows (container-based, no
 * breakpoints); pass `columns` for a fixed, non-reflowing count.
 *
 * @example
 * // Responsive (default) — two fields drop to stacked when narrow:
 * <FormRow>
 *   <Field label="First name" required><Input /></Field>
 *   <Field label="Last name" required><Input /></Field>
 * </FormRow>
 *
 * @example
 * // Fixed 3 columns at any width:
 * <FormRow columns={3}>
 *   <Field label="City"><Input /></Field>
 *   <Field label="State"><Input /></Field>
 *   <Field label="ZIP"><Input /></Field>
 * </FormRow>
 *
 * @remarks When NOT to use
 * - A single field — just render the `<Field>`.
 * - Vertical stacking of fields — that's the default flow of `<FormSection>` / `<Stack>`.
 * - A general tile/card grid — use `<Grid>` directly.
 *
 * @remarks Anti-patterns
 * - ❌ Forcing `columns` for two fields that should reflow on mobile — prefer the
 *   responsive default; reserve `columns` for rows that must stay side by side.
 */
export const FormRow = forwardRef<HTMLDivElement, FormRowProps>(function FormRow(
  { columns, minColumnWidth, gap = 'lg', children, ...rest },
  ref,
) {
  if (columns !== undefined) {
    return (
      <Grid ref={ref} columns={columns} gap={gap} {...rest}>
        {children}
      </Grid>
    );
  }
  return (
    <Grid ref={ref} minColumnWidth={minColumnWidth ?? '16rem'} gap={gap} {...rest}>
      {children}
    </Grid>
  );
});
```

- [ ] **Step 4: Create the barrel index**

Create `packages/design-system/src/components/FormRow/index.ts`:

```ts
export { FormRow } from './FormRow';
export type { FormRowProps } from './FormRow';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/design-system && npx vitest run src/components/FormRow/FormRow.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 6: Re-export from the package root**

In `packages/design-system/src/index.ts`, append:

```ts
export { FormRow } from './components/FormRow';
export type { FormRowProps } from './components/FormRow';
```

- [ ] **Step 7: Add the AGENTS.md TL;DR**

In `packages/design-system/AGENTS.md`, add:

````markdown
### `<FormRow>` — fields side by side

```tsx
<FormRow>
  <Field label="First name" required><Input /></Field>
  <Field label="Last name" required><Input /></Field>
</FormRow>

<FormRow columns={3}>{/* fixed, non-reflowing */}</FormRow>
```

- Thin wrapper over `<Grid>`. Default: auto-fit, reflows to stacked when narrow
  (container-based, `minColumnWidth` default `'16rem'`). `columns={2|3}` = fixed count.
- `gap` default `'lg'`. ❌ Not for a single field; ❌ not a general tile grid (use `<Grid>`).
````

- [ ] **Step 8: Create the demo page**

Create `packages/playground/src/pages/components/FormRowDemo.tsx`:

```tsx
import { Field, FormRow, Input } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function FormRowDemo() {
  return (
    <DemoLayout
      name="FormRow"
      description="Lays form fields side by side. Thin wrapper over Grid — responsive auto-fit by default (reflows to stacked when narrow), or a fixed column count."
      files={getComponentFiles('FormRow')}
    >
      <Example
        title="Responsive (default)"
        description="Two fields sit side by side and drop to stacked as the container narrows — resize the window to see it reflow."
        code={`<FormRow>
  <Field label="First name" required><Input placeholder="Ada" /></Field>
  <Field label="Last name" required><Input placeholder="Lovelace" /></Field>
</FormRow>`}
      >
        <FormRow>
          <Field label="First name" required>
            <Input placeholder="Ada" />
          </Field>
          <Field label="Last name" required>
            <Input placeholder="Lovelace" />
          </Field>
        </FormRow>
      </Example>

      <Example
        title="Fixed columns"
        description="columns={3} keeps an exact three-up layout at any width."
        code={`<FormRow columns={3}>
  <Field label="City"><Input placeholder="London" /></Field>
  <Field label="State / Region"><Input placeholder="England" /></Field>
  <Field label="Postcode"><Input placeholder="SW1A" /></Field>
</FormRow>`}
      >
        <FormRow columns={3}>
          <Field label="City">
            <Input placeholder="London" />
          </Field>
          <Field label="State / Region">
            <Input placeholder="England" />
          </Field>
          <Field label="Postcode">
            <Input placeholder="SW1A" />
          </Field>
        </FormRow>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 9: Wire route / nav / grid**

1. `App.tsx`: add `import { FormRowDemo } from './pages/components/FormRowDemo';` and route `<Route path="/components/form-row" element={<FormRowDemo />} />`.
2. `AppShell.tsx`: add `Columns2` to the `lucide-react` import; in the `'Forms'` group add `{ to: '/components/form-row', label: 'FormRow', icon: Columns2, end: false },`.
3. `ComponentsIndex.tsx`: add `import { FormRow } from '@eocrm/design-system';`; add the items entry:
   ```tsx
   {
     to: '/components/form-row',
     name: 'FormRow',
     description: 'Fields side by side; reflows to stacked when narrow.',
     preview: (
       <FormRow>
         <Field label="First">
           <Input placeholder="Ada" />
         </Field>
         <Field label="Last">
           <Input placeholder="Lovelace" />
         </Field>
       </FormRow>
     ),
   },
   ```

- [ ] **Step 10: Typecheck, lint, test**

Run:
```bash
cd /Users/dpws/projects/design-system
make build-lib && make lint
cd packages/design-system && npx vitest run src/components/FormRow
```
Expected: clean typecheck/lint, all FormRow tests PASS.

- [ ] **Step 11: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/FormRow \
        packages/design-system/src/index.ts \
        packages/design-system/AGENTS.md \
        packages/playground/src/pages/components/FormRowDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "$(cat <<'EOF'
feat: <FormRow> responsive side-by-side fields

Thin Grid wrapper — auto-fit reflow by default (minColumnWidth 16rem) or a
fixed columns={2|3} count.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Full verification + PR

**Files:** none (verification + git)

- [ ] **Step 1: Run the full library test suite**

Run: `cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run`
Expected: entire suite PASS (no regressions in the existing components).

- [ ] **Step 2: Full build (typecheck + bundle playground, smoke-test library)**

Run: `cd /Users/dpws/projects/design-system && make build`
Expected: build succeeds with no type or bundle errors.

- [ ] **Step 3: Lint both packages**

Run: `cd /Users/dpws/projects/design-system && make lint`
Expected: stylelint clean (no raw-value violations in the new SCSS).

- [ ] **Step 4: Manual smoke check (optional but recommended)**

Run: `cd /Users/dpws/projects/design-system && make dev` then visit
`http://localhost:8080/components/field`, `/components/form-row`, `/components/form-section`.
Expected: each demo renders; the Field "live error" example shows/clears the error as you type;
FormRow reflows when the window narrows; consecutive FormSections show a divider.

- [ ] **Step 5: Push and open the PR**

Run:
```bash
cd /Users/dpws/projects/design-system
git push -u origin feat/form-field-primitives
gh pr create --fill --title "feat: <Field> / <FormRow> / <FormSection> form primitives" \
  --body "$(cat <<'EOF'
Adds three composable form primitives per the approved spec
(docs/superpowers/specs/2026-06-01-form-field-primitives-design.md):

- **<Field>** — labeled-control unit; auto-wires id/aria-describedby/invalid
  (render-prop escape hatch), required/optional markers, horizontal orientation,
  role=group mode for radio/checkbox sets.
- **<FormRow>** — responsive side-by-side fields (Grid auto-fit, or fixed columns).
- **<FormSection>** — titled group with automatic adjacency divider.

No validation/state and no <Form> element wrapper (explicit non-goals).
Each ships with tests, a demo page wired into App/AppShell/ComponentsIndex,
index.ts exports, JSDoc anti-patterns, and an AGENTS.md TL;DR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR created. Wait for the `Quality / check` status check to pass before merging.

---

## Self-review (completed against the spec)

**Spec coverage:** ✅ `<Field>` (label/description/error/required/optional/orientation/size/id/asGroup, auto-clone + render-prop, group mode) — Task 1. ✅ `<FormRow>` (auto-fit default + fixed columns) — Task 3. ✅ `<FormSection>` (title/description/titleOrder, adjacency divider) — Task 2. ✅ Non-goals respected (no validation/state, no `<Form>`). ✅ "Done" checklist ×3 (tests, demo, App/AppShell/ComponentsIndex, index.ts, JSDoc `@remarks`, AGENTS.md). ✅ Tokens-only SCSS; `grid-template-columns` literal is in a non-linted property with documented precedent.

**Placeholder scan:** none — every step has concrete file content or exact commands.

**Type consistency:** `FieldRenderProps` keys (`id`, `aria-describedby`, `aria-invalid`, `invalid`, `required`, `labelId`) match between the component, the render-prop test, and the injected-props object. `FormRowProps`/`FormSectionProps`/`FieldProps` names match their `index.ts` and root `index.ts` re-exports. Demo/grid imports match exported names (`Field`, `FormRow`, `FormSection`, `Input`, `Radio`, `RadioGroup`).

## Follow-ups (out of scope — not in this plan)

- Refactor the hand-rolled fields in `Login.tsx` and `Settings.tsx` onto these primitives (the "Mocked in → refactor when it ships" pattern in `packages/design-system/src/components/TODO.md`).
