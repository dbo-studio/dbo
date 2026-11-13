import { isNoSQLType, isPostgresDriver } from '@/core/db/connectionAliases';
import { parseObjectNodeId } from '@/core/db/parseObjectNodeId';
import type { TreeNodeType } from '@/types/Tree';

export type DiagramScope = {
  database: string;
  schema: string;
  focusTables?: string[];
};

export const diagramScopeFromTreeNode = (node: TreeNodeType, engine: string | undefined): DiagramScope | null => {
  // Redis and MongoDB have no relational schema to draw.
  if (isNoSQLType(engine)) {
    return null;
  }

  if (node.type === 'table') {
    const parsed = parseObjectNodeId(node.id);
    return {
      database: parsed.database ?? '',
      schema: parsed.schema ?? '',
      focusTables: [parsed.objectName ?? node.name]
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
      schema: isPostgresDriver(engine) ? 'public' : ''
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
