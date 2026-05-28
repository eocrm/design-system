# `<Kbd>` — keyboard shortcut primitive

## Goal

A small typographic primitive for rendering keyboard shortcuts: `⌘K`, `Ctrl + Shift + P`, `Esc`. Today the playground and the TopBar both hand-roll `<kbd>` elements with bespoke styling, and Tooltip's JSDoc says "include inline `<kbd>`" — meaning consumers need a styled `<kbd>` but the library doesn't ship one. Ship one.

After this lands, `<TopBar.Search hotkey>` consumes `<Kbd>` internally and the TopBar's own `--topbar-search-kbd-*` tokens + `.searchKbd` styles delete.

## Locked-in design decisions (brainstorm)

1. **API shape:** `keys` prop (always an array). One `<kbd>` per key, joined with a faint inline `+` separator. Single key = `keys={['Esc']}` (one box, no separator rendered).
2. **No platform translation:** consumer passes literal `⌘` vs `Ctrl`. Keeps the primitive SSR-safe and token-pure; a future helper hook can do the platform sniff at the application layer.
3. **Two sizes:** `sm` (default — matches TopBar chrome at 18px tall) and `md` (24px — command-palette feel, future Modal/Drawer use).
4. **Variant scope:** v1 ships only `sm` and `md` size. No tone variants. The chip is a neutral muted surface with subtle border, matching how browsers render native `<kbd>` but token-pure.

## Architecture

Single component, no compound API:

```tsx
<Kbd keys={['⌘', 'K']} />
<Kbd keys={['Ctrl', 'Shift', 'P']} size="md" />
<Kbd keys={['Esc']} />
```

Renders:

```html
<!-- keys={['⌘', 'K']} -->
<span class="kbd kbdSizeSm">
  <kbd class="key">⌘</kbd>
  <span class="separator" aria-hidden>+</span>
  <kbd class="key">K</kbd>
</span>

<!-- keys={['Esc']} (single key — no separator) -->
<span class="kbd kbdSizeSm">
  <kbd class="key">Esc</kbd>
</span>
```

The outer `<span>` is a group wrapper so consumers can drop the whole shortcut inline in prose without breaking flow. The `<kbd>` elements stay semantically correct one-per-key.

### Why a wrapper `<span>` instead of just rendering siblings?

A wrapper gives us:

- One stable element for refs and `className` merge
- An accessible-name pivot point: the wrapper carries `aria-label` (e.g. `"Command + K"`) and the inner `<kbd>` + separator are `aria-hidden` so screen readers don't read "K B D Command K B D K". This matches Adobe Spectrum, Primer, and Reakit conventions.
- A predictable layout box (`display: inline-flex`) so the chip-row never breaks across lines mid-shortcut.

### Accessibility

- Wrapper `<span>` carries `aria-label` defaulting to `keys.join(' + ')` (e.g. `"⌘ + K"` or `"Ctrl + Shift + P"`). Consumer can override via prop.
- Individual `<kbd>` elements are `aria-hidden="true"` to avoid double-reading.
- The `+` separator is `<span aria-hidden="true">+</span>` (plain text, not a `<kbd>`).

## Props

```ts
export type KbdSize = 'sm' | 'md';

export interface KbdProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label'> {
  /**
   * Keys to display. Each entry renders one `<kbd>` box. Multiple entries
   * are joined with an inline `+` separator. Pass the literal label you want
   * shown (`'⌘'`, `'Ctrl'`, `'Shift'`, `'K'`); the component does not
   * platform-translate.
   */
  keys: string[];
  /**
   * Visual size. `'sm'` is the inline-chrome size (18px tall, matches
   * `TopBar.Search`'s hotkey hint). `'md'` is the standalone shortcut size
   * (24px tall, for command-palette / shortcut-sheet UI).
   * @default 'sm'
   */
  size?: KbdSize;
  /**
   * Accessible label for the whole shortcut. Defaults to `keys.join(' + ')`.
   * Override when the raw keys are unintuitive — e.g. `keys={['⌘', 'K']}`
   * with `aria-label="Open command palette"`.
   */
  'aria-label'?: string;
}
```

Rule-7 spread choice: **Pattern B (props first)** — the component's semantic ARIA contract (the aria-label fallback + aria-hidden on children) must survive a careless `{...props}`. Same choice as Avatar and Tabs.

