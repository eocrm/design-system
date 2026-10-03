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

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `size` | `SwitchSize` | no | — | Visual scale. Defaults to `'md'`. - `'sm'` — 28×16 track, 12px thumb, `--font-size-sm` label. - `'md'` — 36×20 track, 16px thumb, `--font-size-md` label (default). - `'lg'` — 44×24 track, 20px thumb, `--font-size-lg` label. Note: shadows the native HTML `<input size>` attribute (meaningless on checkboxes). |
| `tone` | `SwitchTone` | no | — | Track color when checked. Defaults to `'accent'`. - `'accent'` — blue (default). - `'success'` — green. Use for affirmative toggles ("Enable notifications"). - `'danger'` — red. Use for destructive toggles ("Allow root access"). |
| `checked` | `boolean` | no | — | Controlled checked state. Pair with `onChange`. Omit (with optional `defaultChecked`) for uncontrolled use. |
| `defaultChecked` | `boolean` | no | — | Initial checked state for uncontrolled use. Defaults to `false`. |
| `onChange` | `((checked: boolean, e: ChangeEvent<HTMLInputElement, Element>) => void)` | no | — | Fires when the user toggles the switch. The first arg is the next boolean (convenience); the original change event is the second arg. Matches `<Checkbox>`'s signature. |
| `invalid` | `boolean` | no | — | Toggles `aria-invalid="true"` and adds a danger-tone border to the track. Use when the switch's state has caused a validation error. |
| `loading` | `boolean` | no | — | Shows a spinner inside the thumb and suppresses changes while a toggle persists to a server, keeping the native input focusable so keyboard users retain their place in the form. Announced from a polite live region the Switch owns. `aria-busy` is set too, but nothing reads it — no mainstream screen reader conveys `busy` on a non-live element. The region sits OUTSIDE the `<label>` so it does not join the input's accessible name: the name stays stable while loading, and `getByRole('switch', { name })` keeps matching. The consumer is responsible for managing the optimistic-update flow: ```tsx const [enabled, setEnabled] = useState(initial); const [saving, setSaving] = useState(false); const handleToggle = async (next: boolean) => { setSaving(true); setEnabled(next); // optimistic try { await api.save(next); } catch { setEnabled(!next); } // rollback finally { setSaving(false); } }; <Switch checked={enabled} loading={saving} onChange={handleToggle} /> ``` |
| `children` | `ReactNode` | no | — | Label rendered next to the track. The whole `<label>` is the click target — clicking anywhere toggles. Omit for icon-only switches + pair with `aria-label`. |
| …native | | | | plus native `<input>` attributes |

<!-- props:end -->

- **Native `<input type="checkbox" role="switch">`**. Form submission works; AT announces as switch. `ref` and native attributes (`name`, `value`, `disabled`, `aria-label`) reach the input.
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
