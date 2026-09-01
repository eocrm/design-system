# Focus-ring and `fg-subtle` Tone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close #511, #512, #513 and #514 — bring `--color-fg-subtle` to WCAG AA on the surfaces it is certified for, add a browser gate for focus-ring geometry, remove the three focus-ring holdouts, and fix one wrong comment.

**Architecture:** Three independent PRs off fresh `main`. PR 1 is SCSS and test-only. PR 2 is a token retune plus its gates. PR 3 introduces Playwright to a repo that has none and wires it into the existing `Quality / check` job rather than adding a second status check.

**Tech Stack:** npm workspaces, Vite, vitest (jsdom), Sass modules, stylelint, `@playwright/test` (new), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-01-focus-ring-and-subtle-tone-design.md`

## Global Constraints

- **Branch from fresh `main`:** `git checkout main && git pull` before every `git checkout -b`. Never branch from `origin/main` directly.
- **No direct pushes to `main`** for `*.ts`, `*.tsx`, `*.scss`, `*.json` under `packages/`, or `.github/workflows/**`. Branch → push → `gh pr create` → wait for `Quality / check` → merge.
- **Git hooks must be installed.** Verify before any code change: `git config --get core.hooksPath` prints `.husky/_`, and `test -x .husky/pre-push` exits 0. If not, run `npm install`. Never `--no-verify` without explicit user authorisation.
- **Tokens, not raw values.** No raw colours, spacing or radii in any `.module.scss`. Shared token values are edited only in `packages/design-tokens/src/tokens.json`; `packages/design-tokens/generated/**` is generated and never hand-edited.
- **Run `npm run tokens:check` after every token change.**
- **Never bind port 8080.** The user's own dev server holds it. Playwright uses **8090**.
- **Commit messages:** no `Claude-Session:` trailer, no session URL, no "Generated with Claude Code" footer.
- **Vitest runs from `packages/design-system`,** not the repo root.
- **Hard rule 8 (pre-push review loop) applies to every PR that touches `packages/design-system/**`.** Use the `pre-push-review` skill; it is not optional and not waived for small diffs.

### Exact values fixed by the spec

| token                     | light                         | dark                          |
| ------------------------- | ----------------------------- | ----------------------------- |
| `color.foreground.subtle` | `#687388` (was `#6b778c`)     | `#8591a0` (was `#7e8b9a`)     |
| `presence.color.offline`  | literal `#6b778c` (was alias) | literal `#7e8b9a` (was alias) |

Resulting ratios that later assertions depend on:

| pair                                       | light | dark |
| ------------------------------------------ | ----- | ---- |
| `--color-fg-subtle` on `--color-bg`        | 4.78  | 5.06 |
| `--color-fg-subtle` on `--color-bg-subtle` | 4.61  | 4.71 |
| `--color-fg-subtle` on `--color-bg-muted`  | 4.38  | 4.29 |
| `--color-fg-muted` on `--color-bg-muted`   | 4.87  | 5.60 |
| `--color-fg` on `--color-bg-muted-hover`   | 11.29 | 8.76 |

---

# PR 1 — #514 and #513 (branch `fix/focus-ring-holdouts`)

## Task 1: Correct the OptionsPicker border-width comment (#514)

**Files:**

- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx:569`

**Interfaces:**

- Consumes: nothing.
- Produces: nothing. Comment-only.

- [ ] **Step 1: Verify the token really is 2px**

```bash
cd /home/dpws/projects/design-system
grep -n "group-header-border-width" packages/design-system/src/components/OptionsPicker/OptionsPicker.tokens.scss
grep -n "border-width-emphasis" packages/design-tokens/generated/web/tokens.scss
```

Expected: the component token resolves to `var(--border-width-emphasis)`, and `--border-width-emphasis: 2px`.

- [ ] **Step 2: Create the branch**

```bash
cd /home/dpws/projects/design-system
git checkout main && git pull
git checkout -b fix/focus-ring-holdouts
```

- [ ] **Step 3: Fix the comment**

`OptionsPicker.tsx:569` currently reads:

```
                // When the group has a palette color, draw a 1px bottom
                // border on the header in that color — visually carries
                // the namespace identity from the dot across the full
                // header width, separating each group's options.
```

Replace with:

```
                // When the group has a palette color, draw a 2px bottom
                // border on the header in that color — visually carries
                // the namespace identity from the dot across the full
                // header width, separating each group's options.
                //
                // The width is load-bearing, not decorative: #510 gave the
                // header an INSET focus ring (the list is a padding-less
                // scroller, so an outset ring lost both vertical bands), and
                // the inset band is --ring-width, also 2px. A focused header
                // therefore covers this border completely. That trade is only
                // acceptable because the GroupDot beside the label carries the
                // same --color-palette-<name>-fg and the ring does not touch
                // it. Reasoning from the old "1px" gave a partial occlusion
                // and a different verdict on whether the trade is sound.
```

- [ ] **Step 4: Check the rest of the block against the tokens**

```bash
cd /home/dpws/projects/design-system
sed -n '560,600p' packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx
grep -n "group-header" packages/design-system/src/components/OptionsPicker/OptionsPicker.tokens.scss
```

Any other number stated in that comment block must match the token it describes. If one does not, correct it in this same step and note it in the commit body.

- [ ] **Step 5: Verify nothing else broke**

```bash
cd /home/dpws/projects/design-system/packages/design-system && npx vitest run src/structure.test.ts
```

Expected: PASS. (`structure.test.ts` reads `.tsx` comments for stated ratios; a new comment must not state an unbound ratio. The text above states no `N.NN:1` figure, so it binds nothing.)

- [ ] **Step 6: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx
git commit -m "fix(OptionsPicker): the group-header border is 2px, not 1px (#514)

--options-picker-group-header-border-width is --border-width-emphasis, which
is 2px. The comment has said 1px since before the token existed.

Worth more than a typo fix now: #510 gave the header an inset focus ring whose
band is --ring-width, also 2px, so a focused header covers the palette border
completely rather than partially. Anyone reasoning from 1px computes a partial
occlusion and reaches a different verdict on that trade."
```

---

## Task 2: Ban the hover-shared ring suppression, then fix FileUpload and Slider (#513)

**Files:**

- Modify: `packages/design-system/src/structure.test.ts` (append a new `describe` block at end of file)
- Modify: `packages/design-system/src/components/FileUpload/FileUpload.module.scss:27-32`
- Modify: `packages/design-system/src/components/Slider/Slider.module.scss:134-141`

**Interfaces:**

- Consumes: `allFilesUnder(componentsDir)` and `componentsDir`, both already defined at module scope in `structure.test.ts`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing gate**

Append to the end of `packages/design-system/src/structure.test.ts`:

```ts
/**
 * A focus ring may not be suppressed by a rule it SHARES with `:hover`.
 *
 * This is the shape behind two live defects, not a style preference.
 * `FileUpload`'s `.dropzone:hover, .dropzone:focus-visible { outline: none }`
 * left the dropzone with NO focus indicator at all — a WCAG 2.4.7 failure —
 * because the only remaining feedback was a border tint identical to hover.
 * `Slider`'s `.thumb` had the same rule with a visible substitute, which is
 * better and still wrong: the focused state cannot be told apart from the
 * hovered one.
 *
 * Deliberately NOT "any `outline: none` under `:focus-visible`". Three sites
 * do that legitimately and stay: `AvatarGroup` draws a box-shadow ring on
 * purpose (an offset gap there would reveal another avatar, not a surface),
 * `FlowCanvas` suppresses a frame it does not want, and `LiquidEditor`'s
 * textarea delegates the ring to `.root:focus-within`. A broader rule would
 * fail all three and get waived, which is how a gate stops meaning anything.
 * The SHARING is the defect; the suppression alone is not.
 */
