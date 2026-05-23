# Textarea — design spec

**Date:** 2026-05-23
**Branch:** `feat/textarea`
**Scope:** New `<Textarea>` component for `@eocrm/design-system` — multi-line text input matching `<Input>`'s API surface plus auto-grow, configurable resize handle, and an optional character counter.

## Goal

Provide the dumb multi-line companion to `<Input>`. Same JSDoc + a11y conventions (`invalid` + `aria-invalid`, autofill blocking, forwardRef + spread). Three additions Input doesn't need: auto-grow height clamped by `minRows`/`maxRows`, a `resize` direction prop, and an optional character counter that renders below the field when `maxLength` is set or `showCount` is true.

## Why now

- The CRM has multiple open-coded `<textarea>` usages (notes fields, ticket descriptions, comment composers). They're inconsistent: some have fixed rows, some auto-grow with hand-rolled hooks, none share styling with the rest of the forms.
- Auto-grow is the dominant pattern in modern textareas (Slack composer, GitHub PR body, Linear comment box). Building it once in the design system saves every consumer from reimplementing the `scrollHeight` measurement dance.
- Without a shipped Textarea, the playground's component grid has an obvious gap right next to Input. AGENTS.md anti-patterns for Input already direct users to "use Textarea" — a primitive we never shipped.

## Non-goals (v1)

- **No rich text editing.** No bold/italic, no markdown preview, no mentions, no syntax highlighting. That's `RichTextEditor` (out of scope, no current plan).
- **No autocomplete-from-list.** Suggestions ("type @ to mention…", emoji autocomplete) belong to a different primitive.
- **No threshold warnings on the counter.** No orange-at-90%, red-at-100%. The counter is one muted color; consumers who want color thresholds can compose externally.
- **No polymorphism (`as` prop).** Textarea is always `<textarea>`.
- **No image / file paste handling.** Native paste events fire on the textarea; consumers wire onPaste themselves if they want it.
- **No "soft" max-length** (counter shows, but native attribute also blocks input past it). v1 only respects native `maxLength` behavior — if a consumer wants soft enforcement they manage it in their onChange.
- **No min-content height adjustment for resize handle interactions.** When `resize='vertical'` and `autoGrow={false}`, the user can drag the field to any height. That's native behavior; we don't intervene.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep) for className composition
- Existing tokens: `--border-width`, `--color-border-strong`, `--color-border`, `--radius-md`, `--color-bg`, `--color-bg-subtle`, `--color-fg`, `--color-fg-subtle`, `--color-fg-muted`, `--color-accent`, `--color-danger`, `--ring-accent`, `--ring-danger`, `--ring-width`, `--line-height-normal`, `--font-size-sm`/`--font-size-md`/`--font-size-lg`, `--space-1`/`--space-2`/`--space-3`, `--transition-fast`

No new tokens needed. Auto-grow math reads `line-height`, `padding-top/bottom`, `border-top/bottom-width` from computed style at runtime — those are derived from the tokens above plus the size variant.

### File layout

```
packages/design-system/src/components/Textarea/
  Textarea.tsx          ← forwardRef + spread + useLayoutEffect (auto-grow) + internal state branch (counter)
  Textarea.module.scss  ← wrapper / textarea / size variants / resize variants / invalid / counter
  Textarea.test.tsx     ← ~20 cases
  index.ts              ← export { Textarea }, type re-exports
```

Plus standard integration points:

- `packages/design-system/src/index.ts` — re-export `Textarea`, `TextareaProps`, `TextareaSize`, `TextareaResize`
- `packages/design-system/AGENTS.md` — TL;DR slot directly after `<Input>` section
- `packages/playground/src/pages/components/TextareaDemo.tsx` — 7-example demo
- `packages/playground/src/App.tsx` — route at `/components/textarea`
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entry in the **Forms** group, last alphabetically (after `Select`, since "T" follows "S")
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card with a 2-row preview textarea
- `packages/playground/src/pages/mockups/registry.ts` — `'Textarea'` in `ComponentName` union

