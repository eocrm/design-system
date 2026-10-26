# TableOfContents + AppLayout main landmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `AppLayout`'s `mainLandmark` prop and a new `TableOfContents` component (explicit items, scroll-spy, top-bar-aware jumps, collapsed disclosure), then retire both TODO mocks in the `/mockups/docs` mockup.

**Architecture:** `mainLandmark` swaps the content region's element. `TableOfContents` keeps its scroll-spy decision in a pure Node-tested function. A thin hook feeds it heading positions from the window, rAF-throttled, client-only. The component renders one `<nav>` that holds either a heading plus list or a `<details>` disclosure. Clicks scroll with `window.scrollTo` to the heading's top minus the resolved `--sticky-top-topbar`.

**Tech Stack:** React 19, TypeScript, SCSS modules + CSS custom properties, Vitest (`unit` = Node `*.test.ts`, `dom` = jsdom `*.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-10-26-toc-and-main-landmark-design.md`

## Global Constraints

- `AppLayout`: `mainLandmark?: boolean`, default `false`. When true, the content region is `<main>` with the same class; the ref stays on the root.
- `TableOfContents` items: `{ id: string; label: string; level: 2 | 3 }`, explicit only, no DOM scanning.
- At most one link has `aria-current="location"`. The server render has none.
- Scroll only the **window**. The offset is the resolved px of `--sticky-top-topbar` (a global `:root` token; don't touch Sticky).
- Smooth scrolling, except instant when `(prefers-reduced-motion: reduce)` matches.
- Clicking a link updates the URL hash.
- Exactly one `<nav>` landmark per TOC in both modes, named `t('tableOfContents.label')`: en "On this page", ru "На этой странице". The collapsed summary reads `{label} · {current section label}` once a section is active, with the interpolation done at the call site.
- `window`, `matchMedia`, `scrollTo`, `history` and `getBoundingClientRect` are used only in effects and handlers (SSR-safe).
- Library hard rules apply: forwardRef + spread attrs, JSDoc, tests, i18n en + ru, tokens only, no layout props, Hard rule 10 (no live announcements for scroll-spy; `aria-current` only).
- Run vitest with cwd `packages/design-system`. Check `make test`'s exit code, not grep output. Plain commit messages: no Co-Authored-By, no session links.

## Review Focus

1. **The last section is too short to reach the reading line** (common on docs pages). When the page is scrolled to the bottom, the last item becomes active. Tested in Task 2.
2. **An item whose `id` isn't in the document** (a typo, or content not yet rendered): it's skipped for tracking, its link still renders, and clicking it doesn't throw (it falls back to plain hash navigation). Tested in Task 2 and Task 3.
3. **Clicking a far section with smooth scrolling:** the highlight goes straight to the clicked item, with no flicker through the sections in between, and spy resumes after the scroll ends. Tested in Task 3.
4. **Keyboard or screen-reader user activates a link:** focus moves to the target heading (adding `tabindex="-1"` if it isn't focusable, scrolling prevented), so reading continues from there. Tested in Task 3.
5. **Empty `items`:** renders nothing (`null`), with no empty landmark. Tested in Task 3.

---

### Task 1: `AppLayout` `mainLandmark`

**Files:**

- Modify: `packages/design-system/src/components/AppLayout/AppLayout.tsx` (prop + JSDoc; the content region at ~line 184)
- Test: `packages/design-system/src/components/AppLayout/AppLayout.test.tsx`
- Modify: `packages/design-system/docs/components/AppLayout.md`: in the landmark note, say the outermost shell passes `mainLandmark` and nested previews keep the default. Then `npm run build:docs`.
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`. Both `<main>{children}</main>` sites (~186 and ~298): the AppLayout one becomes `<AppLayout mainLandmark …>{children}</AppLayout>`, and its comment is updated. The full-bleed branch (~186) has no AppLayout, so it keeps its `<main>`.
- Modify: `packages/playground/src/pages/mockups/Docs/Docs.tsx` (~819): drop the raw `<main>` and its TODO comment, and pass `mainLandmark`.
- Modify: `packages/playground/TODO.md`: tick the `<AppLayout>` entry (`[x]`, plus a "Shipped: 2026-10-26 — `mainLandmark` prop" line), keeping it as history.

- [ ] **Step 1: Failing tests**: `mainLandmark` → `screen.getByRole('main')` contains the children and has the same class as the default content region; default → `queryByRole('main')` is null; the ref is still the root element in both modes.
- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/AppLayout`
- [ ] **Step 3: Implement** the prop. The element is `mainLandmark ? 'main' : 'div'`.
- [ ] **Step 4: Run, expect PASS.** Then `npm run build:docs`, and `make test` / `make build` / `make lint` from the root, each exiting 0.
- [ ] **Step 5: Commit**: `feat(app-layout): mainLandmark prop; playground shells use it`

---

### Task 2: Scroll-spy engine

**Files:**

- Create: `packages/design-system/src/components/TableOfContents/activeSection.ts`
- Test: `packages/design-system/src/components/TableOfContents/activeSection.test.ts`

**Interfaces:**

- Produces: `pickActiveSection(headings: readonly { id: string; top: number }[], line: number, atBottom: boolean): string | undefined`
  - `headings` are only the ids found in the document, in item order. `top` is the viewport-relative `getBoundingClientRect().top`.
  - Returns `undefined` when `headings` is empty. When `atBottom` is true, returns the last heading. Otherwise returns the last heading with `top <= line`, or the first heading if none has passed the line yet.

- [ ] **Step 1: Failing tests**

```ts
const h = [
  { id: 'a', top: -400 },
  { id: 'b', top: 40 },
  { id: 'c', top: 900 },
];
it('last heading at or above the line wins', () =>
  expect(pickActiveSection(h, 80, false)).toBe('b'));
it('line exactly on a heading counts', () => expect(pickActiveSection(h, 40, false)).toBe('b'));
it('nothing passed yet → first', () =>
  expect(
    pickActiveSection(
      [
        { id: 'a', top: 300 },
        { id: 'b', top: 900 },
      ],
      80,
      false,
    ),
  ).toBe('a'));
it('scrolled to bottom → last, even if short', () =>
  expect(pickActiveSection(h, 80, true)).toBe('c'));
it('no headings → undefined', () => expect(pickActiveSection([], 80, true)).toBeUndefined());
```

- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/TableOfContents/activeSection.test.ts`
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit**: `feat(toc): scroll-spy engine` (structure/manifest tests fail until Task 4, as expected)

---

### Task 3: `TableOfContents` component

**Files:**

- Create: `packages/design-system/src/components/TableOfContents/TableOfContents.tsx`, `TableOfContents.module.scss` (first line `@use './TableOfContents.tokens';`), `TableOfContents.tokens.scss`, `index.ts`
- Test: `packages/design-system/src/components/TableOfContents/TableOfContents.test.tsx`
- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts`: new group `tableOfContents.label` = 'On this page' / 'На этой странице'
- Modify: `packages/design-system/src/styles/contrast.test.ts`: active-item fg ≥ 4.5 on `--color-bg`, and inactive fg ≥ 4.5 on `--color-bg`, for every theme × accent (existing helpers)

**Interfaces:**

- Consumes: `pickActiveSection` (Task 2)
- Produces (exported from `index.ts`):

```ts
export interface TableOfContentsItem {
  id: string;
  label: string;
  level: 2 | 3;
}
export interface TableOfContentsProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  items: readonly TableOfContentsItem[];
  collapsed?: boolean; // render the <details> disclosure instead of heading + list; default false
}
export const TableOfContents: ForwardRefExoticComponent<
  TableOfContentsProps & RefAttributes<HTMLElement>
>; // ref → <nav>
```

**Behaviour decided here:**

- `items.length === 0` → return `null`.
- **Expanded:** `<nav aria-label={t('tableOfContents.label')}>`, containing a visible `<Text size="xs" weight="semibold" tone="muted">` label (`aria-hidden`, since the nav name already says it) and then `<ul>`. Each `<li>` holds `<a href={'#' + id}>`; level 3 is indented through a token-driven `padding-inline-start`. The active link gets `aria-current="location"`, accent text and an inline-start accent bar (`border-inline-start` with a border-width token). Inactive links use muted text and turn fg on hover; focus uses `:focus-visible`.
- **Collapsed:** the same `<nav>`, containing `<details>` → `<summary>` (`label`, plus ` · {activeLabel}` when active) and the same list. Choosing an entry closes it (`detailsRef.current.open = false`).
- **Spy (client only):** in an effect, resolve ids to elements with `document.getElementById`, skipping missing ones. On scroll and resize, rAF-throttled, compute `{ id, top }` from `getBoundingClientRect()`, `line = offset + 1`, and `atBottom = innerHeight + scrollY >= scrollHeight - 2`, then set the active id from `pickActiveSection`. Run it once on mount; the server render has no active item.
- **Offset:** custom properties aren't resolved by `getPropertyValue`, so resolve `--sticky-top-topbar` to px with a probe. Example: a hidden element in the nav styled `height: var(--sticky-top-topbar)`, read via `offsetHeight`. Re-read on resize.
- **Click** (plain left click with no modifier keys; anything else is left to the browser):
  - If the target is missing, do nothing special and let native hash navigation run.
  - Otherwise, `preventDefault`; `window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset, behavior: reduceMotion ? 'auto' : 'smooth' })`; `history.pushState(null, '', '#' + id)`.
  - Set the active id to the clicked one and pause the spy until `scrollend` fires (or 1000 ms as a fallback, whichever comes first).
  - Focus the heading with `{ preventScroll: true }`, adding `tabindex="-1"` first if it isn't natively focusable.

- [ ] **Step 1: Failing tests** (jsdom: stub `window.scrollTo`, `matchMedia`, and each heading's `getBoundingClientRect`; render headings with ids in the document):
  - `items={[]}` renders nothing, and `queryByRole('navigation')` is null
  - expanded: one `navigation` named "On this page"; links have `href="#a"`; level 3 has the nested class
  - after mount, with heading `b` at top 40 and the offset probe at 72, `b`'s link has `aria-current="location"` and no other link has it; after the scroll event moves `c` above the line, `c` becomes current
  - the server render (`renderToString`) has no `aria-current`
  - scrolled to the bottom: the last item is current
  - clicking `c` calls `scrollTo` with `top = rect.top + scrollY - offset` and `behavior: 'smooth'`; with reduced motion it uses `'auto'`; `location.hash === '#c'`; `c` is current immediately; the heading is focused and gets `tabindex="-1"`
  - a ctrl-click doesn't call `scrollTo`
  - an item whose id is missing renders its link, and clicking it doesn't throw and doesn't call `scrollTo`
  - collapsed: one `navigation`; the summary text is "On this page", becoming "On this page · B" once `b` is active; clicking an entry closes the `<details>`
  - ru locale: the nav is named "На этой странице"
  - the ref is the `<nav>`; `className` is merged; `data-*` attributes pass through
- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/TableOfContents`
- [ ] **Step 3: Implement** the component, SCSS, tokens and i18n, with full JSDoc (one-line component summary + `@see docs/components/TableOfContents.md`).
- [ ] **Step 4: Run, expect PASS**, including `npx vitest run src/styles/contrast.test.ts`. Then `npm run lint:css` and `npm run typecheck` from the root.
- [ ] **Step 5: Commit**: `feat(toc): TableOfContents component`

---

### Task 4: Library integration

**Files:**

- Modify: `packages/design-system/src/index.ts` (export `TableOfContents`, `TableOfContentsProps`, `TableOfContentsItem`)
- Create: `packages/design-system/docs/components/TableOfContents.md` covering:
  - TL;DR: `<Sticky top="topbar"><TableOfContents items={…} /></Sticky>` in a `Split` aside, and collapsed mode driven by `Split onCollapsedChange`
  - "When NOT to use": page-level nav belongs in `Rail`/`Tabs`; short pages don't need it
  - window-scroll only
  - set `html { scroll-padding-top: var(--sticky-top-topbar) }` so directly opened `#hash` links clear the bar
  - ids must match the heading ids
  - the generated props table (`npm run build:docs`)
- Modify: `packages/design-system/AI-PRIMER.md`: an index line in the navigation section
- Modify: `CLUSTERS` in both `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`: `TableOfContents: 'Navigation'`. Then `npm run build:manifest`.

- [ ] **Step 1:** Make the edits, then run `npm run build:docs && npm run build:manifest` (cwd `packages/design-system`).
- [ ] **Step 2: Verify:** `make test` exits 0, and `npm pack --dry-run -w @eocrm/design-system` lists no `*.test.*`.
- [ ] **Step 3: Commit**: `feat(toc): export, docs, primer, manifest`

---

### Task 5: Playground demo + docs mockup

**Files:**

- Create: `packages/playground/src/pages/components/TableOfContentsDemo.tsx` (`DemoLayout` + `Example`, `componentName="TableOfContents"`). The examples:
  - a long article in a `Split` with a sticky TOC aside: two levels, realistic API-docs headings, enough content to scroll
  - the collapsed mode
  - an item with a missing id
- Modify: `App.tsx` (route `/components/table-of-contents`), `navItems.ts` (Navigation group), `ComponentsIndex.tsx` + `overviewSchematics.tsx` (schematic: a column of short tinted bars with exactly one solid-accent bar), and `registry.ts` (union, plus the docs mockup's `usesComponents`)
- Modify: `packages/playground/src/pages/mockups/Docs/Docs.tsx` `Article`: replace the TODO-marked `Sticky` + `Stack` + `Link` aside with `<Sticky top="topbar"><TableOfContents items={toc} collapsed={collapsed} /></Sticky>`. Drive `collapsed` with `Split onCollapsedChange`. Give each `toc` entry `level: 2`, plus level 3 where the page has sub-sections. Remove the TODO comment. Section headings keep their ids.
- Modify: `packages/playground/TODO.md`: tick the `<TableOfContents>` entry (shipped line), keeping it as history

- [ ] **Step 1:** Make the edits. `grep -n "TODO: replace when" packages/playground/src/pages/mockups/Docs/Docs.tsx` must return zero matches.
- [ ] **Step 2: Verify:** `make test`, `make build` and `make lint` each exit 0.
- [ ] **Step 3: Visual check:**
  - Run the playground on port 8090+ in the background, and stop it afterwards.
  - On `/mockups/docs/api/contacts/list`: scrolling moves the highlight; clicking "Response" lands its heading just below the top bar and the URL ends `#response`.
  - In a narrow window the TOC becomes the "On this page" disclosure.
  - Check light and dark.
- [ ] **Step 4: Commit**: `feat(playground): TableOfContents demo; docs mockup uses it`

---

### Task 6: `Input` suggestions (issue #705)

**Files:**

- Modify: `packages/design-system/src/components/Input/Input.tsx` (+ `Input.module.scss`, `Input.tokens.scss` if needed); a new internal `packages/design-system/src/components/Input/Suggestions.tsx` for the popup + listbox if it keeps `Input.tsx` focused
- Test: `packages/design-system/src/components/Input/Input.test.tsx` (or `Suggestions.test.tsx`)
- Modify: i18n `messages.ts`/`en.ts`/`ru.ts`: `input.suggestions` = 'Suggestions' / 'Подсказки'
- Modify: `packages/design-system/docs/components/Input.md` (a suggestions section, plus "When NOT to use: fixed set → `Select`"), then `npm run build:docs`
- Modify: the playground Input demo (`packages/playground/src/pages/components/InputDemo.tsx`): add a suggestions example
- Modify: `packages/playground/src/pages/mockups/Docs/Docs.tsx`: Try it **Workspace** `Input` gets `suggestions={['acme', 'acme-staging', 'northwind']}`

**Interfaces:**

- Produces: `InputProps.suggestions?: readonly string[]` (JSDoc'd). There are no other new public exports.

**Behaviour:** exactly spec Part 3. In short:

- **ARIA:** the input becomes an ARIA 1.2 combobox, and the popup is a `role="listbox"` of options named `t('input.suggestions')`, positioned with `@floating-ui/react-dom` (`useFloating` + `flip` + `size` to match the input's width and cap the height).
- **Opening:** on focus, click or ↓. It shows all suggestions until the user edits the text after opening, then filters by case-insensitive substring.
- **Keyboard:** ↓/↑ wrap around, with nothing highlighted at first. Enter on a highlighted option selects it and closes. Enter with nothing highlighted acts natively. Esc closes. Tab closes without selecting.
- **Mouse and blur:** clicking an option selects it (`onMouseDown` `preventDefault`, so focus stays). Blur closes.
- **No matches:** the popup stays closed.
- **`onChange`:** selection fires the consumer's `onChange` like typing does. Set the value through the native value setter, then dispatch a bubbling `input` event, so both controlled and uncontrolled use work.
- **Without `suggestions`** (or with an empty array): `Input` renders exactly as before, with no combobox role.

- [ ] **Step 1: Failing tests:**
  - no `suggestions` → no `combobox` role (the existing tests stay green)
  - `suggestions` → `role="combobox"` with `aria-expanded="false"`; on focus it is `true` and the listbox shows all 3 options, even when the value is `'acme'`
  - typing `'north'` → only `northwind`; typing `'zzz'` → listbox closed and `aria-expanded="false"`
  - ↓ sets `aria-activedescendant` to the first option; ↑ from the first wraps to the last; Enter → the value is the option, `onChange` is called with that value, and it closes
  - Enter with no highlight inside a `<form onSubmit>` → submit fires
  - Esc closes; Tab closes and the value is unchanged
  - clicking an option → the value is set, focus stays on the input, and it closes
  - uncontrolled (`defaultValue`) and controlled (`value` + `onChange` with state) both update
  - ru locale → the listbox is named "Подсказки"
- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/Input`
- [ ] **Step 3: Implement**, following the library hard rules (JSDoc, tokens only, `:focus-visible`, no layout props except the popup's own floating positioning, i18n).
- [ ] **Step 4: Run, expect PASS.** Then `npm run build:docs`, and `make test` / `make build` / `make lint` from the root, each exiting 0.
- [ ] **Step 5: Visual check:**
  - Run the playground on port 8090+ in the background, and stop it afterwards.
  - The Try it Workspace field shows all three on focus, filters as you type, keyboard selection works, and it looks right in light and dark.
- [ ] **Step 6: Commit**: `feat(input): suggestions prop (#705)`

---

## After the tasks

Pause with a live playground link for dpws to check, then run `pre-push-review` (variant A + B) on one PR.