describe('a focus ring is not suppressed by a rule shared with :hover', () => {
  const styleFiles = allFilesUnder(componentsDir).filter(({ label }) =>
    /\.module\.scss$/.test(label),
  );

  it('found stylesheets to check', () => {
    expect(styleFiles.length).toBeGreaterThan(50);
  });

  it.each(styleFiles.map(({ label, code }) => [label, code]))('%s', (_label, code) => {
    // Selector list = everything from the previous `}`/`{`/start up to the `{`
    // that opens this block. Nesting is handled by the same scan: an SCSS
    // `&:hover, &:focus-visible` block has both pseudos in its own selector
    // list, so it is caught without resolving the parent.
    const offenders: string[] = [];
    for (const m of code.matchAll(/(^|[{};])([^{};]*?)\{([^{}]*)\}/g)) {
      const selector = m[2]!;
      const body = m[3]!;
      if (!/:hover/.test(selector) || !/:focus-visible/.test(selector)) continue;
      if (/(^|[;\s])outline:\s*none/.test(body)) offenders.push(selector.trim());
    }
    expect(offenders, 'shares outline:none between :hover and :focus-visible').toEqual([]);
  });
});
```

- [ ] **Step 2: Run the gate to verify it fails on the real defects**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/structure.test.ts -t "shared with :hover"
```

Expected: FAIL, naming exactly two files — `FileUpload/FileUpload.module.scss` and `Slider/Slider.module.scss`. If it names `AvatarGroup`, `FlowCanvas` or `LiquidEditor`, the regex is too broad — fix the gate, not those files.

- [ ] **Step 3: Fix FileUpload's dropzone**

`FileUpload.module.scss:27-32` currently reads:

```scss
&:hover,
&:focus-visible {
  border-color: var(--file-upload-dropzone-border-color-hover);
  color: var(--file-upload-dropzone-fg-hover);
  outline: none;
}
```

Replace with:

```scss
&:hover {
  border-color: var(--file-upload-dropzone-border-color-hover);
  color: var(--file-upload-dropzone-fg-hover);
}

// Split from `:hover` above, which set `outline: none` for both and left a
// keyboard user with no indicator at all — the border tint it kept is the
// hover tint, so focused and hovered were indistinguishable. WCAG 2.4.7.
&:focus-visible {
  @include focus-ring;
}
```

- [ ] **Step 4: Make sure the mixin is imported**

```bash
cd /home/dpws/projects/design-system
head -5 packages/design-system/src/components/FileUpload/FileUpload.module.scss
```

If there is no `@use` line pulling in the mixins, add it as the file's first line, matching whatever form the other component stylesheets use:

```bash
grep -h "mixins" packages/design-system/src/components/Tabs/Tabs.module.scss | head -2
```

Copy that exact `@use` line.

- [ ] **Step 5: Fix Slider's thumb**

`Slider.module.scss:134-141` currently reads:

```scss
.thumb:hover,
.thumb:focus-visible {
  border-color: var(--slider-thumb-border-color-hover);
  box-shadow: var(--slider-thumb-shadow-hover);

  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  outline: none;
}
```

Replace with:

```scss
.thumb:hover {
  border-color: var(--slider-thumb-border-color-hover);
  box-shadow: var(--slider-thumb-shadow-hover);
}

// Split from `:hover` above. The shared rule suppressed the ring and offered
// the HOVER treatment as its substitute, so focus and hover looked identical.
// The border/shadow change is kept on focus as well — it reads as "active
// thumb" — but the ring is what makes it a focus indicator.
.thumb:focus-visible {
  border-color: var(--slider-thumb-border-color-hover);
  box-shadow: var(--slider-thumb-shadow-hover);

  @include focus-ring;
}
```

Ensure the mixins `@use` is present in this file too, exactly as in Step 4.

- [ ] **Step 6: Run the gate and the full suite**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/structure.test.ts
npx vitest run src/components/FileUpload src/components/Slider
```

Expected: all PASS.

- [ ] **Step 7: Stylelint**

```bash
npm run lint:css
```

Expected: clean. If the removed `stylelint-disable-next-line` in Slider is now reported as unused, delete it — it is already gone in the replacement above, so this should not fire.

- [ ] **Step 8: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src/structure.test.ts \
        packages/design-system/src/components/FileUpload/FileUpload.module.scss \
        packages/design-system/src/components/Slider/Slider.module.scss
git commit -m "fix(a11y): give FileUpload's dropzone and Slider's thumb a real focus ring (#513)

Both shared one rule between :hover and :focus-visible that set outline:none.
FileUpload kept only a border tint identical to hover, so a keyboard user got
no indicator at all — WCAG 2.4.7. Slider had a visible substitute, but it was
the hover treatment, so focused and hovered were the same picture.

Splitting the selectors is the fix; the sharing was the defect. A structure
gate now bans that exact shape, scoped to rules that carry BOTH pseudos so the
three documented box-shadow/delegated rings (AvatarGroup, FlowCanvas,
LiquidEditor) are not swept up and waived."
```

---

## Task 3: Ban literal ring outlines, then move Rail onto the mixin (#513)

**Files:**

- Modify: `packages/design-system/src/structure.test.ts` (append a second `describe`)
- Modify: `packages/design-system/src/components/Rail/Rail.module.scss` lines `223`, `311`, `361`, `453`

**Interfaces:**

- Consumes: `allFilesUnder`, `componentsDir` from `structure.test.ts` module scope.
- Produces: nothing.

- [ ] **Step 1: Write the failing gate**

Append to `packages/design-system/src/structure.test.ts`:

```ts
/**
 * The ring is drawn by `@include focus-ring`, nowhere else.
 *
 * `Rail` wrote `outline: var(--ring-width) solid var(--ring-accent)` literally
 * at four sites. Emission is identical today, so nothing was visibly broken —
 * which is exactly why it survived. The cost is that a change to the mixin
 * does not reach them, and #510 already paid it: `.groupTrigger:focus-visible`
 * was declared TWICE at different offsets, the later `+2px` won on equal
 * specificity, and the correct rule 84 lines above was dead code while the
 * ring clipped on both sides. A single mixin call cannot be silently
 * duplicated at two geometries.
 *
 * Three of the four also hard-coded `outline-offset: -2px`, a raw value where
 * `calc(-1 * var(--ring-offset))` is the token form.
 */
describe('focus rings are drawn by the mixin, not hand-rolled', () => {
  const styleFiles = allFilesUnder(componentsDir).filter(({ label }) =>
    /\.(module|tokens)\.scss$/.test(label),
  );

  it.each(styleFiles.map(({ label, code }) => [label, code]))('%s', (_label, code) => {
    const literals = [...code.matchAll(/outline:\s*var\(--ring-width\)[^;]*/g)].map((m) => m[0]);
    expect(literals, 'use @include focus-ring instead').toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/structure.test.ts -t "drawn by the mixin"
```

Expected: FAIL naming `Rail/Rail.module.scss` and no other file.

- [ ] **Step 3: Replace all four Rail sites**

Each of the four currently has this shape. At `:223` (`.item`), `:361` (`.groupChevronButton`) and `:453` (`.flyoutHeaderLink`):

```scss
.item:focus-visible {
  outline: var(--ring-width) solid var(--ring-accent);
  outline-offset: -2px;
}
```

becomes:

```scss
.item:focus-visible {
  @include focus-ring;

  // Inset: the rail body is an overflow scroller, so an outset ring loses its
  // outer bands. Was a raw -2px.
  outline-offset: calc(-1 * var(--ring-offset));
}
```

Apply the same transformation to `.groupChevronButton:focus-visible` and `.flyoutHeaderLink:focus-visible`, keeping each rule's own selector.

At `:311` (`.groupTrigger`) the offset is already the token form, so only the outline line changes:

```scss
.groupTrigger:focus-visible {
  @include focus-ring;
  outline-offset: calc(-1 * var(--ring-offset));
}
```

Keep the existing comment above `.groupTrigger` verbatim — it records the duplicate-declaration defect and is the reason this gate exists.

- [ ] **Step 4: Ensure the mixins `@use` is present**

```bash
cd /home/dpws/projects/design-system
head -5 packages/design-system/src/components/Rail/Rail.module.scss
```

Add the same `@use` line as Task 2 Step 4 if absent.

- [ ] **Step 5: Verify emission is unchanged**

The mixin is:

```scss
@mixin focus-ring($color: var(--ring-accent)) {
  outline: var(--ring-width) solid #{$color};
  outline-offset: var(--ring-offset);
}
```

`--ring-offset` is `2px`, so `calc(-1 * var(--ring-offset))` is `-2px` — byte-for-byte the same computed value as the three raw offsets it replaces. Confirm by building:

```bash
cd /home/dpws/projects/design-system && npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Run the suite and stylelint**

```bash
cd /home/dpws/projects/design-system/packages/design-system && npx vitest run
cd /home/dpws/projects/design-system && npm run lint:css
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src/structure.test.ts \
        packages/design-system/src/components/Rail/Rail.module.scss
git commit -m "refactor(Rail): draw all four focus rings with the mixin (#513)

Rail wrote the ring literally at four sites, three of them with a raw -2px
offset. Emission is identical, which is why it survived — the cost is that a
change to the mixin does not reach them, and #510 already paid it once: a
duplicated .groupTrigger:focus-visible at two offsets left the correct rule
dead and the ring clipping on both sides.

A gate now bans literal 'outline: var(--ring-width)' outside mixins.scss, so
the next holdout fails instead of blending in."
```

---

## Task 4: Review and open PR 1

- [ ] **Step 1: Confirm hooks are live**

```bash
cd /home/dpws/projects/design-system
git config --get core.hooksPath   # must print .husky/_
test -x .husky/pre-push && echo hook-ok
```

- [ ] **Step 2: Baseline gates**

```bash
cd /home/dpws/projects/design-system
npm run format:check && npm run typecheck && npm test && npm run lint:css && npm run build
```

All must pass before opening the PR.

- [ ] **Step 3: Push and open a draft PR**

```bash
cd /home/dpws/projects/design-system
git push -u origin fix/focus-ring-holdouts
gh pr create --draft --title "fix(a11y): the three focus-ring holdouts, and a wrong border-width comment (#513 #514)" --body "$(cat <<'BODY'
Closes #513
Closes #514

Three commits, one per concern.

- **#514** — `OptionsPicker.tsx:569` said the group-header border is 1px; the token is `--border-width-emphasis`, 2px. Load-bearing since #510's inset ring covers it exactly.
- **#513 / FileUpload + Slider** — both shared one rule between `:hover` and `:focus-visible` setting `outline: none`. FileUpload's dropzone had no indicator at all (WCAG 2.4.7).
- **#513 / Rail** — four hand-rolled rings, three with a raw `-2px`, moved onto `@include focus-ring`.

Two `structure.test.ts` gates added, both scoped so the three documented exceptions (AvatarGroup, FlowCanvas, LiquidEditor) are not swept up.

