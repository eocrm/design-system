# DS-35 bug batch: touch targets, VisuallyHidden overflow, standalone bugs + Chart `curve`

**Tracking:** eocrm epic DS-35. Children: DS-9, 10, 11, 13, 14, 15, 19, 20, 21, 22, 25, 26, 27, 28, 29, 30, 31, 32, 33, and DS-36 (`curve`).
**Ships as:** one branch (`fix/ds35-touch-overflow-bug-batch`) and one PR in `@eocrm/design-system`.
**Source detail:** each task's quoted ask, file:line code map and root-cause notes are in the task bodies (DS-35 children in eocrm). Read them before building each part.

## Why

Home Hub, the first phone- and tablet-heavy consumer, found that the library is desktop-only in practice:

- touch targets are 16–40px;
- iOS zooms into every input;
- visually hidden text breaks layout in scrolling containers;
- a few gaps in individual components.

Home Hub works around all of this in its own CSS, and the workarounds drift. The goal is for a consumer on a touch device to get correct behaviour from the library with **zero app CSS**.

## Goals

1. On coarse pointers, every interactive target in the listed components is ≥44px, automatically. Desktop (fine pointer) is pixel-identical to today.
2. iOS Safari never zooms on focusing a library text-entry control.
3. `VisuallyHidden` (and everything using the `visually-hidden` mixin) never extends a scroll area or the page width.
4. The six standalone bugs are fixed as decided below.
5. Chart gets `curve?: 'smooth' | 'linear'`.

## Non-goals

- The chart feature tasks DS-12, 16, 17, 18, 23 and 24 are a separate brainstorm.
- No new size _variants_ (no `size="touch"`). Touch sizing is automatic.
- A subtree `data-accent` is out of scope; only a subtree `data-theme` is in.
- Touch editing in DashboardCanvas's stacked (`stackBelow`) mode stays off, as today.

## Anti-goals (failure even if it "works")

- Any visual change on desktop / fine pointers.
- Dense UIs (table toolbars, chip rows, xs icon buttons) visibly ballooning on phones where an invisible hit area would do.
- `maximum-scale=1` or any zoom suppression. That is an accessibility anti-pattern.

---

## Decisions (made with dpws)

### D1. Touch sizing is built in under `@media (pointer: coarse)`

- **New primitive token** `--size-touch: 44px`, added in `packages/design-tokens/src/tokens.json`. Then regenerate and run `npm run tokens:check`.
- **Each component owns its coarse override** in its `Component.tokens.scss`, as an `@media (pointer: coarse)` block that re-points that component's existing size tokens to `--size-touch`. Components that lack a size token get one first.
- **Desktop defaults are unchanged.**
- **Consumer cascade:** consumer token overrides at `:root` that load after the library CSS still win, at the same specificity. The docs must say so.

### D2. Small controls inside compact parts get an invisible hit area, not a bigger visual

- **New mixin** `touch-hit-area` in `src/styles/mixins.scss`. Under `(pointer: coarse)` it:
  - makes the host `position: relative`;
  - adds a transparent `::before`, centred on the host, sized `max(100%, var(--size-touch))` in both axes.
- **Rule 4 exception.** `packages/design-system/CLAUDE.md` gets one documented exception for this mixin. Rule 4 bans `position` other than `relative` and bans offsets.
- **Enforcement.** A `structure.test.ts` check fails if any other component SCSS adds an absolutely positioned `::before` / `::after` with offsets for hit-area purposes. Keep the check narrow, and say in it what it guards.

### D3. iOS zoom: all text-entry sizes go to 16px on coarse pointers

- Use the existing `--font-size-lg` (16px), which covers `sm` too.
- Applies to:
  - Input
  - Textarea
  - NumberField
  - the Select / Combobox search input
  - LiquidEditor's textarea and its highlight layer, which must keep the same font metrics as the textarea or the overlay misaligns
  - any other `<input>` / `<textarea>` the builder finds rendering text below 16px. Grep for them.
- Control heights are token-driven, so they don't change.

### D4. DashboardCanvas touch drag: long-press to pick up (DS-15)

- **Pick-up.** On `pointerType === 'touch'`, a press held about 300ms without moving more than a few px arms the drag.
  - Give it a lift cue: elevation token and scale or outline, with a reduced-motion-safe variant.
  - After arming, the move follows the existing mouse path into the same commit choke point.
  - Moving before the timer fires cancels arming, so the page scrolls normally.
- **Resize** uses the same arming on the resize handle.
- **Scroll during a drag.** Once armed, page scroll must be suppressed for the rest of the gesture.
  - `touch-action` on the item can't change mid-gesture, so use a non-passive `touchmove` listener that calls `preventDefault` while armed, or an equivalent.
  - Verify on a real touch emulation path (Playwright `hasTouch`); jsdom can't prove this.
