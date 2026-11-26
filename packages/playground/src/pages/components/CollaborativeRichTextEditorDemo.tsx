import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Badge, Button, Cluster, Stack, Text, fromMarkdown } from '@eocrm/design-system';
import {
  CollaborativeRichTextEditor,
  fromRichDoc,
  toRichDoc,
  type CollabPresence,
  type CollabStatus,
} from '@eocrm/design-system/collab';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';

const LATENCY_MS = 300;
const REMOTE = Symbol('remote');

const SAMPLE = fromMarkdown(
  '# Meeting notes\n\nEdit on both sides: carets, selections and edits cross a 300 ms in-memory relay.\n\n- Seeded on BOTH docs with `fromRichDoc` (idempotent: one copy, not two)\n- Toggle Offline on a side, edit, then reconnect to merge',
);

type Side = {
  doc: Y.Doc;
  user: { name: string; color: string };
  offline: boolean;
  outbox: Uint8Array[]; // local updates made while offline
  inbox: Uint8Array[]; // remote updates received while offline
  lastPresence: CollabPresence;
  peer: Side | null;
  setStatus: (s: CollabStatus) => void;
  setOthers: (p: CollabPresence[]) => void;
};

const makeSide = (name: string, color: string): Side => {
  const doc = fromRichDoc(SAMPLE, new Y.Doc());
  const user = { name, color };
  return {
    doc,
    user,
    offline: false,
    outbox: [],
    inbox: [],
    lastPresence: { ...user, clientId: doc.clientID, selection: null },
    peer: null,
    setStatus: () => {},
    setOthers: () => {},
  };
};

/** Deliver after the simulated latency; the receiver buffers while it is offline. */
const deliver = (to: Side, apply: () => void, buffer: () => void) =>
  setTimeout(() => (to.offline ? buffer() : apply()), LATENCY_MS);

const sendUpdate = (from: Side, update: Uint8Array) => {
  const to = from.peer!;
  if (from.offline) from.outbox.push(update);
  else
    deliver(
      to,
      () => Y.applyUpdate(to.doc, update, REMOTE),
      () => to.inbox.push(update),
    );
};

const sendPresence = (from: Side, p: CollabPresence) => {
  from.lastPresence = p;
  const to = from.peer!;
  // An offline user simply is not in the other side's presence (they "left").
  if (!from.offline)
    deliver(
      to,
      () => to.setOthers([p]),
      () => {},
    );
};

const setOffline = (side: Side, offline: boolean) => {
  side.offline = offline;
  const peer = side.peer!;
  if (offline) {
    side.setStatus('offline');
    peer.setOthers([]);
    return;
  }
  side.setStatus('connecting');
  side.outbox.splice(0).forEach((u) => sendUpdate(side, u));
  side.inbox.splice(0).forEach((u) => Y.applyUpdate(side.doc, u, REMOTE));
  sendPresence(side, side.lastPresence);
  // The peer's presence comes back to us if it is online.
  if (!peer.offline)
    deliver(
      side,
      () => side.setOthers([peer.lastPresence]),
      () => {},
    );
  setTimeout(() => side.setStatus('synced'), LATENCY_MS);
};

function useRelay() {
  const sides = useRef<[Side, Side] | null>(null);
  if (!sides.current) {
    const a = makeSide('Ana', '#d9480f');
    const b = makeSide('Ben', '#1971c2');
    a.peer = b;
    b.peer = a;
    sides.current = [a, b];
  }
  const [a, b] = sides.current;
  const [statusA, setStatusA] = useState<CollabStatus>('synced');
  const [statusB, setStatusB] = useState<CollabStatus>('synced');
  // Every connected client has an entry from the start, even before it focuses (selection: null).
  const [othersA, setOthersA] = useState<CollabPresence[]>([b.lastPresence]);
  const [othersB, setOthersB] = useState<CollabPresence[]>([a.lastPresence]);
  a.setStatus = setStatusA;
  b.setStatus = setStatusB;
  a.setOthers = setOthersA;
  b.setOthers = setOthersB;

  useEffect(() => {
    const offs = [a, b].map((s) => {
      const onUpdate = (u: Uint8Array, origin: unknown) => origin !== REMOTE && sendUpdate(s, u);
      s.doc.on('update', onUpdate);
      return () => s.doc.off('update', onUpdate);
    });
    return () => offs.forEach((off) => off());
  }, [a, b]);

  return { a, b, statusA, statusB, othersA, othersB };
}

