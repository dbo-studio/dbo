/**
 * Connection picker catalog: branding aliases over PostgreSQL / MySQL / SQLite drivers.
 * Stored `type` stays the brand id; dialer/repo follow `driver`.
 */

export type ConnectionDriver = 'postgresql' | 'mysql' | 'sqlite';

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
  { name: 'TimescaleDB', logo: 'timescaledb', type: 'timescaledb', driver: 'postgresql' }
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
