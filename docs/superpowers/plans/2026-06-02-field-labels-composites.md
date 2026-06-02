# Field Names Composite Controls (a11y) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `<Field label="X"><Control/></Field>` expose an accessible name on composite controls (Select, Slider, ColorPicker, FileUpload, TimeField), not just native inputs.

**Architecture:** Field's auto-clone (and its render-prop `field` object) also convey `aria-labelledby={labelId}` (guarded; only when a label is rendered; child's explicit value wins). Select + Slider already forward `aria-labelledby` to their focusable element → named for free. ColorPicker, FileUpload, and TimeField each forward `aria-labelledby` (+ `aria-describedby`) onto their focusable element; TimeField's `aria-label` becomes optional. Naming for native controls is unchanged (the `*` marker is `aria-hidden`, `(optional)` is already in the label, so `aria-labelledby` resolves to the same name as `htmlFor`).

**Tech Stack:** React (`cloneElement`, `forwardRef`), TypeScript, Vitest + @testing-library (assert accessible name via `getByRole(role, { name })`). Branch: `fix/field-labels-composites` (off `main`). Spec: `docs/superpowers/specs/2026-06-02-field-labels-composites-design.md`.

---

## File map

- `Field/Field.tsx` — inject `aria-labelledby` in auto-clone + add to `FieldRenderProps`/`field` + JSDoc. `Field/Field.test.tsx` — 4 new tests.
- `ColorPicker/ColorPicker.tsx` — accept + forward `aria-labelledby`/`aria-describedby` to the trigger button. `ColorPicker/ColorPicker.test.tsx` — tests.
- `FileUpload/FileUpload.tsx` — re-route `aria-labelledby`/`aria-describedby` onto the `role="button"` dropzone. `FileUpload/FileUpload.test.tsx` — tests.
- `TimeField/TimeField.tsx` — `aria-label` optional + accept/forward `aria-labelledby`. `TimeField/TimeField.test.tsx` — tests.
- `Select/Select.test.tsx`, `Slider/Slider.test.tsx` — regression tests only (NO source change; they already forward `aria-labelledby`).

Order matters: **Task 1 (Field) first** — the per-control integration tests pass only once Field injects `aria-labelledby`.

---

## Task 0: Pre-flight

- [ ] **Step 1: Confirm branch + hooks**

```bash
cd /Users/dpws/projects/design-system
git branch --show-current        # expect: fix/field-labels-composites
git config --get core.hooksPath  # expect: .husky/_
```

---

## Task 1: Field injects `aria-labelledby`

**Files:** Modify `packages/design-system/src/components/Field/Field.tsx`; Test `packages/design-system/src/components/Field/Field.test.tsx`.

- [ ] **Step 1: Edit the auto-clone `injected` block**

In `Field.tsx`, replace the `const injected … cloneElement(child, injected);` block with an if/else so the conditional `aria-labelledby` can be added only when a label is rendered:

```tsx
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
        'aria-describedby': childProps['aria-describedby'] ?? describedBy,
        invalid: childProps.invalid ?? invalid,
        required: childProps.required ?? requiredBool,
      };
      if (label != null) {
        injected['aria-labelledby'] = childProps['aria-labelledby'] ?? labelId;
      }
    }
    control = cloneElement(child, injected);
```

- [ ] **Step 2: Add `aria-labelledby` to `FieldRenderProps`**

```tsx
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
```

- [ ] **Step 3: Set it on the `field` object**

```tsx
  const field: FieldRenderProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-labelledby': label != null ? labelId : undefined,
    'aria-invalid': invalid || undefined,
    invalid,
    required: requiredBool,
    labelId,
  };
```

- [ ] **Step 4: Update Field JSDoc**

