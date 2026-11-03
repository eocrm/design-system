# AI-PRIMER.md — `@eocrm/design-system`

Primer for AI coding agents building UI on top of this package.

Read this first. Each component's contract is `docs/components/<Name>.md`. Agents: install the MCP server so these docs match your installed version — see `@eocrm/design-system-mcp`.

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

Accent: blue by default; `<html data-accent="…">` switches to `tealpine`, `indigo`, `grape`, `berry`, `slate`, `ocean` or `moss` (see [README.md](./README.md#accent)).

## Localization (i18n)

Every user-facing string the library renders flows through `I18nProvider` (`'en'` default, `'ru'`); pair it with `LocaleProvider` for `Intl` dates. There are NO `labels` / `cancelLabel` / `searchPlaceholder` props on any component. Overrides, adding a string, drag-and-drop announcements: see [docs/i18n.md](docs/i18n.md).

---

## An empty label prop means _unset_, never _blank_

`''` in a label prop (`aria-label`, `previousLabel`, `confirmLabel`, …) is treated exactly like omitting it, so it cannot blank out a name; only an `<img>` `alt` and a text input's `placeholder` honour `''`. Library authors: use `||`, never `??`, for an accessible-name fallback. See [docs/accessible-names.md](docs/accessible-names.md).

---

## More docs

- Dark theme: [docs/theming.md](docs/theming.md#dark-theme)
- Theming via component tokens: [docs/theming.md](docs/theming.md#theming-via-component-tokens)
- Transient state and screen readers: [docs/transient-state.md](docs/transient-state.md)
- TypeScript (no types in your editor?): [docs/typescript.md](docs/typescript.md)

---

## Components — TL;DR

Each `<Name>` below is documented in `docs/components/<Name>.md`.

- `Title` — semantic heading (typography hard rule: `Text` doc)
- `Text` — body / inline text; typography hard rule in its doc
- `Code` — inline `<code>` chip
- `CodeBlock` — multi-line, highlighted, copyable code
- `HighlightedText` — `Text` with matched runs in `<mark>` (search excerpts)
- `Kbd` — keyboard-shortcut chips
- `RichText` — read-only rich-text renderer
- `Button` — action triggers
- `SocialButton` — provider sign-in button
- `ButtonGroup` — joined Buttons + segmented control
- `Link` — polymorphic styled anchor
- `LinkCard` — clickable, full-surface Card
- `Input` — single-line text, optional free-text `suggestions`
- `Textarea` — multi-line text
- `PasswordInput` — password field with eye toggle + optional warnings
- `PasswordStrengthMeter` — 4-segment strength visualization
- `CurrencySelect` — ISO 4217 currency picker over Select
- `MoneyInput` — currency picker + formatted decimal-string amount (`MoneyValue`)
- `PhoneInput` — E.164 phone field with country picker
- `OtpInput` — one-time-code field
- `Checkbox` — checkbox with native input + custom paint
- `ColorPicker` — controlled HEX color picker (popover + inline)
- `IconPicker` — choose one glyph (optionally + palette colour) from a consumer catalog
- `Switch` — binary toggle
- `Radio` — single radio button
- `RadioGroup` — fieldset wrapper for related radios
- `Field` — labeled-control unit
- `SettingRow` — one row of a settings screen
- `FormSection` — titled group of fields
- `FormRow` — fields side by side
- `FileUpload` — controlled file picker with dropzone
- `Slider` — controlled slider (single + range, horizontal + vertical)
- `Sortable` — drag-to-reorder list (single column)
- `SortableGroup` — multi-container sortable (drag between lists)
- `Kanban` — multi-column board (drag-to-reorder + cross-column drag with live reflow)
- `FlowCanvas` — pan/zoom canvas for directed node-edge diagrams
- `DashboardCanvas` — 2D snap-grid dashboard
- `DashboardWidget` — DashboardCanvas cell card: standard / list / kpi / chart / stats (StatGroup strip), with loading skeletons
- `StatGroup` — responsive grid of KPI tiles for a dashboard widget, with loading skeletons
- `StatTile` — one KPI tile (label, value, trend, footnote, icon, sparkline, quota `progress`) inside a StatGroup (`filled` or `card` surface)
- `Sparkline` — compact static line / area / bar trend for KPI cards (StatTile slot, kpi DashboardWidget child); no axes, summary in the accessible name
- `Chart` — line / bar / stacked bar / area time-series chart for a chart DashboardWidget (smoothed lines, static markers, legend, tooltip, keyboard, data table, empty state)
- `TreeView` — lazily loaded hierarchy (WAI-ARIA tree) as a file-explorer list or a top-down org chart, with loading / error-retry / load-more rows
- `LiquidEditor` — Liquid template editor
- `RichTextEditor` — controlled rich-text editor (contentEditable)
- `ImageCrop` — controlled image cropper
- `Card` — bordered container
- `DefinitionList` — semantic key/value pairs (dl / dt / dd)
- `List` — bulleted / numbered prose lists (ul / ol), optional badge step numbers
- `Stack` — vertical layout
- `Page` — page-root layout primitive
- `Cluster` — horizontal layout that wraps
- `Constrain` — size / flex constraint
- `Indent` — indent nested content by depth
- `Screen` — full-bleed / centered screen layout
- `AppLayout` — viewport-filling app shell
- `Grid` — 2D layout primitive
- `Split` — master–detail two-pane layout
- `Sticky` — sticky-positioning primitive
- `ScrollArea` — height-capped vertical scroll region
- `Masonry` — height-balanced masonry layout
- `Divider` — separator primitive
- `PageHeader` — top-of-page heading area
- `Avatar` — profile circle
- `AgentAvatar` — AI agent tile with the acting member badge (`decorative` beside a byline that names both)
- `AvatarGroup` — Slack-style stacked row of avatars
- `PersonDisplay` — Avatar + name (+ optional description lines; `AgentAvatar` + `OnBehalfOf` for an agent acting for a member)
- `Badge` — status / category pill
- `EntityChip` — inline entity-link chip
- `PillMenu` — coloured value menu (status, type, priority…)
- `Dot` — bare palette/tone colored circle
- `Timeline` — vertical activity-feed primitive
- `StagePath` — chevron row of record stages (done / current / upcoming)
- `Thread` — nested-reply threading primitive
- `BrandIcon` — third-party brand marks
- `Logo` — brand logo lockup
- `Palette` — categorical color set
- `FilterChip` — dismissible "active filter" pill
- `Tabs` — tab strip (horizontal or vertical)
- `Accordion` — vertically-stacked collapsible panels
- `Breadcrumb` — navigation trail
- `Rail` — collapsible left-side navigation
- `TableOfContents` — "On this page" h2/h3 navigation with scroll-spy
- `TopBar` — sticky application top bar; `TopBar.Search` with `results` is the global-search combobox
- `DropdownMenu` — action menus from a trigger
- `Tooltip` — small floating label on hover / keyboard focus
- `Popover` — non-modal floating panel for interactive content
- `ToastViewport` — transient notifications
- `Alert` — persistent in-flow notification
- `Banner` — full-width system / app message bar
- `ChatBubble` — chat message bubble by speaker (`ChatBubble.List` = `role="log"` announcing container; `pending` typing state)
- `ChatLauncher` — fixed bottom-end launcher toggling a non-modal chat panel (header/scrolling body/pinned `footer` composer; stays mounted, sticks to bottom)
- `Highlight` — temporary attention ring on any block (+ optional scroll/focus)
- `ConfirmationPopover` — opinionated "Are you sure?" preset
- `Tour` — guided tour / onboarding walkthrough
- `Modal` — focus-locked dialog
- `Lightbox` — full-screen image & document gallery overlay
- `Drawer` — edge-anchored slide-in panel
- `Select` — value picker (single, multi, searchable, async, creatable)
- `OptionsPicker` — filter picker (multi/single, grouped, searchable; async server search via `loadOptions`)
- `EmojiPicker` — searchable emoji grid (reactions + input)
- `CatalogPicker` — searchable, category-filtered card picker for choosing one catalog item (Add widget)
- `EmptyState` — "nothing here" container
- `ErrorState` — page-level status / result screen
- `IconTile` — palette-colored icon frame
- `Progress` — linear progress bar; progress hard rule in its doc
- `CircularProgress` — circular progress / spinner (progress hard rule: `Progress` doc)
- `Skeleton` — loading placeholder
- `Image` — image with loading + error states
- `QrCode` — scannable QR code
- `MediaTile` — media tile with caption, revealed actions and selection
- `WidgetPreview` — decorative data-free miniature of a widget kind (for CatalogPicker)
- `Table` — tabular data primitive; also count grids (`layout="fixed"`, toned columns, whole-cell `Table.CellLink`)
- `DataTable` — server-driven data table with column features
- `Pagination` — numbered nav with windowing
- `CursorPagination` — prev / next for streams without total
- `LocaleProvider` — locale Context
- `Calendar` — month / week / day / agenda views
- `DatePicker` — single-date input + popover
- `DateRangePicker` — date-range input + two-month popover
- `RelativeDateInput` — editor for a relative date / date-range expression string (`today+7d`, `last:30d`)
- `InlineDatePicker` — single-date calendar in flow
- `InlineDateRangePicker` — date-range calendar in flow
- `DateStrip` — week of selectable day tiles
- `SlotGrid` — grouped time-slot tiles
- `TimeField` — standalone time-of-day input
- `useMonth` — `useMonth`, `useWeek`, `useDay`, `useAgenda`
- `useBelowBreakpoint` — viewport breakpoint hook
- `VisuallyHidden` — content for assistive tech only
- `LiveRegion` — announcement region for consumer-level outcomes

---

## Tokens (the only "values" you write)

Every visual value comes from a token (`var(--color-*)`, `var(--space-*)`, `var(--radius-*)`, …); never raw hex, px, rem or em. The full token reference is in [`docs/tokens.md`](docs/tokens.md) — read it before writing SCSS.

## Anti-patterns to never generate

Each line: don't write → write instead.

- `color: #ffffff` in any SCSS → `color: var(--color-bg)` (or the right semantic token)
- `border: 1px solid var(--color-border)` → `border: var(--border-width) solid var(--color-border)`
- `opacity: 0.5` → `opacity: var(--opacity-disabled)` (or use the `disabled` attribute)
- `<button onClick={...}>Save</button>` → `<Button onClick={...}>Save</Button>`
- `<input value={...} onChange={...} />` → `<Input value={...} onChange={...} />`
- `<Card><Card>...</Card></Card>` → Use spacing or a divider inside one card
- `<Button style={{ marginLeft: 'auto' }}>` → `<Cluster justify="between">` or `<Cluster justify="end">`
- Two `<Button variant="primary">` in the same section → One primary, others `secondary`
- `<Button variant="success">Save</Button>` rendered on initial mount → `success` is transient — start as `primary`, flip to `success` for ~1.5s after the action resolves, flip back
- `<Avatar name="" />` → `name` is required and is the accessible label
- `import { Button } from '@eocrm/design-system/src/components/Button'` → `import { Button } from '@eocrm/design-system'`
- `<Badge onClick={...}>` → Badges are non-interactive — use a `Button`
- 3-digit hex (`#fff`) anywhere → Always 6-digit (`#ffffff`)
- `margin` on or around design-system components in your SCSS → Wrap in `<Stack>` / `<Cluster>` or set spacing on the parent's flex/grid
- `<DropdownMenu.Item disabled>--- Section ---</DropdownMenu.Item>` as a section header → Use `<DropdownMenu.Separator />` between groups
- `<DropdownMenu.RadioItem>` outside `<DropdownMenu.RadioGroup>` → Always wrap radio items in a RadioGroup; otherwise the value/onValueChange contract is broken
- `<DropdownMenu.ItemIndicator>` nested deeper than direct child → Detection is shallow; nest it directly under CheckboxItem/RadioItem
- Submenus 3+ levels deep → Discouraged — UX gets confusing fast; refactor to a different IA
- `<Tooltip><Button disabled>…</Button></Tooltip>` → `disabled` buttons don't fire pointer/focus events; render with `aria-disabled="true"` + intercept the click, or wrap in `<span>`.
- Putting essential info _only_ in a tooltip → Make it visible in copy or in the trigger's `aria-label`. Touch users will never see the tooltip.
- `<Tooltip content="">…</Tooltip>` expecting a no-op listener attach → Empty content **is** a no-op — listeners and aria are skipped entirely. That's by design.
- `<Popover.Trigger><Button disabled>…</Button></Popover.Trigger>` → `disabled` buttons don't fire click; render with `aria-disabled="true"` + intercept the click, or wrap in `<span>`.
- `<Popover.Content>` with no `<Popover.Close>` AND non-obvious outside-click dismissal → Keyboard / screen-reader users get no clear close affordance. Add a `<Popover.Close>` close button.
- `<ConfirmationPopover>` with `onConfirm` that never settles → v1 has no timeout — popover stays in pending state forever. Add a timeout/abort inside your `onConfirm` if relevant.

## Full reference

- **Per-component contracts**: `docs/components/<Name>.md`; the props table there is generated from the types.
- **Installation, bundler notes, publishing/deploy ops**: [README.md](./README.md).
