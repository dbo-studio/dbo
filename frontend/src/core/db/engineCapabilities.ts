import { connectionDriver } from './connectionAliases';

export type DbEngine = 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver' | 'clickhouse';

export type EngineCapabilities = {
  hasDatabase: boolean;
  hasSchema: boolean;
  preferredSchema?: string;
};

const ENGINE_CAPABILITIES: Record<DbEngine, EngineCapabilities> = {
  postgresql: { hasDatabase: true, hasSchema: true, preferredSchema: 'public' },
  mysql: { hasDatabase: true, hasSchema: false },
  sqlite: { hasDatabase: false, hasSchema: false },
  // No editor database/schema picker: statements run in the connection's default database and schema,
  // anything else is qualified in the SQL (SQL Server schemas, ClickHouse databases).
  sqlserver: { hasDatabase: false, hasSchema: false },
  clickhouse: { hasDatabase: false, hasSchema: false }
};

export const getEngineCapabilities = (engine: string | undefined): EngineCapabilities => {
  const driver = connectionDriver(engine);
  if (
    driver === 'postgresql' ||
    driver === 'mysql' ||
    driver === 'sqlite' ||
    driver === 'sqlserver' ||
    driver === 'clickhouse'
  ) {
    return ENGINE_CAPABILITIES[driver];
  }

  return { hasDatabase: false, hasSchema: false };
};