In the component description, change the wiring list to include `aria-labelledby` and add a sentence:
> "…wires the `id` / `aria-labelledby` / `aria-describedby` / `aria-invalid` association by construction. When a label is present, Field also injects `aria-labelledby` onto the cloned child, so composite controls that forward unknown ARIA props (Select, Slider, ColorPicker, FileUpload, TimeField) get an accessible name automatically. For wrapped/nested DOM that doesn't forward props, use the render-prop and spread `field` (it carries `aria-labelledby`)."

- [ ] **Step 5: Write the Field tests**

Add to `Field.test.tsx` (these use a local stub that forwards `aria-labelledby`, mirroring the existing `RawControl` pattern):

```tsx
  it('auto-clone injects aria-labelledby=labelId when a label is present', () => {
    function LabelledStub(props: { id?: string; 'aria-labelledby'?: string }) {
      return <input data-testid="control" id={props.id} aria-labelledby={props['aria-labelledby']} />;
    }
    const { container } = render(
      <Field label="Work email">
        <LabelledStub />
      </Field>,
    );
    const input = screen.getByTestId('control');
    const label = container.querySelector(`label[for="${input.id}"]`) as HTMLElement;
    expect(label.id).toBeTruthy();
    expect(input).toHaveAttribute('aria-labelledby', label.id);
  });

  it('auto-clone does NOT inject aria-labelledby when there is no label', () => {
    function LabelledStub(props: { 'aria-labelledby'?: string }) {
      return <input data-testid="control" aria-labelledby={props['aria-labelledby']} />;
    }
    render(
      <Field>
        <LabelledStub />
      </Field>,
    );
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-labelledby');
  });

  it("the child's explicit aria-labelledby wins over Field's", () => {
    function LabelledStub(props: { 'aria-labelledby'?: string }) {
      return <input data-testid="control" aria-labelledby={props['aria-labelledby']} />;
    }
    render(
      <Field label="Email">
        <LabelledStub aria-labelledby="custom-label" />
      </Field>,
    );
    expect(screen.getByTestId('control')).toHaveAttribute('aria-labelledby', 'custom-label');
  });

  it('render-prop field object carries aria-labelledby (= labelId when labelled)', () => {
    let received: Record<string, unknown> = {};
    render(
      <Field label="Email">
        {(field) => {
          received = field as unknown as Record<string, unknown>;
          return <input data-testid="control" {...field} />;
        }}
      </Field>,
    );
    expect(received['aria-labelledby']).toBe(received.labelId);
    expect(screen.getByTestId('control')).toHaveAttribute('aria-labelledby', received.labelId as string);
  });

  it('asGroup does NOT inject aria-labelledby onto the child (it lives on the role=group wrapper)', () => {
    function LabelledStub(props: { 'aria-labelledby'?: string }) {
      return <input data-testid="control" aria-labelledby={props['aria-labelledby']} />;
    }
    render(
      <Field asGroup label="Notify me">
        <LabelledStub />
      </Field>,
    );
    expect(screen.getByTestId('control')).not.toHaveAttribute('aria-labelledby');
  });
```

- [ ] **Step 6: Run Field tests + typecheck + lint**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/Field
cd /Users/dpws/projects/design-system && make build-lib && make lint
```
Expected: all Field tests green (existing 13 + 4 new); typecheck + lint clean. (No existing Field test asserts the *absence* of `aria-labelledby`, so none regress.)

- [ ] **Step 7: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/design-system/src/components/Field/Field.tsx packages/design-system/src/components/Field/Field.test.tsx
git commit -m "$(cat <<'EOF'
feat(Field): wire aria-labelledby so composite controls get an accessible name

Auto-clone (and the render-prop `field` object) now also convey
aria-labelledby={labelId}, guarded (child's value wins; only when a label is
rendered). Native controls are unchanged (same name via htmlFor). Composite
controls that forward aria-labelledby (Select, Slider, …) are now named by a
Field label.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: ColorPicker forwards `aria-labelledby`/`aria-describedby` to the trigger

**Files:** Modify `packages/design-system/src/components/ColorPicker/ColorPicker.tsx`; Test `.../ColorPicker.test.tsx`. (Everything is in `ColorPicker.tsx` — `DefaultTrigger` is an internal `forwardRef` button; there is no separate trigger file. `cloneElement` is NOT yet imported there — add it to the React import.)

- [ ] **Step 1: Add the two props to `ColorPickerProps`** (after the `triggerLabel` block):

```tsx
  /**
   * Id(s) of element(s) that label the trigger button. Forwarded onto the
   * focusable trigger (not the root wrapper) and takes precedence over the
   * generated `aria-label`. Set automatically when wrapped in `<Field label>`.
   */
  'aria-labelledby'?: string;
  /**
   * Id(s) of element(s) that describe the trigger button (e.g. a Field error or
   * helper text). Forwarded onto the focusable trigger, not the root wrapper.
   */
  'aria-describedby'?: string;
