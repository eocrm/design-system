# `<Input>` — single-line text

```tsx
<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
<Input invalid value={email} aria-describedby="email-error" />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `invalid` | `boolean` | no | — | Toggles the error visual (red border + focus ring) and sets `aria-invalid="true"`. Pair with a visible error message and `aria-describedby` pointing at the message id. |
| `size` | `InputSize` | no | — | Visual size. Defaults to `'md'`. - `'sm'` — 24px tall; toolbars, secondary forms. - `'md'` — 32px tall (default); most form contexts. - `'lg'` — 40px tall; hero search, mobile-friendly forms. Same scale as `<Select>`; fields have no `xs` (unlike `<Button>`). Note: this shadows the native HTML `<input size>` attribute (visible character count). If you need that legacy attribute, set width via `style` or a parent container. |
| `disableAutofill` | `boolean` | no | — | Block browser autofill AND password managers from offering to fill this input. Applies the standard set of opt-out hints: - `autoComplete="off"` - `data-1p-ignore` (1Password) - `data-lpignore="true"` (LastPass) - `data-form-type="other"` (generic "not a login field") **Smart default**: when omitted, the input blocks autofill iff `autoComplete` is also omitted (or `'off'`). Explicit autocomplete hints (`autoComplete="email"`, `"current-password"`, `"username"`, etc.) opt back IN to autofill — the assumption is that a consumer specifying autoComplete actually wants password-manager interaction. Pass `disableAutofill={true}` to force-block even with an autocomplete hint, or `false` to force-allow. |
| …native | | | | plus native `<input>` attributes |

<!-- props:end -->

- All native `<input>` attributes pass through, except `size` — that's been replaced by the component-level `size` prop (the native HTML `size` attribute, visible-character count, is shadowed).
- **Autofill is BLOCKED by default** — `<Input />` carries `autoComplete="off"` + the 1Password / LastPass / generic data-\* opt-out hints so password managers don't misfire on search / filter / free-text fields. Set `autoComplete="email"` (or `"username"`, `"current-password"`, etc.) to opt INTO autofill for real form fields. Force the behavior either way via `disableAutofill={true | false}`.
- Validation logic lives in your form layer (React Hook Form + Zod recommended), not in the component.
- Not for multi-line (`Textarea`), a fixed list (`Select`), date/time (`DatePicker` / `DateRangePicker`) or password reveal (`PasswordInput`).
- ❌ Putting validation logic inside the component. ❌ Using `placeholder` as a label — it disappears on focus; pair the Input with a real `<label>`. ❌ `type="number"` for phone numbers or zip codes — it strips leading zeros; use `inputMode="numeric"`.

```tsx
<Input size="sm" placeholder="Filter…" />
<Input size="lg" type="search" placeholder="Search the workspace" />
<Input invalid value={value} aria-describedby="email-error" />
<p id="email-error">Enter a valid email.</p>
```
