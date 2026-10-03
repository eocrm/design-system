# `<PasswordInput>` — password field with eye toggle + optional warnings

```tsx
<PasswordInput name="password" placeholder="Password" />
<PasswordInput capsLockWarning wrongLayoutWarning name="password" required />
<PasswordInput revealable={false} placeholder="Locked-down (no toggle)" />
```

- Renders a real `<input type='password' | 'text'>` underneath — full autofill, RHF/Zod, form-submission integration.
- Eye toggle (`Eye` / `EyeOff`) flips `type`; `aria-pressed` exposes the state to AT. Toggle aria-labels come from `passwordInput.show` / `passwordInput.hide` in the i18n catalog.
- `revealed` / `defaultRevealed` / `onRevealChange` for controlled / uncontrolled toggle state.
- `revealable={false}` removes the toggle entirely (compliance / kiosk screens).
- `capsLockWarning?: boolean` (default `false`) — opt-in caps-lock detection. When active, `ArrowBigUpDash` icon appears + a polite `aria-live` region announces `passwordInput.capsLockOn` from the i18n catalog. Cleared on blur.
- `wrongLayoutWarning?: boolean` (default `false`) — opt-in non-ASCII-keystroke detection. Catches "typing Cyrillic on a Russian layout when you meant Latin." Heuristic: any single non-ASCII char triggers. DO NOT enable on systems that allow non-Latin passwords. Cleared on blur.
- Both warnings can stack — they render in separate slots with separate live regions.
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<Input>`.
- `Omit<…, 'size' | 'type'>` — component locks `type` to password/text and shadows native `size`.
