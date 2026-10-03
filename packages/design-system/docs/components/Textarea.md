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
