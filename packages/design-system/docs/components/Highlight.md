# `<Highlight>` — temporary attention ring on any block

```tsx
const [justAdded, setJustAdded] = useState<string | null>(null);

<Highlight active={row.id === justAdded} onDone={() => setJustAdded(null)}>
  <Table.Row>…</Table.Row>
</Highlight>;
```

Draws a 1px solid accent ring and a soft inset glow on its single child for `duration` ms (default 3000). On entry, three soft waves roll inward from the edge (about 3s); if `duration` is longer, the ring and glow then hold steady. After `duration` it fades out and calls `onDone`. It renders **no wrapper**: it clones the child and adds a class, `data-highlight` and a ref. So it works on `<tr>`, `<li>`, grid cells and any DS component that forwards `ref` and `className` to a DOM element; nothing else is needed (the visual state is class-based; `data-highlight="on" | "fading"` is only a hook for tests and consumers). It's decorative only: no role, `aria-*` or `tabIndex` changes.

**Announcing it:** with `focus`, the focus move IS the announcement (the screen reader reads the focused block), so don't also fire a `LiveRegion`. Without `focus`, announce the event with `<LiveRegion>` (for example "Contact created").

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `active` | `boolean` | yes | Turns the highlight on. Each false → true change starts it once: the ring shows, the optional scroll and focus run, and after `duration` it fades out and `onDone` fires. Setting it back to false early removes the ring at once WITHOUT calling `onDone`. Keeping it `true` doesn't restart anything; toggle false → true to highlight again. |
| `duration` | `number` | no | How long the ring holds before fading, in ms. Read when the highlight starts; changing it mid-run has no effect. A non-finite value (`Infinity`, `NaN`) keeps it on until `active` goes false. Default: `3000`. |
| `onDone` | `(() => void)` | no | Called once, after the fade ends (straight after `duration` under `prefers-reduced-motion`). Typically clears the consumer's `active` state. Not called when `active` is cleared early or on unmount. |
| `scrollIntoView` | `boolean` | no | On activation, scroll the child to the vertical centre of its scroll container. Smooth, or instant under `prefers-reduced-motion`. Default: `false`. |
| `focus` | `boolean` | no | On activation, move focus to the child (`preventScroll`, so it never fights `scrollIntoView`). The child must be focusable: give a non-interactive block (`Card`, `<section>`, `<tr>`) `tabIndex={-1}`. Highlight never adds it for you. Default: `false`. |
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | Exactly one element that forwards `ref` and `className` to a DOM element (nothing else is needed): any DS component, or a native element such as `<tr>` or `<li>`. Highlight renders no wrapper of its own. |

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

- The ring is **inset**, so `overflow: hidden` on the child (`Card`) or `overflow: auto` on its parent (a canvas cell) never clips it.
- Under `prefers-reduced-motion` the ring and glow are static (no waves, no fade). `onDone` fires straight after `duration`.
- `duration={Infinity}` keeps it on until `active` goes false. `duration` is read when the highlight starts; changing it mid-run has no effect.
- No `forwardRef` / prop spread: Highlight renders no DOM of its own (same as `Tooltip`); props go on the child.
- While it's active, the highlight **replaces** the child's own `box-shadow` and `outline`: a `Card` loses its elevation shadow and tone stripe for the duration, and gets them back when the highlight ends.
- The inset glow paints beneath the child's descendants' own backgrounds (a filled `Card` header, `<td>` fills), so it can be partly hidden there. The outline ring normally paints above them (a positioned descendant, or one with its own stacking context, can cover it).

**When NOT to use:**

- To mark a persistent selected or current state, use the component's own selected styling (`aria-selected`, `aria-current`).
- To show focus, use `:focus-visible`.
- To report an error, use `Field`'s invalid state or an `Alert`.

#### Anti-patterns

- ❌ `<Highlight active>{'text'}</Highlight>` or multiple children. It needs exactly one element child that forwards `ref` and `className`.
- ❌ Expecting `onDone` after clearing `active` yourself. It only fires when the highlight runs its course.
- ❌ Leaving `active` true forever with the default duration and expecting it to re-flash. Toggle it false → true to re-trigger.
- ❌ Relying on the ring alone to tell screen-reader users something changed. Use `focus` (the focus move announces it) or, without `focus`, a `LiveRegion` announcement.
- ❌ `focus` AND a `LiveRegion` for the same event. The screen reader announces it twice.
- ❌ A child component that drops `ref` (doesn't forward it to a DOM element). No scroll or focus happens, and Highlight warns in development.
- ❌ `focus` on a child that can't take focus. Add `tabIndex={-1}`.
