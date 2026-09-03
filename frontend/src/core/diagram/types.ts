/**
 * Stable diagram model. React Flow is a view over this graph.
 *
 * Agent Mode (later) streams diagram_diff ops onto `changeset`:
 *   { op: 'add' | 'change' | 'remove', target: 'node' | 'column' | 'edge', id, patch? }
 * viewGraph = applyOps(baseGraph, changeset)
 */
export type DiagramStatus = 'unchanged' | 'added' | 'changed' | 'removed';

export type DiagramKind = 'table';

export type DiagramColumn = {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
};

export type DiagramNode = {
  id: string;
  kind: DiagramKind;
  name: string;
  schema?: string;
  database?: string;
  columns: DiagramColumn[];
};

export type DiagramEdge = {
  id: string;
  source: string;
  target: string;
  sourceColumns: string[];
  targetColumns: string[];
  onUpdate?: string;
  onDelete?: string;
};

export type DiagramGraph = {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

export type ViewColumn = DiagramColumn & { status: DiagramStatus };

export type ViewNode = Omit<DiagramNode, 'columns'> & {
  status: DiagramStatus;
  columns: ViewColumn[];
};

export type ViewEdge = DiagramEdge & { status: DiagramStatus };

export type ViewGraph = {
  nodes: ViewNode[];
  edges: ViewEdge[];
};

export type SchemaOp =
  | { op: 'add'; target: 'node'; id: string; value: DiagramNode }
  | { op: 'add'; target: 'column'; id: string; nodeId: string; value: DiagramColumn }
  | { op: 'add'; target: 'edge'; id: string; value: DiagramEdge }
  | { op: 'change'; target: 'node'; id: string; patch: Partial<DiagramNode> }
  | { op: 'change'; target: 'column'; id: string; nodeId: string; patch: Partial<DiagramColumn> }
  | { op: 'change'; target: 'edge'; id: string; patch: Partial<DiagramEdge> }
  | { op: 'remove'; target: 'node' | 'column' | 'edge'; id: string; nodeId?: string };

export const EMPTY_DIAGRAM_GRAPH: DiagramGraph = { nodes: [], edges: [] };
