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

// With consumer-supplied preset swatches:
<ColorPicker.Panel value={hex} onChange={setHex} presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444']} />
```

<!-- props:start -->

## Props

### `ColorPickerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | yes | — | Current color as `#RRGGBB`. Controlled — required. |
| `onChange` | `(hex: string) => void` | yes | — | Fires per drag tick + on input change + on preset click. High frequency during drags. |
| `onChangeEnd` | `((hex: string) => void)` | no | — | Fires on the trailing edge of an interaction. Use for commit-style logic. |
| `presets` | `string[]` | no | — | Optional preset color swatches. If provided, rendered as a grid below the hue slider in the panel. |
| `disabled` | `boolean` | no | — | Disable interaction. Trigger doesn't open; panel is non-interactive. |
| `invalid` | `boolean` | no | false | Marks the focusable trigger invalid for Field composition. |
| `required` | `boolean` | no | false | Consumed for Field composition so Field can render its visible required marker. Native buttons do not support `aria-required`, so this does not add required semantics to the trigger. |
| `aria-label` | `string` | no | — | Accessible name for the focusable trigger. Forwarded to the default or custom trigger, not the root wrapper. On the default trigger the current value is appended (`aria-label="Accent colour"` → "Accent colour, current value #3366FF"); the popover dialog is named by the bare `aria-label`. Ignored when `aria-labelledby` is provided. An explicit name on a custom trigger child takes precedence — but an EMPTY one on that child does not, since an empty string names nothing. |
| `triggerLabel` | `string` | no | — | Accessible label for the default trigger. Defaults to the i18n value at `colorPicker.triggerLabel` (`'Pick a color'` in English) when omitted OR empty — an empty string is not an explicit name, so it takes the default too. Ignored when a custom trigger is provided via `<ColorPicker.Trigger>`. |
| `aria-labelledby` | `string` | no | — | Id(s) of element(s) that label the trigger button. Forwarded onto the focusable trigger (not the root wrapper) and takes precedence over the generated `aria-label`. Set automatically when wrapped in `<Field label>`. On the default trigger a visually hidden span holding the current HEX is appended, so the name reads e.g. "Accent colour #0052CC". The popover dialog is named by these ids alone (purpose, no value). |
| `aria-describedby` | `string` | no | — | Id(s) of element(s) that describe the trigger button (e.g. a Field error or helper text). Forwarded onto the focusable trigger, not the root wrapper. |
| `popoverPlacement` | `PopoverPlacement` | no | — | Popover placement (split internally into side + align). Default `'bottom-start'`. |
| `panelFooter` | `ReactNode` | no | — | Optional content rendered inside the popover, below the panel (and below its presets grid, if any) — for live feedback about the color being picked, e.g. a contrast-ratio readout that updates as the user drags. Not available on the standalone `<ColorPicker.Panel>`, which has no popover to render it inside. Not an `aria-live` region by default — announcing every drag tick would be disruptive. If the footer's text should be announced as it settles, wire that up yourself (e.g. wrap it in your own `role="status"` span); that tradeoff is the consumer's call, not the picker's default. The footer is wired as the popover dialog's `aria-describedby`, so its text is read when the dialog opens. Keep it short — it is read in full. |
| `children` | `ReactNode` | no | — | Optional `<ColorPicker.Trigger asChild>` override for custom triggers. |
| …native | | | | plus native `<div>` attributes |

### `ColorPickerPanelProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | yes | — | Current color as `#RRGGBB`. Controlled — required. |
| `onChange` | `(hex: string) => void` | yes | — | Fires per drag tick + on input change + on preset click. High frequency during drags. |
| `onChangeEnd` | `((hex: string) => void)` | no | — | Fires on the trailing edge of an interaction — pointer release on the SV pad / hue slider, blur on the HEX input, preset click. Use for commit-style logic (network calls, history snapshots). |
| `presets` | `string[]` | no | — | Optional preset color swatches. If provided, rendered as a grid below the hue slider. Clicking a swatch commits the color (fires both onChange and onChangeEnd). Invalid entries are silently dropped. |
| `disabled` | `boolean` | no | — | Disable interaction. |
| `framed` | `boolean` | no | true | Whether the panel draws its own chrome (border, shadow, padding, background, radius). Default `true` — the standalone `<ColorPicker.Panel>` needs that chrome to read as a discrete surface on a page. Set `false` when nesting the panel inside a container that already draws a frame — a `Popover.Content`, a `Card`, or your own bordered surface — so the two frames don't nest. `<ColorPicker>` renders its popover panel this way internally, for exactly this reason. |
| …native | | | | plus native `<div>` attributes |

