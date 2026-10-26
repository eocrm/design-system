# `<Card>` — bordered container

- `fill` makes the Card fill a definite-height parent (`height: 100%`) and
  applies `min-width: 0` so it can shrink inside narrow Grid, Sortable, and
  DashboardCanvas cells. When a direct `Card.Body` is present, it also creates
  Card's internal column/min-height chain. It does not create a height by
  itself; bound the parent (for example with `Constrain height`) when needed.

```tsx
<Card padding="md">
  <Stack gap="md">...</Stack>
</Card>

// Tone-coded stat card — 3px left-edge stripe in the tone color:
<Card padding="md" tone="accent">Open deals</Card>
```

<!-- props:start -->

## Props

### `CardProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | no | Inner padding. - `none` — use when the card contains a table or list that should bleed edge-to-edge; inner sections manage their own padding. - `sm` (12px) — dense info cards. - `md` (16px) — default for plain-content cards. - `lg` (24px) — emphasis cards, marketing-style panels. When omitted, defaults to `'md'` for plain content, or `'none'` when the card contains compound subcomponents (`Card.Header` / `Card.Body` / `Card.List` / `Card.ListRow`) so its sections bleed to the card edge automatically. Pass an explicit value to override the auto-detect. **Detection is shallow:** only direct children are inspected. Fragments (`<>...</>`) are transparent — the detection recurses into them, so conditional renders that wrap compound children in a Fragment still trigger the auto-detect. But wrapping a `Card.Header` in any other element (`<div>`, `<Stack>`, etc.) defeats the heuristic — pass `padding="none"` explicitly in that case. |
| `tone` | `'accent' \| 'info' \| 'success' \| 'warning' \| 'danger'` | no | Optional left-edge tone stripe (3px). Useful for "stat card" / "status card" patterns where one card in a row needs visual emphasis. Default: no stripe (the card keeps its standard bordered look). Uses the same tone vocabulary as `Alert`: `accent` / `info` / `success` / `warning` / `danger`. |
| `overflow` | `'hidden' \| 'visible'` | no | How the card clips its children at the rounded border. - `hidden` (default) — children are clipped to the rounded border. This prevents the visible seam that appears at the corners when a child has square corners (Table's internal scroll wrapper, images, full-bleed media). Overlays in this library (DropdownMenu, Tooltip, Popover, Drawer, Modal) portal to `document.body` and are NOT clipped by this. Focus rings are NOT exempt: an `outline` is clipped by an ancestor's overflow, so a focusable flush against the card edge loses that band — draw its ring inset by passing `$offset: calc(-1 * var(--ring-offset))` to the `focus-ring` mixin, not a separate `outline-offset` after the `@include` (a `structure.test.ts` gate fails the build on that shape). - `visible` — opt out of clipping. Use when a direct child needs to overhang the card edge — decorative badges that protrude from a corner, hover-lift transforms whose shadow extends past the card border, etc. |
| `fill` | `boolean` | no | Fill the containing block's height and allow the Card to shrink within a narrow grid cell. Use in stretched Grid, Sortable, or DashboardCanvas cells whose wrapper already has a definite height. When a direct `Card.Body` child is present, `fill` also establishes Card's internal column and minimum-height chain; add `scroll` to the Body to keep a sibling Header fixed above a scrolling content region. Defaults to `false`. |
| …native | | | plus native `<div>` attributes |

### `CardBodyProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `scroll` | `boolean` | no | Makes the body the flexible vertical scroll region of a `fill` Card while sibling `Card.Header` content stays fixed. The Card's parent must provide a definite height. Defaults to `false`. |
| …native | | | plus native `<div>` attributes |

### `CardHeaderProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `headerLevel` | `'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6'` | no | Heading level for the title text. Defaults to `'h3'` (assumes the page has an h1/h2 above). Override when this section sits beneath an h1 directly (`headerLevel="h2"`) or further nested (`headerLevel="h4"`). |
| `surface` | `'default' \| 'subtle'` | no | `'subtle'` paints the header on a tinted (sunken) surface, for a nested editable sub-section inside a `Card.Body` (e.g. a condition group). Defaults to `'default'`. |
| `controls` | `ReactNode` | no | Optional interactive slot right after the title (e.g. a `ButtonGroup` mode switch). Rendered outside the heading, so it is not part of the heading's name. Order: title, controls, meta, action. Controls never shrink: on a wide header the title ellipsizes down to a short minimum width; on a narrow header (under ~320px of content) the controls wrap onto a second row under the title, which keeps the first row with meta and action. Keep titles short, or pass a `title` attribute for long ones. |
| `action` | `ReactNode` | no | Optional right-aligned slot — typically a `<Link>` or `<Button>` that lets the user navigate to a full list or take a section-level action. Rendered inside a `<span>` that never shrinks or wraps (flex-shrink: 0; with `meta` or `controls`, min-width: max-content). Beside `controls` it is the removal/section action of a nested sub-group (e.g. a ghost delete button), right-aligned after any meta. |
| `meta` | `ReactNode` | no | Optional secondary, non-interactive text beside the title — freshness ("Updated 3 minutes ago") or status. Muted and single-line; sits just before `action` and is the first thing to give way at narrow widths: it truncates with an ellipsis before the title gives up any width, while `action` keeps its width. In a `fill` Card (which needs a parent of definite width) it is also visually hidden, still read by screen readers, once only a sliver would show. Not part of the heading's name. Put controls in `controls` or `action`, never here. `false` and `''` count as no meta. |
| `children` | `ReactNode` | yes | Title content. Becomes the inner text of the heading element. Typically a plain string, but can contain inline elements if needed. |
| …native | | | plus native `<div>` attributes |

### `CardListProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes | Row items — typically `<Card.ListRow>` elements. |
| …native | | | plus native `<ul>` attributes |

### `CardListRowProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes | Row content — typically a `<Stack>` or `<Cluster>` of text and metadata. |
| …native | | | plus native `<li>` attributes |

<!-- props:end -->

```tsx
// Fixed header + scrolling body in a definite-height dashboard cell.
<Constrain height="sm">
  <Card fill>
    <Card.Header>Pipeline</Card.Header>
    <Card.Body scroll>
      <Stack gap="sm">...</Stack>
    </Card.Body>
  </Card>
</Constrain>
```

```tsx
// Compound API — section card with header + list (Dashboard's "Deals needing attention" pattern).
// No `padding` prop needed — Card auto-detects compound children and defaults to padding="none".
<Card>
  <Card.Header
    action={
      <Link as={RouterLink} to="/deals">
        View all
      </Link>
    }
  >
    Deals needing attention
  </Card.Header>
  <Card.List>
    {deals.map((d) => (
      <Card.ListRow key={d.id}>
        <Stack gap="xs">
          <span>{d.title}</span>
          <span>{d.company}</span>
        </Stack>
        <Avatar name={d.owner} size="sm" />
      </Card.ListRow>
    ))}
  </Card.List>
</Card>
```

- **Compound API** — `Card.Header` / `Card.Body` / `Card.List` / `Card.ListRow` for section-card patterns. Drop `padding="none"` — the parent Card auto-detects compound children.
- `Card.Header`: title row (`h3` by default, override via `headerLevel`) with optional right-aligned `action` slot and bottom-border separator. Optional `meta` is muted secondary text (freshness, status) just before `action`; at narrow widths it truncates before the title shrinks (in a `fill` Card it then hides visually, staying readable by screen readers), and `action` never shrinks. Keep controls out of `meta`. With `controls` the order is title · controls … meta · action: controls and `action` never shrink, meta truncates first, and `action` stays right-aligned.
- With `controls`, the title stays on one line. On a wide header it ellipsizes down to a short minimum width rather than pushing the controls out; on a narrow header (under ~320px of content) the controls wrap onto a second row under the title, and the first row keeps title · meta · action. For long titles beside `controls`, pass a `title` attribute so the full text stays reachable (`<Card.Header controls={…}><span title={name}>{name}</span></Card.Header>`), or keep titles short.
- `Card.Body`: padded `<div>` content section. Add `scroll` beneath a Header in a `fill` Card to make Body the flexible vertical scroll region while Header stays fixed. Card intentionally owns this layout because it relates only its own compound pieces; the parent still owns the Card's definite outer height. `scroll` also sets `tabIndex={0}`, because a scroll container with no focusable descendant is unreachable by keyboard (axe `scrollable-region-focusable`) — pair it with `role="group"` and an `aria-label` when the content is worth naming, and pass `tabIndex={-1}` to opt out if the body already contains something focusable.
- `Card.List`: semantic `<ul>` with list-reset styling — screen readers announce "list with N items".
- `Card.ListRow`: `<li>` with padded content and bottom dividing border; last-child border suppressed automatically.
- **Never nest Card in Card** — except an editable, repeatable sub-group (e.g. a condition group) inside a `Card.Body`, using `Card.Header surface="subtle"`; never for display-only content or as a layout wrapper. `controls` holds the sub-section's inline controls and `action` its remove button:

```tsx
<Card>
  <Card.Header>Rules</Card.Header>
  <Card.Body>
    <Card>
      <Card.Header
        surface="subtle"
        controls={
          <ButtonGroup value={mode} onValueChange={setMode} aria-label="Match">
            <ButtonGroup.Item value="all">Match all</ButtonGroup.Item>
            <ButtonGroup.Item value="any">Match any</ButtonGroup.Item>
          </ButtonGroup>
        }
        action={
          <Button iconOnly variant="ghost" aria-label="Delete group">
            <X size={12} />
          </Button>
        }
      >
        Group
      </Card.Header>
      <Card.Body>…conditions…</Card.Body>
    </Card>
  </Card.Body>
</Card>
```

- `Card.Header` sits flush with the card edge inside `<Card padding="none">`. It renders a `<div>` holding the heading element plus an optional `<span>` wrapping `action` (with `meta`, a muted `<span>` between them and the header switches to a grid). With `controls`, the header is an inline-size container holding one inner `<div>` grid of four items — heading · controls `<span>` · meta (or an empty spacer) · action (or an empty placeholder) — so `action` stays right-aligned; a container query moves the controls to a second row when the header is narrow. The containment means a controls header contributes no intrinsic width, so give its Card a definite width (any block parent does). Under an `h1` with no `h2` above, pass `headerLevel="h2"`.
- `Card.List` / `Card.ListRow`: row dividers use a `:last-child` selector to suppress the final bottom border. Fragments are transparent, but wrapping rows in an extra `<div>` or other element breaks the match and leaves a stray divider on the last row. Render rows as direct children (or via `.map`).
- `Card.Body` keeps `scroll` for a bounded `fill` Card (Grid, Sortable or DashboardCanvas cell); for page-level scrolling let the page or `AppLayout` own the scroll area. Keep it a direct child of Card (Fragments are transparent) so Card can detect the compound structure.

#### When NOT to use

- ❌ Inside another Card, except the editable sub-group exception above (`Card.Header surface="subtle"` in a `Card.Body`). Never as the only child of another Card, or as a layout primitive (use `Stack` / `Cluster` / `Grid`). Card is for semantic grouping.
- ❌ For every container. If the page looks like a deck of cards, nothing is visually grouped.
- ❌ `Card.Body` outside a Card. It owns padding and sizing only as part of Card's compound structure.

#### Anti-patterns

- ❌ `<Card style={{ padding: 20 }}>`: use `padding`. A missing value is a token/scale conversation.
- ❌ `<Card style={{ overflow: 'visible' }}>`: use `<Card overflow="visible">`.
- ❌ `<Card style={{ height: '100%' }}>`: use `<Card fill>`, which also applies the shrink-safe minimum width for narrow grid cells.
- ❌ Hand-rolling a flex column and scrolling body in a Card, or consumer CSS for `flex: 1`, `min-height: 0` or `overflow-y: auto`. Use `<Card fill>` with `<Card.Body scroll>`.
- ❌ Expecting `scroll` to create a height. The Card's parent must provide a definite height; `fill` carries that bound into the body.
- ❌ Hover shadows to make Cards "interactive". If the whole card is clickable, that's a different component (`LinkCard`).
- ❌ Hand-rolling a left stripe via `className` / `style`. Use `tone`; it reserves the border-left space so layout never shifts.
- ❌ Hand-rolling `.cardHeader` / `.list` / `.listRow` SCSS. Use the compound API.
