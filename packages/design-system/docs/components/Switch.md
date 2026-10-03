# `<Switch>` — binary toggle

Hand-rolled track + thumb on a native `<input type="checkbox" role="switch">`. The dumb on/off toggle for settings, feature flags, and async persisted state.

```tsx
import { Switch } from '@eocrm/design-system';

// Default — uncontrolled, accent tone.
<Switch>Enable notifications</Switch>

// Controlled, success tone.
<Switch tone="success" checked={enabled} onChange={(next) => setEnabled(next)}>
  Daily digest
</Switch>

// Async (server-persisted) toggle.
<Switch
  checked={enabled}
  loading={saving}
  onChange={async (next) => {
    setSaving(true);
    setEnabled(next);            // optimistic
    try { await api.save(next); }
    catch { setEnabled(!next); } // rollback
    finally { setSaving(false); }
  }}
>
  Two-factor auth
</Switch>

// Icon-only.
<Switch aria-label="Mute notifications" />
```

- **Native `<input type="checkbox" role="switch">`**. Form submission works; AT announces as switch.
- **Three tones** (`accent`/`success`/`danger`) for the checked track. Unchecked track is always neutral muted.
- **`loading={true}`** shows a spinner inside the thumb, sets `aria-busy`, announces from its own polite live region, and ignores toggle attempts while keeping the input focusable. Consumer manages the optimistic-update flow. The switch's accessible **name does not change** while loading — you activated it, so the change is announced rather than renamed. `aria-busy` is set for tooling but reaches no screen reader on its own; the live region is what actually speaks.
- **`onChange(checked, event)`** signature matches Checkbox — first arg is the next boolean, second is the raw event.

#### Hard rule

A switch whose toggle triggers an **immediate action** — persisting to a server or firing any side effect — MUST use the async optimistic-update flow: flip the state optimistically, set `loading` while the request is in flight, and roll back on failure (see the async toggle example above). Never fire-and-forget a side-effecting toggle — the user needs the in-flight (`loading`) and rollback feedback. A switch over pure local UI state (no side effect) may toggle synchronously.

#### When NOT to use

- ❌ Selecting one option from a list of mutually-exclusive choices → `<Radio>` / `<RadioGroup>`.
- ❌ Selecting multiple from a list → `<Checkbox>`.
- ❌ A mixed / indeterminate state ("some-but-not-all enabled") → use Checkbox's `indeterminate`.
- ❌ Triggering an action immediately on click (no state) → `<Button>`.

#### Anti-patterns

- ❌ Using `placeholder`-style hints inside the track ("OFF" / "ON" text). Use a real label.
- ❌ Toggle without an external optimistic-update flow when `loading` is set. Without it, the user clicks the switch, the spinner appears, and the visual state never changes — confusing.
- ❌ `tone="success"` for "Mark as failed". Tone communicates the meaning of "on", not just decoration.
