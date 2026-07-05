# Tabs interactive controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Tabs host interactive controls — a per-tab `actions` slot (outside the `role="tab"` button) and a strip-level `endContent` slot (outside the tablist) — without breaking the roving-tabindex/indicator/a11y model.

**Architecture:** Two additive props. `endContent` wraps the existing strip in an outer flex row only when provided (zero change otherwise). `TabItem.actions` wraps a tab in a `role="presentation"` cell holding the unchanged `<button role="tab">` + a sibling actions span; a guard makes the tablist's arrow handler ignore keys that don't originate on a tab. `ref`/`{...props}`/indicator/roving stay exactly as-is.

**Tech Stack:** React + TypeScript, CSS Modules (SCSS), Vitest + `@testing-library/react` + `@testing-library/user-event`.

**Reference spec:** `docs/superpowers/specs/2026-07-05-tabs-controls-design.md`
**Working branch:** `feat/tabs-controls` (already created).

## Conventions

- Tests: `npm test -w @eocrm/design-system -- Tabs --run`. Tests use `userEvent` (imported) + `render`/`screen`/`within`; Vitest globals — do NOT import describe/it/expect/vi.
- Typecheck: `npm run typecheck -w @eocrm/design-system`. SCSS lint (repo ROOT): `npm run lint:css`. Format before push: `npm run format`.
- Commit per task. Do NOT push until Task 6.

---

## Task 1: `endContent` strip-level slot

**Files:**

- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx` (add prop; wrap render when present)
- Modify: `packages/design-system/src/components/Tabs/Tabs.module.scss` (`.root`, `.endContent`)
- Test: `packages/design-system/src/components/Tabs/Tabs.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `Tabs.test.tsx` (inside the top-level `describe('Tabs', ...)`):

```tsx
it('renders endContent outside the tablist and keeps it Tab-reachable', () => {
  render(
    <Tabs
      items={items}
      activeId="a"
      onChange={noop}
      endContent={<button data-testid="new-tab">New</button>}
    />,
  );
  const tablist = screen.getByRole('tablist');
  const end = screen.getByTestId('new-tab');
  expect(end).toBeInTheDocument();
  expect(tablist).not.toContainElement(end); // outside the tablist
});

it('does not render an endContent region when the prop is omitted', () => {
  const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
  // No extra wrapper: the tablist's parent is still the scroll wrapper only.
  expect(container.querySelector('[data-tabs-end]')).toBeNull();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -w @eocrm/design-system -- Tabs --run`
Expected: FAIL — `endContent` prop not accepted / testid absent.

- [ ] **Step 3: Add the prop to `TabsProps`**

In `Tabs.tsx`, add to `TabsProps` (after `orientation?`):

```ts
  orientation?: TabsOrientation;
  /**
   * Controls for the whole tab bar (e.g. an "add tab" button, a filter
   * toggle), rendered at the end of the strip OUTSIDE the tablist so it never
   * scrolls with the tabs and is not part of tab keyboard navigation. For a
   * control attached to a single tab, use `TabItem.actions` instead.
   */
  endContent?: ReactNode;
```

Destructure it: find where props are destructured (the function signature / `const { ... } = props`-style). This component spreads `{...props}` rather than destructuring most props, but `items`, `activeId`, `onChange`, `panelIdPrefix`, `activationMode`, `orientation`, `className` are pulled out. Add `endContent` to that destructuring and ensure it is NOT in the `{...props}` spread onto the tablist. Locate the destructuring near the top of the component body and add `endContent,` alongside `orientation,`.

- [ ] **Step 4: Wrap the render when `endContent` is present**

Replace the `return ( ... )` block (`Tabs.tsx:300-364`) so the current markup becomes a `strip` const, wrapped only when `endContent` is set:

```tsx
const strip = (
  <div className={clsx(styles.scrollWrap, orientation === 'vertical' && styles.scrollWrapVertical)}>
    <div
      {...props}
      ref={ref}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={onKeyDown}
      className={clsx(styles.tabs, orientation === 'vertical' && styles.vertical, className)}
    >
      {items.map((item) => {
        /* ...existing item mapping unchanged... */
      })}
      <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
    </div>
  </div>
);

if (endContent == null) return strip;

return (
  <div className={clsx(styles.root, orientation === 'vertical' && styles.rootVertical)}>
    {strip}
    <div data-tabs-end="" className={styles.endContent}>
      {endContent}
    </div>
  </div>
);
```

(Keep the entire existing `items.map(...)` body exactly as it is — only the surrounding structure changes.)

