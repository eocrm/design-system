# Card subtle header (#701) + RelativeDateInput (#700) — design

**Date:** 2026-10-26
**Status:** decided by Claude. dpws said "skip questions, you decide". Every call below is Claude's, and dpws reviews it at the demo check before the PR.
**Origin:** GitHub issues #701 and #700. They ship on one branch and one PR (dpws).

---

## Part 1 — `Card.Header` surface + controls (#701)

### Intent

The eocrm automations condition builder shows a nested condition group as an inset card with a **tinted header row**: a label, a segmented `ButtonGroup` ("Match all | any") and a delete button. `Card.Header` can't hold an inline control beside the title (its children are the heading text, and `action` is a single right-aligned control), and it has no tinted surface.

### Decisions

- Extend `Card.Header`; there is no new compound (issue option A). One header concept, so agents can't mix two.
  - `surface?: 'default' | 'subtle'`, default `'default'`. `'subtle'` tints the header row with a muted surface token. The bottom separator stays.
  - `controls?: ReactNode`: inline controls rendered right after the heading and **outside** the heading element. The heading's accessible name stays the title only (e.g. "Group", not "Group Match all any"). The order is `title · controls … meta · action`. Controls never shrink below their content; the title truncates first.
- **Nesting guidance**, answering the issue's question: "Never nest Card in Card" gets one named exception. A nested **editable sub-section** (a condition group, a rule block) is a `Card` placed inside the parent's `Card.Body`, and it must use `Card.Header surface="subtle"`. Docs show the condition-group example. Every other Card-in-Card stays forbidden.
- Tokens: a component token for the subtle header background, aliasing an existing muted surface primitive. The header title and `meta` text must reach ≥ 4.5:1 on it in every theme × accent, pinned in `contrast.test.ts`.

### Non-goals

- A `Card.Toolbar`.
- More tint tones.

---

## Part 2 — `RelativeDateInput` (#700)

### Intent

eocrm stores **relative** dates and date ranges as expression strings, resolved server-side at use time: list filters, saved views, dashboard periods, automation conditions and custom-field defaults. The DS has absolute date pickers only. `RelativeDateInput` is a compact control that edits one expression string.

### API (from the issue, with Claude's additions marked)

```ts
interface RelativeDateInputProps {
  mode: 'point' | 'range';
  allowNow?: boolean; // default false
  value: string | null;
  onChange(expr: string | null): void;
  presets?: readonly { label: string; value: string }[]; // Claude: label is the consumer's
  disabled?: boolean; // Claude
  invalid?: boolean; // Claude: Field error wiring, like Input
  'aria-label'?: string;
}
```

`formatLabel` is **not** added (YAGNI). The component never shows a summary label; its own controls are the UI, and presets carry their own labels.

### Grammar (canonical strings, from the issue)

- **Point anchors:** `today`; `now` (only with `allowNow`); `start:{this|last|next}:{week|month|quarter|year}` and `end:…`.
- **Point offset:** an optional suffix `{+|-}{N}{unit}`, with N 0..1000.
  - Units `d`, `w`, `mo`, `y`; `h` and `min` are allowed only on the `now` anchor.
  - Examples: `today+7d`, `now-30min`, `end:next:quarter+1d`.
  - **Assumption to confirm with the eocrm server:** the unit spellings `d w mo y h min`. The issue shows only `d` and `min`.
- **Range:**
  - `last:{N}{d|w|mo|y}` and `next:…`, with N 1..1000
  - `{this|last|next}:{week|month|quarter|year}`
  - `this:{week|month|quarter|year}:to_date`
- **Absolute values:** `YYYY-MM-DD`, or a UTC datetime `YYYY-MM-DDTHH:mm:ssZ` when `allowNow`.
  - In point mode, an absolute value switches the control to "Exact date".
  - In range mode, an absolute value is not part of the grammar. It shows as unrecognised (below).
- A pure module `relativeDate.ts` exports `parseRelativeDate(expr, { mode, allowNow }) → RelativeDateValue | null` and `formatRelativeDate(value) → string`. They round-trip every canonical string. Unknown or invalid strings give `null`.

### UI

- **Layout:** one row (a `Cluster` that wraps) of library controls: `Select`, a numeric `Input`, `Switch`, `DatePicker`. Optional preset chips sit above it.
- **Point:**
  - an anchor `Select` (Today, Now when `allowNow`, "Start of this week" … "End of next year")
  - an offset made of a sign `Select` (+ / −), a numeric `Input` and a unit `Select` (days / weeks / months / years, plus hours / minutes when the anchor is Now). Offset 0 is omitted from the expression.
  - an **"Exact date" `Switch`**, which replaces the relative controls with a `DatePicker` (`granularity="minute"` when `allowNow`)
