# Tabs Vertical Orientation + leading/trailing Adornments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `<Tabs orientation="vertical">` render a real vertical master–detail tab strip (stacked full-width rows, vertical active indicator, Up/Down keyboard) and add `leading`/`trailing` ReactNode adornment slots to `TabItem`.

**Architecture:** The existing `Tabs` is controlled, implements the full WAI-ARIA Tabs pattern, and positions a single shared indicator via inline styles written from a `useLayoutEffect` that reads the active button's offset metrics. We extend it along three axes: (1) the indicator measurement becomes orientation-aware (`translateY`/`height` for vertical instead of `translateX`/`width`); (2) keyboard navigation uses ArrowUp/ArrowDown when vertical (APG); (3) the tab button DOM gains a `.main` group wrapper so a `trailing` slot can be pushed to the far edge in vertical mode via `justify-content: space-between` (no `margin`/`flex-grow`, honoring Rule 4). Vertical active state = left accent bar (the indicator) + subtle tinted row background. All new visuals are component tokens defaulting to existing primitives.

**Tech Stack:** React 19 (`forwardRef`, `useLayoutEffect`, `useId`), TypeScript, CSS Modules + SCSS, design tokens (CSS custom properties), Vitest + React Testing Library (`globals: true`), `@testing-library/user-event`.

---

## File Structure

- `packages/design-system/src/components/Tabs/Tabs.tsx` — add `leading`/`trailing` to `TabItem`; restructure the button DOM with a `.main` group wrapper + `.label` span; make the indicator `useLayoutEffect` orientation-aware; make `onKeyDown` orientation-aware; pass orientation class to the tablist + scroll wrapper; expand JSDoc (`@example` vertical, `@remarks` updates, prop docs for `leading`/`trailing`).
- `packages/design-system/src/components/Tabs/Tabs.module.scss` — add `.vertical` modifiers (column layout, full-width rows, left-edge indicator geometry, active bar + tinted row, hover row, `space-between` for trailing), `.main`, `.label`, `.leading`, `.trailing` classes, `.scrollWrapVertical`.
- `packages/design-system/src/components/Tabs/Tabs.tokens.scss` — add vertical-specific tokens (indicator width, active/hover row bg, row radius, row padding).
- `packages/design-system/src/components/Tabs/Tabs.test.tsx` — add tests: vertical keyboard (Up/Down + wrap), vertical indicator inline styles (translateY/height), `leading`/`trailing` rendering, both together, slot ordering; update the one direct-children ordering test to account for the `.main` wrapper.
- `packages/playground/src/pages/components/TabsDemo.tsx` — add a "Vertical (master–detail)" example and a "Leading / trailing adornments" example exercising the real component.
- `packages/design-system/AGENTS.md` — extend the `<Tabs>` section: vertical orientation, `leading`/`trailing` in the items bullet, a vertical snippet.

No manifest/index/route/nav changes: `Tabs` is an existing exported, manifested, demoed component.

---

## Design reference (single source of truth for all tasks)

### TabItem interface (final)

```tsx
export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  /**
   * Optional leading adornment rendered before the icon/label (e.g. a status
   * dot). Rendered as-is (NOT `aria-hidden`): if purely decorative mark your
   * node `aria-hidden`; if meaningful, give it accessible text so it joins the
   * tab's accessible name. Distinct from `icon`, which is always decorative.
   */
  leading?: ReactNode;
  /**
   * Optional trailing adornment rendered at the end of the tab (e.g. an
   * unsaved-changes badge or status `Badge`). In `vertical` orientation it is
   * pinned to the row's far-right edge; in `horizontal` it follows the label/
   * count. Rendered as-is (NOT `aria-hidden`) — same a11y note as `leading`.
   */
  trailing?: ReactNode;
}
```

### Button DOM (both orientations, consistent)

```tsx
<button /* ...roving tabindex, role=tab, aria-selected, aria-controls, onClick... */>
  <span className={styles.main}>
    {item.leading != null && <span className={styles.leading}>{item.leading}</span>}
    {item.icon != null && (
      <span className={styles.icon} aria-hidden="true">
        {item.icon}
      </span>
    )}
    <span className={styles.label}>{item.label}</span>
    {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
  </span>
  {item.trailing != null && <span className={styles.trailing}>{item.trailing}</span>}
</button>
```

Notes:

