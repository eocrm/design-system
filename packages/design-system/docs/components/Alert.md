# `<Alert>` — persistent in-flow notification

Tone-driven banner for messages that need to stay visible while the user reads the page (subscription warnings, save failures, "update available" notices). Complements `<Toast>` (transient).

```tsx
import { Alert } from '@eocrm/design-system';

// Basic
<Alert tone="info" title="Synced 5 minutes ago" />
<Alert tone="warning">Your storage is at 85% capacity.</Alert>

// With actions
<Alert tone="warning" title="Update available" actions={<Button size="sm">Reload</Button>}>
  A new version is ready. Reload to apply.
</Alert>

// Dismissible (controlled by consumer)
const [show, setShow] = useState(true);
{show && (
  <Alert tone="success" onDismiss={() => setShow(false)}>
    Changes saved.
  </Alert>
)}

// Static callout that is part of the page, not a status change (no live region)
<Alert tone="warning" live={false} title="Needs action">
  The client asked for a revised quote by Friday.
</Alert>

// Custom icon / suppressed icon
<Alert tone="info" icon={<Bell size={16} />} title="New mention" />
<Alert tone="info" icon={null}>Quietly informative.</Alert>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `tone` | `AlertTone` | no | — | Tone. Defaults to `'info'`. See `AlertTone` for full descriptions. |
| `title` | `ReactNode` | no | — | Optional bold heading. Renders above the description. ReactNode so you can embed inline emphasis (`<>Update <strong>1.2.3</strong> available</>`). The native HTML `title` attribute (tooltip-on-hover) is collapsed by this prop. Use `aria-label` if you need that. |
| `children` | `ReactNode` | no | — | Description body. Rendered below the title in muted color. |
| `icon` | `ReactNode` | no | — | Override the tone's default icon. Pass any ReactNode (typically a lucide-react icon). Pass `null` to hide the icon entirely. Defaults: `info` → `Info`, `success` → `CheckCircle2`, `warning` → `AlertTriangle`, `error` → `XCircle`. |
| `actions` | `ReactNode` | no | — | Optional action row rendered below the description. Typically a single Button or a Cluster of two ("Retry", "Dismiss"). The component doesn't manage the action row's layout — pass a pre-laid-out node. |
| `live` | `boolean` | no | true | Whether the Alert is a live region. Defaults to `true`: `role="status"` (polite), or `role="alert"` (assertive) for `tone="error"` — right for a message that APPEARS in response to something (a save failed, an update arrived). Pass `false` for a callout that is simply part of the page when it opens — a "Needs action" note in each card of a list, a standing warning in a form. It renders `role="note"` with the same visuals and no live semantics, so screen readers read it in place instead of announcing it. N live Alerts mounting together can queue N announcements. The tone is shown by the icon's shape and the colour only; it is not exposed to assistive tech in either mode (the icon is decorative). With `live={false}`, `tone="error"` also loses the "alert" role that browse-mode readers speak. So put the urgency in `title` ("Needs action"). Decide it at mount: flipping `false` → `true` on a mounted Alert turns content that is already there into a live region, which announces nothing. |
| `onDismiss` | `(() => void)` | no | — | Called when the user clicks the close (×) button. When set, the close button renders; when omitted, no close button. Alert is **controlled** — the component does NOT manage internal hidden state. Hide via conditional render in the consumer: ```tsx const [show, setShow] = useState(true); {show && <Alert tone="success" onDismiss={() => setShow(false)}>Saved</Alert>} ``` |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- **Four tones** (`info` / `success` / `warning` / `error`). Default icon + accent stripe per tone.
- **`role="alert"`** only for `error` (assertive, interrupts SR). Others use `role="status"` (polite). Both only while `live` (the default).
- **`live={false}`** for a static callout that is part of the page when it opens (a "Needs action" note in each card of a list): renders `role="note"`, the same visuals, and no live region, so N of them don't queue N announcements. Keep the default for messages that appear in response to something. The tone (icon + colour) is never exposed to assistive tech, and `tone="error" live={false}` also loses the spoken "alert" role, so put the urgency in `title`. Decide `live` at mount: flipping it later announces nothing.
- **Persistent** — no auto-dismiss. Use Toast for transient messages.
- **Controlled dismiss** — `onDismiss` callback fires on × click; consumer hides via conditional render.
- **`icon={null}`** suppresses the icon entirely; any ReactNode overrides the default.

#### When NOT to use

- ❌ Transient confirmations → `<Toast>` / `toast.success(...)`.
- ❌ Empty-state placeholders ("No deals yet") → `<EmptyState>`.
- ❌ Form-field validation messages → inline error text + `aria-describedby`.
- ❌ Destructive confirmations needing yes/no → `<ConfirmationPopover>` or `<Modal>`.

#### Anti-patterns

- ❌ Auto-dismissing the Alert with a `setTimeout` — that's what Toast is for.
- ❌ Using `tone="error"` for non-critical warnings. Reserve `error` for genuine failures; `role="alert"` interrupts screen readers.
- ❌ Multiple stacked Alerts above a page — pick one (most urgent tone) or compose into the page layout with explicit hierarchy.
- ❌ A live Alert (the default) for content that exists when the page opens, especially one per list item — each is a live region and some screen readers queue an announcement per item. Pass `live={false}`.
- ❌ `live={false}` for a message that appears in response to an action (a failed save) — it is never announced. For a must-hear reactive message use `tone="error"` (`role="alert"` is announced on insertion) or a Toast. A polite live Alert that mounts together with its text is not reliably announced either.