- [ ] **Step 5: Add the SCSS**

In `Tabs.module.scss`, append:

```scss
// ---- Strip-level endContent (only rendered when the prop is set) ----
// space-between pins endContent to the far end; the scroll wrapper is allowed
// to shrink (min-width: 0) so tabs scroll within it while endContent stays put.
// No flex-grow / margin (Rule 4 / stylelint) — space-between + flex-shrink do it.
.root {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--tabs-endcontent-gap);

  .scrollWrap {
    min-width: 0;
  }
}

.endContent {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.rootVertical {
  flex-direction: column;
  align-items: stretch;

  .endContent {
    justify-content: flex-start;
  }
}
```

Add the token to `Tabs.tokens.scss` (near the other `--tabs-*` gaps):

```scss
--tabs-endcontent-gap: var(--space-2);
```

- [ ] **Step 6: Run tests + lint**

Run: `npm test -w @eocrm/design-system -- Tabs --run && npm run lint:css`
Expected: PASS (new tests + all existing Tabs tests; lint clean).

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/Tabs/
git commit -m "feat(Tabs): endContent slot for strip-level controls"
```

---

## Task 2: Per-tab `actions` slot + arrow-key guard (horizontal)

**Files:**

- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx` (TabItem prop, onKeyDown guard, cell wrapper)
- Modify: `packages/design-system/src/components/Tabs/Tabs.module.scss` (`.cell`, `.tabActions`)
- Test: `packages/design-system/src/components/Tabs/Tabs.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append to `Tabs.test.tsx`:

```tsx
it('renders per-tab actions OUTSIDE the role=tab button', () => {
  render(
    <Tabs
      items={[
        { id: 'a', label: 'Overview' },
        { id: 'b', label: 'Fields', actions: <button data-testid="close-b">x</button> },
      ]}
      activeId="a"
      onChange={noop}
    />,
  );
  const closeBtn = screen.getByTestId('close-b');
  const fieldsTab = screen.getByRole('tab', { name: 'Fields' });
  expect(closeBtn).toBeInTheDocument();
  // The control must NOT be a descendant of the tab button.
  expect(fieldsTab).not.toContainElement(closeBtn);
  // The tab itself is still a proper tab.
  expect(fieldsTab).toHaveAttribute('role', 'tab');
  expect(fieldsTab).toHaveAttribute('aria-selected', 'false');
});

it('clicking a per-tab action does not activate/switch the tab', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <Tabs
      items={[
        { id: 'a', label: 'Overview' },
        { id: 'b', label: 'Fields', actions: <button data-testid="close-b">x</button> },
      ]}
      activeId="a"
      onChange={onChange}
    />,
  );
  await user.click(screen.getByTestId('close-b'));
  expect(onChange).not.toHaveBeenCalled();
});

it('does not rove tabs when an arrow key fires inside a per-tab action control', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <Tabs
      items={[
        { id: 'a', label: 'Overview', actions: <button data-testid="act-a">a</button> },
        { id: 'b', label: 'Fields' },
      ]}
      activeId="a"
      onChange={onChange}
    />,
  );
  screen.getByTestId('act-a').focus();
  await user.keyboard('{ArrowRight}');
  // Focus stayed on the control; tab navigation was NOT triggered.
  expect(document.activeElement).toBe(screen.getByTestId('act-a'));
  expect(onChange).not.toHaveBeenCalled();
});

