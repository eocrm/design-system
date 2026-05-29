# Login Screen Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen `eocrm` sign-in mockup at `/mockups/login` in the playground, built from `@eocrm/design-system` primitives (Direction C: elevated card on a token-tinted backdrop).

**Architecture:** A new `Login.tsx` under `packages/playground/src/pages/mockups/Login/`, composed entirely of library primitives. Two contained, token-based **inline-mock escape hatches** (per playground Hard rule 6 — the same idiom `Dashboard.tsx` uses): the `<AuthScreen>` page-chrome wrapper (full-viewport centering + tinted radial backdrop) and the multi-color Google "G" mark. Full-screen behavior comes from a one-line guard in `AppShell.tsx` that renders the login route without the Rail/TopBar chrome. Wired via `App.tsx` route, `AppShell` sidebar entry, and the mockup `registry.ts`. Verified by `make build` + `make lint` + a visual check + the Hard-rule-7 mockup review loop (the playground has **no** unit tests — 0 `*.test.tsx` files — so there is no TDD step for a mockup).

**Tech Stack:** React 18 + TypeScript, `react-router-dom` (playground-only dep), `@eocrm/design-system`, `lucide-react` (demo-only icons), Vite. Branch: `feat/login-mockup`.

**Brand note (locked):** the wordmark is **`eocrm`** (user's explicit choice — matches the approved mockup + the eocrm reference signin). This deliberately differs from AppShell's "Orbit CRM" demo brand; do **not** "fix" it to Orbit CRM during review.

**Spec:** `docs/superpowers/specs/2026-05-29-login-mockup-design.md`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/playground/src/pages/mockups/Login/Login.tsx` | **NEW** — the entire mockup: composition + interactive validation/error behavior + the two escape-hatch mocks |
| `packages/playground/src/App.tsx` | MODIFY — import `Login`, add `/mockups/login` route |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | MODIFY — full-bleed guard for the login route + a "Login" entry in `mockupItems` + `LogIn` icon import |
| `packages/playground/src/pages/mockups/registry.ts` | MODIFY — add the `login` mockup entry (no `ComponentName` union change needed) |
| `packages/design-system/src/components/TODO.md` | MODIFY — add `<AuthScreen>` and brand-icon gap entries |

`MockupsIndex.tsx` is **not** edited — it renders every non-parameterized `registry.ts` entry automatically (verified: `MOCKUPS.filter((m) => !m.path.includes(':'))`).

---

## Task 1: File the two escape-hatch gaps in TODO.md

Do this first so the inline-mock `{/* TODO… */}` comments in `Login.tsx` reference real entries.

**Files:**
- Modify: `packages/design-system/src/components/TODO.md`

- [ ] **Step 1: Add both entries under the `## Open` section**

Insert these two entries immediately after the `## Open` line (before the existing `<StatTile>` entry), matching the file's existing entry format:

````markdown
### [ ] `<AuthScreen>` (or `<AuthLayout>`) — full-viewport centered surface with a tinted backdrop for auth pages

**Filed:** 2026-05-29
**Mocked in:**

- `packages/playground/src/pages/mockups/Login/Login.tsx` — the outer page wrapper (full-bleed gradient backdrop, vertical layout) and the inner region that centers the card in the remaining viewport height.

**What's needed:**
A page-level layout primitive for sign-in / forgot-password / accept-invite screens: takes over the full viewport (`min-height: 100vh`), paints a subtle token-based backdrop (default a soft accent wash), and lays out three slots — an optional top bar (back-link / brand), a vertically + horizontally centered main slot (the auth card), and an optional footer (legal links). Props sketch: `backdrop?: 'plain' | 'tinted'`, plus `header` / `footer` slots and `children` (the centered content). No interactive state. The real eocrm app has an `AuthCardLayout` serving exactly this role, so the CRM will want it too.

**Current workaround:**
Two raw `<div style={{…}}>` at the exact mock site, token-only values: the outer wrapper (`min-height: 100vh; display: flex; flex-direction: column; padding: var(--space-6); background: radial-gradient(120% 90% at 50% -8%, var(--color-accent-subtle-bg) 0%, var(--color-bg-subtle) 52%)`) and the centering region (`flex: 1; display: grid; place-items: center`). Marked with the standard TODO comment.

**When this ships:** refactor the Login mockup's two wrapper `<div>`s to use the primitive, then tick this checkbox.

### [ ] `<BrandIcon>` / social-login icon set — multi-color brand marks (Google, Microsoft, Apple…)

**Filed:** 2026-05-29
**Mocked in:**

- `packages/playground/src/pages/mockups/Login/Login.tsx` — the Google "G" inside the "Continue with Google" SSO button.

**What's needed:**
A small set of brand / social-provider marks for SSO buttons. These are multi-color, fixed-brand-color assets (Google's 4-color "G", etc.) that intentionally do **not** map to design tokens — brand guidelines mandate the exact colors. `lucide-react` (the demo icon set) has no brand logos. Could ship as a tiny `<GoogleIcon>` / `<BrandIcon name="google">` component or an assets module.

**Current workaround:**
A hand-authored inline `<svg viewBox="0 0 48 48">` with four `<path fill="#…">` brand-hex colors at the exact mock site, `aria-hidden="true"`. Marked with the standard TODO comment. (Note: brand hex is correct here — this is the documented exception to token-only color.)

**When this ships:** refactor the Login SSO button to use the brand icon, then tick this checkbox.
````

- [ ] **Step 2: Verify the file still reads cleanly**

Run: `sed -n '28,40p' packages/design-system/src/components/TODO.md`
Expected: the `## Open` heading followed by the new `<AuthScreen>` entry.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/TODO.md
git commit -m "docs(todo): file <AuthScreen> + brand-icon gaps for login mockup"
```

---

## Task 2: Build the Login mockup

**Files:**
- Create: `packages/playground/src/pages/mockups/Login/Login.tsx`

- [ ] **Step 1: Create `Login.tsx` with the full implementation**

Create `packages/playground/src/pages/mockups/Login/Login.tsx` with exactly this content:

```tsx
import { useState, type KeyboardEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Cluster,
  Divider,
  Input,
  Link,
  PasswordInput,
  Stack,
  Text,
  Title,
} from '@eocrm/design-system';

// Loose client-side shape check only — real validation is server-side.
const EMAIL_RE = /.+@.+\..+/;

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function submit() {
    const nextEmailError = EMAIL_RE.test(email) ? null : 'Enter a valid email address.';
    const nextPasswordError =
      password.length >= 6 ? null : 'Password must be at least 6 characters.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setFormError(null);
      return;
    }
    // No backend in a mockup — simulate an auth failure so the error Alert
    // (the "error-state demo") is always reachable for stakeholders.
    setFormError('Invalid email or password.');
  }

  function onEnter(e: KeyboardEvent) {
    if (e.key === 'Enter') submit();
  }

  return (
    /* TODO: replace when <AuthScreen> ships — see components/TODO.md.
       Full-viewport centered auth layout with a tinted backdrop is page
       chrome no current primitive expresses. Inline style uses tokens only. */
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-6)',
        background:
          'radial-gradient(120% 90% at 50% -8%, var(--color-accent-subtle-bg) 0%, var(--color-bg-subtle) 52%)',
      }}
    >
      <Cluster justify="start">
        <Link as={RouterLink} to="/mockups" variant="muted">
          ← Back to mockups
        </Link>
      </Cluster>

      {/* TODO: replace when <AuthScreen> ships — see components/TODO.md.
          Centers the card in the remaining viewport height (same gap). */}
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <Stack gap="lg" align="center">
          <Text as="span" size="xl" weight="bold">
            eocrm
          </Text>

          <Card padding="lg">
            <Stack gap="lg">
              <Stack gap="xs">
                <Title order={1} size="lg">
                  Sign in
                </Title>
                <Text size="sm" tone="muted">
                  Welcome back. Enter your email to continue to your workspace.
                </Text>
              </Stack>

              <Button variant="secondary">
                {/* TODO: replace when a brand/social icon set ships — see components/TODO.md.
                    Multi-color Google "G"; not in lucide. Brand hex is intentional. */}
                <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-16.5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.4 28.3c-.5-1.4-.8-3-.8-4.3s.3-2.9.8-4.3l-7.8-6.1C1 16.8 0 20.3 0 24s1 7.2 2.6 10.4l7.8-6.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.8-3.8-13.6-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z"
                  />
                </svg>
                Continue with Google
              </Button>

              <Divider>OR</Divider>

              {formError && (
                <Alert tone="error" title="Couldn't sign you in">
                  {formError}
                </Alert>
              )}

              <Stack gap="md">
                <Stack gap="xs">
                  <Text as="label" htmlFor="login-email" weight="medium" size="sm">
                    Email
                  </Text>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onKeyDown={onEnter}
                    invalid={!!emailError}
                    aria-describedby={emailError ? 'login-email-error' : undefined}
                  />
                  {emailError && (
                    <Text id="login-email-error" size="sm" tone="danger">
                      {emailError}
                    </Text>
                  )}
                </Stack>

                <Stack gap="xs">
                  <Cluster justify="between" align="baseline">
                    <Text as="label" htmlFor="login-password" weight="medium" size="sm">
                      Password
                    </Text>
                    <Link href="/forgot-password" variant="default">
                      Forgot?
                    </Link>
                  </Cluster>
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    capsLockWarning
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    onKeyDown={onEnter}
                    invalid={!!passwordError}
                    aria-describedby={passwordError ? 'login-password-error' : undefined}
                  />
                  {passwordError && (
                    <Text id="login-password-error" size="sm" tone="danger">
                      {passwordError}
                    </Text>
                  )}
                </Stack>
              </Stack>

              <Checkbox label="Keep me signed in" defaultChecked />

              <Button variant="primary" onClick={submit}>
                Sign in
              </Button>
            </Stack>
          </Card>
        </Stack>
      </div>

      <Cluster justify="center" gap="lg">
        <Link href="/legal/privacy" variant="muted">
          Privacy
        </Link>
        <Link href="/legal/terms" variant="muted">
          Terms
        </Link>
        <Link href="/status" variant="muted">
          Status
        </Link>
      </Cluster>
    </div>
  );
}
```

Notes for the implementer (do not add as code comments beyond those already shown):
- **No `<form>`** (Hard rule 6 forbids raw `<form>`). Submit fires via the primary Button's `onClick` and an Enter-key handler on both inputs.
- **Buttons full-width:** they sit in a `Stack`, whose default `align="stretch"` stretches children to the card width. Confirm visually in Task 4; if a Button caps its own width, that is a contained tweak inside the AuthScreen escape hatch, not a new one.
- **Inert links:** `Forgot?` / footer links use plausible `href` paths (not `href="#"`, which the Link JSDoc flags as an anti-pattern). They don't resolve inside the playground SPA — that's acceptable for a static mockup; note it for the reviewer.
- **`eocrm` wordmark** is `Text` (not a heading) so the page's single `<h1>` is "Sign in" (`Title order={1}`).

- [ ] **Step 2: Commit**

```bash
git add packages/playground/src/pages/mockups/Login/Login.tsx
git commit -m "feat(mockup): add eocrm full-screen login screen"
```

---

## Task 3: Wire the mockup (route + shell guard + nav + registry)

**Files:**
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Add the import + route in `App.tsx`**

Add the import alongside the other mockup imports (after the `Settings` import on line 12):

```tsx
import { Settings } from './pages/mockups/Settings/Settings';
import { Login } from './pages/mockups/Login/Login';
```

Add the route inside the mockups group (after the `/mockups/audit` route, currently line 93):

```tsx
            <Route path="/mockups/audit" element={<Audit />} />
            <Route path="/mockups/login" element={<Login />} />
