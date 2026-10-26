# TableOfContents + AppLayout main landmark — design

**Date:** 2026-10-26
**Status:** draft for approval
**Origin:** the two open gaps that the developer-docs mockup (`/mockups/docs`) filed in `packages/playground/TODO.md`:

- `<TableOfContents>`, an "On this page" nav with scroll-spy
- `<AppLayout>`, letting the content region be the `<main>` landmark

Both ship on one branch and one PR (dpws: one branch per batch of gaps).

---

## Part 1 — `AppLayout` main landmark

### Intent

`AppLayout`'s content region is a plain `<div>`, because AppLayout can be nested inside docs or demo previews, and a nested `<main>` would be a second main landmark. An app that owns the outermost shell, such as the CRM or docs.eocrm.io, must currently wrap `children` in a raw `<main>`. The playground's own `AppShell` does that, and so does the docs mockup, which needs a Hard-rule-6 TODO exception for it.

### Decided

- A new prop on `AppLayout`, `mainLandmark?: boolean` (default `false`), renders the content region (`styles.main`) as `<main>` instead of `<div>`. Same class, same styles; the forwarded ref stays on the root. The default is unchanged, so nothing changes for existing consumers. (My call: the library has no `xxxAs` prop convention, and a boolean is harder for an agent to misuse than an element-name union.)
- Docs: `docs/components/AppLayout.md` says the outermost shell should pass `mainLandmark`, while nested previews keep the default. It must also align with the existing landmark note.
- Playground: the docs mockup drops its raw `<main>` and its TODO comment, and the `AppLayout` TODO entry is ticked. The playground `AppShell` switches to `mainLandmark` too, since it's the outermost shell.

### Non-goals

- Auto-detecting nesting.
- Changing the default.

---

## Part 2 — `TableOfContents`

### Intent

A long docs article (an API endpoint page, the API introduction, the MCP setup page) needs an "On this page" list in a side column. The list should show where you are and jump to sections without the heading ending up under the pinned top bar. The docs mockup currently fakes it with `Sticky` + `Stack` + muted `Link`s. That version has no active-section tracking and no landmark, and its anchor jumps land under the TopBar. The CRM can use the same component on long record or settings pages later.

### Decided by dpws

| Topic                                 | Decision                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source of entries                     | **Explicit `items`** passed by the consumer (`{ id, label, level }`). No DOM scanning. It renders on the server, so the list is in the first HTML. |
| Active-section highlight (scroll-spy) | Yes                                                                                                                                                |
| Nesting                               | Two levels: `level: 2 \| 3`, with level 3 indented under its section                                                                               |
| Click behaviour                       | Jumps so the heading lands just below the pinned top bar, not under it. It also updates the URL hash (`#section`) so the link can be shared.       |
| Smooth scrolling                      | Yes, but instant when the user prefers reduced motion                                                                                              |
| Narrow screens                        | Collapses into an "On this page" disclosure above the content, instead of a full list                                                              |
| Reading progress / back-to-top        | No                                                                                                                                                 |

### Behaviour

- **Markup:** `<nav aria-label={t('tableOfContents.label')}>` ("On this page" / "На этой странице") containing a list of links (`href="#id"`). The visible heading text matches the label.
- **Active section:** at most one link carries `aria-current="location"` and the active style.
  - The active section is the last item whose heading has scrolled past a reading line just below the pinned top bar. If no heading has passed that line yet, the first item is active.
  - Tracking runs only in the browser, after mount. The server render has no active item, so hydration is stable.
  - If an item's `id` isn't found in the document, it is skipped for tracking. The link still renders, and nothing throws.
  - Clicking a link makes it active immediately, so the highlight doesn't flicker through the sections it passes on the way.
- **Offset:** the scroll offset uses the same "clear the pinned TopBar" step that `Sticky` already uses (`--sticky-top-topbar`), so the library has one definition of "below the top bar".
  - Docs tell apps to also set `scroll-padding-top` to that value on the scroll container. Then hash links opened directly, such as a shared URL, land correctly too, since the component can't intercept those.
- **Collapsed mode:** the consumer decides when the TOC is collapsed (my call: a `collapsed` boolean prop). In the docs layout it is driven by `Split`'s `onCollapsedChange`, which measures the split's own width.
  - When collapsed, the TOC renders as a disclosure. A summary row reads "On this page", plus the current section's label once one is active; it expands to the same list.
  - Choosing an entry closes the disclosure.
  - It stays keyboard- and screen-reader-operable. A native `<details>`/`<summary>` is acceptable.
- **Highlight and scroll-spy are visual + `aria-current`.** No live announcements while scrolling, which would be noise.

### Goals

- SSR-safe. `window`, `IntersectionObserver` and `scrollTo` are used only in effects or handlers.
- Tokens only. Library hard rules in full: forwardRef + spread attrs, JSDoc, tests, i18n en + ru, no layout props.
- It composes inside `Sticky` and `Split` without owning their layout. The component does not make itself sticky; the consumer wraps it in `<Sticky top="topbar">` as today.

### Non-goals and anti-goals

