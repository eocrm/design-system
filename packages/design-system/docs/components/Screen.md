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

- Page-root layout for **chromeless** screens that render outside the app shell (sign-in, 404, error, onboarding). Three slots: pinned `header`, centered `children` (main), pinned `footer`.
- `fill`: `'viewport'` (**default**, `min-height:100vh`) / `'block'` (fills its container — use inside the shell content area).
- `backdrop`: `'none'` (**default**, transparent) / `'plain'` (subtle solid) / `'accent'` (soft accent wash — the login backdrop) / `'danger'` (danger wash — standalone error).
- `align`: `'center'` (default) / `'start'` — vertical placement of the main slot.
- Layout-owning primitive (the `<Page>` / `<Rail>` exception to "no layout properties"). Don't nest inside `<Page>` or another `<Screen>`. For a normal in-shell page use `<Page>`; to center a small element use `<Cluster>` / `<Stack>`.
