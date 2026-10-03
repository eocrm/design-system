# Palette — categorical color set

```tsx
import { paletteTokens, type PaletteColor } from '@eocrm/design-system';

// Consumer-side mapping: domain → color
const TEAM_COLOR: Record<string, PaletteColor> = {
  marketing: 'violet',
  engineering: 'teal',
  sales: 'amber',
  ops: 'slate',
};

// Custom consumer chip using the palette tokens
function TeamChip({ team }: { team: string }) {
  const { bg, fg } = paletteTokens(TEAM_COLOR[team] ?? 'stone');
  return (
    <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: 4 }}>{team}</span>
  );
}

// Color-tagged checkbox (library-level integration)
<Checkbox color="violet" label="Marketing" />;
```

- 30 named colors with bg + fg pairs: `red` / `coral` / `orange` / `amber` / `gold` / `yellow` / `olive` / `lime` / `green` / `emerald` / `mint` / `teal` / `cyan` / `sky` / `blue` / `navy` / `indigo` / `violet` / `lavender` / `purple` / `plum` / `fuchsia` / `magenta` / `pink` / `rose` / `brown` / `taupe` / `slate` / `stone` / `charcoal`.
- `PaletteColor` is the TypeScript union; `PALETTE_COLORS` is the ordered readonly array (use for pickers / demos).
- `paletteTokens(color)` returns `{ bg, fg }` as `var(...)` strings — use to apply palette colors in consumer-built components.
- **Categorical, not semantic.** For status, use `<Badge tone="success" />` etc. Palette colors carry no built-in meaning.
- Consumers own the **domain → color mapping** (e.g., per-event-namespace, per-team, per-tag). The library provides only the colors and the type surface.
- `<Checkbox color="violet">` is the one library component that accepts palette colors out-of-the-box — tints the checked / indeterminate fill. Others (Badge, FilterChip) keep their existing semantic-tone unions; consumers build custom chips when they want palette colors.
- The generated token contract exposes `--color-palette-<name>-bg` and `--color-palette-<name>-fg`; contributors change their source definitions in `packages/design-tokens/src/tokens.json`.
