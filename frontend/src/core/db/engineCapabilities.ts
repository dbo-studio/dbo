export type DbEngine = 'postgresql' | 'mysql' | 'sqlite';

export type EngineCapabilities = {
  hasDatabase: boolean;
  hasSchema: boolean;
  preferredSchema?: string;
};

const ENGINE_CAPABILITIES: Record<DbEngine, EngineCapabilities> = {
  postgresql: { hasDatabase: true, hasSchema: true, preferredSchema: 'public' },
  mysql: { hasDatabase: true, hasSchema: false },
  sqlite: { hasDatabase: false, hasSchema: false }
};

export const getEngineCapabilities = (engine: string | undefined): EngineCapabilities => {
  if (engine === 'postgresql' || engine === 'mysql' || engine === 'sqlite') {
    return ENGINE_CAPABILITIES[engine];
  }

  return { hasDatabase: false, hasSchema: false };
};
