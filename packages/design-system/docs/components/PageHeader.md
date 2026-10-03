# `<PageHeader>` — top-of-page heading area

```tsx
<PageHeader>
  <PageHeader.Breadcrumb>
    <Breadcrumb items={[...]} />
  </PageHeader.Breadcrumb>
  <PageHeader.BackButton href="/contacts" aria-label="Back to contacts" />
  <PageHeader.Aside>
    <Avatar size="lg" name="Acme Corp" />
  </PageHeader.Aside>
  <PageHeader.Title>Acme Corporation</PageHeader.Title>
  <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
  <PageHeader.Meta>
    <Badge tone="success">Active</Badge>
    <Text size="sm" tone="muted">Last contacted 2 days ago</Text>
  </PageHeader.Meta>
  <PageHeader.Actions>
    <Button variant="secondary">Email</Button>
    <Button>Edit</Button>
  </PageHeader.Actions>
</PageHeader>
```

- **Compound API.** Seven slots: `Breadcrumb`, `BackButton`, `Aside`, `Title`, `Subtitle`, `Meta`, `Actions`. Detected via `c.type === SubComponent` after one level of Fragment unwrap. Unrecognized children are silently dropped.
- **All slots optional.** Missing slots collapse to zero-height rows; minimal usage is `<PageHeader><PageHeader.Title>…</PageHeader.Title></PageHeader>`.
- **`borderBottom: boolean = true`** — toggles the 1px bottom border. Set `false` when placing `<Tabs>` immediately below (Tabs has its own bottom border; you don't want two lines).
- **`<PageHeader.BackButton>`** renders as `<a href>` when `href` is provided, or `<button onClick>` when `onClick` is provided. Mutually exclusive — both → button wins with a dev warn; neither → disabled button with a dev warn. Default `aria-label="Go back"`; default icon `<ChevronLeft size={16}>`. Lives in the breadcrumb row, left of the breadcrumb itself.
- **`<PageHeader.Aside>`** is a position-based slot (not named "Icon" / "Avatar") so it accepts whatever leading element you need. Vertically centered with the title block.
- **`<PageHeader.Title>`** passes through to `<Title order={order} size={size} truncate={truncate}>`. Default `order={1}` (renders `<h1>`); set `order={2}` for sub-page section headers. `truncate` keeps a long title (record detail headers) on one line, ending in an ellipsis where the title column ends (at the actions on wide layouts). Inline content after the text is clipped with it, so put status badges in `<PageHeader.Meta>`. The full text stays in the a11y tree (don't add `aria-label`), but sighted users lose it, so show the full title somewhere else too if they need it.
- **`<PageHeader.Subtitle>`** is a `<p>` with muted color.
- **`<PageHeader.Meta>`** is a flex row that wraps — good for badges + timestamps.
- **`<PageHeader.Actions>`** is already a wrapping, right-aligned flex row — put `<Button>`s directly in it. A wrapping `<Cluster>` inside it needs `justify="end"`, or its wrapped rows go ragged-left. On viewports < 640px, Actions moves below the title block and stays right-aligned (primary action at the thumb-side edge).
- **NOT a `<header>` landmark.** PageHeader renders a `<div>` to avoid conflicting with the AppShell's app-level `<header role="banner">`.
- **Shrinks to narrow containers without overflowing.** On viewports ≥ 640px the actions column is sized to fit its buttons on one line, capped so the title keeps about `--page-header-title-min` (160px, `--measure-2xs`; with an `<Aside>`, the aside and title share that room). A wide header keeps all its actions on one line to the right; once they'd leave the title less than that, the buttons wrap onto extra lines. Wrapped rows stay right-aligned when the buttons are direct children of `<PageHeader.Actions>` (or inside a `<Cluster justify="end">`). If a single action item is wider than the space left, the title shrinks below that instead of the header overflowing (as long as that item itself — plus the aside and gaps — fits in the container). `<PageHeader.Breadcrumb>` wraps too. A title word wider than its column breaks mid-word (`overflow-wrap: anywhere`) rather than overflowing — e.g. "Acme Corporation" beside an `<Aside>` in a narrow container. Below a 640px viewport the actions move below, still right-aligned: the header becomes a single column, or two (aside + title) with an `<Aside>`, and the actions span the full width.
- **Give it a stretched or definite width.** In a shrink-to-fit parent PageHeader is only as wide as its content, so the actions don't sit at the right edge. Fix it where the width comes from: as a non-growing flex item, give the PageHeader `flex: 1` (or `width: 100%`) via its `className`; inside an `inline-block` parent or an `auto` grid track that doesn't work (the percentage is cyclic, `flex` is ignored) — make the parent block-level, or use a `1fr` / `minmax(0, 1fr)` track.

#### Hard rule

- ❌ Nesting `<PageHeader>` inside another `<PageHeader>` — undefined behavior. Use one PageHeader per page.
- ❌ Putting non-PageHeader children (a `<div>`, a `<Stack>`) inside `<PageHeader>` — they're silently dropped. Use one of the seven slots.
- ❌ Wrapping a sub-component in an HOC or deep nesting. The `c.type ===` detection handles ONE level of Fragment unwrap only.
- ❌ Putting an Avatar inside `<PageHeader.Title>` — muddles the `<h1>`'s text content for screen readers. Use `<PageHeader.Aside>` instead.
- ❌ `position: sticky` directly on `<PageHeader>` — out of scope for v1. Wrap in your own sticky container if you need sticky behavior.
- ❌ Passing both `href` and `onClick` to `<PageHeader.BackButton>` — onClick wins with a dev warn. Pick one.
