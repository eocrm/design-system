# `<TopBar>` component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Build a new library primitive `<TopBar>` matching the existing playground topbar design (search input + icon buttons with notification dots + avatar). Per spec at `docs/superpowers/specs/2026-05-28-topbar-design.md`.

**Branch:** `feat/topbar-component` (already checked out off main).

**Locked-in design (from brainstorm):** compound API (`<TopBar>`, `<TopBar.Start>`, `<TopBar.End>`, `<TopBar.Search>`, `<TopBar.IconButton>`); sticky-top positioning by default; minimal search input (no command-palette).

---

## Task 1: tokens + i18n keys

**Files:**

- Create: `packages/design-system/src/components/TopBar/TopBar.tokens.scss`
- Modify: `packages/design-system/src/i18n/messages.ts` — add `topBar` namespace
- Modify: `packages/design-system/src/i18n/en.ts` — `topBar.label`, `topBar.search`
- Modify: `packages/design-system/src/i18n/ru.ts` — same

Token values: copy verbatim from the spec's "Tokens" section.

i18n mapping:

- `topBar.label`: `Application top bar` / `Верхняя панель приложения`
- `topBar.search`: `Search` / `Поиск`

- [ ] Commit `TopBar: tokens + i18n`.

---

## Task 2: Root + Start + End

**Files:**

- Create: `packages/design-system/src/components/TopBar/TopBar.tsx`
- Create: `packages/design-system/src/components/TopBar/TopBarStart.tsx`
- Create: `packages/design-system/src/components/TopBar/TopBarEnd.tsx`
- Create: `packages/design-system/src/components/TopBar/TopBar.module.scss`
- Create: `packages/design-system/src/components/TopBar/index.ts`

### `TopBar.tsx`

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { TopBarStart } from './TopBarStart';
import { TopBarEnd } from './TopBarEnd';
import { TopBarSearch } from './TopBarSearch';
import { TopBarIconButton } from './TopBarIconButton';
import styles from './TopBar.module.scss';

export type TopBarElement = 'header' | 'div';

export interface TopBarProps extends Omit<HTMLAttributes<HTMLElement>, 'aria-label'> {
  /** Defaults to `'header'`. Use `'div'` for nested toolbars where a banner element would be wrong. */
  as?: TopBarElement;
  /** Accessible label. Defaults to `t('topBar.label')`. */
  'aria-label'?: string;
  children?: ReactNode;
}

const TopBarRoot = forwardRef<HTMLElement, TopBarProps>(function TopBar(
  { as = 'header', 'aria-label': ariaLabel, className, children, ...props },
  ref,
) {
  const t = useTranslation();
  const Comp = as as 'header';
  return (
    <Comp
      ref={ref as never}
      aria-label={ariaLabel ?? t('topBar.label')}
      className={clsx(styles.topBar, className)}
      {...props}
    >
      {children}
    </Comp>
  );
});

export const TopBar = Object.assign(TopBarRoot, {
  Start: TopBarStart,
  End: TopBarEnd,
  Search: TopBarSearch,
  IconButton: TopBarIconButton,
});
```

### `TopBarStart.tsx` and `TopBarEnd.tsx`

Trivial flex wrappers:

```tsx
export const TopBarStart = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function TopBarStart({ className, ...props }, ref) {
    return <div ref={ref} className={clsx(styles.start, className)} {...props} />;
  },
);
// Same shape for TopBarEnd, swapping the class.
```

### `TopBar.module.scss` (root + start + end only)

```scss
@use './TopBar.tokens';

// Layout-owning primitive (Hard rule 4 exception): TopBar owns its
// own height + padding + sticky positioning because that IS its job.
// Same justification as <Rail>, <Modal>, <Drawer>, <Page>.
// stylelint-disable property-disallowed-list -- layout-owning primitive
.topBar {
  position: sticky;
  top: 0;
  z-index: var(--topbar-z-index);
  height: var(--topbar-height);
  padding: 0 var(--topbar-padding-x);
  background: var(--topbar-bg);
  border-bottom: var(--topbar-border-width) solid var(--topbar-border-color);
  display: flex;
  align-items: center;
  gap: var(--topbar-gap);
}
// stylelint-enable property-disallowed-list

