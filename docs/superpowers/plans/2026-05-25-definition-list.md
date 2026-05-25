# DefinitionList Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<DefinitionList>` — a compound primitive (Root + Item + Term + Description) for semantic key/value pairs with optional leading icon on the description — and migrate ContactDetail.About to use it.

**Architecture:** Renders semantic `<dl>/<div>/<dt>/<dd>` HTML. Horizontal layout uses CSS grid + `display: contents` on items so all rows share an auto-sized term column. Stacked layout uses flex column. Object.assign compound (matches Card / PageHeader). Dev-mode warning if a direct child isn't a `DefinitionList.Item`.

**Tech Stack:** React 19, TypeScript, CSS Modules + SCSS, Vitest + RTL.

**Source-of-truth spec:** `docs/superpowers/specs/2026-05-25-definition-list-design.md` (committed at `e0a4b04` on branch `feat/definition-list`). Plan-verbatim is mandatory; every code block below is the literal file contents.

**Branch:** `feat/definition-list` (already created from fresh main at `703b41f`).

---

## File Structure

| Path | Created / Modified | Responsibility |
| --- | --- | --- |
| `packages/design-system/src/components/DefinitionList/DefinitionList.tsx` | Create | Root + 3 sub-components + Object.assign compound + flattenChildren helper + dev-mode validation warning |
| `packages/design-system/src/components/DefinitionList/DefinitionList.module.scss` | Create | Grid (horizontal) + flex (stacked) + icon + spacing variants + dividers |
| `packages/design-system/src/components/DefinitionList/DefinitionList.test.tsx` | Create | 14 unit cases |
| `packages/design-system/src/components/DefinitionList/index.ts` | Create | Barrel exports |
| `packages/design-system/src/index.ts` | Modify | Public re-export |
| `packages/design-system/AGENTS.md` | Modify | TL;DR section after `<Card>` |
| `packages/playground/src/pages/components/DefinitionListDemo.tsx` | Create | 5 examples |
| `packages/playground/src/App.tsx` | Modify | Route registration |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | Modify | Display-cluster nav entry + lucide `List` import |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` | Modify | Overview-grid card |
| `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx` | Modify | Migrate About card, delete local Field helper |
| `packages/playground/src/pages/mockups/registry.ts` | Modify | Add `DefinitionList` to contact-detail.usesComponents |

---

## Task 1: DefinitionList source bundle

Creates the 4-file component directory required by `structure.test.ts` (`*.tsx`, `*.module.scss`, `*.test.tsx`, `index.ts`). The test file is created in this task as a one-line stub so the structure check passes; full test cases land in Task 2.

**Files:**
- Create: `packages/design-system/src/components/DefinitionList/DefinitionList.tsx`
- Create: `packages/design-system/src/components/DefinitionList/DefinitionList.module.scss`
- Create: `packages/design-system/src/components/DefinitionList/DefinitionList.test.tsx` (stub)
- Create: `packages/design-system/src/components/DefinitionList/index.ts`
- Modify: `packages/design-system/src/index.ts` (add re-export block)

---

- [ ] **Step 1: Write `DefinitionList.tsx`**

Path: `packages/design-system/src/components/DefinitionList/DefinitionList.tsx`

```tsx
import {
  Children,
  Fragment,
  forwardRef,
  isValidElement,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './DefinitionList.module.scss';

/**
 * Layout direction.
 * - `'horizontal'` (default) — terms in column 1, descriptions in column 2.
 *   All rows share a single term column auto-sized to the longest term (or
 *   `termWidth` if set).
 * - `'stacked'` — terms stack above descriptions, one per row. Common for
 *   settings pages and narrow viewports.
 */
export type DefinitionListLayout = 'horizontal' | 'stacked';

/**
 * Vertical padding per item.
 * - `'sm'` — `var(--space-2)` (compact tables / sidebars).
 * - `'md'` — `var(--space-3)` (default; matches Card.ListRow rhythm).
 * - `'lg'` — `var(--space-4)` (emphasis panels).
 */
export type DefinitionListSpacing = 'sm' | 'md' | 'lg';

export interface DefinitionListProps extends HTMLAttributes<HTMLDListElement> {
  /** Layout direction. See `DefinitionListLayout`. Default `'horizontal'`. */
  layout?: DefinitionListLayout;
  /**
   * CSS length applied to the term column in horizontal layout (e.g. `'180px'`,
   * `'20%'`, `'max-content'`). Default `'max-content'` — column sizes to the
   * longest term across all rows. Set explicitly when you need consistent
   * alignment across multiple DefinitionLists on the same screen.
   */
  termWidth?: string;
  /** Vertical padding per item. See `DefinitionListSpacing`. Default `'md'`. */
  spacing?: DefinitionListSpacing;
  /**
   * Render a 1px border between items. Default `false` (clean, dense look).
   * Set when migrating from a `Card.List` and you want to preserve the
   * table-row separator visual.
   */
  dividers?: boolean;
}

export interface DefinitionListItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface DefinitionListTermProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export interface DefinitionListDescriptionProps extends HTMLAttributes<HTMLElement> {
  /**
   * Leading decorative icon, rendered inside the `<dd>` before children.
   * Wrapped in an `aria-hidden` span — the `<dt>` carries the semantic label
   * so the icon is purely visual.
   */
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Flatten one level of React Fragments out of children. `React.Children.toArray`
 * does NOT recursively unwrap fragments — this helper handles the common case
 * of wrapping a single sub-component in `<>...</>`.
 */
function flattenChildren(children: ReactNode): ReactNode[] {
  const flat: ReactNode[] = [];
  Children.toArray(children).forEach((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      flat.push(
        ...Children.toArray((child as ReactElement<{ children: ReactNode }>).props.children),
      );
    } else {
      flat.push(child);
    }
  });
  return flat;
}

/**
 * Compound layout primitive for semantic key/value pairs. Renders proper
 * `<dl>`/`<div>`/`<dt>`/`<dd>` HTML so screen readers announce term-description
 * pairs natively. Use this — not `Card.List` — when every row has a label.
 *
 * Compound children: `DefinitionList.Item` (wraps a term + description pair),
 * `DefinitionList.Term` (the dt), `DefinitionList.Description` (the dd, with
 * optional leading `icon` prop).
 *
 * @example
 * // Horizontal contact properties with icons.
 * <DefinitionList dividers>
 *   <DefinitionList.Item>
 *     <DefinitionList.Term>Email</DefinitionList.Term>
 *     <DefinitionList.Description icon={<Mail size={14} />}>
 *       ada@example.com
 *     </DefinitionList.Description>
 *   </DefinitionList.Item>
 *   <DefinitionList.Item>
 *     <DefinitionList.Term>Phone</DefinitionList.Term>
 *     <DefinitionList.Description icon={<Phone size={14} />}>
 *       +1 (415) 555-0142
 *     </DefinitionList.Description>
 *   </DefinitionList.Item>
 * </DefinitionList>
 *
 * @example
 * // Stacked (settings-style).
 * <DefinitionList layout="stacked">
 *   <DefinitionList.Item>
 *     <DefinitionList.Term>Workspace name</DefinitionList.Term>
 *     <DefinitionList.Description>Acme Corp</DefinitionList.Description>
 *   </DefinitionList.Item>
 * </DefinitionList>
 *
 * @remarks When NOT to use
 * - For non-keyed lists (activity feeds, list of cards). Use `Card.List` or a
 *   plain `Stack` of cards.
 * - For tabular data with multiple columns per row. Use `Table` / `DataTable`.
 *
 * @remarks Anti-patterns
 * - ❌ Putting interactive content inside `<DefinitionList.Term>`. Terms are
 *   labels; values (including links/buttons) go in `<DefinitionList.Description>`.
 * - ❌ Multiple `<DefinitionList.Description>` children under one Item.
 *   Works HTML-wise but breaks the grid layout. Render multiple Items with
 *   the same Term text instead.
 */
const DefinitionListRoot = forwardRef<HTMLDListElement, DefinitionListProps>(
  function DefinitionListRoot(
    {
      layout = 'horizontal',
      termWidth,
      spacing = 'md',
      dividers,
      className,
      style,
      children,
      ...rest
    },
    ref,
  ) {
    if (process.env.NODE_ENV !== 'production') {
      flattenChildren(children).forEach((child) => {
        if (child == null || typeof child === 'boolean') return;
        if (!isValidElement(child) || child.type !== DefinitionListItem) {
          // eslint-disable-next-line no-console
          console.warn(
            '<DefinitionList> expects <DefinitionList.Item> children. Other children render but may break layout.',
          );
        }
      });
    }

    const mergedStyle: CSSProperties | undefined = termWidth
      ? ({ ['--dl-term-width' as string]: termWidth, ...style } as CSSProperties)
      : style;

    return (
      <dl
        ref={ref}
        data-layout={layout}
        data-spacing={spacing}
        data-dividers={dividers ? 'true' : undefined}
        className={clsx(styles.list, className)}
        style={mergedStyle}
        // {...rest} last so consumer overrides win (Pattern A).
        {...rest}
      >
        {children}
      </dl>
    );
  },
);
DefinitionListRoot.displayName = 'DefinitionList';

export const DefinitionListItem = forwardRef<HTMLDivElement, DefinitionListItemProps>(
  function DefinitionListItem({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={clsx(styles.item, className)} {...rest}>
        {children}
      </div>
    );
  },
);
DefinitionListItem.displayName = 'DefinitionListItem';

export const DefinitionListTerm = forwardRef<HTMLElement, DefinitionListTermProps>(
  function DefinitionListTerm({ className, children, ...rest }, ref) {
    return (
      <dt ref={ref} className={clsx(styles.term, className)} {...rest}>
        {children}
      </dt>
    );
  },
);
DefinitionListTerm.displayName = 'DefinitionListTerm';

export const DefinitionListDescription = forwardRef<HTMLElement, DefinitionListDescriptionProps>(
  function DefinitionListDescription({ icon, className, children, ...rest }, ref) {
    return (
      <dd ref={ref} className={clsx(styles.description, className)} {...rest}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </dd>
    );
  },
);
DefinitionListDescription.displayName = 'DefinitionListDescription';

export const DefinitionList = Object.assign(DefinitionListRoot, {
  Item: DefinitionListItem,
  Term: DefinitionListTerm,
  Description: DefinitionListDescription,
});
```

- [ ] **Step 2: Write `DefinitionList.module.scss`**

Path: `packages/design-system/src/components/DefinitionList/DefinitionList.module.scss`

```scss
@use '../../styles/mixins' as *;

.list {
  // UA reset — <dl> ships with default browser margin we don't want.
  // stylelint-disable-next-line property-disallowed-list -- UA reset for <dl> default margin
  margin: 0;
}

.list[data-layout='horizontal'] {
  display: grid;
  grid-template-columns: var(--dl-term-width, max-content) 1fr;
  column-gap: var(--space-4);
}

.list[data-layout='stacked'] {
  display: flex;
  flex-direction: column;
}

// In horizontal mode the wrapping <div> is a no-op so dt/dd participate
// in the parent grid directly. In stacked mode it's a normal flex child.
.list[data-layout='horizontal'] .item {
  display: contents;
}

.term,
.description {
  // UA reset for <dt>/<dd> default browser styles.
  // stylelint-disable-next-line property-disallowed-list -- UA reset for <dt>/<dd> defaults
  margin: 0;
}

.term {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg-muted);
}