it('still roves tabs on ArrowRight when focus is on a tab (regression)', async () => {
  const user = userEvent.setup();
  render(
    <Tabs
      items={[
        { id: 'a', label: 'Overview', actions: <button>a</button> },
        { id: 'b', label: 'Fields' },
      ]}
      activeId="a"
      onChange={noop}
    />,
  );
  screen.getByRole('tab', { name: 'Overview' }).focus();
  await user.keyboard('{ArrowRight}');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Fields' }));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -w @eocrm/design-system -- Tabs --run`
Expected: FAIL — `actions` not rendered; arrow-in-control still roves.

- [ ] **Step 3: Add `actions` to `TabItem`**

In `Tabs.tsx`, add to `TabItem` (after `trailing?`):

```ts
  trailing?: ReactNode;
  /**
   * Interactive control(s) for this tab (a `Switch`, a close button, a `⋯`
   * menu), rendered OUTSIDE the tab's `role="tab"` button so the markup is
   * valid and the control is focusable and keyboard-operable. For STATIC
   * adornments (a `Badge`, a status dot, a numeric count) use
   * `leading`/`trailing`/`count` — those render inside the button. Not
   * `aria-hidden`; give controls an accessible label. Adds a Tab stop.
   */
  actions?: ReactNode;
```

- [ ] **Step 4: Add the arrow-key guard**

In `onKeyDown` (`Tabs.tsx:271`), add the guard as the FIRST statement:

```ts
const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
  // Only rove when the key originates on a tab (or the tablist itself). This
  // stops Arrow/Home/End inside a per-tab `actions` control from hijacking
  // tab navigation. Real roving focus always lands on a role="tab".
  if (
    event.target !== event.currentTarget &&
    (event.target as HTMLElement).getAttribute('role') !== 'tab'
  ) {
    return;
  }
  if (items.length === 0 || effectiveFocusedId === null) return;
  /* ...rest unchanged... */
};
```

- [ ] **Step 5: Wrap tabs that have `actions` in a presentation cell**

In the `items.map((item) => { ... })` body, keep the `<button role="tab">…</button>` exactly as-is but assign it to a const `tab`, then return it wrapped when `item.actions` is set. The end of the map callback becomes:

```tsx
const tab = (
  <button
    key={item.id}
    ref={(el) => {
      tabRefs.current[item.id] = el;
      return () => {
        delete tabRefs.current[item.id];
      };
    }}
    id={tabId}
    type="button"
    role="tab"
    aria-selected={active}
    aria-controls={panelId}
    tabIndex={focused ? 0 : -1}
    className={clsx(styles.tab, active && styles.active)}
    onClick={() => {
      if (item.id !== activeId) onChange(item.id);
    }}
  >
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
);

if (item.actions == null) return tab;
return (
  <span key={item.id} role="presentation" className={styles.cell}>
    {tab}
    <span className={styles.tabActions}>{item.actions}</span>
  </span>
);
```

(The `<button>` keeps `key={item.id}`; when wrapped, the `<span>` also carries `key={item.id}` — the list key resolves to the returned root in each branch.)

- [ ] **Step 6: Add the SCSS**

In `Tabs.module.scss`, append:

```scss
// ---- Per-tab actions cell (only for tabs with `actions`) ----
// A presentation wrapper so interactive controls sit OUTSIDE the role="tab"
// button. Kept UNPOSITIONED (static) so the active tab button's offsetLeft/
// offsetWidth — which drive the indicator — are unchanged.
.cell {
  display: inline-flex;
  align-items: center;
  gap: var(--tabs-cell-gap);
}

.tabActions {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}
```

Add the token to `Tabs.tokens.scss`:

```scss
--tabs-cell-gap: var(--space-1);
```

- [ ] **Step 7: Run tests + lint + typecheck**

Run: `npm test -w @eocrm/design-system -- Tabs --run && npm run typecheck -w @eocrm/design-system && npm run lint:css`
Expected: PASS (the 4 new tests + existing suite; the arrow-guard regression test confirms tab roving still works).

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/Tabs/
git commit -m "feat(Tabs): per-tab actions slot outside the tab button + arrow-key guard"
```

---

## Task 3: Vertical-orientation cell styling

**Files:**

- Modify: `packages/design-system/src/components/Tabs/Tabs.module.scss`
- Test: `packages/design-system/src/components/Tabs/Tabs.test.tsx`

- [ ] **Step 1: Write the failing/guard test**

Append to `Tabs.test.tsx`:

```tsx
it('renders per-tab actions in vertical orientation with the tab still a tab', () => {
  render(
    <Tabs
      orientation="vertical"
      items={[
        { id: 'a', label: 'General' },
        { id: 'b', label: 'Security', actions: <button data-testid="v-act">x</button> },
      ]}
      activeId="a"
      onChange={noop}
    />,
  );
  const act = screen.getByTestId('v-act');
  const securityTab = screen.getByRole('tab', { name: 'Security' });
  expect(act).toBeInTheDocument();
  expect(securityTab).not.toContainElement(act);
  expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
});
```

- [ ] **Step 2: Run**

Run: `npm test -w @eocrm/design-system -- Tabs --run`
Expected: PASS structurally (the cell renders in vertical too). This test guards structure; the visual correctness is browser-verified in Task 6. If it fails, the Task 2 cell wrapping didn't apply in vertical — fix before styling.

- [ ] **Step 3: Add vertical cell styling**

In `Tabs.module.scss`, inside the existing `.vertical { ... }` block (or appended after it), add rules so a celled tab becomes the full-width row with the button filling and actions pinned right, and the active-row background covers the whole cell:

```scss
.vertical {
  // ...existing rules unchanged...

  // A celled tab is the full-width row: the button fills, actions pin right.
  .cell {
    width: 100%;
    justify-content: space-between;
    gap: var(--tabs-cell-gap);
  }

  .cell > .tab {
    // The button no longer needs full width itself — the cell is the row.
    flex: 0 1 auto;
    width: auto;
  }

  // Active-row tint covers the whole cell (button + actions), not just the
  // button. :has scopes it to the cell that holds the active tab.
  .cell:has(> .tab.active) {
    background: var(--tabs-vertical-tab-bg-active);
    border-radius: var(--tabs-vertical-tab-radius);
  }

  // Avoid a double background: when a tab is inside a cell, its own active
  // tint is suppressed (the cell provides it). Bare (action-less) tabs keep
  // their existing `.vertical .active` tint.
  .cell > .tab.active {
    background: transparent;
  }
}
```

> NOTE: `flex: 0 1 auto` (shorthand) sets flex-grow:0 — it does NOT trip the `flex-grow` stylelint rule (that rule bans the longhand `flex-grow` property, not the `flex` shorthand). If lint objects, replace with `width: auto;` alone (the cell's `space-between` still pins actions right).

- [ ] **Step 4: Run tests + lint**

Run: `npm test -w @eocrm/design-system -- Tabs --run && npm run lint:css`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/Tabs/
git commit -m "feat(Tabs): vertical-orientation styling for per-tab actions cell"
```

---

## Task 4: Playground demo

**Files:**

- Modify: `packages/playground/src/pages/components/TabsDemo.tsx`

- [ ] **Step 1: Add a "Per-tab controls" example**

At the top of `TabsDemo.tsx`, ensure `Switch` and `Button` are imported from `@eocrm/design-system` (add them to the existing import). **VERIFY the `Switch` API first** by reading `packages/design-system/src/components/Switch/` — confirm prop names (likely `checked` + `onCheckedChange` or `onChange`, plus `aria-label`/`label`); adjust the JSX below to match the real API.

Add a new `<Example>` block (follow the file's existing pattern — a `useState` for `activeId`, a `code` string, and the live render):

```tsx
<Example
  title="Per-tab controls"
  description="Interactive controls (a Switch, a close button) render OUTSIDE the tab's role=tab button via TabItem.actions — so they're valid and keyboard-operable. Static badges keep using leading/trailing."
  code={`// actions renders outside the role="tab" button
<Tabs
  items={[
    { id: 'auto', label: 'Automation', actions: <Switch aria-label="Enable automation" checked={on} onCheckedChange={setOn} /> },
    { id: 'fields', label: 'Fields' },
  ]}
  activeId={activeId}
  onChange={setActiveId}
/>`}
>
  {/* live render: an activeId state + a Switch state, wired to the real Switch API */}
</Example>
```

Wire the live render with local `useState` for `activeId` and the switch's checked state, using the verified `Switch` API. Keep it small and realistic (an "Automation" tab with an enable toggle).

- [ ] **Step 2: Add a "Closeable tabs" sub-example** (generic `actions`, consumer-owned removal)

Add an example where each tab has a ✕ `Button` in `actions` that removes the item from a local `items` state (and re-points `activeId` if the active tab was closed). This demonstrates the generic slot doing closeable tabs without a dedicated API. Use `<Button iconOnly size="xs" aria-label={\`Close \${item.label}\`}>`with a lucide`X` icon.

- [ ] **Step 3: Add a "Strip-level actions" example**

Add an `<Example>` showing `endContent`:

```tsx
<Tabs
  items={items}
  activeId={activeId}
  onChange={setActiveId}
  endContent={<Button size="sm">+ New tab</Button>}
/>
```

with the matching live render.

- [ ] **Step 4: Build the playground**

Run: `npm run build -w playground`
Expected: PASS (typecheck + bundle). The Tabs demo is already routed/navigated — no App/AppShell/registry changes needed.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/TabsDemo.tsx
git commit -m "docs(Tabs): demo per-tab actions, closeable tabs, and endContent"
```

---

## Task 5: AGENTS.md

**Files:**

- Modify: `packages/design-system/AGENTS.md` (the `### <Tabs>` section, ~line 1846-1888)

- [ ] **Step 1: Document both slots**

In the `### <Tabs>` section, add to the prose (near the `items` bullet):

> `actions` on a `TabItem` renders **interactive** control(s) (Switch, close button, ⋯ menu) OUTSIDE that tab's `role="tab"` button — use it for anything focusable/clickable (a `Badge` or static dot stays in `leading`/`trailing`, which render inside the button). `endContent` renders controls (an "add tab" button, a toggle) at the end of the whole bar, outside the tablist, so they never scroll with the tabs. Keyboard: arrows rove tabs only; `Tab` reaches a tab's `actions` then `endContent`. Per-tab `actions` each add a Tab stop, so they're cleanest on the active tab or a few tabs.

- [ ] **Step 2: Typecheck (sanity) + commit**

Run: `npm run typecheck -w @eocrm/design-system`
Expected: PASS.

```bash
git add packages/design-system/AGENTS.md
git commit -m "docs(Tabs): document actions + endContent in AGENTS.md"
```

---

## Task 6: Gates, review, browser-verify, PR

- [ ] **Step 1: Full gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck -w @eocrm/design-system
npm run lint:css
npm run build -w playground
npm pack --dry-run -w @eocrm/design-system
npm run format:check
```

All pass; `npm pack --dry-run` clean. If `format:check` flags files, run `npm run format` and commit.

- [ ] **Step 2: Browser-verify** (playground http://localhost:8080, `/components/tabs`)

Confirm in the browser (jsdom can't see paint):

- A tab with `actions` shows the control beside the label; the animated **underline still sits correctly under that tab** (cell wrapper didn't shift it) — check both a tab-with-actions and switching between it and a plain tab.
- Clicking the per-tab control operates the control and does NOT switch tabs; clicking the tab label still switches.
- Arrow keys rove tabs; focus inside the control + arrow does not jump tabs; `Tab` reaches the control then `endContent`.
- `endContent` stays pinned when the tab strip overflow-scrolls.
- Vertical: a celled row shows the active-row tint across the whole row (button + actions), actions pinned right.

- [ ] **Step 3: Fresh-context review** (CLAUDE.md Rule 8)

Spawn a `general-purpose` reviewer over `git diff main...HEAD` (design-system + demo), briefed on the 10 categories — especially: nested-interactive a11y (control truly outside the button), the arrow guard not breaking roving, indicator correctness with the cell, no Rule-4/stylelint violations in the new SCSS, JSDoc on both new props. Fix Critical/Important; document skips; re-run gates; re-review until `clean enough to stop`.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/tabs-controls
gh pr create --title "feat(Tabs): per-tab actions + strip-level endContent" --body "$(cat <<'EOF'
Lets Tabs host interactive controls, safely outside the role=tab button.

- `TabItem.actions?: ReactNode` — interactive control(s) for a tab (Switch, close ✕, ⋯ menu), rendered outside its `role="tab"` button in a `role="presentation"` cell. Static adornments keep using `leading`/`trailing`/`count`.
- `TabsProps.endContent?: ReactNode` — controls for the whole bar (add-tab, toggle), outside the tablist, pinned so they don't scroll with the tabs.
- Arrow-key guard so keys inside a per-tab control don't hijack tab navigation (also a latent-bug fix).

Events-only, no breaking changes: `ref`/`{...props}`/indicator/roving tabindex/existing slots unchanged.

Spec: docs/superpowers/specs/2026-07-05-tabs-controls-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5:** Wait for `Quality / check` to pass. Merging is a HUMAN-authorized step (auto-publishes) — confirm with the user before merging.

---

## Self-review notes

- **Spec coverage:** `endContent` (T1) · `actions` + cell + arrow guard (T2) · vertical styling (T3) · demo incl. closeable-via-generic-actions (T4) · JSDoc (T1/T2 interfaces) + AGENTS.md (T5) · gates/review/browser/PR (T6). All spec sections mapped.
- **A11y core:** control is a sibling of the button inside a `role="presentation"` cell (T2 Step 5) → not nested-interactive; arrow guard (T2 Step 4) → no key hijack; both verified by tests + browser.
- **Indicator safety:** cell is unpositioned (T2 Step 6 comment) → button offset math unchanged; browser-verified (T6 Step 2).
- **Type consistency:** `endContent`/`actions` names, `.cell`/`.tabActions`/`.root`/`.endContent` classes, `--tabs-cell-gap`/`--tabs-endcontent-gap` tokens used identically across tasks.
- **Merge gated on human approval** (T6 Step 5) — auto-publish is outward-facing.
- **Execution-time verifies:** the exact `Switch` API (T4 Step 1) and, if lint objects, the `flex` shorthand fallback (T3 Step 3 note).
