# Accordion — design spec

**Date:** 2026-05-23
**Branch:** `feat/accordion`
**Scope:** New `<Accordion>` compound component for `@eocrm/design-system` — a vertically-stacked collapsible-panels primitive. Two selection modes (`type="single"` with optional collapsible, `type="multiple"`), controlled + uncontrolled state, per-item disabled, custom trigger icon, configurable heading level for trigger wrapping, smooth CSS grid-template-rows animation, full WAI-ARIA APG keyboard support.

## Goal

Provide the standard "stacked collapsible sections" primitive for FAQ-style content, settings sections that show only one detail at a time, and dashboards with optional drill-down detail. Same compound-component pattern as `Tabs` / `DropdownMenu`: `<Accordion>` root + `<Accordion.Item>` + `<Accordion.Trigger>` + `<Accordion.Content>`.

## Why now

- Contact-detail pages have "Activity / Deals / Notes" tabs but the natural pattern for long-running sections (Custom fields, Notes history, Permissions) is an accordion, not tabs. No primitive ships today.
- Settings pages with optional collapsible sub-panels are open-coded with `useState` + manual `<button>` + manual `<div>` per page.
- Standard WAI-ARIA APG accordion pattern is non-trivial to get right (heading-wrapped triggers, `aria-controls`, `aria-expanded`, Arrow Down/Up nav, Home/End). Building it once in the design system saves every consumer.

## Non-goals (v1)

- **No nested accordions.** An Accordion.Content can contain another Accordion if the consumer wants, but no special API. Nested Accordions just work.
- **No animation customization** (no `duration`/`easing` props). One animation curve (200ms ease-out) covers the standard use case. Override via CSS if needed.
- **No "filled" / "outline" visual variants.** One look: bordered list with chevron indicator. Solid/outline cosmetic variants can be added v2.
- **No header-actions slot** (e.g., a button in the header row next to the trigger label). The trigger IS the whole row; consumers needing actions in the header can compose differently.
- **No "always open" item lock.** If a consumer wants an item to be uncloseable, they manage state externally.
- **No drag-to-reorder.** Accordion is for display, not editing.
- **No URL state sync.** Consumers wire that up themselves via the controlled `value`/`onValueChange` props.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- `lucide-react` peer dep — `ChevronDown` for the default trigger indicator
- Existing tokens: `--color-fg`, `--color-fg-muted`, `--color-bg`, `--color-bg-muted`, `--color-border`, `--border-width`, `--radius-md`, `--space-1`/`--space-2`/`--space-3`/`--space-4`, `--font-size-md`, `--font-weight-medium`, `--transition-fast`, `--transition-base`, `--ring-accent`, `--ring-width`, `--opacity-disabled`

No new tokens. Animation duration baked into the component (200ms ease-out for the grid-row transition).

### File layout

```
packages/design-system/src/components/Accordion/
  Accordion.tsx           ← Root component + Object.assign for compound API. Owns the value state + dispatches.
  AccordionItem.tsx       ← Wrapper with item-level context (value, disabled, isOpen).
  AccordionTrigger.tsx    ← Heading-wrapped button (h2/h3/h4 based on item's headerLevel). Icon + chevron.
  AccordionContent.tsx    ← Animated panel using grid-template-rows: 0fr → 1fr.
  context.ts              ← AccordionContext (mode/value/onChange/registerItem) + AccordionItemContext (value/disabled/isOpen).
  Accordion.module.scss   ← Borders / triggers / content / animation / disabled / focus-visible.
  Accordion.test.tsx      ← ~24 cases.
  index.ts                ← Public re-exports.
```

Plus integration points:

- `packages/design-system/src/index.ts` — re-export `Accordion`, `AccordionProps`, `AccordionItemProps`, `AccordionTriggerProps`, `AccordionContentProps`
- `packages/design-system/AGENTS.md` — TL;DR slot near `<Tabs>` (navigation cluster)
- `packages/playground/src/pages/components/AccordionDemo.tsx` — 6 examples
- `packages/playground/src/App.tsx` — route at `/components/accordion`
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entry in the **Navigation** group, alphabetical first (before `Breadcrumb`)
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card
- `packages/playground/src/pages/mockups/registry.ts` — `'Accordion'` in `ComponentName` union (alphabetical first)

### Composition