Ring GEOMETRY is not covered here — that is #512.
BODY
)"
```

- [ ] **Step 4: Run the mandatory review loop**

Invoke the `pre-push-review` skill (library variant). Iterate until two fresh reviewers say "clean enough to stop". This is Hard rule 8 and is not waived for a small diff.

- [ ] **Step 5: Mark ready, wait for CI, merge**

```bash
cd /home/dpws/projects/design-system
gh pr ready
gh pr checks --watch
gh pr merge --squash
```

---

# PR 2 — #511 (branch `fix/fg-subtle-aa`)

## Task 5: Retune `fg-subtle` and de-alias `presence.offline`

**Files:**

- Modify: `packages/design-tokens/src/tokens.json` — `color.foreground.subtle`, `presence.color.offline`
- Regenerated (never hand-edited): `packages/design-tokens/generated/**`

**Interfaces:**

- Consumes: nothing.
- Produces: `--color-fg-subtle` = `#687388` light / `#8591a0` dark; `--color-presence-offline` = `#6b778c` light / `#7e8b9a` dark. Tasks 6 and 7 assert against these.

- [ ] **Step 1: Branch from fresh main**

```bash
cd /home/dpws/projects/design-system
git checkout main && git pull
git checkout -b fix/fg-subtle-aa
```

- [ ] **Step 2: Record the before state**

```bash
cd /home/dpws/projects/design-system
python3 -c "
import json
d=json.load(open('packages/design-tokens/src/tokens.json'))['tokens']
for t in d:
    if t['id'] in ('color.foreground.subtle','presence.color.offline'): print(json.dumps(t))
"
```

Expected output confirms `color.foreground.subtle` is `{"light": "#6b778c", "dark": "#7e8b9a"}` and `presence.color.offline` aliases `color.foreground.subtle` in both themes.

- [ ] **Step 3: Edit the two tokens**

In `packages/design-tokens/src/tokens.json`, change `color.foreground.subtle`'s value to:

```json
"value": { "light": "#687388", "dark": "#8591a0" }
```

and `presence.color.offline`'s value from the alias pair to literals:

```json
"value": { "light": "#6b778c", "dark": "#7e8b9a" }
```

- [ ] **Step 4: Regenerate and check the contract**

```bash
cd /home/dpws/projects/design-system
npm run tokens:generate
npm run tokens:check
```

Expected: PASS. `tokens:check` runs validate, the token unit tests, and `check-generated.mjs` / `check-web-compat.mjs`.

- [ ] **Step 5: Verify the numbers landed**

```bash
cd /home/dpws/projects/design-system
grep -n "color-fg-subtle\|color-presence-offline" packages/design-tokens/generated/web/tokens.scss packages/design-tokens/generated/web/dark.scss
```

Expected: `--color-fg-subtle: #687388` in `tokens.scss`, `#8591a0` in the dark block; `--color-presence-offline: #6b778c` / `#7e8b9a` as literals, not `var(--color-fg-subtle)`.

- [ ] **Step 6: Run the contrast and presence gates**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/styles/contrast.test.ts
```

Expected: PASS, including `every pair of dots is perceptibly distinct` in both themes. The de-alias holds the presence minimum at 0.1344 light / 0.1958 dark — unchanged from before this task.

Some `@contrast` annotations in `structure.test.ts` will now fail; that is Task 6's job. Do not fix them here.

- [ ] **Step 7: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-tokens/src/tokens.json packages/design-tokens/generated
git commit -m "fix(tokens): bring --color-fg-subtle to AA, and cut its presence coupling (#511)

--color-fg-subtle was sub-AA on THREE of four surfaces, not the one #511
reports: bg-subtle 4.37/4.34 and bg-muted-hover 3.62/3.23 alongside the
reported bg-muted 4.15/3.96, with bg-default on the line at 4.52.

It cannot be darkened far enough to clear bg-muted in light. Two constraints
bind. It is already only dE 0.0387 from --color-fg-muted — under the 0.065
perceptibility floor this library pins for a single hover step — and any value
clearing bg-muted puts them at dE <= 0.019, so the tone stops existing. And
--color-presence-offline aliases it, so every light value from #677286 down to
#4b5362 drops the online/offline pair under the pinned 0.13 floor. The first
value clearing both is darker than --color-fg-muted, inverting the hierarchy
the names describe.

So: one notch, and a scoped certification.

  fg-subtle  light  #6b778c -> #687388   bg 4.52 -> 4.78, bg-subtle 4.37 -> 4.61
  fg-subtle  dark   #7e8b9a -> #8591a0   bg 4.66 -> 5.06, bg-subtle 4.34 -> 4.71

Only lightness moves; hue and saturation are untouched, as in #484. Both clear
AA with headroom rather than landing on 4.50, where the next tint adjustment
silently reintroduces the failure.

presence.offline is de-aliased to the literal it renders today (#6b778c /
#7e8b9a). No visual change, and the presence minimum stays at 0.1344 / 0.1958
instead of tightening to 0.1316. Coupling a status dot to a typography token
made every type retune a two-gate problem — the same shape as #484's
busy-IS-danger knock-on, one layer over."
```

---

## Task 6: Pin the certified surface set and re-point OptionsPicker's hint

**Files:**

- Modify: `packages/design-system/src/styles/contrast.test.ts` — the `PAIRS` array (ends line 186)
- Modify: `packages/design-system/src/components/OptionsPicker/OptionsPicker.tokens.scss:33-62`

**Interfaces:**

- Consumes: the token values from Task 5.
- Produces: `--options-picker-group-header-hint-fg` resolves to `--color-fg-muted`.

- [ ] **Step 1: Add the three pins**

In `contrast.test.ts`, append to `PAIRS` before its closing `];`:

```ts
  // #511. --color-fg-subtle is certified for these two surfaces and no others.
  // It is NOT pinned against --color-bg-muted, and that omission is the rule
  // rather than an oversight: at 4.38/4.29 it would fail, and the value that
  // would fix it collapses the tone into --color-fg-muted (dE <= 0.019, under
  // the 0.065 floor the hover-step gate below pins) while dropping the
  // presence online/offline pair under its own 0.13 floor. So the rule is that
  // the PAIRING does not occur: text on --color-bg-muted or darker uses
  // tone="muted", whose row is directly below.
  ['subtle text on page bg', '--color-fg-subtle', '--color-bg', 4.5],
  ['subtle text on subtle bg', '--color-fg-subtle', '--color-bg-subtle', 4.5],
  ['muted text on muted bg', '--color-fg-muted', '--color-bg-muted', 4.5],
```

- [ ] **Step 2: Run it**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run src/styles/contrast.test.ts
```

Expected: PASS — 4.78/5.06, 4.61/4.71 and 4.87/5.60 all clear 4.5.

- [ ] **Step 3: Sanity-check the pins would have caught the old values**

Task 5 has already COMMITTED the new token, so there is nothing in the working
tree to stash. Restore the pre-fix generated CSS from the commit before it, run
the pin, then restore:

```bash
cd /home/dpws/projects/design-system
TOKENS_COMMIT=$(git log -1 --format=%H -- packages/design-tokens/src/tokens.json)
git checkout "$TOKENS_COMMIT^" -- packages/design-tokens/generated
(cd packages/design-system && npx vitest run src/styles/contrast.test.ts -t "subtle text on subtle bg")
git checkout "$TOKENS_COMMIT" -- packages/design-tokens/generated
git status --short   # must be clean
```

Expected: FAIL at 4.37 with the old generated values, PASS again after the second checkout. A pin that passes against the pre-fix value is pinning nothing. Leave the tree clean before continuing — the `git status --short` is part of the step, not a suggestion.

- [ ] **Step 4: Re-point the OptionsPicker hint**

In `OptionsPicker.tokens.scss`, change:

```scss
--options-picker-group-header-hint-fg: var(--color-fg-subtle);
```

to:

```scss
--options-picker-group-header-hint-fg: var(--color-fg-muted);
```

- [ ] **Step 5: Rewrite the annotation block above it**

The block at `:33-61` documents the old measurements and points at #511 as open. Replace the whole comment run (from `// The header's hint is <Text size="xs" tone="subtle">` down to the last `@contrast` line above the `--options-picker-group-header-hint-fg` declaration) with:

```scss
// The header's hint is <Text size="xs">, and --font-size-xs is 11px, so WCAG
// AA small-text applies at 4.5:1 — not the 3:1 large-text threshold.
//
// It was tone="subtle" and failed at rest: --color-fg-subtle read 4.15:1
// light / 3.96:1 dark on --color-bg-muted. #511 resolved that at the
// primitive — one notch darker, certified for --color-bg and
// --color-bg-subtle only — which does NOT reach this surface, deliberately:
// the value that would have collapsed subtle into muted. So this is the
// consumer half of that fix. The hint is now tone="muted", which the pinned
// 'muted text on muted bg' row in contrast.test.ts holds at 4.5:1.
//
// Hover keeps --color-fg from #510. The gap between rest and hover is now
// 4.87 -> 11.29 rather than 4.15 -> 11.29; still wide, but rest is
// conformant, which is what made the old spread worth flagging.
// @contrast --color-fg-muted on --color-bg-muted = 4.87:1 light
// @contrast --color-fg-muted on --color-bg-muted = 5.60:1 dark
// @contrast --color-fg on --color-bg-muted-hover = 11.29:1 light
// @contrast --color-fg on --color-bg-muted-hover = 8.76:1 dark
```

- [ ] **Step 6: Change the Text tone in the component**

```bash
cd /home/dpws/projects/design-system
grep -n 'tone="subtle"' packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx
```

At `:601` and `:614` the group-header hint renders `<Text size="xs" tone="subtle">`. Change both to `tone="muted"` **only if** those `Text` elements are the ones consuming `--options-picker-group-header-hint-fg`. Read the surrounding JSX first:

```bash
sed -n '595,620p' packages/design-system/src/components/OptionsPicker/OptionsPicker.tsx
```

If the hint's colour comes from the component token via a class rather than from `tone`, leave `tone` alone and the token change in Step 4 is the whole fix. Record which it was in the commit body.

- [ ] **Step 7: Run everything**

```bash
cd /home/dpws/projects/design-system/packages/design-system
npx vitest run
```

Expected: PASS, including the `stated contrast ratios still hold` block, which recomputes every `@contrast` line written in Step 5 against the regenerated tokens and rejects a stated figure off by more than 0.006.

- [ ] **Step 8: Commit**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src/styles/contrast.test.ts \
        packages/design-system/src/components/OptionsPicker
git commit -m "fix(a11y): certify fg-subtle's surfaces, move OptionsPicker's hint to muted (#511)

Three rows added to PAIRS: subtle on --color-bg and on --color-bg-subtle, and
muted on --color-bg-muted. --color-fg-subtle on --color-bg-muted is
deliberately absent — the rule is that the pairing does not occur, not that it
passes, because no value of subtle both clears that surface and stays a
distinct tone.

OptionsPicker's group-header hint is the instance #511 was filed for. It moves
to --color-fg-muted: 4.87:1 light / 5.60:1 dark, against 4.15/3.96 before."
```

---

## Task 7: Sweep every other `--color-fg-subtle` consumer

**Files:**

- Read: all 46 `--color-fg-subtle` references under `packages/design-system/src`
- Modify: any consumer found painting on `--color-bg-muted` or darker

**Interfaces:**

- Consumes: the certified surface set from Task 6.
- Produces: nothing.

- [ ] **Step 1: List every consumer**

```bash
cd /home/dpws/projects/design-system
grep -rn "color-fg-subtle" packages/design-system/src | grep -v "\.test\." | grep -v "^.*://"
```

- [ ] **Step 2: For each, determine the surface underneath**

For every component token that resolves to `--color-fg-subtle`, find where it is painted and what background that element sits on. The question for each is only: is the surface `--color-bg` or `--color-bg-subtle` (certified — leave it), or `--color-bg-muted` / `--color-bg-muted-hover` / darker (not certified — re-point to `--color-fg-muted`)?

Known starting set from the grep, each needing a verdict recorded:

- `Input.tokens.scss:11` `--input-placeholder-fg`, `:20` `--input-fg-disabled`
- `OptionsPicker.tokens.scss:20` `--options-picker-search-icon-fg`
- `EmptyState.tokens.scss:24` `--empty-state-description-fg`
- `EmojiPicker.tokens.scss:23` `--emoji-picker-search-icon-fg`
- `DefinitionList.tokens.scss:20` `--definition-list-icon-fg`
- `RichTextEditor.module.scss:27`
- `DashboardCanvas.tokens.scss:35` `--dashboard-canvas-handle-fg`, `:46` `--dashboard-canvas-dot-color`
- `reset.scss:25` `scrollbar-color` — a scrollbar thumb, a graphical object at 3:1, not text. No change; note why.

Plus every remaining hit the grep returns.

- [ ] **Step 3: Re-point any that fail**

For each consumer sitting on `--color-bg-muted` or darker, change its token to `var(--color-fg-muted)` and add the two `@contrast` lines the `structure.test.ts` gate requires:

```scss
// @contrast --color-fg-muted on --color-bg-muted = 4.87:1 light
// @contrast --color-fg-muted on --color-bg-muted = 5.60:1 dark
```

If a consumer is a graphical object rather than text (an icon silhouette, a handle, a dot), the threshold is 3.0 not 4.5 — `--color-fg-subtle` clears 3:1 on every surface, so it stays. Say so in a comment where it is not obvious.

- [ ] **Step 4: Full suite and build**

```bash
cd /home/dpws/projects/design-system/packages/design-system && npx vitest run
cd /home/dpws/projects/design-system && npm run lint:css && npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit (skip if the sweep found nothing to change)**

```bash
cd /home/dpws/projects/design-system
git add packages/design-system/src
git commit -m "fix(a11y): re-point the fg-subtle consumers that paint on muted (#511)

#511 asked whether OptionsPicker's group header was the only subtle-on-muted
pair or merely the first found. Swept all 46 references; this is the answer."
```

If nothing needed changing, do not create an empty commit — record the finding in the PR body instead.

---

## Task 8: Review and open PR 2

- [ ] **Step 1: Full gates**

```bash
cd /home/dpws/projects/design-system
npm run tokens:check && npm run format:check && npm run typecheck && npm test && npm run lint:css && npm run build
```

- [ ] **Step 2: Visual check**

Start the playground on **8090** (never 8080) and look at the OptionsPicker demo and one page with `tone="subtle"` body text, in both themes:

```bash
cd /home/dpws/projects/design-system && npx vite --port 8090 packages/playground
```

Open `http://localhost:8090/components/options-picker`. Confirm the group-header hint still reads as secondary to the label rather than equal to it, and that the tone shift is not visible as a jump anywhere else. Kill the browser afterwards.

- [ ] **Step 3: Push and open a draft PR**

```bash
cd /home/dpws/projects/design-system
git push -u origin fix/fg-subtle-aa
gh pr create --draft --title "fix(a11y,tokens): bring --color-fg-subtle to AA on the surfaces it is certified for (#511)" --body "$(cat <<'BODY'
Closes #511

#511 asks for one of three fixes. Measured, the one it recommends is not available.

`--color-fg-subtle` fails on **three** of four surfaces, not the one reported:

| on | light | dark |
|---|---|---|
| `--color-bg` | 4.52 | 4.66 |
| `--color-bg-subtle` | **4.37** | **4.34** |
| `--color-bg-muted` | **4.15** | **3.96** |
| `--color-bg-muted-hover` | **3.62** | **3.23** |

It cannot be darkened to clear `bg-muted` in light: it is already only ΔE 0.0387 from `--color-fg-muted` (under the 0.065 floor this repo pins for one hover step), any clearing value puts them at ΔE ≤ 0.019, and `presence.offline` aliases it so the whole band trips the 0.13 presence floor. The first value clearing both is darker than `--color-fg-muted`.

So: one notch (`#687388` / `#8591a0`), a scoped certification pinned in `contrast.test.ts`, and `presence.offline` de-aliased to break the coupling permanently.

Design: `docs/superpowers/specs/2026-09-01-focus-ring-and-subtle-tone-design.md`
BODY
)"
```

- [ ] **Step 4: Mandatory review loop**

Invoke `pre-push-review` (library variant). Iterate to two clean reviewers.

- [ ] **Step 5: Ready, CI, merge**

```bash
cd /home/dpws/projects/design-system
gh pr ready && gh pr checks --watch && gh pr merge --squash
```

---

# PR 3 — #512 (branch `feat/focus-ring-geometry-gate`)

## Task 9: Add Playwright and its config

**Files:**

- Modify: `package.json` (root) — devDependency and script
- Create: `playwright.config.ts` (repo root)
- Modify: `.gitignore` — Playwright output dirs

**Interfaces:**

- Consumes: the playground's `vite preview`.
- Produces: `npm run test:focus-geometry`; a server on `http://localhost:8090`.

- [ ] **Step 1: Branch from fresh main**

```bash
cd /home/dpws/projects/design-system
git checkout main && git pull
git checkout -b feat/focus-ring-geometry-gate
```

- [ ] **Step 2: Install Playwright at the latest version**

```bash
cd /home/dpws/projects/design-system
npm install -D -E @playwright/test@latest
npx playwright install chromium
```

`-E` pins the exact version, matching how this repo handles dependencies.

- [ ] **Step 3: Write the config**

Create `playwright.config.ts` at the repo root:

```ts
import { defineConfig, devices } from '@playwright/test';

/**
 * Focus-ring GEOMETRY only. `contrast.test.ts` certifies a ring's COLOUR
 * against the page surfaces; nothing certified that the ring is actually on
 * screen. Since #505 the ring is an `outline` at `outline-offset: 2px`, so it
 * sits outside the border box and any focusable flush against an `overflow`
 * ancestor loses whole bands. jsdom computes no layout, so the vitest suite is
 * blind to it, and a static check cannot see it either — the clipping ancestor
 * is routinely in a different file from the focusable.
 *
 * Port 8090, never 8080: the playground's own dev server binds 8080 and a
 * developer usually has it running.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:8090',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 8090 --strictPort packages/playground',
    url: 'http://localhost:8090',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
```

- [ ] **Step 4: Add the script**

In root `package.json`, add to `scripts`:

```json
    "test:focus-geometry": "playwright test"
```

- [ ] **Step 5: Ignore Playwright output**

Append to `.gitignore`:

```
# Playwright
/test-results/
/playwright-report/
/blob-report/
/.playwright/
```

- [ ] **Step 6: Verify the server comes up**

```bash
cd /home/dpws/projects/design-system
npx playwright test --list
```

Expected: succeeds and reports 0 tests (no spec yet). If it reports a port conflict, something is already on 8090 — stop and report rather than changing the port.

- [ ] **Step 7: Commit**

```bash
cd /home/dpws/projects/design-system
git add package.json package-lock.json playwright.config.ts .gitignore
git commit -m "chore: add Playwright for the focus-ring geometry gate (#512)

The repo had no browser test layer at all. Port 8090 rather than the
playground's own 8080, which a developer usually has bound."
```

---

## Task 10: Write the geometry sweep

**Files:**

- Create: `tests/focus-ring-geometry.spec.ts`

**Interfaces:**

- Consumes: `baseURL` from `playwright.config.ts`.
- Produces: a `ClipFinding` record shape `{ route: string; key: string; band: 'top'|'right'|'bottom'|'left' }`, consumed by Task 11's baseline.

- [ ] **Step 1: Write the route enumeration and the sweep**

Create `tests/focus-ring-geometry.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE = resolve(__dirname, 'focus-ring-geometry.baseline.json');

/**
 * Routes are read from App.tsx rather than listed here, so a new demo page is
 * swept the moment it is routed. A hand-maintained list is how the last three
 * clips shipped: they were on pages nobody thought to check.
 */
