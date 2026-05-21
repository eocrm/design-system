# Avatar group + status + tooltip — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<AvatarGroup>` (Slack-style stacked row with `+N` overflow callback), add `status` (presence dot) + `tooltip` (name on hover) props to `<Avatar>`.

**Architecture:** New `AvatarGroupContext` lets group propagate `size` and `tooltip` defaults to descendant `<Avatar>`s. Group renders visible children + a `+N` button (or non-interactive span when `onOverflowClick` is omitted). Avatar gains an absolutely-positioned presence dot child + a conditional `<Tooltip>` wrapper. New presence-color + dot-size + overlap tokens in `tokens.scss`.

**Tech Stack:** React, SCSS modules, Vitest + RTL.

**Branch:** `feat/avatar-group-status`.

**Spec:** `docs/superpowers/specs/2026-05-21-avatar-group-status-design.md`.

---

## Task 1: Verify branch + hooks

- [ ] **Step 1: Verify**

```bash
git rev-parse --abbrev-ref HEAD   # → feat/avatar-group-status
git config --get core.hooksPath   # → .husky/_
test -x .husky/pre-push           # exit 0
```

---

## Task 2: Add presence + overlap tokens

**Files:**

- Modify: `packages/design-system/src/styles/tokens.scss`

- [ ] **Step 1: Add the new tokens**

Find the existing `// States` section (around `--opacity-disabled`) and INSERT this block just above it:

```scss
  // Presence dots (Avatar status). Aliases over the existing semantic
  // palette — theme changes propagate.
  --color-presence-online: var(--color-success);
  --color-presence-busy: var(--color-danger);
  --color-presence-away: var(--color-warning);
  --color-presence-offline: var(--color-fg-disabled);

  // Presence-dot dimensions per avatar size.
  --size-presence-sm: 8px;
  --size-presence-md: 10px;
  --size-presence-lg: 12px;

  // Avatar overlap when stacked in a group. Each child after the first
  // slides left by this amount (negative margin-left). 30% of diameter
  // looks like Slack at every supported size.
  --avatar-overlap-sm: calc(var(--size-sm) * -0.3);
  --avatar-overlap-md: calc(var(--size-md) * -0.3);
  --avatar-overlap-lg: calc(var(--size-lg) * -0.3);
```

- [ ] **Step 2: Gates**

```bash
cd /home/dpws/projects/design-system
npm run lint:css 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/styles/tokens.scss
git commit -m "tokens: add presence colors + dot sizes + avatar-overlap"
```

---

## Task 3: `AvatarGroupContext.tsx`

**Files:**

- Create: `packages/design-system/src/components/Avatar/AvatarGroupContext.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { createContext, useContext } from 'react';
import type { AvatarSize } from './Avatar';

export interface AvatarGroupContextValue {
  /** Uniform size for every avatar in the group. */
  size: AvatarSize;
  /** Default tooltip behavior for child avatars. */
  tooltip: boolean;
}

/**
 * Internal context shared by `<AvatarGroup>` with its descendant `<Avatar>`s.
 * `null` means the avatar is standalone (not inside a group).
 */
export const AvatarGroupContext = createContext<AvatarGroupContextValue | null>(null);

/** Read the surrounding group context; `null` when standalone. */
export function useAvatarGroup(): AvatarGroupContextValue | null {
  return useContext(AvatarGroupContext);
}
```

- [ ] **Step 2: Gates**

```bash
npm run typecheck 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/Avatar/AvatarGroupContext.tsx
git commit -m "Avatar: add internal AvatarGroupContext for size + tooltip propagation"
```

---

## Task 4: Extend `<Avatar>` with `status` + `tooltip` + group awareness

**Files:**

- Modify: `packages/design-system/src/components/Avatar/Avatar.tsx`
- Modify: `packages/design-system/src/components/Avatar/Avatar.module.scss`

- [ ] **Step 1: Read current `Avatar.tsx`**

The file's at `/home/dpws/projects/design-system/packages/design-system/src/components/Avatar/Avatar.tsx`. Note the existing prop shape, the `hasImage` branch, and where `<img>` / initials wrapper render.

- [ ] **Step 2: Replace the file body**

