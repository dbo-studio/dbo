import { exportDiagramViewport } from '@/core/diagram/exportImage';
import {
  layoutStorageKey,
  layoutTableNodes,
  loadLayout,
  saveLayout,
  type DiagramPosition
} from '@/core/diagram/layout';
import type { ViewGraph } from '@/core/diagram/types';
import { useReactFlow, type Edge, type Node, type OnEdgesChange, type OnNodesChange } from '@xyflow/react';
import { useLatestRef } from '@/hooks/useLatestRef';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TableFlowNode } from '../TableNode/TableNode';

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
  statusStroke: StatusStroke;
  exportBg: string;
};

type StatusStroke = Record<'added' | 'changed' | 'removed', string>;

const flowEdgesFromGraph = (
  viewGraph: ViewGraph,
  shownNodeIds: Set<string>,
  edgeStroke: string,
  statusStroke: StatusStroke
): Edge[] => {
  const result: Edge[] = [];

  for (const edge of viewGraph.edges) {
    if (!shownNodeIds.has(edge.source) || !shownNodeIds.has(edge.target)) {
      continue;
    }

    const pending = edge.status !== 'unchanged';
    const stroke = edge.status !== 'unchanged' ? statusStroke[edge.status] : edgeStroke;
    const pairCount = Math.max(edge.sourceColumns.length, edge.targetColumns.length, 1);
    for (let index = 0; index < pairCount; index += 1) {
      result.push({
        id: `${edge.id}:${index}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceColumns[index] ?? edge.sourceColumns[0],
        targetHandle: edge.targetColumns[index] ?? edge.targetColumns[0],
        style: pending ? { stroke, strokeDasharray: '6 4', strokeWidth: 1.5 } : { stroke },
        data: { status: edge.status }
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
  statusStroke,
  exportBg
}: Args): {
  nodes: TableFlowNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<TableFlowNode>;
  onEdgesChange: OnEdgesChange;
  autoLayout: () => void;
  fit: () => void;
  exportImage: (format: 'png' | 'svg') => Promise<void>;
} {
  const { fitView } = useReactFlow();
  const fitViewRef = useLatestRef(fitView);

  const layoutKey = connectionId !== undefined ? layoutStorageKey(connectionId, database, schema) : '';
  const [positions, setPositions] = useState<Record<string, DiagramPosition>>({});
  const loadedLayoutKeyRef = useRef('');

  useEffect(() => {
    if (!layoutKey || loadedLayoutKeyRef.current === layoutKey) return;
    loadedLayoutKeyRef.current = layoutKey;
    setPositions(loadLayout(layoutKey));
  }, [layoutKey]);

  const baseNodes = useMemo((): TableFlowNode[] => {
    const nextNodes: TableFlowNode[] = viewGraph.nodes
      .filter((node) => shownNodeIds.has(node.id))
      .map((node) => ({
        id: node.id,
        type: 'table' as const,
        position: positions[node.id] ?? { x: 0, y: 0 },
        data: {
          name: node.name,
          schema: node.schema,
          columns: node.columns,
          status: node.status,
          highlighted: false,
          dimmed: false
        }
      }));

    const layoutEdges = flowEdgesFromGraph(viewGraph, shownNodeIds, edgeStroke, statusStroke);
    return layoutTableNodes(nextNodes, layoutEdges, positions) as TableFlowNode[];
  }, [edgeStroke, positions, shownNodeIds, statusStroke, viewGraph]);

  const baseEdges = useMemo(
    (): Edge[] => flowEdgesFromGraph(viewGraph, shownNodeIds, edgeStroke, statusStroke),
    [edgeStroke, shownNodeIds, statusStroke, viewGraph]
  );

  // Includes statuses and column/edge counts so a pending changeset (or its
  // removal after apply/reject) re-renders even when node ids are unchanged.
  const graphSignature = useMemo(
    () =>
      `${[...shownNodeIds].sort().join('|')}::${viewGraph.nodes
        .map((node) => `${node.id}:${node.status}:${node.columns.map((column) => column.status[0]).join('')}`)
        .join('|')}::${viewGraph.edges.map((edge) => `${edge.id}:${edge.status}`).join('|')}`,
    [shownNodeIds, viewGraph.edges, viewGraph.nodes]
  );

  const [nodes, setNodes] = useState<TableFlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const nodesRef = useLatestRef(nodes);
  const graphSignatureRef = useRef('');

  useEffect(() => {
    if (graphSignatureRef.current === graphSignature) {
      return;
    }
    graphSignatureRef.current = graphSignature;
    setNodes(baseNodes);
    setEdges(baseEdges);
    if (baseNodes.length === 0) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      void fitViewRef.current({ padding: 0.15 });
    });
    return (): void => window.cancelAnimationFrame(frame);
  }, [baseEdges, baseNodes, fitViewRef, graphSignature]);

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
      setPositions((current) => {
        const next: Record<string, DiagramPosition> = { ...current };
        for (const node of nextNodes) {
          next[node.id] = node.position;
        }
        saveLayout(layoutKey, next);
        return next;
      });
    },
    [layoutKey]
  );

  const onNodesChange = useCallback<OnNodesChange<TableFlowNode>>(
    (changes): void => {
      setNodes((current) => {
        const next = changes.applyTo(current);
        const moved = changes.getByType('position').some((change) => change.dragging === false);
        if (moved) {
          persistPositions(next);
        }
        return next;
      });
    },
    [persistPositions]
  );

  const onEdgesChange = useCallback<OnEdgesChange>((changes): void => {
    setEdges((current) => changes.applyTo(current));
  }, []);

  const autoLayout = useCallback((): void => {
    setNodes((current) => {
      const next = layoutTableNodes(current, edges, {}) as TableFlowNode[];
      const nextPositions: Record<string, DiagramPosition> = {};
      for (const node of next) {
        nextPositions[node.id] = node.position;
      }
      setPositions(nextPositions);
      if (layoutKey) {
        saveLayout(layoutKey, nextPositions);
      }
      return next;
    });
  }, [edges, layoutKey]);

  const fit = useCallback((): void => {
    void fitViewRef.current({ padding: 0.15 });
  }, [fitViewRef]);

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
    [exportBg, exportFilename, nodesRef]
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