```
        <Accordion type="single" defaultValue="faq-2">
          <Accordion.Item value="faq-1">
            <Accordion.Trigger>How do I reset my password?</Accordion.Trigger>
            <Accordion.Content>Visit the settings page → Security → Reset password.</Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="faq-2">
            <Accordion.Trigger>How do I export my data?</Accordion.Trigger>
            <Accordion.Content>Use the gear icon → Export → CSV.</Accordion.Content>
          </Accordion.Item>
        </Accordion>
                          │
                          ▼
                <div role="region" class="accordion" data-mode="single">
                  <div class="item">
                    <h3 class="header">
                      <button class="trigger" aria-expanded="false" aria-controls="content-faq-1" id="trigger-faq-1">
                        How do I reset my password?
                        <ChevronDown class="indicator" />
                      </button>
                    </h3>
                    <div id="content-faq-1" role="region" aria-labelledby="trigger-faq-1" class="content" data-state="closed">
                      <div class="inner">Visit the settings page → ...</div>
                    </div>
                  </div>
                  ... (item 2 with aria-expanded="true" / data-state="open")
                </div>
```

The root `<div>` doesn't have a role by default — accordion's container is just a list of headings + panels. Heading + button pairs carry the semantic.

### Compound assembly

```ts
export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});
```

## Public API

```ts
import type { ChangeEvent, HTMLAttributes, ReactNode } from 'react';

/** Selection mode. */
export type AccordionMode = 'single' | 'multiple';

/** Heading level wrapping the trigger button. WAI-ARIA APG requires triggers
 *  to live inside a heading. Defaults to 'h3'. */
export type AccordionHeaderLevel = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

/** Root props — `type='single'` variant. */
interface AccordionSingleProps {
  type: 'single';
  /**
   * Controlled open item value. Pair with `onValueChange`. Use empty string
   * (`''`) to indicate nothing open (collapsible mode only).
   */
  value?: string;
  /** Initial open item for uncontrolled use. `''` = nothing open. */
  defaultValue?: string;
  /** Fires when the open item changes. */
  onValueChange?: (next: string) => void;
  /**
   * When true, clicking the currently-open item closes it (no item open).
   * When false, the user must open a different item to close the current one.
   * Default: `false` (Radix's default — prevents accidentally closing the
   * only available content).
   */
  collapsible?: boolean;
}

/** Root props — `type='multiple'` variant. */
interface AccordionMultipleProps {
  type: 'multiple';
  /** Controlled open items array. Pair with `onValueChange`. */
  value?: string[];
  /** Initial open items for uncontrolled use. */
  defaultValue?: string[];
  /** Fires when the set of open items changes. */
  onValueChange?: (next: string[]) => void;
  collapsible?: never; // not applicable in multi-mode
}

interface AccordionBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'defaultValue' | 'onChange'
> {
  children: ReactNode;
}

/** Discriminated union — `type` drives which variant of value/onValueChange is required. */
export type AccordionProps = AccordionBaseProps & (AccordionSingleProps | AccordionMultipleProps);

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'value'> {
  /** Unique value used to identify the item in `value`/`defaultValue`/`onValueChange`. */
  value: string;
  /** When true, the trigger is non-interactive and keyboard nav skips this item. */
  disabled?: boolean;
  /**
   * Heading level wrapping the trigger. WAI-ARIA APG requires triggers to
   * live inside a heading element. Defaults to `'h3'`.
   *
   * Pick the level that fits the surrounding page heading hierarchy — e.g.,
   * if the section above the accordion is an `<h2>`, set `headerLevel="h3"`
   * (the default). If the accordion is at the top of a page, use `h2`.
   */
  headerLevel?: AccordionHeaderLevel;
  children: ReactNode;
}

export interface AccordionTriggerProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * Override the default trigger indicator icon (rotates 180° when open).
   * Pass `null` to suppress the icon entirely. Default: `<ChevronDown />`.
   */
  icon?: ReactNode | null;
  children: ReactNode;
}

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
```

**Spread order — Pattern B** (component owns ARIA contract):

```tsx
<button
  {...props}
  type="button"
  aria-expanded={isOpen}
  aria-controls={contentId}
  id={triggerId}
  disabled={disabled}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
  className={clsx(styles.trigger, className)}
>
```

Component-owned attrs that consumer CAN'T override: `type`, `aria-expanded`, `aria-controls`, `id`, `disabled` (derived from item-level disabled), `onClick`, `onKeyDown`.

## Architecture flow

### Root state machine

The root component owns the value state. For `type='single'`, value is `string` (current open item or `''` for none). For `type='multiple'`, value is `string[]` (open items).

