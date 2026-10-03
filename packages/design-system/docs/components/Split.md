# `<Split>` — master–detail two-pane layout

Intrinsic-width `aside` pane beside a filling `main` pane (`children`), via CSS
grid `auto 1fr`. Never wraps. Sibling to Stack/Cluster/Grid; for in-page
master–detail (a vertical `Tabs` rail beside its detail panel, a filter column
beside results).

```tsx
<Split
  asideWidth="220px"
  collapseBelow="sm"
  aside={<Tabs orientation="auto" items={items} activeId={id} onChange={setId} />}
  gap="lg"
>
  <SectionPanel id={id} />
</Split>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `aside` | `ReactNode` | yes | — | The narrow, intrinsic-width pane — a vertical `Tabs` rail, filter list, or nav column. |
| `side` | `SplitSide` | no | — | Which side `aside` sits on. - `'start'` (default) — leading edge (left in LTR). - `'end'` — trailing edge (right in LTR). |
| `asideWidth` | `string` | no | — | `aside` column width. - `'auto'` (default) — intrinsic; sizes to the pane's content. - a CSS length (e.g. `'240px'`) — pins the column so `main` doesn't reflow when `aside` content changes width. |
| `gap` | `SplitGap` | no | — | Gap between the two panes, in pixels: `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32). Same scale as Stack, Cluster, and Grid. |
| `align` | `SplitAlign` | no | — | Cross-axis (vertical) alignment of the panes. - `'start'` (default) — panes hug the top. - `'stretch'` — `aside` matches `main`'s height (full-height bordered rail). - `'center'` — panes vertically centered. |
| `collapseBelow` | `CollapseBreakpoint` | no | — | Stack the two panes vertically when the SPLIT'S OWN width (container query, not viewport) drops below the preset: `sm` 480px / `md` 640px / `lg` 768px. Same scale as `Grid`'s `collapseBelow`. Without it a pinned `asideWidth` rail squeezes `main` to nothing on narrow screens. A pinned `asideWidth` is preserved while the panes are side-by-side and space is available, but can shrink as the container narrows so the stacked panes stay within the split. Collapsed panes stack in **DOM order**, not always aside-first: with the default `side="start"` that's aside → main; with `side="end"` it's main → aside, because that's the order the panes are in the DOM. Forcing aside-first when collapsed would need CSS `order`, which desynchronizes visual order from tab order — an a11y defect. If you need the aside on top when stacked, use `side="start"`. A `<Sticky>` passed as the `aside` stops pinning (and drops its `scroll` height cap) while stacked, so it can't trap the page scroll on a phone. ❌ Anti-pattern: a `collapseBelow` split must get its width from its parent. `container-type: inline-size` zeroes the split's contribution to intrinsic sizing, so in an intrinsic-width context (another `Split`'s default `auto` aside track, a `Cluster` item, `width: max-content`) it renders at width 0 — give the parent a concrete width instead. The split also becomes the containing block for absolutely-positioned descendants (layout containment). Splits without the prop pay none of this. |
| `onCollapsedChange` | `((collapsed: boolean) => void)` | no | — | Called with `true` when a `collapseBelow` split stacks and `false` when it goes back side by side — on mount with the initial state (twice under React StrictMode in development), then on every change. Ignored without `collapseBelow`. Use it to move content you own between placements so DOM order matches visual order in both states, instead of CSS `order` — e.g. render a comment thread at the end of `main` while side by side and after the `<Split>` once stacked, or a status switcher at the top of the aside vs. above the split. It measures the SPLIT'S OWN content width against the same inclusive threshold its container query uses (a `ResizeObserver`, read synchronously on mount so the first paint is already right), so it agrees with the CSS where `useBelowBreakpoint` — which measures the viewport — would not beside an app sidebar. The same state is on the root as `data-collapsed="true" \| "false"`. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- `children` is the filling main pane (`min-width: 0` — long content shrinks/scrolls instead of overflowing).

```tsx
// Settings screen: a 220px rail that becomes a horizontal strip when it stacks.
<Split aside={<Tabs orientation="auto" ... />} asideWidth="220px" collapseBelow="sm">
  <SettingsPanel />
</Split>
```

- Collapsed panes stack in **DOM order**: aside → main for `side="start"` (default), main → aside for `side="end"`. No CSS `order` flip — visual order stays in sync with tab order. Need the aside on top when stacked? Use `side="start"`.
- A `<Sticky>` passed as `aside` becomes a plain block while collapsed (no pin, no `scroll` cap) — don't shim it.
- `onCollapsedChange(collapsed)` — fires on mount with the initial state (twice under StrictMode in dev), then on every change; the root also carries `data-collapsed`. It measures the split's own content width against the same inclusive threshold as the container query, so it agrees with the CSS (`useBelowBreakpoint` measures the viewport and does not, beside an app sidebar). Use it to move content YOU own so DOM order = visual order in both states — never CSS `order`:

```tsx
// Comments last on the page, side by side or stacked:
const [stacked, setStacked] = useState(false);
<>
  <Split aside={<Sidebar />} side="end" collapseBelow="lg" onCollapsedChange={setStacked}>
    <RecordData />
    {!stacked && <Comments />}
  </Split>
  {stacked && <Comments />}
</>;
```

- ❌ A `collapseBelow` split in an intrinsic-width context (another `Split`'s default `auto` aside track, a `Cluster` item, `width: max-content`). `container-type: inline-size` makes it contribute zero intrinsic width, so it renders at width 0 — give the parent a concrete width instead. It also becomes the containing block for absolutely-positioned descendants (layout containment). Splits without the prop pay neither cost.

When NOT to use: equal columns → `<Grid columns={2}>`; wrapping peer row → `<Cluster>`; app shell sidebar → `<AppLayout>`/`<Rail>`.

```tsx
// Pinned rail width, aside on the right:
<Split aside={<Filters />} side="end" asideWidth="260px" gap="lg">
  <Results />
</Split>
```

- Split owns only its internal grid (like `AppLayout` / `Page` / `Screen`, a documented exception to "components don't own layout"). Unlike `Cluster` it never wraps the panel below the rail; unlike `Grid columns={2}` the rail keeps its natural width instead of taking half.
- ❌ Primary page navigation in `aside`: that belongs in the app shell (`<Rail>` / `<AppLayout sidebar>`); Split's aside is intra-page.
