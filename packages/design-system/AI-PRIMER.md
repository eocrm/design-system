# AI-PRIMER.md — `@eocrm/design-system`

Primer for AI coding agents building UI on top of this package.

Read this first. The authoritative per-component contracts live in **JSDoc on each component** — hover any import in your editor. This file is a quick reference + token table + anti-patterns list. See [README.md](./README.md) for installation, bundler notes, and publishing/deploy ops.

---

## Hard rules — never deviate

1. **All UI is built from `@eocrm/design-system` components.** Don't write raw `<button>`, `<input>`, or pull in another component library.
2. **All visual values come from tokens.** No raw `#hex`, `Npx`, `Nrem`, or `Nem` in your SCSS. Use `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--border-width)`, etc.
3. **Components don't own positioning.** No `margin` on or around components in your SCSS. Use `<Stack>` (vertical), `<Cluster>` (horizontal + wrap), or set layout in the parent's `.module.scss`.
4. **Import only from the package root.** `import { Button, Stack, ... } from '@eocrm/design-system'`. Never reach into `@eocrm/design-system/src/...`.
5. **6-digit hex only.** When defining your own CSS custom properties at the app level, use `#ffffff` not `#fff`.

---

## Setup (once per consuming app)

Two steps at your app root:

```tsx
// 1. Import the stylesheet once (tokens, modern reset, base typography).
import '@eocrm/design-system/styles/global.scss';

// 2. Wrap your tree in <AppProvider>.
import { AppProvider } from '@eocrm/design-system';

<AppProvider locale="en" intlLocale="en-US">
  <App />
</AppProvider>;
```

`<AppProvider>` bundles the app-level contexts so you don't wire them by hand:

- `locale` (`'en' | 'ru'`) — selects the built-in UI-string bundle.
- `intlLocale?` (BCP-47, e.g. `'en-US'`) — locale for Intl formatting (Calendar, dates, numbers). Defaults to `locale`.
- `translations?` — deep-partial overrides merged over the built-in strings (rebrand a few keys; memoize the object).
- `toast?` — `<ToastViewport>` config, or `false` to mount it yourself. Omitted ⇒ mounted with defaults.
- `tokens?` — CSS design-token overrides (a flat `{ '--color-accent': '#7c3aed', '--radius-md': '6px' }` map) applied in **both** themes. Rebrands the system globally — including portaled `Modal`/`Tooltip`/`Toast`. Memoize it.
- `darkTokens?` — token overrides applied **only** in dark (forced + system), merged over `tokens` (e.g. a lighter accent on dark surfaces). Memoize it.

It composes `LocaleProvider` + `I18nProvider` and mounts the toast viewport. **Routing is yours** (`<AppProvider>` ships no router), and the stylesheet import above is still required. The individual providers (`LocaleProvider`, `I18nProvider`, `ToastViewport`) remain exported for advanced cases like pinning a subtree to a different locale.

**Rebranding via tokens:**

```tsx
const tokens = useMemo(() => ({ '--color-accent': '#7c3aed', '--radius-md': '6px' }), []);
const darkTokens = useMemo(() => ({ '--color-accent': '#a78bfa' }), []);

<AppProvider locale="en" tokens={tokens} darkTokens={darkTokens}>
  <App />
</AppProvider>;
```

`tokens` apply in light **and** dark; `darkTokens` refine the dark scope only. They're emitted as a single declarative `<style>` that layers over the [dark theme](#dark-theme) correctly. Any design token can be overridden — see the generated `@eocrm/design-tokens` Sass contract for the full CSS custom-property set. Contributors change shared values only in `packages/design-tokens/src/tokens.json`; `src/styles/tokens.scss` remains the stable consumer entry point.

---

## Localization (i18n)

Every user-facing string the library renders — visible text, aria-labels, placeholders, default empty/loading copy — flows through a single React Context. Wrap your app once; every component picks up the right copy. There are NO `labels` / `cancelLabel` / `searchPlaceholder` props on any component.

```tsx
import { I18nProvider } from '@eocrm/design-system';

<I18nProvider locale="ru">
  <App />
</I18nProvider>;
```

**Overrides** are a deep-partial of the messages tree:

```tsx
<I18nProvider
  locale="ru"
  overrides={{
    pagination: { next: 'Дальше' },
    badge: { modified: 'Изменено!' },
  }}
>
  <App />
</I18nProvider>
```

