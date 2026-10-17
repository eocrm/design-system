# TopBar.Search — combobox mode (#652)

## Goal

eocrm needs a global tenant search in its top bar (eocrm/eocrm#1328): results
anchored under `TopBar.Search`, caret stays in the input, ↑/↓/Enter/Esc. The
playground's `CommandSearch` is the reference design but is playground-only.
This adds an **additive** combobox mode to `TopBar.Search`. The library owns
keyboard, focus, dismissal, positioning and screen-reader behaviour; the
consumer owns the query, filtering/fetching and result data. With no `results`
prop the component renders exactly as today.

Rejected: a separate `TopBar.SearchResults` compound (consumer would wire ARIA
ids by hand) and a shared `useCombobox` hook (no second consumer yet).

## API

```ts
/** One result row. */
interface TopBarSearchItem {
  id: string; // unique across ALL groups (React key + option id)
  label: ReactNode;
  meta?: ReactNode; // trailing muted text (e.g. entity type)
  icon?: ReactNode; // leading icon, decorative
  href?: string; // renders the row as <a>; enables Cmd/Ctrl/middle-click
}
/** A labelled block of results. */
interface TopBarSearchGroup {
  label: string;
  items: TopBarSearchItem[];
}
interface TopBarSearchFooterAction {
  label: ReactNode;
  onSelect: () => void;
  href?: string;
}

// added to TopBarSearchProps
results?: TopBarSearchGroup[];          // presence (even []) = combobox mode
open?: boolean;                         // controlled visibility
defaultOpen?: boolean;                  // uncontrolled initial (default false)
onOpenChange?: (open: boolean) => void;
onSelect?: (item: TopBarSearchItem, groupIndex: number) => void;
loading?: boolean;
emptyMessage?: ReactNode;               // default t('topBar.searchEmpty')
footerAction?: TopBarSearchFooterAction;
```

`onSelect` is item-first (deliberate deviation from the issue's
`(groupIndex, item)` ordering, agreed in brainstorming). `TopBarSearchProps`
omits the native `onSelect` (text-selection event) to make room.

Combobox mode is decided per render (`results !== undefined`) inside ONE
component — toggling `results` between `undefined` and an array never
remounts the input, so focus/caret survive.

## Open state

- Controlled when `open !== undefined`, else internal state (`defaultOpen`).
- Requests open (`onOpenChange(true)`): input focus, input change, ArrowDown
  while closed.
- Requests close (`onOpenChange(false)`): Escape, input blur (covers Tab,
  outside click and programmatic focus moves — the panel's mousedown is
  prevented, so clicks inside it never blur), selecting an option / footer.
- Clicking the already-focused input while closed reopens it.
- **Panel renders** only when open AND there is something to show:
  `loading`, OR any group has items, OR the input's current value is
  non-empty (→ empty row). Focusing an empty input with no results shows
  nothing; a consumer passing results for an empty query (recent searches)
  shows them. `footerAction` renders only alongside other panel content.
- Input value is read from `value` (controlled) or tracked from `onChange`
  (uncontrolled `defaultValue`).

## Panel content

- `role="listbox"` portalled to `document.body`, labelled by the input's
  accessible name. Each group: `role="group"` + `aria-labelledby` its visible
  heading (`role="presentation"` heading element). Groups with zero items are
  skipped.
- Option row: `id` (`${listboxId}-${n}` by flat index), `role="option"`,
  `aria-selected` on the active row; icon (`aria-hidden`), label (truncates),
  meta (muted). Rendered as `<a href role="option">` when `href` set, else
  `<div role="option">`.
- Footer action: last option, after a divider, in the ↑/↓ cycle.
- Loading: a loading row (`t('topBar.searchLoading')`) and
  `aria-busy="true"` on the listbox. While loading, existing results still
  render if present (no flash to empty).
- Empty: `emptyMessage` row, non-option, shown when not loading, no items,
  value non-empty.
- Live region: `<LiveRegion>` rendered unconditionally in combobox mode (the
  panel component stays mounted in combobox mode; only its portal is
  conditional). The `eocrm/aria-busy-needs-announcement` lint rule learns to
  count `<LiveRegion>`, announcing `t('topBar.searchResults', {count})`,
  loading, or the empty message (Hard rule 10).

## Keyboard / pointer

- Active index resets to 0 (first option) whenever the result set changes
  (A: Enter selects the top hit). Active index clamped if options shrink.
- ↓/↑ wrap across all options (groups flattened + footer); `preventDefault`;
  active row `scrollIntoView({block:'nearest'})`. ↓ while closed opens.
- Enter with panel shown + active option: `preventDefault`, select.
- Escape with panel shown: `preventDefault` (stops the native search clear),
  close. Implemented as a document capture listener gated on
  `overlayStack.isTopFloating(id)` + `consumeEscape`, panel registered via
  `useFloatingSurface(shown)` — so inside a Modal the first Esc closes the
  panel only. With panel closed, Esc is untouched (native clear).
- Panel `onMouseDown` → `preventDefault` (focus/caret stays in input).
- Hover sets active.
- Click on option: if `href` and (meta/ctrl/shift key or non-primary button)
  → browser default, no `onSelect`, panel stays. Otherwise `preventDefault`
  (no navigation for `<a>`), `onSelect(item, groupIndex)`, close. Input
  value is NOT cleared by the library.
- Middle-click (`auxclick`) on `href` row: browser default.
- Outside click closes via the input's blur (no document listener needed).

## ARIA on the input (combobox mode only)

`role="combobox"`, `aria-expanded={shown}`, `aria-controls={listboxId}`
(only while shown), `aria-activedescendant` (active option id while shown),
`aria-autocomplete="list"`. Library-set attributes win over consumer spread
for these (Pattern B for the ARIA contract); consumer handlers run first;
`onFocus`, `onClick` and `onKeyDown` can suppress the library's handling via
`e.preventDefault()`; change and blur always apply (typing opens, blur closes). Plain mode keeps Pattern A unchanged.

## Positioning / styling

- New internal file `TopBarSearchPanel.tsx`; `TopBarSearch.tsx` keeps the
  input and state.
- `@floating-ui/react-dom` `useFloating`: reference = the `.search` wrapper,
  `placement: 'bottom-start'`, `strategy: 'fixed'`, `transform: false`,
  `offset`, `flip`, `shift({padding: 8})`, `size` publishing
  `--topbar-search-panel-min-width` (reference width) and
  `--topbar-search-panel-available-height`; `autoUpdate`.
- `z-index: var(--z-popover)`; height capped to
  `min(token max-height, available height)` with the panel's own
  `overflow-y: auto` + `overscroll-behavior: contain` (as Select's listbox).
  **Deviation from the issue:** not `ScrollArea` — it makes itself a tab stop
  when it overflows with no focusable content, which is exactly a combobox
  panel (rows are never focusable; focus stays in the input).
- `data-in-overlay` via `useInOverlay` like Popover/Select.
- New component tokens in `TopBar.tokens.scss` (panel bg/border/radius/
  shadow/padding/max-width/max-height, option padding/radius/gap/active bg,
  group label fg/size, meta fg/size, empty fg). Tokens only, no raw values.

## i18n

New keys under `topBar` (messages type + en + ru), scoped to TopBar rather
than borrowing another component's keys: `searchEmpty` ("No results"),
`searchLoading` ("Searching…"), `searchResults` (`{count}` → "1 result" /
"N results"; ru uses the one/few/many plural forms).

## Playground

- `CommandSearch.tsx` rewritten onto combobox mode (single group or grouped by
  `section`; `href` + `onSelect` navigate); `CommandSearch.module.scss`
  deleted.
- `TopBarDemo.tsx` gains a combobox example (grouped, loading toggle, footer
  action, empty state).

## Docs

`docs/components/TopBar.md`: combobox-mode section (TL;DR snippet,
behaviour, anti-patterns: don't filter inside `onSelect`, don't wrap in
Popover, ids must be unique across groups), regenerated props table
(`npm run build:docs`), AI-PRIMER TopBar line mentions combobox mode. No
manifest change (same component).

## Tests (`TopBar.test.tsx`, jsdom)

- No `results` → plain input, no combobox role (regression).
- ARIA wiring: role/expanded/controls/activedescendant/autocomplete.
- First option active on open; active resets when results change.
- ↓/↑ wrap across groups and footer.
- Enter selects active → `onSelect(item, groupIndex)` + close; footer Enter
  → `footerAction.onSelect`.
- Click selects; `href` row click with ctrlKey/metaKey → no `onSelect`.
- `href` renders `<a role="option" href>`.
- Esc closes and is `defaultPrevented`; inside a Modal, first Esc closes the
  panel only, Modal stays open.
- Blur (outside click / Tab) closes; mousedown on panel keeps focus in input.
- Panel hidden for empty value + no results; empty row for non-empty value;
  loading row + `aria-busy`.
- Live region text for count / loading / empty.
- Controlled `open` + `onOpenChange` round-trip; uncontrolled `defaultOpen`.
- Group labelled via `aria-labelledby`.
