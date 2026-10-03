# `<EntityChip>` — inline entity-link chip

```tsx
// Inline, inside a sentence — canonically a link to its entity:
<Text>
  Reassigned <EntityChip href="/contacts/12" icon={<User size={14} />} label="Priya Shah" /> to this deal.
</Text>

// href, prefix + status:
<EntityChip
  href="/tasks/5"
  prefix="ENG-5"
  label="Fix login bug"
  status={{ label: 'In progress', category: 'in_progress' }}
/>

// RouterLink via `as`, or a status color override:
import { Link as RouterLink } from 'react-router-dom';
<EntityChip as={RouterLink} to="/deals/9" label="Acme Corp" status={{ label: 'At risk', color: 'amber' }} />

// Chip fill override (categorical, independent of status):
<EntityChip href="/deals/9" label="Acme Corp" color="violet" />

// One-line list row: only the label ellipsizes; adornments inside the chip:
<EntityChip
  truncate
  href="/tasks/5"
  icon={<CheckSquare size={14} />}
  prefix="ENG-5"
  label="Fix the login bug that only happens on Safari"
  status={{ label: 'In progress', category: 'in_progress' }}
  trailing={<ArrowUp size={14} aria-label="High priority" />}
/>

// Segmented task chip — coloured `before`/`after` parts, capped label (#582):
<EntityChip
  as={RouterLink} to="/tasks/ENG-15"
  prefix="ENG-15" label="Fix the login bug on Safari" labelMaxWidth={40}
  before={[{ kind: 'icon', icon: <Bug />, label: 'Bug', color: 'red' }]}
  after={[
    { kind: 'icon', icon: <Equal />, label: 'Normal priority', color: 'slate' },
    { kind: 'text', text: 'Reported', color: 'amber' },
  ]}
/>

// `labelWeight="semibold"` — a heavier key + title (#590):
<EntityChip href="/tasks/ENG-15" prefix="ENG-15" label="Fix the login bug on Safari" labelWeight="semibold" />
```