## Tokens

`packages/design-system/src/components/Kbd/Kbd.tokens.scss`:

```scss
:root {
  // ─── Chip surface ──────────────────────────────────────────────────────
  --kbd-bg: var(--color-bg-muted);
  --kbd-fg: var(--color-fg-muted);
  --kbd-border-color: var(--color-border);
  --kbd-border-width: var(--border-width);
  --kbd-radius: var(--radius-sm);
  --kbd-font-family: var(--font-family-sans);
  --kbd-font-weight: var(--font-weight-medium);

  // ─── Separator (+ between keys) ────────────────────────────────────────
  --kbd-separator-fg: var(--color-fg-muted);
  --kbd-separator-gap: var(--space-1);

  // ─── Size: sm (matches TopBar chrome) ──────────────────────────────────
  --kbd-height-sm: 18px;
  --kbd-padding-x-sm: var(--space-1);
  --kbd-font-size-sm: var(--font-size-xs);
  --kbd-min-width-sm: 18px; // single-char keys ('K') stay square

  // ─── Size: md (command-palette feel) ───────────────────────────────────
  --kbd-height-md: 24px;
  --kbd-padding-x-md: var(--space-2);
  --kbd-font-size-md: var(--font-size-sm);
  --kbd-min-width-md: 24px;
}
```

## Styles

`packages/design-system/src/components/Kbd/Kbd.module.scss`:

```scss
@use './Kbd.tokens';

.kbd {
  display: inline-flex;
  align-items: center;
  gap: var(--kbd-separator-gap);
  vertical-align: baseline;
}

.key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--kbd-padding-x-current);
  height: var(--kbd-height-current);
  min-width: var(--kbd-min-width-current);
  font-family: var(--kbd-font-family);
  font-size: var(--kbd-font-size-current);
  font-weight: var(--kbd-font-weight);
  color: var(--kbd-fg);
  background: var(--kbd-bg);
  border: var(--kbd-border-width) solid var(--kbd-border-color);
  border-radius: var(--kbd-radius);
  line-height: var(--line-height-none);
}

.separator {
  color: var(--kbd-separator-fg);
  font-size: var(--kbd-font-size-current);
  user-select: none;
}

// Size variants set the per-size token bindings ONCE on the wrapper so the
// .key + .separator children resolve via cascading `--kbd-*-current`.
.kbdSizeSm {
  --kbd-height-current: var(--kbd-height-sm);
  --kbd-padding-x-current: var(--kbd-padding-x-sm);
  --kbd-font-size-current: var(--kbd-font-size-sm);
  --kbd-min-width-current: var(--kbd-min-width-sm);
}

.kbdSizeMd {
  --kbd-height-current: var(--kbd-height-md);
  --kbd-padding-x-current: var(--kbd-padding-x-md);
  --kbd-font-size-current: var(--kbd-font-size-md);
  --kbd-min-width-current: var(--kbd-min-width-md);
}
```

Hard rule 4: the component owns its own inline `padding`, `height`, `min-width` — these are intrinsic chip dimensions, not layout positioning, so they're fine inside the component (same as Badge, Button, Code). It does NOT own `margin` / `position` / `top|left|right|bottom`.

## Files

