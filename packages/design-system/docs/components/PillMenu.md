# `<PillMenu>` — coloured value menu (status, type, priority…)

Renamed from `StatusMenu` (#572) — `StatusMenu` / `StatusMenuProps` / `StatusMenuStatus` / `StatusMenuCategory` no longer exist; use `PillMenu` / `PillMenuProps` / `PillMenuOption` / `PillMenuCategory`. Component tokens are `--pill-menu-*`, the i18n namespace is `pillMenu`.

```tsx
<PillMenu
  current={{ id: 'todo', name: 'To do', category: 'to_do' }}
  options={[
    { id: 'in_progress', name: 'In progress', category: 'in_progress' },
    { id: 'done', name: 'Done', category: 'done' },
  ]}
  onSelect={(id) => updateStatus(task.id, id)}
/>

// Read-only chip — omit `options` for a static colored chip, no menu:
<PillMenu current={{ id: 'won', name: 'Won', category: 'won' }} />

// Not a status: label the trigger and add per-value icons:
<PillMenu
  label="type"
  current={{ id: 'bug', name: 'Bug', color: 'red', icon: <Bug size={14} /> }}
  options={[{ id: 'story', name: 'Story', color: 'green', icon: <BookOpen size={14} /> }]}
  onSelect={setType}
/>
// → trigger announced "Change type: Bug"
```

- A coloured pill trigger that opens a menu of values, each row coloured to its own value — a workflow status, a task type, a priority. Composes `<DropdownMenu>` internally.
- `fullWidth` (default `false`) stretches the trigger (or read-only chip) to its container, for a form column of full-width `Input`/`Select` fields. Icon + name stay at the start, the chevron moves to the end edge, and the menu is at least as wide as the trigger. Inside `<Field>`, the trigger takes the field's `id`, error text and `invalid` (which sets `aria-invalid`) but keeps its own name, e.g. "Change type: Bug" rather than the bare field label, so pass `label`; a dev warning fires if it's missing. `aria-labelledby` is ignored at runtime, because the name is component-owned. Without `fullWidth` the pill stays content-width, even in a stretching Field or Stack column.
- `label` (default: localized "status") names what the value is in the trigger's accessible name: `label="type"` → "Change type: Bug". Lower-case, in the UI language — it's data. Don't put `aria-label` on it: the trigger's name is component-owned.
- `icon?: ReactNode` on `current` and on each option renders before the name in the pill and in its row, `aria-hidden` (decorative — the name is announced). Size it to the text (~14px, at most 16px — menu rows use a fixed 16px slot).
- `current` / each option: `{ id, name, category?, color? }`. `category` (`to_do` / `in_progress` / `open` / `done` / `won` / `lost`) maps to a default palette color (slate / blue / violet / green / green / red); `color` (a `PaletteColor`) overrides it per-status.
- `options` omitted or empty → read-only mode: a static colored `<span>` chip, no button, no `aria-haspopup`. This is the read-only surface — there's no separate `readOnly` prop.
- `disabled` blocks the trigger (dims via opacity, stays colored). `busy` marks a transition in flight — also non-interactive, no built-in spinner. It announces from the component's own polite live region and **does not change the trigger's accessible name** (contrast `EntityChip`: you activated this control, so the change is announced rather than renamed). `aria-busy` is also set, but reaches no screen reader on its own.
- Not for a plain action menu (use `<DropdownMenu>`), a non-interactive status with no transition (use `<Badge>`), or picking from a long searchable list (use `<Select>`).