.start {
  display: flex;
  align-items: center;
  gap: var(--topbar-gap);
  flex: 1 1 auto;
  min-width: 0;
}

.end {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
```

- [ ] Commit `TopBar: root + Start + End`.

---

## Task 3: TopBar.Search

**File:** `packages/design-system/src/components/TopBar/TopBarSearch.tsx`

```tsx
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import styles from './TopBar.module.scss';

export interface TopBarSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Optional `<kbd>` hint shown after the input — e.g. '⌘K'. */
  hotkey?: ReactNode;
  /** Forwarded to the wrapper div. */
  className?: string;
}

export const TopBarSearch = forwardRef<HTMLInputElement, TopBarSearchProps>(function TopBarSearch(
  { hotkey, placeholder, className, 'aria-label': ariaLabel, ...inputProps },
  ref,
) {
  const t = useTranslation();
  return (
    <div className={clsx(styles.search, className)}>
      <Search aria-hidden className={styles.searchIcon} />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder ?? t('topBar.search')}
        className={styles.searchInput}
        // Password managers (1Password, Bitwarden) and browser autofill
        // shouldn't try to fill a free-text search box.
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        {...inputProps}
      />
      {hotkey != null && (
        <kbd aria-hidden className={styles.searchKbd}>
          {hotkey}
        </kbd>
      )}
    </div>
  );
});
```

### SCSS additions for `.search`

```scss
.search {
  display: flex;
  align-items: center;
  gap: var(--topbar-search-gap);
  height: var(--topbar-search-height);
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- search field gets a max width so wide viewports don't yield a huge bar
  width: 100%;
  max-width: var(--topbar-search-max-width);
  min-width: 0; // allow Start's flex-1 to shrink the search
  padding: 0 var(--topbar-search-padding-x);
  background: var(--topbar-search-bg);
  border-radius: var(--topbar-search-radius);
}

.search:focus-within {
  outline: var(--ring-width) solid var(--topbar-search-ring-focus);
  outline-offset: -1px;
}

.searchIcon {
  width: var(--topbar-search-icon-size);
  height: var(--topbar-search-icon-size);
  color: var(--topbar-search-icon-fg);
  flex-shrink: 0;
}

.searchInput {
  flex: 1 1 auto;
  min-width: 0;
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- transparent so the wrapper's bg shows
  background: transparent;
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- native input border reset
  border: 0;
  color: var(--topbar-search-fg);
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- inherit page font sizing
  font: inherit;
}

.searchInput:focus {
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- the wrapper handles the visible focus ring
  outline: none;
}

.searchInput::placeholder {
  color: var(--topbar-search-placeholder-fg);
}

.searchKbd {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 var(--topbar-search-kbd-padding-x);
  background: var(--topbar-search-kbd-bg);
  color: var(--topbar-search-kbd-fg);
  font-size: var(--topbar-search-kbd-font-size);
  border-radius: var(--topbar-search-kbd-radius);
  font-family: var(--font-family-sans);
  flex-shrink: 0;
}
```

- [ ] Commit `TopBar: Search subcomponent`.

---

## Task 4: TopBar.IconButton

**File:** `packages/design-system/src/components/TopBar/TopBarIconButton.tsx`

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from '../Button';
import styles from './TopBar.module.scss';

export type TopBarIndicatorTone = 'danger' | 'warning' | 'info' | 'accent';

export interface TopBarIconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  children: ReactNode;
  indicator?: boolean;
  indicatorTone?: TopBarIndicatorTone;
  'aria-label': string; // REQUIRED for icon-only buttons
}

const TONE_CLASS: Record<TopBarIndicatorTone, string> = {
  danger: styles.indicatorDanger,
  warning: styles.indicatorWarning,
  info: styles.indicatorInfo,
  accent: styles.indicatorAccent,
};

export const TopBarIconButton = forwardRef<HTMLButtonElement, TopBarIconButtonProps>(
  function TopBarIconButton(
    { children, indicator = false, indicatorTone = 'danger', className, ...props },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        iconOnly
        className={clsx(styles.iconButton, className)}
        {...props}
      >
        {children}
        {indicator && (
          <span aria-hidden className={clsx(styles.indicator, TONE_CLASS[indicatorTone])} />
        )}
      </Button>
    );
  },
);
```

