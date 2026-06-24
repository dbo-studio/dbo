import type { ConnectionConfig } from '../pages';

export type DbEngine = 'postgresql' | 'mysql' | 'sqlite';

const baseCredentials = {
  username: 'default',
  password: 'secret'
};

export function getDbConfig(engine: DbEngine, name: string): ConnectionConfig {
  switch (engine) {
    case 'postgresql':
      return {
        name,
        host: 'localhost',
        port: '5432',
        ...baseCredentials,
        type: 'PostgreSQL'
      };
    case 'mysql':
      return {
        name,
        host: 'localhost',
        port: '3306',
        ...baseCredentials,
        type: 'MySQL'
      };
    case 'sqlite':
      return {
        name,
        host: `/tmp/dbo-e2e-${Date.now()}.db`,
        port: '',
        username: '',
        password: '',
        type: 'SQLite'
      };
  }
}