### Composition

```
        <Textarea {...props} ref={consumerRef} />
                          │
                          ▼
                   <div .wrapper>
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
        <textarea>              <span .counter aria-live="polite">
        (consumerRef)             "120 / 500"
        ┌────────────┐            (only when shouldShowCount)
        │ measured + │
        │ resized via│
        │ useLayout- │
        │ Effect     │
        └────────────┘
```

Always a wrapper. ref points at the `<textarea>`, not the wrapper. Counter renders conditionally inside the wrapper.

## Public API

```ts
import type { TextareaHTMLAttributes } from 'react';

/** Field typography + padding scale. Pairs with Input's `size`. */
export type TextareaSize = 'sm' | 'md' | 'lg';

/** User-drag resize handle direction. Maps to CSS `resize` property. */
export type TextareaResize = 'none' | 'vertical' | 'both';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'rows'> {
  /**
   * Toggles the error visual (red border + danger focus ring) and sets
   * `aria-invalid="true"`. Pair with a visible error message and an
   * `aria-describedby` pointer at the message id.
   */
  invalid?: boolean;

  /**
   * Visual size. Defaults to `'md'`.
   * - `'sm'` — tighter padding + `--font-size-sm`. Used in dense forms.
   * - `'md'` — default padding + `--font-size-md`. Most form contexts.
   * - `'lg'` — same padding as md but `--font-size-lg`. Hero / focus textareas.
   *
   * Unlike Input, the size prop does NOT affect height — the textarea
   * height comes from `minRows` (and `maxRows` if capped). Size only
   * controls typography and padding.
   *
   * Shadowing note: this collapses the native HTML `<textarea size>`
   * attribute (which Omit already drops from the props type). Use
   * `style={{ width }}` or a parent container for explicit width.
   */
  size?: TextareaSize;

  /**
   * Block browser autofill AND password managers from offering to fill
   * this textarea. Same heuristic and prop shape as Input — see Input's
   * JSDoc for the full set of opt-out attributes applied.
   *
   * Smart default: when omitted, block iff `autoComplete` is also omitted
   * (or `'off'`). Pass `true`/`false` to override the heuristic.
   */
  disableAutofill?: boolean;

  /**
   * Minimum visible rows. The textarea will never render shorter than this,
   * regardless of content. Default: `3`.
   *
   * Implementation: contributes `lineHeight × minRows + paddingY + borderY`
   * as a height floor in the auto-grow effect, AND seeds the `rows`
   * attribute on the underlying `<textarea>` so SSR / no-JS users get a
   * sensible initial height.
   */
  minRows?: number;

  /**
   * Maximum visible rows. Beyond this, content scrolls inside the field
   * instead of expanding further. Default: `undefined` (unbounded growth).
   *
   * Only meaningful when `autoGrow` is true.
   */
  maxRows?: number;

  /**
   * When true, height adapts to content between `minRows` and `maxRows`.
   * Default: `true`.
   *
   * When false, height is locked at `minRows`'s height and a scrollbar
   * appears when content overflows — equivalent to a stock `<textarea rows={minRows}>`.
   */
  autoGrow?: boolean;

  /**
   * User-drag resize handle direction. Default: `'vertical'`.
   *
   * **Forced to `'none'`** when `autoGrow` is `true` — user-drag fights the
   * auto-grow measurement and produces erratic behavior. Consumers who
   * want both must pick: set `autoGrow={false}` to enable a resize handle,
   * or accept `'none'` while auto-grow is on.
   */
  resize?: TextareaResize;

  /**
   * Show the character counter (`${value.length}` or
   * `${value.length} / ${maxLength}` when both are set).
   *
   * Default: `true` when `maxLength` is set, `false` otherwise.
   *
   * The counter renders as a `<span aria-live="polite" aria-atomic="true">`
   * inside the wrapper, below the textarea. It updates on every input,
   * works for both controlled and uncontrolled textareas (the component
   * keeps an internal value mirror for the uncontrolled case).
   */
  showCount?: boolean;
}
```

