# `<ErrorState>` — page-level status / result screen

```tsx
// 404 — neutral
<ErrorState
  icon={<Compass size={48} aria-hidden="true" />}
  title="Page not found"
  description="The page you're looking for doesn't exist or has been moved."
  actions={<Button>Go to homepage</Button>}
/>

// Error-boundary fallback — danger tone → role="alert"
<ErrorState
  tone="danger"
  icon={<TriangleAlert size={48} aria-hidden="true" />}
  title="Something went wrong"
  actions={<Button>Try again</Button>}
  extra={<Text size="sm" tone="muted">Error ID: a1b2-c3d4</Text>}
/>

// Page-level loading → error transition. This Card intentionally owns the
// existing page-level status surface and stays mounted across both states.
<Card role="status" aria-busy={!failed}>
  {failed ? (
    <ErrorState
      tone="danger"
      role={undefined}
      size="md"
      headingLevel={2}
      title="We couldn't load the account"
      actions={<Button onClick={retry}>Try again</Button>}
    />
  ) : (
    <Text>Loading account details…</Text>
  )}
</Card>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `icon` | `ReactNode` | no | — | Icon rendered above the title. Pass a lucide icon (sized by the consumer — lg=48, md=32, sm=24), custom SVG, or any ReactNode. The icon's color is set by `tone`; pass `aria-hidden="true"` on it when purely decorative. |
| `title` | `ReactNode` | yes | — | Required title, rendered as a semantic heading (default `<h1>` — it's usually the page heading). Accepts ReactNode for inline emphasis. |
| `description` | `ReactNode` | no | — | Optional description rendered below the title. |
| `actions` | `ReactNode` | no | — | Optional action(s) below the description — a `<Button>` or a `<Cluster gap="sm">` of buttons. Keep to ONE primary action. |
| `extra` | `ReactNode` | no | — | Optional supplemental content rendered below the actions — e.g. an `Error ID: …` line or a "view status" link. Reads as metadata, not primary copy. Distinct from `description`, which sits above the actions. |
| `tone` | `ErrorStateTone` | no | — | Status tone. Defaults to `'neutral'`. - `'neutral'` — informational (404 / not-found). Icon uses `--color-fg-muted`. - `'danger'` — an error (500 / crash). Icon uses `--color-danger`, and the wrapper gets `role="alert"` so an error-boundary fallback announces on mount. Override the role by passing your own `role`. |
| `size` | `ErrorStateSize` | no | — | Visual size. Defaults to `'lg'` (full-page hero). Use `'sm'` / `'md'` when the state is embedded in a smaller surface. |
| `align` | `ErrorStateAlign` | no | — | Horizontal alignment of the stacked content. Defaults to `'center'`. Use `'start'` in a tight column where centering looks stranded. |
| `headingLevel` | `ErrorStateHeadingLevel` | no | — | Heading level for `title`. Defaults to `1` (page-level). Lower it when the screen is nested under an existing heading. Values outside `1–6` clamp to `1`. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- Page-level sibling of `<EmptyState>` — the component EmptyState's docs point to for "page-level 404 / 500" and danger-tinted error states. Use `<EmptyState>` for "nothing here" inside a surface; use `<Alert tone="error">` for an in-flow banner.
- Slots: `icon`, `title` (required, semantic heading), `description`, `actions`, and `extra` (below the actions — error ID, status link).
- `tone`: `'neutral'` (default — 404; muted icon) / `'danger'` (error; red icon + `role="alert"` on the wrapper so a boundary fallback announces on mount, overridable via `role`).
- `size`: `sm` / `md` / `lg` (**default** — full-page hero). `align`: `'center'` (default) / `'start'`.
- `headingLevel` defaults to `1` (the page h1); lower it when nested. Values outside 1–6 clamp to 1.
- `tone="danger"` makes the wrapper `role="alert"` (announces the whole subtree assertively on mount — ideal for an error-boundary fallback). For a _standalone_ error page, pass `role={undefined}` so it isn't read as a wall of text on load. Override via `role`.
- **Loading → error in an existing page-level surface:** the example's Card is intentionally the stable page-level transition surface, not a recommendation to nest ErrorState in arbitrary cards. Keep that one `Card role="status" aria-busy={!failed}` mounted, with either loading content or `<ErrorState role={undefined}>` inside it. A live region mounted together with the error has no mutation to announce, and a page-sized assertive alert is inappropriate for this update.
- For `tone="neutral"`, the `<section>` is not a screen-reader landmark unless it has an accessible name — pass `aria-label` / `aria-labelledby` when it IS the page's primary region (typical for a full-page 404).
- No automatic `aria-hidden` on the icon — pass `aria-hidden="true"` for a decorative icon. No i18n — all copy is consumer-supplied.
- Not for a status the tone scale doesn't cover (warning / success) — extend the `ErrorStateTone` union rather than repurposing `danger`.
- ❌ Multiple primary buttons — one clear primary; secondaries are `variant="secondary"` / `ghost`. ❌ A long sentence as `title` — it is the page heading, keep it short.

```tsx
// Centered inside a Screen (standalone page)
<Screen backdrop="accent">
  <ErrorState title="Page not found" actions={<Button>Go home</Button>} />
</Screen>
```
