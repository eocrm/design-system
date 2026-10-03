# `<ButtonGroup>` — joined Buttons + segmented control

```tsx
// Visual mode — joined Buttons, no shared state.
<ButtonGroup aria-label="Edit actions">
  <Button>Cut</Button>
  <Button>Copy</Button>
  <Button>Paste</Button>
</ButtonGroup>

// Segmented mode — single-select toggle group.
<ButtonGroup value={view} onValueChange={setView} aria-label="View mode">
  <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
  <ButtonGroup.Item value="list">List</ButtonGroup.Item>
  <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
</ButtonGroup>
```

<!-- props:start -->

## Props

### `ButtonGroupProps`

| Prop            | Type                     | Required | Default | Description                                                                                                                                                                                                           |
| --------------- | ------------------------ | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `size`          | `ButtonSize`             | no       | —       | Size propagated to children. Per-child `size` (Button or Item) wins when explicitly set. In visual mode this happens via cloneElement on Button children. In segmented mode, `<ButtonGroup.Item>` reads from context. |
| `disabled`      | `boolean`                | no       | —       | Disabled state for the whole group. In segmented mode this is authoritative (all items become aria-disabled, clicks no-op). In visual mode this is a no-op — pass `disabled` per `<Button>` instead.                  |
| `invalid`       | `boolean`                | no       | false   | Segmented mode: `aria-invalid` on the radiogroup. Visual mode: consumed and ignored. Field / SettingRow inject it — it used to leak onto the group div as a stray attribute.                                          |
| `required`      | `boolean`                | no       | false   | Segmented mode: `aria-required` on the radiogroup. Visual mode: consumed and ignored. Field / SettingRow inject it.                                                                                                   |
| `className`     | `string`                 | no       | —       |                                                                                                                                                                                                                       |
| `style`         | `CSSProperties`          | no       | —       |                                                                                                                                                                                                                       |
| `value`         | `string`                 | no       | —       | Visual mode marker. Never set; absence flips to visual.                                                                                                                                                               |
| `onValueChange` | `(next: string) => void` | no       | —       |                                                                                                                                                                                                                       |
| `aria-label`    | `string`                 | no       | —       | Accessible name for the group landmark. Optional but recommended.                                                                                                                                                     |
| …native         |                          |          |         | plus native HTML attributes                                                                                                                                                                                           |

### `ButtonGroupItemProps`

| Prop        | Type        | Required | Default | Description                                                  |
| ----------- | ----------- | -------- | ------- | ------------------------------------------------------------ |
| `value`     | `string`    | yes      | —       | Value emitted to `onValueChange` when this item is selected. |
| `disabled`  | `boolean`   | no       | —       | Per-item disabled. Group-level disabled is OR-merged.        |
| `className` | `string`    | no       | —       | className merges onto the rendered <button>.                 |
| `children`  | `ReactNode` | yes      | —       |                                                              |

<!-- props:end -->

- **Mode detection** is by props: with `value` + `onValueChange` you get segmented; without, you get visual joining.
- **Children differ by mode.** Visual: `<Button>` children. Segmented: `<ButtonGroup.Item>` children. Mixing the two is undefined behavior.
- **Size propagation** — `size` on the group propagates to children. Per-child override wins.
- **Keyboard nav (segmented only)** — Arrow keys move selection + focus; Home / End jump to ends; Tab moves IN/OUT of the group on the currently-selected item. Disabled items are skipped.
- **ARIA** — visual mode is `role="group"`; segmented mode is `role="radiogroup"` (requires `aria-label`).

**Anti-patterns:**

- ❌ Mixing visual `<Button>` children with `<ButtonGroup.Item>` in the same ButtonGroup — undefined behavior.
- ❌ Using ButtonGroup as a routing tab strip. That's what `<Tabs>` is for.
- ❌ Passing only `value` without `onValueChange` — type error.
- ❌ Multi-select via clever workarounds. Compose Checkboxes for that.

**See also:** `<Tabs>` for routing-style content switching, `<Radio>` for vertical radio lists.