- Missing override keys fall back to the locale defaults.
- Missing locale keys do NOT fall back to `en` — `I18nProvider` uses the one locale catalogue and `useTranslation` warns and returns the literal key string. The real guard is the type: `en` and `ru` are both annotated `: Messages` (total, not partial), so a missing key is a `tsc` error and cannot ship.
- No provider at all = `en` defaults.

**Available locales:** `'en'` (default), `'ru'`. v1.

**`I18nProvider` vs `LocaleProvider` — pair them.** `I18nProvider` carries the message catalog (translated strings). `LocaleProvider` carries the BCP-47 tag used by `Intl.*` formatters inside Calendar / DatePicker / DateRangePicker (month names, weekday order, date-range formatting). They are independent — a Russian app should wrap with BOTH so visible strings AND Intl-rendered dates speak the right language:

```tsx
<I18nProvider locale="ru">
  <LocaleProvider locale="ru-RU">
    <App />
  </LocaleProvider>
</I18nProvider>
```

**Adding a new string in a library component**:

1. Add the key to `src/i18n/messages.ts` (`Messages` interface).
2. Add the English value to `src/i18n/en.ts`.
3. Add the Russian value to `src/i18n/ru.ts` (use `ruPlural()` from `i18n/format.ts` for count-varying strings).
4. In the component, `const t = useTranslation();` then `aria-label={t('component.key')}`. For array messages (months / weekdays), use `useTranslationArray()`.
5. Never inline an English string — `aria-label="Close"` is a Hard rule 9 violation.

**Drag-and-drop announcements** are localized too. Every drag surface (`Sortable`,
`SortableGroup`, `Kanban`, `DataTable` column reorder, `RichTextEditor` block
gutter) overrides dnd-kit's English defaults with the `drag.*` messages, and
names what it drags by its **rendered text** rather than its id — "Amount due,
position 3 of 7", not "col_amount was moved over droppable area col_name". Text
is read from the DOM, so a closed `DropdownMenu` / `Tooltip` / `Popover` inside
a card contributes nothing, and `aria-hidden` decoration is skipped.

Two things are worth doing yourself:

```tsx
{/* Name the CONTAINER — the library can't invent one. Either attribute works. */}
<Kanban.Column id="qualified" aria-label="Qualified">          {/* → "…in Qualified" */}
<Kanban.Column id="qualified" aria-labelledby="qualified-h">   {/* same, from the heading */}
<SortableGroup.Container id="review" items={ids} aria-label="In review" />

{/* Override a chatty ITEM. Without this the whole card is read out. */}
<Kanban.Card id="d-1" aria-label="Acme renewal">…title, owner, due date, badges…</Kanban.Card>
<Sortable.Item id="f-1" aria-label="Company name">…</Sortable.Item>
```

An unnamed container falls back to its position ("column 2 of 3").

---

## An empty label prop means _unset_, never _blank_

Label props in this library treat `''` exactly like omitting it — `aria-label` everywhere, `previousLabel`, `nextLabel`, `confirmLabel`, `dropzoneLabel`, `label` on `ColumnVisibilityTrigger`, `visibilityLabel`, `emptyState`, a `LiquidVariable`'s `label`, a `SortableGroup.Container`'s or `Kanban.Column`'s `aria-label`, a `FlowCanvas` node's `label`. You cannot use one to blank out a name or suppress default copy. That is deliberate:

```tsx
// ✅ Fine. `row.title` missing → the component's own default copy.
<CursorPagination previousLabel={row.title ?? ''} … />

// ❌ Not a way to hide the label. It renders "Previous" all the same.
<CursorPagination previousLabel="" … />
```

**Two exceptions, both because the empty string already has a meaning of its own there.** An `<img>`'s `alt` — a RichText attachment block's `alt` field — is honoured when empty, because `alt=""` is HTML's marker for a decorative image. And a text input's `placeholder` (`DatePicker`, `DateRangePicker`) is honoured when empty, because wanting no placeholder is a real request and a placeholder is not an accessible name. Nothing else.

If you are writing a component _in_ this library, the rule behind that is an operator choice, and it is not optional:

- **Use `||`, never `??`, for any fallback that produces an accessible name** — whether the name comes from an attribute (`aria-label={x || t('key')}`) or from content (`<span>{label || t('key')}</span>`). `??` falls back only on `null`/`undefined`, so `''` reaches the DOM. Per the accname spec an empty `aria-label` contributes no name, so the computation does not stop there — it continues to name-from-content and then to `title`, and where the siblings are `aria-hidden` (a chevron, a spinner) the control ends up anonymous.
- The same applies to a fallback that exists so there is _always_ something readable — `col.visibilityLabel || header || col.id`, `v.label || v.code`. An empty string defeats the safeguard and renders a blank, unidentifiable row.

