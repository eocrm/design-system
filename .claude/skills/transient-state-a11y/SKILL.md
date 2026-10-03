---
name: transient-state-a11y
description: Use when building or changing a design-system component with a transient or async state (loading, busy, pending, async failure) — decides how it reaches screen readers (accessible name vs live region vs native role). Required by design-system CLAUDE.md Hard rule 10.
---

# Transient state must reach assistive tech

A component with a transient or async state (`loading`, `busy`, `pending`, an
async failure) must expose it to screen readers, **or document why it doesn't**
— see the visual-only clause at the end, which is a real answer and not a
loophole. Which mechanism depends on one
question:

**Is this a property of the thing as the user arrives at it, or a change that
happens while their attention is elsewhere?**

- **A property they arrive at → fold it into the accessible name.** A user
  tabbing onto an `EntityChip` placeholder needs to know it is a placeholder
  before they act on it. Nothing will announce it later; it has to be in the
  name. Accept that the name mutates when the state resolves — that is the
  cost, and it is the right trade when the alternative is silence.
- **A change while they are elsewhere → the component owns a live region.**
  `role="status" aria-live="polite"` on a visually-hidden span, **rendered
  unconditionally** so only its _text_ mutates.
- **A native role already exposes it → use that, and add nothing.**
  `role="progressbar"` with `aria-valuenow`, or `role="alert"`, already carry
  the state. `Progress` and `CircularProgress` are correct as they stand — do
  not "fix" them into live regions, which would fire on every percentage tick.
  (Precisely: `aria-valuenow` is set only when determinate. An indeterminate
  spinner puts its meaning in `aria-valuetext` — a value description, not the
  accessible name, which stays whatever the consumer passed as `aria-label`.
  Both files used to fall back to a hardcoded English `'Loading…'` there; #503
  routed it through `progress.indeterminate`.)

**A state that PERSISTS once entered is a property, even though you were not
watching when it changed.** An image that fails three seconds after render
transitioned while your attention was elsewhere, but from then on "failed" is
simply what that element is — so it belongs in the name, and `Lightbox` folds
it in. Ask what is true a minute later, not what happened.

`Image` is the instructive exception, and it shows the rule has a second half.
A FLUID `Image`'s error tile renders the failure as VISIBLE TEXT beside the
icon, so folding the same sentence into the icon's name made a reader hear it
twice in a row. Where the state is already in the accessible tree as content,
the name must not repeat it — `Lightbox` folds it in precisely because its text
is a CHILD of the `role="img"`, which children-presentational prunes. Same rule,
opposite markup.

**The carve-out is conditioned on that text, so it inverts where the text is
gone.** A fixed-`size` `Image` renders the icon ALONE — none of 20/24/32/40px holds the
message AND an `sm` Button, and the button it used to render was painted outside
the wrapper's clip while staying in the tab order (#538). With no text to carry it,
that tile names the icon `"{alt}: {failure}"` (the phrase alone when `alt=""`),
exactly the fold forbidden a paragraph above. Both branches follow the same
rule: name it unless content already says it. Do not "fix" the sized fold back
to bare `alt` — that is silence, not de-duplication.

**Tiebreaker: can the element still be REACHED after the moment passes?** Not
"will anything announce it" — that is circular, since it depends on the choice
you are making. Ask instead whether a user can arrive at this element later and
need to know. A placeholder `EntityChip` sits in a list you tab through minutes
after it rendered, so the word must be in its name; that is why `loading` is
name-folded there even though loading plainly comes and goes. A `Switch` you
just toggled is not reached later in a meaningfully different state — it is
either saved or it is not — so it announces and keeps its name.

Read the persistence clause as "persistent states are always properties", not
as "transient states are never properties".

**When arrival and change coincide, the region's TIMING carries it — not a
second mechanism.** A `Switch` that mounts already-saving is arrived at rather
than activated, so a naive reading says name-fold. Don't: renaming a control
mid-flight breaks the name-exact contract this rule protects elsewhere, and the
state is short-lived. What it needs instead is for the region to still fire on
first paint, which means computing its text in an effect rather than during
render — otherwise region and text mount together and announce nothing.

