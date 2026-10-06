# AI-PRIMER.md — `@eocrm/design-system`

Primer for AI coding agents building UI on top of this package.

Read this first. Each component's contract is its `docs/components/<Name>.md`; the props table there is generated from the types. This file is a quick reference + token table + anti-patterns list. See [README.md](./README.md) for installation, bundler notes, and publishing/deploy ops.

---

## Hard rules — never deviate

1. **All UI is built from `@eocrm/design-system` components.** Don't write raw `<button>`, `<input>`, or pull in another component library.
2. **All visual values come from tokens.** No raw `#hex`, `Npx`, `Nrem`, or `Nem` in your SCSS. Use `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, `var(--border-width)`, etc.
3. **Components don't own positioning.** No `margin` on or around components in your SCSS. Use `<Stack>` (vertical), `<Cluster>` (horizontal + wrap), or set layout in the parent's `.module.scss`.
4. **Import only from the package root.** `import { Button, Stack, ... } from '@eocrm/design-system'`. Never reach into `@eocrm/design-system/src/...`.
5. **6-digit hex only.** When defining your own CSS custom properties at the app level, use `#ffffff` not `#fff`.

---

## Setup (once per consuming app)

See [docs/setup.md](docs/setup.md).

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

See [docs/theming.md](docs/theming.md#dark-theme).

---

## Components — TL;DR

Each component's contract is its `docs/components/<Name>.md`; the props table there is generated from the types. The summaries below are for orientation only.

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
- [`DashboardWidget`](docs/components/DashboardWidget.md) — DashboardCanvas cell card: standard / list / kpi / chart, with loading skeletons
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
- [`StagePath`](docs/components/StagePath.md) — chevron row of record stages (done / current / upcoming)
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
- [`Highlight`](docs/components/Highlight.md) — temporary attention ring on any block (+ optional scroll/focus)
- [`ConfirmationPopover`](docs/components/ConfirmationPopover.md) — opinionated "Are you sure?" preset
- [`Tour`](docs/components/Tour.md) — guided tour / onboarding walkthrough
- [`Modal`](docs/components/Modal.md) — focus-locked dialog
- [`Lightbox`](docs/components/Lightbox.md) — full-screen image & document gallery overlay
- [`Drawer`](docs/components/Drawer.md) — edge-anchored slide-in panel
- [`Select`](docs/components/Select.md) — value picker (single, multi, searchable, async, creatable)
- [`OptionsPicker`](docs/components/OptionsPicker.md) — filter picker (multi/single, grouped, searchable)
- [`EmojiPicker`](docs/components/EmojiPicker.md) — searchable emoji grid (reactions + input)
- [`CatalogPicker`](docs/components/CatalogPicker.md) — searchable, category-filtered card picker for choosing one catalog item (Add widget)
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
- [`MediaTile`](docs/components/MediaTile.md) — media tile with caption, revealed actions and selection
- [`WidgetPreview`](docs/components/WidgetPreview.md) — decorative data-free miniature of a widget kind (for CatalogPicker)
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

See [docs/theming.md](docs/theming.md#theming-via-component-tokens).

---

## Transient state and screen readers

See [docs/transient-state.md](docs/transient-state.md).

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

Every prop and variant type is typed. If your editor shows no types:

- Confirm `moduleResolution: "bundler"` (or `"node16"`) in your `tsconfig.json`.
- Confirm your IDE's TS server is running.
- The package's `types` field points at `./src/index.ts` — source distribution means the consumer's bundler compiles `.tsx`. Vite, Next.js, Webpack 5+ all support this; older configurations may need `transpilePackages: ['@eocrm/design-system']` (Next.js) or equivalent.

---

## Full reference

- **Per-component contracts**: `docs/components/<Name>.md`; the props table there is generated from the types.
- **Installation, bundler notes, publishing/deploy ops**: [README.md](./README.md).
