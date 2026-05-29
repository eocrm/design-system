# Login screen — playground mockup

## Goal

A believable, full-screen **eocrm sign-in** screen in the playground's mockups section
(`/mockups/login`), built from `@eocrm/design-system` primitives. It dogfoods the form
surface (Input, PasswordInput, Checkbox, Button, Alert, Link) in a realistic composition and
gives stakeholders/agents a reference for what an auth screen looks like on this design system.

Grounded in the canonical eocrm signin design
(`/Users/dpws/projects/eocrm/docs/design/2026-04-28-elevated-direction/signin.jsx`).

This is a **mockup, not a library component** — no tests/exports/AGENTS.md entry. It "exists"
when it's routed, in the sidebar, and in the registry, and it passes the Rule-7 review loop.

## Locked-in decisions (brainstorm)

1. **Artifact:** playground mockup under `src/pages/mockups/Login/Login.tsx`.
2. **Layout — "Direction C":** an elevated `Card` floating on a soft, tinted radial backdrop;
   `eocrm` wordmark centered above the card.
3. **Chrome:** **full-screen** — the login owns the viewport, no CRM sidebar/topbar behind it.
4. **Included blocks:** Continue with Google (+ "OR" divider), footer links (Privacy · Terms ·
   Status), and an **error-state demo** (inline field validation + an `Alert` on failed submit).
   Always present: Email, Password (with "Forgot?"), "Keep me signed in" (checked by default),
   primary "Sign in".
5. **Omitted:** "Create an account" link (kept minimal — invite-only CRM feel).
6. **Copy** is grounded in the reference and hardcoded in English (mockups don't use i18n; cf.
   Dashboard): title "Sign in"; subtitle "Welcome back. Enter your email to continue to your
   workspace."; email placeholder "you@company.com"; password placeholder "••••••••"; error
   "Invalid email or password.".

## Correction to the verbal design

The verbal design mentioned a `Login.module.scss` for page chrome. **That is forbidden** by
playground Hard rule 6 — mockups may not use co-located `*.module.scss`, inline `style={}`, or
raw HTML tags. Page chrome is instead handled with the repo's established **token-based
inline-mock escape hatch** (the exact idiom `Dashboard.tsx` uses for its `StatTile` mock,
lines 95–108): a raw element with inline `style` whose values are **design tokens**
(`var(--color-…)`, `var(--space-…)`, `var(--radius-…)`) — never raw hex — preceded by a
`{/* TODO: replace when <X> ships — see components/TODO.md */}` comment and backed by a
`TODO.md` entry. The "Direction C" gradient is composed from existing color tokens, so the look
survives the rules.

## Composition (primitives)

Inside the card, everything is a library primitive:

```
Card (padding="lg")
└─ Stack (gap="lg")
   ├─ Stack (gap="xs")
   │   ├─ Title order={1} size="lg"        "Sign in"
   │   └─ Text size="sm" tone="muted"       welcome subtitle
   ├─ Button variant="secondary"            ⟨G⟩ Continue with Google   (full-width)
   ├─ «OR divider»                          (escape hatch — see Gap 2)
   ├─ [Alert tone="error"]                  shown only after a failed submit (Gap: error demo)
   ├─ Stack (gap="md")  // fields
   │   ├─ Stack (gap="xs")
   │   │   ├─ Text as="label" htmlFor="login-email" weight="medium"   "Email"
   │   │   ├─ Input id="login-email" type="email" autoComplete="email"
   │   │   │        placeholder="you@company.com" invalid={…} aria-describedby={…}
   │   │   └─ Text id="login-email-err" size="sm" tone="danger"        (conditional)
   │   └─ Stack (gap="xs")
   │       ├─ Cluster justify="between" align="baseline"
   │       │   ├─ Text as="label" htmlFor="login-password" weight="medium"   "Password"
   │       │   └─ Link href="#"                                              "Forgot?"
   │       ├─ PasswordInput id="login-password" autoComplete="current-password"
   │       │        placeholder="••••••••" capsLockWarning revealable
   │       │        invalid={…} aria-describedby={…}
   │       └─ Text id="login-password-err" size="sm" tone="danger"           (conditional)
   ├─ Checkbox label="Keep me signed in" defaultChecked
   └─ Button variant="primary" type="submit" onClick={submit}                "Sign in" (full-width)
```

- **Full-width buttons:** the buttons sit directly in a `Stack`, whose default `align="stretch"`
  stretches children to the card width — so both buttons span full-width with no extra mock.
  Verify visually in the playground; if a Button caps its own width, that's a contained tweak
  inside the auth-screen escape hatch, **not** a new one.
- **Icons:** `lucide-react` is a demo-only dep already used by mockups (Dashboard). The
  Google brand "G" is *not* in lucide and is multi-color → Gap 3.

## Escape-hatch gaps (each gets a TODO.md entry + inline `{/* TODO… */}` comment)

These are genuine library gaps the mockup surfaces — mockups are the "canary for missing
primitives." Each inline mock is token-based and contained to the smallest block.

