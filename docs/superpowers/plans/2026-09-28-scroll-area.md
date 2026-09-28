# ScrollArea + Popover Viewport Cap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `ScrollArea` primitive (a height-capped region that scrolls
only its body and is keyboard-reachable only when it needs to be) and cap
`Popover.Content` at the viewport height when it contains one. Together these
answer #598 (a notification-centre panel) without turning `DropdownMenu` into
a panel.

**Architecture:** `ScrollArea` is a `forwardRef` `<div data-scroll-area>`.
Its height cap is a token scale or an inline length. A ResizeObserver plus a
MutationObserver decide whether it must be a named tab stop.
`Popover.Content` gains Floating UI's `size()` middleware, which writes
`--popover-available-height`. A `:has([data-scroll-area])` rule turns only
those popovers into a height-capped flex column in which the ScrollArea is
the only shrinking child.

**Tech Stack:** React 19 + TypeScript, CSS Modules (SCSS),
`@floating-ui/react-dom`, Vitest + Testing Library (jsdom), design-tokens
JSON → generated Sass.

**Spec:** `docs/superpowers/specs/2026-09-28-scroll-area-design.md`

## Global Constraints

- Branch: `fix/batch-593-597` (already checked out). Do not create a new branch.
- Tokens only in `.module.scss` (no raw px or colors). Shared values live
  only in `packages/design-tokens/src/tokens.json`. Never edit generated
  files by hand. Run `npm run tokens:check` from the repo root after any
  token change.
- Component tokens: `ScrollArea.module.scss` reads `--scroll-area-*`, which
  alias primitives in `ScrollArea.tokens.scss`.
- `forwardRef` plus spread `HTMLAttributes`, with the spread LAST (consumer
  wins).
- No user-visible strings in the library. The dev warning is a developer
  message and is not i18n'd, matching `ColorPickerPanel`'s dev warn.
- Dev-only code is gated with `process.env.NODE_ENV !== 'production'`.
- Vitest globals: tests do NOT import `describe` / `it` / `expect` / `vi`.
- Run vitest from `packages/design-system` (`npx vitest run <path>`).
- The playground imports only from `@eocrm/design-system`.
- Primitive values: `--size-scroll-area-sm` = `240px`,
  `--size-scroll-area-md` = `400px`, `--size-scroll-area-lg` = `560px`.
- `FOCUSABLE_SELECTOR` is shared with
  `packages/design-system/src/components/_internal/overlay/useFocusTrap.ts`.
- Commit messages end with
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
  No session link.

## Review Focus

1. **Last focusable child removed:** a ScrollArea that had a link and loses
   it while overflowing must BECOME a tab stop again (MutationObserver
   removal path). Test in Task 2.
2. **Consumer `style={{ maxHeight }}` together with the `maxHeight` prop:**
   the consumer's inline style wins, as with every other spread prop. Test
   in Task 2.
3. **A consumer `tabIndex={-1}` / `role`:** spread-last means the consumer
   overrides the computed focusability. Test in Task 2.
4. **A popover with a ScrollArea whose header is taller than the available
   height:** the header must not shrink. Only the ScrollArea may, through
   `flex-shrink: 0` on the other children. SCSS pin in Task 3; checked in
   the browser in Task 5.
5. **Popovers WITHOUT a ScrollArea (ConfirmationPopover, ColorPicker, plain
   Popover):** they must not become flex columns or get a max-height. The
   `:has()` scoping is pinned in Task 3, and the existing Popover,
   ConfirmationPopover and ColorPicker suites must stay green.

---

### Task 1: Scroll-area size primitives

**Files:**
- Modify: `packages/design-tokens/src/tokens.json`
- Regenerate: `packages/design-tokens/generated/web/tokens.scss` (via script)
- Modify: `packages/design-tokens/test/generate.test.mjs:14`
- Modify: `packages/design-tokens/test/source.test.mjs` (the `capturedNames` /
  `webNames` counts near line 280, and the `fixture.light` count near line 376)
- Modify: `packages/design-tokens/test/fixtures/current-web-contract.json`

**Interfaces:**
- Produces: CSS custom properties `--size-scroll-area-sm` (240px),
  `--size-scroll-area-md` (400px) and `--size-scroll-area-lg` (560px), all
  global and non-themed.

- [ ] **Step 1: Add the three tokens to `tokens.json`.** Insert them
  directly after the `size.radio.small` entry (the last `size.radio.*`
  entry). Use exactly this shape, one entry per token:

```json
    {
      "id": "size.scroll.area.small",
      "type": "dimension",
      "value": "240px",
      "outputs": {
        "web": {
          "name": "--size-scroll-area-sm"
        }
      }
    },
    {
      "id": "size.scroll.area.medium",
      "type": "dimension",
      "value": "400px",
      "outputs": {
        "web": {
          "name": "--size-scroll-area-md"
        }
      }
    },
    {
      "id": "size.scroll.area.large",
      "type": "dimension",
      "value": "560px",
      "outputs": {
        "web": {
          "name": "--size-scroll-area-lg"
        }
      }
    },
```

- [ ] **Step 2: Regenerate and run the token tests. Expect the pin failures.**

Run from the repo root: `npm run tokens:generate && npm test -w @eocrm/design-tokens`
Expected: FAIL. `document.tokens.length` is 258 (pinned 255);
`capturedNames.size` is 314 (pinned 311); `webNames.length` is 258 (pinned 255);
the web-contract diff shows three `extra` entries.

