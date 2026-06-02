# Member Profile Mockup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/mockups/member-profile` playground mockup — a read-only member profile (`PageHeader` + `Card` + `DefinitionList`) with an "Edit profile" `Drawer` whose form is built from the new `Field` / `FormRow` / `FormSection` primitives + `Input`/`Select`/`Switch`/`Textarea`, including Save-time validation and a success `toast`.

**Architecture:** A single mockup component holds the profile in local React state, renders the read view, and mounts a controlled `Drawer` for editing. Editing uses a `draft` copy + `errors` map; Save validates, commits the draft, fires a toast, and closes; Cancel/dismiss discards. Built **exclusively** from `@eocrm/design-system` components (playground Hard rule 6). No backend, no real photo upload, no `:id` routing.

**Tech Stack:** React (`useState`), TypeScript, `@eocrm/design-system`, `react-router-dom` (playground-only, for `Breadcrumb`/route), lucide-react icons, the `toast` helper. Branch: `mockup/member-profile` (stacked on `feat/form-field-primitives`, which carries the unmerged form primitives). Spec: `docs/superpowers/specs/2026-06-02-member-profile-mockup-design.md`.

**Note on testing:** Playground mockups are **not** unit-tested (library Rule 1 is library-only; no mockup has a `.test.tsx`). Per-task verification is `npm run typecheck` / `make build` / `make lint`; final verification adds the playground **Hard rule 7 mockup review-fix loop** + manual smoke. There are therefore no failing-test-first steps in this plan.

---

## File map

**Create:**
- `packages/playground/src/pages/mockups/MemberProfile/MemberProfile.tsx` — the whole mockup (read view + edit `Drawer` + local state/validation). One file, mirroring the single-file convention of `ContactDetail.tsx` / `Members.tsx`.

**Modify:**
- `packages/playground/src/pages/mockups/registry.ts` — add `'Field' | 'FormRow' | 'FormSection'` to the `ComponentName` union, and a `MOCKUPS` entry for `member-profile` (this auto-feeds `MockupsIndex`, which maps over `MOCKUPS`, and `CrossLinks`).
- `packages/playground/src/App.tsx` — import + `<Route path="/mockups/member-profile" …>`.
- `packages/playground/src/layout/AppShell/AppShell.tsx` — a `mockupItems` nav entry + a lucide icon import.

`MockupsIndex.tsx` needs **no** edit — it renders from the `MOCKUPS` registry array.

---

## Task 0: Pre-flight

**Files:** none (git only)

- [ ] **Step 1: Confirm branch + hooks**

Run:
```bash
cd /Users/dpws/projects/design-system
git branch --show-current     # expect: mockup/member-profile
git config --get core.hooksPath   # expect: .husky/_
```
Expected: on `mockup/member-profile` (it branched off `feat/form-field-primitives`, so `Field`/`FormRow`/`FormSection` are available), hooks installed. If not on the branch, `git checkout mockup/member-profile`.

---

## Task 1: Create the MemberProfile mockup

**Files:**
- Create: `packages/playground/src/pages/mockups/MemberProfile/MemberProfile.tsx`

- [ ] **Step 1: Write the full component**

Create `packages/playground/src/pages/mockups/MemberProfile/MemberProfile.tsx`:

```tsx
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Mail, Phone, Clock, Languages, Camera } from 'lucide-react';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  DefinitionList,
  Drawer,
  Field,
  FormRow,
  FormSection,
  Input,
  Page,
  PageHeader,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  toast,
} from '@eocrm/design-system';
import { members, roleLabel, roleTone, type MemberRole } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

// The editable profile shape. Richer than the shared `Member` type (which we do
// NOT modify) — the extra fields live only in this mockup's local state.
interface ProfileData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  bio: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  role: MemberRole;
  active: boolean;
  notifications: boolean;
}

type ProfileErrors = Partial<Record<'firstName' | 'lastName' | 'email', string>>;

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'guest', label: 'Guest' },
];

const TIMEZONE_OPTIONS = [
  { value: 'europe-london', label: 'Europe/London (GMT+1)' },
  { value: 'america-new_york', label: 'America/New York (GMT−4)' },
  { value: 'asia-tokyo', label: 'Asia/Tokyo (GMT+9)' },
  { value: 'australia-sydney', label: 'Australia/Sydney (GMT+10)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
];

const labelOf = (opts: { value: string; label: string }[], value: string) =>
  opts.find((o) => o.value === value)?.label ?? value;

// Seed from a representative member; split the single `name` into first/last.
const seed = (): ProfileData => {
  const m = members[0];
  const [first, ...rest] = m.name.split(' ');
  return {
    firstName: first,
    lastName: rest.join(' '),
    jobTitle: m.jobTitle,
    bio: 'Closes mid-market deals across EMEA. Joined eocrm in 2024.',
    email: m.email,
    phone: '+1 555 0142',
    timezone: 'europe-london',
    language: 'en',
    role: m.role,
    active: true,
    notifications: false,
  };
};

const fullName = (p: ProfileData) => `${p.firstName} ${p.lastName}`.trim();

const validate = (d: ProfileData): ProfileErrors => {
  const errors: ProfileErrors = {};
  if (!d.firstName.trim()) errors.firstName = 'First name is required.';
  if (!d.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!d.email.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) errors.email = 'Enter a valid email address.';
  return errors;
};

export function MemberProfile() {
  const [profile, setProfile] = useState<ProfileData>(seed);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(profile);
  const [errors, setErrors] = useState<ProfileErrors>({});

  const openEdit = () => {
    setDraft(profile);
    setErrors({});
    setOpen(true);
  };

  const set = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = () => {
    const next = validate(draft);
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }
    setProfile(draft);
    setOpen(false);
    toast.success('Profile updated', { description: `Saved changes to ${fullName(draft)}.` });
  };

  return (
    <Page>
      <Breadcrumb>
        <Breadcrumb.Item as={RouterLink} to="/mockups/members">
          Members
        </Breadcrumb.Item>
        <Breadcrumb.Item>{fullName(profile)}</Breadcrumb.Item>
      </Breadcrumb>

      <PageHeader borderBottom={false}>
        <PageHeader.Aside>
          <Avatar name={fullName(profile)} size="lg" />
        </PageHeader.Aside>
        <PageHeader.Title>{fullName(profile)}</PageHeader.Title>
        <PageHeader.Subtitle>{profile.jobTitle}</PageHeader.Subtitle>
        <PageHeader.Meta>
          <Cluster gap="xs" align="center">
            <Badge tone={roleTone[profile.role]}>{roleLabel[profile.role]}</Badge>
            <Text as="span" size="sm" tone="muted">
              {profile.active ? 'Active' : 'Suspended'}
            </Text>
          </Cluster>
        </PageHeader.Meta>
        <PageHeader.Actions>
          <Button onClick={openEdit}>Edit profile</Button>
        </PageHeader.Actions>
      </PageHeader>

      <Stack gap="lg">
        <Card>
          <Card.Header headerLevel="h2">Profile</Card.Header>
          <DefinitionList dividers>
            <DefinitionList.Item>
              <DefinitionList.Term>Name</DefinitionList.Term>
              <DefinitionList.Description>{fullName(profile)}</DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Job title</DefinitionList.Term>
              <DefinitionList.Description>{profile.jobTitle}</DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Bio</DefinitionList.Term>
              <DefinitionList.Description>{profile.bio}</DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Card>

        <Card>
          <Card.Header headerLevel="h2">Contact</Card.Header>
          <DefinitionList dividers>
            <DefinitionList.Item>
              <DefinitionList.Term>Email</DefinitionList.Term>
              <DefinitionList.Description icon={<Mail size={14} />}>
                {profile.email}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Phone</DefinitionList.Term>
              <DefinitionList.Description icon={<Phone size={14} />}>
                {profile.phone}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Timezone</DefinitionList.Term>
              <DefinitionList.Description icon={<Clock size={14} />}>
                {labelOf(TIMEZONE_OPTIONS, profile.timezone)}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Language</DefinitionList.Term>
              <DefinitionList.Description icon={<Languages size={14} />}>
                {labelOf(LANGUAGE_OPTIONS, profile.language)}
              </DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Card>

        <Card>
          <Card.Header headerLevel="h2">Role &amp; access</Card.Header>
          <DefinitionList dividers>
            <DefinitionList.Item>
              <DefinitionList.Term>Role</DefinitionList.Term>
              <DefinitionList.Description>
                <Badge tone={roleTone[profile.role]}>{roleLabel[profile.role]}</Badge>
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Status</DefinitionList.Term>
              <DefinitionList.Description>
                {profile.active ? 'Active' : 'Suspended'}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Email notifications</DefinitionList.Term>
              <DefinitionList.Description>{profile.notifications ? 'On' : 'Off'}</DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Card>
      </Stack>

      <Drawer open={open} onOpenChange={setOpen} side="right" size="md">
        <Drawer.Header>Edit profile</Drawer.Header>
        <Drawer.Body>
          <Stack gap="xl">
            <Cluster gap="md" align="center">
              <Avatar name={fullName(draft)} size="lg" />
              <Stack gap="xs">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toast.info('Photo upload is out of scope for this mockup.')}
                >
                  <Camera size={14} /> Change photo
                </Button>
                <Text size="sm" tone="muted">
                  JPG or PNG, up to 2 MB.
                </Text>
              </Stack>
            </Cluster>

            <FormSection title="Profile" description="Name and how this person appears across eocrm.">
              <FormRow columns={2}>
                <Field label="First name" required error={errors.firstName}>
                  <Input value={draft.firstName} onChange={(e) => set('firstName', e.target.value)} />
                </Field>
                <Field label="Last name" required error={errors.lastName}>
                  <Input value={draft.lastName} onChange={(e) => set('lastName', e.target.value)} />
                </Field>
              </FormRow>
              <Field label="Job title">
                <Input value={draft.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
              </Field>
              <Field label="Bio" optional>
                <Textarea value={draft.bio} onChange={(e) => set('bio', e.target.value)} rows={3} />
              </Field>
            </FormSection>

            <FormSection title="Contact" description="How teammates reach this person.">
              <Field label="Email" required error={errors.email}>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <FormRow columns={2}>
                <Field label="Phone" optional>
                  <Input type="tel" value={draft.phone} onChange={(e) => set('phone', e.target.value)} />
                </Field>
                <Field label="Timezone">
                  <Select
                    options={TIMEZONE_OPTIONS}
                    value={draft.timezone}
                    onChange={(value) => set('timezone', value as string)}
                  />
                </Field>
              </FormRow>
              <Field label="Language">
                <Select
                  options={LANGUAGE_OPTIONS}
                  value={draft.language}
                  onChange={(value) => set('language', value as string)}
                />
              </Field>
            </FormSection>

            <FormSection title="Role &amp; access" description="Controls what this member can do.">
              <Field label="Role">
                <Select
                  options={ROLE_OPTIONS}
                  value={draft.role}
                  onChange={(value) => set('role', value as MemberRole)}
                />
              </Field>
              <Field
                orientation="horizontal"
                label="Active"
                description="Can sign in and access the workspace."
              >
                <Switch checked={draft.active} onChange={(checked) => set('active', checked)} />
              </Field>
              <Field
                orientation="horizontal"
                label="Email notifications"
                description="Product and activity emails."
              >
                <Switch
                  checked={draft.notifications}
                  onChange={(checked) => set('notifications', checked)}
                />
              </Field>
            </FormSection>
          </Stack>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>
            <Button variant="secondary">Cancel</Button>
          </Drawer.Close>
          <Button onClick={save}>Save changes</Button>
        </Drawer.Footer>
      </Drawer>

      <CrossLinks kind="mockup" slug="member-profile" />
    </Page>
  );
}
```

