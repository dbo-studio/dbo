import { connectionDriver } from './connectionAliases';

export type DbEngine = 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver' | 'clickhouse' | 'mongodb';

export type EngineCapabilities = {
  hasDatabase: boolean;
  hasSchema: boolean;
  preferredSchema?: string;
};

const ENGINE_CAPABILITIES: Record<DbEngine, EngineCapabilities> = {
  postgresql: { hasDatabase: true, hasSchema: true, preferredSchema: 'public' },
  mysql: { hasDatabase: true, hasSchema: false },
  sqlite: { hasDatabase: false, hasSchema: false },
  // SQL Server: a schema picker (completion and AI context only; T-SQL cannot switch the session schema).
  sqlserver: { hasDatabase: false, hasSchema: true, preferredSchema: 'dbo' },
  // ClickHouse: queries run on a connection switched with USE <database>.
  clickhouse: { hasDatabase: true, hasSchema: false },
  // MongoDB: the shell runs in the selected database (a `use` before each run).
  mongodb: { hasDatabase: true, hasSchema: false }
};

export const getEngineCapabilities = (engine: string | undefined): EngineCapabilities => {
  const driver = connectionDriver(engine);
  if (
    driver === 'postgresql' ||
    driver === 'mysql' ||
    driver === 'sqlite' ||
    driver === 'sqlserver' ||
    driver === 'clickhouse' ||
    driver === 'mongodb'
  ) {
    return ENGINE_CAPABILITIES[driver];
  }

  return { hasDatabase: false, hasSchema: false };
};