const routes = [
  ...new Set(
    [
      ...readFileSync(resolve(__dirname, '../packages/playground/src/App.tsx'), 'utf8').matchAll(
        /path="(\/components\/[a-z0-9-]+)"/g,
      ),
    ].map((m) => m[1]!),
  ),
].sort();

type Band = 'top' | 'right' | 'bottom' | 'left';
type Finding = { route: string; key: string; band: Band };

test('found the demo routes', () => {
  expect(routes.length).toBeGreaterThan(80);
});

/**
 * Walks focus with real Tab presses, not `el.focus()`.
 *
 * `:focus-visible` is modality-dependent: Chromium matches it after keyboard
 * interaction and not after a programmatic focus with no keyboard history. A
 * sweep built on `el.focus()` measures a ring that a keyboard user would see
 * and a mouse user would not, which is the wrong element for a 2.4.7 gate and
 * silently reports `outline: none` on half the library.
 */
const sweepScript = `
(() => {
  const findings = [];
  const noRing = [];
  const seen = new Set();

  // Strip the content hash off a CSS-module class so a stylesheet edit does
  // not invalidate every baseline entry. generateScopedName is
  // '[name]__[local]__[hash:base64:5]'.
  const stable = (el) => {
    const cls = [...el.classList]
      .map((c) => c.replace(/__[A-Za-z0-9+/]{5}$/, ''))
      .filter((c) => c.includes('__'))
      .sort()
      .join('.');
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
  };

  const inflate = (r, by) => ({
    top: r.top - by, right: r.right + by, bottom: r.bottom + by, left: r.left - by,
  });
  const intersect = (a, b) => ({
    top: Math.max(a.top, b.top), right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom), left: Math.max(a.left, b.left),
  });
  const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);

  const clipOf = (el) => {
    let clip = { top: 0, left: 0, right: innerWidth, bottom: innerHeight };
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        clip = intersect(clip, p.getBoundingClientRect());
      }
    }
    return clip;
  };

  const measure = (el) => {
    const cs = getComputedStyle(el);
    const width = parseFloat(cs.outlineWidth) || 0;
    const style = cs.outlineStyle;
    if (!width || style === 'none') { noRing.push(stable(el)); return; }
    const offset = parseFloat(cs.outlineOffset) || 0;
    const box = el.getBoundingClientRect();
    const inner = inflate(box, offset);
    const outer = inflate(box, offset + width);
    const clip = clipOf(el);
    const bands = {
      top:    { ...outer, bottom: inner.top },
      bottom: { ...outer, top: inner.bottom },
      left:   { ...outer, right: inner.left },
      right:  { ...outer, left: inner.right },
    };
    for (const [band, rect] of Object.entries(bands)) {
      // A band with no area of its own (a fully inset ring past the box) is
      // not a clip — skip it rather than reporting every inset ring as lost.
      if (area(rect) === 0) continue;
      if (area(intersect(rect, clip)) === 0) findings.push({ key: stable(el), band });
    }
  };

  return { findings, noRing };
})()
`;