```tsx
import { forwardRef, useEffect, useState, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { Tooltip } from '../Tooltip';
import { useAvatarGroup } from './AvatarGroupContext';
import styles from './Avatar.module.scss';

/** Diameter. Matches the shared `--size-*` scale so a Button next to an Avatar lines up. */
export type AvatarSize = 'sm' | 'md' | 'lg';

/** Presence dot rendered in the bottom-right corner. Omit to render no dot. */
export type AvatarStatus = 'online' | 'busy' | 'away' | 'offline';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The person's name. Required — used as the `alt`/`aria-label`, as the
   * source of the initials, and as the seed for the deterministic fallback
   * color. The same name always renders the same color. When `tooltip` is
   * true, also used as the tooltip body.
   */
  name: string;
  /**
   * Image URL. When provided, the `<img>` is rendered with `alt={name}`.
   * Empty/whitespace strings are treated as missing. If the image fails to
   * load (404, network), the component automatically falls back to initials.
   */
  src?: string;
  /**
   * Diameter.
   * - `sm` (24px) — table rows, dense lists.
   * - `md` (32px, default) — most uses.
   * - `lg` (40px) — detail-page headers.
   *
   * Inside `<AvatarGroup>`, the group's `size` overrides this.
   */
  size?: AvatarSize;
  /**
   * Presence dot in the bottom-right.
   * - `'online'`  — green.
   * - `'busy'`    — red.
   * - `'away'`    — amber.
   * - `'offline'` — gray.
   * Omit to render no dot at all.
   */
  status?: AvatarStatus;
  /**
   * When true, wraps the avatar in a `<Tooltip>` showing `name`. Defaults
   * to `false`. Inside `<AvatarGroup>` the default flips to the group's
   * `tooltip` prop (default `true`).
   */
  tooltip?: boolean;
}

const sizeClass: Record<AvatarSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

/**
 * Returns the avatar color slot (1-6) for a given name. The mapping is stable:
 * the same name always returns the same slot. Useful for matching avatar
 * colors elsewhere (e.g. a "ghost" item or a chart segment representing the
 * same user).
 *
 * Each slot corresponds to a `--color-avatar-N` CSS custom property.
 */
export function avatarColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return (Math.abs(hash) % 6) + 1;
}

type StyleWithVars = CSSProperties & { [key: `--${string}`]: string | number };

function hasOwnProps(obj: object | undefined): obj is object {
  return obj !== undefined && Object.keys(obj).length > 0;
}

/**
 * Profile circle. Renders an `<img>` when `src` is set; otherwise renders the
 * person's initials on a deterministic color (same name → same color, always —
 * so a given user keeps their color across every page).
 *
 * On image load failure, the component automatically falls back to initials.
 *
 * Inside `<AvatarGroup>`, the group's `size` and `tooltip` defaults take over —
 * individual `size` / `tooltip` props still win per-child.
 *
 * @example
 * <Avatar name="Alex Rivera" />
 *
 * @example
 * <Avatar name="Alex Rivera" src="https://example.com/alex.jpg" size="lg" status="online" />
 *
 * @example
 * // Hover-discoverable name:
 * <Avatar name="Alex Rivera" tooltip />
 *
 * @example
 * // In a table row:
 * <Cluster gap="sm" align="center">
 *   <Avatar name={contact.name} size="sm" />
 *   <span>{contact.name}</span>
 * </Cluster>
 *
 * @remarks When NOT to use
 * - For company logos — Avatars are for people. Use a `Logo` component (not
 *   yet shipped) or an `<img>` with rounded corners.
 * - As a clickable button. If clicking opens a profile, wrap the Avatar in
 *   a `<button>` or `<Link>` — don't make the Avatar itself interactive.
 *
 * @remarks Anti-patterns
 * - ❌ `<Avatar name="" />` — `name` is required and is the accessible label.
 * - ❌ Using Avatar to show a non-person icon. Use an icon component instead.
 * - ❌ Wrapping the result with `role="img"` again. The component already
 *   handles ARIA: with `src` set, the inner `<img>` is the labeled image;
 *   without `src`, the wrapper has `role="img" aria-label={name}`.
 */
export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { name, src, size, status, tooltip, className, style, ...props },
  ref,
) {
  const group = useAvatarGroup();
  const resolvedSize: AvatarSize = size ?? group?.size ?? 'md';
  const resolvedTooltip: boolean = tooltip ?? group?.tooltip ?? false;

  const [imageBroken, setImageBroken] = useState(false);
  useEffect(() => {
    setImageBroken(false);
  }, [src]);

  const hasImage = typeof src === 'string' && src.trim() !== '' && !imageBroken;
  const trimmedName = name.trim();
  const accessibleName = trimmedName === '' ? '?' : trimmedName;

  const fallbackStyle: StyleWithVars | undefined = hasImage
    ? undefined
    : { '--avatar-bg': `var(--color-avatar-${avatarColorIndex(accessibleName)})` };

  const mergedStyle: StyleWithVars | undefined =
    hasOwnProps(fallbackStyle) || hasOwnProps(style) ? { ...fallbackStyle, ...style } : undefined;

  const wrapperClass = clsx(
    styles.avatar,
    sizeClass[resolvedSize],
    group != null && styles.inGroup,
    className,
  );

  // Presence dot is an absolutely-positioned child. Rendered only when
  // `status` is set. Carries `data-status` for SCSS selector + test query.
  const presenceDot = status ? (
    <span aria-hidden="true" className={styles.presence} data-status={status} />
  ) : null;

  const inner = hasImage ? (
    <span {...props} ref={ref} className={wrapperClass} style={mergedStyle}>
      <img src={src} alt={accessibleName} onError={() => setImageBroken(true)} />
      {presenceDot}
    </span>
  ) : (
    <span
      {...props}
      ref={ref}
      role="img"
      aria-label={accessibleName}
      className={wrapperClass}
      style={mergedStyle}
    >
      <span aria-hidden="true">{initials(name)}</span>
      {presenceDot}
    </span>
  );

  if (resolvedTooltip && accessibleName !== '?') {
    return <Tooltip content={accessibleName}>{inner}</Tooltip>;
  }

  return inner;
});
```

