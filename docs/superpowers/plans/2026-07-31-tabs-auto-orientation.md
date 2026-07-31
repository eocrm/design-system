# Tabs Automatic Orientation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Tabs orientation="auto"` so a narrow Split rail is vertical and becomes horizontal when its own inline size reaches 320px.

**Architecture:** Tabs will merge its public forwarded ref with an internal tablist ref, synchronously measure that element in a layout effect, and subscribe to one `ResizeObserver` only in automatic mode. A single derived effective orientation will drive semantics, keyboard handling, CSS classes, scrolling, and indicator measurement.

**Tech Stack:** React 19, TypeScript, CSS Modules/Sass, Vitest + React Testing Library, Vite playground, Playwright/Chromium.

## Global Constraints

- `TabsOrientation` becomes exactly `'horizontal' | 'vertical' | 'auto'`.
- Automatic orientation is vertical below 320px and horizontal at or above 320px.
- Automatic mode starts vertical during SSR and when `ResizeObserver` is unavailable.
- Existing explicit horizontal/vertical behavior and the default horizontal orientation remain unchanged.
- One effective orientation must drive ARIA, keyboard axis, classes, scroll layout, end-content layout, and indicator geometry.
- The public ref remains attached to the `role="tablist"` element.
- No new runtime dependency and no consumer-owned measurement.
- Follow package Hard Rules 1–9 and update JSDoc, `AGENTS.md`, and the playground demo.

---

### Task 1: Implement and test automatic Tabs orientation

**Files:**

- Modify: `packages/design-system/src/components/Tabs/Tabs.test.tsx`
- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx`

**Interfaces:**

- Consumes: `mergeRefs<T>(...refs): Ref<T>` from `packages/design-system/src/components/_internal/refs.ts`.
- Produces: `TabsOrientation = 'horizontal' | 'vertical' | 'auto'` and unchanged `TabsProps.orientation?: TabsOrientation`.
- Produces internal constant `AUTO_ORIENTATION_BREAKPOINT = 320` and effective orientation type `'horizontal' | 'vertical'`.

- [ ] **Step 1: Add a controllable ResizeObserver test double**

Add a test helper local to `Tabs.test.tsx` that records callbacks, observed elements, and disconnect calls. Its `resize(width)` method invokes the observer callback inside React Testing Library `act` with a literal `contentRect.width`.

```tsx
interface ResizeObserverHarness {
  resize: (width: number) => void;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

function stubResizeObserver(): ResizeObserverHarness {
  let callback: ResizeObserverCallback | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();
  class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      callback = cb;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  return {
    observe,
    disconnect,
    resize(width) {
      act(() => {
        callback?.(
          [{ contentRect: { width } } as ResizeObserverEntry],
          null as unknown as ResizeObserver,
        );
      });
    },
  };
}
```

- [ ] **Step 2: Write failing auto-mode behavior tests**

Add tests proving the observable contract, including the keyboard axis rather than only implementation state:

```tsx
describe('automatic orientation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts vertical and observes the forwarded tablist', () => {
    const observer = stubResizeObserver();
    const ref = createRef<HTMLDivElement>();
    render(<Tabs ref={ref} items={items} activeId="a" onChange={noop} orientation="auto" />);
    expect(ref.current).toBe(screen.getByRole('tablist'));
    expect(observer.observe).toHaveBeenCalledWith(ref.current);
    expect(ref.current).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('switches semantics, styling, keyboard axis, and indicator geometry at 320px', async () => {
    const observer = stubResizeObserver();
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Tabs items={items} activeId="a" onChange={onChange} orientation="auto" />,
    );
    observer.resize(320);
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
    expect(tablist.className).not.toMatch(/vertical/);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('b');
    const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
    expect(indicator.style.transform).toMatch(/translateX\(/);
    expect(indicator.style.width).toMatch(/px$/);
    expect(indicator.style.height).toBe('');
  });

  it('switches back below 320px and uses vertical arrow navigation', async () => {
    const observer = stubResizeObserver();
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} orientation="auto" />);
    observer.resize(480);
    observer.resize(319);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it.each(['horizontal', 'vertical'] as const)(
    'does not observe explicit %s mode',
    (orientation) => {
      const observer = stubResizeObserver();
      render(<Tabs items={items} activeId="a" onChange={noop} orientation={orientation} />);
      expect(observer.observe).not.toHaveBeenCalled();
    },
  );
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
npm test --workspace @eocrm/design-system -- --run src/components/Tabs/Tabs.test.tsx
```

Expected: FAIL because `'auto'` is not assignable to `TabsOrientation` and automatic measurement does not exist.

- [ ] **Step 4: Implement the minimal automatic-orientation state**

In `Tabs.tsx`:

```tsx
import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  // existing type imports
} from 'react';
import { mergeRefs } from '../_internal/refs';

export type TabsOrientation = 'horizontal' | 'vertical' | 'auto';

const AUTO_ORIENTATION_BREAKPOINT = 320;
type EffectiveTabsOrientation = Exclude<TabsOrientation, 'auto'>;
```

Inside `Tabs`, add a tablist ref and state, then derive one effective value:

```tsx
const tablistRef = useRef<HTMLDivElement>(null);
const [automaticOrientation, setAutomaticOrientation] =
  useState<EffectiveTabsOrientation>('vertical');
const effectiveOrientation: EffectiveTabsOrientation =
  orientation === 'auto' ? automaticOrientation : orientation;

useLayoutEffect(() => {
  if (orientation !== 'auto') return;
  const node = tablistRef.current;
  if (!node || typeof ResizeObserver === 'undefined') return;
  const update = (width: number) =>
    setAutomaticOrientation(width >= AUTO_ORIENTATION_BREAKPOINT ? 'horizontal' : 'vertical');
  update(node.getBoundingClientRect().width);
  const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width));
  observer.observe(node);
  return () => observer.disconnect();
}, [orientation]);
```

Replace every orientation-dependent branch with `effectiveOrientation`, including the indicator effect dependency. Attach `ref={mergeRefs(ref, tablistRef)}` to the existing tablist element. Do not add or move DOM wrappers.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Task 1 focused command again. Expected: all Tabs tests pass with no React warnings.

- [ ] **Step 6: Run typecheck and commit**

```bash
make build-lib
git add packages/design-system/src/components/Tabs/Tabs.tsx packages/design-system/src/components/Tabs/Tabs.test.tsx
git commit -m "feat(Tabs): add automatic orientation"
```

---

### Task 2: Document and demonstrate the responsive Split composition

**Files:**

- Modify: `packages/design-system/src/components/Tabs/Tabs.tsx`
- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/playground/src/pages/components/TabsDemo.tsx`