```

- [ ] **Step 2: Add `labelledBy`/`describedBy` to `DefaultTriggerProps`** (after `open: boolean;`):

```tsx
    labelledBy?: string;
    describedBy?: string;
```

- [ ] **Step 3: Wire them on the `DefaultTrigger` button**

Change the `DefaultTrigger` destructure to `{ hex, label, disabled, open, onClick, labelledBy, describedBy }` and the `<button>` head to:

```tsx
        <button
          ref={ref}
          type="button"
          className={styles.trigger}
          disabled={disabled}
          // An external label (e.g. <Field label>) wins; otherwise fall back to
          // the self-describing generated label. Never set both.
          aria-label={labelledBy ? undefined : `${label}, current value ${display}`}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-haspopup="true"
          aria-expanded={open}
          onClick={onClick}
        >
```

- [ ] **Step 4: Destructure the props in `ColorPickerRoot` and pass them down**

In `ColorPickerRoot`'s destructure add `'aria-labelledby': ariaLabelledBy,` and `'aria-describedby': ariaDescribedBy,` (before `children`). On the `<DefaultTrigger …>` element add `labelledBy={ariaLabelledBy}` and `describedBy={ariaDescribedBy}`. For the **custom-trigger** branch, clone the consumer child to inject the same so custom triggers are named too:

```tsx
    const triggerElement = customTrigger ? (
      cloneElement(customTrigger.props.children as ReactElement, {
        'aria-labelledby': ariaLabelledBy,
        'aria-describedby': ariaDescribedBy,
      })
    ) : (
      <DefaultTrigger
        hex={value}
        label={resolvedTriggerLabel}
        disabled={disabled}
        open={open}
        labelledBy={ariaLabelledBy}
        describedBy={ariaDescribedBy}
        onClick={() => {}}
      />
    );
