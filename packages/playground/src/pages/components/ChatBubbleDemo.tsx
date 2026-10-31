import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button, ChatBubble, Cluster, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const feedback = (
  <Cluster gap="xs">
    <Button variant="ghost" size="sm" iconOnly aria-label="Helpful">
      <ThumbsUp size={14} aria-hidden="true" />
    </Button>
    <Button variant="ghost" size="sm" iconOnly aria-label="Not helpful">
      <ThumbsDown size={14} aria-hidden="true" />
    </Button>
  </Cluster>
);

export function ChatBubbleDemo() {
  return (
    <DemoLayout
      name="ChatBubble"
      componentName="ChatBubble"
      description="One chat message bubble aligned by speaker, plus ChatBubble.List — the role='log' live region that announces new messages."
      files={getComponentFiles('ChatBubble')}
    >
      <Example
        title="Member and assistant"
        description="`member` is the signed-in user (accent tint, end side); `assistant` is neutral on the start side."
        code={`<Stack gap="sm">
  <ChatBubble from="member">Which deals close this week?</ChatBubble>
  <ChatBubble from="assistant">Three deals are scheduled to close by Friday.</ChatBubble>
</Stack>`}
      >
        <Stack gap="sm">
          <ChatBubble from="member">Which deals close this week?</ChatBubble>
          <ChatBubble from="assistant">Three deals are scheduled to close by Friday.</ChatBubble>
        </Stack>
      </Example>

      <Example
        title="Footer"
        description="The `footer` slot sits below the coloured body on the same side — feedback buttons, sources."
        code={`<ChatBubble
  from="assistant"
  footer={
    <Cluster gap="xs">
      <Button variant="ghost" size="sm" iconOnly aria-label="Helpful">
        <ThumbsUp size={14} aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="sm" iconOnly aria-label="Not helpful">
        <ThumbsDown size={14} aria-hidden="true" />
      </Button>
    </Cluster>
  }
>
  Acme Corp is the largest open deal.
</ChatBubble>`}
      >
        <ChatBubble from="assistant" footer={feedback}>
          Acme Corp is the largest open deal.
        </ChatBubble>
      </Example>

      <Example
        title="Pending"
        description="`pending` shows a typing indicator instead of children. Announced once when inserted into a `ChatBubble.List`."
        code={`<ChatBubble from="assistant" pending />`}
      >
        <ChatBubble from="assistant" pending />
      </Example>

      <Example
        title="Conversation list"
        description="`ChatBubble.List` is `role='log'` with `aria-live='polite'`. Give it an `aria-label` naming the conversation."
        code={`<ChatBubble.List aria-label="Conversation with Scout">
  <ChatBubble from="member">Summarise the Acme account.</ChatBubble>
  <ChatBubble from="assistant" footer={feedback}>
    Acme renewed in March and has two open deals.
  </ChatBubble>
  <ChatBubble from="member">Draft a follow-up email.</ChatBubble>
  <ChatBubble from="assistant" pending />
</ChatBubble.List>`}
      >
        <ChatBubble.List aria-label="Conversation with Scout">
          <ChatBubble from="member">Summarise the Acme account.</ChatBubble>
          <ChatBubble from="assistant" footer={feedback}>
            Acme renewed in March and has two open deals.
          </ChatBubble>
          <ChatBubble from="member">Draft a follow-up email.</ChatBubble>
          <ChatBubble from="assistant" pending />
        </ChatBubble.List>
      </Example>
    </DemoLayout>
  );
}
