# Alert — design spec

**Date:** 2026-05-23
**Branch:** `feat/alert`
**Scope:** New `<Alert>` component for `@eocrm/design-system` — a persistent in-flow notification primitive. Four tones (info/success/warning/error), single visual variant (subtle tinted background + left accent stripe), optional title/description/icon/actions/dismiss. Complements `<Toast>` (transient, portal-rendered).

## Goal

Fill the persistent-feedback gap. Toast handles transient notifications that auto-dismiss; Alert handles persistent in-flow messages that the user must see while reading the page — "Your subscription expires in 5 days", "Update available — reload to apply", "Save failed: API quota exceeded". Same tone vocabulary as Toast, same icon defaults, but rendered in the document flow at the position the consumer places it.

## Why now

- The CRM has multiple places where persistent feedback belongs (deal-detail pages with "Pending review" status, settings pages with "Changes saved" sticky notice, payment screens with quota warnings). Today these are open-coded with inline `<div className={styles.notice}>` patterns that drift visually.
- Toast is the wrong primitive for these — Toast disappears, but the message needs to stay visible until the underlying condition resolves.
- The feedback family currently has Toast (transient) + EmptyState (full-section "nothing here") + Skeleton (loading). Alert fills the persistent-in-flow slot, completing the family.

## Non-goals (v1)

- **No solid / outline visual variants.** One look: tinted background + left accent stripe + tone-colored icon. Solid (saturated bg) and outline (border-only) variants can be added v2 if a concrete need surfaces.
- **No auto-dismiss timer.** Alert is persistent by definition. If you want auto-dismiss, use Toast.
- **No animation on mount.** Alert sits in the document flow; mount/unmount happens naturally as the consumer conditionally renders. No enter/exit transition.
- **No size variants.** One size. The Alert scales with its content (heading + description + actions).
- **No "compact" variant.** Same — one size, one density.
- **No stacking management.** Multiple Alerts on a page lay out via the consumer's parent (Stack, etc.) — no shared queue / max-visible / collision logic. That's Toast's job.
- **No icon-only mode.** Alert always renders content (title and/or description). For icon-only persistent indicators, use Badge.
- **No floating / sticky positioning.** Alert is a normal flow element. Consumers manage sticky placement via CSS on the parent.
- **No promise integration.** Alert isn't tied to async flows the way `toast.promise` is. If you need "saving…" → "saved", use Toast.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- `lucide-react` peer dep — `Info`, `CheckCircle2`, `AlertTriangle`, `XCircle` for tone icons (matches Toast); `X` for the dismiss button
- Existing tokens: `--color-info`, `--color-info-bg-subtle`, `--color-success`, `--color-success-bg-subtle`, `--color-warning`, `--color-warning-bg-subtle`, `--color-danger`, `--color-danger-bg-subtle`, `--color-fg`, `--color-fg-muted`, `--color-bg`, `--radius-md`, `--space-1`/`--space-2`/`--space-3`/`--space-4`, `--font-size-sm`/`--font-size-md`, `--font-weight-medium`, `--border-width-strong`, `--transition-fast`, `--ring-accent`, `--ring-width`

No new tokens needed.

### File layout

```
packages/design-system/src/components/Alert/
  Alert.tsx           ← forwardRef, tone → role mapping, default-icon table, dismiss button, action slot
  Alert.module.scss   ← wrapper / icon / body / title / description / actions / close + 4 tone variants
  Alert.test.tsx      ← ~18 cases
  index.ts            ← exports Alert + types
```

Plus integration points:

- `packages/design-system/src/index.ts` — re-export `Alert`, `AlertProps`, `AlertTone`
- `packages/design-system/AGENTS.md` — TL;DR slot near Toast / EmptyState (feedback cluster)
- `packages/playground/src/pages/components/AlertDemo.tsx` — 6 examples
- `packages/playground/src/App.tsx` — route at `/components/alert`
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entry in the **Feedback** group (existing group, currently holds Toast); slot alphabetically as first entry
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card
- `packages/playground/src/pages/mockups/registry.ts` — `'Alert'` in `ComponentName` union

### Composition