| File                                                                       | Role                                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/design-system/src/components/Kbd/Kbd.tsx` (NEW)                  | Root component (forwardRef + spread)                                       |
| `packages/design-system/src/components/Kbd/Kbd.module.scss` (NEW)          | All visual styles                                                          |
| `packages/design-system/src/components/Kbd/Kbd.tokens.scss` (NEW)          | Component tokens                                                           |
| `packages/design-system/src/components/Kbd/Kbd.test.tsx` (NEW)             | Unit tests                                                                 |
| `packages/design-system/src/components/Kbd/index.ts` (NEW)                 | Public exports                                                             |
| `packages/design-system/src/index.ts` (MODIFY)                             | Re-export Kbd + KbdProps + KbdSize                                         |
| `packages/design-system/src/components.manifest.json` (MODIFY)             | Register under Display cluster                                             |
| `packages/design-system/src/_meta/manifest.ts` (MODIFY)                    | Mirror manifest entry                                                      |
| `packages/design-system/AGENTS.md` (MODIFY)                                | Catalog entry after Code                                                   |
| `packages/design-system/src/components/TopBar/TopBarSearch.tsx` (MODIFY)   | Replace inline `<kbd>` with `<Kbd>`; hotkey prop type `string \| string[]` |
| `packages/design-system/src/components/TopBar/TopBar.module.scss` (MODIFY) | Drop `.searchKbd` selector                                                 |
| `packages/design-system/src/components/TopBar/TopBar.tokens.scss` (MODIFY) | Drop `--topbar-search-kbd-*` tokens                                        |
| `packages/design-system/src/components/TopBar/TopBar.test.tsx` (MODIFY)    | Adjust hotkey test (now `<Kbd>` element)                                   |
| `packages/playground/src/pages/components/KbdDemo.tsx` (NEW)               | Demo page                                                                  |
| `packages/playground/src/pages/components/TopBarDemo.tsx` (MODIFY)         | `hotkey="⌘K"` → `hotkey={['⌘', 'K']}`                                      |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY)            | Same hotkey-array update                                                   |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` (MODIFY)    | Kbd overview card                                                          |
| `packages/playground/src/App.tsx` (MODIFY)                                 | Route `/components/kbd`                                                    |
| `packages/playground/src/layout/AppShell/AppShell.tsx` (MODIFY)            | Sidebar nav entry for `/components/kbd`                                    |
| `packages/playground/src/pages/mockups/registry.ts` (MODIFY)               | Add `'Kbd'` to ComponentName union                                         |

## i18n

No new i18n keys. The component renders consumer-provided strings only. The default `aria-label` is constructed from those strings (`keys.join(' + ')`), and `'+'` is symbolic, not translatable.

## Tests (`Kbd.test.tsx` minimum)

- Renders one `<kbd>` per element in `keys`
- Renders the `+` separator between adjacent keys (n − 1 separators for n keys)
- Single-key (`keys={['Esc']}`) renders no separator
- `size="sm"` applies the `.kbdSizeSm` class; `size="md"` applies `.kbdSizeMd`; default is `sm`
- Default `aria-label` equals `keys.join(' + ')`
- Custom `aria-label` overrides default
- Inner `<kbd>` elements are `aria-hidden="true"`
- Separator is `aria-hidden="true"`
- `ref` is forwarded to the wrapper `<span>`
- `className` merges with `.kbd`
- Inner `<kbd>` chips remain `aria-hidden="true"` regardless of consumer-passed wrapper props (already covered by the inner-aria-hidden test above)

## Demo page outline

`KbdDemo.tsx` shows:

1. Single key (`Esc`)
2. Two-key combo (`⌘K`)
3. Three-key combo (`Ctrl + Shift + P`)
4. Both sizes side-by-side (sm vs md)
5. Inline in prose: `"Press <Kbd keys={['⌘', 'K']} /> to open the command palette."`
6. Inside a `<Tooltip>` body (showing the canonical Tooltip+Kbd composition)
7. Inside `<TopBar.Search hotkey={['⌘', 'K']} />` (the canonical integration)
8. Custom aria-label override

## When NOT to use (anti-patterns for JSDoc `@remarks`)

- **Not for inline code.** `<kbd>` is for keyboard input; `<code>` (the library's `<Code>` component) is for code identifiers. `Press <Kbd keys={['Enter']}>` not `Run <Kbd keys={['npm install']}>`.
- **Not for arbitrary text decoration.** If you want a small chip-shaped label, use `<Badge>`, not `<Kbd>`. The semantic `<kbd>` element implies keyboard input.
- **Don't platform-translate inside the keys array.** Pass what you want shown. Apps that want `Cmd` on macOS and `Ctrl` elsewhere should branch at the application layer: `const mod = isMac ? '⌘' : 'Ctrl'`.
- **Don't nest a `<Kbd>` inside a button as its label.** Use `aria-label` on the button instead. `<button><Kbd keys={['?']} /></button>` is wrong; `<button aria-label="Help" />` with a separate hint is right.

## Out of scope (v1)

- Platform sniff helper (`useShortcut('mod+k')` style hook) — deferred
- Tone variants (info/danger/etc.) — chips are neutral chrome only
- Animations on key-press (`active` state pulses) — deferred until a consumer asks
- `size="lg"` — only sm + md ship; lg if a need surfaces
