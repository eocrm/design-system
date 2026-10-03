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

## Theming via component tokens

Every component ships a `Component.tokens.scss` file alongside its `.module.scss`, defining `--<component>-<part>-<state>` CSS custom properties at `:root`. The `.module.scss` references those tokens instead of the global primitives. This lets consumers re-theme one component without affecting others.

**Pattern:**

- Token name: `--<component>-<part>[-<state>]`. Component is kebab-cased (`--data-table-*`, `--dropdown-menu-*`, `--page-header-*`). Part is the surface (`bg` / `fg` / `border-color` / `radius` / `padding-x` / `height` / `ring` / etc.). State is appended when there's a state variant (`hover` / `active` / `focus` / `disabled` / `checked` / `selected` / `invalid`).
- Defaults: every component token defaults to the same primitive the SCSS used before this layer existed. Overriding the token re-themes the component without touching the primitive.

**Override globally (every Button in the app turns red):**

```css
:root {
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

The authoritative list of tokens per component lives in that component's `<Name>.tokens.scss` file. Read it to see what's available.

**Deprecated:** `--color-badge-<tone>-bg/-fg` tokens are aliased to the new `--badge-bg-<tone>` / `--badge-fg-<tone>` tokens. They still work but will be removed in a future major version.