for (const route of routes) {
  test(`focus rings survive their clip ancestors on ${route}`, async ({ page }) => {
    const found: Finding[] = [];
    const noRing = new Set<string>();

    await page.goto(route);
    await page.waitForLoadState('networkidle');

    let lastKey = '';
    let repeats = 0;
    // Cap the walk. A focus trap or a widget that re-enters itself would
    // otherwise spin; 400 comfortably exceeds the busiest demo page.
    for (let i = 0; i < 400; i++) {
      await page.keyboard.press('Tab');
      const step = (await page.evaluate(`(${sweepScript})`)) as {
        findings: { key: string; band: Band }[];
        noRing: string[];
      };
      const active = await page.evaluate(() => document.activeElement?.tagName ?? 'NONE');
      // Tab has cycled back past the last focusable to the document itself.
      if (active === 'BODY' || active === 'NONE') break;
      for (const f of step.findings) found.push({ route, ...f });
      for (const n of step.noRing) noRing.add(n);

      // A widget that re-focuses itself (a listbox, a roving-tabindex grid
      // that swallows Tab) never reaches BODY, so the BODY check alone can
      // spin to the 400 cap on a handful of pages. Break when the SAME
      // element answers three times running — the walk has stopped moving.
      const key = step.findings.map((f) => f.key).join('|') + '#' + active;
      repeats = key === lastKey ? repeats + 1 : 0;
      lastKey = key;
      if (repeats >= 2) break;
    }

    const baseline: Finding[] = existsSync(BASELINE)
      ? JSON.parse(readFileSync(BASELINE, 'utf8'))
      : [];
    if (process.env.UPDATE_FOCUS_BASELINE) {
      const merged = [...baseline.filter((b) => b.route !== route), ...found];
      writeFileSync(BASELINE, JSON.stringify(merged, null, 2) + '\n');
      return;
    }

    const known = new Set(baseline.map((b) => `${b.route}|${b.key}|${b.band}`));
    const fresh = found.filter((f) => !known.has(`${f.route}|${f.key}|${f.band}`));
    expect(fresh, 'focus-ring bands newly lost to an overflow ancestor').toEqual([]);
  });
}
```

- [ ] **Step 2: Run it once to see what it finds**

```bash
cd /home/dpws/projects/design-system
npx playwright test 2>&1 | tail -60
```

Expected: many failures on the first run, because there is no baseline yet. Read them — this is the sweep's raw output and the input to Task 11.

- [ ] **Step 3: Fix whatever the run reveals about the sweep itself**

If the walk never terminates, if `stable()` produces empty keys, or if the evaluate call throws, fix the spec before generating any baseline. **A baseline generated from a broken sweep locks in the bug.** Do not proceed to Task 11 until the run completes on every route.

- [ ] **Step 4: Commit the spec**

```bash
cd /home/dpws/projects/design-system
git add tests/focus-ring-geometry.spec.ts
git commit -m "test: sweep every focusable's ring against its clip ancestors (#512)

