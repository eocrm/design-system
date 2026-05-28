# `<Kbd>` component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Ship `<Kbd keys={['⌘', 'K']} size="sm|md" />` as a library primitive, and migrate `<TopBar.Search hotkey>` to consume it (dropping the inline `<kbd>` and its topbar-scoped tokens). Per spec at `docs/superpowers/specs/2026-05-28-kbd-design.md`.

**Branch:** `feat/kbd-component` (already checked out off main).

**Locked-in design:** `keys: string[]` prop, one `<kbd>` per key joined by inline `+`, single-key combos render no separator. Two sizes: `sm` (default, 18px — matches TopBar chrome) + `md` (24px — command-palette). Wrapper `<span>` carries `aria-label = keys.join(' + ')` by default; inner `<kbd>` + separator are `aria-hidden`. Pattern B spread (component-owned ARIA wins). No platform translation.

---

## Task 1: Tokens

**Files:**

- Create: `packages/design-system/src/components/Kbd/Kbd.tokens.scss`

Write the file verbatim from the spec's "Tokens" section. Eleven entries total (chip surface 6 + separator 2 + size sm 4 + size md 4 = 16 tokens).

Verify:

- All values come from primitives in `src/styles/tokens.scss` (no raw hex/px other than the height/font-size literal `18px` / `24px` etc., which are component-intrinsic dimensions per Hard rule 3 — primitive `--space-*` / `--font-size-*` cover other places).
- Comment headers (`// ─── Chip surface ───…`) match the spec layout for grep-ability.

- [ ] Commit `Kbd: tokens`.

---

## Task 2: Root component + styles

**Files:**

- Create: `packages/design-system/src/components/Kbd/Kbd.tsx`
- Create: `packages/design-system/src/components/Kbd/Kbd.module.scss`
- Create: `packages/design-system/src/components/Kbd/index.ts`

### `Kbd.tsx`

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Kbd.module.scss';

export type KbdSize = 'sm' | 'md';

export interface KbdProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label'> {
  /**
   * Keys to display. Each entry renders one `<kbd>` chip. Multiple entries
   * are joined with an inline `+` separator; a single-entry array renders
   * no separator. Pass the literal label you want shown (`'⌘'`, `'Ctrl'`,
   * `'Shift'`, `'K'`) — the component does NOT platform-translate.
   */
  keys: string[];
  /**
   * Visual size. `'sm'` is the inline-chrome size (18px tall — matches
   * `TopBar.Search`'s hotkey hint). `'md'` is the standalone shortcut size
   * (24px tall — for command-palette / shortcut-sheet UI).
   * @default 'sm'
   */
  size?: KbdSize;
  /**
   * Accessible label for the whole shortcut, read as a single phrase by
   * screen readers. Defaults to `keys.join(' + ')` (e.g. `'⌘ + K'`).
   * Override when the raw keys are unintuitive — e.g. `keys={['⌘', 'K']}`
   * with `aria-label="Open command palette"`.
   */
  'aria-label'?: string;
}

const sizeClass: Record<KbdSize, string> = {
  sm: styles.kbdSizeSm,
  md: styles.kbdSizeMd,
};

/**
 * Renders a keyboard shortcut as one or more `<kbd>` chips joined with an
 * inline `+` separator. Use for shortcut hints in tooltips, command-palette
 * rows, search inputs, and help/shortcut sheets.
 *
 * @example
 * // Single key
 * <Kbd keys={['Esc']} />
 *
 * @example
 * // Two-key combo
 * <Kbd keys={['⌘', 'K']} />
 *
 * @example
 * // Inside a Tooltip
 * <Tooltip content={<>Save <Kbd keys={['⌘', 'S']} /></>}>
 *   <Button>Save</Button>
 * </Tooltip>
 *
 * @remarks
 * **When NOT to use:**
 * - For inline code, use `<Code>` instead — `<kbd>` is for keyboard input.
 * - For arbitrary text chips, use `<Badge>` — the `<kbd>` element implies
 *   keyboard input semantically.
 * - Don't platform-translate inside the `keys` array. Pass what you want
 *   shown. Apps that want `'⌘'` on macOS and `'Ctrl'` elsewhere should
 *   branch at the application layer.
 * - Don't nest a `<Kbd>` inside a button as its only label. Use the
 *   button's `aria-label` and render the Kbd as a separate visual hint.
 */
