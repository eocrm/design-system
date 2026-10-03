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

Props on the root: `layout='horizontal' | 'stacked'` (default `'horizontal'`), `termWidth` (CSS length, default `max-content` — column sizes to the longest term), `spacing='sm' | 'md' | 'lg'` (default `'sm'` — compact; bump to `md`/`lg` for roomier), `dividers` (default `false`). The `Description` has an `icon` prop — leading-position, automatically wrapped `aria-hidden` because the `<dt>` carries the semantic label.

Use this instead of `Card.List` + `Card.ListRow` whenever the data is genuinely key/value (every row has a label and a value). Use `Card.List` when rows aren't keyed (activity feeds, list of cards).

**Anti-patterns**

- ❌ Wrapping a `<DefinitionList.Description>` directly in `<DefinitionList>` without an enclosing `<DefinitionList.Item>` — the dev warning fires and grid layout breaks.
- ❌ Putting interactive content in `<DefinitionList.Term>`. Use `<DefinitionList.Description>` for values, including ones containing `<Link>` or `<Button>`.
- ❌ Stacking multiple `<DefinitionList.Description>` children under one Item to render "multiple values for one key." Works HTML-wise but doesn't have styling support — render multiple Items with the same Term text if you need that pattern.