Tab-driven rather than el.focus(): :focus-visible is modality-dependent, so a
programmatic sweep measures a ring keyboard users see and mouse users do not.

Routes come from App.tsx, not a list here — the three clips #505 shipped were
all on pages nobody thought to check."
```

---

## Task 11: Generate the baseline, and prove the gate catches the known clips

**Files:**

- Create: `tests/focus-ring-geometry.baseline.json`

**Interfaces:**

- Consumes: the `Finding` shape from Task 10.
- Produces: the committed baseline the CI job asserts against.

- [ ] **Step 1: Prove the gate re-finds the three bugs #510 fixed**

Before generating any baseline, temporarily revert the three inset offsets that #510 added and confirm the sweep reports them. Find them:

```bash
cd /home/dpws/projects/design-system
grep -rn "outline-offset: calc(-1 \* var(--ring-offset))" packages/design-system/src/components/Tabs packages/design-system/src/components/Calendar
```

Change each to `outline-offset: var(--ring-offset)` and run:

```bash
npx playwright test 2>&1 | grep -iE "tab|timedevent|daycell" | head -20
```

Expected: findings on `/components/tabs` (`.tab`, bottom band) and `/components/calendar` (`TimedEvent` bottom, `DayCell` left). **A gate that cannot re-find the bugs it was built for is not a gate** — if it stays silent, the sweep is wrong. Fix it and repeat.

- [ ] **Step 2: Restore the offsets**

```bash
cd /home/dpws/projects/design-system
git checkout -- packages/design-system/src/components/Tabs packages/design-system/src/components/Calendar
git status --short   # must be clean under packages/design-system
```

- [ ] **Step 3: Generate the baseline**

```bash
cd /home/dpws/projects/design-system
UPDATE_FOCUS_BASELINE=1 npx playwright test
```

- [ ] **Step 4: Read the baseline before committing it**

```bash
cd /home/dpws/projects/design-system
python3 -c "
import json,collections
b=json.load(open('tests/focus-ring-geometry.baseline.json'))
print(len(b),'entries')
for r,c in collections.Counter(x['route'] for x in b).most_common(): print(f'{c:4}  {r}')
"
```

The spec names three expected pre-existing clips: `EmojiPicker` cells (left column, last row), and the Kanban card. Confirm they appear. Anything unexpected and large is a signal the sweep is over-reporting, not a signal to accept it — investigate before committing.

- [ ] **Step 5: Verify a clean run now passes**

```bash
cd /home/dpws/projects/design-system
npx playwright test
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/dpws/projects/design-system
git add tests/focus-ring-geometry.baseline.json
git commit -m "test: baseline the pre-existing focus-ring clips (#512)

Only NEW losses fail. Computing the loss without this separation is what makes
a geometry sweep unusable — every pre-existing clip reads as a regression and
the gate gets waived on its first red PR.

