# `<ToastViewport>` + `toast` — transient notifications

Imperative singleton + one portal. Fire from anywhere; no provider, no hook.

```tsx
import { ToastViewport, toast } from '@eocrm/design-system';

// Mount once at app root
<ToastViewport position="bottom-right" />;

// Fire from anywhere
toast.success('Saved');
toast.error('Request failed', { description: err.message });
toast.success('Item deleted', { action: { label: 'Undo', onClick: restore } });

// Async sugar
toast.promise(api.upload(file), {
  loading: 'Uploading…',
  success: (r) => `Uploaded ${r.name}`,
  error: (e) => `Failed: ${e.message}`,
});

// Update in place
const id = toast.loading('Saving…');
await api.save();
toast.success('Saved', { id });
```

- **One viewport.** Mount exactly one `<ToastViewport>` at the app root. A second one logs a dev-warning and renders null.
- **Five tones.** `info`, `success`, `warning`, `error`, `loading`. `error` is `role="alert"` (assertive); the rest are `role="status"` (polite).
- **Auto-dismiss defaults to 4000ms.** Per-call `duration` (ms or `'persistent'`). `loading` defaults to `'persistent'`.
- **Pause on hover / focus / hidden tab.** Hovering the toast or tabbing into its action pauses the timer; document `visibilitychange` to `hidden` pauses all timers globally.
- **maxVisible: 3 default.** Toasts beyond render as peek-collapsed cards behind the visible stack; hovering the stack fans them out. `expand: true` keeps the stack always fanned.
- **All 6 positions supported** via `<ToastViewport position="…">`. Per-call `position` override exists as an escape hatch but a single global position is the recommended UX.

#### When NOT to use

- ❌ For form validation feedback under the field. That's inline error text, not a toast.
- ❌ For destructive confirmations. Use `<ConfirmationPopover>` or `<Modal>` — the user needs an explicit yes/no decision, not a transient banner.
- ❌ For long-form messages. Toasts are 1–2 lines. If you need more, link to a page from the description.
- ❌ As a substitute for in-page progress UI. A toast can announce "Upload started" but the persistent progress bar belongs in the page.