**Interfaces:**

- Consumes: `orientation="auto"` from Task 1.
- Produces: canonical public example `<Split asideWidth="220px" collapseBelow="sm" aside={<Tabs orientation="auto" ... />}>`.

- [ ] **Step 1: Update Tabs JSDoc and examples**

Document all three orientation values on `TabsOrientation` and `TabsProps.orientation`. State the exact 320px rule, SSR/no-observer vertical fallback, and that automatic mode is intended for a collapsing Split. Change the component's master-detail example to include `collapseBelow="sm"`, `asideWidth="220px"`, and `orientation="auto"`. Add an anti-pattern warning not to combine auto mode with app-owned viewport measurement.

- [ ] **Step 2: Update the agent-facing Tabs and Split guidance**

In `AGENTS.md`, update the Tabs orientation bullet and the Split canonical snippet. The guidance must say:

```md
- `orientation`: `horizontal` (default), `vertical`, or `auto`. `auto` is vertical below 320px and horizontal at or above 320px based on the tablist's own width; use it with a collapsing `Split`.
```

- [ ] **Step 3: Convert the playground master-detail example**

Change the existing vertical Tabs example to demonstrate the real issue composition:

```tsx
<Split
  gap="lg"
  asideWidth="220px"
  collapseBelow="sm"
  aside={<Tabs orientation="auto" items={...} activeId={section} onChange={setSection} />}
>
```

Rename the example to `Responsive master–detail` and explain that the rail is vertical at 220px and horizontal after Split stacks. Add `data-testid="responsive-tabs-split"` to the live Split only so Playwright can resize the containing example deterministically without relying on hashed classes.

- [ ] **Step 4: Verify docs, demo typecheck, and formatting**

```bash
npm run typecheck --workspace playground
npm run format:check
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/Tabs/Tabs.tsx packages/design-system/AGENTS.md packages/playground/src/pages/components/TabsDemo.tsx
git commit -m "docs(Tabs): demonstrate responsive orientation"
```

---

### Task 3: Browser validation and release gates

**Files:**

- No committed Playwright harness; use an isolated `/tmp` script against the Vite playground.

**Interfaces:**

- Consumes: live element `[data-testid="responsive-tabs-split"]` and its `role="tablist"` descendant.
- Produces: browser evidence for issue #398 and the PR test plan.

- [ ] **Step 1: Run all repository gates**

```bash
make test
make build-lib
make lint
npm run format:check
npm_config_cache=/tmp/tabs-auto-npm-cache npm pack --workspace @eocrm/design-system --dry-run
```

Expected: 0 failures and no test/spec/internal-only paths in the tarball.

- [ ] **Step 2: Start the playground and validate in Playwright**

Start `npm run dev --workspace playground -- --host 127.0.0.1`. In a temporary Playwright script:

1. open `http://127.0.0.1:8080/components/tabs`;
2. locate `[data-testid="responsive-tabs-split"]` and its tablist;
3. set the example host to 700px and assert `aria-orientation="vertical"` while the Split is side-by-side and the tablist is approximately 220px wide;
4. set the example host to 460px, assert Split stacks below its 480px breakpoint and its full-width tablist reports `aria-orientation="horizontal"` because it is wider than 320px;
5. focus the first tab and prove ArrowRight selects/focuses the second tab in horizontal mode;
6. restore 700px and prove ArrowDown selects/focuses the next tab in vertical mode.

- [ ] **Step 3: Run the mandatory pre-push library review loop**

Invoke `.claude/skills/pre-push-review/SKILL.md` Variant A: baseline gates, draft PR, two fresh reviewers, fix every Critical/Important finding, and repeat until both reviewers in one round return `clean enough to stop`.

- [ ] **Step 4: Complete issue delivery**

Push the branch, open a draft PR with `Addresses #398`, wait for `Quality / check`, squash-merge, watch the exact Release run, confirm the new `v*` tag, comment the published package version on issue #398, and close it only after publication succeeds.