```

Add **only** `cloneElement` to the existing `react` import (it's a value import — put it in the non-type group, e.g. after `Children,`). **`ReactElement` is already imported** (`type ReactElement,` on line ~8) — do NOT re-add it (duplicate import = TS2300). This Step replaces the whole existing `const triggerElement = customTrigger ? (...) : (...)` expression (you may keep or drop its two inline comments). (`...rest` no longer carries the two aria props — they're destructured out — so they stop leaking onto the wrapper `<div>`.)

- [ ] **Step 5: Tests** — add to `ColorPicker.test.tsx` (add `import { Field } from '../Field';`; reuse the file's existing pointer-capture/ResizeObserver shims):

```tsx
describe('ColorPicker — labelledby / describedby forwarding', () => {
  it('a Field label names the trigger button (auto-clone)', () => {
    render(
      <Field label="Brand color">
        <ColorPicker value="#4F46E5" onChange={() => {}} />
      </Field>,
    );
    const trigger = screen.getByRole('button', { name: 'Brand color' });
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('aria-labelledby');
    expect(trigger).not.toHaveAttribute('aria-label');
  });

  it('forwards aria-labelledby / aria-describedby to the trigger, not the root', () => {
    const { container } = render(
      <>
        <span id="lbl">Pick brand color</span>
        <span id="desc">Used across the app</span>
        <ColorPicker value="#FF0000" onChange={() => {}} aria-labelledby="lbl" aria-describedby="desc" />
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Pick brand color' });
    expect(trigger).toHaveAttribute('aria-labelledby', 'lbl');
    expect(trigger).toHaveAttribute('aria-describedby', 'desc');
    expect(container.querySelector('div')).not.toHaveAttribute('aria-labelledby');
  });
});
```

> Also add a **custom-trigger** test covering the new `cloneElement` branch: render a ColorPicker with a custom trigger inside a Field and assert the Field label names it. Confirm the exact custom-trigger API from `ColorPicker.tsx` first (it reads `customTrigger.props.children`, where `customTrigger` is the `ColorPickerTrigger` marker child) — e.g. `<Field label="Brand color"><ColorPicker value="#000" onChange={()=>{}}><ColorPickerTrigger><Button>Pick</Button></ColorPickerTrigger></ColorPicker></Field>` then `getByRole('button', { name: 'Brand color' })`. Adjust to the real marker API.

- [ ] **Step 6: Verify + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/ColorPicker
cd /Users/dpws/projects/design-system && make build-lib && make lint
git add packages/design-system/src/components/ColorPicker/ColorPicker.tsx packages/design-system/src/components/ColorPicker/ColorPicker.test.tsx
git commit -m "$(cat <<'EOF'
fix(ColorPicker): forward aria-labelledby/aria-describedby to the trigger button

So a <Field label> names the focusable trigger (not the wrapper div); an
external aria-labelledby wins over the generated aria-label.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: FileUpload forwards `aria-labelledby`/`aria-describedby` to the dropzone

**Files:** Modify `packages/design-system/src/components/FileUpload/FileUpload.tsx`; Test `.../FileUpload.test.tsx`. (No prop-interface change — `FileUploadProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'>`, which already includes `aria-labelledby`/`aria-describedby`; we only re-route them.)

- [ ] **Step 1: Destructure the two props out of `...rest`** (add before `className` in the props destructure):

```tsx
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
```

- [ ] **Step 2: Put them on the `role="button"` dropzone** (the focusable element). Add `aria-labelledby`/`aria-describedby` to the dropzone, keeping the existing `aria-label` as a fallback (accessible-name precedence picks `aria-labelledby` when present):

```tsx
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={ariaLabelledBy}
          aria-label={typeof dropzoneLabel === 'string' ? dropzoneLabel : t('fileUpload.upload')}
          aria-describedby={ariaDescribedBy}
          aria-disabled={disabled || undefined}
```

(The root `<div {...rest}>` is unchanged in shape but no longer receives the two aria props.)

- [ ] **Step 3: Tests** — add to `FileUpload.test.tsx` (`import { Field } from '../Field';`):

```tsx
  it('a Field label names the dropzone (auto-clone)', () => {
    render(
      <Field label="Attachments">
        <FileUpload files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />
      </Field>,
    );
    expect(screen.getByRole('button', { name: 'Attachments' })).toBeInTheDocument();
  });

  it('forwards aria-labelledby onto the dropzone, not the root', () => {
    render(
      <>
        <span id="ext-label">Attachments</span>
        <FileUpload aria-labelledby="ext-label" files={[]} onFilesAdded={() => {}} onFileRemove={() => {}} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Attachments' })).toBeInTheDocument();
  });
```

- [ ] **Step 4: Verify + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/FileUpload
cd /Users/dpws/projects/design-system && make build-lib && make lint
git add packages/design-system/src/components/FileUpload/FileUpload.tsx packages/design-system/src/components/FileUpload/FileUpload.test.tsx
git commit -m "$(cat <<'EOF'
fix(FileUpload): forward aria-labelledby/aria-describedby to the dropzone

Re-route the aria attrs from the root wrapper onto the focusable role="button"
dropzone, so a <Field label> names it. aria-label remains the fallback.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: TimeField — `aria-label` optional + accept/forward `aria-labelledby`

**Files:** Modify `packages/design-system/src/components/TimeField/TimeField.tsx`; Test `.../TimeField.test.tsx`. Backward-compatible: every caller (DatePicker/DateRangePicker + inline variants + demos) already passes `aria-label`, so widening it to optional breaks nothing.

- [ ] **Step 1: Make `aria-label` optional + add `aria-labelledby` to the props**

```tsx
    /**
     * Accessible label. Optional, but the control MUST be named: pass `aria-label`
     * for a standalone TimeField, OR `aria-labelledby` when an external element
     * (e.g. a `<Field>` label) names it. If both are given, `aria-labelledby` wins.
     */
    'aria-label'?: string;
    /**
     * Id(s) of element(s) that label this control — forwarded onto the inner
     * `<input>` so a `<Field label>` names it. Takes precedence over `aria-label`.
     */
    'aria-labelledby'?: string;
```

- [ ] **Step 2: Destructure `aria-labelledby`** (next to `'aria-label': ariaLabel,`):

```tsx
    'aria-labelledby': ariaLabelledBy,
```

- [ ] **Step 3: Forward it on the `role="group"` wrapper** (alongside the existing `aria-label`):

```tsx
    <div
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      {...rest}
```

- [ ] **Step 4: Forward it on the time `<input>`** (insert right after the existing `aria-label={ariaLabel}` line, before `aria-haspopup="listbox"`):

```tsx
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
```

- [ ] **Step 5: Keep the chevron toggle named when only `aria-labelledby` is given.** The toggle composes `"<label>, <open-list hint>"`; when `ariaLabel` is undefined, that string would read "undefined, …". Make the toggle's `aria-label` conditional and also accept `aria-labelledby` (no new i18n key):

```tsx
        aria-label={ariaLabel ? `${ariaLabel}, ${t('datePicker.timeOpenList')}` : undefined}
        aria-labelledby={ariaLabelledBy}
```

(When `aria-label` is present, the toggle keeps its current rich name; when only `aria-labelledby` is supplied, the toggle is named by the external label.)

- [ ] **Step 6: Tests** — add to `TimeField.test.tsx` (`import { Field } from '../Field';`; reuse the file's existing `wrap()` provider helper):

```tsx
describe('TimeField — labelling', () => {
  it('a Field label names the inner input (auto-clone)', () => {
    function Driver() {
      const [v, setV] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
      return (
        <Field label="Start time">
          <TimeField value={v} hourCycle="24" onChange={setV} />
        </Field>
      );
    }
    render(<Driver />, { wrapper: wrap() });
    expect(screen.getByRole('textbox', { name: 'Start time' })).toHaveValue('09:00');
  });

  it('back-compat: passing only aria-label still names the input + group', () => {
    render(<TimeField value={{ hours: 14, minutes: 30 }} hourCycle="24" aria-label="Departure time" onChange={() => {}} />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox', { name: 'Departure time' })).toHaveValue('14:30');
    expect(screen.getByRole('group', { name: 'Departure time' })).toBeInTheDocument();
  });
});
```

> Note: the auto-clone test relies on Task 1 (Field injects `aria-labelledby`) — run after Task 1 is committed. Only `import { Field } from '../Field';` needs adding — `useState`, `TimeValue`, and the `wrap()` provider helper are already present in `TimeField.test.tsx`.
> Step-3 ordering: the `aria-labelledby={ariaLabelledBy}` on the `role="group"` wrapper sits **before** `{...rest}`, which is only safe because Step 2 destructures `aria-labelledby` out of props — keep Step 2 before Step 3.

- [ ] **Step 7: Verify + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/TimeField src/components/DatePicker src/components/DateRangePicker
cd /Users/dpws/projects/design-system && make build-lib && make lint
git add packages/design-system/src/components/TimeField/TimeField.tsx packages/design-system/src/components/TimeField/TimeField.test.tsx
git commit -m "$(cat <<'EOF'
fix(TimeField): aria-label optional + forward aria-labelledby to the input

Lets a <Field label> name the time input (aria-labelledby wins over aria-label).
Backward-compatible — all existing callers still pass aria-label.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Select + Slider regression tests (no source change)

**Files:** Test-only — `packages/design-system/src/components/Select/Select.test.tsx`, `packages/design-system/src/components/Slider/Slider.test.tsx`. Both controls already forward `aria-labelledby` to their focusable element; these tests lock the Field integration (they pass because of Task 1).

- [ ] **Step 1: Select test** — add (`import { Field } from '../Field';`):

```tsx
  it('a Field label names the combobox (auto-clone)', async () => {
    render(
      <Field label="Status">
        <Select
          options={[
            { value: 'a', label: 'Active' },
            { value: 'b', label: 'Archived' },
          ]}
        />
      </Field>,
    );
    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument();
  });
```
> The default single, non-searchable Select trigger is a `<button aria-haspopup="listbox">`. If the file's other tests query it as `combobox`, match that role instead — use whatever role the existing "opens the listbox on trigger click" test uses for the trigger.

- [ ] **Step 2: Slider test** — add (`import { Field } from '../Field';`):

```tsx
  it('a Field label names the slider thumb (auto-clone)', () => {
    render(
      <Field label="Volume">
        <Slider value={40} onChange={() => {}} />
      </Field>,
    );
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
  });
```
> Use the minimal valid Slider props the file's existing tests use (single-value). If Slider is uncontrolled-capable, `defaultValue` is fine.

> **Multi-select Select note:** the multi-select trigger variants emit a fallback `aria-label` (e.g. "Open select" / "Selected: …"). When wrapped in a Field, the trigger carries BOTH that fallback `aria-label` and the injected `aria-labelledby` → per AccName `aria-labelledby` wins, so the name is still the Field label (harmless, intentional). Optionally add a multi-select regression test (`<Field label="Status"><Select multiple .../></Field>` → `getByRole('button', { name: 'Status' })`) — confirm the multi trigger role/props from `Select/Trigger.tsx` first. Select source stays **unchanged** (per spec); suppressing the stale fallback `aria-label` when `aria-labelledby` is present is an optional follow-up.

- [ ] **Step 3: Run + commit**

```bash
cd /Users/dpws/projects/design-system/packages/design-system && npx vitest run src/components/Select src/components/Slider
cd /Users/dpws/projects/design-system && make build-lib && make lint
git add packages/design-system/src/components/Select/Select.test.tsx packages/design-system/src/components/Slider/Slider.test.tsx
git commit -m "$(cat <<'EOF'
test(Select,Slider): lock Field-label accessible-name integration

No source change — both already forward aria-labelledby; these regression tests
prove a <Field label> names the combobox / slider thumb (via Field's new
aria-labelledby injection).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Full verify + Rule 8 review + PR

- [ ] **Step 1: Full gates**

```bash
cd /Users/dpws/projects/design-system
make test          # full vitest suite — all green (incl. all new tests)
make build         # typecheck + bundle
make lint          # stylelint
npm run format:check
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -ciE '\.test\.|\.spec\.'   # expect 0
```
If `format:check` flags new/changed files, `npx prettier --write` them and amend.

- [ ] **Step 2: Library Rule 8 review-fix loop**

Changes touch `packages/design-system/**`, so run the pre-push review cycle (`packages/design-system/CLAUDE.md` Rule 8): a fresh-context reviewer over the diff, briefed on the 10 categories (bugs, a11y, API consistency, type safety, Rules 1–7, test coverage, token discipline, SCSS, cross-package leakage, packaging). Fix Critical/Important; re-run gates; re-review until "clean enough to stop". Pay special attention to: no control emits BOTH a conflicting `aria-label` and `aria-labelledby` that name differently; native controls' accessible names unchanged; TimeField callers still compile. **Known/pre-existing (do not re-flag):** Field already injects the DS `invalid`/`required` props onto auto-cloned children; for composite controls that don't consume them, they fall through `{...rest}` onto a root `<div>` and React logs a dev warning. This predates this change (the new `aria-labelledby` is a valid global attribute and adds no warning) and is out of scope for the a11y fix.

- [ ] **Step 3: Manual smoke (optional)**

`make dev` → open `/components/select`, `/components/color-picker`, `/components/file-upload`, `/components/timefield`; verify each, when wrapped by a Field (or via the custom-fields / member-profile mockups), exposes the Field label as its accessible name (inspect the focusable element's computed name in the a11y panel).

- [ ] **Step 4: Push + PR**

```bash
cd /Users/dpws/projects/design-system
git push -u origin fix/field-labels-composites
gh pr create --base main --head fix/field-labels-composites \
  --title "fix(a11y): <Field> names composite controls (Select/Slider/ColorPicker/FileUpload/TimeField)" \
  --body "$(cat <<'EOF'
## Summary
`<Field label="X"><Select/></Field>` (and Slider/ColorPicker/FileUpload/TimeField) exposed **no accessible name** — Field named via `<label htmlFor>` + an injected `id`, which lands on a wrapper `<div>` for composite controls while the focusable trigger keeps its own id.

- **Field**: auto-clone + the render-prop `field` object now also convey `aria-labelledby={labelId}` (guarded; child's value wins; only when a label is rendered). Native controls unchanged (same name). **Select + Slider** get named for free (they already forward `aria-labelledby`).
- **ColorPicker / FileUpload / TimeField**: forward `aria-labelledby` (+ `aria-describedby`) onto their focusable element; **TimeField**'s `aria-label` is now optional (backward-compatible).

## Test plan
- [x] Field unit tests (inject when labelled / not when unlabelled / child wins / render-prop carries it)
- [x] Per-control: `<Field label="X"><Control/></Field>` → `getByRole(role, { name: 'X' })` for Select, Slider, ColorPicker, FileUpload, TimeField
- [x] Back-compat: TimeField with only `aria-label` still named; native controls unchanged
- [x] `make test` / `make build` / `make lint` / `prettier --check` green; `npm pack --dry-run` test-free
- [x] Library Rule 8 review loop clean
- [ ] CI `Quality / check`

## Downstream
After merge, the merged member-profile mockup's Selects get named automatically; the custom-fields Type Select can simplify from its render-prop workaround back to auto-clone (separate follow-up).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (against the spec)

**Spec coverage:** ✅ Field core injects/exposes `aria-labelledby` (Task 1). ✅ ColorPicker (Task 2), FileUpload (Task 3), TimeField incl. optional aria-label (Task 4) forward it. ✅ Select + Slider regression tests, no source change (Task 5). ✅ Acceptance test per control (`getByRole(role,{name})`). ✅ Native controls unchanged; back-compat for TimeField callers. ✅ Rule 1/7/8. ✅ No FieldContext; OptionsPicker excluded.

**Placeholder scan:** none — exact before/after edits + full test code + commands. (The Select trigger-role and Slider minimal-props notes point to the existing test conventions rather than guessing.)

**Type consistency:** `FieldRenderProps` gains `'aria-labelledby': string | undefined`, set on `field` and used by the auto-clone injection. ColorPicker adds `'aria-labelledby'`/`'aria-describedby'` to `ColorPickerProps` + `labelledBy`/`describedBy` to `DefaultTriggerProps`. FileUpload/TimeField rely on existing HTMLAttributes aria keys (TimeField also adds explicit `aria-labelledby` to its props). Test imports use the relative `../Field` path (same-package convention).

## Follow-ups (out of scope)
- Simplify the custom-fields mockup's Type Select from render-prop to plain auto-clone.
- The stray consumer-`id`-on-wrapper hygiene in Select/Slider (inert) — optional.
