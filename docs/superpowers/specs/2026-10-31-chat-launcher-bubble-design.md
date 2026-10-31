# ChatLauncher + ChatBubble — design (#725)

## Intent

The CRM ships an in-app AI assistant on every tenant page (`apps/web`, `TenantShell`). Today it is an interim shim composed from `Button`, `Card`, `Stack`, `Text` plus a CSS module for fixed positioning (`apps/web/src/shared/ds-shims/ChatLauncher.tsx`, `ChatBubble.tsx`). The DS should own the pattern: a floating launcher that opens a chat panel, and the message bubbles inside it, with the focus, a11y and layering decisions made once.

Success: the consumer deletes both shims and composes the assistant from `ChatLauncher`, `ChatBubble` and `ChatBubble.List` with no own CSS.

## Goals

- `ChatLauncher` — fixed bottom-right icon button that toggles a **non-modal** chat panel above it.
- `ChatBubble` — one message, aligned end (member) or start (assistant), with an optional footer and a `pending` (assistant typing) state.
- `ChatBubble.List` — the message log container, `role="log"`, so new replies reach screen readers.

## Non-goals

- A composer/input component (consumer uses `Textarea` + `Button` in the `footer` slot).
- Markdown rendering, streaming text, avatars, timestamps inside the bubble (consumer puts them in `children`/`footer`).
- Multiple launchers / positions other than bottom-right (inline-end). Add a `placement` when a second consumer needs it.
- A separate full-screen mobile layout.

## Anti-goals

- A focus trap, backdrop or scroll lock — the page must stay usable while chatting.
- Losing the chat's scroll position or draft on close.
- Panel rendering underneath a dropdown/popover opened from inside it.

## Decisions (user)

1. **Non-modal.** No focus trap, backdrop or scroll lock.
2. **Stays mounted when closed.** The panel is hidden (`hidden` attribute), not unmounted, so scroll position and uncontrolled drafts survive close/reopen.
3. **Capped float on narrow viewports.** One layout: ~380×560, capped to the viewport minus the edge inset.
4. **Layering:** new shared token `--z-chat-launcher: 900` — above `--z-app-chrome` (500), below `--z-dropdown` (1000), `--z-popover`, `--z-modal`.
5. **`pending` prop** on `ChatBubble` (Hard rule 10).
6. **`ChatBubble.List`** with `role="log"` owns the announcement.

## Decisions (my calls — user was AFK and delegated)

