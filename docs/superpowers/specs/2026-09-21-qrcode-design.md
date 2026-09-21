# QrCode — design

**Date:** 2026-09-21
**Status:** approved

## Problem

The CRM has no way to render a QR code. The ask: encode an arbitrary string,
optionally place a logo in the centre, and demo it in the playground with the
eocrm mark.

## Decisions taken during brainstorming

| Decision           | Choice                                                       | Why                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Encoder            | `qrcode-generator@2.0.4`                                     | Zero deps, ESM + bundled types. We use it **only** for the module matrix; rendering, theming and a11y stay ours. Hand-rolling Reed–Solomon + mask scoring is ~500 LOC of finite-field maths whose failure mode is a code that looks right and does not scan. |
| Dark theme         | Follows the theme (ink = `--color-fg`, paper = `--color-bg`) | Seamless in the UI. Inverted codes scan on modern phone cameras.                                                                                                                                                                                             |
| Inverted-code risk | Click the code to swap ink/paper                             | A user whose scanner refuses the inverted code fixes it in one click, with no prop and no consumer decision.                                                                                                                                                 |
| Centre logo        | CSS alpha **mask** filled with the current ink colour        | A fixed-colour logo file is illegible in at least one of the four states (light/dark × normal/inverted). A mask recolours itself for free — and the existing `eocrm-logo.svg` works unmodified, since a mask reads alpha, not colour.                        |
| v1 scope           | Render + click-to-invert. No download, no copy.              | Nothing needs them yet.                                                                                                                                                                                                                                      |

### Dependency policy

`packages/design-system/CLAUDE.md` enumerates its dependency exceptions
(`@floating-ui/react-dom`, `@dnd-kit/*`). `qrcode-generator` becomes the third
and **must be added to that list** in the same PR, with the reasoning above.
Adding a dependency that the policy does not name is the defect this spec is
pre-empting.

## Public API

```ts
export type QrCodeLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrCodeProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value' | 'type'
> {
  /** The string to encode. Required. */
  value: string;
  /**
   * URL of a single-colour SVG placed in the centre. Used as a CSS alpha mask
   * and filled with the current ink colour, so it recolours with the theme and
   * with the inverted state. Full-colour artwork is NOT supported — the mask
   * keeps the silhouette and discards the colours.
   */
  logo?: string;
  /**
   * Error-correction level. Defaults to `'H'` when `logo` is set (the punch-out
   * destroys modules) and `'M'` otherwise.
   */
  level?: QrCodeLevel;
  /** Accessible name. Defaults to the `qrCode.label` translation. */
  label?: string;
}
```

**There is no `size` prop.** The code renders at `width: 100%` of its
container and the parent owns the box — Rule 4's position exactly. The shared
`--size-*` scale tops out at 40px (it is the _control_ scale), so reusing it
would produce unscannable codes, and minting `--size-qr-*` globals would be
three new tokens plus a Kotlin contract regeneration for a prop nobody asked
for. Consumers wrap in `<Constrain>` or any sized element.

`forwardRef<HTMLButtonElement, QrCodeProps>`. Spread **pattern B** (props
first), so `type`, `aria-pressed` and the click handler cannot be clobbered.

## Encoding

```ts
const qr = qrcode(0, level); // 0 = auto version
qr.addData(toByteString(value)); // always Byte mode
qr.make();
```

### UTF-8 — the non-obvious part

`qrcode-generator`'s default `stringToBytes` is:

```js
bytes.push(s.charCodeAt(i) & 0xff);
```

That is latin1-lossy. `addData('Привет')` silently produces a code that decodes
to garbage. `ru.ts` is a first-class locale in this library, so this is a
shipping bug, not a footnote.

**Do not** patch the library global (`qrcode.stringToBytes = …`) — it is shared
mutable state that reaches every other consumer of the package in the host app.

Instead, pre-encode locally so the lossy default becomes an identity function:

```ts
/** UTF-8 bytes as a latin1 string, so the encoder's `c & 0xff` passes them through. */
function toByteString(value: string): string {
  return Array.from(new TextEncoder().encode(value), (b) => String.fromCharCode(b)).join('');
}
```

Applied unconditionally — there is no branch, because `addData` has no mode
auto-detection to preserve (it hardcodes `mode = mode || 'Byte'`). The cost is
that a digits-only value is not packed in Numeric mode; nobody needs that, and
adding it later is a pure optimisation behind the same API.

