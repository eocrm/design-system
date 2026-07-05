import { useCallback, useState } from 'react';
import {
  Badge,
  Button,
  Cluster,
  ConfirmationPopover,
  FlowCanvas,
  Stack,
  Switch,
  Text,
  Title,
  arrangeNodes,
  type FlowCanvasEdge,
  type FlowCanvasNode,
} from '@eocrm/design-system';
import { Trash2 } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

let nextId = 1;

const WORKFLOW_NODES: FlowCanvasNode[] = [
  { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge tone="info">Initial</Badge> },
  { id: 'in-progress', label: 'In progress', color: '#E56910' },
  { id: 'on-hold', label: 'On hold', color: '#8590A2' },
  { id: 'resolved', label: 'Resolved', color: '#1F845A' },
];
const WORKFLOW_EDGES: FlowCanvasEdge[] = [
  { id: 'e1', from: 'open', to: 'in-progress' },
  { id: 'e2', from: 'in-progress', to: 'on-hold', label: <Badge tone="purple">Guard</Badge> },
  { id: 'e3', from: 'on-hold', to: 'in-progress' },
  { id: 'e4', from: 'in-progress', to: 'resolved', label: <Badge tone="purple">Guard</Badge> },
];

export function FlowCanvasDemo() {
  const [nodes, setNodes] = useState(WORKFLOW_NODES);
  const [edges, setEdges] = useState(WORKFLOW_EDGES);
  const [lastEvent, setLastEvent] = useState('—');
  const [allowConnections, setAllowConnections] = useState(true);
  const [confineNodesToView, setConfineNodesToView] = useState(false);

  const handleNodeCreate = useCallback((position: { x: number; y: number }) => {
    const id = `state-${nextId++}`;
    setNodes((prev) => [...prev, { id, label: `New state ${nextId - 1}`, position }]);
    setLastEvent(`onNodeCreate(${Math.round(position.x)}, ${Math.round(position.y)})`);
  }, []);
  const handleNodeMove = useCallback((id: string, position: { x: number; y: number }) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position } : n)));
    setLastEvent(`onNodeMove(${id})`);
  }, []);
  const handleNodeDelete = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
    setLastEvent(`onNodeDelete(${id})`);
  }, []);
  const handleEdgeCreate = useCallback((from: string, to: string) => {
    setEdges((prev) => [...prev, { id: `edge-${nextId++}`, from, to }]);
    setLastEvent(`onEdgeCreate(${from} → ${to})`);
  }, []);
  const handleEdgeDelete = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setLastEvent(`onEdgeDelete(${id})`);
  }, []);
  const handleEdgeReconnect = useCallback((id: string, from: string, to: string) => {
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, from, to } : e)));
    setLastEvent(`onEdgeReconnect(${id}: ${from} → ${to})`);
  }, []);
  const handleNodeOpen = useCallback((id: string) => {
    setLastEvent(`onNodeOpen(${id})`);
  }, []);
  const handleEdgeOpen = useCallback((id: string) => {
    setLastEvent(`onEdgeOpen(${id})`);
  }, []);
  const handleSelectionChange = useCallback(
    (selection: { type: 'node' | 'edge'; id: string } | null) => {
      setLastEvent(
        selection
          ? `onSelectionChange(${selection.type}: ${selection.id})`
          : 'onSelectionChange(null)',
      );
    },
    [],
  );
  const handleAddNode = useCallback(() => {
    const id = `state-${nextId++}`;
    const offset = 40 + nodes.length * 24;
    setNodes((prev) => [
      ...prev,
      { id, label: `New state ${nextId - 1}`, position: { x: offset, y: offset } },
    ]);
    setLastEvent('controls: add node');
  }, [nodes.length]);
  const handleArrange = useCallback(() => {
    setNodes((prev) => arrangeNodes(prev, edges));
    setLastEvent('controls: re-arrange');
  }, [edges]);

  return (
    <DemoLayout
      name="FlowCanvas"
      description="Pan/zoom canvas for directed node-edge diagrams — the primitive behind visual workflow builders. Events-only: you own the data, it emits intents."
      files={getComponentFiles('FlowCanvas')}
      componentName="FlowCanvas"
    >
      <Example
        title="Workflow builder"
        description="Drag nodes, drag from a node's edge handle to connect, double-click empty space to add a state, Delete to remove the selection. Select an edge and drag either endpoint handle onto another node — or press R (Shift+R for the source) — to rewire it via onEdgeReconnect. Selecting a node or edge floats an action toolbar (renderNodeActions / renderEdgeActions) with a delete button; the edge toolbar guards its delete behind a ConfirmationPopover. Toggle Allow connections to gate all create/rewire, and Confine nodes to view to clamp dragged cards to the visible area. Custom controls (top-left) and a Maximize toggle (top-right) — press F or Escape to toggle fullscreen. Full keyboard support: arrows rove, E cycles edges, C connects, R / Shift+R rewire, Shift+arrows nudge."
        code={`import { useState } from 'react';
import { Badge, Button, ConfirmationPopover, Cluster, FlowCanvas, Switch, type FlowCanvasEdge, type FlowCanvasNode } from '@eocrm/design-system';
import { Trash2 } from 'lucide-react';

export function Demo() {
  const [nodes, setNodes] = useState<FlowCanvasNode[]>([
    { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge tone="info">Initial</Badge> },
    { id: 'done', label: 'Done', color: '#1F845A' },
  ]);
  const [edges, setEdges] = useState<FlowCanvasEdge[]>([
    { id: 't1', from: 'open', to: 'done', label: <Badge tone="purple">Guard</Badge> },
  ]);
  const [allowConnections, setAllowConnections] = useState(true);
  const [confineNodesToView, setConfineNodesToView] = useState(false);

  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
  };
  const deleteEdge = (id: string) => setEdges((prev) => prev.filter((e) => e.id !== id));

  return (
    <>
      <Cluster gap="md">
        <Switch checked={allowConnections} onChange={(next) => setAllowConnections(next)}>
          Allow connections
        </Switch>
        <Switch checked={confineNodesToView} onChange={(next) => setConfineNodesToView(next)}>
          Confine nodes to view
        </Switch>
      </Cluster>
      <div style={{ height: 420 }}>
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          allowConnections={allowConnections}
          confineNodesToView={confineNodesToView}
          onNodeMove={(id, position) =>
            setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position } : n)))
          }
          onNodeDelete={deleteNode}
          onEdgeCreate={(from, to) =>
            setEdges((prev) => [...prev, { id: crypto.randomUUID(), from, to }])
          }
          onEdgeDelete={deleteEdge}
          // Drag a selected edge's endpoint onto another node, or press R / Shift+R:
          onEdgeReconnect={(id, from, to) =>
            setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, from, to } : e)))
          }
          // Floating toolbars anchored to the selected node / edge:
          renderNodeActions={(id) => (
            <Button size="xs" iconOnly variant="ghost" aria-label="Delete node" onClick={() => deleteNode(id)}>
              <Trash2 size={12} />
            </Button>
          )}
          renderEdgeActions={(id) => (
            <ConfirmationPopover title="Delete connection?" confirmLabel="Delete" variant="danger" onConfirm={() => deleteEdge(id)}>
              <Button size="xs" iconOnly variant="ghost" aria-label="Delete connection">
                <Trash2 size={12} />
              </Button>
            </ConfirmationPopover>
          )}
        />
      </div>
    </>
  );
}`}
      >
        <Stack gap="sm">
          <Cluster gap="md">
            <Switch checked={allowConnections} onChange={(next) => setAllowConnections(next)}>
              Allow connections
            </Switch>
            <Switch checked={confineNodesToView} onChange={(next) => setConfineNodesToView(next)}>
              Confine nodes to view
            </Switch>
          </Cluster>
          <div style={{ height: 420 }}>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              allowConnections={allowConnections}
              confineNodesToView={confineNodesToView}
              controls={
                <Cluster gap="xs">
                  <Button size="sm" variant="primary" onClick={handleAddNode}>
                    Add node
                  </Button>
                  {/* A ConfirmationPopover works from the controls slot even though
                      its footer portals to document.body (#290). */}
                  <ConfirmationPopover
                    title="Re-arrange all nodes?"
                    description="This overwrites every node's current position."
                    confirmLabel="Re-arrange"
                    onConfirm={handleArrange}
                  >
                    <Button size="sm" variant="secondary">
                      Re-arrange
                    </Button>
                  </ConfirmationPopover>
                </Cluster>
              }
              onNodeCreate={handleNodeCreate}
              onNodeMove={handleNodeMove}
              onNodeDelete={handleNodeDelete}
              onNodeOpen={handleNodeOpen}
              onEdgeCreate={handleEdgeCreate}
              onEdgeDelete={handleEdgeDelete}
              onEdgeReconnect={handleEdgeReconnect}
              onEdgeOpen={handleEdgeOpen}
              onSelectionChange={handleSelectionChange}
              renderNodeActions={(id) => (
                <Button
                  size="xs"
                  iconOnly
                  variant="ghost"
                  aria-label="Delete node"
                  onClick={() => handleNodeDelete(id)}
                >
                  <Trash2 size={12} />
                </Button>
              )}
              renderEdgeActions={(id) => (
                // Re-verifies the #290 fix from a selection toolbar: the popover's
                // footer portals to document.body yet Confirm still fires.
                <ConfirmationPopover
                  title="Delete connection?"
                  confirmLabel="Delete"
                  variant="danger"
                  onConfirm={() => handleEdgeDelete(id)}
                >
                  <Button size="xs" iconOnly variant="ghost" aria-label="Delete connection">
                    <Trash2 size={12} />
                  </Button>
                </ConfirmationPopover>
              )}
            />
          </div>
          <Text size="sm" tone="muted">
            Last intent: {lastEvent}
          </Text>
        </Stack>
      </Example>

      <Example
        title="Auto-layout"
        description="Nodes without position are laid out automatically — layered left to right from the sources. Drag still works; positions persist for the session."
        code={`import { FlowCanvas } from '@eocrm/design-system';

export function Demo() {
  return (
    <div style={{ height: 320 }}>
      <FlowCanvas
        nodes={[
          { id: 'a', label: 'Lead in' },
          { id: 'b', label: 'Qualify' },
          { id: 'c', label: 'Quote' },
          { id: 'd', label: 'Won' },
          { id: 'e', label: 'Lost' },
        ]}
        edges={[
          { id: '1', from: 'a', to: 'b' },
          { id: '2', from: 'b', to: 'c' },
          { id: '3', from: 'c', to: 'd' },
          { id: '4', from: 'b', to: 'e' },
          { id: '5', from: 'c', to: 'e' },
        ]}
      />
    </div>
  );
}`}
      >
        <div style={{ height: 320 }}>
          <FlowCanvas
            nodes={[
              { id: 'a', label: 'Lead in' },
              { id: 'b', label: 'Qualify' },
              { id: 'c', label: 'Quote' },
              { id: 'd', label: 'Won' },
              { id: 'e', label: 'Lost' },
            ]}
            edges={[
              { id: '1', from: 'a', to: 'b' },
              { id: '2', from: 'b', to: 'c' },
              { id: '3', from: 'c', to: 'd' },
              { id: '4', from: 'b', to: 'e' },
              { id: '5', from: 'c', to: 'e' },
            ]}
          />
        </div>
      </Example>

      <Example
        title="Read-only"
        description="readOnly renders the diagram without editing: no drag, no connect handles, no delete — selection and open still work, so it suits record pages."
        code={`import { FlowCanvas } from '@eocrm/design-system';

export function Demo() {
  return (
    <div style={{ height: 280 }}>
      <FlowCanvas
        readOnly
        nodes={[
          { id: 'todo', label: 'To do', color: '#8590A2', position: { x: 0, y: 60 } },
          { id: 'doing', label: 'Doing', color: '#0052CC', position: { x: 260, y: 0 } },
          { id: 'done', label: 'Done', color: '#1F845A', position: { x: 520, y: 60 } },
        ]}
        edges={[
          { id: '1', from: 'todo', to: 'doing' },
          { id: '2', from: 'doing', to: 'done' },
        ]}
      />
    </div>
  );
}`}
      >
        <div style={{ height: 280 }}>
          <FlowCanvas
            readOnly
            nodes={[
              { id: 'todo', label: 'To do', color: '#8590A2', position: { x: 0, y: 60 } },
              { id: 'doing', label: 'Doing', color: '#0052CC', position: { x: 260, y: 0 } },
              { id: 'done', label: 'Done', color: '#1F845A', position: { x: 520, y: 60 } },
            ]}
            edges={[
              { id: '1', from: 'todo', to: 'doing' },
              { id: '2', from: 'doing', to: 'done' },
            ]}
          />
        </div>
      </Example>

      <Stack gap="xs">
        <Title order={3} size="md">
          Implementation notes
        </Title>
        <Text size="sm" tone="muted">
          The canvas fills its parent — give the wrapper an explicit height. All mutations flow
          through intent callbacks; the canvas never changes your data. Keyboard: arrows rove
          between nodes, E cycles a node's connections, C starts connect mode, R (or Shift+R)
          rewires a selected edge's target (or source), Shift+arrows nudge, +/−/0 zoom and fit,
          Ctrl+arrows pan. Pass `controls` to render your own buttons top-left; the built-in
          Maximize toggle (top-right, or F / Escape) expands the canvas to fill the viewport.
        </Text>
      </Stack>
    </DemoLayout>
  );
}