**Native attrs spread to `<textarea>`:** all of `TextareaHTMLAttributes` minus `size` (shadowed) and `rows` (computed from `minRows`). That includes `value`, `defaultValue`, `placeholder`, `disabled`, `readOnly`, `required`, `name`, `id`, `aria-*`, `data-*`, `maxLength`, `minLength`, `onChange`, `onInput`, `onFocus`, `onBlur`, `onPaste`, etc.

**Spread order — Pattern A (consumer wins):**

```tsx
<textarea
  ref={setRefs}
  rows={minRows}
  aria-invalid={invalid || undefined}
  {...(blockAutofill ? AUTOFILL_DISABLED_PROPS : {})}
  {...props}
  onChange={handleChange}  // wraps consumer's onChange to keep counter in sync
  className={clsx(styles.textarea, sizeClass, resizeClass, invalid && styles.invalid, className)}
/>
```

Notes on the spread:
- `ref={setRefs}` — ref is not a regular prop in React, so spread order doesn't affect it. The internal handler updates the local ref (for measurement) and forwards to the consumer's ref via the merger.
- `rows={minRows}` before `{...props}` — consumer's literal `rows` is `Omit`-stripped from the props type, so nothing in `props` overrides this anyway. The attribute is here for SSR / no-JS rendering.
- `aria-invalid` before `{...props}` — consumer could pass `aria-invalid={false}` to override. That's Pattern A (consumer wins), matching Input.
- Autofill block before `{...props}` so consumer's explicit `autoComplete` overrides.
- `onChange={handleChange}` AFTER `{...props}` — we deliberately want our wrapper to win, because we need to keep the internal value mirror (and therefore the counter + auto-grow) in sync. `handleChange` calls the consumer's `onChange` internally, so nothing is lost.
- `className={...}` after props so the composed clsx string wins (Input uses the same approach).

## Architecture flow

### Auto-grow

```tsx
const textareaRef = useRef<HTMLTextAreaElement | null>(null);

const setRefs = useCallback(
  (node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  },
  [ref]
);

useLayoutEffect(() => {
  if (!autoGrow) return;
  const el = textareaRef.current;
  if (!el) return;

  // Reset to 'auto' first so scrollHeight reflects content, not the previous height.
  el.style.height = 'auto';

  const computed = window.getComputedStyle(el);
  const lineHeight = parseFloat(computed.lineHeight);
  const paddingY =
    parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom);
  const borderY =
    parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth);

  const minHeight = lineHeight * minRows + paddingY + borderY;
  const maxHeight =
    maxRows !== undefined
      ? lineHeight * maxRows + paddingY + borderY
      : Infinity;

  // `scrollHeight` already includes padding (box-sizing matters here:
  // border-box totals include border but typically scrollHeight does not
  // — adding borderY normalizes).
  const desired = el.scrollHeight + borderY;
  const target = Math.min(Math.max(desired, minHeight), maxHeight);
  el.style.height = `${target}px`;
  el.style.overflowY = desired > maxHeight ? 'auto' : 'hidden';
}, [currentValue, autoGrow, minRows, maxRows, size]);
```

**Why `useLayoutEffect`:** synchronous before paint — prevents a one-frame flicker between the old height and the new height. `useEffect` would let the user see the stale height for a frame.

**Why reset to `'auto'` first:** without it, `scrollHeight` returns the current rendered height, which already includes any height we set. Setting `'auto'` lets the browser collapse to the content's natural minimum before we re-measure.

**Dependency array:** `currentValue` (the merged controlled/uncontrolled value), `autoGrow`, `minRows`, `maxRows`, `size`. We deliberately do NOT depend on every prop — only the inputs that change the math.

