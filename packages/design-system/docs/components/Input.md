# `<Input>` — single-line text

```tsx
<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
<Input invalid value={email} aria-describedby="email-error" />
```

- All native `<input>` attributes pass through, except `size` — that's been replaced by the component-level `size` prop (the native HTML `size` attribute, visible-character count, is shadowed).
- `invalid` toggles the error visual + sets `aria-invalid="true"`. Pair with an error message and `aria-describedby`.
- Sizes: `sm` (24px) / `md` (32px, default) / `lg` (40px). Same scale as `<Select>`. (`<Button>` exposes `xs/sm/md/lg`; fields don't ship `xs` yet.)
- **Autofill is BLOCKED by default** — `<Input />` carries `autoComplete="off"` + the 1Password / LastPass / generic data-\* opt-out hints so password managers don't misfire on search / filter / free-text fields. Set `autoComplete="email"` (or `"username"`, `"current-password"`, etc.) to opt INTO autofill for real form fields. Force the behavior either way via `disableAutofill={true | false}`.
- Validation logic lives in your form layer (React Hook Form + Zod recommended), not in the component.