- Polymorphic inline chip: optional `icon` (rendered `aria-hidden`), optional muted `prefix` (e.g. a task key), the `label`, and an optional colored `status`. All inline `<span>`s inside one root — safe to drop directly inside a `<p>`/`<Text>`.
- **An EntityChip is always a link to its entity**: pass `href` (renders `<a href>`) or `as` (`RouterLink`, `'button'`, any component — same polymorphic contract as `<Link>`). The bare `<span>` form (no target) is for rare non-navigable contexts only.
- Default chip fill matches RichText's `@mention` styling (`--color-accent-bg-subtle` / `--color-accent`) — a chip and a rendered mention read as the same visual object in both themes. `color?: PaletteColor` overrides the fill (same inline-injection contract as `Badge color`) — independent of `status`, which keeps its own resolved color. `unavailable` still mutes the label/status/dot over any `color`.
- `status`: `{ label, category?, color? }`. `category` (`to_do`/`in_progress`/`open`/`done`/`won`/`lost`) resolves a default palette color; `color` (a `PaletteColor`) overrides it — same category → color mapping as `<PillMenu>`. The separator dot between name and status takes the status's resolved color too (reads as one unit with the status label).
- `loading`: swaps the body for an ellipsis and sets `aria-busy` (which nothing reads on its own — the state reaches AT through the name, below). `unavailable`: mutes the chip (entity deleted or no access). Both are purely visual when the chip has a link target — it stays a live, keyboard-reachable link. Only a target-less `unavailable` chip is non-interactive with `aria-disabled`.
- ⚠️ **On a chip with a link target, both state words change the accessible name**, so a name-exact query stops matching: `getByRole('link', { name: 'Appointment' })` misses a chip that is loading or unavailable. If your tests select chips by name over lists that render placeholders, use a regex or query before the state applies.
- **`loading` is announced too.** Same mechanism, and `aria-busy` alone did not do it either — it is a _global_ ARIA state so it IS valid on the role-less span and browsers expose it, but no mainstream screen reader reliably conveys `busy` on a non-live element, and the `…` is `aria-hidden`. The label reached the user; the state did not. A linked chip's name becomes `"Appointment (loading)"`. **The trade:** the accessible name changes when loading resolves. Announcing a transient state through the name always costs that; the alternative is a consumer-owned `aria-live` region, since only the consumer knows whether a chip resolving is worth interrupting for. Override the word to `''` **at your top-level provider** if you'd rather handle it yourself — a nested `I18nProvider` replaces its parent rather than extending it, so wrapping a single chip would discard every other override you have set.
- **`unavailable` is announced, not just muted.** A localized word is rendered visually hidden inside the chip. A **linked** chip's accessible name becomes `"Appointment (unavailable)"`; a **target-less** chip is `role=generic`, which has no accessible name at all, so the word is announced as part of the chip's text in reading order. Either way it reaches the user.
- Why `aria-disabled` was not enough: browsers do expose it, but it carries no meaning on a non-widget role such as `generic`, so no assistive tech conveys it. This matters because the canonical use is to withhold the entity's name and show a TYPE word instead — without the state, a masked reference is indistinguishable from a real entity that happens to be called "Appointment".
- ❌ Don't put an `aria-label` on the chip — it replaces the whole name and takes the state word with it. The state lives in the chip's contents. Override the word via `<I18nProvider overrides={{ entityChip: { unavailable: '…' } }}>` instead; it carries its own punctuation so a locale can pick different marks.
- **`truncate`** — single-line mode for list rows: the chip caps at its container (`max-width: 100%`, `min-width: 0`) and only `label` ellipsizes; `icon`/`prefix`/`status`/`trailing` keep full size. The accessible name keeps the full label. Default wraps — right for chips in running text, so don't set `truncate` there.
- **`trailing`** — adornments inside the chip after `status` (a priority icon, a `<Badge>`), full size under `truncate`, not rendered while `loading`. Its text JOINS the link's name (`aria-hidden` a decorative icon). ❌ Never interactive content — the chip is a link; row actions go beside it.
- Hover affordance on link/button chips: the background deepens a step plus a brightness dip. Never a weight change, never an underline, even under aggressive consumer link CSS.
- Chip text inherits the surrounding font size — inside a heading it renders at heading size, by design (that's what keeps the chip box symmetric around the local text in any context).
- **Segments** (`before` / `after`, #582): coloured parts butted against the chip — `{ kind: 'icon', icon, label, color?, size? }` (label = accessible name + tooltip) or `{ kind: 'text', text, color?, tooltip?, size? }`; `size` is in em of the chip text, at most 1 (larger is clamped, so a segment never makes the chip taller or knocks its text off the label's baseline); glyph default 0.85em, text default 0.9em. The whole chip stays one link; every segment joins its name. Any segment makes the chip one line (only the label shrinks) with only the outer corners rounded. Not rendered while `loading`/`unavailable`. `labelMaxWidth` (ch) caps the label in running text; a clipped label shows its full text in a tooltip on hover or keyboard focus. That text is always plain; a non-string `label` is read when the tooltip opens, so it can show old text if the label changes while the tooltip is open. `labelEllipsis="start"` (#593) cuts a clipped label from its START (`…/pull/1116`) for labels whose tail is the distinctive part, e.g. a URL path under a host `prefix`; default `'end'`. Ignored on a chip whose label can't clip.
- **A text segment's text sits on the label's baseline, not centred** (#591): the segment's own box keeps the chip's font-size/line-height (so its box and first-line baseline match the core exactly); the smaller `--entity-chip-segment-text-size` lives on an inner span instead, which then sits on that baseline through normal inline layout. Icon (glyph) segments stay vertically centred, as before — only text segments changed.
- **The clipped-label tooltip is always plain text** (#590): it reads the label element's own `textContent` when it opens, not the `label` node itself — so a styled `label` (e.g. a `<Text tone="accent">`) never leaks its color/weight into the tooltip. No prop controls this; it's automatic.
- **`labelWeight`**: `'medium'` (default, matches a plain chip / the RichText `@mention`) applies to `label` only — `prefix` has no weight rule of its own and stays inherited (normal). `'semibold'` is the one value that also touches `prefix`, setting BOTH `prefix` and `label` together (a heavier key + title, e.g. a segmented task chip). Backed by a component token (`--entity-chip-label-font-weight-semibold`), not by wrapping `label` in a styled `<Text>` — see the anti-pattern below.
- **When NOT to use**: plain status with no linked entity → `<Badge>`/`<PillMenu>`; standalone navigation with no icon/prefix/status chrome → `<Link>`; removable filter pills → `<FilterChip>`.
- **Anti-pattern**: nesting a `<Badge>` inside another `<Badge>` to fake an entity-with-status chip — `EntityChip` replaces that composition. `status.color` and the chip's own `color` are `PaletteColor` names, never raw hex strings. Omitting a link target (`href`/`as`) is also an anti-pattern — an EntityChip should link to its entity. Nesting `<IconTile>`/`<Badge>` in `icon`/`trailing` to fake coloured parts is also an anti-pattern — use `before`/`after` segments instead. Wrapping `label` in a styled `<Text weight="semibold">` to get a heavier title is also an anti-pattern — use `labelWeight="semibold"`; it buys nothing anyway, since the clipped-label tooltip always renders the label's plain text regardless of how `label` is styled.