Two tests in `structure.test.ts` gate parts of this: one rejects `??` in `aria-label` / `aria-valuetext`, the other rejects `x ?? t(…)` anywhere in the source. **Neither implements the rule.** They cannot see whether an element is a control, whether its siblings are hidden, or that `v.label ?? v.code` and `node.label ?? id` are the same defect with a non-`t()` fallback — every one of those had to be found by reading. A green run is not coverage; the rule above is, and it is enforced by review.

---

## Dark theme

The library ships a full dark palette, driven entirely by CSS. There is **no theme component, no React context, no JS API** — you control it with one attribute on `<html>`:

| `<html>` attribute   | Result                                                 |
| -------------------- | ------------------------------------------------------ |
| _(none)_             | **System** — follows the OS via `prefers-color-scheme` |
| `data-theme="light"` | **Forced light** (wins over a dark OS)                 |
| `data-theme="dark"`  | **Forced dark** (wins over a light OS)                 |

```html
<html data-theme="dark">
  …
</html>
```

`color-scheme` is set automatically for each state, so native form controls and the browser chrome match the theme. The reset paints `body` with `--document-background` (default `var(--color-bg-subtle)`), matching the base beneath `<Screen>` and `<AppLayout>` so a sibling route swap does not flash a contrasting document color. Override that token in `:root` after the global stylesheet import when an application needs a different canvas; do not replace the reset's `body` rule. Scrollbars go a step further: `reset.scss` applies `scrollbar-width: thin` + a token-colored `scrollbar-color` to every element, so every scroller in the app is thin and theme-colored rather than OS-default. Opt a scroller out with its own `scrollbar-width: auto` / `scrollbar-color: auto` — or drop the bar altogether with `scrollbar-width: none`, which is what a **collapsed** `<Rail>` does: a gutter is a quarter of the 56px rail's inner width. With no bar to drag, it scrolls by wheel/trackpad and scroll-into-view on Tab.

**What flips for free:** every component whose colors resolve through the design tokens — which is all of them. Surfaces, text, borders, the accent and semantic palettes, shadows, overlays, focus rings, Badge tones, and Tooltip all redefine under dark with zero markup changes.

**Your responsibility:**

- **Set the attribute.** The library reads it; it never writes it (it performs no _imperative_ DOM mutation — the one thing `<AppProvider>` injects is a declarative `<style>` for `tokens` overrides, see [Setup](#setup-once-per-consuming-app)). Persist the user's choice (e.g. `localStorage`) and apply it: `'light'`/`'dark'` → `document.documentElement.dataset.theme = choice`; `'system'` → remove the attribute.
- **Add the no-flash snippet** (below) so a forced light/dark choice doesn't flash the default theme before your bundle boots.
- **Theme-aware images.** Raw `<img>` assets with baked-in colors (e.g. a logo SVG) can't be recolored by CSS — swap the `src` per theme if it matters. The `<Logo>` wordmark _text_ flips automatically (`--color-fg`); the image mark does not.

The 30-color categorical `--color-palette-*` set flips in dark too — same hue, dark tinted bg + light fg.

**Out of scope (theme-independent by design):** avatar identity colors and BrandIcon brand marks.

### No-flash snippet

Inline this in your app's `<head>` **before** your bundle loads. It applies the persisted choice before first paint. `'system'`/unset writes nothing → the CSS media query handles it with no flash either way.

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('your-theme-key');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch (e) {
      /* localStorage blocked (private mode) — fall back to System */
    }
  })();
