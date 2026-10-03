# `<Screen>` — full-bleed / centered screen layout

```tsx
// Standalone (full viewport) — auth / 404 / error
<Screen
  backdrop="accent"
  header={<Link to="/">← Home</Link>}
  footer={<Cluster gap="lg"><Link>Privacy</Link><Link>Terms</Link></Cluster>}
>
  <ErrorState title="Page not found" actions={<Button>Go home</Button>} />
</Screen>

// In-app variant — fills the shell content area instead of the viewport
<Screen fill="block">
  <ErrorState title="Page not found" />
</Screen>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes | The centered main content. |
| `header` | `ReactNode` | no | Pinned-top slot — a back link, wordmark, etc. Omit for none. |
| `footer` | `ReactNode` | no | Pinned-bottom slot — legal / footer links. Omit for none. |
| `fill` | `'viewport' \| 'block'` | no | Screen height. Defaults to `'viewport'`. - `'viewport'` — `min-height: 100vh`; a true standalone page (login, standalone 404 / error). - `'block'` — fills its container instead of the viewport; use when the Screen is embedded inside the app shell's content area (the in-app 404 / error variants). |
| `backdrop` | `'none' \| 'plain' \| 'accent' \| 'danger'` | no | Backdrop behind the content. Defaults to `'none'` (transparent — inherits the surface; use with `fill="block"` inside the shell). - `'plain'` — solid subtle surface. - `'accent'` — accent-tinted radial (the login backdrop). - `'danger'` — danger-tinted radial (standalone error screen). |
| `align` | `'center' \| 'start'` | no | Vertical placement of the main content. Defaults to `'center'`. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- Page-root layout for **chromeless** screens that render outside the app shell (sign-in, 404, error, onboarding). Three slots: pinned `header`, centered `children` (main), pinned `footer`.
- Layout-owning primitive (the `<Page>` / `<Rail>` exception to "no layout properties"). Don't nest inside `<Page>` or another `<Screen>`. For a normal in-shell page use `<Page>`; to center a small element use `<Cluster>` / `<Stack>`.
