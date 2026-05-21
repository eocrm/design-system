# Avatar group + status indicator + name tooltip

**Date:** 2026-05-21
**Branch:** `feat/avatar-group-status`
**Scope:** `<Avatar>` (extend) + `<AvatarGroup>` (new). No other components touched.

## Goals

1. New `<AvatarGroup>` — Slack-style stacked, overlapping row of avatars with a `+N` overflow button when the group exceeds `max`.
2. New `status` prop on `<Avatar>` — presence dot in the bottom-right (`online | busy | away | offline`).
3. New `tooltip` prop on `<Avatar>` — when true, wraps the avatar in the existing `<Tooltip>` with `content={name}`.

## Non-goals

- No new Avatar sizes. The existing `'sm' | 'md' | 'lg'` scale stays. If a future Slack-fidelity screen wants `xs` (20px) or `xl` (56px), add them as a separate change.
- No built-in popover for the overflow button — the library exposes an `onOverflowClick(event, hiddenAvatars)` callback; the consuming app composes whatever popover / modal / route it wants on top.
- No async / loading states. Avatars and AvatarGroups render synchronously from props.
- No "stacked vertical" / "wrapping" variant. The group is always a single horizontal row.

## Components

### Updated `<Avatar>`

**New props:**

```ts
/** Presence dot rendered in the bottom-right corner. Omit to render no dot. */
export type AvatarStatus = 'online' | 'busy' | 'away' | 'offline';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  // ... existing name / src / size ...

  /**
   * Presence dot. Renders a small colored circle anchored to the avatar's
   * bottom-right corner.
   * - `'online'`  — green (`--color-presence-online`)
   * - `'busy'`    — red   (`--color-presence-busy`)
   * - `'away'`    — amber (`--color-presence-away`)
   * - `'offline'` — gray  (`--color-presence-offline`)
   * Omit (the default) to render no dot at all.
   */
  status?: AvatarStatus;

  /**
   * When `true`, wraps the avatar in a `<Tooltip>` showing `name`. Defaults
   * to `false` for backwards-compatibility — every existing render keeps
   * its current behavior. Inside `<AvatarGroup>` the default flips to
   * `true` via context so grouped avatars are name-discoverable on hover.
   */
  tooltip?: boolean;
}
```

**Behavior:**

- The presence dot is a positioned `<span>` child of the avatar wrapper. The wrapper picks up `position: relative` (Rule 4 escape hatch — internal child anchor). The dot is `position: absolute; bottom: 0; right: 0;` with a 2px `--color-bg`-colored ring so it stays visible on textured / colored ancestors.
- Dot size scales with avatar size: `sm` → 8px, `md` → 10px, `lg` → 12px. Sizes come from tokens, not magic numbers (added below).
- When `tooltip` is true AND `name` is non-empty, the rendered avatar is wrapped in `<Tooltip content={name}>`. Per `<Tooltip>`'s contract, the tooltip is keyboard-accessible (focus opens it immediately).
- When `tooltip` is true but the consumer also passed an explicit `aria-label`, the avatar's accessible name from `aria-label` wins; the tooltip is a visual affordance, not an a11y replacement.

**Context awareness:**

A new `useAvatarGroup()` hook reads `AvatarGroupContext`. When an `<Avatar>` is rendered inside an `<AvatarGroup>`:

- The group's `size` becomes the **default** for each child — explicit per-child `size` prop still wins (idiomatic React composition: explicit prop beats context). The common "uniform group" case works by simply not setting per-child sizes.
- The group's `tooltip` flag also becomes the default; explicit per-child `tooltip` wins.
- A SCSS modifier `.inGroup` is added so the avatar picks up the `--color-bg` ring used to visually separate stacked siblings.

If `useAvatarGroup()` returns `null` (the common standalone case), Avatar behaves exactly as it does today.

### New `<AvatarGroup>`