</script>
```

---

## Components — TL;DR

Each component is fully JSDoc'd. Hover any usage in your editor for inline docs including `@example` blocks, `@remarks` "When NOT to use" and "Anti-patterns" sections. The summaries below are for orientation only — the **JSDoc is the contract**.

- [`Title`](docs/components/Title.md) — semantic heading
- [`Text`](docs/components/Text.md) — body / inline text
- [`Code`](docs/components/Code.md) — inline `<code>` chip
- [`Kbd`](docs/components/Kbd.md) — keyboard-shortcut chips

### Typography hard rule

- ❌ `style={{ fontSize: 'var(--font-size-sm)' }}` / `style={{ color: 'var(--color-fg-muted)' }}` — use `<Text size="sm" tone="muted">`.
- ❌ Raw `<h1>` / `<h2>` / `<h3>` — use `<Title order={N}>`.
- ❌ `<Text style={{ color: '#someHex' }}>` — pick a tone from the whitelist.
- For semantic emphasis (the bold _is_ the meaning — e.g. a user's name in a notification, an error keyword), use `<strong>` or `<em>` inside `<Text>`. For visual-only weight changes (a medium-weight name in a list because hierarchy says so, not because the name is emphatic), use `<Text weight="medium">`. Pick the one that matches _why_ the text is heavy.
- If the size / tone / weight you need isn't on `<Title>` or `<Text>`, **that's a token-vocabulary conversation, not a component-skipping conversation.**

- [`RichText`](docs/components/RichText.md) — read-only rich-text renderer
- [`Button`](docs/components/Button.md) — action triggers
- [`SocialButton`](docs/components/SocialButton.md) — provider sign-in button
- [`ButtonGroup`](docs/components/ButtonGroup.md) — joined Buttons + segmented control
- [`Link`](docs/components/Link.md) — polymorphic styled anchor
- [`LinkCard`](docs/components/LinkCard.md) — clickable, full-surface Card
- [`Input`](docs/components/Input.md) — single-line text
- [`Textarea`](docs/components/Textarea.md) — multi-line text
- [`PasswordInput`](docs/components/PasswordInput.md) — password field with eye toggle + optional warnings
- [`PasswordStrengthMeter`](docs/components/PasswordStrengthMeter.md) — 4-segment strength visualization
- [`PhoneInput`](docs/components/PhoneInput.md) — E.164 phone field with country picker
- [`OtpInput`](docs/components/OtpInput.md) — one-time-code field
- [`Checkbox`](docs/components/Checkbox.md) — checkbox with native input + custom paint
- [`ColorPicker`](docs/components/ColorPicker.md) — controlled HEX color picker (popover + inline)
- [`IconPicker`](docs/components/IconPicker.md) — choose one glyph from a consumer catalog
- [`Switch`](docs/components/Switch.md) — binary toggle
- [`Radio`](docs/components/Radio.md) — single radio button
- [`RadioGroup`](docs/components/RadioGroup.md) — fieldset wrapper for related radios
- [`Field`](docs/components/Field.md) — labeled-control unit
- [`SettingRow`](docs/components/SettingRow.md) — one row of a settings screen
- [`FormSection`](docs/components/FormSection.md) — titled group of fields
- [`FormRow`](docs/components/FormRow.md) — fields side by side
- [`FileUpload`](docs/components/FileUpload.md) — controlled file picker with dropzone
- [`Slider`](docs/components/Slider.md) — controlled slider (single + range, horizontal + vertical)
- [`Sortable`](docs/components/Sortable.md) — drag-to-reorder list (single column)
- [`SortableGroup`](docs/components/SortableGroup.md) — multi-container sortable (drag between lists)
- [`Kanban`](docs/components/Kanban.md) — multi-column board (drag-to-reorder + cross-column drag with live reflow)
- [`FlowCanvas`](docs/components/FlowCanvas.md) — pan/zoom canvas for directed node-edge diagrams
- [`DashboardCanvas`](docs/components/DashboardCanvas.md) — 2D snap-grid dashboard
- [`LiquidEditor`](docs/components/LiquidEditor.md) — Liquid template editor
- [`RichTextEditor`](docs/components/RichTextEditor.md) — controlled rich-text editor (contentEditable)
- [`ImageCrop`](docs/components/ImageCrop.md) — controlled image cropper
- [`Card`](docs/components/Card.md) — bordered container
- [`DefinitionList`](docs/components/DefinitionList.md) — semantic key/value pairs (dl / dt / dd)
- [`Stack`](docs/components/Stack.md) — vertical layout
- [`Page`](docs/components/Page.md) — page-root layout primitive
- [`Cluster`](docs/components/Cluster.md) — horizontal layout that wraps
- [`Constrain`](docs/components/Constrain.md) — size / flex constraint
- [`Indent`](docs/components/Indent.md) — indent nested content by depth
- [`Screen`](docs/components/Screen.md) — full-bleed / centered screen layout
- [`AppLayout`](docs/components/AppLayout.md) — viewport-filling app shell
- [`Grid`](docs/components/Grid.md) — 2D layout primitive
- [`Split`](docs/components/Split.md) — master–detail two-pane layout
- [`Sticky`](docs/components/Sticky.md) — sticky-positioning primitive
- [`ScrollArea`](docs/components/ScrollArea.md) — height-capped vertical scroll region
- [`Masonry`](docs/components/Masonry.md) — height-balanced masonry layout
- [`Divider`](docs/components/Divider.md) — separator primitive
- [`PageHeader`](docs/components/PageHeader.md) — top-of-page heading area
- [`Avatar`](docs/components/Avatar.md) — profile circle
- [`AvatarGroup`](docs/components/AvatarGroup.md) — Slack-style stacked row of avatars
- [`PersonDisplay`](docs/components/PersonDisplay.md) — Avatar + name (+ optional description lines)
- [`Badge`](docs/components/Badge.md) — status / category pill
- [`EntityChip`](docs/components/EntityChip.md) — inline entity-link chip
- [`PillMenu`](docs/components/PillMenu.md) — coloured value menu (status, type, priority…)
- [`Dot`](docs/components/Dot.md) — bare palette/tone colored circle
- [`Timeline`](docs/components/Timeline.md) — vertical activity-feed primitive
- [`Thread`](docs/components/Thread.md) — nested-reply threading primitive
- [`BrandIcon`](docs/components/BrandIcon.md) — third-party brand marks
- [`Logo`](docs/components/Logo.md) — brand logo lockup
- [`Palette`](docs/components/Palette.md) — categorical color set
- [`FilterChip`](docs/components/FilterChip.md) — dismissible "active filter" pill
- [`Tabs`](docs/components/Tabs.md) — tab strip (horizontal or vertical)
- [`Accordion`](docs/components/Accordion.md) — vertically-stacked collapsible panels
- [`Breadcrumb`](docs/components/Breadcrumb.md) — navigation trail
- [`Rail`](docs/components/Rail.md) — collapsible left-side navigation
- [`TopBar`](docs/components/TopBar.md) — sticky application top bar
- [`DropdownMenu`](docs/components/DropdownMenu.md) — action menus from a trigger
- [`Tooltip`](docs/components/Tooltip.md) — small floating label on hover / keyboard focus
- [`Popover`](docs/components/Popover.md) — non-modal floating panel for interactive content
- [`ToastViewport`](docs/components/ToastViewport.md) — transient notifications
- [`Alert`](docs/components/Alert.md) — persistent in-flow notification
- [`Banner`](docs/components/Banner.md) — full-width system / app message bar
- [`ConfirmationPopover`](docs/components/ConfirmationPopover.md) — opinionated "Are you sure?" preset
- [`Tour`](docs/components/Tour.md) — guided tour / onboarding walkthrough
- [`Modal`](docs/components/Modal.md) — focus-locked dialog
- [`Lightbox`](docs/components/Lightbox.md) — full-screen image & document gallery overlay
- [`Drawer`](docs/components/Drawer.md) — edge-anchored slide-in panel
- [`Select`](docs/components/Select.md) — value picker (single, multi, searchable, async, creatable)
- [`OptionsPicker`](docs/components/OptionsPicker.md) — filter picker (multi/single, grouped, searchable)
- [`EmojiPicker`](docs/components/EmojiPicker.md) — searchable emoji grid (reactions + input)
- [`EmptyState`](docs/components/EmptyState.md) — "nothing here" container
- [`ErrorState`](docs/components/ErrorState.md) — page-level status / result screen
- [`IconTile`](docs/components/IconTile.md) — palette-colored icon frame
- [`Progress`](docs/components/Progress.md) — linear progress bar
- [`CircularProgress`](docs/components/CircularProgress.md) — circular progress / spinner

### Progress hard rule

- ❌ Hand-rolled `<div style={{ width: '${n}%', background: '#xxx' }}>` progress bars — use `<Progress value={n}>`.
- ❌ Hand-rolled spinning `<svg>` per page (every Saving-state, every loader). Use `<CircularProgress />` indeterminate.
- ❌ `<Progress tone="success" value={100}>` or `<Progress tone="success" />` to "celebrate" completion. Tones communicate STATE during progress (warning at 85%, danger at 95%), not success-on-done. A finished bar is just a finished bar — leave the default tone.
- ❌ `<CircularProgress value={0}>` to render an empty circle for "not started yet." `value={0}` is determinate (0% done). The intent is usually indeterminate — omit `value` entirely.

- [`Skeleton`](docs/components/Skeleton.md) — loading placeholder
- [`Image`](docs/components/Image.md) — image with loading + error states
- [`QrCode`](docs/components/QrCode.md) — scannable QR code
- [`MediaTile`](docs/components/MediaTile.md) — media tile with revealed overlay bars
- [`Table`](docs/components/Table.md) — tabular data primitive
- [`DataTable`](docs/components/DataTable.md) — server-driven data table with column features
- [`Pagination`](docs/components/Pagination.md) — numbered nav with windowing
- [`CursorPagination`](docs/components/CursorPagination.md) — prev / next for streams without total
- [`LocaleProvider`](docs/components/LocaleProvider.md) — locale Context
- [`Calendar`](docs/components/Calendar.md) — month / week / day / agenda views
- [`DatePicker`](docs/components/DatePicker.md) — single-date input + popover
- [`DateRangePicker`](docs/components/DateRangePicker.md) — date-range input + two-month popover
- [`InlineDatePicker`](docs/components/InlineDatePicker.md) — single-date calendar in flow
- [`InlineDateRangePicker`](docs/components/InlineDateRangePicker.md) — date-range calendar in flow
- [`DateStrip`](docs/components/DateStrip.md) — week of selectable day tiles
- [`SlotGrid`](docs/components/SlotGrid.md) — grouped time-slot tiles
- [`TimeField`](docs/components/TimeField.md) — standalone time-of-day input
- [`useMonth`](docs/components/useMonth.md) — `useMonth`, `useWeek`, `useDay`, `useAgenda`
- [`useBelowBreakpoint`](docs/components/useBelowBreakpoint.md) — viewport breakpoint hook
- [`VisuallyHidden`](docs/components/VisuallyHidden.md) — content for assistive tech only
- [`LiveRegion`](docs/components/LiveRegion.md) — announcement region for consumer-level outcomes

---

## Tokens (the only "values" you write)

Every visual value comes from a token (`var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, …); never raw hex, px, rem or em. The full token reference is in [`docs/tokens.md`](docs/tokens.md) — read it before writing SCSS.

