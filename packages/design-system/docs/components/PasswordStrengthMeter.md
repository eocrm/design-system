# `<PasswordStrengthMeter>` — 4-segment strength visualization

```tsx
<PasswordStrengthMeter value={password} />
// or, with a real scorer (zxcvbn / server-side):
<PasswordStrengthMeter score={zxcvbnScore(password)} />
```

- Two driving modes: `value` (uses default heuristic) or `score` (consumer-provided 0–4). `score` wins when both are set.
- **Default scoring is a UX hint, NOT a security control.** The heuristic flags long+mixed passwords as "Strong" even if they're in a breach corpus. Production deployments should pass `score` from a real scorer.
- Polite `aria-live` region announces label changes ("Weak" → "Fair" → "Strong") so screen-reader users hear progress as they type.
- `showLabel={false}` to hide the textual label (segments only).
- Use `aria-describedby` on the paired `<PasswordInput>` to associate the meter with the field for AT.
