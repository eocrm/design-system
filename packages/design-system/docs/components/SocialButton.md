# `<SocialButton>` — provider sign-in button

```tsx
<SocialButton provider="google" label="Continue with Google" onClick={signIn} />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `provider` | `BrandName` | yes | — | Which provider's brand mark to show. Tied to `<BrandIcon>`'s set, so it grows as BrandIcon does (today: `'google'` / `'yandex'`). |
| `label` | `ReactNode` | yes | — | The button text — e.g. `"Continue with Google"`. Required (consumer-supplied). |
| `variant` | `ButtonVariant` | no | — | Visual variant. - `primary` (default) — the section's main action. Use **one** per page section. - `secondary` — supporting actions like "Cancel", "Export", "Filter". - `ghost` — tertiary actions in dense UIs (toolbar buttons, row actions). - `danger` — destructive operations only (Delete, Revoke, Remove). Pair with a confirmation if irreversible. - `danger-outline` — a destructive action that must not dominate: surface fill, danger text and border. For a Remove repeated on every row, or a destructive action beside a primary one. Use filled `danger` for the confirm step itself. - `success` — **transient confirmation only**, not an initial state. Flip to `success` for ~1.5s after an action resolves (Save → "Saved!"), then flip back. Never render a button as `success` on mount — it has no action-intent meaning, only post-action feedback. See the `@example` below for the timer pattern. |
| `size` | `ButtonSize` | no | — | Control height (matches the shared `--size-*` scale used by Input and Avatar). - `xs` (20px) — icon-only or very dense inline actions (row controls, chip-adjacent buttons). Pass `aria-label` when icon-only. Below WCAG 2.5.5 Level AAA touch-target guidance; reserve for desktop-first surfaces. - `sm` (24px) — dense toolbars, tables, inline actions. - `md` (32px, default) — most contexts. - `lg` (40px) — marketing-style empty states or emphasized primary actions. |
| `as` | `"button"` | no | 'button' | Render a different element — the case that matters is `as="a"` with `href`, for a link that must LOOK like a button (an external console, a download, an IdP hand-off). The element named here is what actually renders, and its own attributes are typed: `href` is REQUIRED when `as="a"` (an anchor without one is neither focusable nor a link) and rejected otherwise; `target`/`rel`/`download` come through. Never navigate from `onClick`. Reach for `<Link>` first. `<Link>` is link-SHAPED navigation — inline text in a sentence, a table cell, a breadcrumb. `<Button as="a">` is for a destination that sits in a row of buttons and must carry their weight. Either way the element is a real anchor, so assistive tech announces a link and the browser gives middle-click, "open in new tab", and the status bar preview — none of which a `<button onClick={() => navigate()}>` has. `type="button"` is emitted only for a real `<button>`; an anchor never gets it. Everything else — variant, size, `iconOnly`, `selected`, the focus ring — is unchanged. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- A `<Button>` (default `variant="secondary"`) with the provider's `<BrandIcon>` mark + `label`. `provider`: `'google'` / `'yandex'` (BrandIcon's set). Spreads Button props (`onClick`, `size`, `disabled`, …); width comes from the parent.
- The mark is decorative — `label` is the accessible name. For a non-SSO icon button use `<Button>` + a lucide icon.

```tsx
<Stack gap="sm">
  <SocialButton provider="google" label="Continue with Google" onClick={signInWithGoogle} />
  <SocialButton provider="yandex" label="Continue with Yandex" onClick={signInWithYandex} />
</Stack>
```