```
        <Alert tone="warning" title="Update available" onDismiss={...} actions={...}>
          A new version is ready. Reload to apply.
        </Alert>
                          │
                          ▼
                   <div role="status" data-tone="warning">
                          │
                ┌─────────┼──────────┬─────────┐
                ▼         ▼          ▼         ▼
              <Icon>   <body>      <actions> <close>
                       ┌─────┐                  X
                       title
                       desc
```

A single forwardRef component. No subcomponents, no compound API. Title / description / actions / close are all configured via props (not children slots).

## Public API

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** Tone — drives icon, accent stripe color, tinted background, and ARIA role. */
export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends Omit<HTMLAttributes<HTMLElement>, 'role' | 'title'> {
  /**
   * Tone. Defaults to `'info'`.
   * - `'info'` — blue accent. Default for neutral updates.
   * - `'success'` — green accent. Confirmations, "saved successfully".
   * - `'warning'` — orange accent. Non-blocking heads-up ("quota at 90%").
   * - `'error'` — red accent. Failures / blocking issues. Also sets
   *   `role="alert"` (assertive); other tones use `role="status"` (polite).
   */
  tone?: AlertTone;

  /**
   * Optional bold heading. Renders above the description. May be a plain
   * string OR rich content (e.g. `<>Update <strong>1.2.3</strong> available</>`).
   *
   * The native HTML `title` attribute is collapsed by this prop — Alert
   * doesn't surface a tooltip-on-hover. Use `aria-label` if you need that.
   */
  title?: ReactNode;

  /**
   * Description body. Rendered below the title in muted color. Either
   * `title` or `children` (or both) must be set.
   */
  children?: ReactNode;

  /**
   * Override the tone's default icon. Pass any ReactNode (typically a
   * lucide-react icon). Pass `null` to hide the icon entirely.
   *
   * Defaults:
   * - `info` → `Info`
   * - `success` → `CheckCircle2`
   * - `warning` → `AlertTriangle`
   * - `error` → `XCircle`
   */
  icon?: ReactNode | null;

  /**
   * Optional action row rendered below the description. Typically a single
   * Button or a Cluster of two ("Retry", "Dismiss"). The component doesn't
   * manage the action row's layout — pass a pre-laid-out node.
   */
  actions?: ReactNode;

  /**
   * Called when the user clicks the close (×) button. When set, the close
   * button renders; when omitted, no close button. Alert is controlled —
   * the component does NOT manage internal "hidden" state. Hide via
   * conditional render in the consumer.
   */
  onDismiss?: () => void;
}
```

**Spread order — Pattern A (consumer wins)** for most attrs:

```tsx
<div
  ref={ref}
  role={tone === 'error' ? 'alert' : 'status'}
  data-tone={tone}
  {...props}
  className={clsx(styles.alert, TONE_CLASS[tone], props.className)}