const CODE = `import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import {
  CollaborativeRichTextEditor,
  fromRichDoc,
  type CollabPresence,
  type CollabStatus,
} from '@eocrm/design-system/collab';

const REMOTE = Symbol('remote');

export function Page({ snapshot, send, onIncoming, sendPresence, onIncomingPresence }) {
  const [doc] = useState(() => fromRichDoc(snapshot, new Y.Doc())); // one canonical snapshot
  const [others, setOthers] = useState<CollabPresence[]>([]);
  const [status] = useState<CollabStatus>('synced');

  useEffect(() => {
    const onUpdate = (u: Uint8Array, origin: unknown) => origin !== REMOTE && send(u);
    doc.on('update', onUpdate);
    const offIn = onIncoming((u: Uint8Array) => Y.applyUpdate(doc, u, REMOTE));
    const offPresence = onIncomingPresence((p: CollabPresence) =>
      setOthers((all) => [...all.filter((x) => x.clientId !== p.clientId), p]),
    );
    return () => {
      doc.off('update', onUpdate);
      offIn();
      offPresence();
    };
  }, [doc]);

  return (
    <CollaborativeRichTextEditor
      doc={doc}
      user={{ name: 'Ana', color: '#d9480f' }}
      presence={others}
      onPresenceChange={sendPresence}
      status={status}
      toolbar
    />
  );
}`;

export function CollaborativeRichTextEditorDemo() {
  const { a, b, statusA, statusB, othersA, othersB } = useRelay();
  const [snapshotChars, setSnapshotChars] = useState<number | null>(null);

  const pane = (side: Side, status: CollabStatus, others: CollabPresence[], peerSide: Side) => (
    <Stack gap="sm">
      <Cluster gap="sm" align="center" justify="between">
        <Cluster gap="sm" align="center">
          <Text weight="semibold">{side.user.name}</Text>
          <Badge tone={status === 'synced' ? 'success' : 'warning'}>{status}</Badge>
        </Cluster>
        <Button
          size="sm"
          variant="secondary"
          aria-pressed={side.offline}
          onClick={() => setOffline(side, !side.offline)}
        >
          {side.offline ? 'Reconnect' : 'Offline'}
        </Button>
      </Cluster>
      <CollaborativeRichTextEditor
        doc={side.doc}
        user={side.user}
        presence={others}
        onPresenceChange={(p) => sendPresence(side, p)}
        status={status}
        toolbar
        aria-label={`${side.user.name}'s editor`}
      />
      <Text size="sm" tone="muted">
        {peerSide.user.name} sees {side.user.name} {side.offline ? 'leave' : 'online'}.
      </Text>
    </Stack>
  );

  return (
    <DemoLayout
      name="CollaborativeRichTextEditor"
      componentName="CollaborativeRichTextEditor"
      description="RichTextEditor over a shared Yjs doc (imported from @eocrm/design-system/collab; yjs is an optional peer). Two editors on two Y.Docs, linked by an in-memory relay with 300 ms latency: live carets, per-user undo, and a per-side Offline toggle that buffers updates and merges them on reconnect."
      files={[]}
    >
      <Example
        title="Two editors, one document"
        description="Ana and Ben each own a Y.Doc, both seeded from the same snapshot with fromRichDoc (concurrent seeding of the same snapshot merges into one copy). Click into both to see the other caret and its name flag (shown 2 s after it moves). Undo only reverts your own edits."
        code={CODE}
        fullWidth
      >
        <Stack gap="md">
          <Cluster gap="lg" align="start" wrap>
            {pane(a, statusA, othersA, b)}
            {pane(b, statusB, othersB, a)}
          </Cluster>
          <Cluster gap="sm" align="center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSnapshotChars(JSON.stringify(toRichDoc(a.doc)).length)}
            >
              Snapshot Ana with toRichDoc
            </Button>
            {snapshotChars !== null && (
              <Text size="sm" tone="muted">
                RichDoc JSON: {snapshotChars} characters (store next to the Y update log for search
                and read-only display).
              </Text>
            )}
          </Cluster>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
