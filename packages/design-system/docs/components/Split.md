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

- `aside` (required ReactNode) — the narrow pane; `children` — the filling main pane.
- `side`: `'start'` (default) or `'end'` — which edge the aside sits on (RTL-aware).
- `asideWidth`: `'auto'` (default, intrinsic) or a CSS length like `'240px'` to pin the rail.
- `gap`: `xs`/`sm`/`md` (default)/`lg`/`xl`/`2xl` — same scale as Stack/Cluster/Grid.
- `align`: `'start'` (default) / `'stretch'` (full-height aside) / `'center'`.
- `collapseBelow`: `sm` (480px) / `md` (640px) / `lg` (768px) — stack the panes vertically when the SPLIT'S OWN width (container query, not viewport) drops below the preset. Same scale as `Grid`'s `collapseBelow`. Use it whenever `asideWidth` pins a rail, else the rail squeezes `main` to nothing on narrow screens.
- `main` has `min-width: 0` — long content shrinks/scrolls instead of overflowing.

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