### `ColorPickerTriggerProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `asChild` | `boolean` | no | — | Currently always behaves as `true` (the child is merged with trigger semantics via `<Popover.Trigger>`'s cloneElement). Reserved for a future Slot-style variant where `false` would wrap the child instead of merging. Documented for API stability. |
| `children` | `ReactNode` | yes | — | The element to render as the trigger. Must accept `ref`, `onClick`, `id`, and ARIA attributes so ColorPicker can connect it to Field. Explicit child ARIA naming, description, and invalid state win over the parent values; ColorPicker's public `id` still owns the label association. |

<!-- props:end -->

- **Controlled-only.** `value: string` in `#RRGGBB` form. Loose input accepted on the HEX text field (`#FFF`, `FFF`, `#ffffff`); the component always emits the canonical `#RRGGBB` (uppercase, with `#`).
- **The SV pad** is `role="application"` with an `aria-valuetext` describing the state (a 2D control has no standard ARIA pattern). Keyboard adjusts S/V by 1% per arrow, 10% with Shift. Use `<ColorPicker>` (not the Panel) when you need a compact trigger.
- **Two distribution shapes via the compound API.** `<ColorPicker>` is the popover-wrapped form-field-ready widget. `<ColorPicker.Panel>` is the same picker without the popover wrapping — drop it directly into a settings page or theme builder.
- **Default trigger** is an input-field-shaped button with a 16×16 swatch + uppercase HEX text. Override via `<ColorPicker.Trigger asChild>{customNode}</ColorPicker.Trigger>` (the child must `forwardRef` and accept `onClick` because `<Popover.Trigger>` clones it). `<ColorPicker.Trigger>` renders nothing itself; it is a marker child that `<ColorPicker>` reads from its `children`, so it only has meaning inside `<ColorPicker>`.
- **Field-ready.** `<Field label>` connects `id`, naming, description, and invalid state to either the default or custom trigger rather than the role-less picker wrapper. `required` remains a visible Field marker; native trigger buttons do not expose `aria-required` because that state is unsupported for buttons.
- **`onChange` fires per drag/zoom tick (high frequency).** Use `onChangeEnd` for commit-style logic (network calls, history snapshots) — it fires on pointer release, slider release, HEX input blur, and preset click.
- **Presets via `presets?: string[]`.** Invalid entries are dropped silently. The library doesn't ship a default palette — pass your own brand colors. Selected swatch gets an inset ring + check overlay.
- **Color math is exported.** `hexToHsv(hex)`, `hsvToHex({h,s,v})`, `normalizeHex(loose)` are usable directly for downstream theme builders, contrast calculators, etc.
- **Keyboard (SV pad)**: arrows ±1% S/V, Shift+arrow ±10%, Home/End for S=0/100, PageUp/Down for V=100/0.
- **Keyboard (hue slider)**: inherits Slider's keyboard — arrows ±1°, PgUp/Dn ±10°, Home/End for 0°/360°.
- **Popover placement** via `popoverPlacement?: 'bottom-start' | 'bottom' | 'top-start' | ...`. Default `'bottom-start'`.
- **Disabled** dims the panel, sets `aria-disabled` on the SV pad, disables the slider + input, makes presets non-interactive. Trigger doesn't open.
- **`panelFooter?: ReactNode`** — rendered inside the popover below the panel (and below presets). For live feedback about the color being picked, e.g. a contrast-ratio readout that updates as the user drags. Not available on the standalone `<ColorPicker.Panel>` (no popover to render it inside). Not an `aria-live` region by default — if the text should be announced as it changes, wrap it in your own `role="status"` span; announcing every drag tick would be disruptive by default. It IS the popover dialog's `aria-describedby`, so it's read once when the dialog opens.
- **Accessible names.** Under `<Field label>` / `aria-labelledby` the default trigger's name is the label plus the current value ("Accent colour #0052CC"). An explicit `aria-label` on the default trigger also gets the value appended ("Accent colour, current value #0052CC"). The popover dialog is named by the trigger's purpose (Field label / `aria-label` / `triggerLabel`), no value — don't add your own `Popover.Heading` via `panelFooter` to name it.
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
- ❌ Using `<ColorPicker.Trigger>` outside `<ColorPicker>`.
- ❌ Reaching into the picker's internal HSV state. Consumer contract is HEX-only.
- ❌ Hand-rolling a color picker per page. Use this.
- ❌ Bundling a default palette inside the consumer. Pass via `presets`.
- ❌ Calling expensive work in `onChange`. Use `onChangeEnd` (one fire per gesture).
- ❌ Wrapping a non-`forwardRef` component in `<ColorPicker.Trigger asChild>`. `<Popover.Trigger>` clones the child to inject the ref; non-forwardRef silently drops it.
- ❌ Forgetting to wire `disabled` into the consumer's custom trigger element. The picker dims its wrapper and blocks pointer events (`pointer-events: none`), but the trigger button's own disabled visuals are the consumer's responsibility.