**SSR-safe:** the effect doesn't run on the server. The textarea renders with `rows={minRows}` so the initial server-rendered HTML has a sensible height; the client effect re-measures after hydration.

### Counter + internal value mirror

```tsx
const [internalValue, setInternalValue] = useState<string>(() =>
  typeof defaultValue === 'string' ? defaultValue : ''
);
const isControlled = value !== undefined;
const currentValue = isControlled ? String(value) : internalValue;

const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
  if (!isControlled) setInternalValue(e.target.value);
  onChange?.(e);
};

const shouldShowCount = showCount ?? maxLength !== undefined;
```

**Why an internal mirror:** the counter and the auto-grow effect both need a reactive "current value" to recompute on. For controlled mode, `value` already is reactive — we just use it. For uncontrolled mode, we'd otherwise have to read `el.value` imperatively, which doesn't trigger re-renders and would leave the counter stale. The internal mirror covers the uncontrolled path without complicating the controlled one.

**Edge case — switching between controlled and uncontrolled:** if a consumer starts with `value={undefined}` then later passes `value="x"`, React already warns. The mirror's `internalValue` would diverge from `value` but `currentValue` correctly switches over because `isControlled` flips. No bespoke handling needed.

**Counter rendering:**

```tsx
{shouldShowCount && (
  <span className={styles.counter} aria-live="polite" aria-atomic="true">
    {currentValue.length}
    {maxLength !== undefined && ` / ${maxLength}`}
  </span>
)}
```

**aria-atomic="true"** — the whole count is re-announced as a unit, not just the changed digit (otherwise SRs might say "1" instead of "121").

### Resize-handle / auto-grow interaction

```tsx
const effectiveResize: TextareaResize = autoGrow ? 'none' : (resize ?? 'vertical');
```

Forcing `'none'` when auto-grow is on prevents the user-drag from desyncing with the `scrollHeight` measurement. If the user wants a draggable handle, they opt out of auto-grow.

This is invisible to the consumer's API — they pass `resize="vertical"` and `autoGrow={true}` and the resize silently becomes `'none'` at render time. Documented in the `resize` prop's JSDoc.

## Styling — `Textarea.module.scss`

```scss
.wrapper {
  width: 100%;
  display: block;
}

.textarea {
  display: block;
  width: 100%;
  border: var(--border-width) solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: inherit;
  line-height: var(--line-height-normal);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);

  &::placeholder {
    color: var(--color-fg-subtle);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 var(--ring-width) var(--ring-accent);
  }

  &:disabled {
    background: var(--color-bg-subtle);
    border-color: var(--color-border);
    color: var(--color-fg-subtle);
    cursor: not-allowed;
  }

  &[readonly] {
    background: var(--color-bg-subtle);
  }
}

// Size — typography + padding. NO height (textarea height comes from rows + autoGrow).
.sizeSm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-sm);
}
.sizeMd {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-md);
}
.sizeLg {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-lg);
}

// Resize direction
.resizeNone     { resize: none; }
.resizeVertical { resize: vertical; }
.resizeBoth     { resize: both; }

.invalid {
  border-color: var(--color-danger);

  &:focus-visible {
    border-color: var(--color-danger);
    box-shadow: 0 0 0 var(--ring-width) var(--ring-danger);
  }
}

// Counter — non-intrusive, right-aligned, muted.
.counter {
  display: block;
  text-align: right;
  margin-top: var(--space-1);
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
  line-height: 1;
}
```

**Rule 4 check:**
- `.wrapper` and `.textarea` get only intrinsic dimensions (`width: 100%` / `display: block`), no layout.
- `.counter` has `margin-top: var(--space-1)` — that's INTERNAL spacing between a wrapper-child and the textarea above it, not a layout property at the component boundary. Stylelint's `property-disallowed-list` may flag it. If so, the line gets an inline `/* stylelint-disable-next-line property-disallowed-list -- internal spacing between textarea and its counter child */` comment.