```tsx
export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Avatar children. */
  children: ReactNode;

  /**
   * Diameter default for child avatars (each child can override via its own
   * `size` prop). Defaults to `'md'`. To get a strictly uniform group, simply
   * don't set `size` on individual children.
   */
  size?: AvatarSize;

  /**
   * Maximum number of visible avatars. Children beyond this count collapse
   * into a single `+N` button at the tail. Defaults to `4`.
   *
   * When the total number of children is `max + 1`, the +1 child renders as
   * itself (no `+N` button needed — same total count). The +N button only
   * appears when there are STRICTLY more children than `max`.
   */
  max?: number;

  /**
   * Whether to render a name tooltip on each child avatar. Defaults to
   * `true` inside the group (overridable per-child). Set to `false` at the
   * group level to suppress all tooltips, or pass `tooltip={false}` on a
   * specific child to opt that one out.
   */
  tooltip?: boolean;

  /**
   * Fires when the user clicks the `+N` overflow button. The library does
   * not render a popover — apps decide what happens (open a modal listing
   * the rest, navigate to a member-list page, etc.).
   *
   * `hiddenCount` is the number of children NOT visible in the strip.
   * `event` is the native click event so apps can do e.g. `event.preventDefault()`.
   */
  onOverflowClick?: (event: MouseEvent<HTMLButtonElement>, hiddenCount: number) => void;
}
```

**Behavior:**

- Renders a horizontal row of children. Each visible avatar overlaps its left neighbor by ~30% of avatar diameter (`margin-left: calc(var(--avatar-overlap) * -1)` where `--avatar-overlap` is a per-size token; `0` on the first child).
- Each rendered avatar has the `.inGroup` class so its wrapper picks up a 2px `--color-bg`-colored ring (separates stacked siblings).
- DOM order: first child renders leftmost; later children stack on top via flex order or via SCSS `z-index` so the right edge of each later avatar overlays earlier ones (matches Slack — newest on top). The stacking choice is a SCSS detail; either works as long as it's consistent.
- Overflow: when `children.length > max`, only the first `max` children render. The (`max + 1`)-th slot is replaced by a `<button>` rendered with the same circle shape, showing `+N` text where `N = children.length - max`. The button has the same `.inGroup` ring; `aria-label="N more avatars"` (so screen readers say "5 more avatars" not "+5").
- When `onOverflowClick` is omitted, the +N is rendered as a non-interactive `<span>` (visually identical but not focusable / not a button). When set, it's a `<button type="button">` with focus styling and the click handler.
- The group's wrapper itself is `<div>` (`role="list"` ARIA) and each visible avatar gets `role="listitem"` via the AvatarGroupContext (cleanest place to set it without forcing consumers to write `role` per child). The +N button stays a `<button>` — buttons inside lists are valid.
- `forwardRef` to the outer `<div>`. Spread order: Pattern A (props last) — group-owned `role="list"` and className get overridden by consumer attrs if explicitly passed.

### Tokens

Add to `tokens.scss`:

```scss
// Presence dots (Avatar status indicator). Aliases over the existing
// semantic palette — these are aliases, not new hex values, so future
// theme changes propagate.
--color-presence-online: var(--color-success);
--color-presence-busy: var(--color-danger);
--color-presence-away: var(--color-warning);
--color-presence-offline: var(--color-fg-disabled);

// Presence-dot dimensions per avatar size.
--size-presence-sm: 8px;
--size-presence-md: 10px;
--size-presence-lg: 12px;

// Avatar overlap when stacked in a group — fraction of avatar diameter.
// Each child after the first slides left by this amount.
--avatar-overlap-sm: calc(var(--size-sm) * -0.3);
--avatar-overlap-md: calc(var(--size-md) * -0.3);
--avatar-overlap-lg: calc(var(--size-lg) * -0.3);
```

Eight new tokens, all aliases or arithmetic from existing tokens. Adopting the convention "presence-*" instead of "status-*" since "status" is overloaded in the library (DatePicker has invalid status, Button has loading status, etc.).

## File layout

```
packages/design-system/src/components/Avatar/
  Avatar.tsx              ← extend with status, tooltip, group-context awareness
  Avatar.module.scss      ← add .presence + .inGroup styles
  Avatar.test.tsx         ← extend with status, tooltip, in-group tests
  AvatarGroup.tsx         ← NEW
  AvatarGroup.module.scss ← NEW
  AvatarGroup.test.tsx    ← NEW
  AvatarGroupContext.tsx  ← NEW (small context + provider + useAvatarGroup hook)
  index.ts                ← re-export AvatarGroup, AvatarStatus, AvatarGroupProps
```