```

- [ ] **Step 2: Add the full-bleed guard + nav entry + icon in `AppShell.tsx`**

Add `LogIn` to the `lucide-react` import block (e.g., next to `Activity`):

```tsx
  Activity,
  LogIn,
```

Add a "Login" entry to `mockupItems` (after the `system-settings` item, currently line 84):

```tsx
  { to: '/mockups/system-settings', label: 'System settings', icon: SettingsIcon, end: false },
  { to: '/mockups/login', label: 'Login', icon: LogIn, end: false },
```

Add the full-bleed guard as the first statement in the `AppShell` function body. Change:

```tsx
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const inComponents = pathname.startsWith('/components');
```

to:

```tsx
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  // Full-bleed routes render outside the shell chrome (no Rail / TopBar) so a
  // login screen reads like a real auth page, not a page inside the CRM.
  if (pathname === '/mockups/login') {
    return <>{children}</>;
  }

  const inComponents = pathname.startsWith('/components');
```

- [ ] **Step 3: Add the registry entry in `registry.ts`**

Add this entry to the `MOCKUPS` array (after the `system-settings` entry, before the closing `]`):

```ts
  {
    slug: 'login',
    title: 'Login',
    path: '/mockups/login',
    blurb: 'Full-screen eocrm sign-in — branded card, email/password, Google SSO, error states.',
    usesComponents: [
      'Alert',
      'Button',
      'Card',
      'Checkbox',
      'Cluster',
      'Divider',
      'Input',
      'Link',
      'PasswordInput',
      'Stack',
      'Text',
      'Title',
    ],
  },