- **Range:**
  - a kind `Select`: Last N, Next N, This, Last, Next, To date
  - then either a numeric `Input` plus unit `Select` (for Last/Next N) or a period `Select` (week, month, quarter, year)
- **Presets:** when given, a row of toggle buttons above the controls. The one whose `value` equals the current value is pressed (`aria-pressed`). Choosing one emits its value.
- **Validation:** only valid expressions are emitted. A number outside the allowed range, or a non-integer, shows an inline error under the control (i18n) and does not call `onChange` until it's valid. Clearing a required number counts as invalid in the same way.
- **Unrecognised incoming `value`** (one that doesn't parse): the controls show the defaults plus a muted note "Unrecognised value: {value}" (i18n). Nothing is emitted until the user edits.
- **i18n:** every built-in string is an i18n key, en + ru (anchors, periods, units, kinds, "Exact date", errors). The numeric input and selects are labelled for screen readers (visually hidden labels, or `aria-label`s built from i18n). The whole control is a `role="group"` named by `aria-label`.
- **SSR-safe;** tokens only; the layout uses `Cluster`/`Stack`.

### Non-goals

- Resolving expressions to dates (server-side).
- Custom anchors.
- Business days.

---

## Completion (root CLAUDE.md invariant, applies to RelativeDateInput; the Card parts apply to Card)

- Tests: the grammar module (Node), the component (jsdom), the Card header (jsdom), and contrast pairs.
- Docs:
  - `Card.md`: the `surface`/`controls` props, the nesting exception, and the condition-group example
  - `RelativeDateInput.md`: TL;DR, the grammar table, "When NOT to use" (absolute-only → `DatePicker`/`DateRangePicker`), and the props table
  - the AI-PRIMER line, and `CLUSTERS` (`RelativeDateInput: 'Forms'`) in both maps
- Playground:
  - the Card demo gets a "nested condition group" example
  - a new `RelativeDateInputDemo` with all four wiring points and the union entry
- After release: comment the published version on #700 and #701 and close them.

---

## Part 3 — `List` (#708)

### Intent

Bulleted and numbered lists of prose items (docs pages: consent-screen facts, rate-limit headers, error extras; CRM help text). Raw `<ul>/<ol>` is forbidden to consumers, and hand-composed `Stack`/`Cluster`/`Dot` lists come out styled differently every time.

### Decisions (Claude's)

- **API:** `<List variant="bullet" | "number" gap="xs" | "sm" | "md" numberStyle="plain" | "badge">` with `<List.Item>` children.
  - Defaults: `variant="bullet"`, `gap="sm"`, `numberStyle="plain"`.
  - `numberStyle` only applies to `variant="number"`. `"badge"` renders each number as a small circular badge, matching the numbered-step look the docs mockup uses today.
- **Semantics:** `<ul>` / `<ol>` with `<li>`. The native markers are replaced by component-drawn ones, so add `role="list"` explicitly. Safari/VoiceOver drops list semantics when `list-style: none`.
- **Markers:** drawn by the component and aligned to the **first text line**, not centred on a multi-line item. Markers are decorative (`aria-hidden`), since screen readers already announce list position. Numbers come from CSS counters or the item index, so they stay correct when items are added or removed. Marker colour is a muted token; the badge uses a subtle accent surface with contrast pinned.
- **Layout:** item text wraps under itself, not under the marker (hanging indent). Lists nest: a `List` inside a `List.Item` indents one level. Text inherits size and colour from context, so the list works inside `Card`, `Text` measure containers and `Alert` bodies.
- **Non-goals:** a `start` attribute, custom markers or icons, definition lists (`DefinitionList` exists), and interactive lists (`Card.List` / `Table`).

### Completion

- Tests, docs (`List.md` with "When NOT to use": key–value pairs → `DefinitionList`, rows of records → `Card.List`/`Table`), the AI-PRIMER line, and `CLUSTERS` (`List: 'Display'`) in both maps.
- A playground demo with the four wiring points.
- The docs mockup:
  - the AI assistants "Connect" steps (today a `Cluster` + numbered `Badge` per step) become `<List variant="number" numberStyle="badge">`
  - one bulleted list on the API introduction (rate-limit headers)
- After release: comment on #708 and close it.
