# IconPicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Historical note:** This is the original implementation plan. Its task scope and unchecked
> execution record are preserved; repository paths, package-context commands, and workspace names
> were corrected after execution where the original text had become stale.

**Goal:** Ship a controlled, accessible popover grid that lets consumers choose one icon from their own labelled glyph catalog.

**Architecture:** `IconPicker` is one public `forwardRef` component built on the existing controlled `Popover`. It owns open state and a roving grid index while the consumer owns the selected value and option list; consumer glyphs stay decorative and option labels carry all radio semantics.

**Tech Stack:** React 19, TypeScript, CSS Modules/SCSS, `@floating-ui/react-dom` through `Popover`, Vitest, React Testing Library, user-event, Vite playground, repository i18n and manifest tooling.

## Global Constraints

- Work only on `feat/icon-picker`, based on current `origin/main`; do not use a worktree.
- The public catalog shape is `{ value: string; label: string; icon: ReactNode }`; there is no DS icon registry.
- The picker is controlled-only and single-select; no search, grouping, custom trigger, or form serialization.
- Use a four-column grid and reset roving focus to the controlled selection on every open.
- Use `role="radiogroup"`, `role="radio"`, `aria-checked`, and a non-color-only selected treatment without a second glyph.
- All fixed user-facing strings go through `useTranslation`; do not add `triggerLabel` or another component-specific label prop.
- Use component tokens and existing primitive tokens only; do not add raw color, spacing, radius, or typography values.
- Forward the root ref, merge `className`, spread root HTML attributes, and forward composite-control ARIA attributes to the trigger.
- Complete component tests, public exports, i18n, playground route/nav/index/schematic, both manifest cluster maps, generated manifest, and `AGENTS.md` guidance.
- Use TDD for component behavior and run the mandatory `pre-push-review` skill before publication.

---

## File Map

**Create**

- `packages/design-system/src/components/IconPicker/IconPicker.tsx` — public API, trigger, popover, grid, focus, and selection behavior.
- `packages/design-system/src/components/IconPicker/IconPicker.module.scss` — internal trigger/grid/cell/glyph/hidden-label presentation.
- `packages/design-system/src/components/IconPicker/IconPicker.tokens.scss` — component-scoped token aliases.
- `packages/design-system/src/components/IconPicker/IconPicker.test.tsx` — public contract and interaction regression suite.
- `packages/design-system/src/components/IconPicker/index.ts` — component and type barrel.
- `packages/playground/src/pages/components/IconPickerDemo.tsx` — controlled task-priority catalog demo.

**Modify**

- `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts` — localized default trigger purpose.
- `packages/design-system/src/index.ts` — public component/type exports.
- `packages/design-system/AGENTS.md` — agent-facing usage and anti-pattern summary.
- `packages/design-system/src/_meta/manifest.ts` and `scripts/generate-manifest.mjs` — Forms cluster membership.
- `packages/design-system/src/components.manifest.json` — regenerated public metadata.
- `packages/playground/src/App.tsx` — demo import and route.
- `packages/playground/src/layout/AppShell/navItems.ts` — Forms navigation item.
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card.
- `packages/playground/src/pages/components/overviewSchematics.tsx` — IconPicker overview drawing.

---

### Task 1: Establish the Public Contract and Basic Selection

**Files:**

- Create: `packages/design-system/src/components/IconPicker/IconPicker.test.tsx`
- Create: `packages/design-system/src/components/IconPicker/IconPicker.tsx`
- Create: `packages/design-system/src/components/IconPicker/IconPicker.module.scss`
- Create: `packages/design-system/src/components/IconPicker/IconPicker.tokens.scss`
- Create: `packages/design-system/src/components/IconPicker/index.ts`
- Modify: `packages/design-system/src/i18n/messages.ts`
- Modify: `packages/design-system/src/i18n/en.ts`
- Modify: `packages/design-system/src/i18n/ru.ts`
- Modify: `packages/design-system/src/index.ts`

**Interfaces:**

- Consumes: `Popover`, `useTranslation()`, React `ReactNode`, and root `HTMLAttributes<HTMLDivElement>`.
- Produces: `IconPicker`, `IconPickerProps`, `IconPickerOption`, and the translation key `iconPicker.triggerLabel`.

