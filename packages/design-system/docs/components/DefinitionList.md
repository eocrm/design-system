# `<DefinitionList>` — semantic key/value pairs (dl / dt / dd)

For displaying entity properties — contact details, settings rows, metadata sidebars. Renders proper `<dl>`/`<dt>`/`<dd>` so screen readers announce term/description pairs natively. Compound: `DefinitionList`, `DefinitionList.Item`, `DefinitionList.Term`, `DefinitionList.Description`.

```tsx
<DefinitionList dividers>
  <DefinitionList.Item>
    <DefinitionList.Term>Email</DefinitionList.Term>
    <DefinitionList.Description icon={<Mail size={14} />}>
      ada@example.com
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Phone</DefinitionList.Term>
    <DefinitionList.Description icon={<Phone size={14} />}>
      +1 (415) 555-0142
    </DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>
```

<!-- props:start -->

## Props

### `DefinitionListProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `layout` | `DefinitionListLayout` | no | — | Layout direction. See `DefinitionListLayout`. Default `'horizontal'`. |
| `termWidth` | `string` | no | — | CSS length applied to the term column in horizontal layout (e.g. `'180px'`, `'20%'`, `'max-content'`). Default `'max-content'` — column sizes to the longest term across all rows. Set explicitly when you need consistent alignment across multiple DefinitionLists on the same screen. |
| `spacing` | `DefinitionListSpacing` | no | — | Vertical padding per item. See `DefinitionListSpacing`. Default `'sm'`. |
| `dividers` | `boolean` | no | — | Render a 1px border between items. Default `false` (clean, dense look). Set when migrating from a `Card.List` and you want to preserve the table-row separator visual. |
| …native | | | | plus native `<DList>` attributes |

### `DefinitionListDescriptionProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `icon` | `ReactNode` | no | — | Leading decorative icon, rendered inside the `<dd>` before children. Wrapped in an `aria-hidden` span — the `<dt>` carries the semantic label so the icon is purely visual. |
| `children` | `ReactNode` | yes | — | The value content. Any ReactNode — text, Badges, Links, etc. |
| …native | | | | plus native HTML attributes |

### `DefinitionListItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | A `DefinitionList.Term` and a `DefinitionList.Description`. |
| …native | | | | plus native `<div>` attributes |

### `DefinitionListTermProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — | The label text — kept short, terms are headings for their values. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

Props on the root: `layout='horizontal' | 'stacked'` (default `'horizontal'`), `termWidth` (CSS length, default `max-content` — column sizes to the longest term), `spacing='sm' | 'md' | 'lg'` (default `'sm'` — compact; bump to `md`/`lg` for roomier), `dividers` (default `false`). The `Description` has an `icon` prop — leading-position, automatically wrapped `aria-hidden` because the `<dt>` carries the semantic label.

Use this instead of `Card.List` + `Card.ListRow` whenever the data is genuinely key/value (every row has a label and a value). Use `Card.List` when rows aren't keyed (activity feeds, list of cards).

**Anti-patterns**

- ❌ Wrapping a `<DefinitionList.Description>` directly in `<DefinitionList>` without an enclosing `<DefinitionList.Item>` — the dev warning fires and grid layout breaks.
- ❌ Putting interactive content in `<DefinitionList.Term>`. Use `<DefinitionList.Description>` for values, including ones containing `<Link>` or `<Button>`.
- ❌ Stacking multiple `<DefinitionList.Description>` children under one Item to render "multiple values for one key." Works HTML-wise but doesn't have styling support — render multiple Items with the same Term text if you need that pattern.

Not for tabular data with multiple columns per row — use `Table` / `DataTable`.

```tsx
// Stacked (settings-style)
<DefinitionList layout="stacked">
  <DefinitionList.Item>
    <DefinitionList.Term>Workspace name</DefinitionList.Term>
    <DefinitionList.Description>Acme Corp</DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>
```