The encode runs inside `useMemo` keyed on `(value, level)`.

## Geometry

```
N     = qr.getModuleCount()        // always odd: 21, 25, 29 … 177
QUIET = 4                          // modules, per ISO/IEC 18004
side  = N + 2 * QUIET
```

- `viewBox="0 0 {side} {side}"`, `shape-rendering="crispEdges"`.
- One `<rect>` of paper covering the full viewBox.
- **One** `<path>` for every dark module — `M{c+4} {r+4}h1v1h-1z` concatenated.
  One DOM node regardless of density; a 177-module code is 31k rects otherwise.
- Logo punch-out, only when `logo` is set: a paper-filled `<rect>` of
  `punch = Math.ceil(N * 0.24) | 1` modules, centred.
  `| 1` forces odd — `N` is always odd, so an odd punch keeps
  `(side - punch) / 2` integral and the edges on module boundaries.

The masked logo is a CSS overlay, not SVG content: absolutely positioned,
centred with `left/top: 50%` + `translate(-50%, -50%)` (**not** `margin: auto` —
Rule 4 forbids margin). Its size comes from an inline custom property,
`--qr-logo-size: {(punch * 0.72 / side) * 100}%`, leaving a paper margin inside
the punch.

### The logo URL is a trust boundary

`logo` is consumer-supplied and lands inside a CSS `url("…")`. React does not
sanitise custom properties, so a value containing `")` escapes the declaration.
Percent-encode the characters that can break out before interpolating:

```ts
const CSS_URL_UNSAFE = /["'()\\\n\r]/g;
function cssUrl(src: string): string {
  return `url("${src.replace(CSS_URL_UNSAFE, (ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`)}")`;
}
```

`encodeURI` is the wrong tool here — it double-encodes `%` in already-encoded
URLs and in `data:` URIs.

## Theming

`QrCode.tokens.scss`:

```scss
--qr-ink: var(--color-fg);
--qr-paper: var(--color-bg);
--qr-radius: var(--radius-sm);

--qr-error-bg: var(--color-bg-muted);
--qr-error-fg: var(--color-fg);
--qr-error-font-size: var(--font-size-sm);
--qr-error-padding: var(--space-3);
```

The inverted class swaps exactly two declarations:

```scss
.inverted {
  --qr-ink: var(--color-bg);
  --qr-paper: var(--color-fg);
}
```

No new global tokens. Both directions stay maximally contrasting in both
themes, because the pair is the theme's own fg/bg pair either way round.

## Accessibility

Root is `<button type="button" aria-pressed={inverted}>` wrapping an
`aria-hidden="true"` SVG.

- A toggle button's `aria-pressed` is a **native role exposure**, so Hard rule
  10 is satisfied by its third branch. No live region (it would fire on every
  toggle) and no name mutation (Rule 10 forbids renaming a control the user
  just activated).
- Accessible name from `label`, defaulting to `t('qrCode.label')` — Rule 9, no
  inlined English. Consumers are told in JSDoc to pass something identifying
  ("QR code for invoice INV-123"), because a screen-reader user cannot scan the
  image to find out what it encodes.
- Focus via `:focus-visible` (Rule 3a) using the shared focus mixin.
- Space and Enter come free from the native button.

**Known limitation, documented in `@remarks`:** every `<QrCode>` is a button, so
nesting one inside another clickable element is invalid HTML and the inner
button swallows the outer click. Deliberate — no opt-out prop until something
needs one.

## Failure

`qrcode-generator` throws when the value exceeds the largest version's capacity
at the chosen level (with `level="H"` that is ~1273 bytes; a long CRM note field
reaches it). An empty `value` has nothing to encode.

Both render the error branch: **the same `<button>`**, `disabled`, with no
`aria-pressed`, whose content is a visible i18n'd message on a paper plate. It
never throws into the consumer's tree, and never white-screens a page.

Keeping one element type across both branches is deliberate. The obvious
alternative — `<div role="img">`, as `<Image>`'s error tile does — makes
`forwardRef<HTMLButtonElement>` hand back a div and spreads
`ButtonHTMLAttributes` onto it. Two lies in the public type to save one
`disabled` attribute.