## Theming via component tokens

Every component ships a `Component.tokens.scss` file alongside its `.module.scss`, defining `--<component>-<part>-<state>` CSS custom properties at `:root`. The `.module.scss` references those tokens instead of the global primitives. This lets consumers re-theme one component without affecting others.

**Pattern:**

- Token name: `--<component>-<part>[-<state>]`. Component is kebab-cased (`--data-table-*`, `--dropdown-menu-*`, `--page-header-*`). Part is the surface (`bg` / `fg` / `border-color` / `radius` / `padding-x` / `height` / `ring` / etc.). State is appended when there's a state variant (`hover` / `active` / `focus` / `disabled` / `checked` / `selected` / `invalid`).
- Defaults: every component token defaults to the same primitive the SCSS used before this layer existed. Overriding the token re-themes the component without touching the primitive.

**Override globally (every Button in the app turns red):**

```css
:root {
  --button-bg: red;
  --button-bg-hover: darkred;
}
```

**Override per-scope (only Buttons inside this region turn red):**

```css
.danger-zone {
  --button-bg: red;
  --button-bg-hover: darkred;
}
```

```tsx
<div className="danger-zone">
  <Button>Delete</Button>
</div>
```

**Override per-instance (one Button, inline):**

```tsx
<Button style={{ '--button-bg': 'red' } as React.CSSProperties}>Delete</Button>
```