```tsx
function AccordionRoot(props: AccordionProps) {
  if (props.type === 'single') {
    return <AccordionSingleImpl {...props} />;
  }
  return <AccordionMultipleImpl {...props} />;
}
```

Each impl wraps in `AccordionContext.Provider` with:

- `mode: 'single' | 'multiple'`
- `isOpen(value: string): boolean`
- `toggle(value: string): void`
- `triggerIds: Map<string, string>` for the registered item triggers (for keyboard nav target lookup)
- `registerItem(value: string): () => void` — items register on mount so the keyboard handler can iterate

### Item registration + keyboard nav

Each `<Accordion.Item>` registers its value with the root on mount via `useEffect`. The root maintains the registration order (insertion order via Array). Keyboard nav (ArrowDown/Up, Home/End) iterates this array.

Actually — registration via context is overkill if we use DOM order. Simpler approach: keyboard handler queries `document.activeElement.closest('[data-accordion]')` and then `querySelectorAll('button.trigger:not(:disabled)')` to find siblings in DOM order. Matches the recent ButtonGroup precedent. **Going with DOM-order querying** (no registration).

### Item-level open detection

Each `<Accordion.Item>` reads from `AccordionContext.isOpen(value)`. The Item provides an `AccordionItemContext`:

- `value: string`
- `disabled: boolean`
- `isOpen: boolean`
- `triggerId: string` (e.g., `accordion-trigger-{value}`)
- `contentId: string` (e.g., `accordion-content-{value}`)

`useId()` generates a base id per Item; trigger/content ids are derived.

### Trigger

The Trigger consumes both contexts. Renders:

```tsx
const Heading = headerLevel; // 'h2' | 'h3' | ...

return (
  <Heading className={styles.header}>
    <button
      type="button"
      ref={ref}
      {...props}
      id={triggerId}
      aria-expanded={isOpen}
      aria-controls={contentId}
      disabled={disabled}
      onClick={() => toggle(value)}
      onKeyDown={handleKeyDown}
      className={clsx(styles.trigger, className)}
    >
      <span className={styles.label}>{children}</span>
      {renderedIcon}
    </button>
  </Heading>
);
```

`renderedIcon = icon === null ? null : (icon ?? <ChevronDown size={16} className={styles.indicator} aria-hidden />)`. The `.indicator` class rotates 180° when the item is open (driven by `data-state` on the Item wrapper).

### Content (animated panel)

Uses the modern CSS grid-template-rows technique:

```scss
.content {
  display: grid;
  grid-template-rows: 0fr; // closed
  transition: grid-template-rows 200ms ease-out;
}

.content[data-state='open'] {
  grid-template-rows: 1fr;
}

.inner {
  overflow: hidden;
}
```

Wrapping the content in an `.inner` div with `overflow: hidden` ensures the closed state hides the content (height 0 from `0fr`). The animation transitions smoothly between 0fr and 1fr — works for arbitrary content height without JS measurement.

```tsx
<div
  ref={ref}
  {...props}
  id={contentId}
  role="region"
  aria-labelledby={triggerId}
  data-state={isOpen ? 'open' : 'closed'}
  hidden={!isOpen && /* let CSS animation finish first */ false}
  className={clsx(styles.content, className)}
>
  <div className={styles.inner}>{children}</div>
</div>
```

Note on `hidden`: ideally, when fully closed (post-animation), the panel should have `hidden` set so screen readers skip it AND it's removed from the tab order. But applying `hidden` immediately on close would skip the animation. Two options:

1. Use a transitionend listener to set hidden after animation
2. Skip the hidden attribute — rely on `aria-expanded="false"` on the trigger to convey "this panel is closed"

Going with option 2 (skip `hidden`). The grid-template-rows: 0fr already makes the content unfocusable (zero height + overflow: hidden in the inner wrapper). `aria-expanded="false"` on the trigger handles the AT side. Cleaner, no transitionend plumbing.

### Keyboard handling

Per WAI-ARIA APG:

- **Space / Enter** on trigger → toggle (handled by native button)
- **ArrowDown** → focus next non-disabled trigger (DOM order, wraps to first)
- **ArrowUp** → focus previous non-disabled trigger (wraps to last)
- **Home** → focus first non-disabled trigger
- **End** → focus last non-disabled trigger
- **Tab** → moves out of the accordion (out of group); browsers handle natively

