# Multi-step Login mockup + eocrm logo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Turn the Login mockup into a two-step (email → password) morphing card, and add the eocrm logo to the login screen + the AppShell rail.

**Architecture:** Playground-only. A new SVG asset (imported as a URL via `vite/client`). `Login.tsx` gets a `step` state machine and renders one `Card` whose body swaps per step. AppShell's `BrandMark` swaps the `OC` box for the logo. Branch `feat/login-multistep` → PR → Rule-7 mockup review.

**Tech Stack:** React + `@eocrm/design-system` + lucide + react-router-dom (playground).

**Spec:** `docs/superpowers/specs/2026-06-05-login-multistep-design.md`.

## Deviation from spec (logo rendering)

The spec proposed `<Image>` for the logo. On inspection `Image`'s wrapper **fills its container width** (skeleton + broken-image fallback; native `width`/`height` are ratio hints only) — it cannot render a small fixed ~28px chrome mark in a mockup (which can't set an arbitrary container width). `Avatar` is circular (crops a non-round mark); `BrandIcon` is a closed third-party set. So per **playground Rule 6's escape hatch**, the Login mockup renders the logo with a raw `<img>` at the exact mock site + a comment, and a matching `TODO.md` entry is filed. AppShell is tooling (Rule 6 N/A) → plain `<img>`. Visual outcome is identical to the approved design. (`registry.ts` `usesComponents` therefore stays unchanged — no `Image` added — only the blurb updates.)

---

## Task 1: Logo asset + TODO entry

**Files:**

- Create: `packages/playground/src/assets/eocrm-logo.svg`
- Modify: `packages/design-system/src/components/TODO.md` (add an Open entry)

- [ ] **Step 1: create the asset** — write `packages/playground/src/assets/eocrm-logo.svg` with exactly:

```svg
<svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M127.441 135.999L95.8134 152L80 144L64.1857 152L32.5579 136L80 112L127.441 135.999Z" fill="#0052CC"/>
<path d="M160 96V119.529L143.256 127.999L80 96L16.7436 128L0 119.529V96L80 55.5294L160 96Z" fill="#0052CC"/>
<path d="M160 40.4706V80L80 39.5294L0 80V40.4706L80 0L160 40.4706Z" fill="#0052CC"/>
</svg>
```

- [ ] **Step 2: file the TODO** — under the `## Open` section of `packages/design-system/src/components/TODO.md`, add:

```markdown
### [ ] `<Logo>` — fixed-size brand-logo / image renderer

**Filed:** 2026-06-05
**Mocked in:**

- `packages/playground/src/pages/mockups/Login/Login.tsx` (brand block above the card)

**What's needed:**
A way to render a consumer's own brand logo at a small, intrinsic/fixed size (≈24–40px) inline beside a wordmark. `Image` reserves a full-width box with a Skeleton + broken-image fallback (right for content photos, wrong for chrome); `Avatar` is circular (crops a non-round mark); `BrandIcon` is a closed third-party set (`google`/`yandex`). Should take a `src` (or inline SVG) + a fixed size + `alt`, with no skeleton/fallback chrome.

**Current workaround:**
Raw `<img src={eocrmLogo} alt="" width={28} height={28} />` at the Login brand block (with a TODO comment). AppShell (tooling, not a mockup) uses the same raw `<img>` freely.

**When this ships:** refactor the Login brand block (and consider AppShell) to use the new primitive, then tick this checkbox.
```

- [ ] **Step 3: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/assets/eocrm-logo.svg packages/design-system/src/components/TODO.md
git commit -m "chore(playground): add eocrm logo asset + TODO for a fixed-size logo primitive"
```

---

## Task 2: AppShell brand → logo

**Files:**

- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` (import + `BrandMark`)
- Modify: `packages/playground/src/layout/AppShell/AppShell.module.scss` (`.brandMark` → `.brandLogo`)

- [ ] **Step 1: import the asset** — add to the top of `AppShell.tsx` (with the other imports):

```tsx
import eocrmLogo from '../../assets/eocrm-logo.svg';
```

