# `<Accordion>` — vertically-stacked collapsible panels

Compound component for FAQ-style content, settings sections, and any case where you have a list of headings with optional drill-down detail. Two modes: `single` (one open at a time) or `multiple` (any combination).

```tsx
import { Accordion } from '@eocrm/design-system';

// Single-open with collapsible (FAQ-style)
<Accordion type="single" collapsible defaultValue="faq-2">
  <Accordion.Item value="faq-1">
    <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
    <Accordion.Content>Visit Settings → Security → Reset.</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-2">
    <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
    <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
  </Accordion.Item>
</Accordion>

// Multiple — independent sections
<Accordion type="multiple" defaultValue={['account', 'notifications']}>
  <Accordion.Item value="account">...</Accordion.Item>
  <Accordion.Item value="notifications">...</Accordion.Item>
</Accordion>

// Disabled item
<Accordion.Item value="advanced" disabled>...</Accordion.Item>

// Controlled
<Accordion type="single" value={open} onValueChange={setOpen}>...</Accordion>
```

<!-- props:start -->

## Props

### `AccordionProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `variant` | `AccordionVariant` | no | — | Visual variant. Defaults to `'bordered'`. |
| `size` | `AccordionSize` | no | — | Trigger size (font + padding). Defaults to `'md'`. |
| `gap` | `AccordionGap` | no | — | Gap between items → separated "card" look (each item gets its own border + radius; the outer container chrome is dropped). Omit for the joined default. |
| `indicatorSide` | `AccordionIndicatorSide` | no | — | Which side the chevron indicator sits on. Defaults to `'right'`. |
| `actionsWhenClosed` | `AccordionActionsWhenClosed` | no | — | Whether `Accordion.Trigger` `actions` stay visible when the item is collapsed. Defaults to `'show'`; `'hide'` fades them out (and drops them from focus order) while closed. |
| `children` | `ReactNode` | yes | — |  |
| `type` | `"single" \| "multiple"` | yes | — |  |
| `value` | `string \| string[]` | no | — | Controlled open item value. `''` = nothing open (only meaningful when `collapsible`). |
| `defaultValue` | `string \| string[]` | no | — | Initial open item for uncontrolled use. |
| `onValueChange` | `((next: string) => void) \| ((next: string[]) => void)` | no | — | Fires when the open item changes. |
| `collapsible` | `boolean` | no | — | When true, clicking the currently-open item closes it. Default: `false` (matches Radix; prevents accidentally closing the only available content). |
| …native | | | | plus native HTML attributes |

### `AccordionContentProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<div>` attributes |

### `AccordionItemProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | yes | — | Unique value used to identify the item in the root's `value`/`onValueChange`. |
| `disabled` | `boolean` | no | — | When true, the trigger is non-interactive and keyboard nav skips this item. |
| `headerLevel` | `AccordionHeaderLevel` | no | — | Heading level wrapping the trigger. WAI-ARIA APG requires triggers to live inside a heading element. Defaults to `'h3'`. |
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<div>` attributes |

### `AccordionTriggerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `icon` | `ReactNode` | no | — | Override the default trigger indicator icon (rotates 180° when open). Pass `null` to suppress the icon entirely. Default: `<ChevronDown />`. |
| `actions` | `ReactNode` | no | — | Controls rendered at the **right of the header**, OUTSIDE the toggle button — so their buttons/menus are clickable without toggling the section, and the heading's accessible name stays just the title. Keep it to a few small controls (`<Button iconOnly>`, a `<DropdownMenu>` trigger, a `<Switch>`). |
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<button>` attributes |

<!-- props:end -->

- **`type="single"`** + `collapsible={true}` — one item open at a time, click to close.
- **`type="multiple"`** — any combination.
- **`variant`** — `"bordered"` (default; outer border + radius + item dividers) or `"borderless"` (no chrome; for nesting inside Cards or as a quiet section divider).
- **`size`** — `"sm"` / `"md"` (default) / `"lg"` controls trigger font-size + padding (and content padding).
- **`gap`** — `"sm"` / `"md"` / `"lg"` separates items into **collapsible cards** (each gets its own border + radius; the joined container chrome is dropped). Omit for the default joined look.
- **`indicatorSide`** — `"right"` (default) or `"left"` to put the chevron before the title.
- **`<Accordion.Trigger actions={…}>`** — a controls slot at the **right of the header**, rendered OUTSIDE the toggle button so its buttons/menus are clickable without toggling the section (and don't pollute the heading's accessible name). Keep it to a few small controls.
- **`actionsWhenClosed`** — `"show"` (default) keeps `actions` always visible; `"hide"` fades them out (and drops them from focus order) while the item is collapsed — for dense sidebars of collapsed cards.
- **Smooth animation** via CSS `grid-template-rows: 0fr → 1fr`. No JS measurement.
- **Heading wrapping** — Trigger is wrapped in `<h3>` by default per WAI-ARIA APG. Override via `headerLevel` on Item.
- **Keyboard**: ArrowDown/Up cycles between triggers, Home/End jumps to ends, Space/Enter toggles. Disabled items are skipped.

#### When NOT to use

- ❌ Mutually-exclusive view switchers → `<Tabs>` (tabs imply parallel content; accordions imply hierarchy).
- ❌ A simple show/hide toggle for a single section → use a `<Button>` + conditional render.
- ❌ Step-by-step wizard flows → a dedicated Stepper (not shipped).

#### Anti-patterns

- ❌ Nesting `<Accordion.Trigger>` inside a heading the consumer also renders manually. Trigger ALREADY wraps itself in a heading.
- ❌ Setting `aria-expanded` manually on the Trigger via `{...props}`. The component owns the ARIA contract.
- ❌ Using `headerLevel="h1"`. There should only be one `<h1>` per page; Accordion lives below it.
