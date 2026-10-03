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
- `panelIdPrefix`: optional. When set, the **active** tab gets `aria-controls="${prefix}-${itemId}-panel"`. Set this if you render the panels in the DOM and want assistive tech to follow the link. Only the active tab carries it because only the active panel is in the DOM — stamping it on every tab (the pre-#501 behaviour) pointed the inactive ones at ids no element had.
- The active-tab underline slides between tabs when `activeId` changes. Respects `prefers-reduced-motion: reduce`.
- `action?: { label, icon?, onClick, disabled? }` renders a `+ New entity`-style button-like pseudo-tab after the tab items, inside the same strip — tab-shaped but visibly muted, NOT `role="tab"`, never selected, skipped by arrow-key roving (reachable via `Tab` instead), and the sliding indicator never targets it. It only fires `onClick`; if the click should change `activeId`, do that yourself in the handler (e.g. append + select a new tab). Known, accepted a11y tradeoff: like the `TabItem.actions` button, this leaves one non-`"tab"` child in the `role="tablist"` container (an `aria-required-children` deviation) — a real `<button>` still announces correctly to assistive tech regardless of its parent's role.
