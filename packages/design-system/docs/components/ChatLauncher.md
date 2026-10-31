# `<ChatLauncher>` — floating launcher + non-modal chat panel

A fixed bottom-end icon button that toggles a chat panel above it. The panel is a `role="dialog"` **without** `aria-modal`: no focus trap, backdrop or scroll lock, so the page stays usable while chatting. It is portaled to `document.body` and layered on `--z-chat-launcher` (above app chrome, below dropdowns, popovers and modals). Controlled only: `open` + `onOpenChange`.

```tsx
import { useRef, useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { Button, ChatBubble, ChatLauncher, Stack, Textarea } from '@eocrm/design-system';

const [open, setOpen] = useState(false);
const composerRef = useRef<HTMLTextAreaElement>(null);

<ChatLauncher
  label="Ask Scout"
  title="Scout"
  icon={<Sparkles size={20} aria-hidden="true" />}
  open={open}
  onOpenChange={setOpen}
  initialFocusRef={composerRef}
  footer={
    <Stack gap="sm" align="end">
      <Textarea ref={composerRef} aria-label="Message" minRows={1} maxRows={4} />
      <Button variant="primary" onClick={send}>
        <Send size={16} aria-hidden="true" /> Send
      </Button>
    </Stack>
  }
>
  <ChatBubble.List aria-label="Conversation with Scout">
    {messages.map((m) => (
      <ChatBubble key={m.id} from={m.from}>
        {m.text}
      </ChatBubble>
    ))}
    {waiting && <ChatBubble from="assistant" pending />}
  </ChatBubble.List>
</ChatLauncher>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | Accessible name of the launcher button — names the assistant ("Ask Scout"). |
| `open` | `boolean` | yes | Whether the panel is open. Controlled only: pair with `onOpenChange`. |
| `onOpenChange` | `(open: boolean) => void` | yes | Called with the requested state: launcher toggle, close button, Escape. |
| `icon` | `ReactNode` | yes | Launcher glyph (e.g. a lucide icon with `aria-hidden`). |
| `title` | `ReactNode` | yes | Panel header text; also the dialog's accessible name. |
| `children` | `ReactNode` | yes | Scrolling body — usually a `<ChatBubble.List>`. Stays mounted while closed. |
| `footer` | `ReactNode` | no | Pinned area below the body — the composer (`Textarea` + send `Button`). |
| `initialFocusRef` | `RefObject<HTMLElement \| null>` | no | Element focused when the panel opens (point it at the composer). Default: the panel itself. Focus already inside the panel is not moved. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Stays mounted when closed.** The panel gets `hidden`; children are not unmounted, so an uncontrolled draft and the scroll position survive close/reopen.
- **Sticks to the bottom.** While open, the body follows new content if the user was already at (within 24px of) the bottom; a user scrolled up to read is not moved. Reopening scrolls to the bottom if it was at the bottom when closed (replies that arrived meanwhile are in view), otherwise restores the saved position.
- **Focus.** Opening moves focus to `initialFocusRef` (point it at the composer), else to the panel; focus already inside is left alone. Escape (inside the panel or on the launcher) and the close button close it and return focus to the launcher. A programmatic close returns focus only if it was inside the chat. An Escape a child already handled (`event.preventDefault()`, e.g. a menu closing itself) is ignored.
- The close button's name is the `chatLauncher.close` i18n key (no label prop). `label` names your assistant and is the launcher's accessible name.
- `ref`, `className`, `id` and other native attributes go to the panel; `role`, `hidden`, `aria-labelledby` and `tabIndex` always win.
- Size: `--chat-launcher-panel-width` (380px) × `--chat-launcher-panel-height` (560px), capped to the viewport minus `--chat-launcher-inset`.

**When NOT to use:** page-level dialogs or forms that must block the page (use `Modal` / `Drawer`); content anchored to a trigger in the page (use `Popover`); notifications (use `toast`); more than one launcher per page.

**Anti-patterns**

- Unmounting `<ChatLauncher>` when closed: you lose the draft and scroll position the component keeps for you.
- Positioning it yourself (wrapping it in a fixed container, adding `className` with `position`/`bottom`): it already owns the viewport corner.
- Putting the composer in `children`: it would scroll away. Use `footer`.
- Bubbles without `ChatBubble.List`: new replies won't be announced.