>
```

Component-owned attrs that consumer cannot override:
- `role` — derived from tone for ARIA correctness
- `data-tone` — used by SCSS for tone-variant styling
- `className` (spread AFTER props but merges via clsx so consumer's className appends)

## Architecture flow

A near-pure render component. Three branches:

1. **Icon**: read `icon` prop or default per tone; render nothing if `icon === null`
2. **Body**: render `<strong>title</strong>` if title set; render description if children set; render `<div class="actions">{actions}</div>` if actions set
3. **Close**: render `<button aria-label="Dismiss" onClick={onDismiss}>` if onDismiss set

No internal state. No effects. No timers.

```tsx
function Alert({
  tone = 'info',
  title,
  children,
  icon,
  actions,
  onDismiss,
  className,
  ...props
}, ref) {
  const role = tone === 'error' ? 'alert' : 'status';
  const renderedIcon = icon === null ? null : (icon ?? DEFAULT_ICONS[tone]);

  return (
    <div
      ref={ref}
      role={role}
      data-tone={tone}
      {...props}
      className={clsx(styles.alert, TONE_CLASS[tone], className)}
    >
      {renderedIcon && <div className={styles.icon}>{renderedIcon}</div>}
      <div className={styles.body}>
        {title && <strong className={styles.title}>{title}</strong>}
        {children && <div className={styles.description}>{children}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          className={styles.close}
          onClick={onDismiss}
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
```

**Why `<strong>` for the title**: it conveys "strongly emphasized text" semantically without claiming a specific heading level (which would disrupt the page's outline). An Alert is in-flow content; the title isn't a section heading.

**Why role="status"/"alert"** (not aria-live): the implicit `aria-live` of these roles handles announcement. Adding `aria-live` explicitly would be redundant (and Radix/Material confirm this is the pattern).

## Styling — `Alert.module.scss`

```scss
@use '../../styles/mixins' as *;

.alert {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-3);
  align-items: start;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg);     // overridden per tone
  border-radius: var(--radius-md);
  border-left: var(--border-width-strong) solid var(--color-fg-muted);  // overridden per tone
  color: var(--color-fg);
}

.alert[data-tone='info'] {
  background: var(--color-info-bg-subtle);
  border-left-color: var(--color-info);
}

.alert[data-tone='success'] {
  background: var(--color-success-bg-subtle);
  border-left-color: var(--color-success);
}

.alert[data-tone='warning'] {
  background: var(--color-warning-bg-subtle);
  border-left-color: var(--color-warning);
}

.alert[data-tone='error'] {
  background: var(--color-danger-bg-subtle);
  border-left-color: var(--color-danger);
}

.icon {
  display: grid;
  place-items: center;
  // Top-align with the first line of the title (or body if no title).
  // Tweaked via the icon's intrinsic size + the wrapper's place-items: start
  // on the grid parent.
  color: var(--color-fg-muted);
}

.alert[data-tone='info'] .icon { color: var(--color-info); }
.alert[data-tone='success'] .icon { color: var(--color-success); }
.alert[data-tone='warning'] .icon { color: var(--color-warning); }
.alert[data-tone='error'] .icon { color: var(--color-danger); }

.body {
  min-width: 0;     // allow long words/URLs to wrap inside the grid
}

.title {
  display: block;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
  color: var(--color-fg);
}

.description {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
  line-height: 1.5;
}

.title + .description {
  margin-top: var(--space-1);
}

.actions {
  margin-top: var(--space-2);
}

.close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-fg-muted);
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  transition: color var(--transition-fast);

  &:hover {
    color: var(--color-fg);
  }

  &:focus-visible {
    @include focus-ring;

    outline: none;
  }
}
```

**Rule 4 check**:
- `.alert` has `display: grid` + `grid-template-columns` — that's internal layout of the Alert's own children, NOT layout-at-component-boundary. Allowed.
- `padding`, `border-radius`, `border-left` — internal styling, not layout.
- `min-width: 0` on `.body` — needed for grid text wrapping, not layout.
- `margin-top` on `.title + .description` and `.actions` — internal spacing between children, not at component boundary. May need `stylelint-disable-next-line property-disallowed-list -- internal spacing between alert child elements` comments if stylelint flags it.

## ARIA + behavior reference

| Concern | Behavior |
|---|---|
| **Element** | Plain `<div>` (in-flow). |
| **Role** | `role="alert"` for `tone='error'` (assertive); `role="status"` for info/success/warning (polite). |
| **Title** | `<strong>` — semantic emphasis, not a heading. Doesn't disrupt page heading outline. |
| **Description** | `<div>` containing arbitrary ReactNode. |
| **Close button** | Native `<button type="button">` with `aria-label="Dismiss"`. |
| **Focus** | The close button is the only focusable element by default. Action buttons (inside `actions`) are reachable via Tab. |
| **Live announcement** | Implicit from `role="alert"` / `role="status"`. No explicit `aria-live`. |
| **Dismissal model** | Controlled — consumer hides via conditional render. Alert doesn't manage internal hidden state. |

## Testing

`Alert.test.tsx` — ~18 cases.

### Baseline

1. Renders without crashing with default props (tone="info" implicit)
2. Default tone is `info`; `data-tone="info"` set
3. `tone="success"` sets `data-tone="success"` AND `role="status"`
4. `tone="warning"` sets `data-tone="warning"` AND `role="status"`
5. `tone="error"` sets `data-tone="error"` AND `role="alert"` (assertive)
6. `title` renders inside `<strong>`
7. `children` renders inside the description container
8. Both `title` and `children` together render correctly (both present)
9. `className` merges, doesn't replace
10. `ref` forwards to the root `<div>`

### Icon

11. Default icon renders for each tone (e.g., success → CheckCircle2 SVG present)
12. `icon` override replaces the default
13. `icon={null}` hides the icon entirely (no SVG in DOM)

### Actions + dismiss

14. `actions` renders inside `.actions` container
15. `onDismiss` not provided → no close button
16. `onDismiss` provided → close button with `aria-label="Dismiss"` renders
17. Clicking the close button fires `onDismiss`
18. Close button does NOT manage hidden state internally (verifying it's still in the DOM after click; consumer would conditionally unmount)

**Vitest gotchas**:
- The default icon test queries by SVG (lucide-react icons render `<svg>`). Use `container.querySelectorAll('svg').length > 0`.
- The `tone="error"` role test: `expect(screen.getByRole('alert'))...` works because role="alert" is set on the root div.
- The close button click test uses `userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))`.

## Playground demo — `AlertDemo.tsx`

6 examples:

1. **Four tones gallery** — info, success, warning, error side by side with title + description.
2. **Title only** — `<Alert tone="info" title="Synced 5 minutes ago" />`.
3. **Description only** — `<Alert tone="warning">Your storage is at 85% capacity.</Alert>`.
4. **With actions** — `<Alert tone="warning" title="Update available" actions={<Button size="sm">Reload</Button>}>...</Alert>`.
5. **Dismissible** — `useState`-driven hide pattern, with the `onDismiss` callback toggling a flag.
6. **Custom icon + suppressed icon** — side by side: one with a custom Bell icon, one with `icon={null}`.

The viewport mount is irrelevant — Alert is a flow element.

## AGENTS.md TL;DR slot

After `### <ToastViewport> + toast` (Toast section, around line ~578), before `### <ConfirmationPopover>`. Same "feedback" cluster.