The distinguisher between this and `EntityChip` is not reachability alone but
**how long the state lasts and how likely you are to arrive mid-state**. A
placeholder chip can sit unresolved in a list indefinitely; a switch is saved
or not within a moment. Getting the timing wrong here is silent, not loud.

That distinction also settles where a region is _impossible_: a tile that only
mounts on error cannot host one, because the region would mount together with
its text — the case forbidden above. If the only element that could carry the
region appears at the same moment as the state, the state is a property; name
it.

**When a component is both**, the name carries what is true on arrival and a
region carries the transitions — but only if the transitions are individually
worth interrupting for. `FileUpload` was the open case and is now a worked one;
it was genuinely split: `uploading` already uses the third branch above
(a `Progress` with `role="progressbar"` and a name carrying the filename), and
`done` renders a named `role="img"` a browse-mode reader reaches. The gaps were
`error` — plain text in a non-focusable row, with the only focusable control
there named "Remove {file}" — and `pending`, which rendered nothing at all.
Twelve files resolving inside two seconds should not be twelve announcements,
so the shape it wanted was one region describing the batch plus the per-row
state reachable on focus. That is what #502 shipped: a single region derived
from `files`, and error rows whose remove button names the failure.

**If the state resolves while focus is inside the component but not on the
thing that changed** — a `Select`'s options arriving while focus sits on the
combobox — that is still "elsewhere". Focus being nearby is not the same as
the user watching the thing that moved.

**Render the region unconditionally.** A region that mounts together with its
text is the unreliable case — most screen readers do not announce content that
was already present when the region appeared. `PasswordStrengthMeter` is the
reference implementation: the region is always mounted and only its text
changes. (`PasswordInput`'s caps-lock region is gated on the `capsLockWarning`
_prop_ — that is fine, because the prop is not the transient state.)

**Gate the region on what the user can SEE change, not on the raw prop.**
`DataTable` announces off its skeleton, not off `loading`: a table configured
`skeletonDelay={300}` has decided a 200ms load is not worth showing anything
for, and announcing it is louder than the UI. A refetch that leaves existing
rows on screen changes nothing visually and stays silent. Wire a region straight
to a `loading` prop and a 30-second poll interrupts a reader every cycle.

**Put the region where it cannot join a name.** Outside the `<label>` that
names a control, and outside the `<button>` it describes: nested inside a
label it becomes part of the accessible name via name-from-content, and nested
inside a button ARIA specifies it as children-presentational. Both were
shipped and caught in review on this rule's own first implementation.

**`aria-busy` is never sufficient on its own.** It is a valid global attribute
and it does appear in the accessibility tree, but it does not reliably reach a
user — its spec purpose is to tell AT to _defer_ output, not to produce it, and
no mainstream screen reader announces `busy` as a state change on a non-live
element. Four components shipped relying on it alone — `EntityChip` (fixed in
#483), then `Switch`, `PillMenu` and `DataTable` (fixed in #488) — and their
state reached nobody. Pair it with one of the two mechanisms above, or
drop it.

**A control the user just activated is a change, not a property.** They are
already focused on it, so there is nothing to "arrive at" — `Switch` and
`PillMenu` announce; they do not rename themselves. Renaming a focused
control mid-interaction is worse than announcing, because it also breaks
name-exact queries in consumer tests. (`ConfirmationPopover` was a known gap on
this rule — its pending state set neither — until #497 gave it `aria-disabled`
plus a deferred pending announcement.)

**Visual-only is a legitimate answer, but it must be deliberate and written
down.** `Badge`'s tone is a durable visual property with no state change to
announce, so announcing it is the consumer's call — and `Badge`'s JSDoc says so.
`Skeleton` is `aria-hidden` by design and documents the hand-off. Silence you
chose and documented is fine; silence you defaulted into is the bug this rule
exists to stop.

Every string here goes through `useTranslation()` — see Rule 9.
