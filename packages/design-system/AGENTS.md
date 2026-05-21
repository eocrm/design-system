# AGENTS.md — `@eocrm/design-system`

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

```ts
// In your app root (e.g. main.tsx):
import '@eocrm/design-system/styles/global.scss';
```

That import wires up tokens, the modern reset, and base typography. Everything else flows from it.

---

## Components — TL;DR

Each component is fully JSDoc'd. Hover any usage in your editor for inline docs including `@example` blocks, `@remarks` "When NOT to use" and "Anti-patterns" sections. The summaries below are for orientation only — the **JSDoc is the contract**.

### `<Button>` — action triggers

```tsx
<Button onClick={save}>Save</Button>
<Button variant="danger" size="sm">Delete</Button>
<Button variant="secondary" disabled>Cancel</Button>
```

- `variant`: `primary` (default — one per section) / `secondary` / `ghost` / `danger` / `success`
- `size`: `xs` / `sm` / `md` (default) / `lg` — use `xs` for icon-only or dense inline actions; pass `aria-label` when icon-only.
- `iconOnly`: boolean. Renders a square icon-only button (`aspect-ratio: 1`, tight 4px padding). Width tracks the size's height token. **Always pair with `aria-label`** — there's no other accessible name.
- Always renders `<button type="button">` unless you pass `type="submit"`.
- `variant="success"` is a **transient confirmation state**, not an action intent. Flip to it for ~1.5s after the action resolves, then flip back to `primary`. The timer is the consumer's responsibility — Button stays stateless. Never render a button as `success` on initial mount. Track the timer in a `useRef` and clear on unmount + on rapid re-clicks so the flash doesn't outlive the component or get cut short.

  ```tsx
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  const handleSave = async () => {
    await save();
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaved(true);
    timerRef.current = setTimeout(() => setSaved(false), 1500);
  };
  <Button variant={saved ? 'success' : 'primary'} onClick={handleSave}>
    {saved ? 'Saved!' : 'Save'}
  </Button>;
  ```

### `<Input>` — single-line text

```tsx
<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
<Input invalid value={email} aria-describedby="email-error" />
```