```markdown
### `<Alert>` — persistent in-flow notification

Tone-driven banner for messages that need to stay visible (subscription warnings, save failures, "update available" notices). Complements `<Toast>` (transient).

```tsx
import { Alert } from '@eocrm/design-system';

// Basic
<Alert tone="info" title="Synced 5 minutes ago" />
<Alert tone="warning">Your storage is at 85% capacity.</Alert>

// With actions
<Alert tone="warning" title="Update available" actions={<Button size="sm">Reload</Button>}>
  A new version is ready. Reload to apply.
</Alert>

// Dismissible
const [show, setShow] = useState(true);
{show && (
  <Alert tone="success" onDismiss={() => setShow(false)}>
    Changes saved.
  </Alert>
)}
```

- **Four tones** (`info` / `success` / `warning` / `error`). Default icon + accent stripe per tone.
- **`role="alert"`** only for `error` (interrupts SR). Others use `role="status"` (polite).
- **Persistent** — no auto-dismiss. Use Toast for transient messages.
- **Controlled dismiss** — consumer hides via conditional render.

#### When NOT to use

- ❌ Transient confirmations → `<Toast>` / `toast.success(...)`.
- ❌ Empty-state placeholders ("No deals yet") → `<EmptyState>`.
- ❌ Form-field validation messages → inline error text under the field with `aria-describedby`.
- ❌ Destructive confirmations needing yes/no → `<ConfirmationPopover>` or `<Modal>`.

#### Anti-patterns

- ❌ Auto-dismissing the Alert with a setTimeout — that's what Toast is for.
- ❌ Using `tone="error"` for non-critical warnings. Reserve `error` for genuine failures; `role="alert"` interrupts screen readers.
- ❌ Multiple stacked Alerts above a page — use one Alert with the most urgent tone, or compose into the page layout with explicit hierarchy.
```

## Hard Rule 8

The pre-push review-fix cycle on library changes is mandatory. Gates green (`make test`, `make build-lib`, `make build`, `make lint`, `npm pack --dry-run`), spawn fresh-context reviewer with the standard prompt, fix Critical + Important, repeat until clean.

## Open questions

None. All clarifications baked in above.