- [ ] **Step 3: Update the pins.**
  - `generate.test.mjs`: `assert.equal(document.tokens.length, 258);`
  - `source.test.mjs`, in the counts block: add the comment line
    `  // +3: --size-scroll-area-sm/md/lg (ScrollArea max-height scale, #598; non-themed).`
    under the `--size-otp-cell-xl` comment, then set `capturedNames.size`
    to `314` and `webNames.length` to `258`. Set
    `Object.keys(fixture.light).length` to `311`.
  - `current-web-contract.json`: after `"--size-otp-cell-xl": "48px"`, add a
    comma, then
    `"--size-scroll-area-sm": "240px", "--size-scroll-area-md": "400px", "--size-scroll-area-lg": "560px"`
    (one per line, matching the file's formatting).

- [ ] **Step 4: Verify.**

Run: `npm test -w @eocrm/design-tokens; echo exit=$?` and `npm run tokens:check; echo exit=$?`
Expected: both `exit=0`.

- [ ] **Step 5: Commit.**

```bash
git add packages/design-tokens
git commit -m "feat(tokens): --size-scroll-area-sm/md/lg for ScrollArea (#598)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `ScrollArea` component

**Files:**
- Modify: `packages/design-system/src/components/_internal/overlay/useFocusTrap.ts`
  (export the existing `FOCUSABLE_SELECTOR`)
- Create: `packages/design-system/src/components/ScrollArea/ScrollArea.tsx`
- Create: `packages/design-system/src/components/ScrollArea/ScrollArea.module.scss`
- Create: `packages/design-system/src/components/ScrollArea/ScrollArea.tokens.scss`
- Create: `packages/design-system/src/components/ScrollArea/ScrollArea.test.tsx`
- Create: `packages/design-system/src/components/ScrollArea/index.ts`
- Modify: `packages/design-system/src/index.ts` (export)
- Modify: `packages/design-system/src/_meta/manifest.ts` AND
  `packages/design-system/scripts/generate-manifest.mjs` (CLUSTERS entry)
- Regenerate: `packages/design-system/src/components.manifest.json`
- Modify: `packages/design-tokens/test/package-boundary.test.mjs` (the
  `index.ts` sha256 pin)

**Interfaces:**
- Consumes: `--size-scroll-area-sm/md/lg` (Task 1); `mergeRefs` from
  `../_internal/refs`; the `focus-ring` mixin from `../../styles/mixins`.
- Produces:
  - `export type ScrollAreaMaxHeight = 'sm' | 'md' | 'lg' | number | string;`
  - `export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> { maxHeight?: ScrollAreaMaxHeight }`
  - `export const ScrollArea` (forwardRef to `HTMLDivElement`)
  - The DOM contract Task 3 relies on: the root always carries the
    attribute `data-scroll-area=""`.
  - `export const FOCUSABLE_SELECTOR: string` from `useFocusTrap.ts`

- [ ] **Step 1: Export the selector.** In `useFocusTrap.ts`, change
  `const FOCUSABLE_SELECTOR = [` to `export const FOCUSABLE_SELECTOR = [`.
  Nothing else changes.

- [ ] **Step 2: Write the failing tests** in `ScrollArea.test.tsx`:

```tsx
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ScrollArea } from './ScrollArea';

// jsdom has no layout: scrollHeight/clientHeight are 0 and ResizeObserver is
// undefined. Stub both so the focusability logic can be driven.
function stubLayout(scrollHeight: number, clientHeight: number) {
  const sh = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  const ch = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(clientHeight);
  return {
    set(nextScroll: number, nextClient: number) {
      sh.mockReturnValue(nextScroll);
      ch.mockReturnValue(nextClient);
    },
  };
}

function stubResizeObserver() {
  const callbacks: ResizeObserverCallback[] = [];
  class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      callbacks.push(cb);
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  return {
    fire() {
      act(() => {
        for (const cb of callbacks) cb([], {} as ResizeObserver);
      });
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ScrollArea', () => {
  it('renders a div with the base class and data-scroll-area, not a tab stop by default', () => {
    render(<ScrollArea data-testid="sa">x</ScrollArea>);
    const el = screen.getByTestId('sa');
    expect(el.tagName).toBe('DIV');
    expect(el).toHaveAttribute('data-scroll-area', '');
    expect(el.className).toMatch(/root/);
    expect(el).not.toHaveAttribute('tabindex');
    expect(el).not.toHaveAttribute('role');
  });

  it('forwards ref to the div and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ScrollArea ref={ref} className="mine" data-testid="sa">
        x
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    expect(ref.current).toBe(el);
    expect(el.className).toMatch(/root/);
    expect(el.className).toMatch(/mine/);
  });

  it.each(['sm', 'md', 'lg'] as const)('maxHeight="%s" applies its scale class and no inline max-height', (size) => {
    render(<ScrollArea maxHeight={size} data-testid="sa">x</ScrollArea>);
    const el = screen.getByTestId('sa');
    expect(el.className).toMatch(new RegExp(`max-height-${size}`));
    expect(el.style.maxHeight).toBe('');
  });

  it('a number maxHeight is inline px; a string passes through', () => {
    const { rerender } = render(<ScrollArea maxHeight={320} data-testid="sa">x</ScrollArea>);
    expect(screen.getByTestId('sa').style.maxHeight).toBe('320px');
    rerender(<ScrollArea maxHeight="50vh" data-testid="sa">x</ScrollArea>);
    expect(screen.getByTestId('sa').style.maxHeight).toBe('50vh');
  });

  it("a consumer style.maxHeight wins over the maxHeight prop", () => {
    render(
      <ScrollArea maxHeight={320} style={{ maxHeight: '100px' }} data-testid="sa">
        x
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa').style.maxHeight).toBe('100px');
  });

  it('overflowing with no focusable content: a named region in the tab order', () => {
    stubLayout(500, 100);
    render(<ScrollArea aria-label="Log">plain text</ScrollArea>);
    const region = screen.getByRole('region', { name: 'Log' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('overflowing with a link inside: not a tab stop, no region role', () => {
    stubLayout(500, 100);
    render(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <a href="/x">row</a>
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    expect(el).not.toHaveAttribute('tabindex');
    expect(el).not.toHaveAttribute('role');
  });

  it('not overflowing: not a tab stop', () => {
    stubLayout(100, 100);
    render(
      <ScrollArea aria-label="Log" data-testid="sa">
        plain text
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex');
  });

  it('drops the tab stop when a focusable child is added later', async () => {
    stubLayout(500, 100);
    const { rerender } = render(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <span>row</span>
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).toHaveAttribute('tabindex', '0');
    rerender(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <a href="/x">row</a>
      </ScrollArea>,
    );
    await waitFor(() => expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex'));
  });

  it('becomes a tab stop again when its last focusable child is removed', async () => {
    stubLayout(500, 100);
    const { rerender } = render(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <a href="/x">row</a>
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex');
    rerender(
      <ScrollArea aria-label="Feed" data-testid="sa">
        <span>row</span>
      </ScrollArea>,
    );
    await waitFor(() => expect(screen.getByTestId('sa')).toHaveAttribute('tabindex', '0'));
  });

  it('becomes a tab stop when a resize makes it overflow', () => {
    const layout = stubLayout(100, 100);
    const ro = stubResizeObserver();
    render(
      <ScrollArea aria-label="Log" data-testid="sa">
        plain text
      </ScrollArea>,
    );
    expect(screen.getByTestId('sa')).not.toHaveAttribute('tabindex');
    layout.set(500, 100);
    ro.fire();
    expect(screen.getByTestId('sa')).toHaveAttribute('tabindex', '0');
  });

  it('warns once in dev when it becomes a tab stop with no accessible name', () => {
    stubLayout(500, 100);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<ScrollArea>plain text</ScrollArea>);
    rerender(<ScrollArea>plain text again</ScrollArea>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/ScrollArea/);
  });

  it('does not warn when named via aria-label or aria-labelledby', () => {
    stubLayout(500, 100);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <>
        <span id="lbl">Log</span>
        <ScrollArea aria-labelledby="lbl">plain text</ScrollArea>
        <ScrollArea aria-label="Log 2">plain text</ScrollArea>
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('a consumer tabIndex / role wins over the computed ones', () => {
    stubLayout(500, 100);
    render(
      <ScrollArea aria-label="Log" tabIndex={-1} role="log" data-testid="sa">
        plain text
      </ScrollArea>,
    );
    const el = screen.getByTestId('sa');
    expect(el).toHaveAttribute('tabindex', '-1');
    expect(el).toHaveAttribute('role', 'log');
  });

  it('SCSS: scrolls vertically, can shrink, contains overscroll, rings through its own token', () => {
    const scss = readFileSync(resolve(__dirname, 'ScrollArea.module.scss'), 'utf8');
    const root = scss.match(/\.root \{[\s\S]*?\n\}/)![0];
    expect(root).toMatch(/overflow-y: auto;/);
    expect(root).toMatch(/min-height: 0;/);
    expect(root).toMatch(/overscroll-behavior: contain;/);
    expect(root).toMatch(/focus-ring\(var\(--scroll-area-ring\)\)/);
    for (const size of ['sm', 'md', 'lg']) {
      expect(scss).toMatch(
        new RegExp(`\\.max-height-${size} \\{\\s*max-height: var\\(--scroll-area-max-height-${size}\\);`),
      );
    }
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail.**

Run (from `packages/design-system`): `npx vitest run src/components/ScrollArea`
Expected: FAIL. `Failed to resolve import "./ScrollArea"`.

- [ ] **Step 4: Write `ScrollArea.tokens.scss`:**

```scss
// ScrollArea.tokens.scss — component-scoped tokens for <ScrollArea>.
:root {
  // Height cap scale (`maxHeight="sm" | "md" | "lg"`).
  --scroll-area-max-height-sm: var(--size-scroll-area-sm);
  --scroll-area-max-height-md: var(--size-scroll-area-md);
  --scroll-area-max-height-lg: var(--size-scroll-area-lg);

  // Focus ring — shown only while the area is itself a tab stop.
  --scroll-area-ring: var(--ring-accent);
}
```

- [ ] **Step 5: Write `ScrollArea.module.scss`:**

```scss
@use './ScrollArea.tokens';
@use '../../styles/mixins' as *;

// Scrolling, not layout: overflow + a shrinkable min-height so the area can
// be the one flexible child of a bounded flex parent (e.g. a Popover capped at
// the viewport). `overscroll-behavior: contain` keeps a feed scrolled to its
// end from scrolling the page behind the popover.
.root {
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;

  &:focus-visible {
    @include focus-ring(var(--scroll-area-ring));
  }
}

.max-height-sm {
  max-height: var(--scroll-area-max-height-sm);
}

.max-height-md {
  max-height: var(--scroll-area-max-height-md);
}

.max-height-lg {
  max-height: var(--scroll-area-max-height-lg);
}
```

- [ ] **Step 6: Write `ScrollArea.tsx`:**

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { mergeRefs } from '../_internal/refs';
import { FOCUSABLE_SELECTOR } from '../_internal/overlay/useFocusTrap';
import styles from './ScrollArea.module.scss';

/**
 * Height cap for `<ScrollArea>`. A scale value (`'sm' | 'md' | 'lg'`) or an
 * escape-hatch length. Details on `ScrollAreaProps#maxHeight`.
 */
export type ScrollAreaMaxHeight = 'sm' | 'md' | 'lg' | number | string;

const SCALE: ReadonlySet<string> = new Set(['sm', 'md', 'lg']);

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Caps the area's height; past it, the content scrolls vertically.
   * - `'sm'` — 240px. A short list inside a form or a card.
   * - `'md'` — 400px. A popover feed (notifications, activity).
   * - `'lg'` — 560px. A tall panel body.
   * - `number` — px, for a one-off (`maxHeight={320}`). Prefer the scale.
   * - `string` — any CSS length (`'50vh'`).
   *
   * Omitted: no cap of its own. The area fills the height its parent gives
   * it, which is right as the flexible child of a bounded flex column.
   */
  maxHeight?: ScrollAreaMaxHeight;
}

/**
 * A region that scrolls only its own content vertically: a feed under a
 * fixed header, a long list in a popover. Inside `<Popover.Content>` it is
 * also what lets the popover cap itself at the viewport: the popover
 * becomes a flex column in which the ScrollArea is the only child that
 * shrinks, so the header stays put while the feed scrolls.
 *
 * Keyboard: while the area overflows AND contains nothing focusable, it
 * becomes a tab stop (`tabIndex=0`, `role="region"`), so keyboard users can
 * scroll it. Name it with `aria-label` / `aria-labelledby`; a dev warning
 * fires if it becomes a tab stop unnamed. With links or buttons inside, it
 * adds no tab stop, because tabbing through them scrolls the area already.
 *
 * @example
 * // A notification centre: a fixed header over a scrolling feed.
 * <Popover>
 *   <Popover.Trigger>
 *     <Button variant="ghost" iconOnly aria-label="Notifications"><Bell size={16} /></Button>
 *   </Popover.Trigger>
 *   <Popover.Content minWidth={380}>
 *     <Stack gap="sm">
 *       <Cluster justify="between" align="center">
 *         <Popover.Heading>Notifications</Popover.Heading>
 *         <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all as read</Button>
 *       </Cluster>
 *       <ScrollArea maxHeight="md" aria-label="Notifications">
 *         <Stack gap="xs">{rows}</Stack>
 *       </ScrollArea>
 *     </Stack>
 *   </Popover.Content>
 * </Popover>
 *
 * @example
 * // A plain-text log: overflowing with nothing focusable, so it becomes a
 * // named tab stop by itself.
 * <ScrollArea maxHeight="sm" aria-label="Import log">
 *   <Code>{log}</Code>
 * </ScrollArea>
 *
 * @example
 * // One-off height — prefer the scale.
 * <ScrollArea maxHeight={320} aria-label="Members">{members}</ScrollArea>
 *
 * @remarks When NOT to use
 * - Whole-page scrolling. `AppLayout` owns the page's scroll container.
 * - A Card with a fixed header over a scrolling body. Use `<Card fill>` with
 *   `<Card.Body scroll>`.
 * - Horizontal scrolling. ScrollArea scrolls vertically only.
 *
 * @remarks Anti-patterns
 * - ❌ Nesting ScrollAreas. Two scroll containers under one pointer trap the
 *   wheel and make keyboard scrolling ambiguous.
 * - ❌ `className` with `overflow: auto` on a div instead. It loses the
 *   keyboard tab stop, the popover viewport cap, and overscroll containment.
 * - ❌ A ScrollArea with plain-text content and no `aria-label` /
 *   `aria-labelledby`. It becomes an unnamed tab stop.
 * - ❌ Wrapping the ScrollArea more than one level deep inside
 *   `<Popover.Content>`. The viewport cap only reaches a direct child or a
 *   child wrapped once (e.g. `Content > Stack > ScrollArea`).
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { maxHeight, className, style, children, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [focusable, setFocusable] = useState(false);
  const warnedRef = useRef(false);

  // A scroller the keyboard can't reach is WCAG 2.1.1's failure (axe
  // `scrollable-region-focusable`). Focusable content already reaches it,
  // since tabbing to a child scrolls it into view, so the area only becomes a
  // tab stop when it overflows AND holds nothing focusable. This is what
  // Chrome 130+ and Firefox do natively; Safari doesn't.
  const measure = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    setFocusable(el.scrollHeight > el.clientHeight && el.querySelector(FOCUSABLE_SELECTOR) === null);
  }, []);

  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    // The area's own box changes when its cap or its parent does; its
    // content's height changes when a direct child resizes (images loading,
    // rows expanding). Re-observe children as they're added.
    const observeAll = () => {
      if (!ro) return;
      ro.observe(el);
      for (const child of Array.from(el.children)) ro.observe(child);
    };
    observeAll();
    const mo =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            observeAll();
            measure();
          });
    mo?.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'href', 'hidden'],
    });
    return () => {
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [measure]);

  const named = Boolean(rest['aria-label'] || rest['aria-labelledby']);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (focusable && !named && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(
        '[ScrollArea] It overflows with no focusable content, so it is a keyboard tab stop — ' +
          'give it an accessible name with aria-label or aria-labelledby.',
      );
    }
  }, [focusable, named]);

  const scale = typeof maxHeight === 'string' && SCALE.has(maxHeight);
  const inlineMaxHeight =
    maxHeight === undefined || scale
      ? undefined
      : typeof maxHeight === 'number'
        ? `${maxHeight}px`
        : maxHeight;

  return (
    // {...rest} last so a consumer tabIndex / role overrides the computed ones.
    <div
      ref={mergeRefs<HTMLDivElement>(innerRef, ref)}
      data-scroll-area=""
      tabIndex={focusable ? 0 : undefined}
      role={focusable ? 'region' : undefined}
      className={clsx(styles.root, scale && styles[`max-height-${maxHeight}`], className)}
      style={inlineMaxHeight !== undefined ? { maxHeight: inlineMaxHeight, ...style } : style}
      {...rest}
    >
      {children}
    </div>
  );
});
ScrollArea.displayName = 'ScrollArea';
```

- [ ] **Step 7: Write `index.ts`:**

```ts
export { ScrollArea } from './ScrollArea';
export type { ScrollAreaProps, ScrollAreaMaxHeight } from './ScrollArea';
```

- [ ] **Step 8: Run the ScrollArea tests.**

Run: `npx vitest run src/components/ScrollArea`
Expected: all PASS. If the "resize" test fails because `useLayoutEffect`
ran before the ResizeObserver stub, check that `stubResizeObserver()` is
called before `render` (it is, in the test above).

- [ ] **Step 9: Export from the package, and add the manifest cluster.**
  - `packages/design-system/src/index.ts`: next to the other layout
    primitives (find the `Sticky` export with
    `grep -n "Sticky" packages/design-system/src/index.ts`), add
    ```ts
    export { ScrollArea } from './components/ScrollArea';
    export type { ScrollAreaProps, ScrollAreaMaxHeight } from './components/ScrollArea';
    ```
  - `packages/design-system/src/_meta/manifest.ts` AND
    `packages/design-system/scripts/generate-manifest.mjs`: in `CLUSTERS`,
    directly under `Card: 'Layout',`, add `ScrollArea: 'Layout',`.
  - From `packages/design-system`: `npm run build:manifest`

- [ ] **Step 10: Re-pin the design-tokens `index.ts` hash.** It pins a
  sha256 of `packages/design-system/src/index.ts`, which the export just
  changed.

Run: `npm test -w @eocrm/design-tokens 2>&1 | grep -A3 "actual: '"`
Copy the `actual` hash into
`packages/design-tokens/test/package-boundary.test.mjs`, replacing the
current pinned hash. Re-run until `npm test -w @eocrm/design-tokens; echo exit=$?`
prints `exit=0`.

- [ ] **Step 11: Run the full design-system suite** (manifest drift, the
  structure test and the export tests live there).

Run: `npm test -w @eocrm/design-system; echo exit=$?`
Expected: `exit=0`.

- [ ] **Step 12: Commit.**

```bash
git add packages/design-system packages/design-tokens/test/package-boundary.test.mjs
git commit -m "feat(ScrollArea): height-capped scroll region, a named tab stop only when it must be (#598)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Popover viewport cap with a ScrollArea

**Files:**
- Modify: `packages/design-system/src/components/Popover/Content.tsx`
  (imports, and the middleware array near line 83)
- Modify: `packages/design-system/src/components/Popover/Popover.module.scss`
- Modify: `packages/design-system/src/components/Popover/Popover.test.tsx`
- Modify: `packages/design-system/src/components/Popover/PopoverRoot.tsx`
  (the `@remarks When NOT to use` list near line 65)

**Interfaces:**
- Consumes: `ScrollArea` from `../ScrollArea` (tests only) and its
  `data-scroll-area` attribute.
- Produces: the CSS custom property `--popover-available-height`, set inline
  on the open `.content` element.

- [ ] **Step 1: Write the failing tests** by appending to `Popover.test.tsx`
  (`readFileSync`, `resolve`, `render`, `screen` and `userEvent` are already
  imported there):

```tsx
import { ScrollArea } from '../ScrollArea';

describe('Popover — viewport cap with a ScrollArea (#598)', () => {
  it('writes --popover-available-height onto the open content', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content aria-label="Panel">
          <ScrollArea maxHeight="md" aria-label="Feed">
            <a href="/x">row</a>
          </ScrollArea>
        </Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() =>
      expect(dialog.style.getPropertyValue('--popover-available-height')).toMatch(/^-?\d+(\.\d+)?px$/),
    );
  });

  it('SCSS: only a popover containing a ScrollArea becomes a capped flex column; the rest do not shrink', () => {
    const scss = readFileSync(resolve(__dirname, 'Popover.module.scss'), 'utf8');
    const block = scss.match(/\.content:has\(\[data-scroll-area\]\) \{[\s\S]*?\n\}/)![0];
    expect(block).toMatch(/display: flex;/);
    expect(block).toMatch(/flex-direction: column;/);
    expect(block).toMatch(/max-height: var\(--popover-available-height\);/);
    expect(block).toMatch(/> \* \{\s*flex-shrink: 0;/);
    expect(block).toMatch(
      /> \[data-scroll-area\],\s*> :has\(\[data-scroll-area\]\) \{\s*flex-shrink: 1;\s*min-height: 0;/,
    );
    // The base `.content` rule stays un-capped and not a flex container.
    const base = scss.match(/^\.content \{[\s\S]*?\n\}/m)![0];
    expect(base).not.toMatch(/display: flex/);
    expect(base).not.toMatch(/max-height/);
    // No overflow on the content itself: it would clip the arrow.
    expect(scss).not.toMatch(/\.content[^{]*\{[^}]*overflow/);
  });
});
```

Also add `waitFor` to the existing `@testing-library/react` import at the
top of the file:
`import { act, render, screen, waitFor } from '@testing-library/react';`

- [ ] **Step 2: Run the tests to verify they fail.**

Run: `npx vitest run src/components/Popover`
Expected: FAIL. The property is empty, and the SCSS `match` returns null.

- [ ] **Step 3: Add the middleware** in `Content.tsx`. Add `size` to the
  `@floating-ui/react-dom` import list (alphabetical, after `shift`). Then
  replace the `middleware:` line with:

```tsx
    middleware: [
      offset(sideOffset),
      flip(),
      shift({ padding: 8 }),
      // #598: expose the room left in the viewport. Only a popover holding a
      // <ScrollArea> uses it (Popover.module.scss `:has([data-scroll-area])`):
      // it caps there and the ScrollArea shrinks, so the header stays put.
      // A CSS variable rather than inline max-height, so popovers without a
      // ScrollArea keep today's layout (and the arrow is never clipped).
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          elements.floating.style.setProperty('--popover-available-height', `${availableHeight}px`);
        },
      }),
      arrow({ element: arrowRef }),
    ],
```

- [ ] **Step 4: Add the SCSS** in `Popover.module.scss`, directly after the
  base `.content { ... }` block:

```scss
// #598: a popover holding a <ScrollArea> caps itself at the viewport
// (`--popover-available-height`, written by Content.tsx's size middleware)
// and becomes a flex column in which the ScrollArea is the ONLY child that
// shrinks, so a header above it stays whole while the feed scrolls. The
// ScrollArea may be a direct child or wrapped once (e.g. Content > Stack >
// [header, ScrollArea]); deeper nesting is out of reach by design.
// Compound-internal layout like Card's `.scroll`: the popover lays out its
// own content box, not a consumer-positioned component. No `overflow` here,
// since it would clip the arrow.
.content:has([data-scroll-area]) {
  display: flex;
  flex-direction: column;
  max-height: var(--popover-available-height);

  > * {
    flex-shrink: 0;
  }

  > [data-scroll-area],
  > :has([data-scroll-area]) {
    flex-shrink: 1;
    min-height: 0;
  }
}
```

If stylelint flags `flex-shrink` / `max-height` under
`property-disallowed-list`, add a
`// stylelint-disable-next-line property-disallowed-list -- compound-internal layout (#598), see above`
immediately before each flagged declaration. Don't disable the rule for the
whole block.

- [ ] **Step 5: Document it in the Popover JSDoc.** In `PopoverRoot.tsx`'s
  `@remarks When NOT to use` list, add:

```
 * - A tall panel with no `<ScrollArea>`. The popover is NOT capped at the
 *   viewport and will run off-screen. Wrap the long part in
 *   `<ScrollArea maxHeight="md">`: the popover then caps itself at the
 *   viewport and only the ScrollArea shrinks, so a header above it stays put.
```

- [ ] **Step 6: Run the tests, including the popover-based suites.**

Run: `npx vitest run src/components/Popover src/components/ConfirmationPopover src/components/ColorPicker src/components/ScrollArea`
Expected: all PASS. If the first new test can't observe the property
because Floating UI never calls `apply` in jsdom, don't weaken it to pass.
Report it back. (The controller will decide whether to replace it with an
assertion on the middleware config.)

- [ ] **Step 7: Lint the SCSS.**

Run (repo root): `npx stylelint "packages/design-system/src/components/{Popover,ScrollArea}/*.scss"; echo exit=$?`
Expected: `exit=0`.

- [ ] **Step 8: Commit.**

```bash
git add packages/design-system/src/components/Popover
git commit -m "feat(Popover): cap at the viewport when holding a ScrollArea (#598)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Guidance (AGENTS.md + DropdownMenu anti-pattern)

**Files:**
- Modify: `packages/design-system/AGENTS.md` (a new `ScrollArea` section
  after the `<Sticky>` section, which starts near line 1801; a note in the
  `<Popover>` section near line 2702; an anti-pattern in the
  `<DropdownMenu>` section near line 2585)
- Modify: `packages/design-system/src/components/DropdownMenu/Root.tsx`
  (the `@remarks Anti-patterns` list near line 68)

**Interfaces:**
- Consumes: the APIs from Tasks 2 and 3, exactly as named there.

- [ ] **Step 1: Add the AGENTS.md ScrollArea section.** Insert it after the
  whole `<Sticky>` section, before the next `### ` heading:

````markdown
### `<ScrollArea>` — height-capped vertical scroll region

```tsx
<ScrollArea maxHeight="md" aria-label="Notifications">
  <Stack gap="xs">{rows}</Stack>
</ScrollArea>
```

- `maxHeight`: `sm` (240px) / `md` (400px) / `lg` (560px), or a one-off `number` (px) / CSS length string. Prefer the scale. Omitted: no cap of its own, so it fills a bounded flex parent.
- **Keyboard:** while it overflows AND holds nothing focusable, it becomes a tab stop (`tabIndex=0`, `role="region"`). Name it with `aria-label` / `aria-labelledby` (a dev warning fires if you don't). A feed of links adds no tab stop.
- **In a Popover** it's what caps the popover at the viewport: the popover becomes a flex column where only the ScrollArea shrinks, so a header above it stays put. Keep it a direct child of `Popover.Content` or wrapped at most once (`Content > Stack > ScrollArea`).
- Not for whole-page scroll (AppLayout owns it), a Card body (`<Card fill>` + `<Card.Body scroll>`), or horizontal scrolling. Don't nest them.
````

- [ ] **Step 2: Add the Popover note.** Append this bullet at the end of the
  `<Popover>` section's bullet list:

```markdown
- **Tall content:** a Popover is capped at the viewport only when it holds a `<ScrollArea>` (#598). Wrap the long part (a feed, a list) in `<ScrollArea maxHeight="md">`; the header above it stays put. Without one, a tall popover runs off-screen. Recipe (notification centre): `Popover.Content minWidth={380}` → `Stack` → header `Cluster` (`Popover.Heading` + "Mark all as read" Button) + `ScrollArea maxHeight="md" aria-label="Notifications"`.
```

- [ ] **Step 3: Add the DropdownMenu anti-pattern** to both places:
  - `AGENTS.md`, at the end of the `<DropdownMenu>` section's bullets:
    ```markdown
    - ❌ Using DropdownMenu as a panel (a notification centre, a header with a "Mark all as read" button, rich feed rows). It is `role="menu"`, which may only hold menu items; a header button is invalid ARIA and unreachable by the menu's arrow keys. Use `Popover` + `ScrollArea` (#598).
    ```
  - `DropdownMenu/Root.tsx`, the `@remarks Anti-patterns` list: the same
    point in that list's ` * - ❌ ...` style, wrapped at about 80 columns.

- [ ] **Step 4: Format and verify.**

Run (repo root): `npx prettier --write packages/design-system/AGENTS.md packages/design-system/src/components/DropdownMenu/Root.tsx && npx vitest run --root packages/design-system src/components/DropdownMenu; echo exit=$?`
Expected: `exit=0`.

- [ ] **Step 5: Commit.**

```bash
git add packages/design-system/AGENTS.md packages/design-system/src/components/DropdownMenu/Root.tsx
git commit -m "docs: ScrollArea TL;DR, Popover viewport-cap recipe, DropdownMenu-as-panel anti-pattern (#598)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Playground demo + wiring

**Files:**
- Create: `packages/playground/src/pages/components/ScrollAreaDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (import near line 116, route near line 246)
- Modify: `packages/playground/src/layout/AppShell/navItems.ts` (the Layout
  group: `lucide-react` import list, and an item after Sticky near line 159)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
  (an entry after the Sticky entry near line 384)
- Modify: `packages/playground/src/pages/components/overviewSchematics.tsx`
  (a `ScrollArea:` entry after `Sticky:` near line 1290)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (the
  `ComponentName` union: add `| 'ScrollArea'` after `| 'Sticky'` near line 93)

**Interfaces:**
- Consumes: `ScrollArea`, `Popover`, `Button`, `Cluster`, `Stack`, `Text`
  and `Link` from `@eocrm/design-system`; `DemoLayout`, `Example` and
  `getComponentFiles` as in `VisuallyHiddenDemo.tsx`.

- [ ] **Step 1: Write `ScrollAreaDemo.tsx`:**

```tsx
import {
  Button,
  Cluster,
  Link,
  Popover,
  ScrollArea,
  Stack,
  Text,
} from '@eocrm/design-system';
import { Bell } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const ROWS = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  text: `ENG-${100 + i} was moved to In review`,
}));

const LINES = Array.from({ length: 30 }, (_, i) => `Imported row ${i + 1} of 30`);

export function ScrollAreaDemo() {
  return (
    <DemoLayout
      name="ScrollArea"
      componentName="ScrollArea"
      description="A region that scrolls only its own content vertically, capped by a token-sized maxHeight. Inside a Popover it also caps the popover at the viewport, with only the ScrollArea shrinking, so a header above it stays put. It becomes a named keyboard tab stop only while it overflows with nothing focusable inside."
      files={getComponentFiles('ScrollArea')}
    >
      <Example
        title="Notification centre (Popover + ScrollArea)"
        description="The #598 recipe: a fixed header with a 'Mark all as read' action over a scrolling feed. Shrink the window's height and the popover caps at the viewport, with only the feed shrinking. The rows are links, so the feed adds no extra tab stop."
        code={`import { Button, Cluster, Link, Popover, ScrollArea, Stack } from '@eocrm/design-system';
import { Bell } from 'lucide-react';

export function Demo({ rows }) {
  return (
    <Popover>
      <Popover.Trigger>
        <Button variant="secondary" iconOnly aria-label="Notifications">
          <Bell size={16} />
        </Button>
      </Popover.Trigger>
      <Popover.Content minWidth={380}>
        <Stack gap="sm">
          <Cluster justify="between" align="center">
            <Popover.Heading>Notifications</Popover.Heading>
            <Button variant="ghost" size="sm">Mark all as read</Button>
          </Cluster>
          <ScrollArea maxHeight="md" aria-label="Notifications">
            <Stack gap="xs">
              {rows.map((row) => (
                <Link key={row.id} href="#">{row.text}</Link>
              ))}
            </Stack>
          </ScrollArea>
        </Stack>
      </Popover.Content>
    </Popover>
  );
}`}
      >
        <Popover>
          <Popover.Trigger>
            <Button variant="secondary" iconOnly aria-label="Notifications">
              <Bell size={16} />
            </Button>
          </Popover.Trigger>
          <Popover.Content minWidth={380}>
            <Stack gap="sm">
              <Cluster justify="between" align="center">
                <Popover.Heading>Notifications</Popover.Heading>
                <Button variant="ghost" size="sm">
                  Mark all as read
                </Button>
              </Cluster>
              <ScrollArea maxHeight="md" aria-label="Notifications">
                <Stack gap="xs">
                  {ROWS.map((row) => (
                    <Link key={row.id} href="#">
                      {row.text}
                    </Link>
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          </Popover.Content>
        </Popover>
      </Example>

      <Example
        title="Height scale"
        description="sm (240px), md (400px), lg (560px), and a one-off number (px). Prefer the scale."
        code={`<Cluster gap="md" align="start">
  <ScrollArea maxHeight="sm" aria-label="Small">{lines}</ScrollArea>
  <ScrollArea maxHeight="md" aria-label="Medium">{lines}</ScrollArea>
  <ScrollArea maxHeight="lg" aria-label="Large">{lines}</ScrollArea>
  <ScrollArea maxHeight={320} aria-label="320px">{lines}</ScrollArea>
</Cluster>`}
      >
        <Cluster gap="md" align="start">
          {(['sm', 'md', 'lg', 320] as const).map((size) => (
            <Stack key={size} gap="xs">
              <Text size="sm" tone="muted">
                maxHeight={typeof size === 'number' ? `{${size}}` : `"${size}"`}
              </Text>
              <ScrollArea maxHeight={size} aria-label={`Log, ${size}`}>
                <Stack gap="xs">
                  {LINES.map((line) => (
                    <Text key={line} size="sm">
                      {line}
                    </Text>
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Keyboard: a tab stop only when it must be"
        description="Tab through both. The link list adds no stop of its own, since tabbing to a link scrolls it into view. The plain-text list has nothing to tab to, so the area itself becomes a named region you can focus and scroll with the arrow keys."
        code={`<Cluster gap="md" align="start">
  <ScrollArea maxHeight="sm" aria-label="Links">{links}</ScrollArea>
  <ScrollArea maxHeight="sm" aria-label="Import log">{plainText}</ScrollArea>
</Cluster>`}
      >
        <Cluster gap="md" align="start">
          <ScrollArea maxHeight="sm" aria-label="Links">
            <Stack gap="xs">
              {ROWS.map((row) => (
                <Link key={row.id} href="#">
                  {row.text}
                </Link>
              ))}
            </Stack>
          </ScrollArea>
          <ScrollArea maxHeight="sm" aria-label="Import log">
            <Stack gap="xs">
              {LINES.map((line) => (
                <Text key={line} size="sm">
                  {line}
                </Text>
              ))}
            </Stack>
          </ScrollArea>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Wire the route.** In `App.tsx`, after the `StickyDemo`
  import add `import { ScrollAreaDemo } from './pages/components/ScrollAreaDemo';`,
  and after the `/components/sticky` route add
  `<Route path="/components/scroll-area" element={<ScrollAreaDemo />} />`.

- [ ] **Step 3: Wire the nav.** In `navItems.ts`, add `ScrollText` to the
  `lucide-react` import list (alphabetical position), and after the Sticky
  item add
  `{ to: '/components/scroll-area', label: 'ScrollArea', icon: ScrollText, end: false },`.

- [ ] **Step 4: Wire the overview grid.** In `ComponentsIndex.tsx`, after
  the Sticky entry add:

```tsx
  {
    to: '/components/scroll-area',
    name: 'ScrollArea',
    description:
      'Height-capped vertical scroll region — a feed under a fixed header, a long list in a popover. Caps a Popover at the viewport; a named tab stop only when it must be.',
    preview: SCHEMATICS['ScrollArea'],
  },
```

- [ ] **Step 5: Add the schematic.** In `overviewSchematics.tsx`, after the
  `Sticky: (...)` entry, add (it uses the file's existing `Outline`, `Col`,
  `Row`, `Box` and `Solid` helpers):

```tsx
  ScrollArea: (
    <Outline w={170} h={84} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
      <Row gap={6} style={{ justifyContent: 'space-between' }}>
        <Solid w={60} h={8} />
        <Box w={36} h={8} />
      </Row>
      <Row gap={6} style={{ overflow: 'hidden', flex: 1, alignItems: 'flex-start' }}>
        <Col gap={4}>
          <Box w={130} h={9} />
          <Box w={130} h={9} />
          <Box w={130} h={9} />
          <Box w={130} h={9} />
        </Col>
        <Solid w={4} h={26} />
      </Row>
    </Outline>
  ),
```

- [ ] **Step 6: Add to the `ComponentName` union.** In `registry.ts`, add
  `| 'ScrollArea'` after `| 'Sticky'`.

- [ ] **Step 7: Typecheck, test and format.**

Run (repo root): `npx prettier --write packages/playground/src/pages/components packages/playground/src/App.tsx packages/playground/src/layout packages/playground/src/pages/mockups/registry.ts && npm run typecheck; echo exit=$?`, then `make lint; echo exit=$?` (stylelint only), then `npm test -w playground --if-present; echo exit=$?`
Expected: all `exit=0`.

- [ ] **Step 8: Commit.**

```bash
git add packages/playground
git commit -m "feat(playground): ScrollArea demo — notification-centre recipe, scale, keyboard (#598)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6 (controller): Browser verification + full gates

Run by the controller in this session, not by a subagent (Playwright MCP).

- [ ] Start the playground on a free port 8090+:
  `npm run dev -w playground -- --port 8091 --strictPort` (background).
- [ ] At a 1280×900 viewport, open `/components/scroll-area`, open the
  notification popover, and screenshot it. Then resize to 1280×420 and
  re-open. Confirm the popover's bottom stays within the viewport, the
  header ("Notifications" plus "Mark all as read") is fully visible, and the
  feed scrolls.
- [ ] Tab through the keyboard example. Confirm the link list adds no stop
  of its own, the plain-text list gets a visible focus ring, and ArrowDown
  scrolls it.
- [ ] Spot-check that an existing ConfirmationPopover and a ColorPicker
  popover look unchanged.
- [ ] Kill the dev server and any Playwright Chrome (see the WSLg cleanup
  memory).
- [ ] Gates from the repo root, reading exit codes:
  `make test; echo $?`, `make build-lib; echo $?`, `make lint; echo $?`,
  `npm run format:check; echo $?`, and the tarball check from the
  implement-issue skill (expect `0`).
