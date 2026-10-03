# `<Page>` — page-root layout primitive

```tsx
// Canonical CRM page shape
<Page>
  <PageHeader>
    <PageHeader.Title>Contacts</PageHeader.Title>
  </PageHeader>
  <Card>{filters}</Card>
  <Table>{rows}</Table>
</Page>

// Per-page rhythm override (rare — only when 'lg' doesn't fit)
<Page gap="md">
  {denseDashboardSections}
</Page>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `gap` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | no | — | Vertical rhythm between top-level page sections. - `xs` (4) / `sm` (8) / `md` (12) — tighter than canonical; rare. - `lg` (16, **default**) — the canonical CRM page rhythm; matches every shipped mockup. - `xl` (24) / `2xl` (32) — looser; for spacious overview / hero pages. |
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- Page is the OUTER wrapper at the page root. Inside it, sections compose with `<PageHeader>`, `<Card>`, `<Table>`, etc.
- **Use Page at the page root, not nested.** For sub-regions (inside a card, modal, drawer), use `<Stack>` instead — those contexts have their own padding contract.
- Page does NOT add padding. The page container (AppShell content, modal body) provides outer padding; Page just provides inner section rhythm.
- Page is intentionally thin — a renamed Stack with a page-level default. It exists so future page-level concerns (max-width, scroll restoration, container queries) have a natural home.