The authoritative list of tokens per component lives in that component's `<Name>.tokens.scss` file. Read it to see what's available.

**Deprecated:** `--color-badge-<tone>-bg/-fg` tokens are aliased to the new `--badge-bg-<tone>` / `--badge-fg-<tone>` tokens. They still work but will be removed in a future major version.

---

## Transient state and screen readers

Components in this library handle their own transient state (`loading`, `busy`, async failure). For the components that do, you do not need to wrap them in a live region — and you should not, because two regions announcing one event talk over each other. **But not every component does**: see Known gaps below, and check the component's own JSDoc before assuming.

For your OWN outcomes — a consumer-level event with no visible text of its own (e.g. "Authenticator app added") — reach for `<LiveRegion>` rather than hand-rolling a live region; see [`LiveRegion`](docs/components/LiveRegion.md).

The rule the library follows, so you can predict any component:

- **State you meet by arriving** — an `EntityChip` placeholder you tab onto — is folded into the **accessible name**. Its name therefore _changes_ when the state resolves, so don't select those elements by exact name in tests while a placeholder can be on screen.
- **State that changes while you are elsewhere** — a `Switch` saving, a `DataTable` loading, a `PillMenu` committing, a `Select` resolving its async options, a `FileUpload` batch finishing, a `ConfirmationPopover` going pending — is announced from a **live region the component owns**. Names stay stable.
- **Purely visual state** — `Badge` tone, `Skeleton` — is yours to announce if it matters. These are documented as visual-only.
- **One deliberate exception to the noise rule.** `Textarea`'s character counter is an `aria-live="polite"` region that updates on every keystroke — the same per-keystroke announcing that #494 rejected for `Field`'s validation errors. It is kept because a counter is only useful while you are typing in the field it belongs to, where the user's attention already is, and because a remaining-characters count that arrives after you have run out is not a warning. If that trade is wrong for your form, `Textarea` takes `showCount={false}`. Noted here because the rule above would otherwise imply the library never announces per keystroke, and it does, once.
- **`Progress` / `CircularProgress`** carry `role="progressbar"`. A _determinate_ one exposes its value through `aria-valuenow`; an _indeterminate_ one has no `aria-valuenow` at all and puts its meaning in `aria-valuetext`, whose fallback is translated via `progress.indeterminate`. Don't wrap either — but do pass an `aria-label`, because that fallback is the only thing spoken if you don't.

