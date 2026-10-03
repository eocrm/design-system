# `<PillMenu>` — coloured value menu (status, type, priority…)

Renamed from `StatusMenu` — `StatusMenu` / `StatusMenuProps` / `StatusMenuStatus` / `StatusMenuCategory` no longer exist; use `PillMenu` / `PillMenuProps` / `PillMenuOption` / `PillMenuCategory`. Component tokens are `--pill-menu-*`, the i18n namespace is `pillMenu`.

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

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `current` | `PillMenuOption` | yes | — | The value currently shown on the trigger (or the read-only chip). |
| `label` | `string` | no | — | What the value IS, for the trigger's accessible name: `label="type"` → "Change type: Bug". Default: the localized "status" ("Change status: …"). Pass it as it reads right after "Change" / "Изменить", lower-case, in the UI's language — it is data, not a translatable string. In ru that is the accusative: `label="категорию"`, not "категория". Inside a `<Field>`, pass the field's label here (`label="priority"` under "Priority"): the trigger keeps its own name, so the visible field label reaches AT only through this (WCAG 2.5.3). A dev warning fires if it's missing there. |
| `options` | `PillMenuOption[]` | no | — | Transition targets, offered in the dropdown. Omitted or empty renders read-only mode: a static colored chip with no button, no menu, no aria-haspopup. |
| `onSelect` | `((id: string \| number) => void)` | no | — | Fired with the chosen option's `id` when a transition target is picked. |
| `disabled` | `boolean` | no | — | Disables the trigger. Stays colored, dims via opacity. |
| `busy` | `boolean` | no | — | Transition in flight: the trigger is non-interactive and keeps its color. Announced from a polite live region the component owns — `aria-busy` is also set but reaches no screen reader on its own. The trigger's accessible name does not change (contrast `EntityChip`): you activated this control, so the change is announced rather than folded into the name. No effect in read-only mode (no `options`), which renders no trigger and so has nothing to mark busy. |
| `fullWidth` | `boolean` | no | — | Stretch the trigger (or read-only chip) to its container's width, for a form column of full-width controls (`Input`, `Select`, `DatePicker` in vertical `Field`s). Icon + name stay at the start, the chevron moves to the end edge like a `Select` trigger, and the menu is at least as wide as the trigger. Keeps the full-colour fill. Defaults to `false` (content-width pill). |
| `invalid` | `boolean` | no | — | Error state — sets `aria-invalid` on the trigger. `<Field error>` injects it for you. No visual change: the fill IS the value's colour, and the Field's error text carries the error. The read-only chip ignores it (a non-focusable chip isn't a control AT can report invalid). |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- A coloured pill trigger that opens a menu of values, each row coloured to its own value — a workflow status, a task type, a priority. Composes `<DropdownMenu>` internally.
- `fullWidth` (default `false`) stretches the trigger (or read-only chip) to its container, for a form column of full-width `Input`/`Select` fields. Icon + name stay at the start, the chevron moves to the end edge, and the menu is at least as wide as the trigger. Inside `<Field>`, the trigger takes the field's `id`, error text and `invalid` (which sets `aria-invalid`) but keeps its own name, e.g. "Change type: Bug" rather than the bare field label, so pass `label`; a dev warning fires if it's missing. `aria-labelledby` is ignored at runtime, because the name is component-owned. Without `fullWidth` the pill stays content-width, even in a stretching Field or Stack column.
- `label` (default: localized "status") names what the value is in the trigger's accessible name: `label="type"` → "Change type: Bug". Lower-case, in the UI language — it's data. Don't put `aria-label` on it: the trigger's name is component-owned.
- `icon?: ReactNode` on `current` and on each option renders before the name in the pill and in its row, `aria-hidden` (decorative — the name is announced). Size it to the text (~14px, at most 16px — menu rows use a fixed 16px slot).
- `current` / each option: `{ id, name, category?, color? }`. `category` (`to_do` / `in_progress` / `open` / `done` / `won` / `lost`) maps to a default palette color (slate / blue / violet / green / green / red); `color` (a `PaletteColor`) overrides it per-status.
- `options` omitted or empty → read-only mode: a static colored `<span>` chip, no button, no `aria-haspopup`. This is the read-only surface — there's no separate `readOnly` prop.
- `disabled` blocks the trigger (dims via opacity, stays colored). `busy` marks a transition in flight — also non-interactive, no built-in spinner. It announces from the component's own polite live region and **does not change the trigger's accessible name** (contrast `EntityChip`: you activated this control, so the change is announced rather than renamed). `aria-busy` is also set, but reaches no screen reader on its own.
- Not for a plain action menu (use `<DropdownMenu>`), a non-interactive status with no transition (use `<Badge>`), or picking from a long searchable list (use `<Select>`).