Verified before generating: with #510's three inset offsets reverted, the sweep
re-finds Tabs .tab, Calendar/TimedEvent and Calendar/DayCell."
```

---

## Task 12: Wire it into CI

**Files:**

- Modify: `.github/workflows/quality.yml`

**Interfaces:**

- Consumes: `npm run test:focus-geometry`.
- Produces: nothing.

- [ ] **Step 1: Add the steps to the existing `check` job**

`quality.yml` has one job, `check`, and it already runs `npm run build`, which produces the playground bundle `vite preview` serves. Adding steps there reuses that build and keeps `Quality / check` as the single required status — a second job would need branch protection updated by hand before it gated anything.

After the `Build playground (smoke-tests the library inside a real consumer)` step, insert:

```yaml
- name: Install Chromium for the focus-ring sweep
  run: npx playwright install --with-deps chromium

# Ring COLOUR is gated in contrast.test.ts. This gates its GEOMETRY:
# since #505 the ring is an outline at +2px, so a focusable flush against
# an overflow ancestor loses whole bands, and jsdom computes no layout so
# the vitest suite cannot see it. Needs a real browser; there is no
# cheaper place to put it.
- name: Focus-ring geometry sweep
  run: npm run test:focus-geometry

- name: Upload sweep report on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

- [ ] **Step 2: Confirm the config does not rebuild in CI**

The `webServer.command` in `playwright.config.ts` runs `npm run build && npx vite preview …`. In CI the build has already run. That is a few wasted minutes but it is also what makes the config work identically on a developer's machine, so leave it — note the trade in the commit body rather than optimising it away and creating a local/CI divergence.

- [ ] **Step 3: Validate the workflow parses**

```bash
cd /home/dpws/projects/design-system
python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/quality.yml')); print('yaml ok')"
```

- [ ] **Step 4: Commit**

```bash
cd /home/dpws/projects/design-system
git add .github/workflows/quality.yml
git commit -m "ci: run the focus-ring geometry sweep in the quality gate (#512)

Steps on the existing 'check' job rather than a new one: it already builds the
playground the sweep serves, and Quality / check is the branch-protection
status, so a second job would gate nothing until someone updated protection by
hand.

The issue argued a manual checklist would rot — the mixin is included at ~60
sites. It would."
```

---

## Task 13: Review and open PR 3

- [ ] **Step 1: Full gates locally**

```bash
cd /home/dpws/projects/design-system
npm run format:check && npm run typecheck && npm test && npm run lint:css && npm run build && npm run test:focus-geometry
```

- [ ] **Step 2: Clean up the browser**

Playwright leaves Chromium processes on WSL. After the run:

```bash
pkill -f "ms-playwright" || true
```

- [ ] **Step 3: Push and open a draft PR**

```bash
cd /home/dpws/projects/design-system
git push -u origin feat/focus-ring-geometry-gate
gh pr create --draft --title "test(a11y): gate focus-ring geometry in a real browser (#512)" --body "$(cat <<'BODY'
Closes #512

`contrast.test.ts` certifies a ring's **colour**. Nothing certified its **geometry**. Since #505 the ring is an `outline` at `outline-offset: 2px`, so any focusable flush against an `overflow` ancestor loses whole bands — and jsdom computes no layout, so the vitest suite is blind to it. #505's own migration shipped three (Tabs `.tab`, Calendar `TimedEvent`, Calendar `DayCell`), all fixed in #510.

A static gate cannot close this: `TimedEvent`'s clipping ancestor is `HourGrid`, a different file; `DayCell`'s is the month grid.

- Playwright added to a repo that had none. Port **8090**, not the playground's 8080.
- Tab-driven traversal, not `el.focus()` — `:focus-visible` is modality-dependent.
- Routes read from `App.tsx`, so a new demo is swept on arrival.
- Committed baseline: only **new** losses fail.
- Verified against the three known clips before the baseline was generated.

Wired into the existing `Quality / check` job rather than a new one, so it gates without a branch-protection change.

Not in scope: the IconPicker `box-shadow` → `outline` migration this unblocks.

Design: `docs/superpowers/specs/2026-09-01-focus-ring-and-subtle-tone-design.md`
BODY
)"
```

- [ ] **Step 4: Mandatory review loop**

Invoke `pre-push-review` (library variant). Iterate to two clean reviewers.

- [ ] **Step 5: Ready, CI, merge**

```bash
cd /home/dpws/projects/design-system
gh pr ready && gh pr checks --watch && gh pr merge --squash
```

**Watch the first CI run specifically.** This is a new gate on shared infrastructure; if it is flaky on GitHub's runners (different fonts, different scrollbar widths, different viewport), that surfaces here. A flaky geometry gate is worse than none — if it fires spuriously, fix the tolerance or narrow the sweep before merging, do not disable it.

---

## Task 14: Close the issues

- [ ] **Step 1: Wait for the release**

Merging to `main` triggers `release.yml`, which publishes to GitHub Packages and pushes a `vX.Y.Z` tag if the library changed. PR 1 and PR 2 change the library; PR 3 does not (tests and CI only).

```bash
cd /home/dpws/projects/design-system
gh run list --workflow=release.yml --limit 3
git fetch --tags && git tag --sort=-v:refname | head -3
```

- [ ] **Step 2: Comment the published version and close**

For #511, #513 and #514, comment with the version that carries the fix and close. For #512, comment that the gate is live in `Quality / check` and close.

```bash
cd /home/dpws/projects/design-system
gh issue close 514 --comment "Fixed in <version>."
gh issue close 513 --comment "Fixed in <version>. Two structure gates added so the shape cannot recur."
gh issue close 511 --comment "Fixed in <version>. See the PR for why the recommended fix was not available."
gh issue close 512 --comment "Gate live in Quality / check. IconPicker's migration is now unblocked and wants its own issue."
```

- [ ] **Step 3: File the IconPicker follow-up**

#512 states it blocks the `IconPicker` `box-shadow` → `outline` migration. With the sweep live, that becomes actionable:

```bash
cd /home/dpws/projects/design-system
gh issue create --title "IconPicker: migrate .trigger/.cell rings from box-shadow to the focus-ring mixin" --body "Deferred in #510 and blocked on #512, which is now merged. The cells are a scrolling grid, which is why migrating blind was refused — the geometry sweep can now verify the result."
```

---

## Testing summary

| Issue | What proves it                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #514  | `structure.test.ts` still green; the comment states no ratio, so it binds nothing                                                                       |
| #513  | Two new `structure.test.ts` gates, each verified to FAIL against the pre-fix source and to leave the three documented exceptions alone                  |
| #511  | `npm run tokens:check`; three new `PAIRS` rows verified to fail against the old token value; the existing presence ΔE gate unchanged at 0.1344 / 0.1958 |
| #512  | The sweep re-finds Tabs `.tab`, Calendar `TimedEvent` and Calendar `DayCell` with #510's offsets reverted, before any baseline exists                   |