- [ ] **Step 3: Update `Avatar.module.scss`**

Find the existing `.avatar` block. ADD `position: relative;` to it (Rule 4 escape hatch — internal child anchor; document with a SCSS comment).

ADD at the end of the file:

```scss
// Presence dot (Avatar status). Anchored to the bottom-right of the
// avatar via the parent's `position: relative`. Carries a 2px ring of
// --color-bg so the dot stays visible on tinted ancestors.
.presence {
  position: absolute;
  right: 0;
  bottom: 0;
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 2px var(--color-bg);

  &[data-status='online'] {
    background: var(--color-presence-online);
  }
  &[data-status='busy'] {
    background: var(--color-presence-busy);
  }
  &[data-status='away'] {
    background: var(--color-presence-away);
  }
  &[data-status='offline'] {
    background: var(--color-presence-offline);
  }
}

// Per-size dot dimensions. The `.sm .presence` selector relies on the size
// class living on the avatar wrapper (which is also `.presence`'s parent).
.sm .presence {
  width: var(--size-presence-sm);
  height: var(--size-presence-sm);
}
.md .presence {
  width: var(--size-presence-md);
  height: var(--size-presence-md);
}
.lg .presence {
  width: var(--size-presence-lg);
  height: var(--size-presence-lg);
}

// When inside an AvatarGroup, each avatar picks up a --color-bg ring so
// stacked siblings read as distinct. The ring uses box-shadow (no layout
// impact) — pure visual separator.
.inGroup {
  box-shadow: 0 0 0 2px var(--color-bg);
}
```

ADD `position: relative;` to `.avatar`:

```scss
.avatar {
  position: relative; // Rule 4 escape hatch — anchors the .presence dot child.
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  // … existing rules stay …
}
```

- [ ] **Step 4: Gates**

```bash
cd /home/dpws/projects/design-system
npm test --workspace=@eocrm/design-system --run -- src/components/Avatar 2>&1 | tail -8
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

Existing tests should still pass (status/tooltip default false → no behavior change).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/Avatar/Avatar.tsx \
        packages/design-system/src/components/Avatar/Avatar.module.scss
git commit -m "Avatar: add status (presence dot) + tooltip props + group awareness"
```

---

## Task 5: Avatar tests

**Files:**

- Modify: `packages/design-system/src/components/Avatar/Avatar.test.tsx`

- [ ] **Step 1: Read current test file**

```bash
cat packages/design-system/src/components/Avatar/Avatar.test.tsx
```

- [ ] **Step 2: Add tests at the end of the existing `describe`**

```tsx
it('renders presence dot when status is set', () => {
  const { container } = render(<Avatar name="Alex" status="online" />);
  const dot = container.querySelector('[data-status="online"]');
  expect(dot).not.toBeNull();
  expect(dot).toHaveAttribute('aria-hidden', 'true');
});

it('omits presence dot when status is undefined', () => {
  const { container } = render(<Avatar name="Alex" />);
  expect(container.querySelector('[data-status]')).toBeNull();
});

it('switches presence color when status changes', () => {
  const { container, rerender } = render(<Avatar name="Alex" status="online" />);
  expect(container.querySelector('[data-status="online"]')).not.toBeNull();
  rerender(<Avatar name="Alex" status="busy" />);
  expect(container.querySelector('[data-status="online"]')).toBeNull();
  expect(container.querySelector('[data-status="busy"]')).not.toBeNull();
});

it('does NOT wrap in Tooltip when tooltip is false / unset', () => {
  // Without the Tooltip wrapper, focus on the avatar should not announce
  // a tooltip. We verify by ensuring no `role="tooltip"` is reachable.
  render(<Avatar name="Alex" />);
  expect(screen.queryByRole('tooltip')).toBeNull();
});

it('wraps in Tooltip when tooltip prop is true', async () => {
  const user = userEvent.setup();
  render(<Avatar name="Alex" tooltip />);
  // Focus the avatar — Tooltip opens immediately on keyboard focus.
  const avatar = screen.getByRole('img', { name: 'Alex' });
  avatar.focus();
  // Tooltip is portaled into document.body; query via findByRole.
  const tip = await screen.findByRole('tooltip');
  expect(tip).toHaveTextContent('Alex');
});
```