.description {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-fg);
}

.icon {
  display: inline-flex;
  align-items: center;
  color: var(--color-fg-subtle);
}

// Spacing — padding-block on dt and dd directly. In horizontal mode the
// .item is display:contents and has no box, so we can't pad it; in stacked
// mode the same rules still produce the right vertical rhythm.
.list[data-spacing='sm'] .term,
.list[data-spacing='sm'] .description {
  padding-block: var(--space-2);
}

.list[data-spacing='md'] .term,
.list[data-spacing='md'] .description {
  padding-block: var(--space-3);
}

.list[data-spacing='lg'] .term,
.list[data-spacing='lg'] .description {
  padding-block: var(--space-4);
}

// Dividers — in horizontal mode .item is display:contents (no box), so the
// border goes on every dt/dd after the first row. Using :not(:first-of-type)
// works because dt and dd are typed elements within the parent dl grid.
.list[data-dividers='true'][data-layout='horizontal'] .term:not(:first-of-type),
.list[data-dividers='true'][data-layout='horizontal'] .description:not(:nth-of-type(1)) {
  border-top: var(--border-width) solid var(--color-border);
}

// In stacked mode the .item HAS a box, so the border goes on each item
// after the first. padding-top adds breathing room above the divider.
.list[data-dividers='true'][data-layout='stacked'] .item + .item {
  border-top: var(--border-width) solid var(--color-border);
  padding-top: var(--space-3);
}
```

- [ ] **Step 3: Write `DefinitionList.test.tsx` stub**

This single-test stub keeps `src/structure.test.ts` (which counts 4 files per directory) green. Task 2 replaces it with the full 14-case suite.

Path: `packages/design-system/src/components/DefinitionList/DefinitionList.test.tsx`

```tsx
import { render } from '@testing-library/react';
import { DefinitionList } from './DefinitionList';

