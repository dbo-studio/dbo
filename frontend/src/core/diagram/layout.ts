import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

export type DiagramPosition = { x: number; y: number };

type DagreLaidOutNode = {
  x: number;
  y: number;
  height: number;
};

const NODE_WIDTH = 280;
const HEADER_HEIGHT = 48;
const COLUMN_HEIGHT = 26;

export const tableNodeHeight = (columnCount: number): number =>
  HEADER_HEIGHT + Math.max(columnCount, 1) * COLUMN_HEIGHT;

export const layoutTableNodes = (nodes: Node[], edges: Edge[], existing: Record<string, DiagramPosition>): Node[] => {
  const missing = nodes.filter((node) => existing[node.id] === undefined);
  if (missing.length === 0 && nodes.length > 0) {
    return nodes.map((node) => ({
      ...node,
      position: existing[node.id] ?? node.position
    }));
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', nodesep: 48, ranksep: 96, marginx: 24, marginy: 24 });

  for (const node of nodes) {
    const columnCount = Array.isArray((node.data as { columns?: unknown[] }).columns)
      ? ((node.data as { columns: unknown[] }).columns.length ?? 0)
      : 0;
    graph.setNode(node.id, { width: NODE_WIDTH, height: tableNodeHeight(columnCount) });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const saved = existing[node.id];
    if (saved) {
      return { ...node, position: saved };
    }

    const laidOut = graph.node(node.id) as DagreLaidOutNode | undefined;
    return {
      ...node,
      position: laidOut ? { x: laidOut.x - NODE_WIDTH / 2, y: laidOut.y - laidOut.height / 2 } : node.position
    };
  });
};

export const layoutStorageKey = (connectionId: string | number, database: string, schema: string): string =>
  `dbo.diagram.layout:${connectionId}:${database}:${schema}`;

export const loadLayout = (key: string): Record<string, DiagramPosition> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, DiagramPosition>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveLayout = (key: string, positions: Record<string, DiagramPosition>): void => {
  try {
    localStorage.setItem(key, JSON.stringify(positions));
  } catch {
    // ignore quota / private mode
  }
};
