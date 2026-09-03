import { exportDiagramViewport } from '@/core/diagram/exportImage';
import {
  layoutStorageKey,
  layoutTableNodes,
  loadLayout,
  saveLayout,
  type DiagramPosition
} from '@/core/diagram/layout';
import type { ViewGraph } from '@/core/diagram/types';
import {
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableFlowNode } from '../TableNode/TableNode';

const DEFAULT_EDGE_STROKE = 'var(--xy-edge-stroke, #b1b1b7)';

type Args = {
  connectionId: string | number | undefined;
  database: string;
  schema: string;
  viewGraph: ViewGraph;
  shownNodeIds: Set<string>;
  highlightedIds: Set<string>;
  activeNodeId: string | null;
  search: string;
  edgeStroke: string;
  exportBg: string;
};

const flowEdgesFromGraph = (viewGraph: ViewGraph, shownNodeIds: Set<string>, edgeStroke: string): Edge[] => {
  const stroke = edgeStroke || DEFAULT_EDGE_STROKE;
  const result: Edge[] = [];

  for (const edge of viewGraph.edges) {
    if (!shownNodeIds.has(edge.source) || !shownNodeIds.has(edge.target)) {
      continue;
    }

    const pairCount = Math.max(edge.sourceColumns.length, edge.targetColumns.length, 1);
    for (let index = 0; index < pairCount; index += 1) {
      result.push({
        id: `${edge.id}:${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceColumns[index] ?? edge.sourceColumns[0],
        targetHandle: edge.targetColumns[index] ?? edge.targetColumns[0],
        style: { stroke }
      });
    }
  }

  return result;
};

export function useDiagramFlow({
  connectionId,
  database,
  schema,
  viewGraph,
  shownNodeIds,
  highlightedIds,
  activeNodeId,
  search,
  edgeStroke,
  exportBg
}: Args): {
  nodes: TableFlowNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  autoLayout: () => void;
  fit: () => void;
  exportImage: (format: 'png' | 'svg') => Promise<void>;
} {
  const { fitView } = useReactFlow();
  const fitViewRef = useRef(fitView);
  fitViewRef.current = fitView;

  const layoutKey = connectionId !== undefined ? layoutStorageKey(connectionId, database, schema) : '';
  const positionsRef = useRef<Record<string, DiagramPosition>>({});
  const loadedLayoutKeyRef = useRef('');

  if (layoutKey && loadedLayoutKeyRef.current !== layoutKey) {
    loadedLayoutKeyRef.current = layoutKey;
    positionsRef.current = loadLayout(layoutKey);
  }

  const baseNodes = useMemo((): TableFlowNode[] => {
    const nextNodes: TableFlowNode[] = viewGraph.nodes
      .filter((node) => shownNodeIds.has(node.id))
      .map((node) => ({
        id: node.id,
        type: 'table' as const,
        position: positionsRef.current[node.id] ?? { x: 0, y: 0 },
        data: {
          name: node.name,
          schema: node.schema,
          columns: node.columns,
          status: node.status,
          highlighted: false,
          dimmed: false
        }
      }));

    const layoutEdges = flowEdgesFromGraph(viewGraph, shownNodeIds, edgeStroke);
    return layoutTableNodes(nextNodes, layoutEdges, positionsRef.current) as TableFlowNode[];
  }, [edgeStroke, shownNodeIds, viewGraph]);

  const baseEdges = useMemo(
    (): Edge[] => flowEdgesFromGraph(viewGraph, shownNodeIds, edgeStroke),
    [edgeStroke, shownNodeIds, viewGraph]
  );

  const graphSignature = useMemo(
    () => `${[...shownNodeIds].sort().join('|')}::${viewGraph.nodes.map((node) => node.id).join('|')}`,
    [shownNodeIds, viewGraph.nodes]
  );

  const [nodes, setNodes] = useState<TableFlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const graphSignatureRef = useRef('');
  const baseNodesRef = useRef(baseNodes);
  const baseEdgesRef = useRef(baseEdges);
  baseNodesRef.current = baseNodes;
  baseEdgesRef.current = baseEdges;

  useEffect(() => {
    if (graphSignatureRef.current === graphSignature) {
      return;
    }
    graphSignatureRef.current = graphSignature;
    setNodes(baseNodesRef.current);
    setEdges(baseEdgesRef.current);
    if (baseNodesRef.current.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      void fitViewRef.current({ padding: 0.15 });
    });
    return (): void => window.cancelAnimationFrame(frame);
  }, [graphSignature]);

  const displayNodes = useMemo((): TableFlowNode[] => {
    const query = search.trim().toLowerCase();
    let changed = false;
    const next = nodes.map((node) => {
      const highlighted = highlightedIds.has(node.id);
      const matchesSearch =
        !query ||
        node.data.name.toLowerCase().includes(query) ||
        (node.data.schema?.toLowerCase().includes(query) ?? false) ||
        node.data.columns.some((column) => column.name.toLowerCase().includes(query));
      const dimmed = (Boolean(activeNodeId) && !highlighted) || (Boolean(query) && !matchesSearch);
      if (node.data.highlighted === highlighted && node.data.dimmed === dimmed) {
        return node;
      }
      changed = true;
      return { ...node, data: { ...node.data, highlighted, dimmed } };
    });
    return changed ? next : nodes;
  }, [activeNodeId, highlightedIds, nodes, search]);

  const persistPositions = useCallback(
    (nextNodes: Node[]): void => {
      if (!layoutKey) {
        return;
      }
      const positions: Record<string, DiagramPosition> = { ...positionsRef.current };
      for (const node of nextNodes) {
        positions[node.id] = node.position;
      }
      positionsRef.current = positions;
      saveLayout(layoutKey, positions);
    },
    [layoutKey]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]): void => {
      setNodes((current) => {
        const next = applyNodeChanges(changes, current) as TableFlowNode[];
        const moved = changes.some((change) => change.type === 'position' && change.dragging === false);
        if (moved) {
          persistPositions(next);
        }
        return next;
      });
    },
    [persistPositions]
  );

  const onEdgesChange = useCallback((changes: EdgeChange[]): void => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const autoLayout = useCallback((): void => {
    setNodes((current) => {
      const next = layoutTableNodes(current, edges, {}) as TableFlowNode[];
      const positions: Record<string, DiagramPosition> = {};
      for (const node of next) {
        positions[node.id] = node.position;
      }
      positionsRef.current = positions;
      if (layoutKey) {
        saveLayout(layoutKey, positions);
      }
      return next;
    });
  }, [edges, layoutKey]);

  const fit = useCallback((): void => {
    void fitViewRef.current({ padding: 0.15 });
  }, []);

  const exportFilename = `diagram-${schema || database || 'db'}`;

  const exportImage = useCallback(
    async (format: 'png' | 'svg'): Promise<void> => {
      await exportDiagramViewport({
        nodes: nodesRef.current,
        format,
        filename: exportFilename,
        backgroundColor: exportBg
      });
    },
    [exportBg, exportFilename]
  );

  return {
    nodes: displayNodes,
    edges,
    onNodesChange,
    onEdgesChange,
    autoLayout,
    fit,
    exportImage
  };
}