Rule 10 is satisfied without a separate label: the message is the button's
content, so name-from-content makes it the accessible name. Do **not** also set
`aria-label` here, or a reader hears the failure twice — the same trap
`<Image>` documents, arrived at from the other direction.

Wrap both `addData` and `make` in the `try` — with auto version selection the
capacity check happens in `make()`.

## i18n

Added to `messages.ts`, `en.ts`, `ru.ts`:

| Key            | en                    | ru                  |
| -------------- | --------------------- | ------------------- |
| `qrCode.label` | `QR code`             | `QR-код`            |
| `qrCode.error` | `QR code unavailable` | `QR-код недоступен` |

## Tests — `QrCode.test.tsx`

Rule-1 baseline (renders, `ref` forwarded to the button, `className` merged),
plus:

1. The path's `M` command count equals the number of dark modules reported by an
   independently constructed `qrcode(0, level)` for the same value.
2. `viewBox` is `0 0 {N+8} {N+8}` — the quiet zone exists.
3. Click toggles `aria-pressed` and the inverted class; keyboard (Space/Enter
   via `userEvent`) does the same.
4. `level` defaults to `'M'`, and to `'H'` when `logo` is set; an explicit
   `level` wins over both.
5. A non-ASCII value (`'Привет'`) encodes to the same module count as the same
   string encoded through `TextEncoder` + the escape helper — i.e. it is not
   latin1-truncated. This is the regression test for the UTF-8 trap.
6. `logo` renders the overlay with the punch `<rect>` present and centred; a
   `logo` URL containing `")` is percent-encoded in the inline style.
7. Empty `value` and an over-capacity value both render the error branch: a
   `disabled` button whose accessible name is the visible message, with no
   `aria-pressed` and no SVG.
8. The error branch still forwards `ref` and merges `className` — the reason
   it stayed a button.

## Playground demo

`packages/playground/src/pages/demo/QrCodeDemo.tsx` — basic, with the eocrm
mark, the ECC levels, a Cyrillic value, and the error case. Each example is
wrapped in a sized container, which doubles as the demonstration that the parent
owns the box. A line of copy tells the reader the code is clickable.

The demo passes the existing `packages/playground/src/assets/eocrm-logo.svg`
**unmodified**; the mask recolours it to the QR's ink. That is the "recoloured
logo" requirement, at the cost of zero new assets.

Wired into `App.tsx` (route), `AppShell.tsx` (nav), `DemoIndex.tsx` (grid), and
using the `@lib-source/*` `?raw` pattern the other demos use.

## Files

**New** — `packages/design-system/src/components/QrCode/{qr.ts, qr.test.ts,
QrCode.tsx, QrCode.module.scss, QrCode.tokens.scss, QrCode.test.tsx, index.ts}`
— the encoding, escaping and geometry live in `qr.ts` as pure functions, so they
carry their own test cycle and `QrCode.tsx` stays a rendering concern —
`packages/playground/src/pages/demo/QrCodeDemo.tsx`.

**Modified** — `packages/design-system/src/index.ts`, `src/i18n/{messages,en,ru}.ts`,
`packages/design-system/AGENTS.md`, `packages/design-system/package.json`,
`packages/design-system/CLAUDE.md` (dependency policy), root `package-lock.json`,
`packages/playground/src/{App.tsx,components/AppShell.tsx,pages/DemoIndex.tsx}`.

## Out of scope

Download as PNG, copy-to-clipboard, Numeric/Alphanumeric mode packing,
full-colour logos, a non-interactive variant, decoding.

## Risks

- **`export = qrcode` under `verbatimModuleSyntax: true`.** `esModuleInterop` is
  on and the package ships `dist/qrcode.mjs`, so `import qrcode from
'qrcode-generator'` should resolve. Verify at the first typecheck; it is the
  one integration point that could need a `types/` shim.
- **`mask-image` without a `-webkit-` prefix.** Unprefixed `mask-image` is
  baseline in current Chrome/Safari/Firefox. If the repo's browser target says
  otherwise, add the prefixed pair.
- **jsdom and `mask-image`.** Assert the inline custom property, not a computed
  mask.

## Process

Library change ⇒ branch off fresh `main`, PR, and the mandatory
`pre-push-review` loop (design-system Hard rule 8) before ready-for-review.