- No auto-collecting headings (dpws chose A).
- No levels beyond 3, no numbering, no reading progress.
- Anti-goal: links that jump the heading under the top bar. That's the bug being fixed.
- Anti-goal: an active highlight that jitters or picks a section the reader has not reached.
- Anti-goal: two `nav` landmarks with the same name on one page, such as rendering both the list and the disclosure DOM and hiding one with CSS.

### Calls made during the builder check (Claude's, not dpws's — check these)

- **Top-bar offset source:** `--sticky-top-topbar` is already a global `:root` token. `Sticky.tokens.scss` is `@use`d from `src/styles/tokens.scss`, so the TOC reads the same custom property at runtime (e.g. `getComputedStyle(document.documentElement)`). Sticky is not touched.
- **Scroll container:** the **window** only. AppLayout's default mode scrolls the page (the root is `min-height: 100vh`, and the sidebar is `position: sticky`). No inner scroll-root support in v1, and the docs say so. The `scroll-padding-top` guidance targets `html`.
- **Landmark in both modes:** the `<nav aria-label>` is always the outer element. In collapsed mode it contains the disclosure; in expanded mode it contains a visible "On this page" heading and the list. Only one of the two structures renders, never both.
- **Summary row text:** `t('tableOfContents.label')` plus, once a section is active, ` · {label}` interpolated at the call site (en "On this page", ru "На этой странице"). Only the fixed phrase is an i18n key.

### Left to the builder

- Exact prop names beyond `items` and `collapsed`.
- The scroll-spy mechanism (`IntersectionObserver` vs scroll listener + rAF), as long as the behaviour above holds and it is tested.
- Whether it composes `Link` / `Text` from the library or owns its anchor styling.
- Visual styling of the active item (e.g. an accent inline-start bar plus accent text), using component tokens with contrast pinned in `contrast.test.ts`.

### Completion checklist (root CLAUDE.md core invariant)

- Unit tests, playground demo plus all four wiring points plus the `ComponentName` union
- `src/index.ts` export
- `docs/components/TableOfContents.md` plus an AI-PRIMER line
- A `CLUSTERS` entry in both manifest maps (cluster: Navigation), then `npm run build:manifest`
- The docs mockup's `Article` aside replaced by `TableOfContents` (driven by `Split onCollapsedChange`), and the TODO entry ticked

---

## Part 3 — `Input` suggestions (issue #705)

### Intent

Some fields need free text plus suggestions. The docs site's Try it **Workspace** field is prefilled with the member's last-used workspace slug and suggests their other slugs, while any slug can still be typed. `Select` only picks from a set, `TopBar.Search` is search-specific, and `Input` has no suggestions. The docs app currently shims it with a native `<datalist>`.

### Decided by dpws

- **A DS-styled suggestion list, not a native `<datalist>`.** It must look and behave the same in every browser, and it must not depend on browser autocomplete, which `Input` turns off by default with `autoComplete="off"`.
- The API from the issue: `<Input suggestions={string[]} />`. The value stays free-form.

### Behaviour (Claude's calls — check these)

- With a non-empty `suggestions`, the input becomes an ARIA 1.2 combobox: `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, `aria-controls`, and `aria-activedescendant` while an option is highlighted. The popup is a `role="listbox"` of `role="option"`s, named `t('input.suggestions')` (en "Suggestions", ru "Подсказки"). Without `suggestions`, `Input` is unchanged.
- **Opening:** on focus, on click and on ↓. Until the user edits the text after opening, it shows **all** suggestions, so a prefilled value doesn't hide the others (the workspace case). Once the user types, it filters by case-insensitive substring, in the given order.
- **Keyboard:** ↓/↑ move the highlight with wrap-around; nothing is highlighted at first. Enter on a highlighted option fills the value and closes. Enter with nothing highlighted does what Enter normally does (e.g. submits the form). Esc closes; Esc while closed does nothing special. Tab closes without selecting.
- **Mouse:** clicking an option fills the value and closes. Blur closes.
- **No matches, or an empty list:** the popup stays closed. There's no "no results" row; it's free text, so nothing is wrong.
- **Selection fires the consumer's `onChange`** exactly as typing would, in both controlled and uncontrolled use.
- **Positioning:** uses the library's existing `@floating-ui/react-dom` (dependency exception (a)). Matches the input's width, flips when there's no space, and caps its height with internal scroll.
- **SSR-safe:** the popup renders only when open, client-side.
- **Styling:** tokens only, matching `Select`'s option list. Reuse `Select` / `TopBar.Search` listbox pieces where they fit without contorting them; that's the builder's call.

### Non-goals

- Async or loaded suggestions, grouping, rich option content, and highlighting matched text. `Select`/`TopBar.Search` cover the rich cases.
- Replacing `Select` `creatable`.

### Completion

- Tests: combobox ARIA, open/filter rules, keyboard, mouse, `onChange` in controlled and uncontrolled use, and no popup without suggestions.
- Docs: `Input.md` gains a suggestions section, with "When NOT to use" pointing to `Select` for fixed sets.
- Playground: the Input demo gains a suggestions example. The docs mockup's Try it **Workspace** field uses it, with suggestions like `acme`, `acme-staging`, `northwind`.
- Close issue #705 after release with the published version.
