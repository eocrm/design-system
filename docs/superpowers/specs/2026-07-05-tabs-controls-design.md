# Tabs — interactive controls per tab + strip-level actions

**Date:** 2026-07-05
**Component:** `packages/design-system/src/components/Tabs/`
**Status:** Approved design, ready for planning

## Summary

Let consumers place **interactive** controls on Tabs — safely, outside the `role="tab"` button. Two additive slots:

1. **Per-tab: `TabItem.actions?: ReactNode`** — interactive control(s) for a single tab (a `Switch`, a close ✕, a `⋯` menu). Rendered **outside** that tab's `role="tab"` button, inside a `role="presentation"` cell wrapper.
2. **Strip-level: `TabsProps.endContent?: ReactNode`** — controls for the whole bar (an "add tab" `+`, a filter toggle), rendered **outside** the tablist, pinned at the end of the strip, never scrolling away.

Plus one latent-bug fix required to make this correct: **the tablist's arrow-key handler must only rove when the focused element is a `role="tab"`**, so arrows pressed inside an action control (Switch/menu) aren't hijacked.

No breaking changes: `items`/`activeId`/`onChange`, the forwarded `ref`, `{...props}`, the animated indicator, roving tabindex, and the existing `leading`/`icon`/`label`/`count`/`trailing` slots all keep working.

## Motivation

Each tab is a single `<button role="tab">`; today's `leading`/`icon`/`count`/`trailing` render **inside** it. A static `Badge` there is fine (non-interactive), and the demo already shows one. But a `Button`/`Switch`/close-✕ inside a `role="tab"` button is invalid HTML, collides with native Enter/Space/click tab activation, and mis-announces to screen readers. There is no out-of-button slot today (unlike `Accordion.Trigger`'s `actions`). This adds one.

## Decisions locked during brainstorming

- **Both placements:** per-tab `actions` AND strip-level `endContent`.
- **Generic slot, no dedicated closeable-tabs affordance** (no `closable`/`onClose`/Delete-key convention). Consumers wire their own ✕ via `actions`. (A dedicated closeable pattern can be a later addition if needed.)
- **Not building a roving-into-actions toolbar model.** Arbitrary consumer children can't have their tabindex managed reliably; per-tab actions are ordinary Tab stops. Documented, not hidden.
- **`ref`/`{...props}` stay on the `role="tablist"` div** (existing contract). The strip-level slot is added via an outer wrapper that does not change the ref target.
- Names: per-tab `actions` (matches Accordion), strip-level `endContent`.

## Current structure (for reference)

`Tabs.tsx:300-364`:

```
<div class="scrollWrap">                      // owns overflow-x
  <div {...props} ref={ref} role="tablist" onKeyDown={onKeyDown} class="tabs">
    {items.map(item => (
      <button role="tab" id tabIndex={focused?0:-1} class="tab" onClick>
        <span class="main"> leading? icon? label count? </span>
        {item.trailing && <span class="trailing">…</span>}
      </button>
    ))}
    <span class="indicator" aria-hidden />
  </div>
</div>
```

- Trigger = native `<button type="button" role="tab">`; activation is native Enter/Space/click.
- Roving tabindex via `effectiveFocusedId`; `tabRefs` map holds the button elements.
- Arrow/Home/End handler on the tablist (`Tabs.tsx:271-298`) currently fires for ANY key target inside the tablist.
- Animated indicator positioned in a `useLayoutEffect` (`Tabs.tsx:207-248`) from the active tab **button**'s geometry.

## Design

### API

`TabItem` (add one field):

```ts
export interface TabItem {
  // ...existing: id, label, count?, icon?, leading?, trailing? ...
  /**
   * Interactive control(s) for this tab (e.g. a Switch, a close button, a
   * ⋯ menu), rendered OUTSIDE the tab's role="tab" button so it is valid,
   * focusable, and keyboard-operable. For STATIC adornments (Badge, status
   * dot, count) use `leading`/`trailing`/`count` — those render inside the
   * button. Not aria-hidden; give controls accessible labels.
   */
  actions?: ReactNode;
}
```