- [ ] **Step 1: Write failing public-contract tests**

Create test fixtures whose glyphs have stable test ids, then cover selected rendering, root forwarding, trigger naming, radio semantics, click selection, and closing:

```tsx
const options: IconPickerOption[] = [
  { value: 'flame', label: 'Flame', icon: <svg data-testid="flame-icon" /> },
  { value: 'zap', label: 'Lightning', icon: <svg data-testid="zap-icon" /> },
  { value: 'flag', label: 'Flag', icon: <svg data-testid="flag-icon" /> },
];

it('renders the selected glyph and forwards root props and ref', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <IconPicker
      ref={ref}
      value="flame"
      options={options}
      onChange={() => {}}
      className="consumer"
      data-testid="root"
    />,
  );
  expect(ref.current).toBe(screen.getByTestId('root'));
  expect(ref.current).toHaveClass('consumer');
  expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pick icon: Flame' })).toBeInTheDocument();
});

it('renders a labelled single-select radio grid', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Flame' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'Lightning' })).toHaveAttribute('aria-checked', 'false');
});

it('commits a click and closes', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="flame" options={options} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  await user.click(screen.getByRole('radio', { name: 'Lightning' }));
  expect(onChange).toHaveBeenCalledWith('zap');
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test --workspace @eocrm/design-system -- --run src/components/IconPicker/IconPicker.test.tsx
```

Expected: FAIL because `./IconPicker` and `IconPickerOption` do not exist.

- [ ] **Step 3: Add i18n and the component public surface**

Add this exact message shape to the three parallel i18n files:

```ts
// messages.ts
iconPicker: {
  /** Default accessible purpose for the IconPicker trigger. */
  triggerLabel: string;
};

// en.ts
iconPicker: { triggerLabel: 'Pick icon' },

// ru.ts
iconPicker: { triggerLabel: 'Выбрать значок' },
```

Create the barrel and root export:

```ts
// components/IconPicker/index.ts
export { IconPicker } from './IconPicker';
export type { IconPickerProps, IconPickerOption } from './IconPicker';

// src/index.ts
export { IconPicker } from './components/IconPicker';
export type { IconPickerProps, IconPickerOption } from './components/IconPicker';
```

- [ ] **Step 4: Implement the minimal controlled picker**

Implement the component with full exported-member JSDoc and 2–3 canonical examples. Use this structure and preserve the semantics shown:

```tsx
const COLUMNS = 4;

export interface IconPickerOption {
  value: string;
  label: string;
  icon: ReactNode;
}

export interface IconPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: string;
  options: IconPickerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  popoverPlacement?: PopoverPlacement;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export const IconPicker = forwardRef<HTMLDivElement, IconPickerProps>(function IconPicker(
  {
    value,
    options,
    onChange,
    disabled = false,
    popoverPlacement = 'bottom-start',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const unavailable = disabled || options.length === 0;
  const purpose = ariaLabel ?? t('iconPicker.triggerLabel');
  const triggerLabel = selected ? `${purpose}: ${selected.label}` : purpose;
  const { side, align } = PLACEMENT_MAP[popoverPlacement];

  const commit = (option: IconPickerOption) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      <Popover open={open} onOpenChange={(next) => !unavailable && setOpen(next)}>
        <Popover.Trigger>
          <button
            type="button"
            className={styles.trigger}
            disabled={unavailable}
            aria-label={ariaLabelledBy ? undefined : triggerLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
          >
            {selected && (
              <span className={styles.glyph} aria-hidden="true">
                {selected.icon}
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Content side={side} align={align}>
          <div className={styles.grid} role="radiogroup">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-label={option.label}
                aria-checked={option.value === value}
                className={clsx(styles.cell, option.value === value && styles.selected)}
                onClick={() => commit(option)}
              >
                <span className={styles.glyph} aria-hidden="true">
                  {option.icon}
                </span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
});
```

Complete `aria-labelledby` composition in Task 2; do not weaken it to a plain forwarded id.

- [ ] **Step 5: Add token-correct base styling**

