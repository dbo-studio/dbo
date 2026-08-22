import { parseObjectNodeId } from '@/core/db/parseObjectNodeId';
import type { TreeNodeType } from '@/types/Tree';

export type DiagramScope = {
  database: string;
  schema: string;
  focusTable?: string;
};

export const diagramScopeFromTreeNode = (node: TreeNodeType, engine: string | undefined): DiagramScope | null => {
  if (node.type === 'table') {
    const parsed = parseObjectNodeId(node.id);
    return {
      database: parsed.database ?? '',
      schema: parsed.schema ?? '',
      focusTable: parsed.objectName ?? node.name
    };
  }

  if (node.type === 'schema') {
    const parsed = parseObjectNodeId(node.id);
    return {
      database: parsed.database ?? '',
      schema: node.name || parsed.schema || parsed.objectName || ''
    };
  }

  if (node.type === 'database') {
    return {
      database: node.name,
      schema: engine === 'postgresql' ? 'public' : ''
    };
  }

  if (node.type === 'tableContainer') {
    const parsed = parseObjectNodeId(node.id);
    return {
      database: parsed.database ?? '',
      schema: parsed.schema ?? ''
    };
  }

  return null;
};
