# IconPicker palette colour + size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `IconPicker` gains a `size` prop (sm/md/lg = 24/32/40px) and an opt-in palette-colour mode (`color` / `onColorChange` / `colors`) with one trigger and one popover.

**Architecture:** All changes live inside the existing `IconPicker` component. Colour mode is a discriminated-union prop shape. The trigger and cells are tinted at runtime via `paletteTokens()` custom properties (IconTile's technique). The popover gains a second roving-tabindex radiogroup above the icon grid.

**Tech Stack:** React 19, TypeScript, SCSS modules + component tokens, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-19-iconpicker-palette-color-design.md`

## Global Constraints

- Icon-only consumers (no `color`) see zero change: same look, 32px default, close-on-pick, same accessible names.
- `--icon-picker-trigger-size` stays the md value (default `--size-md`); new `--icon-picker-trigger-size-sm` (`--size-sm`) / `--icon-picker-trigger-size-lg` (`--size-lg`). Every new token is added to `ICON_PICKER_TOKEN_NAMES`.
- Tokens only, no raw values; no margin/position/flex:1 in component SCSS.
- `color` + `onColorChange` are both present or both absent — enforced by the type, not by runtime warnings.
- Default `colors` = `PALETTE_COLORS`.
- Never inline-disable an `eocrm/*` ESLint rule (CI-only check: `node --test tools/eslint-plugin-eocrm/rules.test.mjs`).
- Run Vitest from `packages/design-system` (`npx vitest run src/components/IconPicker`).
- Branch: `git checkout main && git pull && git checkout -b feat/iconpicker-palette-color`. The spec and plan are committed on this branch.

## Review Focus

1. A `color` not in `colors` — the trigger is still tinted, no dot is checked, and opening focuses the first dot. Test in Task 2.
2. A consumer override of `--icon-picker-trigger-size` on an ancestor still sizes the default (md) trigger. Test in Task 1.
3. Arrowing through colours fires `onColorChange` for each step but doesn't close the popover, and Esc returns focus to the trigger. Test in Task 3.
4. `colors={[]}`: the colour section is not rendered, and the icon grid still works. Test in Task 2.
5. Disabled in colour mode keeps the tint (inline palette vars present) and can't open. Test in Task 2.

---

### Task 1: `size` prop

**Files:**

- Modify: `packages/design-system/src/components/IconPicker/IconPicker.tsx`
- Modify: `packages/design-system/src/components/IconPicker/IconPicker.module.scss`, `IconPicker.tokens.scss`
- Test: `packages/design-system/src/components/IconPicker/IconPicker.test.tsx`

**Interfaces:**

- Produces: `export type IconPickerSize = 'sm' | 'md' | 'lg'`; `IconPickerProps.size?: IconPickerSize` (default `'md'`); the trigger gets the class `styles[\`size-${size}\`]`.

- [ ] **Step 1: Write failing tests**

```tsx
it.each(['sm', 'md', 'lg'] as const)('applies the %s size class to the trigger', (size) => {
  render(<IconPicker value="flame" options={options} onChange={() => {}} size={size} />);
  expect(screen.getByRole('button', { name: 'Pick icon: Flame' }).className).toContain(
    `size-${size}`,
  );
});

it('defaults to md', () => {
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Pick icon: Flame' }).className).toContain('size-md');
});
```

For Review Focus #2, assert in the SCSS (a stylelint-free text check is fine, read via `?raw` import or `fs`) that `.size-md` resolves width/height through `var(--icon-picker-trigger-size)` and `.size-sm` / `.size-lg` use `--icon-picker-trigger-size-sm` / `-lg`. jsdom can't compute the cascade, so the source assertion is the guard. Check whether another component test already reads its SCSS this way and copy that pattern.

- [ ] **Step 2: Run** `npx vitest run src/components/IconPicker` and expect the new tests to FAIL.
- [ ] **Step 3: Implement.** Add the tokens `--icon-picker-trigger-size-sm: var(--size-sm)` and `--icon-picker-trigger-size-lg: var(--size-lg)`, and add both to `ICON_PICKER_TOKEN_NAMES`. Move width/height off `.trigger` into `.size-sm` / `.size-md` / `.size-lg`. Glyph size per size is the builder's choice, within tokens.
- [ ] **Step 4: Run the tests** and expect PASS, with every existing test still green.
- [ ] **Step 5: Commit** with `feat(IconPicker): size prop matching field heights`.

---

### Task 2: Colour mode — props, i18n, trigger, popover sections, pointer behaviour

**Files:**

- Modify: `IconPicker.tsx`, `IconPicker.module.scss`, `IconPicker.tokens.scss`
- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts`
- Modify: `packages/design-system/src/index.ts` only if new types need re-exporting (`IconPickerSize` must be exported)
- Test: `IconPicker.test.tsx`

**Interfaces:**

- Consumes: Task 1 `size`.
- Produces:

  ```ts
  type IconPickerColorProps =
    | { color: PaletteColor; onColorChange: (color: PaletteColor) => void; colors?: PaletteColor[] }
    | { color?: never; onColorChange?: never; colors?: never };
  export type IconPickerProps = IconPickerBaseProps & IconPickerColorProps;
  ```

  - New i18n keys: `iconPicker.colorLabel` ('Colour' / 'Цвет'), `iconPicker.iconLabel` ('Icon' / 'Значок'), and `iconPicker.triggerLabelWithColor` ('Pick icon and colour' / 'Выбрать значок и цвет').
  - A new top-level `palette` namespace with one key per `PaletteColor` (`palette.teal` = 'Teal' / 'Бирюзовый', and so on for all 30, with natural Russian names). It is typed in `messages.ts` as `Record<PaletteColor, string>`.
  - Popover structure in colour mode: heading `Colour` (id A) followed by `role="radiogroup" aria-labelledby=A` of `role="radio"` dots, each with `aria-label` set to the localized colour name, `aria-checked`, and `data-color-index`. Then heading `Icon` (id B) followed by the existing icon radiogroup, labelled by B.

- [ ] **Step 1: Write failing tests** with a `ColorHarness` (controlled `value` + `color` state, `onChange` and `onColorChange` spies):

```tsx
it('names the trigger with icon and colour', () => {
  render(<ColorHarness initialColor="teal" />);
  expect(
    screen.getByRole('button', { name: 'Pick icon and colour: Flame, Teal' }),
  ).toBeInTheDocument();
});

it('tints the trigger with palette vars', () => {
  render(<ColorHarness initialColor="teal" />);
  const trigger = screen.getByRole('button', { name: /Pick icon and colour/ });
  expect(trigger.style.getPropertyValue('--icon-picker-tint-bg')).toBe(
    'var(--color-palette-teal-bg)',
  );
  expect(trigger.style.getPropertyValue('--icon-picker-tint-fg')).toBe(
    'var(--color-palette-teal-fg)',
  );
});

it('renders Colour and Icon radiogroups labelled by visible headings', async () => {
  render(<ColorHarness initialColor="teal" />);
  await userEvent.click(screen.getByRole('button', { name: /Pick icon and colour/ }));
  expect(screen.getByRole('radiogroup', { name: 'Colour' })).toBeInTheDocument();
  expect(screen.getByRole('radiogroup', { name: 'Icon' })).toBeInTheDocument();
  expect(screen.getAllByRole('radio', { name: /^(Red|Teal|Charcoal)$/ })).toHaveLength(3);
  expect(screen.getByRole('radio', { name: 'Teal' })).toHaveAttribute('aria-checked', 'true');
});

it('clicking a colour or icon commits without closing', async () => {
  // click 'Blue' → onColorChange('blue'); dialog still open
  // click 'Lightning' → onChange('zap'); dialog still open
});

it('respects the colors subset and order', async () => {
  // colors={['blue','teal']} → exactly two dots, in that order
});

it('unknown color: trigger tinted, no dot checked, focus lands on first dot', async () => {
  // color='teal', colors={['blue','red']}
});

it('colors={[]} hides the colour section but keeps the icon grid', async () => {});

it('disabled colour mode keeps the tint and cannot open', async () => {});

it('icon-only mode is unchanged: label "Pick icon: Flame", closes on pick, no Colour group', async () => {});

it('Field label + aria-labelledby path appends icon and colour', () => {
  // <Field label="Appearance"> → trigger name "Appearance Flame Teal" (hidden-span path)
});
```

- [ ] **Step 2: Run the tests** and expect FAIL.
- [ ] **Step 3: Implement.**
  - Colour mode is on when `color !== undefined`.
  - The trigger in colour mode gets `styles.tinted` plus inline `--icon-picker-tint-bg` / `--icon-picker-tint-fg` from `paletteTokens(color)`, and no neutral border.
  - `.tinted:disabled` keeps the tint and uses `opacity: var(--icon-picker-disabled-opacity)` (new token, which goes in `ICON_PICKER_TOKEN_NAMES`).
  - Icon cells in colour mode use the same tint vars.
  - `commit` closes only in icon-only mode.
  - The trigger label uses `triggerLabelWithColor` when there's no `aria-label` in colour mode, followed by `: ${iconLabel}, ${colorName}`.
  - The `aria-labelledby` path adds a second hidden span holding the colour name.
  - The dialog is named by the purpose alone, as it is today.
  - Open-focus seed: the checked dot, otherwise the first dot. With no dots, fall back to today's icon seed.
- [ ] **Step 4: Run the tests** and expect PASS. Also run `npx tsc --noEmit -p packages/design-system` and confirm that `<IconPicker color="teal" …>` without `onColorChange` is a type error (add a `// @ts-expect-error` line in the test file).
- [ ] **Step 5: Commit** with `feat(IconPicker): opt-in palette colour mode`.

---

### Task 3: Colour-mode keyboard

**Files:**

- Modify: `IconPicker.tsx`
- Test: `IconPicker.test.tsx`

**Interfaces:**

- Consumes: Task 2 DOM (`data-color-index` dots, the colour radiogroup).
- Produces: nothing new publicly.

- [ ] **Step 1: Write failing tests**

```tsx
it('Tab moves from the colour group to the icon group and Shift+Tab back', async () => {
  // open → focus on 'Teal' dot; Tab → focus on checked icon cell; Shift+Tab → 'Teal'
});

it('arrows move and select colours, wrapping, without closing', async () => {
  // ArrowRight from last dot → first; onColorChange called per step; dialog open
});

it('Enter/Space on a dot commits and stays open; Esc closes and refocuses trigger', async () => {});

it('arrow selection in the icon grid still fires onChange and does not close in colour mode', async () => {});
```

- [ ] **Step 2: Run the tests** and expect FAIL.
- [ ] **Step 3: Implement** a second roving tabindex for the dots (one `tabIndex=0` dot, the checked one or else the first). Arrow / Home / End behave like the icon grid's handler, using the colour row's column count as the row width. Generalise the existing handler instead of duplicating it. The shape of that refactor is the builder's call.
- [ ] **Step 4: Run all IconPicker tests** and expect PASS.
- [ ] **Step 5: Commit** with `feat(IconPicker): keyboard support for colour group`.

---

### Task 4: Docs, primer, playground demo

**Files:**

- Modify: `packages/design-system/docs/components/IconPicker.md` (prose, then `npm run build:docs` from `packages/design-system` for the props table)
- Modify: `packages/design-system/AI-PRIMER.md:159` to read `— choose one glyph (optionally + palette colour) from a consumer catalog`
- Modify: `packages/playground/src/pages/components/IconPickerDemo.tsx`
- Regenerate: `packages/playground/src/lib/props.manifest.json` (`npm run build:props` from `packages/playground`)

**Interfaces:**

- Consumes: the public API from Tasks 1–3.

- [ ] **Step 1: Update the docs.** Add:
  - a colour-mode example;
  - a "beside an Input" example (`<Cluster gap="sm"><IconPicker size="md" …/><Input size="md" …/></Cluster>` with an `aria-label` on the picker);
  - the `size` note that it matches `Input` / `Select` heights;
  - anti-patterns: ❌ pairing IconPicker with a separate colour `PillMenu`/`Select`; ❌ using it for hex (use `ColorPicker`); ❌ a picker beside Name with no `aria-label`.
- [ ] **Step 2: Update the demo.** Add three sections: colour mode standalone in `<Field label="Appearance">`, the sm/md/lg pickers each beside a same-size `Input` (Name), and a `colors` subset. The playground imports from `@eocrm/design-system` only.
- [ ] **Step 3: Run** `npm run build:docs` and `npm run build:props`, then `make test` (or `npm test` in `packages/design-system`) plus `npm run lint:css` and `npm run format:check` at the repo root, and confirm all are green.
- [ ] **Step 4: Visual check.** Start the playground on port 8090+ and check that the trigger heights match the inputs at each size, and the popover in light and dark themes. Pause and send the user the live demo link before the PR (per the memory "demo check before PR").
- [ ] **Step 5: Commit** with `docs(IconPicker): colour mode + size docs and demo`.

After Task 4, run the `pre-push-review` skill (library variant) for the PR and the review-fix loop.