Note: the existing Avatar isn't focusable by default (`<span>` without tabIndex). The Tooltip component handles this — it wraps the trigger element and the Tooltip component itself adds the appropriate event listeners. Verify by reading `Tooltip.tsx` if the keyboard-focus path requires the trigger to be focusable. If it does (e.g., Tooltip uses focus-trap or requires tabIndex), the test may need `<Avatar name="Alex" tooltip tabIndex={0} />` OR may need to use `userEvent.hover()` instead. Match whatever the Tooltip's existing tests do for non-focusable triggers.

- [ ] **Step 3: Gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/Avatar 2>&1 | tail -8
```

If the tooltip-focus test fails because of focusability, swap to `user.hover(avatar)` and add an `await screen.findByRole('tooltip')` with a small wait — Tooltip defaults to a 400ms open delay.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Avatar/Avatar.test.tsx
git commit -m "Avatar: tests for new status + tooltip props"
```

---

## Task 6: `<AvatarGroup>` component + SCSS + barrel

**Files:**

- Create: `packages/design-system/src/components/Avatar/AvatarGroup.tsx`
- Create: `packages/design-system/src/components/Avatar/AvatarGroup.module.scss`
- Modify: `packages/design-system/src/components/Avatar/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Create `AvatarGroup.tsx`**

```tsx
import {
  Children,
  forwardRef,
  isValidElement,
  useMemo,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import type { AvatarSize } from './Avatar';
import { AvatarGroupContext, type AvatarGroupContextValue } from './AvatarGroupContext';
import styles from './AvatarGroup.module.scss';

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Avatar children. */
  children: ReactNode;

  /**
   * Uniform diameter for every avatar in the group. Defaults to `'md'`.
   * Overrides any `size` set on individual children.
   */
  size?: AvatarSize;

  /**
   * Maximum number of visible avatars. Children beyond this count collapse
   * into a single `+N` button at the tail. Defaults to `4`. The `+N` only
   * appears when there are STRICTLY more children than `max`.
   */
  max?: number;

  /**
   * Whether to render a name tooltip on each child avatar. Defaults to `true`
   * inside the group; overridable per-child by setting `tooltip` on the Avatar.
   */
  tooltip?: boolean;

  /**
   * Fires when the user clicks the `+N` overflow button. The library does
   * NOT render a popover — apps decide what happens (open a modal, navigate,
   * etc.). When omitted, the `+N` is rendered as a non-interactive `<span>`.
   *
   * @param event The native click event.
   * @param hiddenCount The number of children not visible in the strip.
   */
  onOverflowClick?: (event: MouseEvent<HTMLButtonElement>, hiddenCount: number) => void;
}

/**
 * Horizontal stack of `<Avatar>`s with `+N` overflow when count exceeds `max`.
 *
 * The group propagates `size` and `tooltip` to descendant `<Avatar>`s via
 * context. The first `max` children render; any remainder collapses to a
 * single overflow button.
 *
 * @example
 * // Static — non-interactive +N:
 * <AvatarGroup max={3}>
 *   <Avatar name="Alex Rivera" />
 *   <Avatar name="Priya Patel" />
 *   <Avatar name="Tom Kim" />
 *   <Avatar name="Sara Chen" />
 *   <Avatar name="Jaden Lee" />
 * </AvatarGroup>
 *
 * @example
 * // With overflow handler — app composes whatever popover/modal it wants:
 * <AvatarGroup
 *   max={4}
 *   size="lg"
 *   onOverflowClick={(_e, hiddenCount) => openMembersPopover(hiddenCount)}
 * >
 *   {members.map((m) => <Avatar key={m.id} name={m.name} src={m.avatarUrl} status={m.presence} />)}
 * </AvatarGroup>
 *
 * @remarks When NOT to use
 * - For a single avatar — use `<Avatar>` directly.
 * - When you want to show member counts but not faces — use a `Badge` next to a label.
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping `<AvatarGroup>` in a `<button>` and treating it as one click target.
 *   The +N is the click affordance; the visible avatars are deliberately not interactive
 *   in the library — wrap individual avatars in `<button>` / `<Link>` if needed.
 * - ❌ Mixing avatar sizes inside one group. The group's `size` overrides per-child sizes.
 */