- [ ] **Step 2: Typecheck the new file**

Run: `cd /Users/dpws/projects/design-system/packages/playground && npm run typecheck`
Expected: PASS (tsc --noEmit over the playground — the new file compiles against the library's public types).

If tsc reports a real prop mismatch (e.g. a `Select`/`Switch`/`DefinitionList`/`Drawer` prop differs from the assumptions here), fix the call site to match the actual exported type — do not weaken types. Common adjustments and where to confirm: `Select` `onChange` value typing (`packages/design-system/src/components/Select/Select.tsx`), `DefinitionList.Description` `icon` prop (`.../DefinitionList`), `PageHeader.Meta`/`Actions` children (`.../PageHeader`).

- [ ] **Step 3: Lint**

Run: `cd /Users/dpws/projects/design-system && make lint`
Expected: clean (no stylelint targets here since the mockup ships no SCSS; confirms nothing broke).

- [ ] **Step 4: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/MemberProfile/MemberProfile.tsx
git commit -m "$(cat <<'EOF'
feat(mockup): member profile page with drawer edit

Read-only profile (PageHeader + Card + DefinitionList) with an "Edit profile"
Drawer whose form is built from Field/FormRow/FormSection + Input/Select/
Switch/Textarea, with Save-time validation and a success toast.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire the mockup (registry + route + nav)

**Files:**
- Modify: `packages/playground/src/pages/mockups/registry.ts`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`

- [ ] **Step 1: Extend the `ComponentName` union**

In `packages/playground/src/pages/mockups/registry.ts`, add the three new component names to the `ComponentName` union (alphabetical-ish, near the existing entries — e.g. after `'EmptyState'`/`'ErrorState'` and `'FilterChip'`):

```ts
  | 'Field'
  | 'FormRow'
  | 'FormSection'
```

- [ ] **Step 2: Add the `MOCKUPS` registry entry**

In the same file, add to the `MOCKUPS` array (e.g. right after the `members` entry):

```ts
  {
    slug: 'member-profile',
    title: 'Member profile',
    path: '/mockups/member-profile',
    blurb: 'Member profile with a drawer-based edit form (Field / FormRow / FormSection).',
    usesComponents: [
      'Avatar',
      'Badge',
      'Breadcrumb',
      'Button',
      'Card',
      'Cluster',
      'DefinitionList',
      'Drawer',
      'Field',
      'FormRow',
      'FormSection',
      'Input',
      'Page',
      'PageHeader',
      'Select',
      'Stack',
      'Switch',
      'Text',
      'Textarea',
    ],
  },
```

> The `usesComponents` list must match the mockup's actual imports exactly (the Rule 7 reviewer checks for stale/missing entries). The list above matches Task 1's import block. If Task 1's imports changed during typecheck fixes, reconcile this list.

- [ ] **Step 3: Add the route in App.tsx**

In `packages/playground/src/App.tsx`:
1. Add the import alongside the other mockup imports:
   ```tsx
   import { MemberProfile } from './pages/mockups/MemberProfile/MemberProfile';
   ```
2. Add the route next to `<Route path="/mockups/members" …>`:
   ```tsx
   <Route path="/mockups/member-profile" element={<MemberProfile />} />
   ```

- [ ] **Step 4: Add the sidebar nav entry in AppShell.tsx**

In `packages/playground/src/layout/AppShell/AppShell.tsx`:
1. Add `IdCard` to the existing `lucide-react` import.
2. In the `mockupItems` array, add (right after the Members entry):
   ```tsx
   { to: '/mockups/member-profile', label: 'Member profile', icon: IdCard, end: false },
   ```

- [ ] **Step 5: Typecheck + build**

Run:
```bash
cd /Users/dpws/projects/design-system
cd packages/playground && npm run typecheck
cd /Users/dpws/projects/design-system && make build
```
Expected: typecheck clean; `make build` bundles the playground with no errors. The mockup is now reachable at `/mockups/member-profile`, listed on the Mockups overview (registry-driven), and cross-linked.

- [ ] **Step 6: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/registry.ts \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx
git commit -m "$(cat <<'EOF'
feat(mockup): wire member-profile route, nav, and registry

Adds the route, the Mockups sidebar entry, and the registry entry (incl.
Field/FormRow/FormSection in the ComponentName union). MockupsIndex and
CrossLinks pick it up from the registry automatically.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Verify + mockup review loop + finish

**Files:** none (verification + git)

- [ ] **Step 1: Run all gates**

Run:
```bash
cd /Users/dpws/projects/design-system
make test     # full vitest suite (library) — must stay green
make build    # typecheck + bundle playground
make lint     # stylelint
```
Expected: all green.

- [ ] **Step 2: Playground Hard rule 7 — mockup review-fix loop**

This change touches `packages/playground/src/pages/mockups/**` + `registry.ts`, so the mockup pre-push review cycle applies. Dispatch a fresh-context `general-purpose` reviewer over `MemberProfile.tsx` + the registry/wiring diff, briefed on the 10 categories from `packages/playground/CLAUDE.md` Rule 7 (Hard-rule-6 compliance: no inline `style`/raw HTML/co-located SCSS; registry sync; imports from `@eocrm/design-system` only; realism; a11y; keyboard/focus; layout discipline; component coverage vs the manifest; state realism; no stale TODOs). Output Critical/Important/Nice-to-have + verdict. Fix every Critical and Important; document any deliberate skip. Re-run gates and re-review until the verdict is "clean enough to stop".

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run `make dev`, visit `http://localhost:8080/mockups/member-profile`:
- Read view shows the profile (header avatar/name/role badge + three Cards).
- "Edit profile" opens the drawer; the three FormSections render with the seeded values.
- Type an invalid email (`alex@@x`) → "Save changes" shows the `Field` error and the drawer stays open; the email control shows the invalid state.
- Fix the email → Save commits, a success toast appears, the drawer closes, and the read view reflects the changes.
- Cancel / Esc / overlay discards edits.
- Toggle Active off → after Save, the header meta + Role & access card update.

- [ ] **Step 4: Push and open a stacked PR**

The mockup depends on the unmerged form primitives (PR #111). Open this PR with **base `feat/form-field-primitives`** (a stacked PR) so it shows only the mockup diff; once #111 merges to `main`, re-target this PR to `main` (GitHub does this automatically when the base merges, or retarget manually).

```bash
cd /Users/dpws/projects/design-system
git push -u origin mockup/member-profile
gh pr create --base feat/form-field-primitives --head mockup/member-profile \
  --title "feat(mockup): member profile page with drawer edit" \
  --body "$(cat <<'EOF'
## Summary
Adds `/mockups/member-profile` — a read-only member profile (`PageHeader` + `Card` + `DefinitionList`) with an "Edit profile" `Drawer` whose form is built from the new `Field` / `FormRow` / `FormSection` primitives + `Input`/`Select`/`Switch`/`Textarea`. Save validates (name + email), commits to local state, and fires a success toast; Cancel/dismiss discards.

Built exclusively from `@eocrm/design-system` components (playground Hard rule 6). Wired into the route, Mockups nav, registry, and cross-links.

**Stacked on #111** (the form primitives it consumes). Re-targets to `main` once #111 merges.

## Test plan
- [x] `make test` / `make build` / `make lint` green
- [x] Playground Rule 7 mockup review loop clean
- [ ] Manual: open drawer → invalid email blocks Save with a Field error → fix → Save commits + toast + read view updates

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (against the spec)

**Spec coverage:** ✅ Standalone `/mockups/member-profile` reachable from Mockups nav (Task 2). ✅ Read view: PageHeader (avatar/name/jobTitle/role badge + status) + three Cards/DefinitionList (Task 1). ✅ Drawer edit: controlled `Drawer`, photo row, three `FormSection`s with `FormRow`+`Field`+`Input`/`Select`/`Switch`/`Textarea` (Task 1). ✅ State: `profile`/`open`/`draft`/`errors`; Save validates → commit + toast + close; Cancel discards (Task 1). ✅ Validation drives `Field` error states (email + names). ✅ `members[0]` seed + local extra fields; no `mock.ts`/`Member` change. ✅ Built only from library components; lucide + toast allowed. ✅ Wiring incl. `ComponentName` additions; MockupsIndex auto. ✅ Non-goals respected (no persistence/upload/`:id`/unit test). ✅ Verification = gates + Rule 7 loop + manual.

**Placeholder scan:** none — full component code, exact edits, exact commands.

**Type consistency:** `ProfileData` field names are used consistently across `seed`/`validate`/`set`/read-view/drawer. `set<K>` keyed by `keyof ProfileData`. `Select onChange` value cast to `string`/`MemberRole` to match `ProfileData`. `errors` keys (`firstName`/`lastName`/`email`) match `validate` + the `Field error` props. `usesComponents` (Task 2) matches the Task 1 import block.

## Follow-ups (out of scope)
- Link the Members table rows → `/mockups/member-profile`.
- Real avatar upload/crop via `ImageCrop` + `FileUpload` in the photo row.
```
