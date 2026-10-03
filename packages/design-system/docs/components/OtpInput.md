# `<OtpInput>` — one-time-code field

```tsx
const [code, setCode] = useState('');
<OtpInput value={code} onChange={setCode} onComplete={verify} />;
<OtpInput length={4} type="alphanumeric" aria-label="Invite code" />;
```

- `length` boxes (default `6`), one character each, behaving as a single control.
- Every box carries `autocomplete="one-time-code"` + `inputMode`, so iOS and Android offer the code from a just-arrived SMS/email above the keyboard. No WebOTP — it is Android-Chrome-only and needs an origin-bound SMS body.
- Focus advances as characters are typed. Boxes select their content on focus, so typing over a filled box replaces it, and a delivery shorter than the full code (a keystroke, or a short paste) spreads from whichever box is focused. A delivery of EXACTLY the full length — SMS/email autofill dumping it into whichever box happens to be focused — replaces the whole value instead of splicing in at that position. A delivery LONGER than the full length (an over-long paste) still splices in at the focused box and truncates, the same as a short delivery. **Never cap a box at one character** — that truncates an autofilled code to its first digit.
- `value` / `defaultValue` / `onChange(value)` — a single contiguous string, always sanitized and never longer than `length`. `onComplete(value)` fires whenever the code becomes full with a new value — including a corrected digit inside an already-full code, not just the first empty→full transition; retyping the same value does not re-fire. Use it to submit.
- `type`: `'numeric'` (default, digits only) or `'alphanumeric'` (digits + Latin letters, uppercased).
- `size`: `sm` / `md` (default) / `lg` — the same height scale as `<Input>` — plus `xl` (48px cells, no Input counterpart) for a code field that is the whole screen; six cells still fit a phone.
- `invalid` sets the error chrome and `aria-invalid` on every box; `aria-describedby` is applied to every box too, so the error is heard wherever focus lands. Inside `<Field error>` this is wired for you.
- Roving tabindex — the whole group is one Tab stop. Arrows / Home / End move between boxes; Backspace on an empty box steps back. Deleting mid-code clears from that box onward, keeping the value contiguous.
- Never masks. For a secret the user must not see → `<PasswordInput>`.
- Not a native form control — it renders no named field, so nothing reaches `FormData`. Read the code from `onChange` / `onComplete` and submit it yourself. `required` sets `aria-required` on every box, not the group (`role="group"` doesn't support `aria-required`; a per-cell native `required` would instead pass a 1-of-`length` code as valid); validating completeness is yours.