export const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { children, size = 'md', max = 4, tooltip = true, onOverflowClick, className, ...props },
  ref,
) {
  // Convert children to a stable array so we can slice deterministically.
  // React.Children.toArray strips out falsy values + assigns keys defensively.
  const items = Children.toArray(children).filter(isValidElement);
  const visible = items.slice(0, max);
  const hiddenCount = Math.max(0, items.length - max);

  const ctx: AvatarGroupContextValue = useMemo(() => ({ size, tooltip }), [size, tooltip]);

  const overflowClass = clsx(styles.overflow, styles[`size-${size}`]);

  const overflowNode =
    hiddenCount > 0 ? (
      onOverflowClick ? (
        <button
          type="button"
          className={overflowClass}
          aria-label={`${hiddenCount} more avatars`}
          onClick={(e) => onOverflowClick(e, hiddenCount)}
        >
          +{hiddenCount}
        </button>
      ) : (
        <span
          className={overflowClass}
          role="img"
          aria-label={`${hiddenCount} more avatars`}
        >
          +{hiddenCount}
        </span>
      )
    ) : null;

  return (
    // Pattern A — props last so consumer overrides win.
    <AvatarGroupContext.Provider value={ctx}>
      <div ref={ref} role="list" className={clsx(styles.group, className)} {...props}>
        {visible.map((child, i) => (
          <div key={i} role="listitem" className={styles.item}>
            {child}
          </div>
        ))}
        {overflowNode && (
          <div role="listitem" className={styles.item}>
            {overflowNode}
          </div>
        )}
      </div>
    </AvatarGroupContext.Provider>
  );
});
```

- [ ] **Step 2: Create `AvatarGroup.module.scss`**

```scss
// AvatarGroup — horizontal row of stacked Avatars with optional +N overflow.
// Rule 4 note: `.item:not(:first-child)` uses `margin-left` to overlap
// siblings — this is intentional internal layout, not a Rule-4 violation
// because the public component IS the wrapper; consumers don't see the
// inner items.
.group {
  display: inline-flex;
  align-items: center;
}

.item {
  display: inline-flex;
  // First item: no offset. Every subsequent item slides left to overlap the
  // preceding one. Per-size overlap tokens live in tokens.scss.
  &:not(:first-child) {
    margin-left: var(--avatar-overlap-md);
  }
}

// Per-size overlap — applied to the group wrapper so all children inherit.
.group:has(.item:not(:first-child)) {
  // No-op; specificity helper.
}

// +N overflow chip — same circular surface as Avatar, muted background.
.overflow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--color-bg-muted);
  color: var(--color-fg-muted);
  border: none;
  border-radius: var(--radius-full);
  font-family: inherit;
  font-weight: var(--font-weight-semibold);
  // The 2px ring matches the .inGroup ring on Avatar so the +N sits flush.
  box-shadow: 0 0 0 2px var(--color-bg);
  cursor: default;
  user-select: none;

  &:is(button) {
    cursor: pointer;
  }

  &:is(button):hover {
    background: var(--color-bg-sunken);
    color: var(--color-fg);
  }

  &:is(button):focus-visible {
    outline: none;
    box-shadow:
      0 0 0 2px var(--color-bg),
      0 0 0 calc(2px + var(--ring-width)) var(--ring-accent);
  }
}

.size-sm {
  width: var(--size-sm);
  height: var(--size-sm);
  font-size: var(--font-size-xs);
}
.size-md {
  width: var(--size-md);
  height: var(--size-md);
  font-size: var(--font-size-sm);
}
.size-lg {
  width: var(--size-lg);
  height: var(--size-lg);
  font-size: var(--font-size-md);
}

// Per-size overlap override on items — applied via the parent group's size
// modifier. We need to know the group's size to pick the right overlap,
// which means wiring per-size classes onto the group wrapper.
:global(.size-sm) > .item:not(:first-child) {
  margin-left: var(--avatar-overlap-sm);
}
:global(.size-md) > .item:not(:first-child) {
  margin-left: var(--avatar-overlap-md);
}
:global(.size-lg) > .item:not(:first-child) {
  margin-left: var(--avatar-overlap-lg);
}
```

NOTE: the `:global()` selectors above are a foot-gun; they'll match ANY ancestor with those class names. CSS modules hash class names so this would normally work only with locally-scoped classes. The cleaner approach: tag the group wrapper with `styles[`groupSize-${size}`]` and target `.groupSize-sm > .item`, etc. REWRITE the SCSS bottom block as:

```scss
.groupSize-sm > .item:not(:first-child) {
  margin-left: var(--avatar-overlap-sm);
}
.groupSize-md > .item:not(:first-child) {
  margin-left: var(--avatar-overlap-md);
}
.groupSize-lg > .item:not(:first-child) {
  margin-left: var(--avatar-overlap-lg);
}
```

And update the JSX wrapper to:

```tsx
<div ref={ref} role="list" className={clsx(styles.group, styles[`groupSize-${size}`], className)} {...props}>
```

Also REMOVE the `.item:not(:first-child) { margin-left: var(--avatar-overlap-md); }` rule from `.item` (replaced by the per-size selectors above) and the empty `.group:has(...)` block.

- [ ] **Step 3: Update barrels**

In `packages/design-system/src/components/Avatar/index.ts`:

```ts
export { Avatar, avatarColorIndex } from './Avatar';
export type { AvatarProps, AvatarSize, AvatarStatus } from './Avatar';
export { AvatarGroup } from './AvatarGroup';
export type { AvatarGroupProps } from './AvatarGroup';
```

In `packages/design-system/src/index.ts`, find:

```ts
export { Avatar } from './components/Avatar';
export type { AvatarProps, AvatarSize } from './components/Avatar';
```

Replace with:

```ts
export { Avatar, AvatarGroup, avatarColorIndex } from './components/Avatar';
export type { AvatarProps, AvatarSize, AvatarStatus, AvatarGroupProps } from './components/Avatar';
```

(If `avatarColorIndex` was already re-exported via Avatar's barrel, the top-level may or may not need it; check current state.)

- [ ] **Step 4: Gates**

```bash
cd /home/dpws/projects/design-system
npm test --workspace=@eocrm/design-system --run -- src/components/Avatar 2>&1 | tail -8
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/Avatar/AvatarGroup.tsx \
        packages/design-system/src/components/Avatar/AvatarGroup.module.scss \
        packages/design-system/src/components/Avatar/index.ts \
        packages/design-system/src/index.ts
