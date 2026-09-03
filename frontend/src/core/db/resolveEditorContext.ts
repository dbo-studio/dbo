import { getEngineCapabilities } from './engineCapabilities';
import { parseObjectNodeId } from './parseObjectNodeId';

export type EditorContextSource =
  'manual' | 'connection' | 'tree' | 'sibling-tab' | 'catalog' | 'engine-default' | 'last-used' | 'none';

export type EditorContextValues = {
  database: string;
  schema: string;
};

export type ResolveEditorContextInput = {
  engine: string | undefined;
  current: EditorContextValues & {
    contextLocked?: boolean;
    contextSource?: EditorContextSource;
  };
  connectionDatabase?: string;
  focusedNodeId?: string;
  siblingNodeIds?: string[];
  lastUsed?: EditorContextValues;
  catalog?: {
    databases: string[];
    schemas: string[];
  };
};

export type ResolveEditorContextResult = EditorContextValues & {
  source: EditorContextSource;
};

const empty = (source: EditorContextSource = 'none'): ResolveEditorContextResult => ({
  database: '',
  schema: '',
  source
});

const filterByCapabilities = (engine: string | undefined, values: EditorContextValues): EditorContextValues => {
  const caps = getEngineCapabilities(engine);
  return {
    database: caps.hasDatabase ? values.database : '',
    schema: caps.hasSchema ? values.schema : ''
  };
};

const dropStale = (values: EditorContextValues, catalog: ResolveEditorContextInput['catalog']): EditorContextValues => {
  if (!catalog) return values;

  return {
    database: !values.database || catalog.databases.includes(values.database) ? values.database : '',
    schema: !values.schema || catalog.schemas.includes(values.schema) ? values.schema : ''
  };
};

const fromNodeId = (nodeId: string | undefined): EditorContextValues | null => {
  if (!nodeId) return null;
  const parsed = parseObjectNodeId(nodeId);
  if (!parsed.database && !parsed.schema) return null;
  return {
    database: parsed.database ?? '',
    schema: parsed.schema ?? ''
  };
};

const isComplete = (engine: string | undefined, values: EditorContextValues): boolean => {
  const caps = getEngineCapabilities(engine);
  if (caps.hasDatabase && !values.database) return false;
  if (caps.hasSchema && !values.schema) return false;
  return true;
};

const gapFill = (base: EditorContextValues, fill: EditorContextValues): EditorContextValues => ({
  database: base.database || fill.database,
  schema: base.schema || fill.schema
});

const catalogFill = (
  engine: string | undefined,
  catalog: NonNullable<ResolveEditorContextInput['catalog']>
): { values: EditorContextValues; source: EditorContextSource } => {
  const caps = getEngineCapabilities(engine);
  const values: EditorContextValues = { database: '', schema: '' };
  let source: EditorContextSource = 'catalog';

  if (caps.hasDatabase && catalog.databases.length === 1) {
    values.database = catalog.databases[0] ?? '';
  }

  if (caps.hasSchema) {
    if (caps.preferredSchema && catalog.schemas.includes(caps.preferredSchema)) {
      values.schema = caps.preferredSchema;
      source = 'engine-default';
    } else if (catalog.schemas.length === 1) {
      values.schema = catalog.schemas[0] ?? '';
    }
  }

  return { values, source };
};

/**
 * Resolve editor database/schema context.
 * Locked tabs keep current values (capability-filtered, stale-dropped).
 * Unlocked tabs keep non-empty current fields and gap-fill from priority sources.
 */
export const resolveEditorContext = (input: ResolveEditorContextInput): ResolveEditorContextResult => {
  const caps = getEngineCapabilities(input.engine);

  if (!caps.hasDatabase && !caps.hasSchema) {
    return empty('none');
  }

  const lockedOrCurrent = dropStale(
    filterByCapabilities(input.engine, {
      database: input.current.database,
      schema: input.current.schema
    }),
    input.catalog
  );

  if (input.current.contextLocked) {
    return {
      ...lockedOrCurrent,
      source: 'manual'
    };
  }

  let result = { ...lockedOrCurrent };
  let source: EditorContextSource = result.database || result.schema ? (input.current.contextSource ?? 'none') : 'none';

  const applyCandidate = (candidate: EditorContextValues | null, candidateSource: EditorContextSource): void => {
    if (!candidate) return;
    if (isComplete(input.engine, result)) return;

    const filtered = dropStale(filterByCapabilities(input.engine, candidate), input.catalog);
    if (!filtered.database && !filtered.schema) return;

    const before = { ...result };
    result = gapFill(result, filtered);

    if (result.database !== before.database || result.schema !== before.schema) {
      if (!before.database && !before.schema) {
        source = candidateSource;
      } else if (source === 'none') {
        source = candidateSource;
      }
    }
  };

  applyCandidate(fromNodeId(input.focusedNodeId), 'tree');

  for (const nodeId of input.siblingNodeIds ?? []) {
    applyCandidate(fromNodeId(nodeId), 'sibling-tab');
  }

  if (input.connectionDatabase) {
    applyCandidate({ database: input.connectionDatabase, schema: '' }, 'connection');
  }

  if (input.lastUsed) {
    applyCandidate(input.lastUsed, 'last-used');
  }

  if (input.catalog) {
    const { values, source: catalogSource } = catalogFill(input.engine, input.catalog);
    applyCandidate(values, catalogSource);
  }

  result = dropStale(filterByCapabilities(input.engine, result), input.catalog);

  if (!result.database && !result.schema) {
    return empty('none');
  }

  return { ...result, source };
};
