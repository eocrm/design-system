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
```

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
- ❌ Using `tone="error"` for non-critical warnings. Reserve `error` for genuine failures.
- ❌ Multiple stacked Alerts above a page — pick one (most urgent tone) or compose into the page layout with explicit hierarchy.
- ❌ A live Alert (the default) for content that exists when the page opens, especially one per list item — each is a live region and some screen readers queue an announcement per item. Pass `live={false}`.
- ❌ `live={false}` for a message that appears in response to an action (a failed save) — it is never announced. For a must-hear reactive message use `tone="error"` (`role="alert"` is announced on insertion) or a Toast.