**Tokens used:** only the existing set listed under Architecture / Dependencies.

## ARIA + behavior reference

| Concern | Behavior |
|---|---|
| Invalid state | `aria-invalid="true"` on the textarea, red border + danger focus ring via SCSS |
| Label association | Consumer wraps in `<label>` or uses `htmlFor` + `id` — Textarea forwards `id`. No built-in label |
| Counter announcement | `<span aria-live="polite" aria-atomic="true">` — polite (not interruptive); atomic so the whole string re-announces |
| Disabled | Native `disabled` attribute; CSS `:disabled` selectors handle visual |
| Read-only | Native `readOnly`; CSS `[readonly]` selector handles visual (subtle bg, still focusable) |
| Focus management | None — native focus on the textarea is enough. The wrapper div has no role |
| Autofill | Smart default identical to Input: block iff no autoComplete hint; explicit `disableAutofill` overrides |
| Spread order | Pattern A (consumer wins) — matches Input |
| Ref target | The `<textarea>` element, NOT the wrapper. Consumers can call `.focus()`, set `.value` directly, scroll, etc. |

## Testing

`Textarea.test.tsx` — ~20 cases, RTL + userEvent.

### Baseline parity with Input

1. Renders without crashing with default props
2. Defaults to `size='md'` class
3. `size='sm'` and `size='lg'` apply the right class
4. `invalid={true}` adds the invalid class AND sets `aria-invalid="true"`
5. `invalid={false}` (or omitted) does NOT set `aria-invalid`
6. `disableAutofill` smart default: blocks when no autoComplete, allows when autoComplete is set to a meaningful value
7. `disableAutofill={true}` force-blocks even with autoComplete set
8. `ref` forwards to the `<textarea>` element (not the wrapper) — `expect(ref.current?.tagName).toBe('TEXTAREA')`
9. `className` is merged with the internal classes, not replaced
10. Controlled: `value` + `onChange` round-trip; the consumer's onChange fires with each keystroke
11. Uncontrolled: typing into a `defaultValue` textarea updates the visible content (no onChange required)

### Textarea-specific

12. `minRows={5}` results in the textarea's inline `rows` attribute being `5`
13. `autoGrow={true}` (default) — typing more content increases the inline `style.height`. Mock `scrollHeight` getter via `Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', { get: () => 200, configurable: true })`. Assert `style.height` advances.
14. `autoGrow={false}` — typing more content does NOT change the inline `style.height` (remains empty / unset)
15. `maxRows={3}` clamps the auto-grow height; the textarea gets `overflowY: 'auto'` when content overflows. Verify by mocking scrollHeight beyond the ceiling.
16. `resize='vertical'` (default when no autoGrow) applies `.resizeVertical`. With `autoGrow={true}` AND `resize='vertical'`, the rendered class is `.resizeNone` (forced).
17. `resize='both'` applies `.resizeBoth` when `autoGrow={false}`.
18. `maxLength={140}` automatically shows the counter with format `${len} / 140`. Initial render shows `0 / 140`. Typing updates it.
19. `showCount={true}` without `maxLength` shows just the bare count number, no `/ N`.
20. `showCount={false}` with `maxLength` set still hides the counter (explicit opt-out wins).
21. Counter is absent when neither `maxLength` nor `showCount` is set.
22. Counter has `aria-live="polite"` and `aria-atomic="true"`.

### Vitest gotchas

- `useLayoutEffect` runs synchronously under React 19 + jsdom, no `act()` needed beyond what RTL provides.
- `getComputedStyle` in jsdom returns real values for properties that come from inline style or matching stylesheets — `line-height` from `--line-height-normal` will be the computed pixel value as long as the SCSS is loaded.
- `scrollHeight` in jsdom defaults to `0`. For auto-grow tests, stub it: `Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', { configurable: true, get: () => 200 })` in a `beforeAll` + restore in `afterAll`.
- Counter test for uncontrolled: use `userEvent.type(textarea, 'hello')`, then `expect(screen.getByText('5 / 140')).toBeInTheDocument()` (or similar).

