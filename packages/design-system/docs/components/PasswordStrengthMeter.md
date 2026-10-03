# `<PasswordStrengthMeter>` — 4-segment strength visualization

```tsx
<PasswordStrengthMeter value={password} />
// or, with a real scorer (zxcvbn / server-side):
<PasswordStrengthMeter score={zxcvbnScore(password)} />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | no | — | The password to evaluate. Required UNLESS `score` is provided. Evaluated via the default scoring heuristic or a consumer-supplied `scoreFn`. |
| `score` | `PasswordStrengthScore` | no | — | Pre-computed score (0–4). Wins over `value` + `scoreFn` when both are present. Use this when scoring is done by zxcvbn or server-side. |
| `scoreFn` | `((value: string) => PasswordStrengthScore)` | no | — | Custom scoring fn. Receives the password, returns 0–4. Defaults to a length + character-class heuristic — fine for prototypes, NOT a security control. Production should pass a real scorer via `score`. |
| `showLabel` | `boolean` | no | — | Render the textual label next to the segments. Defaults to `true`. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- Two driving modes: `value` (uses default heuristic) or `score` (consumer-provided 0–4). `score` wins when both are set.
- **Default scoring is a UX hint, NOT a security control.** The heuristic flags long+mixed passwords as "Strong" even if they're in a breach corpus. Production deployments should pass `score` from a real scorer.
- Polite `aria-live` region announces label changes ("Weak" → "Fair" → "Strong") so screen-reader users hear progress as they type.
- `showLabel={false}` to hide the textual label (segments only).
- Use `aria-describedby` on the paired `<PasswordInput>` to associate the meter with the field for AT.
