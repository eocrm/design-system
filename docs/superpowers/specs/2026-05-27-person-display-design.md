# PersonDisplay — Avatar + name (+ optional description lines)

**Status:** approved (design phase) · **Date:** 2026-05-27 · **Branch:** `feat/person-display`

## Problem

The Avatar-plus-name pattern is the single most-duplicated composition in the playground mockups. A codebase survey found ~10 sites that hand-roll it: every one composes `Cluster + Avatar + Stack + Text` (sometimes `+ Link`, sometimes `+ Badge`), and every one differs slightly — different Avatar sizes, different Text sizes, different gaps. Each site is correct in isolation; together they drift.

Concrete sites:

| Mockup | Where | Shape |
|---|---|---|
| `Contacts` table | Name column | Avatar `sm` + `<Link>` name + muted title |
| `Contacts` table | Owner column | Avatar `sm` + plain name |
| `Audit` table | Actor column | Avatar `sm` + name + email + (optional) impersonation Badge |
| `Members` table | Active tab | Avatar `md` with `status` dot + name + email |
| `Members` table | Invitations tab | Avatar `sm` + plain name |
| `ContactDetail` sidebar | Owner card | Avatar `md` + name + role |
| `ContactDetail` timeline | Activity row | Avatar `sm` + name (bold) + action sentence + timestamp |
| `Dashboard` activity card | Recent activity | Avatar `sm` + name + action + timestamp |
| `Dashboard` recent contacts | Micro card | Avatar `md` + name + title |
| `SelectDemo` | Custom option render | Avatar `sm` + name + email |

The drift is real (some sites use `Cluster gap="sm"`, others `gap="xs"`; some put the name in `<Text size="sm">`, others in `<Text>` with no size). Without a shared primitive, every new mockup or CRM page invents another variant — and the audit-style "impersonation" inline marker shows that the description slot needs to accept more than plain text.

## Goal

Ship `<PersonDisplay>` — a compound display primitive in `@eocrm/design-system` modeling "Avatar + Name (+ optional description lines)". Three sizes: `sm` / `md` (default) / `lg`. First consumers are the existing mockup sites listed above — adopting `PersonDisplay` removes the per-site composition.