- `count` stays inside `.main` (grouped with the label, as today).
- `trailing` is a sibling of `.main` so `space-between` can push it to the edge in vertical mode.
- Indicator `<span>` stays a direct child of `.tabs` (measured against the button, unaffected by `.main`).

### Indicator useLayoutEffect (orientation-aware)

Replace the body that writes inline styles. The first-paint no-animation branch and the "hide when activeId matches nothing" branch are preserved; only the axis written changes. Clear the cross-axis inline dimension so a runtime orientation flip can't leave a stale `width`/`height`.

```tsx
useLayoutEffect(() => {
  const indicator = indicatorRef.current;
  if (!indicator) return;
  const node = tabRefs.current[activeId];
  if (!node) {
    indicator.style.opacity = '0';
    return;
  }
  indicator.style.opacity = '1';

  const vertical = orientation === 'vertical';
  const write = () => {
    if (vertical) {
      indicator.style.transform = `translateY(${node.offsetTop}px)`;
      indicator.style.height = `${node.offsetHeight}px`;
      indicator.style.width = ''; // CSS owns the bar thickness in vertical
    } else {
      indicator.style.transform = `translateX(${node.offsetLeft}px)`;
      indicator.style.width = `${node.offsetWidth}px`;
      indicator.style.height = ''; // CSS owns the bar thickness in horizontal
    }
  };

  if (firstMeasureRef.current) {
    indicator.style.transition = 'none';
    write();
    void indicator.offsetWidth; // force reflow before re-enabling transition
    indicator.style.transition = '';
    firstMeasureRef.current = false;
    return;
  }
  write();
}, [activeId, items, orientation]);
```

(Add `orientation` to the dependency array so a runtime flip re-measures. Reset `firstMeasureRef` is NOT needed — the flip just re-measures with the transition on, which is fine.)

### Keyboard (orientation-aware)

```tsx
const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
  if (items.length === 0 || effectiveFocusedId === null) return;
  const currentIndex = items.findIndex((i) => i.id === effectiveFocusedId);
  const vertical = orientation === 'vertical';
  const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
  const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
  let nextIndex = -1;
  switch (event.key) {
    case nextKey:
      nextIndex = (currentIndex + 1) % items.length;
      break;
    case prevKey:
      nextIndex = (currentIndex - 1 + items.length) % items.length;
      break;
    case 'Home':
      nextIndex = 0;
      break;
    case 'End':
      nextIndex = items.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  focusTab(items[nextIndex].id);
};
```

(`switch` on computed `nextKey`/`prevKey` consts is fine — they are string literals at runtime.)

### Class wiring in render

```tsx
<div className={clsx(styles.scrollWrap, orientation === 'vertical' && styles.scrollWrapVertical)}>
  <div
    {...props}
    ref={ref}
    role="tablist"
    aria-orientation={orientation}
    onKeyDown={onKeyDown}
    className={clsx(styles.tabs, orientation === 'vertical' && styles.vertical, className)}
  >
```

### SCSS additions (tokens-only; no margin/flex-grow/align-self/raw values)

```scss
.main {
  display: inline-flex;
  align-items: center;
  gap: var(--tabs-tab-gap);
  min-width: 0; // lets the label shrink/ellipsis instead of overflowing the row
}

.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.leading,
.trailing {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

// ---- Vertical orientation ----
.scrollWrapVertical {
  overflow-x: visible; // vertical rows are width:100%; no horizontal scroll/clip
}

.vertical {
  flex-direction: column;
  gap: var(--tabs-vertical-gap);
  border-bottom: none; // no horizontal track in vertical mode
  min-width: 0;

  .tab {
    width: 100%;
    justify-content: space-between; // .main left, .trailing pinned right
    padding: var(--tabs-vertical-tab-padding-y) var(--tabs-vertical-tab-padding-x);
    border-radius: var(--tabs-vertical-tab-radius);
    text-align: left;
    transition:
      color var(--transition-fast),
      background var(--transition-fast);

    &:not(.active):hover {
      background: var(--tabs-vertical-tab-bg-hover);
    }
  }

  .active {
    background: var(--tabs-vertical-tab-bg-active);
  }

  .indicator {
    inset-block-start: 0; // top:0 — JS drives translateY + height
    inset-inline-start: 0; // left:0 — inside the box so it is never clipped
    bottom: auto;
    width: var(--tabs-vertical-indicator-width);
    height: 0;
    border-radius: var(--tabs-vertical-indicator-radius);
  }
}
```

