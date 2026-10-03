# `<Select>` — value picker (single, multi, searchable, async, creatable)

```tsx
// Form field — single:
<Select
  options={statuses}
  value={status}
  onChange={(v) => setStatus(v as Status)}
  placeholder="Pick a status"
/>

// Table filter — multi, summary:
<Select
  multiple
  triggerDisplay="summary"
  searchable
  options={owners}
  value={selectedOwners}
  onChange={(v) => setSelectedOwners(v as string[])}
  placeholder="Filter by owner"
/>

// Tag input — multi, chips, creatable:
<Select
  multiple
  searchable
  creatable
  options={existingTags}
  value={tags}
  onChange={(v) => setTags(v as string[])}
  onCreate={api.tags.create}
  placeholder="Add tags…"
/>

// Async with custom row render:
<Select
  searchable
  loadOptions={async (q, signal) => {
    const users = await api.searchUsers(q, { signal });
    return users.map((u) => ({ value: u.id, label: u.name, data: u }));
  }}
  renderOption={(opt) => (
    <Cluster gap="sm">
      <Avatar name={opt.label} src={opt.data?.avatarUrl} size="sm" />
      <span>{opt.label}</span>
    </Cluster>
  )}
  value={assigneeId}
  onChange={(id) => setAssigneeId(id as string)}
/>
```

- One generalist; the mode matrix is `multiple` × `triggerDisplay: 'chips' | 'summary'` × `searchable`. See the JSDoc on `<Select>` for the matrix and anti-patterns.
- `id` goes on the combobox trigger (the `<button>` / `<input>`), not the wrapper div, so a `<label for>` (Field / SettingRow) focuses it. Target the wrapper by `className` or a `data-*` attribute, not `#id`.
- `triggerDisplay` defaults to `'chips'` when `multiple` is set. Use `'summary'` for table-filter UIs where chips would crowd the toolbar.
- **Async**: pass `loadOptions(query, signal)`. Debounce (250ms default, configurable via `searchDebounceMs`) and `AbortSignal` cancellation are built-in. Do NOT debounce externally.
- **Tag input pattern** = `multiple + searchable + creatable + triggerDisplay='chips'`. There is no separate `<Tags>` component.
- **Form integration**: pass `name` (and `required`/`form` if needed). Hidden inputs render so `new FormData(form)` works. Multi mode renders one hidden input per selected value; `FormData.getAll(name)` returns the array.
- **`clearable`** is opt-in (default `false`) — pass it to show the ✕ clear button once there's a value. Always suppressed when `disabled`/`readOnly`.
- **`onChange` signature** is `(value, option | options | null)` — the second arg is the matched option(s), saving you a lookup.
- **`''` is a normal option value, not a reserved "unset" sentinel.** The "one sentinel row plus N catalog ids" shape works directly — no `"__default__"` workaround:

  ```tsx
  <Select
    options={[
      { value: '', label: 'Use the default scheme' },
      { value: 'scheme-a', label: 'Scheme A' },
    ]}
    value={boundSchemeId ?? ''}
    onChange={(v) => setBoundSchemeId(v === '' ? null : (v as string))}
  />
  ```

  The trigger shows "Use the default scheme" (not a blank or the placeholder), and `onChange` hands you that row's `SelectOption`. "Nothing selected" is resolved by lookup — the value matches no option — so a Select with no `''` row still shows its placeholder at `value=""`. Corollary for `clearable`: ✕ means "reset to the empty value", so it is hidden when the selected option already IS `value: ''`, and shown for a stale value that matches nothing.

- **Render escape hatches**: `renderOption`, `renderValue`, `renderTag`, `renderEmpty`, `renderLoading`, `renderError`. Use when defaults don't suffice; default rendering is always token-correct.
- For **action menus** (Edit/Delete/Duplicate buttons), use `<DropdownMenu>` — Select is for value selection, not actions.
- For **free-form text**, use `<Input>`. Select always picks from a (possibly async) set.
- Don't reach for `triggerDisplay='summary'` for tag input — chips communicate the active filter set at a glance.
- `creatable` requires `searchable` (throws in dev). Passing both `options` and `loadOptions` is also flagged (loadOptions wins).