Top-level `src/index.ts` gets the corresponding `export { AvatarGroup }` + `export type { AvatarGroupProps, AvatarStatus }`.

## Test surface

- **`<Avatar>`**:
  - `'renders presence dot when status is set'` — assert `.presence` class + the `data-status` attribute matches the prop (test via `[class*="presence"]` selector).
  - `'omits presence dot when status is undefined'`.
  - `'wraps in Tooltip when tooltip prop is true'` — assert `role="tooltip"` shows up after focus (or the tooltip's `aria-describedby` wiring on the avatar).
  - `'does not wrap in Tooltip when tooltip is false / unset'`.
  - `'inside AvatarGroup, picks up group size'` — render `<AvatarGroup size="lg"><Avatar name="X" size="sm" /></AvatarGroup>` and assert the avatar renders at `lg`.

- **`<AvatarGroup>`**:
  - `'renders all children when count <= max'`.
  - `'collapses to +N button when count > max'` — assert the +N button has `aria-label="3 more avatars"` (for 3 hidden).
  - `'renders +N as non-interactive span when onOverflowClick is omitted'`.
  - `'fires onOverflowClick with the hidden count'`.
  - `'forwards ref to outer div'`.
  - `'applies the group size class to every child (and the +N button)'`.
  - `'merges className without replacing'`.

## Playground demo

`AvatarDemo.tsx` gains examples:

1. **Status indicator** — 4 avatars showing online / busy / away / offline.
2. **Name tooltip** — one Avatar with `tooltip` true; hover to see the tooltip.
3. **Avatar Group** — a `<AvatarGroup>` with 6 children + `max={4}` so the +N button appears. Three of them have a status. The +N click logs to a `<code>` debug line for proof.
4. **Avatar Group sizes** — three `<AvatarGroup>`s side-by-side at `sm` / `md` / `lg`.

## AGENTS.md

- Extend `<Avatar>` section with bullets on `status` and `tooltip`.
- Add a new `<AvatarGroup>` section right after `<Avatar>` with a canonical snippet, max default, and a callout that `onOverflowClick` is the only overflow hook (the consumer composes the popover).

## Risks / open questions

- **Tooltip composition** (`<Tooltip>` wraps `<Avatar>`): Tooltip requires a child that accepts a ref and is a single ReactElement. Avatar uses `forwardRef` → fine. Inside an `<AvatarGroup>`, each child Avatar is wrapped → the group sees `<Tooltip><Avatar /></Tooltip>` not `<Avatar />`, so `React.Children.toArray` / slicing the children array still works (we slice BEFORE wrapping). The wrap happens inside Avatar itself based on the `tooltip` prop.
- **Ring color theming**: `.inGroup` ring uses `box-shadow: 0 0 0 2px var(--color-bg)`. If a consumer renders an AvatarGroup on a colored card (e.g., a Card with `padding="md"` on a tinted background), the ring becomes visually wrong. Acceptable v1 limitation — consumers wanting card-bg-matching rings can pass a `className` that overrides the ring color, or we add an `avatarRing` token later.
- **Overflow button semantics when `onOverflowClick` is omitted**: rendering as a `<span>` (non-interactive) is the right call — a button without a handler is a UX hazard (Slack does the same: their +N is non-interactive if there's nothing to expand to).
- **Group children stability**: the order of avatars in DOM matches the order in props. If the consumer reorders, the visual reorders with no animation. v1 doesn't animate; this is fine.
- **`role="list"` on the group wrapper**: ensures AT can navigate the group. Could be opt-out if it confuses some screen-reader workflows, but defaulting on matches WAI-ARIA APG guidance for groups of items.

## Out of scope

- Avatar size additions (`xs` / `xl`). Defer.
- Built-in popover for overflow. Consumer composes it via `onOverflowClick`.
- Animated entry / reorder.
- Avatar selected / focused states beyond what `<Tooltip>` already adds.
- Group-level click handler (clicking the row itself). Wrap in `<button>` if needed.
