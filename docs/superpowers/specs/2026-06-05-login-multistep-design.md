# Multi-step Login mockup + eocrm logo — design

**Date:** 2026-06-05
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `playground` (mockup + AppShell tooling; never published)

## Problem / goal

Two things:

1. Turn the existing single-step Login mockup (`src/pages/mockups/Login/Login.tsx`) into an **identifier-first, two-step** sign-in: step 1 collects the email; step 2 shows that email as a compact label and collects the password — made to read as **one card that morphs**, not a multi-page wizard.
2. Add the **eocrm logo** to the login screen and replace the AppShell rail's brand mark with it.

This exercises the form primitives and the `Link as="button"` affordance shipped in #122 ("Change" action), and gives the brand a real mark instead of the `OC` text placeholder.

## Logo asset

- Source: `/Users/dpws/projects/eocrm/docs/logo.svg` — a 160×160, 3-path `#0052CC` layered-hex mark.
- Add it to the playground at **`packages/playground/src/assets/eocrm-logo.svg`** (verbatim copy). Vite (no svgr plugin) resolves `import logo from '…/eocrm-logo.svg'` to a **URL string**, which is base-path-correct for the Pages build.
- **Login mockup (Rule 6 — library components only):** render via `<Image src={logo} alt="eocrm" objectFit="contain" radius="none" width={36} height={36} />`. `Image` is a library component, so this is compliant (no raw `<img>`/`<svg>`); the imported URL is just data, like the mockups' mock data.
- **AppShell rail (playground tooling — Rule 6 N/A):** a plain `<img src={logo} … />` mark.

## AppShell brand (tooling — `src/layout/AppShell/AppShell.tsx` + `.module.scss`)

Replace the current `BrandMark` (an `OC` text box + `Orbit CRM` / `Free trial`) with:

- Expanded rail: the **logo mark** (`<img>`, ~28px) + the **`eocrm`** wordmark, with the existing `Free trial` plan subline kept.
- Collapsed rail: the **mark only** (reads collapsed state from `useRail()` as today).
- The `.brandMark` styles (the 32×32 accent box) are replaced by sizing for the `<img>`; `.brand` / `.brandText` / `.brandName` / `.brandPlan` layout stays. No other AppShell behavior changes.

## Login mockup — two-step morphing card (`src/pages/mockups/Login/Login.tsx`)

Same outer `Screen` (`backdrop="accent"`, the existing back-to-mockups header + Privacy/Terms/Status footer). Above the `Card`, a centered brand block: `<Image>` mark + `eocrm` wordmark (replacing today's bare `eocrm` text).

State (mockup-local): `step: 'email' | 'password'`, `email`, `password`, `emailError`, `passwordError`, `formError`. The single `Card` keeps the same logo + `Sign in` title across both steps; **only the body swaps** — no step counter / wizard chrome.

### Step 1 — email

- Subtitle: "Enter your email to continue to your workspace."
- `Continue with Google` (`Button variant="secondary"` + `BrandIcon name="google"`).
- `Divider` "OR".
- **Email** — label (`Text as="label"`) + `Input type="email"`, with inline error `Text` (existing `EMAIL_RE` check).
- **Continue** (`Button variant="primary"`).
- Enter in the email input → same as Continue.

### Step 2 — password

- Subtitle: "Enter your password."
- **Identity row** — `<Card padding="sm">` containing a `Cluster` of: a lucide `Mail` icon, the email address (`Text`, grows), and a **`Change`** action rendered as `<Link as="button" type="button">` that returns to step 1 with `email` preserved (clears `passwordError` / `formError`).
- If `formError`, an `Alert tone="error"` ("Couldn't sign you in").
- **Password** — a label row (`Cluster justify="between"` of `Text as="label"` + `Link href="/forgot-password"` "Forgot?") + `PasswordInput` (`capsLockWarning`), inline error `Text`.
- `Checkbox` "Keep me signed in" (default checked).
- **Sign in** (`Button variant="primary"`).
- Enter in the password input → same as Sign in.

### Behavior / validation

- **Advance to step 2:** Continue validates email with `EMAIL_RE`; on pass, `setStep('password')` (and clears email error); on fail, sets `emailError`, stays on step 1.
- **Change / back:** returns to step 1; keeps `email`; clears `passwordError` + `formError`.
- **Sign in:** validates `password.length >= 6`; on fail sets `passwordError`; on pass simulates an auth failure → `formError = 'Invalid email or password.'` (keeps the error-state Alert reachable for stakeholders, as today).
- No backend — all state is component-local. No real auth.

## Rule-6 / accessibility notes

- No raw HTML / inline styles / co-located SCSS in the mockup. The identity-row border + the brand block come from `Card` / `Image` / `Stack` / `Cluster` (gaps via props). lucide `Mail` + `react-router-dom` `Link` (as the `as` target for the header back-link) are the allowed exceptions.
- One `<h1>` per page (the `Title order={1}` "Sign in"); inputs keep `htmlFor`/`id` label association and `aria-describedby` for errors; the `Change` action is a real focusable `<button>` (the #122 fix gives it the pointer cursor).
- Logo `<Image alt="eocrm">` (it conveys the brand name alongside the wordmark; not decorative).

## Files

- **Create:** `packages/playground/src/assets/eocrm-logo.svg` (copied from the eocrm docs logo).
- **Modify:** `packages/playground/src/pages/mockups/Login/Login.tsx` (two-step + logo).
- **Modify:** `packages/playground/src/layout/AppShell/AppShell.tsx` + `AppShell.module.scss` (brand mark → logo).
- **Modify:** `packages/playground/src/pages/mockups/registry.ts` — sync the Login entry's `usesComponents` (add `Image`; ensure the listed set matches actual imports). No new `ComponentName` (Image already exists in the union if used elsewhere; add it if not).
- Login is already routed (`/mockups/login`), in the rail nav, and in `FULL_BLEED_PATHS` — no routing changes.

## Verification

- Gates: `make test`, `make build` (typecheck + bundle), `make lint`, `npm run format:check`.
- **Playground Hard rule 7** mockup review-fix loop (fresh-context reviewer over the changed Login mockup + registry; 10 categories) until "clean enough to stop". The AppShell change is tooling and is out of Rule 7's scope, but include it in review for correctness.
- Manual smoke: `/mockups/login` — step 1 shows email + Continue; invalid email blocks; Continue → step 2 shows the identity row + password; Change → back to step 1 with email kept; invalid password blocks; Sign in → error Alert; the logo shows above the card and in the rail header (and the rail collapses to the mark).

## Non-goals

- No real authentication / backend.
- No change to the library (`Image`, `Link`, `Field`, etc. are used as-is). The eocrm logo is consumer brand — it lives in the playground, not the design system.
- No new login features (SSO providers beyond the existing Google button, magic-link, 2FA, etc.).

## Branch

`feat/login-multistep`, off `main`. Its own PR.
