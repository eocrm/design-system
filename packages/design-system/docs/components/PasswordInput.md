# `<PasswordInput>` — password field with eye toggle + optional warnings

```tsx
<PasswordInput name="password" placeholder="Password" />
<PasswordInput capsLockWarning wrongLayoutWarning name="password" required />
<PasswordInput revealable={false} placeholder="Locked-down (no toggle)" />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `size` | `PasswordInputSize` | no | — | Field height + type scale. Same scale as `<Input>`. Defaults to `'md'`. |
| `invalid` | `boolean` | no | — | Toggles the error visual + sets `aria-invalid="true"`. |
| `revealed` | `boolean` | no | — | Controlled revealed state. Pair with `onRevealChange`. |
| `defaultRevealed` | `boolean` | no | — | Initial revealed state for uncontrolled use. Defaults to `false`. |
| `onRevealChange` | `((revealed: boolean) => void)` | no | — | Called when the user clicks the eye toggle. Receives the next revealed state. |
| `revealable` | `boolean` | no | — | Whether to render the eye toggle button. Defaults to `true`. Set `revealable={false}` for compliance / kiosk screens where revealing is forbidden — the input then behaves like a plain locked-down `<input type='password'>`. |
| `capsLockWarning` | `boolean` | no | — | Opt-in caps-lock detection. When `true`, on every keypress the input reads `event.getModifierState('CapsLock')`; when active, a warning icon + polite `aria-live` announce it. Cleared on blur. Defaults to `false`. Opt in on screens where caps-lock matters (login, password creation, password confirmation). |
| `wrongLayoutWarning` | `boolean` | no | — | Opt-in wrong-keyboard-layout detection. When `true`, detects keystrokes that produce non-ASCII single characters (e.g., Cyrillic `ф` from a Russian layout). Shows a warning icon + polite live region. Cleared on blur. Heuristic, not deterministic — any non-ASCII keystroke triggers. Only enable when the system expects Latin-only password input. Defaults to `false`. |
| …native | | | | plus native `<input>` attributes |

<!-- props:end -->

- Renders a real `<input type='password' | 'text'>` underneath — full autofill, RHF/Zod, form-submission integration.
- Eye toggle (`Eye` / `EyeOff`) flips `type`; `aria-pressed` exposes the state to AT. Toggle aria-labels come from `passwordInput.show` / `passwordInput.hide` in the i18n catalog.
- `revealed` / `defaultRevealed` / `onRevealChange` for controlled / uncontrolled toggle state.
- `revealable={false}` removes the toggle entirely (compliance / kiosk screens).
- `capsLockWarning?: boolean` (default `false`) — opt-in caps-lock detection. When active, `ArrowBigUpDash` icon appears + a polite `aria-live` region announces `passwordInput.capsLockOn` from the i18n catalog. Cleared on blur.
- `wrongLayoutWarning?: boolean` (default `false`) — opt-in non-ASCII-keystroke detection. Catches "typing Cyrillic on a Russian layout when you meant Latin." Heuristic: any single non-ASCII char triggers. DO NOT enable on systems that allow non-Latin passwords. Cleared on blur.
- Both warnings can stack — they render in separate slots with separate live regions.
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<Input>`.
- `Omit<…, 'size' | 'type'>` — component locks `type` to password/text and shadows native `size`.