**Form validation is yours to announce, and that is a decision, not a gap.** `Field` links its error with `aria-describedby`, which is read on focus — so an error appearing after a submit reaches nobody until focus arrives. A live region per `Field` would be worse: validate-on-change announces every keystroke, and a failed submit fires one announcement per field, over each other. The form knows how many failed and when the user asked; the field does not. Announce a summary on submit:

```tsx
<div role="status" aria-live="polite">
  {submitted && errorCount > 0 ? `${errorCount} fields need attention` : ''}
</div>
```

Known gaps: **none currently open**, with one boundary case worth stating. A fluid `Image`'s error tile is DISCOVERABLE but not announced: the failure is visible text in the accessible tree, reachable in browse mode, and the icon is named by `alt` alone. It is deliberately not folded into the name — that made a reader hear the sentence twice — and deliberately not a live region, because an image failing is not worth interrupting for. A fixed-`size` `Image` renders no text, so there the failure IS folded into the icon's name; still discoverable, still not announced. If your case needs it to interrupt, that announcement is yours. The three that stood here — `ConfirmationPopover` while pending, `FileUpload` per-file failure and its `pending` state, and `Select`'s async loading/error rows — all announce for themselves now, so do NOT wrap them. `FileUpload`'s `uploading` state still carries a `Progress` that is readable on focus rather than announced; don't wrap that either. Assume nothing about a component not named in **this list** — every component appears somewhere on this page, so the list, not the page, is the boundary. Check the component's own JSDoc. `Field`'s validation errors are covered above — documented behaviour, not an oversight.

One consequence for your tests: components that own a region expose `role="status"`, so `getByRole('status')` on a page containing a `Switch`, `PillMenu` or `DataTable` may now match more than one element. Scope the query, or select by the text you expect.

What this means for you:

```tsx
// ✅ First load of an empty table: the component announces it, and the
//    outcome ("Rows loaded" / "No rows loaded"). Nothing to add.
<DataTable instance={table} loading={isFetching} aria-label="Deals" />

// ⚠️ A refetch OVER rows that are already on screen is deliberately silent —
//    nothing changes visually, so a 30s poll shouldn't interrupt a reader.
//    This depends on rows STAYING on screen: if your fetch layer clears data
//    during a refetch (react-query v5 without `placeholderData: keepPreviousData`),
//    the skeleton returns and every poll announces — correctly, because the
//    screen really does change.

// ❌ Don't wrap the first-load case — your region and the component's
//    both fire for one event.
<div aria-live="polite">
  <DataTable instance={table} loading={isFetching} aria-label="Deals" />
</div>

// ✅ Skeleton is aria-hidden by design — this one IS yours to announce.
<div role="status" aria-live="polite">
  {isFetching ? 'Loading contacts…' : ''}
</div>
{isFetching ? <Skeleton variant="text" /> : <ContactList items={items} />}
```

`aria-busy` appears on several components for tooling and testing. **Do not rely on it to inform a user** — no mainstream screen reader speaks it on a non-live element, which is why the components above carry a live region as well.

## Anti-patterns to never generate

