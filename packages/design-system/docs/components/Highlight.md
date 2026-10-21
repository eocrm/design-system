# `<Highlight>` — temporary attention ring on any block

```tsx
const [justAdded, setJustAdded] = useState<string | null>(null);

<Highlight active={row.id === justAdded} onDone={() => setJustAdded(null)}>
  <Table.Row>…</Table.Row>
</Highlight>;
```

Draws a steady 1px ring just outside its single child, with two waves growing outward 20px from the edge, for `duration` ms (default 3000). The waves run for as long as it's on. After `duration` it fades out and calls `onDone`. It renders **no wrapper**: it clones the child to attach a ref and `data-highlight="on" | "fading"` (a hook for tests and consumers). Nothing else on the child changes, so a `Card` keeps its elevation shadow and tone stripe. It works on `<tr>`, `<li>`, grid cells and any DS component that forwards `ref` to a DOM element. It's decorative only: no role, `aria-*` or `tabIndex` changes.

**How it's drawn:** the ring and waves are on a separate overlay (`aria-hidden`, `pointer-events: none`), portaled to `<body>` and `position: fixed` over the child. It tracks scroll, resize and layout shift. So the waves pass over neighbouring elements and are never clipped by a scroll container, a table's scroll wrapper or a `Card`'s `overflow`. The ring covers the child's **visible** part: the child's rect clipped by every ancestor with `overflow` ≠ `visible` and by the viewport. If the child is scrolled fully out of view, the overlay is hidden. The overlay sits above page content but below fixed app chrome (`--z-app-chrome`), so the top bar covers it when the child scrolls underneath, and dropdowns open above it. Inside a `Modal`, `Drawer`, `Popover` or `Tour`, it rises with its host.

**Known limit:** the ring can paint over sticky elements (e.g. a sticky table header) that the highlighted element scrolls under during a run, unless that sticky element's container clips it.

**Announcing it:** with `focus`, the focus move IS the announcement (the screen reader reads the focused block), so don't also fire a `LiveRegion`. Without `focus`, announce the event with `<LiveRegion>` (for example "Contact created").

**Renamed / removed tokens:** `--highlight-ring` is now `--highlight-color` (override that to recolour the ring and waves). `--highlight-ring-peak`, `--highlight-glow`, `--highlight-glow-blur`, `--highlight-wave`, `--highlight-wave-blur` and `--highlight-wave-count` no longer exist. Use `--highlight-color` and the `--highlight-wave-*` tokens (`-duration`, `-delay`, `-reach`, `-edge`, `-glow`).

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `active` | `boolean` | yes | Turns the highlight on. Each false → true change starts it once: the ring and waves show, the optional scroll and focus run, and after `duration` it fades out and `onDone` fires. Setting it back to false early removes the ring at once WITHOUT calling `onDone`. Keeping it `true` doesn't restart anything; toggle false → true to highlight again. |
| `duration` | `number` | no | How long the ring holds before fading, in ms. Read when the highlight starts; changing it mid-run has no effect. A non-finite value (`Infinity`, `NaN`) keeps it on until `active` goes false. Default: `3000`. |
| `onDone` | `(() => void)` | no | Called once, after the fade ends (straight after `duration` under `prefers-reduced-motion`). Typically clears the consumer's `active` state. Not called when `active` is cleared early or on unmount. |
| `scrollIntoView` | `boolean` | no | On activation, scroll the child to the vertical centre of its scroll container. Smooth, or instant under `prefers-reduced-motion`. Default: `false`. |
| `focus` | `boolean` | no | On activation, move focus to the child (`preventScroll`, so it never fights `scrollIntoView`). The child must be focusable: give a non-interactive block (`Card`, `<section>`, `<tr>`) `tabIndex={-1}`. Highlight never adds it for you. Default: `false`. |
| `color` | `PaletteColor` | no | Ring and wave colour, from the shared palette (its saturated `fg` half, readable in both themes). Unset = the accent ring colour. Use a palette colour when the highlight should match the thing it points to (e.g. a category colour); leave it unset otherwise. |
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | Exactly one element that forwards `ref` to a DOM element (nothing else is needed): any DS component, or a native element such as `<tr>` or `<li>`. Highlight renders no wrapper and changes nothing on the child but a `data-highlight` attribute; the ring is drawn on a separate overlay. |

<!-- props:end -->

- **Bring it to the user's attention in one call:** `<Highlight active scrollIntoView focus>`. On activation it scrolls the child to the centre (instantly under `prefers-reduced-motion`) and focuses it with `preventScroll`. A non-interactive child needs `tabIndex={-1}` to take focus. The focus move announces it; no `LiveRegion` needed.
- **Inside a `DashboardCanvas`:** wrap what `renderItem` returns:

  ```tsx
  renderItem={(id) => (
    <Highlight active={id === addedId} scrollIntoView focus onDone={() => setAddedId(null)}>
      <DashboardWidget tabIndex={-1} title={widgets[id].title}>…</DashboardWidget>
    </Highlight>
  )}
  ```

- **Colour:** `color` takes a palette colour (the saturated `fg` half, readable in both themes); unset is the accent. Use it to match what the highlight points to:

  ```tsx
  <Highlight active={id === movedId} color="green" onDone={() => setMovedId(null)}>
    <Card>…</Card>
  </Highlight>
  ```

- Under `prefers-reduced-motion` the ring is static (no waves, no fade). `onDone` fires straight after `duration`.
- `duration={Infinity}` keeps it on until `active` goes false. `duration` is read when the highlight starts; changing it mid-run has no effect.
- No `forwardRef` / prop spread: Highlight renders no DOM of its own (same as `Tooltip`); props go on the child.

**When NOT to use:**

- To mark a persistent selected or current state, use the component's own selected styling (`aria-selected`, `aria-current`).
- To show focus, use `:focus-visible`.
- To report an error, use `Field`'s invalid state or an `Alert`.

#### Anti-patterns

- ❌ `<Highlight active>{'text'}</Highlight>` or multiple children. It needs exactly one element child that forwards `ref`.
- ❌ Expecting `onDone` after clearing `active` yourself. It only fires when the highlight runs its course.
- ❌ Leaving `active` true forever with the default duration and expecting it to re-flash. Toggle it false → true to re-trigger.
- ❌ Relying on the ring alone to tell screen-reader users something changed. Use `focus` (the focus move announces it) or, without `focus`, a `LiveRegion` announcement.
- ❌ `focus` AND a `LiveRegion` for the same event. The screen reader announces it twice.
- ❌ A child component that drops `ref` (doesn't forward it to a DOM element). No ring, scroll or focus happens, and Highlight warns in development.
- ❌ `focus` on a child that can't take focus. Add `tabIndex={-1}`.
