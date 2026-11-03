# Accessible names

An empty label prop means _unset_, never _blank_.

Label props in this library treat `''` exactly like omitting it — `aria-label` everywhere, `previousLabel`, `nextLabel`, `confirmLabel`, `dropzoneLabel`, `label` on `ColumnVisibilityTrigger`, `visibilityLabel`, `emptyState`, a `LiquidVariable`'s `label`, a `SortableGroup.Container`'s or `Kanban.Column`'s `aria-label`, a `FlowCanvas` node's `label`. You cannot use one to blank out a name or suppress default copy. That is deliberate:

```tsx
// ✅ Fine. `row.title` missing → the component's own default copy.
<CursorPagination previousLabel={row.title ?? ''} … />

// ❌ Not a way to hide the label. It renders "Previous" all the same.
<CursorPagination previousLabel="" … />
```

**Two exceptions, both because the empty string already has a meaning of its own there.** An `<img>`'s `alt` — a RichText attachment block's `alt` field — is honoured when empty, because `alt=""` is HTML's marker for a decorative image. And a text input's `placeholder` (`DatePicker`, `DateRangePicker`) is honoured when empty, because wanting no placeholder is a real request and a placeholder is not an accessible name. Nothing else.

If you are writing a component _in_ this library, the rule behind that is an operator choice, and it is not optional:

- **Use `||`, never `??`, for any fallback that produces an accessible name** — whether the name comes from an attribute (`aria-label={x || t('key')}`) or from content (`<span>{label || t('key')}</span>`). `??` falls back only on `null`/`undefined`, so `''` reaches the DOM. Per the accname spec an empty `aria-label` contributes no name, so the computation does not stop there — it continues to name-from-content and then to `title`, and where the siblings are `aria-hidden` (a chevron, a spinner) the control ends up anonymous.
- The same applies to a fallback that exists so there is _always_ something readable — `col.visibilityLabel || header || col.id`, `v.label || v.code`. An empty string defeats the safeguard and renders a blank, unidentifiable row.

Two tests in `structure.test.ts` gate parts of this: one rejects `??` in `aria-label` / `aria-valuetext`, the other rejects `x ?? t(…)` anywhere in the source. **Neither implements the rule.** They cannot see whether an element is a control, whether its siblings are hidden, or that `v.label ?? v.code` and `node.label ?? id` are the same defect with a non-`t()` fallback — every one of those had to be found by reading. A green run is not coverage; the rule above is, and it is enforced by review.