| Don't write                                                                           | Write instead                                                                                                                      |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `color: #ffffff` in any SCSS                                                          | `color: var(--color-bg)` (or the right semantic token)                                                                             |
| `border: 1px solid var(--color-border)`                                               | `border: var(--border-width) solid var(--color-border)`                                                                            |
| `opacity: 0.5`                                                                        | `opacity: var(--opacity-disabled)` (or use the `disabled` attribute)                                                               |
| `<button onClick={...}>Save</button>`                                                 | `<Button onClick={...}>Save</Button>`                                                                                              |
| `<input value={...} onChange={...} />`                                                | `<Input value={...} onChange={...} />`                                                                                             |
| `<Card><Card>...</Card></Card>`                                                       | Use spacing or a divider inside one card                                                                                           |
| `<Button style={{ marginLeft: 'auto' }}>`                                             | `<Cluster justify="between">` or `<Cluster justify="end">`                                                                         |
| Two `<Button variant="primary">` in the same section                                  | One primary, others `secondary`                                                                                                    |
| `<Button variant="success">Save</Button>` rendered on initial mount                   | `success` is transient — start as `primary`, flip to `success` for ~1.5s after the action resolves, flip back                      |
| `<Avatar name="" />`                                                                  | `name` is required and is the accessible label                                                                                     |
| `import { Button } from '@eocrm/design-system/src/components/Button'`                 | `import { Button } from '@eocrm/design-system'`                                                                                    |
| `<Badge onClick={...}>`                                                               | Badges are non-interactive — use a `Button`                                                                                        |
| 3-digit hex (`#fff`) anywhere                                                         | Always 6-digit (`#ffffff`)                                                                                                         |
| `margin` on or around design-system components in your SCSS                           | Wrap in `<Stack>` / `<Cluster>` or set spacing on the parent's flex/grid                                                           |
| `<DropdownMenu.Item disabled>--- Section ---</DropdownMenu.Item>` as a section header | Use `<DropdownMenu.Separator />` between groups                                                                                    |
| `<DropdownMenu.RadioItem>` outside `<DropdownMenu.RadioGroup>`                        | Always wrap radio items in a RadioGroup; otherwise the value/onValueChange contract is broken                                      |
| `<DropdownMenu.ItemIndicator>` nested deeper than direct child                        | Detection is shallow; nest it directly under CheckboxItem/RadioItem                                                                |
| Submenus 3+ levels deep                                                               | Discouraged — UX gets confusing fast; refactor to a different IA                                                                   |
| `<Tooltip><Button disabled>…</Button></Tooltip>`                                      | `disabled` buttons don't fire pointer/focus events; render with `aria-disabled="true"` + intercept the click, or wrap in `<span>`. |
| Putting essential info _only_ in a tooltip                                            | Make it visible in copy or in the trigger's `aria-label`. Touch users will never see the tooltip.                                  |
| `<Tooltip content="">…</Tooltip>` expecting a no-op listener attach                   | Empty content **is** a no-op — listeners and aria are skipped entirely. That's by design.                                          |
| `<Popover.Trigger><Button disabled>…</Button></Popover.Trigger>`                      | `disabled` buttons don't fire click; render with `aria-disabled="true"` + intercept the click, or wrap in `<span>`.                |
| `<Popover.Content>` with no `<Popover.Close>` AND non-obvious outside-click dismissal | Keyboard / screen-reader users get no clear close affordance. Add a `<Popover.Close>` close button.                                |
| `<ConfirmationPopover>` with `onConfirm` that never settles                           | v1 has no timeout — popover stays in pending state forever. Add a timeout/abort inside your `onConfirm` if relevant.               |

---

## TypeScript

Every prop, variant type, and component has JSDoc. Hover the import in your editor (`Cmd/Ctrl+hover` on the name) to see contracts inline. If you're not seeing JSDoc tooltips:

- Confirm `moduleResolution: "bundler"` (or `"node16"`) in your `tsconfig.json`.
- Confirm your IDE's TS server is running.
- The package's `types` field points at `./src/index.ts` — source distribution means the consumer's bundler compiles `.tsx`. Vite, Next.js, Webpack 5+ all support this; older configurations may need `transpilePackages: ['@eocrm/design-system']` (Next.js) or equivalent.

---

## Full reference

- **Per-component contracts**: JSDoc on each component (`Cmd/Ctrl+hover` in your editor). Includes `@example` blocks, `@remarks When NOT to use`, `@remarks Anti-patterns`.
- **Installation, bundler notes, publishing/deploy ops**: [README.md](./README.md).
