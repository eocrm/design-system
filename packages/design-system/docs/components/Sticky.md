# `<Sticky>` — sticky-positioning primitive

Pins its box to the top of the scroll container while the page scrolls past — for a record/detail-page sidebar (owner, tags, linked records) that stays in view while the wide main column scrolls. Sets `align-self: start` so it also works as a grid/flex item. Positions its OWN box only (put a `Stack`/`Cluster` inside to arrange the pinned content).

```tsx
// Detail page: main column scrolls, sidebar pins. align="stretch" gives the
// aside track full height so the Sticky has a tall containing block to pin within.
<Split
  side="end"
  asideWidth="320px"
  align="stretch"
  aside={
    <Sticky top="md">
      <Stack gap="md">{sidebarCards}</Stack>
    </Sticky>
  }
>
  <Stack gap="lg">{fields}</Stack>
</Split>
```

<!-- props:start -->

## Props

| Prop       | Type        | Required | Default | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `top`      | `StickyTop` | no       | —       | Offset from the top of the scroll container at which the content pins. Defaults to `'none'` (`top: 0`, flush). Use `'topbar'` inside an AppLayout with pinned TopBar; spacing steps add breathing room without chrome clearance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `scroll`   | `boolean`   | no       | —       | Cap the pinned box at the viewport height and scroll its content internally, so a column TALLER than the screen stays fully reachable (the overflow scrolls within the box instead of below the fold). Sets `max-height` to `calc(100dvh - top offset - bottom gap)`, `overflow-y: auto`, and `overscroll-behavior: contain` (page scroll doesn't chain from the box). The bottom gap defaults to the selected rhythm offset; `top="topbar"` instead defaults it to the standard content gap so chrome height is not subtracted twice. Set `--sticky-bottom-gap` on this element to override either default. Default `false`. Pair with a non-`none` `top` to leave breathing room. The cap is viewport-relative (`dvh`), so this assumes the page (or a viewport-tall ancestor) is the scroll context — not a short fixed-height scroll container. |
| `children` | `ReactNode` | yes      | —       | The content to pin. Required — a `Sticky` with nothing inside pins nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| …native    |             |          |         | plus native `<div>` attributes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

<!-- props:end -->

- `top`: `none` (default, `top:0`) / `xs` / `sm` / `md` / `lg` / `xl` are spacing-scale rhythm offsets. `topbar` clears the standard pinned `<TopBar>` height plus the normal content gap; use it for content inside an `<AppLayout>` instead of repurposing a spacing step.
- `scroll`: cap the pinned box at the viewport height with internal `overflow-y:auto` + `overscroll-behavior:contain` — for a sidebar taller than the screen (pair with a non-`none` `top`). The bottom gap defaults to the selected rhythm offset; for `topbar`, it defaults to the content gap so the chrome height is not subtracted twice. Override `--sticky-bottom-gap` on the Sticky for a different bottom clearance.
- Sticky defaults are emitted by the global token entry, so a consumer `:root` override loaded after `@eocrm/design-system/styles/tokens.scss` wins predictably. Override `--sticky-top-topbar` to match custom application chrome.
- Inside a `<Split>` aside, pair with `align="stretch"` (else the content-height aside track gives nowhere to pin).
- As a `<Split collapseBelow>` aside, it automatically becomes a plain block (no pin, no `scroll` cap/inner scroll) while the Split is stacked — no consumer shim needed. Applies only when the `Sticky` is the `aside` itself.

When NOT to use: arranging children → `<Stack>`/`<Cluster>`; a fixed overlay above content → `position: fixed` chrome (`Popover`/`Modal`/app bar); the split itself → `<Split>`. Note: `position: sticky` breaks if a clipping ancestor (`overflow: hidden/auto`) isn't the intended scroll container.
