# Member Profile mockup — read view + drawer edit

**Date:** 2026-06-02
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `playground` (mockup; never published)

## Problem / goal

The design system just gained `<Field>` / `<FormRow>` / `<FormSection>`. We need a believable CRM screen that exercises them in a real form context (the playground's mockups are the most realistic preview of the library and the canary for missing primitives). A **member profile page with edit capabilities** is the natural fit: a read-only profile, with an **"Edit profile"** action that opens a **`Drawer`** containing the form.

This is a **mockup**, so it is built **exclusively from `@eocrm/design-system` components** (playground Hard rule 6 — no raw HTML, no inline styles, no co-located SCSS). lucide-react icons and the `toast` helper are allowed (used by existing mockups).

## The page

Standalone mockup at **`/mockups/member-profile`**, reachable from the Mockups sidebar (like Login / 404). It uses a representative member — `members[0]` (Alex Rivera) from `data/mock.ts` — plus plausible extra fields the `Member` type doesn't carry (phone, timezone, language, bio, status, notifications), held in the page's **local state** (the shared `Member` type and `mock.ts` are NOT modified).

### Read view

- **`PageHeader`**: `Aside` = `Avatar` (member name), `Title` = name, `Subtitle` = job title, `Meta` = role `Badge` (`roleTone`/`roleLabel`) + `lastActive`, `Actions` = **"Edit profile"** `Button` (opens the drawer).
- Body: a `Page`/`Stack` of three `Card`s, each `Card.Header` + a read-only **`DefinitionList`**:
  - **Profile** — Name, Job title, Bio.
  - **Contact** — Email, Phone, Timezone, Language.
  - **Role & access** — Role (Badge), Status (Active/Suspended), Email notifications (On/Off).
- Single constrained column (focus is the form; mirrors a settings-style profile).

### Edit drawer (`Drawer`, controlled `open`, `side="right"`, `size="md"`)

- **`Drawer.Header`**: "Edit profile" (+ `Drawer.Close`).
- **`Drawer.Body`** — photo row + three `FormSection`s:
  - Photo row: `Avatar` + a **"Change photo"** `Button` (lightweight affordance — see Non-goals).
  - **Profile** `FormSection` — `FormRow`(First name `Field`+`Input`, Last name `Field`+`Input`) · Job title (`Field`+`Input`) · Bio (`Field` `optional` + `Textarea`).
  - **Contact** `FormSection` — Email (`Field` `required` + `Input`, **validated**) · `FormRow`(Phone `Field` `optional`+`Input`, Timezone `Field`+`Select`) · Language (`Field`+`Select`).
  - **Role & access** `FormSection` — Role (`Field`+`Select`: Admin/Member/Guest) · Active (`Switch`) · Email notifications (`Switch`).
- **`Drawer.Footer`**: "Cancel" (`Button` secondary) + "Save changes" (`Button` primary).

## State & behavior

- **Page state:** `profile` (committed data object) + `drawerOpen: boolean`.
- **Drawer state:** `draft` (a copy of `profile`) edited via controlled inputs + `errors` (per-field messages).
- **Open:** "Edit profile" → `draft = profile`, `drawerOpen = true`.
- **Save:** validate `draft`; if errors, set `errors` (Field error states render) and keep the drawer open; if valid, commit `draft → profile`, fire a success `toast("Profile updated")`, close the drawer. The read view reflects the new values.
- **Cancel / Esc / overlay / Close:** discard `draft`, close.
- **Name handling:** the form edits `firstName`/`lastName` (seeded by splitting `member.name` on the first space); on save they recombine to `name` for the read view.

### Validation (drives the `Field` error-state showcase)

On Save: `firstName` required, `lastName` required, `email` required + format (simple regex). Invalid fields get the `Field` `error` message + the control flips `invalid` (the wiring `Field` provides). Clearing a field's value re-validates on the next Save attempt.

## Components used (registry `usesComponents`)

`Avatar`, `Badge`, `Button`, `Card`, `Cluster`, `DefinitionList`, `Drawer`, `Field`, `FormRow`, `FormSection`, `Input`, `Page`, `PageHeader`, `Select`, `Stack`, `Switch`, `Text`, `Textarea`, `Title`.

> `Field`, `FormRow`, `FormSection` must be **added to the `ComponentName` union** in `registry.ts` (they aren't there yet); the rest already exist. The final `usesComponents` array must match the file's actual imports exactly (no stale entries — the Rule 7 reviewer checks this). Add a component only if the built page imports it.

## Files

- **Create:** `packages/playground/src/pages/mockups/MemberProfile/MemberProfile.tsx`
- **Modify (playground Rule 4 wiring):**
  - `packages/playground/src/App.tsx` — `import` + `<Route path="/mockups/member-profile" element={<MemberProfile />} />`
  - `packages/playground/src/layout/AppShell/AppShell.tsx` — Mockups nav entry (near "Members"), with a lucide icon (e.g. `UserCircle` / `IdCard`)
  - `packages/playground/src/pages/mockups/MockupsIndex.tsx` — overview card
  - `packages/playground/src/pages/mockups/registry.ts` — add `'Field' | 'FormRow' | 'FormSection'` to `ComponentName`, and a `MOCKUPS` entry `{ slug: 'member-profile', title: 'Member profile', path: '/mockups/member-profile', blurb, usesComponents }`

## Constraints

- **Hard rule 6:** only `@eocrm/design-system` components — no raw HTML (`div`/`span`/`button`/`input`/`form`/`img`/`h*`), no inline `style`, no co-located `.module.scss`. lucide icons + `toast` allowed. If a genuine gap appears, file a `components/TODO.md` entry + a contained inline mock (per Rule 6) — but this design is expected to need no escape hatch.
- **Brand:** use `eocrm` in copy (not the "Orbit CRM" demo brand). Member data (incl. email) is used as-is from `mock.ts`.
- Layout/spacing via `Stack`/`Cluster`/`Grid` gaps and `FormRow`/`FormSection` — no ad-hoc spacing.

## Non-goals

- No backend / persistence — edits live in component state for the session.
- No real photo upload/crop — "Change photo" is a button affordance that fires an info `toast` (no file picker). Real `ImageCrop`/`FileUpload` integration is a follow-up.
- No `:id` routing or Members-list integration — a single representative member, standalone page. (Follow-up: link from the Members table rows.)
- No changes to the shared `Member` type or `mock.ts`.
- No unit test file — playground mockups are not unit-tested (library Rule 1 is library-only). Verification is the gates + the mockup review-fix loop + manual smoke (below).

## Verification

- Gates: `make test`, `make build` (typecheck + bundle), `make lint` — all green.
- **Playground Hard rule 7 (mockup pre-push review-fix cycle):** run a fresh-context reviewer over the new mockup against the 10 categories (Rule 6 compliance, registry sync, imports, realism, a11y, keyboard/focus, layout discipline, component coverage, state realism, no-stale-TODOs); fix Critical/Important; repeat until "clean enough to stop".
- Manual smoke: visit `/mockups/member-profile`; open the drawer; type an invalid email → Save shows the `Field` error and keeps the drawer open; fix it → Save commits, toast fires, drawer closes, read view updates; Cancel discards.

## Follow-ups (out of scope)

- Link the Members table rows → `/mockups/member-profile` (realistic list→detail flow).
- Real avatar upload/crop via `ImageCrop` + `FileUpload` in the photo row.
