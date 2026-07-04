import { useCallback, useState } from 'react';
import {
  Badge,
  Button,
  Cluster,
  FlowCanvas,
  Stack,
  Text,
  Title,
  arrangeNodes,
  type FlowCanvasEdge,
  type FlowCanvasNode,
} from '@eocrm/design-system';
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
        description="Drag nodes, drag from a node's edge handle to connect, double-click empty space to add a state, Delete to remove the selection. Custom controls (top-left) and a Maximize toggle (top-right) — press F or Escape to toggle fullscreen. Full keyboard support: arrows rove, E cycles edges, C connects, Shift+arrows nudge. The top-left controls show a custom Add-node button and a Re-arrange button wired to arrangeNodes()."
        code={`import { useState } from 'react';
import { Badge, Button, Cluster, FlowCanvas, arrangeNodes, type FlowCanvasEdge, type FlowCanvasNode } from '@eocrm/design-system';

export function Demo() {
  const [nodes, setNodes] = useState<FlowCanvasNode[]>([
    { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge tone="info">Initial</Badge> },
    { id: 'done', label: 'Done', color: '#1F845A' },
  ]);
  const [edges, setEdges] = useState<FlowCanvasEdge[]>([
    { id: 't1', from: 'open', to: 'done', label: <Badge tone="purple">Guard</Badge> },
  ]);
  return (
    <div style={{ height: 420 }}>
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        controls={
          <Cluster gap="xs">
            <Button size="sm" onClick={() => setNodes((prev) => [...prev, { id: crypto.randomUUID(), label: 'New state', position: { x: 40, y: 40 } }])}>Add node</Button>
            <Button size="sm" variant="secondary" onClick={() => setNodes((prev) => arrangeNodes(prev, edges))}>Re-arrange</Button>
          </Cluster>
        }
        onNodeCreate={(pos) =>
          setNodes((prev) => [...prev, { id: crypto.randomUUID(), label: 'New state', position: pos }])
        }
        onNodeMove={(id, position) =>
          setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position } : n)))
        }
        onNodeDelete={(id) => {
          setNodes((prev) => prev.filter((n) => n.id !== id));
          setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));
        }}
        onEdgeCreate={(from, to) =>
          setEdges((prev) => [...prev, { id: crypto.randomUUID(), from, to }])
        }
        onEdgeDelete={(id) => setEdges((prev) => prev.filter((e) => e.id !== id))}
        onNodeOpen={(id) => console.log('open node', id)}
        onEdgeOpen={(id) => console.log('open edge', id)}
        onSelectionChange={(selection) => console.log('selection', selection)}
      />
    </div>
  );
}`}
      >
        <Stack gap="sm">
          <div style={{ height: 420 }}>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              controls={
                <Cluster gap="xs">
                  <Button size="sm" variant="primary" onClick={handleAddNode}>
                    Add node
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleArrange}>
                    Re-arrange
                  </Button>
                </Cluster>
              }
              onNodeCreate={handleNodeCreate}
              onNodeMove={handleNodeMove}
              onNodeDelete={handleNodeDelete}
              onNodeOpen={handleNodeOpen}
              onEdgeCreate={handleEdgeCreate}
              onEdgeDelete={handleEdgeDelete}
              onEdgeOpen={handleEdgeOpen}
              onSelectionChange={handleSelectionChange}
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
          between nodes, E cycles a node's connections, C starts connect mode, Shift+arrows nudge,
          +/−/0 zoom and fit, Ctrl+arrows pan. Pass `controls` to render your own buttons top-left;
          the built-in Maximize toggle (top-right, or F / Escape) expands the canvas to fill the
          viewport.
        </Text>
      </Stack>
    </DemoLayout>
  );
}
