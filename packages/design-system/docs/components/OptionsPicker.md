# `<OptionsPicker>` — filter picker (multi/single, grouped, searchable)

**Use for filter UX, not form fields.** A compound picker that opens a Popover
with a search input and grouped/flat checkbox (multi) or radio (single) options.
Multi mode buffers a draft until Apply; single mode commits per click.

```tsx
<OptionsPicker selected={events} onApply={setEvents}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">
      Events <ChevronDown size={14} />
    </Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content
    label="Filter events"
    groups={catalogGroups} // OR `options={flatOptions}` — XOR
  />
</OptionsPicker>
```

<!-- props:start -->

## Props

### `OptionsPickerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `mode` | `"multi" \| "single"` | no |  |
| `selected` | `string[] \| string \| null` | yes |  |
| `onApply` | `(next: string[], options: OptionsPickerOption[]) => void \| (next: string \| null, option: OptionsPickerOption \| null) => void` | yes | Called on Apply with the committed values and their option objects, in the same order. |
| `onCancel` | `(() => void)` | no |  |
| `open` | `boolean` | no |  |
| `onOpenChange` | `((open: boolean) => void)` | no |  |
| `children` | `ReactNode` | yes |  |

### `OptionsPickerContentProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `options` | `OptionsPickerOption[]` | no |  |
| `groups` | `OptionsPickerGroup[]` | no |  |
| `loadOptions` | `(query: string, signal: AbortSignal) => Promise<OptionsPickerOption[]>` | no | Server search: called with the search query (`''` on every open) after `searchDebounceMs`, and its answer replaces the list — no client-side filtering on top. Flat options only. The previous request is aborted via `signal` when a newer one starts. Takes precedence over `options` / `groups` (dev warning if both are passed). The latest function is always the one called; a new identity (e.g. an inline arrow) does not refetch. |
| `selectedOptions` | `OptionsPickerOption[]` | no | Option objects for currently selected values that may not be in any server answer (e.g. values restored from a URL), so they can be labelled. |
| `searchDebounceMs` | `number` | no | Delay between the last keystroke (or opening) and the `loadOptions` call. Default `250`. |
| `label` | `string` | yes | Accessible label on the panel (the dialog's `aria-label`). |
| `emptyState` | `ReactNode` | no | Rendered when search produces zero matches. Defaults to the `optionsPicker.noMatches` i18n string (en: `'No matches'`). With `loadOptions` the visible row is hidden from assistive tech and a live region announces it instead — this text when it is a string, otherwise the default. An EMPTY string counts as unset, matching every other label override in the library. There is no way to suppress the message entirely — a blank listbox reads as a broken filter rather than as a deliberate silence. |
| `footerCount` | `((selected: number, total: number) => ReactNode)` | no | Footer count formatter (multi only). Default `'${selected} of ${total}'`. Not called with `loadOptions` — there is no known total, so the footer reads `optionsPicker.selectedCount` (en: `'N selected'`). |
| `searchable` | `boolean` | no | Whether to render the search bar at the top of the panel. Defaults to `true`. Hide it (`false`) for small/curated option lists where typing filters would just be noise — the selection-count header is hidden alongside the search input (the footer's `N of TOTAL` text still shows in multi mode). Ignored with `loadOptions`: server search needs the input, so it always shows. |
| `className` | `string` | no |  |

### `OptionsPickerTriggerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactElement<unknown, string \| JSXElementConstructor<any>>` | yes | Must be a single React element that accepts a ref (e.g. `<Button>`). |

<!-- props:end -->

`mode="single"` for single-select: `selected: string | null`, `onApply(value | null)`, no Apply/Cancel footer.

Don't use for form selects (use `<Select>`), action menus (use `<DropdownMenu>`),
or single boolean toggles (use `<Checkbox>` or `<Switch>`).

Multi mode (default) keeps a draft until Apply; Cancel, Esc and click-outside revert it. Single mode commits through `onApply` on each click and closes the panel.

```tsx
<OptionsPicker mode="single" selected={tenantId} onApply={setTenantId}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">Tenant</Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content
    label="Filter tenant"
    options={tenants.map((t) => ({ value: t.id, label: t.slug }))}
  />
</OptionsPicker>
```

## Async (server search)

For lists too large to ship to the client, pass `loadOptions` to Content instead of `options` / `groups`.

```tsx
<OptionsPicker
  selected={ids}
  onApply={(next, options) => {
    setIds(next);
    setPicked(options); // use these to label the trigger
  }}
>
  <OptionsPicker.Trigger>
    <Button variant="secondary">{picked.map((o) => o.label).join(', ') || 'Members'}</Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content
    label="Filter members"
    loadOptions={(query, signal) => fetchMembers(query, signal)} // returns { value, label }[]
    selectedOptions={picked} // labels for values restored from URL/state
  />
</OptionsPicker>
```

- **Fetching.** `loadOptions(query, signal)` returns a flat `OptionsPickerOption[]`. It is called with `''` on every open and after `searchDebounceMs` (default `250`) following each keystroke; the previous request is aborted via `signal`, so pass it to `fetch`. The latest `loadOptions` is always the one called, and a new function identity does not refetch, so an inline arrow is fine. The server's answer replaces the list: there is no client-side filtering on top. The search input is always shown (`searchable` is ignored).
- **Rows.** Loading, error (with a Retry action) and "No matches" rows are built in. Groups are not supported in async mode (flat only). `loadOptions` wins over `options` / `groups` (dev warning if both are passed).
- **Selected rows are pinned** above the server results (snapshot taken on open and on each query change); ticking or unticking never moves rows under the pointer.
- **Labels.** Selected values are labelled from a cache of every answer seen while the picker is mounted plus `selectedOptions`; an unknown value falls back to its raw string. **Pass `selectedOptions` for values restored from URL/state** (e.g. a deep link), otherwise their rows read as raw ids.
- **`onApply` second argument.** Multi: `onApply(values, options)`; single: `onApply(value, option | null)`. Use it to label the trigger and keep `selectedOptions` for the next render. Also works for static `options` / `groups`.
- **Footer.** Multi mode reads "N selected"; `footerCount` is not called (there is no known total).
- **Screen readers (Hard rule 10).** One polite live region announces loading, failure and no-matches (a failure reads "Failed to load options.", no-matches uses `emptyState` when it is a string, otherwise the default). The visible loading / error / empty rows are hidden from assistive tech so nothing is announced twice. Success is silent: the list is the result.

`<OptionsPicker.Trigger>` takes a single ref-accepting element (typically a `<Button>`); open wiring and ARIA (`aria-haspopup`, `aria-expanded`, `aria-controls`) are injected, and your own ref on the child still receives the DOM node. `<OptionsPicker.Content>` hosts the search bar, the option list and (multi mode) the Apply/Cancel footer.

OptionsPicker has no `name` attribute and no form association. Action menus (Edit / Delete / Archive) are commands, not filters — use `<DropdownMenu>`.

**Anti-patterns**

- ❌ Passing BOTH `options` and `groups` to Content — TypeScript rejects it. Pick one.
- ❌ Calling `onApply` yourself inside Content's render — the picker owns the commit; treat `onApply(next)` as the single source of truth and update React state from it.
- ❌ Async mode with `groups`, or restoring `selected` from a URL without `selectedOptions` (rows show raw ids).
- ❌ Controlling open state without passing both `open` and `onOpenChange` — partial control breaks invariants.