**Gap 1 — `<AuthScreen>` (full-viewport centered backdrop).** No primitive paints a page-level
gradient or centers content in the viewport. One outer mock element owns the full-bleed layout:
a viewport-height grid with three rows — a top-left "← Back to mockups" `Link` (demo affordance),
a centered middle holding the wordmark + card, and a bottom footer row of `Link`s. The inline
`style` is confined to the outer grid **container** (rows template, `min-height: 100vh`, backdrop,
padding); each row's contents use `Stack` / `Cluster` / `Link` / `Text` primitives. Backdrop:
`radial-gradient(120% 90% at 50% -8%, var(--color-accent-subtle-bg) 0%, var(--color-bg-subtle) 52%)`
(token stops — exact token names confirmed in planning; the real eocrm has an `AuthCardLayout`,
so this is a real CRM gap). The `eocrm` wordmark renders via `Text`/`Title` (no extra hatch).

**Gap 2 — `Divider` with a centered "OR" label.** `Divider` exposes only
orientation/variant/size — no label slot, and flanking rules need `flex: 1` which components
don't own. Inline-mock a row of two token-bordered rules + a `Text size="xs" tone="subtle"` "OR".
TODO: add label support to `Divider`.

**Gap 3 — Google brand mark.** No colored brand icon in the library or lucide. Inline-mock the
official 4-color "G" `<svg>` at the SSO button's left. TODO: a brand-icon/asset entry.

No `<form>` element (Hard rule 6): submission is wired via the primary `Button`'s `onClick` plus
an Enter-key handler on the password field — not a raw `<form>`.

## Full-screen mechanism (App.tsx + AppShell)

`App.tsx` wraps every route in `<AppShell>`. To make `/mockups/login` full-bleed:

1. `App.tsx` (MODIFY): add `<Route path="/mockups/login" element={<Login />} />` to the existing
   `<Routes>`.
2. `AppShell.tsx` (MODIFY): early-return `children` full-bleed (skip the Rail + TopBar grid) when
   `useLocation().pathname` is the login route. AppShell already reads the location to switch
   sidebar sections, so this is a small, contained guard. (Equivalent to "render outside the
   shell"; chosen over nested `<Routes>` to avoid React-Router splat-path subtlety.)

`App.tsx` / `AppShell.tsx` are playground tooling — Hard rule 6 and the Rule-7 mockup review
loop do **not** apply to them; they push through the normal PR flow.

## Behavior & states (interactive mockup)

Local `useState` only — no network. The inputs are real (typeable, password reveal, caps-lock
warning, checkbox toggles).

- **On "Sign in" (click or Enter in password):**
  - Email fails a simple format check (`/.+@.+\..+/`) → inline `Text tone="danger"` "Enter a
    valid email address." + `Input invalid` + `aria-describedby`.
  - Password < 6 chars → inline "Password must be at least 6 characters." + `PasswordInput invalid`.
  - If both pass → simulate auth failure: render `Alert tone="error" title="Couldn't sign you in"`
    with body "Invalid email or password." above the fields. Deterministic (no timers), so the
    error state is always reachable for the demo.
- Errors clear on edit of the offending field.
- Default render = clean state (the hero). The Alert + invalid borders are the error-state demo.

## Files

| File | Change |
| --- | --- |
| `packages/playground/src/pages/mockups/Login/Login.tsx` | **NEW** — the mockup |
| `packages/playground/src/App.tsx` | MODIFY — add `/mockups/login` route |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | MODIFY — full-bleed guard for login + Mockups sidebar nav entry |
| `packages/playground/src/pages/mockups/registry.ts` | MODIFY — add `login` entry (all `usesComponents` already in the `ComponentName` union) |
| `packages/playground/src/pages/mockups/MockupsIndex.tsx` | VERIFY — auto-renders from registry; edit only if it does not |
| `packages/design-system/src/components/TODO.md` | MODIFY — add Gap 1/2/3 entries |
| `docs/superpowers/specs/2026-05-29-login-mockup-design.md` | this spec |

`registry.ts` entry:

```ts
{
  slug: 'login',
  title: 'Login',
  path: '/mockups/login',
  blurb: 'Full-screen sign-in — branded card, email/password, Google SSO, error states.',
  usesComponents: [
    'Alert', 'Button', 'Card', 'Checkbox', 'Cluster',
    'Divider', 'Input', 'Link', 'PasswordInput', 'Stack', 'Text', 'Title',
  ],
}
```

No in-page `<CrossLinks>` footer (it would break the full-bleed illusion); the registry entry
still powers the component-demo → mockup "Seen in" links. Note this deviation for the reviewer.

## Wiring & review (definition of done)

1. Route (`App.tsx`) + full-bleed guard & sidebar entry (`AppShell.tsx`) + registry entry +
   MockupsIndex shows it.
2. Each escape-hatch mock has a matching `TODO.md` entry and inline `{/* TODO… */}` comment.
3. Gates green: `make test`, `make build`, `make lint`.
4. **Rule-7 review loop** (mockup change): spawn a fresh-context reviewer against the 10
   categories, fix every Critical/Important, re-run gates, repeat until "clean enough to stop".
5. PR off `feat/login-mockup` → wait for `Quality / check` → merge.

## Out of scope

- Real authentication, OAuth, forgot-password / create-account pages, post-login routing.
- Building the `<AuthScreen>`, `Divider` label support, or a brand-icon primitive (filed as
  TODOs only — the mockup inline-mocks them).
- Dark mode, i18n of the mockup's own copy, "remember me" session semantics.