`.indicator` base transition gains `height` so the vertical bar animates:

```scss
.indicator {
  /* ...existing... */
  transition:
    transform var(--transition-base),
    width var(--transition-base),
    height var(--transition-base);
}
```

### Token additions (`Tabs.tokens.scss`)

```scss
// Vertical orientation
--tabs-vertical-gap: var(--space-1);
--tabs-vertical-tab-padding-y: var(--space-2);
--tabs-vertical-tab-padding-x: var(--space-3);
--tabs-vertical-tab-radius: var(--radius-sm);
--tabs-vertical-tab-bg-hover: var(--color-bg-muted);
--tabs-vertical-tab-bg-active: var(--color-accent-subtle-bg);
--tabs-vertical-indicator-width: var(--border-width-strong);
--tabs-vertical-indicator-radius: var(--radius-sm);
```

---

## Task 1: TabItem `leading`/`trailing` props + DOM restructure (TDD)

**Files:**

- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx`
- Modify: `packages/design-system/src/components/Tabs/Tabs.module.scss`
- Test: `packages/design-system/src/components/Tabs/Tabs.test.tsx`

- [ ] **Step 1: Write failing tests for leading/trailing**

Add a `describe('leading / trailing adornments', () => { ... })` block:

```tsx
describe('leading / trailing adornments', () => {
  it('renders a leading adornment inside the tab button', () => {
    const items: TabItem[] = [
      { id: 'a', label: 'Settings', leading: <span data-testid="lead-dot" /> },
      { id: 'b', label: 'Billing' },
    ];
    render(<Tabs items={items} activeId="a" onChange={noop} />);
    const dot = screen.getByTestId('lead-dot');
    expect(screen.getByRole('tab', { name: /Settings/ })).toContainElement(dot);
  });

  it('renders a trailing adornment inside the tab button', () => {
    const items: TabItem[] = [
      { id: 'a', label: 'Settings', trailing: <span data-testid="trail-badge" /> },
      { id: 'b', label: 'Billing' },
    ];
    render(<Tabs items={items} activeId="a" onChange={noop} />);
    const badge = screen.getByTestId('trail-badge');
    expect(screen.getByRole('tab', { name: /Settings/ })).toContainElement(badge);
  });

  it('renders leading and trailing together (leading before label, trailing after)', () => {
    const items: TabItem[] = [
      {
        id: 'a',
        label: 'Settings',
        leading: <span data-testid="lead" />,
        trailing: <span data-testid="trail" />,
      },
    ];
    render(<Tabs items={items} activeId="a" onChange={noop} />);
    const lead = screen.getByTestId('lead');
    const trail = screen.getByTestId('trail');
    // leading precedes trailing in document order
    expect(lead.compareDocumentPosition(trail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not render leading/trailing wrappers when the props are omitted', () => {
    const items: TabItem[] = [{ id: 'a', label: 'A' }];
    const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
    const tab = container.querySelector('button[role="tab"]')!;
    expect(tab.querySelector('[class*="leading"]')).toBeNull();
    expect(tab.querySelector('[class*="trailing"]')).toBeNull();
  });
});
```

Also UPDATE the existing `'icon + count both render together'` test (the `.main` wrapper changes direct children). Replace its body with order checks that don't assume direct-childhood:

```tsx
it('icon + count both render together (icon before label, count after)', () => {
  const itemsBoth: TabItem[] = [
    { id: 'a', label: 'Activity', icon: <svg data-testid="tab-icon" />, count: 12 },
  ];
  render(<Tabs items={itemsBoth} activeId="a" onChange={noop} />);
  const tab = screen.getByRole('tab', { name: 'Activity' });
  const icon = within(tab).getByTestId('tab-icon');
  const count = tab.querySelector('[class*="count"]')!;
  expect(tab).toContainElement(icon as HTMLElement);
  expect(count.textContent).toBe('12');
  // icon precedes the count in document order
  expect(icon.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
```

Add `within` to the testing-library import: `import { render, screen, within } from '@testing-library/react';`

- [ ] **Step 2: Run tests, verify the new ones fail**

Run: `cd packages/design-system && npx vitest run src/components/Tabs/Tabs.test.tsx`
Expected: the new leading/trailing tests FAIL (props not rendered yet); the updated icon+count test may pass or fail depending on current DOM — that's fine, it locks the new structure.

- [ ] **Step 3: Add `leading`/`trailing` to the `TabItem` interface**

Add the two optional `ReactNode` props with the JSDoc shown in the Design reference.

- [ ] **Step 4: Restructure the button DOM**

Replace the button's children with the `.main` wrapper structure from the Design reference (leading, icon, `.label` span, count inside `.main`; trailing as sibling).

- [ ] **Step 5: Add `.main`, `.label`, `.leading`, `.trailing` SCSS**

Add the classes from the Design reference SCSS block (the non-vertical ones). Keep `.tab` as `inline-flex` for horizontal.

- [ ] **Step 6: Run tests, verify all pass**

Run: `cd packages/design-system && npx vitest run src/components/Tabs/Tabs.test.tsx`
Expected: PASS (all, including the icon-order and a11y/icon tests).

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/Tabs/Tabs.tsx packages/design-system/src/components/Tabs/Tabs.module.scss packages/design-system/src/components/Tabs/Tabs.test.tsx
git commit -m "feat(Tabs): add leading/trailing adornment slots to TabItem"
```

---

## Task 2: Vertical layout, indicator, and keyboard (TDD)

**Files:**

- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx`
- Modify: `packages/design-system/src/components/Tabs/Tabs.module.scss`
- Modify: `packages/design-system/src/components/Tabs/Tabs.tokens.scss`
- Test: `packages/design-system/src/components/Tabs/Tabs.test.tsx`

- [ ] **Step 1: Write failing tests for vertical keyboard + indicator**

Add to the existing file (the `orientation="vertical"` aria test already exists — keep it):

```tsx
describe('vertical orientation', () => {
  it('moves focus DOWN on ArrowDown and fires onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} orientation="vertical" />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Activity/ }));
  });

  it('moves focus UP on ArrowUp and wraps from the first to the last', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} orientation="vertical" />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowUp}');
    expect(onChange).toHaveBeenLastCalledWith('c');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Notes' }));
  });

  it('ignores ArrowLeft/ArrowRight in vertical mode', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} orientation="vertical" />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowLeft}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('writes translateY + height inline styles on the indicator when vertical', () => {
    const { container } = render(
      <Tabs items={items} activeId="a" onChange={noop} orientation="vertical" />,
    );
    const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
    expect(indicator.style.transform).toMatch(/translateY\(/);
    expect(indicator.style.height).toMatch(/px$/);
  });

  it('applies the vertical modifier class to the tablist', () => {
    const { container } = render(
      <Tabs items={items} activeId="a" onChange={noop} orientation="vertical" />,
    );
    const list = container.querySelector('[role="tablist"]')!;
    expect(list.className).toMatch(/vertical/);
  });
});
```

(Note: jsdom returns 0 for offsetTop/offsetHeight, so `translateY(0px)` and `height: 0px` — the regexes match those. Home/End already covered by existing tests and are orientation-independent.)

- [ ] **Step 2: Run tests, verify the new ones fail**

Run: `cd packages/design-system && npx vitest run src/components/Tabs/Tabs.test.tsx`
Expected: vertical keyboard tests FAIL (still using Left/Right); indicator-axis test FAILS (still translateX/width); vertical-class test FAILS.

- [ ] **Step 3: Make the indicator useLayoutEffect orientation-aware**

Replace the effect body with the Design-reference version (branch on `vertical`, clear cross-axis dimension, add `orientation` to deps).

- [ ] **Step 4: Make onKeyDown orientation-aware**

Replace the switch with the Design-reference version (computed `nextKey`/`prevKey`).

- [ ] **Step 5: Wire the orientation classes**

Update the render wrapper + tablist `className` to add `styles.scrollWrapVertical` and `styles.vertical` as in the Design reference.

- [ ] **Step 6: Add the vertical SCSS + tokens**

Add `.scrollWrapVertical` and the `.vertical { ... }` block to `Tabs.module.scss`, add `height` to the `.indicator` transition, and add the vertical tokens to `Tabs.tokens.scss` (both from the Design reference).

- [ ] **Step 7: Run tests, verify all pass**

Run: `cd packages/design-system && npx vitest run src/components/Tabs/Tabs.test.tsx`
Expected: PASS (all, including existing horizontal keyboard + indicator tests — horizontal still uses Left/Right + translateX/width).

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/Tabs/
git commit -m "feat(Tabs): real vertical orientation — column layout, left indicator, Up/Down keys"
```

---

## Task 3: JSDoc — vertical example + leading/trailing prop docs + @remarks

**Files:**

- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx`

- [ ] **Step 1: Update the `orientation` prop JSDoc**

Replace the current "Only affects how AT announces the strip — the layout itself is up to the consumer's container." text, since vertical now changes layout:

```tsx
/**
 * `'horizontal'` (default) — a horizontal strip with a sliding underline.
 * `'vertical'` — a stacked master–detail rail: full-width rows, a left accent
 * bar + tinted background on the active row, and ArrowUp/ArrowDown navigation.
 * Sets `aria-orientation` on the tablist accordingly. Put a vertical strip in a
 * fixed/`auto`-width column (e.g. a `Cluster` with the panel beside it).
 */
orientation?: TabsOrientation;
```

- [ ] **Step 2: Add a vertical `@example` to the component JSDoc**

Insert after the manual-mode example:

```tsx
 * @example
 * // Vertical master–detail rail with a trailing unsaved-changes badge:
 * <Cluster gap="lg" align="start">
 *   <Tabs
 *     orientation="vertical"
 *     items={[
 *       { id: 'general', label: 'General' },
 *       { id: 'security', label: 'Security', trailing: <Badge tone="warning">Unsaved</Badge> },
 *       { id: 'billing', label: 'Billing', count: 3 },
 *     ]}
 *     activeId={section}
 *     onChange={setSection}
 *   />
 *   <SectionPanel id={section} />
 * </Cluster>
```

- [ ] **Step 3: Add a vertical anti-pattern to `@remarks Anti-patterns`**

Append one bullet:

```tsx
 * - ❌ Using `orientation="vertical"` as a page sidebar / primary navigation.
 *   It is for *intra-page* master–detail section switching, not route changes —
 *   use the app sidebar for navigation.
```

- [ ] **Step 4: Verify the JSDoc compiles (typecheck)**

Run: `cd packages/design-system && npm run typecheck`
Expected: PASS (JSDoc `@example` is not compiled, but the file must still typecheck).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/Tabs/Tabs.tsx
git commit -m "docs(Tabs): JSDoc for vertical orientation + leading/trailing slots"
```

---

## Task 4: Playground demo — vertical + adornment examples

**Files:**

- Modify: `packages/playground/src/pages/components/TabsDemo.tsx`

- [ ] **Step 1: Add state + imports for the new examples**

At the top of `TabsDemo`, add `const [vTab, setVTab] = useState('general');` and ensure `Cluster`, `Badge` are imported from `@eocrm/design-system` (add to the existing import grouping). Keep using real lucide icons already imported.

- [ ] **Step 2: Add the "Vertical (master–detail)" Example**

Add an `<Example>` block AFTER the existing examples that renders the REAL `Tabs` with `orientation="vertical"`, a `Cluster` to place a panel `Card` beside it, and at least one item using `trailing` (e.g. a `Badge tone="warning"` "Unsaved") and one using `count`. The `code` string mirrors the live JSX. Example body:

```tsx
<Example
  title="Vertical (master–detail)"
  description="orientation=\"vertical\" renders a stacked rail: full-width rows, a left accent bar + tinted background on the active row, and ArrowUp/ArrowDown navigation. Place it beside the detail panel in a Cluster. Best for settings / config editors."
  code={`const [section, setSection] = useState('general');

<Cluster gap="lg" align="start">
  <Tabs
    orientation="vertical"
    items={[
      { id: 'general', label: 'General', icon: <Settings size={14} /> },
      { id: 'security', label: 'Security', icon: <User size={14} />,
        trailing: <Badge tone="warning">Unsaved</Badge> },
      { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 12 },
    ]}
    activeId={section}
    onChange={setSection}
  />
  <SectionPanel id={section} />
</Cluster>`}
>
  <Cluster gap="lg" align="start">
    <Tabs
      orientation="vertical"
      items={[
        { id: 'general', label: 'General', icon: <Settings size={14} /> },
        {
          id: 'security',
          label: 'Security',
          icon: <User size={14} />,
          trailing: <Badge tone="warning">Unsaved</Badge>,
        },
        { id: 'activity', label: 'Activity', icon: <Activity size={14} />, count: 12 },
      ]}
      activeId={vTab}
      onChange={setVTab}
    />
    <Card padding="md" style={{ color: 'var(--color-fg-muted)', flex: 1 }}>
      Showing <strong>{vTab}</strong> section.
    </Card>
  </Cluster>
</Example>
```

- [ ] **Step 3: Add the "Leading / trailing adornments" Example**

Add an `<Example>` demonstrating `leading` (a small status dot) and `trailing` (a `Badge`) on horizontal tabs, exercising the real component. Use a real, plausible CRM context (e.g. pipeline stages with a status dot + count badge). The `leading` dot may be a tiny inline element; since the demo page (not a mockup) is allowed raw HTML, an inline `<span style>` dot is acceptable here, but PREFER a library element if one fits (e.g. `Badge` dot). Keep it real, not contrived.

- [ ] **Step 4: Run the playground build (typecheck + bundle)**

Run: `cd /Users/dpws/projects/design-system && make build`
Expected: PASS (typecheck + Vite bundle succeed).

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/TabsDemo.tsx
git commit -m "feat(playground): Tabs vertical + leading/trailing demo examples"
```

---

## Task 5: AGENTS.md — document vertical + adornments

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Update the `<Tabs>` section heading + items bullet**

Change the heading from `### \`<Tabs>\` — horizontal tab strip`to`### \`<Tabs>\` — tab strip (horizontal or vertical)`. Update the `items`bullet to mention`leading?`/`trailing?`:

```md
- `items: { id, label, icon?, count?, leading?, trailing? }[]` — `id` must be unique. `icon` is a decorative leading glyph; `count` renders as a chip after the label. `leading`/`trailing` are free-form ReactNode adornments (status dot, unsaved-changes `Badge`); they are NOT `aria-hidden`, so give meaningful ones accessible text. In vertical orientation `trailing` pins to the row's right edge.
```

- [ ] **Step 2: Expand the `orientation` bullet + add a vertical snippet**

Replace the `orientation` bullet:

```md
- `orientation`: `horizontal` (default — sliding underline, ArrowLeft/Right) or `vertical` (stacked master–detail rail: full-width rows, left accent bar + tinted active row, ArrowUp/Down). Put a vertical strip in a fixed-width column beside its detail panel.
```

Add a snippet after the existing horizontal example:

```md
Vertical master–detail rail:

\`\`\`tsx
<Cluster gap="lg" align="start">
<Tabs
orientation="vertical"
items={[
{ id: 'general', label: 'General' },
{ id: 'security', label: 'Security', trailing: <Badge tone="warning">Unsaved</Badge> },
{ id: 'billing', label: 'Billing', count: 3 },
]}
activeId={section}
onChange={setSection}
/>
<SectionPanel id={section} />
</Cluster>
\`\`\`
```

- [ ] **Step 2b: Add a "When NOT to use" note for vertical** (if the Tabs section has such a subsection; otherwise skip). Keep it to one bullet: vertical Tabs ≠ app navigation.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs(AGENTS): Tabs vertical orientation + leading/trailing"
```

---

## Final gates (run after all tasks)

```bash
cd /Users/dpws/projects/design-system
make test && make build-lib && make lint && npm run format:check
npm pack --workspace @eocrm/design-system --dry-run 2>&1 \
  | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'   # expect 0
```

All must be green. Then run the Hard-rule-8 fresh-context adversarial review-fix loop over `packages/design-system/**` before pushing.

---

## Self-Review

**Spec coverage:**

- "vertically render" → Task 2 (column layout, vertical SCSS).
- "stacked items, active item highlighted with a left/inset indicator" → Task 2 (left accent bar + tinted row; user-confirmed both).
- "TabItem accepts leading/trailing ReactNode adornments" → Task 1.
- Vertical keyboard (APG) → Task 2.
- Demo (core invariant) → Task 4. JSDoc @remarks → Task 3. AGENTS.md → Task 5. Tests → Tasks 1 & 2.
- index.ts / manifest / route / nav: unchanged (existing component) — verified in discovery.

**Placeholder scan:** No TBD/TODO; all code shown.

**Type consistency:** `leading`/`trailing` are `ReactNode?` on `TabItem` throughout; `orientation` reads `'vertical'` consistently; token names match between `.tokens.scss` and `.module.scss` (`--tabs-vertical-*`).