7. **No `closeLabel` prop.** Hard rule 9 bans per-component label props; the close button's accessible name is `t('chatLauncher.close')`. `label` stays a prop: it names the consumer's assistant ("Ask Scout"), which is data, not chrome.
8. **Controlled only**, as the issue proposes: `open` + `onOpenChange` required. No `defaultOpen` — the one consumer drives it from shell state.
9. **Portaled to `document.body`** (like `ToastViewport`/`Popover.Content`), so an ancestor `transform`/`overflow` can't trap the fixed element. One root element holds both launcher and panel.
10. **Panel semantics:** the panel root IS the `role="dialog"` element (the forwardRef target and the `aria-controls` target); its module SCSS sets `display: flex` so it carries an explicit `.panel[hidden] { display: none }` guard. `role="dialog"` WITHOUT `aria-modal`, `aria-labelledby` → the header title. Launcher: `Button iconOnly`, `aria-label={label}`, `aria-expanded={open}`, `aria-controls={panelId}`. The launcher stays visible while open and toggles.
11. **Focus:** on open, focus moves to `initialFocusRef.current` if given (same prop name as `Drawer`; the consumer points it at the composer), else to the panel itself (`tabIndex={-1}`). Not moved if focus is already inside the panel. On close via Escape or the close button, focus returns to the launcher. Closing via the launcher itself leaves focus on it naturally. Programmatic close from outside (`open` → false) returns focus to the launcher only if focus was inside the panel (otherwise don't steal it).
12. **Escape** closes while focus is inside the panel **or on the launcher** (listener on the shared root, non-modal: no document-level listener); focus ends on the launcher. An Escape whose event was already `defaultPrevented` (e.g. a menu inside the panel closing itself) is ignored.
13. **Panel layout:** header (`title` + close button) / scrolling body (`children`) / optional pinned `footer` slot (composer). Body is the scroll container.
14. **Stick to bottom:** while open, the body follows new content whenever its content grows **while the user is already at (within ~1 line of) the bottom**. A user who scrolled up to read is not yanked down. On **close**, record `{ scrollTop, atBottom }` (a `hidden` element reads 0 for everything, and browsers don't reliably keep scroll across `display: none`). On **open**: first open, or `atBottom` was true at close → scroll to the bottom (so replies that arrived while closed are in view); otherwise restore the saved `scrollTop`. The `ResizeObserver` callback is ignored while `hidden`. No unread badge (non-goal). Implementation: `ResizeObserver` on the body's content wrapper; pure `isAtBottom(scrollTop, scrollHeight, clientHeight, threshold)` helper unit-tested in Node; layout stubbed in jsdom like `Tabs.test.tsx`.
15. **Sizes:** component tokens `--chat-launcher-panel-width: 380px`, `--chat-launcher-panel-height: 560px`, `--chat-launcher-inset: var(--space-4)` (distance from viewport edges), gap between launcher and panel `var(--space-3)`. Panel `width: min(width, 100vw - 2*inset)`, `height: min(height, 100dvh - launcher - gap - 2*inset)`. Fixed positioning in the module SCSS uses the same justified `stylelint-disable` pattern as `Toast.module.scss` (the component IS the viewport layer).
16. **Panel surface:** reuse `Card`'s visual language (surface bg, border, radius, `--shadow-lg`) via tokens; not literally a `Card` (we need the header/body/footer flex column and `hidden`).
17. **Launcher:** `Button size="lg" iconOnly variant="primary"` with the default Button shape. No new Button props.
18. **ChatBubble alignment without `align-self`** (Rule 4): the bubble root is a full-width row (`display: flex; width: 100%`) with `justify-content: flex-end` (member) / `flex-start` (assistant); inside it a column holding the bubble body and the footer. Body `max-width: var(--chat-bubble-max-width)` (80%).
19. **Bubble colours:** member = `--color-bg-accent-subtle`-family token, assistant = neutral subtle surface; text default fg. Radius `--radius-lg`. Exposed via `ChatBubble.tokens.scss`. Footer renders **below** the coloured body, outside it, same side.
20. **Role label:** each bubble starts with `<VisuallyHidden>` of `t('chatBubble.member')` ("You said") / `t('chatBubble.assistant')` ("Assistant said") followed by `: ` — so a screen reader reading the log hears who spoke. Root element `div`.
21. **`pending`:** valid with either `from` but intended for assistant. Renders three dots (`aria-hidden`, CSS animation, static under `prefers-reduced-motion`) plus `<VisuallyHidden>{t('chatBubble.pending')}</VisuallyHidden>` ("Assistant is typing…"). `children` ignored while pending. Because it sits inside `ChatBubble.List`'s `role="log"`, insertion is announced once; when the pending bubble is replaced by the real reply, the reply is announced. `aria-busy` is NOT used.
22. **`ChatBubble.List`:** `div role="log" aria-live="polite"` (explicit, for AT that ignore the implicit value), vertical `Stack`-equivalent gap `var(--space-3)`. Accepts `aria-label`; docs say to pass one.
23. **i18n keys** (en + ru): `chatLauncher.close`, `chatBubble.member`, `chatBubble.assistant`, `chatBubble.pending`.
24. **forwardRef** targets: `ChatLauncher` → the panel `div` (the thing consumers measure/scroll); `ChatBubble` → root `div`; `ChatBubble.List` → the log `div`. Spread order: ChatLauncher props spread on the panel, props-first (Pattern B) so `role`/`hidden`/`aria-labelledby` win; ChatBubble/List props-last except `role` on List (Pattern B there too).

## API

```ts
interface ChatLauncherProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  label: string; // launcher's accessible name
  open: boolean;
  onOpenChange(open: boolean): void;
  icon: ReactNode; // launcher glyph
  title: ReactNode; // panel header
  children: ReactNode; // scrolling body — usually <ChatBubble.List>
  footer?: ReactNode; // pinned composer
  initialFocusRef?: RefObject<HTMLElement | null>;
}

type ChatBubbleFrom = 'member' | 'assistant';
interface ChatBubbleProps extends HTMLAttributes<HTMLDivElement> {
  from: ChatBubbleFrom;
  children?: ReactNode; // required unless pending
  footer?: ReactNode; // feedback buttons, sources
  pending?: boolean;
}
interface ChatBubbleListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
```

## Done means (Core invariant)

Both components: tests beside them, a playground demo each (`ChatLauncherDemo`, `ChatBubbleDemo`) wired into App route, `navItems.ts`, `ComponentsIndex.tsx` + `overviewSchematics.tsx`, `ComponentName` union; `src/index.ts` re-exports; `docs/components/ChatLauncher.md` + `ChatBubble.md` + `AI-PRIMER.md` lines; CLUSTERS entries in both manifest maps + `npm run build:manifest`; token added in `packages/design-tokens/src/tokens.json` + `npm run tokens:generate && npm run tokens:check`. The ChatLauncher demo must not leave a fixed launcher on top of every demo example — render one live instance per page (the demo's examples can share it or show it scoped; builder's call).

## Left to the builder

Exact token names for bubble colours, the dot animation, schematic artwork, demo content.