## Playground demo — `TextareaDemo.tsx`

7 examples grouped via `<Example>`:

1. **Default** — `<Textarea placeholder="Write something…" />`. Notes "auto-grows by default, 3 rows minimum, vertical resize disabled because of auto-grow".

2. **Three sizes** — `sm` / `md` / `lg` side by side. Same `minRows={2}`. Demonstrates typography + padding differences.

3. **Auto-grow in action** — controlled, `minRows={2}`, `maxRows={8}`. Hint text: "type multiple lines — the field grows up to 8 rows, then scrolls."

4. **Fixed rows (no auto-grow, with resize handle)** — `<Textarea autoGrow={false} minRows={4} resize="vertical" />`. Shows the drag-to-resize affordance.

5. **With counter (Twitter-style)** — `<Textarea maxLength={140} defaultValue="What's happening?" />`. Counter appears automatically.

6. **Explicit counter (no max)** — `<Textarea showCount minRows={3} />`. Bare count, no `/ N`.

7. **Invalid state + error message** — `<Textarea invalid aria-describedby="bio-error" />` with a `<p id="bio-error">Bio must not be empty.</p>` underneath.

8. **Disabled + readOnly** — `<Textarea disabled defaultValue="…" />` and `<Textarea readOnly defaultValue="…" />` side by side.

The viewport mount is irrelevant — Textarea is a flow element.

## AGENTS.md TL;DR slot

After `### <Input>`. Section title `### <Textarea>`. ~30-line block:

````markdown
### `<Textarea>` — multi-line text

The dumb multi-line companion to `<Input>`. Auto-grows by default; capped by `maxRows`. Optional character counter below the field.

```tsx
import { Textarea } from '@eocrm/design-system';

// Default — auto-grows, 3 min rows, no max.
<Textarea placeholder="Write something…" />

// With counter (Twitter-style).
<Textarea maxLength={140} defaultValue={value} onChange={(e) => setValue(e.target.value)} />

// Fixed rows + drag-to-resize.
<Textarea autoGrow={false} minRows={4} resize="vertical" />

// Capped growth.
<Textarea minRows={2} maxRows={8} />

// Error state.
<Textarea invalid aria-describedby="bio-error" />
<p id="bio-error">Bio is required.</p>
```

- **Auto-grow is on by default** (`autoGrow={true}`). When on, `resize` is forced to `'none'` because the two conflict.
- **Counter** shows automatically when `maxLength` is set. Force on with `showCount`, force off with `showCount={false}`.
- **Sizes** (`sm` / `md` / `lg`) affect typography + padding only, not height. Height comes from `minRows`.
- **Smart autofill blocking** — same heuristic as Input.

#### When NOT to use

- ❌ Single-line input → `<Input>`.
- ❌ Choosing from a fixed list → `<Select>`.
- ❌ Rich text editing (bold, lists, mentions) → no current primitive; defer to a `RichTextEditor` when one exists.
- ❌ Password fields → `<PasswordInput>`.

#### Anti-patterns

- ❌ Using `placeholder` as a label.
- ❌ Setting both `autoGrow={true}` and expecting `resize="vertical"` to render a drag handle — auto-grow wins; the handle is hidden.
- ❌ Building your own character counter outside the component when `maxLength`/`showCount` would do it.
````

## Hard Rule 8

The pre-push review-fix cycle on library changes is mandatory. Run gates (`make test`, `make build-lib`, `make build`, `make lint`, `npm pack --dry-run`), spawn a fresh-context reviewer with the standard Toast/ButtonGroup prompt, fix every Critical + Important, repeat until clean.

## Open questions

None. All clarifications baked in above.