git commit -m "AvatarGroup: new component with size + max + overflow callback"
```

---

## Task 7: AvatarGroup tests

**Files:**

- Create: `packages/design-system/src/components/Avatar/AvatarGroup.test.tsx`

- [ ] **Step 1: Write the file**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Avatar } from './Avatar';
import { AvatarGroup } from './AvatarGroup';

describe('AvatarGroup', () => {
  it('renders all children when count <= max', () => {
    render(
      <AvatarGroup max={4}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('img', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'C' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /more avatars/ })).toBeNull();
    expect(screen.queryByRole('img', { name: /more avatars/ })).toBeNull();
  });

  it('collapses to +N when count > max', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
        <Avatar name="D" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('img', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'B' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'C' })).toBeNull();
    expect(screen.queryByRole('img', { name: 'D' })).toBeNull();
    // No handler → non-interactive span with role="img" + aria-label
    expect(screen.getByRole('img', { name: '2 more avatars' })).toBeInTheDocument();
  });

  it('renders +N as a button when onOverflowClick is provided, and fires the handler', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <AvatarGroup max={1} onOverflowClick={handler}>
        <Avatar name="A" />
        <Avatar name="B" />
        <Avatar name="C" />
      </AvatarGroup>,
    );
    const btn = screen.getByRole('button', { name: '2 more avatars' });
    await user.click(btn);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][1]).toBe(2);
  });

  it('propagates size to descendant Avatars via context', () => {
    const { container } = render(
      <AvatarGroup size="lg">
        <Avatar name="A" size="sm" />
      </AvatarGroup>,
    );
    // Group's size wins — Avatar should render with the lg size class.
    const avatar = container.querySelector('[role="img"]');
    expect(avatar?.className).toMatch(/lg/);
  });

  it('forwards ref to the outer div', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <AvatarGroup ref={ref}>
        <Avatar name="A" />
      </AvatarGroup>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className', () => {
    const { container } = render(
      <AvatarGroup className="my-class">
        <Avatar name="A" />
      </AvatarGroup>,
    );
    expect(container.querySelector('div.my-class')).not.toBeNull();
  });

  it('renders the role="list" wrapper with role="listitem" children', () => {
    render(
      <AvatarGroup>
        <Avatar name="A" />
        <Avatar name="B" />
      </AvatarGroup>,
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/Avatar/AvatarGroup 2>&1 | tail -8
```

If any test fails on the role/text-matching, inspect the rendered DOM via a `screen.debug()` call to confirm the actual structure.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/Avatar/AvatarGroup.test.tsx
git commit -m "AvatarGroup: tests for size propagation, overflow, ref + role wiring"
```

---

## Task 8: Playground demo

**Files:**

- Modify: `packages/playground/src/pages/components/AvatarDemo.tsx`

- [ ] **Step 1: Read current demo**

```bash
cat packages/playground/src/pages/components/AvatarDemo.tsx
```

- [ ] **Step 2: Add four new Examples**

After whatever the current LAST example is, insert (in order):

1. Status example:

```tsx
<Example
  title="Status indicator"
  description="Presence dot in the bottom-right. Four states: online / busy / away / offline."
  code={`<Avatar name="Online Olivia" status="online" />
<Avatar name="Busy Beatrice" status="busy" />
<Avatar name="Away Adrien" status="away" />
<Avatar name="Offline Otto" status="offline" />`}
>
  <Cluster gap="md" align="center">
    <Avatar name="Online Olivia" status="online" />
    <Avatar name="Busy Beatrice" status="busy" />
    <Avatar name="Away Adrien" status="away" />
    <Avatar name="Offline Otto" status="offline" />
  </Cluster>
