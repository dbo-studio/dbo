import { connectionDriver } from './connectionAliases';

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
  const driver = connectionDriver(engine);
  if (driver === 'postgresql' || driver === 'mysql' || driver === 'sqlite') {
    return ENGINE_CAPABILITIES[driver];
  }

  return { hasDatabase: false, hasSchema: false };
};
