import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Button, ChatBubble, ChatLauncher, Cluster, Stack, Textarea } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

interface Msg {
  id: number;
  from: 'member' | 'assistant';
  text?: string;
  pending?: boolean;
}

const REPLY = 'Thanks! This is a canned reply from the demo assistant.';

export function ChatLauncherDemo() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, from: 'assistant', text: 'Hi, I am Scout. Ask me anything.' },
  ]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, []);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const replyId = nextId.current + 1;
    setMessages((m) => [
      ...m,
      { id: nextId.current, from: 'member', text },
      { id: replyId, from: 'assistant', pending: true },
    ]);
    nextId.current += 2;
    setDraft('');
    timers.current.push(
      window.setTimeout(() => {
        setMessages((m) =>
          m.map((x) => (x.id === replyId ? { ...x, pending: false, text: REPLY } : x)),
        );
      }, 1000),
    );
  };

  return (
    <DemoLayout
      name="ChatLauncher"
      componentName="ChatLauncher"
      description="Fixed bottom-end launcher button that toggles a non-modal chat panel. Controlled: you own open state and messages."
      files={getComponentFiles('ChatLauncher')}
    >
      <Example
        title="Live launcher"
        description="One live instance on this page (bottom-right). Send a message: a pending bubble appears, then a canned reply."
        code={`const [open, setOpen] = useState(false);
const composerRef = useRef<HTMLTextAreaElement>(null);

<ChatLauncher
  label="Ask Scout"
  title="Scout"
  icon={<MessageCircle size={20} aria-hidden="true" />}
  open={open}
  onOpenChange={setOpen}
  initialFocusRef={composerRef}
  footer={
    <form onSubmit={send}>
      <Cluster gap="sm" align="end">
        <Textarea ref={composerRef} aria-label="Message" minRows={1} maxRows={4} autoGrow value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" iconOnly aria-label="Send"><Send size={16} aria-hidden="true" /></Button>
      </Cluster>
    </form>
  }
>
  <ChatBubble.List aria-label="Conversation with Scout">
    {messages.map((m) => (
      <ChatBubble key={m.id} from={m.from} pending={m.pending}>{m.text}</ChatBubble>
    ))}
  </ChatBubble.List>
</ChatLauncher>`}
      >
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open chat
        </Button>
      </Example>

      <Example
        title="Behaviour"
        description="Non-modal: the page stays interactive. Escape or the close button closes it and returns focus to the launcher; the body stays mounted while closed and follows new messages only when scrolled to the bottom."
        code={`<ChatLauncher label="Ask Scout" title="Scout" icon={icon} open={open} onOpenChange={setOpen}>
  <ChatBubble.List aria-label="Conversation">…</ChatBubble.List>
</ChatLauncher>`}
      >
        <Stack gap="xs">
          <span>Required: label, title, icon, open, onOpenChange.</span>
          <span>Optional: footer (composer), initialFocusRef.</span>
        </Stack>
      </Example>

      <ChatLauncher
        label="Ask Scout"
        title="Scout"
        icon={<MessageCircle size={20} aria-hidden="true" />}
        open={open}
        onOpenChange={setOpen}
        initialFocusRef={composerRef}
        footer={
          <form onSubmit={send}>
            <Cluster gap="sm" align="end">
              <Textarea
                ref={composerRef}
                aria-label="Message"
                minRows={1}
                maxRows={4}
                autoGrow
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) send(e);
                }}
              />
              <Button type="submit" iconOnly aria-label="Send">
                <Send size={16} aria-hidden="true" />
              </Button>
            </Cluster>
          </form>
        }
      >
        <ChatBubble.List aria-label="Conversation with Scout">
          {messages.map((m) => (
            <ChatBubble key={m.id} from={m.from} pending={m.pending}>
              {m.text}
            </ChatBubble>
          ))}
        </ChatBubble.List>
      </ChatLauncher>
    </DemoLayout>
  );
}