```tsx
const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
  const isNav = ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key);
  if (!isNav) return;
  e.preventDefault();

  const root = (e.currentTarget as HTMLElement).closest('[data-accordion]');
  if (!root) return;

  const triggers = Array.from(
    root.querySelectorAll<HTMLButtonElement>('button[aria-expanded]:not(:disabled)'),
  );
  if (triggers.length === 0) return;

  const current = triggers.indexOf(e.currentTarget as HTMLButtonElement);
  let next = current;

  if (e.key === 'ArrowDown') next = (current + 1) % triggers.length;
  else if (e.key === 'ArrowUp') next = (current - 1 + triggers.length) % triggers.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = triggers.length - 1;

  triggers[next]?.focus();
};
```

The `data-accordion` attribute on the root limits the keyboard handler to siblings within the same accordion (in case multiple accordions live on a page).

### Single + collapsible interaction

For `type='single'`:

```tsx
function toggle(itemValue: string) {
  if (mode === 'single') {
    if (value === itemValue) {
      // currently open — close iff collapsible
      if (collapsible) onValueChange?.('');
    } else {
      // open this item (and close any other)
      onValueChange?.(itemValue);
    }
  } else {
    // multiple — toggle membership
    const next = value.includes(itemValue)
      ? value.filter((v) => v !== itemValue)
      : [...value, itemValue];
    onValueChange?.(next);
  }
}
```

Internal-controlled mirror handles the uncontrolled case (same pattern as Textarea/Switch/Toast).

## Styling — `Accordion.module.scss`

```scss
@use '../../styles/mixins' as *;

.accordion {
  display: flex;
  flex-direction: column;
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  overflow: hidden;
}

.item {
  border-bottom: var(--border-width) solid var(--color-border);
}

.item:last-child {
  border-bottom: 0;
}

.header {
  // Reset native heading margin/font-weight — the heading element is purely
  // semantic; visual styling lives on .trigger.
  // stylelint-disable-next-line property-disallowed-list -- native heading margin reset
  margin: 0;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-md);
}

.trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: 0;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  color: var(--color-fg);
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);

  &:hover:not(:disabled) {
    background: var(--color-bg-muted);
  }

  &:focus-visible {
    @include focus-ring;

    outline: none;
    // Move the ring inside since the trigger is full-width.
    box-shadow: inset 0 0 0 var(--ring-width) var(--ring-accent);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--opacity-disabled);
  }
}

.label {
  flex: 1;
  min-width: 0; // allow long labels to wrap inside flex
}

.indicator {
  flex-shrink: 0;
  transition: transform var(--transition-fast);
  color: var(--color-fg-muted);
}

// When the item is open, rotate the indicator 180°.
.item[data-state='open'] .indicator {
  transform: rotate(180deg);
}

.content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--transition-base);
}

.content[data-state='open'] {
  grid-template-rows: 1fr;
}

.inner {
  overflow: hidden;
}

.content[data-state='open'] .inner {
  // Reserve some padding around the content when open.
  padding: var(--space-3) var(--space-4);
}

@media (prefers-reduced-motion: reduce) {
  .content,
  .indicator {
    transition: none;
  }
}
```

**Rule 4 check**:

- `.accordion` has `display: flex` — internal layout of its own children (Items), not at the component boundary. Allowed.
- `.header` has `margin: 0` (native heading reset) — inline-disabled with rationale.
- `.trigger` has `padding` — internal styling, not layout. Allowed.
- `.content` uses `display: grid; grid-template-rows: 0fr/1fr` — internal animation mechanic, not at the component boundary.
- `.inner` has `padding` (when content open) — internal child spacing.

The `box-shadow: inset` on the trigger's focus ring is a deliberate choice — the trigger is `width: 100%` inside a bordered list, so an outer ring would clip against the accordion's border-radius. Inset ring works cleanly.

## ARIA + behavior reference