Define component tokens from existing primitives, including trigger/cell size, grid gap, radii, foreground, surface, border, hover, selected, and focus values. Style a four-column grid and square internal buttons:

```scss
// IconPicker.tokens.scss
:root {
  --icon-picker-trigger-size: var(--size-md);
  --icon-picker-cell-size: var(--size-lg);
  --icon-picker-grid-gap: var(--space-1);
  --icon-picker-grid-padding: var(--space-1);
  --icon-picker-radius: var(--radius-sm);
  --icon-picker-border: var(--color-border);
  --icon-picker-bg: var(--color-bg);
  --icon-picker-fg: var(--color-fg);
  --icon-picker-hover-bg: var(--color-bg-muted);
  --icon-picker-selected-border: var(--color-accent);
  --icon-picker-selected-ring: var(--color-accent);
}

// IconPicker.module.scss
@use '../../styles/mixins' as *;
@use './IconPicker.tokens';

.root {
  display: inline-block;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, var(--icon-picker-cell-size));
  gap: var(--icon-picker-grid-gap);
  padding: var(--icon-picker-grid-padding);
}
.trigger,
.cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: var(--border-width) solid var(--icon-picker-border);
  border-radius: var(--icon-picker-radius);
  background: var(--icon-picker-bg);
  color: var(--icon-picker-fg);
  cursor: pointer;
}
.trigger {
  width: var(--icon-picker-trigger-size);
  height: var(--icon-picker-trigger-size);
}
.cell {
  width: var(--icon-picker-cell-size);
  height: var(--icon-picker-cell-size);
}
.cell:hover {
  background: var(--icon-picker-hover-bg);
}
.trigger:focus-visible,
.cell:focus-visible {
  @include focus-ring;
}
.selected {
  border-color: var(--icon-picker-selected-border);
  box-shadow: inset 0 0 0 var(--border-width) var(--icon-picker-selected-ring);
}
.glyph {
  display: inline-flex;
  pointer-events: none;
}
.glyph {
  font-size: var(--font-size-lg);
}
.glyph > svg {
  width: 1em;
  height: 1em;
}
```

Use actual existing token names discovered in the token files; if a shown alias does not exist, replace it with the nearest existing semantic token rather than adding a raw value.

- [ ] **Step 6: Run the focused tests and commit GREEN**

Run:

```bash
npm test --workspace @eocrm/design-system -- --run src/components/IconPicker/IconPicker.test.tsx
npm run typecheck --workspace @eocrm/design-system
```

Expected: PASS.

Commit:

```bash
git add packages/design-system/src/components/IconPicker packages/design-system/src/i18n packages/design-system/src/index.ts
git commit -m "feat(IconPicker): add controlled icon selection"
```

---

### Task 2: Complete Keyboard, Focus, Naming, and Edge Cases

**Files:**

- Modify: `packages/design-system/src/components/IconPicker/IconPicker.test.tsx`
- Modify: `packages/design-system/src/components/IconPicker/IconPicker.tsx`
- Modify: `packages/design-system/src/components/IconPicker/IconPicker.module.scss`

**Interfaces:**

- Consumes: `IconPickerProps`, `IconPickerOption`, `COLUMNS = 4`, and Task 1's controlled `Popover`.
- Produces: complete roving-focus behavior, composed trigger names, disabled/empty behavior, and focus restoration.

- [ ] **Step 1: Add failing interaction and edge-case tests**

Add targeted tests with eight options so row movement is observable:

```tsx
it('seeds focus from the controlled value every time the popover opens', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<IconPicker value="zap" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Lightning' }));
  expect(screen.getByRole('radio', { name: 'Lightning' })).toHaveFocus();
  await user.keyboard('{Escape}');
  rerender(<IconPicker value="flag" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flag' }));
  expect(screen.getByRole('radio', { name: 'Flag' })).toHaveFocus();
});

it('moves spatially and selects with Space', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="one" options={eightOptions} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: One' }));
  await user.keyboard('{ArrowRight}{ArrowDown}{Home}{End}{Space}');
  expect(onChange).toHaveBeenCalledWith('eight');
});

it('restores focus to the trigger after selection', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  const trigger = screen.getByRole('button', { name: 'Pick icon: Flame' });
  await user.click(trigger);
  await user.click(screen.getByRole('radio', { name: 'Flag' }));
  expect(trigger).toHaveFocus();
});

it('composes external labels with the selected option', async () => {
  render(
    <>
      <span id="field-label">Priority icon</span>
      <IconPicker
        aria-labelledby="field-label"
        value="flame"
        options={options}
        onChange={() => {}}
      />
    </>,
  );
  expect(screen.getByRole('button', { name: 'Priority icon Flame' })).toBeInTheDocument();
});

it('disables an empty picker and tolerates an unmatched value', () => {
  const { rerender } = render(<IconPicker value="missing" options={[]} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Pick icon' })).toBeDisabled();
  rerender(<IconPicker value="missing" options={options} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Pick icon' })).toBeEnabled();
});
```

Also test Arrow Left/Up clamping, row-aware Home/End, Enter selection, Escape and outside-click without `onChange`, explicit `disabled`, `aria-describedby`, glyph `aria-hidden`, and the selected CSS class.

- [ ] **Step 2: Run focused tests and confirm RED**

Run:

```bash
npm test --workspace @eocrm/design-system -- --run src/components/IconPicker/IconPicker.test.tsx
```

Expected: FAIL on focus initialization, keyboard movement, and composed `aria-labelledby`.

- [ ] **Step 3: Implement roving focus and open reseeding**

Use element refs and focused DOM indices as the source of truth:

```tsx
const [activeIndex, setActiveIndex] = useState(0);
const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
const selectedIndex = options.findIndex((option) => option.value === value);

const focusCell = (index: number) => {
  setActiveIndex(index);
  requestAnimationFrame(() => cellRefs.current[index]?.focus());
};

const handleOpenChange = (next: boolean) => {
  if (unavailable) return;
  if (next) {
    const seed = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(seed);
    requestAnimationFrame(() => cellRefs.current[seed]?.focus());
  }
  setOpen(next);
};
```

Implement `onKeyDown` using the current button's `data-icon-index`. Clamp Left/Right/Up/Down to `[0, options.length - 1]`; Home is `current - (current % COLUMNS)` and End is `min(rowStart + COLUMNS - 1, lastIndex)`. Enter/Space prevent default and use the same `commit` function as click.

Render `tabIndex={index === activeIndex ? 0 : -1}`, `data-icon-index={index}`, and assign each cell ref.

- [ ] **Step 4: Compose trigger naming without clobbering external labels**

Create a stable hidden-label id with `useId()`. When `aria-labelledby` exists and a selection exists, render a visually hidden span containing `selected.label` and set:

```tsx
const labelledBy = ariaLabelledBy
  ? selected
    ? `${ariaLabelledBy} ${selectedLabelId}`
    : ariaLabelledBy
  : undefined;

aria-label={labelledBy ? undefined : triggerLabel}
aria-labelledby={labelledBy}
```

Add a standard visually-hidden class using the repository's existing mixin or established clipping recipe. Do not render the hidden suffix when `value` is unmatched.

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
npm test --workspace @eocrm/design-system -- --run src/components/IconPicker/IconPicker.test.tsx
npm run typecheck --workspace @eocrm/design-system
npx stylelint "packages/design-system/src/components/IconPicker/*.scss"
```

Expected: PASS.

Commit:

```bash
git add packages/design-system/src/components/IconPicker
git commit -m "feat(IconPicker): add accessible grid navigation"
```

---

### Task 3: Add Consumer Guidance and Manifest Metadata

**Files:**

- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/design-system/src/_meta/manifest.ts`
- Modify: `packages/design-system/scripts/generate-manifest.mjs`
- Modify: `packages/design-system/src/components.manifest.json`

**Interfaces:**

- Consumes: the public `IconPicker` API from Tasks 1–2.
- Produces: agent-readable usage guidance and generated metadata classifying `IconPicker` under `Forms`.

- [ ] **Step 1: Add the AGENTS.md TL;DR**

Add a focused section near the other picker controls:

````md
### `<IconPicker>` — choose one glyph from a consumer catalog

```tsx
const options = [
  { value: 'flame', label: 'Flame', icon: <Flame /> },
  { value: 'zap', label: 'Lightning', icon: <Zap /> },
];
<IconPicker value={icon} options={options} onChange={setIcon} />;
```

- The consumer owns icon values, labels, glyphs, ordering, and controlled state.
- Use it for compact visual choices; use `Select` when visible option text matters.
- Labels must be human-readable and values unique. Do not pass icon codes as labels.
````

Ensure the nested fence is formatted correctly in the actual Markdown.

- [ ] **Step 2: Add both Forms cluster entries**

Add the same mapping in both parallel maps, alphabetically around the other Forms components:

```ts
IconPicker: 'Forms',
```

- [ ] **Step 3: Regenerate and verify the manifest**

Run:

```bash
npm run build:manifest --workspace @eocrm/design-system
npm test --workspace @eocrm/design-system -- --run src/_meta/manifest.test.ts
```

Expected: generator succeeds and the manifest drift test passes.

- [ ] **Step 4: Commit documentation and metadata**

```bash
git add packages/design-system/AGENTS.md packages/design-system/src/_meta packages/design-system/scripts/generate-manifest.mjs
git commit -m "docs(IconPicker): add usage and manifest metadata"
```

---

### Task 4: Add the Playground Demo and Discovery Wiring

**Files:**

- Create: `packages/playground/src/pages/components/IconPickerDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/navItems.ts`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/components/overviewSchematics.tsx`

**Interfaces:**

- Consumes: public `IconPicker` and `IconPickerOption` exports.
- Produces: `/components/icon-picker`, a Forms nav entry, overview card, and schematic.

- [ ] **Step 1: Create a realistic controlled demo**

Use the full issue catalog with human labels and Lucide elements:

```tsx
const priorityIcons: IconPickerOption[] = [
  { value: 'chevrons-up', label: 'Double chevron up', icon: <ChevronsUp /> },
  { value: 'chevron-up', label: 'Chevron up', icon: <ChevronUp /> },
  { value: 'equal', label: 'Equal', icon: <Equal /> },
  { value: 'chevron-down', label: 'Chevron down', icon: <ChevronDown /> },
  { value: 'chevrons-down', label: 'Double chevron down', icon: <ChevronsDown /> },
  { value: 'arrow-up', label: 'Arrow up', icon: <ArrowUp /> },
  { value: 'arrow-down', label: 'Arrow down', icon: <ArrowDown /> },
  { value: 'minus', label: 'Minus', icon: <Minus /> },
  { value: 'flag', label: 'Flag', icon: <Flag /> },
  { value: 'flame', label: 'Flame', icon: <Flame /> },
  { value: 'zap', label: 'Lightning', icon: <Zap /> },
  { value: 'triangle-alert', label: 'Triangle alert', icon: <TriangleAlert /> },
  { value: 'octagon-alert', label: 'Octagon alert', icon: <OctagonAlert /> },
  { value: 'clock', label: 'Clock', icon: <Clock /> },
  { value: 'circle-dot', label: 'Circle dot', icon: <CircleDot /> },
  { value: 'star', label: 'Star', icon: <Star /> },
];