- All native `<input>` attributes pass through, except `size` — that's been replaced by the component-level `size` prop (the native HTML `size` attribute, visible-character count, is shadowed).
- `invalid` toggles the error visual + sets `aria-invalid="true"`. Pair with an error message and `aria-describedby`.
- Sizes: `sm` (24px) / `md` (32px, default) / `lg` (40px). Same scale as `<Select>`. (`<Button>` exposes `xs/sm/md/lg`; fields don't ship `xs` yet.)
- Validation logic lives in your form layer (React Hook Form + Zod recommended), not in the component.

### `<Card>` — bordered container

```tsx
<Card padding="md">
  <Stack gap="md">...</Stack>
</Card>
```

- `padding`: `none` / `sm` / `md` (default) / `lg`
- **Never nest Card in Card.**
- Use `padding="none"` when the card contains a table or list that should bleed edge-to-edge.

### `<Stack>` — vertical layout

```tsx
<Stack gap="md">
  <Input ... />
  <Input ... />
  <Cluster justify="end" gap="sm">
    <Button variant="secondary">Cancel</Button>
    <Button type="submit">Save</Button>
  </Cluster>
</Stack>
```

- `gap`: `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32) — pixels
- `align`: `start` / `center` / `end` / `stretch` (default)

### `<Cluster>` — horizontal layout that wraps

```tsx
// Form footer:
<Cluster justify="end" gap="sm">
  <Button variant="secondary">Cancel</Button>
  <Button type="submit">Save</Button>
</Cluster>

// Toolbar (title left, actions right):
<Cluster justify="between" gap="md">
  <h1>Users</h1>
  <Cluster gap="sm">
    <Button variant="secondary">Filter</Button>
    <Button>Add user</Button>
  </Cluster>
</Cluster>
```

- `gap`: same scale as Stack
- `justify`: `start` (default) / `center` / `end` / `between`
- `align`: `start` / `center` (default) / `end` / `baseline`
- `wrap`: `true` (default). Set `false` only for narrow table cells where overflow is preferable to wrapping.

### `<Avatar>` — profile circle

```tsx
<Avatar name="Alex Rivera" />
<Avatar name="Alex Rivera" src="https://example.com/alex.jpg" size="lg" />
```

- `name` (required) — alt/aria-label, initials source, and color seed. Same name → same color, always.
- `src` — image URL. Empty/whitespace = no image. Falls back to initials on load failure.
- `size`: `sm` (24) / `md` (32, default) / `lg` (40)
- `status?` — presence dot in the bottom-right corner. `'online' | 'busy' | 'away' | 'offline'`. Omit to render no dot.
- `tooltip?` — wraps the avatar in `<Tooltip>` with `content={name}`. **Defaults to `true`** — every Avatar shows its name on hover / keyboard focus out of the box. Pass `tooltip={false}` to opt out (e.g., when the name is already visible adjacent to the avatar). Inside `<AvatarGroup>`, the group's `tooltip` becomes the default; explicit per-child still wins.
- Inside `<AvatarGroup>`, the group's `size` and `tooltip` become defaults — explicit per-child props still win. The avatar also picks up a `--color-bg` ring so stacked siblings read as distinct.
- Use `avatarColorIndex(name)` if you need to match an avatar's color elsewhere (e.g. a chart segment).

### `<AvatarGroup>` — Slack-style stacked row of avatars

```tsx
<AvatarGroup max={4} size="md" onOverflowClick={(_e, n) => openMembersPopover(n)}>
  {team.map((m) => (
    <Avatar key={m.id} name={m.name} src={m.avatarUrl} status={m.presence} />
  ))}
</AvatarGroup>
```

- Horizontal row of overlapping `<Avatar>`s with a `+N` overflow control when child count exceeds `max` (default `4`).
- `size` is the default for child avatars (per-child explicit `size` still wins). Three sizes: `'sm' | 'md' | 'lg'`. For a strictly uniform group, just don't set per-child sizes.
- `tooltip` defaults to `true` (same as standalone `<Avatar>`). Set `tooltip={false}` at the group level to suppress all tooltips, or per-child to opt out one.
- `onOverflowClick(event, hiddenCount)` — the library does NOT render its own popover. The app decides what happens (open a `<Popover>` listing all members, navigate to a page, open a modal). When omitted, `+N` renders as a non-interactive `<span>` (still labelled for AT).
- The group wrapper is `role="list"` and each visible avatar is wrapped in a `role="listitem"` div; the +N (button or span) is the last list item.
- forwardRef to the outer `<div>`. `className` is merged.

### `<Badge>` — status / category pill

```tsx
<Badge tone="success">Active</Badge>
<Badge tone="danger">Churned</Badge>
```

- `tone`: `neutral` (default) / `info` / `success` / `warning` / `danger` / `purple`
- `size`: `md` (20, default) / `sm` (16). `md` is the uppercase tracked "loud label" pill. `sm` drops the uppercase + tracking and renders case as-typed — use it for dense table cells, compact toolbars, or anywhere the uppercase treatment shouts next to body copy.
- `dot`: `start` / `end` — adds a small filled circle in the badge's text color before or after the content. Use for Slack/GitHub-style status indicators (`<Badge tone="success" dot="start">Online</Badge>`). Decorative only (`aria-hidden`); the text is still the accessible label.
- **Non-interactive.** If it's clickable, use `<Button>` instead.
- Doesn't auto-add `role="status"`. Wrap in `aria-live` if a state change should be announced.

### `<Tabs>` — horizontal tab strip

```tsx
const [tab, setTab] = useState('overview');

<Tabs
  items={[
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity', count: 12 },
  ]}
  activeId={tab}
  onChange={setTab}
/>;
{
  tab === 'overview' && <OverviewPanel />;
}
```

- `items: { id, label, count? }[]` — `id` must be unique.
- `activationMode`: `auto` (default — Arrow keys fire onChange) or `manual` (Arrow only focuses; Enter/Space activates). Use `manual` when panels lazy-load expensive content.
- `orientation`: `horizontal` (default) or `vertical`.
- `panelIdPrefix`: optional. When set, each tab gets `aria-controls="${prefix}-${itemId}-panel"`. Set this if you render the panels in the DOM and want assistive tech to follow the link.
- The active-tab underline slides between tabs when `activeId` changes. Respects `prefers-reduced-motion: reduce`.

### `<DropdownMenu>` — action menus from a trigger

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onSelect={edit}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={duplicate} shortcut="⌘D">
      Duplicate
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onSelect={remove} tone="danger">
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>
```

- Compound API: `<DropdownMenu>` is the provider; `<Trigger>` clones its single child to inject ARIA + handlers; `<Content>` portals to `document.body` and positions itself with Floating UI; `<Item>` renders a `menuitem`; `<Separator>` renders a divider.
- Trigger child must accept a ref via `forwardRef`. `<Button>` does.
- `<Item>` props: `onSelect` (required), `disabled`, `tone` (`'default'` | `'danger'`), `icon`, `shortcut`, `closeOnSelect` (default `true`; set to `false` when wrapping the Item in a `<Popover.Trigger>` or `<ConfirmationPopover>` — otherwise the menu close would unmount the popover before it can render).
- `<Content>` props: `side` (`'top'` | `'bottom'`, default `'bottom'`), `align` (`'start'` | `'center'` | `'end'`, default `'start'`), `sideOffset` (default `4`), `minWidth`.
- Keyboard: Enter/Space/ArrowDown on trigger opens with first item active; ArrowUp opens with last; Arrow/Home/End navigate skipping disabled and separators; Enter/Space activates; Escape closes and returns focus to trigger; Tab closes and returns focus to trigger (then continues normal traversal); typeahead jumps to first matching label (500ms debounce).
- Opens with a short scale-fade from the trigger side (140 ms `ease-out`). Closes instantly by design — menu close should feel like "get out of the way", not "play a transition". Respects `prefers-reduced-motion: reduce`.
- For value selection (pick a status, country, etc.), use `<Select>` (not yet shipped) — DropdownMenu is for actions, not form values.

#### v2 — submenus, checkboxes, radios, groups

```tsx
<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Filters</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.Label>Status</DropdownMenu.Label>
      <DropdownMenu.CheckboxItem checked={active} onCheckedChange={setActive}>
        Active
      </DropdownMenu.CheckboxItem>
      <DropdownMenu.CheckboxItem checked={pending} onCheckedChange={setPending}>
        Pending
      </DropdownMenu.CheckboxItem>
    </DropdownMenu.Group>

    <DropdownMenu.Separator />

    <DropdownMenu.Group>
      <DropdownMenu.Label>Sort by</DropdownMenu.Label>
      <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
        <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
        <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
      </DropdownMenu.RadioGroup>
    </DropdownMenu.Group>

    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Item onSelect={exportCsv}>Export CSV</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={exportJson}>Export JSON</DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  </DropdownMenu.Content>
</DropdownMenu>
```

- `<CheckboxItem>` — `role="menuitemcheckbox"`, `aria-checked`. Default `closeOnSelect={false}` (multi-select friendly). Pass `closeOnSelect` to override. Checked items render an info-tinted row + 2px left accent (no glyph by default).
- `<RadioGroup>` + `<RadioItem>` — `role="radiogroup"` / `role="menuitemradio"`. Default `closeOnSelect={true}` (radio = the selection IS the action). Selected item gets the same info-tinted-row treatment as checked CheckboxItem.
- `<Group>` + `<Label>` — wrap a section. Group is `role="group"` with `aria-labelledby` to the Label. Label outside Group still renders, no aria wiring.
- `<Sub>` + `<SubTrigger>` + `<SubContent>` — nested menu. SubTrigger registers in the parent menu; SubContent is its own portaled panel. Opens on click, hover (100ms delay), Enter, or ArrowRight. Closes on ArrowLeft (level-only), Escape (level-only), click-outside (all levels), or selecting an item with `closeOnSelect=true` (all levels — cascading close).
- `<ItemIndicator>` — optional slot child of CheckboxItem/RadioItem that adds a custom indicator glyph alongside the tinted-row treatment. Omit entirely when the row tint is sufficient (the common case). Detection is shallow: must be a direct child.
- Per WAI-ARIA, mixing CheckboxItem and RadioItem in the same RadioGroup is invalid; CheckboxItems live outside RadioGroup.

### `<Tooltip>` — small floating label on hover / keyboard focus

```tsx
<Tooltip content="Save the record (⌘S)">
  <Button onClick={save}>Save</Button>
</Tooltip>

<Tooltip content="Filter">
  <Button variant="ghost" aria-label="Filter">⏷</Button>
</Tooltip>

<Tooltip content={<>Save&nbsp;<kbd>⌘S</kbd></>}>
  <Button>Save</Button>
</Tooltip>
```

- Wrapper API: `<Tooltip content="…">` cloneElement's its single child to inject the ref, listeners (`pointerenter` / `pointerleave` / `focus` / `blur`), and `aria-describedby`. Child must accept a ref — `<Button>` qualifies, as does a raw `<button>`.
- Trigger MUST already have its own accessible name (visible text or `aria-label`). Tooltip is _supplementary description_ via `aria-describedby` — never the label.
- `content` prop: `ReactNode`. If `null` / `undefined` / `''`, the trigger renders as-is with no listeners and no aria. Useful for conditional UIs.
- `side` (`'top'` default) / `align` (`'center'` default) / `sideOffset` (default `6`) — Floating UI auto-flips on collision.
- `delay` — ms before hover opens. Default `400`. Keyboard focus is always immediate (a11y); close is always immediate.
- `open` / `onOpenChange` / `defaultOpen` — controlled mode, same shape as DropdownMenu.
- Dismissal: `pointerleave`, `blur`, document `pointerdown`, `Escape`. Tooltip never owns focus.
- Touch devices: no tap-to-open. Tooltips are progressive enhancement for pointer + keyboard users; rely on the trigger's accessible name on touch.
- Opens with a short scale-fade (140 ms) from the trigger side. Closes instantly. Respects `prefers-reduced-motion: reduce`.
- Z-layer `--z-tooltip: 1300` is above modal and toast, so tooltips inside any host UI remain visible.

### `<Popover>` — non-modal floating panel for interactive content

```tsx
<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Filters</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Popover.Heading>Filter results</Popover.Heading>
      {/* …form controls… */}
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm" onClick={apply}>
            Apply
          </Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  </Popover.Content>
</Popover>
```

- Compound API: `<Popover>` is the provider; `<Popover.Trigger>` clones its single child to inject ARIA + click; `<Popover.Content>` portals to `document.body` and positions via Floating UI; `<Popover.Heading>` (optional) wires `aria-labelledby`; `<Popover.Close>` clones its child to inject a close-onClick.
- Trigger child must accept a ref (`forwardRef`). `<Button>` does.
- **Non-modal**: focus moves to the panel on open; Tab traverses INTO content, then OUT to the page behind. Click-outside or Escape dismisses. Page is NOT inert.
- `<Popover.Content>` props: `side` (`'top'` | `'right'` | `'bottom'` | `'left'`, default `'bottom'`), `align` (default `'center'`), `sideOffset` (default `10`), `minWidth`.
- `<Popover.Heading>` props: `as` (`'h2'` – `'h6'`, default `'h3'`).
- Opens with a short scale-fade from the trigger side (140ms). Closes instantly. Respects `prefers-reduced-motion: reduce`.
- **From a DropdownMenu item.** Wrap a `<DropdownMenu.Item closeOnSelect={false}>` as the `<Popover.Trigger>` child — the Item itself becomes the trigger, so the full highlighted row opens the popover. `closeOnSelect={false}` keeps the menu open while the popover is shown.
- Z-layer `--z-popover: 1050` — above dropdown, below modal/toast/tooltip.
- For passive hover/focus hints → `<Tooltip>`. For lists of actions → `<DropdownMenu>`. For focus-locked dialogs → `<Modal>` (not yet shipped).

### `<ConfirmationPopover>` — opinionated "Are you sure?" preset

```tsx
<ConfirmationPopover
  title="Delete record?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={async () => {
    await api.deleteRecord(id);
  }}
>
  <Button variant="danger">Delete</Button>
</ConfirmationPopover>
```

- Built on top of `<Popover>`. Declarative: `title` / `description` / `confirmLabel` / `cancelLabel` / `variant` / `onConfirm` / `onCancel`.
- `variant`: `'default'` (Confirm is primary) | `'danger'` (Confirm is danger).
- **Initial focus on Cancel** for both variants — keyboard Enter never accidentally confirms. Tab once to Confirm.
- **Async-aware** `onConfirm`. May return a Promise. While pending, both buttons disable, Confirm shows a spinner, and Escape / click-outside are blocked.
- **Failure mode**: on reject, popover stays open and buttons re-enable. Consumer surfaces the error externally — ConfirmationPopover does NOT render inline errors.
- Anchors above the trigger by default (`side="top"`).
- **From a DropdownMenu item (kebab Delete pattern).** Wrap a `<DropdownMenu.Item closeOnSelect={false}>` as the trigger — clicking anywhere on the row opens the confirmation. The menu stays open until the user dismisses it (Escape or click outside). To close the menu after the action resolves, drive `DropdownMenu`'s `open` state externally and call `setMenuOpen(false)` inside `onConfirm`.

### `<Select>` — value picker (single, multi, searchable, async, creatable)

```tsx
// Form field — single:
<Select
  options={statuses}
  value={status}
  onChange={(v) => setStatus(v as Status)}
  placeholder="Pick a status"
/>

// Table filter — multi, summary:
<Select
  multiple
  triggerDisplay="summary"
  searchable
  options={owners}
  value={selectedOwners}
  onChange={(v) => setSelectedOwners(v as string[])}
  placeholder="Filter by owner"
/>

// Tag input — multi, chips, creatable:
<Select
  multiple
  searchable
  creatable
  options={existingTags}
  value={tags}
  onChange={(v) => setTags(v as string[])}
  onCreate={api.tags.create}
  placeholder="Add tags…"
/>

// Async with custom row render:
<Select
  searchable
  loadOptions={async (q, signal) => {
    const users = await api.searchUsers(q, { signal });
    return users.map((u) => ({ value: u.id, label: u.name, data: u }));
  }}
  renderOption={(opt) => (
    <Cluster gap="sm">
      <Avatar name={opt.label} src={opt.data?.avatarUrl} size="sm" />
      <span>{opt.label}</span>
    </Cluster>
  )}
  value={assigneeId}
  onChange={(id) => setAssigneeId(id as string)}
/>
```

- One generalist; the mode matrix is `multiple` × `triggerDisplay: 'chips' | 'summary'` × `searchable`. See the JSDoc on `<Select>` for the matrix and anti-patterns.
- `triggerDisplay` defaults to `'chips'` when `multiple` is set. Use `'summary'` for table-filter UIs where chips would crowd the toolbar.
- **Async**: pass `loadOptions(query, signal)`. Debounce (250ms default, configurable via `searchDebounceMs`) and `AbortSignal` cancellation are built-in. Do NOT debounce externally.
- **Tag input pattern** = `multiple + searchable + creatable + triggerDisplay='chips'`. There is no separate `<Tags>` component.
- **Form integration**: pass `name` (and `required`/`form` if needed). Hidden inputs render so `new FormData(form)` works. Multi mode renders one hidden input per selected value; `FormData.getAll(name)` returns the array.
- **`onChange` signature** is `(value, option | options | null)` — the second arg is the matched option(s), saving you a lookup.
- **Render escape hatches**: `renderOption`, `renderValue`, `renderTag`, `renderEmpty`, `renderLoading`, `renderError`. Use when defaults don't suffice; default rendering is always token-correct.
- For **action menus** (Edit/Delete/Duplicate buttons), use `<DropdownMenu>` — Select is for value selection, not actions.
- For **free-form text**, use `<Input>`. Select always picks from a (possibly async) set.
- Don't reach for `triggerDisplay='summary'` for tag input — chips communicate the active filter set at a glance.
- `creatable` requires `searchable` (throws in dev). Passing both `options` and `loadOptions` is also flagged (loadOptions wins).

### `<LocaleProvider>` + `useLocale` — locale Context

```tsx
<LocaleProvider locale="ru-RU">
  <App />
</LocaleProvider>;

const locale = useLocale(); // 'ru-RU', or navigator.language fallback
```

- `LocaleProvider` exposes a BCP-47 locale string to descendants. Any locale-aware component (Calendar primitives today; future Input formatters, currency widgets) reads via `useLocale()`.
- No `<LocaleProvider>` mounted? `useLocale()` falls back to `navigator.language` (or `'en-US'` in SSR / Node).
- Stateless. To switch locale at runtime, re-render the Provider with a new `locale` prop. Nested Providers override outer ones.

### `<Calendar>` — month / week / day / agenda views

```tsx
const [cursor, setCursor] = useState(new Date());
const [view, setView] = useState<CalendarView>('month');
<Calendar
  value={cursor}
  onChange={setCursor}
  view={view}
  onViewChange={setView}
  events={events}
  onEventClick={(e) => openDetail(e)}
/>;
```

- Four views: `'month'` (continuous event bars across the grid), `'week'` (7 columns × hour rows + all-day band), `'day'` (single column × hour rows), `'agenda'` (chronological list of the cursor's current week, grouped by day with empty days hidden).
- Events are `{ id, title, startsAt, endsAt?, tone?, allDay? }`. Multi-day events render as continuous bars in both the month grid and the week/day all-day band.
- Tones: `neutral` (default) / `accent` / `success` / `warning` / `danger`. `allDay: true` renders as a tone-filled band (no time prefix).
- Controlled cursor via `value` / `onChange`, or uncontrolled via `defaultValue`. Controlled view via `view` / `onViewChange`, or uncontrolled via `defaultView`.
- `hourRange` (default `[7, 19]`) sets the visible hour window in week/day views. Hours outside the range are not rendered. `hourRowHeight` (default 48) is the pixel height per hour row.
- Overlapping timed events in week/day views render as a Google-Calendar-style cascade: each lane is offset to the right by a small constant step but every block extends to the column's right edge, with later lanes overlaying earlier ones via `z-index`. Hovering or keyboard-focusing a block lifts it to full width on top of all neighbours. A horizontal "now" line marks the current time in today's column.
- Locale-aware via `useLocale()`; override with `locale` prop. UI strings (`today`, `viewMonth`, etc.) are the consumer's responsibility via `labels`.
- `maxLanesPerWeek` (default 3) caps event lanes per week in the month view. Events beyond the cap collapse into a `+N more` chip; click fires `onDayClick(date)`.
- Read-mostly: `onDayClick` and `onEventClick` callbacks only. `onDayClick` fires across all views — month-cell click, "+N more" chip, keyboard activation (Enter/Space) on a focused cell, and (in week/day views) clicks on the empty hour-grid space of a day column. No built-in popover or modal — wire your own detail UI.
- ARIA: month view is `role="grid" aria-readonly="true"`; arrow keys move focus, PageUp/PageDown navigates months, Enter/Space calls `onDayClick`. Week/day views are also `role="grid" aria-readonly="true"` with `role="row"` + `role="columnheader"` headers and standard sequential tab order for event blocks. Agenda view exposes the visible week as `role="list"` with each day group as a `role="listitem"` and the day label as an `<h3>` heading inside — screen readers announce the date grouping before reading each event row. **Known v3 gap:** in week/day views, `onDayClick` on empty hour-grid space is **mouse-only** (no keyboard equivalent). Consumers needing keyboard activation should drive their detail UI through the focusable event chips via `onEventClick`.

### `<DatePicker>` — single-date input + popover

```tsx
const [value, setValue] = useState<Date | null>(null);
<DatePicker value={value} onChange={setValue} min={new Date()} />;
```

- Single-date selection. Range, datetime, year-picker — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open the popover. The 📅 button toggles, the ✕ button clears.
- Typed input parses on blur / Enter using the active locale: en-US `M/D/YYYY`, ru-RU `D.M.YYYY`, ja-JP `Y/M/D`. ISO `YYYY-MM-DD` is always accepted as a paste fallback. Unparseable / out-of-range / disabled input reverts to the last committed value.
- `min` / `max` (inclusive, day-granular) gate both the grid and typed input. `isDateDisabled(date) => boolean` is per-cell + per-parsed-input.
- `clearable` (default `true`) shows the ✕ button when a value is set. `name` renders a hidden mirror `<input type="hidden">` with the ISO date so native `<form>` submission works.
- `invalid` toggles the red border + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`.
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<Input>`; affects the trigger row only — the popover month grid stays fixed.
- Locale-aware via `useLocale()`; override with `locale` prop. `labels` overrides the five hard-coded strings: `previousMonth`, `nextMonth`, `openCalendar`, `clear`, `dialogLabel`.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover wrapper is `role="dialog"` (labelled by `labels.dialogLabel`); the grid inside is `role="grid"` with `role="gridcell"` buttons that carry `aria-selected` / `aria-disabled` as appropriate.
- Keyboard inside the grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space selects, Escape closes and returns focus to the input. Tab leaves the grid.

### `<DateRangePicker>` — date-range input + two-month popover

```tsx
const [range, setRange] = useState<DateRange | null>(null);
<DateRangePicker value={range} onChange={setRange} min={new Date()} />;
```

- Date-range selection only. Single-date → `<DatePicker>`. Datetime / multi-date / preset ranges (Today, Last 7 days) — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open; the popover shows two months side-by-side. The 📅 button toggles, the ✕ button clears the whole range.
- Selection flow: first click sets the start; hover (or keyboard-focus) another cell to preview the range; second click commits and closes. If the second pick is earlier than the start, the range is auto-swapped to `[earlier, later]`. A third click in a reopened popover restarts selection.
- Typed input parses on blur / Enter using the active locale. Accepts `—` (em dash), `–` (en dash), `-` (hyphen with spaces), or `to` (case-insensitive word) as the separator. ISO `YYYY-MM-DD` works for each half too. Out-of-order typed input is auto-swapped. Anything unparseable / out-of-range / disabled reverts to the last committed value.
- `min` / `max` (inclusive) + `isDateDisabled(date) => boolean` gate both the popover grid AND typed-input parsing.
- `clearable` (default `true`) shows the ✕ when a range is set. `nameStart` / `nameEnd` render two hidden mirror `<input>`s with ISO dates so native `<form>` submission works (post both keys, or just one — caller's choice).
- `invalid` toggles the red border + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`.
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<DatePicker>`; affects the trigger row only — the two-month popover grid stays fixed.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover wrapper is `role="dialog"` (labelled by `labels.dialogLabel`); each grid inside is `role="grid"` with `gridcell` buttons. The range-start and range-end cells (and the live hover end during selection) carry `aria-selected="true"`.
- Keyboard inside a grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space drives the same first-click → second-click flow, Escape closes and returns focus to the input. With selection-start set, the focused cell acts as the hover end so the preview range follows arrow keys.
- Reuses `<DatePickerGrid>` via `selectionMode='range'` + `rangeStart`/`rangeEnd`/`hoverDate`/`onHoverDate` + `chevrons={false}`. The two grids share the same cursor; the picker renders its own prev/next chevrons outside them.

### `<InlineDatePicker>` — single-date calendar in flow

```tsx
const [date, setDate] = useState<Date | null>(null);
<InlineDatePicker value={date} onChange={setDate} min={new Date()} />;
```

- Same month-grid surface as `<DatePicker>` but always rendered in flow — no input, no popover, no portal. Use when the calendar should be visible at all times (sidebar pickers, schedule editors, quick-filter panels).
- Cursor anchors to `value ?? new Date()` on mount and stays sticky after user navigation. Programmatic `value` changes do NOT re-anchor — consumers own scroll-into-view via `ref` if they want it.
- `min` / `max` / `isDateDisabled` gate cell clicks just like the popover variant.
- `name` renders a hidden `<input type="hidden">` mirror with the ISO date so native `<form>` submission works.
- `disabled` mutes the entire grid (chevrons disabled, cells get `tabIndex=-1`, clicks no-op).
- `forwardRef` points at the outer wrapper `<div>` (no input to forward to).
- ARIA: same `role="grid"` + `role="gridcell"` cells from `DatePickerGrid`. No dialog role — the picker is in flow.

### `<InlineDateRangePicker>` — date-range calendar in flow

```tsx
const [range, setRange] = useState<DateRange | null>(null);
<InlineDateRangePicker value={range} onChange={setRange} />;
```

- Two-month calendar grid (side-by-side) embedded directly in the page. Same click-1/click-2/restart selection machine, hover preview, auto-swap on out-of-order picks, and keyboard cross-grid navigation as `<DateRangePicker>` — without the input + popover.
- External prev/next chevrons in the header shift both grids by ±1 month at once.
- Sticky cursor (anchors to `value?.start ?? new Date()` on mount; stays where the user navigated).
- `min` / `max` / `isDateDisabled` gate both boundaries.
- `nameStart` / `nameEnd` render independent hidden form mirrors (post both, only one, or neither — caller's choice).
- `disabled` mutes everything; ref forwards to the outer wrapper.
- Use when the consumer wants the calendar permanently visible. For a compact form field with the same selection model, use `<DateRangePicker>`. Don't render inside containers narrower than ~32rem — the two grids need side-by-side room.

### Calendar primitives — `useMonth`, `useWeek`, `useDay`, `useAgenda`

```tsx
const grid = useMonth(cursorDate);
// → { year, month, monthLabel, weekdayLabels, weeks }

const week = useWeek(cursorDate);
// → { weekLabel, days, weekdayLabels }

const { day, dayLabel, dayShortLabel } = useDay(date);

const { days, rangeLabel } = useAgenda(rangeStart, rangeEnd);
```

- Headless. These hooks return data shapes — no rendering. The Calendar UI components (Month/Week/Day/Agenda views) consume them.
- Each hook accepts an optional `options.locale` to override the Context value. `useMonth`, `useWeek`, and `useAgenda` accept `options.weekStartsOn` to override the locale-derived first day (used by `useAgenda` to compute the locale-aware column index for each `Day.weekday`).
- `Day.key` is `'YYYY-MM-DD'` in local time — safe React key, comparison handle, and event-lookup index.
- Pure date math + `Intl` formatters live alongside as utility exports: `addDays`, `startOfWeek`, `formatMonth`, `getFirstDayOfWeek`, etc. Use them if you need to derive labels or do date math outside a component.

---

## Tokens (the only "values" you write)

All available as CSS custom properties after you import `global.scss`:

| Family          | Tokens                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neutral colors  | `--color-bg`, `--color-bg-subtle`, `--color-bg-muted`, `--color-bg-sunken`, `--color-border`, `--color-border-strong`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-fg-disabled` |
| Accent colors   | `--color-accent`, `--color-accent-hover`, `--color-accent-pressed`, `--color-accent-fg`, `--color-accent-subtle-bg`                                                                                 |
| Semantic colors | `--color-danger`, `--color-danger-hover`, `--color-danger-fg`, `--color-bg-danger-subtle`, `--color-success`, `--color-success-hover`, `--color-success-fg`, `--color-warning`, `--color-info`      |
| Badge palette   | `--color-badge-{neutral,info,success,warning,danger,purple}-{bg,fg}`                                                                                                                                |
| Avatar palette  | `--color-avatar-fg`, `--color-avatar-1` through `--color-avatar-6`                                                                                                                                  |
| Spacing         | `--space-0` `--space-1` (4) `--space-2` (8) `--space-3` (12) `--space-4` (16) `--space-5` (20) `--space-6` (24) `--space-8` (32) `--space-10` (40) `--space-12` (48) `--space-16` (64)              |
| Radii           | `--radius-sm` (3) / `--radius-md` (4) / `--radius-lg` (8) / `--radius-full`                                                                                                                         |
| Font sizes      | `--font-size-xs/sm/md/lg/xl/2xl/3xl`, `--font-size-code` (0.92em for inline mono)                                                                                                                   |
| Font weights    | `--font-weight-regular/medium/semibold/bold`                                                                                                                                                        |
| Line heights    | `--line-height-tight` / `--line-height-normal` / `--line-height-none` (1)                                                                                                                           |
| Control sizes   | `--size-sm/md/lg` (heights), `--size-badge` (20), `--size-badge-sm` (16), `--size-chip` (18), `--size-dropdown-min-width` (160), `--size-popover-min-width` (220), `--size-dropdown-indicator` (16) |
| Borders         | `--border-width` (1) / `--border-width-emphasis` (2) / `--border-width-strong` (3)                                                                                                                  |
| Letter spacing  | `--letter-spacing-caps` (0.03em)                                                                                                                                                                    |
| Shadows         | `--shadow-sm` / `--shadow-md` / `--shadow-lg`                                                                                                                                                       |
| Focus rings     | `--ring-accent` / `--ring-danger` / `--ring-success` / `--ring-width`                                                                                                                               |
| Motion          | `--transition-fast` (100ms) / `--transition-base` (140ms)                                                                                                                                           |
| Layer (z-index) | `--z-dropdown` / `--z-popover` / `--z-modal` / `--z-toast` / `--z-tooltip`                                                                                                                          |

---

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
