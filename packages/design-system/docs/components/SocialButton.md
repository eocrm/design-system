# `<SocialButton>` — provider sign-in button

```tsx
<SocialButton provider="google" label="Continue with Google" onClick={signIn} />
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `provider` | `'google' \| 'yandex' \| 'github'` | yes | Which provider's brand mark to show. Tied to `<BrandIcon>`'s set, so it grows as BrandIcon does (today: `'google'` / `'yandex'` / `'github'`). |
| `label` | `ReactNode` | yes | The button text — e.g. `"Continue with Google"`. Required (consumer-supplied). |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'danger-outline' \| 'success'` | no | Button variant; the values are Button's. Defaults to `secondary`, not Button's `primary`. |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | no | Control height (matches the shared `--size-*` scale used by Input and Avatar). - `xs` (20px) — icon-only or very dense inline actions (row controls, chip-adjacent buttons). Pass `aria-label` when icon-only. Below WCAG 2.5.5 Level AAA touch-target guidance; reserve for desktop-first surfaces. - `sm` (24px) — dense toolbars, tables, inline actions. - `md` (32px, default) — most contexts. - `lg` (40px) — marketing-style empty states or emphasized primary actions. |
| `fullWidth` | `boolean` | no | Fill the container's inline size (`inline-size: 100%`). Content stays centred unless `align="start"`. A label too long for the width wraps and the button grows (the size's height becomes a minimum). For a full-width submit on a narrow form, or (with `align="start"`) a master–detail / navigation list row. Ignored with `iconOnly`. Defaults to `false` (content width). |
| `align` | `'start' \| 'center'` | no | Where the content sits when the button is wider than it: `center` (default) or `start` (the inline start — left in LTR, right in RTL). Pair `align="start"` with `fullWidth` and `variant="ghost"` + `selected` (+ `aria-current="true"` on the current row) for a master–detail or navigation list whose labels line up; to choose a value use `RadioGroup`. Ignored with `iconOnly`. |
| `loading` | `boolean` | no | Show an in-button spinner while an async action runs. The children stay rendered (transparent) so the button keeps its width, and a small indeterminate spinner is centred over them. While `true` the button sets `aria-disabled="true"` and ignores clicks and form submission (the consumer's `onClick` is not called; with `as="a"` the navigation is prevented) but stays focusable. It does NOT use the native `disabled` attribute: that would drop focus from the control mid-action. Assistive tech: the accessible name is unchanged and a visually hidden polite live region (`role="status"`) announces `loadingLabel` when it turns true. The region renders only when the prop is passed at all (either value), so pass `loading={false}` rather than omitting it for a button that can later load: a region added together with its text is not announced. Defaults to `undefined` (no region, not loading). |
| `loadingLabel` | `string` | no | Text the polite live region announces while `loading` is true, already translated by the caller (e.g. `t('common.saving')`). Without it nothing is announced and a dev-only `console.warn` fires once per instance. This is a deliberate, documented exception to Hard rule 9 (no per-component label props): Button must stay free of the i18n catalogue so a Button-only import stays small. Defaults to `undefined`. |
| `as` | `"button"` | no | Render a different element — the case that matters is `as="a"` with `href`, for a link that must LOOK like a button (an external console, a download, an IdP hand-off). The element named here is what actually renders, and its own attributes are typed: `href` is REQUIRED when `as="a"` (an anchor without one is neither focusable nor a link) and rejected otherwise; `target`/`rel`/`download` come through. Never navigate from `onClick`. Reach for `<Link>` first. `<Link>` is link-SHAPED navigation — inline text in a sentence, a table cell, a breadcrumb. `<Button as="a">` is for a destination that sits in a row of buttons and must carry their weight. Either way the element is a real anchor, so assistive tech announces a link and the browser gives middle-click, "open in new tab", and the status bar preview — none of which a `<button onClick={() => navigate()}>` has. `type="button"` is emitted only for a real `<button>`; an anchor never gets it. Everything else — variant, size, `iconOnly`, `selected`, the focus ring — is unchanged. Default: `'button'`. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- A `<Button>` with the provider's `<BrandIcon>` mark + `label`. Spreads Button props (`onClick`, `size`, `disabled`, …); width comes from the parent.
- The mark is decorative — `label` is the accessible name. For a non-SSO icon button use `<Button>` + a lucide icon.

```tsx
<Stack gap="sm">
  <SocialButton provider="google" label="Continue with Google" onClick={signInWithGoogle} />
  <SocialButton provider="yandex" label="Continue with Yandex" onClick={signInWithYandex} />
</Stack>
```
