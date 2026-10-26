# `<Input>` — single-line text

```tsx
<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
<Input invalid value={email} aria-describedby="email-error" />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `invalid` | `boolean` | no | Toggles the error visual (red border + focus ring) and sets `aria-invalid="true"`. Pair with a visible error message and `aria-describedby` pointing at the message id. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Visual size. Defaults to `'md'`. - `'sm'` — 24px tall; toolbars, secondary forms. - `'md'` — 32px tall (default); most form contexts. - `'lg'` — 40px tall; hero search, mobile-friendly forms. Same scale as `<Select>`; fields have no `xs` (unlike `<Button>`). Note: this shadows the native HTML `<input size>` attribute (visible character count). If you need that legacy attribute, set width via `style` or a parent container. |
| `disableAutofill` | `boolean` | no | Block browser autofill AND password managers from offering to fill this input. Applies the standard set of opt-out hints: - `autoComplete="off"` - `data-1p-ignore` (1Password) - `data-lpignore="true"` (LastPass) - `data-form-type="other"` (generic "not a login field") **Smart default**: when omitted, the input blocks autofill iff `autoComplete` is also omitted (or `'off'`). Explicit autocomplete hints (`autoComplete="email"`, `"current-password"`, `"username"`, etc.) opt back IN to autofill — the assumption is that a consumer specifying autoComplete actually wants password-manager interaction. Pass `disableAutofill={true}` to force-block even with an autocomplete hint, or `false` to force-allow (except while `suggestions` is active, which always blocks). |
| `suggestions` | `readonly string[]` | no | Values to suggest while the value stays free text (e.g. the user's other workspace slugs). Makes the input an ARIA combobox with a suggestion list: it opens on focus, click or ↓ showing every suggestion, then filters by case-insensitive substring once the user types. ↑/↓ + Enter or a click fills the value and fires `onChange` exactly as typing would. Ignored when empty or `readOnly`. Browser autofill is forced off while active (even with an `autoComplete` hint) so its dropdown can't stack on this one. Default: none (a plain textbox). For a fixed set of allowed values use `<Select>` instead. |
| …native | | | plus native `<input>` attributes |

<!-- props:end -->

- All native `<input>` attributes pass through, except `size` — that's been replaced by the component-level `size` prop (the native HTML `size` attribute, visible-character count, is shadowed).
- **Autofill is BLOCKED by default** — `<Input />` carries `autoComplete="off"` + the 1Password / LastPass / generic data-\* opt-out hints so password managers don't misfire on search / filter / free-text fields. Set `autoComplete="email"` (or `"username"`, `"current-password"`, etc.) to opt INTO autofill for real form fields. Force the behavior either way via `disableAutofill={true | false}`.
- Validation logic lives in your form layer (React Hook Form + Zod recommended), not in the component.
- Not for multi-line (`Textarea`), a fixed list (`Select` — `suggestions` never restricts the value), date/time (`DatePicker` / `DateRangePicker`) or password reveal (`PasswordInput`).
- ❌ Putting validation logic inside the component. ❌ Using `placeholder` as a label — it disappears on focus; pair the Input with a real `<label>`. ❌ `type="number"` for phone numbers or zip codes — it strips leading zeros; use `inputMode="numeric"`.

```tsx
<Input size="sm" placeholder="Filter…" />
<Input size="lg" type="search" placeholder="Search the workspace" />
<Input invalid value={value} aria-describedby="email-error" />
<p id="email-error">Enter a valid email.</p>
```

## Suggestions

Free text plus suggestions — e.g. a workspace slug prefilled with the last one used, suggesting the user's others:

```tsx
<Input
  value={workspace}
  onChange={(e) => setWorkspace(e.target.value)}
  suggestions={['acme', 'acme-staging', 'northwind']}
/>
```

- The input becomes an ARIA combobox with a listbox named "Suggestions" (i18n `input.suggestions`). Without `suggestions` (or with `[]`, or when `readOnly`) it is a plain textbox.
- The list opens whenever the input gains focus — including Tab traversal, `autoFocus` and focus returned by a Modal — not only on click.
- While `suggestions` is active, browser autofill is forced off (as `disableAutofill`) even if you pass a real `autoComplete`, so the browser dropdown cannot stack on this one.
- Opens on focus, click or ↓ and shows **every** suggestion until the user edits the text, so a prefilled value doesn't hide the rest; then it filters by case-insensitive substring, in the given order. No matches → it stays closed (no "no results" row).
- ↓/↑ move the highlight (wraps; nothing highlighted at first). Enter on a highlight or a click fills the value and fires `onChange` exactly like typing (controlled and uncontrolled). Enter with no highlight stays native (submits the form). Esc, Tab and blur close without changing the value.
- The popup matches the input's width, flips when there's no room below and scrolls past `--input-suggestions-max-height`.
- ❌ A fixed set of allowed values → `Select` (or `Select creatable`). ❌ Async / loaded results, groups or rich rows → `Select` with `loadOptions`, or `TopBar.Search`. ❌ Re-adding a native `<datalist>` — it looks different per browser and `Input` turns browser autocomplete off.