| Concern             | Behavior                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Root element**    | `<div data-accordion>` — no `role` (the heading+button+region triple carries semantics).               |
| **Item element**    | `<div data-state="open"                                                                                | "closed">` — drives the chevron rotation + content state. |
| **Heading wrapper** | `<h2>`/`<h3>`/`<h4>` (consumer-configurable). Defaults to `<h3>`.                                      |
| **Trigger**         | `<button type="button" aria-expanded={open} aria-controls={contentId} id={triggerId}>`.                |
| **Content panel**   | `<div role="region" aria-labelledby={triggerId} id={contentId} data-state="open"                       | "closed">`.                                               |
| **Disabled item**   | `disabled` attr on the trigger; keyboard nav skips via `:not(:disabled)` selector.                     |
| **Keyboard**        | Space/Enter toggle (native); ArrowDown/Up/Home/End for trigger-to-trigger nav. Tab moves out (native). |
| **Reduced motion**  | `prefers-reduced-motion: reduce` disables grid + indicator transitions.                                |
| **Focus ring**      | Inset box-shadow (the trigger is full-width inside the accordion's border).                            |

## Testing

`Accordion.test.tsx` — ~24 cases.

### Rendering + structure

1. Renders without crashing with minimal compound markup
2. Items render in DOM order
3. Trigger is wrapped in the default `<h3>` heading
4. `headerLevel="h2"` wraps the trigger in `<h2>`
5. `aria-controls` on trigger matches `id` on content panel
6. `aria-labelledby` on content panel matches `id` on trigger
7. Default state: no item open (`type='single'` with no `defaultValue`); all `aria-expanded="false"`

### State (single mode)

8. `defaultValue="item-1"` opens item-1 on initial render
9. Clicking a closed item opens it AND closes any previously open item
10. `collapsible={false}` (default): clicking the open item does NOT close it
11. `collapsible={true}`: clicking the open item closes it (no item open)
12. Controlled: `value` + `onValueChange` round-trip; `onValueChange` fires with the next string

### State (multiple mode)

13. `defaultValue={['a','b']}` opens both items
14. Clicking a closed item adds it to the open set
15. Clicking an open item removes it from the open set
16. Controlled: `value` + `onValueChange` round-trip; `onValueChange` fires with the next array

### Disabled

17. `disabled` Item's trigger has the `disabled` attribute
18. Clicking a disabled trigger does NOT toggle the item

### Keyboard

19. ArrowDown from the first trigger focuses the second
20. ArrowUp from the second trigger focuses the first
21. ArrowDown wraps from last to first
22. Home focuses the first non-disabled trigger
23. End focuses the last non-disabled trigger
24. ArrowDown skips disabled items

### Misc

25. Custom `icon` on Trigger replaces the default ChevronDown
26. `icon={null}` hides the indicator entirely

**Vitest gotchas**:

- The keyboard test queries triggers via `button[aria-expanded]:not(:disabled)`. Verify the selector matches what the component renders.
- `userEvent.tab()` won't trigger the ArrowDown handler — use `await user.keyboard('{ArrowDown}')` while a trigger is focused.

## Playground demo — `AccordionDemo.tsx`

6 examples:

1. **Single, collapsible (FAQ-style)** — 3 items, only one open at a time, clicking the open one closes it.
2. **Multiple (independent sections)** — 4 items, any combination can be open.
3. **Controlled** — `useState` wired to the value; show "Currently open: X" elsewhere on the page.
4. **Disabled item** — 3 items, middle one disabled.
5. **Custom icon (Plus)** — replaces the default ChevronDown.
6. **Heading levels** — three side-by-side Accordions with `headerLevel="h2"`, `h3` (default), and `h4` to demonstrate the prop.

## AGENTS.md TL;DR slot

After `### <Tabs>` (around line 455), before `### <Breadcrumb>` (around line 479). Navigation cluster.

````markdown
### `<Accordion>` — vertically-stacked collapsible panels

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
````

- **`type="single"`** + `collapsible={true}` — one item open at a time, click to close.
- **`type="multiple"`** — any combination.
- **Smooth animation** via CSS `grid-template-rows: 0fr → 1fr`. No JS measurement.
- **Heading wrapping** — Trigger is wrapped in `<h3>` by default per WAI-ARIA APG. Override via `headerLevel` on Item.
- **Keyboard**: Arrow Down/Up cycles between triggers, Home/End jumps to ends, Space/Enter toggles. Disabled items are skipped.

#### When NOT to use

- ❌ Mutually-exclusive view switchers → `<Tabs>` (tabs imply parallel content; accordions imply hierarchy).
- ❌ A simple show/hide toggle for a single section → use a `<Button>` + conditional render. Accordion is for ≥2 sections.
- ❌ Step-by-step wizard flows → a dedicated Stepper (not shipped). Accordion is for parallel sections, not sequential ones.

#### Anti-patterns

- ❌ Nesting `<Accordion.Trigger>` inside a heading the consumer also renders manually. Trigger ALREADY wraps itself in a heading.
- ❌ Setting `aria-expanded` manually on the Trigger via `{...props}`. The component owns the ARIA contract.
- ❌ Using `headerLevel="h1"`. There should only be one `<h1>` per page; Accordion lives below it.

```

## Hard Rule 8

The pre-push review-fix cycle on library changes is mandatory. Gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None. All clarifications baked in.
```
