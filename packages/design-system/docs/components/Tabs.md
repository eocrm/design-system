# `<Tabs>` — tab strip (horizontal or vertical)

```tsx
const [tab, setTab] = useState('overview');

<Tabs
  items={[
    { id: 'overview', label: 'Overview', icon: <Eye size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 12 },
  ]}
  activeId={tab}
  onChange={setTab}
/>;
{
  tab === 'overview' && <OverviewPanel />;
}
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `items` | `TabItem[]` | yes | — | The tabs to render. Each item must have a unique `id`. |
| `activeId` | `string` | yes | — | The id of the currently-active tab. If it doesn't match any item, the strip still stays keyboard-reachable (first tab gets tabindex=0). |
| `onChange` | `(id: string) => void` | yes | — | Called with the tab id when the user activates a different tab. Won't fire when re-clicking the already-active tab. |
| `panelIdPrefix` | `string` | no | — | Optional id prefix for controlled tabpanels. When set, the ACTIVE tab gets `aria-controls="${panelIdPrefix}-${itemId}-panel"` — the consumer must render the matching panel with that id. When omitted, NO tab carries `aria-controls` at all — the internal id (sanitized React `useId`) named below is the tab's own id, not a panel's, and pointing at it would be the dangling IDREF #501 removed. Only the active tab carries it, because consumers render only the active panel; stamping every tab would point N-1 of them at elements that do not exist. Inactive tabs keep their own `id` for the panel's `aria-labelledby` to reference. |
| `activationMode` | `TabsActivationMode` | no | — | `'auto'` (default): arrow keys move focus AND fire onChange — the visible panel changes with each keystroke. Best for cheap, eager-rendered panels. `'manual'`: arrow keys only move focus; Enter/Space (the native button activation keys) then commits via onChange. Use this when panels are expensive (lazy-load, network) so the user can scan tab labels without triggering loads. |
| `orientation` | `TabsOrientation` | no | — | `'horizontal'` (default) — a horizontal strip with a sliding underline. `'vertical'` — a stacked master–detail rail: full-width rows, a left accent bar + tinted background on the active row, and ArrowUp/ArrowDown navigation. `'auto'` — measures available Tabs/tab-strip width: vertical below `autoOrientationBreakpoint` and horizontal at or above it. It starts vertical during SSR and whenever `ResizeObserver` is unavailable. Use it with a collapsing `Split`: the fixed-width aside remains a vertical rail, then the full-width stacked tablist becomes horizontal. `aria-orientation`, keyboard navigation, and presentation always follow the effective orientation. |
| `autoOrientationBreakpoint` | `number` | no | 320 | Available tab-strip width in px where `orientation="auto"` switches from vertical to horizontal. Defaults to `320`. Set this per Tabs instance to align automatic orientation with the surrounding layout's threshold. |
| `action` | `TabsAction` | no | — | A trailing action rendered after the tab items, inside the same strip (e.g. `{ label: 'New deal', icon: <Plus/>, onClick: addDeal }`). Styled tab-like but visibly muted, never becomes the selected tab, and is skipped by arrow-key roving — reachable via the Tab key instead. For controls that apply to the whole bar but aren't shaped like a tab (a filter toggle), use `endContent`. For a control on a single tab, use `TabItem.actions`. |
| `endContent` | `ReactNode` | no | — | Controls for the whole tab bar (e.g. an "add tab" button, a filter toggle), rendered at the end of the strip OUTSIDE the tablist so it never scrolls with the tabs and is not part of tab keyboard navigation. For a control attached to a single tab, use `TabItem.actions` instead. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

```tsx
// Responsive master–detail rail:
<Split
  asideWidth="220px"
  collapseBelow="sm"
  aside={
    <Tabs
      orientation="auto"
      items={[
        { id: 'general', label: 'General' },
        { id: 'security', label: 'Security', trailing: <Badge tone="warning">Unsaved</Badge> },
        { id: 'billing', label: 'Billing', count: 3 },
      ]}
      activeId={section}
      onChange={setSection}
    />
  }
>
  <SectionPanel id={section} />
