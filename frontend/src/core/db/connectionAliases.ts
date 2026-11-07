/**
 * Connection picker catalog: branding aliases over PostgreSQL / MySQL / SQLite drivers.
 * Stored `type` stays the brand id; dialer/repo follow `driver`.
 */

export type ConnectionDriver = 'postgresql' | 'mysql' | 'sqlite' | 'redis' | 'mongodb';

export type ConnectionEngine =
  | 'postgresql'
  | 'supabase'
  | 'neon'
  | 'alloydb'
  | 'timescaledb'
  | 'rds_postgresql'
  | 'aurora_postgresql'
  | 'cloudsql_postgresql'
  | 'azure_postgresql'
  | 'mysql'
  | 'mariadb'
  | 'rds_mysql'
  | 'aurora_mysql'
  | 'cloudsql_mysql'
  | 'azure_mysql'
  | 'percona'
  | 'heatwave'
  | 'redis'
  | 'valkey'
  | 'keydb'
  | 'dragonfly'
  | 'mongodb'
  | 'sqlite';

export type ConnectionAliasDef = {
  name: string;
  /** Icon key under /public/icons/{logo}.svg */
  logo: string;
  type: ConnectionEngine;
  driver: ConnectionDriver;
};

export const CONNECTION_ALIASES: ConnectionAliasDef[] = [
  { name: 'PostgreSQL', logo: 'postgresql', type: 'postgresql', driver: 'postgresql' },
  { name: 'MySQL', logo: 'mysql', type: 'mysql', driver: 'mysql' },
  { name: 'SQLite', logo: 'sqlite', type: 'sqlite', driver: 'sqlite' },
  { name: 'MariaDB', logo: 'mariadb', type: 'mariadb', driver: 'mysql' },

  { name: 'AlloyDB', logo: 'alloydb', type: 'alloydb', driver: 'postgresql' },
  { name: 'Amazon Aurora (MySQL)', logo: 'amazon_aurora', type: 'aurora_mysql', driver: 'mysql' },
  { name: 'Amazon Aurora (PostgreSQL)', logo: 'amazon_aurora', type: 'aurora_postgresql', driver: 'postgresql' },
  { name: 'Amazon RDS (MySQL)', logo: 'amazon_rds', type: 'rds_mysql', driver: 'mysql' },
  { name: 'Amazon RDS (PostgreSQL)', logo: 'amazon_rds', type: 'rds_postgresql', driver: 'postgresql' },
  { name: 'Azure Database (MySQL)', logo: 'azure', type: 'azure_mysql', driver: 'mysql' },
  { name: 'Azure Database (PostgreSQL)', logo: 'azure', type: 'azure_postgresql', driver: 'postgresql' },
  { name: 'Cloud SQL (MySQL)', logo: 'google_cloud_sql', type: 'cloudsql_mysql', driver: 'mysql' },
  { name: 'Cloud SQL (PostgreSQL)', logo: 'google_cloud_sql', type: 'cloudsql_postgresql', driver: 'postgresql' },
  { name: 'HeatWave', logo: 'heatwave', type: 'heatwave', driver: 'mysql' },
  { name: 'Neon', logo: 'neon', type: 'neon', driver: 'postgresql' },
  { name: 'Percona', logo: 'percona', type: 'percona', driver: 'mysql' },
  { name: 'Supabase', logo: 'supabase', type: 'supabase', driver: 'postgresql' },
  { name: 'TimescaleDB', logo: 'timescaledb', type: 'timescaledb', driver: 'postgresql' },

  { name: 'Redis', logo: 'redis', type: 'redis', driver: 'redis' },
  { name: 'Valkey', logo: 'valkey', type: 'valkey', driver: 'redis' },
  { name: 'KeyDB', logo: 'keydb', type: 'keydb', driver: 'redis' },
  { name: 'Dragonfly', logo: 'dragonfly', type: 'dragonfly', driver: 'redis' },
  { name: 'MongoDB', logo: 'mongodb', type: 'mongodb', driver: 'mongodb' }
];

const aliasByType = Object.fromEntries(CONNECTION_ALIASES.map((a) => [a.type, a])) as Record<
  ConnectionEngine,
  ConnectionAliasDef
>;

export function getConnectionAlias(type: string | undefined): ConnectionAliasDef | undefined {
  if (!type) return undefined;
  return aliasByType[type as ConnectionEngine];
}

export function isPostgresDriver(type: string | undefined): boolean {
  return getConnectionAlias(type)?.driver === 'postgresql';
}

export function isMysqlDriver(type: string | undefined): boolean {
  return getConnectionAlias(type)?.driver === 'mysql';
}

export function connectionDriver(type: string | undefined): ConnectionDriver | undefined {
  return getConnectionAlias(type)?.driver;
}

/** Connection types served by the NoSQL engine (Browse tab) instead of the SQL data/query tabs. */
export const isNoSQLType = (type: string | undefined): boolean =>
  type === 'nosql_fixture' ||
  getConnectionAlias(type)?.driver === 'redis' ||
  getConnectionAlias(type)?.driver === 'mongodb';

export const isRedisDriver = (type: string | undefined): boolean => getConnectionAlias(type)?.driver === 'redis';

export const isMongoDriver = (type: string | undefined): boolean => getConnectionAlias(type)?.driver === 'mongodb';

/** Redis and MongoDB are often run without a password, so an empty one must be allowed to unlock them. */
export const isPasswordOptionalDriver = (type: string | undefined): boolean =>
  isRedisDriver(type) || isMongoDriver(type);
