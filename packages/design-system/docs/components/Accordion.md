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