</Example>
```

2. Tooltip example:

```tsx
<Example
  title="Name tooltip"
  description="Set `tooltip` to surface the name on hover / keyboard focus."
  code={`<Avatar name="Alex Rivera" tooltip />`}
>
  <Avatar name="Alex Rivera" tooltip />
</Example>
```

3. AvatarGroup with overflow:

```tsx
const TEAM = [
  'Alex Rivera',
  'Priya Patel',
  'Tom Kim',
  'Sara Chen',
  'Jaden Lee',
  'Mei Tanaka',
  'Diego Ortiz',
];

function GroupDemo() {
  const [clicked, setClicked] = useState<number | null>(null);
  return (
    <Stack gap="xs">
      <AvatarGroup
        max={4}
        size="md"
        onOverflowClick={(_e, count) => setClicked(count)}
      >
        {TEAM.map((n) => (
          <Avatar key={n} name={n} />
        ))}
      </AvatarGroup>
      {clicked !== null && (
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          onOverflowClick fired with hiddenCount = {clicked}
        </code>
      )}
    </Stack>
  );
}
```

Then in the demo JSX:

```tsx
<Example
  title="Avatar group with overflow handler"
  description="Up to `max` avatars render in flow; the rest collapse into a +N button. The library does not render a popover — the app's `onOverflowClick` decides what happens."
  code={`<AvatarGroup max={4} onOverflowClick={(_e, count) => openMembersPopover(count)}>
  {team.map((m) => <Avatar key={m.id} name={m.name} />)}
</AvatarGroup>`}
>
  <GroupDemo />
</Example>
```

4. AvatarGroup sizes:

```tsx
<Example
  title="Group sizes"
  description="Three sizes — sm / md (default) / lg. The group size overrides any per-child size."
  code={`<AvatarGroup size="sm">{...}</AvatarGroup>
<AvatarGroup size="md">{...}</AvatarGroup>
<AvatarGroup size="lg">{...}</AvatarGroup>`}
>
  <Stack gap="md">
    <AvatarGroup size="sm" max={5}>
      {TEAM.slice(0, 6).map((n) => <Avatar key={n} name={n} />)}
    </AvatarGroup>
    <AvatarGroup size="md" max={5}>
      {TEAM.slice(0, 6).map((n) => <Avatar key={n} name={n} />)}
    </AvatarGroup>
    <AvatarGroup size="lg" max={5}>
      {TEAM.slice(0, 6).map((n) => <Avatar key={n} name={n} />)}
    </AvatarGroup>
  </Stack>
</Example>
```

Imports at the top of the file: add `AvatarGroup`, `Cluster`, `Stack`, `useState` if not present.

- [ ] **Step 3: Gates**

```bash
cd /home/dpws/projects/design-system
npm run typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Smoke test**

Browse `/components/avatar` in the dev server (use Playwright MCP or local browser). Verify:
- Status dots render in the right corner with the right colors.
- Tooltip appears on hover/focus.
- Group with overflow shows 4 visible + a "+3" button. Clicking it logs to the debug `<code>`.
- Three group sizes render at the right diameters.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/components/AvatarDemo.tsx
git commit -m "AvatarDemo: examples for status / tooltip / AvatarGroup"
```

---

## Task 9: AGENTS.md sweep

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Find the `<Avatar>` section**

```bash
grep -n "^### \`<Avatar>\`" packages/design-system/AGENTS.md
```

- [ ] **Step 2: Extend the `<Avatar>` section bullets**

After the existing bullets, add:

```
- `status?` — presence dot in the bottom-right corner. `'online' | 'busy' | 'away' | 'offline'`. Omit to render no dot.
- `tooltip?` — when true, wraps the avatar in `<Tooltip>` with `content={name}`. Default `false` standalone; defaults to `true` inside `<AvatarGroup>` (per-child override still wins).
```

- [ ] **Step 3: Add a new `<AvatarGroup>` section RIGHT AFTER the `<Avatar>` section**

```markdown
### `<AvatarGroup>` — Slack-style stacked row of avatars

```tsx
<AvatarGroup max={4} size="md" onOverflowClick={(_e, n) => openMembersPopover(n)}>
  {team.map((m) => <Avatar key={m.id} name={m.name} src={m.avatarUrl} status={m.presence} />)}
</AvatarGroup>
```