- **Mouse and keyboard** behaviour are unchanged.
- **Builder's call (record which):** extend the canvas's own pointer code, which is what I expect, or reuse `@dnd-kit/core` (already a dependency, used by Sortable). Don't move the canvas onto dnd-kit wholesale.

### D5. `data-theme` works on any element (DS-21)

- **Dark blocks.** The web token generator (`packages/design-tokens/scripts/lib/render-web.mjs`) also emits the dark blocks for descendants:
  - `[data-theme='dark']`, together with `color-scheme: dark`;
  - per accent, `:root[data-accent='X'] [data-theme='dark']`.
- **Light blocks.** It also emits light re-declarations for `[data-theme='light']` descendants, including the light accent values, so light-inside-dark works.
- **Root behaviour** stays exactly as today, both the `:root` selectors and the OS-preference block.
- **Specificity.**
  - Recompute the specificity ladder in `src/app/themeTokens.ts` and its comment.
  - A subtree theme must beat inherited root values, which it does naturally because custom properties are re-declared on the element.
  - A consumer `ThemeTokens` dark override must still beat library dark values, at the root and in subtrees.
- **Contract fixture.** Update the frozen web-contract fixture (`test/fixtures/current-web-contract.json`) via its capture script. The change is additive; say so in the PR.
- **Tests.**
  - `<span data-theme="dark">` under a light root resolves dark `--color-accent` for every accent.
  - Light nested inside dark resolves light values.
  - The contrast tests pass.

### D6. `DropdownMenu.Header` (DS-9)

- **What it is.** A new compound part `<DropdownMenu.Header>`, presentational and normal case.
  - Its own tokens: padding, plus a divider below that matches the existing separator token.
  - Not registered as an item, so roving focus and typeahead skip it. Verify against the item registry in `context.ts` / `Content.tsx`.
  - Renders `role="none"`.
- **Label is unchanged.**
- **Docs** must say that screen-reader users don't hear the header inside a menu, so the trigger's accessible name should carry the identity, for example "Account: Ada Lovelace".
- **Deliverables.** It's a part, not a new component, but it still needs:
  - tests;
  - `DropdownMenu.md` docs (plus `npm run build:docs`);
  - the demo updated with an account-menu example;
  - an `index.ts` export check, if parts are exported individually.

---

## Builder-facing calls (mine, dpws may veto)

### Touch sizing, per task (D1 / D2)

| Task                                                   | Fix                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DS-11 Button                                           | On coarse, `--button-height-md` and `-lg` become `--size-touch`. `xs` and `sm` keep their visual height and get `touch-hit-area`. That also covers Drawer close (DS-10), Calendar prev/next/Today (DS-22) and OptionsPicker Apply/Cancel (DS-26).                                            |
| DS-11 Input, Select trigger                            | `md` and `lg` heights become `--size-touch`. `sm` keeps its visual height and gets the hit area if feasible on a text field; otherwise `sm` also grows. The builder decides and records which.                                                                                               |
| DS-11 ButtonGroup items                                | Track height becomes `--size-touch` on coarse, so items are ≥44px.                                                                                                                                                                                                                           |
| DS-11 Switch, DS-27 Checkbox (+ Radio, same structure) | The label wrapper gets `min-block-size: var(--size-touch)` on coarse (a new token per component, default `auto`). These are list rows, so they really grow.                                                                                                                                  |
| DS-28 Tabs (+ Calendar view switcher, DS-22)           | A new `--tabs-tab-min-height` (default `auto`) becomes `--size-touch` on coarse.                                                                                                                                                                                                             |
| DS-30 Table.CellLink                                   | `min-block-size` on coarse, on the cell link only, not every row.                                                                                                                                                                                                                            |
| DS-22 Calendar agenda row                              | `min-block-size` on coarse.                                                                                                                                                                                                                                                                  |
| DS-26 OptionsPicker rows                               | `min-block-size` on coarse.                                                                                                                                                                                                                                                                  |
| DS-26 Pagination                                       | Page and nav button height and min-width tokens become `--size-touch` on coarse.                                                                                                                                                                                                             |
| DS-25 ColorPicker                                      | Replace the raw `minmax(24px, 1fr)` with a token `--color-picker-swatch-min-size` (default 24px via the token). On coarse it becomes `--size-touch`, and the panel must still fit at 360px.                                                                                                  |
| DS-26 FilterChip ×, DS-29 Select chip ×                | `touch-hit-area`. The visual is unchanged. Neighbouring hit areas may overlap; accepted.                                                                                                                                                                                                     |
| DS-13 Link                                             | New prop `hitArea?: 'text' \| 'touch'` (default `'text'`). `'touch'` applies `touch-hit-area` and is documented for standalone links: list rows, card or widget titles. Links in running text stay as they are. Nothing is automatic, because the library can't tell standalone from inline. |

### Other calls

