# Theming

Dark theme and per-component token overrides.

## Dark theme

The library ships a full dark palette, driven entirely by CSS. There is **no theme component, no React context, no JS API** — you control it with one attribute on `<html>`:

| `<html>` attribute   | Result                                                 |
| -------------------- | ------------------------------------------------------ |
| _(none)_             | **System** — follows the OS via `prefers-color-scheme` |
| `data-theme="light"` | **Forced light** (wins over a dark OS)                 |
| `data-theme="dark"`  | **Forced dark** (wins over a light OS)                 |

```html
<html data-theme="dark">
  …
</html>
```

An opt-in brand accent (`data-accent` on `<html>`) is independent of `data-theme`; see [Accent](../README.md#accent).

`color-scheme` is set automatically for each state, so native form controls and the browser chrome match the theme. The reset paints `body` with `--document-background` (default `var(--color-bg-subtle)`), matching the base beneath `<Screen>` and `<AppLayout>` so a sibling route swap does not flash a contrasting document color. Override that token in `:root` after the global stylesheet import when an application needs a different canvas; do not replace the reset's `body` rule. Scrollbars go a step further: `reset.scss` applies `scrollbar-width: thin` + a token-colored `scrollbar-color` to every element, so every scroller in the app is thin and theme-colored rather than OS-default. Opt a scroller out with its own `scrollbar-width: auto` / `scrollbar-color: auto` — or drop the bar altogether with `scrollbar-width: none`, which is what a **collapsed** `<Rail>` does: a gutter is a quarter of the 56px rail's inner width. With no bar to drag, it scrolls by wheel/trackpad and scroll-into-view on Tab.

**What flips for free:** every component whose colors resolve through the design tokens — which is all of them. Surfaces, text, borders, the accent and semantic palettes, shadows, overlays, focus rings, Badge tones, and Tooltip all redefine under dark with zero markup changes.

**Your responsibility:**

- **Set the attribute.** The library reads it; it never writes it (it performs no _imperative_ DOM mutation — the one thing `<AppProvider>` injects is a declarative `<style>` for `tokens` overrides, see [Setup](setup.md#setup-once-per-consuming-app)). Persist the user's choice (e.g. `localStorage`) and apply it: `'light'`/`'dark'` → `document.documentElement.dataset.theme = choice`; `'system'` → remove the attribute.
- **Add the no-flash snippet** (below) so a forced light/dark choice doesn't flash the default theme before your bundle boots.
- **Theme-aware images.** Raw `<img>` assets with baked-in colors (e.g. a logo SVG) can't be recolored by CSS — swap the `src` per theme if it matters. The `<Logo>` wordmark _text_ flips automatically (`--color-fg`); the image mark does not.

The 30-color categorical `--color-palette-*` set flips in dark too — same hue, dark tinted bg + light fg.

**Out of scope (theme-independent by design):** avatar identity colors and BrandIcon brand marks.

### No-flash snippet

Inline this in your app's `<head>` **before** your bundle loads. It applies the persisted choice before first paint. `'system'`/unset writes nothing → the CSS media query handles it with no flash either way.

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('your-theme-key');
      if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    } catch (e) {
      /* localStorage blocked (private mode) — fall back to System */
    }
  })();
</script>
```

### Scoping a theme to part of the page

`data-theme` also works on any element below `<html>`: `data-theme="dark"` re-themes that subtree dark and `data-theme="light"` re-themes it light, whatever the page theme. That covers everything inside it, components included: the global tokens, every component's tokens, the page's `data-accent` in the subtree's theme, the coarse-pointer touch sizes, and `color-scheme`, so native controls match. Nesting works both ways (light inside dark inside light), and an unattributed element follows its nearest themed ancestor.

```html
<html data-accent="ocean" data-theme="light">
  …
  <div data-theme="dark">
    <svg fill="var(--color-accent-bg-subtle)">…</svg>
    <!-- the ocean accent's DARK values, inside a light page -->
    <button class="…">…</button>
    <!-- a library Button here renders dark too -->
  </div>
