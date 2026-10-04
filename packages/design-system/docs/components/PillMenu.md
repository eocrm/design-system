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

// Say what it picks AND the value — visible caption, muted, before a middle dot:
<PillMenu caption="Pipeline" current={pipeline} options={pipelines} onSelect={setPipeline} />
// → shows "Pipeline · Faeton", announced "Change Pipeline: Faeton" (a string caption names the trigger when `label` is absent)

// Pass `label` too when the name needs another form (e.g. ru accusative) — keep the caption's words in it:
<PillMenu label="воронку" caption="Воронка" current={pipeline} options={pipelines} onSelect={setPipeline} />
// → announced "Изменить воронку: Faeton"
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `current` | `PillMenuOption` | yes | The value currently shown on the trigger (or the read-only chip). |
| `label` | `string` | no | What the value IS, for the trigger's accessible name: `label="type"` → "Change type: Bug". Default: a string `caption` ("Change Pipeline: …"), else the localized "status" ("Change status: …"). Pass it as it reads right after "Change" / "Изменить", lower-case, in the UI's language — it is data, not a translatable string. In ru that is the accusative: `label="категорию"`, not "категория". Inside a `<Field>`, pass the field's label here (`label="priority"` under "Priority"): the trigger keeps its own name, so the visible field label reaches AT only through this (WCAG 2.5.3). A dev warning fires if it's missing there. |
| `caption` | `ReactNode` | no | Visible caption rendered inside the pill before the value, separated by a middle dot: `caption="Pipeline"` → "Pipeline · Faeton". For a trigger that must say both what it picks and the current value. Names the trigger only as a fallback: `label` wins ("Change pipeline: Faeton"); with no `label`, a non-blank string caption is used ("Change Pipeline: Faeton") so the visible words stay in the accessible name (WCAG 2.5.3 label-in-name). A non-string caption never names it — pass `label` then, containing the caption's words. In the read-only chip (no accessible name override) the caption text is read along with the value; the dot is `aria-hidden` in both. Muted by weight (regular vs the value's medium), not colour: the palette fills leave no contrast headroom for a dimmer foreground. Omitted or blank → no caption, no dot. |
| `options` | `PillMenuOption[]` | no | Transition targets, offered in the dropdown. Omitted or empty renders read-only mode: a static colored chip with no button, no menu, no aria-haspopup. |
| `onSelect` | `((id: string \| number) => void)` | no | Fired with the chosen option's `id` when a transition target is picked. |
| `disabled` | `boolean` | no | Disables the trigger. Stays colored, dims via opacity. |
| `busy` | `boolean` | no | Transition in flight: the trigger is non-interactive and keeps its color. Announced from a polite live region the component owns — `aria-busy` is also set but reaches no screen reader on its own. The trigger's accessible name does not change (contrast `EntityChip`): you activated this control, so the change is announced rather than folded into the name. No effect in read-only mode (no `options`), which renders no trigger and so has nothing to mark busy. |
| `fullWidth` | `boolean` | no | Stretch the trigger (or read-only chip) to its container's width, for a form column of full-width controls (`Input`, `Select`, `DatePicker` in vertical `Field`s). Icon + name stay at the start, the chevron moves to the end edge like a `Select` trigger, and the menu is at least as wide as the trigger. Keeps the full-colour fill. Defaults to `false` (content-width pill). |
| `invalid` | `boolean` | no | Error state — sets `aria-invalid` on the trigger. `<Field error>` injects it for you. No visual change: the fill IS the value's colour, and the Field's error text carries the error. The read-only chip ignores it (a non-focusable chip isn't a control AT can report invalid). |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- A coloured pill trigger that opens a menu of values, each row coloured to its own value — a workflow status, a task type, a priority. Composes `<DropdownMenu>` internally.
- `icon?: ReactNode` on `current` and on each option renders before the name in the pill and in its row, `aria-hidden` (decorative — the name is announced). Size it to the text (~14px, at most 16px — menu rows use a fixed 16px slot).
- `current` / each option: `{ id, name, category?, color? }`. `category` (`to_do` / `in_progress` / `open` / `done` / `won` / `lost`) maps to a default palette color (slate / blue / violet / green / green / red); `color` (a `PaletteColor`) overrides it per-status.
- Not for a plain action menu (use `<DropdownMenu>`), a non-interactive status with no transition (use `<Badge>`), or picking from a long searchable list (use `<Select>`).

Per-state colour override (`color` wins over `category`):

```tsx
<PillMenu
  current={{ id: 'triage', name: 'Triage', color: 'amber' }}
  options={[{ id: 'won', name: 'Won', category: 'won', color: 'emerald' }]}
  onSelect={(id) => setStage(id)}
/>
```

In a form column beside full-width Selects/Inputs, pass `fullWidth` and `label` (the trigger keeps its own name, "Change priority: High"):

```tsx
<Field label="Priority" error={errors.priority}>
  <PillMenu
    fullWidth
    label="priority"
    current={priority}
    options={priorities}
    onSelect={setPriority}
  />
</Field>
```

**Anti-patterns**

- ❌ A small `<Badge>` wrapped inside a neutral `<Button>` to fake a coloured status trigger — that is what `PillMenu` replaces.
- ❌ Raw hex strings in `color` — it is a `PaletteColor` name (`'amber'`, `'violet'`, …), not a CSS colour value.
- ❌ A non-string (or blank) `caption` without `label` — only a non-blank string caption falls back as the name; a node leaves "Change status: …", which fails WCAG 2.5.3 label-in-name. Pass `label` containing the caption's words.
- ❌ Omitting `options` to "disable" the menu — that is read-only mode (no interactivity at all). For a transition that is temporarily blocked, keep `options` and pass `disabled`.