- Horizontal row of overlapping `<Avatar>`s with a `+N` overflow control when the child count exceeds `max` (default `4`).
- `size` is set on the group, NOT per child. The group's size overrides any per-child `size`. Three sizes: `'sm' | 'md' | 'lg'`.
- `tooltip` defaults to `true` inside a group — each visible avatar shows its `name` on hover / focus. Override per-child via `tooltip={false}` on a specific `<Avatar>`.
- `onOverflowClick(event, hiddenCount)` — the library does NOT render its own popover. When the user clicks `+N`, the app decides what happens (open a `<Popover>` with a list of all members, navigate to a page, open a modal, etc.). When the handler is omitted, the `+N` renders as a non-interactive `<span>`.
- The group wrapper is `role="list"` and each visible avatar is wrapped in `role="listitem"`. The +N (button or span) is the last list item.
- forwardRef to the outer `<div>`. `className` is merged, not replaced.
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document AvatarGroup + Avatar status/tooltip"
```

---

## Task 10: Final gates + Hard Rule 8 cycle + PR

- [ ] **Step 1: Prettier --write**

```bash
npx prettier --write "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md"
```

Commit drift:

```bash
git add -A packages/ docs/
git diff --cached --stat
git commit -m "Prettier: format avatar-group changes" || echo "no formatting changes"
```

- [ ] **Step 2: Full gates**

```bash
cd /home/dpws/projects/design-system
npm test --workspace=@eocrm/design-system --run 2>&1 | tail -5
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
npx prettier --check "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md" 2>&1 | tail -3
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -cE "\.test\."
```

- [ ] **Step 3: Push**

```bash
git push -u origin feat/avatar-group-status
```

- [ ] **Step 4: Hard Rule 8 review cycle 1**

Dispatch a fresh-context `general-purpose` review agent with the standard 10-category brief. Specifics to look at hard:

- The `Tooltip` wrapping inside `Avatar`: does `screen.getByRole('img', { name: '...' })` still find the Avatar through the Tooltip wrapper? (Tooltip wraps but doesn't break role-mapping since it portals the tooltip itself, not the trigger.)
- The `:has()` SCSS selector if used — browser support. (If used, the implementer should have replaced it with the explicit `.groupSize-*` class pattern per the plan's correction in Task 6.)
- `Children.toArray + isValidElement` filter on AvatarGroup — does it correctly handle `null` / `false` / fragments inside the children? Add a test case if missing.
- Token discipline on the new tokens (presence + overlap) — all values reference existing tokens, no raw hex / px outside `tokens.scss`.
- Box-shadow ring stacking: when a presence dot AND `.inGroup` ring both apply, the `box-shadow` of `.presence` and the wrapper's `.inGroup` ring don't visually conflict (different elements, different layers).

- [ ] **Step 5: Fix findings; re-push; re-review until verdict is `clean enough to stop`.**

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "Avatar: status dot + name tooltip + AvatarGroup (Slack-style stacked row)" --body "$(cat <<'EOF'
## Summary

- New `<AvatarGroup>` component — horizontal stack of `<Avatar>`s with `+N` overflow when count exceeds `max` (default 4). Group's `size` propagates to all children via context. `onOverflowClick(event, hiddenCount)` is the only overflow hook — the library does NOT render its own popover; consumer composes whatever popover / modal / route fits.
- `<Avatar>` gains `status?: 'online' | 'busy' | 'away' | 'offline'` (presence dot bottom-right) and `tooltip?: boolean` (wraps in `<Tooltip>` with `content={name}`).
- Inside an `<AvatarGroup>`, the group's `size` and `tooltip` defaults take over for each child (per-child override still wins).
- Eight new tokens: four presence colors (aliases over existing semantic palette), three presence-dot sizes, three avatar-overlap amounts.

## Test plan

- [x] `npm test --run` — all green, including new Avatar + AvatarGroup tests.
- [x] `npm run typecheck` clean
- [x] `npm run lint:css` clean
- [x] `npm run build` clean
- [x] `npx prettier --check` clean
- [x] `npm pack --dry-run -w @eocrm/design-system` — no test files in tarball
- [x] Manual smoke (Playwright) — status colors, tooltip on hover, overflow handler fires, three group sizes render correctly.
- [x] Hard Rule 8 review cycle — final verdict: clean enough to stop.

## Design spec / plan

- Spec: `docs/superpowers/specs/2026-05-21-avatar-group-status-design.md`
- Plan: `docs/superpowers/plans/2026-05-21-avatar-group-status.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

Spec coverage:

- §Avatar status → Tasks 4, 5.
- §Avatar tooltip → Tasks 4, 5.
- §AvatarGroup → Tasks 3, 6, 7.
- §Tokens → Task 2.
- §Playground demo → Task 8.
- §AGENTS.md → Task 9.

Type consistency:

- `AvatarStatus` exported and re-exported from both barrels.
- `AvatarGroupProps` exported and re-exported from both barrels.
- `AvatarGroupContext` + `useAvatarGroup` are internal (NOT re-exported from `src/index.ts`; only used inside the Avatar folder).

No placeholders. Each task includes the complete code. The Task 6 SCSS correction inline (`.groupSize-*` instead of `:global`) is the version to implement.
