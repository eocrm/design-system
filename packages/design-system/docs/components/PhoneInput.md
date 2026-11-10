# `<PhoneInput>` — E.164 phone field with country picker

International phone field: searchable country picker (DS `Select`) + national-number `Input`, controlled on a single `value: string | null` (**E.164**), `onChange(e164 | null)`. `defaultCountry` (ISO alpha-2) seeds the picker when empty; `countries` restricts the list; `size`/`invalid`/`disabled` pass through. Country names are localized via `Intl.DisplayNames`; metadata/validation via `libphonenumber-js`. Validate with the exported `isValidPhone(e164)` and drive `invalid` (or wrap in `<Field error>`). `countryDisplay` sets how the SELECTED country shows in the trigger — `"code"` (default, `+1`), `"iso"` (`US +1`), `"name"` (`United States +1`), or `"flag"` (`🇺🇸 +1`; emoji flags don't render on Windows Chrome/Edge). Dropdown rows always show the full name + code (searchable); opening the picker selects the text for instant type-to-search; the country can't be cleared. The picker's accessible name is composed from the group's (`<Field label="Phone">` → "Phone Country"), so it never collides with a form's own Country field; `countryLabel` overrides it. Store the emitted E.164, not the formatted display.

```tsx
const [phone, setPhone] = useState<string | null>(null);
<PhoneInput value={phone} onChange={setPhone} defaultCountry="GB" />;
```

**Plain mode (`picker={false}`)** — one `<Input type="tel">`, no country picker. Use it when the server normalises to E.164 and rejects what it can't parse (e.g. a CRM contact form with a single phone field). `onChange` emits the RAW string exactly as typed (untrimmed, never forced to E.164), or `null` when blank. A value starting with `+` is international; anything else is read in `defaultCountry`. While focused the raw value shows; when blurred it is formatted — national for `defaultCountry` numbers, international otherwise; unparseable text shows as typed. `countries`, `countryDisplay` and `countryLabel` are ignored, and labels/`aria-*`/`invalid` go straight to the input (no `role="group"`).

```tsx
const [phone, setPhone] = useState<string | null>(null);
<Field label="Phone">
  <PhoneInput picker={false} value={phone} onChange={setPhone} defaultCountry="GB" />
</Field>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `string \| null` | yes | Controlled value; `null` = empty. - Picker mode (default): E.164 (e.g. `"+442071838750"`). - `picker={false}`: the raw string as typed/stored (e.g. `"020 7183 8750"` or `"+1 202…"`). |
| `onChange` | `(value: string \| null) => void` | yes | Fires on every edit; `null` when empty. - Picker mode (default): canonical E.164, or `null` while the number is still partial. - `picker={false}`: the RAW string exactly as typed (untrimmed, no E.164 forcing), or `null` when empty/whitespace-only. Normalise to E.164 server-side. |
| `picker` | `boolean` | no | Show the country picker. Default `true`. - `true` — searchable country picker + national number input; emits E.164. - `false` — ONE plain `type="tel"` input; emits the raw string (see `onChange`). A value starting with `+` is international, anything else is read in `defaultCountry`. While focused the raw value shows; when blurred it is formatted — national for `defaultCountry` numbers, international otherwise. `countries`, `countryDisplay` and `countryLabel` are ignored, and the root `<div>` has no `role="group"` (labels go straight to the input). |
| `defaultCountry` | `string` | no | ISO 3166-1 alpha-2 country used to seed the picker when `value` is empty (with `picker={false}`: the country a number without `+` is read in, and the one shown in national format). Default `"US"`. |
| `countries` | `string[]` | no | Restrict the picker to this ISO-code subset. Defaults to all libphonenumber-js countries. An empty array is treated as all countries. Ignored with `picker={false}`. |
| `countryDisplay` | `'flag' \| 'iso' \| 'name' \| 'code'` | no | How the SELECTED country renders in the picker trigger. Default `"code"`. - `"code"` — calling code only (`+1`). - `"iso"` — ISO code + code (`US +1`). - `"name"` — full country name + code (`United States +1`). - `"flag"` — emoji flag + code (`🇺🇸 +1`). Note: emoji flags don't render on Windows Chrome/Edge (they show the letters), so prefer `"iso"` there. The dropdown rows always show the full country name + code (plus a flag in `"flag"` mode) so they stay searchable + identifiable regardless of this. Ignored with `picker={false}`. |
| `countryLabel` | `string` | no | Overrides the country picker's full accessible name. By default the picker is named after the group — "<group label> Country" (e.g. "Phone Country") — so it never collides with a form's own Country field; with no group label it is just "Country". Set this when that composed name reads badly. Ignored with `picker={false}`. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Control size, forwarded to the Select + Input. Default `"md"`. |
| `invalid` | `boolean` | no | Error chrome on both controls (host/Field-driven). |
| `disabled` | `boolean` | no | Disable both controls. |
| `required` | `boolean` | no | Mark required (forwarded for Field semantics). |
| `locale` | `string` | no | BCP-47 locale for country-name localization. Defaults to the i18n locale, else `"en"`. |
| `id` | `string` | no | Stable id; placed on the number field so an external `<label htmlFor>` focuses it. |
| `aria-label` | `string` | no | Accessible name when used STANDALONE (outside `<Field>`). A standalone PhoneInput MUST be named via `aria-label` or `aria-labelledby`, else the country/number group is unnamed. Inside `<Field>` the label is wired automatically via `aria-labelledby`. |
| `aria-labelledby` | `string` | no | Ids of elements labelling the group (injected by `<Field>`; takes precedence over `aria-label`). |
| `aria-describedby` | `string` | no | Ids of description/error elements; forwarded to the number field so it is announced on focus (injected by `<Field>`). |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

Inside a `<Field>` the label and error wiring are injected:

```tsx
<Field label="Mobile" error={isValidPhone(phone) ? undefined : 'Invalid number'}>
  <PhoneInput value={phone} onChange={setPhone} />
</Field>
```

**When NOT to use:** a non-phone numeric field — `<Input type="tel">` or `<Input inputMode="numeric">`. Don't use the default picker mode when the backend parses phones itself — use `picker={false}` instead of a bare `<Input type="tel">` so the blurred display is still formatted.

**Anti-patterns**

- ❌ Treating it as uncontrolled — feed `onChange`'s E.164 back into `value`.
- ❌ Storing the formatted national string — persist the emitted E.164; the display is reconstructed from it.
- ❌ Validating by hand — call `isValidPhone(e164)` and pass `invalid` (or wire it through `<Field error>`).
- ❌ Assuming `picker={false}` emits E.164 — it emits the raw string; normalise (and reject) server-side.

**Known limitations**

- Format-as-you-type moves the caret to the end of the number field after each reformat; editing in the middle of the number bounces the caret to the end.