export function IconPickerDemo() {
  const [value, setValue] = useState('flame');
  return (
    <DemoLayout
      name="IconPicker"
      componentName="IconPicker"
      description="Controlled popover grid for choosing one icon from a consumer-curated catalog."
      files={getComponentFiles('IconPicker')}
    >
      <Example
        title="Task priority icon"
        description="The consumer owns glyphs and labels."
        code={exampleCode}
      >
        <Stack gap="sm">
          <IconPicker value={value} options={priorityIcons} onChange={setValue} />
          <Text tone="muted">Selected: {value}</Text>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
```

Import every glyph from `lucide-react` and all library components through `@eocrm/design-system`; do not use relative library source imports.

- [ ] **Step 2: Wire route and sidebar navigation**

In `App.tsx`, import `IconPickerDemo` and add:

```tsx
<Route path="/components/icon-picker" element={<IconPickerDemo />} />
```

In the Forms group of `navItems.ts`, import the verified installed Lucide
`Grid2X2Check` glyph and add:

```ts
{ to: '/components/icon-picker', label: 'IconPicker', icon: Grid2X2Check, end: false },
```

- [ ] **Step 3: Add overview card and schematic**

Add this Forms card to `ComponentsIndex.tsx`:

```ts
{
  to: '/components/icon-picker',
  name: 'IconPicker',
  description: 'Controlled popover grid for selecting one icon from a consumer-curated labelled catalog.',
  preview: SCHEMATICS['IconPicker'],
},
```

Add one compact four-cell schematic to `SCHEMATICS`; use one `Solid` cell as the selected affordance and `Outline` for the other cells:

```tsx
IconPicker: (
  <Panel w={86} h={86} style={{ padding: 10 }}>
    <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 28px)', gap: 6 }}>
      <Solid w={28} h={28} />
      <Outline w={28} h={28} />
      <Outline w={28} h={28} />
      <Outline w={28} h={28} />
    </span>
  </Panel>
),
```

- [ ] **Step 4: Verify the playground and commit**

Run:

```bash
npm run typecheck --workspace playground
npm run build --workspace playground
```

Expected: PASS and `/components/icon-picker` is included in the built routes.

Commit:

```bash
git add packages/playground/src
git commit -m "docs(playground): demonstrate IconPicker"
```

---

### Task 5: Run Full Gates, Review, and Ship Issue #449

**Files:**

- Modify only files required to resolve verified gate or review findings.

**Interfaces:**

- Consumes: complete branch diff from Tasks 1–4 and the repository's `pre-push-review` skill.
- Produces: a clean draft PR, two-reviewer clean round, green `Quality / check`, merged release, and closed issue #449.

- [ ] **Step 1: Run the complete local gate**

```bash
make test
make build-lib
make lint
npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
  | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'
```

Expected: every command passes and the package grep prints `0`.

- [ ] **Step 2: Invoke and complete `pre-push-review`**

Read `.claude/skills/pre-push-review/SKILL.md` completely. Follow variant A exactly: establish the baseline, open the draft PR, run at least two independent fresh-context reviewers per round, fix every Critical/Important finding with regression tests, re-run relevant gates, commit, and repeat until a clean round allows marking the PR ready.

- [ ] **Step 3: Verify final branch state before publication**

Invoke `superpowers:verification-before-completion`, then run fresh evidence:

```bash
git status --short
git log --oneline origin/main..HEAD
make test && make build-lib && make lint && npm run format:check
```

Expected: clean worktree and all gates passing.

- [ ] **Step 4: Push and open/update the PR without auto-closing the issue**

Use the implement-issue format:

```bash
git push -u origin feat/icon-picker
gh pr create --repo eocrm/design-system --base main --head feat/icon-picker \
  --title "feat: add IconPicker (#449)" \
  --body $'Addresses #449.\n\n## Summary\n- add a controlled accessible icon-grid picker\n- add consumer guidance and playground coverage\n\n## Test plan\n- make test\n- make build-lib\n- make lint\n- npm run format:check'
```

If `pre-push-review` already created the draft PR, update its title/body and mark it ready instead of creating a duplicate.

- [ ] **Step 5: Wait for Quality, merge, and verify release**

Record the newest `v*` tag, watch `gh pr checks` to green, update the branch if it becomes `BEHIND`, then squash-merge without `--admin`. Poll the Release workflow by the exact merge SHA, watch it finish, confirm `publish: success`, fetch tags after completion, and verify the newest tag differs from the recorded tag.

- [ ] **Step 6: Comment the published version and close #449**

```bash
SHIPPED_VERSION="${NEW#v}"
gh issue comment 449 --repo eocrm/design-system \
  --body "Resolved in \`@eocrm/design-system@${SHIPPED_VERSION}\` (PR #${PR_NUMBER}, tag \`${NEW}\`). Bump your dependency to pick up the fix."
gh issue close 449 --repo eocrm/design-system --reason completed
```

Return local checkout to clean, up-to-date `main`, then report the PR, squash SHA, package version/tag, release/deploy result, and issue closure.