- [ ] **Step 2: replace `BrandMark`** — swap the existing `BrandMark` function for:

```tsx
/** Brand: the eocrm logo + wordmark when expanded, just the mark when
    collapsed. Reads collapsed state from RailContext. */
function BrandMark() {
  const { collapsed } = useRail();
  return (
    <div className={styles.brand} data-collapsed={collapsed || undefined}>
      <img src={eocrmLogo} className={styles.brandLogo} alt="" />
      {!collapsed && (
        <div className={styles.brandText}>
          <div className={styles.brandName}>eocrm</div>
          <div className={styles.brandPlan}>Free trial</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: swap the SCSS class** — in `AppShell.module.scss`, replace the `.brandMark` block:

```scss
.brandMark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-accent);
  color: var(--color-accent-fg);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
}
```

with:

```scss
.brandLogo {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}
```

- [ ] **Step 4: gates + commit**

```bash
cd /Users/dpws/projects/design-system
make build && make lint && npm run format:check
git add packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/layout/AppShell/AppShell.module.scss
git commit -m "feat(playground): AppShell brand uses the eocrm logo + wordmark"
```

---

## Task 3: Login two-step rewrite + registry blurb

**Files:**

- Modify: `packages/playground/src/pages/mockups/Login/Login.tsx` (full rewrite)
- Modify: `packages/playground/src/pages/mockups/registry.ts` (Login blurb)

- [ ] **Step 1: rewrite `Login.tsx`** with exactly:

```tsx
import { useState, type KeyboardEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Mail } from 'lucide-react';
import {
  Alert,
  BrandIcon,
  Button,
  Card,
  Checkbox,
  Cluster,
  Divider,
  Input,
  Link,
  PasswordInput,
  Screen,
  Stack,
  Text,
  Title,
} from '@eocrm/design-system';
import eocrmLogo from '../../../assets/eocrm-logo.svg';

// Loose client-side shape check only — real validation is server-side.
const EMAIL_RE = /.+@.+\..+/;

export function Login() {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function continueToPassword() {
    const nextEmailError = EMAIL_RE.test(email) ? null : 'Enter a valid email address.';
    setEmailError(nextEmailError);
    if (nextEmailError) return;
    setStep('password');
  }

  // Back to step 1 — keep the typed email, drop the password attempt.
  function changeEmail() {
    setStep('email');
    setPassword('');
    setPasswordError(null);
    setFormError(null);
  }

  function signIn() {
    const nextPasswordError =
      password.length >= 6 ? null : 'Password must be at least 6 characters.';
    setPasswordError(nextPasswordError);
    if (nextPasswordError) return;
    // No backend in a mockup — simulate an auth failure so the error Alert
    // (the "error-state demo") is always reachable for stakeholders.
    setFormError('Invalid email or password.');
  }

  function onEmailKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') continueToPassword();
  }
  function onPasswordKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') signIn();
  }

  return (
    <Screen
      backdrop="accent"
      header={
        <Cluster justify="start">
          <Link as={RouterLink} to="/mockups" variant="muted">
            ← Back to mockups
          </Link>
        </Cluster>
      }
      footer={
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
      }
    >
      <Stack gap="lg" align="center">
        <Cluster gap="sm" align="center">
          {/* TODO: replace with a <Logo>/fixed-size image primitive when it ships —
              see packages/design-system/src/components/TODO.md. Image reserves a
              full-width box with skeleton/fallback (wrong for a small chrome logo). */}
          <img src={eocrmLogo} alt="" width={28} height={28} />
          <Text as="span" size="xl" weight="bold">
            eocrm
          </Text>
        </Cluster>

        <Card padding="lg">
          <Stack gap="lg">
            <Stack gap="xs">
              <Title order={1} size="lg">
                Sign in
              </Title>
              <Text size="sm" tone="muted">
                {step === 'email'
                  ? 'Welcome back. Enter your email to continue to your workspace.'
                  : 'Enter your password to continue.'}
              </Text>
            </Stack>

            {step === 'email' ? (
              <>
                <Button variant="secondary">
                  <BrandIcon name="google" size={16} />
                  Continue with Google
                </Button>

                <Divider>OR</Divider>

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
                    onKeyDown={onEmailKeyDown}
                    invalid={!!emailError}
                    aria-describedby={emailError ? 'login-email-error' : undefined}
                  />
                  {emailError && (
                    <Text id="login-email-error" size="sm" tone="danger">
                      {emailError}
                    </Text>
                  )}
                </Stack>

                <Button variant="primary" onClick={continueToPassword}>
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Card padding="sm">
                  <Cluster justify="between" align="center" wrap={false}>
                    <Cluster gap="sm" align="center" wrap={false}>
                      <Mail size={16} />
                      <Text size="sm">{email}</Text>
                    </Cluster>
                    <Link as="button" type="button" variant="default" onClick={changeEmail}>
                      Change
                    </Link>
                  </Cluster>
                </Card>

                {formError && (
                  <Alert tone="error" title="Couldn't sign you in">
                    {formError}
                  </Alert>
                )}

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
                      if (formError) setFormError(null);
                    }}
                    onKeyDown={onPasswordKeyDown}
                    invalid={!!passwordError}
                    aria-describedby={passwordError ? 'login-password-error' : undefined}
                  />
                  {passwordError && (
                    <Text id="login-password-error" size="sm" tone="danger">
                      {passwordError}
                    </Text>
                  )}
                </Stack>

                <Checkbox label="Keep me signed in" defaultChecked />

                <Button variant="primary" onClick={signIn}>
                  Sign in
                </Button>
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}
```

- [ ] **Step 2: update the registry blurb** — in `packages/playground/src/pages/mockups/registry.ts`, change the Login entry's `blurb` to:

```ts
    blurb:
      'Full-screen eocrm sign-in — identifier-first two-step (email → password) morphing card, Google SSO, error states.',