</Split>
```

- `items: { id, label, icon?, count?, leading?, trailing?, actions? }[]` — `id` must be unique. `icon` is a decorative leading glyph; `count` renders as a chip after the label. `leading`/`trailing` are free-form ReactNode adornments (status dot, unsaved-changes `Badge`); they are NOT `aria-hidden`, so give meaningful ones accessible text. In vertical orientation `trailing` pins to the row's right edge.
- `actions` on a `TabItem` renders **interactive** control(s) (a `Switch`, a close button, a `⋯` menu) OUTSIDE that tab's `role="tab"` button — use it for anything focusable/clickable (a `Badge` or a static status dot stays in `leading`/`trailing`, which render _inside_ the button). `endContent` (a `TabsProps` slot) renders controls for the whole bar (an "add tab" button, a filter toggle) at the end of the strip, outside the tablist, so they never scroll with the tabs and aren't part of arrow-key tab navigation. Keyboard: arrows rove tabs only; `Tab` reaches a tab's `actions`, then `endContent`. Each per-tab `actions` adds a Tab stop, so they're cleanest on the active tab or a handful of tabs.
- `activationMode`: `auto` (default — Arrow keys fire onChange) or `manual` (Arrow only focuses; Enter/Space activates). Use `manual` when panels lazy-load expensive content.
- `orientation`: `horizontal` (default), `vertical`, or `auto`. `auto` is vertical below `autoOrientationBreakpoint` and horizontal at or above it based on the available Tabs/tab-strip width; the breakpoint defaults to 320px and can be set per Tabs instance to match the surrounding layout threshold. Use it with a collapsing `Split` so a fixed rail stays vertical until its pane stacks.
- `panelIdPrefix`: optional. When set, the **active** tab gets `aria-controls="${prefix}-${itemId}-panel"`. Set this if you render the panels in the DOM and want assistive tech to follow the link. Only the active tab carries it because only the active panel is in the DOM — stamping it on every tab (the earlier behaviour) pointed the inactive ones at ids no element had.
- The active-tab underline slides between tabs when `activeId` changes. Respects `prefers-reduced-motion: reduce`.
- `action?: { label, icon?, onClick, disabled? }` renders a `+ New entity`-style button-like pseudo-tab after the tab items, inside the same strip — tab-shaped but visibly muted, NOT `role="tab"`, never selected, skipped by arrow-key roving (reachable via `Tab` instead), and the sliding indicator never targets it. It only fires `onClick`; if the click should change `activeId`, do that yourself in the handler (e.g. append + select a new tab). Known, accepted a11y tradeoff: like the `TabItem.actions` button, this leaves one non-`"tab"` child in the `role="tablist"` container (an `aria-required-children` deviation) — a real `<button>` still announces correctly to assistive tech regardless of its parent's role.

```tsx
// Lazy-loaded panels — manual mode, so arrows scan without loading:
<Tabs items={items} activeId={tab} onChange={setTab} activationMode="manual" />

// Trailing action — a button-like pseudo-tab that never becomes selected:
<Tabs
  items={items}
  activeId={tab}
  onChange={setTab}
  action={{ label: '+ New entity', icon: <Plus size={14} />, onClick: createEntity }}
/>
```

Implements the WAI-ARIA Tabs pattern: roving `tabIndex`, arrow keys (Left/Right horizontal, Up/Down vertical) plus Home/End, `aria-controls`, `aria-orientation`, per-tab/per-panel ids. Controlled: pass `activeId` and `onChange`.

**When NOT to use**

- Navigation between pages: use the sidebar or breadcrumbs. Tabs switch views within a page.
- 5+ tabs: usually the entity is doing too much; split the page or rethink the IA.
- When the user may want two views at once: use side-by-side panels.

**Anti-patterns**

- Lazy-loading tab content but losing form state on switch: preserve state or warn before data is lost.
- The page's primary action inside a tab: it belongs in the page header.
- `orientation="vertical"` as a page sidebar / primary navigation: it is for intra-page section switching, not route changes.
- `orientation="auto"` combined with app-owned viewport measurement: auto measures the available strip width, so let it react to the `Split`'s layout instead of duplicating breakpoint state.
- `action` to switch views: it never sets `activeId`; if the click should select a tab, add a `TabItem`.