**Non-goals:** trailing action slot (menus, buttons), built-in impersonation Badge, vertical / centered layout, multi-person stacks (use `<AvatarGroup>`), tooltip on Avatar (Avatar's own props handle this).

## Design

### API shape

Compound primitive: `<PersonDisplay>` root + `<PersonDisplay.Avatar>` + `<PersonDisplay.Name>` + `<PersonDisplay.Description>`. Description is a repeatable slot — pass one per line.

```tsx
import { PersonDisplay } from '@eocrm/design-system';

// Canonical: avatar + linked name + email
<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Sarah Chen" src="/avatars/sarah.png" />
  <PersonDisplay.Name href="/contacts/sarah-chen">Sarah Chen</PersonDisplay.Name>
  <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
</PersonDisplay>

// Plain name (no link), multiple description lines
<PersonDisplay size="md">
  <PersonDisplay.Avatar name="Marcus Vega" />
  <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
  <PersonDisplay.Description>marcus@acme.com</PersonDisplay.Description>
  <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
</PersonDisplay>

// Tight table cell — sm
<PersonDisplay size="sm">
  <PersonDisplay.Avatar name="Avery Liu" />
  <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
</PersonDisplay>

// Detail page hero — lg with status dot
<PersonDisplay size="lg">
  <PersonDisplay.Avatar name="Priya Mehta" src="..." status="online" />
  <PersonDisplay.Name href="/members/priya">Priya Mehta</PersonDisplay.Name>
  <PersonDisplay.Description>priya@acme.com</PersonDisplay.Description>
  <PersonDisplay.Description>Customer Success Manager</PersonDisplay.Description>
</PersonDisplay>

// Description can hold a Badge inline (covers audit's "impersonating" marker)
<PersonDisplay size="md">
  <PersonDisplay.Avatar name="System Admin" />
  <PersonDisplay.Name>System Admin</PersonDisplay.Name>
  <PersonDisplay.Description>
    admin@acme.com <Badge tone="warning" size="sm">impersonating Sarah Chen</Badge>
  </PersonDisplay.Description>
</PersonDisplay>
```

### Types

```tsx
import type { HTMLAttributes, ReactNode } from 'react';
import type { AvatarProps } from '../Avatar';

export type PersonDisplaySize = 'sm' | 'md' | 'lg';

export interface PersonDisplayProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual size of the entire composition. `md` is the default — suits
   * sidebars, members lists, and most card / table contexts. `sm` is the
   * compact density for tight table cells; `lg` is the detail-page hero
   * size. Propagates to the Avatar size and the Name / Description text
   * sizes via context.
   */
  size?: PersonDisplaySize;
  children: ReactNode;
}

// PersonDisplay.Avatar — drops `size` from Avatar's props because the
// root's `size` controls the Avatar size via context.
export interface PersonDisplayAvatarProps extends Omit<AvatarProps, 'size'> {}

export interface PersonDisplayNameProps extends HTMLAttributes<HTMLElement> {
  /**
   * When set, renders the name as a `<Link>` to this URL. Use for
   * navigable people (contacts, members) where the row links to a
   * detail page. Omit for read-only displays (audit actor, activity
   * timeline) where the name is plain text.
   */
  href?: string;
  children: ReactNode;
}

export interface PersonDisplayDescriptionProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * One line of descriptive metadata — email, role, company, etc.
   * Repeat the subcomponent for additional lines; each renders on its
   * own row beneath the name. Accepts arbitrary `ReactNode` children
   * so consumers can inline a `<Badge>` or other small decoration
   * (e.g., audit's "impersonating" marker).
   */
  children: ReactNode;
}
```

### Visual anatomy

```
┌─────────────────────────────────────────────┐
│  ╭───╮   Sarah Chen          ← Name (Link)  │
│  │ SC│   sarah@acme.com      ← Description  │
│  ╰───╯   Account Executive   ← Description  │
│   ↑                                          │
│  Avatar                                      │
└─────────────────────────────────────────────┘
```

- **Root** — `<div>` rendered as a horizontal `display: flex; align-items: center; gap: var(--space-3)`. Root carries a React Context with `size`. No `role` is forced.
- **Avatar** — `<PersonDisplay.Avatar>` renders `<Avatar>` with `size` read from context. All other Avatar props (`name`, `src`, `status`, `initialsTone`, `alt`, etc.) flow through unchanged.
- **Name + Description stack** — wrapped in an internal `<Stack gap="0">` (no library prop pollution — done via `display: flex; flex-direction: column`). Name is the first child; descriptions stack below.
- **Name** — `<span>` containing `<Text size={...}>` (or a `<Link>` when `href` is set). Text size keyed off context.
- **Description** — `<span>` containing `<Text size={...} tone="muted">`. Multiple instances are siblings inside the column.

### Size map

The `size` prop on Root controls three things via context:

| Root `size` | Avatar `size` | Name `<Text size>` | Description `<Text size>` |
|-------------|---------------|--------------------|---------------------------|
| `sm`        | `sm`          | `sm`               | `xs`                      |
| `md`        | `md`          | `md`               | `sm`                      |
| `lg`        | `lg`          | `lg`               | `md`                      |

Root gap also scales: `sm` → `var(--space-2)`, `md` → `var(--space-3)`, `lg` → `var(--space-3)` (the avatar grows but the descriptive text doesn't crowd it; one gap step is enough between `md` and `lg`).

Confirmed against the existing primitives: `AvatarSize = 'sm' | 'md' | 'lg'` and `TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'` — every size in the map above resolves to a real token without fallback.

### Composition

| Layer | Built from |
|---|---|
| Root container | hand-rolled `<div>` with `display: flex; align-items: center; gap` keyed off `data-size`. No layout-property leakage because Root IS layout — it owns its inner flex by definition (Hard rule 4 carve-out for explicitly-layout primitives like `Cluster` itself). |
| Avatar | `<Avatar>` with `size` from context |
| Name | `<Text>` or `<Link>` (depending on `href`) |
| Description | `<Text tone="muted">` |
| Name+Description column | internal `<div>` with `display: flex; flex-direction: column` |

`<Stack>` / `<Cluster>` are NOT used internally because Root is itself a layout primitive — adding another layout wrapper for the inner column would be redundant.

### Accessibility

- **Root** does NOT carry a `role`. It's a presentational grouping; the underlying semantics come from the children (Link, Text).
- **Avatar** owns its own `aria-label` via `name` prop (existing Avatar behavior). When the Name renders as a `<Link>` AND the avatar is decorative duplication of that name, the avatar's existing `name`-derived alt is technically duplicate-but-harmless announcement — same pattern as Contacts row today.
- **Name** is either `<Text>` (no role) or `<Link>` (real anchor). No extra ARIA.
- **Description** is plain text; no role.

If a consumer needs the entire row to be a single clickable target, they wrap `PersonDisplay` in their own `<Link>` — outside scope of this primitive.

### File layout

```
packages/design-system/src/components/PersonDisplay/
  PersonDisplay.tsx              ← Root + Avatar + Name + Description (one file)
  PersonDisplay.module.scss      ← Token-only sizing + gap map
  PersonDisplay.test.tsx         ← Hard rule 1 + size propagation + href→Link behavior
  index.ts                       ← Public re-exports
```

### Public exports

`packages/design-system/src/index.ts`:

```ts
export { PersonDisplay } from './components/PersonDisplay';
export type {
  PersonDisplayProps,
  PersonDisplayAvatarProps,
  PersonDisplayNameProps,
  PersonDisplayDescriptionProps,
  PersonDisplaySize,
} from './components/PersonDisplay';
```

Manifest cluster: `Display` (sits next to Avatar, Badge, Code).

### Tests

Per Hard rule 1 minimum + behavior:

**Render-level:**
- Renders without crash with default props (size=md, single name).
- Renders Avatar, Name, Description all together.
- `size="sm"` propagates Avatar `size="sm"` (queryable via Avatar's data-attr or rendered class).
- `size="lg"` propagates Avatar `size="lg"`.
- Name with no `href` renders as `<Text>` (no anchor).
- Name with `href="..."` renders as `<Link>` (`<a href="...">`).
- Two Description subcomponents both render and stack vertically.
- Description accepts arbitrary children (`<Badge>` inside Description renders).
- `className` on root, Avatar, Name, Description all merge with internal classes.
- Avatar's `status` prop passes through (status dot renders).
- ref forwarding: Root forwards to the underlying `<div>`; Avatar/Name/Description forward to their respective DOM nodes.

**Behavior:**
- Clicking a `<PersonDisplay.Name href="...">` is a normal anchor navigation (no preventDefault; nothing fancy).
- `type` and `data-*` attribute spread reaches the root `<div>`.

## Demo + cross-link wiring

- Create `packages/playground/src/pages/components/PersonDisplayDemo.tsx` with `DemoLayout` + `Example` + `InputExample`. Examples:
  - All three sizes side by side (sm / md / lg) with the same person to compare scale
  - Avatar + name only (the Contacts owner-column shape)
  - Avatar + linked name + description (Contacts row shape)
  - Avatar + name + two descriptions (ContactDetail owner-card shape)
  - Avatar with status dot + name + email (Members shape)
  - Description with inline Badge (audit impersonation shape)
- Wire into `App.tsx` (`/components/person-display`), `AppShell.tsx` (Display cluster), `ComponentsIndex.tsx` overview card.
- Add `'PersonDisplay'` to the `ComponentName` union in `packages/playground/src/pages/mockups/registry.ts`.
- Add a `PersonDisplay` section to `packages/design-system/AGENTS.md` (alphabetical, near Avatar).

## Mockup migrations (in this PR)

After the primitive ships, refactor all surveyed sites to use `<PersonDisplay>`:

| Mockup | What changes |
|---|---|
| `Contacts.tsx` — Name column | Replace Cluster+Avatar+Stack+Link+Text with `<PersonDisplay size="sm">` (Name uses `href`) |
| `Contacts.tsx` — Owner column | `<PersonDisplay size="sm">` with no `href` on Name |
| `Audit.tsx` — Actor column | `<PersonDisplay size="sm">` with Description holding email; impersonation Badge inlined inside the second Description |
| `Members.tsx` — Active tab | `<PersonDisplay size="md">` with Avatar `status` for online dot |
| `Members.tsx` — Invitations tab | `<PersonDisplay size="sm">` with name only |
| `ContactDetail.tsx` — Owner card | `<PersonDisplay size="md">` (name + role) |
| `ContactDetail.tsx` — Timeline rows | `<PersonDisplay size="sm">` with one Description holding the action + timestamp inline (or keep timestamp outside the display — implementation decides per-row layout) |
| `Dashboard.tsx` — Recent activity | `<PersonDisplay size="sm">` similar to timeline |
| `Dashboard.tsx` — Recent contacts | `<PersonDisplay size="md">` |
| `SelectDemo.tsx` — Custom option render | `<PersonDisplay size="sm">` (Replaces hand-rolled `<span>` + `<small>`) |

Each migrated mockup adds `'PersonDisplay'` to its `usesComponents` array. Where the migration removes the last reference to a previously-listed primitive (unlikely — Avatar / Text / Link are used elsewhere too), drop that entry.

## Out of scope

1. **Trailing action slot.** No `actions` prop or `<PersonDisplay.Actions>` subcomponent. Buttons, dropdown menus, "View" links remain row-level / card-level concerns; the display ends at the description block. Wrapping a PersonDisplay in a parent `<Cluster>` with a `<Button>` sibling is the consumer's pattern.
2. **Built-in impersonation Badge.** Audit's "impersonating X" marker is composed via a `<Badge>` inline inside a `<PersonDisplay.Description>` child. PersonDisplay doesn't know about impersonation — it's an audit-domain concept.
3. **Vertical / centered layout.** Always horizontal. A profile card with a centered hero avatar is a different primitive (or hand-composed for now).
4. **Multi-person stacks.** That's `<AvatarGroup>`. PersonDisplay represents one person.
5. **Tooltip on Avatar.** The Avatar primitive already exposes whatever it exposes; PersonDisplay doesn't add a tooltip layer.
6. **`Name` truncation.** No `truncate` prop. If a consumer's column needs ellipsis, they constrain the column width via their layout and rely on CSS `text-overflow: ellipsis` on the underlying Text (which Text already supports or can be added in a separate spec).
7. **Selection / hover affordance.** No "selected" or "interactive" state. If a consumer wants the whole row to be clickable, they wrap PersonDisplay in their own Link.