`TabsProps` (add one field):

```ts
export interface TabsProps {
  // ...existing...
  /**
   * Controls for the whole tab bar (e.g. an "add tab" button, a filter
   * toggle), rendered at the end of the strip OUTSIDE the tablist so it never
   * scrolls with the tabs and is not part of tab keyboard navigation.
   */
  endContent?: ReactNode;
}
```

### DOM structure

**Per-tab actions** — when `item.actions != null`, wrap the tab in a presentation cell:

```tsx
item.actions != null ? (
  <span key={item.id} role="presentation" className={styles.cell}>
    <button role="tab" …>…</button>
    <span className={styles.tabActions}>{item.actions}</span>
  </span>
) : (
  <button key={item.id} role="tab" …>…</button>   // unchanged for tabs without actions
)
```

- The `<button role="tab">` is unchanged (same id/refs/handlers/aria). The action controls are **siblings** of the button, inside a `role="presentation"` wrapper (ignored in the a11y tree, so the tab is still a direct owned tab of the tablist).
- Only tabs WITH `actions` are wrapped — tabs without stay bare buttons (zero regression for existing usage).
- `styles.cell` is `display: inline-flex; align-items: center` (horizontal) so the button + actions read as one tab. Keep the cell **unpositioned** (`position: static`) so the indicator's `offsetLeft`/`offsetWidth` math on the button is unchanged (see Primary risk).
- Vertical orientation: the cell is the full-width row; the button flexes to fill and the actions pin to the right edge (mirrors how `trailing` pins today, but now outside the button).

**Strip-level `endContent`** — add an outer flex row so it pins beside the scrolling tablist:

```tsx
<div className={clsx(styles.root, vertical && styles.rootVertical)}>
  <div className={styles.scrollWrap …}>
    <div {...props} ref={ref} role="tablist" …>{tabs}{indicator}</div>
  </div>
  {endContent != null && <div className={styles.endContent}>{endContent}</div>}
</div>
```

- The existing `scrollWrap` (overflow-x) becomes the inner scroller; the new `root` is a flex row holding the scroller + the `endContent` region. `endContent` sits outside `scrollWrap`, so it stays pinned when the tabs overflow-scroll.
- `ref`, `{...props}`, `role="tablist"`, `onKeyDown`, `className` merge stay exactly where they are (on the tablist). No breaking change to the ref target or prop spread.
- Horizontal: `endContent` pins to the right (main-axis end); vertical: to the bottom of the rail (or top — implementer picks the natural end; `align`/order handled in SCSS with tokens).

### Keyboard / a11y

- **Arrow/Home/End guard (required):** at the top of `onKeyDown` (`Tabs.tsx:271`), return early when the key target is neither a tab nor the tablist container itself:
  ```ts
  if (
    event.target !== event.currentTarget &&
    (event.target as HTMLElement).getAttribute('role') !== 'tab'
  )
    return;
  ```
  Without this, ArrowLeft/Right pressed while focus is inside a per-tab `actions` control would move tab focus instead of doing the control's own thing. The `event.target === event.currentTarget` allowance keeps arrows working when a test (or edge case) dispatches the key on the tablist element itself rather than a focused tab — so it does not break existing arrow-key tests. Real roving focus always lands on a `role="tab"`, which also passes.
- **Roving tabindex unchanged** — only `role="tab"` buttons participate; `tabRefs`/`effectiveFocusedId`/`focusTab` untouched.
- **Tab key** reaches a tab's `actions` controls (natural DOM order, since they follow the button in the cell), then `endContent`, then exits the component. Ordinary tab stops; no tabindex management of consumer children.
- **Activation isolation:** clicking a per-tab action control must NOT activate/switch the tab. It already won't (the control is a sibling of the button, not inside it, so the click never reaches the tab button). No `stopPropagation` needed, but the test suite asserts it.
- `actions`/`endContent` are NOT `aria-hidden`; consumer controls own their labels.
- **Documented limitation:** per-tab `actions` add Tab stops (one per control per tab). Best for the active tab or a handful of tabs; for ✕-on-many-tabs it remains fully operable (Tab + Enter, or mouse), just more stops. No roving-into-actions model in v1.

