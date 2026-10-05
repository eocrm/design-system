# `<CatalogPicker>` — searchable card picker for a catalog

A search box, optional category pills, a live result count and an auto-fill grid of cards, for choosing one item from a catalog (e.g. "Add widget"). It is a surface, not an overlay: drop it into `Drawer.Body` or `Modal.Body`. Selecting is an action (`onSelect(id)`), not a value; the app decides whether to add immediately or open a configure step.

```tsx
import { Badge, CatalogPicker, Drawer, WidgetPreview } from '@eocrm/design-system';

<Drawer open={open} onOpenChange={setOpen}>
  <Drawer.Header>Add widget</Drawer.Header>
  <Drawer.Body>
    <CatalogPicker
      label="Widget catalog"
      categories={[
        { id: 'sales', label: 'Sales' },
        { id: 'tasks', label: 'Tasks' },
      ]}
      items={[
        {
          id: 'open-deals',
          title: 'Open deals',
          description: 'Count of deals in open stages.',
          category: 'sales',
          tags: ['pipeline', 'kpi'],
          badge: <Badge>New</Badge>,
          preview: <WidgetPreview variant="kpi" />,
        },
        {
          id: 'my-tasks',
          title: 'My tasks',
          category: 'tasks',
          preview: <WidgetPreview variant="list" />,
          disabledReason: 'Already on dashboard',
        },
      ]}
      onSelect={(id) => addOrConfigure(id)}
    />
  </Drawer.Body>
</Drawer>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `items` | `CatalogPickerItem[]` | yes | The catalog. Rendered in the given order. |
| `categories` | `CatalogPickerCategory[]` | no | Category pills (after a leading localized "All"). Omit or pass `[]` for no pills. |
| `onSelect` | `(id: string) => void` | yes | Called with the item id when an AVAILABLE item is clicked or activated with Enter/Space. |
| `label` | `string` | yes | Accessible name of the results listbox, e.g. "Widget catalog". Required. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **`onSelect` is an action.** It fires on click, Enter or Space of an available item. Options are `aria-selected="false"` always; nothing stays selected. Close the overlay or open the next step in the handler.
- **Search** matches a case-insensitive substring of `title`, `description` or any of `tags` (tags are not rendered). Combined with the category pill (AND). Items keep your order.
- **Categories.** Omit or pass `[]` for no pills; otherwise a localised "All" pill is added first and is the default. Items without a `category` only appear under "All".
- **Result count** is a `role="status"` element ("N results") that updates as the filter changes. When nothing matches, an `EmptyState` replaces the grid.
- **Unavailable items** (`disabledReason`): stay visible and focusable, dimmed, `aria-disabled`, reason shown as text and added to the option's description. `onSelect` is not called. Never hide them.
- **Keyboard** (one tab stop; roving focus inside the grid):
  - `ArrowDown` in the search field focuses the first result.
  - `←` / `→` move by one item (flipped in RTL); `↑` / `↓` move by one row (column count read from the rendered grid); `Home` / `End` jump to first / last.
  - `↑` from the first row returns focus to the search field.
  - `Enter` / `Space` activate (no-op on an unavailable item).
  - Changing the query or category resets the focus target to the first result.
- **The toolbar is sticky** so search stays reachable while the drawer/modal body scrolls.
- **Options must not contain interactive content.** Each card is a single `role="option"`; `preview` and `badge` are display-only.
- Fills its container width; the grid auto-fits columns (about 2 in a Drawer, 3 to 4 in a Modal).

#### When NOT to use

- ❌ A persistent form value (a field that stores a choice) → `<Select>` / `<IconPicker>`.
- ❌ Filtering a list or table → `<OptionsPicker>` / `<FilterChip>`.
- ❌ Picking emoji → `<EmojiPicker>`.
- ❌ Multi-select. It selects one item per activation.

#### Anti-patterns

- ❌ Hiding unavailable items instead of passing `disabledReason`. Users then cannot tell why a widget is missing.
- ❌ Putting buttons or links inside `preview` / `badge`. Options must not contain interactive content; nested controls are unreachable and invalid ARIA.
- ❌ Building overlay behaviour into the picker — put it in `Drawer.Body` / `Modal.Body`.
- ❌ Passing `label` as a placeholder-style hint. It is the listbox's accessible name ("Widget catalog").