```

(Leave `usesComponents` as-is — the component set is unchanged; the logo is a raw `<img>` escape hatch, not a library component.)

- [ ] **Step 3: gates**

```bash
cd /Users/dpws/projects/design-system
make build && make lint && npm run format:check
```

(`make build` typechecks + bundles the playground; the `.svg` import resolves to a `string` via `vite/client`. If prettier flags the new files, `npx prettier --write` them.)

- [ ] **Step 4: commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/Login/Login.tsx packages/playground/src/pages/mockups/registry.ts
git commit -m "feat(mockup): two-step (email → password) login with eocrm logo (morphing card)"
```

---

## Verification

- Gates: `make test`, `make build`, `make lint`, `npm run format:check` — all green.
- **Playground Hard rule 7** mockup review-fix loop (fresh-context reviewer over `Login.tsx` + `registry.ts`; 10 categories) until "clean enough to stop". Confirm: the escape-hatch `<img>` has a matching `TODO.md` entry + inline comment (Rule 6 categories 1 + 10); `usesComponents` matches imports; one `<h1>`; `Change` is a real focusable `<button>` with the #122 pointer cursor; identity-row border comes from `Card`. The AppShell change is tooling (out of Rule-7 scope) but include it for correctness.
- Manual smoke (`/mockups/login`): step 1 = email + Continue; invalid email blocks; Continue → step 2 identity row + password; `Change` → step 1 with email kept; invalid password blocks; Sign in → error Alert; logo shows above the card and in the rail header (rail collapses to the mark).

## Self-review

- **Spec coverage:** asset (T1), AppShell brand (T2), two-step Login + logo + identity row + Change-as-button + validation + registry (T3) — all covered. Logo mechanism deviates from spec (Image → escape-hatch `<img>` + TODO) for the documented reason.
- **Placeholders:** none — full verbatim code in every step.
- **Consistency:** `eocrmLogo` import path differs by file depth (`../../assets/…` in AppShell, `../../../assets/…` in Login — both resolve to `packages/playground/src/assets/eocrm-logo.svg`); `step` values `'email'`/`'password'` used consistently; handler names `continueToPassword`/`changeEmail`/`signIn` consistent.
