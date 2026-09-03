const CONTAINER_SUFFIXES = new Set(['tableContainer', 'viewContainer', 'materializedViewContainer']);

export type ParsedObjectNodeId = {
  database?: string;
  schema?: string;
  objectName?: string;
};

export const parseObjectNodeId = (nodeId: string): ParsedObjectNodeId => {
  const parts = nodeId.split('.');
  const last = parts[parts.length - 1];

  if (!last || CONTAINER_SUFFIXES.has(last)) {
    if (parts.length === 3) {
      return { database: parts[0], schema: parts[1] };
    }
    if (parts.length === 2) {
      return { database: parts[0] };
    }
    return {};
  }

  if (parts.length === 3) {
    return { database: parts[0], schema: parts[1], objectName: last };
  }
  if (parts.length === 2) {
    return { database: parts[0], objectName: last };
  }
  if (parts.length === 1) {
    return { objectName: last };
  }

  return { objectName: last };
};
