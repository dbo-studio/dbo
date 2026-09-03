import type { DiagramColumn, DiagramEdge, DiagramGraph, DiagramNode } from './types';

const SIMPLE_IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SIMPLE_TYPE = /^[A-Za-z_][A-Za-z0-9_]*(\([^)]*\))?$/;
const DEFAULT_FK_ACTION = 'no action';

export const quoteDbmlIdent = (name: string): string => {
  if (SIMPLE_IDENT.test(name)) {
    return name;
  }

  return `"${name.replace(/"/g, '""')}"`;
};

const formatType = (dataType: string): string => {
  const trimmed = dataType.trim();
  if (trimmed === '' || SIMPLE_TYPE.test(trimmed)) {
    return trimmed || 'unknown';
  }

  return quoteDbmlIdent(trimmed);
};

export const tableRef = (node: Pick<DiagramNode, 'name' | 'schema'>): string => {
  const table = quoteDbmlIdent(node.name);
  if (node.schema) {
    return `${quoteDbmlIdent(node.schema)}.${table}`;
  }

  return table;
};

const columnList = (columns: string[]): string => {
  if (columns.length === 1) {
    return quoteDbmlIdent(columns[0]);
  }

  return `(${columns.map(quoteDbmlIdent).join(', ')})`;
};

const mapFkAction = (value: string | undefined): string | undefined => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === DEFAULT_FK_ACTION) {
    return undefined;
  }

  return normalized;
};

const refSettings = (edge: DiagramEdge): string => {
  const parts: string[] = [];
  const onDelete = mapFkAction(edge.onDelete);
  const onUpdate = mapFkAction(edge.onUpdate);
  if (onDelete) {
    parts.push(`delete: ${onDelete}`);
  }

  if (onUpdate) {
    parts.push(`update: ${onUpdate}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return ` [${parts.join(', ')}]`;
};

const columnLine = (column: DiagramColumn, compositePk: boolean): string => {
  const settings = !compositePk && column.isPrimaryKey ? ' [pk]' : '';
  return `  ${quoteDbmlIdent(column.name)} ${formatType(column.dataType)}${settings}`;
};

const tableBlock = (node: DiagramNode): string => {
  const pkColumns = node.columns.filter((column) => column.isPrimaryKey).map((column) => column.name);
  const compositePk = pkColumns.length > 1;
  const lines = [`Table ${tableRef(node)} {`];

  for (const column of node.columns) {
    lines.push(columnLine(column, compositePk));
  }

  if (compositePk) {
    lines.push('');
    lines.push('  indexes {');
    lines.push(`    (${pkColumns.map(quoteDbmlIdent).join(', ')}) [pk]`);
    lines.push('  }');
  }

  lines.push('}');
  return lines.join('\n');
};

const refLine = (edge: DiagramEdge, nodesById: Map<string, DiagramNode>): string | null => {
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);
  if (!source || !target || edge.sourceColumns.length === 0 || edge.targetColumns.length === 0) {
    return null;
  }

  return `Ref: ${tableRef(source)}.${columnList(edge.sourceColumns)} > ${tableRef(target)}.${columnList(edge.targetColumns)}${refSettings(edge)}`;
};

const compareNodes = (a: DiagramNode, b: DiagramNode): number => tableRef(a).localeCompare(tableRef(b));

export const graphToDbml = (graph: DiagramGraph): string => {
  const nodes = [...graph.nodes].sort(compareNodes);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const tables = nodes.map(tableBlock);
  const refs = graph.edges
    .map((edge) => refLine(edge, nodesById))
    .filter((line): line is string => line !== null)
    .sort((a, b) => a.localeCompare(b));

  return [...tables, ...refs].join('\n\n').trim();
};