- **VisuallyHidden (DS-14, DS-31): fix at the root, in the mixin.**
  - Add `inset-block-start: 0; inset-inline-start: 0` to `visually-hidden`. This pins the 1px box to its containing block's start corner, so it can never extend any scroll area or the document. That fixes both reports in one place.
  - DS-31's "intrinsic width" diagnosis is likely wrong; it's the same containing-block escape. Reproduce both first with a failing Playwright or geometry test if jsdom can't show it.
  - Audit every mixin user. If a _focusable_ user exists without a positioned ancestor, focusing it would scroll to its containing block's start corner; flag any such case.
  - Also add `position: relative` to `Card.Body scroll`. This is cheap and lets absolute children scroll with the body.
- **Accordion (DS-19).** Use CSS only. Closed content gets `visibility: hidden` with a delayed `visibility` transition, so the 0fr→1fr animation still plays. Open content becomes visible immediately. Layout is kept, so charts inside still measure. No JS, no `inert`.
- **Chart y-axis (DS-20).** Replace `text.length * CHAR_WIDTH` with a deterministic per-glyph width estimate (narrow, digit, wide and `%`-class widths at the chart font size) used by all three call sites: y gutter, x thinning and legend. "100%", "1,000%" and "−40%" must fit. Not DOM measurement: it has to stay deterministic in jsdom and SSR.
- **FileUpload (DS-33).** A typed `capture?: boolean | 'user' | 'environment'` prop forwarded to the file input, like `accept`. No general `inputProps`.
- **Chart curve (DS-36).** `curve?: 'smooth' | 'linear'`, default `'smooth'`.
  - `'linear'` draws straight segments for `line` and `area`, stacked included.
  - Gaps (`null`) still split runs.
  - Hover, tooltip and data-table output don't change.

## Constraints

- Tokens only. Shared values go in `tokens.json`, then run `npm run tokens:check`. Never edit generated Sass or Kotlin by hand.
- Rule 4 holds, apart from the single D2 mixin exception.
- Every new prop and token gets JSDoc or a doc entry.
- Update each touched component's `docs/components/<Name>.md`, then run `npm run build:docs`.
- New `theming.md` section "Touch devices" covering:
  - what changes on coarse pointers;
  - how to opt a token back out (override it in your own `@media (pointer: coarse)` block);
  - the hit-area pattern;
  - the iOS 16px rule.
- Tests follow the repo's test-placement rules.
  - Media-query and CSS behaviour use the existing SCSS-text assertion convention (see `DashboardWidget.test.tsx:263`).
  - Real geometry and touch gestures use Playwright, for DS-14/31 overflow and DS-15 long-press. The repo already has Playwright; check how it's wired before adding tests.
- Playground: each touched component's demo shows the touch behaviour where meaningful, and `DropdownMenu` gets the account-header example.

## Process decisions

- **Release:** a normal patch release (dpws's call). No `BUMP` change in `release.yml`.
- **Playwright (dpws's call):**
  - Add a `touch-geometry` Playwright project next to `focus-geometry`: Pixel 7 device, `hasTouch`, served the same way as the existing project.
  - Add a matching npm script, and a CI step in the quality workflow behind a path-selected `changes` flag that joins the `check` aggregator (see the CI note under "Test placement" in `packages/design-system/CLAUDE.md`).
  - It holds the real-browser regression tests for DS-14 and DS-31 (no extra scroll width) and DS-15 (long-press moves an item, and a quick swipe scrolls).
- **Task bodies vs this spec (my call):** the task bodies are the source of the observed problem and repro. Read each with the eocrm `tasks_get` tool for workspace `dpws`. Where a task's proposed fix differs from this spec, **this spec wins**.
- **Hit-area fallback (my call):** where `touch-hit-area` can't be applied safely to a host, the control grows visually on coarse pointers instead. Typical blockers are a host that clips with `overflow: hidden` or already uses its own `::before` / `::after`. Record each such case in the PR.
- **Tests for sizing (my call):**
  - Coarse-pointer sizing gets SCSS-text assertions per component; the media block exists and re-points the right token.
  - The `touch-hit-area` mixin gets one Playwright geometry test showing that an xs icon button's hit area is ≥44px on a touch device.
  - Real geometry is otherwise only needed for the Playwright cases above.
- **Theme overrides (my call):** `ThemeTokens` overrides from `src/app/themeTokens.ts` also emit the matching descendant selectors, so a consumer's dark override also applies inside `[data-theme='dark']` subtrees. The contract-fixture change must stay additive; no existing selector changes.
- **Commits (my call):** split by area on the one branch: tokens and touch, VisuallyHidden, DashboardCanvas, theming, standalone fixes, Chart.
- **DS-15 escape hatch:** if long-press scroll suppression can't be made reliable in the touch-geometry project, stop and bring it back to dpws. Don't silently descope it.

## Done means

- All 19 bugs and DS-36 are fixed, with a regression test each.
- Desktop rendering is unchanged.
- The gates are green: `make test`, `make build-lib`, `make lint`, `npm run format:check` and `npm run tokens:check`.
- The pre-push review loop is clean.
- Released, and each eocrm task is moved to Done with the version noted.
