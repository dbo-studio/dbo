import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import { Position } from 'reactflow';
import type { DiagramTable, DiagramRelationship } from '@/api/schemaDiagram';

export enum LayoutDirection {
  TB = 'TB', // Top to Bottom
  LR = 'LR', // Left to Right
  BT = 'BT', // Bottom to Top
  RL = 'RL' // Right to Left
}

const nodeWidth = 250;
const nodeHeight = 400;

export function getLayoutedElements(
  tables: DiagramTable[],
  relationships: DiagramRelationship[],
  direction: LayoutDirection = LayoutDirection.TB
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  // Create nodes
  const nodes: Node[] = tables.map((table) => ({
    id: table.id,
    type: 'tableNode',
    position: { x: 0, y: 0 },
    data: { table },
    width: nodeWidth,
    height: Math.max(nodeHeight, table.columns.length * 40 + 60)
  }));

  // Create edges
  const edges: Edge[] = relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceTable,
    target: rel.targetTable,
    sourceHandle: rel.sourceColumn,
    targetHandle: rel.targetColumn,
    type: 'smoothstep',
    markerEnd: {
      type: 'arrowclosed' as const
    },
    label: `${rel.sourceColumn} → ${rel.targetColumn}`,
    data: { relationship: rel }
  }));

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width || nodeWidth,
      height: node.height || nodeHeight
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = direction === LayoutDirection.LR ? Position.Left : Position.Top;
    node.sourcePosition = direction === LayoutDirection.LR ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - (node.width || nodeWidth) / 2,
      y: nodeWithPosition.y - (node.height || nodeHeight) / 2
    };
  });

  return { nodes, edges };
}

