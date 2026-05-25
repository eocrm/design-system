# Component TODOs — gaps surfaced by mockups

This file tracks **missing library primitives** that mockup authors needed but couldn't find in the existing component set. Each entry was filed when a mockup hit a wall and had to fall back to inline HTML / styles (which Hard rule 6 in `packages/playground/CLAUDE.md` otherwise forbids).

When a primitive listed here ships, follow the "Mocked in" link, refactor the mockup to use the real primitive, and tick the checkbox. Don't delete the entry — leave it ticked as a historical record of what drove the primitive.

## Entry format

```markdown
## [ ] `<PrimitiveName>` — one-line description

**Filed:** YYYY-MM-DD
**Mocked in:**

- `packages/playground/src/pages/mockups/<Path>.tsx:<line>`

**What's needed:**
What the primitive should do in user terms — props, behavior, accessibility expectations.

**Current workaround:**
How the mockup hacks around the gap right now. Be specific so the reviewer can verify the workaround when the primitive replaces it.

**When this ships:** refactor the mocked-in locations to use the new primitive, then tick this checkbox.
```

Keep entries terse but specific. The "Mocked in" path is load-bearing — the implementer needs it to find the existing hack.

## Open

_(no open entries yet — add the first one when a mockup hits a gap.)_

## Closed

_(filled as entries are resolved.)_
