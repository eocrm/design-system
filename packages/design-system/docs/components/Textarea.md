# `<Textarea>` — multi-line text

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

<!-- props:start -->

## Props

| Prop              | Type             | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------- | ---------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid`         | `boolean`        | no       | —       | Toggles the error visual (red border + danger focus ring) and sets `aria-invalid="true"`. Pair with a visible error message and an `aria-describedby` pointer at the message id.                                                                                                                                                                                                        |
| `size`            | `TextareaSize`   | no       | —       | Visual size. Defaults to `'md'`. - `'sm'` — tighter padding + `--font-size-sm`. Used in dense forms. - `'md'` — default padding + `--font-size-md`. Most form contexts. - `'lg'` — same padding as md but `--font-size-lg`. Hero / focus textareas. Note: this collapses the native HTML `<textarea size>` attribute. Use `style={{ width }}` or a parent container for explicit width. |
| `disableAutofill` | `boolean`        | no       | —       | Block browser autofill AND password managers from offering to fill this textarea. Same heuristic as Input — see Input's JSDoc for the full set of opt-out attributes applied. Smart default: when omitted, block iff `autoComplete` is also omitted (or `'off'`). Explicit autocomplete hints opt back IN to autofill. Pass `true` to force-block, `false` to force-allow.              |
| `minRows`         | `number`         | no       | —       | Minimum visible rows. The textarea never renders shorter than this, regardless of content. Default: `3`. Also seeds the native `rows` attribute for SSR / no-JS rendering.                                                                                                                                                                                                              |
| `maxRows`         | `number`         | no       | —       | Maximum visible rows. Beyond this, content scrolls inside the field instead of expanding further. Only meaningful when `autoGrow` is true. Default: `undefined` (unbounded growth).                                                                                                                                                                                                     |
| `autoGrow`        | `boolean`        | no       | —       | When true, height adapts to content between `minRows` and `maxRows`. Default: `true`. When false, height locks at `minRows` and a scrollbar appears past it.                                                                                                                                                                                                                            |
| `resize`          | `TextareaResize` | no       | —       | User-drag resize handle direction. Default: `'vertical'`. **Forced to `'none'`** when `autoGrow` is `true` — user-drag fights the auto-grow measurement and produces erratic behavior. To enable a resize handle, opt out of auto-grow with `autoGrow={false}`.                                                                                                                         |
| `showCount`       | `boolean`        | no       | —       | Show the character counter (`${value.length}` or `${value.length} / ${maxLength}` when both are set). Default: `true` when `maxLength` is set, `false` otherwise. The counter renders as a `<span aria-live="polite" aria-atomic="true">` inside the wrapper, below the textarea. It updates on every input — works for both controlled and uncontrolled textareas.                     |
| …native           |                  |          |         | plus native `<textarea>` attributes                                                                                                                                                                                                                                                                                                                                                     |

<!-- props:end -->

- **Auto-grow is on by default** (`autoGrow={true}`). When on, `resize` is forced to `'none'` because the two conflict.
- **Counter** shows automatically when `maxLength` is set. Force on with `showCount`, force off with `showCount={false}`.
- **Sizes** (`sm` / `md` / `lg`) affect typography + padding only, not height. Height comes from `minRows`.
- **Smart autofill blocking** — same heuristic as Input.

#### When NOT to use

- ❌ Single-line input → `<Input>`.
- ❌ Choosing from a fixed list → `<Select>`.
- ❌ Rich text editing (bold, lists, mentions) → use `<RichTextEditor>` (toolbar, list toggles, mark shortcuts shipped).
- ❌ Password fields → `<PasswordInput>`.

#### Anti-patterns

- ❌ Using `placeholder` as a label.
- ❌ Setting both `autoGrow={true}` AND expecting `resize="vertical"` to render a drag handle — auto-grow wins; the handle is hidden.
- ❌ Building your own character counter outside the component when `maxLength` / `showCount` would do it.