</html>
```

- **The root keeps its own rules.** `<html>` still resolves forced light/dark, or the OS preference when unset; a subtree only ever affects itself and its descendants.
- **Overlays follow the page theme, not the subtree.** Tooltip, Popover, DropdownMenu and other menus, and Modal/Drawer dialogs portal to `<body>`, so they render outside the subtree and take the page theme.
- **`<AppProvider tokens / darkTokens>` overrides already work inside subtrees.** They are re-emitted for `[data-theme]` subtrees at a higher specificity than the library's.
- **Hand-written overrides need `[data-theme]` too.** The library re-declares its tokens on every `[data-theme]` element, so a plain `:root { … }` override is hidden inside a themed subtree.
  - **Component tokens** (`--button-*`, …): write the override as `:root, [data-theme] { … }` (examples below). The library's component blocks use the zero-specificity `:where(:root [data-theme])`, so yours wins regardless of load order.
  - **Global tokens** (`--color-*`, …): use `<AppProvider tokens / darkTokens>`. The library's subtree blocks for these are theme- and accent-specific, so a hand-written rule would have to out-rank them in every theme and accent.

## Theming via component tokens

Every component defines `--<component>-<part>-<state>` CSS custom properties at `:root` (in the shipped CSS), and its styles reference those tokens instead of the global primitives. This lets consumers re-theme one component without affecting others.

**Pattern:**

- Token name: `--<component>-<part>[-<state>]`. Component is kebab-cased (`--data-table-*`, `--dropdown-menu-*`, `--page-header-*`). Part is the surface (`bg` / `fg` / `border-color` / `radius` / `padding-x` / `height` / `ring` / etc.). State is appended when there's a state variant (`hover` / `active` / `focus` / `disabled` / `checked` / `selected` / `invalid`).
- Defaults: every component token defaults to the same primitive the SCSS used before this layer existed. Overriding the token re-themes the component without touching the primitive.

**Override globally (every Button in the app turns red):**

```css
/* `[data-theme]` too, so the override also applies inside themed subtrees. */
:root,
[data-theme] {
  --button-bg: red;
  --button-bg-hover: darkred;
}
```

**Override per-scope (only Buttons inside this region turn red):**

```css
.danger-zone {
  --button-bg: red;
  --button-bg-hover: darkred;
}
```

```tsx
<div className="danger-zone">
  <Button>Delete</Button>
</div>
```

**Override per-instance (one Button, inline):**

```tsx
<Button style={{ '--button-bg': 'red' } as React.CSSProperties}>Delete</Button>
```

A component's tokens are the `:root, :where(:root [data-theme])` block at the top of its shipped stylesheet, `dist/components/<Name>/<Name>.css` (e.g. `node_modules/@eocrm/design-system/dist/components/Button/Button.css`). They are plain `--<component>-*` custom properties, also inspectable in browser devtools on `:root`.

**Deprecated:** `--color-badge-<tone>-bg/-fg` tokens are aliased to the new `--badge-bg-<tone>` / `--badge-fg-<tone>` tokens. They still work but will be removed in a future major version.

## Touch devices

On coarse pointers (`@media (pointer: coarse)`) every interactive target is at least `--size-touch` (44px). Fine pointers (mouse, trackpad) are unchanged.

- **Per-component tokens.** Components raise their own size tokens inside a `@media (pointer: coarse)` block in their `*.tokens.scss`, so the touch size is just another token value you can read and override.
- **`--size-touch`.** The shared 44px floor, a semantic token on `:root`.
- **Hit-area pattern.** Small controls inside compact parts (a chip's remove button) keep their compact look. The `touch-hit-area` mixin adds an invisible `::before` of at least `--size-touch` square, centred on the control with direction-agnostic logical insets, so the tap target is 44px without changing the visual. The mixin claims the host's `::before` and gives the host a zero-specificity `position: relative`, so a position you set through `className` (absolute, fixed, sticky) still wins and still contains the hit area. Don't use it on a host that already styles `::before`; an `overflow: hidden` host clips the hit area; and neighbours overlapping the area lose taps to this host.
- **16px text on iOS.** Text inputs use at least 16px on coarse pointers; iOS Safari zooms the page on focus into anything smaller.

**Opting out.** Override the component's token in your own `@media (pointer: coarse)` block, loaded after the library CSS:

```css
@media (pointer: coarse) {
  :root,
  [data-theme] {
    --<component>-<token>: <desktop value>;
  }
}
```