export const Kbd = forwardRef<HTMLSpanElement, KbdProps>(function Kbd(
  { keys, size = 'sm', 'aria-label': ariaLabel, className, ...props },
  ref,
) {
  // Pattern B — {...props} first so component-owned aria-label, aria-hidden
  // composition, and className composition win over a careless spread.
  return (
    <span
      {...props}
      ref={ref}
      aria-label={ariaLabel ?? keys.join(' + ')}
      className={clsx(styles.kbd, sizeClass[size], className)}
    >
      {keys.map((key, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && (
            <span aria-hidden="true" className={styles.separator}>
              +
            </span>
          )}
          <kbd aria-hidden="true" className={styles.key}>
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
});
```

> The `<span style={{ display: 'contents' }}>` wrapper is the inline React-key carrier. `display: contents` makes the wrapper invisible in layout, so the parent's `display: inline-flex` still sees `<span aria-hidden>+</span>` and `<kbd>K</kbd>` as direct flex items. Without it we'd need either `React.Fragment` with keys (which can't carry refs/className anyway) or two separate `.map()` passes — the wrapper is the cleanest option.

### `Kbd.module.scss`

Write verbatim from spec "Styles" section.

### `index.ts`

```ts
export { Kbd } from './Kbd';
export type { KbdProps, KbdSize } from './Kbd';
```

- [ ] Commit `Kbd: component + styles`.

---

## Task 3: Unit tests

**File:** `packages/design-system/src/components/Kbd/Kbd.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Kbd } from './Kbd';
import styles from './Kbd.module.scss';

describe('Kbd', () => {
  it('renders one <kbd> per key', () => {
    render(<Kbd keys={['Ctrl', 'Shift', 'P']} />);
    const kbds = screen.getAllByText(/Ctrl|Shift|P/);
    // Three <kbd> matches expected
    expect(kbds.filter((el) => el.tagName === 'KBD')).toHaveLength(3);
  });

  it('renders n-1 separators for n keys', () => {
    const { container } = render(<Kbd keys={['Ctrl', 'Shift', 'P']} />);
    const separators = container.querySelectorAll(`.${styles.separator}`);
    expect(separators).toHaveLength(2);
    separators.forEach((sep) => expect(sep.textContent).toBe('+'));
  });

  it('renders no separator for a single key', () => {
    const { container } = render(<Kbd keys={['Esc']} />);
    expect(container.querySelectorAll(`.${styles.separator}`)).toHaveLength(0);
  });

  it('defaults size to sm', () => {
    const { container } = render(<Kbd keys={['K']} />);
    expect(container.firstChild).toHaveClass(styles.kbdSizeSm);
  });

  it('applies kbdSizeMd when size="md"', () => {
    const { container } = render(<Kbd keys={['K']} size="md" />);
    expect(container.firstChild).toHaveClass(styles.kbdSizeMd);
    expect(container.firstChild).not.toHaveClass(styles.kbdSizeSm);
  });

  it('defaults aria-label to keys.join(" + ")', () => {
    render(<Kbd keys={['⌘', 'K']} />);
    expect(screen.getByLabelText('⌘ + K')).toBeInTheDocument();
  });

  it('uses custom aria-label when provided', () => {
    render(<Kbd keys={['⌘', 'K']} aria-label="Open command palette" />);
    expect(screen.getByLabelText('Open command palette')).toBeInTheDocument();
    expect(screen.queryByLabelText('⌘ + K')).not.toBeInTheDocument();
  });

  it('marks inner <kbd> elements aria-hidden', () => {
    const { container } = render(<Kbd keys={['⌘', 'K']} />);
    container.querySelectorAll('kbd').forEach((kbd) => {
      expect(kbd).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('marks the separator aria-hidden', () => {
    const { container } = render(<Kbd keys={['⌘', 'K']} />);
    const separator = container.querySelector(`.${styles.separator}`);
    expect(separator).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards ref to the wrapper span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Kbd ref={ref} keys={['K']} />);
    expect(ref.current?.tagName).toBe('SPAN');
    expect(ref.current).toHaveClass(styles.kbd);
  });

  it('merges className with the base class', () => {
    const { container } = render(<Kbd keys={['K']} className="extra-class" />);
    expect(container.firstChild).toHaveClass(styles.kbd);
    expect(container.firstChild).toHaveClass('extra-class');
  });

  it('renders the wrapper as a <span> (inline flow)', () => {
    const { container } = render(<Kbd keys={['K']} />);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });
});
```

Run: `cd packages/design-system && npm test -- Kbd`
Expected: all 12 tests pass.

- [ ] Commit `Kbd: unit tests`.

---

## Task 4: Barrel + manifest

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/components.manifest.json`
- Modify: `packages/design-system/src/_meta/manifest.ts`

### `src/index.ts`

Add an alphabetically-placed export (between `Input` and `Link`):

```ts
export { Kbd } from './components/Kbd';
export type { KbdProps, KbdSize } from './components/Kbd';
```

### `src/components.manifest.json`

Insert a `Kbd` entry alphabetically (between `Input` and `Link`):

```json
  "Kbd": {
    "tier": "primitive",
    "cluster": "Display",
    "composes": [],
    "composedBy": [
      "TopBar"
    ]
  },
```

Also update `TopBar`'s `composes` to include `Kbd`:

```json
  "TopBar": {
    "tier": "composition",
    "cluster": "Navigation",
    "composes": [
      "Button",
      "Kbd"
    ],
    "composedBy": []
  }
```

### `src/_meta/manifest.ts`

If this file mirrors the JSON, add the same Kbd entry. Read the file first to confirm structure — match the existing pattern exactly.

Run: `cd packages/design-system && npm run typecheck`
Expected: PASS.

- [ ] Commit `Kbd: barrel + manifest`.

---

## Task 5: Migrate TopBar.Search to consume `<Kbd>`

**Files:**

- Modify: `packages/design-system/src/components/TopBar/TopBarSearch.tsx`
- Modify: `packages/design-system/src/components/TopBar/TopBar.module.scss`
- Modify: `packages/design-system/src/components/TopBar/TopBar.tokens.scss`
- Modify: `packages/design-system/src/components/TopBar/TopBar.test.tsx`

### `TopBarSearch.tsx`

Change the `hotkey` prop type from `ReactNode` to `string | string[]`. Render via `<Kbd>` with `size="sm"`:

```tsx
import { Kbd } from '../Kbd';
// …drop the ReactNode import if no other use; keep otherwise.

export interface TopBarSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Optional hotkey hint shown after the input. Pass an array of key labels
   * (`['⌘', 'K']`) or a single string (`'⌘K'` is interpreted as one key —
   * use an array for multi-key combos). Omit for no hint. Rendered via
   * `<Kbd size="sm">`.
   *
   * **Visual hint only** — TopBar.Search does NOT bind any keyboard
   * shortcut to focus the input. The host app wires the shortcut.
   */
  hotkey?: string | string[];
  className?: string;
}

// …in the JSX:
{
  hotkey != null && <Kbd keys={Array.isArray(hotkey) ? hotkey : [hotkey]} size="sm" />;
}
```

Drop the old `<kbd aria-hidden className={styles.searchKbd}>…</kbd>` JSX. Drop the JSDoc references to `ReactNode` for hotkey. Update the `@example` blocks to use the array form.

### `TopBar.module.scss`

Delete the `.searchKbd` block entirely. Verify no other selector references it.

### `TopBar.tokens.scss`

Delete all five `--topbar-search-kbd-*` token lines:

- `--topbar-search-kbd-bg`
- `--topbar-search-kbd-fg`
- `--topbar-search-kbd-radius`
- `--topbar-search-kbd-padding-x`
- `--topbar-search-kbd-font-size`

### `TopBar.test.tsx`

Find any test asserting on `.searchKbd` class or the inline kbd rendering and rewrite to assert on `<Kbd>` (which renders a wrapper `<span class="kbd kbdSizeSm">` containing a `<kbd>`). Pattern:

```tsx
it('renders a Kbd when hotkey is provided', () => {
  const { container } = render(<TopBar.Search hotkey={['⌘', 'K']} />);
  // The Kbd wrapper carries aria-label; find it that way (decouples from class names).
  expect(screen.getByLabelText('⌘ + K')).toBeInTheDocument();
});

it('accepts a single-string hotkey', () => {
  render(<TopBar.Search hotkey="⌘K" />);
  expect(screen.getByLabelText('⌘K')).toBeInTheDocument();
});
```

Run: `cd packages/design-system && npm test`
Expected: 2150 + 12 (new Kbd) + adjusted TopBar tests = full suite passing.

- [ ] Commit `TopBar.Search: render hotkey via <Kbd>; drop dead tokens`.

---

## Task 6: Playground demo

**File:** `packages/playground/src/pages/components/KbdDemo.tsx`

Follow the structure of existing demos (`CodeDemo.tsx`, `BadgeDemo.tsx`). Sections:

1. **Single key** — `<Kbd keys={['Esc']} />`, `<Kbd keys={['Enter']} />`, `<Kbd keys={['?']} />`
2. **Two-key combo** — `<Kbd keys={['⌘', 'K']} />`, `<Kbd keys={['Ctrl', 'C']} />`
3. **Three-key combo** — `<Kbd keys={['Ctrl', 'Shift', 'P']} />`, `<Kbd keys={['⌘', 'Shift', 'F']} />`
4. **Size variants** — sm and md side-by-side using `<Cluster>`
5. **Inline in prose** — a `<Text>` paragraph with a Kbd embedded: `Press <Kbd keys={['⌘', 'K']} /> to open the command palette.`
6. **Inside Tooltip** — `<Tooltip content={<>Save <Kbd keys={['⌘', 'S']} /></>}><Button>Save</Button></Tooltip>`
7. **Inside TopBar.Search** — show the canonical `<TopBar.Search hotkey={['⌘', 'K']} />` (wrapped in a `<TopBar>` for context)
8. **Custom aria-label** — `<Kbd keys={['⌘', 'K']} aria-label="Open command palette" />` with a note about the override

Use `@lib-source/Kbd/Kbd.tsx?raw` for source-display alongside each example, matching how other demos handle source viewing.

- [ ] Commit `Kbd: playground demo`.

---

## Task 7: Playground wiring

**Files:**

- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

### `App.tsx`

Add a route `/components/kbd` mapping to `KbdDemo`. Place it alphabetically (after `Input` / before `Link`).

### `AppShell.tsx`

Add the sidebar nav entry. In the `componentGroups` array, find the `Display` group (or the same group where `Code` and `Badge` live) and insert:

```tsx
{ to: '/components/kbd', label: 'Kbd', icon: Command, end: false },
```

Use a `Command` icon from `lucide-react` (the four-corners symbol is the canonical "keyboard shortcut" glyph).

### `ComponentsIndex.tsx`

Add an overview card for Kbd, matching the existing pattern (icon + name + one-line description).

### `mockups/registry.ts`

Add `'Kbd'` to the `ComponentName` union alphabetically.

Run: `make build`
Expected: PASS.

- [ ] Commit `Kbd: playground routes + nav + index card`.

---

## Task 8: Update existing callers to array-form hotkey

**Files:**

- Modify: `packages/playground/src/pages/components/TopBarDemo.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`

Replace every `hotkey="⌘K"` with `hotkey={['⌘', 'K']}` (or whatever the literal keys are — check each callsite). Both the demo and the AppShell currently use `"⌘K"`.

Run: `make build`
Expected: PASS.

- [ ] Commit `Adopt Kbd: array-form hotkey in TopBar.Search callers`.

---

## Task 9: AGENTS.md catalog entry

**File:** `packages/design-system/AGENTS.md`

Insert a new section for `Kbd` after the `Code` entry (alphabetical) or after the `Input` entry — match wherever it falls in the existing alphabetic ordering. Use the same shape as neighboring entries:

````markdown
### `Kbd`

Inline keyboard-shortcut display: one `<kbd>` chip per key, joined with a faint `+` separator. Use for shortcut hints in tooltips, command palettes, search inputs, and help/shortcut sheets.

```tsx
<Kbd keys={['⌘', 'K']} />
<Kbd keys={['Ctrl', 'Shift', 'P']} size="md" />
<Kbd keys={['Esc']} />
```

- `keys: string[]` — one chip per entry. Pass the literal labels you want shown — Kbd does NOT translate `Cmd` → `⌘` on macOS. App layer decides.
- `size: 'sm' | 'md'` — `sm` (default, 18px tall) matches `TopBar.Search`. `md` (24px) for standalone shortcut sheets.
- Wrapper carries `aria-label = keys.join(' + ')` (override via prop); inner `<kbd>` and `+` separator are `aria-hidden`.

**When NOT to use:** for inline code use `<Code>`; for chip-shaped text labels use `<Badge>`. `<kbd>` implies keyboard input semantically.
````

- [ ] Commit `Docs: Kbd in AGENTS.md`.

---

## Task 10: Library hr8 review-fix loop

Hard rule 8: before pushing library changes, run the review-fix cycle.

1. Run gates:
   ```bash
   cd packages/design-system && npm test && npm run typecheck && npm run lint:css && npm run build && npm pack --dry-run -w @eocrm/design-system
   ```
   All must pass before review.

2. Dispatch a fresh-context `general-purpose` reviewer. Prompt:

   > Review the `feat/kbd-component` branch in `/Users/dpws/projects/design-system`. Read `packages/design-system/CLAUDE.md`, `AGENTS.md`, and `README.md` first to learn the rules. Focus on `packages/design-system/src/components/Kbd/**`, the TopBar migration (`TopBarSearch.tsx`, `TopBar.tokens.scss`, `TopBar.module.scss`, `TopBar.test.tsx`), and the manifests/exports.
   >
   > Categories: (1) bugs, (2) a11y, (3) API inconsistencies, (4) type safety, (5) Hard-rule violations (rules 1–7), (6) test coverage gaps, (7) token discipline (no raw values; no dead tokens), (8) SCSS hygiene, (9) cross-package leakage, (10) package/distribution (tarball, exports, JSDoc completeness).
   >
   > Output: Critical / Important / Nice-to-have / Regression-watch + a final verdict `clean enough to stop` or `keep iterating`.

3. Fix every Critical + Important. Document any deliberate skips one-line.
4. Re-run gates.
5. Re-review until `clean enough to stop`.

- [ ] Commit `Kbd hr8 review pass N: <summary>` per pass.

---

## Task 11: Push + PR

```bash
git push -u origin feat/kbd-component
gh pr create --title "Kbd: keyboard-shortcut chip primitive (sm/md) + TopBar.Search migration" --body "<summary>"
```

PR body sections (Summary / Implementation notes / Test plan) — model after the TopBar PR (#94).

- [ ] Open PR. Report URL.
