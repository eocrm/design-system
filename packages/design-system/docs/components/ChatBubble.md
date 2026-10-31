# `<ChatBubble>` — one chat message, plus `ChatBubble.List` (the `role="log"` container)

A message bubble aligned by speaker: `from="member"` (the signed-in user, end side, accent tint) or `from="assistant"` (start side, neutral). Always put bubbles inside `<ChatBubble.List aria-label="…">`: it is a `role="log"` + `aria-live="polite"` region, so a screen reader announces each new message, with the speaker, as it arrives.

```tsx
import { Button, ChatBubble } from '@eocrm/design-system';

<ChatBubble.List aria-label="Conversation with Scout">
  <ChatBubble from="member">Which deals are at risk?</ChatBubble>
  <ChatBubble from="assistant" footer={<Button size="xs">Helpful</Button>}>
    Three deals have had no activity for 14 days.
  </ChatBubble>
  {waiting && <ChatBubble from="assistant" pending />}
</ChatBubble.List>;
```

<!-- props:start -->

## Props

### `ChatBubbleProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `from` | `'member' \| 'assistant'` | yes | Speaker. `member` = the user (accent tint, end side); `assistant` = the AI (neutral, start side). |
| `children` | `ReactNode` | no | Message content. Ignored while `pending`. |
| `footer` | `ReactNode` | no | Slot below the coloured body, same side (feedback buttons, sources). |
| `pending` | `boolean` | no | Show a "typing" indicator instead of `children`; announced once when inserted into a `ChatBubble.List`. Intended for `from="assistant"`. Default: `false`. |
| …native | | | plus native `<div>` attributes |

### `ChatBubbleListProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes | The `ChatBubble`s of the conversation, oldest first. Pass an `aria-label` naming the conversation. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **The speaker is spoken.** Every bubble starts with a visually hidden, localised "You said: " / "Assistant said: " (`chatBubble.*` i18n keys, no label props).
- **`pending`** shows animated dots (static under `prefers-reduced-motion`) and a hidden "Assistant is typing…"; `children` are ignored. Inserted into the `role="log"` list it is announced once, and the real reply is announced when it replaces it. `aria-busy` is not used. It carries no "said" prefix; the typing text names the speaker.
- **`footer`** renders below the coloured body, same side, outside the tint.
- `ChatBubble.List` spreads props first: `role` and `aria-live` always win. Gap between bubbles is `--chat-bubble-list-gap`.
- Bubble width is capped at `--chat-bubble-max-width` (80%). The root is a full-width row; alignment is `justify-content`, so the parent never needs to align it.

**When NOT to use:** threaded/commented records (use `Thread`), toasts or banners (use `toast` / `Banner`), a bubble outside a `ChatBubble.List` for a live conversation (nothing will be announced), rich per-message layout (the body is plain content; compose it inside `children`).

**Anti-patterns**

- A `ChatBubble.List` without `aria-label`.
- Overriding `role` on `ChatBubble.List`: ignored — it is always `role="log"`. Don't wrap the bubbles in your own `role="list"`/`listitem` markup either: a list inside the log adds noise ("list, 3 items") to every announcement.
- Setting `aria-busy` or building your own typing indicator: use `pending`.
- Re-adding a "You:" / "Assistant:" prefix in `children`: it would be read twice.