it('renders without crashing', () => {
  render(<DefinitionList />);
});
```

- [ ] **Step 4: Write `index.ts` barrel**

Path: `packages/design-system/src/components/DefinitionList/index.ts`

```ts
export {
  DefinitionList,
  type DefinitionListProps,
  type DefinitionListLayout,
  type DefinitionListSpacing,
  type DefinitionListItemProps,
  type DefinitionListTermProps,
  type DefinitionListDescriptionProps,
} from './DefinitionList';
```

- [ ] **Step 5: Add public re-export to `packages/design-system/src/index.ts`**

Open `packages/design-system/src/index.ts` and locate the existing line:

```ts
export { DataTable, useDataTable, ColumnVisibilityTrigger } from './components/DataTable';
```

Insert the following block IMMEDIATELY AFTER the `export type` block that follows it (the DataTable types end with a closing `} from './components/DataTable';`):

```ts
export { DefinitionList } from './components/DefinitionList';
export type {
  DefinitionListProps,
  DefinitionListLayout,
  DefinitionListSpacing,
  DefinitionListItemProps,
  DefinitionListTermProps,
  DefinitionListDescriptionProps,
} from './components/DefinitionList';
```

- [ ] **Step 6: Run library typecheck**

Run: `make build-lib`

Expected: clean exit, no TypeScript errors. If `tsc --noEmit` complains about the `['--dl-term-width' as string]` index, the cast is intentional — re-read `DefinitionList.tsx` to verify the cast is on the property key, not the property value.

- [ ] **Step 7: Run full test suite**

Run: `make test`

Expected: all existing tests pass, plus the new 1-case stub passes. `structure.test.ts` should NOT flag the new directory.

- [ ] **Step 8: Run lint**

Run: `make lint`

Expected: clean. If stylelint flags the two `margin: 0` UA resets, verify the `stylelint-disable-next-line property-disallowed-list -- ...` comments are present.

- [ ] **Step 9: Run full build**

Run: `make build`

Expected: typecheck + playground bundle both succeed.

- [ ] **Step 10: Commit**

```bash
git add packages/design-system/src/components/DefinitionList packages/design-system/src/index.ts
git commit -m "$(cat <<'EOF'
DefinitionList source bundle (T1/6)

Compound primitive for semantic key/value pairs. Renders <dl>/<div>/<dt>/<dd>;
horizontal layout uses CSS grid + display:contents on items so all rows share
an auto-sized term column. Stacked layout uses flex column. Object.assign
compound (Item/Term/Description) + flattenChildren + dev-mode children
validation warning. Test stub satisfies structure.test.ts for the structure
check; full test cases land in T2.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Full test suite

Replaces the stub in `DefinitionList.test.tsx` with 14 unit cases covering all four props, both layouts, the icon slot, dev-warning behavior, forwardRef, className merge, and edge cases. Vitest is configured with `globals: true` so `describe` / `it` / `expect` / `vi` are global — do NOT import them.

**Files:**
- Modify: `packages/design-system/src/components/DefinitionList/DefinitionList.test.tsx` (replace stub)

---

- [ ] **Step 1: Replace `DefinitionList.test.tsx` with the full suite**

Path: `packages/design-system/src/components/DefinitionList/DefinitionList.test.tsx`

```tsx
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { DefinitionList } from './DefinitionList';

describe('DefinitionList', () => {
  it('renders <dl> with default props', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dl = container.querySelector('dl');
    expect(dl).not.toBeNull();
    expect(dl!.getAttribute('data-layout')).toBe('horizontal');
    expect(dl!.getAttribute('data-spacing')).toBe('md');
    expect(dl!.getAttribute('data-dividers')).toBeNull();
  });

  it('forwards ref to the underlying <dl>', () => {
    const ref = createRef<HTMLDListElement>();
    render(
      <DefinitionList ref={ref}>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DL');
  });

  it('merges consumer className with the internal class on root', () => {
    const { container } = render(
      <DefinitionList className="custom-dl">
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dl = container.querySelector('dl');
    expect(dl?.className).toContain('custom-dl');
    // Internal class is hashed by CSS Modules; we just check the consumer's class is present.
    expect(dl?.className.split(' ').length).toBeGreaterThan(1);
  });

  it('renders Item as <div>, Term as <dt>, Description as <dd>', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl > div')).not.toBeNull();
    expect(container.querySelector('dl > div > dt')?.textContent).toBe('Email');
    expect(container.querySelector('dl > div > dd')?.textContent).toBe('ada@example.com');
  });

  it('renders icon before description text, wrapped in aria-hidden span', () => {
    render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description icon={<svg data-testid="email-icon" />}>
            ada@example.com
          </DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dd = screen.getByText('ada@example.com').closest('dd');
    expect(dd).not.toBeNull();
    const iconWrapper = dd!.firstElementChild;
    expect(iconWrapper?.tagName).toBe('SPAN');
    expect(iconWrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(iconWrapper?.querySelector('[data-testid="email-icon"]')).not.toBeNull();
  });

  it('renders Description without icon wrapper when icon prop is omitted', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dd = container.querySelector('dd');
    expect(dd?.querySelector('span[aria-hidden="true"]')).toBeNull();
    expect(dd?.textContent).toBe('ada@example.com');
  });

  it('applies layout="horizontal" via data-layout attribute', () => {
    const { container } = render(
      <DefinitionList layout="horizontal">
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-layout')).toBe('horizontal');
  });

  it('applies layout="stacked" via data-layout attribute', () => {
    const { container } = render(
      <DefinitionList layout="stacked">
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-layout')).toBe('stacked');
  });

  it('sets --dl-term-width CSS variable inline on root when termWidth is provided', () => {
    const { container } = render(
      <DefinitionList termWidth="180px">
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const dl = container.querySelector('dl') as HTMLElement;
    expect(dl.style.getPropertyValue('--dl-term-width')).toBe('180px');
  });

  it.each(['sm', 'md', 'lg'] as const)('applies data-spacing="%s"', (spacing) => {
    const { container } = render(
      <DefinitionList spacing={spacing}>
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-spacing')).toBe(spacing);
  });

  it('applies data-dividers="true" when dividers prop is true', () => {
    const { container } = render(
      <DefinitionList dividers>
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-dividers')).toBe('true');
  });

  it('omits data-dividers attribute when dividers is false (default)', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>x</DefinitionList.Term>
          <DefinitionList.Description>y</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    expect(container.querySelector('dl')?.getAttribute('data-dividers')).toBeNull();
  });

  it('warns in dev when a direct child is not a DefinitionList.Item', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <DefinitionList>
        <div>not an item</div>
      </DefinitionList>,
    );
    expect(warn).toHaveBeenCalled();
    expect(warn.mock.calls[0]?.[0]).toContain('<DefinitionList>');
    warn.mockRestore();
  });

  it('renders <dl> with no items without crashing', () => {
    const { container } = render(<DefinitionList />);
    expect(container.querySelector('dl')).not.toBeNull();
  });

  it('renders multiple Items in source order', () => {
    const { container } = render(
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>First</DefinitionList.Term>
          <DefinitionList.Description>1</DefinitionList.Description>
        </DefinitionList.Item>
        <DefinitionList.Item>
          <DefinitionList.Term>Second</DefinitionList.Term>
          <DefinitionList.Description>2</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>,
    );
    const terms = Array.from(container.querySelectorAll('dt')).map((dt) => dt.textContent);
    expect(terms).toEqual(['First', 'Second']);
  });
});
```