### SCSS

- New `.cell`, `.tabActions`, `.root`, `.endContent` classes; vertical variants. Tokens only (no raw values) — add `--tabs-*` tokens to `Tabs.tokens.scss` for any new spacing/gap. No layout props that violate Rule 4 beyond the internal-anchor exceptions the component already uses.
- The existing `.tab`/`.main`/`.trailing`/`.indicator` styles are unchanged; `.cell` composes around a bare `.tab`.

## Testing (`Tabs.test.tsx`)

- **`actions` renders outside the button:** the control is present and is NOT a descendant of the `role="tab"` button (assert `within(tab).queryBy… ` is null AND the control exists in the cell). The tab still has `role="tab"`, `aria-selected`, `aria-controls`.
- **Clicking a per-tab control does not switch tabs:** render with `actions={<button>act</button>}` on a non-active tab; click it; `onChange` not called; `activeId` unchanged.
- **Arrow guard:** focus a control inside `actions`, fire ArrowRight; tab focus does NOT move (the previously-focused tab stays focused / no `onChange` in auto mode). Focus a tab, ArrowRight still roves (regression check).
- **`endContent` renders outside the tablist:** it exists, is a Tab-reachable control, and is NOT inside `role="tablist"`.
- **No regression:** existing indicator/roving/vertical/manual tests still pass; a tab without `actions` renders as a bare `role="tab"` button (structure unchanged).
- **Vertical:** a tab with `actions` in vertical orientation renders the cell as the row; `endContent` renders at the rail end.
- **Browser-verify** (jsdom can't see paint): the indicator still slides correctly under tabs that have `actions` (cell wrapper doesn't shift the underline); `endContent` stays pinned while tabs overflow-scroll.

## Demo (`packages/playground/src/pages/components/TabsDemo.tsx`)

Add two examples:

1. **Per-tab controls** — a `Switch` in `actions` on the active tab (e.g. "Automation" with an enabled toggle), and a second sub-example of closeable tabs (a ✕ `Button` in `actions` wired to remove the item from state).
2. **Strip-level actions** — `endContent={<Button size="sm">+ New tab</Button>}` beside a horizontal strip.

## Documentation

- JSDoc: `TabItem.actions` and `TabsProps.endContent` (with the "interactive → `actions`/`endContent`; static → `leading`/`trailing`/`count`" guidance and the nested-interactive warning).
- `AGENTS.md` `### <Tabs>` (`AGENTS.md:1846-1888`): document both slots + the keyboard note.
- Export surface unchanged (`Tabs` + existing types; `TabItem`/`TabsProps` already exported). No new exported type.

Not a new component → no `_meta/manifest.ts` CLUSTERS change; `props.manifest.json` regenerates for the new props via the Vite plugin.

## Primary risk

The **animated indicator + per-tab cell wrapper**. The indicator is positioned from the active tab button's geometry in a `useLayoutEffect`. Wrapping a tab in a cell must not move the underline. Mitigation: keep `.cell` **unpositioned** (static) so the button's `offsetLeft`/`offsetWidth` (or `getBoundingClientRect` relative to the tablist) is unchanged; the plan will read the exact measurement code (`Tabs.tsx:207-248`) and add a browser check that the indicator sits correctly under a tab that has `actions`. Secondary: the `endContent` outer-wrapper restructure must not change where `ref`/`{...props}`/`className` land (they stay on the tablist).

## Out of scope (YAGNI)

- Dedicated closeable-tabs API (`closable`/`onClose`/Delete-key) — generic `actions` only.
- Roving tabindex extended into action controls (toolbar/grid composite).
- `startContent` (strip-level leading slot) — only `endContent` for now.
- Any change to `variant`/`size` (Tabs has neither) or the panel rendering (consumer-owned).