### SCSS additions for `.iconButton` and `.indicator`

```scss
.iconButton {
  // The base ghost Button is square via `iconOnly`; topbar variant uses
  // a slightly larger touch target to feel right in the bar.
  width: var(--topbar-icon-button-size);
  height: var(--topbar-icon-button-size);
  border-radius: var(--topbar-icon-button-radius);
  position: relative;
}

.indicator {
  position: absolute;
  top: var(--topbar-indicator-offset-top);
  right: var(--topbar-indicator-offset-right);
  width: var(--topbar-indicator-size);
  height: var(--topbar-indicator-size);
  border-radius: var(--radius-full);
  border: var(--topbar-indicator-border-width) solid var(--topbar-indicator-border-color);
  pointer-events: none;
}

.indicatorDanger {
  background: var(--topbar-indicator-bg-danger);
}
.indicatorWarning {
  background: var(--topbar-indicator-bg-warning);
}
.indicatorInfo {
  background: var(--topbar-indicator-bg-info);
}
.indicatorAccent {
  background: var(--topbar-indicator-bg-accent);
}
```

- [ ] Commit `TopBar: IconButton with notification indicator`.

---

## Task 5: Public exports + manifest

- `packages/design-system/src/components/TopBar/index.ts` — re-export Root + subcomponents + types.
- `packages/design-system/src/index.ts` — re-export `TopBar` + `TopBarProps`, `TopBarSearchProps`, `TopBarIconButtonProps`, `TopBarIndicatorTone`, `TopBarElement`.
- Add `'TopBar'` to `packages/playground/src/pages/mockups/registry.ts`'s `ComponentName` union.
- Re-generate manifest via `node scripts/generate-manifest.mjs` (or whatever the script is); register under cluster `Navigation` (alongside Rail).

- [ ] Commit `TopBar: barrel + manifest`.

---

## Task 6: Tests

**File:** `packages/design-system/src/components/TopBar/TopBar.test.tsx`

Cover the test list from the spec's "Tests" section. Vitest globals, RTL `render`/`screen`.

- [ ] Commit `TopBar: unit tests`.

---

## Task 7: Demo page

**Files:**

- Create: `packages/playground/src/pages/components/TopBarDemo.tsx`
- Modify: `packages/playground/src/App.tsx` — route `/components/topbar`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` — add the nav item
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` — add the overview card

The demo has 3-4 examples per spec.

- [ ] Commit `TopBar: playground demo + nav`.

---

## Task 8: AppShell migration

Replace the hand-rolled `<header className={styles.topbar}>` block in `AppShell.tsx` with the new `<TopBar>` + `<TopBar.Search>` + `<TopBar.IconButton>`.

Remove the now-dead SCSS classes from `AppShell.module.scss` (`.topbar`, `.searchWrap`, `.searchIcon`, `.search`, `.searchKbd`, `.iconBtn`, `.notifDot`). Keep the `.shell` grid + `--topbar-height` token (the grid still references it).

Verify in Playwright that the migrated topbar visually matches the previous one (search input, two icon buttons with the bell having a red dot, avatar).

- [ ] Commit `Playground AppShell: adopt the new TopBar`.

---

## Task 9: Docs

`packages/design-system/AGENTS.md` — add a TopBar catalog entry after Rail.

- [ ] Commit `Docs: TopBar in AGENTS.md`.

---

## Task 10: Library hr8 review-fix loop

Standard hr8 cycle per `CLAUDE.md` Rule 8.

- [ ] Step 1: full gate sweep (test / typecheck / lint / build / npm pack --dry-run)
- [ ] Step 2: fresh-context reviewer on the 10 categories. Specifically probe: polymorphic `as` for the root element type-soundness; indicator dot a11y (aria-hidden on the visual marker, consumer responsible for screen-reader text); sticky-top positioning works without consumer setting up specific layout; demo + AppShell adoption are visually identical.
- [ ] Step 3: fix Critical + Important findings.
- [ ] Step 4: re-run + re-spawn until `clean enough to stop`.

---

## Task 11: Push + PR

Title: `TopBar: sticky application top-bar primitive (Search + IconButton + indicator dot)`.
