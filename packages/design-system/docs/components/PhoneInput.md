# `<PhoneInput>`

International phone field: searchable country picker (DS `Select`) + national-number `Input`, controlled on a single `value: string | null` (**E.164**), `onChange(e164 | null)`. `defaultCountry` (ISO alpha-2) seeds the picker when empty; `countries` restricts the list; `size`/`invalid`/`disabled` pass through. Country names are localized via `Intl.DisplayNames`; metadata/validation via `libphonenumber-js`. Validate with the exported `isValidPhone(e164)` and drive `invalid` (or wrap in `<Field error>`). `countryDisplay` sets how the SELECTED country shows in the trigger — `"code"` (default, `+1`), `"iso"` (`US +1`), `"name"` (`United States +1`), or `"flag"` (`🇺🇸 +1`; emoji flags don't render on Windows Chrome/Edge). Dropdown rows always show the full name + code (searchable); opening the picker selects the text for instant type-to-search; the country can't be cleared. Store the emitted E.164, not the formatted display.

```tsx
const [phone, setPhone] = useState<string | null>(null);
<PhoneInput value={phone} onChange={setPhone} defaultCountry="GB" />;
```
