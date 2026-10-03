# `<PhoneInput>`

International phone field: searchable country picker (DS `Select`) + national-number `Input`, controlled on a single `value: string | null` (**E.164**), `onChange(e164 | null)`. `defaultCountry` (ISO alpha-2) seeds the picker when empty; `countries` restricts the list; `size`/`invalid`/`disabled` pass through. Country names are localized via `Intl.DisplayNames`; metadata/validation via `libphonenumber-js`. Validate with the exported `isValidPhone(e164)` and drive `invalid` (or wrap in `<Field error>`). `countryDisplay` sets how the SELECTED country shows in the trigger — `"code"` (default, `+1`), `"iso"` (`US +1`), `"name"` (`United States +1`), or `"flag"` (`🇺🇸 +1`; emoji flags don't render on Windows Chrome/Edge). Dropdown rows always show the full name + code (searchable); opening the picker selects the text for instant type-to-search; the country can't be cleared. Store the emitted E.164, not the formatted display.

```tsx
const [phone, setPhone] = useState<string | null>(null);
<PhoneInput value={phone} onChange={setPhone} defaultCountry="GB" />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string \| null` | yes | — | Controlled E.164 value (e.g. `"+442071838750"`); `null` = empty. |
| `onChange` | `(e164: string \| null) => void` | yes | — | Fires with canonical E.164 on every edit; `null` when empty. |
| `defaultCountry` | `string` | no | — | ISO 3166-1 alpha-2 country used to seed the picker when `value` is empty. Default `"US"`. |
| `countries` | `string[]` | no | — | Restrict the picker to this ISO-code subset. Defaults to all libphonenumber-js countries. An empty array is treated as all countries. |
| `countryDisplay` | `'flag' \| 'iso' \| 'name' \| 'code'` | no | — | How the SELECTED country renders in the picker trigger. Default `"code"`. - `"code"` — calling code only (`+1`). - `"iso"` — ISO code + code (`US +1`). - `"name"` — full country name + code (`United States +1`). - `"flag"` — emoji flag + code (`🇺🇸 +1`). Note: emoji flags don't render on Windows Chrome/Edge (they show the letters), so prefer `"iso"` there. The dropdown rows always show the full country name + code (plus a flag in `"flag"` mode) so they stay searchable + identifiable regardless of this. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | — | Control size, forwarded to the Select + Input. Default `"md"`. |
| `invalid` | `boolean` | no | — | Error chrome on both controls (host/Field-driven). |
| `disabled` | `boolean` | no | — | Disable both controls. |
| `required` | `boolean` | no | — | Mark required (forwarded for Field semantics). |
| `locale` | `string` | no | — | BCP-47 locale for country-name localization. Defaults to the i18n locale, else `"en"`. |
| `id` | `string` | no | — | Stable id; placed on the number field so an external `<label htmlFor>` focuses it. |
| `aria-label` | `string` | no | — | Accessible name when used STANDALONE (outside `<Field>`). A standalone PhoneInput MUST be named via `aria-label` or `aria-labelledby`, else the country/number group is unnamed. Inside `<Field>` the label is wired automatically via `aria-labelledby`. |
| `aria-labelledby` | `string` | no | — | Ids of elements labelling the group (injected by `<Field>`; takes precedence over `aria-label`). |
| `aria-describedby` | `string` | no | — | Ids of description/error elements; forwarded to the number field so it is announced on focus (injected by `<Field>`). |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

Inside a `<Field>` the label and error wiring are injected:

```tsx
<Field label="Mobile" error={isValidPhone(phone) ? undefined : 'Invalid number'}>
  <PhoneInput value={phone} onChange={setPhone} />
</Field>
```

**When NOT to use:** a non-phone numeric field — `<Input type="tel">` or `<Input inputMode="numeric">`.

**Anti-patterns**

- ❌ Treating it as uncontrolled — feed `onChange`'s E.164 back into `value`.
- ❌ Storing the formatted national string — persist the emitted E.164; the display is reconstructed from it.
- ❌ Validating by hand — call `isValidPhone(e164)` and pass `invalid` (or wire it through `<Field error>`).

**Known limitations**

- Format-as-you-type moves the caret to the end of the number field after each reformat; editing in the middle of the number bounces the caret to the end.