```

(No `ComponentName` union change — all twelve names already exist in the union.)

- [ ] **Step 4: Commit**

```bash
git add packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(mockup): wire login route, full-bleed shell guard, nav + registry"
```

---

## Task 4: Gates — typecheck, build, lint

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + build the playground**

Run: `make build`
Expected: completes with no TypeScript errors and a successful Vite bundle. If TS complains about a prop, re-check it against the component source (the props used here are verified against the v-current source: `Input.invalid`, `PasswordInput.capsLockWarning`, `Checkbox.label/defaultChecked`, `Alert.tone/title`, `Divider` children, `Title.order/size`, `Text.as/htmlFor/size/weight/tone`, `Link.as/href/variant`, `Cluster.justify/align`, `Stack.gap/align`).

- [ ] **Step 2: Lint both packages**

Run: `make lint`
Expected: passes. (Stylelint targets `.scss`; `Login.tsx` ships no SCSS, so this mainly confirms nothing else regressed.)

- [ ] **Step 3: Visual smoke (manual, fast)**

Run: `make dev` (starts the playground on http://localhost:8080 without opening a browser; run in the background).
Then drive a browser (Playwright MCP `browser_navigate` → `browser_take_screenshot`, or open it yourself) to `http://localhost:8080/mockups/login` and confirm:
1. **No sidebar / topbar** — the login owns the full viewport.
2. Tinted radial backdrop (light blue at top fading to near-white), `eocrm` wordmark centered above a white elevated card.
3. Card: "Sign in" + subtitle, full-width "Continue with Google" (with the 4-color G), an "OR" divider, Email + Password (with "Forgot?" on the label row + reveal eye), "Keep me signed in" (checked), full-width primary "Sign in".
4. Footer row: Privacy · Terms · Status; top-left "← Back to mockups".
5. **Error-state demo:** click "Sign in" with empty fields → inline red errors under Email + Password. Type a valid email + a 6+ char password → click "Sign in" → the red `Alert` "Couldn't sign you in / Invalid email or password." appears above the fields.
6. Buttons are full-width (Task 2 note). If not, fix inside the AuthScreen mock and re-screenshot.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(mockup): login visual + typecheck fixes"
```
(Skip if Steps 1–3 needed no changes.)

---

## Task 5: Hard-rule-7 mockup review loop

This is **mandatory** — the change touches `packages/playground/src/pages/mockups/**` and `registry.ts`. (It does **not** require the library review loop: the only `packages/design-system/**` change is the `TODO.md` docs edit, which is a docs-only, no-regression change.)

**Files:** none directly (review → fix → re-verify)

- [ ] **Step 1: Confirm gates are green** (Task 4 must pass before review — Rule 7 step 1).

- [ ] **Step 2: Spawn a fresh-context reviewer** (`general-purpose` agent) targeted at `packages/playground/src/pages/mockups/Login/Login.tsx`, `App.tsx`, `AppShell.tsx`, `registry.ts`, and the two new `TODO.md` entries. Brief it on the 10 Rule-7 categories from `packages/playground/CLAUDE.md`:
  1. Hard rule 6 compliance — no stray inline `style`/raw HTML outside the two TODO'd escape-hatch sites; each escape hatch has a matching `TODO.md` entry **and** inline `{/* TODO… */}` comment.
  2. Registry sync — every component used is listed in `usesComponents`; no stale names.
  3. Imports — only from `@eocrm/design-system` (+ `react-router-dom` / `lucide-react` demo deps); no relative paths into the library.
  4. Realism — believable copy, plausible behavior.
  5. Accessibility — one `<h1>` (Sign in), labels associated via `htmlFor`/`id`, inputs wired to error text via `aria-describedby`, the Google `<svg>` is `aria-hidden`, error `Alert` uses `tone="error"` (role="alert").
  6. Keyboard / focus — Tab order matches visual order; Enter submits; password reveal reachable.
  7. Layout discipline — spacing via `Stack`/`Cluster` `gap`, not ad-hoc margins.
  8. Component coverage — uses `Divider` (label), `PasswordInput`, `Alert`, etc. rather than hand-rolling.
  9. State realism — clean + inline-error + Alert states all reachable.
  10. No stale TODOs — both new `TODO.md` entries are open with matching inline comments.

  **Tell the reviewer explicitly:** the `eocrm` wordmark (vs AppShell's "Orbit CRM") and the non-resolving `Forgot?`/footer hrefs are intentional, approved decisions — do not flag them. Ask for output as Critical / Important / Nice-to-have / Regression-watch + a verdict line (`clean enough to stop` or `keep iterating`).

- [ ] **Step 3: Fix every Critical and Important finding.** Document any deliberately-skipped finding in one line.

- [ ] **Step 4: Re-run gates** (`make build`, `make lint`) after fixes.

- [ ] **Step 5: Spawn another reviewer** with the same brief. **Repeat Steps 3–5** until the verdict is `clean enough to stop` with 0 Critical / 0 Important.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(mockup): address login review findings"
```
(Skip if no changes.)

