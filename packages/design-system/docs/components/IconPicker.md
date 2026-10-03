# `<IconPicker>` — choose one glyph from a consumer catalog

```tsx
const options = [
  { value: 'flame', label: 'Flame', icon: <Flame /> },
  { value: 'zap', label: 'Lightning', icon: <Zap /> },
];
<Field label="Priority icon">
  <IconPicker value={icon} options={options} onChange={setIcon} />
</Field>;
```

- The consumer owns icon values, labels, glyphs, ordering, and controlled state.
- `<Field label>` names the trigger with the visible label plus the selected option, and forwards description and invalid state to that button; the dialog and radiogroup use only the visible Field label. These attributes do not sit on the role-less wrapper. `required` remains a visible Field marker rather than unsupported `aria-required` on the native button.
- Use it for compact visual choices; use `Select` when visible option text matters.
- Labels must be human-readable and values unique. Do not pass icon codes as labels.
