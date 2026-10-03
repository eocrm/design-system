# `<ColorPicker>` — controlled HEX color picker (popover + inline)

```tsx
const [hex, setHex] = useState('#4F46E5');

// Default popover with the built-in trigger swatch:
<Field label="Brand color">
  <ColorPicker value={hex} onChange={setHex} />
</Field>

// Custom trigger:
<Field label="Brand color" description="Used for campaign accents">
  <ColorPicker value={hex} onChange={setHex}>
    <ColorPicker.Trigger asChild>
      <Button variant="secondary">Pick a color</Button>
    </ColorPicker.Trigger>
  </ColorPicker>
</Field>

// Inline (always-visible panel — for theme builders, settings rows):
<ColorPicker.Panel value={hex} onChange={setHex} />
```

- **Controlled-only.** `value: string` in `#RRGGBB` form. Loose input accepted on the HEX text field (`#FFF`, `FFF`, `#ffffff`); the component always emits the canonical `#RRGGBB` (uppercase, with `#`).
- **Two distribution shapes via the compound API.** `<ColorPicker>` is the popover-wrapped form-field-ready widget. `<ColorPicker.Panel>` is the same picker without the popover wrapping — drop it directly into a settings page or theme builder.
- **Default trigger** is an input-field-shaped button with a 16×16 swatch + uppercase HEX text. Override via `<ColorPicker.Trigger asChild>{customNode}</ColorPicker.Trigger>` (the child must `forwardRef` because `<Popover.Trigger>` clones it).
- **Field-ready.** `<Field label>` connects `id`, naming, description, and invalid state to either the default or custom trigger rather than the role-less picker wrapper. `required` remains a visible Field marker; native trigger buttons do not expose `aria-required` because that state is unsupported for buttons.
- **`onChange` fires per drag/zoom tick (high frequency).** Use `onChangeEnd` for commit-style logic (network calls, history snapshots) — it fires on pointer release, slider release, HEX input blur, and preset click.
- **Presets via `presets?: string[]`.** Invalid entries are dropped silently. The library doesn't ship a default palette — pass your own brand colors. Selected swatch gets an inset ring + check overlay.
- **Color math is exported.** `hexToHsv(hex)`, `hsvToHex({h,s,v})`, `normalizeHex(loose)` are usable directly for downstream theme builders, contrast calculators, etc.
- **Keyboard (SV pad)**: arrows ±1% S/V, Shift+arrow ±10%, Home/End for S=0/100, PageUp/Down for V=100/0.
- **Keyboard (hue slider)**: inherits Slider's keyboard — arrows ±1°, PgUp/Dn ±10°, Home/End for 0°/360°.
- **Popover placement** via `popoverPlacement?: 'bottom-start' | 'bottom' | 'top-start' | ...`. Default `'bottom-start'`.
- **Disabled** dims the panel, sets `aria-disabled` on the SV pad, disables the slider + input, makes presets non-interactive. Trigger doesn't open.
- **`panelFooter?: ReactNode`** — rendered inside the popover below the panel (and below presets). For live feedback about the color being picked, e.g. a contrast-ratio readout that updates as the user drags. Not available on the standalone `<ColorPicker.Panel>` (no popover to render it inside). Not an `aria-live` region by default — if the text should be announced as it changes, wrap it in your own `role="status"` span; announcing every drag tick would be disruptive by default. It IS the popover dialog's `aria-describedby` (#595), so it's read once when the dialog opens.
- **Accessible names (#594, #595).** Under `<Field label>` / `aria-labelledby` the default trigger's name is the label plus the current value ("Accent colour #0052CC"). An explicit `aria-label` on the default trigger also gets the value appended ("Accent colour, current value #0052CC"). The popover dialog is named by the trigger's purpose (Field label / `aria-label` / `triggerLabel`), no value — don't add your own `Popover.Heading` via `panelFooter` to name it.
- **`<ColorPickerPanel>` (`<ColorPicker.Panel>`) takes `framed?: boolean`, default `true`.** `framed={false}` drops the panel's own chrome (border, shadow, padding, background, radius) — use it when nesting the panel inside something that already draws a frame (your own `Popover.Content`, a `Card`). `<ColorPicker>` renders its popover panel with `framed={false}` internally so the popover shows exactly one frame; a standalone `<ColorPicker.Panel>` keeps its frame by default.
- **`invalid` now paints the default trigger's border AND its focus ring**, not just `aria-invalid` — `.trigger[aria-invalid=true]` uses the same danger primitive as `Input invalid` for both: the border (`--color-picker-trigger-border-color-invalid`, same primitive as `--input-border-color-invalid`, and it survives `:hover`) and the `:focus-visible` ring (`--color-picker-trigger-ring-invalid`, same primitive as `--input-ring-invalid`, both `var(--ring-danger)`) — each reached through ColorPicker's own component token, never a direct `--input-*` read.

#### Color math API

```ts
import { hexToHsv, hsvToHex, normalizeHex } from '@eocrm/design-system';

normalizeHex('#fff'); // '#FFFFFF'
normalizeHex('orange'); // null

hexToHsv('#FF0000'); // { h: 0, s: 100, v: 100 }
hexToHsv('not a color'); // null

hsvToHex({ h: 240, s: 100, v: 100 }); // '#0000FF'
```

#### Hard rule

- ❌ Passing non-HEX `value` — named colors, `rgb()`, `hsl()`, alpha hex (`#RRGGBBAA`). Convert in the consumer or use the exported `normalizeHex` first. Invalid input falls back to `#000000` with a dev-only warning.
- ❌ Reaching into the picker's internal HSV state. Consumer contract is HEX-only.
- ❌ Hand-rolling a color picker per page. Use this.
- ❌ Bundling a default palette inside the consumer. Pass via `presets`.
- ❌ Calling expensive work in `onChange`. Use `onChangeEnd` (one fire per gesture).
- ❌ Wrapping a non-`forwardRef` component in `<ColorPicker.Trigger asChild>`. `<Popover.Trigger>` clones the child to inject the ref; non-forwardRef silently drops it.
- ❌ Forgetting to wire `disabled` into the consumer's custom trigger element. The picker dims its wrapper and blocks pointer events, but the trigger button's own disabled visuals are the consumer's responsibility.
