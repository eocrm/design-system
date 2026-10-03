# `<QrCode>` — scannable QR code

```tsx
<QrCode value="https://example.com/i/42" aria-label="QR code for invoice 42" />;
<QrCode value={inviteUrl} logo={brandMark} aria-label="Invite link" />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `string` | yes | — | The string to encode — a URL, an ID, a vCard. Encoded as UTF-8, so any script works. An empty string, or one past the largest symbol's capacity at the chosen `level` (~1273 bytes at `'H'`, ~2953 at `'L'`), renders a **disabled** button carrying a localized "unavailable" message instead of a code. It never throws — a long CRM field cannot white-screen a page. |
| `logo` | `string` | no | — | URL of a **single-colour** SVG to place in the centre. It is used as a CSS alpha mask and filled with the code's current ink, so it recolours itself in both themes and in the inverted state — the file's own colours are discarded. Full-colour artwork and photographs are not supported. Setting this also raises the default `level` to `'H'`, because the punch-out destroys modules outright. |
| `level` | `QrCodeLevel` | no | — | Error-correction level — how much damage the symbol survives. `'L'` ~7%, `'M'` ~15%, `'Q'` ~25%, `'H'` ~30%. Higher levels need a larger symbol for the same data. Defaults to `'H'` when `logo` is set, `'M'` otherwise. |
| …native | | | | plus native `<button>` attributes |

<!-- props:end -->

- Encodes `value` as UTF-8, so Cyrillic and every other script work.
- **Follows the theme** — dark modules on light paper in light mode, inverted in dark. Clicking the code swaps ink and paper back, for a scanner that refuses an inverted symbol. That click is the component's only interaction.
- The whole code is a `<button>` with `aria-pressed`. **Never nest it inside another clickable element** — invalid HTML, and it swallows the outer click.
- **No `size` prop** — it fills its container's width; the parent owns the box. Wrap in `<Constrain>` or a sized element, and keep it above ~100px or a dense symbol stops resolving.
- The symbol **snaps down to a whole number of device pixels per module and centres itself**, so the painted code can sit up to one module short of the container — measuring the button gives you the box, not the code. Size the container to a whole multiple of the module count and the shortfall disappears. Where snapping would give up more than an eighth of the width, it renders fluid and antialiased instead: a bigger blurry code scans, a smaller pixel-exact one does not. The ~100px floor applies to the painted symbol, not to the box.
- There is no `label` prop — pass the native `aria-label`. It defaults to a bare localized "QR code", which tells a screen-reader user nothing about what the code points at.
- An empty `value`, or one over capacity for the level (~1273 bytes at `'H'`), renders a **disabled** button on a muted filled plate — no border — carrying a localized "unavailable" message instead of throwing. A long CRM field cannot white-screen a page. Your `aria-label` is prefixed to that message as visible text, so the name reads "Invoice 42 — QR code unavailable" and a browse-mode user can tell which code failed.
- Clicking inverts; `title` carries a localized hint describing that, exposed as the accessible description. Pass your own `title` to override it.
- Always render the underlying URL as selectable text too. The code is unusable to a screen-reader user, and to anyone reading on the device that shows it.
- Treat the value as public. Anyone who can see the screen can scan it.

- `logo` raises `level` to `'H'`, which packs more modules into the same box — each comes out smaller, so size the container up when you use it.
- Pair the code with a visible caption (e.g. `<Text size="sm" tone="muted">Scan at the door</Text>` in a `<Stack align="center">`) for sighted users.