---

## Task 6: Open the PR

**Files:** none

- [ ] **Step 1: Push the branch**

Run: `git push -u origin feat/login-mockup`
Expected: the pre-push hook (prettier + stylelint + typecheck) passes, then the branch pushes. If the hook fails, fix the reported issue — do **not** use `--no-verify`.

- [ ] **Step 2: Open the PR**

```bash
gh pr create --base main --title "Add eocrm full-screen login mockup" --body "$(cat <<'EOF'
Full-screen `eocrm` sign-in mockup at `/mockups/login` (Direction C: elevated card on a token-tinted backdrop), built from `@eocrm/design-system` primitives.

- Page chrome via the token-based inline-mock escape hatch (no module.scss) — two gaps filed in `TODO.md`: `<AuthScreen>` and a brand-icon set.
- `Divider` label (`<Divider>OR</Divider>`) used for the SSO separator.
- Full-screen via an `AppShell` guard (no Rail/TopBar on the login route).
- Interactive error-state demo: inline validation + an `Alert` on failed submit.

Spec: `docs/superpowers/specs/2026-05-29-login-mockup-design.md`
Plan: `docs/superpowers/plans/2026-05-29-login-mockup.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for the `Quality / check` status check to pass**, then the change is ready to merge (squash or merge commit — caller's choice).

---

## Self-review checklist (run before executing)

1. **Spec coverage:** centered card on tinted backdrop ✓ (Task 2 AuthScreen mock + token gradient); full-screen ✓ (Task 3 guard); Google SSO + OR divider ✓ (Task 2); footer links ✓; error-state demo ✓; "Keep me signed in" default-checked ✓; no "Create an account" ✓; copy grounded in reference ✓; registry/route/nav wiring ✓ (Task 3); escape hatches TODO'd ✓ (Task 1); Rule-7 review ✓ (Task 5).
2. **Placeholders:** none — full `Login.tsx` source, exact wiring diffs, exact `TODO.md` text, exact commands.
3. **Type/name consistency:** `submit`, `onEnter`, `emailError`/`passwordError`/`formError`, ids `login-email`/`login-email-error`/`login-password`/`login-password-error` used consistently across the component; prop names verified against component source.