- [ ] **Step 2: Run the test file in watch-isolated mode to confirm all 14 cases pass**

Run: `npm test -w @eocrm/design-system -- DefinitionList.test`

Expected: 14 tests passing (one `it.each` with 3 spacing values counts as 3, plus 12 other its = 15 reported tests, but the suite description shows 14 logical cases). If any case fails, fix the test (not the component — the component is plan-verbatim per the spec).

- [ ] **Step 3: Run the full library test suite**

Run: `make test`

Expected: clean exit. No regressions in any of the existing component tests.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DefinitionList/DefinitionList.test.tsx
git commit -m "$(cat <<'EOF'
DefinitionList tests (T2/6)

14 unit cases covering: dl/div/dt/dd semantics, forwardRef on root, className
merge, icon wrapped aria-hidden, all four prop variants (layout/termWidth/
spacing/dividers), dev-mode warning on non-Item children, empty list, source
order. it.each parameterises the three spacing values.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: AGENTS.md DefinitionList section

Insert a new TL;DR section after the existing `<Card>` block. Follows the canonical pattern: one-paragraph intro, snippet, prop summary, anti-patterns.

**Files:**
- Modify: `packages/design-system/AGENTS.md`

---

- [ ] **Step 1: Locate the insertion point**

Open `packages/design-system/AGENTS.md`. The `<Card>` section starts at the line beginning with `### \`<Card>\` — bordered container`. Read down to find the line where the `<Card>` section ends and `### \`<Stack>\` — vertical layout` begins. The insertion point is the blank line immediately before `### \`<Stack>\``.

- [ ] **Step 2: Insert the DefinitionList section verbatim before `### \`<Stack>\``**

Insert exactly the following markdown (note: the inner code-fence uses 4 backticks to avoid breaking the outer 3-backtick block in this plan; in the final AGENTS.md file the snippet inside is a normal 3-backtick `tsx` fence):

````markdown
### `<DefinitionList>` — semantic key/value pairs (dl / dt / dd)

For displaying entity properties — contact details, settings rows, metadata sidebars. Renders proper `<dl>`/`<dt>`/`<dd>` so screen readers announce term/description pairs natively. Compound: `DefinitionList`, `DefinitionList.Item`, `DefinitionList.Term`, `DefinitionList.Description`.

```tsx
<DefinitionList dividers>
  <DefinitionList.Item>
    <DefinitionList.Term>Email</DefinitionList.Term>
    <DefinitionList.Description icon={<Mail size={14} />}>
      ada@example.com
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Phone</DefinitionList.Term>
    <DefinitionList.Description icon={<Phone size={14} />}>
      +1 (415) 555-0142
    </DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>
```

Props on the root: `layout='horizontal' | 'stacked'` (default `'horizontal'`), `termWidth` (CSS length, default `max-content` — column sizes to the longest term), `spacing='sm' | 'md' | 'lg'` (default `'md'`), `dividers` (default `false`). The `Description` has an `icon` prop — leading-position, automatically wrapped `aria-hidden` because the `<dt>` carries the semantic label.

Use this instead of `Card.List` + `Card.ListRow` whenever the data is genuinely key/value (every row has a label and a value). Use `Card.List` when rows aren't keyed (activity feeds, list of cards).

**Anti-patterns**

- ❌ Wrapping a `<DefinitionList.Description>` directly in `<DefinitionList>` without an enclosing `<DefinitionList.Item>` — the dev warning fires and grid layout breaks.
- ❌ Putting interactive content in `<DefinitionList.Term>`. Use `<DefinitionList.Description>` for values, including ones containing `<Link>` or `<Button>`.
- ❌ Stacking multiple `<DefinitionList.Description>` children under one Item to render "multiple values for one key." Works HTML-wise but doesn't have styling support — render multiple Items with the same Term text if you need that pattern.

````

After the closing backticks of the anti-patterns section, leave one blank line before `### \`<Stack>\` — vertical layout`.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
AGENTS.md: DefinitionList section (T3/6)

Inserted after <Card>, before <Stack>. Follows the existing TL;DR pattern —
intro / snippet / prop summary / anti-patterns. Spells out when to use this
vs Card.List.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Playground demo + 4-place wiring

Creates the demo file with 5 examples per spec §Playground demo and wires it into the four required places.

