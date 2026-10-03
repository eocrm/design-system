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

<!-- props:start -->

## Props

### `PageHeaderProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `borderBottom` | `boolean` | no | Render a 1px bottom border under the header. Default `true`. Set `false` when placing a `<Tabs>` component as a sibling below — Tabs has its own `border-bottom`, and you don't want the double line. |
| …native | | | plus native `<div>` attributes |

### `PageHeaderActionsProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes |  |
| …native | | | plus native `<div>` attributes |

### `PageHeaderAsideProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes |  |
| …native | | | plus native `<div>` attributes |

### `PageHeaderBackButtonProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `href` | `string` | no | If set, renders as `<a href={href}>`. Mutually exclusive with `onClick` — passing both renders as `<button>` (the onClick wins) and emits a dev-only warning. |
| `onClick` | `(() => void)` | no | If set, renders as `<button type="button" onClick={onClick}>`. Mutually exclusive with `href`. |
| `aria-label` | `string` | no | Accessible label. Defaults to the i18n value at `pageHeader.back` (`'Go back'` in English) when omitted OR empty — an empty string is not an explicit name, so it takes the default too. |
| `icon` | `ReactNode` | no | Icon to render. Default `<ChevronLeft size={16}>` from lucide-react. |

### `PageHeaderBreadcrumbProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes |  |
| …native | | | plus native `<div>` attributes |

### `PageHeaderMetaProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes |  |
| …native | | | plus native `<div>` attributes |

### `PageHeaderSubtitleProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes |  |
| …native | | | plus native `<p>` attributes |

### `PageHeaderTitleProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `order` | `1 \| 2 \| 3 \| 4 \| 5 \| 6` | no | Heading semantic level (1–6). Default `1`. Passes through to `<Title order={order}>` so the rendered element is `<h1>`–`<h6>`. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl'` | no | Visual size override (decouples from semantic level). Pass-through to `<Title size>` — useful for "section-level page headers" where the h-level is 2 but you want it to LOOK like an h1. |
| `truncate` | `boolean` | no | Keep the title on one line, ending in an ellipsis where the title column ends (at the actions on wide layouts) instead of wrapping. Pass-through to `<Title truncate>`. Defaults to `false`. Anything inline AFTER the text (e.g. a status badge) is clipped with it — put badges in `PageHeader.Meta`. Screen readers still get the full text (don't add `aria-label`); sighted users don't, so show the full title somewhere else too if it matters. |
| `children` | `ReactNode` | yes |  |

<!-- props:end -->

- **Compound API.** Seven slots: `Breadcrumb`, `BackButton`, `Aside`, `Title`, `Subtitle`, `Meta`, `Actions`. Detected via `c.type === SubComponent` after one level of Fragment unwrap. Unrecognized children are silently dropped.
- **All slots optional.** Missing slots collapse to zero-height rows; minimal usage is `<PageHeader><PageHeader.Title>…</PageHeader.Title></PageHeader>`.
- **`<PageHeader.BackButton>`** renders as `<a href>` when `href` is provided, or `<button onClick>` when `onClick` is provided. Mutually exclusive — both → button wins with a dev warn; neither → disabled button with a dev warn. Default `aria-label="Go back"`; default icon `<ChevronLeft size={16}>`. Lives in the breadcrumb row, left of the breadcrumb itself.
- **`<PageHeader.Aside>`** is a position-based slot (not named "Icon" / "Avatar") so it accepts whatever leading element you need. Vertically centered with the title block.
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

- **`<PageHeader.Title>` `size`** decouples visual size from semantic level: `<PageHeader.Title order={2} size="3xl">` renders an `<h2>` that looks like an h1; `order={2}` alone uses the default h2 size (`2xl`).
- **`<PageHeader.BackButton>` as an anchor** relies on your router to intercept the click; use `onClick={() => router.back()}` for programmatic navigation.
- **When NOT to use:** arbitrary section headers within a page that are not its primary heading — use `<Title order={2}>` directly; a sticky top bar — PageHeader is a regular block element.
- ❌ Passing multiple `<PageHeader.Title>` (or any duplicate sub-component) — only the FIRST match is rendered; duplicates are silently dropped.

```tsx
// Next to Tabs — drop the bottom border:
<PageHeader borderBottom={false}>
  <PageHeader.Title>Reports</PageHeader.Title>
</PageHeader>
<Tabs value={tab} onChange={setTab}>...</Tabs>

// Record detail — one line, ellipsis at the actions; badges go in Meta:
<PageHeader.Title truncate>{task.key} {task.title}</PageHeader.Title>
```
