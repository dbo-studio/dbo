import type { DiagramGraph, SchemaOp, ViewEdge, ViewGraph, ViewNode } from './types';

const markNodeChanged = (node: ViewNode): void => {
  if (node.status === 'unchanged') {
    node.status = 'changed';
  }
};

export const applyOps = (base: DiagramGraph, ops: SchemaOp[]): ViewGraph => {
  const nodes: ViewNode[] = base.nodes.map((node) => ({
    ...node,
    status: 'unchanged',
    columns: node.columns.map((column) => ({ ...column, status: 'unchanged' }))
  }));
  const edges: ViewEdge[] = base.edges.map((edge) => ({ ...edge, status: 'unchanged' }));

  for (const op of ops) {
    switch (op.op) {
      case 'add':
        if (op.target === 'node') {
          nodes.push({
            ...op.value,
            status: 'added',
            columns: op.value.columns.map((column) => ({ ...column, status: 'added' }))
          });
        } else if (op.target === 'column') {
          const node = nodes.find((item) => item.id === op.nodeId);
          if (node) {
            node.columns = [...node.columns, { ...op.value, status: 'added' }];
            markNodeChanged(node);
          }
        } else {
          edges.push({ ...op.value, status: 'added' });
        }
        break;
      case 'change':
        if (op.target === 'node') {
          const node = nodes.find((item) => item.id === op.id);
          if (node) {
            Object.assign(node, op.patch);
            if (node.status !== 'added') {
              node.status = 'changed';
            }
          }
        } else if (op.target === 'column') {
          const node = nodes.find((item) => item.id === op.nodeId);
          const column = node?.columns.find((item) => item.name === op.id);
          if (node && column) {
            Object.assign(column, op.patch);
            if (column.status !== 'added') {
              column.status = 'changed';
            }
            markNodeChanged(node);
          }
        } else {
          const edge = edges.find((item) => item.id === op.id);
          if (edge) {
            Object.assign(edge, op.patch);
            if (edge.status !== 'added') {
              edge.status = 'changed';
            }
          }
        }
        break;
      case 'remove':
        if (op.target === 'node') {
          const node = nodes.find((item) => item.id === op.id);
          if (node) {
            node.status = 'removed';
          }
        } else if (op.target === 'column') {
          const node = nodes.find((item) => item.id === op.nodeId);
          const column = node?.columns.find((item) => item.name === op.id);
          if (node && column) {
            column.status = 'removed';
            markNodeChanged(node);
          }
        } else {
          const edge = edges.find((item) => item.id === op.id);
          if (edge) {
            edge.status = 'removed';
          }
        }
        break;
    }
  }

  return { nodes, edges };
};

export const neighborIds = (graph: ViewGraph, nodeId: string): Set<string> => {
  const related = new Set<string>([nodeId]);
  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      related.add(edge.target);
    }
    if (edge.target === nodeId) {
      related.add(edge.source);
    }
  }
  return related;
};

export const relatedTableIds = (graph: ViewGraph, seedIds: string[]): Set<string> => {
  const seeds = new Set(seedIds);
  const related = new Set(seedIds);
  for (const edge of graph.edges) {
    if (seeds.has(edge.source)) {
      related.add(edge.target);
    }
    if (seeds.has(edge.target)) {
      related.add(edge.source);
    }
  }
  return related;
};