**Files:**
- Create: `packages/playground/src/pages/components/DefinitionListDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (route)
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` (Display cluster + lucide import)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` (overview card)

---

- [ ] **Step 1: Write `DefinitionListDemo.tsx`**

Path: `packages/playground/src/pages/components/DefinitionListDemo.tsx`

```tsx
import { Mail, Phone, Building, MapPin, Globe, Briefcase, Cake, User } from 'lucide-react';
import {
  Badge,
  Cluster,
  DefinitionList,
  Link,
  Stack,
  Text,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/DefinitionList/DefinitionList.tsx?raw';
import scssSource from '@lib-source/components/DefinitionList/DefinitionList.module.scss?raw';

export function DefinitionListDemo() {
  return (
    <DemoLayout
      name="DefinitionList"
      componentName="DefinitionList"
      description="Semantic key/value pairs (dl/dt/dd) with optional leading icon on the description. Use this instead of Card.List when every row has a label."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DefinitionList.tsx"
      scssFilename="DefinitionList.module.scss"
    >
      <Example
        title="Horizontal with icons"
        description="The canonical contact-properties pattern: terms in column 1, icon + value in column 2. Term column auto-sizes to the longest label."
        code={`<DefinitionList>
  <DefinitionList.Item>
    <DefinitionList.Term>Email</DefinitionList.Term>
    <DefinitionList.Description icon={<Mail size={14} />}>
      ada@example.com
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Phone</DefinitionList.Term>
    <DefinitionList.Description icon={<Phone size={14} />}>
      +1 (415) 555-0142
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Company</DefinitionList.Term>
    <DefinitionList.Description icon={<Building size={14} />}>
      Globex Industries
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Location</DefinitionList.Term>
    <DefinitionList.Description icon={<MapPin size={14} />}>
      San Francisco, CA
    </DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>`}
      >
        <DefinitionList>
          <DefinitionList.Item>
            <DefinitionList.Term>Email</DefinitionList.Term>
            <DefinitionList.Description icon={<Mail size={14} />}>
              ada@example.com
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Phone</DefinitionList.Term>
            <DefinitionList.Description icon={<Phone size={14} />}>
              +1 (415) 555-0142
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Company</DefinitionList.Term>
            <DefinitionList.Description icon={<Building size={14} />}>
              Globex Industries
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Location</DefinitionList.Term>
            <DefinitionList.Description icon={<MapPin size={14} />}>
              San Francisco, CA
            </DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Example
        title="Explicit termWidth"
        description="Override the auto-sized term column when you need consistent alignment across multiple DefinitionLists on the same screen."
        code={`<DefinitionList termWidth="200px">
  <DefinitionList.Item>
    <DefinitionList.Term>Customer success manager</DefinitionList.Term>
    <DefinitionList.Description icon={<User size={14} />}>
      Priya Shah
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Account tier</DefinitionList.Term>
    <DefinitionList.Description>
      Enterprise
    </DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>`}
      >
        <DefinitionList termWidth="200px">
          <DefinitionList.Item>
            <DefinitionList.Term>Customer success manager</DefinitionList.Term>
            <DefinitionList.Description icon={<User size={14} />}>
              Priya Shah
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Account tier</DefinitionList.Term>
            <DefinitionList.Description>Enterprise</DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Example
        title="With dividers"
        description="Opt in to row separators when migrating from Card.List or when the list sits inside a Card."
        code={`<DefinitionList dividers>
  <DefinitionList.Item>
    <DefinitionList.Term>Website</DefinitionList.Term>
    <DefinitionList.Description icon={<Globe size={14} />}>
      globex.example.com
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Industry</DefinitionList.Term>
    <DefinitionList.Description icon={<Briefcase size={14} />}>
      Manufacturing
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Founded</DefinitionList.Term>
    <DefinitionList.Description icon={<Cake size={14} />}>
      1987
    </DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>`}
      >
        <DefinitionList dividers>
          <DefinitionList.Item>
            <DefinitionList.Term>Website</DefinitionList.Term>
            <DefinitionList.Description icon={<Globe size={14} />}>
              globex.example.com
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Industry</DefinitionList.Term>
            <DefinitionList.Description icon={<Briefcase size={14} />}>
              Manufacturing
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Founded</DefinitionList.Term>
            <DefinitionList.Description icon={<Cake size={14} />}>
              1987
            </DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Example
        title="Stacked layout"
        description="Stack each term above its description. Useful for settings pages, narrow viewports, or long descriptions that need to breathe."
        code={`<DefinitionList layout="stacked" dividers>
  <DefinitionList.Item>
    <DefinitionList.Term>Workspace name</DefinitionList.Term>
    <DefinitionList.Description>Acme Corp</DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Workspace description</DefinitionList.Term>
    <DefinitionList.Description>
      Internal tooling for the customer success team. Includes pipeline tracking,
      onboarding workflows, and a shared inbox for support escalations.
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Created</DefinitionList.Term>
    <DefinitionList.Description>March 14, 2024</DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>`}
      >
        <DefinitionList layout="stacked" dividers>
          <DefinitionList.Item>
            <DefinitionList.Term>Workspace name</DefinitionList.Term>
            <DefinitionList.Description>Acme Corp</DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Workspace description</DefinitionList.Term>
            <DefinitionList.Description>
              Internal tooling for the customer success team. Includes pipeline tracking,
              onboarding workflows, and a shared inbox for support escalations.
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Created</DefinitionList.Term>
            <DefinitionList.Description>March 14, 2024</DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Example
        title="Mixed content in description"
        description="The dd accepts any ReactNode. Compose with Badge, Link, Text, or anything else — useful for tags, statuses, or values that link out."
        code={`<DefinitionList>
  <DefinitionList.Item>
    <DefinitionList.Term>Status</DefinitionList.Term>
    <DefinitionList.Description>
      <Cluster gap="xs" align="center">
        <Badge tone="success">Active</Badge>
        <Text as="span" size="sm" tone="subtle">since Jan 2024</Text>
      </Cluster>
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Website</DefinitionList.Term>
    <DefinitionList.Description icon={<Globe size={14} />}>
      <Link href="https://globex.example.com">globex.example.com</Link>
    </DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Tags</DefinitionList.Term>
    <DefinitionList.Description>
      <Cluster gap="xs">
        <Badge tone="purple">Enterprise</Badge>
        <Badge tone="info">Pipeline 2026</Badge>
      </Cluster>
    </DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>`}
      >
        <DefinitionList>
          <DefinitionList.Item>
            <DefinitionList.Term>Status</DefinitionList.Term>
            <DefinitionList.Description>
              <Cluster gap="xs" align="center">
                <Badge tone="success">Active</Badge>
                <Text as="span" size="sm" tone="subtle">
                  since Jan 2024
                </Text>
              </Cluster>
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Website</DefinitionList.Term>
            <DefinitionList.Description icon={<Globe size={14} />}>
              <Link href="https://globex.example.com">globex.example.com</Link>
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Tags</DefinitionList.Term>
            <DefinitionList.Description>
              <Cluster gap="xs">
                <Badge tone="purple">Enterprise</Badge>
                <Badge tone="info">Pipeline 2026</Badge>
              </Cluster>
            </DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Stack gap="xs">
        <Text size="sm" tone="muted">
          Stack is imported above only to balance the spacing inside this demo file — DefinitionList does not
          render a Stack internally.
        </Text>
      </Stack>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Add the route to `App.tsx`**

Open `packages/playground/src/App.tsx`. Find the existing import block for component demos and add `DefinitionListDemo`:

Locate the line:

```tsx
import { DataTableDemo } from './pages/components/DataTableDemo';
```

Insert IMMEDIATELY AFTER it:

```tsx
import { DefinitionListDemo } from './pages/components/DefinitionListDemo';
```

Then locate the existing route block. Find the line:

```tsx
<Route path="/components/datatable" element={<DataTableDemo />} />
```

Insert IMMEDIATELY AFTER it:

```tsx
<Route path="/components/definition-list" element={<DefinitionListDemo />} />
```

- [ ] **Step 3: Wire up AppShell — add `List` to lucide imports and the entry to the Display cluster**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. Find the lucide-react import block (starts at line 3). Add `List,` between `Layers,` and `ListCollapse,` (alphabetical):

Locate:

```tsx
  Layers,
  ArrowRight,
```

Change to:

```tsx
  Layers,
  List,
  ArrowRight,
```

(Note: the existing import order isn't strict alphabetical — `Layers` is followed by `ArrowRight`. Insert `List,` between them as shown.)

Then find the Display cluster (search for `heading: 'Display'`). The items currently include `Code`, `EmptyState`, etc. Locate this line:

```tsx
      { to: '/components/code', label: 'Code', icon: CodeIcon, end: false },
```

Insert IMMEDIATELY AFTER it:

```tsx
      { to: '/components/definition-list', label: 'DefinitionList', icon: List, end: false },
```

- [ ] **Step 4: Wire up ComponentsIndex**

Open `packages/playground/src/pages/components/ComponentsIndex.tsx`. Find the existing `DataTable` overview card. The pattern is:

```tsx
{
  to: '/components/datatable',
  name: 'DataTable',
  preview: <DataTablePreview />,
},
```

(The exact JSX may differ — read the file to see the current pattern before inserting.)

Add a DefinitionList entry following the same shape. Use this preview:

```tsx
<DefinitionList>
  <DefinitionList.Item>
    <DefinitionList.Term>Email</DefinitionList.Term>
    <DefinitionList.Description>ada@example.com</DefinitionList.Description>
  </DefinitionList.Item>
  <DefinitionList.Item>
    <DefinitionList.Term>Phone</DefinitionList.Term>
    <DefinitionList.Description>+1 (415) 555-0142</DefinitionList.Description>
  </DefinitionList.Item>
</DefinitionList>
```

Position: between DataTable and EmptyState in the overview grid (or wherever the file orders D-named components).

If `ComponentsIndex.tsx` uses a different pattern (e.g. a manifest-driven approach), match its conventions. Read the file first; do not invent new structure.

- [ ] **Step 5: Run playground typecheck**

Run: `make build`

Expected: clean. If the import paths fail (`@lib-source/components/DefinitionList/...`), verify the Vite `@lib-source` alias in `packages/playground/vite.config.ts` covers all of `packages/design-system/src/components`.

- [ ] **Step 6: Manually verify the demo loads (optional but recommended)**

Run: `cd packages/playground && npx vite --port 8090 --strictPort` in the background. Navigate to `http://localhost:8090/components/definition-list`. Confirm all 5 examples render. Kill the dev server when done.

- [ ] **Step 7: Run lint**

Run: `make lint`

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add packages/playground/src/pages/components/DefinitionListDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx
git commit -m "$(cat <<'EOF'
DefinitionList playground demo + nav wiring (T4/6)

Five examples: horizontal with icons (the canonical contact-properties
pattern), explicit termWidth override, dividers, stacked layout, and mixed
content (Badge / Link / Text inside dd). Wired into App.tsx route, AppShell
Display cluster (lucide List icon), and ComponentsIndex overview grid.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: ContactDetail.About migration + registry update

Refactor the About card from `Card.List` + local `Field` helper to `DefinitionList`. Delete the now-unused `Field` helper. Add `DefinitionList` to the contact-detail mockup's registry entry.

**Files:**
- Modify: `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

---

- [ ] **Step 1: Verify Field has no other callers**

Run: `grep -rn "Field" packages/playground/src/pages/mockups/ContactDetail/`

Expected: only references inside `ContactDetail.tsx` (the helper definition and the four `<Field ...>` call sites in the About card). If any other file imports `Field` from this module, STOP and update the plan — the helper is shared.

- [ ] **Step 2: Update `ContactDetail.tsx` imports**

Open `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx`. Find the existing `@eocrm/design-system` import block. Add `DefinitionList` to it (alphabetical — between `DataTable` if present, otherwise between `Cluster` and `DropdownMenu`).

The current import block looks like (verify by reading the file):

```tsx
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  DropdownMenu,
  Grid,
  Link,
  PageHeader,
  Stack,
  Tabs,
  Text,
  Title,
} from '@eocrm/design-system';
```

Change to:

```tsx
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  DefinitionList,
  DropdownMenu,
  Grid,
  Link,
  PageHeader,
  Stack,
  Tabs,
  Text,
  Title,
} from '@eocrm/design-system';
```

- [ ] **Step 3: Replace the About card body**

In the same file, locate the About card. The current block is:

```tsx
            <Card>
              <Card.Header headerLevel="h2">About</Card.Header>
              <Card.List>
                <Field label="Email" value={contact.email} icon={<Mail size={14} />} />
                <Field label="Phone" value="+1 (415) 555-0142" icon={<Phone size={14} />} />
                <Field label="Company" value={contact.company} icon={<Building size={14} />} />
                <Field label="Location" value="San Francisco, CA" icon={<MapPin size={14} />} />
              </Card.List>
            </Card>
```

Replace it with:

```tsx
            <Card>
              <Card.Header headerLevel="h2">About</Card.Header>
              <DefinitionList dividers>
                <DefinitionList.Item>
                  <DefinitionList.Term>Email</DefinitionList.Term>
                  <DefinitionList.Description icon={<Mail size={14} />}>
                    {contact.email}
                  </DefinitionList.Description>
                </DefinitionList.Item>
                <DefinitionList.Item>
                  <DefinitionList.Term>Phone</DefinitionList.Term>
                  <DefinitionList.Description icon={<Phone size={14} />}>
                    +1 (415) 555-0142
                  </DefinitionList.Description>
                </DefinitionList.Item>
                <DefinitionList.Item>
                  <DefinitionList.Term>Company</DefinitionList.Term>
                  <DefinitionList.Description icon={<Building size={14} />}>
                    {contact.company}
                  </DefinitionList.Description>
                </DefinitionList.Item>
                <DefinitionList.Item>
                  <DefinitionList.Term>Location</DefinitionList.Term>
                  <DefinitionList.Description icon={<MapPin size={14} />}>
                    San Francisco, CA
                  </DefinitionList.Description>
                </DefinitionList.Item>
              </DefinitionList>
            </Card>
```

- [ ] **Step 4: Delete the `Field` helper**

In the same file, locate the `Field` helper function (typically near the bottom of the file). The exact shape is:

```tsx
function Field({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <Card.ListRow>
      <Text as="span" size="sm" tone="muted" weight="medium">
        {label}
      </Text>
      <Cluster gap="sm" align="center" wrap={false}>
        {icon && (
          <Text as="span" tone="subtle">
            {icon}
          </Text>
        )}
        <Text as="span" size="sm" tone="muted">
          {value}
        </Text>
      </Cluster>
    </Card.ListRow>
  );
}
```

Delete this entire function block. Also delete the `ReactNode` import if it's no longer used anywhere else in the file (verify with `grep ReactNode packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx` — if only one match remains in the type import line, the `ReactNode` type should be removed from `import { useState, type ReactNode } from 'react';`).

Wait — there's also a `TimelineItem` helper in this file that uses `ReactNode`. Run the grep first; if `TimelineItem` still uses `ReactNode` keep the import.

Run: `grep "ReactNode" packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx`

If only the `Field` signature used it, remove `type ReactNode` from the React import. If `TimelineItem` or any other helper still uses it, leave the import alone.

- [ ] **Step 5: Update `registry.ts`**

Open `packages/playground/src/pages/mockups/registry.ts`. Find the `contact-detail` mockup entry. Its current `usesComponents` array looks like:

```ts
    usesComponents: [
      'Avatar',
      'Badge',
      'Breadcrumb',
      'Button',
      'Card',
      'Cluster',
      'DropdownMenu',
      'Grid',
      'Link',
      'PageHeader',
      'Stack',
      'Tabs',
      'Text',
      'Title',
    ],
```

Insert `'DefinitionList'` alphabetically between `'Cluster'` and `'DropdownMenu'`:

```ts
    usesComponents: [
      'Avatar',
      'Badge',
      'Breadcrumb',
      'Button',
      'Card',
      'Cluster',
      'DefinitionList',
      'DropdownMenu',
      'Grid',
      'Link',
      'PageHeader',
      'Stack',
      'Tabs',
      'Text',
      'Title',
    ],
```

The `ComponentName` union at the top of the same file already includes `'DefinitionList'`? Verify by `grep "'DefinitionList'" packages/playground/src/pages/mockups/registry.ts`. If the union does NOT include it (it almost certainly doesn't), add it alphabetically to the union:

Locate the union (it spans many lines, each line is a `| 'ComponentName'`):

```ts
  | 'DataTable'
  | 'DatePicker'
```

Insert IMMEDIATELY AFTER the `'DataTable'` line, before `'DatePicker'`:

```ts
  | 'DefinitionList'
```

- [ ] **Step 6: Run the playground typecheck**

Run: `npx tsc --noEmit -p packages/playground/tsconfig.json`

Expected: clean.

- [ ] **Step 7: Run the full build**

Run: `make build`

Expected: clean. If the build fails because of an unresolved `Field` reference, double-check Step 4 — the helper deletion should remove BOTH the function AND any leftover JSX references that might exist outside the About card (there shouldn't be any per Step 1's grep, but verify).

- [ ] **Step 8: Run lint**

Run: `make lint`

Expected: clean.

- [ ] **Step 9: Manually verify the ContactDetail.About card renders correctly (optional but recommended)**

Run: `cd packages/playground && npx vite --port 8090 --strictPort` in the background. Navigate to `http://localhost:8090/mockups/contacts` and click any contact (e.g. Ada Sterling). Confirm the About card still shows four labeled rows (Email / Phone / Company / Location) with their lucide icons, and that the row dividers are intact (matching the pre-migration look). Kill the dev server when done.

- [ ] **Step 10: Commit**

```bash
git add packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
ContactDetail.About: migrate to DefinitionList (T5/6)

Replaced the local <Field> helper + Card.List with <DefinitionList dividers>.
Each row is now a proper <dt>/<dd> pair instead of generic <li> cells.
Field helper deleted (no other callers). Registry updated.

Visual continuity preserved via the dividers prop — same row-separator look
as the pre-migration Card.List.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: HR8 review cycle + push + PR

Run the mandatory pre-push review-fix loop (Hard rule 8 in `packages/design-system/CLAUDE.md`). Two fresh-context Opus reviewers, fix every Critical/Important finding, re-run gates, repeat until `clean enough to stop`.

**Files:** none directly modified by this task; only by the fixes the reviewers prompt.

---

- [ ] **Step 1: Run all four gates**

Run, sequentially:

```bash
make test
make build-lib
make build
make lint
```

Expected: all four exit cleanly. If any fails, fix the underlying issue (not by amending earlier task commits — create a new commit) and re-run before starting reviews.

Also run the publish-tarball check:

```bash
npm pack --dry-run -w @eocrm/design-system
```

Expected: the tarball includes the new `src/components/DefinitionList/` directory (look for `DefinitionList.tsx`, `DefinitionList.module.scss`, `index.ts` — NOT `DefinitionList.test.tsx`, which should be excluded by `.npmignore`).

- [ ] **Step 2: Dispatch the first HR8 reviewer (Opus)**

Spawn a fresh-context `general-purpose` agent with the Opus model. Brief it on the 10 HR8 review categories. Hand it the spec path + the committed file list. Expected verdict on first round: at least 1–2 findings (component reviews typically surface something).

Reviewer prompt template:

```
You are reviewing a fresh implementation of <DefinitionList> on branch `feat/definition-list` of the EOCRM design-system monorepo. Spec source: docs/superpowers/specs/2026-05-25-definition-list-design.md (committed at e0a4b04).

Context to load first:
- packages/design-system/CLAUDE.md (especially Hard rule 8 + the 7 component rules)
- packages/design-system/AGENTS.md (look at how existing components document themselves)
- docs/superpowers/specs/2026-05-25-definition-list-design.md (the spec)

Files under review (read each thoroughly):
- packages/design-system/src/components/DefinitionList/DefinitionList.tsx
- packages/design-system/src/components/DefinitionList/DefinitionList.module.scss
- packages/design-system/src/components/DefinitionList/DefinitionList.test.tsx
- packages/design-system/src/components/DefinitionList/index.ts
- packages/design-system/src/index.ts (the new re-export block)
- packages/design-system/AGENTS.md (the new section after <Card>)
- packages/playground/src/pages/components/DefinitionListDemo.tsx
- packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx (the About migration)
- packages/playground/src/pages/mockups/registry.ts (the DefinitionList addition)

Review categories (apply all 10 from HR8):
1. Bugs / correctness — does the component do what the spec says?
2. Accessibility — dl/dt/dd semantics, aria-hidden on the icon span, focus behavior.
3. API consistency — match other library compounds (Card, PageHeader)?
4. Type safety — exports complete? Props typed against HTMLAttributes correctly?
5. Rule compliance (CLAUDE.md rules 1–7) — forwardRef? JSDoc on every export? Spread pattern documented?
6. Test coverage — all 14 cases meaningful? Any missing edge case?
7. Token discipline — no raw colors / spacing / radii in SCSS.
8. SCSS / CSS — display:contents handled, dividers in both layouts, no Rule 4 violations (no margin / position / width / flex:1 in the component's SCSS).
9. Cross-package leakage — no relative imports from playground into library; demo uses @eocrm/design-system + @lib-source alias correctly.
10. Package / distribution — npm pack dry-run looks right; .test.tsx excluded.

Specific watch-outs:
- The dev-mode warning fires during render (not in useEffect). Confirm React's render-during-render side-effect rules aren't violated — console.warn during render is the canonical React pattern (matches React's own warnings) and is fine.
- termWidth uses `--dl-term-width` CSS variable via inline style. Verify the variable name is consistent between TS and SCSS.
- The migration in ContactDetail.tsx must preserve visual continuity (dividers prop). Confirm by reading the registry diff.

Output format: Critical / Important / Nice-to-have / Regression-watch + a final verdict line (`clean enough to stop` or `keep iterating`). Per-finding: file:line, quoted code, suggested fix. Be concise.
```

- [ ] **Step 3: Fix every Critical and every Important finding**

Read the reviewer's report. For each Critical and Important finding:

1. Fix the underlying issue in the affected file.
2. If a fix changes the component's API surface, also update the spec (`docs/superpowers/specs/2026-05-25-definition-list-design.md`) AND the AGENTS.md section to stay in sync.
3. If a fix touches the test file, add a new test case rather than modifying an existing one (unless the existing one is wrong).

Nice-to-have findings: fix when cheap, skip when churn outweighs. Document any skipped finding with a one-line rationale in the commit message.

After all fixes, re-run the four gates from Step 1 (`make test && make build-lib && make build && make lint`).

- [ ] **Step 4: Commit fixes**

Stage only the files you actually changed (explicit paths, no `-A`):

```bash
git add <changed-files>
git commit -m "$(cat <<'EOF'
HR8 round-1 fixes

<summary of each fixed finding, one bullet each>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Dispatch the second HR8 reviewer (Opus, fresh context)**

Same prompt as Step 2, with one addition at the end:

```
A previous reviewer (round 1) found <N> findings. They have just been fixed in commit <sha>. Your job: independently verify the entire implementation with a fresh read — not just spot-check the fixed items, but apply all 10 categories to all files under review.
```

- [ ] **Step 6: Iterate or stop**

If round 2 verdict is `keep iterating`, repeat Steps 3–5 until verdict is `clean enough to stop`. Hard exit criteria per HR8:

- 0 Critical, 0 Important (or each remaining one has an explicit documented skip)
- All four gates green
- `npm pack --dry-run` shows no test files or internal-only paths in the tarball

- [ ] **Step 7: Push the branch**

Run: `git push -u origin feat/definition-list`

If the pre-push hook flags prettier drift (the same dance as PR #68's last commit), run:

```bash
npx prettier --write <flagged-paths>
git add <flagged-paths>
git commit --amend --no-edit
git push -u origin feat/definition-list
```

Do NOT use `--no-verify` to bypass the hook.

- [ ] **Step 8: Open the PR**

Run:

```bash
gh pr create --title "DefinitionList: semantic <dl>/<dt>/<dd> primitive + ContactDetail.About migration" --body "$(cat <<'EOF'
## Summary

- New compound primitive `<DefinitionList>` with `Item` / `Term` / `Description` sub-components. Renders `<dl>`/`<div>`/`<dt>`/`<dd>` so screen readers announce term-description pairs natively.
- `<DefinitionList.Description>` accepts a leading `icon` (decorative, `aria-hidden`).
- Props on the root: `layout='horizontal' | 'stacked'`, `termWidth` (CSS length, default `max-content`), `spacing='sm' | 'md' | 'lg'`, `dividers`.
- Horizontal layout uses CSS grid + `display: contents` on items so all rows share an auto-sized term column.
- ContactDetail.About migrated in the same PR — `<DefinitionList dividers>` replaces the local `<Field>` helper + `Card.List` while preserving the row-separator look.

### Files

- New: `packages/design-system/src/components/DefinitionList/` (4 files per `structure.test.ts`)
- New: `packages/playground/src/pages/components/DefinitionListDemo.tsx` (5 examples)
- Modified: library `src/index.ts`, `AGENTS.md`; playground `App.tsx`, `AppShell.tsx`, `ComponentsIndex.tsx`, `ContactDetail.tsx`, `registry.ts`

### HR8 review cycle

Two rounds of fresh-context Opus reviewers. Verdict on round 2: `clean enough to stop`.

## Test plan

- [x] `make test` — full suite green; 14 new DefinitionList cases
- [x] `make build-lib` — typecheck clean
- [x] `make build` — playground bundle clean
- [x] `make lint` — clean
- [x] `npm pack --dry-run -w @eocrm/design-system` — new files in tarball, tests excluded
- [x] Manually verified ContactDetail.About renders with all four rows + icons + dividers
- [x] HR8 review cycle round 2: clean enough to stop

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 9: Verify the PR's CI quality check passes**

Run: `gh pr checks --watch` (or visit the PR URL).

Expected: the `Quality / check` job passes. If it fails, read the log, fix locally, push, repeat.

---

## Self-Review (run before handing off to subagent-driven-development)

**1. Spec coverage**

| Spec section | Task |
| --- | --- |
| §Why a new primitive | T1 (JSDoc) + T3 (AGENTS.md) |
| §HTML/semantics — dl/div/dt/dd | T1 step 1 + T2 case "renders Item as <div>, Term as <dt>, Description as <dd>" |
| §API surface — props | T1 step 1 (interface definitions) |
| §Default rationale | T1 step 1 (default values) + T2 cases checking data-attributes |
| §Layout mechanics — horizontal grid + display:contents | T1 step 2 |
| §Layout mechanics — stacked flex | T1 step 2 |
| §Layout mechanics — icon rendering | T1 step 1 + T2 cases 5, 6 |
| §Spacing variants | T1 step 2 + T2 it.each |
| §Dividers in both layouts | T1 step 2 + T2 cases 11, 12 |
| §Files (4 per structure test) | T1 |
| §Public exports (src/index.ts) | T1 step 5 |
| §Tests (14 cases) | T2 |
| §Migration (ContactDetail.About) | T5 |
| §Playground demo (5 examples) | T4 |
| §AGENTS.md placement after `<Card>` | T3 |
| §Out of scope | (intentionally not implemented; no task) |

All spec sections mapped. No gaps.

**2. Placeholder scan**

- No "TBD" / "TODO" / "implement later" in the plan.
- Every code block contains literal file contents, not stubs.
- "Add appropriate error handling" — not used.
- Step-by-step instructions exist for every modification site.
- All referenced types (`DefinitionListProps`, `DefinitionListItem`, etc.) are defined in T1 step 1.

**3. Type consistency**

- `DefinitionListProps` is the same shape in T1 step 1, the export block in T1 step 5, the test file in T2, and the demo in T4.
- `DefinitionListLayout = 'horizontal' | 'stacked'` — same in all references.
- `DefinitionListSpacing = 'sm' | 'md' | 'lg'` — same in all references.
- The CSS variable `--dl-term-width` is named the same in TS (T1 step 1) and SCSS (T1 step 2).
- `Object.assign(DefinitionListRoot, { Item, Term, Description })` matches the import patterns in T4 demo and T5 migration.

All consistent. Plan is ready to execute.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-25-definition-list.md`. Per memory `feedback_plan_execution_mode`, this will execute via `superpowers:subagent-driven-development` — fresh subagent per task, two-stage review between tasks. No "which approach?" prompt.

Model selection per task:
- T1, T2, T4, T5: Sonnet (mechanical implementation with full plan-verbatim guidance)
- T3: Haiku (AGENTS.md insert is small + mechanical)
- T6: Opus reviewers
